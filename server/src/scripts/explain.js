// Shows the performance impact of indexes with explain("executionStats").
// Run `npm run seed` first. Usage: npm run explain
import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

function stagesOf(plan, out = []) {
  if (!plan) return out;
  out.push(plan.stage);
  if (plan.inputStage) stagesOf(plan.inputStage, out);
  (plan.inputStages || []).forEach((s) => stagesOf(s, out));
  return out;
}

async function measure(label, Model, filter, sort) {
  const ex = await Model.find(filter).sort(sort).explain('executionStats');
  const s = ex.executionStats;
  console.log(`  ${label}`);
  console.log(`    plan stages        : ${stagesOf(ex.queryPlanner.winningPlan).join(' -> ')}`);
  console.log(`    docs examined      : ${s.totalDocsExamined}`);
  console.log(`    keys examined      : ${s.totalKeysExamined}`);
  console.log(`    docs returned      : ${s.nReturned}`);
  console.log(`    execution time (ms): ${s.executionTimeMillis}`);
}

async function compare(title, Model, indexName, indexSpec, filter, sort) {
  console.log(`\n=== ${title} ===`);
  try { await Model.collection.dropIndex(indexName); } catch { /* index did not exist */ }
  await measure('WITHOUT index', Model, filter, sort);
  await Model.collection.createIndex(indexSpec);
  await measure('WITH index', Model, filter, sort);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const sampleProduct = await Product.findOne();
  const sampleOrder = await Order.findOne();
  if (!sampleProduct || !sampleOrder) throw new Error('No data found. Run: npm run seed');

  await compare(
    'Products: category + price filter (compound index)',
    Product, 'categoryId_1_price_1', { categoryId: 1, price: 1 },
    { categoryId: sampleProduct.categoryId, price: { $lte: 100 } }, { price: 1 }
  );
  await compare(
    "Orders: one customer's orders, newest first (compound index)",
    Order, 'userId_1_createdAt_-1', { userId: 1, createdAt: -1 },
    { userId: sampleOrder.userId }, { createdAt: -1 }
  );

  console.log('\nTip: COLLSCAN means a full collection scan, IXSCAN means an index was used.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
