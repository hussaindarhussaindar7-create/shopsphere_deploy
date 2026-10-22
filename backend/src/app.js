import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.set('trust proxy', 1); // we sit behind Nginx -> real client IP for rate limiting/logs
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()) }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', { skip: (req) => req.path === '/api/health' }));

// Webhook needs the RAW body for signature verification -> must be before express.json()
app.use('/api/payments/webhook', express.raw({ type: '*/*', limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));

app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
