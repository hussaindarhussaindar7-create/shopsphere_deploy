import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';

async function main() {
  await connectDB();
  // bind to localhost only: the internet reaches us ONLY through Nginx
  const server = app.listen(env.PORT, env.HOST, () =>
    logger.info('API started', { host: env.HOST, port: env.PORT, env: env.NODE_ENV, paymentMode: env.PAYMENT_MODE })
  );

  const shutdown = (signal) => {
    logger.info('Shutting down', { signal });
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 7000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => logger.error('unhandledRejection', { reason: String(reason) }));

main().catch((err) => {
  logger.error('Startup failed', { message: err.message });
  process.exit(1);
});
