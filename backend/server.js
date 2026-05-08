import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import Models
import { Staff } from './models/Staff.js';
import { Attendance } from './models/Attendance.js';
import { Expense } from './models/Expense.js';
import { Performance } from './models/Performance.js';
import { Travel } from './models/Travel.js';
import { Project } from './models/Project.js';
import { StockTransfer } from './models/StockTransfer.js';
import { MaterialUsage } from './models/MaterialUsage.js';
import { Billing } from './models/Billing.js';
import { SalaryPayment } from './models/SalaryPayment.js';
import { Leave } from './models/Leave.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config — save to ./uploads/ with unique filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext || mime) cb(null, true);
    else cb(new Error('Only images, PDFs and documents are allowed'));
  }
});

app.use(cors());
app.use(express.json());
// Serve uploaded files as static assets
app.use('/uploads', express.static(uploadsDir));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Generic CRUD Route Helper (for prototype speed)
const createRoutes = (model, path, populate = null) => {
  app.get(`/api/${path}`, async (req, res) => {
    try {
      let query = model.find().sort({ createdAt: -1 });
      if (populate) {
        query = query.populate(populate);
      }
      const data = await query;
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post(`/api/${path}`, async (req, res) => {
    try {
      const newItem = new model(req.body);
      const savedItem = await newItem.save();
      // If populate is specified, return the populated item
      if (populate) {
        const populatedItem = await model.findById(savedItem._id).populate(populate);
        return res.status(201).json(populatedItem);
      }
      res.status(201).json(savedItem);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put(`/api/${path}/:id`, async (req, res) => {
    try {
      const updatedItem = await model.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (populate) {
        const populatedItem = await model.findById(updatedItem._id).populate(populate);
        return res.json(populatedItem);
      }
      res.json(updatedItem);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete(`/api/${path}/:id`, async (req, res) => {
    try {
      await model.findByIdAndDelete(req.params.id);
      res.json({ message: 'Deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

// Create API Routes

// File Upload Route
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({
    filename: req.file.filename,
    originalName: req.file.originalname,
    url,
    mimetype: req.file.mimetype,
  });
});

// Delete Uploaded File
app.delete('/api/upload/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted' });
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

app.post('/api/staff/bulk', async (req, res) => {
  try {
    const staffData = req.body; // Array of staff objects
    const savedStaff = await Staff.insertMany(staffData);
    
    // Auto-create attendance for all new staff
    const today = new Date().toISOString().split('T')[0];
    const attendanceRecords = savedStaff.map(s => ({
      staffId: s._id,
      date: today,
      status: 'Present',
      checkIn: '09:00',
      checkOut: '18:00',
      notes: 'Auto-generated upon bulk staff creation'
    }));
    await Attendance.insertMany(attendanceRecords);

    res.status(201).json(savedStaff);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk route for Stock Transfers (multi-item transfers)
app.post('/api/stock/bulk', async (req, res) => {
  try {
    const transferData = req.body; // Array of stock transfer objects
    const savedTransfers = await StockTransfer.insertMany(transferData);
    res.status(201).json(savedTransfers);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk route for Materials (multi-item usages)
app.post('/api/materials/bulk', async (req, res) => {
  try {
    const materialData = req.body; // Array of material usage objects
    const savedMaterials = await MaterialUsage.insertMany(materialData);
    res.status(201).json(savedMaterials);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Special route for single staff creation with auto-attendance
app.post('/api/staff', async (req, res) => {
  try {
    const newItem = new Staff(req.body);
    const savedItem = await newItem.save();
    
    // Auto-create an attendance entry for the new staff member
    const today = new Date().toISOString().split('T')[0];
    const newAttendance = new Attendance({
      staffId: savedItem._id,
      date: today,
      status: 'Present',
      checkIn: '09:00',
      checkOut: '18:00',
      notes: 'Auto-generated upon staff creation'
    });
    await newAttendance.save();

    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

createRoutes(Staff, 'staff');
createRoutes(Attendance, 'attendance', 'staffId');
createRoutes(Expense, 'expenses', 'staffId');
createRoutes(Performance, 'performance', 'staffId');
createRoutes(Travel, 'travel', 'staffId');
createRoutes(Project, 'projects');
createRoutes(StockTransfer, 'stock');
createRoutes(MaterialUsage, 'materials');
createRoutes(Billing, 'billing');
createRoutes(SalaryPayment, 'salary-payments', 'staffId');
createRoutes(Leave, 'leave', 'staffId');

// Special route for staff selection in attendance/expenses
app.get('/api/staff-list', async (req, res) => {
  try {
    const staff = await Staff.find({}, 'name role color initials');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dashboard Statistics Aggregator
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const [staffCount, pendingExpenses, activeProjects, pendingBilling] = await Promise.all([
      Staff.countDocuments(),
      Expense.countDocuments({ status: 'Pending' }),
      Project.countDocuments({ status: 'Active' }),
      Billing.aggregate([
        { $match: { status: 'Pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      staffCount,
      pendingExpensesCount: pendingExpenses,
      activeProjectsCount: activeProjects,
      totalPendingBilling: pendingBilling[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
