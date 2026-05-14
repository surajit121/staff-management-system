import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    // sparse allows unique indexing but ignoring nulls for backwards compatibility
    sparse: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  resetCode: {
    type: String
  },
  resetCodeExpires: {
    type: Date
  }
}, { timestamps: true });

export const Admin = mongoose.model('Admin', AdminSchema);
