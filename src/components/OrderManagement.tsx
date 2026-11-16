import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  subscribeToFirebaseOrders,
  updateFirebaseOrderStatus,
  updateFirebaseOrderPayment
} from '../services/firebaseOrders';
import { createFirebaseNotification } from '../services/firebaseNotifications';
import {
  subscribeToFirebaseReviews,
  getRatingLabel
} from '../services/firebaseReviews';
import { uploadMediaAsset } from '../services/firebaseStorage';
import {
  normalizeOrderStatus,
  getOrderStages,
  getOrderStatusMeta,
  getPaymentMethodLabel,
  getPaymentStatusMeta
} from '../utils/orderUtils';
import { Order, OrderStatus, PaymentStatus, Review, isSellerRole } from '../types';
import { LiquidGlassCard, LiquidGlassButton, LiquidGlassModal } from './glass';
import {
  FileText,
  CheckCircle,
  Truck,
  MapPin,
  MessageSquare,
  Star,
  ShieldCheck,
  CreditCard,
  Upload,
  FileCheck,
  Receipt,
  Check,
  Navigation,
  AlertCircle
} from 'lucide-react';

interface OrderManagementProps {
  initialSelectedOrder?: Order | null;
  onContactFarmer: (farmerId: string, orderId?: string) => void;
  onOpenReviewModal: (order: Order) => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

const formatOrderDateTime = (value?: string): string => {
  if (!value) return 'Recently placed';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Recently placed';
  try {
    return parsed.toLocaleString(undefined, {
      dateStyle: 'full',
      timeStyle: 'short'
    });
  } catch {
    return parsed.toLocaleString();
  }
};

const formatOrderTime = (value?: string): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  try {
    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return parsed.toTimeString().slice(0, 5);
  }
};

