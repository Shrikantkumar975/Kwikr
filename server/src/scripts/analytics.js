// Analytics with Mongoose (Unit V: predictive analytics on MongoDB data).
// Usage (from server/):
//   npm run analytics -- top        top-selling products (aggregation pipeline)
//   npm run analytics -- pairs      products frequently bought together
//   npm run analytics -- forecast   7-day order forecast from a linear trend
import 'dotenv/config';
import mongoose from 'mongoose';
import Order from '../models/Order.js';

const notCancelled = { $match: { status: { $ne: 'cancelled' } } };
const DAY = 24 * 60 * 60 * 1000;
const fmtDate = (d) => d.toISOString().slice(0, 10);

async function top(limit = 10) {
  const rows = await Order.aggregate([
    notCancelled,
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        units: { $sum: '$items.qty' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
      },
    },
    { $sort: { units: -1 } },
    { $limit: limit },
  ]);
  console.log(`${'Product'.padEnd(45)} ${'Units'.padStart(7)} ${'Revenue'.padStart(10)}`);
  for (const r of rows) {
    console.log(`${r._id.slice(0, 44).padEnd(45)} ${String(r.units).padStart(7)} ${r.revenue.toFixed(2).padStart(10)}`);
  }
}

// Tiny market-basket analysis: count pairs of products that appear in the same order
async function pairs(sampleSize = 10000, limit = 10) {
  const orders = await Order.aggregate([
    notCancelled,
    { $sample: { size: sampleSize } },
    { $project: { _id: 0, names: '$items.name' } },
  ]);
  const counts = new Map();
  for (const { names } of orders) {
    const unique = [...new Set(names)].sort();
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const key = `${unique[i]}  +  ${unique[j]}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .forEach(([key, n]) => console.log(`${String(n).padStart(4)}  ${key}`));
}

// Least-squares line through daily order counts, projected forward
async function forecast(historyDays = 30, horizon = 7) {
  const since = new Date(Date.now() - historyDays * DAY);
  since.setUTCHours(0, 0, 0, 0);
  const rows = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const series = rows.map((r) => r.orders);
  if (series.length < 3) {
    console.log('Not enough history. Run `npm run seed` first.');
    return;
  }
  const n = series.length;
  const meanX = (n - 1) / 2;
  const meanY = series.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  series.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  console.log(`Based on the last ${n} days (trend: ${slope >= 0 ? '+' : ''}${slope.toFixed(2)} orders/day)`);
  for (let i = 1; i <= horizon; i++) {
    const day = fmtDate(new Date(Date.now() + i * DAY));
    console.log(`  ${day}  ->  ${Math.max(0, Math.round(intercept + slope * (n - 1 + i)))} orders`);
  }
}

const commands = { top, pairs, forecast };

async function main() {
  const cmd = process.argv[2];
  if (!commands[cmd]) {
    console.log('Usage: npm run analytics -- <top|pairs|forecast>');
    return;
  }
  await mongoose.connect(process.env.MONGO_URI);
  await commands[cmd]();
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
