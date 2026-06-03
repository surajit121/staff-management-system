import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  staffId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }],
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  purpose: { type: String, required: true },
  category: { type: mongoose.Schema.Types.Mixed, required: true },
  location: {
    from: { type: String, default: '' },
    to: { type: String, default: '' },
  },
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

expenseSchema.index({ status: 1 });
expenseSchema.index({ staffId: 1, date: -1 });
expenseSchema.index({ date: -1 });

export const Expense = mongoose.model('Expense', expenseSchema);
