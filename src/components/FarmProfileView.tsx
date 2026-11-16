import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToFirebaseReviews,
  calculateFarmerRatingStats,
  getRatingLabel
} from '../services/firebaseReviews';
import {
  subscribeToFirebasePosts,
  toggleFirebasePostLike,
  incrementFirebasePostQuote
} from '../services/firebasePosts';
import { User, Product, Review, MediaPost } from '../types';
import { ProductCard } from './ProductCard';
import { FarmerProfileModal } from './FarmerProfileModal';
import { FarmerPostsTab } from './FarmerPostsTab';
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
  Edit3,
  Heart,
  MessageSquareQuote,
  Tag,
  Sparkles,
  Sprout
} from 'lucide-react';

interface FarmProfileViewProps {
  farmerId: string;
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onContactFarmer: (farmer: User) => void;
  onRequestQuote?: (post: MediaPost) => void;
}

export const FarmProfileView: React.FC<FarmProfileViewProps> = ({
  farmerId,
  onBack,
  onSelectProduct,
  onContactFarmer,
  onRequestQuote
}) => {
  const { user } = useAuth();
  const [farmer, setFarmer] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [postsLoading, setPostsLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  const apiPostsRef = useRef<MediaPost[]>([]);
  const fsPostsRef = useRef<MediaPost[] | null>(null);
  const deletedPostIdsRef = useRef<Set<string>>(new Set());

  const reconcilePosts = () => {
    const map = new Map<string, MediaPost>();
    for (const p of apiPostsRef.current) {
      if (p.farmerId === farmerId && !deletedPostIdsRef.current.has(p.id)) {
        map.set(p.id, p);
      }
    }
    if (fsPostsRef.current !== null) {
      for (const p of fsPostsRef.current) {
        if (p.farmerId === farmerId && !deletedPostIdsRef.current.has(p.id)) {
          map.set(p.id, p);
        }
      }
    }
    setPosts(
      Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
  };

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
      const [userResult, prodsResult, revsResult] = await Promise.allSettled([
        api.getUserById(farmerId),
        api.getProducts({ farmerId }),
        api.getReviews(farmerId)
      ]);

      let resolvedUser: User | null =
        userResult.status === 'fulfilled' && userResult.value ? userResult.value : null;

      if (!resolvedUser) {
        try {
          const snap = await getDoc(doc(db, 'users', farmerId));
          if (snap.exists()) {
            const d = snap.data() as any;
            resolvedUser = {
              id: d.uid || snap.id,
              name: d.fullName || d.name || 'Local Farmer',
              email: d.email || '',
              phone: d.phone || '',
              role: d.role || 'farmer',
              avatar:
                d.avatar ||
                'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
              location: d.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
              status: d.status || 'active',
              createdAt:
                typeof d.createdAt === 'string'
                  ? d.createdAt
                  : d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
              farmerProfile: d.farmerProfile
            };
          }
        } catch (fsErr) {
          console.warn('Firestore user lookup fallback failed:', fsErr);
        }
      }

      if (!resolvedUser && user && user.id === farmerId) {
        resolvedUser = user;
      }

      setFarmer(resolvedUser);
      setProducts(prodsResult.status === 'fulfilled' && Array.isArray(prodsResult.value) ? prodsResult.value : []);
      if (revsResult.status === 'fulfilled' && Array.isArray(revsResult.value)) {
        mergeReviews(revsResult.value);
      }
    } catch (err) {
      console.error('Failed to load farm store:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setReviews([]);
    setPosts([]);
    setPostsLoading(true);
    apiPostsRef.current = [];
    fsPostsRef.current = null;
    deletedPostIdsRef.current.clear();

    loadFarmerStore();

    api
      .getMediaPosts(farmerId)
      .then(list => {
        if (active && Array.isArray(list)) {
          apiPostsRef.current = list;
          reconcilePosts();
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setPostsLoading(false);
      });

    const unsubPosts = subscribeToFirebasePosts(
      farmerId,
      fsPosts => {
        if (!active) return;
        const prevIds = new Set<string>((fsPostsRef.current || []).map(p => p.id));
        const nextIds = new Set<string>(fsPosts.map(p => p.id));
        prevIds.forEach((id: string) => {
          if (!nextIds.has(id)) deletedPostIdsRef.current.add(id);
        });
        fsPosts.forEach(p => deletedPostIdsRef.current.delete(p.id));
        fsPostsRef.current = fsPosts;
        reconcilePosts();
        setPostsLoading(false);
      },
      () => {
        if (active) setPostsLoading(false);
      }
    );

    const unsubReviews = subscribeToFirebaseReviews(
      { farmerId },
      fbReviews => {
        mergeReviews(fbReviews);
      }
    );

    return () => {
      active = false;
      unsubPosts();
      unsubReviews();
    };
  }, [farmerId]);

  const handleTogglePostLike = async (post: MediaPost) => {
    const actorId = user?.id || 'guest-browser';
    const alreadyLiked = (post.likedBy || []).includes(actorId);
    const nextLikedBy = alreadyLiked
      ? (post.likedBy || []).filter(id => id !== actorId)
      : [...(post.likedBy || []), actorId];

    const updatedPost: MediaPost = {
      ...post,
      likedBy: nextLikedBy,
      likesCount: nextLikedBy.length
    };
    setPosts(prev => prev.map(p => (p.id === post.id ? updatedPost : p)));
    try {
      await api.toggleMediaPostLike(post.id, actorId).catch(() => {});
      await toggleFirebasePostLike(post.id, actorId, post.likedBy || []);
    } catch {
      // ignore non-fatal sync error
    }
  };

  const handleQuoteFromPost = async (post: MediaPost) => {
    try {
      await api.recordMediaPostQuote(post.id, user?.id || 'guest', user?.name || 'Marketplace Buyer').catch(() => {});
      await incrementFirebasePostQuote(post.id);
    } catch {
      // ignore
    }
    if (onRequestQuote) {
      onRequestQuote(post);
    } else if (farmer) {
      onContactFarmer(farmer);
    }
  };

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
  const isOwner = Boolean(
    user && (user.id === farmer.id || (user.email && user.email === farmer.email) || user.role === 'admin')
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      <LiquidGlassButton variant="light" size="xs" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        Back to Marketplace
      </LiquidGlassButton>

      {/* Hero Farm Header Liquid Glass Card */}
      <LiquidGlassCard variant="light" className="overflow-hidden">
        <div className="h-36 sm:h-64 w-full bg-[#062B1F] relative">
          <img
            src={profile?.bannerImage || heroPanoramaImg}
            alt=""
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#062B1F]/80 via-transparent to-[#062B1F]/25" />
        </div>

        <div className="p-4 sm:p-8 -mt-12 sm:-mt-16 relative z-10 space-y-5 sm:space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3.5 sm:gap-5 min-w-0">
              <img
                src={farmer.avatar}
                alt={farmer.name}
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl object-cover border-4 border-white shadow-xl bg-white shrink-0"
              />
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-3xl font-extrabold text-[#062B1F] tracking-tight break-words">
                    {profile?.farmName || (farmer.role === 'fodder_supplier' ? `${farmer.name}'s Fodder Supply` : `${farmer.name}'s Farm`)}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-extrabold border ${
                      farmer.role === 'fodder_supplier'
                        ? 'bg-[#F4D35E] text-[#062B1F] border-white/60'
                        : 'bg-[#A8E635] text-[#062B1F] border-white/60'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    {farmer.role === 'fodder_supplier' ? 'Verified Fodder Supplier' : 'Verified Farm'}
                  </span>
                </div>

                <div className="text-xs text-[#0B261C]/75 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    {farmer.role === 'fodder_supplier' ? 'Supplier:' : 'Producer:'}{' '}
                    <strong className="text-[#062B1F]">{farmer.name}</strong>
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                    {profile?.address || `${farmer.location.city}, ${farmer.location.province}`}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1 text-[#062B1F] font-extrabold tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-[#F4D35E] text-[#F4D35E] shrink-0" />
                    {ratingStats.totalRatings > 0
                      ? `${avgRatingDisplay} (${ratingStats.totalRatings} ${ratingStats.totalRatings === 1 ? 'rating' : 'ratings'})`
                      : 'No ratings yet'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
              {isOwner && (
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
                size="sm"
                className="sm:!px-5 sm:!py-3"
                onClick={() => onContactFarmer(farmer)}
              >
                <MessageSquare className="w-4 h-4" />
                {farmer.role === 'fodder_supplier' ? 'Contact Supplier Directly' : 'Contact Farm Directly'}
              </LiquidGlassButton>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 pt-4 border-t border-[#145A38]/12">
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
                <Calendar className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                <span>Operating Since: <strong className="tabular-nums">{profile?.establishedYear || 2018}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                <span>Pickup Hours: <strong>Mon - Sat, 7:00 AM - 4:00 PM</strong></span>
              </div>
              {farmer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                  <span>Direct Line: <strong>{farmer.phone}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Farm Updates & Community Showcase (Owner composer + public feed) */}
      {isOwner ? (
        <section id="farm-profile-updates-section" className="space-y-3">
          <FarmerPostsTab user={farmer} products={products} />
        </section>
      ) : (
        <section id="farm-profile-updates-section" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#062B1F] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#145A38]" />
                <span>Farm Updates &amp; Showcase</span>
              </h2>
              <p className="text-xs text-[#0B261C]/65">
                Recent field dispatches, harvest updates, and seasonal offers from {profile?.farmName || farmer.name}
              </p>
            </div>
          </div>

          {postsLoading ? (
            <LiquidGlassCard variant="light" className="p-6 text-center text-xs text-[#0B261C]/55">
              Loading farm updates...
            </LiquidGlassCard>
          ) : posts.length === 0 ? (
            <LiquidGlassCard variant="light" className="p-6 sm:p-8 text-center space-y-2">
              <Sprout className="w-8 h-8 text-[#145A38]/40 mx-auto" />
              <p className="text-xs text-[#0B261C]/60">
                No farm updates posted yet. Check back soon or contact the farm directly.
              </p>
            </LiquidGlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {posts.map(post => {
                const leadMedia = post.media?.[0];
                const isLiked = (post.likedBy || []).includes(user?.id || 'guest-browser');
                return (
                  <LiquidGlassCard
                    key={post.id}
                    variant="light"
                    interactive
                    className="overflow-hidden flex flex-col"
                  >
                    {leadMedia ? (
                      <div className="relative aspect-[4/3] bg-[#062B1F]">
                        {leadMedia.type === 'video' ? (
                          <video
                            src={leadMedia.url}
                            poster={leadMedia.thumbnailUrl}
                            controls
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={leadMedia.url}
                            alt={post.caption}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {post.price !== undefined && (
                          <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-white/95 text-[#062B1F] text-xs font-extrabold shadow-xs tabular-nums">
                            ${post.price.toFixed(2)}
                            {post.unit ? `/${post.unit}` : ''}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 pt-4 pb-3 bg-linear-to-br from-[#062B1F] to-[#145A38] text-white flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#A8E635]">
                          <Sparkles className="w-3.5 h-3.5" />
                          Farm Update
                        </span>
                        {post.price !== undefined && (
                          <span className="px-2.5 py-0.5 rounded-full bg-white text-[#062B1F] text-xs font-extrabold tabular-nums">
                            ${post.price.toFixed(2)}
                            {post.unit ? `/${post.unit}` : ''}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-[#0B3D2B]/65">
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          {post.location && (
                            <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                              <MapPin className="w-3 h-3 text-[#145A38] shrink-0" />
                              {post.location}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-[#062B1F] text-sm">{post.caption}</h4>
                        {post.description && (
                          <p className="text-xs text-[#0B3D2B]/75 leading-relaxed">{post.description}</p>
                        )}
                        {post.taggedProductName && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#DFF4E4] text-[#0B3D2B] text-[11px] font-semibold">
                            <Tag className="w-3 h-3" />
                            <span>{post.taggedProductName}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#0B3D2B]/10 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleTogglePostLike(post)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            isLiked
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-white/75 text-[#062B1F] border border-[#145A38]/15 hover:bg-[#DFF4E4]/50'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                          <span className="tabular-nums">{post.likesCount || 0}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuoteFromPost(post)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#062B1F] text-white hover:bg-[#145A38] text-xs font-bold transition-colors cursor-pointer"
                        >
                          <MessageSquareQuote className="w-3.5 h-3.5 text-[#A8E635]" />
                          <span>Inquire / Quote</span>
                        </button>
                      </div>
                    </div>
                  </LiquidGlassCard>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Available Farm Products */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#062B1F]">Available from {profile?.farmName || farmer.name}</h2>
          <p className="text-xs text-[#0B261C]/65 tabular-nums">{products.length} current farm listings in stock</p>
        </div>

        {products.length === 0 ? (
          <LiquidGlassCard variant="light" className="p-6 sm:p-8 text-center text-xs text-[#0B261C]/55">
            This farm currently has no active listings.
          </LiquidGlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
      <LiquidGlassCard variant="light" className="p-4 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#145A38]/12 pb-4">
          <div>
            <h3 className="font-extrabold text-[#062B1F] text-base sm:text-lg">Customer Testimonials &amp; Ratings</h3>
            <p className="text-xs text-[#0B261C]/65">
              Verified ratings submitted by buyers after completed orders
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#F4D35E]/30 border border-[#F4D35E]/60 px-3.5 py-2 rounded-2xl font-extrabold text-[#062B1F] text-xs sm:text-sm self-start tabular-nums">
            <Star className="w-4 h-4 fill-[#F4D35E] text-[#F4D35E]" />
            <span>
              {ratingStats.totalRatings > 0
                ? `${avgRatingDisplay} / 5.0 (${ratingStats.totalRatings})`
                : 'No ratings yet'}
            </span>
          </div>
        </div>

        {ratingStats.totalRatings > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 lg-glass-mint p-4 rounded-2xl border border-[#145A38]/12">
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
