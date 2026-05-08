import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Half Day', 'Work From Home'], required: true },
  checkIn: { type: String },
  checkOut: { type: String },
  notes: { type: String },
}, { timestamps: true });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
