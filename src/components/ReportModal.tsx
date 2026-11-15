import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Product, ReportReason } from '../types';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import { Flag, CheckCircle2, Loader2 } from 'lucide-react';

interface ReportModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ product, onClose }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<ReportReason>('incorrect_information');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!product || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createReport({
        reporterId: user.id,
        reporterName: user.name,
        targetId: product.id,
        itemType: 'product',
        itemTitle: product.name,
        reason,
        description: description.trim() || 'No additional details provided.'
      });
      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch (err) {
      console.error('Failed to submit report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LiquidGlassModal
      isOpen={!!product}
      onClose={onClose}
      maxWidthClass="max-w-md"
      title="Report Listing"
      subtitle={product.name}
      icon={<Flag className="w-5 h-5 text-rose-400" />}
    >
      <div className="p-5 sm:p-6">
        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#DFF4E4] text-[#145A38] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-[#062B1F] text-base">Report Submitted</h3>
            <p className="text-xs text-[#2B4338] leading-relaxed">
              Thank you for keeping FarmBridge safe. Our moderation team has received your ticket.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-[#062B1F] block mb-1">Reason for Report</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-[#0B3D2B]/18 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
              >
                <option value="incorrect_information">Incorrect / Misleading Information</option>
                <option value="pricing_issue">Extortionate or Fake Pricing</option>
                <option value="out_of_stock_unresponsive">Seller Unresponsive / Out of Stock</option>
                <option value="inappropriate_content">Inappropriate Images or Language</option>
                <option value="fraud">Suspected Scam or Fraud</option>
                <option value="other">Other Violation</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">Details & Context</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the issue to help our moderation team review this listing..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#0B3D2B]/18 bg-white text-[#062B1F] placeholder-[#2B4338]/50 focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                required
              />
            </div>

            <LiquidGlassButton
              type="submit"
              variant="danger"
              size="md"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? 'Submitting...' : 'Submit Flag to Admin Team'}</span>
            </LiquidGlassButton>
          </form>
        )}
      </div>
    </LiquidGlassModal>
  );
};
