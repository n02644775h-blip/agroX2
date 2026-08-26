import React from 'react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  MapPin,
  Heart,
  Plus,
  Star,
  Leaf,
  ShieldCheck,
  AlertTriangle,
  Clock,
  MessageSquare
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onContactFarmer?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onContactFarmer
}) => {
  const { user, favorites, toggleFavorite } = useAuth();
  const { addToCart } = useCart();

  const isFavorite = favorites.includes(product.id);
  const isOutOfStock = product.availability === 'out_of_stock' || product.quantityAvailable <= 0;
  const isLowStock = product.availability === 'low_stock' || (product.quantityAvailable > 0 && product.quantityAvailable <= 10);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, product.minOrderQuantity || 1);
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onContactFarmer) {
      onContactFarmer(product);
    } else {
      onSelectProduct(product);
    }
  };

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => onSelectProduct(product)}
      className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md hover:border-gray-300 transition-all duration-200 flex flex-col group overflow-hidden cursor-pointer"
    >
      {/* Image / Header Container */}
      <div className="h-44 bg-emerald-50/40 relative overflow-hidden">
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.isOrganic ? (
            <div className="px-2.5 py-1 bg-green-600 text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-xs">
              Organic Certified
            </div>
          ) : isOutOfStock ? (
            <div className="px-2.5 py-1 bg-gray-900 text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-xs">
              Sold Out
            </div>
          ) : isLowStock ? (
            <div className="px-2.5 py-1 bg-amber-500 text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-xs">
              Last {product.quantityAvailable} Units
            </div>
          ) : (
            <div className="px-2.5 py-1 bg-green-600 text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-xs">
              Freshly Picked
            </div>
          )}
        </div>

        {/* Favorite Button */}
        {user?.role === 'buyer' && (
          <button
            id={`favorite-btn-${product.id}`}
            onClick={handleFavoriteClick}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isFavorite
                ? 'bg-rose-500 text-white shadow-md'
                : 'bg-white/80 hover:bg-white text-gray-400 hover:text-rose-500 shadow-xs'
            }`}
            aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Harvest Date Tag */}
        {product.harvestDate && (
          <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-green-400" />
            Harvested {new Date(product.harvestDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title & Price Header */}
          <div className="flex justify-between items-start gap-2 mb-1.5">
            <h4 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1 group-hover:text-green-700 transition-colors">
              {product.name}
            </h4>
            <div className="text-right shrink-0">
              <span className="text-green-700 font-bold text-sm">
                ${product.price.toFixed(2)}
                <span className="text-[10px] font-normal text-gray-400">/{product.unit}</span>
              </span>
            </div>
          </div>

          {/* Producer / Farm Origin */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[10px] text-amber-800 shrink-0 font-bold">
              👨‍🌾
            </div>
            <span className="text-[11px] text-gray-500 truncate">
              <span className="text-gray-800 font-semibold">{product.farmName}</span> ·{' '}
              <span className="text-gray-600">{product.location.city}, {product.location.province}</span>
            </span>
          </div>

          {/* Category & Rating */}
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">
              {product.categoryName}
            </span>
            <div className="flex items-center gap-1 text-gray-700 text-xs">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-[11px]">{product.rating.toFixed(1)}</span>
              <span className="text-gray-400 text-[10px]">({product.reviewsCount})</span>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="mt-auto pt-2 flex gap-2">
          {user?.role === 'buyer' ? (
            <>
              <button
                id={`quick-add-${product.id}`}
                onClick={handleQuickAdd}
                disabled={isOutOfStock}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                  isOutOfStock
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-xs'
                }`}
              >
                {isOutOfStock ? 'Sold Out' : 'Add to Order'}
              </button>
              <button
                onClick={handleChatClick}
                className="w-10 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors shrink-0"
                title="Message Farmer"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onSelectProduct(product)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-colors"
            >
              View Produce Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

