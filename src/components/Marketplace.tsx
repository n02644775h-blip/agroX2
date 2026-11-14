import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Product,
  ProductCategory,
  FilterState,
  AdRequest,
  MediaPost,
  BuyerRequest,
  User,
  Review,
  isSellerRole
} from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { subscribeToFirebaseProducts } from '../services/firebaseProducts';
import { subscribeToFirebaseAdRequests, expireFirebaseAdRequest } from '../services/firebaseAdRequests';
import { subscribeToFirebaseBuyerRequests, markFirebaseRequestResponded } from '../services/firebaseRequests';
import { subscribeToFirebaseUsers } from '../services/firebaseUsers';
import { subscribeToFirebaseReviews, calculateFarmerRatingStats } from '../services/firebaseReviews';
import { createFirebaseNotification } from '../services/firebaseNotifications';
import { getAdLifecycle, isAdActiveNow } from '../utils/adLifecycle';
import { ProductCard } from './ProductCard';
import { CommunityShowcase } from './CommunityShowcase';
import heroHarvestImg from '../assets/images/farmbridge_hero_harvest_1794683522813.jpg';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Leaf,
  X,
  ArrowUpDown,
  Carrot,
  Apple,
  Wheat,
  Egg,
  Milk,
  Beef,
  Hexagon,
  Sprout,
  Flower2,
  Package,
  Layers,
  ChevronDown,
  Dna,
  ArrowRight,
  Clock,
  Star,
  ShieldCheck,
  MessageSquareReply,
  Calendar,
  Loader2,
  ClipboardList
} from 'lucide-react';

interface MarketplaceProps {
  onSelectProduct: (product: Product) => void;
  onSelectFarmer: (farmerId: string) => void;
  onContactFarmer?: (product: Product) => void;
  onRequestQuote?: (post: MediaPost) => void;
  onRespondToBuyerRequest?: (request: BuyerRequest) => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
  onNavigate?: (view: string, data?: any) => void;
  externalSearchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
}

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  'cat-breeding': <Dna className="w-4 h-4" />,
  'cat-veg': <Carrot className="w-4 h-4" />,
  'cat-fruits': <Apple className="w-4 h-4" />,
  'cat-grains': <Wheat className="w-4 h-4" />,
  'cat-fodder': <Wheat className="w-4 h-4" />,
  'cat-poultry': <Egg className="w-4 h-4" />,
  'cat-dairy': <Milk className="w-4 h-4" />,
  'cat-livestock': <Beef className="w-4 h-4" />,
  'cat-honey': <Hexagon className="w-4 h-4" />,
  'cat-herbs': <Sprout className="w-4 h-4" />,
  'cat-seeds': <Flower2 className="w-4 h-4" />,
  'cat-legumes': <Leaf className="w-4 h-4" />,
  'cat-other': <Package className="w-4 h-4" />
};

const PROVINCES = [
  'All Regions',
  'Harare',
  'Mashonaland East',
  'Mashonaland Central',
  'Mashonaland West',
  'Midlands',
  'Manicaland',
  'Bulawayo',
  'Matabeleland North',
  'Matabeleland South',
  'Masvingo'
];

