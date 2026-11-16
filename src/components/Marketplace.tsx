import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
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
import { LiquidGlassCard, LiquidGlassButton } from './glass';
import heroPanoramaImg from '../assets/images/hero_farmland_sunrise_1794742072298.jpg';
import basketAccentImg from '../assets/images/signup_vegetable_basket_1794742072176.jpg';
import meadowLeafImg from '../assets/images/meadow_hills_backdrop_1794742070903.jpg';
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
  ClipboardList,
  Users,
  ShoppingBag,
  Flame
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
  const prefersReducedMotion = useReducedMotion();
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
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
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

  const verifiedFarmerIds = useMemo(() => {
    const ids = new Set<string>();
    farmers.forEach(f => {
      if (f.farmerProfile?.verified || f.farmerProfile?.isVerified) {
        ids.add(f.id);
      }
    });
    return ids;
  }, [farmers]);

  const displayedProducts = useMemo(() => {
    if (!verifiedOnly) return products;
    if (verifiedFarmerIds.size === 0) return products;
    return products.filter(p => verifiedFarmerIds.has(p.farmerId));
  }, [products, verifiedOnly, verifiedFarmerIds]);

  const provincesCovered = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.location?.province) set.add(p.location.province);
    });
    farmers.forEach(f => {
      if (f.location?.province) set.add(f.location.province);
    });
    return set.size;
  }, [products, farmers]);

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
  };

  const handleQuickTagClick = (tag: string) => {
    const nextFilters = { ...filters, searchQuery: tag };
    setFilters(nextFilters);
    if (onSearchQueryChange) onSearchQueryChange(tag);
    loadData(nextFilters);
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
    setVerifiedOnly(false);
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
    verifiedOnly,
    Boolean(filters.city?.trim())
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 sm:space-y-14 pb-8 sm:pb-10">
      {/* 1. ATMOSPHERIC PANORAMIC LIQUID GLASS HERO SECTION */}
      <section className="relative rounded-2xl sm:rounded-[32px] overflow-hidden border border-white/25 shadow-[0_28px_72px_-18px_rgba(6,43,31,0.55)] min-h-0 sm:min-h-[480px] flex flex-col justify-between bg-[#062B1F]">
        {!heroImgFailed ? (
          <img
            src={heroPanoramaImg}
            alt="Sunlit green farmland valley with rows of fresh produce"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : null}

        {/* Gradient Atmospheric Depth & Curved Refractive Light Arcs */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-r from-[#062B1F]/92 via-[#0B3D2B]/74 to-[#062B1F]/40"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none hidden lg:block absolute -right-12 -bottom-24 w-[440px] h-[440px] rounded-full border-2 border-white/25 bg-white/5 backdrop-blur-[2px]"
        />

        {/* Woven Vegetable Basket Accent Corner (Desktop) */}
        <div className="pointer-events-none hidden lg:block absolute right-6 bottom-6 w-56 h-56 rounded-3xl overflow-hidden border border-white/35 shadow-2xl">
          <img
            src={basketAccentImg}
            alt="Fresh harvest produce basket"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#062B1F]/60 via-transparent to-transparent" />
        </div>

        {/* Hero Copy, CTAs & Inline Glass Search */}
        <div className="relative z-10 p-4 sm:p-10 lg:p-12 lg:max-w-3xl space-y-4 sm:space-y-6 my-auto">
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-2.5 sm:space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full lg-glass-pill text-[10px] sm:text-[11px] font-bold uppercase tracking-wider sm:tracking-widest text-[#A8E635] max-w-full">
              <img
                src="/assets/farmbridge-logo-white.png"
                alt="FarmBridge logo"
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain shrink-0"
              />
              <span>FarmBridge Agricultural Marketplace</span>
            </div>

            <h1 className="text-[clamp(2rem,4.5vw,3.85rem)] font-extrabold tracking-tight text-white leading-[1.08] text-balance">
              Fresh Choices.{' '}
              <span className="text-[#A8E635] block sm:inline">Stronger Connections.</span>
            </h1>

            <p className="text-sm sm:text-base text-[#DFF4E4]/90 leading-relaxed max-w-xl">
              Bridging farmers and markets directly. Discover freshly harvested produce, livestock, and high-protein fodder straight from verified regional farms.
            </p>
          </motion.div>

          {/* Hero Primary & Glass Secondary CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <LiquidGlassButton
              id="hero-explore-marketplace-btn"
              variant="lime"
              size="md"
              className="!px-4 !py-2.5 !text-sm sm:!px-6 sm:!py-3.5"
              onClick={() => scrollToElement('fresh-from-farmers')}
            >
              <span>Shop Marketplace</span>
              <ArrowRight className="w-4 h-4" />
            </LiquidGlassButton>

            {!user ? (
              <LiquidGlassButton
                id="hero-join-farmer-btn"
                variant="glass"
                size="md"
                className="!px-4 !py-2.5 !text-sm sm:!px-6 sm:!py-3.5"
                onClick={() => onOpenAuth && onOpenAuth('register')}
              >
                <Users className="w-4 h-4 text-[#A8E635]" />
                <span>Join as a Farmer</span>
              </LiquidGlassButton>
            ) : (
              <LiquidGlassButton
                id="hero-meet-farmers-btn"
                variant="glass"
                size="md"
                className="!px-4 !py-2.5 !text-sm sm:!px-6 sm:!py-3.5"
                onClick={() => scrollToElement('featured-farmers-section')}
              >
                <Users className="w-4 h-4 text-[#A8E635]" />
                <span>Meet Our Farmers</span>
              </LiquidGlassButton>
            )}
          </div>

          {/* Inline Translucent Glass Search Bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-xl">
            <div className="flex items-center lg-glass-frosted rounded-2xl p-1 sm:p-1.5 transition-all focus-within:border-[#A8E635]">
              <Search className="w-4 h-4 text-[#DFF4E4]/75 ml-2.5 sm:ml-3 shrink-0" />
              <input
                id="marketplace-search-input"
                type="text"
                value={filters.searchQuery}
                onChange={e => {
                  const val = e.target.value;
                  setFilters(prev => ({ ...prev, searchQuery: val }));
                  if (onSearchQueryChange) onSearchQueryChange(val);
                }}
                placeholder="Search produce, farms, fodder..."
                className="min-w-0 w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-transparent text-white text-sm focus:outline-none placeholder:text-[#DFF4E4]/65"
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
                  className="p-1.5 text-[#DFF4E4]/75 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="px-3 py-1.5 sm:px-4 sm:py-2 lg-cta-lime text-[#062B1F] font-extrabold text-xs sm:text-sm rounded-xl transition-all shrink-0 cursor-pointer"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Floating Live Marketplace Metrics Glass Strip (Computed strictly from real app state) */}
        <div className="relative z-10 px-4 sm:px-10 lg:px-12 pb-4 sm:pb-6">
          <div className="lg:max-w-2xl rounded-2xl lg-glass-frosted p-3 sm:px-5 sm:py-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 sm:divide-x divide-white/20 text-white">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-white/12 border border-white/25 flex items-center justify-center shrink-0 text-[#A8E635]">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-xl font-extrabold tabular-nums leading-tight">
                  {farmersLoading ? '—' : farmers.length}
                </div>
                <div className="text-[11px] leading-snug text-[#DFF4E4]/85">Active Producers</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 sm:pl-4 min-w-0">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-white/12 border border-white/25 flex items-center justify-center shrink-0 text-[#A8E635]">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-xl font-extrabold tabular-nums leading-tight">
                  {loading ? '—' : products.length}
                </div>
                <div className="text-[11px] leading-snug text-[#DFF4E4]/85">Products Listed</div>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-center gap-2.5 sm:gap-3 sm:pl-4 pt-2 sm:pt-0 border-t border-white/15 sm:border-t-0 min-w-0">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-white/12 border border-white/25 flex items-center justify-center shrink-0 text-[#F4D35E]">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-xl font-extrabold tabular-nums leading-tight">
                  {provincesCovered || '1'}
                </div>
                <div className="text-[11px] leading-snug text-[#DFF4E4]/85">Regions Covered</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURED ADVERTISEMENTS ("Featured on FarmBridge") */}
      {featuredAds.length > 0 && (
        <section
          id="featured-advertisements-section"
          className="space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#145A38] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#145A38]" />
                Promoted Harvest Deals
              </p>
              <h2 className="text-xl sm:text-3xl font-extrabold text-[#062B1F] tracking-tight">
                Featured on FarmBridge
              </h2>
              <p className="text-xs sm:text-sm text-[#0B261C]/65 mt-0.5">
                Admin-approved farm harvests and seasonal offers currently active.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full lg-glass-mint text-xs font-bold text-[#062B1F] tabular-nums self-start sm:self-auto">
              {featuredAds.length} active {featuredAds.length === 1 ? 'promotion' : 'promotions'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredAds.map(deal => {
              const lifecycle = getAdLifecycle(deal, nowMs);
              const adImgFailed = failedImgs[`ad-${deal.id}`];
              return (
                <LiquidGlassCard
                  key={deal.id}
                  variant="mint"
                  interactive
                  shimmer
                  className="p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#A8E635] text-[#062B1F] font-extrabold text-[11px]">
                        {deal.discountPercentage
                          ? `${deal.discountPercentage}% Off`
                          : deal.discountText || 'Featured Offer'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectFarmer(deal.farmerId)}
                        className="text-[#145A38] hover:text-[#062B1F] font-bold truncate max-w-[160px] cursor-pointer"
                      >
                        {deal.farmName || deal.farmerName}
                      </button>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-white/80 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
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
                          <Sprout className="w-6 h-6 text-[#145A38]" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-sm text-[#062B1F] leading-snug line-clamp-1">
                          {deal.dealHeadline}
                        </h3>
                        <p className="text-xs text-[#0B261C]/65 line-clamp-1 mt-0.5">
                          {deal.dealDescription || deal.productName}
                        </p>
                        <div className="flex items-baseline gap-2 mt-1.5 tabular-nums">
                          {deal.specialPrice ? (
                            <>
                              <span className="text-base font-extrabold text-[#145A38]">
                                ${deal.specialPrice.toFixed(2)}
                              </span>
                              {deal.productPrice && (
                                <span className="text-xs text-[#0B261C]/40 line-through">
                                  ${deal.productPrice.toFixed(2)}
                                </span>
                              )}
                            </>
                          ) : deal.productPrice ? (
                            <span className="text-base font-extrabold text-[#145A38]">
                              ${deal.productPrice.toFixed(2)}
                            </span>
                          ) : null}
                          {deal.productUnit && (
                            <span className="text-xs text-[#0B261C]/55">/ {deal.productUnit}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#145A38]/12 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#0B261C]/65 font-semibold flex items-center gap-1 tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-[#145A38]" />
                      {lifecycle.remainingLabel}
                    </span>

                    {deal.productId ? (
                      <LiquidGlassButton
                        variant="emerald"
                        size="xs"
                        onClick={() => {
                          const targetProd = products.find(p => p.id === deal.productId);
                          if (targetProd) {
                            onSelectProduct(targetProd);
                          } else {
                            handleQuickTagClick(deal.productName || deal.dealHeadline);
                          }
                        }}
                      >
                        <span>View Offer</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </LiquidGlassButton>
                    ) : (
                      <LiquidGlassButton
                        variant="emerald"
                        size="xs"
                        onClick={() => onSelectFarmer(deal.farmerId)}
                      >
                        <span>Visit Farm</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </LiquidGlassButton>
                    )}
                  </div>
                </LiquidGlassCard>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. DARK FOREST TRANSLUCENT GLASS MARKETPLACE EXPLORER (Sidebar Categories + Glass Grid) */}
      <section
        id="fresh-from-farmers"
        className="relative rounded-2xl sm:rounded-[32px] overflow-hidden border border-white/20 shadow-[0_28px_72px_-20px_rgba(6,43,31,0.62)] bg-[#062B1F] text-white p-4 sm:p-8 scroll-mt-20"
      >
        {/* Atmospheric Forest Foliage Backdrop */}
        <img
          src={meadowLeafImg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-22 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-br from-[#062B1F]/95 via-[#0B3D2B]/90 to-[#145A38]/82 pointer-events-none"
        />

        <div className="relative z-10 space-y-5 sm:space-y-6">
          {/* Header + Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-[#A8E635]">
                Marketplace
              </p>
              <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
                Fresh from Farmers
              </h2>
              <p className="text-xs sm:text-sm text-[#DFF4E4]/80 mt-0.5 tabular-nums">
                {displayedProducts.length}{' '}
                {displayedProducts.length === 1 ? 'listing' : 'listings'} directly from verified producers
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* All Products / Verified Farmers Toggle */}
              <div className="flex items-center p-1 rounded-full bg-white/10 border border-white/20 text-xs">
                <button
                  type="button"
                  onClick={() => setVerifiedOnly(false)}
                  className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                    !verifiedOnly ? 'bg-white text-[#062B1F]' : 'text-[#DFF4E4]/85 hover:text-white'
                  }`}
                >
                  All Products
                </button>
                <button
                  type="button"
                  onClick={() => setVerifiedOnly(true)}
                  className={`px-3 py-1 rounded-full font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                    verifiedOnly ? 'bg-[#A8E635] text-[#062B1F]' : 'text-[#DFF4E4]/85 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Farmers</span>
                </button>
              </div>

              {/* Province Filter */}
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-[#A8E635] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="sidebar-province-select"
                  value={filters.province}
                  onChange={e => setFilters(prev => ({ ...prev, province: e.target.value }))}
                  aria-label="Filter by province"
                  className="appearance-none bg-white/12 hover:bg-white/18 border border-white/25 text-white text-xs font-semibold rounded-full pl-8 pr-8 py-2 focus:outline-none focus:border-[#A8E635] cursor-pointer backdrop-blur-md"
                >
                  {PROVINCES.map(p => (
                    <option key={p} value={p} className="bg-[#062B1F] text-white">
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#DFF4E4]/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Organic Toggle */}
              <button
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, isOrganic: !prev.isOrganic }))}
                className={`px-3.5 py-2 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  filters.isOrganic
                    ? 'bg-[#A8E635] border-white/60 text-[#062B1F]'
                    : 'bg-white/10 border-white/25 hover:bg-white/18 text-white'
                }`}
              >
                <Leaf className="w-3.5 h-3.5" />
                <span>Organic</span>
              </button>

              {/* Sort Select */}
              <div className="relative">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#DFF4E4]/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="sort-by-select"
                  value={filters.sortBy}
                  onChange={e => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  aria-label="Sort products"
                  className="appearance-none bg-white/12 hover:bg-white/18 border border-white/25 text-white text-xs font-semibold rounded-full pl-8 pr-8 py-2 focus:outline-none focus:border-[#A8E635] cursor-pointer backdrop-blur-md"
                >
                  <option value="newest" className="bg-[#062B1F] text-white">Sort: Newest</option>
                  <option value="price_asc" className="bg-[#062B1F] text-white">Price: Low to High</option>
                  <option value="price_desc" className="bg-[#062B1F] text-white">Price: High to Low</option>
                  <option value="rating" className="bg-[#062B1F] text-white">Highest Rated</option>
                  <option value="popular" className="bg-[#062B1F] text-white">Most Popular</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#DFF4E4]/70 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* More Filters Toggle */}
              <button
                id="toggle-filters-drawer-btn"
                type="button"
                onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFiltersCount > 0 || showFiltersDrawer
                    ? 'bg-white/22 border-[#A8E635] text-[#A8E635]'
                    : 'bg-white/10 border-white/25 hover:bg-white/18 text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#A8E635] text-[#062B1F] text-[10px] flex items-center justify-center font-extrabold tabular-nums">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {(activeFiltersCount > 0 || filters.searchQuery) && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3 py-2 text-xs font-bold text-[#A8E635] hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Expandable Frosted Filter Drawer */}
          {showFiltersDrawer && (
            <div className="p-5 rounded-3xl lg-glass-frosted space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/15">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                  Refine Marketplace Listings
                </h3>
                <button
                  type="button"
                  onClick={() => setShowFiltersDrawer(false)}
                  className="p-1 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                  aria-label="Close filters"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-[#DFF4E4]/85 block mb-1.5">
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
                    className="w-full px-3.5 py-2 bg-white/12 rounded-xl border border-white/25 text-white placeholder:text-white/50 text-xs focus:outline-none focus:border-[#A8E635]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#DFF4E4]/85 block mb-1.5">
                    Availability
                  </label>
                  <select
                    value={filters.availability}
                    onChange={e => setFilters(prev => ({ ...prev, availability: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-[#0B3D2B] rounded-xl border border-white/25 text-white text-xs focus:outline-none focus:border-[#A8E635]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="available">In Stock Only</option>
                    <option value="low_stock">Low Stock Alerts</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#DFF4E4]/85 block mb-1.5">
                    City / Town
                  </label>
                  <input
                    type="text"
                    value={filters.city}
                    onChange={e => setFilters(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="e.g. Marondera, Harare"
                    className="w-full px-3.5 py-2 bg-white/12 rounded-xl border border-white/25 text-white placeholder:text-white/50 text-xs focus:outline-none focus:border-[#A8E635]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/15 flex justify-end gap-2">
                <LiquidGlassButton variant="glass" size="xs" onClick={resetFilters}>
                  Reset
                </LiquidGlassButton>
                <LiquidGlassButton
                  variant="lime"
                  size="xs"
                  onClick={() => {
                    loadData();
                    setShowFiltersDrawer(false);
                  }}
                >
                  Apply Filters
                </LiquidGlassButton>
              </div>
            </div>
          )}

          {/* Mobile Horizontal Categories Strip (< lg) */}
          <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              id="category-card-all-mobile"
              type="button"
              onClick={() => handleCategorySelect('all')}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                filters.category === 'all'
                  ? 'bg-[#A8E635] text-[#062B1F]'
                  : 'bg-white/12 text-white border border-white/20'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Products</span>
            </button>
            {categories.map(cat => {
              const isSelected = filters.category === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`category-card-${cat.slug}-mobile`}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#A8E635] text-[#062B1F]'
                      : 'bg-white/12 text-white border border-white/20'
                  }`}
                >
                  {CATEGORY_ICON_MAP[cat.id] || <Carrot className="w-3.5 h-3.5" />}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* 2-Column Layout: Sticky Categories Glass Panel + Product Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Desktop Translucent Categories Sidebar */}
            <aside className="hidden lg:block lg:col-span-3 sticky top-24">
              <div className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-4 space-y-2 shadow-xl">
                <div className="flex items-center justify-between px-2 pb-2 border-b border-white/15">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Categories
                  </span>
                  {filters.category !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setFilters(prev => ({ ...prev, category: 'all' }))}
                      className="text-[11px] font-bold text-[#A8E635] hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-[540px] overflow-y-auto pr-1">
                  <button
                    id="category-card-all"
                    type="button"
                    onClick={() => handleCategorySelect('all')}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      filters.category === 'all'
                        ? 'bg-linear-to-r from-[#A8E635] to-[#63BE2D] text-[#062B1F] shadow-sm'
                        : 'text-[#DFF4E4]/90 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Layers className="w-4 h-4 shrink-0" />
                      <span className="truncate">All Products</span>
                    </span>
                    <span className="text-[10px] opacity-80 tabular-nums">{products.length}</span>
                  </button>

                  {categories.map(cat => {
                    const isSelected = filters.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        id={`category-card-${cat.slug}`}
                        type="button"
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-linear-to-r from-[#A8E635] to-[#63BE2D] text-[#062B1F] font-bold shadow-sm'
                            : 'text-[#DFF4E4]/85 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          {CATEGORY_ICON_MAP[cat.id] || <Carrot className="w-4 h-4 shrink-0" />}
                          <span className="truncate">{cat.name}</span>
                        </span>
                        {cat.itemCount !== undefined && cat.itemCount > 0 && (
                          <span className="text-[10px] opacity-75 tabular-nums">{cat.itemCount}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Right Main Product Grid */}
            <div className="lg:col-span-9 space-y-5">
              {filters.category === 'cat-breeding' && (
                <div className="p-4 rounded-2xl bg-white/12 border border-white/25 backdrop-blur-md flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#A8E635] text-[#062B1F] flex items-center justify-center shrink-0">
                    <Dna className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      Breeding, Crossbreeds &amp; Hybrids
                    </h3>
                    <p className="text-xs text-[#DFF4E4]/80 mt-0.5">
                      Verified F1 crossbred livestock, disease-resilient hybrid poultry, and certified seed varieties directly from local breeders.
                    </p>
                  </div>
                </div>
              )}

              {filters.category === 'cat-fodder' && (
                <div className="p-4 rounded-2xl bg-white/12 border border-white/25 backdrop-blur-md flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#F4D35E] text-[#062B1F] flex items-center justify-center shrink-0">
                    <Wheat className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      Fodder, Hay Bales &amp; Animal Feed
                    </h3>
                    <p className="text-xs text-[#DFF4E4]/80 mt-0.5">
                      High-protein lucerne hay bales, maize silage, Rhodes grass, and livestock feed concentrates from regional suppliers.
                    </p>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-3xl bg-white/10 border border-white/15 overflow-hidden animate-pulse"
                    >
                      <div className="aspect-[4/3] bg-white/10" />
                      <div className="p-4 space-y-3">
                        <div className="h-3 bg-white/20 rounded w-1/3" />
                        <div className="h-4 bg-white/20 rounded w-3/4" />
                        <div className="h-3 bg-white/15 rounded w-2/3" />
                        <div className="h-9 bg-white/15 rounded-xl w-full mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayedProducts.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-3xl bg-white/10 border border-white/20 backdrop-blur-md space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 text-[#A8E635] flex items-center justify-center mx-auto">
                    <Sprout className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h3 className="font-bold text-white text-base">No produce matches your filters</h3>
                    <p className="text-xs text-[#DFF4E4]/75">
                      Try clearing your search term or selecting a broader region to explore available harvests.
                    </p>
                  </div>
                  <LiquidGlassButton variant="lime" size="sm" onClick={resetFilters}>
                    Reset All Filters
                  </LiquidGlassButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {displayedProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelectProduct={onSelectProduct}
                      onContactFarmer={onContactFarmer}
                      surface="dark"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. FARMBRIDGE COMMUNITY CAROUSEL */}
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

      {/* 5. BUYER REQUESTS ("What Buyers Are Looking For") */}
      <section
        id="buyer-requests-section"
        className="space-y-6 pt-2 scroll-mt-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#145A38]">
              Active Demand
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#062B1F] tracking-tight">
              What Buyers Are Looking For
            </h2>
            <p className="text-xs sm:text-sm text-[#0B261C]/65">
              Recent sourcing requests from verified buyers. Farmers and fodder suppliers can respond directly.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {openBuyerRequests.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllBuyerRequests(prev => !prev)}
                className="text-xs font-bold text-[#145A38] hover:underline cursor-pointer"
              >
                {showAllBuyerRequests
                  ? 'Show Fewer'
                  : `View all buyer requests (${openBuyerRequests.length})`}
              </button>
            )}
            {user?.role === 'buyer' && onNavigate && (
              <LiquidGlassButton
                variant="emerald"
                size="xs"
                onClick={() => onNavigate('buyer_dashboard')}
              >
                Post a Request
              </LiquidGlassButton>
            )}
          </div>
        </div>

        {requestNotice && (
          <div className="p-3.5 rounded-2xl lg-glass-mint border border-[#145A38]/25 text-xs text-[#062B1F] flex items-center justify-between gap-3">
            <span>{requestNotice}</span>
            <button
              type="button"
              onClick={() => setRequestNotice(null)}
              className="text-[#0B261C]/60 hover:text-[#062B1F] cursor-pointer"
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
                className="h-48 rounded-3xl lg-glass-light animate-pulse"
              />
            ))}
          </div>
        ) : visibleBuyerRequests.length === 0 ? (
          <LiquidGlassCard variant="light" className="p-8 text-center space-y-2">
            <ClipboardList className="w-7 h-7 text-[#145A38] mx-auto" />
            <h3 className="text-sm font-bold text-[#062B1F]">No Open Buyer Requests Right Now</h3>
            <p className="text-xs text-[#0B261C]/65 max-w-md mx-auto">
              Buyers looking for specific volumes or crops can post sourcing requests from their Buyer Hub.
            </p>
          </LiquidGlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleBuyerRequests.map(req => {
              const hasResponded = Boolean(user && (req.respondedFarmerIds || []).includes(user.id));
              const statusLabel = req.status === 'in_discussion' ? 'In Discussion' : 'Open';
              return (
                <LiquidGlassCard
                  key={req.id}
                  variant="light"
                  interactive
                  className="p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#145A38]">
                          {req.categoryName || 'Produce Request'}
                        </span>
                        <h3 className="font-extrabold text-base text-[#062B1F] leading-snug line-clamp-1 mt-0.5">
                          {req.productName}
                        </h3>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full bg-[#DFF4E4] text-[#062B1F] text-[10px] font-extrabold flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#145A38]" />
                        {statusLabel}
                      </span>
                    </div>

                    {req.description && (
                      <p className="text-xs text-[#0B261C]/70 line-clamp-2 leading-relaxed">
                        {req.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-[#0B261C]/75 pt-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <Package className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                        <span className="font-semibold truncate">{req.quantityRequired}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                        <span className="truncate">{req.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#0B261C]/55">
                        <Calendar className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                        <span>Posted {new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                      {req.preferredPrice !== undefined && (
                        <div className="text-[11px] font-extrabold text-[#145A38] tabular-nums">
                          Target: ${req.preferredPrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#145A38]/12 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#0B261C]/60 font-medium tabular-nums">
                      {req.responseCount || 0} {(req.responseCount || 0) === 1 ? 'response' : 'responses'}
                    </span>

                    <LiquidGlassButton
                      variant="emerald"
                      size="xs"
                      disabled={respondingRequestId === req.id}
                      onClick={() => handleRespondToRequestAction(req)}
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
                    </LiquidGlassButton>
                  </div>
                </LiquidGlassCard>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. FEATURED FARMERS ("Meet Our Farmers") */}
      <section
        id="featured-farmers-section"
        className="space-y-6 pt-2 scroll-mt-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#145A38]">
              Local Producers
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#062B1F] tracking-tight">
              Meet Our Farmers
            </h2>
            <p className="text-xs sm:text-sm text-[#0B261C]/65">
              Connect directly with regional growers and fodder suppliers on FarmBridge.
            </p>
          </div>
        </div>

        {farmersLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="h-56 rounded-3xl lg-glass-light animate-pulse"
              />
            ))}
          </div>
        ) : featuredFarmers.length === 0 ? (
          <LiquidGlassCard variant="light" className="p-8 text-center text-xs text-[#0B261C]/65">
            Registered farmers and suppliers will appear here as they join FarmBridge.
          </LiquidGlassCard>
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
                <LiquidGlassCard
                  key={farmer.id}
                  variant="mint"
                  interactive
                  className="p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-white border-2 border-[#A8E635]/60 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
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
                          <span className="font-bold text-sm text-[#145A38]">
                            {farmName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-sm text-[#062B1F] truncate">
                            {farmName}
                          </h3>
                          {isVerified && (
                            <ShieldCheck
                              className="w-4 h-4 text-[#145A38] shrink-0"
                              aria-label="Verified Producer"
                            />
                          )}
                        </div>
                        <p className="text-xs text-[#0B261C]/65 truncate font-medium">
                          {farmer.role === 'fodder_supplier' ? 'Fodder Supplier' : 'Local Farmer'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#0B261C]/75">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                        <span className="truncate">
                          {farmer.location?.city || 'Harare'}, {farmer.location?.province || 'Harare'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        {reviewCount > 0 && avgRating > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-[#062B1F] tabular-nums">
                            <Star className="w-3.5 h-3.5 fill-[#F4D35E] text-[#F4D35E]" />
                            <span>{avgRating.toFixed(1)}</span>
                            <span className="font-normal text-[#0B261C]/55">
                              ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                            </span>
                          </span>
                        ) : (
                          <span className="text-[#0B261C]/55">New producer on FarmBridge</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <LiquidGlassButton
                    variant="emerald"
                    size="sm"
                    className="w-full"
                    onClick={() => onSelectFarmer(farmer.id)}
                  >
                    View Profile
                  </LiquidGlassButton>
                </LiquidGlassCard>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
