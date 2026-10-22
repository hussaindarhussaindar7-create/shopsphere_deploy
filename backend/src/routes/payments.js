import { Router } from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const router = Router();

const sign = (payload) => crypto.createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET).update(payload).digest('hex');

async function markPaid(orderId, paymentRef) {
  const order = await Order.findById(orderId);
  if (!order) return { code: 404, body: { error: 'Order not found' } };
  if (order.status === 'paid') return { code: 200, body: { ok: true, note: 'already paid' } }; // idempotent
  if (order.status === 'cancelled') return { code: 409, body: { error: 'Order cancelled' } };
  order.status = 'paid';
  order.paymentRef = paymentRef;
  await order.save();
  logger.info('Order paid', { orderId, paymentRef });
  return { code: 200, body: { ok: true } };
}

// Real providers (Stripe/JazzCash/etc.) call this URL after payment.
// Body arrives RAW (see app.js) so the signature can be verified.
router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['x-signature'] || '';
    const expected = sign(req.body);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      logger.warn('Webhook rejected: bad signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    const { orderId, status, paymentRef } = JSON.parse(req.body.toString());
    if (!mongoose.isValidObjectId(orderId)) return res.status(400).json({ error: 'Invalid orderId' });
    if (status !== 'succeeded') return res.json({ ok: true, note: 'ignored' });
    const result = await markPaid(orderId, paymentRef || 'webhook');
    res.status(result.code).json(result.body);
  } catch (e) { next(e); }
});

// SANDBOX ONLY: pretends to be the payment provider so you can test the full flow.
router.post('/simulate/:orderId', requireAuth, async (req, res, next) => {
  try {
    if (env.PAYMENT_MODE !== 'sandbox') return res.status(403).json({ error: 'Sandbox payments disabled' });
    if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(400).json({ error: 'Invalid id' });
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user.id });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const result = await markPaid(order._id, `sandbox_${Date.now()}`);
    res.status(result.code).json(result.body);
  } catch (e) { next(e); }
});

export default router;
