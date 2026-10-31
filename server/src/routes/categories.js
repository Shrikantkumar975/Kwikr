import { Router } from 'express';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';

const router = Router();

router.get('/', wrap(async (req, res) => {
  res.json(await Category.find().sort({ name: 1 }));
}));

router.post('/', protect, adminOnly, wrap(async (req, res) => {
  res.status(201).json(await Category.create({ name: req.body.name }));
}));

router.put('/:id', protect, adminOnly, wrap(async (req, res) => {
  const doc = await Category.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true, runValidators: true });
  if (!doc) throw httpError(404, 'Category not found');
  res.json(doc);
}));

router.delete('/:id', protect, adminOnly, wrap(async (req, res) => {
  const inUse = await Product.exists({ categoryId: req.params.id });
  if (inUse) throw httpError(409, 'Category still has products');
  const doc = await Category.findByIdAndDelete(req.params.id);
  if (!doc) throw httpError(404, 'Category not found');
  res.json({ deleted: true });
}));

export default router;
