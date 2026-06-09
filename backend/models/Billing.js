import mongoose from 'mongoose';

const billingSchema = new mongoose.Schema({
  project: { type: String, required: true }, // Referencing Project.code
  item: { type: String, required: true },
  quality: { type: String, default: '' },
  vendor: { type: String, required: true },
  qty: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  deliveredDate: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Billed', 'Cancelled'], default: 'Pending' },
  attachments: [{
    filename: { type: String },
    originalName: { type: String },
    url: { type: String },
    mimetype: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

export const Billing = mongoose.model('Billing', billingSchema);
