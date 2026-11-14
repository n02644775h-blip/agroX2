import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { submitFirebaseReview, RATING_LABELS } from '../services/firebaseReviews';
import { createFirebaseNotification } from '../services/firebaseNotifications';
import { normalizeOrderStatus } from '../utils/orderUtils';
import { Order, Review } from '../types';
import { Star, X, AlertCircle, Loader2 } from 'lucide-react';

interface ReviewModalProps {
  order: Order | null;
  onClose: () => void;
  onSuccess: (review?: Review) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ order, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!order || !user) return null;

  const activeStar = hoverRating || rating;
  const activeLabel = RATING_LABELS[activeStar] || RATING_LABELS[rating];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (order.buyerId !== user.id) {
      setErrorMsg('Only the buyer who placed this order can rate it.');
      return;
    }

    const canonical = normalizeOrderStatus(order.status, order.deliveryMethod);
    if (canonical !== 'done') {
      setErrorMsg('You can rate your order only after it reaches Done status.');
      return;
    }

    if (order.isReviewed) {
      setErrorMsg('You have already rated this completed order.');
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedComment = comment.trim();
      const createdReview = await submitFirebaseReview({
        order,
        buyerId: user.id,
        buyerName: user.name,
        buyerAvatar: user.avatar,
        rating,
        comment: trimmedComment
      });

      // Mirror to backend API store (ignore 404/network hiccup if Firestore succeeded, but surface duplicate errors)
      await api
        .createReview({
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          productId: order.items?.[0]?.productId || '',
          productName: order.items?.[0]?.productName || 'Farm Order',
          farmerId: order.farmerId,
          buyerId: user.id,
          buyerName: user.name,
          buyerAvatar: user.avatar,
          rating,
          comment: trimmedComment
        })
        .catch((err) => {
          console.warn('Backend review sync warning:', err?.message || err);
        });

      // Notify the farmer immediately in real time
      await createFirebaseNotification({
        userId: order.farmerId,
        title: `New ${rating}-Star Order Rating (${order.orderNumber})`,
        message: trimmedComment
          ? `${user.name} rated order ${order.orderNumber} ${activeLabel}: "${trimmedComment}"`
          : `${user.name} rated order ${order.orderNumber} ${activeLabel}.`,
        type: 'order',
        link: 'orders',
        metadata: { orderId: order.id, rating }
      }).catch(() => {});

      onSuccess(createdReview);
    } catch (err: any) {
      console.error('Failed to submit rating:', err);
      setErrorMsg(err?.message || 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-stone-900 text-lg">Rate Your Order</h2>
            <p className="text-xs text-stone-500">
              {order.farmName} • {order.orderNumber}
            </p>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700"
            aria-label="Close rating modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2.5">
            <label className="font-bold text-stone-700 block text-center">
              Select a rating for this completed order
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={RATING_LABELS[star]}
                  className="p-1 focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                >
                  <Star
                    className={`w-8 h-8 ${
                      activeStar >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-stone-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl py-1.5 px-3">
              {activeLabel}
            </div>
          </div>

          <div>
            <label className="font-bold text-stone-700 block mb-1">
              Written Review <span className="font-normal text-stone-400">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share optional feedback on freshness, packaging, or delivery..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'Submitting Rating...' : 'Submit Rating'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

