import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSellerRole } from '../types';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import {
  AlertTriangle,
  Lock,
  ShieldAlert,
  Loader2,
  Mail
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
  const [confirmEmailInput, setConfirmEmailInput] = useState('');

  const needsPasswordReauth = Boolean(currentUser && currentUser.email);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!user) return null;

  const isSeller = isSellerRole(user.role);

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
    if (!needsPasswordReauth) {
      const expectedEmail = (user.email || '').trim().toLowerCase();
      if (!expectedEmail || confirmEmailInput.trim().toLowerCase() !== expectedEmail) {
        setErrorMsg('Please type your exact registered email address to confirm your identity.');
        return;
      }
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
            <div>
              <label className="font-bold text-[#062B1F] mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#0B3D2B]/65" />
                <span>Confirm Registered Email Address ({user.email})</span>
              </label>
              <input
                type="email"
                value={confirmEmailInput}
                onChange={(e) => setConfirmEmailInput(e.target.value)}
                placeholder={user.email}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-rose-500/25"
                autoComplete="off"
              />
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
