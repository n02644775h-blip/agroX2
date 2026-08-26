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
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AuthModalProps {
  initialMode?: 'login' | 'register';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode = 'login', onClose }) => {
  const { login, register, demoLogin } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<UserRole>('buyer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('Harare');
  const [city, setCity] = useState('Harare');
  const [farmName, setFarmName] = useState('');
  const [bio, setBio] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          phone: phone.trim() || undefined,
          location: {
            province,
            city: city.trim() || province
          },
          farmerProfile: role === 'farmer' ? {
            farmName: farmName.trim() || `${name}'s Farm`,
            bio: bio.trim() || 'Local agricultural producer dedicated to fresh, nutritious harvests.',
            farmingMethods: ['Organic Compost', 'Drip Irrigation'],
            establishedYear: new Date().getFullYear(),
            isVerified: true
          } : undefined
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err?.message || 'Authentication failed. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSelect = async (demoRole: UserRole) => {
    demoLogin(demoRole);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="auth-dialog"
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-6 border border-stone-200 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-6 pb-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-stone-900 text-lg">
                {mode === 'login' ? 'Welcome to agroX' : 'Create an agroX Account'}
              </h2>
              <p className="text-xs text-stone-500">
                {mode === 'login' ? 'Sign in to manage farm produce & orders' : 'Join as a farmer producer or household buyer'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Fast Login Ribbon */}
        <div className="bg-stone-50 p-4 border-b border-stone-200/80 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
            ⚡ Quick Demo Accounts (1-Click Test)
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={() => handleDemoSelect('farmer')}
              className="p-2 rounded-xl bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 font-semibold text-emerald-800 transition-colors text-center"
            >
              🌱 Farmer John
            </button>
            <button
              onClick={() => handleDemoSelect('buyer')}
              className="p-2 rounded-xl bg-white hover:bg-amber-50 border border-stone-200 hover:border-amber-300 font-semibold text-amber-800 transition-colors text-center"
            >
              🛒 Buyer Grace
            </button>
            <button
              onClick={() => handleDemoSelect('admin')}
              className="p-2 rounded-xl bg-white hover:bg-purple-50 border border-stone-200 hover:border-purple-300 font-semibold text-purple-800 transition-colors text-center"
            >
              🛡️ Admin Sarah
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'register' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
              }`}
            >
              Register New Account
            </button>
          </div>

          {/* Register-only Role Selector */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700 block">I am joining as a:</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-2.5 ${
                    role === 'buyer'
                      ? 'border-emerald-600 bg-emerald-50/70 font-bold text-emerald-900'
                      : 'border-stone-200 text-stone-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="regRole"
                    checked={role === 'buyer'}
                    onChange={() => setRole('buyer')}
                    className="text-emerald-600"
                  />
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  <span>Household Buyer</span>
                </label>

                <label
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-2.5 ${
                    role === 'farmer'
                      ? 'border-emerald-600 bg-emerald-50/70 font-bold text-emerald-900'
                      : 'border-stone-200 text-stone-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="regRole"
                    checked={role === 'farmer'}
                    onChange={() => setRole('farmer')}
                    className="text-emerald-600"
                  />
                  <Sprout className="w-4 h-4 text-emerald-600" />
                  <span>Farmer Producer</span>
                </label>
              </div>
            </div>
          )}

          {/* Name (Register only) */}
          {mode === 'register' && (
            <div>
              <label className="font-bold text-stone-700 block mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Tendai Moyo"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="font-bold text-stone-700 block mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="font-bold text-stone-700 block mb-1">Password *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Farmer Specific Register Fields */}
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
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Province</label>
                  <select
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 bg-white"
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
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Phone (Register only) */}
          {mode === 'register' && (
            <div>
              <label className="font-bold text-stone-700 block mb-1">Phone Number for Order SMS</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+263 77 123 4567"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-bold text-sm rounded-2xl shadow-md transition-all mt-2"
          >
            {isSubmitting
              ? 'Processing...'
              : mode === 'login'
              ? 'Sign In to agroX'
              : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};
