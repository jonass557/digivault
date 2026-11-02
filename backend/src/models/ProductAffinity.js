import mongoose from 'mongoose';

// Affinité entre produits ("fréquemment achetés ensemble").
// Une ligne par paire ORDONNÉE (product_a < product_b, tri stable par id string)
// pour éviter les doublons A-B / B-A. Incrémentée à chaque commande contenant
// les deux produits (voir processSuccessfulPayment).
const productAffinitySchema = new mongoose.Schema({
  product_a: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  product_b: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  count: {
    type: Number,
    default: 0
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

productAffinitySchema.index({ product_a: 1, product_b: 1 }, { unique: true });
productAffinitySchema.index({ product_a: 1, count: -1 });
productAffinitySchema.index({ product_b: 1, count: -1 });

export default mongoose.model('ProductAffinity', productAffinitySchema);
