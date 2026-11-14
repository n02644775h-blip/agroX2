import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  subscribeToFirebaseOrders,
  updateFirebaseOrderStatus,
  updateFirebaseOrderPayment
} from '../services/firebaseOrders';
import { createFirebaseNotification } from '../services/firebaseNotifications';
import { compressImage } from '../utils/imageCompressor';
import {
  normalizeOrderStatus,
  getOrderStages,
  getOrderStatusMeta,
  getPaymentMethodLabel,
  getPaymentStatusMeta
} from '../utils/orderUtils';
import { Order, OrderStatus, PaymentStatus, isSellerRole } from '../types';
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
  X,
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

    return () => {
      mounted = false;
      unsub();
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

  const handleBuyerUploadPop = async (order: Order, file: File) => {
    setUploadingPop(true);
    setPopError('');
    try {
      let dataUrl = '';
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        if (file.size > 700 * 1024) {
          setPopError('PDF proof of payment must be under 700KB.');
          setUploadingPop(false);
          return;
        }
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Failed to read PDF'));
          reader.readAsDataURL(file);
        });
      } else {
        dataUrl = await compressImage(file, 1000, 1000, 0.75);
      }

      const now = new Date().toISOString();
      const refCode = popRefInput.trim() || order.paymentReference || `POP-${Date.now().toString().slice(-6)}`;

      await api
        .submitOrderPop(order.id, {
          proofOfPaymentUrl: dataUrl,
          proofOfPaymentFileName: file.name,
          paymentReference: refCode
        })
        .catch(() => null);

      await updateFirebaseOrderPayment(
        order.id,
        {
          paymentStatus: 'pending_verification',
          proofOfPaymentUrl: dataUrl,
          proofOfPaymentFileName: file.name,
          paymentReference: refCode,
          paymentSubmittedAt: now,
          paymentRejectionReason: ''
        },
        order
      );

      await createFirebaseNotification({
        userId: order.farmerId,
        title: `Proof of Payment Uploaded — ${order.orderNumber}`,
        message: `${order.buyerName} uploaded a POP (${file.name}) for review.`,
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
                proofOfPaymentUrl: dataUrl,
                proofOfPaymentFileName: file.name,
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
      setUploadingPop(false);
    }
  };

  const isSeller = isSellerRole(user?.role);

  return (
    <div className="space-y-8 pb-16">
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-stone-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            {isSeller ? 'Farmer Orders & Fulfillment' : 'My Orders & Tracking'}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {isSeller
              ? 'Verify payments, review delivery/pickup details, and update order tracking stages.'
              : 'Track your order progress from Received to Done and manage your payment records.'}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-1.5 rounded-2xl border border-stone-200 shadow-xs">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'received', label: 'Received' },
            { id: 'packaged', label: 'Packaged' },
            { id: 'in_progress', label: 'Delivering / Ready' },
            { id: 'done', label: 'Done' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!authLoading && !user ? (
        <div className="bg-white rounded-3xl p-10 sm:p-12 text-center border border-stone-200 space-y-4 shadow-xs">
          <FileText className="w-12 h-12 text-emerald-600 mx-auto" />
          <div className="space-y-1.5">
            <h3 className="font-bold text-stone-900 text-lg">Sign in to view your orders</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Access your live order progress, delivery tracking, farm pickup instructions, and uploaded payment records.
            </p>
          </div>
          {onOpenAuth && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="px-5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      ) : loading && orders.length === 0 ? (
        <div className="py-16 text-center text-xs text-stone-400">Loading order details...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
          <FileText className="w-12 h-12 text-stone-400 mx-auto" />
          <h3 className="font-bold text-stone-900 text-base">No orders found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {isSeller
              ? 'You have not received any orders matching this filter yet.'
              : 'Browse fresh farm produce and fodder on the marketplace to place your order.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order List Sidebar */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Orders ({filteredOrders.length})
            </h2>
            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
              {filteredOrders.map(order => {
                const isSelected = selectedOrder?.id === order.id;
                const sMeta = getOrderStatusMeta(order.status, order.deliveryMethod);
                const pMeta = getPaymentStatusMeta(order.paymentStatus, order.paymentMethod);

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">{order.orderNumber}</span>
                      <span className="font-black text-emerald-800 text-sm tabular-nums">
                        ${Number(order.totalAmount || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 truncate">
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
                  </div>
                );
              })}
            </div>
          </div>

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
              <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-extrabold text-stone-900">{selectedOrder.orderNumber}</h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.badgeClass}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1">
                      Placed on {formatOrderDateTime(selectedOrder.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() =>
                        onContactFarmer(
                          isFarmerOwner ? selectedOrder.buyerId : selectedOrder.farmerId,
                          selectedOrder.id
                        )
                      }
                      className="px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      Chat with {isFarmerOwner ? 'Buyer' : 'Seller'}
                    </button>

                    {isBuyerOwner && canonical === 'done' && !selectedOrder.isReviewed && (
                      <button
                        onClick={() => onOpenReviewModal(selectedOrder)}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Star className="w-4 h-4 fill-stone-900" />
                        Rate &amp; Review
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Order Progress Tracker (Received -> Packaged -> Delivering / Ready for Pickup -> Done) */}
                <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                      Order Progress Tracking
                    </h3>
                    <span className="text-[11px] font-semibold text-stone-500">
                      {selectedOrder.deliveryMethod === 'pickup' ? 'Farm Pickup Flow' : 'Home Delivery Flow'}
                    </span>
                  </div>

                  <div className="relative flex items-center justify-between max-w-xl mx-auto py-2">
                    <div className="absolute top-1/2 left-4 right-4 h-1 bg-stone-200 -translate-y-1/2 z-0" />
                    {stages.map((step, idx) => {
                      const isStepDone = currentIdx >= idx && canonical !== 'cancelled';
                      const isCurrent = currentIdx === idx;
                      return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center text-center px-1">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isStepDone
                                ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                                : 'bg-stone-200 text-stone-500'
                            }`}
                          >
                            {isStepDone ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                          </div>
                          <span
                            className={`text-[11px] mt-1.5 font-semibold ${
                              isCurrent ? 'text-emerald-800 font-bold' : 'text-stone-500'
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
                    <div className="pt-3 border-t border-stone-200/80 space-y-3">
                      {selectedOrder.deliveryMethod === 'pickup' && canonical === 'packaged' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={pickupWindowInput}
                            onChange={e => setPickupWindowInput(e.target.value)}
                            placeholder="Collection time window (e.g. Today 2pm - 5pm)"
                            className="px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs"
                          />
                          <input
                            type="text"
                            value={pickupInstrInput}
                            onChange={e => setPickupInstrInput(e.target.value)}
                            placeholder="Pickup gate / collection instructions"
                            className="px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs"
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-stone-700 mr-1">Update Stage:</span>
                        {canonical === 'received' && (
                          <button
                            disabled={updatingId === selectedOrder.id}
                            onClick={() =>
                              handleUpdateOrderStage(selectedOrder, 'packaged', 'Prepared and packaged by farmer')
                            }
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Mark Packaged
                          </button>
                        )}
                        {canonical === 'packaged' && (
                          <button
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
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                          >
                            {selectedOrder.deliveryMethod === 'pickup'
                              ? 'Mark Ready for Pickup'
                              : 'Mark Delivering'}
                          </button>
                        )}
                        {(canonical === 'delivering' || canonical === 'ready_for_pickup') && (
                          <button
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
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                          >
                            {selectedOrder.deliveryMethod === 'pickup'
                              ? 'Mark Collected (Done)'
                              : 'Mark Delivered (Done)'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Timeline History Log */}
                  <div className="space-y-1.5 pt-2 border-t border-stone-200/60">
                    {(selectedOrder.statusHistory || []).map((hist, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-stone-600">
                        <span className="font-medium capitalize text-stone-800">
                          • {hist.note || String(hist.status || '').replace(/_/g, ' ')}
                        </span>
                        <span className="text-[11px] text-stone-400 tabular-nums">
                          {formatOrderTime(hist.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment & Proof of Payment Card */}
                <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5 text-sm">
                      <CreditCard className="w-4 h-4 text-emerald-700" />
                      Payment &amp; Proof of Payment (POP)
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${payMeta.badgeClass}`}>
                      {payMeta.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-stone-700 tabular-nums">
                    <div>
                      <span className="text-stone-400 block text-[11px]">Payment Method</span>
                      <strong>{getPaymentMethodLabel(selectedOrder.paymentMethod)}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[11px]">Order Total</span>
                      <strong>${Number(selectedOrder.totalAmount || 0).toFixed(2)}</strong>
                      {selectedOrder.deliveryFee !== undefined && (
                        <span className="text-stone-500 text-[11px]">
                          {' '}
                          (incl. ${Number(selectedOrder.deliveryFee || 0).toFixed(2)} delivery)
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[11px]">Reference</span>
                      <span className="font-mono font-semibold">
                        {selectedOrder.paymentReference || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-500">{payMeta.description}</div>

                  {selectedOrder.paymentRejectionReason && payMeta.normalized === 'rejected' && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Rejection Reason: {selectedOrder.paymentRejectionReason}</span>
                    </div>
                  )}

                  {popError && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold">
                      {popError}
                    </div>
                  )}

                  {/* POP Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {selectedOrder.proofOfPaymentUrl && (
                      <button
                        type="button"
                        onClick={() => setViewingPopOrder(selectedOrder)}
                        className="px-3.5 py-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileCheck className="w-4 h-4 text-emerald-700" />
                        View Uploaded POP ({selectedOrder.proofOfPaymentFileName || 'Receipt'})
                      </button>
                    )}

                    {/* Buyer POP upload / re-upload when electronic payment is awaiting or rejected */}
                    {isBuyerOwner &&
                      selectedOrder.paymentMethod &&
                      selectedOrder.paymentMethod !== 'cash_on_delivery' &&
                      payMeta.normalized !== 'paid' && (
                        <div className="flex flex-wrap items-center gap-2 w-full pt-2 border-t border-stone-200">
                          <input
                            type="text"
                            value={popRefInput}
                            onChange={e => setPopRefInput(e.target.value)}
                            placeholder="Transaction reference (optional)"
                            className="px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-mono"
                          />
                          <input
                            ref={popFileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleBuyerUploadPop(selectedOrder, file);
                            }}
                          />
                          <button
                            type="button"
                            disabled={uploadingPop}
                            onClick={() => popFileInputRef.current?.click()}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {uploadingPop
                              ? 'Uploading POP...'
                              : selectedOrder.proofOfPaymentUrl
                              ? 'Re-upload Proof of Payment'
                              : 'Upload Proof of Payment (Image/PDF)'}
                          </button>
                        </div>
                      )}

                    {/* Farmer POP Verification Controls */}
                    {isFarmerOwner && payMeta.normalized !== 'paid' && (
                      <div className="flex flex-wrap items-center gap-2 w-full pt-2 border-t border-stone-200">
                        <button
                          type="button"
                          disabled={updatingId === selectedOrder.id}
                          onClick={() => handleVerifyPayment(selectedOrder, 'paid')}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          Confirm Payment Received
                        </button>

                        {payMeta.normalized === 'pending_verification' && (
                          <>
                            <input
                              type="text"
                              value={rejectReasonInput}
                              onChange={e => setRejectReasonInput(e.target.value)}
                              placeholder="Reason if rejecting..."
                              className="px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs flex-1 min-w-[160px]"
                            />
                            <button
                              type="button"
                              disabled={updatingId === selectedOrder.id}
                              onClick={() => handleVerifyPayment(selectedOrder, 'rejected')}
                              className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl font-bold text-xs cursor-pointer"
                            >
                              Reject POP
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Breakdown */}
                <div className="space-y-3">
                  <h3 className="font-bold text-stone-900 text-sm">Items Ordered</h3>
                  <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
                    {(selectedOrder.items || []).map((item, idx) => (
                      <div key={idx} className="p-3.5 flex items-center justify-between bg-white hover:bg-stone-50/50">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.productImage}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover bg-stone-100"
                          />
                          <div>
                            <div className="font-bold text-stone-900 text-sm">{item.productName}</div>
                            <div className="text-xs text-stone-500 tabular-nums">
                              {item.quantity} {item.unit} × ${Number(item.price || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-stone-900 tabular-nums">
                          ${Number(item.subtotal || 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fulfillment & Contact Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      {selectedOrder.deliveryMethod === 'delivery' ? (
                        <Truck className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <MapPin className="w-4 h-4 text-emerald-600" />
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
                            <div className="flex items-center gap-1 text-[11px] font-mono text-stone-500">
                              <Navigation className="w-3 h-3 text-emerald-700" />
                              GPS: {selectedOrder.deliveryLocation!.lat!.toFixed(5)},{' '}
                              {selectedOrder.deliveryLocation!.lng!.toFixed(5)}
                            </div>
                            <iframe
                              title="Confirmed Delivery Map"
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedOrder.deliveryLocation!.lng! - 0.015},${selectedOrder.deliveryLocation!.lat! - 0.01},${selectedOrder.deliveryLocation!.lng! + 0.015},${selectedOrder.deliveryLocation!.lat! + 0.01}&layer=mapnik&marker=${selectedOrder.deliveryLocation!.lat!},${selectedOrder.deliveryLocation!.lng!}`}
                              className="w-full h-36 rounded-xl border border-stone-300"
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
                      <div className="text-stone-500 italic pt-1 border-t border-stone-200/70">
                        "Note: {selectedOrder.buyerNotes}"
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Producer &amp; Buyer Information
                    </div>
                    <div><strong>Farm:</strong> {selectedOrder.farmName}</div>
                    <div><strong>Farmer:</strong> {selectedOrder.farmerName}</div>
                    <div><strong>Buyer:</strong> {selectedOrder.buyerName} ({selectedOrder.buyerPhone})</div>
                    <div className="text-emerald-800 font-bold pt-1 tabular-nums">
                      Total Amount: ${Number(selectedOrder.totalAmount || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* POP Inspection Modal */}
      {viewingPopOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewingPopOrder(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-stone-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-stone-900 text-base">
                  Proof of Payment — {viewingPopOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setViewingPopOrder(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-auto rounded-2xl border border-stone-200 bg-stone-900 flex items-center justify-center p-2">
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
                <button
                  onClick={() => handleVerifyPayment(viewingPopOrder, 'rejected')}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Reject POP
                </button>
                <button
                  onClick={() => handleVerifyPayment(viewingPopOrder, 'paid')}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Confirm Paid
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
