import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { isSellerRole } from '../types';
import {
  AlertTriangle,
  X,
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

  // Recent auth OTP verification for users signed in via Firestore/OTP fallback (where auth.currentUser is null)
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

  if (!isOpen || !user) return null;

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
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 space-y-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900 text-base">Delete Account Permanently</h2>
              <p className="text-[11px] text-stone-500">This action cannot be undone</p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700"
            aria-label="Close delete account modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Box */}
        <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200 space-y-2 text-xs text-red-900">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Permanent Deletion Warning</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed text-red-800">
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
          <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleConfirmDelete} className="space-y-4 text-xs">
          {/* Step 1: Acknowledgement */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200 cursor-pointer">
            <input
              type="checkbox"
              checked={understoodWarning}
              onChange={(e) => setUnderstoodWarning(e.target.checked)}
              className="mt-0.5 rounded border-stone-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-stone-700 leading-snug">
              I understand that deleting <strong>{user.email}</strong> is permanent and my profile and associated content cannot be recovered.
            </span>
          </label>

          {/* Step 2: Explicit DELETE confirmation */}
          <div>
            <label className="font-bold text-stone-700 block mb-1">
              Type <span className="font-mono text-red-700">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              autoComplete="off"
            />
          </div>

          {/* Step 3: Recent authentication */}
          {needsPasswordReauth ? (
            <div>
              <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-stone-500" />
                <span>Re-enter Current Password (Recent Login Check)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                autoComplete="current-password"
              />
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="font-bold text-stone-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-stone-500" />
                  Identity Verification Required
                </span>
                {otpVerified && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
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
                      className={`flex-1 py-1.5 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 ${
                        otpChannel === 'email'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-600 border-stone-200'
                      }`}
                    >
                      <Mail className="w-3 h-3" />
                      Email
                    </button>
                    {user.phone && (
                      <button
                        type="button"
                        onClick={() => {
                          setOtpChannel('phone');
                          setOtpSent(false);
                          setSandboxHint('');
                        }}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1 ${
                          otpChannel === 'phone'
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white text-stone-600 border-stone-200'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        SMS Phone
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-stone-500 truncate flex-1">
                      Target: <strong>{targetAddress || 'N/A'}</strong>
                    </span>
                    <button
                      type="button"
                      disabled={otpLoading}
                      onClick={handleSendVerification}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-black text-white font-bold text-[11px] shrink-0"
                    >
                      {otpLoading ? 'Sending...' : otpSent ? 'Resend Code' : 'Send Code'}
                    </button>
                  </div>

                  {sandboxHint && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px]">
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
                        className="flex-1 px-3 py-2 rounded-xl border border-stone-300 font-mono text-stone-900 bg-white"
                      />
                      <button
                        type="button"
                        disabled={otpLoading}
                        onClick={handleVerifyOtp}
                        className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px]"
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
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? 'Deleting Account...' : 'Permanently Delete Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
