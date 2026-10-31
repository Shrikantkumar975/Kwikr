import mongoose from 'mongoose';

export const ORDER_STATUSES = ['placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];

// Snapshot of the product at purchase time, so old orders stay correct if the price changes
const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed' },
    statusHistory: [
      new mongoose.Schema(
        { status: String, at: { type: Date, default: Date.now } },
        { _id: false }
      ),
    ],
    address: { label: String, line1: String, city: String, pincode: String },
    paymentMethod: { type: String, enum: ['COD', 'ONLINE'], default: 'COD' },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 }); // "my orders, newest first"
orderSchema.index({ createdAt: -1 }); // reports by date

export default mongoose.model('Order', orderSchema);
