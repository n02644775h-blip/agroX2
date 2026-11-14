import React, { useEffect, useRef, useState } from 'react';
import { Order } from '../types';
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

  const primaryOrder = orders[0];
  const orderKey = orders.map(o => o.id).join(',');

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
    <div
      id="order-confirmation-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        id="order-confirmation-card"
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-emerald-100 text-center space-y-6 my-4"
      >
        {/* Smooth Animated Green Checkmark */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-emerald-400/25 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-600/20 animate-bounce">
            <CheckCircle2 className="w-11 h-11 stroke-[2.5]" />
          </div>
        </div>

        {/* Confirmation Copy */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Order Placed Successfully!
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Your order has been received and sent to the farmer.
          </p>
        </div>

        {/* Order Reference Summary */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left space-y-3">
          {orders.map(ord => (
            <div
              key={ord.id}
              className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-200 last:border-b-0 last:pb-0"
            >
              <div className="space-y-0.5">
                <div className="text-[11px] uppercase tracking-wider font-bold text-stone-500">
                  Order Reference
                </div>
                <div className="font-mono font-extrabold text-sm text-emerald-700">
                  {ord.orderNumber}
                </div>
                <div className="text-xs text-stone-600 flex items-center gap-1.5">
                  {ord.deliveryMethod === 'pickup' ? (
                    <Store className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>
                    {ord.farmName} • {ord.items.length} item{ord.items.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-extrabold text-stone-900 tabular-nums">
                  ${ord.totalAmount.toFixed(2)}
                </div>
                <div className="text-[11px] font-semibold text-stone-500 capitalize">
                  {ord.deliveryMethod === 'pickup' ? 'Farm Pickup' : 'Delivery'}
                </div>
              </div>
            </div>
          ))}

          {orders.length > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-xs font-extrabold text-stone-900">
              <span>Combined Total</span>
              <span className="text-emerald-700 tabular-nums">${grandTotal.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Dynamic Redirect Countdown */}
        <div
          id="order-redirect-countdown"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold tabular-nums"
        >
          <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Redirecting in {secondsLeft} seconds...</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            id="confirm-view-orders-btn"
            type="button"
            onClick={handleViewOrders}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>View My Orders</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            id="confirm-return-home-btn"
            type="button"
            onClick={handleReturnHome}
            className="w-full py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-stone-200 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </button>
        </div>
      </div>
    </div>
  );
};
