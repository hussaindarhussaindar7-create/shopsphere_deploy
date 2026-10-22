import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(100)
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

const sign = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    const ok = user && (await bcrypt.compare(req.body.password, user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    res.json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) { next(e); }
});

export default router;
