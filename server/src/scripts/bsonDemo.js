// Inserts one document containing many BSON types, then asks MongoDB for the type of each field.
// Usage: npm run bson
import 'dotenv/config';
import mongoose from 'mongoose';

const { ObjectId, Int32, Double, Long, Decimal128, Binary } = mongoose.mongo;

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.db.collection('bson_demo');
  await col.deleteMany({});

  const doc = {
    _id: new ObjectId(),
    title: 'BSON type tour',
    int32Field: new Int32(42),
    doubleField: new Double(3.14),
    longField: Long.fromString('9007199254740993'),
    decimalField: Decimal128.fromString('199.99'),
    isActive: true,
    createdAt: new Date(),
    tags: ['fruit', 'fresh'],
    address: { city: 'Sample City', pincode: '000001' },
    nothing: null,
    binaryField: new Binary(Buffer.from('hello')),
    regexField: /^fresh/i,
  };
  await col.insertOne(doc);

  const fields = Object.keys(doc);
  const project = Object.fromEntries(fields.map((f) => [f, { $type: `$${f}` }]));
  const [types] = await col.aggregate([{ $project: { _id: 0, ...project } }]).toArray();

  console.log('Field -> BSON type');
  for (const f of fields) console.log(`  ${f.padEnd(14)} -> ${f === '_id' ? 'objectId' : types[f] ?? 'objectId'}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
