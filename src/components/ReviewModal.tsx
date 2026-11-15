import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { submitFirebaseReview, RATING_LABELS } from '../services/firebaseReviews';
import { createFirebaseNotification } from '../services/firebaseNotifications';
import { normalizeOrderStatus } from '../utils/orderUtils';
import { Order, Review } from '../types';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import { Star, AlertCircle, Loader2 } from 'lucide-react';

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
    <LiquidGlassModal
      isOpen={!!order}
      onClose={() => !isSubmitting && onClose()}
      maxWidthClass="max-w-md"
      title="Rate Your Order"
      subtitle={`${order.farmName} • ${order.orderNumber}`}
      icon={<Star className="w-5 h-5 text-[#F4D35E] fill-[#F4D35E]" />}
    >
      <div className="p-5 sm:p-6 space-y-5">
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-white/80 border border-[#0B3D2B]/12 space-y-3">
            <label className="font-bold text-[#062B1F] block text-center">
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
                      activeStar >= star ? 'fill-[#F4D35E] text-[#F4D35E]' : 'text-[#0B3D2B]/20'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="text-center text-xs font-extrabold text-[#062B1F] bg-[#F4D35E]/25 border border-[#F4D35E]/50 rounded-xl py-1.5 px-3">
              {activeLabel}
            </div>
          </div>

          <div>
            <label className="font-bold text-[#062B1F] block mb-1">
              Written Review <span className="font-normal text-[#2B4338]/70">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share optional feedback on freshness, packaging, or delivery..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#0B3D2B]/18 bg-white text-[#062B1F] placeholder-[#2B4338]/50 focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
            />
          </div>

          <LiquidGlassButton
            type="submit"
            variant="lime"
            size="md"
            disabled={isSubmitting}
            className="w-full shadow-lg"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'Submitting Rating...' : 'Submit Rating'}</span>
          </LiquidGlassButton>
        </form>
      </div>
    </LiquidGlassModal>
  );
};
