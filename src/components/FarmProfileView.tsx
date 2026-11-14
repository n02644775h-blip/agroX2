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
      <div className="py-20 text-center text-xs text-stone-400">
        Loading farm store and catalog...
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-stone-800">Farm not found</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  const profile = farmer.farmerProfile;
  const ratingStats = calculateFarmerRatingStats(reviews);
  const avgRatingDisplay =
    ratingStats.totalRatings > 0 ? ratingStats.averageRating.toFixed(1) : 'New';

  return (
    <div className="space-y-8 pb-16">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-stone-50 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </button>

      {/* Hero Farm Header Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Farm Banner Cover Image */}
        <div className="h-48 sm:h-64 w-full bg-emerald-800 relative">
          <img
            src={
              profile?.bannerImage ||
              'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=1200'
            }
            alt=""
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20"></div>
        </div>

        {/* Profile Details Container */}
        <div className="p-6 sm:p-8 -mt-16 relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              <img
                src={farmer.avatar}
                alt={farmer.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white shadow-xl bg-white"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                    {profile?.farmName || (farmer.role === 'fodder_supplier' ? `${farmer.name}'s Fodder Supply` : `${farmer.name}'s Farm`)}
                  </h1>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    farmer.role === 'fodder_supplier'
                      ? 'bg-amber-100 text-amber-900 border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    <ShieldCheck className={`w-3.5 h-3.5 ${farmer.role === 'fodder_supplier' ? 'text-amber-700' : 'text-emerald-600'}`} />
                    {farmer.role === 'fodder_supplier' ? 'Verified Fodder Supplier' : 'Verified Farm'}
                  </span>
                </div>

                <div className="text-xs text-stone-600 font-medium flex flex-wrap items-center gap-3">
                  <span>{farmer.role === 'fodder_supplier' ? 'Supplier:' : 'Producer:'} <strong>{farmer.name}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    {profile?.address || `${farmer.location.city}, ${farmer.location.province}`}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-600 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {ratingStats.totalRatings > 0
                      ? `${avgRatingDisplay} (${ratingStats.totalRatings} ${ratingStats.totalRatings === 1 ? 'rating' : 'ratings'})`
                      : 'No ratings yet'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              {(user?.id === farmer.id || user?.email === farmer.email || user?.role === 'admin') && (
                <button
                  id="farm-profile-edit-btn"
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-3 rounded-2xl bg-white hover:bg-stone-50 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-2 shadow-xs transition-all"
                >
                  <Edit3 className="w-4 h-4 text-emerald-700" />
                  Edit Farm Profile
                </button>
              )}

              <button
                onClick={() => onContactFarmer(farmer)}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                {farmer.role === 'fodder_supplier' ? 'Contact Supplier Directly' : 'Contact Farm Directly'}
              </button>
            </div>
          </div>

          {/* Bio & Agricultural Specialties */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-stone-100">
            <div className="lg:col-span-2 space-y-3">
              <h3 className="font-bold text-stone-900 text-sm">About Our Farm & Methods</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                {profile?.bio ||
                  'Dedicated to sustainable agriculture and high-yield, organic produce cultivated directly from healthy soils.'}
              </p>

              {profile?.farmingMethods && profile.farmingMethods.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {profile.farmingMethods.map((method, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center gap-1"
                    >
                      <Leaf className="w-3 h-3 text-emerald-600" />
                      {method}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Farm Logistics Card */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-2.5 text-xs text-stone-600">
              <h4 className="font-bold text-stone-900 text-xs uppercase tracking-wider">Farm Information</h4>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Operating Since: <strong>{profile?.establishedYear || 2018}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>Pickup Hours: <strong>Mon - Sat, 7:00 AM - 4:00 PM</strong></span>
              </div>
              {farmer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>Direct Line: <strong>{farmer.phone}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Available Farm Products */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Available from {profile?.farmName || farmer.name}</h2>
            <p className="text-xs text-stone-500">{products.length} current farm listings in stock</p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-xs text-stone-400">
            This farm currently has no active listings.
          </div>
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
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-bold text-stone-900 text-lg">Customer Testimonials &amp; Ratings</h3>
            <p className="text-xs text-stone-500">
              Verified ratings submitted by buyers after completed orders
            </p>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl font-bold text-amber-900 text-sm self-start">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>
              {ratingStats.totalRatings > 0
                ? `${avgRatingDisplay} / 5.0 (${ratingStats.totalRatings})`
                : 'No ratings yet'}
            </span>
          </div>
        </div>

        {ratingStats.totalRatings > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 bg-stone-50 p-4 rounded-2xl border border-stone-200/70">
            {([5, 4, 3, 2, 1] as const).map(star => {
              const count = ratingStats.distribution[star] || 0;
              const pct = Math.round((count / ratingStats.totalRatings) * 100);
              return (
                <div key={star} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold text-stone-700">
                    <span>{star} ★</span>
                    <span className="tabular-nums text-stone-500">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            No completed-order ratings yet for this producer.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map(rev => (
              <div key={rev.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={rev.buyerAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <div>
                      <span className="font-bold text-xs text-stone-900 block">{rev.buyerName}</span>
                      <span className="text-[10px] text-stone-400">{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-amber-800 mt-0.5">
                      {rev.ratingLabel || getRatingLabel(rev.rating)}
                    </span>
                  </div>
                </div>
                {rev.comment ? (
                  <p className="text-xs text-stone-600 leading-relaxed">{rev.comment}</p>
                ) : (
                  <p className="text-[11px] text-stone-400 italic">Rated without written review.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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

