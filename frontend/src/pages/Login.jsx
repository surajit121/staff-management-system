import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Loader2, LayoutPanelLeft, ArrowLeft, Mail, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('login'); // 'login', 'register', 'forgot_request', 'forgot_verify', 'forgot_reset'

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setResetCode('');
    setShowPassword(false);
  };

  const switchMode = (mode) => {
    setViewMode(mode);
    if (mode === 'login' || mode === 'register' || mode === 'forgot_request') {
      resetForm();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      login(response.data.token, response.data.user);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', { username, email, password });
      login(response.data.token, response.data.user);
      toast.success('Registration successful! Welcome to StaffSync Pro.');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      toast.success(response.data.message || 'Verification code sent!');
      setViewMode('forgot_verify');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotVerify = async (e) => {
    e.preventDefault();
    if (!resetCode) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/verify-reset-code', { email, code: resetCode });
      toast.success('Code verified successfully');
      setViewMode('forgot_reset');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/reset-password', { email, code: resetCode, newPassword: password });
      toast.success(response.data.message || 'Password reset successfully');
      switchMode('login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative overflow-hidden px-4">
      {/* Dynamic backdrop ambient glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[5%] left-[5%] w-[350px] h-[350px] bg-accent/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            x: [0, -100, 60, 0],
            y: [0, 80, -60, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] bg-purple/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, 50, -50, 0],
            y: [0, 100, -80, 0],
            scale: [1, 1.2, 0.85, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[35%] left-[35%] w-[280px] h-[280px] bg-teal/15 rounded-full blur-[90px]"
        />
      </div>

      {/* Modern dotted/grid pattern overlay for high-tech depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.18),rgba(2,6,23,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md p-8 md:p-10 backdrop-blur-xl bg-surface/35 dark:bg-surface/20 border border-border/40 dark:border-white/5 rounded-3xl shadow-[0_0_50px_0_rgba(0,0,0,0.12)] dark:shadow-[0_0_60px_0_rgba(0,0,0,0.45)] relative z-10 mx-4 overflow-hidden transition-all duration-300 hover:border-accent/25"
      >
        <div className="flex flex-col items-center mb-8 relative">
          {viewMode !== 'login' && (
            <button
              onClick={() => switchMode('login')}
              className="absolute left-0 top-1 p-2 text-text3 hover:text-text hover:bg-surface2/50 dark:hover:bg-white/5 rounded-xl transition-all"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent via-indigo-500 to-purple text-white flex items-center justify-center shadow-glow shadow-accent/20 mb-4 hover:scale-105 transition-transform duration-300">
            <LayoutPanelLeft size={30} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-accent via-indigo-400 to-purple">StaffSync Pro</h1>
          <p className="text-text2 text-[13px] mt-2 text-center px-4 font-medium">
            {viewMode === 'login' ? 'Sign in to your account' :
              viewMode === 'register' ? 'Create a new admin account' :
                viewMode === 'forgot_request' ? 'Enter your email to recover your password' :
                  viewMode === 'forgot_verify' ? 'Enter the 6-digit code sent to your email' :
                    'Create a strong new password'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'login' && (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleLogin}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">Username</label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter admin username"
                    className="w-full pl-12 pr-4 py-3.5 bg-surface2/30 dark:bg-surface2/15 border border-border/40 dark:border-white/5 rounded-2xl text-text placeholder:text-text3 focus:outline-none focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all peer text-base font-medium"
                  />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-accent to-purple transition-all duration-300 peer-focus:w-full rounded-full" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-text2">Password</label>
                  <button type="button" onClick={() => switchMode('forgot_request')} className="text-xs text-accent hover:underline font-bold transition-colors">Forgot password?</button>
                </div>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3.5 bg-surface2/30 dark:bg-surface2/15 border border-border/40 dark:border-white/5 rounded-2xl text-text placeholder:text-text3 focus:outline-none focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all peer text-base font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text3 hover:text-text transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-accent to-purple transition-all duration-300 peer-focus:w-full rounded-full" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-accent via-indigo-600 to-purple hover:opacity-95 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] duration-150 shadow-glow hover:shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2 text-sm"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
              </button>

              <div className="text-center text-xs text-text2 mt-4 pt-4 border-t border-border/40 dark:border-white/5">
                Don't have an account? <button type="button" onClick={() => switchMode('register')} className="text-accent hover:underline font-bold transition-colors ml-1">Sign up</button>
              </div>
            </motion.form>
          )}

          {viewMode === 'register' && (
            <motion.form
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleRegister}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">Username</label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full pl-12 pr-4 py-3.5 bg-surface2/30 dark:bg-surface2/15 border border-border/40 dark:border-white/5 rounded-2xl text-text placeholder:text-text3 focus:outline-none focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all peer text-base font-medium"
                  />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-accent to-purple transition-all duration-300 peer-focus:w-full rounded-full" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">Email</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-surface2/30 dark:bg-surface2/15 border border-border/40 dark:border-white/5 rounded-2xl text-text placeholder:text-text3 focus:outline-none focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all peer text-base font-medium"
                  />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-accent to-purple transition-all duration-300 peer-focus:w-full rounded-full" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">Password</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full pl-12 pr-12 py-3.5 bg-surface2/30 dark:bg-surface2/15 border border-border/40 dark:border-white/5 rounded-2xl text-text placeholder:text-text3 focus:outline-none focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all peer text-base font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text3 hover:text-text transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-accent to-purple transition-all duration-300 peer-focus:w-full rounded-full" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">Confirm Password</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full pl-12 pr-12 py-3.5 bg-surface2/30 dark:bg-surface2/15 border border-border/40 dark:border-white/5 rounded-2xl text-text placeholder:text-text3 focus:outline-none focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all peer text-base font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text3 hover:text-text transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-accent to-purple transition-all duration-300 peer-focus:w-full rounded-full" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-accent via-indigo-600 to-purple hover:opacity-95 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] duration-150 shadow-glow hover:shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2 text-sm"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
              </button>
            </motion.form>
          )}

          {viewMode === 'forgot_request' && (
            <motion.form
              key="forgot_request"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleForgotRequest}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full pl-12 pr-4 py-3.5 bg-surface2/30 dark:bg-surface2/15 border border-border/40 dark:border-white/5 rounded-2xl text-text placeholder:text-text3 focus:outline-none focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all peer text-base font-medium"
                  />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-accent to-purple transition-all duration-300 peer-focus:w-full rounded-full" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-accent via-indigo-600 to-purple hover:opacity-95 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] duration-150 shadow-glow hover:shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2 text-sm"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Code'}
              </button>
            </motion.form>
          )}

          {viewMode === 'forgot_verify' && (
            <motion.form
              key="forgot_verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleForgotVerify}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1 text-center block">6-Digit Code</label>
                <div className="relative group">
                  <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input
                    type="text"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full pl-12 pr-4 py-3.5 bg-surface2/30 dark:bg-surface2/15 border border-border/40 dark:border-white/5 rounded-2xl text-text text-center tracking-[0.5em] font-mono text-xl md:text-2xl placeholder:text-text3 focus:outline-none focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all peer font-bold"
                  />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-accent to-purple transition-all duration-300 peer-focus:w-full rounded-full" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-accent via-indigo-600 to-purple hover:opacity-95 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] duration-150 shadow-glow hover:shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2 text-sm"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Verify Code'}
              </button>
            </motion.form>
          )}

          {viewMode === 'forgot_reset' && (
            <motion.form
              key="forgot_reset"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleForgotReset}
              className="space-y-5"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">New Password</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a new password"
                    className="w-full pl-12 pr-12 py-3.5 bg-surface2/30 dark:bg-surface2/15 border border-border/40 dark:border-white/5 rounded-2xl text-text placeholder:text-text3 focus:outline-none focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all peer text-base font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text3 hover:text-text transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-accent to-purple transition-all duration-300 peer-focus:w-full rounded-full" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">Confirm New Password</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="w-full pl-12 pr-12 py-3.5 bg-surface2/30 dark:bg-surface2/15 border border-border/40 dark:border-white/5 rounded-2xl text-text placeholder:text-text3 focus:outline-none focus:border-accent/80 focus:ring-4 focus:ring-accent/10 transition-all peer text-base font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text3 hover:text-text transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-accent to-purple transition-all duration-300 peer-focus:w-full rounded-full" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-accent via-indigo-600 to-purple hover:opacity-95 text-white font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] duration-150 shadow-glow hover:shadow-accent/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2 text-sm"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Reset Password'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
