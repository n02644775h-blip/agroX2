import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToFirebaseReviews,
  calculateFarmerRatingStats,
  getRatingLabel
} from '../services/firebaseReviews';
import { User, Product, Review } from '../types';
import { ProductCard } from './ProductCard';
import { FarmerProfileModal } from './FarmerProfileModal';
import { LiquidGlassCard, LiquidGlassButton } from './glass';
import heroPanoramaImg from '../assets/images/hero_farmland_sunrise_1794742072298.jpg';
import {
  MapPin,
  Star,
  ShieldCheck,
  Leaf,
  MessageSquare,
  ArrowLeft,
  Calendar,
  Phone,
  Clock,
  Edit3
} from 'lucide-react';

interface FarmProfileViewProps {
  farmerId: string;
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onContactFarmer: (farmer: User) => void;
}

export const FarmProfileView: React.FC<FarmProfileViewProps> = ({
  farmerId,
  onBack,
  onSelectProduct,
  onContactFarmer
}) => {
  const { user } = useAuth();
  const [farmer, setFarmer] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  const mergeReviews = (incoming: Review[]) => {
    setReviews(prev => {
      const map = new Map<string, Review>();
      prev.forEach(r => map.set(r.id, r));
      incoming.forEach(r => map.set(r.id, r));
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  };

  const loadFarmerStore = async () => {
    setLoading(true);
    try {
      const [userData, prodsData, revsData] = await Promise.all([
        api.getUserById(farmerId),
        api.getProducts({ farmerId }),
        api.getReviews(farmerId).catch(() => [])
      ]);
      setFarmer(userData);
      setProducts(prodsData);
      if (Array.isArray(revsData)) mergeReviews(revsData);
    } catch (err) {
      console.error('Failed to load farm store:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReviews([]);
    loadFarmerStore();

    const unsubReviews = subscribeToFirebaseReviews(
      { farmerId },
      (fbReviews) => {
        mergeReviews(fbReviews);
      }
    );

    return () => {
      unsubReviews();
    };
  }, [farmerId]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-[#0B261C]/55">
        Loading farm store and catalog...
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-extrabold text-[#062B1F]">Farm not found</h2>
        <LiquidGlassButton variant="emerald" size="sm" onClick={onBack}>
          Return to Marketplace
        </LiquidGlassButton>
      </div>
    );
  }

  const profile = farmer.farmerProfile;
  const ratingStats = calculateFarmerRatingStats(reviews);
  const avgRatingDisplay =
    ratingStats.totalRatings > 0 ? ratingStats.averageRating.toFixed(1) : 'New';

  return (
    <div className="space-y-8 pb-16">
      <LiquidGlassButton variant="light" size="xs" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </LiquidGlassButton>

      {/* Hero Farm Header Liquid Glass Card */}
      <LiquidGlassCard variant="light" className="overflow-hidden">
        <div className="h-48 sm:h-64 w-full bg-[#062B1F] relative">
          <img
            src={profile?.bannerImage || heroPanoramaImg}
            alt=""
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#062B1F]/80 via-transparent to-[#062B1F]/25" />
        </div>

        <div className="p-6 sm:p-8 -mt-16 relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              <img
                src={farmer.avatar}
                alt={farmer.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white shadow-xl bg-white"
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#062B1F] tracking-tight">
                    {profile?.farmName || (farmer.role === 'fodder_supplier' ? `${farmer.name}'s Fodder Supply` : `${farmer.name}'s Farm`)}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-extrabold border ${
                      farmer.role === 'fodder_supplier'
                        ? 'bg-[#F4D35E] text-[#062B1F] border-white/60'
                        : 'bg-[#A8E635] text-[#062B1F] border-white/60'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {farmer.role === 'fodder_supplier' ? 'Verified Fodder Supplier' : 'Verified Farm'}
                  </span>
                </div>

                <div className="text-xs text-[#0B261C]/75 font-medium flex flex-wrap items-center gap-3">
                  <span>
                    {farmer.role === 'fodder_supplier' ? 'Supplier:' : 'Producer:'}{' '}
                    <strong className="text-[#062B1F]">{farmer.name}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#145A38]" />
                    {profile?.address || `${farmer.location.city}, ${farmer.location.province}`}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[#062B1F] font-extrabold tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-[#F4D35E] text-[#F4D35E]" />
                    {ratingStats.totalRatings > 0
                      ? `${avgRatingDisplay} (${ratingStats.totalRatings} ${ratingStats.totalRatings === 1 ? 'rating' : 'ratings'})`
                      : 'No ratings yet'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {(user?.id === farmer.id || user?.email === farmer.email || user?.role === 'admin') && (
                <LiquidGlassButton
                  id="farm-profile-edit-btn"
                  variant="light"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit3 className="w-4 h-4 text-[#145A38]" />
                  Edit Farm Profile
                </LiquidGlassButton>
              )}

              <LiquidGlassButton
                variant="emerald"
                size="md"
                onClick={() => onContactFarmer(farmer)}
              >
                <MessageSquare className="w-4 h-4" />
                {farmer.role === 'fodder_supplier' ? 'Contact Supplier Directly' : 'Contact Farm Directly'}
              </LiquidGlassButton>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-[#145A38]/12">
            <div className="lg:col-span-2 space-y-3">
              <h3 className="font-extrabold text-[#062B1F] text-sm">About Our Farm &amp; Methods</h3>
              <p className="text-xs sm:text-sm text-[#0B261C]/75 leading-relaxed">
                {profile?.bio ||
                  'Dedicated to sustainable agriculture and high-yield produce cultivated directly from healthy soils.'}
              </p>

              {profile?.farmingMethods && profile.farmingMethods.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {profile.farmingMethods.map((method, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-xs font-bold bg-[#DFF4E4] text-[#062B1F] border border-[#145A38]/15 flex items-center gap-1"
                    >
                      <Leaf className="w-3 h-3 text-[#145A38]" />
                      {method}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="lg-glass-mint p-4 rounded-2xl border border-[#145A38]/15 space-y-2.5 text-xs text-[#0B261C]/80">
              <h4 className="font-extrabold text-[#062B1F] text-xs uppercase tracking-wider">Farm Information</h4>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#145A38]" />
                <span>Operating Since: <strong className="tabular-nums">{profile?.establishedYear || 2018}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#145A38]" />
                <span>Pickup Hours: <strong>Mon - Sat, 7:00 AM - 4:00 PM</strong></span>
              </div>
              {farmer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#145A38]" />
                  <span>Direct Line: <strong>{farmer.phone}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Available Farm Products */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#062B1F]">Available from {profile?.farmName || farmer.name}</h2>
          <p className="text-xs text-[#0B261C]/65 tabular-nums">{products.length} current farm listings in stock</p>
        </div>

        {products.length === 0 ? (
          <LiquidGlassCard variant="light" className="p-8 text-center text-xs text-[#0B261C]/55">
            This farm currently has no active listings.
          </LiquidGlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectProduct={onSelectProduct}
                onContactFarmer={() => onContactFarmer(farmer)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Farm Customer Reviews & Rating Distribution */}
      <LiquidGlassCard variant="light" className="p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#145A38]/12 pb-4">
          <div>
            <h3 className="font-extrabold text-[#062B1F] text-lg">Customer Testimonials &amp; Ratings</h3>
            <p className="text-xs text-[#0B261C]/65">
              Verified ratings submitted by buyers after completed orders
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#F4D35E]/30 border border-[#F4D35E]/60 px-3.5 py-2 rounded-2xl font-extrabold text-[#062B1F] text-sm self-start tabular-nums">
            <Star className="w-4 h-4 fill-[#F4D35E] text-[#F4D35E]" />
            <span>
              {ratingStats.totalRatings > 0
                ? `${avgRatingDisplay} / 5.0 (${ratingStats.totalRatings})`
                : 'No ratings yet'}
            </span>
          </div>
        </div>

        {ratingStats.totalRatings > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 lg-glass-mint p-4 rounded-2xl border border-[#145A38]/12">
            {([5, 4, 3, 2, 1] as const).map(star => {
              const count = ratingStats.distribution[star] || 0;
              const pct = Math.round((count / ratingStats.totalRatings) * 100);
              return (
                <div key={star} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#062B1F]">
                    <span>{star} ★</span>
                    <span className="tabular-nums text-[#145A38]">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/80 overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-[#A8E635] to-[#145A38] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#0B261C]/55">
            No completed-order ratings yet for this producer.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map(rev => (
              <div key={rev.id} className="p-4 rounded-2xl bg-white/80 border border-[#145A38]/12 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={rev.buyerAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <div>
                      <span className="font-bold text-xs text-[#062B1F] block">{rev.buyerName}</span>
                      <span className="text-[10px] text-[#0B261C]/50">{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < rev.rating ? 'fill-[#F4D35E] text-[#F4D35E]' : 'text-stone-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-[#145A38] mt-0.5">
                      {rev.ratingLabel || getRatingLabel(rev.rating)}
                    </span>
                  </div>
                </div>
                {rev.comment ? (
                  <p className="text-xs text-[#0B261C]/75 leading-relaxed">{rev.comment}</p>
                ) : (
                  <p className="text-[11px] text-[#0B261C]/45 italic">Rated without written review.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </LiquidGlassCard>

      {showEditModal && (
        <FarmerProfileModal
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            loadFarmerStore();
          }}
        />
      )}
    </div>
  );
};
