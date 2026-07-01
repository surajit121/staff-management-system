import mongoose from 'mongoose';

const siteDiarySchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  date: { type: String, required: true },
  supervisorName: { type: String, required: true },
  workersPresent: { type: Number, default: 0 },
  weatherCondition: {
    type: String,
    enum: ['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Stormy', 'Foggy'],
    default: 'Sunny'
  },
  workDone: { type: String, required: true },
  workCompleted: { type: Boolean, default: false },
  materialsUsed: [{
    item: { type: String, default: '' },
    qty: { type: Number, default: 0 },
    unit: { type: String, default: 'pcs' }
  }],
  issues: { type: String, default: '' },
  nextDayPlan: { type: String, default: '' },
  photos: [{
    filename: { type: String },
    originalName: { type: String },
    url: { type: String },
    mimetype: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

siteDiarySchema.index({ projectId: 1, date: -1 });

export const SiteDiary = mongoose.model('SiteDiary', siteDiarySchema);
