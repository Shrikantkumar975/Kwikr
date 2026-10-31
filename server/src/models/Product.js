import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    // Referenced (one category has many products)
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true, min: 0.01 },
    unit: { type: String, default: '1 pc' },
    stock: { type: Number, required: true, min: 0, default: 0 },
    tags: { type: [String], default: [] },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Unit IV: indexes
productSchema.index({ name: 'text', tags: 'text' }); // text index for search
productSchema.index({ categoryId: 1, price: 1 }); // compound index for category + price filters

export default mongoose.model('Product', productSchema);
