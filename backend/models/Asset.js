import mongoose from 'mongoose';

const maintenanceSchema = new mongoose.Schema({
  date: { type: String, required: true },
  type: {
    type: String,
    enum: ['Routine Service', 'Repair', 'Inspection', 'Installation', 'Other'],
    default: 'Routine Service'
  },
  cost: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  performedBy: { type: String, default: '' },
}, { timestamps: true });

const assetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  assetCode: { type: String, required: true, unique: true },
  category: {
    type: String,
    enum: ['Vehicle', 'Tool', 'Equipment', 'Electronics', 'Other'],
    required: true
  },
  brand: { type: String, default: '' },
  model: { type: String, default: '' },
  purchaseDate: { type: String, default: '' },
  purchaseCost: { type: Number, default: 0 },
  currentCondition: {
    type: String,
    enum: ['Good', 'Fair', 'Needs Repair', 'Retired'],
    default: 'Good'
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  assignedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  lastServiceDate: { type: String, default: '' },
  nextServiceDue: { type: String, default: '' },
  maintenanceLog: [maintenanceSchema],
}, { timestamps: true });

assetSchema.index({ assetCode: 1 });
assetSchema.index({ category: 1 });
assetSchema.index({ assignedTo: 1 });
assetSchema.index({ assignedProject: 1 });

export const Asset = mongoose.model('Asset', assetSchema);
