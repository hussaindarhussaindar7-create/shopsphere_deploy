import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 }, // PKR, whole rupees
    stock: { type: Number, required: true, min: 0, default: 0 }
  },
  { timestamps: true }
);

export const Product = mongoose.model('Product', productSchema);
