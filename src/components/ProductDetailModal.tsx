import React, { useState, useEffect } from 'react';
import { Product, Review } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
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
  CheckCircle2,
  AlertCircle,
  Share2,
  Info
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

      // Load reviews
      setLoadingReviews(true);
      api.getReviews(product.farmerId, product.id)
        .then(res => setReviews(res))
        .catch(err => console.error('Failed to load reviews:', err))
        .finally(() => setLoadingReviews(false));

      // Load related products
      api.getProducts({ category: product.category })
        .then(res => setRelatedProducts(res.filter(p => p.id !== product.id).slice(0, 3)))
        .catch(() => {});
    }
  }, [product]);

  if (!product) return null;

  const isFavorite = favorites.includes(product.id);
  const isOutOfStock = product.availability === 'out_of_stock' || product.quantityAvailable <= 0;
  const isLowStock = product.availability === 'low_stock' || (product.quantityAvailable > 0 && product.quantityAvailable <= 10);
  const maxAvailable = product.quantityAvailable;
  const subtotal = product.price * quantity;

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        id="product-detail-dialog"
        className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-6 border border-stone-200 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-stone-200 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {product.categoryName}
            </span>
            {product.isOrganic && (
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-600" />
                Organic Certified
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full text-stone-600 hover:bg-stone-100 transition-colors"
              title="Share listing"
              aria-label="Share listing"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {user?.role === 'buyer' && (
              <button
                onClick={() => toggleFavorite(product.id)}
                className={`p-2 rounded-full transition-colors ${
                  isFavorite ? 'text-rose-500 bg-rose-50' : 'text-stone-600 hover:bg-stone-100'
                }`}
                title="Save product"
                aria-label="Save product"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            )}

            <button
              onClick={() => onReportProduct(product)}
              className="p-2 rounded-full text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Report inappropriate listing"
              aria-label="Report listing"
            >
              <Flag className="w-4 h-4" />
            </button>

            <button
              id="close-product-detail-btn"
              onClick={onClose}
              className="p-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8 flex-1">
          {/* Main Grid: Gallery & Key Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Gallery Column */}
            <div className="space-y-3">
              <div className="aspect-4/3 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
                <img
                  src={selectedImage || product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(img)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        selectedImage === img ? 'border-emerald-600 ring-2 ring-emerald-600/30' : 'border-stone-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Freshness & Logistics Badge Box */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-2.5 text-xs text-stone-600">
                <div className="flex items-center gap-2 font-medium text-stone-800">
                  <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Available for Farm Pickup or Local AgriDelivery</span>
                </div>
                {product.harvestDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
                    <span>Harvest Date: <strong className="text-stone-900">{new Date(product.harvestDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong></span>
                  </div>
                )}
                {product.expiryDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                    <span>Best Before: <strong className="text-stone-900">{new Date(product.expiryDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Meta Column */}
            <div className="flex flex-col justify-between space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight leading-tight">
                  {product.name}
                </h1>

                {/* Rating & Reviews overview */}
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-stone-900">{product.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-stone-400">•</span>
                  <span className="text-stone-600">{product.reviewsCount} customer reviews</span>
                  <span className="text-stone-400">•</span>
                  <span className="text-emerald-700 font-medium">{product.location.city}, {product.location.province}</span>
                </div>

                {/* Price Display */}
                <div className="mt-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-baseline justify-between">
                  <div>
                    <div className="text-3xl font-extrabold text-stone-900">
                      ${product.price.toFixed(2)}
                      <span className="text-sm font-semibold text-stone-600 ml-1">/ {product.unit}</span>
                    </div>
                    <div className="text-xs text-emerald-800 font-medium mt-0.5">
                      Direct from farmer • No middleman surcharge
                    </div>
                  </div>

                  <div className="text-right">
                    {isOutOfStock ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-stone-200 text-stone-700">
                        Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                        Only {product.quantityAvailable} {product.unit} left!
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900">
                        In Stock ({product.quantityAvailable} {product.unit})
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase text-stone-400 tracking-wider mb-1.5">Description</h3>
                  <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>

                {product.additionalNotes && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>Farmer Notes:</strong> {product.additionalNotes}</span>
                  </div>
                )}
              </div>

              {/* Purchase / Quantity Controls */}
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">
                      Quantity ({product.unit}):
                    </label>
                    <div className="flex items-center border border-stone-300 rounded-xl bg-stone-50 overflow-hidden w-36">
                      <button
                        onClick={() => setQuantity(prev => Math.max(product.minOrderQuantity || 1, prev - 1))}
                        disabled={quantity <= (product.minOrderQuantity || 1) || isOutOfStock}
                        className="px-3 py-2 text-stone-700 hover:bg-stone-200 disabled:opacity-40 transition-colors font-bold"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={product.minOrderQuantity || 1}
                        max={maxAvailable}
                        value={quantity}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setQuantity(Math.min(maxAvailable, Math.max(product.minOrderQuantity || 1, val)));
                          }
                        }}
                        disabled={isOutOfStock}
                        className="w-full text-center font-bold text-sm bg-transparent focus:outline-none"
                      />
                      <button
                        onClick={() => setQuantity(prev => Math.min(maxAvailable, prev + 1))}
                        disabled={quantity >= maxAvailable || isOutOfStock}
                        className="px-3 py-2 text-stone-700 hover:bg-stone-200 disabled:opacity-40 transition-colors font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-stone-500">Order Subtotal</div>
                    <div className="text-2xl font-bold text-emerald-800">${subtotal.toFixed(2)}</div>
                  </div>
                </div>

                {product.minOrderQuantity > 1 && (
                  <div className="text-[11px] text-stone-500">
                    Minimum order requirement: {product.minOrderQuantity} {product.unit}
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    id="product-contact-farmer-btn"
                    onClick={() => onContactFarmer(product)}
                    className="w-full py-3 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-800 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    Contact Farmer
                  </button>

                  <button
                    id="product-add-to-cart-btn"
                    onClick={() => {
                      addToCart(product, quantity);
                      onClose();
                    }}
                    disabled={isOutOfStock}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {isOutOfStock ? 'Currently Unavailable' : `Add ${quantity} ${product.unit} to Cart`}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Farmer Profile Card */}
          <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={product.farmerAvatar}
                alt={product.farmerName}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-xs"
              />
              <div>
                <div className="flex items-center gap-1.5 font-bold text-stone-900 text-base">
                  <span>{product.farmName}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" title="Verified Producer" />
                </div>
                <div className="text-xs text-stone-600">Produced by {product.farmerName}</div>
                <div className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-stone-400" />
                  {product.location.community ? `${product.location.community}, ` : ''}{product.location.city}, {product.location.province}
                </div>
              </div>
            </div>

            <button
              id="view-farmer-profile-btn"
              onClick={() => onSelectFarmer(product.farmerId)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/80 transition-colors flex items-center gap-1 shrink-0"
            >
              View Full Farm Store
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Customer Reviews Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 text-lg">Verified Customer Reviews</h3>
                <p className="text-xs text-stone-500">From buyers who ordered directly from this farmer</p>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl text-amber-900 font-bold text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {product.rating.toFixed(1)} / 5.0
              </div>
            </div>

            {loadingReviews ? (
              <div className="py-6 text-center text-xs text-stone-400">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl">
                No reviews yet for this listing. Be the first to order and review!
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(rev => (
                  <div key={rev.id} className="p-4 rounded-xl bg-stone-50/70 border border-stone-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={rev.buyerAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <span className="font-semibold text-xs text-stone-900 block">{rev.buyerName}</span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(rev.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">{rev.comment}</p>
                    {rev.farmerResponse && (
                      <div className="mt-2 pl-3 border-l-2 border-emerald-500 text-xs text-stone-600 bg-emerald-50/50 p-2 rounded-r-lg">
                        <span className="font-semibold text-emerald-800 block text-[11px]">Farmer Response:</span>
                        {rev.farmerResponse}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Products Carousel */}
          {relatedProducts.length > 0 && (
            <div className="pt-4 border-t border-stone-200 space-y-3">
              <h3 className="font-bold text-stone-900 text-base">More from {product.categoryName}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {relatedProducts.map(rel => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectRelatedProduct(rel)}
                    className="p-3 rounded-xl border border-stone-200 hover:border-emerald-500 bg-white hover:shadow-md transition-all cursor-pointer flex gap-3 items-center"
                  >
                    <img src={rel.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover bg-stone-100 shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold text-xs text-stone-900 truncate">{rel.name}</div>
                      <div className="text-[11px] text-emerald-700 font-bold mt-0.5">${rel.price.toFixed(2)} / {rel.unit}</div>
                      <div className="text-[10px] text-stone-400 truncate">{rel.farmName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
