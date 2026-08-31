import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Product, Order } from '../types';
import { ProductCard } from './ProductCard';
import {
  ShoppingBag,
  Heart,
  MessageSquare,
  Clock,
  ChevronRight,
  Sparkles,
  MapPin,
  FileText,
  Truck
} from 'lucide-react';

interface BuyerDashboardProps {
  onNavigate: (view: string, data?: any) => void;
  onSelectProduct: (product: Product) => void;
}

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ onNavigate, onSelectProduct }) => {
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const loadBuyerData = async () => {
      setLoading(true);
      try {
        const [ordersData, favsData, recsData] = await Promise.all([
          api.getOrders({ userId: user.id, role: 'buyer' }),
          api.getFavorites(user.id),
          api.getProducts({ sortBy: 'popular' })
        ]);
        setRecentOrders(ordersData);
        setFavoriteProducts(favsData);
        setRecommended(recsData.slice(0, 4));
      } catch (err) {
        console.error('Failed to load buyer hub:', err);
      } finally {
        setLoading(false);
      }
    };
    loadBuyerData();
  }, [user]);

  const activeOrders = recentOrders.filter(o => !['completed', 'cancelled', 'rejected'].includes(o.status));

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
            Track your farm shipments, reorder your favorite weekly essentials, or chat directly with local growers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate('messages')}
            className="px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-md transition-all shrink-0 flex items-center gap-2 border border-white/20"
          >
            <MessageSquare className="w-4 h-4 text-amber-300" />
            <span>Community Chat & Bulletins</span>
          </button>
          <button
            onClick={() => onNavigate('marketplace')}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-900/30 transition-all shrink-0"
          >
            Explore Fresh Produce
          </button>
        </div>
      </div>

      {/* Active Orders Tracker */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900">Active Farm Orders</h2>
            {activeOrders.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                {activeOrders.length}
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
          >
            All Orders ({recentOrders.length})
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeOrders.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-stone-200 text-center space-y-2">
            <Clock className="w-8 h-8 text-stone-400 mx-auto" />
            <div className="font-bold text-stone-800 text-sm">No active orders right now</div>
            <p className="text-xs text-stone-500">Your completed orders and history can be found in the Orders tab.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrders.map(order => (
              <div
                key={order.id}
                onClick={() => onNavigate('orders', { selectedOrder: order })}
                className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">{order.orderNumber}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 capitalize">
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="text-xs text-stone-600">
                  Farmer: <strong>{order.farmName}</strong> ({order.farmerName})
                </div>

                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {order.items.map((item, idx) => (
                    <img
                      key={idx}
                      src={item.productImage}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-stone-100 shrink-0"
                    />
                  ))}
                  <div className="text-xs font-bold text-stone-900 ml-auto">
                    ${order.totalAmount.toFixed(2)}
                  </div>
                </div>

                <div className="text-[11px] text-stone-500 flex items-center justify-between pt-2 border-t border-stone-100">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-600" />
                    {order.deliveryMethod === 'delivery' ? 'Local Delivery' : 'Farm Pickup'}
                  </span>
                  <span className="text-emerald-700 font-bold">Track Shipment →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
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
            className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
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
    </div>
  );
};
