import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Expense } from './models/Expense.js';
import { Staff } from './models/Staff.js';

dotenv.config();

async function checkExpenses() {
  await mongoose.connect(process.env.MONGO_URI);
  const expenses = await Expense.find().populate('staffId').sort({ createdAt: -1 });
  console.log(JSON.stringify(expenses, null, 2));
  await mongoose.disconnect();
}

checkExpenses();
