import React, { useState, useEffect } from 'react';
import { Product, ProductCategory, FilterState } from '../types';
import { api } from '../services/api';
import { ProductCard } from './ProductCard';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Leaf,
  X,
  Sparkles,
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
  Check,
  ChevronDown
} from 'lucide-react';

interface MarketplaceProps {
  onSelectProduct: (product: Product) => void;
  onSelectFarmer: (farmerId: string) => void;
}

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
  'cat-veg': <Carrot className="w-4 h-4" />,
  'cat-fruits': <Apple className="w-4 h-4" />,
  'cat-grains': <Wheat className="w-4 h-4" />,
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

export const Marketplace: React.FC<MarketplaceProps> = ({ onSelectProduct, onSelectFarmer }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState<boolean>(false);

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    category: 'all',
    province: 'All Regions',
    city: '',
    minPrice: undefined,
    maxPrice: undefined,
    availability: 'all',
    isOrganic: false,
    sortBy: 'newest'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodsData, catsData] = await Promise.all([
        api.getProducts({
          searchQuery: filters.searchQuery,
          category: filters.category,
          province: filters.province === 'All Regions' ? undefined : filters.province,
          city: filters.city,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
          availability: filters.availability,
          isOrganic: filters.isOrganic,
          sortBy: filters.sortBy
        }),
        api.getCategories()
      ]);
      setProducts(prodsData);
      setCategories(catsData);
    } catch (err) {
      console.error('Failed to load marketplace products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters.category, filters.province, filters.availability, filters.isOrganic, filters.sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleQuickTagClick = (tag: string) => {
    setFilters(prev => ({ ...prev, searchQuery: tag }));
    // Trigger direct load with this tag
    api.getProducts({
      searchQuery: tag,
      category: filters.category,
      province: filters.province === 'All Regions' ? undefined : filters.province,
      sortBy: filters.sortBy
    }).then(res => setProducts(res));
  };

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      category: 'all',
      province: 'All Regions',
      city: '',
      minPrice: undefined,
      maxPrice: undefined,
      availability: 'all',
      isOrganic: false,
      sortBy: 'newest'
    });
    setTimeout(loadData, 50);
  };

  const activeFiltersCount = [
    filters.category !== 'all',
    filters.province !== 'All Regions',
    filters.minPrice !== undefined,
    filters.maxPrice !== undefined,
    filters.availability !== 'all',
    filters.isOrganic
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 pb-16">
      {/* Hero Seasonal Agricultural Banner */}
      <div className="relative rounded-3xl bg-linear-to-r from-emerald-900 via-emerald-800 to-stone-900 text-white overflow-hidden p-6 sm:p-10 shadow-xl">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            100% Direct From Local Farmers
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Fresh Produce & Goods Straight from the Soil.
          </h1>

          <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
            Connect directly with verified local growers in your province. Order farm-fresh vegetables, organic eggs, pure honey, and grains without middlemen markups.
          </p>

          {/* Prominent Search Bar */}
          <form onSubmit={handleSearchSubmit} className="pt-2">
            <div className="relative flex items-center bg-white rounded-2xl p-1.5 shadow-2xl border border-white/20">
              <Search className="w-5 h-5 text-stone-400 ml-3 shrink-0" />
              <input
                id="marketplace-search-input"
                type="text"
                value={filters.searchQuery}
                onChange={e => setFilters({ ...filters, searchQuery: e.target.value })}
                placeholder="Search tomatoes, maize, pasture eggs, raw honey..."
                className="w-full px-3 py-2 text-stone-900 text-sm focus:outline-none placeholder:text-stone-400"
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters({ ...filters, searchQuery: '' });
                    api.getProducts({}).then(res => setProducts(res));
                  }}
                  className="p-1.5 text-stone-400 hover:text-stone-600 mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors shrink-0 shadow-xs"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick Suggestions Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-stone-300">
            <span className="font-medium opacity-80">Popular:</span>
            {['Tomatoes', 'Maize', 'Fresh vegetables', 'Chicken', 'Eggs', 'Honey', 'Avocados'].map(tag => (
              <button
                key={tag}
                onClick={() => handleQuickTagClick(tag)}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-stone-200 hover:text-white transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Two-Column Marketplace Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Sidebar: Categories, Location Distance & Support Small Farms Card */}
        <aside className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-6 shadow-xs">
          {/* Categories List */}
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
              Categories
            </h3>
            <ul className="space-y-1 text-sm font-medium">
              <li>
                <button
                  id="category-sidebar-all"
                  onClick={() => setFilters({ ...filters, category: 'all' })}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left ${
                    filters.category === 'all'
                      ? 'bg-green-50 text-green-700 font-bold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-green-600" />
                    All Produce
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">
                    {products.length}
                  </span>
                </button>
              </li>
              {categories.map(cat => {
                const isSelected = filters.category === cat.id;
                return (
                  <li key={cat.id}>
                    <button
                      id={`category-sidebar-${cat.slug}`}
                      onClick={() => setFilters({ ...filters, category: isSelected ? 'all' : cat.id })}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left ${
                        isSelected
                          ? 'bg-green-50 text-green-700 font-bold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-green-600">{CATEGORY_ICON_MAP[cat.id] || <Carrot className="w-4 h-4" />}</span>
                        <span>{cat.name}</span>
                      </span>
                      {cat.itemCount !== undefined && cat.itemCount > 0 && (
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${
                          isSelected ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {cat.itemCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Location & Radius Selector */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Location & Radius
            </h3>
            <div className="space-y-3">
              <div className="relative">
                <select
                  id="sidebar-province-select"
                  value={filters.province}
                  onChange={e => setFilters({ ...filters, province: e.target.value })}
                  className="w-full text-xs font-semibold p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                >
                  {PROVINCES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="range"
                    min="5"
                    max="100"
                    defaultValue="25"
                    className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                </div>
                <span className="text-xs font-bold text-gray-600 shrink-0">25 km</span>
              </div>
            </div>
          </div>

          {/* Organic Direct Toggle */}
          <div className="pt-4 border-t border-gray-100">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <Leaf className="w-3.5 h-3.5 text-green-600" />
                Organic Certified
              </span>
              <input
                type="checkbox"
                checked={filters.isOrganic}
                onChange={e => setFilters({ ...filters, isOrganic: e.target.checked })}
                className="w-4 h-4 rounded text-green-600 focus:ring-green-500 accent-green-600"
              />
            </label>
          </div>

          {/* Professional Polish: Support Small Farms highlight banner */}
          <div className="mt-2 p-4 rounded-xl bg-orange-50 border border-orange-100">
            <p className="text-[11px] font-bold text-orange-800 uppercase tracking-wider mb-1.5">
              Support Small Farms
            </p>
            <p className="text-[11px] text-orange-700 leading-relaxed font-medium">
              Buying direct from local growers increases their income by up to 40% while ensuring pesticide transparency.
            </p>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header Bar */}
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Fresh Harvest Marketplace</h1>
              <p className="text-xs text-gray-500 mt-1">
                {products.length} products available near your chosen location today
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  id="sort-by-select"
                  value={filters.sortBy}
                  onChange={e => setFilters({ ...filters, sortBy: e.target.value as any })}
                  className="appearance-none bg-white border border-gray-200 text-gray-800 text-xs font-semibold rounded-lg pl-8 pr-8 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer shadow-xs"
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="popular">Most Popular</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                id="toggle-filters-drawer-btn"
                onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors shadow-xs ${
                  activeFiltersCount > 0
                    ? 'bg-green-50 border-green-300 text-green-800'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-green-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </header>

          {/* Expanded Filter Drawer */}
          {showFiltersDrawer && (
            <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Advanced Filters</h3>
                <button
                  onClick={() => setShowFiltersDrawer(false)}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {/* Price Range */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Max Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={filters.maxPrice || ''}
                    onChange={e => setFilters({ ...filters, maxPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g. 20"
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-900 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Availability */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Availability Status</label>
                  <select
                    value={filters.availability}
                    onChange={e => setFilters({ ...filters, availability: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-900 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="available">In Stock Only</option>
                    <option value="low_stock">Low Stock Alerts</option>
                  </select>
                </div>

                {/* City Search */}
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">City / Town</label>
                  <input
                    type="text"
                    value={filters.city}
                    onChange={e => setFilters({ ...filters, city: e.target.value })}
                    placeholder="e.g. Marondera, Harare"
                    className="w-full px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-900 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={loadData}
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="h-44 bg-gray-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded-md w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded-md w-1/2"></div>
                    <div className="h-5 bg-gray-200 rounded-md w-1/3 pt-2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-gray-200 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto">
                <Carrot className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-bold text-gray-900 text-lg">No products found</h3>
                <p className="text-xs text-gray-500">
                  Try adjusting your search criteria or resetting filters to view all fresh farm items.
                </p>
              </div>
              <button
                onClick={resetFilters}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-bold text-xs hover:bg-green-700 transition-colors shadow-xs"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelectProduct={onSelectProduct}
                />
              ))}

              {/* Community Request Card (from Professional Polish design) */}
              <div
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setFilters({ ...filters, searchQuery: '' });
                }}
                className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center gap-3 p-6 text-center group cursor-pointer hover:border-green-500 transition-colors shadow-xs min-h-[300px]"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🌾
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Can't find something?</p>
                  <p className="text-[11px] text-gray-500 px-4 mt-1 leading-relaxed">
                    Looking for a specific bulk grain, organic herb, or seasonal fruit? Connect with local producers directly.
                  </p>
                </div>
                <button className="mt-2 px-5 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors">
                  Explore Farm Network
                </button>
              </div>
            </div>
          )}

          {/* Platform News Footer Strip (from Professional Polish design) */}
          <div className="h-12 bg-green-800 rounded-xl px-4 sm:px-6 flex items-center justify-between text-white text-xs shadow-xs">
            <div className="flex items-center gap-3 truncate">
              <span className="text-[10px] font-bold bg-green-700 px-2 py-0.5 rounded text-green-100 shrink-0">
                PLATFORM NEWS
              </span>
              <p className="text-[11px] font-medium opacity-90 truncate">
                Direct Farm Trade: Free verified farm pickup across all registered provincial producers.
              </p>
            </div>
            <div className="hidden sm:flex gap-4 text-[11px] shrink-0 opacity-80">
              <span>Fair Trade Certified</span>
              <span>•</span>
              <span className="font-semibold">agroX v1.4.2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
