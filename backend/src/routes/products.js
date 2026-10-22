import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Product } from '../models/Product.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const productSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  price: z.number().min(0),
  stock: z.number().int().min(0)
});

router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const filter = q ? { name: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {};
    res.json({ products: await Product.find(filter).sort({ createdAt: -1 }).limit(100) });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (e) { next(e); }
});

router.post('/', requireAuth, requireAdmin, validate(productSchema), async (req, res, next) => {
  try { res.status(201).json({ product: await Product.create(req.body) }); } catch (e) { next(e); }
});

router.put('/:id', requireAuth, requireAdmin, validate(productSchema), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
