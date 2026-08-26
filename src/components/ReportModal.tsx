import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Product, ReportReason } from '../types';
import { Flag, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
            <Flag className="w-5 h-5" />
            <span>Report Listing</span>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-6 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-stone-900 text-sm">Report Submitted</h3>
            <p className="text-xs text-stone-500">
              Thank you for keeping agroX safe. Our moderation team has received your ticket.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-stone-700 block mb-1">Reason for Report</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value as ReportReason)}
                className="w-full px-3 py-2.5 bg-stone-50 rounded-xl border border-stone-300 text-stone-900"
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
              <label className="font-bold text-stone-700 block mb-1">Details & Context</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Explain the issue to help our moderation team review this listing..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Flag to Admin Team'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
