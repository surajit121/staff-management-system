import mongoose from 'mongoose';

const travelSchema = new mongoose.Schema({
  staffId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }],
  date: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  travelDetails: [{
    mode: { type: String, enum: ['Car', 'Bike', 'Train', 'Bus', 'Auto', 'Flight', 'Walk'], required: true },
    distance: { type: Number, required: true },
    duration: { type: Number, required: true },
    cost: { type: Number, required: true },
  }],
  purpose: { type: String, required: true },
}, { timestamps: true });

export const Travel = mongoose.model('Travel', travelSchema);
