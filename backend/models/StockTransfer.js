import mongoose from 'mongoose';

const stockTransferSchema = new mongoose.Schema({
  items: [{
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    quality: { type: String, default: '' }
  }],
  from: { type: String, required: true },
  to: { type: String, required: true },
  project: { type: String, required: true }, // Referencing Project.code
  date: { type: String, required: true },
  status: { type: String, enum: ['In Transit', 'Delivered', 'Reserved', 'Cancelled'], default: 'In Transit' },
}, { timestamps: true });

export const StockTransfer = mongoose.model('StockTransfer', stockTransferSchema);
