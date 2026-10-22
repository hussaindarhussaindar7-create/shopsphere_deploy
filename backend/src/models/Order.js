import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: String,
        price: Number,
        qty: { type: Number, min: 1 }
      }
    ],
    total: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'paid', 'cancelled'], default: 'pending', index: true },
    paymentRef: { type: String, default: null }
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);
