import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  // Qui possède/finance le coupon.
  //  - 'vendor' : la réduction est déduite de la part du vendeur.
  //  - 'admin'  : campagne plateforme (absorbée par la marge plateforme au retrait).
  owner_type: {
    type: String,
    enum: ['admin', 'vendor'],
    required: true
  },
  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null
  },
  description: {
    type: String
  },
  discount_type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discount_value: {
    type: Number,
    required: true,
    min: 0
  },
  // Portée d'application de la réduction.
  //  - 'all'      : toute la commande (coupons admin surtout).
  //  - 'vendor'   : uniquement les produits du vendeur propriétaire.
  //  - 'product'  : uniquement les `product_ids`.
  //  - 'category' : uniquement les produits des `category_ids`.
  scope: {
    type: String,
    enum: ['all', 'vendor', 'product', 'category'],
    default: 'all'
  },
  product_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  category_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  min_order_amount: {
    type: Number,
    default: 0
  },
  // Plafond de réduction (utile pour les pourcentages). 0/null = illimité.
  max_discount_amount: {
    type: Number,
    default: null
  },
  max_uses: {
    type: Number,
    default: null // null = illimité
  },
  used_count: {
    type: Number,
    default: 0
  },
  max_uses_per_user: {
    type: Number,
    default: null // null = illimité
  },
  starts_at: {
    type: Date,
    default: null
  },
  expires_at: {
    type: Date,
    default: null
  },
  new_customers_only: {
    type: Boolean,
    default: false
  },
  // Réservé aux abonnés du vendeur (système social, phase ultérieure).
  // Ignoré tant que les follows n'existent pas.
  subscribers_only: {
    type: Boolean,
    default: false
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

couponSchema.index({ vendor_id: 1 });
couponSchema.index({ owner_type: 1 });

export default mongoose.model('Coupon', couponSchema);
