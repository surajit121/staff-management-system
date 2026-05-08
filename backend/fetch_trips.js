import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Travel } from './models/Travel.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('connected');
    const trips = await Travel.find().limit(5);
    console.log(trips.map(t => t.date));
    process.exit(0);
  })
  .catch(err => console.error(err));
