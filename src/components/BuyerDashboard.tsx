import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { subscribeToFirebaseOrders } from '../services/firebaseOrders';
import { subscribeToFirebaseReviews, getRatingLabel } from '../services/firebaseReviews';
import {
  normalizeOrderStatus,
  getOrderStages,
  getOrderStatusMeta,
  getPaymentMethodLabel,
  getPaymentStatusMeta
} from '../utils/orderUtils';
import { Product, Order, BuyerRequest, Review } from '../types';
import { ProductCard } from './ProductCard';
import { BuyerRequestsPanel } from './BuyerRequestsPanel';
import {
  Heart,
  MessageSquare,
  Clock,
  ChevronRight,
  Sparkles,
  MapPin,
  Truck,
  CheckCircle,
  CreditCard,
  FileCheck,
  Receipt,
  X,
  Star,
  Settings
} from 'lucide-react';

interface BuyerDashboardProps {
  onNavigate: (view: string, data?: any) => void;
  onSelectProduct: (product: Product) => void;
  onOpenMessagesForRequest?: (request: BuyerRequest) => void;
  onOpenReviewModal?: (order: Order) => void;
  onOpenSettings?: () => void;
}

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({
  onNavigate,
  onSelectProduct,
  onOpenMessagesForRequest,
  onOpenReviewModal,
  onOpenSettings
}) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviewsByOrderId, setReviewsByOrderId] = useState<Record<string, Review>>({});
  const [ordersTab, setOrdersTab] = useState<'active' | 'history' | 'all'>('active');
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [viewingPopOrder, setViewingPopOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const loadBuyerData = async () => {
      setLoading(true);
      try {
        const [ordersData, favsData, recsData] = await Promise.all([
          api.getOrders({ userId: user.id, role: 'buyer' }).catch(() => []),
          api.getFavorites(user.id).catch(() => []),
          api.getProducts({ sortBy: 'popular' }).catch(() => [])
        ]);
        if (!active) return;
        setOrders(prev => {
          const map = new Map<string, Order>();
          prev.forEach(o => map.set(o.id, o));
          ordersData.forEach(o => map.set(o.id, o));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        setFavoriteProducts(favsData);
        setRecommended(recsData.slice(0, 4));
      } catch (err) {
        console.error('Failed to load buyer hub:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBuyerData();

    const unsubOrders = subscribeToFirebaseOrders(
      { buyerId: user.id },
      (fbOrders) => {
        setOrders(prev => {
          const map = new Map<string, Order>();
          prev.forEach(o => map.set(o.id, o));
          fbOrders.forEach(o => map.set(o.id, o));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
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

    api.getReviews(undefined, undefined, user.id).then(mergeReviews).catch(() => {});
    const unsubReviews = subscribeToFirebaseReviews({ buyerId: user.id }, mergeReviews);

    return () => {
      active = false;
      unsubOrders();
      unsubReviews();
    };
  }, [user]);

  const activeOrders = orders.filter(o => {
    const c = normalizeOrderStatus(o.status, o.deliveryMethod);
    return c !== 'done' && c !== 'cancelled';
  });
  const historyOrders = orders.filter(o => {
    const c = normalizeOrderStatus(o.status, o.deliveryMethod);
    return c === 'done' || c === 'cancelled';
  });

  const displayedOrders =
    ordersTab === 'active' ? activeOrders : ordersTab === 'history' ? historyOrders : orders;

  return (
    <div className="space-y-8 pb-16">
      {/* Welcome Banner */}
      <div className="bg-linear-to-r from-amber-700 via-amber-800 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            Buyer Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-stone-200 text-xs sm:text-sm">
            Track your orders in real time, review payment confirmations, and message local growers directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md transition-all shrink-0 flex items-center gap-2 border border-white/20 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-amber-200" />
              <span>Settings</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('messages')}
            className="px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md transition-all shrink-0 flex items-center gap-2 border border-white/20 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-amber-300" />
            <span>Community Chat &amp; Bulletins</span>
          </button>
          <button
            onClick={() => onNavigate('marketplace')}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-900/30 transition-all shrink-0 cursor-pointer"
          >
            Explore Fresh Produce
          </button>
        </div>
      </div>

      {/* My Orders Section */}
      <section id="buyer-my-orders-section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-stone-900">My Orders</h2>
            {activeOrders.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-bold tabular-nums">
                {activeOrders.length} active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white p-1 rounded-xl border border-stone-200 text-xs font-bold">
              <button
                onClick={() => setOrdersTab('active')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  ordersTab === 'active' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Active ({activeOrders.length})
              </button>
              <button
                onClick={() => setOrdersTab('history')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  ordersTab === 'history' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                History ({historyOrders.length})
              </button>
              <button
                onClick={() => setOrdersTab('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  ordersTab === 'all' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All ({orders.length})
              </button>
            </div>

            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Full Order Tracker
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading && orders.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-stone-200 text-center text-xs text-stone-400">
            Loading your orders...
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-stone-200 text-center space-y-2">
            <Clock className="w-8 h-8 text-stone-400 mx-auto" />
            <div className="font-bold text-stone-800 text-sm">
              {ordersTab === 'active' ? 'No active orders right now' : 'No orders in this list'}
            </div>
            <p className="text-xs text-stone-500">
              Browse the marketplace to place a fresh produce or fodder order.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedOrders.map(order => {
              const statusMeta = getOrderStatusMeta(order.status, order.deliveryMethod);
              const stages = getOrderStages(order.deliveryMethod);
              const currentIdx = stages.findIndex(s => s.key === statusMeta.canonical);
              const payMeta = getPaymentStatusMeta(order.paymentStatus, order.paymentMethod);

              return (
                <div
                  key={order.id}
                  className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-300 transition-all space-y-4"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-stone-900 text-sm">{order.orderNumber}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.badgeClass}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {order.farmName} ({order.farmerName}) •{' '}
                        {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div className="text-base font-black text-stone-900">${Number(order.totalAmount || 0).toFixed(2)}</div>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${payMeta.badgeClass}`}>
                        {payMeta.label}
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Indicator (4 stages) */}
                  {statusMeta.canonical !== 'cancelled' && (
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 space-y-2">
                      <div className="grid grid-cols-4 gap-1.5">
                        {stages.map((st, idx) => {
                          const completed = currentIdx >= idx;
                          const isCurrent = currentIdx === idx;
                          return (
                            <div key={st.key} className="space-y-1">
                              <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
                                <div className={`h-full transition-all ${completed ? 'w-full bg-emerald-600' : 'w-0'}`} />
                              </div>
                              <div
                                className={`text-[10px] font-bold truncate ${
                                  isCurrent ? 'text-emerald-800' : completed ? 'text-stone-700' : 'text-stone-400'
                                }`}
                              >
                                {st.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Items & Payment Method Summary */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-stone-50 pr-2 rounded-lg border border-stone-100 shrink-0">
                          <img
                            src={item.productImage}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-l-lg object-cover bg-stone-100"
                          />
                          <span className="text-[11px] font-medium text-stone-700">
                            {item.quantity}× {item.productName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery / Pickup & Payment Footer */}
                  <div className="text-[11px] text-stone-600 space-y-1 pt-2 border-t border-stone-100">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 truncate">
                        {order.deliveryMethod === 'delivery' ? (
                          <>
                            <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">
                              {order.deliveryLocation?.formattedAddress || order.deliveryAddress || 'Home Delivery'}
                            </span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">
                              Farm Pickup: {order.pickupLocation?.address || order.farmName}
                              {order.pickupTimeWindow ? ` (${order.pickupTimeWindow})` : ''}
                            </span>
                          </>
                        )}
                      </span>
                      <span className="flex items-center gap-1 text-stone-500 shrink-0">
                        <CreditCard className="w-3 h-3" />
                        {getPaymentMethodLabel(order.paymentMethod)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5">
                      {order.proofOfPaymentUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewingPopOrder(order)}
                          className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          View Uploaded POP
                        </button>
                      ) : (
                        <span className="text-stone-400">
                          {order.paymentMethod === 'cash_on_delivery' ? 'Pay on delivery / collection' : 'No POP uploaded yet'}
                        </span>
                      )}

                      <div className="flex items-center gap-3">
                        {statusMeta.canonical === 'done' && (() => {
                          const matchedReview = reviewsByOrderId[order.id];
                          const ratingVal = matchedReview?.rating ?? order.rating;
                          const commentVal = matchedReview?.comment ?? order.reviewComment;
                          const hasRated = Boolean(order.isReviewed || matchedReview || ratingVal);

                          if (hasRated && ratingVal) {
                            return (
                              <span
                                title={commentVal || getRatingLabel(ratingVal)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[10px]"
                              >
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                Your Rating: {getRatingLabel(ratingVal)}
                              </span>
                            );
                          }

                          return onOpenReviewModal ? (
                            <button
                              type="button"
                              onClick={() => onOpenReviewModal(order)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Star className="w-3 h-3 fill-stone-900" />
                              Rate Your Order
                            </button>
                          ) : null;
                        })()}

                        <button
                          type="button"
                          onClick={() => onNavigate('orders', { selectedOrder: order })}
                          className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Track &amp; Manage</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* My Requests Section */}
      {user && (
        <BuyerRequestsPanel
          user={user}
          onOpenMessages={onOpenMessagesForRequest}
        />
      )}

      {/* Saved Favorites */}
      {favoriteProducts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500 fill-current" />
              Saved Favorites ({favoriteProducts.length})
            </h2>
            <button
              onClick={() => onNavigate('favorites')}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {favoriteProducts.slice(0, 4).map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        </div>
      )}

      {/* Seasonal Farmer Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Recommended Farm Harvests</h2>
          <button
            onClick={() => onNavigate('marketplace')}
            className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            Browse all produce
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {recommended.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      </div>

      {/* Uploaded POP Viewer Modal */}
      {viewingPopOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewingPopOrder(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-stone-900 text-base">
                  Payment Record — {viewingPopOrder.orderNumber}
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
          </div>
        </div>
      )}
    </div>
  );
};
