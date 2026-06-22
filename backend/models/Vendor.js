import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: {
    type: String,
    required: true,
  },
  contactPerson: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
  address: { type: String, default: '' },
  paymentTerms: { type: String, default: '' }, // e.g. "Net 30 days", "Advance"
  rating: { type: Number, min: 1, max: 5, default: 3 },
  notes: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  date: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  inHold: { type: Boolean, default: false },
  pendingAmount: { type: Number, default: 0 },
  totalTransactions: { type: Number, default: 0 },
}, { timestamps: true });

vendorSchema.index({ name: 1 });
vendorSchema.index({ category: 1 });

export const Vendor = mongoose.model('Vendor', vendorSchema);
