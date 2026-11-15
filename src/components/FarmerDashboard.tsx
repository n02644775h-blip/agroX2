import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Product,
  Order,
  OrderStatus,
  ProductAvailability,
  PaymentStatus,
  BuyerRequest,
  Review
} from '../types';
import { subscribeToFirebaseProducts, deleteProductFromFirebase } from '../services/firebaseProducts';
import {
  subscribeToFirebaseOrders,
  updateFirebaseOrderStatus,
  updateFirebaseOrderPayment
} from '../services/firebaseOrders';
import { createFirebaseNotification } from '../services/firebaseNotifications';
import {
  subscribeToFirebaseReviews,
  calculateFarmerRatingStats,
  getRatingLabel
} from '../services/firebaseReviews';
import {
  normalizeOrderStatus,
  isOrderAttributableToFarmer,
  calculateFarmerSalesRevenue,
  calculateFarmerWeeklySalesChart,
  getOrderStages,
  getOrderStatusMeta,
  getPaymentMethodLabel,
  getPaymentStatusMeta
} from '../utils/orderUtils';
import heroFarmlandImg from '../assets/images/hero_farmland_sunrise_1794742072298.jpg';
import { FarmerProfileModal } from './FarmerProfileModal';
import { FarmerAdvertModal } from './FarmerAdvertModal';
import { FarmerPostsTab } from './FarmerPostsTab';
import { FarmerBuyerRequestsPanel } from './FarmerBuyerRequestsPanel';
import { DeleteAccountModal } from './DeleteAccountModal';
import {
  LiquidGlassCard,
  LiquidGlassButton,
  LiquidGlassModal,
  LiquidGlassSidebar,
  type SidebarNavItem
} from './glass';
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
  ChevronRight,
  ExternalLink,
  MapPin,
  User as UserIcon,
  Flame,
  Megaphone,
  Phone,
  Mail,
  ShieldCheck,
  CreditCard,
  Camera,
  Truck,
  FileCheck,
  Receipt,
  X,
  Check,
  CheckCircle2,
  Navigation,
  Star,
  LayoutDashboard,
  BarChart3,
  MessageSquare,
  Store,
  ShoppingBag,
  Settings,
  LogOut,
  Search,
  Bell,
  Menu,
  Zap,
  ImagePlus
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

export type FarmerDashboardTab =
  | 'overview'
  | 'orders'
  | 'products'
  | 'analytics'
  | 'posts'
  | 'requests'
  | 'advertising'
  | 'profile';

