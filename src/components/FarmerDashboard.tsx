import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Product, Order, OrderStatus, ProductAvailability, PaymentStatus, BuyerRequest } from '../types';
import { subscribeToFirebaseProducts, deleteProductFromFirebase } from '../services/firebaseProducts';
import {
  subscribeToFirebaseOrders,
  updateFirebaseOrderStatus,
  updateFirebaseOrderPayment
} from '../services/firebaseOrders';
import { createFirebaseNotification } from '../services/firebaseNotifications';
import {
  normalizeOrderStatus,
  getOrderStages,
  getOrderStatusMeta,
  getPaymentMethodLabel,
  getPaymentStatusMeta
} from '../utils/orderUtils';
import { FarmerProfileModal } from './FarmerProfileModal';
import { FarmerAdvertModal } from './FarmerAdvertModal';
import { FarmerPostsTab } from './FarmerPostsTab';
import { FarmerBuyerRequestsPanel } from './FarmerBuyerRequestsPanel';
import {
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  MapPin,
  Calendar,
  Layers,
  Filter,
  User as UserIcon,
  Flame,
  Megaphone,
  Phone,
  Mail,
  ShieldCheck,
  CreditCard,
  Lock,
  Camera,
  Truck,
  FileCheck,
  Receipt,
  X,
  Check,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Navigation
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface FarmerDashboardProps {
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onViewProduct: (product: Product) => void;
  onViewFarm: (farmerId: string) => void;
  onViewOrder: (order: Order) => void;
  onNavigate?: (view: string, data?: any) => void;
  initialTab?: 'overview' | 'orders' | 'products' | 'posts' | 'requests' | 'advertising' | 'profile';
  onRespondToRequest?: (request: BuyerRequest) => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  onOpenAddProduct,
  onEditProduct,
  onViewProduct,
  onViewFarm,
  onViewOrder,
  onNavigate,
  initialTab = 'overview',
  onRespondToRequest
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'posts' | 'requests' | 'advertising' | 'profile'>(initialTab);
  const [orderFilter, setOrderFilter] = useState<'all' | 'received' | 'packaged' | 'in_progress' | 'done' | 'pending_pop'>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [viewingPopOrder, setViewingPopOrder] = useState<Order | null>(null);
  const [expandedMapOrderId, setExpandedMapOrderId] = useState<string | null>(null);
  const [pickupWindowDrafts, setPickupWindowDrafts] = useState<Record<string, string>>({});
  const [pickupInstrDrafts, setPickupInstrDrafts] = useState<Record<string, string>>({});
  const [rejectReasonDrafts, setRejectReasonDrafts] = useState<Record<string, string>>({});
  const [confirmDeleteProdId, setConfirmDeleteProdId] = useState<string | null>(null);
  const [orderToast, setOrderToast] = useState<string | null>(null);
  const [newOrderBanner, setNewOrderBanner] = useState<Order | null>(null);

  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const ordersBootstrappedRef = useRef<boolean>(false);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdvertModal, setShowAdvertModal] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const mergeIncomingOrders = (incoming: Order[]) => {
    if (ordersBootstrappedRef.current) {
      const brandNew = incoming.filter(o => !knownOrderIdsRef.current.has(o.id));
      if (brandNew.length > 0) {
        setNewOrderBanner(brandNew[0]);
      }
    }
    incoming.forEach(o => knownOrderIdsRef.current.add(o.id));
    if (incoming.length > 0) {
      ordersBootstrappedRef.current = true;
    }

    setOrders(prev => {
      const map = new Map<string, Order>();
      prev.forEach(o => map.set(o.id, o));
      incoming.forEach(o => map.set(o.id, o));
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  };

  const loadFarmerData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [statsData, prodsData, ordersData] = await Promise.all([
        api.getFarmerStats(user.id).catch(() => null),
        api.getProducts({ farmerId: user.id }),
        api.getOrders({ farmerId: user.id })
      ]);
      setStats(statsData);
      setProducts(prodsData);
      mergeIncomingOrders(ordersData);
      ordersBootstrappedRef.current = true;
    } catch (err) {
      console.error('Failed to load farmer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    knownOrderIdsRef.current = new Set();
    ordersBootstrappedRef.current = false;
    loadFarmerData();

    if (user?.id) {
      const unsubscribeProducts = subscribeToFirebaseProducts(
        { farmerId: user.id },
        (fbProducts) => {
          if (fbProducts && fbProducts.length > 0) {
            setProducts(prev => {
              const combined = [...fbProducts];
              prev.forEach(p => {
                if (!combined.some(c => c.id === p.id)) {
                  combined.push(p);
                }
              });
              return combined;
            });
          }
        }
      );

      const unsubscribeOrders = subscribeToFirebaseOrders(
        { farmerId: user.id },
        (fbOrders) => {
          mergeIncomingOrders(fbOrders);
          ordersBootstrappedRef.current = true;
        }
      );

      // Lightweight 5s background API poll alongside Firestore real-time stream
      const pollId = window.setInterval(() => {
        api
          .getOrders({ farmerId: user.id })
          .then(latestOrders => {
            if (Array.isArray(latestOrders)) {
              mergeIncomingOrders(latestOrders);
            }
          })
          .catch(() => {});
      }, 5000);

      return () => {
        unsubscribeProducts();
        unsubscribeOrders();
        window.clearInterval(pollId);
      };
    }
  }, [user]);

  const showToast = (msg: string) => {
    setOrderToast(msg);
    setTimeout(() => setOrderToast(null), 3500);
  };

  const handleUpdateOrderStatus = async (order: Order, newStatus: OrderStatus, note?: string) => {
    setUpdatingOrderId(order.id);
    try {
      const pickupWindow = pickupWindowDrafts[order.id] ?? order.pickupTimeWindow;
      const pickupInstr = pickupInstrDrafts[order.id] ?? order.pickupInstructions;

      await api.updateOrderStatus(order.id, newStatus, note, pickupWindow, pickupInstr).catch(() => null);
      await updateFirebaseOrderStatus(order.id, newStatus, order, note, pickupWindow, pickupInstr);

      const statusLabel = getOrderStatusMeta(newStatus, order.deliveryMethod).label;
      await createFirebaseNotification({
        userId: order.buyerId,
        title: `Order ${order.orderNumber} Updated`,
        message: `Your order status is now: ${statusLabel}${pickupWindow && newStatus === 'ready_for_pickup' ? ` (Ready: ${pickupWindow})` : ''}.`,
        type: 'order',
        link: 'orders',
        metadata: { orderId: order.id, status: newStatus }
      });

      const now = new Date().toISOString();
      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? {
                ...o,
                status: newStatus,
                pickupTimeWindow: pickupWindow ?? o.pickupTimeWindow,
                pickupInstructions: pickupInstr ?? o.pickupInstructions,
                updatedAt: now,
                statusHistory: [
                  ...(o.statusHistory || []),
                  { status: newStatus, timestamp: now, note: note || `Status updated to ${statusLabel}` }
                ]
              }
            : o
        )
      );
      showToast(`Order ${order.orderNumber} moved to ${statusLabel}.`);
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleUpdatePaymentStatus = async (order: Order, nextPaymentStatus: PaymentStatus, reason?: string) => {
    setUpdatingOrderId(order.id);
    try {
      const now = new Date().toISOString();
      await api.updateOrderPaymentStatus(order.id, nextPaymentStatus, reason).catch(() => null);
      await updateFirebaseOrderPayment(
        order.id,
        {
          paymentStatus: nextPaymentStatus,
          paymentRejectionReason: nextPaymentStatus === 'rejected' ? (reason || 'Invalid or unclear proof of payment') : '',
          paymentVerifiedAt: nextPaymentStatus === 'paid' ? now : ''
        },
        order
      );

      await createFirebaseNotification({
        userId: order.buyerId,
        title: nextPaymentStatus === 'paid' ? `Payment Confirmed — ${order.orderNumber}` : `Payment Proof Update — ${order.orderNumber}`,
        message:
          nextPaymentStatus === 'paid'
            ? `${order.farmName} verified and confirmed your payment for ${order.orderNumber}.`
            : `Your proof of payment for ${order.orderNumber} was rejected${reason ? `: ${reason}` : '. Please upload a valid POP.'}`,
        type: 'order',
        link: 'orders',
        metadata: { orderId: order.id, paymentStatus: nextPaymentStatus }
      });

      setOrders(prev =>
        prev.map(o =>
          o.id === order.id
            ? {
                ...o,
                paymentStatus: nextPaymentStatus,
                paymentVerifiedAt: nextPaymentStatus === 'paid' ? now : o.paymentVerifiedAt,
                paymentRejectionReason: nextPaymentStatus === 'rejected' ? (reason || 'Invalid proof of payment') : undefined
              }
            : o
        )
      );
      if (viewingPopOrder && viewingPopOrder.id === order.id) {
        setViewingPopOrder(prev => prev ? { ...prev, paymentStatus: nextPaymentStatus } : null);
      }
      showToast(nextPaymentStatus === 'paid' ? `Payment confirmed for ${order.orderNumber}.` : `Payment rejected for ${order.orderNumber}.`);
    } catch (err) {
      console.error('Payment verification update failed:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleToggleProductStatus = async (productId: string, currentStatus: ProductAvailability) => {
    const nextStatus: ProductAvailability =
      currentStatus === 'available'
        ? 'out_of_stock'
        : currentStatus === 'out_of_stock'
        ? 'low_stock'
        : 'available';
    try {
      await api.toggleProductStatus(productId, nextStatus);
      await loadFarmerData();
    } catch (err) {
      console.error('Toggle status failed:', err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      setProducts(prev => prev.filter(p => p.id !== productId));
      setConfirmDeleteProdId(null);
      await deleteProductFromFirebase(productId);
      await api.deleteProduct(productId);
      await loadFarmerData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const pendingOrders = orders.filter(o => normalizeOrderStatus(o.status, o.deliveryMethod) === 'received');
  const completedOrdersCount = orders.filter(o => normalizeOrderStatus(o.status, o.deliveryMethod) === 'done').length;

  const filteredOrders = orders.filter(o => {
    const canonical = normalizeOrderStatus(o.status, o.deliveryMethod);
    if (orderFilter === 'all') return true;
    if (orderFilter === 'received') return canonical === 'received';
    if (orderFilter === 'packaged') return canonical === 'packaged';
    if (orderFilter === 'in_progress') return canonical === 'delivering' || canonical === 'ready_for_pickup';
    if (orderFilter === 'done') return canonical === 'done';
    if (orderFilter === 'pending_pop') return o.paymentStatus === 'pending_verification';
    return true;
  });

  return (
    <div className="space-y-8 pb-16">
      {newOrderBanner && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-emerald-600 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div>New Order Received! ({newOrderBanner.orderNumber})</div>
              <div className="text-[11px] text-emerald-100 font-medium">
                {newOrderBanner.buyerName} placed an order for ${newOrderBanner.totalAmount.toFixed(2)} •{' '}
                {newOrderBanner.deliveryMethod === 'pickup' ? 'Farm Pickup' : 'Delivery'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('orders');
                setNewOrderBanner(null);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-800 font-extrabold text-xs hover:bg-emerald-50"
            >
              View Orders ({pendingOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setNewOrderBanner(null)}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white"
              aria-label="Dismiss new order alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {orderToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-stone-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{orderToast}</span>
        </div>
      )}
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'}
              alt=""
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-600 shadow-md bg-white"
            />
            <button
              onClick={() => setShowProfileModal(true)}
              className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Change Profile Picture (400×400p)"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                {user?.farmerProfile?.farmName || (user?.role === 'fodder_supplier' ? `${user?.name}'s Fodder Supply` : `${user?.name}'s Farm`)}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                user?.role === 'fodder_supplier'
                  ? 'bg-amber-100 text-amber-900 border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}>
                {user?.role === 'fodder_supplier' ? 'Verified Fodder Supplier' : 'Verified Producer'}
              </span>
            </div>
            <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-3">
              <span>{user?.role === 'fodder_supplier' ? 'Supplier:' : 'Producer:'} <strong>{user?.name}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                {user?.location?.city || 'Harare'}, {user?.location?.province || 'Harare'}
              </span>
              {user?.phone && (
                <>
                  <span>•</span>
                  <span>{user.phone}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Edit Profile Button */}
          <button
            id="farmer-edit-profile-btn"
            onClick={() => setShowProfileModal(true)}
            className="px-3.5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Edit farm profile, contact numbers, and 400x400 avatar"
          >
            <UserIcon className="w-3.5 h-3.5 text-stone-500" />
            Edit Profile
          </button>

          {/* Request Advertisement ($1/day) Button */}
          <button
            id="farmer-request-advert-btn"
            onClick={() => setShowAdvertModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Flame className="w-4 h-4 text-amber-200 fill-amber-200" />
            Request Advertisement ($1/day)
          </button>

          {user && (
            <button
              id="view-public-farm-store-btn"
              onClick={() => onViewFarm(user.id)}
              className="px-3.5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Public Store
            </button>
          )}

          <button
            id="farmer-add-new-product-btn"
            onClick={onOpenAddProduct}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-700/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            {user?.role === 'fodder_supplier' ? 'Add Fodder Listing' : 'Add Produce Listing'}
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Total Sales Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900">
            ${stats?.totalRevenue ? stats.totalRevenue.toFixed(2) : '0.00'}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">Direct customer payouts</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Active Listings</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900">{products.length}</div>
          <div className="text-[11px] text-stone-500 font-medium">
            {products.filter(p => p.availability === 'available').length} in stock
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Pending Orders</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900">{pendingOrders.length}</div>
          <div className="text-[11px] text-amber-700 font-medium">Requires your action</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Completed Orders</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900">
            {completedOrdersCount}
          </div>
          <div className="text-[11px] text-stone-500 font-medium">{orders.length} total orders placed</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activeTab === 'overview'
              ? 'bg-emerald-700 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Overview & Charts
        </button>
        <button
          id="farmer-tab-orders-btn"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-emerald-700 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <span>Orders</span>
          {pendingOrders.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-900 text-[10px] font-black flex items-center justify-center">
              {pendingOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activeTab === 'products'
              ? 'bg-emerald-700 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          {user?.role === 'fodder_supplier' ? `Manage Fodder & Feed (${products.length})` : `Manage Produce (${products.length})`}
        </button>
        <button
          id="farmer-tab-posts-btn"
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'posts'
              ? 'bg-emerald-700 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Posts / Showcase</span>
        </button>
        <button
          id="farmer-tab-requests-btn"
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-emerald-700 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>Buyer Requests</span>
        </button>
        <button
          onClick={() => setActiveTab('advertising')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'advertising'
              ? 'bg-orange-600 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Hot Deals & Advertising</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'profile'
              ? 'bg-emerald-700 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>{user?.role === 'fodder_supplier' ? 'Supplier Profile' : 'Farm Profile'}</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & CHARTS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Trends Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-base">Weekly Harvest Sales Revenue</h3>
                <p className="text-xs text-stone-500">Gross sales volume over the past 7 days</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                +18.4% this week
              </span>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.salesChart || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1917', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    formatter={(val: number) => [`$${val.toFixed(2)}`, 'Sales Volume']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Urgent Orders & Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-stone-900 text-sm">Action Needed: Pending Orders</h3>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {pendingOrders.length}
                </span>
              </div>

              {pendingOrders.length === 0 ? (
                <div className="text-center py-6 text-xs text-stone-500 bg-stone-50 rounded-2xl">
                  All pending orders have been processed!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingOrders.slice(0, 3).map(order => (
                    <div key={order.id} className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-900">{order.orderNumber}</span>
                        <span className="font-bold text-emerald-800">${order.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="text-[11px] text-stone-600">
                        {order.buyerName} • {order.items.length} items
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleUpdateOrderStatus(order, 'packaged', 'Order packed by farm')}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Mark Packaged
                        </button>
                        <button
                          onClick={() => setActiveTab('orders')}
                          className="py-1.5 px-3 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hot Deals Quick Card */}
            <div className="p-5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl border border-orange-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-orange-900 text-xs">
                <Flame className="w-4 h-4 text-orange-600 fill-orange-500" />
                <span>Boost Harvest Sales ($1/Day)</span>
              </div>
              <p className="text-[11px] text-stone-600">
                Feature your products on the top marketplace Hot Deals banner with custom duration and admin approval.
              </p>
              <button
                onClick={() => setShowAdvertModal(true)}
                className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors"
              >
                Request Advertisement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Orders &amp; Payment Verification</h2>
              <p className="text-xs text-stone-500">
                Verify buyer Proof of Payment (POP), view delivery locations or pickup readiness, and advance order stages.
              </p>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: `All (${orders.length})` },
                { id: 'received', label: 'Received' },
                { id: 'packaged', label: 'Packaged' },
                { id: 'in_progress', label: 'Delivering / Ready' },
                { id: 'done', label: 'Done' },
                { id: 'pending_pop', label: 'Pending POP' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setOrderFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    orderFilter === f.id
                      ? 'bg-emerald-700 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200">
              <Package className="w-12 h-12 text-stone-400 mx-auto mb-3" />
              <h3 className="font-bold text-stone-900 text-base">No matching orders</h3>
              <p className="text-xs text-stone-500 mt-1">
                {orders.length === 0
                  ? 'Your listings are visible to buyers on the marketplace. Incoming orders will show up here.'
                  : 'Try selecting a different status filter above.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => {
                const statusMeta = getOrderStatusMeta(order.status, order.deliveryMethod);
                const canonical = statusMeta.canonical;
                const stages = getOrderStages(order.deliveryMethod);
                const currentStageIdx = stages.findIndex(s => s.key === canonical);
                const payMeta = getPaymentStatusMeta(order.paymentStatus, order.paymentMethod);
                const payMethodLabel = getPaymentMethodLabel(order.paymentMethod);
                const isCancelled = canonical === 'cancelled';
                const isDone = canonical === 'done';
                const hasGpsCoords =
                  order.deliveryLocation?.lat !== undefined && order.deliveryLocation?.lng !== undefined;
                const isMapOpen = expandedMapOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:border-emerald-300 transition-all space-y-4"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-stone-900 text-base">{order.orderNumber}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${payMeta.badgeClass}`}>
                            {payMethodLabel}: {payMeta.label}
                          </span>
                        </div>
                        <div className="text-xs text-stone-600 mt-1">
                          Buyer: <strong>{order.buyerName}</strong> • {order.buyerPhone}
                          {order.buyerEmail ? ` • ${order.buyerEmail}` : ''}
                        </div>
                      </div>

                      <div className="text-left sm:text-right tabular-nums">
                        <div className="text-lg font-black text-stone-900">${order.totalAmount.toFixed(2)}</div>
                        <div className="text-[11px] text-stone-400">
                          {new Date(order.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Visual Stage Progress Indicator */}
                    {!isCancelled && (
                      <div className="grid grid-cols-4 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100">
                        {stages.map((st, idx) => {
                          const completed = currentStageIdx >= idx;
                          const isCurrent = currentStageIdx === idx;
                          return (
                            <div key={st.key} className="flex flex-col items-start gap-1">
                              <div className="w-full h-1.5 rounded-full bg-stone-200 overflow-hidden">
                                <div className={`h-full transition-all ${completed ? 'w-full bg-emerald-600' : 'w-0'}`} />
                              </div>
                              <span
                                className={`text-[11px] font-bold ${
                                  isCurrent ? 'text-emerald-800' : completed ? 'text-stone-700' : 'text-stone-400'
                                }`}
                              >
                                {idx + 1}. {st.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Ordered Items List (scoped to this farmer's items) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {order.items
                        .filter(item => !item.farmerId || !user?.id || item.farmerId === user.id)
                        .map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-50 border border-stone-100">
                          <img
                            src={item.productImage}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover bg-stone-200 shrink-0"
                          />
                          <div className="truncate text-xs">
                            <div className="font-bold text-stone-900 truncate">{item.productName}</div>
                            <div className="text-stone-500 tabular-nums">
                              {item.quantity} {item.unit} × ${item.price.toFixed(2)} = <strong>${item.subtotal.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delivery/Pickup + Payment Details Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                      {/* Fulfillment & Location */}
                      <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900 flex items-center gap-1.5">
                            {order.deliveryMethod === 'delivery' ? (
                              <Truck className="w-4 h-4 text-emerald-700" />
                            ) : (
                              <MapPin className="w-4 h-4 text-emerald-700" />
                            )}
                            {order.deliveryMethod === 'delivery' ? 'Home Delivery Location' : 'Pickup at Farm'}
                          </span>
                          {hasGpsCoords && (
                            <button
                              type="button"
                              onClick={() => setExpandedMapOrderId(isMapOpen ? null : order.id)}
                              className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              {isMapOpen ? 'Hide Map' : 'View Map'}
                            </button>
                          )}
                        </div>

                        {order.deliveryMethod === 'delivery' ? (
                          <div className="space-y-1 text-stone-600">
                            <div>
                              <strong>Address:</strong>{' '}
                              {order.deliveryLocation?.formattedAddress || order.deliveryAddress || 'Address on file'}
                            </div>
                            {order.deliveryLocation?.instructions && (
                              <div>
                                <strong>Instructions:</strong> {order.deliveryLocation.instructions}
                              </div>
                            )}
                            {hasGpsCoords && (
                              <div className="font-mono text-[11px] text-stone-500">
                                GPS: {order.deliveryLocation!.lat!.toFixed(5)}, {order.deliveryLocation!.lng!.toFixed(5)}
                              </div>
                            )}
                            {isMapOpen && hasGpsCoords && (
                              <div className="pt-2">
                                <iframe
                                  title={`Map for ${order.orderNumber}`}
                                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.deliveryLocation!.lng! - 0.015},${order.deliveryLocation!.lat! - 0.01},${order.deliveryLocation!.lng! + 0.015},${order.deliveryLocation!.lat! + 0.01}&layer=mapnik&marker=${order.deliveryLocation!.lat!},${order.deliveryLocation!.lng!}`}
                                  className="w-full h-44 rounded-xl border border-stone-300"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5 text-stone-600">
                            <div>
                              <strong>Pickup Point:</strong>{' '}
                              {order.pickupLocation?.address || user?.farmerProfile?.address || 'Direct Farm Gate'}
                            </div>
                            <div>
                              <strong>Collection Window:</strong>{' '}
                              {order.pickupTimeWindow || order.pickupLocation?.readyAt || 'To be confirmed when ready'}
                            </div>
                            {(order.pickupInstructions || order.pickupLocation?.instructions) && (
                              <div>
                                <strong>Instructions:</strong> {order.pickupInstructions || order.pickupLocation?.instructions}
                              </div>
                            )}
                            {canonical === 'packaged' && (
                              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  value={pickupWindowDrafts[order.id] ?? order.pickupTimeWindow ?? ''}
                                  onChange={e =>
                                    setPickupWindowDrafts({ ...pickupWindowDrafts, [order.id]: e.target.value })
                                  }
                                  placeholder="Ready time e.g. Today 2:00 PM – 5:00 PM"
                                  className="px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900"
                                />
                                <input
                                  type="text"
                                  value={pickupInstrDrafts[order.id] ?? order.pickupInstructions ?? ''}
                                  onChange={e =>
                                    setPickupInstrDrafts({ ...pickupInstrDrafts, [order.id]: e.target.value })
                                  }
                                  placeholder="Collection instructions (gate/shed)"
                                  className="px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {order.buyerNotes && (
                          <div className="text-stone-500 italic pt-1 border-t border-stone-200/70">
                            Buyer Note: "{order.buyerNotes}"
                          </div>
                        )}
                      </div>

                      {/* Payment & Proof of Payment */}
                      <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/70 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900 flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-emerald-700" />
                            Payment &amp; POP Verification
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${payMeta.badgeClass}`}>
                            {payMeta.label}
                          </span>
                        </div>

                        <div className="text-stone-600 space-y-1">
                          <div>
                            <strong>Method:</strong> {payMethodLabel}
                            {order.paymentReference && (
                              <span className="ml-2 font-mono text-[11px] text-stone-500">
                                Ref: {order.paymentReference}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500">{payMeta.description}</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {order.proofOfPaymentUrl && (
                            <button
                              type="button"
                              onClick={() => setViewingPopOrder(order)}
                              className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
                              View POP
                            </button>
                          )}

                          {payMeta.normalized !== 'paid' && (
                            <button
                              type="button"
                              disabled={updatingOrderId === order.id}
                              onClick={() => handleUpdatePaymentStatus(order, 'paid')}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Confirm Payment
                            </button>
                          )}

                          {payMeta.normalized === 'pending_verification' && (
                            <div className="flex items-center gap-1.5 w-full sm:w-auto">
                              <input
                                type="text"
                                value={rejectReasonDrafts[order.id] || ''}
                                onChange={e =>
                                  setRejectReasonDrafts({ ...rejectReasonDrafts, [order.id]: e.target.value })
                                }
                                placeholder="Rejection reason..."
                                className="px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs flex-1"
                              />
                              <button
                                type="button"
                                disabled={updatingOrderId === order.id}
                                onClick={() =>
                                  handleUpdatePaymentStatus(order, 'rejected', rejectReasonDrafts[order.id])
                                }
                                className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-bold text-xs cursor-pointer"
                              >
                                Reject POP
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stage Transition Controls & Full Details Link */}
                    <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                      {!isDone && !isCancelled ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-stone-500 mr-1">Update Progress:</span>

                          {canonical === 'received' && (
                            <>
                              <button
                                onClick={() =>
                                  handleUpdateOrderStatus(order, 'packaged', 'Farmer prepared and packaged items')
                                }
                                disabled={updatingOrderId === order.id}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Mark Packaged
                              </button>
                              <button
                                onClick={() => handleUpdateOrderStatus(order, 'rejected', 'Order declined by farm')}
                                disabled={updatingOrderId === order.id}
                                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {canonical === 'packaged' && (
                            <>
                              {order.deliveryMethod === 'pickup' ? (
                                <button
                                  onClick={() =>
                                    handleUpdateOrderStatus(
                                      order,
                                      'ready_for_pickup',
                                      `Order ready for pickup${pickupWindowDrafts[order.id] ? ` (${pickupWindowDrafts[order.id]})` : ''}`
                                    )
                                  }
                                  disabled={updatingOrderId === order.id}
                                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Mark Ready for Pickup
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleUpdateOrderStatus(order, 'delivering', 'Order dispatched for delivery')
                                  }
                                  disabled={updatingOrderId === order.id}
                                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Mark Delivering
                                </button>
                              )}
                            </>
                          )}

                          {(canonical === 'delivering' || canonical === 'ready_for_pickup') && (
                            <button
                              onClick={() =>
                                handleUpdateOrderStatus(
                                  order,
                                  'done',
                                  order.deliveryMethod === 'pickup'
                                    ? 'Collected by buyer at farm'
                                    : 'Delivered to buyer'
                                )
                              }
                              disabled={updatingOrderId === order.id}
                              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              {order.deliveryMethod === 'pickup' ? 'Mark Collected (Done)' : 'Mark Delivered (Done)'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-stone-500">
                          {isDone ? 'Order completed' : 'Order closed'}
                        </span>
                      )}

                      <button
                        onClick={() => onViewOrder(order)}
                        className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Open Full Tracker
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MANAGE FARM PRODUCE */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Your Agricultural Product Inventory</h2>
            <button
              onClick={onOpenAddProduct}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add Product Listing
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Product</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Price</th>
                    <th className="px-4 py-3.5">Available Stock</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products.map(prod => (
                    <tr key={prod.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.images[0]}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover bg-stone-100 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-stone-900 text-sm">{prod.name}</div>
                            <div className="text-[11px] text-stone-400">
                              {prod.isOrganic ? 'Organic • ' : ''}Min order: {prod.minOrderQuantity} {prod.unit}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-600 font-medium">{prod.categoryName}</td>
                      <td className="px-4 py-3 font-bold text-stone-900">
                        ${prod.price.toFixed(2)} <span className="text-stone-400 font-normal">/ {prod.unit}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <span className={prod.quantityAvailable < 10 ? 'text-amber-600 font-bold' : 'text-stone-800'}>
                          {prod.quantityAvailable} {prod.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleProductStatus(prod.id, prod.availability)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            prod.availability === 'available'
                              ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                              : prod.availability === 'low_stock'
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                              : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                          }`}
                          title="Click to toggle availability status"
                        >
                          {prod.availability.replace(/_/g, ' ')}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewProduct(prod)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditProduct(prod)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                            title="Edit Listing"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {confirmDeleteProdId === prod.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteProdId(null)}
                                className="px-2 py-1 rounded bg-stone-200 text-stone-700 text-[11px] font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteProdId(prod.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: FARMER POSTS / COMMUNITY SHOWCASE */}
      {activeTab === 'posts' && user && (
        <FarmerPostsTab user={user} products={products} />
      )}

      {/* TAB: BUYER REQUESTS MARKETPLACE */}
      {activeTab === 'requests' && user && (
        <FarmerBuyerRequestsPanel
          user={user}
          onRespondToRequest={(req) => {
            if (onRespondToRequest) {
              onRespondToRequest(req);
            } else if (onNavigate) {
              onNavigate('messages');
            }
          }}
        />
      )}

      {/* TAB 4: ADVERTISING & HOT DEALS */}
      {activeTab === 'advertising' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-600 fill-orange-500" />
                <h2 className="text-xl font-bold text-stone-900">
                  {user?.role === 'fodder_supplier' ? 'Fodder & Feed Advertising Portal' : 'Farmer Advertising & Hot Deals Portal'}
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Advertise your {user?.role === 'fodder_supplier' ? 'fodder & animal feed' : 'produce'} on the marketplace homepage with flat $1.00/day throttling and admin proof-of-payment review.
              </p>
            </div>
            <button
              onClick={() => setShowAdvertModal(true)}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all self-start"
            >
              <Plus className="w-4 h-4" />
              Request New Advertisement
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
              <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-orange-600" />
                <span>Affordable Flat Fee</span>
              </div>
              <p className="text-xs text-stone-600">
                Only <strong>$1.00 per day</strong> with a custom duration slider up to 30 days.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
              <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Verified POP Approvals</span>
              </div>
              <p className="text-xs text-stone-600">
                Upload your EcoCash or InnBucks payment receipt for instant admin queueing.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1.5">
              <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-blue-600" />
                <span>Homepage Hero Visibility</span>
              </div>
              <p className="text-xs text-stone-600">
                Approved campaigns appear prominently on the Hot Deals & Promotions banner.
              </p>
            </div>
          </div>

          {/* Open full ad modal trigger */}
          <div className="text-center py-6">
            <button
              onClick={() => setShowAdvertModal(true)}
              className="px-6 py-3 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-2xl shadow-sm inline-flex items-center gap-2 cursor-pointer"
            >
              <Megaphone className="w-4 h-4 text-amber-400" />
              Open Ad Request Manager & Review Trackers
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: PROFILE OVERVIEW */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
            <div>
              <h2 className="text-xl font-bold text-stone-900">Farm & Producer Profile Settings</h2>
              <p className="text-xs text-stone-500 mt-1">
                Your public producer profile, verified contact numbers, and payment details
              </p>
            </div>
            <button
              id="open-profile-edit-modal-btn"
              onClick={() => setShowProfileModal(true)}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors self-start cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile & Picture (400×400p)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Identity & Contact Details */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4 text-xs">
              <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-emerald-700" />
                <span>Producer Identity & Contacts</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                    Producer Full Name:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">
                      {user?.name}
                    </span>
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    Contact Phone:
                  </span>
                  <span className="font-bold text-stone-900">{user?.phone || 'Not set'}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    WhatsApp Direct:
                  </span>
                  <span className="font-bold text-stone-900">{user?.farmerProfile?.whatsapp || user?.phone || 'Not set'}</span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-stone-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    Email Address:
                  </span>
                  <span className="font-semibold text-stone-800">{user?.email}</span>
                </div>
              </div>
            </div>

            {/* Farm Details */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4 text-xs">
              <div className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <span>Farm Location & Land Area</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                  <span className="text-stone-500">Farm Brand Name:</span>
                  <span className="font-bold text-stone-900">{user?.farmerProfile?.farmName || `${user?.name}'s Farm`}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                  <span className="text-stone-500">Province & City:</span>
                  <span className="font-bold text-stone-900">
                    {user?.location?.city || 'Harare'}, {user?.location?.province || 'Harare'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-stone-200">
                  <span className="text-stone-500">Farm Size / Area:</span>
                  <span className="font-bold text-stone-900">{user?.farmerProfile?.farmSize || '15 Hectares'}</span>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-stone-500">Dispatch Address:</span>
                  <span className="font-semibold text-stone-800 text-right truncate max-w-[200px]">
                    {user?.farmerProfile?.address || 'Direct Farm Gate'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Payment Viewer Modal */}
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
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base">
                    Proof of Payment — {viewingPopOrder.orderNumber}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Buyer: {viewingPopOrder.buyerName} • {getPaymentMethodLabel(viewingPopOrder.paymentMethod)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingPopOrder(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-3 rounded-2xl border border-stone-200 tabular-nums">
              <div><strong>Amount Due:</strong> ${viewingPopOrder.totalAmount.toFixed(2)}</div>
              <div><strong>Reference:</strong> {viewingPopOrder.paymentReference || 'N/A'}</div>
              <div><strong>File:</strong> {viewingPopOrder.proofOfPaymentFileName || 'Payment Receipt'}</div>
              <div><strong>Status:</strong> {getPaymentStatusMeta(viewingPopOrder.paymentStatus, viewingPopOrder.paymentMethod).label}</div>
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

            <div className="flex items-center justify-end gap-2 pt-2">
              {viewingPopOrder.paymentStatus !== 'paid' && (
                <>
                  <button
                    onClick={() => handleUpdatePaymentStatus(viewingPopOrder, 'rejected', rejectReasonDrafts[viewingPopOrder.id])}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Reject POP
                  </button>
                  <button
                    onClick={() => handleUpdatePaymentStatus(viewingPopOrder, 'paid')}
                    className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Confirm Payment (Paid)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <FarmerProfileModal
          onClose={() => setShowProfileModal(false)}
          onSuccess={() => loadFarmerData()}
        />
      )}

      {/* Advertisement Request Modal */}
      {showAdvertModal && (
        <FarmerAdvertModal
          onClose={() => setShowAdvertModal(false)}
          onSuccess={() => loadFarmerData()}
          products={products}
        />
      )}
    </div>
  );
};
