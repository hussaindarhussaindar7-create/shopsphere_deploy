import 'dotenv/config';
import { z } from 'zod';

// App refuses to start if env is wrong -> you see exactly which variable is bad in `pm2 logs`
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  PAYMENT_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16, 'PAYMENT_WEBHOOK_SECRET must be at least 16 chars')
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(JSON.stringify({
    level: 'error',
    msg: 'Invalid environment configuration',
    problems: parsed.error.flatten().fieldErrors
  }));
  process.exit(1);
}

export const env = parsed.data;
