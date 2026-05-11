import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Loader2, LayoutPanelLeft, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [viewMode, setViewMode] = useState('login'); // 'login', 'register', 'forgot'
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = (mode) => {
    setViewMode(mode);
    resetForm();
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
    if (!username || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', { username, password });
      login(response.data.token, response.data.user);
      toast.success('Registration successful! Welcome to StaffSync Pro.');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!username) {
      toast.error('Please enter your username');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { username });
      toast.success(response.data.message || 'Password reset link sent');
      switchMode('login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple/20 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md p-8 bg-surface border border-border rounded-2xl shadow-card relative z-10 mx-4 overflow-hidden"
      >
        <div className="flex flex-col items-center mb-8 relative">
          {viewMode !== 'login' && (
            <button 
              onClick={() => switchMode('login')}
              className="absolute left-0 top-2 p-2 text-text3 hover:text-text hover:bg-surface2 rounded-lg transition-all"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="w-16 h-16 rounded-2xl bg-accent text-white flex items-center justify-center shadow-glow mb-4">
            <LayoutPanelLeft size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-text m-0 tracking-tight">StaffSync Pro</h1>
          <p className="text-text2 text-sm mt-1">
            {viewMode === 'login' ? 'Sign in to your account' : 
             viewMode === 'register' ? 'Create a new admin account' : 
             'Recover your password'}
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
              className="space-y-5"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">Username</label>
                <div className="relative group">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter admin username"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface2 border border-border rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent-ring transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-text2">Password</label>
                  <button type="button" onClick={() => switchMode('forgot')} className="text-xs text-accent hover:text-accent-hover font-medium transition-colors">Forgot password?</button>
                </div>
                <div className="relative group">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface2 border border-border rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent-ring transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-all shadow-main hover:shadow-glow flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
              </button>

              <div className="text-center text-[13px] text-text2 mt-4 pt-4 border-t border-border">
                Don't have an account? <button type="button" onClick={() => switchMode('register')} className="text-accent hover:text-accent-hover font-bold transition-colors ml-1">Sign up</button>
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
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">Username</label>
                <div className="relative group">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface2 border border-border rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent-ring transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">Password</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface2 border border-border rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent-ring transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">Confirm Password</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface2 border border-border rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent-ring transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-all shadow-main hover:shadow-glow flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
              </button>
            </motion.form>
          )}

          {viewMode === 'forgot' && (
            <motion.form 
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleForgotPassword} 
              className="space-y-5"
            >
              <p className="text-sm text-text2 text-center mb-6">Enter your username and we'll help you reset your password.</p>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text2 ml-1">Username</label>
                <div className="relative group">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface2 border border-border rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent-ring transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-all shadow-main hover:shadow-glow flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
