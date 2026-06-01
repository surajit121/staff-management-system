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
    <div className="min-h-screen w-full flex bg-bg relative overflow-hidden">
      {/* ── LEFT PANEL: BRANDING (Desktop only) ── */}
      <div className="hidden lg:flex lg:w-[40%] bg-gradient-to-br from-[#1A6BFF] to-[#0040CC] relative flex-col justify-between p-12 text-white overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.08)]">
        {/* Subtle decorative background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] pointer-events-none" />
        
        {/* Ambient abstract glow */}
        <div className="absolute -top-[20%] -left-[20%] w-[300px] h-[300px] bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-[20%] -right-[20%] w-[350px] h-[350px] bg-[#60A5FA]/20 rounded-full blur-[100px] pointer-events-none" />

        {/* Branding Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
            <LayoutPanelLeft size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">StaffSync Pro</span>
        </div>

        {/* Center content */}
        <div className="my-auto relative z-10 space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-white text-[#1A6BFF] flex items-center justify-center shadow-2xl mb-8 transform hover:scale-105 transition-transform duration-300">
            <LayoutPanelLeft size={30} strokeWidth={2.5} />
          </div>
          <h2 className="text-4xl font-extrabold leading-[1.2] tracking-tight text-white">
            Empowering Teams,<br />Maximizing Results
          </h2>
          <p className="text-white/80 text-sm mt-3 max-w-md font-medium leading-relaxed">
            Our comprehensive enterprise suite coordinates daily attendance, materials inventory, salary tracking, and performance optimization inside an elegant, ultra-responsive dashboard.
          </p>
        </div>

        {/* Sidebar Footer */}
        <div className="text-[11px] text-white/50 relative z-10 font-mono tracking-wider">
          StaffSync Pro Suite &copy; 2026
        </div>
      </div>

      {/* ── RIGHT PANEL: FORM CONTAINER (Responsive) ── */}
      <div className="w-full lg:w-[60%] flex items-center justify-center px-4 md:px-12 py-12 bg-surface dark:bg-bg overflow-y-auto relative">
        {/* Soft background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(26,107,255,0.03),transparent)] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.05),transparent)] pointer-events-none" />

        <div className="w-full max-w-[400px] relative z-10 py-6">
          {/* Logo block for mobile/tablet screens only */}
          <div className="flex lg:hidden flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center shadow-glow shadow-accent/20 mb-3">
              <LayoutPanelLeft size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text">StaffSync Pro</h1>
          </div>

          {/* Form Header */}
          <div className="mb-8 relative text-left">
            {viewMode !== 'login' && (
              <button
                onClick={() => switchMode('login')}
                className="absolute -left-12 top-0.5 p-2 text-text3 hover:text-text hover:bg-surface2 dark:hover:bg-white/5 rounded-xl transition-all hidden md:block"
                title="Back to login"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            <div className="flex items-center gap-2 mb-2 md:hidden">
              {viewMode !== 'login' && (
                <button
                  onClick={() => switchMode('login')}
                  className="text-text3 hover:text-text pr-1 flex items-center gap-1 text-xs font-bold transition-colors"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text">
              {viewMode === 'login' ? 'Welcome Back' :
                viewMode === 'register' ? 'Create Admin Account' :
                  viewMode === 'forgot_request' ? 'Reset Password' :
                    viewMode === 'forgot_verify' ? 'Verify Reset Code' :
                      'New Password'}
            </h2>
            <p className="text-text2 text-[13px] mt-2 font-medium leading-relaxed">
              {viewMode === 'login' ? 'Enter your admin credentials to access your organization dashboard.' :
                viewMode === 'register' ? 'Sign up to configure your local administrative suite.' :
                  viewMode === 'forgot_request' ? 'Enter your administrative email to request a reset pin.' :
                    viewMode === 'forgot_verify' ? 'We have dispatched a six-digit authorization code to your inbox.' :
                      'Establish a secure new password for authorization.'}
            </p>
          </div>

          {/* Dynamic Form Transition Container */}
          <div className="min-h-[280px]">
            <AnimatePresence mode="wait">
              {viewMode === 'login' && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text2 ml-0.5">Username</label>
                    <div className="relative group">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter admin username"
                        autoComplete="off"
                        className="w-full pl-12 pr-4 py-3 bg-surface2/30 dark:bg-surface2/15 border border-border dark:border-white/5 rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-0.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-text2">Password</label>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot_request')}
                        className="text-xs text-accent hover:underline font-bold transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="w-full pl-12 pr-12 py-3 bg-surface2/30 dark:bg-surface2/15 border border-border dark:border-white/5 rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] duration-150 shadow-sm hover:shadow-glow hover:shadow-accent/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4 text-sm"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
                  </button>

                  <div className="text-center text-xs text-text2 mt-4 pt-4 border-t border-border/40 dark:border-white/5">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="text-accent hover:underline font-bold transition-colors ml-0.5"
                    >
                      Sign up
                    </button>
                  </div>
                </motion.form>
              )}

              {viewMode === 'register' && (
                <motion.form
                  key="register"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text2 ml-0.5">Username</label>
                    <div className="relative group">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose an admin username"
                        className="w-full pl-12 pr-4 py-3 bg-surface2/30 dark:bg-surface2/15 border border-border dark:border-white/5 rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text2 ml-0.5">Email Address</label>
                    <div className="relative group">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@company.com"
                        className="w-full pl-12 pr-4 py-3 bg-surface2/30 dark:bg-surface2/15 border border-border dark:border-white/5 rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text2 ml-0.5">Password</label>
                    <div className="relative group">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3 bg-surface2/30 dark:bg-surface2/15 border border-border dark:border-white/5 rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text2 ml-0.5">Confirm Password</label>
                    <div className="relative group">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full pl-12 pr-12 py-3 bg-surface2/30 dark:bg-surface2/15 border border-border dark:border-white/5 rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] duration-150 shadow-sm hover:shadow-glow hover:shadow-accent/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4 text-sm"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Create Account'}
                  </button>
                </motion.form>
              )}

              {viewMode === 'forgot_request' && (
                <motion.form
                  key="forgot_request"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleForgotRequest}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text2 ml-0.5">Email Address</label>
                    <div className="relative group">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your administrative email"
                        className="w-full pl-12 pr-4 py-3 bg-surface2/30 dark:bg-surface2/15 border border-border dark:border-white/5 rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] duration-150 shadow-sm hover:shadow-glow hover:shadow-accent/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4 text-sm"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Send Reset Code'}
                  </button>
                </motion.form>
              )}

              {viewMode === 'forgot_verify' && (
                <motion.form
                  key="forgot_verify"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleForgotVerify}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text2 text-center block">6-Digit Pin</label>
                    <div className="relative group">
                      <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                      <input
                        type="text"
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full pl-12 pr-4 py-3.5 bg-surface2/30 dark:bg-surface2/15 border border-border dark:border-white/5 rounded-xl text-text text-center tracking-[0.5em] font-mono text-xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] duration-150 shadow-sm hover:shadow-glow hover:shadow-accent/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4 text-sm"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Verify Pin'}
                  </button>
                </motion.form>
              )}

              {viewMode === 'forgot_reset' && (
                <motion.form
                  key="forgot_reset"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleForgotReset}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text2 ml-0.5">New Password</label>
                    <div className="relative group">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create complex password"
                        className="w-full pl-12 pr-12 py-3 bg-surface2/30 dark:bg-surface2/15 border border-border dark:border-white/5 rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text2 ml-0.5">Confirm New Password</label>
                    <div className="relative group">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 transition-colors group-focus-within:text-accent" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full pl-12 pr-12 py-3 bg-surface2/30 dark:bg-surface2/15 border border-border dark:border-white/5 rounded-xl text-text placeholder:text-text3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all text-sm font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] duration-150 shadow-sm hover:shadow-glow hover:shadow-accent/10 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4 text-sm"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Reset Password'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
