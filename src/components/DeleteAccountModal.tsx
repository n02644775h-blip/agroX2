import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { isSellerRole } from '../types';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import {
  AlertTriangle,
  Lock,
  ShieldAlert,
  Loader2,
  Mail,
  Smartphone,
  CheckCircle2
} from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onDeleted
}) => {
  const { user, currentUser, deleteAccount } = useAuth();
  const [understoodWarning, setUnderstoodWarning] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [password, setPassword] = useState('');

  // Recent auth OTP verification for users signed in via Firestore/OTP fallback
  const needsPasswordReauth = Boolean(currentUser && currentUser.email);
  const [otpChannel, setOtpChannel] = useState<'email' | 'phone'>(
    user?.phone && user.verificationMethod === 'phone' ? 'phone' : 'email'
  );
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [sandboxHint, setSandboxHint] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!user) return null;

  const isSeller = isSellerRole(user.role);
  const targetAddress =
    otpChannel === 'phone' ? (user.phone || '').trim() : (user.email || '').trim();

  const handleSendVerification = async () => {
    if (!targetAddress) {
      setErrorMsg(
        otpChannel === 'phone'
          ? 'No phone number is on file. Please verify using your email address.'
          : 'No email address is on file for this account.'
      );
      return;
    }
    setOtpLoading(true);
    setErrorMsg('');
    try {
      const res = await api.sendVerificationCode({
        channel: otpChannel,
        target: targetAddress,
        name: user.name
      });
      setOtpSent(true);
      setSandboxHint(res.sandboxCode ? `Verification code: ${res.sandboxCode}` : '');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not send verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setOtpLoading(true);
    setErrorMsg('');
    try {
      const res = await api.verifyCode({
        channel: otpChannel,
        target: targetAddress,
        code: otpCode.trim()
      });
      if (res.verified) {
        setOtpVerified(true);
      } else {
        setErrorMsg('Invalid verification code.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification failed. Please check your code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!understoodWarning) {
      setErrorMsg('Please confirm that you understand account deletion is permanent.');
      return;
    }
    if (confirmPhrase.trim().toUpperCase() !== 'DELETE') {
      setErrorMsg('Please type DELETE in the confirmation box to proceed.');
      return;
    }
    if (needsPasswordReauth && !password.trim()) {
      setErrorMsg('Please enter your current password to verify recent authentication.');
      return;
    }
    if (!needsPasswordReauth && !otpVerified) {
      setErrorMsg('Please complete the verification code check to confirm recent authentication.');
      return;
    }

    setSubmitting(true);
    try {
      await deleteAccount(needsPasswordReauth ? { password } : undefined);
      onClose();
      if (onDeleted) onDeleted();
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Could not complete account deletion. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LiquidGlassModal
      isOpen={isOpen}
      onClose={() => !submitting && onClose()}
      title="Delete Account Permanently"
      subtitle="This action cannot be undone"
      icon={<ShieldAlert className="w-5 h-5 text-rose-300" />}
      maxWidthClass="max-w-md"
    >
      <div className="p-6 space-y-5">
        {/* Warning Box */}
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2 text-xs text-rose-950">
          <div className="font-bold flex items-center gap-1.5 text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Permanent Deletion Warning</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed text-rose-900">
            <li>
              Your FarmBridge profile, login credentials, personal contact details, and saved favorites will be permanently deleted.
            </li>
            <li>
              {isSeller
                ? 'Your product listings, showcase posts, and active ad requests will be removed. Accounts with open or unverified buyer orders cannot be deleted until orders are completed.'
                : 'Your open sourcing requests and notifications will be removed.'}
            </li>
            <li>
              Legally required transaction records on past completed orders are preserved in anonymized form without your personal contact details.
            </li>
          </ul>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-900 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleConfirmDelete} className="space-y-4 text-xs">
          {/* Step 1: Acknowledgement */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/75 border border-[#062B1F]/12 cursor-pointer">
            <input
              type="checkbox"
              checked={understoodWarning}
              onChange={(e) => setUnderstoodWarning(e.target.checked)}
              className="mt-0.5 rounded border-[#062B1F]/25 text-rose-600 focus:ring-rose-500"
            />
            <span className="text-[#062B1F] leading-snug">
              I understand that deleting <strong>{user.email}</strong> is permanent and my profile and associated content cannot be recovered.
            </span>
          </label>

          {/* Step 2: Explicit DELETE confirmation */}
          <div>
            <label className="font-bold text-[#062B1F] block mb-1">
              Type <span className="font-mono text-rose-700">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 font-mono text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-rose-500/25"
              autoComplete="off"
            />
          </div>

          {/* Step 3: Recent authentication */}
          {needsPasswordReauth ? (
            <div>
              <label className="font-bold text-[#062B1F] mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#0B3D2B]/65" />
                <span>Re-enter Current Password (Recent Login Check)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-rose-500/25"
                autoComplete="current-password"
              />
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-white/70 border border-[#062B1F]/12 space-y-2.5">
              <div className="font-bold text-[#062B1F] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#0B3D2B]/65" />
                  Identity Verification Required
                </span>
                {otpVerified && (
                  <span className="inline-flex items-center gap-1 text-[#145A38] font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </div>

              {!otpVerified && (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpChannel('email');
                        setOtpSent(false);
                        setSandboxHint('');
                      }}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                        otpChannel === 'email'
                          ? 'bg-[#062B1F] text-white border-[#062B1F]'
                          : 'bg-white text-[#0B3D2B] border-[#062B1F]/15'
                      }`}
                    >
                      <Mail className="w-3 h-3" />
                      <span>Email</span>
                    </button>
                    {user.phone && (
                      <button
                        type="button"
                        onClick={() => {
                          setOtpChannel('phone');
                          setOtpSent(false);
                          setSandboxHint('');
                        }}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                          otpChannel === 'phone'
                            ? 'bg-[#062B1F] text-white border-[#062B1F]'
                            : 'bg-white text-[#0B3D2B] border-[#062B1F]/15'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>SMS Phone</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#0B3D2B]/70 truncate flex-1">
                      Target: <strong>{targetAddress || 'N/A'}</strong>
                    </span>
                    <button
                      type="button"
                      disabled={otpLoading}
                      onClick={handleSendVerification}
                      className="px-3 py-1.5 rounded-xl bg-[#062B1F] hover:bg-[#0B3D2B] text-white font-bold text-[11px] shrink-0 cursor-pointer"
                    >
                      {otpLoading ? 'Sending...' : otpSent ? 'Resend Code' : 'Send Code'}
                    </button>
                  </div>

                  {sandboxHint && (
                    <div className="px-2.5 py-1.5 rounded-xl bg-[#F4D35E]/25 border border-[#F4D35E]/60 text-[#062B1F] font-mono text-[11px]">
                      {sandboxHint}
                    </div>
                  )}

                  {otpSent && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="6-digit code"
                        maxLength={6}
                        className="flex-1 px-3 py-2 rounded-xl border border-[#062B1F]/15 font-mono text-[#062B1F] bg-white"
                      />
                      <button
                        type="button"
                        disabled={otpLoading}
                        onClick={handleVerifyOtp}
                        className="px-3.5 py-2 rounded-xl bg-[#145A38] hover:bg-[#0B3D2B] text-white font-bold text-[11px] cursor-pointer"
                      >
                        Verify
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <LiquidGlassButton
              type="button"
              variant="light"
              size="sm"
              disabled={submitting}
              onClick={onClose}
            >
              Cancel
            </LiquidGlassButton>
            <LiquidGlassButton
              type="submit"
              variant="danger"
              size="sm"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? 'Deleting Account...' : 'Permanently Delete Account'}</span>
            </LiquidGlassButton>
          </div>
        </form>
      </div>
    </LiquidGlassModal>
  );
};
