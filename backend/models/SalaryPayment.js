import mongoose from 'mongoose';

const salaryPaymentSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  month: { type: String, required: true }, // e.g., 'April 2026'
  amount: { type: Number, required: true }, // Base Salary
  deductions: { type: Number, default: 0 },
  netPay: { type: Number, required: true },
  paymentDate: { type: String, required: true },
  paymentMethod: { type: String, enum: ['Bank Transfer', 'Cash', 'Cheque', 'UPI'], default: 'Bank Transfer' },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
}, { timestamps: true });


export const SalaryPayment = mongoose.model('SalaryPayment', salaryPaymentSchema);