export const OrderManagement: React.FC<OrderManagementProps> = ({
  initialSelectedOrder,
  onContactFarmer,
  onOpenReviewModal,
  onOpenAuth
}) => {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviewsByOrderId, setReviewsByOrderId] = useState<Record<string, Review>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialSelectedOrder?.id || null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'received' | 'packaged' | 'in_progress' | 'done'>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // POP viewer & buyer POP re-upload state
  const [viewingPopOrder, setViewingPopOrder] = useState<Order | null>(null);
  const [popRefInput, setPopRefInput] = useState<string>('');
  const [popError, setPopError] = useState<string>('');
  const [uploadingPop, setUploadingPop] = useState<boolean>(false);
  const [popUploadProgress, setPopUploadProgress] = useState<number>(0);
  const popAbortRef = useRef<AbortController | null>(null);
  const popFileInputRef = useRef<HTMLInputElement>(null);

  // Farmer pickup ready / rejection reason inputs
  const [pickupWindowInput, setPickupWindowInput] = useState<string>('');
  const [pickupInstrInput, setPickupInstrInput] = useState<string>('');
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  useEffect(() => {
    if (initialSelectedOrder?.id) {
      setSelectedOrderId(initialSelectedOrder.id);
    }
  }, [initialSelectedOrder?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);

    const mergeOrders = (incoming: Order[]) => {
      // Enforce party scoping for privacy (location & POPs visible only to buyer, seller, or admin)
      const scoped = incoming.filter(
        o => user.role === 'admin' || o.buyerId === user.id || o.farmerId === user.id
      );
      setOrders(prev => {
        const map = new Map<string, Order>();
        prev.forEach(o => map.set(o.id, o));
        scoped.forEach(o => map.set(o.id, o));
        const sorted = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return sorted;
      });
    };

    api
      .getOrders({ userId: user.id, role: user.role })
      .then(data => {
        if (!mounted) return;
        mergeOrders(data);
      })
      .catch(err => console.error('Failed to load orders:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const unsub = subscribeToFirebaseOrders(
      { userId: user.id, role: user.role },
      (fbOrders) => {
        if (!mounted) return;
        mergeOrders(fbOrders);
        setLoading(false);
      },
      () => {
        if (mounted) setLoading(false);
      }
    );

    const mergeReviews = (list: Review[]) => {
      setReviewsByOrderId(prev => {
        const next = { ...prev };
        for (const rev of list) {
          if (rev.orderId) next[rev.orderId] = rev;
        }
        return next;
      });
    };

    const reviewFilter = isSellerRole(user.role)
      ? { farmerId: user.id }
      : user.role === 'admin'
      ? {}
      : { buyerId: user.id };

    api
      .getReviews(
        isSellerRole(user.role) ? user.id : undefined,
        undefined,
        user.role === 'buyer' ? user.id : undefined
      )
      .then(list => {
        if (mounted && Array.isArray(list)) mergeReviews(list);
      })
      .catch(() => {});

    const unsubReviews = subscribeToFirebaseReviews(reviewFilter, (fbReviews) => {
      if (mounted) mergeReviews(fbReviews);
    });

    return () => {
      mounted = false;
      unsub();
      unsubReviews();
    };
  }, [user?.id, user?.role, authLoading]);

  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'all') return true;
    const canonical = normalizeOrderStatus(order.status, order.deliveryMethod);
    if (statusFilter === 'received') return canonical === 'received';
    if (statusFilter === 'packaged') return canonical === 'packaged';
    if (statusFilter === 'in_progress') return canonical === 'delivering' || canonical === 'ready_for_pickup';
    if (statusFilter === 'done') return canonical === 'done';
    return true;
  });

  const selectedOrder =
    filteredOrders.find(o => o.id === selectedOrderId) ||
    orders.find(o => o.id === selectedOrderId) ||
    filteredOrders[0] ||
    null;

  useEffect(() => {
    if (selectedOrder) {
      setPickupWindowInput(selectedOrder.pickupTimeWindow || '');
      setPickupInstrInput(selectedOrder.pickupInstructions || selectedOrder.pickupLocation?.instructions || '');
      setPopRefInput(selectedOrder.paymentReference || '');
      setPopError('');
    }
  }, [selectedOrder?.id]);

  const handleUpdateOrderStage = async (order: Order, nextStatus: OrderStatus, note?: string) => {
    setUpdatingId(order.id);
    try {
      const pWin = pickupWindowInput.trim() || order.pickupTimeWindow;
      const pInstr = pickupInstrInput.trim() || order.pickupInstructions;
      await api.updateOrderStatus(order.id, nextStatus, note, pWin, pInstr).catch(() => null);
      await updateFirebaseOrderStatus(order.id, nextStatus, order, note, pWin, pInstr);

      const label = getOrderStatusMeta(nextStatus, order.deliveryMethod).label;
      await createFirebaseNotification({
        userId: order.buyerId,
        title: `Order ${order.orderNumber} — ${label}`,
        message: `Your order with ${order.farmName} is now ${label}${pWin && nextStatus === 'ready_for_pickup' ? ` (${pWin})` : ''}.`,
        type: 'order',
        link: 'orders',
        metadata: { orderId: order.id, status: nextStatus }
      });

      const now = new Date().toISOString();
      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? {
                ...o,
                status: nextStatus,
                pickupTimeWindow: pWin,
                pickupInstructions: pInstr,
                updatedAt: now,
                statusHistory: [
                  ...(o.statusHistory || []),
                  { status: nextStatus, timestamp: now, note: note || `Updated to ${label}` }
                ]
              }
            : o
        )
      );
      showToast(`Order ${order.orderNumber} updated to ${label}.`);
    } catch (err) {
      console.error('Order status update failed:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleVerifyPayment = async (order: Order, paymentStatus: PaymentStatus) => {
    setUpdatingId(order.id);
    try {
      const now = new Date().toISOString();
      const reason = paymentStatus === 'rejected' ? rejectReasonInput.trim() || 'Proof of payment could not be verified' : '';
      await api.updateOrderPaymentStatus(order.id, paymentStatus, reason).catch(() => null);
      await updateFirebaseOrderPayment(
        order.id,
        {
          paymentStatus,
          paymentRejectionReason: reason,
          paymentVerifiedAt: paymentStatus === 'paid' ? now : ''
        },
        order
      );

      await createFirebaseNotification({
        userId: order.buyerId,
        title: paymentStatus === 'paid' ? `Payment Verified — ${order.orderNumber}` : `POP Rejected — ${order.orderNumber}`,
        message:
          paymentStatus === 'paid'
            ? `${order.farmName} confirmed your payment of $${order.totalAmount.toFixed(2)}.`
            : `Your payment proof for ${order.orderNumber} was rejected: ${reason}`,
        type: 'order',
        link: 'orders',
        metadata: { orderId: order.id, paymentStatus }
      });

      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? {
                ...o,
                paymentStatus,
                paymentVerifiedAt: paymentStatus === 'paid' ? now : o.paymentVerifiedAt,
                paymentRejectionReason: reason || undefined
              }
            : o
        )
      );
      if (viewingPopOrder?.id === order.id) {
        setViewingPopOrder(prev => prev ? { ...prev, paymentStatus } : null);
      }
      showToast(paymentStatus === 'paid' ? 'Payment confirmed as Paid.' : 'Payment marked Rejected.');
    } catch (err) {
      console.error('Payment status update failed:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancelBuyerPopUpload = () => {
    popAbortRef.current?.abort();
  };

  const handleBuyerUploadPop = async (order: Order, file: File) => {
    const controller = new AbortController();
    popAbortRef.current = controller;
    setUploadingPop(true);
    setPopUploadProgress(5);
    setPopError('');
    try {
      const uploadRes = await uploadMediaAsset({
        file,
        folder: 'pop',
        userId: user?.id || order.buyerId,
        allowVideo: false,
        allowPdf: true,
        compressImages: true,
        maxDimension: 1000,
        onProgress: (pct) => setPopUploadProgress(pct),
        signal: controller.signal
      });

      if (uploadRes.canceled) {
        setPopError('Proof of payment upload cancelled.');
        return;
      }

      if (!uploadRes.ok || !uploadRes.url) {
        setPopError(uploadRes.errorMessage || 'Failed to upload proof of payment.');
        return;
      }

      const uploadedUrl = uploadRes.url;
      const uploadedName = uploadRes.fileName || file.name;
      const now = new Date().toISOString();
      const refCode = popRefInput.trim() || order.paymentReference || `POP-${Date.now().toString().slice(-6)}`;

      await api
        .submitOrderPop(order.id, {
          proofOfPaymentUrl: uploadedUrl,
          proofOfPaymentFileName: uploadedName,
          paymentReference: refCode
        })
        .catch(() => null);

      await updateFirebaseOrderPayment(
        order.id,
        {
          paymentStatus: 'pending_verification',
          proofOfPaymentUrl: uploadedUrl,
          proofOfPaymentFileName: uploadedName,
          paymentReference: refCode,
          paymentSubmittedAt: now,
          paymentRejectionReason: ''
        },
        order
      );

      await createFirebaseNotification({
        userId: order.farmerId,
        title: `Proof of Payment Uploaded — ${order.orderNumber}`,
        message: `${order.buyerName} uploaded a POP (${uploadedName}) for review.`,
        type: 'order',
        link: 'orders',
        metadata: { orderId: order.id, paymentStatus: 'pending_verification' }
      });

      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? {
                ...o,
                paymentStatus: 'pending_verification',
                proofOfPaymentUrl: uploadedUrl,
                proofOfPaymentFileName: uploadedName,
                paymentReference: refCode,
                paymentSubmittedAt: now,
                paymentRejectionReason: undefined
              }
            : o
        )
      );
      showToast('Proof of payment uploaded — status is now Pending Verification.');
    } catch (err: any) {
      setPopError(err?.message || 'Failed to upload proof of payment.');
    } finally {
      if (popAbortRef.current === controller) {
        popAbortRef.current = null;
      }
      setUploadingPop(false);
      setPopUploadProgress(0);
    }
  };

  const isSeller = isSellerRole(user?.role);

  return (
    <div className="space-y-6 pb-16">
      {actionToast && (
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 md:bottom-6 z-50 lg-glass-dark text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-[#A8E635]/40 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#A8E635] shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <LiquidGlassCard variant="mint" className="p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[#062B1F] tracking-tight">
              {isSeller ? 'Farmer Orders & Fulfillment' : 'My Orders & Tracking'}
            </h1>
            <p className="text-xs text-[#0B3D2B]/75 mt-1">
              {isSeller
                ? 'Verify payments, review delivery/pickup details, and update order tracking stages.'
                : 'Track your order progress from Received to Done and manage your payment records.'}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto bg-white/65 backdrop-blur-md p-1.5 rounded-2xl border border-white/80 shadow-xs">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'received', label: 'Received' },
              { id: 'packaged', label: 'Packaged' },
              { id: 'in_progress', label: 'Delivering / Ready' },
              { id: 'done', label: 'Done' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#062B1F] text-[#A8E635] shadow-sm'
                    : 'text-[#0B3D2B]/80 hover:bg-white/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </LiquidGlassCard>

      {!authLoading && !user ? (
        <LiquidGlassCard variant="light" className="p-10 sm:p-12 text-center space-y-4">
          <FileText className="w-12 h-12 text-[#145A38] mx-auto" />
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-[#062B1F] text-lg">Sign in to view your orders</h3>
            <p className="text-xs text-[#0B3D2B]/70 max-w-md mx-auto">
              Access your live order progress, delivery tracking, farm pickup instructions, and uploaded payment records.
            </p>
          </div>
          {onOpenAuth && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <LiquidGlassButton type="button" variant="lime" size="sm" onClick={() => onOpenAuth('login')}>
                Sign In
              </LiquidGlassButton>
              <LiquidGlassButton type="button" variant="light" size="sm" onClick={() => onOpenAuth('register')}>
                Create Account
              </LiquidGlassButton>
            </div>
          )}
        </LiquidGlassCard>
      ) : loading && orders.length === 0 ? (
        <LiquidGlassCard variant="light" className="py-16 text-center text-xs text-[#0B3D2B]/65">
          Loading order details...
        </LiquidGlassCard>
      ) : filteredOrders.length === 0 ? (
        <LiquidGlassCard variant="light" className="p-12 text-center space-y-3">
          <FileText className="w-12 h-12 text-[#145A38]/40 mx-auto" />
          <h3 className="font-bold text-[#062B1F] text-base">No orders found</h3>
          <p className="text-xs text-[#0B3D2B]/70 max-w-sm mx-auto">
            {isSeller
              ? 'You have not received any orders matching this filter yet.'
              : 'Browse fresh farm produce and fodder on the marketplace to place your order.'}
          </p>
        </LiquidGlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Order List Sidebar */}
          <LiquidGlassCard variant="light" className="p-4 sm:p-5 space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#0B3D2B]/65 px-1">
              Orders ({filteredOrders.length})
            </h2>
            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
              {filteredOrders.map(order => {
                const isSelected = selectedOrder?.id === order.id;
                const sMeta = getOrderStatusMeta(order.status, order.deliveryMethod);
                const pMeta = getPaymentStatusMeta(order.paymentStatus, order.paymentMethod);

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-[#DFF4E4]/90 border-[#145A38] shadow-md ring-1 ring-[#145A38]/40'
                        : 'bg-white/75 border-white/80 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-[#062B1F] text-sm">{order.orderNumber}</span>
                      <span className="font-black text-[#145A38] text-sm tabular-nums">
                        ${Number(order.totalAmount || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="text-xs text-[#0B3D2B]/75 truncate">
                      {isSeller ? `Buyer: ${order.buyerName}` : `Seller: ${order.farmName}`}
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${sMeta.badgeClass}`}>
                        {sMeta.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pMeta.badgeClass}`}>
                        {pMeta.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </LiquidGlassCard>

          {/* Detailed Order Timeline & Spec View */}
          {selectedOrder && (() => {
            const statusMeta = getOrderStatusMeta(selectedOrder.status, selectedOrder.deliveryMethod);
            const canonical = statusMeta.canonical;
            const stages = getOrderStages(selectedOrder.deliveryMethod);
            const currentIdx = stages.findIndex(s => s.key === canonical);
            const payMeta = getPaymentStatusMeta(selectedOrder.paymentStatus, selectedOrder.paymentMethod);
            const isBuyerOwner = user?.id === selectedOrder.buyerId;
            const isFarmerOwner = user?.id === selectedOrder.farmerId;
            const hasGps =
              selectedOrder.deliveryLocation?.lat !== undefined &&
              selectedOrder.deliveryLocation?.lng !== undefined;

            return (
              <LiquidGlassCard variant="light" className="lg:col-span-2 p-4 sm:p-8 space-y-5 sm:space-y-6">
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#062B1F]/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-extrabold text-[#062B1F]">{selectedOrder.orderNumber}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.badgeClass}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="text-xs text-[#0B3D2B]/65 mt-1">
                      Placed on {formatOrderDateTime(selectedOrder.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <LiquidGlassButton
                      type="button"
                      variant="light"
                      size="xs"
                      onClick={() =>
                        onContactFarmer(
                          isFarmerOwner ? selectedOrder.buyerId : selectedOrder.farmerId,
                          selectedOrder.id
                        )
                      }
                    >
                      <MessageSquare className="w-4 h-4 text-[#145A38]" />
                      <span>Chat with {isFarmerOwner ? 'Buyer' : 'Seller'}</span>
                    </LiquidGlassButton>

                    {isBuyerOwner &&
                      canonical === 'done' &&
                      !selectedOrder.isReviewed &&
                      !reviewsByOrderId[selectedOrder.id] && (
                        <LiquidGlassButton
                          type="button"
                          variant="lime"
                          size="xs"
                          onClick={() => onOpenReviewModal(selectedOrder)}
                        >
                          <Star className="w-4 h-4 fill-[#062B1F]" />
                          <span>Rate Your Order</span>
                        </LiquidGlassButton>
                      )}
                  </div>
                </div>

                {/* Visual Order Progress Tracker */}
                <div className="bg-white/65 backdrop-blur-md rounded-2xl p-3.5 sm:p-5 border border-white/80 space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-extrabold text-[#062B1F] text-xs uppercase tracking-wider">
                      Order Progress Tracking
                    </h3>
                    <span className="text-[11px] font-semibold text-[#145A38]">
                      {selectedOrder.deliveryMethod === 'pickup' ? 'Farm Pickup Flow' : 'Home Delivery Flow'}
                    </span>
                  </div>

                  <div className="relative flex items-start justify-between max-w-xl mx-auto py-2">
                    <div className="absolute top-[22px] sm:top-[26px] left-4 right-4 h-1 bg-[#062B1F]/10 z-0 rounded-full" />
                    {stages.map((step, idx) => {
                      const isStepDone = currentIdx >= idx && canonical !== 'cancelled';
                      const isCurrent = currentIdx === idx;
                      return (
                        <div key={step.key} className="relative z-10 flex-1 flex flex-col items-center text-center px-0.5 sm:px-1 min-w-0">
                          <div
                            className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold transition-all ${
                              isStepDone
                                ? 'bg-linear-to-br from-[#A8E635] to-[#145A38] text-[#062B1F] ring-2 sm:ring-4 ring-[#DFF4E4] shadow-md'
                                : 'bg-white/85 border border-[#062B1F]/15 text-[#0B3D2B]/50'
                            }`}
                          >
                            {isStepDone ? <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#062B1F]" /> : idx + 1}
                          </div>
                          <span
                            className={`text-[9px] sm:text-[11px] leading-tight mt-1.5 font-semibold break-words ${
                              isCurrent ? 'text-[#062B1F] font-extrabold' : 'text-[#0B3D2B]/65'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Farmer Stage Controls */}
                  {isFarmerOwner && canonical !== 'done' && canonical !== 'cancelled' && (
                    <div className="pt-3 border-t border-[#062B1F]/10 space-y-3">
                      {selectedOrder.deliveryMethod === 'pickup' && canonical === 'packaged' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={pickupWindowInput}
                            onChange={e => setPickupWindowInput(e.target.value)}
                            placeholder="Collection time window (e.g. Today 2pm - 5pm)"
                            className="px-3 py-2 bg-white/90 border border-[#062B1F]/15 rounded-xl text-xs text-[#062B1F]"
                          />
                          <input
                            type="text"
                            value={pickupInstrInput}
                            onChange={e => setPickupInstrInput(e.target.value)}
                            placeholder="Pickup gate / collection instructions"
                            className="px-3 py-2 bg-white/90 border border-[#062B1F]/15 rounded-xl text-xs text-[#062B1F]"
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#062B1F] mr-1">Update Stage:</span>
                        {canonical === 'received' && (
                          <LiquidGlassButton
                            type="button"
                            variant="emerald"
                            size="xs"
                            disabled={updatingId === selectedOrder.id}
                            onClick={() =>
                              handleUpdateOrderStage(selectedOrder, 'packaged', 'Prepared and packaged by farmer')
                            }
                          >
                            Mark Packaged
                          </LiquidGlassButton>
                        )}
                        {canonical === 'packaged' && (
                          <LiquidGlassButton
                            type="button"
                            variant="lime"
                            size="xs"
                            disabled={updatingId === selectedOrder.id}
                            onClick={() =>
                              handleUpdateOrderStage(
                                selectedOrder,
                                selectedOrder.deliveryMethod === 'pickup' ? 'ready_for_pickup' : 'delivering',
                                selectedOrder.deliveryMethod === 'pickup'
                                  ? `Ready for pickup${pickupWindowInput ? ` (${pickupWindowInput})` : ''}`
                                  : 'Out for delivery to buyer address'
                              )
                            }
                          >
                            {selectedOrder.deliveryMethod === 'pickup'
                              ? 'Mark Ready for Pickup'
                              : 'Mark Delivering'}
                          </LiquidGlassButton>
                        )}
                        {(canonical === 'delivering' || canonical === 'ready_for_pickup') && (
                          <LiquidGlassButton
                            type="button"
                            variant="emerald"
                            size="xs"
                            disabled={updatingId === selectedOrder.id}
                            onClick={() =>
                              handleUpdateOrderStage(
                                selectedOrder,
                                'done',
                                selectedOrder.deliveryMethod === 'pickup'
                                  ? 'Collected at farm'
                                  : 'Delivered to buyer'
                              )
                            }
                          >
                            {selectedOrder.deliveryMethod === 'pickup'
                              ? 'Mark Collected (Done)'
                              : 'Mark Delivered (Done)'}
                          </LiquidGlassButton>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Timeline History Log */}
                  <div className="space-y-1.5 pt-2 border-t border-[#062B1F]/10">
                    {(selectedOrder.statusHistory || []).map((hist, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-[#0B3D2B]/75">
                        <span className="font-medium capitalize text-[#062B1F]">
                          • {hist.note || String(hist.status || '').replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-[#0B3D2B]/55 tabular-nums">
                          {formatOrderTime(hist.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment & Proof of Payment Card */}
                <div className="p-5 rounded-2xl bg-white/65 backdrop-blur-md border border-white/80 space-y-3 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-extrabold text-[#062B1F] flex items-center gap-1.5 text-sm">
                      <CreditCard className="w-4 h-4 text-[#145A38]" />
                      Payment &amp; Proof of Payment (POP)
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${payMeta.badgeClass}`}>
                      {payMeta.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[#062B1F] tabular-nums">
                    <div>
                      <span className="text-[#0B3D2B]/60 block text-[11px]">Payment Method</span>
                      <strong>{getPaymentMethodLabel(selectedOrder.paymentMethod)}</strong>
                    </div>
                    <div>
                      <span className="text-[#0B3D2B]/60 block text-[11px]">Order Total</span>
                      <strong>${Number(selectedOrder.totalAmount || 0).toFixed(2)}</strong>
                      {selectedOrder.deliveryFee !== undefined && (
                        <span className="text-[#0B3D2B]/65 text-[11px]">
                          {' '}
                          (incl. ${Number(selectedOrder.deliveryFee || 0).toFixed(2)} delivery)
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[#0B3D2B]/60 block text-[11px]">Reference</span>
                      <span className="font-mono font-semibold">
                        {selectedOrder.paymentReference || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#0B3D2B]/70">{payMeta.description}</div>

                  {selectedOrder.paymentRejectionReason && payMeta.normalized === 'rejected' && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Rejection Reason: {selectedOrder.paymentRejectionReason}</span>
                    </div>
                  )}

                  {popError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 font-semibold">
                      {popError}
                    </div>
                  )}

                  {/* POP Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {selectedOrder.proofOfPaymentUrl && (
                      <LiquidGlassButton
                        type="button"
                        variant="light"
                        size="xs"
                        onClick={() => setViewingPopOrder(selectedOrder)}
                      >
                        <FileCheck className="w-4 h-4 text-[#145A38]" />
                        <span>View Uploaded POP ({selectedOrder.proofOfPaymentFileName || 'Receipt'})</span>
                      </LiquidGlassButton>
                    )}

                    {/* Buyer POP upload / re-upload */}
                    {isBuyerOwner &&
                      selectedOrder.paymentMethod &&
                      selectedOrder.paymentMethod !== 'cash_on_delivery' &&
                      payMeta.normalized !== 'paid' && (
                        <div className="flex flex-wrap items-center gap-2 w-full pt-2 border-t border-[#062B1F]/10">
                          <input
                            type="text"
                            value={popRefInput}
                            onChange={e => setPopRefInput(e.target.value)}
                            placeholder="Transaction reference (optional)"
                            className="px-3 py-2 bg-white/90 border border-[#062B1F]/15 rounded-xl text-xs font-mono text-[#062B1F]"
                          />
                          <input
                            ref={popFileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (file) handleBuyerUploadPop(selectedOrder, file);
                            }}
                          />
                          <LiquidGlassButton
                            type="button"
                            variant="emerald"
                            size="xs"
                            disabled={uploadingPop}
                            onClick={() => popFileInputRef.current?.click()}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {uploadingPop
                                ? `Uploading POP (${popUploadProgress}%)...`
                                : selectedOrder.proofOfPaymentUrl
                                ? 'Re-upload Proof of Payment'
                                : 'Upload Proof of Payment (Image/PDF)'}
                            </span>
                          </LiquidGlassButton>
                          {uploadingPop && (
                            <LiquidGlassButton
                              type="button"
                              variant="danger"
                              size="xs"
                              onClick={handleCancelBuyerPopUpload}
                            >
                              Cancel
                            </LiquidGlassButton>
                          )}
                        </div>
                      )}

                    {/* Farmer POP Verification Controls */}
                    {isFarmerOwner && payMeta.normalized !== 'paid' && (
                      <div className="flex flex-wrap items-center gap-2 w-full pt-2 border-t border-[#062B1F]/10">
                        <LiquidGlassButton
                          type="button"
                          variant="emerald"
                          size="xs"
                          disabled={updatingId === selectedOrder.id}
                          onClick={() => handleVerifyPayment(selectedOrder, 'paid')}
                        >
                          <Check className="w-4 h-4" />
                          <span>Confirm Payment Received</span>
                        </LiquidGlassButton>

                        {payMeta.normalized === 'pending_verification' && (
                          <>
                            <input
                              type="text"
                              value={rejectReasonInput}
                              onChange={e => setRejectReasonInput(e.target.value)}
                              placeholder="Reason if rejecting..."
                              className="px-3 py-2 bg-white/90 border border-[#062B1F]/15 rounded-xl text-xs flex-1 min-w-[160px] text-[#062B1F]"
                            />
                            <LiquidGlassButton
                              type="button"
                              variant="danger"
                              size="xs"
                              disabled={updatingId === selectedOrder.id}
                              onClick={() => handleVerifyPayment(selectedOrder, 'rejected')}
                            >
                              Reject POP
                            </LiquidGlassButton>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Breakdown */}
                <div className="space-y-3">
                  <h3 className="font-extrabold text-[#062B1F] text-sm">Items Ordered</h3>
                  <div className="divide-y divide-[#062B1F]/10 border border-white/80 rounded-2xl overflow-hidden bg-white/75 backdrop-blur-md">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-white/60 transition-colors">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover bg-[#DFF4E4]"
                          />
                          <div>
                            <div className="font-bold text-[#062B1F] text-sm">{item.productName}</div>
                            <div className="text-xs text-[#0B3D2B]/70 tabular-nums">
                              {item.quantity} {item.unit} × ${Number(item.price || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-extrabold text-[#062B1F] tabular-nums">
                          ${Number(item.subtotal || 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fulfillment & Contact Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-white/65 border border-white/80 space-y-2 text-[#062B1F]">
                    <div className="font-extrabold flex items-center gap-1.5">
                      {selectedOrder.deliveryMethod === 'delivery' ? (
                        <Truck className="w-4 h-4 text-[#145A38]" />
                      ) : (
                        <MapPin className="w-4 h-4 text-[#145A38]" />
                      )}
                      {selectedOrder.deliveryMethod === 'delivery' ? 'Home Delivery Details' : 'Pickup at Farm Details'}
                    </div>
                    {selectedOrder.deliveryMethod === 'delivery' ? (
                      <>
                        <div>
                          <strong>Address:</strong>{' '}
                          {selectedOrder.deliveryLocation?.formattedAddress || selectedOrder.deliveryAddress || 'On file'}
                        </div>
                        {selectedOrder.deliveryLocation?.instructions && (
                          <div>
                            <strong>Instructions:</strong> {selectedOrder.deliveryLocation.instructions}
                          </div>
                        )}
                        {hasGps && (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center gap-1 text-[11px] font-mono text-[#0B3D2B]/70">
                              <Navigation className="w-3 h-3 text-[#145A38]" />
                              GPS: {selectedOrder.deliveryLocation!.lat!.toFixed(5)},{' '}
                              {selectedOrder.deliveryLocation!.lng!.toFixed(5)}
                            </div>
                            <iframe
                              title="Confirmed Delivery Map"
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedOrder.deliveryLocation!.lng! - 0.015},${selectedOrder.deliveryLocation!.lat! - 0.01},${selectedOrder.deliveryLocation!.lng! + 0.015},${selectedOrder.deliveryLocation!.lat! + 0.01}&layer=mapnik&marker=${selectedOrder.deliveryLocation!.lat!},${selectedOrder.deliveryLocation!.lng!}`}
                              className="w-full h-36 rounded-xl border border-[#062B1F]/15"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div>
                          <strong>Pickup Location:</strong>{' '}
                          {selectedOrder.pickupLocation?.address || selectedOrder.farmName}
                        </div>
                        <div>
                          <strong>Ready Window:</strong>{' '}
                          {selectedOrder.pickupTimeWindow || selectedOrder.pickupLocation?.readyAt || 'Confirmed when ready'}
                        </div>
                        {(selectedOrder.pickupInstructions || selectedOrder.pickupLocation?.instructions) && (
                          <div>
                            <strong>Collection Instructions:</strong>{' '}
                            {selectedOrder.pickupInstructions || selectedOrder.pickupLocation?.instructions}
                          </div>
                        )}
                      </>
                    )}
                    {selectedOrder.buyerNotes && (
                      <div className="text-[#0B3D2B]/70 italic pt-1 border-t border-[#062B1F]/10">
                        "Note: {selectedOrder.buyerNotes}"
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-white/65 border border-white/80 space-y-1.5 text-[#062B1F]">
                    <div className="font-extrabold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#145A38]" />
                      Producer &amp; Buyer Information
                    </div>
                    <div><strong>Farm:</strong> {selectedOrder.farmName}</div>
                    <div><strong>Farmer:</strong> {selectedOrder.farmerName}</div>
                    <div><strong>Buyer:</strong> {selectedOrder.buyerName} ({selectedOrder.buyerPhone})</div>
                    <div className="text-[#145A38] font-extrabold pt-1 tabular-nums">
                      Total Amount: ${Number(selectedOrder.totalAmount || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Order Rating & Review Card */}
                {canonical === 'done' && (() => {
                  const matchedReview = reviewsByOrderId[selectedOrder.id];
                  const ratingVal = matchedReview?.rating ?? selectedOrder.rating;
                  const commentText = matchedReview?.comment ?? selectedOrder.reviewComment ?? '';
                  const ratedDate = matchedReview?.createdAt ?? selectedOrder.ratedAt;
                  const hasRating = typeof ratingVal === 'number' && ratingVal >= 1;

                  if (isBuyerOwner && !hasRating) {
                    return (
                      <div className="p-4 rounded-2xl bg-[#F4D35E]/20 border border-[#F4D35E]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-bold text-[#062B1F] text-xs flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                            <span>Order Completed — Share Your Feedback</span>
                          </div>
                          <p className="text-[11px] text-[#0B3D2B]/75">
                            Let {selectedOrder.farmName} and other buyers know how your order went.
                          </p>
                        </div>
                        <LiquidGlassButton
                          type="button"
                          variant="lime"
                          size="xs"
                          onClick={() => onOpenReviewModal(selectedOrder)}
                        >
                          <Star className="w-3.5 h-3.5 fill-[#062B1F]" />
                          <span>Rate Your Order</span>
                        </LiquidGlassButton>
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 rounded-2xl bg-white/65 border border-white/80 space-y-2 text-xs text-[#062B1F]">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-bold flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                          <span>{isBuyerOwner ? 'Your Rating' : 'Buyer Rating'}</span>
                        </span>
                        {hasRating ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#F4D35E]/25 border border-[#F4D35E]/50 text-[#062B1F] font-bold text-[11px]">
                            {getRatingLabel(ratingVal!)}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-black/5 text-[#0B3D2B]/65 font-bold text-[11px]">
                            Not Yet Rated
                          </span>
                        )}
                      </div>
                      {hasRating ? (
                        <>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(st => (
                              <Star
                                key={st}
                                className={`w-4 h-4 ${
                                  st <= ratingVal! ? 'fill-amber-400 text-amber-400' : 'text-[#062B1F]/20'
                                }`}
                              />
                            ))}
                            {ratedDate && (
                              <span className="text-[11px] text-[#0B3D2B]/55 ml-2">
                                Submitted {new Date(ratedDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {commentText ? (
                            <p className="text-[#062B1F] bg-white/85 p-3 rounded-xl border border-[#062B1F]/10">
                              "{commentText}"
                            </p>
                          ) : (
                            <p className="text-[11px] text-[#0B3D2B]/55 italic">No written review provided.</p>
                          )}
                        </>
                      ) : (
                        <p className="text-[11px] text-[#0B3D2B]/65">
                          The buyer has not rated this completed order yet.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </LiquidGlassCard>
            );
          })()}
        </div>
      )}

      {/* POP Inspection Modal */}
      <LiquidGlassModal
        isOpen={Boolean(viewingPopOrder)}
        onClose={() => setViewingPopOrder(null)}
        title={viewingPopOrder ? `Proof of Payment — ${viewingPopOrder.orderNumber}` : 'Proof of Payment'}
        subtitle={viewingPopOrder?.proofOfPaymentFileName || 'Submitted payment receipt'}
        icon={<Receipt className="w-5 h-5 text-[#A8E635]" />}
        maxWidthClass="max-w-xl"
      >
        {viewingPopOrder && (
          <div className="p-6 space-y-4">
            <div className="max-h-96 overflow-auto rounded-2xl border border-[#062B1F]/15 bg-[#062B1F] flex items-center justify-center p-2">
              {viewingPopOrder.proofOfPaymentUrl?.startsWith('data:application/pdf') ? (
                <iframe
                  src={viewingPopOrder.proofOfPaymentUrl}
                  title="Proof of Payment PDF"
                  className="w-full h-80 rounded-xl bg-white"
                />
              ) : (
                <img
                  src={viewingPopOrder.proofOfPaymentUrl}
                  alt="Proof of Payment"
                  className="max-h-80 w-auto rounded-xl object-contain"
                />
              )}
            </div>
            {user?.id === viewingPopOrder.farmerId && viewingPopOrder.paymentStatus !== 'paid' && (
              <div className="flex items-center justify-end gap-2 pt-2">
                <LiquidGlassButton
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleVerifyPayment(viewingPopOrder, 'rejected')}
                >
                  Reject POP
                </LiquidGlassButton>
                <LiquidGlassButton
                  type="button"
                  variant="emerald"
                  size="sm"
                  onClick={() => handleVerifyPayment(viewingPopOrder, 'paid')}
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Paid</span>
                </LiquidGlassButton>
              </div>
            )}
          </div>
        )}
      </LiquidGlassModal>
    </div>
  );
};
