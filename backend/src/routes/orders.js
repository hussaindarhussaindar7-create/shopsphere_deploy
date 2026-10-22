import { Router } from 'express';
import { z } from 'zod';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const orderSchema = z.object({
  items: z.array(z.object({ productId: z.string().length(24), qty: z.number().int().min(1).max(20) })).min(1).max(30)
});

// Price + total are ALWAYS calculated on the server (never trust the browser).
router.post('/', requireAuth, validate(orderSchema), async (req, res, next) => {
  const reserved = []; // for rollback if any item is out of stock
  try {
    const lines = [];
    for (const { productId, qty } of req.body.items) {
      // atomic stock reservation: only decrements when enough stock exists
      const product = await Product.findOneAndUpdate(
        { _id: productId, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true }
      );
      if (!product) {
        for (const r of reserved) await Product.updateOne({ _id: r.productId }, { $inc: { stock: r.qty } });
        return res.status(409).json({ error: 'A product is out of stock or no longer exists', productId });
      }
      reserved.push({ productId, qty });
      lines.push({ product: product._id, name: product.name, price: product.price, qty });
    }
    const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
    const order = await Order.create({ user: req.user.id, items: lines, total });
    res.status(201).json({ order });
  } catch (e) {
    for (const r of reserved) await Product.updateOne({ _id: r.productId }, { $inc: { stock: r.qty } }).catch(() => {});
    next(e);
  }
});

router.get('/mine', requireAuth, async (req, res, next) => {
  try { res.json({ orders: await Order.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50) }); }
  catch (e) { next(e); }
});

export default router;
