import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserRole, isSellerRole } from '../types';
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
  EyeOff,
  Wheat,
  ShieldCheck,
  Send,
  Loader2
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

  // Signup verification state (Email or Phone OTP)
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'phone'>('email');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sandboxOtpNotice, setSandboxOtpNotice] = useState<string | null>(null);
  const [verifiedTarget, setVerifiedTarget] = useState<{ channel: 'email' | 'phone'; target: string } | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTarget = (verificationMethod === 'email' ? email : phone).trim();
  const normalizedCurrentTarget = verificationMethod === 'email'
    ? currentTarget.toLowerCase()
    : currentTarget.replace(/[\s()-]/g, '');

  const isTargetVerified = Boolean(
    verifiedTarget &&
    verifiedTarget.channel === verificationMethod &&
    verifiedTarget.target === normalizedCurrentTarget
  );

  const handleVerificationChannelChange = (channel: 'email' | 'phone') => {
    setVerificationMethod(channel);
    setCodeSent(false);
    setVerificationCodeInput('');
    setSandboxOtpNotice(null);
    setVerifiedTarget(null);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSendVerificationCode = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    const target = verificationMethod === 'email' ? email.trim() : phone.trim();

    if (verificationMethod === 'email') {
      if (!target || !/\S+@\S+\.\S+/.test(target)) {
        setErrorMsg('Please enter a valid email address before sending a verification code.');
        return;
      }
    } else {
      if (!target || target.replace(/[\s()-]/g, '').length < 7) {
        setErrorMsg('Please enter a valid phone number (e.g. +263 77 123 4567) before sending an SMS code.');
        return;
      }
    }

    setIsSendingCode(true);
    try {
      const res = await api.sendVerificationCode({
        channel: verificationMethod,
        target,
        name: fullName.trim() || undefined
      });
      setCodeSent(true);
      setSandboxOtpNotice(res.sandboxCode || null);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not dispatch verification code. Please check your details.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyOtpCode = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    const target = verificationMethod === 'email' ? email.trim() : phone.trim();
    if (!verificationCodeInput.trim()) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifyingCode(true);
    try {
      await api.verifyCode({
        channel: verificationMethod,
        target,
        code: verificationCodeInput.trim()
      });
      setVerifiedTarget({
        channel: verificationMethod,
        target: normalizedCurrentTarget
      });
      setSuccessMsg(
        verificationMethod === 'email'
          ? `Email verified (${target})! You can now complete registration.`
          : `Phone number verified (${target})! You can now complete registration.`
      );
      setSandboxOtpNotice(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification failed. Check your 6-digit code and try again.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

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
      if (verificationMethod === 'phone' && (!phone.trim() || phone.replace(/[\s()-]/g, '').length < 7)) {
        setErrorMsg('Please enter a valid phone number to verify via SMS.');
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
      if (isSellerRole(role) && !farmName.trim()) {
        setErrorMsg(
          role === 'fodder_supplier'
            ? 'Please enter your fodder supply business or company name.'
            : 'Please enter your farm or estate name.'
        );
        return false;
      }
      if (!isTargetVerified) {
        setErrorMsg(
          verificationMethod === 'email'
            ? 'Please verify your email address with the 6-digit code before creating your account.'
            : 'Please verify your phone number with the 6-digit SMS code before creating your account.'
        );
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
        const isSeller = isSellerRole(role);
        await signup(
          fullName.trim(),
          email.trim(),
          password,
          {
            role,
            phone: phone.trim() || undefined,
            emailVerified: verificationMethod === 'email' && isTargetVerified,
            phoneVerified: verificationMethod === 'phone' && isTargetVerified,
            verificationMethod,
            location: {
              country: 'Zimbabwe',
              province,
              city: city.trim() || province
            },
            farmerProfile: isSeller ? {
              farmName: farmName.trim() || (role === 'fodder_supplier' ? `${fullName}'s Fodder Supply` : `${fullName}'s Farm`),
              bio: bio.trim() || (
                role === 'fodder_supplier'
                  ? 'Verified livestock fodder, lucerne hay, silage, and animal feed supplier.'
                  : 'Local agricultural producer dedicated to fresh produce.'
              ),
              farmingMethods: role === 'fodder_supplier' ? ['Sun-Cured Baling', 'Silage Formulation'] : ['Organic Compost', 'Drip Irrigation'],
              establishedYear: new Date().getFullYear(),
              isVerified: true,
              verified: true
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
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      await demoLogin(demoRole);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to sign in with this account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        id="auth-dialog"
        className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-6 border border-stone-200 flex flex-col max-h-[92vh]"
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
                  : 'Join our verified agricultural & fodder marketplace'}
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

        {/* Demo Fast Login Ribbon */}
        {mode !== 'forgot_password' && (
          <div className="bg-stone-50 p-3.5 border-b border-stone-200/80 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              ⚡ Quick Demo Credentials (1-Click Switch)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoSelect('farmer')}
                className="p-2 rounded-xl bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 font-semibold text-emerald-800 transition-colors text-center shadow-2xs"
              >
                🌱 Farmer
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('fodder_supplier')}
                className="p-2 rounded-xl bg-white hover:bg-amber-50 border border-stone-200 hover:border-amber-300 font-semibold text-amber-800 transition-colors text-center shadow-2xs"
              >
                🌾 Fodder
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('buyer')}
                className="p-2 rounded-xl bg-white hover:bg-sky-50 border border-stone-200 hover:border-sky-300 font-semibold text-sky-800 transition-colors text-center shadow-2xs"
              >
                🛒 Buyer
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('admin')}
                className="p-2 rounded-xl bg-white hover:bg-purple-50 border border-stone-200 hover:border-purple-300 font-semibold text-purple-800 transition-colors text-center shadow-2xs"
              >
                🛡️ Admin
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

          {/* Mode Tabs */}
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

          {/* REGISTER: Role Selection (Buyer, Farmer Producer, Fodder Supplier) */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="font-bold text-stone-700 block">I am creating an account as:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <label
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-2 ${
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
                    className="text-emerald-600 focus:ring-emerald-500 shrink-0"
                  />
                  <ShoppingBag className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="leading-tight">Household Buyer</span>
                </label>

                <label
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-2 ${
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
                    className="text-emerald-600 focus:ring-emerald-500 shrink-0"
                  />
                  <Sprout className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="leading-tight">Farmer Producer</span>
                </label>

                <label
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-2 ${
                    role === 'fodder_supplier'
                      ? 'border-amber-600 bg-amber-50/80 font-bold text-amber-950 shadow-2xs'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="authRegRole"
                    checked={role === 'fodder_supplier'}
                    onChange={() => setRole('fodder_supplier')}
                    className="text-amber-600 focus:ring-amber-500 shrink-0"
                  />
                  <Wheat className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="leading-tight">Fodder Supplier</span>
                </label>
              </div>
              {role === 'fodder_supplier' && (
                <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 font-medium">
                  List lucerne hay bales, maize silage, Rhodes grass &amp; livestock feed directly on the agroX marketplace.
                </p>
              )}
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
            <label className="font-bold text-stone-700 block mb-1">
              {mode === 'login' ? 'Email Address or Admin ID *' : 'Email Address *'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={mode === 'login' ? 'text' : 'email'}
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (verifiedTarget?.channel === 'email') setVerifiedTarget(null);
                }}
                placeholder={mode === 'login' ? 'name@example.com' : 'name@example.com'}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* REGISTER: Phone */}
          {mode === 'register' && (
            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Phone Number {verificationMethod === 'phone' ? '*' : '(For Order SMS Alerts)'}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value);
                    if (verifiedTarget?.channel === 'phone') setVerifiedTarget(null);
                  }}
                  placeholder="+263 77 123 4567"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required={verificationMethod === 'phone'}
                />
              </div>
            </div>
          )}

          {/* REGISTER: Email or Phone OTP Verification */}
          {mode === 'register' && (
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-stone-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Account Verification Method *
                </span>
                {isTargetVerified && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleVerificationChannelChange('email')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    verificationMethod === 'email'
                      ? 'bg-white border-emerald-600 text-emerald-900 shadow-2xs'
                      : 'bg-transparent border-stone-200 text-stone-600 hover:bg-white/60'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Verify via Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVerificationChannelChange('phone')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    verificationMethod === 'phone'
                      ? 'bg-white border-emerald-600 text-emerald-900 shadow-2xs'
                      : 'bg-transparent border-stone-200 text-stone-600 hover:bg-white/60'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Verify via Phone</span>
                </button>
              </div>

              {!isTargetVerified && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSendVerificationCode}
                      disabled={isSendingCode}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      {isSendingCode ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{codeSent ? 'Resend Code' : `Send ${verificationMethod === 'email' ? 'Email' : 'SMS'} Code`}</span>
                    </button>
                    <span className="text-[11px] text-stone-500 truncate">
                      {currentTarget ? `Target: ${currentTarget}` : `Enter your ${verificationMethod} above`}
                    </span>
                  </div>

                  {sandboxOtpNotice && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-2">
                      <span>
                        Sandbox verification code: <strong className="font-mono text-sm tracking-widest">{sandboxOtpNotice}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setVerificationCodeInput(sandboxOtpNotice)}
                        className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shrink-0"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}

                  {codeSent && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={verificationCodeInput}
                        onChange={e => setVerificationCodeInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit OTP code"
                        className="flex-1 px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 font-mono font-bold tracking-widest focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtpCode}
                        disabled={isVerifyingCode || verificationCodeInput.length < 6}
                        className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-black disabled:bg-stone-300 text-white font-bold text-xs transition-colors shrink-0"
                      >
                        {isVerifyingCode ? 'Checking...' : 'Verify Code'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

          {/* REGISTER: Farmer / Fodder Supplier Specific Fields */}
          {mode === 'register' && isSellerRole(role) && (
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                {role === 'fodder_supplier' ? 'Fodder Supply Business Details' : 'Farm Information'}
              </div>
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  {role === 'fodder_supplier' ? 'Supply Company / Business Name *' : 'Farm / Estate Name *'}
                </label>
                <input
                  type="text"
                  value={farmName}
                  onChange={e => setFarmName(e.target.value)}
                  placeholder={role === 'fodder_supplier' ? 'e.g. GreenBale Forage & Hay Supply' : 'e.g. Green Hills Organic Orchards'}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  {role === 'fodder_supplier' ? 'Fodder & Animal Feed Specialties (Optional)' : 'Farm Bio (Optional)'}
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder={role === 'fodder_supplier' ? 'e.g. Lucerne hay bales, maize silage, Rhodes grass' : 'e.g. Organic tomatoes, leafy greens & pasture eggs'}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              <span>{isTargetVerified ? 'Complete Verified Registration' : 'Verify Contact & Create Account'}</span>
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
