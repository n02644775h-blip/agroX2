import React, { useState } from 'react';
import { ShieldCheck, Lock, User, Key, Eye, EyeOff, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LiquidGlassModal, LiquidGlassButton } from './glass';

interface AdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminAccessModal: React.FC<AdminAccessModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { loginAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toUpperCase();
    const cleanPassword = password.trim().toUpperCase();

    if (!cleanUsername || !cleanPassword) {
      setError('Please enter both Admin Username and Password.');
      return;
    }

    setLoading(true);
    try {
      await loginAdmin(cleanUsername, cleanPassword);
      setSuccess(true);
      setTimeout(() => {
        setLoading(false);
        setSuccess(false);
        setUsername('');
        setPassword('');
        onSuccess();
      }, 700);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Invalid administrator credentials. Access denied.');
    }
  };

  return (
    <LiquidGlassModal
      isOpen={isOpen}
      onClose={onClose}
      hideHeader
      tone="dark"
      maxWidthClass="max-w-md"
    >
      <div>
        {/* Deep Forest Liquid Glass Header */}
        <div className="px-6 py-5 bg-[#062B1F]/85 text-white flex items-center justify-between border-b border-white/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#A8E635]/20 text-[#A8E635] border border-[#A8E635]/40 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Administrator Access</h3>
              <p className="text-xs text-[#DFF4E4]/75">Restricted FarmBridge Management Portal</p>
            </div>
          </div>
          <button
            id="close-admin-modal-btn"
            type="button"
            onClick={onClose}
            aria-label="Close admin access modal"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#DFF4E4] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-100 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-300" />
              <div>
                <span className="font-bold">Authentication Failed:</span> {error}
              </div>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-2xl bg-[#A8E635]/20 border border-[#A8E635]/45 text-[#DFF4E4] text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#A8E635] shrink-0" />
              <div>
                <span className="font-bold text-white">Access Granted!</span> Loading Administrator Dashboard...
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#DFF4E4]/85 uppercase tracking-wider">
                Admin Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A8E635]/80">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="admin-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin ID"
                  required
                  className="w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold tracking-wider text-white placeholder:text-white/40 uppercase focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#A8E635]/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#DFF4E4]/85 uppercase tracking-wider">
                Admin Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A8E635]/80">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold tracking-wider text-white placeholder:text-white/40 uppercase focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#A8E635]/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#DFF4E4]/65 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <LiquidGlassButton
                id="submit-admin-auth-btn"
                type="submit"
                variant="lime"
                size="md"
                disabled={loading || success}
                className="w-full"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#062B1F]/30 border-t-[#062B1F] rounded-full animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Sign In to Admin Portal</span>
                  </>
                )}
              </LiquidGlassButton>
            </div>
          </form>

          <div className="border-t border-white/12 pt-3 text-center">
            <p className="text-[11px] text-[#DFF4E4]/60">
              Only authorized FarmBridge platform administrators have clearance to access this portal.
            </p>
          </div>
        </div>
      </div>
    </LiquidGlassModal>
  );
};
