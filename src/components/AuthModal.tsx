import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  X,
  Lock,
  Mail,
  User,
  Sprout,
  ShoppingBag,
  Phone,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';

interface AuthModalProps {
  initialMode?: 'login' | 'register' | 'forgot_password';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode = 'login', onClose }) => {
  const { login, signup, resetPassword, loginAdmin, demoLogin } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>(initialMode);
  const [role, setRole] = useState<UserRole>('buyer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('Harare');
  const [city, setCity] = useState('Harare');
  const [farmName, setFarmName] = useState('');
  const [bio, setBio] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'forgot_password') {
      if (!email.trim()) {
        setErrorMsg('Please enter your account email address.');
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(email.trim())) {
        setErrorMsg('Please enter a valid email address.');
        return false;
      }
      return true;
    }

    if (mode === 'login') {
      if (!email.trim()) {
        setErrorMsg('Please enter your email or username.');
        return false;
      }
      const isUllyAdmin = email.trim().toUpperCase() === 'ULLY';
      if (!isUllyAdmin && !/\S+@\S+\.\S+/.test(email.trim())) {
        setErrorMsg('Please enter a valid email address.');
        return false;
      }
      if (!password) {
        setErrorMsg('Please enter your password.');
        return false;
      }
      return true;
    }

    if (mode === 'register') {
      if (!fullName.trim()) {
        setErrorMsg('Full name cannot be empty.');
        return false;
      }
      if (!email.trim()) {
        setErrorMsg('Email address cannot be empty.');
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(email.trim())) {
        setErrorMsg('Please enter a valid email address.');
        return false;
      }
      if (!password) {
        setErrorMsg('Password cannot be empty.');
        return false;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long to meet security standards.');
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please ensure both passwords are identical.');
        return false;
      }
      if (role === 'farmer' && !farmName.trim()) {
        setErrorMsg('Please enter your farm or estate name.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'forgot_password') {
        await resetPassword(email.trim());
        setSuccessMsg('Password reset email sent. Please check your inbox.');
      } else if (mode === 'login') {
        if (email.trim().toUpperCase() === 'ULLY') {
          await loginAdmin(email.trim(), password);
        } else {
          await login(email.trim(), password);
        }
        onClose();
      } else {
        // Register user via Firebase Auth and create Firestore doc at users/{uid}
        await signup(
          fullName.trim(),
          email.trim(),
          password,
          {
            role,
            phone: phone.trim() || undefined,
            location: {
              country: 'Zimbabwe',
              province,
              city: city.trim() || province
            },
            farmerProfile: role === 'farmer' ? {
              farmName: farmName.trim() || `${fullName}'s Farm`,
              bio: bio.trim() || 'Local agricultural producer dedicated to fresh produce.',
              farmingMethods: ['Organic Compost', 'Drip Irrigation'],
              establishedYear: new Date().getFullYear(),
              isVerified: true
            } : undefined
          }
        );
        onClose();
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      setErrorMsg(err?.message || 'Authentication failed. Please verify your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSelect = async (demoRole: UserRole) => {
    demoLogin(demoRole);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        id="auth-dialog"
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-6 border border-stone-200 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-6 pb-4 border-b border-stone-100 flex items-center justify-between bg-emerald-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white text-emerald-800 flex items-center justify-center font-extrabold shadow-sm">
              <Sprout className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h2 className="font-extrabold text-white text-lg">
                {mode === 'forgot_password'
                  ? 'Reset Password'
                  : mode === 'login'
                  ? 'Welcome to agroX'
                  : 'Create an agroX Account'}
              </h2>
              <p className="text-xs text-emerald-100/90">
                {mode === 'forgot_password'
                  ? 'Receive a secure reset link to your email'
                  : mode === 'login'
                  ? 'Sign in to access your farm products, orders & messaging'
                  : 'Join our trusted agricultural marketplace ecosystem'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Fast Login Ribbon (Only on login or register) */}
        {mode !== 'forgot_password' && (
          <div className="bg-stone-50 p-3.5 border-b border-stone-200/80 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              ⚡ Quick Demo Credentials (1-Click Switch)
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoSelect('farmer')}
                className="p-2 rounded-xl bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 font-semibold text-emerald-800 transition-colors text-center shadow-2xs"
              >
                🌱 Farmer Tendai
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('buyer')}
                className="p-2 rounded-xl bg-white hover:bg-amber-50 border border-stone-200 hover:border-amber-300 font-semibold text-amber-800 transition-colors text-center shadow-2xs"
              >
                🛒 Buyer Grace
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('admin')}
                className="p-2 rounded-xl bg-white hover:bg-purple-50 border border-stone-200 hover:border-purple-300 font-semibold text-purple-800 transition-colors text-center shadow-2xs"
              >
                🛡️ Admin Sarah
              </button>
            </div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          {/* Mode Tabs (Sign In vs Register) */}
          {mode !== 'forgot_password' ? (
            <div className="flex rounded-xl bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'login' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'register' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Create Account
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className="inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:text-emerald-800 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Sign In</span>
            </button>
          )}

          {/* REGISTER: Initial Role Selection */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700 block">I am creating an account as:</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-2.5 ${
                    role === 'buyer'
                      ? 'border-emerald-600 bg-emerald-50/70 font-bold text-emerald-900 shadow-2xs'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="authRegRole"
                    checked={role === 'buyer'}
                    onChange={() => setRole('buyer')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  <span>Household Buyer</span>
                </label>

                <label
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-2.5 ${
                    role === 'farmer'
                      ? 'border-emerald-600 bg-emerald-50/70 font-bold text-emerald-900 shadow-2xs'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="authRegRole"
                    checked={role === 'farmer'}
                    onChange={() => setRole('farmer')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <Sprout className="w-4 h-4 text-emerald-600" />
                  <span>Farmer Producer</span>
                </label>
              </div>
            </div>
          )}

          {/* REGISTER: Full Name */}
          {mode === 'register' && (
            <div>
              <label className="font-bold text-stone-700 block mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Tendai Moyo"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* ALL MODES: Email */}
          <div>
            <label className="font-bold text-stone-700 block mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* LOGIN & REGISTER: Password */}
          {mode !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-stone-700 block">Password *</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot_password'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-[10px] text-stone-500 mt-1">Must be at least 6 characters long.</p>
              )}
            </div>
          )}

          {/* REGISTER: Confirm Password */}
          {mode === 'register' && (
            <div>
              <label className="font-bold text-stone-700 block mb-1">Confirm Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* REGISTER: Farmer Specific Fields */}
          {mode === 'register' && role === 'farmer' && (
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Farm Information</div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">Farm / Estate Name *</label>
                <input
                  type="text"
                  value={farmName}
                  onChange={e => setFarmName(e.target.value)}
                  placeholder="e.g. Green Hills Organic Orchards"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Province</label>
                  <select
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    {['Harare', 'Mashonaland East', 'Mashonaland West', 'Midlands', 'Manicaland', 'Bulawayo', 'Masvingo'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Town / City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Marondera"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* REGISTER: Phone for SMS notifications */}
          {mode === 'register' && (
            <div>
              <label className="font-bold text-stone-700 block mb-1">Phone Number (For Order SMS Alerts)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+263 77 123 4567"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white font-bold text-sm rounded-2xl shadow-md transition-all mt-3 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span>
                {mode === 'forgot_password'
                  ? 'Sending reset email...'
                  : mode === 'login'
                  ? 'Signing in...'
                  : 'Creating account...'}
              </span>
            ) : mode === 'forgot_password' ? (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Send Reset Link</span>
              </>
            ) : mode === 'login' ? (
              <span>Sign In</span>
            ) : (
              <span>Create Account</span>
            )}
          </button>

          {/* Footer toggle links */}
          <div className="pt-2 text-center text-stone-500">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  Create Account
                </button>
              </p>
            ) : mode === 'register' ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                  className="font-bold text-emerald-700 hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
