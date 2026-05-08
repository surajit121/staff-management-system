import mongoose from 'mongoose';

const performanceSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  period: { type: String, enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly'], required: true },
  date: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  kpi: { type: String, required: true },
  comments: { type: String },
  reviewed: { type: String },
}, { timestamps: true });

export const Performance = mongoose.model('Performance', performanceSchema);
