import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

// Used by Nginx/UptimeRobot/deploy.sh. 503 when database is down.
router.get('/', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'up' : 'down',
    uptimeSec: Math.round(process.uptime()),
    time: new Date().toISOString()
  });
});

export default router;
