import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';

await connectDB();

const email = (process.env.SEED_ADMIN_EMAIL || 'admin@shopsphere.test').toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';

if (!(await User.findOne({ email }))) {
  await User.create({ name: 'Admin', email, passwordHash: await bcrypt.hash(password, 10), role: 'admin' });
  console.log(`Admin created: ${email}`);
} else {
  console.log('Admin already exists');
}

if ((await Product.countDocuments()) === 0) {
  await Product.insertMany([
    { name: 'Wireless Mouse', description: '2.4GHz, silent click', price: 1800, stock: 50 },
    { name: 'Mechanical Keyboard', description: 'Blue switches, RGB', price: 9500, stock: 20 },
    { name: 'USB-C Hub 7-in-1', description: 'HDMI, USB 3.0, SD', price: 6200, stock: 30 },
    { name: 'Laptop Stand', description: 'Aluminium, foldable', price: 3400, stock: 40 },
    { name: '27" Monitor', description: 'IPS 75Hz', price: 42000, stock: 8 }
  ]);
  console.log('Sample products inserted');
}

await mongoose.connection.close();
