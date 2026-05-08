import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Staff } from './models/Staff.js';
import { Travel } from './models/Travel.js';

dotenv.config();

async function checkData() {
  await mongoose.connect(process.env.MONGO_URI);
  const trips = await Travel.find().populate('staffId');
  console.log(JSON.stringify(trips, null, 2));
  await mongoose.disconnect();
}

checkData();
