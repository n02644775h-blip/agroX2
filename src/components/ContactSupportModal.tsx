import React, { useState, useEffect } from 'react';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import { SupportRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { createFirebaseSupportRequest } from '../services/firebaseSupportRequests';
import {
  ShieldAlert,
  Lock,
  User as UserIcon,
  Phone,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Headphones
} from 'lucide-react';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRequestType?: 'name' | 'phone' | 'both';
}

export const ContactSupportModal: React.FC<ContactSupportModalProps> = ({
  isOpen,
  onClose,
  defaultRequestType = 'both'
}) => {
  const { user } = useAuth();
  const [requestType, setRequestType] = useState<'name' | 'phone' | 'both'>(defaultRequestType);
  const [requestedName, setRequestedName] = useState('');
  const [requestedPhone, setRequestedPhone] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedRequest, setSubmittedRequest] = useState<SupportRequest | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRequestType(defaultRequestType);
      setRequestedName('');
      setRequestedPhone('');
      setReason('');
      setErrorMsg('');
      setSubmittedRequest(null);
    }
  }, [isOpen, defaultRequestType]);

  if (!user) return null;

  const needsName = requestType === 'name' || requestType === 'both';
  const needsPhone = requestType === 'phone' || requestType === 'both';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (needsName && !requestedName.trim()) {
      setErrorMsg('Please enter the new Full Name you would like to request.');
      return;
    }
    if (needsPhone && !requestedPhone.trim()) {
      setErrorMsg('Please enter the new Phone Number you would like to request.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMsg('Please provide a brief reason for your change request.');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const requestId = `sup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const payload: SupportRequest = {
        id: requestId,
        userId: user.id,
        userRole: user.role,
        currentName: user.name,
        currentPhone: user.phone || '',
        userEmail: user.email,
        requestType,
        ...(needsName ? { requestedName: requestedName.trim() } : {}),
        ...(needsPhone ? { requestedPhone: requestedPhone.trim() } : {}),
        reason: reason.trim(),
        status: 'pending',
        createdAt: now,
        updatedAt: now
      };

      await Promise.all([
        createFirebaseSupportRequest(payload),
        api.createSupportRequest(payload).catch(() => payload)
      ]);

      setSubmittedRequest(payload);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to submit your support request right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LiquidGlassModal
      id="contact-support-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="FarmBridge Support"
      subtitle="Request an update to your protected account details"
      icon={<Headphones className="w-5 h-5 text-[#A8E635]" />}
      maxWidthClass="max-w-lg"
    >
      <div className="p-5 sm:p-6 space-y-5 text-xs">
        {/* Protected Identity Notice */}
        <div className="p-3.5 rounded-2xl bg-[#DFF4E4]/85 border border-[#145A38]/20 text-[#062B1F] flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-[#145A38] shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            Your full name and phone number are protected account details. To request a change,
            please contact FarmBridge Support.
          </p>
        </div>

        {submittedRequest ? (
          <div className="p-5 rounded-2xl bg-[#DFF4E4]/75 border border-[#145A38]/25 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#145A38] text-[#A8E635] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-[#062B1F]">
              Support Request Submitted
            </h3>
            <p className="text-[#0B3D2B]/80 leading-relaxed">
              Your change request (<span className="font-mono font-bold">{submittedRequest.id}</span>) has been logged with status{' '}
              <span className="font-bold text-[#145A38] uppercase">Pending</span>. Our Bulawayo support team will review it shortly.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
              <a
                href={`mailto:farmbridge2026@gmail.com?subject=${encodeURIComponent(
                  `Protected Account Update Request (${submittedRequest.id})`
                )}&body=${encodeURIComponent(
                  `Hello FarmBridge Support,\n\nUser: ${user.name} (${user.email})\nCurrent Phone: ${user.phone || 'Not set'}\nRequest Type: ${submittedRequest.requestType}\n${submittedRequest.requestedName ? `Requested Full Name: ${submittedRequest.requestedName}\n` : ''}${submittedRequest.requestedPhone ? `Requested Phone Number: ${submittedRequest.requestedPhone}\n` : ''}Reason: ${submittedRequest.reason}\nReference ID: ${submittedRequest.id}`
                )}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-[#145A38]/20 text-[#062B1F] font-bold hover:bg-[#DFF4E4]/50 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#145A38]" />
                <span>Email Support Copy</span>
              </a>
              <LiquidGlassButton type="button" variant="emerald" size="sm" onClick={onClose}>
                Done
              </LiquidGlassButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Current Locked Details (Read-Only) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/75 border border-[#062B1F]/10">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#0B3D2B]/65 flex items-center gap-1 mb-1">
                  <Lock className="w-3 h-3 text-[#145A38]" />
                  Current Full Name
                </label>
                <div className="px-3 py-2 rounded-xl bg-stone-100/90 border border-[#062B1F]/10 text-[#062B1F] font-semibold truncate">
                  {user.name}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#0B3D2B]/65 flex items-center gap-1 mb-1">
                  <Lock className="w-3 h-3 text-[#145A38]" />
                  Current Phone Number
                </label>
                <div className="px-3 py-2 rounded-xl bg-stone-100/90 border border-[#062B1F]/10 text-[#062B1F] font-semibold truncate">
                  {user.phone || 'Not set'}
                </div>
              </div>
            </div>

            {/* Request Type */}
            <div>
              <label className="font-bold text-[#062B1F] block mb-1.5">
                What would you like to update? *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'name', label: 'Full Name' },
                  { id: 'phone', label: 'Phone Number' },
                  { id: 'both', label: 'Both Details' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRequestType(opt.id as 'name' | 'phone' | 'both')}
                    className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold leading-tight border text-center transition-all cursor-pointer min-h-[40px] ${
                      requestType === opt.id
                        ? 'bg-[#062B1F] text-[#A8E635] border-[#062B1F] shadow-xs'
                        : 'bg-white/80 text-[#0B3D2B] border-[#062B1F]/15 hover:bg-[#DFF4E4]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {needsName && (
              <div>
                <label className="font-bold text-[#062B1F] mb-1 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-[#145A38]" />
                  <span>Requested New Full Name *</span>
                </label>
                <input
                  type="text"
                  value={requestedName}
                  onChange={(e) => setRequestedName(e.target.value)}
                  placeholder="Enter corrected or updated full name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                  required={needsName}
                />
              </div>
            )}

            {needsPhone && (
              <div>
                <label className="font-bold text-[#062B1F] mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#145A38]" />
                  <span>Requested New Phone Number *</span>
                </label>
                <input
                  type="tel"
                  value={requestedPhone}
                  onChange={(e) => setRequestedPhone(e.target.value)}
                  placeholder="+263 77 ..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                  required={needsPhone}
                />
              </div>
            )}

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">
                Reason for Change *
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you need your full name or phone number updated (e.g., typo during registration, new SIM card)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                required
              />
            </div>

            {/* Direct Contact Support Links */}
            <div className="p-3 rounded-xl bg-white/65 border border-[#062B1F]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#0B3D2B]/80">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                <span>Direct FarmBridge Support:</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="mailto:farmbridge2026@gmail.com"
                  className="inline-flex items-center gap-1 font-bold text-[#145A38] hover:underline"
                >
                  <Mail className="w-3 h-3" />
                  <span>farmbridge2026@gmail.com</span>
                </a>
                <a
                  href="tel:+263716930165"
                  className="inline-flex items-center gap-1 font-bold text-[#145A38] hover:underline"
                >
                  <Phone className="w-3 h-3" />
                  <span>+263 716 930 165</span>
                </a>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#062B1F]/10">
              <LiquidGlassButton type="button" variant="light" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </LiquidGlassButton>
              <LiquidGlassButton
                id="submit-support-request-btn"
                type="submit"
                variant="emerald"
                size="sm"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{submitting ? 'Submitting...' : 'Submit Support Request'}</span>
              </LiquidGlassButton>
            </div>
          </form>
        )}
      </div>
    </LiquidGlassModal>
  );
};
