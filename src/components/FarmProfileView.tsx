import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Product, Review } from '../types';
import { ProductCard } from './ProductCard';
import {
  MapPin,
  Star,
  ShieldCheck,
  Leaf,
  MessageSquare,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  Sparkles
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
  const [farmer, setFarmer] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadFarmerStore = async () => {
      setLoading(true);
      try {
        const [userData, prodsData, revsData] = await Promise.all([
          api.getUserById(farmerId),
          api.getProducts({ farmerId }),
          api.getReviews(farmerId)
        ]);
        setFarmer(userData);
        setProducts(prodsData);
        setReviews(revsData);
      } catch (err) {
        console.error('Failed to load farm store:', err);
      } finally {
        setLoading(false);
      }
    };
    loadFarmerStore();
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
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : (profile?.rating || 4.9).toFixed(1);

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
                    {profile?.farmName || `${farmer.name}'s Farm`}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Farm
                  </span>
                </div>

                <div className="text-xs text-stone-600 font-medium flex flex-wrap items-center gap-3">
                  <span>Producer: <strong>{farmer.name}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    {profile?.address || `${farmer.location.city}, ${farmer.location.province}`}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {avgRating} ({reviews.length} reviews)
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onContactFarmer(farmer)}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
              Contact Farm Directly
            </button>
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Farm Customer Reviews */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-bold text-stone-900 text-lg">Customer Testimonials & Ratings</h3>
            <p className="text-xs text-stone-500">Verified reviews from direct buyers</p>
          </div>
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-bold text-amber-900 text-sm">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            {avgRating} / 5.0
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400">
            No reviews yet for this farm.
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
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
