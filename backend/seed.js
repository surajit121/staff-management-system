import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Staff } from './models/Staff.js';
import { Attendance } from './models/Attendance.js';
import { Expense } from './models/Expense.js';
import { Performance } from './models/Performance.js';
import { Travel } from './models/Travel.js';
import { Project } from './models/Project.js';
import { StockTransfer } from './models/StockTransfer.js';
import { MaterialUsage } from './models/MaterialUsage.js';
import { Billing } from './models/Billing.js';

dotenv.config();

const data = {
  staff: [
    { name: 'Arjun Sharma', role: 'Site Engineer', dept: 'Engineering', phone: '9876543210', email: 'arjun@company.com', color: '#2C5F8A', initials: 'AS' },
    { name: 'Priya Das', role: 'Project Manager', dept: 'Management', phone: '9876543211', email: 'priya@company.com', color: '#2A6E4A', initials: 'PD' },
    { name: 'Ravi Kumar', role: 'Store Manager', dept: 'Inventory', phone: '9876543212', email: 'ravi@company.com', color: '#7B4F2E', initials: 'RK' },
    { name: 'Sunita Roy', role: 'Field Supervisor', dept: 'Operations', phone: '9876543213', email: 'sunita@company.com', color: '#5C3D8A', initials: 'SR' },
    { name: 'Mohan Patel', role: 'Accountant', dept: 'Finance', phone: '9876543214', email: 'mohan@company.com', color: '#1E6B70', initials: 'MP' },
  ],
  attendance: [
    { staffIdx: 0, date: '2024-01-15', status: 'Present', checkIn: '09:00', checkOut: '18:00', notes: '' },
    { staffIdx: 1, date: '2024-01-15', status: 'Present', checkIn: '08:45', checkOut: '17:30', notes: '' },
    { staffIdx: 2, date: '2024-01-15', status: 'Absent', checkIn: '', checkOut: '', notes: 'Medical leave' },
    { staffIdx: 3, date: '2024-01-16', status: 'Present', checkIn: '09:15', checkOut: '18:30', notes: '' },
    { staffIdx: 0, date: '2024-01-16', status: 'Present', checkIn: '08:55', checkOut: '17:50', notes: '' },
  ],
  expenses: [
    { staffIdx: 0, date: '2024-01-15', amount: 1250, purpose: 'Site transport', category: 'Travel', receipt: true, status: 'Approved' },
    { staffIdx: 1, date: '2024-01-15', amount: 3500, purpose: 'Client meeting lunch', category: 'Entertainment', receipt: true, status: 'Pending' },
    { staffIdx: 3, date: '2024-01-16', amount: 800, purpose: 'Office supplies', category: 'Supplies', receipt: false, status: 'Approved' },
    { staffIdx: 4, date: '2024-01-17', amount: 15000, purpose: 'Equipment repair', category: 'Maintenance', receipt: true, status: 'Pending' },
  ],
  performance: [
    { staffIdx: 0, period: 'Monthly', date: '2024-01-01', rating: 4, kpi: 'Site deliveries on time: 92%', comments: 'Excellent coordination with contractors', reviewed: 'Priya Das' },
    { staffIdx: 1, period: 'Monthly', date: '2024-01-01', rating: 5, kpi: 'Project completion: 100%', comments: 'Outstanding leadership and communication', reviewed: 'Admin' },
    { staffIdx: 2, period: 'Weekly', date: '2024-01-14', rating: 3, kpi: 'Stock accuracy: 87%', comments: 'Needs improvement in documentation', reviewed: 'Priya Das' },
  ],
  travel: [
    { staffIdx: 0, date: '2024-01-15', from: 'Bankura Office', to: 'Site A – Bishnupur', mode: 'Car', distance: 48, duration: 75, purpose: 'Site inspection', cost: 850 },
    { staffIdx: 1, date: '2024-01-15', from: 'Bankura Office', to: 'Kolkata HQ', mode: 'Train', distance: 215, duration: 240, purpose: 'Client meeting', cost: 450 },
    { staffIdx: 3, date: '2024-01-16', from: 'Site B', to: 'Bankura Office', mode: 'Bike', distance: 22, duration: 40, purpose: 'Report submission', cost: 120 },
  ],
  projects: [
    { name: 'Bishnupur Road Project', code: 'P001', location: 'Bishnupur', manager: 'Priya Das', budget: 5000000, status: 'Active', stock: 250 },
    { name: 'Bankura Municipal Complex', code: 'P002', location: 'Bankura', manager: 'Arjun Sharma', budget: 8500000, status: 'Active', stock: 450 },
    { name: 'Rural School Block', code: 'P003', location: 'Onda', manager: 'Sunita Roy', budget: 1200000, status: 'On Hold', stock: 80 },
  ],
  stock: [
    { item: 'Cement (50kg bags)', from: 'Main Office', to: 'Site A', qty: 100, date: '2024-01-15', project: 'P001', status: 'Delivered' },
    { item: 'Steel Rods (12mm)', from: 'Main Office', to: 'Site B', qty: 50, date: '2024-01-16', project: 'P002', status: 'In Transit' },
    { item: 'Sand (cubic m)', from: 'Site A', to: 'Site B', qty: 20, date: '2024-01-17', project: 'P002', status: 'Reserved' },
  ],
  materials: [
    { project: 'P001', item: 'Cement', used: 80, wasted: 5, returned: 10, date: '2024-01-15', loggedBy: 'Arjun Sharma' },
    { project: 'P002', item: 'Steel Rods', used: 45, wasted: 2, returned: 3, date: '2024-01-16', loggedBy: 'Sunita Roy' },
    { project: 'P001', item: 'Sand', used: 15, wasted: 3, returned: 2, date: '2024-01-17', loggedBy: 'Arjun Sharma' },
  ],
  billing: [
    { project: 'P001', item: 'Cement Delivery', qty: 100, rate: 380, amount: 38000, deliveredDate: '2024-01-10', status: 'Pending', vendor: 'Shree Cement' },
    { project: 'P002', item: 'Steel Rods', qty: 50, rate: 6200, amount: 310000, deliveredDate: '2024-01-12', status: 'Pending', vendor: 'Tata Steel Dist.' },
    { project: 'P003', item: 'Brick Supply', qty: 5000, rate: 8, amount: 40000, deliveredDate: '2024-01-14', status: 'Pending', vendor: 'Local Brick Co.' },
  ]
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding');

    // Clear existing data
    await Staff.deleteMany({});
    await Attendance.deleteMany({});
    await Expense.deleteMany({});
    await Performance.deleteMany({});
    await Travel.deleteMany({});
    await Project.deleteMany({});
    await StockTransfer.deleteMany({});
    await MaterialUsage.deleteMany({});
    await Billing.deleteMany({});

    // Seed Staff
    const createdStaff = await Staff.insertMany(data.staff);
    console.log(`✅ Seeded ${createdStaff.length} staff members`);

    // Helper to map staffIdx to real _id
    const mapStaff = (items) => items.map(item => ({
      ...item,
      staffId: createdStaff[item.staffIdx]._id
    }));

    await Attendance.insertMany(mapStaff(data.attendance));
    await Expense.insertMany(mapStaff(data.expenses));
    await Performance.insertMany(mapStaff(data.performance));
    await Travel.insertMany(mapStaff(data.travel));
    console.log('✅ Seeded staff-related records');

    await Project.insertMany(data.projects);
    await StockTransfer.insertMany(data.stock);
    await MaterialUsage.insertMany(data.materials);
    await Billing.insertMany(data.billing);
    console.log('✅ Seeded project and inventory records');

    console.log('🚀 Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();
