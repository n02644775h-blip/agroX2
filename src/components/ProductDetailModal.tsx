import React, { useState, useEffect } from 'react';
import { Product, Review } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import {
  X,
  MapPin,
  Star,
  Leaf,
  ShieldCheck,
  Calendar,
  Clock,
  MessageSquare,
  ShoppingBag,
  Heart,
  Flag,
  ChevronRight,
  Truck,
  Share2,
  Info,
  Check
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onSelectFarmer: (farmerId: string) => void;
  onContactFarmer: (product: Product) => void;
  onReportProduct: (product: Product) => void;
  onSelectRelatedProduct: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onSelectFarmer,
  onContactFarmer,
  onReportProduct,
  onSelectRelatedProduct
}) => {
  const { user, favorites, toggleFavorite } = useAuth();
  const { addToCart } = useCart();
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (product) {
      setSelectedImage(product.images[0] || '');
      setQuantity(product.minOrderQuantity || 1);

      setLoadingReviews(true);
      api
        .getReviews(product.farmerId, product.id)
        .then((res) => setReviews(res))
        .catch((err) => console.error('Failed to load reviews:', err))
        .finally(() => setLoadingReviews(false));

      api
        .getProducts({ category: product.category })
        .then((res) => setRelatedProducts(res.filter((p) => p.id !== product.id).slice(0, 3)))
        .catch(() => {});
    }
  }, [product]);

  if (!product) return null;

  const isFavorite = favorites.includes(product.id);
  const isOutOfStock = product.availability === 'out_of_stock' || product.quantityAvailable <= 0;
  const isLowStock =
    product.availability === 'low_stock' ||
    (product.quantityAvailable > 0 && product.quantityAvailable <= 10);
  const maxAvailable = product.quantityAvailable;
  const subtotal = product.price * quantity;

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <LiquidGlassModal
      id="product-detail-dialog"
      isOpen={!!product}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      hideHeader
    >
      {/* Top Frosted Forest Header Bar */}
      <div className="sticky top-0 bg-[#062B1F]/92 backdrop-blur-2xl px-5 sm:px-6 py-3.5 border-b border-white/15 flex items-center justify-between z-20 text-white">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-[#062B1F] bg-[#A8E635] px-3 py-1 rounded-full uppercase tracking-wider">
            {product.categoryName}
          </span>
          {product.isOrganic && (
            <span className="text-[11px] font-bold text-[#DFF4E4] bg-white/12 border border-white/25 px-3 py-1 rounded-full flex items-center gap-1">
              <Leaf className="w-3 h-3 text-[#A8E635]" />
              Organic Certified
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#DFF4E4] hover:text-white transition-colors cursor-pointer"
            title={copied ? 'Copied link' : 'Share listing'}
            aria-label="Share listing"
          >
            {copied ? <Check className="w-4 h-4 text-[#A8E635]" /> : <Share2 className="w-4 h-4" />}
          </button>

          {user?.role === 'buyer' && (
            <button
              type="button"
              onClick={() => toggleFavorite(product.id)}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isFavorite ? 'text-rose-400 bg-rose-500/20' : 'bg-white/10 text-[#DFF4E4] hover:bg-white/20'
              }`}
              title="Save product"
              aria-label="Save product"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => onReportProduct(product)}
            className="p-2 rounded-full bg-white/10 text-[#DFF4E4]/70 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
            title="Report inappropriate listing"
            aria-label="Report listing"
          >
            <Flag className="w-4 h-4" />
          </button>

          <button
            id="close-product-detail-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/12 hover:bg-white/25 text-white transition-colors ml-1 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="p-4 sm:p-7 space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7">
          {/* Gallery Column */}
          <div className="space-y-3">
            <div className="aspect-4/3 rounded-3xl overflow-hidden bg-[#0B3D2B]/10 border border-white/80 shadow-lg">
              <img
                src={selectedImage || product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 rounded-2xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                      selectedImage === img
                        ? 'border-[#145A38] ring-2 ring-[#A8E635]/60'
                        : 'border-white/70 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="bg-white/75 backdrop-blur-md rounded-2xl p-4 border border-[#0B3D2B]/12 space-y-2 text-xs text-[#2B4338]">
              <div className="flex items-center gap-2 font-bold text-[#062B1F]">
                <Truck className="w-4 h-4 text-[#145A38] shrink-0" />
                <span>Available for Farm Pickup or Local AgriDelivery</span>
              </div>
              {product.harvestDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#145A38]/70 shrink-0" />
                  <span>
                    Harvest Date:{' '}
                    <strong className="text-[#062B1F]">
                      {new Date(product.harvestDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </strong>
                  </span>
                </div>
              )}
              {product.expiryDate && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#145A38]/70 shrink-0" />
                  <span>
                    Best Before:{' '}
                    <strong className="text-[#062B1F]">
                      {new Date(product.expiryDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Product Meta Column */}
          <div className="flex flex-col justify-between space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B1F] tracking-tight leading-tight">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs">
                <div className="flex items-center gap-1 text-[#B48A18]">
                  <Star className="w-4 h-4 fill-[#F4D35E] text-[#F4D35E]" />
                  <span className="font-extrabold text-[#062B1F] tabular-nums">{product.rating.toFixed(1)}</span>
                </div>
                <span className="text-[#2B4338]/40">•</span>
                <span className="text-[#2B4338] tabular-nums">{product.reviewsCount} customer reviews</span>
                <span className="text-[#2B4338]/40">•</span>
                <span className="text-[#145A38] font-bold">
                  {product.location.city}, {product.location.province}
                </span>
              </div>

              {/* Price Glass Strip */}
              <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-[#062B1F] text-white flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shadow-md">
                <div>
                  <div className="text-2xl sm:text-3xl font-extrabold tabular-nums">
                    ${product.price.toFixed(2)}
                    <span className="text-xs sm:text-sm font-medium text-[#DFF4E4]/75 ml-1">/ {product.unit}</span>
                  </div>
                  <div className="text-[11px] text-[#DFF4E4]/80 font-medium mt-0.5">
                    Direct from{' '}
                    {product.sellerRole === 'fodder_supplier' || product.category === 'cat-fodder'
                      ? 'fodder supplier'
                      : 'farmer'}{' '}
                    • No middleman surcharge
                  </div>
                </div>

                <div>
                  {isOutOfStock ? (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-white/80">
                      Out of Stock
                    </span>
                  ) : isLowStock ? (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-[#F4D35E] text-[#062B1F] tabular-nums">
                      Only {product.quantityAvailable} {product.unit} left!
                    </span>
                  ) : (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-[#A8E635] text-[#062B1F] tabular-nums">
                      In Stock ({product.quantityAvailable} {product.unit})
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-[11px] font-extrabold uppercase text-[#145A38] tracking-widest mb-1.5">
                  Description
                </h3>
                <p className="text-sm text-[#2B4338] leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {product.additionalNotes && (
                <div className="mt-3 p-3.5 rounded-2xl bg-[#F4D35E]/20 border border-[#F4D35E]/45 text-xs text-[#062B1F] flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#B48A18] shrink-0 mt-0.5" />
                  <span>
                    <strong>Farmer Notes:</strong> {product.additionalNotes}
                  </span>
                </div>
              )}
            </div>

            {/* Purchase / Quantity Controls */}
            <div className="pt-4 border-t border-[#0B3D2B]/12 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div>
                  <label className="text-xs font-bold text-[#2B4338] block mb-1">
                    Quantity ({product.unit}):
                  </label>
                  <div className="flex items-center border border-[#0B3D2B]/20 rounded-xl bg-white overflow-hidden w-36">
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.max(product.minOrderQuantity || 1, prev - 1))}
                      disabled={quantity <= (product.minOrderQuantity || 1) || isOutOfStock}
                      className="px-3 py-2 text-[#062B1F] hover:bg-[#DFF4E4] disabled:opacity-40 transition-colors font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={product.minOrderQuantity || 1}
                      max={maxAvailable}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setQuantity(Math.min(maxAvailable, Math.max(product.minOrderQuantity || 1, val)));
                        }
                      }}
                      disabled={isOutOfStock}
                      className="w-full text-center font-extrabold text-sm text-[#062B1F] bg-transparent focus:outline-none tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => Math.min(maxAvailable, prev + 1))}
                      disabled={quantity >= maxAvailable || isOutOfStock}
                      className="px-3 py-2 text-[#062B1F] hover:bg-[#DFF4E4] disabled:opacity-40 transition-colors font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-[#2B4338]">Order Subtotal</div>
                  <div className="text-2xl font-extrabold text-[#145A38] tabular-nums">
                    ${subtotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {product.minOrderQuantity > 1 && (
                <div className="text-[11px] text-[#2B4338] tabular-nums">
                  Minimum order requirement: {product.minOrderQuantity} {product.unit}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {user?.id === product.farmerId ? (
                  <LiquidGlassButton
                    id="product-contact-farmer-btn"
                    variant="light"
                    size="md"
                    onClick={() => onSelectFarmer(product.farmerId)}
                    className="w-full"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#145A38]" />
                    <span>Your Listing • View Store</span>
                  </LiquidGlassButton>
                ) : (
                  <LiquidGlassButton
                    id="product-contact-farmer-btn"
                    variant="light"
                    size="md"
                    onClick={() => onContactFarmer(product)}
                    className="w-full"
                  >
                    <MessageSquare className="w-4 h-4 text-[#145A38]" />
                    <span>
                      {product.sellerRole === 'fodder_supplier' || product.category === 'cat-fodder'
                        ? 'Contact Fodder Supplier'
                        : 'Contact Farmer'}
                    </span>
                  </LiquidGlassButton>
                )}

                <LiquidGlassButton
                  id="product-add-to-cart-btn"
                  variant="lime"
                  size="md"
                  onClick={() => {
                    addToCart(product, quantity);
                    onClose();
                  }}
                  disabled={isOutOfStock}
                  className="w-full shadow-lg"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isOutOfStock ? 'Currently Unavailable' : `Add ${quantity} ${product.unit} to Cart`}</span>
                </LiquidGlassButton>
              </div>
            </div>
          </div>
        </div>

        {/* Farmer Profile Card */}
        <div className="p-5 rounded-3xl bg-[#062B1F] text-white border border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={product.farmerAvatar}
              alt={product.farmerName}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-[#A8E635]/60 shrink-0"
            />
            <div>
              <div className="flex items-center gap-1.5 font-extrabold text-white text-base">
                <span>{product.farmName}</span>
                <span
                  title={
                    product.sellerRole === 'fodder_supplier' ? 'Verified Fodder Supplier' : 'Verified Producer'
                  }
                >
                  <ShieldCheck className="w-4 h-4 text-[#A8E635]" />
                </span>
              </div>
              <div className="text-xs text-[#DFF4E4]/80">
                {product.sellerRole === 'fodder_supplier' || product.category === 'cat-fodder'
                  ? 'Supplied by'
                  : 'Produced by'}{' '}
                {product.farmerName}
              </div>
              <div className="text-xs text-[#DFF4E4]/70 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-[#A8E635]" />
                {product.location.community ? `${product.location.community}, ` : ''}
                {product.location.city}, {product.location.province}
              </div>
            </div>
          </div>

          <LiquidGlassButton
            id="view-farmer-profile-btn"
            variant="lime"
            size="sm"
            onClick={() => onSelectFarmer(product.farmerId)}
          >
            <span>View Full Farm Store</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </LiquidGlassButton>
        </div>

        {/* Customer Reviews Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-[#0B3D2B]/12 pb-3">
            <div>
              <h3 className="font-extrabold text-[#062B1F] text-lg">Verified Customer Reviews</h3>
              <p className="text-xs text-[#2B4338]">From buyers who ordered directly from this farmer</p>
            </div>
            <div className="flex items-center gap-1.5 bg-[#F4D35E]/25 border border-[#F4D35E]/50 px-3 py-1.5 rounded-xl text-[#062B1F] font-extrabold text-sm tabular-nums">
              <Star className="w-4 h-4 fill-[#F4D35E] text-[#F4D35E]" />
              {product.rating.toFixed(1)} / 5.0
            </div>
          </div>

          {loadingReviews ? (
            <div className="py-6 text-center text-xs text-[#2B4338]">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#2B4338] bg-white/75 rounded-2xl border border-[#0B3D2B]/10">
              No reviews yet for this listing. Be the first to order and review!
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-[#0B3D2B]/12 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={rev.buyerAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <span className="font-bold text-xs text-[#062B1F] block">{rev.buyerName}</span>
                        <span className="text-[10px] text-[#2B4338]/70">
                          {new Date(rev.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < rev.rating ? 'fill-[#F4D35E] text-[#F4D35E]' : 'text-[#0B3D2B]/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-[#2B4338] leading-relaxed">{rev.comment}</p>
                  {rev.farmerResponse && (
                    <div className="mt-2 pl-3 border-l-2 border-[#145A38] text-xs text-[#2B4338] bg-[#DFF4E4]/55 p-2.5 rounded-r-xl">
                      <span className="font-bold text-[#062B1F] block text-[11px]">Farmer Response:</span>
                      {rev.farmerResponse}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="pt-4 border-t border-[#0B3D2B]/12 space-y-3">
            <h3 className="font-extrabold text-[#062B1F] text-base">More from {product.categoryName}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedProducts.map((rel) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => onSelectRelatedProduct(rel)}
                  className="p-3 rounded-2xl border border-[#0B3D2B]/14 hover:border-[#145A38] bg-white/85 hover:shadow-md transition-all cursor-pointer flex gap-3 items-center text-left"
                >
                  <img
                    src={rel.images[0]}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover bg-[#DFF4E4] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-[#062B1F] truncate">{rel.name}</div>
                    <div className="text-[11px] text-[#145A38] font-extrabold mt-0.5 tabular-nums">
                      ${rel.price.toFixed(2)} / {rel.unit}
                    </div>
                    <div className="text-[10px] text-[#2B4338] truncate">{rel.farmName}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </LiquidGlassModal>
  );
};
