import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  purpose: { type: String, required: true },
  category: { type: String, enum: ['Travel', 'Entertainment', 'Supplies', 'Maintenance', 'Food', 'Other'], required: true },
  receipt: { type: Boolean, default: false },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  attachments: [{
    filename: { type: String },
    originalName: { type: String },
    url: { type: String },
    mimetype: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

export const Expense = mongoose.model('Expense', expenseSchema);
