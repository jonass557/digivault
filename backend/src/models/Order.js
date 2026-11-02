import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  order_number: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  total_amount: {
    type: Number,
    required: true
  },
  commission_amount: {
    type: Number,
    required: true
  },
  vendor_amount: {
    type: Number,
    required: true
  },
  // Réduction appliquée (coupon / bundle). Défauts neutres pour rétro-compat.
  coupon_code: {
    type: String,
    default: null
  },
  discount_amount: {
    type: Number,
    default: 0
  },
  bundle_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bundle',
    default: null
  },
  payment_method: {
    type: String,
    enum: ['card', 'mobile_money'],
    required: true
  },
  payment_status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  payment_reference: {
    type: String
  },
  transaction_id: {
    type: String
  },
  currency: {
    type: String,
    default: 'XOF'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  customer_email: {
    type: String
  },
  customer_phone: {
    type: String
  },
  notes: {
    type: String
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

orderSchema.index({ user_id: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ payment_status: 1 });

export default mongoose.model('Order', orderSchema);
