import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  short_description: {
    type: String
  },
  description: {
    type: String
  },
  price: {
    type: Number,
    required: true
  },
  sale_price: {
    type: Number
  },
  // Fenêtre de vente flash (optionnelle). Si renseignée, `sale_price` ne
  // s'applique que dans l'intervalle ; voir backend/src/utils/pricing.utils.js.
  sale_starts_at: {
    type: Date
  },
  sale_ends_at: {
    type: Date
  },
  product_type: {
    type: String,
    enum: ['document', 'audio', 'video', 'image', 'software', 'asset', 'other'],
    default: 'other'
  },
  file_format: {
    type: String
  },
  file_size: {
    type: String
  },
  thumbnail: {
    type: String
  },
  preview_url: {
    type: String
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'published', 'rejected', 'archived'],
    default: 'pending'
  },
  rejection_reason: {
    type: String
  },
  is_featured: {
    type: Boolean,
    default: false
  },
  sales_count: {
    type: Number,
    default: 0
  },
  view_count: {
    type: Number,
    default: 0
  },
  download_count: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0
  },
  rating_count: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String
  }],
  meta_title: {
    type: String
  },
  meta_description: {
    type: String
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

productSchema.index({ status: 1 });
productSchema.index({ vendor_id: 1 });
productSchema.index({ category_id: 1 });
productSchema.index({ name: 'text', short_description: 'text', description: 'text' });

export default mongoose.model('Product', productSchema);
