// Seeds users, categories, products and orders so that indexes and explain() show real differences.
// Usage: npm run seed   (set SEED_PRODUCTS / SEED_ORDERS in .env to change sizes)
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';

const { ObjectId } = mongoose.Types;
const N_PRODUCTS = Number(process.env.SEED_PRODUCTS || 50000);
const N_ORDERS = Number(process.env.SEED_ORDERS || 20000);
const N_USERS = 50;

const catalog = {
  'Fruits & Vegetables': ['Banana', 'Apple', 'Tomato', 'Onion', 'Potato', 'Spinach', 'Carrot', 'Mango'],
  'Dairy & Eggs': ['Milk', 'Curd', 'Paneer', 'Butter', 'Cheese', 'Eggs', 'Lassi', 'Cream'],
  Snacks: ['Chips', 'Namkeen', 'Biscuits', 'Popcorn', 'Cookies', 'Nuts Mix', 'Wafers', 'Crackers'],
  Beverages: ['Cola', 'Orange Juice', 'Green Tea', 'Coffee', 'Energy Drink', 'Soda', 'Iced Tea', 'Coconut Water'],
  Bakery: ['Bread', 'Bun', 'Cake', 'Rusk', 'Muffin', 'Croissant', 'Pav', 'Brownie'],
  'Personal Care': ['Shampoo', 'Soap', 'Toothpaste', 'Face Wash', 'Body Lotion', 'Deodorant', 'Hand Wash', 'Sunscreen'],
  Household: ['Detergent', 'Dish Wash', 'Floor Cleaner', 'Tissue Roll', 'Garbage Bags', 'Air Freshener', 'Sponge', 'Bulb'],
  'Instant Food': ['Noodles', 'Pasta', 'Soup Mix', 'Oats', 'Ready Meal', 'Cereal', 'Pancake Mix', 'Poha'],
};
const brands = ['Fresh Farm', 'Daily Best', 'Nature Pure', 'Green Valley', 'Kisan Choice', 'Tasty Bites', 'Home Basics', 'Super Fresh'];
const sizes = ['250 g', '500 g', '1 kg', '1 L', '6 pcs', '12 pcs', '200 ml'];
const statuses = ['delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'out_for_delivery', 'packed', 'placed', 'cancelled'];

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const round2 = (n) => Math.round(n * 100) / 100;
const DAY = 24 * 60 * 60 * 1000;

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Clearing old data...');
  await Promise.all([User, Category, Product, Cart, Order].map((M) => M.collection.deleteMany({})));

  console.log('Creating users...');
  const [adminHash, userHash] = await Promise.all([bcrypt.hash('Admin@123', 10), bcrypt.hash('User@123', 10)]);
  const now = new Date();
  const users = [
    { _id: new ObjectId(), name: 'Admin', email: 'admin@kwikr.dev', passwordHash: adminHash, role: 'admin', addresses: [], createdAt: now, updatedAt: now },
    { _id: new ObjectId(), name: 'Demo Customer', email: 'user@kwikr.dev', passwordHash: userHash, role: 'customer',
      addresses: [{ label: 'Home', line1: '12 Demo Street', city: 'Sample City', pincode: '000001' }], createdAt: now, updatedAt: now },
  ];
  for (let i = 1; i <= N_USERS; i++) {
    users.push({
      _id: new ObjectId(), name: `Customer ${i}`, email: `customer${i}@kwikr.dev`, passwordHash: userHash, role: 'customer',
      addresses: [{ label: 'Home', line1: `${i} Sample Road`, city: 'Sample City', pincode: '000001' }], createdAt: now, updatedAt: now,
    });
  }
  await User.collection.insertMany(users);
  const customerIds = users.filter((u) => u.role === 'customer').map((u) => u._id);

  console.log('Creating categories...');
  const cats = await Category.insertMany(Object.keys(catalog).map((name) => ({ name })));

  console.log(`Creating ${N_PRODUCTS} products...`);
  const sample = []; // small pool of products reused when generating orders
  const BATCH = 5000;
  for (let done = 0; done < N_PRODUCTS; done += BATCH) {
    const docs = [];
    for (let i = 0; i < Math.min(BATCH, N_PRODUCTS - done); i++) {
      const cat = pick(cats);
      const item = pick(catalog[cat.name]);
      const size = pick(sizes);
      const doc = {
        _id: new ObjectId(),
        name: `${pick(brands)} ${item} ${size}`,
        categoryId: cat._id,
        price: round2(10 + Math.random() * 490),
        unit: size,
        stock: rand(200),
        tags: [cat.name.toLowerCase(), item.toLowerCase()],
        description: '',
        imageUrl: '',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        __v: 0,
      };
      docs.push(doc);
      if (sample.length < 3000) sample.push({ _id: doc._id, name: doc.name, price: doc.price });
    }
    await Product.collection.insertMany(docs);
    process.stdout.write(`\r  ${Math.min(done + BATCH, N_PRODUCTS)} / ${N_PRODUCTS}`);
  }
  console.log();

  console.log(`Creating ${N_ORDERS} orders...`);
  for (let done = 0; done < N_ORDERS; done += BATCH) {
    const docs = [];
    for (let i = 0; i < Math.min(BATCH, N_ORDERS - done); i++) {
      const used = new Set();
      const items = [];
      const count = 1 + rand(5);
      while (items.length < count) {
        const p = pick(sample);
        if (used.has(String(p._id))) continue;
        used.add(String(p._id));
        items.push({ productId: p._id, name: p.name, price: p.price, qty: 1 + rand(4) });
      }
      const createdAt = new Date(Date.now() - rand(90 * DAY));
      const status = pick(statuses);
      docs.push({
        userId: pick(customerIds),
        items,
        total: round2(items.reduce((s, it) => s + it.price * it.qty, 0)),
        status,
        statusHistory: [{ status: 'placed', at: createdAt }],
        address: { label: 'Home', line1: 'Seeded address', city: 'Sample City', pincode: '000001' },
        paymentMethod: 'COD',
        createdAt,
        updatedAt: createdAt,
        __v: 0,
      });
    }
    await Order.collection.insertMany(docs);
    process.stdout.write(`\r  ${Math.min(done + BATCH, N_ORDERS)} / ${N_ORDERS}`);
  }
  console.log();

  console.log('Building indexes...');
  await Promise.all([User, Category, Product, Cart, Order].map((M) => M.syncIndexes()));

  console.log('\nDone. Login with:');
  console.log('  admin@kwikr.dev / Admin@123');
  console.log('  user@kwikr.dev  / User@123');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
