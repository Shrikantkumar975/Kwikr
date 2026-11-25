import mongoose from 'mongoose';

export async function connectDB() {
  let uri = (process.env.MONGO_URI || '').replace(/^["']|["']$/g, '').trim();
  if (!uri) throw new Error('MONGO_URI is not set. Copy .env.example to .env first.');

  const options = {};
  if (process.env.DB_NAME) {
    options.dbName = process.env.DB_NAME;
    // Ensure the database name in the URI path matches DB_NAME if specified
    if (uri.includes('.mongodb.net/')) {
      uri = uri.replace(/\.mongodb\.net\/([^?]+|$)/, `.mongodb.net/${process.env.DB_NAME}`);
    } else if (uri.includes(':27017/')) {
      uri = uri.replace(/:27017\/([^?]+|$)/, `:27017/${process.env.DB_NAME}`);
    }
  }

  await mongoose.connect(uri, options);
  console.log(`MongoDB connected to database: "${mongoose.connection.name}" on host: ${mongoose.connection.host}`);
}
