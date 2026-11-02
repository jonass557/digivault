import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema({
  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  fee_rate: {
    type: Number,
    default: 0
  },
  fee_amount: {
    type: Number,
    default: 0
  },
  net_amount: {
    type: Number,
    default: 0
  },
  payment_method: {
    type: String,
    enum: ['mobile_money', 'bank_transfer'],
    default: 'mobile_money'
  },
  mobile_network: {
    type: String,
    enum: ['mtn', 'orange', 'moov', 'airtel', null]
  },
  phone_number: {
    type: String
  },
  bank_name: {
    type: String
  },
  bank_account: {
    type: String
  },
  bank_iban: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected', 'failed'],
    default: 'pending'
  },
  rejection_reason: {
    type: String
  },
  transaction_reference: {
    type: String
  },
  processed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processed_at: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

withdrawalSchema.index({ vendor_id: 1 });
withdrawalSchema.index({ status: 1 });

export default mongoose.model('Withdrawal', withdrawalSchema);
