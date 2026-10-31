import { Router } from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';

const router = Router();
router.use(protect, adminOnly);

const notCancelled = { $match: { status: { $ne: 'cancelled' } } };

// 1) Top-selling products: $match, $unwind, $group, $sort, $limit
router.get('/top-products', wrap(async (req, res) => {
  res.json(await Order.aggregate([
    notCancelled,
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        name: { $first: '$items.name' },
        unitsSold: { $sum: '$items.qty' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: 10 },
    { $project: { _id: 0, productId: '$_id', name: 1, unitsSold: 1, revenue: { $round: ['$revenue', 2] } } },
  ]));
}));

// 2) Revenue per category: two $lookup stages (order item -> product -> category)
router.get('/revenue-by-category', wrap(async (req, res) => {
  res.json(await Order.aggregate([
    notCancelled,
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.productId', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$product.categoryId',
        revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        unitsSold: { $sum: '$items.qty' },
      },
    },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    { $project: { _id: 0, category: '$category.name', unitsSold: 1, revenue: { $round: ['$revenue', 2] } } },
    { $sort: { revenue: -1 } },
  ]));
}));

// 3) Orders per day: $group with $dateToString
router.get('/orders-per-day', wrap(async (req, res) => {
  res.json(await Order.aggregate([
    notCancelled,
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 30 },
    { $project: { _id: 0, date: '$_id', orders: 1, revenue: { $round: ['$revenue', 2] } } },
  ]));
}));

// 4) Low stock: $match + $lookup + $sort
router.get('/low-stock', wrap(async (req, res) => {
  const threshold = Number(req.query.threshold) || 10;
  res.json(await Product.aggregate([
    { $match: { isActive: true, stock: { $lte: threshold } } },
    { $sort: { stock: 1 } },
    { $limit: 50 },
    { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    { $project: { _id: 0, name: 1, stock: 1, category: '$category.name' } },
  ]));
}));

// 5) Average order value per customer: $group + $avg + $lookup
router.get('/avg-order-value', wrap(async (req, res) => {
  res.json(await Order.aggregate([
    notCancelled,
    { $group: { _id: '$userId', orders: { $sum: 1 }, avgOrderValue: { $avg: '$total' } } },
    { $sort: { avgOrderValue: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { _id: 0, customer: '$user.name', orders: 1, avgOrderValue: { $round: ['$avgOrderValue', 2] } } },
  ]));
}));

export default router;
