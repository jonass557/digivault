import mongoose from 'mongoose';

// Journal des utilisations de coupons.
// Sert au contrôle `max_uses_per_user`, à `used_count`, et aux statistiques.
const couponRedemptionSchema = new mongoose.Schema({
  coupon_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  code: {
    type: String
  },
  amount_discounted: {
    type: Number,
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

couponRedemptionSchema.index({ coupon_id: 1, user_id: 1 });
couponRedemptionSchema.index({ order_id: 1 });

export default mongoose.model('CouponRedemption', couponRedemptionSchema);
