import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  MapPin,
  Heart,
  Star,
  MessageSquare,
  Sprout,
  ShoppingBag,
  ShieldCheck
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onContactFarmer?: (product: Product) => void;
  surface?: 'light' | 'dark';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectProduct,
  onContactFarmer,
  surface = 'light'
}) => {
  const prefersReducedMotion = useReducedMotion();
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
  const isDark = surface === 'dark';

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
    <motion.article
      id={`product-card-${product.id}`}
      onClick={() => onSelectProduct(product)}
      whileHover={prefersReducedMotion ? undefined : { y: -4 }}
      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      className={`rounded-3xl flex flex-col group overflow-hidden cursor-pointer transition-all duration-200 ${
        isDark
          ? 'bg-white/12 hover:bg-white/16 backdrop-blur-xl border border-white/25 hover:border-[#A8E635]/60 text-white shadow-[0_20px_44px_-18px_rgba(3,20,14,0.65)]'
          : 'lg-glass-light hover:border-[#145A38]/40 text-[#0B261C]'
      }`}
    >
      {/* Product Image Area (Consistent 4:3 Ratio) */}
      <div
        className={`relative aspect-[4/3] overflow-hidden border-b ${
          isDark ? 'bg-[#062B1F]/60 border-white/15' : 'bg-[#DFF4E4]/40 border-white/60'
        }`}
      >
        {primaryImage && !imgFailed ? (
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#A8E635] gap-1.5">
            <Sprout className="w-8 h-8 opacity-80" />
            <span className={`text-[11px] font-medium ${isDark ? 'text-[#DFF4E4]/70' : 'text-[#0B261C]/55'}`}>
              {product.categoryName || 'Farm Produce'}
            </span>
          </div>
        )}

        {/* Top Left Tag */}
        {(isOutOfStock || product.isOrganic || isLowStock) && (
          <span
            className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-tight backdrop-blur-md ${
              isOutOfStock
                ? 'bg-[#062B1F]/85 text-white border border-white/25'
                : isLowStock
                ? 'bg-[#F4D35E] text-[#062B1F] border border-white/60'
                : 'bg-[#A8E635] text-[#062B1F] border border-white/60'
            }`}
          >
            {isOutOfStock
              ? 'Sold Out'
              : isLowStock
              ? `Low · ${product.quantityAvailable} left`
              : 'Organic'}
          </span>
        )}

        {/* Favorite Button (Buyers) */}
        {user?.role === 'buyer' && (
          <button
            id={`favorite-btn-${product.id}`}
            type="button"
            onClick={handleFavoriteClick}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-md cursor-pointer ${
              isFavorite
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-[#062B1F]/55 hover:bg-[#062B1F]/80 text-white border border-white/25'
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
            <span
              className={`font-bold uppercase tracking-wider truncate ${
                isDark ? 'text-[#A8E635]' : 'text-[#145A38]'
              }`}
            >
              {product.categoryName}
            </span>
            {product.reviewsCount > 0 && (
              <span
                className={`inline-flex items-center gap-1 font-bold shrink-0 tabular-nums ${
                  isDark ? 'text-[#F4D35E]' : 'text-[#0B261C]'
                }`}
              >
                <Star className="w-3 h-3 fill-[#F4D35E] text-[#F4D35E]" />
                {product.rating.toFixed(1)}
                <span className={isDark ? 'text-white/55 font-normal' : 'text-[#0B261C]/50 font-normal'}>
                  ({product.reviewsCount})
                </span>
              </span>
            )}
          </div>

          {/* Product Name */}
          <h3
            className={`font-extrabold text-[15px] leading-snug line-clamp-1 transition-colors ${
              isDark ? 'text-white group-hover:text-[#A8E635]' : 'text-[#062B1F] group-hover:text-[#145A38]'
            }`}
          >
            {product.name}
          </h3>

          {/* Farm Origin & Location */}
          <p
            className={`text-xs flex items-center gap-1.5 truncate ${
              isDark ? 'text-[#DFF4E4]/80' : 'text-[#0B261C]/70'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-[#A8E635]' : 'text-[#145A38]'}`} />
            <span className="truncate">
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#062B1F]'}`}>
                {product.farmName}
              </span>{' '}
              · {product.location.city}
            </span>
          </p>
        </div>

        {/* Price + Availability + Actions */}
        <div
          className={`pt-3 border-t space-y-3 ${
            isDark ? 'border-white/15' : 'border-[#145A38]/12'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="tabular-nums">
              <span
                className={`text-base font-extrabold ${
                  isDark ? 'text-white' : 'text-[#062B1F]'
                }`}
              >
                ${product.price.toFixed(2)}
              </span>
              <span
                className={`text-xs font-medium ${
                  isDark ? 'text-[#DFF4E4]/65' : 'text-[#0B261C]/55'
                }`}
              >
                {' '}
                / {product.unit}
              </span>
            </div>

            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                isOutOfStock
                  ? isDark
                    ? 'bg-white/15 text-white/65'
                    : 'bg-stone-200 text-stone-600'
                  : isLowStock
                  ? 'bg-[#F4D35E] text-[#062B1F]'
                  : 'bg-[#A8E635] text-[#062B1F]'
              }`}
            >
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
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  isOutOfStock
                    ? isDark
                      ? 'bg-white/10 text-white/40 border border-white/15 cursor-not-allowed'
                      : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                    : 'lg-cta-lime text-[#062B1F]'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{isOutOfStock ? 'Unavailable' : 'Add to Cart'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectProduct(product)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  isDark
                    ? 'bg-white/15 hover:bg-white/25 text-white border border-white/25'
                    : 'bg-[#DFF4E4] hover:bg-[#145A38] hover:text-white text-[#062B1F]'
                }`}
              >
                View Details
              </button>
            )}

            {!isOwner && (
              <button
                type="button"
                onClick={handleChatClick}
                className={`p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-white/12 hover:bg-[#A8E635] text-white hover:text-[#062B1F] border border-white/20'
                    : 'bg-white/80 hover:bg-[#145A38] text-[#145A38] hover:text-white border border-[#145A38]/20'
                }`}
                title={product.sellerRole === 'fodder_supplier' ? 'Contact Supplier' : 'Contact Farmer'}
                aria-label={product.sellerRole === 'fodder_supplier' ? 'Contact Supplier' : 'Contact Farmer'}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
};
