import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import { connectDB } from '../config/db.js';
import { logger } from '../utils/logger.js';

const outRoot = process.env.BACKUP_DIR || '/www/backup/db';
const keepDays = Number(process.env.KEEP_DAYS || 7);

await connectDB();

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = path.join(outRoot, `db-${stamp}`);
fs.mkdirSync(dir, { recursive: true });

const db = mongoose.connection.db;
const names = (await db.listCollections().toArray())
  .map((c) => c.name)
  .filter((n) => !n.startsWith('system.'));

for (const name of names) {
  const docs = await db.collection(name).find({}).toArray();
  fs.writeFileSync(path.join(dir, `${name}.json`), EJSON.stringify(docs, { relaxed: false }));
  logger.info('Collection backed up', { name, count: docs.length });
}

// purane backups hatao (keepDays se purane)
for (const entry of fs.readdirSync(outRoot)) {
  if (!entry.startsWith('db-')) continue;
  const p = path.join(outRoot, entry);
  if (Date.now() - fs.statSync(p).mtimeMs > keepDays * 86400000) {
    fs.rmSync(p, { recursive: true, force: true });
    logger.info('Old backup removed', { entry });
  }
}

logger.info('Backup complete', { dir });
await mongoose.connection.close();