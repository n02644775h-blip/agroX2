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
import { LiquidGlassCard, LiquidGlassButton, LiquidGlassModal } from './glass';
import heroFarmlandImg from '../assets/images/hero_farmland_sunrise_1794742072298.jpg';
import {
  Heart,
  MessageSquare,
  Clock,
  ChevronRight,
  Sparkles,
  MapPin,
  Truck,
  CreditCard,
  FileCheck,
  Receipt,
  Star,
  Settings,
  ShoppingBag
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
        setOrders((prev) => {
          const map = new Map<string, Order>();
          prev.forEach((o) => map.set(o.id, o));
          ordersData.forEach((o) => map.set(o.id, o));
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

    const unsubOrders = subscribeToFirebaseOrders({ buyerId: user.id }, (fbOrders) => {
      setOrders((prev) => {
        const map = new Map<string, Order>();
        prev.forEach((o) => map.set(o.id, o));
        fbOrders.forEach((o) => map.set(o.id, o));
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    });

    const mergeReviews = (list: Review[]) => {
      setReviewsByOrderId((prev) => {
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

  const activeOrders = orders.filter((o) => {
    const c = normalizeOrderStatus(o.status, o.deliveryMethod);
    return c !== 'done' && c !== 'cancelled';
  });
  const historyOrders = orders.filter((o) => {
    const c = normalizeOrderStatus(o.status, o.deliveryMethod);
    return c === 'done' || c === 'cancelled';
  });

  const displayedOrders =
    ordersTab === 'active' ? activeOrders : ordersTab === 'history' ? historyOrders : orders;

  return (
    <div className="space-y-8 pb-16">
      {/* Liquid Glass Buyer Hub Welcome Panorama */}
      <section className="relative rounded-3xl overflow-hidden shadow-[0_24px_60px_-20px_rgba(6,43,31,0.45)] border border-white/25">
        <img
          src={heroFarmlandImg}
          alt="Fresh Farm Harvest"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-[#062B1F]/92 via-[#0B3D2B]/80 to-[#062B1F]/55" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 text-white">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[#A8E635] text-xs font-bold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Buyer Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, <span className="text-[#A8E635]">{user?.name}!</span>
            </h1>
            <p className="text-[#DFF4E4]/90 text-xs sm:text-sm">
              Track your orders in real time, review payment confirmations, post sourcing requests,
              and message local growers directly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenSettings && (
              <LiquidGlassButton variant="glass" size="sm" onClick={onOpenSettings}>
                <Settings className="w-4 h-4 text-[#A8E635]" />
                <span>Settings</span>
              </LiquidGlassButton>
            )}
            <LiquidGlassButton
              variant="glass"
              size="sm"
              onClick={() => onNavigate('messages')}
            >
              <MessageSquare className="w-4 h-4 text-[#F4D35E]" />
              <span>Community Chat &amp; Bulletins</span>
            </LiquidGlassButton>
            <LiquidGlassButton
              variant="lime"
              size="sm"
              onClick={() => onNavigate('marketplace')}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Fresh Produce</span>
            </LiquidGlassButton>
          </div>
        </div>
      </section>

      {/* My Orders Section */}
      <section id="buyer-my-orders-section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold text-[#062B1F]">My Orders</h2>
            {activeOrders.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#062B1F] text-[#A8E635] text-xs font-extrabold tabular-nums">
                {activeOrders.length} active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center lg-glass-light p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setOrdersTab('active')}
                className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  ordersTab === 'active'
                    ? 'bg-[#062B1F] text-[#A8E635]'
                    : 'text-[#0B3D2B]/75 hover:text-[#062B1F]'
                }`}
              >
                Active ({activeOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setOrdersTab('history')}
                className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  ordersTab === 'history'
                    ? 'bg-[#062B1F] text-[#A8E635]'
                    : 'text-[#0B3D2B]/75 hover:text-[#062B1F]'
                }`}
              >
                History ({historyOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setOrdersTab('all')}
                className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  ordersTab === 'all'
                    ? 'bg-[#062B1F] text-[#A8E635]'
                    : 'text-[#0B3D2B]/75 hover:text-[#062B1F]'
                }`}
              >
                All ({orders.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-[#145A38] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Full Order Tracker</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading && orders.length === 0 ? (
          <LiquidGlassCard variant="light" className="p-8 text-center text-xs text-[#0B3D2B]/65">
            Loading your orders...
          </LiquidGlassCard>
        ) : displayedOrders.length === 0 ? (
          <LiquidGlassCard variant="light" className="p-10 text-center space-y-2.5">
            <Clock className="w-8 h-8 text-[#145A38]/45 mx-auto" />
            <div className="font-bold text-[#062B1F] text-sm">
              {ordersTab === 'active' ? 'No active orders right now' : 'No orders in this list'}
            </div>
            <p className="text-xs text-[#0B3D2B]/70">
              Browse the marketplace to place a fresh produce or fodder order.
            </p>
          </LiquidGlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedOrders.map((order) => {
              const statusMeta = getOrderStatusMeta(order.status, order.deliveryMethod);
              const stages = getOrderStages(order.deliveryMethod);
              const currentIdx = stages.findIndex((s) => s.key === statusMeta.canonical);
              const payMeta = getPaymentStatusMeta(order.paymentStatus, order.paymentMethod);

              return (
                <LiquidGlassCard key={order.id} variant="light" interactive className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[#062B1F] text-sm">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                      <div className="text-xs text-[#0B3D2B]/70 mt-0.5">
                        {order.farmName} ({order.farmerName}) •{' '}
                        {new Date(order.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div className="text-base font-black text-[#062B1F]">
                        ${Number(order.totalAmount || 0).toFixed(2)}
                      </div>
                      <span
                        className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${payMeta.badgeClass}`}
                      >
                        {payMeta.label}
                      </span>
                    </div>
                  </div>

                  {statusMeta.canonical !== 'cancelled' && (
                    <div className="bg-[#DFF4E4]/55 p-3 rounded-2xl border border-[#145A38]/12 space-y-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {stages.map((st, idx) => {
                          const completed = currentIdx >= idx;
                          const isCurrent = currentIdx === idx;
                          return (
                            <div key={st.key} className="space-y-1">
                              <div className="h-1.5 rounded-full bg-[#0B3D2B]/15 overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    completed ? 'w-full bg-[#145A38]' : 'w-0'
                                  }`}
                                />
                              </div>
                              <div
                                className={`text-[11px] font-bold leading-snug ${
                                  isCurrent
                                    ? 'text-[#062B1F]'
                                    : completed
                                      ? 'text-[#145A38]'
                                      : 'text-[#0B3D2B]/45'
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

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto">
                      {(order.items || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 bg-white/80 pr-2 rounded-lg border border-[#0B3D2B]/10 shrink-0"
                        >
                          <img
                            src={item.productImage}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 rounded-l-lg object-cover bg-[#DFF4E4]"
                          />
                          <span className="text-[11px] font-medium text-[#062B1F]">
                            {item.quantity}× {item.productName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-[#0B3D2B]/80 space-y-1 pt-2 border-t border-[#0B3D2B]/10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 truncate">
                        {order.deliveryMethod === 'delivery' ? (
                          <>
                            <Truck className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                            <span className="truncate">
                              {order.deliveryLocation?.formattedAddress ||
                                order.deliveryAddress ||
                                'Home Delivery'}
                            </span>
                          </>
                        ) : (
                          <>
                            <MapPin className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                            <span className="truncate">
                              Farm Pickup: {order.pickupLocation?.address || order.farmName}
                              {order.pickupTimeWindow ? ` (${order.pickupTimeWindow})` : ''}
                            </span>
                          </>
                        )}
                      </span>
                      <span className="flex items-center gap-1 text-[#0B3D2B]/65 shrink-0">
                        <CreditCard className="w-3 h-3" />
                        {getPaymentMethodLabel(order.paymentMethod)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 flex-wrap gap-2">
                      {order.proofOfPaymentUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewingPopOrder(order)}
                          className="text-[#145A38] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>View Uploaded POP</span>
                        </button>
                      ) : (
                        <span className="text-[#0B3D2B]/55">
                          {order.paymentMethod === 'cash_on_delivery'
                            ? 'Pay on delivery / collection'
                            : 'No POP uploaded yet'}
                        </span>
                      )}

                      <div className="flex items-center gap-3">
                        {statusMeta.canonical === 'done' &&
                          (() => {
                            const matchedReview = reviewsByOrderId[order.id];
                            const ratingVal = matchedReview?.rating ?? order.rating;
                            const commentVal = matchedReview?.comment ?? order.reviewComment;
                            const hasRated = Boolean(
                              order.isReviewed || matchedReview || ratingVal
                            );

                            if (hasRated && ratingVal) {
                              return (
                                <span
                                  title={commentVal || getRatingLabel(ratingVal)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F4D35E]/25 border border-[#F4D35E]/60 text-[#062B1F] font-bold text-[10px]"
                                >
                                  <Star className="w-3 h-3 fill-[#F4D35E] text-[#F4D35E]" />
                                  Your Rating: {getRatingLabel(ratingVal)}
                                </span>
                              );
                            }

                            return onOpenReviewModal ? (
                              <button
                                type="button"
                                onClick={() => onOpenReviewModal(order)}
                                className="px-2.5 py-1 rounded-lg bg-[#F4D35E] hover:bg-[#e5c146] text-[#062B1F] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Star className="w-3 h-3 fill-[#062B1F]" />
                                <span>Rate Your Order</span>
                              </button>
                            ) : null;
                          })()}

                        <button
                          type="button"
                          onClick={() => onNavigate('orders', { selectedOrder: order })}
                          className="text-[#145A38] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Track &amp; Manage</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </LiquidGlassCard>
              );
            })}
          </div>
        )}
      </section>

      {/* My Requests Section */}
      {user && <BuyerRequestsPanel user={user} onOpenMessages={onOpenMessagesForRequest} />}

      {/* Saved Favorites */}
      {favoriteProducts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-[#062B1F] flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500 fill-current" />
              <span>Saved Favorites ({favoriteProducts.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('favorites')}
              className="text-xs font-bold text-[#145A38] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {favoriteProducts.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectProduct={onSelectProduct}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[#062B1F]">Recommended Farm Harvests</h2>
          <button
            type="button"
            onClick={() => onNavigate('marketplace')}
            className="text-xs font-bold text-[#145A38] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Browse all produce</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {recommended.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      </div>

      {/* Uploaded POP Viewer Modal */}
      <LiquidGlassModal
        isOpen={Boolean(viewingPopOrder)}
        onClose={() => setViewingPopOrder(null)}
        title={viewingPopOrder ? `Payment Record — ${viewingPopOrder.orderNumber}` : ''}
        icon={<Receipt className="w-5 h-5 text-[#A8E635]" />}
        maxWidthClass="max-w-lg"
      >
        {viewingPopOrder && (
          <div className="p-6">
            <div className="max-h-96 overflow-auto rounded-2xl border border-[#0B3D2B]/15 bg-[#062B1F] flex items-center justify-center p-2">
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
        )}
      </LiquidGlassModal>
    </div>
  );
};
