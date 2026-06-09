import mongoose from 'mongoose';

const materialUsageSchema = new mongoose.Schema({
  project: { type: String, required: true }, // Referencing Project.code
  item: { type: String, required: true },
  quality: { type: String, default: '' },
  used: { type: Number, required: true },
  wasted: { type: Number, required: true },
  returned: { type: Number, required: true },
  date: { type: String, required: true },
  loggedBy: { type: String, required: true },
}, { timestamps: true });

export const MaterialUsage = mongoose.model('MaterialUsage', materialUsageSchema);
