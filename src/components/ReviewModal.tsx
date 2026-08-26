import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Order } from '../types';
import { Star, X, CheckCircle, AlertCircle } from 'lucide-react';

interface ReviewModalProps {
  order: Order | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ order, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!order || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setErrorMsg('Please share a few words about your farm produce experience.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await api.createReview({
        orderId: order.id,
        productId: order.items[0]?.productId || '',
        productName: order.items[0]?.productName || 'Produce',
        farmerId: order.farmerId,
        buyerId: user.id,
        buyerName: user.name,
        buyerAvatar: user.avatar,
        rating,
        comment: comment.trim()
      });
      onSuccess();
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setErrorMsg(err?.message || 'Failed to submit review. Please try again.');
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
          <div>
            <h2 className="font-bold text-stone-900 text-lg">Review Producer & Produce</h2>
            <p className="text-xs text-stone-500">{order.farmName} • {order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-stone-700 block mb-2 text-center">
              How was the freshness, quality, and service?
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-stone-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-xs font-bold text-stone-700 mt-1">
              {rating === 5 && 'Outstanding Freshness & Service (5 Stars)'}
              {rating === 4 && 'Very Good Quality (4 Stars)'}
              {rating === 3 && 'Average Experience (3 Stars)'}
              {rating === 2 && 'Below Expectations (2 Stars)'}
              {rating === 1 && 'Poor Quality (1 Star)'}
            </div>
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">Your Detailed Feedback</label>
            <textarea
              rows={4}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="e.g. Crisp vegetables, packaged with great care. Arrived fresh on time!"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            {isSubmitting ? 'Posting Review...' : 'Submit Verified Review'}
          </button>
        </form>
      </div>
    </div>
  );
};
