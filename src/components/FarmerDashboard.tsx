import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Product, Order, OrderStatus, ProductAvailability } from '../types';
import { subscribeToFirebaseProducts, deleteProductFromFirebase } from '../services/firebaseProducts';
import { FarmerProfileModal } from './FarmerProfileModal';
import { FarmerAdvertModal } from './FarmerAdvertModal';
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
  Camera
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
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  onOpenAddProduct,
  onEditProduct,
  onViewProduct,
  onViewFarm,
  onViewOrder,
  onNavigate
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'advertising' | 'profile'>('overview');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdvertModal, setShowAdvertModal] = useState(false);

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
      setOrders(ordersData);
    } catch (err) {
      console.error('Failed to load farmer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarmerData();

    if (user?.id) {
      const unsubscribeProducts = subscribeToFirebaseProducts(
        { farmerId: user.id },
        (fbProducts) => {
          if (fbProducts && fbProducts.length > 0) {
            setProducts(prev => {
              const combined = [...fbProducts];
              // Add any from API that might not be in Firebase yet
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

      return () => {
        unsubscribeProducts();
      };
    }
  }, [user]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus, note?: string) => {
    setUpdatingOrderId(orderId);
    try {
      await api.updateOrderStatus(orderId, newStatus, note);
      await loadFarmerData();
    } catch (err) {
      console.error('Status update failed:', err);
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
    if (!confirm('Are you sure you want to remove this product listing?')) return;
    try {
      setProducts(prev => prev.filter(p => p.id !== productId));
      await deleteProductFromFirebase(productId);
      await api.deleteProduct(productId);
      await loadFarmerData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');

  return (
    <div className="space-y-8 pb-16">
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
                {user?.farmerProfile?.farmName || `${user?.name}'s Farm`}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Verified Producer
              </span>
            </div>
            <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-3">
              <span>Producer: <strong>{user?.name}</strong></span>
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
            Add Produce Listing
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
            {orders.filter(o => o.status === 'completed').length}
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
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
            activeTab === 'orders'
              ? 'bg-emerald-700 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <span>Incoming Orders</span>
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
          Manage Produce ({products.length})
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
          <span>Farm Profile</span>
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
                          onClick={() => handleUpdateOrderStatus(order.id, 'accepted')}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'rejected', 'Out of stock')}
                          className="py-1.5 px-3 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-lg text-xs transition-colors"
                        >
                          Decline
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

      {/* TAB 2: INCOMING ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-900">Manage Customer Orders</h2>
            <span className="text-xs text-stone-500">Total: {orders.length} orders</span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200">
              <Package className="w-12 h-12 text-stone-400 mx-auto mb-3" />
              <h3 className="font-bold text-stone-900 text-base">No orders yet</h3>
              <p className="text-xs text-stone-500 mt-1">
                Your listings are visible to buyers on the marketplace. Incoming orders will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => {
                const isPending = order.status === 'pending';
                const isAccepted = order.status === 'accepted';
                const isPreparing = order.status === 'preparing';
                const isReady = order.status === 'ready_for_collection';
                const isOutForDelivery = order.status === 'out_for_delivery';
                const isCompleted = order.status === 'completed';
                const isCancelled = order.status === 'cancelled' || order.status === 'rejected';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:border-emerald-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 text-base">{order.orderNumber}</span>
                          <span className="text-xs text-stone-400">•</span>
                          <span className="text-xs text-stone-500">
                            {new Date(order.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="text-xs text-stone-600 mt-0.5">
                          Buyer: <strong>{order.buyerName}</strong> ({order.buyerPhone})
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                            isPending
                              ? 'bg-amber-100 text-amber-900'
                              : isCompleted
                              ? 'bg-emerald-100 text-emerald-900'
                              : isCancelled
                              ? 'bg-red-100 text-red-900'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          {order.status.replace(/_/g, ' ')}
                        </span>
                        <div className="text-right">
                          <span className="text-lg font-black text-stone-900">${order.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ordered Items List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-50 border border-stone-100">
                          <img src={item.productImage} alt="" className="w-10 h-10 rounded-lg object-cover bg-stone-200 shrink-0" />
                          <div className="truncate text-xs">
                            <div className="font-bold text-stone-900 truncate">{item.productName}</div>
                            <div className="text-stone-500">
                              {item.quantity} {item.unit} × ${item.price.toFixed(2)} = <strong>${item.subtotal.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delivery & Buyer Notes */}
                    <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <strong>Fulfillment:</strong> {order.deliveryMethod === 'delivery' ? `Delivery to: ${order.deliveryAddress || 'Address on file'}` : `Farm Pickup (${order.pickupTimeWindow || 'Standard Hours'})`}
                        {order.buyerNotes && <span className="block text-stone-500 italic mt-0.5">Note: "{order.buyerNotes}"</span>}
                      </div>
                      <button
                        onClick={() => onViewOrder(order)}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        View Full Details
                      </button>
                    </div>

                    {/* Status Update Control Toolbar */}
                    {!isCompleted && !isCancelled && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-stone-500 mr-1">Update Status:</span>

                        {isPending && (
                          <>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'accepted')}
                              disabled={updatingOrderId === order.id}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Accept Order
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'rejected')}
                              disabled={updatingOrderId === order.id}
                              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-bold transition-colors"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {isAccepted && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                            disabled={updatingOrderId === order.id}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Mark as Preparing
                          </button>
                        )}

                        {isPreparing && (
                          <>
                            {order.deliveryMethod === 'pickup' ? (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_collection')}
                                disabled={updatingOrderId === order.id}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                              >
                                Ready for Collection
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'out_for_delivery')}
                                disabled={updatingOrderId === order.id}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                              >
                                Out for Delivery
                              </button>
                            )}
                          </>
                        )}

                        {(isReady || isOutForDelivery) && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                            disabled={updatingOrderId === order.id}
                            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Complete Order & Confirm Delivery
                          </button>
                        )}
                      </div>
                    )}
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
                          <button
                            onClick={() => handleDeleteProduct(prod.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* TAB 4: ADVERTISING & HOT DEALS */}
      {activeTab === 'advertising' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-600 fill-orange-500" />
                <h2 className="text-xl font-bold text-stone-900">Farmer Advertising & Hot Deals Portal</h2>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Advertise your produce on the marketplace homepage with flat $1.00/day throttling and admin proof-of-payment review.
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
                    <Lock className="w-3.5 h-3.5 text-stone-400" />
                    Legal Account Name:
                  </span>
                  <span className="font-bold text-stone-800 bg-stone-200/70 px-2 py-0.5 rounded text-stone-600 select-none">
                    {user?.name} (Verified / Locked)
                  </span>
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
