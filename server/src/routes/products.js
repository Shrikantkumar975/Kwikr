import { Router } from 'express';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';

const router = Router();
const pick = (b) => {
  const out = {};
  for (const k of ['name', 'categoryId', 'price', 'unit', 'stock', 'tags', 'description', 'imageUrl', 'isActive']) {
    if (b[k] !== undefined) out[k] = b[k];
  }
  return out;
};

// READ list: text search, category and price filters, pagination
router.get('/', wrap(async (req, res) => {
  const { q, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
  const filter = { isActive: true };
  if (q) filter.$text = { $search: q }; // uses the text index
  if (category) filter.categoryId = category; // uses the compound index
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  const lim = Math.min(Number(limit) || 20, 100);
  const pageNo = Math.max(Number(page) || 1, 1);
  const score = { score: { $meta: 'textScore' } };

  const [items, total] = await Promise.all([
    Product.find(filter, q ? score : {})
      .sort(q ? score : { _id: -1 })
      .skip((pageNo - 1) * lim)
      .limit(lim)
      .populate('categoryId', 'name'),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page: pageNo, pages: Math.ceil(total / lim) });
}));

router.get('/:id', wrap(async (req, res) => {
  const doc = await Product.findById(req.params.id).populate('categoryId', 'name');
  if (!doc) throw httpError(404, 'Product not found');
  res.json(doc);
}));

router.post('/', protect, adminOnly, wrap(async (req, res) => {
  res.status(201).json(await Product.create(pick(req.body)));
}));

router.put('/:id', protect, adminOnly, wrap(async (req, res) => {
  const doc = await Product.findByIdAndUpdate(req.params.id, pick(req.body), { new: true, runValidators: true });
  if (!doc) throw httpError(404, 'Product not found');
  res.json(doc);
}));

// Atomic stock change (restock with a positive number)
router.patch('/:id/stock', protect, adminOnly, wrap(async (req, res) => {
  const delta = Number(req.body.delta);
  if (!Number.isFinite(delta)) throw httpError(400, 'delta must be a number');
  const doc = await Product.findOneAndUpdate(
    { _id: req.params.id, stock: { $gte: -delta } }, // never go below zero
    { $inc: { stock: delta } },
    { new: true }
  );
  if (!doc) throw httpError(409, 'Product not found or stock would go negative');
  res.json(doc);
}));

router.delete('/:id', protect, adminOnly, wrap(async (req, res) => {
  const doc = await Product.findByIdAndDelete(req.params.id);
  if (!doc) throw httpError(404, 'Product not found');
  res.json({ deleted: true });
}));

export default router;
