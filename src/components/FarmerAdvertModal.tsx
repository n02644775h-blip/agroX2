import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  createFirebaseAdRequest,
  subscribeToFirebaseAdRequests
} from '../services/firebaseAdRequests';
import { compressImage } from '../utils/imageCompressor';
import { Product, AdRequest } from '../types';
import {
  X,
  Megaphone,
  Flame,
  DollarSign,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  ShieldCheck,
  Info,
  Sliders,
  Check,
  RefreshCw,
  Sparkles,
  ShoppingBag,
  FileText
} from 'lucide-react';

interface FarmerAdvertModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  products: Product[];
}

const SAMPLE_POP_RECEIPTS = [
  { name: 'EcoCash Mobile Money Receipt ($14.00)', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800' },
  { name: 'InnBucks Retail Voucher POP ($7.00)', url: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&q=80&w=800' }
];

export const FarmerAdvertModal: React.FC<FarmerAdvertModalProps> = ({
  onClose,
  onSuccess,
  products = []
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [myAds, setMyAds] = useState<AdRequest[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'my_campaigns'>('create');

  // Produce selection mode: 'catalog' | 'custom'
  const hasProducts = products && products.length > 0;
  const [produceMode, setProduceMode] = useState<'catalog' | 'custom'>(hasProducts ? 'catalog' : 'custom');

  // Catalog selection
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');

  // Custom produce fields (for when farmer has no active catalog products or wants a custom promotional deal)
  const [customProduceName, setCustomProduceName] = useState('');
  const [customPrice, setCustomPrice] = useState('1.50');
  const [customUnit, setCustomUnit] = useState(user?.role === 'fodder_supplier' ? 'bale' : 'kg');
  const [customCategory, setCustomCategory] = useState(
    user?.role === 'fodder_supplier' ? 'Fodder & Animal Feed' : 'Vegetables'
  );
  const [customImageUrl, setCustomImageUrl] = useState('');

  // Deal info
  const [dealHeadline, setDealHeadline] = useState('');
  const [dealDescription, setDealDescription] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(20);
  const [specialPrice, setSpecialPrice] = useState<string>('');
  const [days, setDays] = useState<number>(7); // Default 7 days
  const [paymentMethod, setPaymentMethod] = useState<'ecocash' | 'innbucks' | 'bank_transfer' | 'cash'>('ecocash');
  const [paymentReference, setPaymentReference] = useState('');
  const [popUrl, setPopUrl] = useState<string>(SAMPLE_POP_RECEIPTS[0].url);
  const [popFileName, setPopFileName] = useState<string>('EcoCash_POP_Payment_Receipt.jpg');
  const [isCompressingPop, setIsCompressingPop] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Auto-sync catalog selection if products load asynchronously after modal opens
  useEffect(() => {
    if (products && products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
      setProduceMode('catalog');
    }
  }, [products, selectedProductId]);

  // Auto-fill headline and special price when product or discount changes
  useEffect(() => {
    if (produceMode === 'catalog' && selectedProduct) {
      if (!dealHeadline || dealHeadline.startsWith('🔥 Special Harvest Deal:')) {
        setDealHeadline(`🔥 Special Harvest Deal: ${selectedProduct.name}`);
      }
      if (selectedProduct.price) {
        const discounted = (selectedProduct.price * (1 - discountPercentage / 100)).toFixed(2);
        setSpecialPrice(discounted);
      }
    } else if (produceMode === 'custom' && customProduceName) {
      if (!dealHeadline || dealHeadline.startsWith('🔥 Special Harvest Deal:')) {
        setDealHeadline(`🔥 Special Harvest Deal: ${customProduceName}`);
      }
    }
  }, [selectedProductId, selectedProduct, produceMode, customProduceName, discountPercentage]);

  // Load farmer's ads from API and subscribe in Firestore
  const farmerId = user?.id || (user as any)?.uid || '';

  const loadMyAds = async () => {
    if (!farmerId) return;
    setLoadingAds(true);
    try {
      const list = await api.getAdRequests({ farmerId });
      if (list && Array.isArray(list)) {
        setMyAds(prev => {
          const map = new Map<string, AdRequest>();
          prev.forEach(a => map.set(a.id, a));
          list.forEach(a => map.set(a.id, a));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      }
    } catch (err) {
      console.warn('Could not fetch ad requests from API:', err);
    } finally {
      setLoadingAds(false);
    }
  };

  useEffect(() => {
    if (!farmerId) return;

    // Attach real-time Firestore listener
    const unsubscribe = subscribeToFirebaseAdRequests(
      { farmerId },
      (fbAds) => {
        if (fbAds && fbAds.length > 0) {
          setMyAds(prev => {
            const map = new Map<string, AdRequest>();
            prev.forEach(a => map.set(a.id, a));
            fbAds.forEach(a => map.set(a.id, a));
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });
          setLoadingAds(false);
        }
      },
      (err) => {
        console.warn('Firestore adRequests listener warning:', err);
      }
    );

    // Initial load from API store
    loadMyAds();

    return () => {
      unsubscribe();
    };
  }, [farmerId]);

  const handleDiscountChange = (pct: number) => {
    setDiscountPercentage(pct);
    const basePrice = produceMode === 'catalog'
      ? selectedProduct?.price
      : parseFloat(customPrice) || 0;
    if (basePrice) {
      const discounted = (basePrice * (1 - pct / 100)).toFixed(2);
      setSpecialPrice(discounted);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingPop(true);
    setErrorMsg('');
    setPopFileName(file.name);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      if (file.size > 700 * 1024) {
        setErrorMsg('PDF receipt must be under 700KB. Please upload a smaller PDF or a screenshot image.');
        setIsCompressingPop(false);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPopUrl(reader.result);
        }
        setIsCompressingPop(false);
      };
      reader.onerror = () => {
        setErrorMsg('Failed to read PDF file. Please upload an image screenshot.');
        setIsCompressingPop(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      // Compress image to max 1000px and 75% quality (~80-120KB) to prevent 413s and Firestore limits
      const compressed = await compressImage(file, 1000, 1000, 0.75);
      setPopUrl(compressed);
    } catch (compressErr) {
      console.warn('Error compressing image, reading raw data:', compressErr);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPopUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingPop(false);
    }
  };

  const totalFee = days * 1.00;

  const handleSubmitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Please log in to submit an advertising request.');
      return;
    }

    const currentFarmerId = user.id || (user as any)?.uid || 'farmer-1';
    const isCustom = produceMode === 'custom' || !hasProducts;

    const prodName = isCustom ? customProduceName.trim() : (selectedProduct?.name || 'Farm Produce');
    const parsedCustomPrice = parseFloat(customPrice);
    const prodPrice = isCustom
      ? (Number.isFinite(parsedCustomPrice) && parsedCustomPrice >= 0 ? parsedCustomPrice : undefined)
      : (typeof selectedProduct?.price === 'number' && Number.isFinite(selectedProduct.price) ? selectedProduct.price : undefined);
    const prodUnit = isCustom ? (customUnit.trim() || 'kg') : (selectedProduct?.unit || 'kg');
    const prodCategory = isCustom ? customCategory : (selectedProduct?.categoryName || selectedProduct?.category || 'Fresh Produce');
    const defaultImg = customCategory === 'Fodder & Animal Feed' || user.role === 'fodder_supplier'
      ? 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800'
      : 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800';
    const prodImage = isCustom
      ? (customImageUrl.trim() || defaultImg)
      : (selectedProduct?.images?.[0] || defaultImg);

    if (isCustom && !prodName) {
      setErrorMsg('Please enter the name of the produce or fodder you want to advertise.');
      return;
    }

    const finalHeadline = dealHeadline.trim() || `🔥 Special Harvest Deal: ${prodName}`;
    if (!finalHeadline) {
      setErrorMsg('Please provide a campaign headline.');
      return;
    }

    if (!popUrl) {
      setErrorMsg('Please upload a Proof of Payment (POP) screenshot or select a sample.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const finalDays = Math.min(Math.max(Math.round(Number(days)) || 1, 1), 30);
      const dailyRate = 1.00;
      const totalAmount = finalDays * dailyRate;
      const rawDiscount = Number(discountPercentage);
      const discountPct = Number.isFinite(rawDiscount) && rawDiscount > 0 ? rawDiscount : undefined;
      const parsedSpecial = specialPrice ? parseFloat(specialPrice) : NaN;
      const safeSpecialPrice = Number.isFinite(parsedSpecial) && parsedSpecial > 0 ? parsedSpecial : undefined;
      const discountText = discountPct
        ? `${discountPct}% OFF`
        : (safeSpecialPrice !== undefined ? `Special: $${safeSpecialPrice.toFixed(2)}` : 'PROMO DEAL');

      const payload: Partial<AdRequest> = {
        farmerId: currentFarmerId,
        farmerName: user.name || 'Farmer',
        farmerAvatar: user.avatar || '',
        farmName: user.farmerProfile?.farmName || `${user.name || 'Farmer'}'s ${user.role === 'fodder_supplier' ? 'Fodder Supply' : 'Farm'}`,
        farmerEmail: user.email || '',
        farmerPhone: user.phone || '',
        productId: isCustom ? undefined : selectedProduct?.id,
        productName: prodName,
        productImage: prodImage,
        productPrice: prodPrice,
        productUnit: prodUnit,
        category: prodCategory,
        categoryName: prodCategory,
        dealHeadline: finalHeadline,
        dealDescription: dealDescription.trim() || `Special promotional offer for ${prodName} direct from ${user.farmerProfile?.farmName || user.name || 'our farm'}.`,
        discountPercentage: discountPct,
        specialPrice: safeSpecialPrice,
        discountText,
        days: finalDays,
        durationDays: finalDays,
        dailyRate,
        totalAmount,
        totalFee: totalAmount,
        proofOfPaymentUrl: popUrl,
        proofOfPaymentFileName: popFileName || 'Proof_of_Payment.jpg',
        paymentMethod,
        paymentReference: paymentReference.trim() || `TXN-${Date.now().toString().slice(-6)}`,
        status: 'sent'
      };

      // 1. Direct write to Firestore for durability
      let savedFbAd: AdRequest | null = null;
      try {
        savedFbAd = await createFirebaseAdRequest(payload);
      } catch (fbErr) {
        console.warn('Firestore ad save warning:', fbErr);
      }

      // 2. Sync to API backend proxy
      try {
        await api.createAdRequest({
          ...payload,
          id: savedFbAd?.id
        });
      } catch (apiErr) {
        console.warn('API store ad sync warning:', apiErr);
        // If Firestore already saved the request, do not trigger a frontend error popup
        if (!savedFbAd) {
          throw apiErr;
        }
      }

      setFormSuccess(true);
      await loadMyAds();

      setTimeout(() => {
        setFormSuccess(false);
        setActiveTab('my_campaigns');
      }, 1200);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to create ad request:', err);
      setErrorMsg(err?.message || 'Failed to submit advertising request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="farmer-advert-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="farmer-advert-modal-dialog"
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-linear-to-r from-orange-600 via-amber-600 to-amber-700 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
              <Flame className="w-6 h-6 text-amber-200 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-white text-lg tracking-tight">
                  Hot Deals & Featured Promotions
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-900 font-extrabold text-[10px] tracking-wide uppercase">
                  $1.00 / Day
                </span>
              </div>
              <p className="text-xs text-amber-100">
                Boost your harvest visibility on the marketplace homepage with verified admin approval
              </p>
            </div>
          </div>
          <button
            id="close-farmer-advert-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full text-amber-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="px-6 pt-3 bg-stone-50 border-b border-stone-200 flex items-center gap-2 text-xs font-bold shrink-0">
          <button
            id="tab-request-advert-btn"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white border-orange-600 text-orange-700 shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Megaphone className="w-4 h-4 text-orange-600" />
            Request New Advertisement
          </button>

          <button
            id="tab-my-campaigns-btn"
            onClick={() => setActiveTab('my_campaigns')}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'my_campaigns'
                ? 'bg-white border-orange-600 text-orange-700 shadow-xs'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Clock className="w-4 h-4 text-stone-500" />
            <span>Advertising Requests & State</span>
            <span className="px-1.5 py-0.5 rounded-full bg-stone-200 text-stone-700 text-[10px]">
              {myAds.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Create Request */}
        {activeTab === 'create' && (
          <form onSubmit={handleSubmitAd} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Advertising request submitted successfully! Status is now: <strong>Sent (Pending Admin Review)</strong></span>
              </div>
            )}

            {/* Step 1: Select Produce / Custom Harvest */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Tag className="w-4 h-4 text-orange-600" />
                  1. Select Produce to Feature
                </label>
                {hasProducts && (
                  <div className="flex items-center gap-1 bg-stone-200/70 p-0.5 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setProduceMode('catalog')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        produceMode === 'catalog' ? 'bg-white text-orange-700 shadow-xs' : 'text-stone-600'
                      }`}
                    >
                      Listed Products
                    </button>
                    <button
                      type="button"
                      onClick={() => setProduceMode('custom')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        produceMode === 'custom' ? 'bg-white text-orange-700 shadow-xs' : 'text-stone-600'
                      }`}
                    >
                      Custom Harvest
                    </button>
                  </div>
                )}
              </div>

              {produceMode === 'catalog' && hasProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                  {products.map(prod => {
                    const isSelected = selectedProductId === prod.id;
                    return (
                      <div
                        key={prod.id}
                        onClick={() => setSelectedProductId(prod.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-amber-50/70 border-orange-500 ring-2 ring-orange-500/20 shadow-xs'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <img
                          src={prod.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800'}
                          alt={prod.name}
                          className="w-12 h-12 rounded-xl object-cover bg-stone-100 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-stone-900 truncate">{prod.name}</div>
                          <div className="text-stone-500 text-[11px]">
                            ${prod.price.toFixed(2)} / {prod.unit} • Stock: {prod.quantityAvailable}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Custom Harvest / Produce input form */
                <div className="space-y-3 bg-white p-4 rounded-xl border border-stone-200">
                  <div className="flex items-center gap-1.5 text-stone-600 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>Promote your harvest, bulk produce, or seasonal special direct to customers:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Produce / Harvest Name *</label>
                      <input
                        type="text"
                        value={customProduceName}
                        onChange={e => setCustomProduceName(e.target.value)}
                        placeholder="e.g. Farm-Fresh Roma Tomatoes or Butternut"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 font-semibold"
                        required={produceMode === 'custom' || !hasProducts}
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Category</label>
                      <select
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 bg-white"
                      >
                        <option value="Vegetables">Vegetables</option>
                        <option value="Fruits">Fruits</option>
                        <option value="Grains & Cereals">Grains & Cereals</option>
                        <option value="Fodder & Animal Feed">Fodder & Animal Feed</option>
                        <option value="Livestock & Poultry">Livestock & Poultry</option>
                        <option value="Dairy & Eggs">Dairy & Eggs</option>
                        <option value="Tubers">Tubers</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Regular Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={customPrice}
                        onChange={e => setCustomPrice(e.target.value)}
                        placeholder="1.50"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1">Unit of Sale</label>
                      <input
                        type="text"
                        value={customUnit}
                        onChange={e => setCustomUnit(e.target.value)}
                        placeholder="kg, crate, bag, bunch"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Campaign Duration Slider ($1/day) */}
            <div className="bg-amber-50/50 p-5 rounded-3xl border border-amber-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-orange-600" />
                    2. Campaign Duration & Pricing Slider
                  </label>
                  <p className="text-stone-500 text-xs">
                    Flat promotional fee of <strong>$1.00 per day</strong> (Range: 1 to 30 days)
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-orange-700">
                    ${totalFee.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-stone-500 font-semibold">
                    {days} {days === 1 ? 'day' : 'days'} @ $1/day
                  </div>
                </div>
              </div>

              {/* Range Slider */}
              <div className="space-y-2">
                <input
                  id="ad-days-slider"
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={days}
                  onChange={e => setDays(Number(e.target.value))}
                  className="w-full h-2.5 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                />
                <div className="flex justify-between text-[11px] text-stone-500 font-bold px-1">
                  <span>1 Day ($1)</span>
                  <span>7 Days ($7)</span>
                  <span>14 Days ($14)</span>
                  <span>21 Days ($21)</span>
                  <span>30 Days ($30 max)</span>
                </div>
              </div>
            </div>

            {/* Step 3: Deal Headline & Offer Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Deal Headline *</label>
                <input
                  type="text"
                  value={dealHeadline}
                  onChange={e => setDealHeadline(e.target.value)}
                  placeholder="e.g. 🔥 Flash 25% Off Farm-Fresh Roma Tomatoes!"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-orange-500/20"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Special Discount (%)</label>
                <div className="flex items-center gap-2">
                  {[10, 15, 20, 25, 30].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleDiscountChange(pct)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex-1 cursor-pointer ${
                        discountPercentage === pct
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Special Promo Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Special Discount Price ($)</label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    value={specialPrice}
                    onChange={e => setSpecialPrice(e.target.value)}
                    placeholder="1.20"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 text-stone-900 font-bold"
                  />
                </div>
                {produceMode === 'catalog' && selectedProduct && (
                  <p className="text-[10px] text-stone-500 mt-1">
                    Standard regular price: ${selectedProduct.price.toFixed(2)} / {selectedProduct.unit}
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">Deal Highlights / Promotion Notes</label>
                <input
                  type="text"
                  value={dealDescription}
                  onChange={e => setDealDescription(e.target.value)}
                  placeholder="e.g. Plump sweet produce picked daily. Minimum order 10kg."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-stone-900"
                />
              </div>
            </div>

            {/* Step 4: Payment Method & Proof of Payment (POP) */}
            <div className="bg-stone-50 p-5 rounded-3xl border border-stone-200 space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  3. Payment Method & Proof of Payment (POP)
                </label>
                <span className="text-emerald-800 font-extrabold text-xs">
                  Pay Exactly: ${totalFee.toFixed(2)}
                </span>
              </div>

              {/* Payment Account Details Box */}
              <div className="p-3.5 bg-white rounded-2xl border border-emerald-200 text-stone-700 text-xs space-y-1">
                <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-700" />
                  Direct agroX Advertising Accounts:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <strong>EcoCash Biller Code:</strong> 99482 (agroX Ads) or 0772 900 112
                  </div>
                  <div>
                    <strong>InnBucks Account:</strong> @AGROX-ADS (#99812)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-stone-700 block mb-1">Payment Method Used</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 bg-white"
                  >
                    <option value="ecocash">EcoCash Mobile Money</option>
                    <option value="innbucks">InnBucks Remittance</option>
                    <option value="bank_transfer">Bank Transfer / Zipit</option>
                    <option value="cash">AgriConnect Cash Depot</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Transaction Ref / Reference No.</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder="e.g. EC-88912-7741 or INB9904"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 font-mono"
                  />
                </div>
              </div>

              {/* Proof of Payment (POP) File Upload & Preview */}
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Upload Proof of Payment (POP Screenshot / PDF / Receipt) *
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {popUrl && (
                    <div className="relative group shrink-0">
                      {popUrl.startsWith('data:application/pdf') ? (
                        <div className="w-20 h-20 rounded-xl border-2 border-emerald-600 shadow-xs bg-emerald-50 flex flex-col items-center justify-center text-emerald-800 p-2 text-center">
                          <FileText className="w-7 h-7 text-emerald-600 mb-1" />
                          <span className="text-[9px] font-bold leading-tight truncate w-full">PDF POP</span>
                        </div>
                      ) : (
                        <img
                          src={popUrl}
                          alt="Proof of payment"
                          className="w-20 h-20 rounded-xl object-cover border-2 border-emerald-600 shadow-xs bg-white"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                        POP Ready
                      </div>
                    </div>
                  )}

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*,.pdf"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCompressingPop}
                        className="px-4 py-2.5 bg-white hover:bg-stone-100 text-emerald-800 border-2 border-dashed border-emerald-400 rounded-xl font-bold flex items-center gap-2 transition-colors w-full justify-center cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {isCompressingPop
                            ? 'Compressing file...'
                            : popFileName
                            ? `Selected: ${popFileName}`
                            : 'Choose POP File / Screenshot'}
                        </span>
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-2 text-[11px] text-stone-500">
                      <span className="font-bold text-stone-400">Sample POP:</span>
                      {SAMPLE_POP_RECEIPTS.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPopUrl(s.url);
                            setPopFileName(s.name);
                          }}
                          className="text-emerald-700 underline hover:text-emerald-900 truncate cursor-pointer"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <div className="text-stone-600 text-xs">
                Total Campaign Cost: <strong className="text-orange-700 text-base">${totalFee.toFixed(2)}</strong> ({days} days)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-ad-request-btn"
                  type="submit"
                  disabled={isSubmitting || isCompressingPop}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold shadow-md transition-all active:scale-98 disabled:bg-stone-300 flex items-center gap-2 cursor-pointer"
                >
                  <Megaphone className="w-4 h-4" />
                  {isSubmitting ? 'Submitting Request...' : 'Request Access & Submit POP'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: My Campaigns & Life-Cycle Status (Sent -> Under Review -> Approved / Rejected) */}
        {activeTab === 'my_campaigns' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm">Your Advertisement Requests History</h3>
              <button
                onClick={loadMyAds}
                className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Status
              </button>
            </div>

            {loadingAds ? (
              <div className="py-12 text-center text-stone-400">Loading campaign statuses...</div>
            ) : myAds.length === 0 ? (
              <div className="py-12 text-center text-stone-500 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <Megaphone className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="font-bold text-stone-700">No advertisement requests yet</p>
                <p className="text-xs text-stone-400">Create your first $1/day Hot Deal to feature on the homepage.</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 bg-orange-600 text-white font-bold rounded-xl text-xs mt-2 cursor-pointer"
                >
                  Create Ad Request
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myAds.map(ad => {
                  const isSent = ad.status === 'sent' || ad.status === 'submitted';
                  const isUnderReview = ad.status === 'under_review';
                  const isApproved = ad.status === 'approved';
                  const isRejected = ad.status === 'rejected';
                  const daysCount = ad.days ?? ad.durationDays ?? 7;
                  const totalCost = Number(ad.totalAmount ?? ad.totalFee ?? (daysCount * 1.00));

                  return (
                    <div
                      key={ad.id}
                      className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-3">
                          {ad.productImage && (
                            <img
                              src={ad.productImage}
                              alt=""
                              className="w-12 h-12 rounded-xl object-cover bg-stone-100"
                            />
                          )}
                          <div>
                            <div className="font-bold text-stone-900 text-sm">{ad.dealHeadline}</div>
                            <div className="text-[11px] text-stone-500">
                              {ad.productName} • {daysCount} Days • Total: <strong>${totalCost.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* State Tracker Badge */}
                        <div>
                          {isSent && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              State: Sent (Pending Review)
                            </span>
                          )}
                          {isUnderReview && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              State: Under Review
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              State: Approved & Live
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-200 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                              State: Rejected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* State Tracker Flow Bar */}
                      <div className="p-3 bg-stone-50 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className={isSent || isUnderReview || isApproved ? 'text-emerald-700' : 'text-stone-400'}>
                            1. Sent
                          </span>
                          <span className={isUnderReview || isApproved ? 'text-emerald-700' : 'text-stone-400'}>
                            2. Under Review
                          </span>
                          <span className={isApproved ? 'text-emerald-700' : isRejected ? 'text-red-700' : 'text-stone-400'}>
                            3. {isRejected ? 'Rejected' : 'Approved'}
                          </span>
                        </div>

                        {/* Progress Line */}
                        <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isApproved
                                ? 'w-full bg-emerald-600'
                                : isUnderReview
                                ? 'w-2/3 bg-amber-500'
                                : isRejected
                                ? 'w-full bg-red-500'
                                : 'w-1/3 bg-blue-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* POP & Admin Notes Info */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600">
                        <div>
                          <strong>POP Reference:</strong> {ad.paymentReference || 'Direct Receipt'} ({ad.paymentMethod})
                          {ad.proofOfPaymentFileName && ` • ${ad.proofOfPaymentFileName}`}
                        </div>
                        {ad.adminFeedback && (
                          <div className="p-2 rounded-lg bg-stone-100 text-stone-800 italic w-full border border-stone-200">
                            <strong>Admin Feedback:</strong> "{ad.adminFeedback}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
