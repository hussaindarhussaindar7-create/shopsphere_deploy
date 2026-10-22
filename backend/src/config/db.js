import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDB() {
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  logger.info('MongoDB connected');
}
