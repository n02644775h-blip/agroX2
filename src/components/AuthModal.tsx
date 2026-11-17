import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
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
  MailCheck,
  RefreshCw,
  Loader2,
  Check
} from 'lucide-react';

export type AuthModalMode = 'login' | 'register' | 'forgot_password' | 'verify_email';

interface AuthModalProps {
  initialMode?: AuthModalMode;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialMode = 'login', onClose }) => {
  const prefersReducedMotion = useReducedMotion();
  const {
    user,
    requiresEmailVerification,
    lastVerificationError,
    login,
    signup,
    logout,
    resetPassword,
    loginAdmin,
    sendVerificationEmail,
    checkEmailVerification,
    updatePendingEmail
  } = useAuth();

  const [mode, setMode] = useState<AuthModalMode>(initialMode);
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

  // Email verification screen states
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newPendingEmail, setNewPendingEmail] = useState('');
  const [changeEmailPassword, setChangeEmailPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setErrorMsg('');
    setSuccessMsg('');
    if (initialMode === 'verify_email' && user?.email) {
      setEmail(user.email);
      setNewPendingEmail(user.email);
    }
  }, [initialMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

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
      if (isSellerRole(role) && !farmName.trim()) {
        setErrorMsg(
          role === 'fodder_supplier'
            ? 'Please enter your fodder supply business or company name.'
            : 'Please enter your farm or estate name.'
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
          onClose();
        } else {
          const loggedInUser = await login(email.trim(), password);
          if (loggedInUser.emailVerified === false || loggedInUser.status === 'pending_verification') {
            setEmail(loggedInUser.email || email.trim());
            setNewPendingEmail(loggedInUser.email || email.trim());
            setMode('verify_email');
            setSuccessMsg(
              'Your account is registered, but your email address has not been verified yet. Please check your inbox or resend the verification link below.'
            );
          } else {
            onClose();
          }
        }
      } else if (mode === 'register') {
        const isSeller = isSellerRole(role);
        const registeredUser = await signup(
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

        setEmail(registeredUser.email || email.trim());
        setNewPendingEmail(registeredUser.email || email.trim());
        setMode('verify_email');
        setResendCooldown(60);
        setSuccessMsg('');
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      setErrorMsg(err?.message || 'Authentication failed. Please verify your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckVerified = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsCheckingVerification(true);
    try {
      const result = await checkEmailVerification();
      if (result.verified) {
        setSuccessMsg('Email verified! Welcome to FarmBridge.');
        window.setTimeout(() => {
          onClose();
        }, 450);
      } else {
        setErrorMsg(
          'Your email is not verified yet. Please click the verification link in your inbox (check spam/junk folders too), then try again.'
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not confirm verification status. Please try again.');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResendingEmail) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsResendingEmail(true);
    try {
      const res = await sendVerificationEmail();
      if (res.sent) {
        setResendCooldown(60);
        setSuccessMsg(
          'Verification email sent! Please check your inbox and verify your email address to activate your FarmBridge account.'
        );
      } else {
        setErrorMsg(res.errorMessage || 'Failed to send verification email. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to resend verification email.');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleChangePendingEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!newPendingEmail.trim() || !/\S+@\S+\.\S+/.test(newPendingEmail.trim())) {
      setErrorMsg('Please enter a valid new email address.');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const res = await updatePendingEmail(newPendingEmail.trim(), changeEmailPassword || password || undefined);
      if (res.sent) {
        setEmail(newPendingEmail.trim());
        setShowChangeEmail(false);
        setChangeEmailPassword('');
        setResendCooldown(60);
        setSuccessMsg(
          `Verification email sent to ${newPendingEmail.trim()}! Please check your new inbox and click the verification link to activate your FarmBridge account.`
        );
      } else {
        setErrorMsg(res.errorMessage || 'Could not update your email address.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not update your email address.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleReturnToLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    await logout().catch(() => {});
    setPassword('');
    setConfirmPassword('');
    setShowChangeEmail(false);
    setMode('login');
  };

  const activePendingEmail = (user?.email || email || '').trim();
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
          className="relative w-full max-w-4xl rounded-2xl sm:rounded-[32px] overflow-y-auto md:overflow-hidden shadow-[0_32px_90px_-16px_rgba(3,20,14,0.85)] border border-white/35 bg-[#062B1F] flex flex-col md:grid md:grid-cols-12 max-h-[92dvh]"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 p-2 rounded-full bg-black/35 hover:bg-black/55 border border-white/25 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Left Visual Basket Showcase Pane */}
          <div className="md:col-span-5 relative min-h-[140px] md:min-h-full overflow-hidden flex flex-col justify-between p-4 sm:p-8 text-white shrink-0">
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

            <div className="relative z-10 space-y-2 sm:space-y-4">
              <div className="inline-flex items-center gap-2">
                <div className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center shrink-0">
                  <img
                    src="/assets/farmbridge-logo-white.png"
                    alt="FarmBridge logo"
                    className="w-full h-full object-contain drop-shadow-sm"
                  />
                </div>
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  FarmBridge<span className="text-[#A8E635]">.</span>
                </span>
              </div>

              <div className="space-y-1.5 sm:space-y-2.5 pt-1 md:pt-4">
                <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold leading-[1.08] tracking-tight text-balance">
                  From the Farm to <span className="text-[#A8E635]">Your Table.</span>
                </h2>
                <p className="text-xs sm:text-sm text-[#DFF4E4]/90 leading-relaxed max-w-xs">
                  Join FarmBridge and trade directly with verified farmers, buyers, and regional fodder suppliers.
                </p>
              </div>
            </div>
          </div>

          {/* Right Frosted Glass Signup Form Pane */}
          <div className="md:col-span-7 relative p-4 sm:p-7 overflow-y-visible md:overflow-y-auto md:max-h-[94dvh] bg-linear-to-br from-[#0E3F2C]/92 via-[#082E20]/96 to-[#062B1F] text-white">
            <div className="max-w-md mx-auto space-y-4">
              <div className="text-center md:text-left pr-6">
                <h3 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
                  Create Your Account
                </h3>
                <p className="text-xs text-[#DFF4E4]/75 mt-0.5">
                  Join FarmBridge today — verify your email right after registration
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
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <label
                    className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 text-center ${
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
                    <span className="text-[10px] sm:text-[11px] leading-tight">Buyer</span>
                  </label>

                  <label
                    className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 text-center ${
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
                    <span className="text-[10px] sm:text-[11px] leading-tight">Farmer</span>
                  </label>

                  <label
                    className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1 text-center ${
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
                    <span className="text-[10px] sm:text-[11px] leading-tight">Fodder Supplier</span>
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

                {/* Email & Optional Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone Number (Optional)"
                      className={frostedInputClass}
                    />
                  </div>
                </div>

                <div className="px-3.5 py-2.5 rounded-2xl bg-white/10 border border-white/20 text-[11px] text-[#DFF4E4]/90 flex items-start gap-2 backdrop-blur-md">
                  <MailCheck className="w-4 h-4 text-[#A8E635] shrink-0 mt-0.5" />
                  <span>
                    We’ll send a verification link to your email address right after you sign up so your account can be activated.
                  </span>
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
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {isSubmitting ? 'Creating Account...' : 'Sign Up & Send Verification Email'}
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
      ) : mode === 'verify_email' ? (
        /* VERIFY EMAIL LIQUID GLASS CARD */
        <motion.div
          id="auth-dialog"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-2xl sm:rounded-[34px] overflow-hidden shadow-[0_36px_96px_-18px_rgba(3,20,14,0.85)] border border-white/35 flex items-center justify-center p-3 sm:p-7"
        >
          <img
            src={meadowBackdropImg}
            alt="Sunlit green agricultural meadow"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-[#062B1F]/45 via-[#062B1F]/30 to-[#062B1F]/75" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 p-2 rounded-full bg-black/35 hover:bg-black/55 border border-white/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10 w-full rounded-2xl sm:rounded-[28px] lg-glass-frosted p-4 sm:p-7 text-white space-y-4">
            <div className="space-y-2">
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

              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#A8E635]/20 border border-[#A8E635]/45 flex items-center justify-center shrink-0">
                  <MailCheck className="w-5 h-5 text-[#A8E635]" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                    Verify Your Email
                  </h2>
                  {activePendingEmail && (
                    <p className="text-xs font-semibold text-[#A8E635] break-all">
                      {activePendingEmail}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {lastVerificationError && !errorMsg && (
              <div className="p-3 rounded-2xl bg-amber-500/25 border border-amber-300/45 text-white text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-200 shrink-0 mt-0.5" />
                <span>{lastVerificationError}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-600/30 border border-rose-200/45 text-white text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-200 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {(successMsg || !lastVerificationError) && (
              <div className="p-3.5 rounded-2xl bg-[#A8E635]/18 border border-[#A8E635]/40 text-white text-xs space-y-1.5">
                <div className="font-bold flex items-start gap-2 text-[#DFF4E4]">
                  <CheckCircle2 className="w-4 h-4 text-[#A8E635] shrink-0 mt-0.5" />
                  <span>
                    {successMsg ||
                      'Verification email sent! Please check your inbox and verify your email address to activate your FarmBridge account.'}
                  </span>
                </div>
                <p className="text-[11px] text-white/80 pl-6 leading-relaxed">
                  Open the verification link in your inbox (or spam/junk folder), then tap below to activate full access.
                </p>
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              <button
                type="button"
                onClick={handleCheckVerified}
                disabled={isCheckingVerification}
                className="w-full py-3.5 rounded-2xl lg-cta-lime text-[#062B1F] font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCheckingVerification ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {isCheckingVerification ? 'Checking Verification...' : "I've Verified My Email"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResendingEmail || resendCooldown > 0}
                className="w-full py-2.5 rounded-2xl bg-white/14 hover:bg-white/22 border border-white/30 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isResendingEmail ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>
                  {isResendingEmail
                    ? 'Sending Verification Email...'
                    : resendCooldown > 0
                    ? `Resend Verification Email (${resendCooldown}s)`
                    : 'Resend Verification Email'}
                </span>
              </button>
            </div>

            {requiresEmailVerification && (
              <div className="pt-1 border-t border-white/15 space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeEmail((prev) => !prev);
                    setNewPendingEmail(activePendingEmail);
                    setErrorMsg('');
                  }}
                  className="text-xs font-bold text-[#A8E635] hover:underline cursor-pointer"
                >
                  {showChangeEmail ? 'Hide Change Email' : 'Entered the wrong email? Change Email Address'}
                </button>

                {showChangeEmail && (
                  <form onSubmit={handleChangePendingEmail} className="space-y-2 text-xs">
                    <input
                      type="email"
                      value={newPendingEmail}
                      onChange={(e) => setNewPendingEmail(e.target.value)}
                      placeholder="New email address"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white/14 border border-white/40 text-white placeholder:text-white/65 focus:outline-none focus:border-[#A8E635]"
                      required
                    />
                    <input
                      type="password"
                      value={changeEmailPassword}
                      onChange={(e) => setChangeEmailPassword(e.target.value)}
                      placeholder="Current password (if asked to re-confirm)"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-white/14 border border-white/40 text-white placeholder:text-white/65 focus:outline-none focus:border-[#A8E635]"
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingEmail}
                      className="w-full py-2.5 rounded-2xl bg-white text-[#062B1F] font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isUpdatingEmail ? 'Updating Email...' : 'Update Email & Send Link'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleReturnToLogin}
                className="inline-flex items-center gap-1.5 font-bold text-[#DFF4E4] hover:text-[#A8E635] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Login</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-white/75 hover:text-white font-semibold cursor-pointer"
              >
                Browse Marketplace
              </button>
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
          className="relative w-full max-w-md rounded-2xl sm:rounded-[34px] overflow-hidden shadow-[0_36px_96px_-18px_rgba(3,20,14,0.85)] border border-white/35 min-h-0 sm:min-h-[540px] flex items-center justify-center p-3 sm:p-7"
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
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 p-2 rounded-full bg-black/35 hover:bg-black/55 border border-white/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Centered Frosted Liquid Glass Login Card */}
          <div className="relative z-10 w-full rounded-2xl sm:rounded-[28px] lg-glass-frosted p-4 sm:p-7 text-white space-y-4 sm:space-y-5">
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
