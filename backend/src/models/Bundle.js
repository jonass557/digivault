import mongoose from 'mongoose';

// Pack / bundle : plusieurs produits vendus ensemble à un prix réduit.
// Au v1, tous les produits d'un bundle appartiennent au même vendeur.
const bundleSchema = new mongoose.Schema({
  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
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
  description: {
    type: String
  },
  thumbnail: {
    type: String
  },
  product_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  }],
  // Prix total du pack (doit être < somme des prix effectifs des produits).
  bundle_price: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  sales_count: {
    type: Number,
    default: 0
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

bundleSchema.index({ vendor_id: 1 });
bundleSchema.index({ status: 1 });

export default mongoose.model('Bundle', bundleSchema);
