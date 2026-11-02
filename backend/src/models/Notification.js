import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'order', 'payment', 'review', 'vendor', 'system', 'withdrawal',
      'price_drop', 'new_product', 'coupon', 'follow', 'affiliate', 'promo'
    ],
    default: 'system'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String
  },
  is_read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

notificationSchema.index({ user_id: 1 });
notificationSchema.index({ is_read: 1 });

export default mongoose.model('Notification', notificationSchema);
