import { Router } from 'express';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';

const router = Router();
router.use(protect);

const getCart = (userId) =>
  Cart.findOne({ userId }).populate('items.productId', 'name price unit stock imageUrl');

router.get('/', wrap(async (req, res) => {
  res.json((await getCart(req.user._id)) || { items: [] });
}));

// Add an item: $inc if it is already in the cart, otherwise $push (upsert creates the cart)
router.post('/items', wrap(async (req, res) => {
  const { productId } = req.body;
  const qty = Number(req.body.qty ?? 1);
  if (!Number.isInteger(qty) || qty < 1) throw httpError(400, 'qty must be a positive integer');
  const product = await Product.findOne({ _id: productId, isActive: true });
  if (!product) throw httpError(404, 'Product not found');

  const userId = req.user._id;
  const inc = await Cart.updateOne({ userId, 'items.productId': productId }, { $inc: { 'items.$.qty': qty } });
  if (inc.matchedCount === 0) {
    await Cart.updateOne({ userId }, { $push: { items: { productId, qty } } }, { upsert: true });
  }
  res.status(201).json(await getCart(userId));
}));

// Set an exact quantity ($set with the positional operator)
router.patch('/items/:productId', wrap(async (req, res) => {
  const qty = Number(req.body.qty);
  if (!Number.isInteger(qty) || qty < 1) throw httpError(400, 'qty must be a positive integer');
  const r = await Cart.updateOne(
    { userId: req.user._id, 'items.productId': req.params.productId },
    { $set: { 'items.$.qty': qty } }
  );
  if (r.matchedCount === 0) throw httpError(404, 'Item not in cart');
  res.json(await getCart(req.user._id));
}));

// Remove an item ($pull)
router.delete('/items/:productId', wrap(async (req, res) => {
  await Cart.updateOne({ userId: req.user._id }, { $pull: { items: { productId: req.params.productId } } });
  res.json(await getCart(req.user._id));
}));

router.delete('/', wrap(async (req, res) => {
  await Cart.deleteOne({ userId: req.user._id });
  res.json({ items: [] });
}));

export default router;
