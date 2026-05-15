import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  dept: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  color: { type: String, default: '#2C5F8A' },
  initials: { type: String, required: true },
}, { timestamps: true });

staffSchema.index({ name: 1 });

export const Staff = mongoose.model('Staff', staffSchema);
