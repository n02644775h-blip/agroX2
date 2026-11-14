import React, { useState } from 'react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  MapPin,
  Heart,
  Star,
  MessageSquare,
  Sprout,
  ShoppingBag
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
  const [imgFailed, setImgFailed] = useState(false);

  const isFavorite = favorites.includes(product.id);
  const isOutOfStock = product.availability === 'out_of_stock' || product.quantityAvailable <= 0;
  const isLowStock =
    !isOutOfStock &&
    (product.availability === 'low_stock' ||
      (product.quantityAvailable > 0 && product.quantityAvailable <= 10));

  const canBuy = !user || user.role === 'buyer';
  const isOwner = user?.id === product.farmerId;

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

  const primaryImage = product.images?.[0];

  return (
    <article
      id={`product-card-${product.id}`}
      onClick={() => onSelectProduct(product)}
      className="bg-white rounded-2xl border border-[#E8EEE8] hover:border-[#77A987] hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex flex-col group overflow-hidden cursor-pointer"
    >
      {/* Product Image Area (Consistent 4:3 Ratio) */}
      <div className="relative aspect-[4/3] bg-[#F8FAF7] overflow-hidden border-b border-[#E8EEE8]">
        {primaryImage && !imgFailed ? (
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#77A987] gap-1.5">
            <Sprout className="w-8 h-8 opacity-75" />
            <span className="text-[11px] font-medium text-[#202B24]/50">
              {product.categoryName || 'Farm Produce'}
            </span>
          </div>
        )}

        {/* Single Subtle Status Tag (No Badge Spam) */}
        {(isOutOfStock || product.isOrganic || isLowStock) && (
          <span
            className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold tracking-tight ${
              isOutOfStock
                ? 'bg-[#202B24] text-white'
                : isLowStock
                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                : 'bg-white/95 text-[#174B35] border border-[#E8EEE8]'
            }`}
          >
            {isOutOfStock
              ? 'Sold Out'
              : isLowStock
              ? `Low Stock · ${product.quantityAvailable} left`
              : 'Organic'}
          </span>
        )}

        {/* Favorite Button (Buyers) */}
        {user?.role === 'buyer' && (
          <button
            id={`favorite-btn-${product.id}`}
            type="button"
            onClick={handleFavoriteClick}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isFavorite
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-white/90 hover:bg-white text-[#202B24]/55 hover:text-rose-500 border border-[#E8EEE8]'
            }`}
            aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1.5">
          {/* Category & Genuine Rating */}
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold uppercase tracking-wider text-[#77A987] truncate">
              {product.categoryName}
            </span>
            {product.reviewsCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[#202B24]/80 font-semibold shrink-0 tabular-nums">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {product.rating.toFixed(1)}
                <span className="text-[#202B24]/45 font-normal">({product.reviewsCount})</span>
              </span>
            )}
          </div>

          {/* Product Name */}
          <h3 className="font-semibold text-[15px] text-[#202B24] leading-snug line-clamp-1 group-hover:text-[#174B35] transition-colors">
            {product.name}
          </h3>

          {/* Farm Origin & Location */}
          <p className="text-xs text-[#202B24]/65 flex items-center gap-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#77A987] shrink-0" />
            <span className="truncate">
              <span className="font-medium text-[#202B24]/85">{product.farmName}</span> ·{' '}
              {product.location.city}, {product.location.province}
            </span>
          </p>
        </div>

        {/* Price + Availability + Actions */}
        <div className="pt-2.5 border-t border-[#E8EEE8] space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div className="tabular-nums">
              <span className="text-base font-bold text-[#174B35]">
                ${product.price.toFixed(2)}
              </span>
              <span className="text-xs text-[#202B24]/55 font-medium"> / {product.unit}</span>
            </div>

            <span
              className={`text-[11px] font-medium flex items-center gap-1.5 ${
                isOutOfStock
                  ? 'text-[#202B24]/45'
                  : isLowStock
                  ? 'text-amber-700'
                  : 'text-[#174B35]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isOutOfStock ? 'bg-[#202B24]/30' : isLowStock ? 'bg-amber-500' : 'bg-[#77A987]'
                }`}
              />
              {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canBuy ? (
              <button
                id={`quick-add-${product.id}`}
                type="button"
                onClick={handleQuickAdd}
                disabled={isOutOfStock}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  isOutOfStock
                    ? 'bg-[#F8FAF7] text-[#202B24]/40 border border-[#E8EEE8] cursor-not-allowed'
                    : 'bg-[#174B35] hover:bg-[#123c2a] text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{isOutOfStock ? 'Unavailable' : 'Add to Cart'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectProduct(product)}
                className="flex-1 py-2 px-3 bg-[#F8FAF7] hover:bg-[#E8EEE8]/70 border border-[#E8EEE8] text-[#202B24] rounded-xl text-xs font-semibold transition-colors"
              >
                View Details
              </button>
            )}

            {!isOwner && (
              <button
                type="button"
                onClick={handleChatClick}
                className="p-2 border border-[#E8EEE8] rounded-xl hover:bg-[#F8FAF7] hover:border-[#77A987] text-[#174B35] transition-colors shrink-0"
                title={product.sellerRole === 'fodder_supplier' ? 'Contact Supplier' : 'Contact Farmer'}
                aria-label={product.sellerRole === 'fodder_supplier' ? 'Contact Supplier' : 'Contact Farmer'}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
