import { Router } from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';

const router = Router();
router.use(protect);

const round2 = (n) => Math.round(n * 100) / 100;

// Checkout: cart -> order.
// Stock is reduced atomically per product with a conditional $inc.
// If any item fails, earlier decrements are rolled back.
// (Upgrade idea for Unit VI: wrap this in a multi-document transaction on Atlas.)
router.post('/', wrap(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user._id }).populate('items.productId');
  if (!cart || cart.items.length === 0) throw httpError(400, 'Cart is empty');

  const address = req.body.address || req.user.addresses[0];
  if (!address || !address.line1) throw httpError(400, 'A delivery address is required');

  const items = [];
  const decremented = [];
  try {
    for (const it of cart.items) {
      const p = it.productId;
      if (!p || !p.isActive) throw httpError(400, 'A product in your cart is no longer available');
      const r = await Product.updateOne({ _id: p._id, stock: { $gte: it.qty } }, { $inc: { stock: -it.qty } });
      if (r.modifiedCount !== 1) throw httpError(409, `Not enough stock for ${p.name}`);
      decremented.push({ id: p._id, qty: it.qty });
      items.push({ productId: p._id, name: p.name, price: p.price, qty: it.qty });
    }
  } catch (err) {
    await Promise.all(decremented.map((d) => Product.updateOne({ _id: d.id }, { $inc: { stock: d.qty } })));
    throw err;
  }

  const total = round2(items.reduce((sum, i) => sum + i.price * i.qty, 0));
  const order = await Order.create({
    userId: req.user._id,
    items,
    total,
    address: { label: address.label, line1: address.line1, city: address.city, pincode: address.pincode },
    paymentMethod: req.body.paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD',
    statusHistory: [{ status: 'placed' }],
  });
  await Cart.deleteOne({ userId: req.user._id });
  res.status(201).json(order);
}));

// My orders (uses the { userId, createdAt } index) with status filter and pagination
router.get('/mine', wrap(async (req, res) => {
  const { status, page = 1, limit = 5 } = req.query;
  const filter = { userId: req.user._id };
  if (status && ORDER_STATUSES.includes(status)) {
    filter.status = status;
  }
  const lim = Math.min(Number(limit) || 5, 50);
  const pageNo = Math.max(Number(page) || 1, 1);

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNo - 1) * lim)
      .limit(lim),
    Order.countDocuments(filter),
  ]);

  res.json({
    items,
    total,
    page: pageNo,
    pages: Math.ceil(total / lim) || 1,
  });
}));

// Admin: all orders, optional status filter, pagination
router.get('/', adminOnly, wrap(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = status ? { status } : {};
  const lim = Math.min(Number(limit) || 20, 100);
  const pageNo = Math.max(Number(page) || 1, 1);
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((pageNo - 1) * lim).limit(lim).populate('userId', 'name email'),
    Order.countDocuments(filter),
  ]);
  res.json({ items, total, page: pageNo, pages: Math.ceil(total / lim) });
}));

// Admin: update status. Cancelling puts the stock back with one bulkWrite.
router.patch('/:id/status', adminOnly, wrap(async (req, res) => {
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) throw httpError(400, `status must be one of ${ORDER_STATUSES.join(', ')}`);
  const order = await Order.findById(req.params.id);
  if (!order) throw httpError(404, 'Order not found');
  if (order.status === 'cancelled') throw httpError(409, 'Order is already cancelled');

  if (status === 'cancelled') {
    await Product.bulkWrite(
      order.items.map((i) => ({ updateOne: { filter: { _id: i.productId }, update: { $inc: { stock: i.qty } } } }))
    );
  }
  order.status = status;
  order.statusHistory.push({ status });
  await order.save();
  res.json(order);
}));

export default router;
