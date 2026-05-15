import mongoose from 'mongoose';

const remarkSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  destination: { type: String, required: true },
  purpose: { type: String, required: true },
  goingTime: { type: String, required: true },
  returnTime: { type: String, required: true },
}, { timestamps: true });

export const Remark = mongoose.model('Remark', remarkSchema);