interface FarmerDashboardProps {
  onOpenAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onViewProduct: (product: Product) => void;
  onViewFarm: (farmerId: string) => void;
  onViewOrder: (order: Order) => void;
  onNavigate?: (view: string, data?: any) => void;
  initialTab?: FarmerDashboardTab;
  onRespondToRequest?: (request: BuyerRequest) => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  onOpenAddProduct,
  onEditProduct,
  onViewProduct,
  onViewFarm,
  onViewOrder,
  onNavigate,
  initialTab = 'overview',
  onRespondToRequest,
  onOpenNotifications,
  onOpenSettings
}) => {
  const { user, logout } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [, setStats] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<FarmerDashboardTab>(initialTab);
  const [orderFilter, setOrderFilter] = useState<
    'all' | 'received' | 'packaged' | 'in_progress' | 'done' | 'pending_pop'
  >('all');
  const [hubSearch, setHubSearch] = useState<string>('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

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
  const knownReviewIdsRef = useRef<Set<string>>(new Set());
  const reviewsBootstrappedRef = useRef<boolean>(false);

  // Ratings & Reviews
  const [farmerReviews, setFarmerReviews] = useState<Review[]>([]);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdvertModal, setShowAdvertModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const mergeIncomingOrders = (incoming: Order[]) => {
    const currentFarmerId = user?.id;
    const scopedIncoming = currentFarmerId
      ? incoming.filter((o) => isOrderAttributableToFarmer(o, currentFarmerId))
      : [];

    if (ordersBootstrappedRef.current) {
      const brandNew = scopedIncoming.filter((o) => !knownOrderIdsRef.current.has(o.id));
      if (brandNew.length > 0) {
        setNewOrderBanner(brandNew[0]);
      }
    }
    scopedIncoming.forEach((o) => knownOrderIdsRef.current.add(o.id));
    if (scopedIncoming.length > 0) {
      ordersBootstrappedRef.current = true;
    }

    const stageRank: Record<string, number> = {
      received: 1,
      packaged: 2,
      delivering: 3,
      ready_for_pickup: 3,
      done: 4,
      cancelled: 5
    };

    setOrders((prev) => {
      const map = new Map<string, Order>();
      prev.forEach((o) => {
        if (!currentFarmerId || isOrderAttributableToFarmer(o, currentFarmerId)) {
          map.set(o.id, o);
        }
      });
      scopedIncoming.forEach((o) => {
        const existing = map.get(o.id);
        if (!existing) {
          map.set(o.id, o);
          return;
        }
        const existingUpdated = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const incomingUpdated = new Date(o.updatedAt || o.createdAt || 0).getTime();
        const existingStage =
          stageRank[normalizeOrderStatus(existing.status, existing.deliveryMethod)] || 0;
        const incomingStage = stageRank[normalizeOrderStatus(o.status, o.deliveryMethod)] || 0;

        if (existingStage > incomingStage && existingUpdated >= incomingUpdated) {
          return;
        }
        if (existingUpdated > incomingUpdated && existingStage >= incomingStage) {
          return;
        }
        map.set(o.id, o);
      });
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  };

  const mergeIncomingReviews = (incoming: Review[]) => {
    if (reviewsBootstrappedRef.current) {
      const brandNew = incoming.filter((r) => !knownReviewIdsRef.current.has(r.id));
      if (brandNew.length > 0) {
        const latest = brandNew[0];
        setOrderToast(`New ${latest.rating}-star rating received from ${latest.buyerName}!`);
        setTimeout(() => setOrderToast(null), 4000);
      }
    }
    incoming.forEach((r) => knownReviewIdsRef.current.add(r.id));
    if (incoming.length > 0) {
      reviewsBootstrappedRef.current = true;
    }

    setFarmerReviews((prev) => {
      const map = new Map<string, Review>();
      prev.forEach((r) => map.set(r.id, r));
      incoming.forEach((r) => map.set(r.id, r));
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  };

  const loadFarmerData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [statsData, prodsData, ordersData, reviewsData] = await Promise.all([
        api.getFarmerStats(user.id).catch(() => null),
        api.getProducts({ farmerId: user.id }),
        api.getOrders({ farmerId: user.id }),
        api.getReviews(user.id).catch(() => [])
      ]);
      setStats(statsData);
      setProducts(prodsData);
      mergeIncomingOrders(ordersData);
      ordersBootstrappedRef.current = true;
      if (Array.isArray(reviewsData)) {
        mergeIncomingReviews(reviewsData);
        reviewsBootstrappedRef.current = true;
      }
    } catch (err) {
      console.error('Failed to load farmer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOrders([]);
    setProducts([]);
    setStats(null);
    knownOrderIdsRef.current = new Set();
    ordersBootstrappedRef.current = false;
    knownReviewIdsRef.current = new Set();
    reviewsBootstrappedRef.current = false;
    loadFarmerData();

    if (user?.id) {
      const unsubscribeProducts = subscribeToFirebaseProducts(
        { farmerId: user.id },
        (fbProducts) => {
          if (fbProducts && fbProducts.length > 0) {
            setProducts((prev) => {
              const combined = [...fbProducts];
              prev.forEach((p) => {
                if (!combined.some((c) => c.id === p.id)) {
                  combined.push(p);
                }
              });
              return combined;
            });
          }
        }
      );

      const unsubscribeOrders = subscribeToFirebaseOrders({ farmerId: user.id }, (fbOrders) => {
        mergeIncomingOrders(fbOrders);
        ordersBootstrappedRef.current = true;
      });

      const unsubscribeReviews = subscribeToFirebaseReviews({ farmerId: user.id }, (fbReviews) => {
        mergeIncomingReviews(fbReviews);
        reviewsBootstrappedRef.current = true;
      });

      const pollId = window.setInterval(() => {
        api
          .getOrders({ farmerId: user.id })
          .then((latestOrders) => {
            if (Array.isArray(latestOrders)) {
              mergeIncomingOrders(latestOrders);
            }
          })
          .catch(() => {});
        api
          .getReviews(user.id)
          .then((latestReviews) => {
            if (Array.isArray(latestReviews)) {
              mergeIncomingReviews(latestReviews);
            }
          })
          .catch(() => {});
      }, 5000);

      return () => {
        unsubscribeProducts();
        unsubscribeOrders();
        unsubscribeReviews();
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
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: newStatus,
                completedAt:
                  newStatus === 'done' || newStatus === 'completed' ? now : o.completedAt,
                pickupTimeWindow: pickupWindow ?? o.pickupTimeWindow,
                pickupInstructions: pickupInstr ?? o.pickupInstructions,
                updatedAt: now,
                statusHistory: [
                  ...(o.statusHistory || []),
                  {
                    status: newStatus,
                    timestamp: now,
                    note: note || `Status updated to ${statusLabel}`
                  }
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

  const handleUpdatePaymentStatus = async (
    order: Order,
    nextPaymentStatus: PaymentStatus,
    reason?: string
  ) => {
    setUpdatingOrderId(order.id);
    try {
      const now = new Date().toISOString();
      await api.updateOrderPaymentStatus(order.id, nextPaymentStatus, reason).catch(() => null);
      await updateFirebaseOrderPayment(
        order.id,
        {
          paymentStatus: nextPaymentStatus,
          paymentRejectionReason:
            nextPaymentStatus === 'rejected'
              ? reason || 'Invalid or unclear proof of payment'
              : '',
          paymentVerifiedAt: nextPaymentStatus === 'paid' ? now : ''
        },
        order
      );

      await createFirebaseNotification({
        userId: order.buyerId,
        title:
          nextPaymentStatus === 'paid'
            ? `Payment Confirmed — ${order.orderNumber}`
            : `Payment Proof Update — ${order.orderNumber}`,
        message:
          nextPaymentStatus === 'paid'
            ? `${order.farmName} verified and confirmed your payment for ${order.orderNumber}.`
            : `Your proof of payment for ${order.orderNumber} was rejected${reason ? `: ${reason}` : '. Please upload a valid POP.'}`,
        type: 'order',
        link: 'orders',
        metadata: { orderId: order.id, paymentStatus: nextPaymentStatus }
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                paymentStatus: nextPaymentStatus,
                paymentVerifiedAt: nextPaymentStatus === 'paid' ? now : o.paymentVerifiedAt,
                paymentRejectionReason:
                  nextPaymentStatus === 'rejected'
                    ? reason || 'Invalid proof of payment'
                    : undefined
              }
            : o
        )
      );
      if (viewingPopOrder && viewingPopOrder.id === order.id) {
        setViewingPopOrder((prev) => (prev ? { ...prev, paymentStatus: nextPaymentStatus } : null));
      }
      showToast(
        nextPaymentStatus === 'paid'
          ? `Payment confirmed for ${order.orderNumber}.`
          : `Payment rejected for ${order.orderNumber}.`
      );
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
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setConfirmDeleteProdId(null);
      await deleteProductFromFirebase(productId);
      await api.deleteProduct(productId);
      await loadFarmerData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const farmerOrders = useMemo(
    () => (user?.id ? orders.filter((o) => isOrderAttributableToFarmer(o, user.id)) : []),
    [orders, user?.id]
  );

  const pendingOrders = farmerOrders.filter(
    (o) => normalizeOrderStatus(o.status, o.deliveryMethod) === 'received'
  );
  const completedOrdersCount = farmerOrders.filter(
    (o) => normalizeOrderStatus(o.status, o.deliveryMethod) === 'done'
  ).length;
  const totalSalesRevenue = useMemo(
    () => (user?.id ? calculateFarmerSalesRevenue(farmerOrders, user.id) : 0),
    [farmerOrders, user?.id]
  );
  const weeklySalesChart = useMemo(
    () => (user?.id ? calculateFarmerWeeklySalesChart(farmerOrders, user.id) : []),
    [farmerOrders, user?.id]
  );

  const ratingStats = calculateFarmerRatingStats(farmerReviews);
  const reviewsByOrderId: Record<string, Review> = {};
  for (const rev of farmerReviews) {
    if (rev.orderId) reviewsByOrderId[rev.orderId] = rev;
  }

  const queryTerm = hubSearch.trim().toLowerCase();

  const filteredOrders = farmerOrders.filter((o) => {
    const canonical = normalizeOrderStatus(o.status, o.deliveryMethod);
    let matchesStatus = true;
    if (orderFilter === 'received') matchesStatus = canonical === 'received';
    else if (orderFilter === 'packaged') matchesStatus = canonical === 'packaged';
    else if (orderFilter === 'in_progress')
      matchesStatus = canonical === 'delivering' || canonical === 'ready_for_pickup';
    else if (orderFilter === 'done') matchesStatus = canonical === 'done';
    else if (orderFilter === 'pending_pop') matchesStatus = o.paymentStatus === 'pending_verification';

    if (!matchesStatus) return false;
    if (!queryTerm) return true;
    return (
      o.orderNumber.toLowerCase().includes(queryTerm) ||
      o.buyerName.toLowerCase().includes(queryTerm) ||
      o.items.some((i) => i.productName.toLowerCase().includes(queryTerm))
    );
  });

  const filteredProducts = products.filter((p) => {
    if (!queryTerm) return true;
    return (
      p.name.toLowerCase().includes(queryTerm) ||
      (p.categoryName || '').toLowerCase().includes(queryTerm)
    );
  });

  const productRevenueMap = useMemo(() => {
    const statsMap = new Map<string, { name: string; units: number; revenue: number }>();
    for (const o of farmerOrders) {
      if (normalizeOrderStatus(o.status, o.deliveryMethod) !== 'done') continue;
      for (const item of o.items) {
        if (item.farmerId && user?.id && item.farmerId !== user.id) continue;
        const key = item.productId || item.productName;
        const existing = statsMap.get(key) || { name: item.productName, units: 0, revenue: 0 };
        existing.units += Number(item.quantity || 0);
        existing.revenue += Number(item.subtotal ?? Number(item.price || 0) * Number(item.quantity || 0));
        statsMap.set(key, existing);
      }
    }
    return Array.from(statsMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [farmerOrders, user?.id]);

  const farmDisplayName =
    user?.farmerProfile?.farmName ||
    (user?.role === 'fodder_supplier' ? `${user?.name}'s Fodder Supply` : `${user?.name}'s Farm`);

  const sidebarItems: SidebarNavItem[] = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'products',
      label: 'My Products',
      icon: <Package className="w-4 h-4" />,
      badge: products.length > 0 ? products.length : undefined
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: pendingOrders.length > 0 ? pendingOrders.length : undefined,
      buttonId: 'farmer-tab-orders-btn'
    },
    { id: 'analytics', label: 'Sales & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    {
      id: 'posts',
      label: 'Community',
      icon: <Camera className="w-4 h-4" />,
      buttonId: 'farmer-tab-posts-btn'
    },
    {
      id: 'requests',
      label: 'Buyer Requests',
      icon: <Megaphone className="w-4 h-4" />,
      buttonId: 'farmer-tab-requests-btn'
    },
    {
      id: 'advertising',
      label: 'Hot Deals ($1/day)',
      icon: <Flame className="w-4 h-4" />
    },
    {
      id: 'profile',
      label: 'Profile & Settings',
      icon: <Settings className="w-4 h-4" />
    }
  ];

  const secondaryLinks: SidebarNavItem[] = [
    { id: 'nav_messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
    {
      id: 'nav_public_store',
      label: 'Public Store',
      icon: <ExternalLink className="w-4 h-4" />,
      buttonId: 'view-public-farm-store-btn'
    },
    { id: 'nav_marketplace', label: 'Marketplace', icon: <Store className="w-4 h-4" /> },
    ...(onOpenSettings
      ? [{ id: 'nav_settings', label: 'Account Settings', icon: <ShieldCheck className="w-4 h-4" /> }]
      : [])
  ];

  const handleSidebarSelect = (id: string) => {
    if (id === 'nav_messages') {
      onNavigate?.('messages');
      return;
    }
    if (id === 'nav_public_store') {
      if (user) onViewFarm(user.id);
      return;
    }
    if (id === 'nav_marketplace') {
      onNavigate?.('marketplace');
      return;
    }
    if (id === 'nav_settings') {
      onOpenSettings?.();
      return;
    }
    setActiveTab(id as FarmerDashboardTab);
  };

  return (
    <div className="relative pb-16">
      {/* Live Order Toast */}
      {orderToast && (
        <div className="fixed bottom-6 right-6 z-50 lg-glass-dark text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-[#A8E635]/40 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#A8E635]" />
          <span>{orderToast}</span>
        </div>
      )}

      {/* New Incoming Order Banner */}
      {newOrderBanner && (
        <div
          role="status"
          className="mb-5 p-4 rounded-2xl lg-glass-dark border border-[#A8E635]/50 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
            <div className="w-9 h-9 rounded-xl bg-[#A8E635] text-[#062B1F] flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[#A8E635]">New Order Received! ({newOrderBanner.orderNumber})</div>
              <div className="text-[11px] text-[#DFF4E4]/90 font-medium tabular-nums">
                {newOrderBanner.buyerName} placed an order for ${newOrderBanner.totalAmount.toFixed(2)}{' '}
                • {newOrderBanner.deliveryMethod === 'pickup' ? 'Farm Pickup' : 'Delivery'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LiquidGlassButton
              variant="lime"
              size="xs"
              onClick={() => {
                setActiveTab('orders');
                setNewOrderBanner(null);
              }}
            >
              View Orders ({pendingOrders.length})
            </LiquidGlassButton>
            <button
              type="button"
              onClick={() => setNewOrderBanner(null)}
              className="p-1.5 rounded-lg hover:bg-white/15 text-white cursor-pointer"
              aria-label="Dismiss new order alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sticky Deep Forest Sidebar (plus Mobile Drawer) */}
        <LiquidGlassSidebar
          brandTitle="FarmBridge."
          sectionTitle={user?.role === 'fodder_supplier' ? 'SUPPLIER HUB' : 'FARMER HUB'}
          layoutNamespace="farmer-hub-sidebar"
          items={sidebarItems}
          secondaryLinks={secondaryLinks}
          activeId={activeTab}
          onSelect={handleSidebarSelect}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          userSummary={{
            name: user?.name || 'Producer',
            subtitle: farmDisplayName,
            avatar: user?.avatar
          }}
          footerAction={{
            id: 'farmer-sidebar-logout-btn',
            label: 'Log Out',
            icon: <LogOut className="w-4 h-4 text-[#A8E635]" />,
            onClick: () => logout()
          }}
        />

        {/* Main Workspace Canvas */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* Top Translucent Search & Quick Toolbar */}
          <div className="lg-glass-dark rounded-3xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                aria-label="Open farmer hub menu"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#DFF4E4]/65 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={hubSearch}
                  onChange={(e) => setHubSearch(e.target.value)}
                  placeholder="Search orders, products, or buyers..."
                  className="w-full pl-9 pr-8 py-2 rounded-2xl bg-white/10 border border-white/18 text-xs text-white placeholder:text-[#DFF4E4]/55 focus:outline-none focus:ring-2 focus:ring-[#A8E635]/60"
                />
                {hubSearch && (
                  <button
                    type="button"
                    onClick={() => setHubSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#DFF4E4]/70 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                id="farmer-edit-profile-btn"
                onClick={() => setShowProfileModal(true)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/18 border border-white/18 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Edit farm profile & 400x400 avatar"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#A8E635]" />
                <span className="hidden sm:inline">Edit Profile</span>
              </button>

              <button
                type="button"
                id="farmer-request-advert-btn"
                onClick={() => setShowAdvertModal(true)}
                className="px-3 py-2 rounded-xl bg-linear-to-r from-[#F4D35E] to-[#E9B949] text-[#062B1F] text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer whitespace-nowrap"
              >
                <Flame className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Promote ($1/day)</span>
                <span className="sm:hidden">Ads</span>
              </button>

              <LiquidGlassButton
                id="farmer-add-new-product-btn"
                variant="lime"
                size="sm"
                onClick={onOpenAddProduct}
              >
                <Plus className="w-4 h-4" />
                <span>
                  {user?.role === 'fodder_supplier' ? 'Add Fodder' : 'Add Product'}
                </span>
              </LiquidGlassButton>

              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={onOpenNotifications}
                  aria-label="Notifications"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/18 text-white relative cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {pendingOrders.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#A8E635] ring-2 ring-[#062B1F]" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="hidden sm:flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-white/10 hover:bg-white/18 border border-white/18 cursor-pointer"
              >
                <img
                  src={
                    user?.avatar ||
                    'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'
                  }
                  alt={user?.name || 'Farmer'}
                  className="w-6 h-6 rounded-full object-cover border border-[#A8E635]/70"
                />
                <span className="text-xs font-bold text-white max-w-[120px] truncate">
                  {farmDisplayName}
                </span>
              </button>
            </div>
          </div>

          {/* Sunrise Farmland Welcome Panorama + 4 Frosted KPI Cards */}
          <motion.section
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative rounded-3xl overflow-hidden shadow-[0_24px_60px_-20px_rgba(6,43,31,0.45)] border border-white/25"
          >
            <img
              src={heroFarmlandImg}
              alt="Farmland sunrise"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-r from-[#062B1F]/92 via-[#0B3D2B]/78 to-[#062B1F]/50" />

            <div className="relative z-10 p-5 sm:p-7 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <img
                      src={
                        user?.avatar ||
                        'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'
                      }
                      alt={user?.name || 'Farm avatar'}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-[#A8E635] shadow-lg bg-[#062B1F]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(true)}
                      className="absolute inset-0 bg-[#062B1F]/65 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Change Profile Picture (400×400px)"
                    >
                      <Camera className="w-5 h-5 text-[#A8E635]" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Welcome back,{' '}
                        <span className="text-[#A8E635]">
                          {user?.name?.split(' ')[0] || 'Farmer'}!
                        </span>
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#A8E635]/20 text-[#A8E635] border border-[#A8E635]/40">
                        {user?.role === 'fodder_supplier'
                          ? 'Verified Fodder Supplier'
                          : 'Verified Producer'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#DFF4E4]/90">
                      Here&apos;s what&apos;s happening at <strong>{farmDisplayName}</strong> •{' '}
                      {user?.location?.city || 'Harare'}, {user?.location?.province || 'Harare'}
                    </p>
                  </div>
                </div>

                {user && (
                  <LiquidGlassButton
                    variant="glass"
                    size="sm"
                    onClick={() => onViewFarm(user.id)}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#A8E635]" />
                    <span>View Public Farm Store</span>
                  </LiquidGlassButton>
                )}
              </div>

              {/* 4 Frosted KPI Glass Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                <LiquidGlassCard variant="frosted" interactive className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-[#DFF4E4]/85">
                        Total Sales Revenue
                      </p>
                      <div className="text-2xl font-extrabold text-white tabular-nums tracking-tight">
                        ${totalSalesRevenue.toFixed(2)}
                      </div>
                      <p className="text-[11px] text-[#A8E635] font-semibold">
                        From {completedOrdersCount} completed{' '}
                        {completedOrdersCount === 1 ? 'order' : 'orders'}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-[#A8E635]/22 border border-[#A8E635]/40 flex items-center justify-center text-[#A8E635] shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </LiquidGlassCard>

                <LiquidGlassCard variant="frosted" interactive className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-[#DFF4E4]/85">
                        Completed Orders
                      </p>
                      <div className="text-2xl font-extrabold text-white tabular-nums tracking-tight">
                        {completedOrdersCount}
                      </div>
                      <p className="text-[11px] text-[#DFF4E4]/80 font-medium">
                        {farmerOrders.length} total orders placed
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-[#A8E635]/22 border border-[#A8E635]/40 flex items-center justify-center text-[#A8E635] shrink-0">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                </LiquidGlassCard>

                <LiquidGlassCard variant="frosted" interactive className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-[#DFF4E4]/85">Pending Orders</p>
                      <div className="text-2xl font-extrabold text-white tabular-nums tracking-tight">
                        {pendingOrders.length}
                      </div>
                      <p className="text-[11px] text-[#F4D35E] font-semibold">
                        Requires your action
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-[#F4D35E]/20 border border-[#F4D35E]/40 flex items-center justify-center text-[#F4D35E] shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                </LiquidGlassCard>

                <LiquidGlassCard variant="frosted" interactive className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-[#DFF4E4]/85">
                        Active Products
                      </p>
                      <div className="text-2xl font-extrabold text-white tabular-nums tracking-tight">
                        {products.length}
                      </div>
                      <p className="text-[11px] text-[#A8E635] font-semibold">
                        {products.filter((p) => p.availability === 'available').length} in stock
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-[#A8E635]/22 border border-[#A8E635]/40 flex items-center justify-center text-[#A8E635] shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                  </div>
                </LiquidGlassCard>
              </div>
            </div>
          </motion.section>

          {/* Compact Mobile Quick-Switch Strip (tablet / small screens) */}
          <div className="flex lg:hidden items-center gap-2 overflow-x-auto pb-1">
            {sidebarItems.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as FarmerDashboardTab)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'lg-cta-lime text-[#062B1F]'
                    : 'lg-glass-light text-[#0B3D2B]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Row 1: Sales Overview Chart + Recent Orders */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <LiquidGlassCard variant="light" className="xl:col-span-2 p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-extrabold text-[#062B1F] text-base flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#145A38]" />
                        <span>Sales Overview</span>
                      </h2>
                      <p className="text-xs text-[#0B3D2B]/70">
                        Completed harvest sales revenue across recent days
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#DFF4E4] text-[#0B3D2B] text-xs font-bold border border-[#145A38]/20 tabular-nums">
                      {completedOrdersCount} completed
                    </span>
                  </div>

                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={weeklySalesChart}
                        margin={{ top: 8, right: 10, left: -16, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="liquidGlassSalesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#A8E635" stopOpacity={0.55} />
                            <stop offset="65%" stopColor="#145A38" stopOpacity={0.18} />
                            <stop offset="95%" stopColor="#145A38" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0B3D2B18" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#0B3D2B' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#0B3D2B' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `$${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#062B1F',
                            borderRadius: '14px',
                            border: '1px solid rgba(168,230,53,0.45)',
                            color: '#FFFFFF',
                            fontSize: '12px'
                          }}
                          formatter={(val: number) => [`$${Number(val).toFixed(2)}`, 'Completed Sales']}
                        />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          stroke="#145A38"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#liquidGlassSalesGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </LiquidGlassCard>

                {/* Recent Orders Card */}
                <LiquidGlassCard variant="light" className="p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-extrabold text-[#062B1F] text-sm flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#145A38]" />
                      <span>Recent Orders</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="text-xs font-bold text-[#145A38] hover:text-[#062B1F] flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {farmerOrders.length === 0 ? (
                    <div className="py-10 text-center rounded-2xl bg-[#DFF4E4]/45 border border-[#145A38]/12 text-xs text-[#0B3D2B]/75">
                      Incoming buyer orders will appear here in real time.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {farmerOrders.slice(0, 3).map((order) => {
                        const meta = getOrderStatusMeta(order.status, order.deliveryMethod);
                        const thumb = order.items?.[0]?.productImage;
                        const isPending = meta.canonical === 'received';
                        return (
                          <div
                            key={order.id}
                            className="p-3 rounded-2xl bg-white/75 border border-[#0B3D2B]/10 space-y-2 hover:border-[#145A38]/30 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-xl object-cover shrink-0 bg-[#DFF4E4]"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-[#DFF4E4] flex items-center justify-center text-[#145A38] shrink-0">
                                    <Package className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-[#062B1F] text-xs truncate">
                                    {order.items?.[0]?.productName || order.orderNumber}
                                  </div>
                                  <div className="text-[11px] text-[#0B3D2B]/70 truncate tabular-nums">
                                    {order.orderNumber} • {order.buyerName} • $
                                    {order.totalAmount.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${meta.badgeClass}`}
                              >
                                {meta.label}
                              </span>
                            </div>

                            {isPending && (
                              <div className="flex items-center gap-2 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateOrderStatus(order, 'packaged', 'Order packed by farm')
                                  }
                                  className="flex-1 py-1.5 rounded-xl bg-[#145A38] hover:bg-[#0B3D2B] text-white text-[11px] font-bold cursor-pointer transition-colors"
                                >
                                  Mark Packaged
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('orders')}
                                  className="px-3 py-1.5 rounded-xl bg-[#DFF4E4] hover:bg-[#c8ebd0] text-[#062B1F] text-[11px] font-bold cursor-pointer"
                                >
                                  Manage
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Subtle Hot Deals Banner Trigger */}
                  <div className="p-3.5 rounded-2xl bg-linear-to-r from-[#062B1F] to-[#145A38] text-white flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold flex items-center gap-1.5 text-[#F4D35E]">
                        <Flame className="w-3.5 h-3.5" />
                        <span>Promote Your Harvest ($1/day)</span>
                      </div>
                      <p className="text-[11px] text-[#DFF4E4]/80 truncate">
                        Feature produce in homepage Featured Deals
                      </p>
                    </div>
                    <LiquidGlassButton
                      variant="lime"
                      size="xs"
                      onClick={() => setShowAdvertModal(true)}
                    >
                      Boost
                    </LiquidGlassButton>
                  </div>
                </LiquidGlassCard>
              </div>

              {/* Row 2: My Products Strip + Quick Actions + Rating Summary */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <LiquidGlassCard variant="light" className="xl:col-span-2 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-extrabold text-[#062B1F] text-base flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#145A38]" />
                      <span>My Products</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('products')}
                      className="text-xs font-bold text-[#145A38] hover:text-[#062B1F] flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All ({products.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-[#DFF4E4]/40 border border-[#145A38]/12 space-y-2.5">
                      <Package className="w-9 h-9 text-[#145A38]/50 mx-auto" />
                      <p className="text-xs text-[#0B3D2B]/75">
                        {loading ? 'Loading farm inventory...' : 'No product listings found.'}
                      </p>
                      <LiquidGlassButton variant="emerald" size="sm" onClick={onOpenAddProduct}>
                        <Plus className="w-4 h-4" />
                        <span>Add Produce Listing</span>
                      </LiquidGlassButton>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      {filteredProducts.slice(0, 4).map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => onViewProduct(prod)}
                          className="rounded-2xl bg-white/80 border border-[#0B3D2B]/10 overflow-hidden cursor-pointer hover:border-[#145A38]/40 hover:-translate-y-0.5 transition-all flex flex-col"
                        >
                          <div className="aspect-[4/3] bg-[#DFF4E4] overflow-hidden">
                            <img
                              src={prod.images?.[0]}
                              alt={prod.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-3 space-y-1 flex-1 flex flex-col justify-between">
                            <div className="font-bold text-[#062B1F] text-xs line-clamp-1">
                              {prod.name}
                            </div>
                            <div className="text-[11px] font-extrabold text-[#145A38] tabular-nums">
                              ${prod.price.toFixed(2)}{' '}
                              <span className="font-medium text-[#0B3D2B]/65">/ {prod.unit}</span>
                            </div>
                            <span
                              className={`inline-block w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                prod.availability === 'available'
                                  ? 'bg-[#DFF4E4] text-[#0B3D2B]'
                                  : prod.availability === 'low_stock'
                                    ? 'bg-[#F4D35E]/40 text-[#062B1F]'
                                    : 'bg-stone-200 text-stone-700'
                              }`}
                            >
                              {prod.availability === 'available'
                                ? 'In Stock'
                                : prod.availability === 'low_stock'
                                  ? 'Low Stock'
                                  : 'Out of Stock'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </LiquidGlassCard>

                {/* Right Column: Quick Actions + Rating Summary */}
                <div className="space-y-6">
                  <LiquidGlassCard variant="mint" className="p-5 space-y-3.5">
                    <h2 className="font-extrabold text-[#062B1F] text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#145A38]" />
                      <span>Quick Actions</span>
                    </h2>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={onOpenAddProduct}
                        className="p-3 rounded-2xl lg-cta-lime text-[#062B1F] font-bold text-xs flex items-center gap-2 cursor-pointer text-left"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Add Product</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('posts')}
                        className="p-3 rounded-2xl bg-white/85 hover:bg-white border border-[#0B3D2B]/12 text-[#062B1F] font-bold text-xs flex items-center gap-2 cursor-pointer text-left transition-colors"
                      >
                        <ImagePlus className="w-4 h-4 text-[#145A38] shrink-0" />
                        <span>Upload Showcase</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('orders')}
                        className="p-3 rounded-2xl bg-white/85 hover:bg-white border border-[#0B3D2B]/12 text-[#062B1F] font-bold text-xs flex items-center gap-2 cursor-pointer text-left transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4 text-[#145A38] shrink-0" />
                        <span>View Orders</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('requests')}
                        className="p-3 rounded-2xl bg-white/85 hover:bg-white border border-[#0B3D2B]/12 text-[#062B1F] font-bold text-xs flex items-center gap-2 cursor-pointer text-left transition-colors"
                      >
                        <Megaphone className="w-4 h-4 text-[#145A38] shrink-0" />
                        <span>Buyer Requests</span>
                      </button>
                    </div>
                  </LiquidGlassCard>

                  {/* Farmer Rating Summary Widget */}
                  <LiquidGlassCard variant="light" className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-[#062B1F] text-sm">Rating Summary</h3>
                      <span className="text-[11px] font-semibold text-[#0B3D2B]/70 tabular-nums">
                        {ratingStats.totalRatings}{' '}
                        {ratingStats.totalRatings === 1 ? 'rating' : 'ratings'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-black text-[#062B1F] tabular-nums">
                        {ratingStats.totalRatings > 0 ? ratingStats.averageRating.toFixed(1) : '—'}
                      </div>
                      <div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((st) => (
                            <Star
                              key={st}
                              className={`w-4 h-4 ${
                                ratingStats.totalRatings > 0 &&
                                st <= Math.round(ratingStats.averageRating)
                                  ? 'fill-[#F4D35E] text-[#F4D35E]'
                                  : 'text-stone-300'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="text-[11px] text-[#0B3D2B]/70 mt-0.5">
                          {ratingStats.totalRatings > 0
                            ? 'Genuine completed-order average'
                            : 'No ratings yet'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {([5, 4, 3, 2, 1] as const).map((star) => {
                        const count = ratingStats.distribution[star] || 0;
                        const pct =
                          ratingStats.totalRatings > 0
                            ? Math.round((count / ratingStats.totalRatings) * 100)
                            : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-[11px]">
                            <span className="w-7 font-semibold text-[#0B3D2B] tabular-nums">
                              {star}★
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-[#DFF4E4] overflow-hidden">
                              <div
                                className="h-full bg-[#F4D35E] rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-6 text-right font-bold text-[#0B3D2B]/75 tabular-nums">
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </LiquidGlassCard>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SALES & ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <LiquidGlassCard variant="light" className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-extrabold text-[#062B1F] text-lg">
                      Sales Revenue &amp; Performance Analytics
                    </h2>
                    <p className="text-xs text-[#0B3D2B]/75">
                      Calculated strictly from completed orders ({completedOrdersCount} fulfilled)
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-[#062B1F] text-[#A8E635] font-extrabold text-sm tabular-nums">
                    Total Earned: ${totalSalesRevenue.toFixed(2)}
                  </div>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={weeklySalesChart}
                      margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="analyticsSalesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#A8E635" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#145A38" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0B3D2B18" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#0B3D2B' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#0B3D2B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#062B1F',
                          borderRadius: '14px',
                          border: '1px solid rgba(168,230,53,0.45)',
                          color: '#FFFFFF',
                          fontSize: '12px'
                        }}
                        formatter={(val: number) => [`$${Number(val).toFixed(2)}`, 'Completed Sales']}
                      />
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="#145A38"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#analyticsSalesGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </LiquidGlassCard>

              <LiquidGlassCard variant="light" className="p-6 space-y-4">
                <h3 className="font-extrabold text-[#062B1F] text-base">
                  Top Products by Completed Order Revenue
                </h3>
                {productRevenueMap.length === 0 ? (
                  <p className="text-xs text-[#0B3D2B]/70 py-6 text-center rounded-2xl bg-[#DFF4E4]/40">
                    Complete buyer orders to populate per-product revenue statistics.
                  </p>
                ) : (
                  <div className="divide-y divide-[#0B3D2B]/10">
                    {productRevenueMap.map((row) => (
                      <div
                        key={row.name}
                        className="py-3 flex items-center justify-between text-xs gap-4"
                      >
                        <div>
                          <div className="font-bold text-[#062B1F]">{row.name}</div>
                          <div className="text-[#0B3D2B]/70 tabular-nums">
                            {row.units} units fulfilled
                          </div>
                        </div>
                        <div className="font-extrabold text-[#145A38] text-sm tabular-nums">
                          ${row.revenue.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </LiquidGlassCard>
            </div>
          )}

          {/* TAB: ORDERS MANAGEMENT */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <LiquidGlassCard
                variant="light"
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h2 className="text-lg font-extrabold text-[#062B1F]">
                    Orders &amp; Payment Verification
                  </h2>
                  <p className="text-xs text-[#0B3D2B]/75">
                    Verify buyer Proof of Payment (POP), view delivery locations or pickup readiness,
                    and advance order stages.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {[
                    { id: 'all', label: `All (${farmerOrders.length})` },
                    { id: 'received', label: 'Received' },
                    { id: 'packaged', label: 'Packaged' },
                    { id: 'in_progress', label: 'Delivering / Ready' },
                    { id: 'done', label: `Done (${completedOrdersCount})` },
                    { id: 'pending_pop', label: 'Pending POP' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setOrderFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        orderFilter === f.id
                          ? 'bg-[#062B1F] text-[#A8E635]'
                          : 'bg-[#DFF4E4]/65 text-[#0B3D2B] hover:bg-[#DFF4E4]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </LiquidGlassCard>

              {/* Rating Summary Strip */}
              <LiquidGlassCard
                variant="mint"
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#F4D35E]/25 border border-[#F4D35E]/50 flex flex-col items-center justify-center shrink-0">
                    <span className="text-base font-black text-[#062B1F] leading-none tabular-nums">
                      {ratingStats.totalRatings > 0 ? ratingStats.averageRating.toFixed(1) : '—'}
                    </span>
                    <Star className="w-3.5 h-3.5 fill-[#F4D35E] text-[#F4D35E] mt-0.5" />
                  </div>
                  <div>
                    <div className="font-bold text-[#062B1F] text-sm">
                      Completed Order Ratings ({ratingStats.totalRatings})
                    </div>
                    <p className="text-xs text-[#0B3D2B]/75">
                      {ratingStats.totalRatings > 0
                        ? `Average ${ratingStats.averageRating.toFixed(1)} out of 5 stars from verified buyers`
                        : 'Ratings submitted by buyers on completed orders appear here automatically.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 text-[11px] min-w-[260px]">
                  {([5, 4, 3, 2, 1] as const).map((star) => (
                    <div
                      key={star}
                      className="px-2 py-1.5 rounded-xl bg-white/80 border border-[#0B3D2B]/12 text-center tabular-nums"
                    >
                      <div className="font-bold text-[#0B3D2B]">{star}★</div>
                      <div className="font-extrabold text-[#145A38]">
                        {ratingStats.distribution[star]}
                      </div>
                    </div>
                  ))}
                </div>
              </LiquidGlassCard>

              {filteredOrders.length === 0 ? (
                <LiquidGlassCard variant="light" className="text-center py-16">
                  <Package className="w-12 h-12 text-[#145A38]/40 mx-auto mb-3" />
                  <h3 className="font-bold text-[#062B1F] text-base">No matching orders</h3>
                  <p className="text-xs text-[#0B3D2B]/70 mt-1">
                    {farmerOrders.length === 0
                      ? 'Your listings are visible to buyers on the marketplace. Incoming orders will show up here.'
                      : 'Try selecting a different status filter or clearing search.'}
                  </p>
                </LiquidGlassCard>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const statusMeta = getOrderStatusMeta(order.status, order.deliveryMethod);
                    const canonical = statusMeta.canonical;
                    const stages = getOrderStages(order.deliveryMethod);
                    const currentStageIdx = stages.findIndex((s) => s.key === canonical);
                    const payMeta = getPaymentStatusMeta(order.paymentStatus, order.paymentMethod);
                    const payMethodLabel = getPaymentMethodLabel(order.paymentMethod);
                    const isCancelled = canonical === 'cancelled';
                    const isDone = canonical === 'done';
                    const hasGpsCoords =
                      order.deliveryLocation?.lat !== undefined &&
                      order.deliveryLocation?.lng !== undefined;
                    const isMapOpen = expandedMapOrderId === order.id;

                    return (
                      <LiquidGlassCard key={order.id} variant="light" className="p-5 space-y-4">
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0B3D2B]/10 pb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-[#062B1F] text-base">
                                {order.orderNumber}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.badgeClass}`}
                              >
                                {statusMeta.label}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${payMeta.badgeClass}`}
                              >
                                {payMethodLabel}: {payMeta.label}
                              </span>
                            </div>
                            <div className="text-xs text-[#0B3D2B]/75 mt-1">
                              Buyer: <strong>{order.buyerName}</strong> • {order.buyerPhone}
                              {order.buyerEmail ? ` • ${order.buyerEmail}` : ''}
                            </div>
                          </div>

                          <div className="text-left sm:text-right tabular-nums">
                            <div className="text-lg font-black text-[#062B1F]">
                              ${order.totalAmount.toFixed(2)}
                            </div>
                            <div className="text-[11px] text-[#0B3D2B]/60">
                              {new Date(order.createdAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Stage Progress Indicator */}
                        {!isCancelled && (
                          <div className="grid grid-cols-4 gap-2 bg-[#DFF4E4]/55 p-3 rounded-2xl border border-[#145A38]/12">
                            {stages.map((st, idx) => {
                              const completed = currentStageIdx >= idx;
                              const isCurrent = currentStageIdx === idx;
                              return (
                                <div key={st.key} className="flex flex-col items-start gap-1">
                                  <div className="w-full h-1.5 rounded-full bg-[#0B3D2B]/15 overflow-hidden">
                                    <div
                                      className={`h-full transition-all ${
                                        completed ? 'w-full bg-[#145A38]' : 'w-0'
                                      }`}
                                    />
                                  </div>
                                  <span
                                    className={`text-[11px] font-bold ${
                                      isCurrent
                                        ? 'text-[#062B1F]'
                                        : completed
                                          ? 'text-[#145A38]'
                                          : 'text-[#0B3D2B]/45'
                                    }`}
                                  >
                                    {idx + 1}. {st.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Ordered Items List (scoped to this farmer) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {order.items
                            .filter(
                              (item) => !item.farmerId || !user?.id || item.farmerId === user.id
                            )
                            .map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2.5 p-2 rounded-xl bg-white/80 border border-[#0B3D2B]/10"
                              >
                                <img
                                  src={item.productImage}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-10 h-10 rounded-lg object-cover bg-[#DFF4E4] shrink-0"
                                />
                                <div className="truncate text-xs">
                                  <div className="font-bold text-[#062B1F] truncate">
                                    {item.productName}
                                  </div>
                                  <div className="text-[#0B3D2B]/75 tabular-nums">
                                    {item.quantity} {item.unit} × ${item.price.toFixed(2)} ={' '}
                                    <strong>${item.subtotal.toFixed(2)}</strong>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>

                        {/* Fulfillment & POP Verification Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                          <div className="bg-white/75 p-4 rounded-2xl border border-[#0B3D2B]/12 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#062B1F] flex items-center gap-1.5">
                                {order.deliveryMethod === 'delivery' ? (
                                  <Truck className="w-4 h-4 text-[#145A38]" />
                                ) : (
                                  <MapPin className="w-4 h-4 text-[#145A38]" />
                                )}
                                {order.deliveryMethod === 'delivery'
                                  ? 'Home Delivery Location'
                                  : 'Pickup at Farm'}
                              </span>
                              {hasGpsCoords && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedMapOrderId(isMapOpen ? null : order.id)
                                  }
                                  className="text-[#145A38] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  {isMapOpen ? 'Hide Map' : 'View Map'}
                                </button>
                              )}
                            </div>

                            {order.deliveryMethod === 'delivery' ? (
                              <div className="space-y-1 text-[#0B3D2B]/80">
                                <div>
                                  <strong>Address:</strong>{' '}
                                  {order.deliveryLocation?.formattedAddress ||
                                    order.deliveryAddress ||
                                    'Address on file'}
                                </div>
                                {order.deliveryLocation?.instructions && (
                                  <div>
                                    <strong>Instructions:</strong>{' '}
                                    {order.deliveryLocation.instructions}
                                  </div>
                                )}
                                {hasGpsCoords && (
                                  <div className="font-mono text-[11px] text-[#0B3D2B]/65">
                                    GPS: {order.deliveryLocation!.lat!.toFixed(5)},{' '}
                                    {order.deliveryLocation!.lng!.toFixed(5)}
                                  </div>
                                )}
                                {isMapOpen && hasGpsCoords && (
                                  <div className="pt-2">
                                    <iframe
                                      title={`Map for ${order.orderNumber}`}
                                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.deliveryLocation!.lng! - 0.015},${order.deliveryLocation!.lat! - 0.01},${order.deliveryLocation!.lng! + 0.015},${order.deliveryLocation!.lat! + 0.01}&layer=mapnik&marker=${order.deliveryLocation!.lat!},${order.deliveryLocation!.lng!}`}
                                      className="w-full h-44 rounded-xl border border-[#0B3D2B]/20"
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1.5 text-[#0B3D2B]/80">
                                <div>
                                  <strong>Pickup Point:</strong>{' '}
                                  {order.pickupLocation?.address ||
                                    user?.farmerProfile?.address ||
                                    'Direct Farm Gate'}
                                </div>
                                <div>
                                  <strong>Collection Window:</strong>{' '}
                                  {order.pickupTimeWindow ||
                                    order.pickupLocation?.readyAt ||
                                    'To be confirmed when ready'}
                                </div>
                                {(order.pickupInstructions ||
                                  order.pickupLocation?.instructions) && (
                                  <div>
                                    <strong>Instructions:</strong>{' '}
                                    {order.pickupInstructions || order.pickupLocation?.instructions}
                                  </div>
                                )}
                                {canonical === 'packaged' && (
                                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input
                                      type="text"
                                      value={
                                        pickupWindowDrafts[order.id] ?? order.pickupTimeWindow ?? ''
                                      }
                                      onChange={(e) =>
                                        setPickupWindowDrafts({
                                          ...pickupWindowDrafts,
                                          [order.id]: e.target.value
                                        })
                                      }
                                      placeholder="Ready time e.g. Today 2:00 PM – 5:00 PM"
                                      className="px-2.5 py-1.5 bg-white border border-[#0B3D2B]/20 rounded-xl text-xs text-[#062B1F]"
                                    />
                                    <input
                                      type="text"
                                      value={
                                        pickupInstrDrafts[order.id] ?? order.pickupInstructions ?? ''
                                      }
                                      onChange={(e) =>
                                        setPickupInstrDrafts({
                                          ...pickupInstrDrafts,
                                          [order.id]: e.target.value
                                        })
                                      }
                                      placeholder="Collection instructions (gate/shed)"
                                      className="px-2.5 py-1.5 bg-white border border-[#0B3D2B]/20 rounded-xl text-xs text-[#062B1F]"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {order.buyerNotes && (
                              <div className="text-[#0B3D2B]/70 italic pt-1 border-t border-[#0B3D2B]/10">
                                Buyer Note: &ldquo;{order.buyerNotes}&rdquo;
                              </div>
                            )}
                          </div>

                          <div className="bg-white/75 p-4 rounded-2xl border border-[#0B3D2B]/12 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#062B1F] flex items-center gap-1.5">
                                <CreditCard className="w-4 h-4 text-[#145A38]" />
                                Payment &amp; POP Verification
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${payMeta.badgeClass}`}
                              >
                                {payMeta.label}
                              </span>
                            </div>

                            <div className="text-[#0B3D2B]/80 space-y-1">
                              <div>
                                <strong>Method:</strong> {payMethodLabel}
                                {order.paymentReference && (
                                  <span className="ml-2 font-mono text-[11px] text-[#0B3D2B]/65">
                                    Ref: {order.paymentReference}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#0B3D2B]/65">
                                {payMeta.description}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {order.proofOfPaymentUrl && (
                                <button
                                  type="button"
                                  onClick={() => setViewingPopOrder(order)}
                                  className="px-3 py-1.5 bg-white hover:bg-[#DFF4E4]/60 border border-[#0B3D2B]/20 text-[#062B1F] rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <FileCheck className="w-3.5 h-3.5 text-[#145A38]" />
                                  View POP
                                </button>
                              )}

                              {payMeta.normalized !== 'paid' && (
                                <button
                                  type="button"
                                  disabled={updatingOrderId === order.id}
                                  onClick={() => handleUpdatePaymentStatus(order, 'paid')}
                                  className="px-3 py-1.5 bg-[#145A38] hover:bg-[#0B3D2B] text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                                    onChange={(e) =>
                                      setRejectReasonDrafts({
                                        ...rejectReasonDrafts,
                                        [order.id]: e.target.value
                                      })
                                    }
                                    placeholder="Rejection reason..."
                                    className="px-2.5 py-1.5 bg-white border border-[#0B3D2B]/20 rounded-xl text-xs flex-1"
                                  />
                                  <button
                                    type="button"
                                    disabled={updatingOrderId === order.id}
                                    onClick={() =>
                                      handleUpdatePaymentStatus(
                                        order,
                                        'rejected',
                                        rejectReasonDrafts[order.id]
                                      )
                                    }
                                    className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl font-bold text-xs cursor-pointer"
                                  >
                                    Reject POP
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Completed Order Rating */}
                        {isDone &&
                          (() => {
                            const matchedReview = reviewsByOrderId[order.id];
                            const ratingVal = matchedReview?.rating ?? order.rating;
                            const commentText =
                              matchedReview?.comment ?? order.reviewComment ?? '';
                            const doneHist = (order.statusHistory || [])
                              .slice()
                              .reverse()
                              .find(
                                (h) =>
                                  normalizeOrderStatus(h.status, order.deliveryMethod) === 'done'
                              );
                            const completionDate =
                              order.completedAt || doneHist?.timestamp || order.updatedAt;
                            const hasRating = typeof ratingVal === 'number' && ratingVal >= 1;

                            return (
                              <div className="p-3.5 rounded-2xl bg-[#DFF4E4]/45 border border-[#145A38]/15 text-xs space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#062B1F] flex items-center gap-1">
                                      <Star className="w-3.5 h-3.5 text-[#F4D35E] fill-[#F4D35E]" />
                                      <span>Buyer Rating:</span>
                                    </span>
                                    {hasRating ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-[#F4D35E]/60 text-[#062B1F] font-bold text-[11px]">
                                        <span className="flex items-center gap-0.5">
                                          {[1, 2, 3, 4, 5].map((st) => (
                                            <Star
                                              key={st}
                                              className={`w-3 h-3 ${
                                                st <= ratingVal!
                                                  ? 'fill-[#F4D35E] text-[#F4D35E]'
                                                  : 'text-stone-300'
                                              }`}
                                            />
                                          ))}
                                        </span>
                                        <span>{getRatingLabel(ratingVal!)}</span>
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-0.5 rounded-full bg-white/80 text-[#0B3D2B]/70 font-bold text-[11px]">
                                        Not Yet Rated
                                      </span>
                                    )}
                                  </div>

                                  {completionDate && (
                                    <span className="text-[11px] text-[#0B3D2B]/70">
                                      Completed:{' '}
                                      <strong>
                                        {new Date(completionDate).toLocaleDateString()}
                                      </strong>
                                    </span>
                                  )}
                                </div>

                                {hasRating && commentText && (
                                  <p className="text-[#062B1F] bg-white/90 px-3 py-2 rounded-xl border border-[#0B3D2B]/10">
                                    &ldquo;{commentText}&rdquo;
                                  </p>
                                )}
                              </div>
                            );
                          })()}

                        {/* Stage Transition Controls */}
                        <div className="pt-2 border-t border-[#0B3D2B]/10 flex flex-wrap items-center justify-between gap-3">
                          {!isDone && !isCancelled ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-[#0B3D2B]/75 mr-1">
                                Update Progress:
                              </span>

                              {canonical === 'received' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order,
                                        'packaged',
                                        'Farmer prepared and packaged items'
                                      )
                                    }
                                    disabled={updatingOrderId === order.id}
                                    className="px-3.5 py-1.5 bg-[#062B1F] hover:bg-[#145A38] text-[#A8E635] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    Mark Packaged
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateOrderStatus(
                                        order,
                                        'rejected',
                                        'Order declined by farm'
                                      )
                                    }
                                    disabled={updatingOrderId === order.id}
                                    className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </>
                              )}

                              {canonical === 'packaged' && (
                                <>
                                  {order.deliveryMethod === 'pickup' ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateOrderStatus(
                                          order,
                                          'ready_for_pickup',
                                          `Order ready for pickup${pickupWindowDrafts[order.id] ? ` (${pickupWindowDrafts[order.id]})` : ''}`
                                        )
                                      }
                                      disabled={updatingOrderId === order.id}
                                      className="px-3.5 py-1.5 bg-[#145A38] hover:bg-[#0B3D2B] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                    >
                                      Mark Ready for Pickup
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateOrderStatus(
                                          order,
                                          'delivering',
                                          'Order dispatched for delivery'
                                        )
                                      }
                                      disabled={updatingOrderId === order.id}
                                      className="px-3.5 py-1.5 bg-[#F4D35E] hover:bg-[#e5c146] text-[#062B1F] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                    >
                                      Mark Delivering
                                    </button>
                                  )}
                                </>
                              )}

                              {(canonical === 'delivering' || canonical === 'ready_for_pickup') && (
                                <button
                                  type="button"
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
                                  className="px-3.5 py-1.5 lg-cta-lime text-[#062B1F] rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                                >
                                  {order.deliveryMethod === 'pickup'
                                    ? 'Mark Collected (Done)'
                                    : 'Mark Delivered (Done)'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-[#0B3D2B]/70">
                              {isDone ? 'Order completed' : 'Order closed'}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => onViewOrder(order)}
                            className="text-xs font-bold text-[#145A38] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            Open Full Tracker
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </LiquidGlassCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: MANAGE PRODUCE */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-[#062B1F]">
                  Your Agricultural Product Inventory
                </h2>
                <LiquidGlassButton variant="lime" size="sm" onClick={onOpenAddProduct}>
                  <Plus className="w-4 h-4" />
                  <span>Add Product Listing</span>
                </LiquidGlassButton>
              </div>

              <LiquidGlassCard variant="light" className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#062B1F] text-[#DFF4E4] font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3.5">Product</th>
                        <th className="px-4 py-3.5">Category</th>
                        <th className="px-4 py-3.5">Price</th>
                        <th className="px-4 py-3.5">Available Stock</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0B3D2B]/10">
                      {filteredProducts.map((prod) => (
                        <tr
                          key={prod.id}
                          className="hover:bg-[#DFF4E4]/35 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={prod.images[0]}
                                alt=""
                                className="w-10 h-10 rounded-xl object-cover bg-[#DFF4E4] shrink-0"
                              />
                              <div>
                                <div className="font-bold text-[#062B1F] text-sm">{prod.name}</div>
                                <div className="text-[11px] text-[#0B3D2B]/65">
                                  {prod.isOrganic ? 'Organic • ' : ''}Min order:{' '}
                                  {prod.minOrderQuantity} {prod.unit}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#0B3D2B]/80 font-medium">
                            {prod.categoryName}
                          </td>
                          <td className="px-4 py-3 font-extrabold text-[#062B1F] tabular-nums">
                            ${prod.price.toFixed(2)}{' '}
                            <span className="text-[#0B3D2B]/60 font-normal">/ {prod.unit}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold tabular-nums">
                            <span
                              className={
                                prod.quantityAvailable < 10
                                  ? 'text-amber-700 font-bold'
                                  : 'text-[#062B1F]'
                              }
                            >
                              {prod.quantityAvailable} {prod.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleToggleProductStatus(prod.id, prod.availability)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                                prod.availability === 'available'
                                  ? 'bg-[#DFF4E4] text-[#0B3D2B] hover:bg-[#c8ebd0]'
                                  : prod.availability === 'low_stock'
                                    ? 'bg-[#F4D35E]/35 text-[#062B1F] hover:bg-[#F4D35E]/55'
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
                                type="button"
                                onClick={() => onViewProduct(prod)}
                                className="p-1.5 rounded-lg text-[#0B3D2B]/70 hover:text-[#062B1F] hover:bg-[#DFF4E4]/60 cursor-pointer"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditProduct(prod)}
                                className="p-1.5 rounded-lg text-[#145A38] hover:bg-[#DFF4E4]/60 cursor-pointer"
                                title="Edit Listing"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {confirmDeleteProdId === prod.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteProduct(prod.id)}
                                    className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteProdId(null)}
                                    className="px-2 py-1 rounded-lg bg-stone-200 text-stone-700 text-[11px] font-bold cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteProdId(prod.id)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
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
              </LiquidGlassCard>
            </div>
          )}

          {/* TAB: COMMUNITY SHOWCASE */}
          {activeTab === 'posts' && user && <FarmerPostsTab user={user} products={products} />}

          {/* TAB: BUYER REQUESTS */}
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

          {/* TAB: ADVERTISING & HOT DEALS */}
          {activeTab === 'advertising' && (
            <LiquidGlassCard variant="light" className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0B3D2B]/10 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-[#E5A91A] fill-[#F4D35E]" />
                    <h2 className="text-xl font-extrabold text-[#062B1F]">
                      {user?.role === 'fodder_supplier'
                        ? 'Fodder & Feed Advertising Portal'
                        : 'Farmer Advertising & Hot Deals Portal'}
                    </h2>
                  </div>
                  <p className="text-xs text-[#0B3D2B]/75 mt-1">
                    Advertise your{' '}
                    {user?.role === 'fodder_supplier' ? 'fodder & animal feed' : 'produce'} on the
                    marketplace homepage with flat $1.00/day pricing and admin proof-of-payment
                    review.
                  </p>
                </div>
                <LiquidGlassButton
                  variant="lime"
                  size="sm"
                  onClick={() => setShowAdvertModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  <span>Request New Advertisement</span>
                </LiquidGlassButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#F4D35E]/20 border border-[#F4D35E]/50 space-y-1.5">
                  <div className="font-bold text-[#062B1F] text-xs flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#145A38]" />
                    <span>Affordable Flat Fee</span>
                  </div>
                  <p className="text-xs text-[#0B3D2B]/80">
                    Only <strong>$1.00 per day</strong> with a custom duration slider up to 30 days.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#DFF4E4]/70 border border-[#145A38]/20 space-y-1.5">
                  <div className="font-bold text-[#062B1F] text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#145A38]" />
                    <span>Verified POP Approvals</span>
                  </div>
                  <p className="text-xs text-[#0B3D2B]/80">
                    Upload your EcoCash or InnBucks payment receipt for admin review.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/80 border border-[#0B3D2B]/12 space-y-1.5">
                  <div className="font-bold text-[#062B1F] text-xs flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-[#145A38]" />
                    <span>Homepage Featured Visibility</span>
                  </div>
                  <p className="text-xs text-[#0B3D2B]/80">
                    Approved campaigns appear prominently in the Featured Advertisements section.
                  </p>
                </div>
              </div>

              <div className="text-center py-4">
                <LiquidGlassButton
                  variant="emerald"
                  size="md"
                  onClick={() => setShowAdvertModal(true)}
                >
                  <Megaphone className="w-4 h-4 text-[#A8E635]" />
                  <span>Open Ad Request Manager &amp; Status Trackers</span>
                </LiquidGlassButton>
              </div>
            </LiquidGlassCard>
          )}

          {/* TAB: PROFILE & SETTINGS */}
          {activeTab === 'profile' && (
            <LiquidGlassCard variant="light" className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0B3D2B]/10 pb-5">
                <div>
                  <h2 className="text-xl font-extrabold text-[#062B1F]">
                    Farm &amp; Producer Profile Settings
                  </h2>
                  <p className="text-xs text-[#0B3D2B]/75 mt-1">
                    Your public producer profile, verified contact numbers, and payment details
                  </p>
                </div>
                <LiquidGlassButton
                  id="open-profile-edit-modal-btn"
                  variant="lime"
                  size="sm"
                  onClick={() => setShowProfileModal(true)}
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Profile &amp; Picture (400×400p)</span>
                </LiquidGlassButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-[#DFF4E4]/45 border border-[#145A38]/15 space-y-4 text-xs">
                  <div className="font-bold text-[#062B1F] text-sm flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-[#145A38]" />
                    <span>Producer Identity &amp; Contacts</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1.5 border-b border-[#0B3D2B]/10">
                      <span className="text-[#0B3D2B]/70 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-[#145A38]" />
                        Producer Full Name:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#062B1F]">{user?.name}</span>
                        <button
                          type="button"
                          onClick={() => setShowProfileModal(true)}
                          className="text-[10px] text-[#145A38] font-bold bg-white px-2 py-0.5 rounded-lg border border-[#145A38]/20 hover:bg-[#DFF4E4] cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#0B3D2B]/10">
                      <span className="text-[#0B3D2B]/70 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#145A38]/60" />
                        Contact Phone:
                      </span>
                      <span className="font-bold text-[#062B1F]">{user?.phone || 'Not set'}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#0B3D2B]/10">
                      <span className="text-[#0B3D2B]/70 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#145A38]" />
                        WhatsApp Direct:
                      </span>
                      <span className="font-bold text-[#062B1F]">
                        {user?.farmerProfile?.whatsapp || user?.phone || 'Not set'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[#0B3D2B]/70 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#145A38]/60" />
                        Email Address:
                      </span>
                      <span className="font-semibold text-[#062B1F]">{user?.email}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-[#DFF4E4]/45 border border-[#145A38]/15 space-y-4 text-xs">
                  <div className="font-bold text-[#062B1F] text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#145A38]" />
                    <span>Farm Location &amp; Land Area</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-1.5 border-b border-[#0B3D2B]/10">
                      <span className="text-[#0B3D2B]/70">Farm Brand Name:</span>
                      <span className="font-bold text-[#062B1F]">{farmDisplayName}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#0B3D2B]/10">
                      <span className="text-[#0B3D2B]/70">Province &amp; City:</span>
                      <span className="font-bold text-[#062B1F]">
                        {user?.location?.city || 'Harare'}, {user?.location?.province || 'Harare'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#0B3D2B]/10">
                      <span className="text-[#0B3D2B]/70">Farm Size / Area:</span>
                      <span className="font-bold text-[#062B1F]">
                        {user?.farmerProfile?.farmSize || '15 Hectares'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[#0B3D2B]/70">Dispatch Address:</span>
                      <span className="font-semibold text-[#062B1F] text-right truncate max-w-[200px]">
                        {user?.farmerProfile?.address || 'Direct Farm Gate'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Management / Danger Zone */}
              <div className="pt-5 border-t border-[#0B3D2B]/10 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#0B3D2B]/55">
                    Account Management
                  </div>
                  <p className="text-[11px] text-[#0B3D2B]/70">
                    Need to permanently close your FarmBridge account? Active buyer orders must be
                    completed first.
                  </p>
                </div>
                <button
                  type="button"
                  id="farmer-settings-delete-account-btn"
                  onClick={() => setShowDeleteAccountModal(true)}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline shrink-0 cursor-pointer"
                >
                  Delete Account
                </button>
              </div>
            </LiquidGlassCard>
          )}
        </div>
      </div>

      {/* Proof of Payment Viewer Modal */}
      <LiquidGlassModal
        isOpen={Boolean(viewingPopOrder)}
        onClose={() => setViewingPopOrder(null)}
        title={viewingPopOrder ? `Proof of Payment — ${viewingPopOrder.orderNumber}` : ''}
        subtitle={
          viewingPopOrder
            ? `Buyer: ${viewingPopOrder.buyerName} • ${getPaymentMethodLabel(viewingPopOrder.paymentMethod)}`
            : ''
        }
        icon={<Receipt className="w-5 h-5 text-[#A8E635]" />}
        maxWidthClass="max-w-xl"
      >
        {viewingPopOrder && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#DFF4E4]/50 p-3.5 rounded-2xl border border-[#145A38]/15 tabular-nums">
              <div>
                <strong>Amount Due:</strong> ${viewingPopOrder.totalAmount.toFixed(2)}
              </div>
              <div>
                <strong>Reference:</strong> {viewingPopOrder.paymentReference || 'N/A'}
              </div>
              <div>
                <strong>File:</strong> {viewingPopOrder.proofOfPaymentFileName || 'Payment Receipt'}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                {
                  getPaymentStatusMeta(
                    viewingPopOrder.paymentStatus,
                    viewingPopOrder.paymentMethod
                  ).label
                }
              </div>
            </div>

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

            {viewingPopOrder.paymentStatus !== 'paid' && (
              <div className="flex items-center justify-end gap-2 pt-2">
                <LiquidGlassButton
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    handleUpdatePaymentStatus(
                      viewingPopOrder,
                      'rejected',
                      rejectReasonDrafts[viewingPopOrder.id]
                    )
                  }
                >
                  Reject POP
                </LiquidGlassButton>
                <LiquidGlassButton
                  variant="lime"
                  size="sm"
                  onClick={() => handleUpdatePaymentStatus(viewingPopOrder, 'paid')}
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Payment (Paid)</span>
                </LiquidGlassButton>
              </div>
            )}
          </div>
        )}
      </LiquidGlassModal>

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

      {/* Permanent Account Deletion Modal */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onDeleted={() => {
          setShowDeleteAccountModal(false);
          if (onNavigate) onNavigate('marketplace');
        }}
      />
    </div>
  );
};
