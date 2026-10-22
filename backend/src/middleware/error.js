import { logger } from '../utils/logger.js';

export const notFound = (req, res) => res.status(404).json({ error: 'Not found' });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', { path: req.originalUrl, method: req.method, message: err.message, stack: err.stack });
  res.status(err.status || 500).json({ error: 'Internal server error' });
};
