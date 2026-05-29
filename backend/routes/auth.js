import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.js';
import { sendEmail } from '../utils/sendEmail.js';

const router = express.Router();

const escapeRegex = (string) => {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const trimmedUsername = username.trim();
    const admin = await Admin.findOne({
      username: { $regex: new RegExp(`^\\s*${escapeRegex(trimmedUsername)}\\s*$`, 'i') }
    });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

    res.json({
      token,
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    const existingAdmin = await Admin.findOne({
      username: { $regex: new RegExp(`^\\s*${escapeRegex(trimmedUsername)}\\s*$`, 'i') }
    });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({
      username: trimmedUsername,
      email: trimmedEmail,
      password: hashedPassword
    });

    await newAdmin.save();

    const token = jwt.sign({ id: newAdmin._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

    res.status(201).json({
      token,
      user: {
        id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please enter your email' });
    }

    const trimmedEmail = email.trim();
    const admin = await Admin.findOne({
      email: { $regex: new RegExp(`^\\s*${escapeRegex(trimmedEmail)}\\s*$`, 'i') }
    });
    if (!admin) {
      return res.status(404).json({ message: 'No account found with that email' });
    }

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    admin.resetCode = resetCode;
    admin.resetCodeExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await admin.save();

    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #0f172a;">Password Reset Request</h2>
        <p style="color: #475569;">You recently requested to reset your password for StaffSync Pro. Enter the following 6-digit code to proceed:</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #4f46e5;">${resetCode}</span>
        </div>
        <p style="color: #475569; font-size: 13px;">This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `;

    try {
      await sendEmail({ email: admin.email, subject: 'StaffSync Pro - Password Reset Code', message });
      res.json({ message: 'A verification code has been sent to your email.' });
    } catch (err) {
      admin.resetCode = undefined;
      admin.resetCodeExpires = undefined;
      await admin.save();
      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) return res.status(400).json({ message: 'Email and code are required' });

    const trimmedEmail = email.trim();
    const admin = await Admin.findOne({ 
      email: { $regex: new RegExp(`^\\s*${escapeRegex(trimmedEmail)}\\s*$`, 'i') }, 
      resetCode: code, 
      resetCodeExpires: { $gt: Date.now() } 
    });

    if (!admin) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }
    
    res.json({ message: 'Code verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) return res.status(400).json({ message: 'Missing required fields' });

    const trimmedEmail = email.trim();
    const admin = await Admin.findOne({ 
      email: { $regex: new RegExp(`^\\s*${escapeRegex(trimmedEmail)}\\s*$`, 'i') }, 
      resetCode: code, 
      resetCodeExpires: { $gt: Date.now() } 
    });

    if (!admin) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    admin.resetCode = undefined;
    admin.resetCodeExpires = undefined;
    await admin.save();

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Setup route to initialize default admin if none exists
router.get('/setup', async (req, res) => {
  try {
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);

    const newAdmin = new Admin({
      username: 'admin',
      password: hashedPassword
    });

    await newAdmin.save();
    res.status(201).json({ message: 'Default admin created (username: admin, password: password)' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
