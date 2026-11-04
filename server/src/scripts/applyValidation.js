// Applies the $jsonSchema validators from config/jsonSchemas.js to the collections.
// Usage: npm run validate
import 'dotenv/config';
import mongoose from 'mongoose';
import { jsonSchemas } from '../config/jsonSchemas.js';

async function main() {
  await mongoose.connect(process.env.MONGO_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
  const db = mongoose.connection.db;
  const existing = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);

  for (const [name, schema] of Object.entries(jsonSchemas)) {
    const options = { validator: { $jsonSchema: schema }, validationLevel: 'moderate', validationAction: 'error' };
    if (existing.includes(name)) {
      await db.command({ collMod: name, ...options });
      console.log(`Updated validator on "${name}"`);
    } else {
      await db.createCollection(name, options);
      console.log(`Created "${name}" with validator`);
    }
  }
  console.log('\nTry it in the shell:  db.products.insertOne({ name: "x", categoryId: ObjectId(), price: -5, stock: 1 })');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
