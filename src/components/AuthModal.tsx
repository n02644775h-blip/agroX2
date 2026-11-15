import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserRole, isSellerRole } from '../types';
import meadowBackdropImg from '../assets/images/meadow_hills_backdrop_1794742070903.jpg';
import basketProduceImg from '../assets/images/signup_vegetable_basket_1794742072176.jpg';
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
  Loader2,
  Check
} from 'lucide-react';

interface AuthModalProps {
  initialMode?: 'login' | 'register' | 'forgot_password';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode = 'login', onClose }) => {
  const prefersReducedMotion = useReducedMotion();
  const { login, signup, resetPassword, loginAdmin } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>(initialMode);
  const [role, setRole] = useState<UserRole>('buyer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
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

  const frostedInputClass =
    'w-full pl-10 pr-10 py-3 rounded-2xl bg-white/14 border border-white/40 text-white placeholder:text-white/70 text-xs sm:text-sm backdrop-blur-md focus:outline-none focus:bg-white/22 focus:border-[#A8E635] focus:ring-2 focus:ring-[#A8E635]/35 transition-all';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-[#062B1F]/80 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      {mode === 'register' ? (
        /* REGISTER SPLIT LIQUID GLASS LAYOUT ("From the Farm to Your Table.") */
        <motion.div
          id="auth-dialog"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl rounded-[32px] overflow-hidden shadow-[0_32px_90px_-16px_rgba(3,20,14,0.85)] border border-white/35 bg-[#062B1F] grid grid-cols-1 md:grid-cols-12 max-h-[94vh]"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/35 hover:bg-black/55 border border-white/25 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Left Visual Basket Showcase Pane */}
          <div className="md:col-span-5 relative min-h-[210px] md:min-h-full overflow-hidden flex flex-col justify-between p-6 sm:p-8 text-white">
            <img
              src={basketProduceImg}
              alt="Fresh harvest produce basket"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-linear-to-b from-[#062B1F]/92 via-[#0B3D2B]/65 to-[#062B1F]/85" />

            {/* Curved Optical Glass Arcs */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-24 w-72 h-72 rounded-full border-2 border-white/25 bg-white/5 backdrop-blur-[2px]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -left-16 w-80 h-80 rounded-full border border-[#A8E635]/30 bg-[#145A38]/20"
            />

            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2.5">
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  <img
                    src="/assets/farmbridge-logo-white.png"
                    alt="FarmBridge logo"
                    className="w-full h-full object-contain drop-shadow-sm"
                  />
                </div>
                <span className="font-extrabold text-lg tracking-tight text-white">
                  FarmBridge<span className="text-[#A8E635]">.</span>
                </span>
              </div>

              <div className="space-y-2.5 pt-2 md:pt-4">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-[1.08] tracking-tight text-balance">
                  From the Farm to <span className="text-[#A8E635]">Your Table.</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#DFF4E4]/90 leading-relaxed max-w-xs">
                  Join FarmBridge and trade directly with verified farmers, buyers, and regional fodder suppliers.
                </p>
              </div>
            </div>
          </div>

          {/* Right Frosted Glass Signup Form Pane */}
          <div className="md:col-span-7 relative p-5 sm:p-7 overflow-y-auto max-h-[70vh] md:max-h-[94vh] bg-linear-to-br from-[#0E3F2C]/92 via-[#082E20]/96 to-[#062B1F] text-white">
            <div className="max-w-md mx-auto space-y-4">
              <div className="text-center md:text-left pr-6">
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Create Your Account
                </h3>
                <p className="text-xs text-[#DFF4E4]/75 mt-0.5">
                  Join FarmBridge today — select your marketplace role
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-300/40 text-rose-100 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-2xl bg-[#A8E635]/20 border border-[#A8E635]/45 text-[#DFF4E4] text-xs font-semibold flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#A8E635] shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {/* Role Selector Pills */}
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 text-center ${
                      role === 'buyer'
                        ? 'bg-linear-to-br from-[#A8E635] to-[#63BE2D] border-white/60 text-[#062B1F] font-extrabold shadow-md'
                        : 'bg-white/10 border-white/25 text-white/85 hover:bg-white/16'
                    }`}
                  >
                    <input
                      type="radio"
                      name="authRegRole"
                      checked={role === 'buyer'}
                      onChange={() => setRole('buyer')}
                      className="sr-only"
                    />
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span className="text-[11px]">Buyer</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 text-center ${
                      role === 'farmer'
                        ? 'bg-linear-to-br from-[#A8E635] to-[#63BE2D] border-white/60 text-[#062B1F] font-extrabold shadow-md'
                        : 'bg-white/10 border-white/25 text-white/85 hover:bg-white/16'
                    }`}
                  >
                    <input
                      type="radio"
                      name="authRegRole"
                      checked={role === 'farmer'}
                      onChange={() => setRole('farmer')}
                      className="sr-only"
                    />
                    <Sprout className="w-4 h-4 shrink-0" />
                    <span className="text-[11px]">Farmer</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 text-center ${
                      role === 'fodder_supplier'
                        ? 'bg-linear-to-br from-[#F4D35E] to-[#A8E635] border-white/60 text-[#062B1F] font-extrabold shadow-md'
                        : 'bg-white/10 border-white/25 text-white/85 hover:bg-white/16'
                    }`}
                  >
                    <input
                      type="radio"
                      name="authRegRole"
                      checked={role === 'fodder_supplier'}
                      onChange={() => setRole('fodder_supplier')}
                      className="sr-only"
                    />
                    <Wheat className="w-4 h-4 shrink-0" />
                    <span className="text-[11px]">Fodder Supplier</span>
                  </label>
                </div>

                {/* Full Name */}
                <div className="relative">
                  <User className="w-4 h-4 text-white/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name *"
                    className={frostedInputClass}
                    required
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (verifiedTarget?.channel === 'email') setVerifiedTarget(null);
                      }}
                      placeholder="Email Address *"
                      className={frostedInputClass}
                      required
                    />
                  </div>

                  <div className="relative">
                    <Phone className="w-4 h-4 text-white/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (verifiedTarget?.channel === 'phone') setVerifiedTarget(null);
                      }}
                      placeholder="Phone Number"
                      className={frostedInputClass}
                      required={verificationMethod === 'phone'}
                    />
                  </div>
                </div>

                {/* OTP Verification Box */}
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/25 space-y-2.5 backdrop-blur-md">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#A8E635]" />
                      Contact Verification *
                    </span>
                    {isTargetVerified && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#A8E635] text-[#062B1F] text-[10px] font-extrabold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleVerificationChannelChange('email')}
                      className={`py-1.5 px-3 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        verificationMethod === 'email'
                          ? 'bg-white text-[#062B1F] border-white'
                          : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/12'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Verify Email</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerificationChannelChange('phone')}
                      className={`py-1.5 px-3 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        verificationMethod === 'phone'
                          ? 'bg-white text-[#062B1F] border-white'
                          : 'bg-white/5 border-white/20 text-white/80 hover:bg-white/12'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Verify Phone</span>
                    </button>
                  </div>

                  {!isTargetVerified && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSendVerificationCode}
                          disabled={isSendingCode}
                          className="px-3 py-1.5 rounded-xl bg-[#A8E635] hover:brightness-105 text-[#062B1F] font-extrabold text-[11px] flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          {isSendingCode ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>{codeSent ? 'Resend Code' : 'Send 6-Digit Code'}</span>
                        </button>
                        <span className="text-[11px] text-[#DFF4E4]/70 truncate">
                          {currentTarget ? `Target: ${currentTarget}` : `Enter ${verificationMethod} above`}
                        </span>
                      </div>

                      {sandboxOtpNotice && (
                        <div className="p-2 rounded-xl bg-[#F4D35E]/20 border border-[#F4D35E]/40 text-[#F4D35E] text-[11px] flex items-center justify-between gap-2">
                          <span>
                            Code: <strong className="font-mono text-xs tracking-widest text-white">{sandboxOtpNotice}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setVerificationCodeInput(sandboxOtpNotice)}
                            className="px-2 py-0.5 rounded-lg bg-[#F4D35E] text-[#062B1F] font-bold text-[10px] shrink-0 cursor-pointer"
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
                            onChange={(e) => setVerificationCodeInput(e.target.value.replace(/\D/g, ''))}
                            placeholder="6-digit OTP"
                            className="flex-1 px-3 py-2 rounded-xl bg-white/15 border border-white/35 text-white font-mono font-bold tracking-widest focus:outline-none focus:border-[#A8E635]"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtpCode}
                            disabled={isVerifyingCode || verificationCodeInput.length < 6}
                            className="px-3.5 py-2 rounded-xl bg-white text-[#062B1F] font-extrabold text-[11px] shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {isVerifyingCode ? 'Checking...' : 'Verify'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Lock className="w-4 h-4 text-white/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create Password *"
                      className={frostedInputClass}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/75 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-white/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password *"
                      className={frostedInputClass}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/75 hover:text-white cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Seller Specific Fields */}
                {isSellerRole(role) && (
                  <div className="space-y-2.5 pt-2 border-t border-white/15">
                    <div className="text-[11px] font-bold text-[#A8E635] uppercase tracking-wider">
                      {role === 'fodder_supplier' ? 'Fodder Business Details' : 'Farm Details'}
                    </div>
                    <input
                      type="text"
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                      placeholder={
                        role === 'fodder_supplier'
                          ? 'Supply Company / Business Name *'
                          : 'Farm / Estate Name *'
                      }
                      className="w-full px-4 py-2.5 rounded-2xl bg-white/14 border border-white/35 text-white placeholder:text-white/65 focus:outline-none focus:border-[#A8E635]"
                      required
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <select
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl bg-[#0B3D2B] border border-white/30 text-white focus:outline-none focus:border-[#A8E635]"
                      >
                        {['Harare', 'Mashonaland East', 'Mashonaland West', 'Midlands', 'Manicaland', 'Bulawayo', 'Masvingo'].map((p) => (
                          <option key={p} value={p} className="bg-[#062B1F] text-white">
                            {p}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Town / City"
                        className="w-full px-3 py-2.5 rounded-2xl bg-white/14 border border-white/35 text-white placeholder:text-white/65 focus:outline-none focus:border-[#A8E635]"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl lg-cta-lime text-[#062B1F] font-extrabold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>
                    {isSubmitting
                      ? 'Creating Account...'
                      : isTargetVerified
                      ? 'Sign Up & Join FarmBridge'
                      : 'Verify Contact & Sign Up'}
                  </span>
                </button>

                <p className="text-center text-xs text-[#DFF4E4]/80 pt-1">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="font-bold text-[#A8E635] hover:underline cursor-pointer"
                  >
                    Log In
                  </button>
                </p>
              </form>
            </div>
          </div>
        </motion.div>
      ) : (
        /* LOGIN / FORGOT PASSWORD VERTICAL FROSTED MEADOW LIQUID GLASS CARD */
        <motion.div
          id="auth-dialog"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-[34px] overflow-hidden shadow-[0_36px_96px_-18px_rgba(3,20,14,0.85)] border border-white/35 min-h-[560px] flex items-center justify-center p-5 sm:p-7"
        >
          {/* Full Meadow Landscape Backdrop inside Auth Stage */}
          <img
            src={meadowBackdropImg}
            alt="Sunlit green agricultural meadow"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-[#062B1F]/35 via-[#062B1F]/20 to-[#062B1F]/65" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/35 hover:bg-black/55 border border-white/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Centered Frosted Liquid Glass Login Card */}
          <div className="relative z-10 w-full rounded-[28px] lg-glass-frosted p-6 sm:p-7 text-white space-y-5">
            <div className="space-y-1">
              {mode === 'forgot_password' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A8E635] hover:underline mb-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
                </button>
              )}

              <div className="inline-flex items-center gap-2 pb-1">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <img
                    src="/assets/farmbridge-logo-white.png"
                    alt="FarmBridge logo"
                    className="w-full h-full object-contain drop-shadow-sm"
                  />
                </div>
                <span className="font-extrabold text-base tracking-tight text-white">
                  FarmBridge<span className="text-[#A8E635]">.</span>
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {mode === 'forgot_password' ? 'Reset Password' : 'Login'}
              </h2>
              <p className="text-xs text-white/85">
                {mode === 'forgot_password'
                  ? 'Enter your email to receive a password reset link'
                  : 'Welcome back please login to your account'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-600/30 border border-rose-200/45 text-white text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-200 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-2xl bg-[#A8E635]/25 border border-[#A8E635]/50 text-white text-xs font-semibold flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#A8E635] shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="relative">
                <User className="w-4 h-4 text-white/85 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'login' ? 'User Email or ID' : 'Email Address'}
                  className="w-full pl-4 pr-11 py-3 rounded-2xl bg-white/14 border border-white/45 text-white placeholder:text-white/75 text-xs sm:text-sm backdrop-blur-md focus:outline-none focus:bg-white/22 focus:border-[#A8E635] transition-all"
                  required
                />
              </div>

              {mode === 'login' && (
                <>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-4 pr-11 py-3 rounded-2xl bg-white/14 border border-white/45 text-white placeholder:text-white/75 text-xs sm:text-sm backdrop-blur-md focus:outline-none focus:bg-white/22 focus:border-[#A8E635] transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/85 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <span
                        onClick={() => setRememberMe(!rememberMe)}
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          rememberMe
                            ? 'bg-[#A8E635] border-white text-[#062B1F]'
                            : 'bg-white/15 border-white/45'
                        }`}
                      >
                        {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span className="text-white/90 font-medium">Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot_password');
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="text-[#DFF4E4] hover:text-[#A8E635] font-semibold cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl lg-cta-lime text-[#062B1F] font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === 'forgot_password' ? (
                  <KeyRound className="w-4 h-4" />
                ) : null}
                <span>
                  {isSubmitting
                    ? mode === 'forgot_password'
                      ? 'Sending link...'
                      : 'Logging in...'
                    : mode === 'forgot_password'
                    ? 'Send Reset Link'
                    : 'Login'}
                </span>
              </button>
            </form>

            {mode === 'login' && (
              <p className="text-center text-xs text-white/90 pt-1">
                Don’t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="font-extrabold text-[#A8E635] hover:underline cursor-pointer"
                >
                  Signup
                </button>
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
