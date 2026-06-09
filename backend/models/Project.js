import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  manager: { type: String, required: true },
  budget: { type: Number, required: true },
  expense: { type: Number, default: 0 },
  expensiveDetails: [{
    item: { type: String },
    date: { type: Date },
    quantity: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    quality: { type: String, default: '' }
  }],
  status: { type: String, enum: ['Active', 'On Hold', 'Completed', 'Cancelled'], default: 'Active' },
  stock: { type: Number, default: 0 },
  remarks: { type: String, default: '' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  attachments: [{
    filename: { type: String },
    originalName: { type: String },
    url: { type: String },
    mimetype: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

export const Project = mongoose.model('Project', projectSchema);
