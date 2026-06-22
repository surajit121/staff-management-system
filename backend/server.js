import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import compression from 'compression';

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
import { Admin } from './models/Admin.js';
import { Remark } from './models/Remark.js';
import { SiteDiary } from './models/SiteDiary.js';
import { Vendor } from './models/Vendor.js';
import { Asset } from './models/Asset.js';
import authRoutes from './routes/auth.js';
import { authMiddleware } from './middleware/auth.js';
import bcrypt from 'bcryptjs';
import { cacheMiddleware, clearCache } from './utils/cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Strict environment safety checks
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is not defined. Falling back to an insecure fallback.');
}

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

app.use(compression());

// Secure CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.onrender.com') ||
                      origin.startsWith('http://localhost') ||
                      origin.startsWith('http://127.0.0.1');

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
// Serve uploaded files as static assets
app.use('/uploads', express.static(uploadsDir));

// MongoDB Connection with pooling for performance
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(async () => {
    console.log('✅ MongoDB Connected');
    try {
      const adminExists = await Admin.findOne();
      if (!adminExists) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password', salt);
        await Admin.create({ username: 'admin', password: hashedPassword });
        console.log('✅ Default Admin created: admin / password');
      }
    } catch (err) {
      console.error('Failed to create default admin:', err);
    }
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Auth Routes
app.use('/api/auth', authRoutes);

// Generic CRUD Route Helper (for prototype speed)
const createRoutes = (model, path, populate = null) => {
  app.get(`/api/${path}`, authMiddleware, cacheMiddleware(30), async (req, res) => {
    try {
      let query = model.find().sort({ createdAt: -1 }).lean();
      if (populate) {
        query = model.find().sort({ createdAt: -1 }).populate(populate).lean();
      }
      const data = await query;
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post(`/api/${path}`, authMiddleware, async (req, res) => {
    try {
      const newItem = new model(req.body);
      const savedItem = await newItem.save();
      await clearCache(path);
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

  app.put(`/api/${path}/:id`, authMiddleware, async (req, res) => {
    try {
      const updatedItem = await model.findByIdAndUpdate(req.params.id, req.body, { new: true });
      await clearCache(path);
      if (populate) {
        const populatedItem = await model.findById(updatedItem._id).populate(populate);
        return res.json(populatedItem);
      }
      res.json(updatedItem);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete(`/api/${path}/:id`, authMiddleware, async (req, res) => {
    try {
      await model.findByIdAndDelete(req.params.id);
      await clearCache(path);
      res.json({ message: 'Deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
};

// Create API Routes

// File Upload Route
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
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
app.delete('/api/upload/:filename', authMiddleware, (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted' });
  } else {
    res.status(404).json({ message: 'File not found' });
  }
});

app.post('/api/staff/bulk', authMiddleware, async (req, res) => {
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
    await clearCache('staff');
    await clearCache('attendance');

    res.status(201).json(savedStaff);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk route for Stock Transfers (multi-item transfers)
app.post('/api/stock/bulk', authMiddleware, async (req, res) => {
  try {
    const transferData = req.body; // Array of stock transfer objects
    const savedTransfers = await StockTransfer.insertMany(transferData);
    await clearCache('stock');
    res.status(201).json(savedTransfers);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk route for Materials (multi-item usages)
app.post('/api/materials/bulk', authMiddleware, async (req, res) => {
  try {
    const materialData = req.body; // Array of material usage objects
    const savedMaterials = await MaterialUsage.insertMany(materialData);
    await clearCache('materials');
    res.status(201).json(savedMaterials);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk route for Billing (multi-item bills)
app.post('/api/billing/bulk', authMiddleware, async (req, res) => {
  try {
    const billingData = req.body; // Array of billing objects
    const savedBills = await Billing.insertMany(billingData);
    await clearCache('billing');
    res.status(201).json(savedBills);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Special route for single staff creation with auto-attendance
app.post('/api/staff', authMiddleware, async (req, res) => {
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
createRoutes(Remark, 'remarks', 'staffId');
createRoutes(SiteDiary, 'site-diary', 'projectId');
createRoutes(Vendor, 'vendors');
createRoutes(Asset, 'assets', 'assignedTo assignedProject');

// Log maintenance entry for an Asset
app.post('/api/assets/:id/maintenance', authMiddleware, async (req, res) => {
  try {
    const { date, type, cost, notes, performedBy } = req.body;
    if (!date) return res.status(400).json({ message: 'Service date is required' });
    
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    
    asset.maintenanceLog.push({ date, type, cost, notes, performedBy });
    asset.lastServiceDate = date;
    
    await asset.save();
    await clearCache('assets');
    
    const populatedAsset = await Asset.findById(asset._id).populate('assignedTo assignedProject');
    res.json(populatedAsset);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get assets overdue for service
app.get('/api/assets/due-service', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const assets = await Asset.find({
      nextServiceDue: { $ne: '', $lte: today },
      currentCondition: { $ne: 'Retired' }
    }).populate('assignedTo assignedProject').lean();
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Special route for staff selection in attendance/expenses
app.get('/api/staff-list', authMiddleware, cacheMiddleware(300), async (req, res) => {
  try {
    const staff = await Staff.find({}, 'name role color initials').lean();
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Vendor list for billing combobox
app.get('/api/vendor-list', authMiddleware, cacheMiddleware(120), async (req, res) => {
  try {
    const vendors = await Vendor.find({ isActive: true }, 'name category').lean();
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Vendor billing history
app.get('/api/vendors/:id/history', authMiddleware, async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).lean();
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    const bills = await Billing.find({ vendor: vendor.name }).sort({ createdAt: -1 }).lean();
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk status update for Billing
app.put('/api/billing/bulk-status', authMiddleware, async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ message: 'List of billing IDs is required' });
    }
    if (!['Pending', 'Billed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    await Billing.updateMany({ _id: { $in: ids } }, { $set: { status } });
    await clearCache('billing');
    res.json({ message: 'Billing status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dashboard Statistics Aggregator
app.get('/api/dashboard-stats', authMiddleware, cacheMiddleware(60), async (req, res) => {
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
