import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Order, OrderStatus } from '../types';
import {
  FileText,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
  MessageSquare,
  Star,
  ChevronRight,
  ShieldCheck,
  Package,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface OrderManagementProps {
  initialSelectedOrder?: Order | null;
  onContactFarmer: (farmerId: string, orderId?: string) => void;
  onOpenReviewModal: (order: Order) => void;
}

const STATUS_STEPS: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready_for_collection',
  'out_for_delivery',
  'completed'
];

export const OrderManagement: React.FC<OrderManagementProps> = ({
  initialSelectedOrder,
  onContactFarmer,
  onOpenReviewModal
}) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(initialSelectedOrder || null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const loadOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getOrders({
        userId: user.id,
        role: user.role,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      setOrders(data);
      if (!selectedOrder && data.length > 0) {
        setSelectedOrder(data[0]);
      } else if (selectedOrder) {
        const found = data.find(o => o.id === selectedOrder.id);
        if (found) setSelectedOrder(found);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user, statusFilter]);

  const getStatusBadge = (status: OrderStatus) => {
    const map: Record<OrderStatus, { label: string; bg: string; text: string }> = {
      pending: { label: 'Pending Confirmation', bg: 'bg-amber-100', text: 'text-amber-900' },
      accepted: { label: 'Order Accepted', bg: 'bg-blue-100', text: 'text-blue-900' },
      rejected: { label: 'Declined', bg: 'bg-red-100', text: 'text-red-900' },
      preparing: { label: 'Harvesting & Packing', bg: 'bg-indigo-100', text: 'text-indigo-900' },
      ready_for_collection: { label: 'Ready for Collection', bg: 'bg-emerald-100', text: 'text-emerald-900' },
      out_for_delivery: { label: 'Out for Delivery', bg: 'bg-emerald-100', text: 'text-emerald-900' },
      completed: { label: 'Order Completed', bg: 'bg-emerald-600', text: 'text-white' },
      cancelled: { label: 'Cancelled', bg: 'bg-stone-200', text: 'text-stone-700' }
    };
    const s = map[status] || { label: status, bg: 'bg-stone-100', text: 'text-stone-800' };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Farm Orders & Tracking</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {user?.role === 'farmer'
              ? 'Fulfill orders, coordinate collections, and update harvest statuses.'
              : 'Track your deliveries from harvest to doorstep and leave reviews.'}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-1.5 rounded-2xl border border-stone-200 shadow-xs">
          {['all', 'pending', 'preparing', 'completed'].map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize shrink-0 transition-colors ${
                statusFilter === tab
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {tab === 'all' ? 'All Orders' : tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-stone-400">Loading order details...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
          <FileText className="w-12 h-12 text-stone-400 mx-auto" />
          <h3 className="font-bold text-stone-900 text-base">No orders found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {user?.role === 'farmer'
              ? 'You have not received any orders yet in this filter.'
              : 'Browse our fresh farm produce on the marketplace to place your first order!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order List Sidebar */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Orders ({orders.length})
            </h2>
            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
              {orders.map(order => {
                const isSelected = selectedOrder?.id === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">{order.orderNumber}</span>
                      <span className="font-black text-emerald-800 text-sm">${order.totalAmount.toFixed(2)}</span>
                    </div>

                    <div className="text-xs text-stone-600 truncate">
                      {user?.role === 'farmer' ? `Buyer: ${order.buyerName}` : `Farm: ${order.farmName}`}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {getStatusBadge(order.status)}
                      <span className="text-[10px] text-stone-400">
                        {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Order Timeline & Spec View */}
          {selectedOrder && (
            <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-6">
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-stone-900">{selectedOrder.orderNumber}</h2>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    Placed on {new Date(selectedOrder.createdAt).toLocaleDateString(undefined, {
                      dateStyle: 'full',
                      timeStyle: 'short'
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onContactFarmer(selectedOrder.farmerId, selectedOrder.id)}
                    className="px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    Chat with {user?.role === 'farmer' ? 'Buyer' : 'Farmer'}
                  </button>

                  {user?.role === 'buyer' && selectedOrder.status === 'completed' && !selectedOrder.isReviewed && (
                    <button
                      onClick={() => onOpenReviewModal(selectedOrder)}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <Star className="w-4 h-4 fill-stone-900" />
                      Rate & Review
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Order Progress Tracker */}
              <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/80 space-y-4">
                <h3 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                  Live Fulfillment Status
                </h3>

                <div className="relative flex items-center justify-between max-w-xl mx-auto py-2">
                  {/* Progress Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-stone-200 -translate-y-1/2 z-0"></div>

                  {[
                    { key: 'pending', label: 'Placed' },
                    { key: 'accepted', label: 'Accepted' },
                    { key: 'preparing', label: 'Preparing' },
                    { key: selectedOrder.deliveryMethod === 'pickup' ? 'ready_for_collection' : 'out_for_delivery', label: selectedOrder.deliveryMethod === 'pickup' ? 'Ready' : 'Dispatched' },
                    { key: 'completed', label: 'Delivered' }
                  ].map((step, idx) => {
                    const stepIndex = STATUS_STEPS.indexOf(step.key as any);
                    const currentIdx = STATUS_STEPS.indexOf(selectedOrder.status);
                    const isDone = currentIdx >= stepIndex && selectedOrder.status !== 'rejected' && selectedOrder.status !== 'cancelled';
                    const isCurrent = selectedOrder.status === step.key;

                    return (
                      <div key={idx} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            isDone
                              ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                              : 'bg-stone-200 text-stone-500'
                          }`}
                        >
                          {isDone ? <CheckCircle className="w-4 h-4" /> : idx + 1}
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

                {/* Status Timeline History Log */}
                <div className="space-y-1.5 pt-2 border-t border-stone-200/60">
                  {selectedOrder.statusHistory.map((hist, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-stone-600">
                      <span className="font-medium capitalize text-stone-800">
                        • {hist.note || hist.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        {new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-3">
                <h3 className="font-bold text-stone-900 text-sm">Harvest Items Ordered</h3>
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between bg-white hover:bg-stone-50/50">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.productImage}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover bg-stone-100"
                        />
                        <div>
                          <div className="font-bold text-stone-900 text-sm">{item.productName}</div>
                          <div className="text-xs text-stone-500">
                            {item.quantity} {item.unit} × ${item.price.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-stone-900">${item.subtotal.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fulfillment & Contact Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    Delivery / Pickup Method
                  </div>
                  <div>
                    <strong>Type:</strong> {selectedOrder.deliveryMethod === 'delivery' ? 'Local Farm Delivery' : 'Farm Gate Pickup'}
                  </div>
                  {selectedOrder.deliveryAddress && (
                    <div><strong>Address:</strong> {selectedOrder.deliveryAddress}</div>
                  )}
                  {selectedOrder.pickupTimeWindow && (
                    <div><strong>Pickup Window:</strong> {selectedOrder.pickupTimeWindow}</div>
                  )}
                  {selectedOrder.buyerNotes && (
                    <div className="text-stone-500 italic">"Note: {selectedOrder.buyerNotes}"</div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Producer & Buyer Information
                  </div>
                  <div><strong>Farm:</strong> {selectedOrder.farmName}</div>
                  <div><strong>Farmer:</strong> {selectedOrder.farmerName}</div>
                  <div><strong>Buyer:</strong> {selectedOrder.buyerName} ({selectedOrder.buyerPhone})</div>
                  <div className="text-emerald-800 font-bold pt-1">
                    Total Paid: ${selectedOrder.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
