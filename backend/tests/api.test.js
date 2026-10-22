import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/unused-in-tests';
process.env.JWT_SECRET ??= 'test-secret-test-secret-123456';
process.env.PAYMENT_WEBHOOK_SECRET ??= 'test-webhook-secret-123456';

const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');

test('health reports degraded (503) when database is not connected', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 503);
  assert.equal(res.body.db, 'down');
});

test('orders require authentication', async () => {
  const res = await request(app).post('/api/orders').send({ items: [] });
  assert.equal(res.status, 401);
});

test('register validates input', async () => {
  const res = await request(app).post('/api/auth/register').send({ email: 'bad' });
  assert.equal(res.status, 400);
});

test('webhook rejects a bad signature', async () => {
  const res = await request(app)
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('x-signature', 'wrong')
    .send(JSON.stringify({ orderId: 'x', status: 'succeeded' }));
  assert.equal(res.status, 401);
});

test('webhook accepts a valid signature format and validates orderId', async () => {
  const body = JSON.stringify({ orderId: 'not-an-id', status: 'succeeded' });
  const sig = crypto.createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET).update(body).digest('hex');
  const res = await request(app)
    .post('/api/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('x-signature', sig)
    .send(body);
  assert.equal(res.status, 400);
});