export const Marketplace: React.FC<MarketplaceProps> = ({
  onSelectProduct,
  onSelectFarmer,
  onContactFarmer,
  onRequestQuote,
  onRespondToBuyerRequest,
  onOpenAuth,
  onNavigate,
  externalSearchQuery,
  onSearchQueryChange
}) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [allAds, setAllAds] = useState<AdRequest[]>([]);
  const [buyerRequests, setBuyerRequests] = useState<BuyerRequest[]>([]);
  const [farmers, setFarmers] = useState<User[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const expiredSyncedRef = useRef<Set<string>>(new Set());

  const [loading, setLoading] = useState<boolean>(true);
  const [requestsLoading, setRequestsLoading] = useState<boolean>(true);
  const [farmersLoading, setFarmersLoading] = useState<boolean>(true);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState<boolean>(false);
  const [showAllBuyerRequests, setShowAllBuyerRequests] = useState<boolean>(false);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);
  const [requestNotice, setRequestNotice] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [failedImgs, setFailedImgs] = useState<Record<string, boolean>>({});

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: externalSearchQuery || '',
    category: 'all',
    province: 'All Regions',
    city: '',
    minPrice: undefined,
    maxPrice: undefined,
    availability: 'all',
    isOrganic: false,
    sortBy: 'newest'
  });

  // Keep synced when search query changes from Navbar
  useEffect(() => {
    if (externalSearchQuery !== undefined && externalSearchQuery !== filters.searchQuery) {
      setFilters(prev => ({ ...prev, searchQuery: externalSearchQuery }));
    }
  }, [externalSearchQuery]);

  const scrollToElement = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const applyClientFilters = (list: Product[], activeFilters: FilterState): Product[] => {
    const filtered = list.filter(p => {
      if (activeFilters.category !== 'all' && p.category !== activeFilters.category) return false;
      if (
        activeFilters.province &&
        activeFilters.province !== 'All Regions' &&
        p.location?.province !== activeFilters.province
      ) {
        return false;
      }
      if (activeFilters.city && activeFilters.city.trim()) {
        const cityMatch = (p.location?.city || '')
          .toLowerCase()
          .includes(activeFilters.city.trim().toLowerCase());
        if (!cityMatch) return false;
      }
      if (activeFilters.minPrice !== undefined && p.price < activeFilters.minPrice) return false;
      if (activeFilters.maxPrice !== undefined && p.price > activeFilters.maxPrice) return false;
      if (activeFilters.availability !== 'all' && p.availability !== activeFilters.availability) {
        return false;
      }
      if (activeFilters.isOrganic && !p.isOrganic) return false;
      if (activeFilters.searchQuery && activeFilters.searchQuery.trim()) {
        const q = activeFilters.searchQuery.trim().toLowerCase();
        const hay = `${p.name} ${p.description} ${p.categoryName} ${p.farmName} ${p.farmerName} ${
          p.location?.city || ''
        } ${p.location?.province || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (activeFilters.sortBy === 'price_asc') filtered.sort((a, b) => a.price - b.price);
    else if (activeFilters.sortBy === 'price_desc') filtered.sort((a, b) => b.price - a.price);
    else if (activeFilters.sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
    else if (activeFilters.sortBy === 'popular') {
      filtered.sort((a, b) => b.reviewsCount - a.reviewsCount);
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return filtered;
  };

  const loadData = async (overrideFilters?: FilterState) => {
    const activeFilters = overrideFilters || filters;
    setLoading(true);
    try {
      const [prodsData, catsData, hotDealsData] = await Promise.all([
        api.getProducts({
          searchQuery: activeFilters.searchQuery,
          category: activeFilters.category,
          province: activeFilters.province === 'All Regions' ? undefined : activeFilters.province,
          city: activeFilters.city,
          minPrice: activeFilters.minPrice,
          maxPrice: activeFilters.maxPrice,
          availability: activeFilters.availability,
          isOrganic: activeFilters.isOrganic,
          sortBy: activeFilters.sortBy
        }),
        api.getCategories(),
        api.getHotDeals().catch(() => [])
      ]);
      setProducts(prodsData);
      setCategories(catsData);
      if (hotDealsData && hotDealsData.length > 0) {
        setAllAds(prev => {
          const map = new Map<string, AdRequest>();
          prev.forEach(a => map.set(a.id, a));
          hotDealsData.forEach(a => map.set(a.id, a));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      console.error('Failed to load marketplace products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Products & real-time Firestore products subscription
  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToFirebaseProducts(undefined, fbProducts => {
      if (fbProducts && fbProducts.length > 0) {
        setProducts(prev => {
          const map = new Map<string, Product>();
          prev.forEach(p => map.set(p.id, p));
          fbProducts.forEach(p => map.set(p.id, p));
          return applyClientFilters(Array.from(map.values()), filters);
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [
    filters.category,
    filters.province,
    filters.availability,
    filters.isOrganic,
    filters.sortBy,
    filters.searchQuery
  ]);

  // Real-time Featured Advertisements listener + 30s auto-expiry ticker
  useEffect(() => {
    const unsubAds = subscribeToFirebaseAdRequests(
      undefined,
      fbAds => {
        if (fbAds && fbAds.length > 0) {
          setAllAds(prev => {
            const map = new Map<string, AdRequest>();
            prev.forEach(a => {
              if (!fbAds.some(f => f.id === a.id)) {
                map.set(a.id, a);
              }
            });
            fbAds.forEach(a => map.set(a.id, a));
            return Array.from(map.values());
          });
        }
      },
      () => {}
    );

    const ticker = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => {
      unsubAds();
      clearInterval(ticker);
    };
  }, []);

  // Automatically sync past-endDate ads to 'expired' in Firestore
  useEffect(() => {
    allAds.forEach(ad => {
      const lifecycle = getAdLifecycle(ad, nowMs);
      if (
        lifecycle.effectiveStatus === 'expired' &&
        (ad.status === 'approved' || ad.status === 'active') &&
        !expiredSyncedRef.current.has(ad.id)
      ) {
        expiredSyncedRef.current.add(ad.id);
        expireFirebaseAdRequest(ad.id).catch(() => {});
      }
    });
  }, [allAds, nowMs]);

  // Real-time Buyer Requests subscription
  useEffect(() => {
    let active = true;
    const mergeRequests = (incoming: BuyerRequest[]) => {
      setBuyerRequests(prev => {
        const map = new Map<string, BuyerRequest>();
        prev.forEach(r => map.set(r.id, r));
        incoming.forEach(r => map.set(r.id, r));
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    };

    api
      .getBuyerRequests()
      .then(list => {
        if (active && Array.isArray(list)) mergeRequests(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setRequestsLoading(false);
      });

    const unsubRequests = subscribeToFirebaseBuyerRequests(
      undefined,
      fsRequests => {
        if (active && fsRequests.length > 0) mergeRequests(fsRequests);
        if (active) setRequestsLoading(false);
      },
      () => {
        if (active) setRequestsLoading(false);
      }
    );

    return () => {
      active = false;
      unsubRequests();
    };
  }, []);

  // Real-time Farmers & Genuine Reviews subscription
  useEffect(() => {
    let active = true;
    const mergeFarmers = (incoming: User[]) => {
      setFarmers(prev => {
        const map = new Map<string, User>();
        prev.forEach(u => map.set(u.id, u));
        incoming.forEach(u => {
          if (isSellerRole(u.role) && u.status === 'active') {
            map.set(u.id, u);
          } else {
            map.delete(u.id);
          }
        });
        return Array.from(map.values());
      });
    };

    const mergeReviews = (incoming: Review[]) => {
      setReviews(prev => {
        const map = new Map<string, Review>();
        prev.forEach(r => map.set(r.id, r));
        incoming.forEach(r => map.set(r.id, r));
        return Array.from(map.values());
      });
    };

    Promise.all([api.getUsers().catch(() => []), api.getReviews().catch(() => [])])
      .then(([usersList, reviewsList]) => {
        if (!active) return;
        if (Array.isArray(usersList)) mergeFarmers(usersList);
        if (Array.isArray(reviewsList)) mergeReviews(reviewsList);
      })
      .finally(() => {
        if (active) setFarmersLoading(false);
      });

    const unsubUsers = subscribeToFirebaseUsers(
      usersList => {
        if (active) {
          mergeFarmers(usersList);
          setFarmersLoading(false);
        }
      },
      () => {
        if (active) setFarmersLoading(false);
      }
    );

    const unsubReviews = subscribeToFirebaseReviews(
      {},
      fbReviews => {
        if (active && fbReviews.length > 0) mergeReviews(fbReviews);
      },
      () => {}
    );

    return () => {
      active = false;
      unsubUsers();
      unsubReviews();
    };
  }, []);

  const featuredAds = allAds.filter(ad => isAdActiveNow(ad, nowMs));

  const openBuyerRequests = useMemo(
    () => buyerRequests.filter(r => r.status === 'open' || r.status === 'in_discussion'),
    [buyerRequests]
  );

  const visibleBuyerRequests = showAllBuyerRequests
    ? openBuyerRequests
    : openBuyerRequests.slice(0, 3);

  const farmerRatingsMap = useMemo(() => {
    const grouped = new Map<string, Review[]>();
    reviews.forEach(r => {
      if (!r.farmerId) return;
      const list = grouped.get(r.farmerId) || [];
      list.push(r);
      grouped.set(r.farmerId, list);
    });
    const statsMap = new Map<string, { averageRating: number; totalRatings: number }>();
    grouped.forEach((revs, farmerId) => {
      const stats = calculateFarmerRatingStats(revs);
      statsMap.set(farmerId, {
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings
      });
    });
    return statsMap;
  }, [reviews]);

  const featuredFarmers = useMemo(() => {
    // Prioritize verified producers & those with genuine reviews, then recent active producers
    return [...farmers]
      .sort((a, b) => {
        const aVer = Boolean(a.farmerProfile?.verified || a.farmerProfile?.isVerified) ? 1 : 0;
        const bVer = Boolean(b.farmerProfile?.verified || b.farmerProfile?.isVerified) ? 1 : 0;
        if (aVer !== bVer) return bVer - aVer;
        const aRev = farmerRatingsMap.get(a.id)?.totalRatings || a.farmerProfile?.totalReviews || 0;
        const bRev = farmerRatingsMap.get(b.id)?.totalRatings || b.farmerProfile?.totalReviews || 0;
        return bRev - aRev;
      })
      .slice(0, 4);
  }, [farmers, farmerRatingsMap]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchQueryChange) onSearchQueryChange(filters.searchQuery);
    loadData();
    scrollToElement('fresh-from-farmers');
  };

  const handleCategorySelect = (catId: string) => {
    const nextCat = filters.category === catId ? 'all' : catId;
    setFilters(prev => ({ ...prev, category: nextCat }));
    scrollToElement('fresh-from-farmers');
  };

  const handleQuickTagClick = (tag: string) => {
    const nextFilters = { ...filters, searchQuery: tag };
    setFilters(nextFilters);
    if (onSearchQueryChange) onSearchQueryChange(tag);
    loadData(nextFilters);
    scrollToElement('fresh-from-farmers');
  };

  const resetFilters = () => {
    const cleared: FilterState = {
      searchQuery: '',
      category: 'all',
      province: 'All Regions',
      city: '',
      minPrice: undefined,
      maxPrice: undefined,
      availability: 'all',
      isOrganic: false,
      sortBy: 'newest'
    };
    setFilters(cleared);
    if (onSearchQueryChange) onSearchQueryChange('');
    loadData(cleared);
  };

  const handleRespondToRequestAction = async (req: BuyerRequest) => {
    setRequestNotice(null);
    if (!user) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    if (!isSellerRole(user.role)) {
      if (user.role === 'buyer') {
        if (onNavigate) onNavigate('buyer_dashboard');
        else setRequestNotice('Manage or post your sourcing requests in Buyer Hub.');
      } else {
        setRequestNotice('Only registered farmers and fodder suppliers can submit quotes to buyer requests.');
      }
      return;
    }

    setRespondingRequestId(req.id);
    try {
      let updatedReq = req;
      try {
        updatedReq = await api.respondToBuyerRequest(req.id, user.id, user.name);
      } catch {
        const nextResponders = Array.from(
          new Set([...(req.respondedFarmerIds || []), user.id])
        );
        updatedReq = {
          ...req,
          status: 'in_discussion',
          respondedFarmerIds: nextResponders,
          responseCount: nextResponders.length,
          updatedAt: new Date().toISOString()
        };
      }

      await markFirebaseRequestResponded(req.id, user.id, req);
      await createFirebaseNotification({
        userId: req.buyerId,
        title: 'Farmer Responded to Your Request',
        message: `${user.farmerProfile?.farmName || user.name} responded regarding "${req.productName}".`,
        type: 'request',
        link: `/messages?requestId=${req.id}`,
        metadata: { requestId: req.id, farmerId: user.id }
      });

      setBuyerRequests(prev => prev.map(item => (item.id === updatedReq.id ? updatedReq : item)));
      if (onRespondToBuyerRequest) {
        onRespondToBuyerRequest(updatedReq);
      }
    } finally {
      setRespondingRequestId(null);
    }
  };

  const activeFiltersCount = [
    filters.category !== 'all',
    filters.province !== 'All Regions',
    filters.minPrice !== undefined,
    filters.maxPrice !== undefined,
    filters.availability !== 'all',
    filters.isOrganic,
    Boolean(filters.city?.trim())
  ].filter(Boolean).length;

  return (
    <div className="space-y-14 pb-10">
      {/* 1. HERO SECTION */}
      <section className="bg-white rounded-3xl border border-[#E8EEE8] p-6 sm:p-10 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Hero Copy & CTAs */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#77A987]">
                FarmBridge Marketplace
              </p>

              <h1 className="text-[clamp(2rem,3.6vw,3.15rem)] font-bold tracking-tight text-[#202B24] leading-[1.12] text-balance">
                Fresh produce. Direct connections.
              </h1>

              <p className="text-sm sm:text-base text-[#202B24]/70 leading-relaxed max-w-xl">
                Discover agricultural products, connect with local farmers, and shop directly from the source.
              </p>
            </div>

            {/* Hero Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                id="hero-explore-marketplace-btn"
                onClick={() => scrollToElement('fresh-from-farmers')}
                className="px-6 py-3 rounded-xl bg-[#174B35] hover:bg-[#123c2a] text-white text-sm font-semibold transition-colors inline-flex items-center gap-2"
              >
                <span>Explore Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="hero-meet-farmers-btn"
                onClick={() => scrollToElement('featured-farmers-section')}
                className="px-6 py-3 rounded-xl bg-[#F8FAF7] hover:bg-[#E8EEE8]/70 border border-[#E8EEE8] text-[#202B24] text-sm font-semibold transition-colors"
              >
                Meet Our Farmers
              </button>
            </div>

            {/* Clean Inline Marketplace Search */}
            <form onSubmit={handleSearchSubmit} className="pt-1">
              <div className="flex items-center bg-[#F8FAF7] rounded-2xl p-1.5 border border-[#E8EEE8] focus-within:bg-white focus-within:border-[#77A987] transition-colors">
                <Search className="w-4 h-4 text-[#202B24]/45 ml-3 shrink-0" />
                <input
                  id="marketplace-search-input"
                  type="text"
                  value={filters.searchQuery}
                  onChange={e => {
                    const val = e.target.value;
                    setFilters(prev => ({ ...prev, searchQuery: val }));
                    if (onSearchQueryChange) onSearchQueryChange(val);
                  }}
                  placeholder="Search tomatoes, maize, pasture eggs, lucerne..."
                  className="w-full px-3 py-2 bg-transparent text-[#202B24] text-sm focus:outline-none placeholder:text-[#202B24]/45"
                />
                {filters.searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...filters, searchQuery: '' };
                      setFilters(next);
                      if (onSearchQueryChange) onSearchQueryChange('');
                      loadData(next);
                    }}
                    aria-label="Clear search"
                    className="p-1.5 text-[#202B24]/45 hover:text-[#202B24]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#174B35] hover:bg-[#123c2a] text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shrink-0"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Hero Imagery */}
          <div className="lg:col-span-6">
            <div className="w-full h-full min-h-[240px] sm:min-h-[320px] lg:min-h-[360px] rounded-2xl overflow-hidden border border-[#E8EEE8] bg-[#F8FAF7] relative">
              {!heroImgFailed ? (
                <img
                  src={heroHarvestImg}
                  alt="Freshly harvested farm produce in wooden crates overlooking agricultural fields"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#174B35] to-[#77A987] text-white">
                  <Sprout className="w-12 h-12 mb-3 opacity-90" />
                  <p className="font-semibold text-base">Direct From Local Farms</p>
                  <p className="text-xs text-white/80 mt-1">
                    Seasonal produce, fodder, livestock, and grains
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRODUCT CATEGORIES STRIP */}
      <section aria-labelledby="categories-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="categories-heading" className="text-xl sm:text-2xl font-bold text-[#202B24] tracking-tight">
              Browse by Category
            </h2>
            <p className="text-xs sm:text-sm text-[#202B24]/60 mt-0.5">
              Select a category to filter fresh produce and farm supplies.
            </p>
          </div>
          {filters.category !== 'all' && (
            <button
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, category: 'all' }))}
              className="text-xs font-semibold text-[#174B35] hover:underline shrink-0"
            >
              Show All Categories
            </button>
          )}
        </div>

        <div className="flex items-stretch gap-3 overflow-x-auto pb-2 no-scrollbar">
          <button
            id="category-card-all"
            type="button"
            onClick={() => handleCategorySelect('all')}
            className={`shrink-0 min-w-[138px] p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
              filters.category === 'all'
                ? 'bg-[#174B35] border-[#174B35] text-white'
                : 'bg-white border-[#E8EEE8] hover:border-[#77A987] text-[#202B24]'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                filters.category === 'all'
                  ? 'bg-white/15 text-white'
                  : 'bg-[#F8FAF7] text-[#174B35] border border-[#E8EEE8]'
              }`}
            >
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold leading-snug">All Produce</p>
              <p
                className={`text-[11px] mt-0.5 tabular-nums ${
                  filters.category === 'all' ? 'text-white/75' : 'text-[#202B24]/55'
                }`}
              >
                {products.length} items
              </p>
            </div>
          </button>

          {categories.map(cat => {
            const isSelected = filters.category === cat.id;
            return (
              <button
                key={cat.id}
                id={`category-card-${cat.slug}`}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                className={`shrink-0 min-w-[152px] p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#174B35] border-[#174B35] text-white'
                    : 'bg-white border-[#E8EEE8] hover:border-[#77A987] text-[#202B24]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isSelected
                      ? 'bg-white/15 text-white'
                      : 'bg-[#F8FAF7] text-[#174B35] border border-[#E8EEE8]'
                  }`}
                >
                  {CATEGORY_ICON_MAP[cat.id] || <Carrot className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-xs font-semibold leading-snug line-clamp-1">{cat.name}</p>
                  {cat.itemCount !== undefined && cat.itemCount > 0 ? (
                    <p
                      className={`text-[11px] mt-0.5 tabular-nums ${
                        isSelected ? 'text-white/75' : 'text-[#202B24]/55'
                      }`}
                    >
                      {cat.itemCount} listings
                    </p>
                  ) : (
                    <p
                      className={`text-[11px] mt-0.5 ${
                        isSelected ? 'text-white/75' : 'text-[#202B24]/50'
                      }`}
                    >
                      Explore
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. FEATURED ADVERTISEMENTS ("Featured on FarmBridge") */}
      {featuredAds.length > 0 && (
        <section
          id="featured-advertisements-section"
          className="space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#77A987]">
                Promoted Listings
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#202B24] tracking-tight">
                Featured on FarmBridge
              </h2>
              <p className="text-xs sm:text-sm text-[#202B24]/65 mt-0.5">
                Admin-approved farm harvests and seasonal offers currently active.
              </p>
            </div>
            <span className="text-xs font-medium text-[#202B24]/60 tabular-nums">
              {featuredAds.length} active {featuredAds.length === 1 ? 'promotion' : 'promotions'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredAds.map(deal => {
              const lifecycle = getAdLifecycle(deal, nowMs);
              const adImgFailed = failedImgs[`ad-${deal.id}`];
              return (
                <article
                  key={deal.id}
                  className="bg-white rounded-2xl border border-[#E8EEE8] hover:border-[#77A987] transition-all p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#174B35]">
                        {deal.discountPercentage
                          ? `${deal.discountPercentage}% Off`
                          : deal.discountText || 'Featured Offer'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectFarmer(deal.farmerId)}
                        className="text-[#202B24]/60 hover:text-[#174B35] font-medium truncate max-w-[160px]"
                      >
                        {deal.farmName || deal.farmerName}
                      </button>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-xl bg-[#F8FAF7] border border-[#E8EEE8] overflow-hidden shrink-0 flex items-center justify-center">
                        {deal.productImage && !adImgFailed ? (
                          <img
                            src={deal.productImage}
                            alt={deal.dealHeadline}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedImgs(prev => ({ ...prev, [`ad-${deal.id}`]: true }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Sprout className="w-6 h-6 text-[#77A987]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-[#202B24] leading-snug line-clamp-1">
                          {deal.dealHeadline}
                        </h3>
                        <p className="text-xs text-[#202B24]/60 line-clamp-1 mt-0.5">
                          {deal.dealDescription || deal.productName}
                        </p>
                        <div className="flex items-baseline gap-2 mt-1.5 tabular-nums">
                          {deal.specialPrice ? (
                            <>
                              <span className="text-base font-bold text-[#174B35]">
                                ${deal.specialPrice.toFixed(2)}
                              </span>
                              {deal.productPrice && (
                                <span className="text-xs text-[#202B24]/40 line-through">
                                  ${deal.productPrice.toFixed(2)}
                                </span>
                              )}
                            </>
                          ) : deal.productPrice ? (
                            <span className="text-base font-bold text-[#174B35]">
                              ${deal.productPrice.toFixed(2)}
                            </span>
                          ) : null}
                          {deal.productUnit && (
                            <span className="text-xs text-[#202B24]/55">/ {deal.productUnit}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E8EEE8] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#202B24]/55 font-medium flex items-center gap-1 tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-[#77A987]" />
                      {lifecycle.remainingLabel}
                    </span>

                    {deal.productId ? (
                      <button
                        type="button"
                        onClick={() => {
                          const targetProd = products.find(p => p.id === deal.productId);
                          if (targetProd) {
                            onSelectProduct(targetProd);
                          } else {
                            handleQuickTagClick(deal.productName || deal.dealHeadline);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-[#174B35] hover:bg-[#123c2a] text-white rounded-xl font-semibold text-xs inline-flex items-center gap-1 transition-colors"
                      >
                        <span>View Offer</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectFarmer(deal.farmerId)}
                        className="px-3.5 py-1.5 bg-[#174B35] hover:bg-[#123c2a] text-white rounded-xl font-semibold text-xs inline-flex items-center gap-1 transition-colors"
                      >
                        <span>Visit Farm</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. PRODUCT LISTINGS ("Fresh from Farmers") */}
      <section id="fresh-from-farmers" className="space-y-6 scroll-mt-20">
        {/* Section Header + Minimalist Filter Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#77A987]">
              Marketplace
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#202B24] tracking-tight">
              Fresh from Farmers
            </h2>
            <p className="text-xs sm:text-sm text-[#202B24]/60 mt-0.5 tabular-nums">
              {products.length} {products.length === 1 ? 'listing' : 'listings'} available directly from local producers
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Province Filter */}
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-[#77A987] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="sidebar-province-select"
                value={filters.province}
                onChange={e => setFilters(prev => ({ ...prev, province: e.target.value }))}
                aria-label="Filter by province"
                className="appearance-none bg-white border border-[#E8EEE8] hover:border-[#77A987] text-[#202B24] text-xs font-medium rounded-xl pl-8 pr-8 py-2 focus:outline-none focus:border-[#174B35] cursor-pointer"
              >
                {PROVINCES.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#202B24]/45 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Organic Toggle */}
            <button
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, isOrganic: !prev.isOrganic }))}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                filters.isOrganic
                  ? 'bg-[#174B35] border-[#174B35] text-white'
                  : 'bg-white border-[#E8EEE8] hover:border-[#77A987] text-[#202B24]'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>Organic</span>
            </button>

            {/* Sort Select */}
            <div className="relative">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#202B24]/45 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="sort-by-select"
                value={filters.sortBy}
                onChange={e => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                aria-label="Sort products"
                className="appearance-none bg-white border border-[#E8EEE8] hover:border-[#77A987] text-[#202B24] text-xs font-medium rounded-xl pl-8 pr-8 py-2 focus:outline-none focus:border-[#174B35] cursor-pointer"
              >
                <option value="newest">Sort: Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="popular">Most Popular</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#202B24]/45 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* More Filters Toggle */}
            <button
              id="toggle-filters-drawer-btn"
              type="button"
              onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                activeFiltersCount > 0 || showFiltersDrawer
                  ? 'bg-[#F8FAF7] border-[#77A987] text-[#174B35]'
                  : 'bg-white border-[#E8EEE8] hover:border-[#77A987] text-[#202B24]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#174B35] text-white text-[10px] flex items-center justify-center font-bold tabular-nums">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {(activeFiltersCount > 0 || filters.searchQuery) && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 text-xs font-medium text-[#174B35] hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Expandable Filter Panel */}
        {showFiltersDrawer && (
          <div className="p-5 rounded-2xl bg-white border border-[#E8EEE8] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EEE8]">
              <h3 className="font-semibold text-[#202B24] text-xs uppercase tracking-wider">
                Refine Listings
              </h3>
              <button
                type="button"
                onClick={() => setShowFiltersDrawer(false)}
                className="p-1 rounded-lg text-[#202B24]/45 hover:text-[#202B24]"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-medium text-[#202B24]/75 block mb-1.5">
                  Max Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={filters.maxPrice || ''}
                  onChange={e =>
                    setFilters(prev => ({
                      ...prev,
                      maxPrice: e.target.value ? parseFloat(e.target.value) : undefined
                    }))
                  }
                  placeholder="e.g. 25"
                  className="w-full px-3 py-2 bg-[#F8FAF7] rounded-xl border border-[#E8EEE8] text-[#202B24] text-xs focus:outline-none focus:bg-white focus:border-[#77A987]"
                />
              </div>

              <div>
                <label className="font-medium text-[#202B24]/75 block mb-1.5">
                  Availability
                </label>
                <select
                  value={filters.availability}
                  onChange={e => setFilters(prev => ({ ...prev, availability: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#F8FAF7] rounded-xl border border-[#E8EEE8] text-[#202B24] text-xs focus:outline-none focus:bg-white focus:border-[#77A987]"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">In Stock Only</option>
                  <option value="low_stock">Low Stock Alerts</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-[#202B24]/75 block mb-1.5">
                  City / Town
                </label>
                <input
                  type="text"
                  value={filters.city}
                  onChange={e => setFilters(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="e.g. Marondera, Harare"
                  className="w-full px-3 py-2 bg-[#F8FAF7] rounded-xl border border-[#E8EEE8] text-[#202B24] text-xs focus:outline-none focus:bg-white focus:border-[#77A987]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E8EEE8] flex justify-end gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 bg-[#F8FAF7] hover:bg-[#E8EEE8]/70 text-[#202B24] font-semibold rounded-xl text-xs transition-colors"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  loadData();
                  setShowFiltersDrawer(false);
                }}
                className="px-5 py-2 bg-[#174B35] hover:bg-[#123c2a] text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Category Contextual Note (Breeding or Fodder) */}
        {filters.category === 'cat-breeding' && (
          <div className="p-4 rounded-2xl bg-white border border-[#E8EEE8] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#F8FAF7] border border-[#E8EEE8] flex items-center justify-center shrink-0 text-[#174B35]">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#202B24]">
                Breeding, Crossbreeds & Hybrids
              </h3>
              <p className="text-xs text-[#202B24]/65 mt-0.5">
                Verified F1 crossbred livestock, disease-resilient hybrid poultry, and certified seed varieties directly from local breeders.
              </p>
            </div>
          </div>
        )}

        {filters.category === 'cat-fodder' && (
          <div className="p-4 rounded-2xl bg-white border border-[#E8EEE8] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#F8FAF7] border border-[#E8EEE8] flex items-center justify-center shrink-0 text-[#174B35]">
              <Wheat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#202B24]">
                Fodder, Hay Bales & Animal Feed
              </h3>
              <p className="text-xs text-[#202B24]/65 mt-0.5">
                High-protein lucerne hay bales, maize silage, Rhodes grass, and livestock feed concentrates from regional suppliers.
              </p>
            </div>
          </div>
        )}

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-[#E8EEE8] overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-[#F8FAF7]" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-[#E8EEE8] rounded w-1/3" />
                  <div className="h-4 bg-[#E8EEE8] rounded w-3/4" />
                  <div className="h-3 bg-[#E8EEE8] rounded w-2/3" />
                  <div className="h-8 bg-[#F8FAF7] rounded-xl w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-2xl border border-[#E8EEE8] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F8FAF7] border border-[#E8EEE8] text-[#174B35] flex items-center justify-center mx-auto">
              <Sprout className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-semibold text-[#202B24] text-base">No produce matches your filters</h3>
              <p className="text-xs text-[#202B24]/60">
                Try clearing your search term or selecting a broader region to explore available harvests.
              </p>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="px-5 py-2.5 bg-[#174B35] hover:bg-[#123c2a] text-white rounded-xl font-semibold text-xs transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectProduct={onSelectProduct}
                onContactFarmer={onContactFarmer}
              />
            ))}
          </div>
        )}
      </section>

      {/* 5. FARMBRIDGE COMMUNITY CAROUSEL */}
      <CommunityShowcase
        onSelectFarmer={onSelectFarmer}
        onRequestQuote={post => {
          if (onRequestQuote) {
            onRequestQuote(post);
          } else {
            onSelectFarmer(post.farmerId);
          }
        }}
      />

      {/* 6. BUYER REQUESTS ("What Buyers Are Looking For") */}
      <section
        id="buyer-requests-section"
        className="space-y-6 pt-2 scroll-mt-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#77A987]">
              Active Demand
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#202B24] tracking-tight">
              What Buyers Are Looking For
            </h2>
            <p className="text-xs sm:text-sm text-[#202B24]/65">
              Recent sourcing requests from verified buyers. Farmers and fodder suppliers can respond directly.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {openBuyerRequests.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllBuyerRequests(prev => !prev)}
                className="text-xs font-semibold text-[#174B35] hover:underline"
              >
                {showAllBuyerRequests
                  ? 'Show Fewer'
                  : `View all buyer requests (${openBuyerRequests.length})`}
              </button>
            )}
            {user?.role === 'buyer' && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('buyer_dashboard')}
                className="px-4 py-2 rounded-xl bg-white border border-[#E8EEE8] hover:border-[#77A987] text-[#202B24] text-xs font-semibold transition-colors"
              >
                Post a Request
              </button>
            )}
          </div>
        </div>

        {requestNotice && (
          <div className="p-3.5 rounded-xl bg-white border border-[#77A987] text-xs text-[#202B24] flex items-center justify-between gap-3">
            <span>{requestNotice}</span>
            <button
              type="button"
              onClick={() => setRequestNotice(null)}
              className="text-[#202B24]/50 hover:text-[#202B24]"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {requestsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-white border border-[#E8EEE8] animate-pulse"
              />
            ))}
          </div>
        ) : visibleBuyerRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8EEE8] p-8 text-center space-y-2">
            <ClipboardList className="w-7 h-7 text-[#77A987] mx-auto" />
            <h3 className="text-sm font-semibold text-[#202B24]">No Open Buyer Requests Right Now</h3>
            <p className="text-xs text-[#202B24]/60 max-w-md mx-auto">
              Buyers looking for specific volumes or crops can post sourcing requests from their Buyer Hub.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleBuyerRequests.map(req => {
              const hasResponded = Boolean(user && (req.respondedFarmerIds || []).includes(user.id));
              const statusLabel = req.status === 'in_discussion' ? 'In Discussion' : 'Open';
              return (
                <article
                  key={req.id}
                  className="bg-white rounded-2xl border border-[#E8EEE8] hover:border-[#77A987] transition-colors p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#77A987]">
                          {req.categoryName || 'Produce Request'}
                        </span>
                        <h3 className="font-semibold text-base text-[#202B24] leading-snug line-clamp-1 mt-0.5">
                          {req.productName}
                        </h3>
                      </div>

                      <span className="text-[11px] font-semibold text-[#174B35] flex items-center gap-1.5 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#77A987]" />
                        {statusLabel}
                      </span>
                    </div>

                    {req.description && (
                      <p className="text-xs text-[#202B24]/65 line-clamp-2 leading-relaxed">
                        {req.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-[#202B24]/75 pt-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <Package className="w-3.5 h-3.5 text-[#77A987] shrink-0" />
                        <span className="font-medium truncate">{req.quantityRequired}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#77A987] shrink-0" />
                        <span className="truncate">{req.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#202B24]/55">
                        <Calendar className="w-3.5 h-3.5 text-[#77A987] shrink-0" />
                        <span>Posted {new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                      {req.preferredPrice !== undefined && (
                        <div className="text-[11px] font-semibold text-[#174B35] tabular-nums">
                          Target: ${req.preferredPrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E8EEE8] flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#202B24]/55 tabular-nums">
                      {req.responseCount || 0} {(req.responseCount || 0) === 1 ? 'response' : 'responses'}
                    </span>

                    <button
                      type="button"
                      disabled={respondingRequestId === req.id}
                      onClick={() => handleRespondToRequestAction(req)}
                      className="px-3.5 py-2 rounded-xl bg-[#174B35] hover:bg-[#123c2a] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-60"
                    >
                      {respondingRequestId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <MessageSquareReply className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {!user
                          ? 'Respond to Request'
                          : isSellerRole(user.role)
                          ? hasResponded
                            ? 'Continue Chat'
                            : 'Respond to Request'
                          : user.role === 'buyer'
                          ? 'Open Buyer Hub'
                          : 'View Details'}
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 7. FEATURED FARMERS ("Meet Our Farmers") */}
      <section
        id="featured-farmers-section"
        className="space-y-6 pt-2 scroll-mt-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#77A987]">
              Local Producers
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#202B24] tracking-tight">
              Meet Our Farmers
            </h2>
            <p className="text-xs sm:text-sm text-[#202B24]/65">
              Connect directly with regional growers and fodder suppliers on FarmBridge.
            </p>
          </div>
        </div>

        {farmersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="h-56 rounded-2xl bg-white border border-[#E8EEE8] animate-pulse"
              />
            ))}
          </div>
        ) : featuredFarmers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8EEE8] p-8 text-center text-xs text-[#202B24]/60">
            Registered farmers and suppliers will appear here as they join FarmBridge.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredFarmers.map(farmer => {
              const farmName =
                farmer.farmerProfile?.farmName ||
                (farmer.role === 'fodder_supplier'
                  ? `${farmer.name}'s Fodder Supply`
                  : `${farmer.name}'s Farm`);
              const isVerified = Boolean(
                farmer.farmerProfile?.verified || farmer.farmerProfile?.isVerified
              );
              const liveRating = farmerRatingsMap.get(farmer.id);
              const reviewCount =
                liveRating?.totalRatings ?? farmer.farmerProfile?.totalReviews ?? 0;
              const avgRating =
                liveRating && liveRating.totalRatings > 0
                  ? liveRating.averageRating
                  : farmer.farmerProfile?.rating || 0;
              const avatarFailed = failedImgs[`farmer-${farmer.id}`];

              return (
                <article
                  key={farmer.id}
                  className="bg-white rounded-2xl border border-[#E8EEE8] hover:border-[#77A987] transition-all p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-[#F8FAF7] border border-[#E8EEE8] overflow-hidden shrink-0 flex items-center justify-center">
                        {farmer.avatar && !avatarFailed ? (
                          <img
                            src={farmer.avatar}
                            alt={farmName}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedImgs(prev => ({ ...prev, [`farmer-${farmer.id}`]: true }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-sm text-[#174B35]">
                            {farmName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-sm text-[#202B24] truncate">
                            {farmName}
                          </h3>
                          {isVerified && (
                            <ShieldCheck
                              className="w-4 h-4 text-[#174B35] shrink-0"
                              aria-label="Verified Producer"
                            />
                          )}
                        </div>
                        <p className="text-xs text-[#202B24]/60 truncate">
                          {farmer.role === 'fodder_supplier' ? 'Fodder Supplier' : 'Local Farmer'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#202B24]/70">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#77A987] shrink-0" />
                        <span className="truncate">
                          {farmer.location?.city || 'Harare'}, {farmer.location?.province || 'Harare'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        {reviewCount > 0 && avgRating > 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[#202B24] tabular-nums">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{avgRating.toFixed(1)}</span>
                            <span className="font-normal text-[#202B24]/55">
                              ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                            </span>
                          </span>
                        ) : (
                          <span className="text-[#202B24]/50">New producer on FarmBridge</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectFarmer(farmer.id)}
                    className="w-full py-2 px-3 rounded-xl bg-[#F8FAF7] hover:bg-[#174B35] hover:text-white border border-[#E8EEE8] hover:border-[#174B35] text-[#202B24] text-xs font-semibold transition-colors"
                  >
                    View Profile
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
