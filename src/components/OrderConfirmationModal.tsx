import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Order } from '../types';
import { LiquidGlassButton, LiquidGlassCard } from './glass';
import { CheckCircle2, ArrowRight, Home, ShoppingBag, Truck, Store, Clock } from 'lucide-react';

interface OrderConfirmationModalProps {
  orders: Order[];
  onViewOrders: (primaryOrder: Order) => void;
  onReturnHome: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  orders,
  onViewOrders,
  onReturnHome
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(10);
  const cancelledRef = useRef<boolean>(false);
  const startedRef = useRef<boolean>(false);
  const intervalRef = useRef<number | null>(null);
  const returnHomeRef = useRef(onReturnHome);
  returnHomeRef.current = onReturnHome;
  const prefersReducedMotion = useReducedMotion();

  const primaryOrder = orders[0];
  const orderKey = orders.map((o) => o.id).join(',');

  useEffect(() => {
    if (!orderKey || startedRef.current) return;
    startedRef.current = true;
    cancelledRef.current = false;

    const startedAt = Date.now();
    const totalMs = 10_000;

    intervalRef.current = window.setInterval(() => {
      if (cancelledRef.current) {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setSecondsLeft(remaining);

      if (elapsed >= totalMs) {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (!cancelledRef.current) {
          cancelledRef.current = true;
          returnHomeRef.current();
        }
      }
    }, 250);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [orderKey]);

  const cancelCountdown = () => {
    cancelledRef.current = true;
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleViewOrders = () => {
    cancelCountdown();
    if (primaryOrder) {
      onViewOrders(primaryOrder);
    }
  };

  const handleReturnHome = () => {
    cancelCountdown();
    onReturnHome();
  };

  if (!primaryOrder) return null;

  const grandTotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <motion.div
      id="order-confirmation-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-[#062B1F]/78 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="w-full max-w-lg my-4"
      >
        <LiquidGlassCard
          id="order-confirmation-card"
          variant="dark"
          shimmer
          className="p-6 sm:p-8 text-center space-y-6"
        >
          {/* Smooth Animated Green Checkmark */}
          <div className="relative mx-auto w-22 h-22 flex items-center justify-center">
            {!prefersReducedMotion && (
              <motion.span
                animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-[#A8E635]/30"
              />
            )}
            <motion.div
              initial={prefersReducedMotion ? undefined : { scale: 0.5, rotate: -15 }}
              animate={prefersReducedMotion ? undefined : { scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 20 }}
              className="relative w-20 h-20 rounded-full bg-linear-to-br from-[#A8E635] to-[#145A38] border-2 border-white/60 flex items-center justify-center text-[#062B1F] shadow-xl shadow-[#A8E635]/30"
            >
              <CheckCircle2 className="w-11 h-11 stroke-[2.5]" />
            </motion.div>
          </div>

          {/* Confirmation Copy */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Order Placed Successfully!
            </h2>
            <p className="text-sm text-[#DFF4E4]/85 leading-relaxed">
              Your order has been received and sent to the farmer.
            </p>
          </div>

          {/* Order Reference Summary */}
          <div className="bg-white/10 border border-white/18 rounded-2xl p-4 text-left space-y-3 backdrop-blur-md">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/12 last:border-b-0 last:pb-0"
              >
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-[#DFF4E4]/65">
                    Order Reference
                  </div>
                  <div className="font-mono font-extrabold text-sm text-[#A8E635]">
                    {ord.orderNumber}
                  </div>
                  <div className="text-xs text-[#DFF4E4]/85 flex items-center gap-1.5">
                    {ord.deliveryMethod === 'pickup' ? (
                      <Store className="w-3.5 h-3.5 text-[#A8E635]" />
                    ) : (
                      <Truck className="w-3.5 h-3.5 text-[#A8E635]" />
                    )}
                    <span>
                      {ord.farmName} • {ord.items.length} item{ord.items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-white tabular-nums">
                    ${ord.totalAmount.toFixed(2)}
                  </div>
                  <div className="text-[11px] font-semibold text-[#DFF4E4]/70 capitalize">
                    {ord.deliveryMethod === 'pickup' ? 'Farm Pickup' : 'Delivery'}
                  </div>
                </div>
              </div>
            ))}

            {orders.length > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-white/15 text-xs font-extrabold text-white">
                <span>Combined Total</span>
                <span className="text-[#A8E635] tabular-nums">${grandTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Dynamic Redirect Countdown */}
          <div
            id="order-redirect-countdown"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/12 border border-[#A8E635]/40 text-[#DFF4E4] text-xs sm:text-sm font-bold tabular-nums"
          >
            <Clock className="w-4 h-4 text-[#A8E635] shrink-0" />
            <span>Redirecting in {secondsLeft} seconds...</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <LiquidGlassButton
              id="confirm-view-orders-btn"
              variant="lime"
              size="md"
              onClick={handleViewOrders}
              className="w-full"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>View My Orders</span>
              <ArrowRight className="w-4 h-4" />
            </LiquidGlassButton>

            <LiquidGlassButton
              id="confirm-return-home-btn"
              variant="glass"
              size="md"
              onClick={handleReturnHome}
              className="w-full"
            >
              <Home className="w-4 h-4" />
              <span>Return to Homepage</span>
            </LiquidGlassButton>
          </div>
        </LiquidGlassCard>
      </motion.div>
    </motion.div>
  );
};
