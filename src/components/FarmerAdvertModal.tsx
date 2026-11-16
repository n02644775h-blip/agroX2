import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  createFirebaseAdRequest,
  subscribeToFirebaseAdRequests
} from '../services/firebaseAdRequests';
import { uploadMediaAsset } from '../services/firebaseStorage';
import { getAdLifecycle, getAdStatusBadgeMeta, formatAdDate } from '../utils/adLifecycle';
import { Product, AdRequest } from '../types';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import {
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
  FileText
} from 'lucide-react';

interface FarmerAdvertModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  products: Product[];
}

const SAMPLE_POP_RECEIPTS = [
  {
    name: 'EcoCash Mobile Money Receipt ($14.00)',
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800'
  },
  {
    name: 'InnBucks Retail Voucher POP ($7.00)',
    url: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&q=80&w=800'
  }
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

  const hasProducts = products && products.length > 0;
  const [produceMode, setProduceMode] = useState<'catalog' | 'custom'>(
    hasProducts ? 'catalog' : 'custom'
  );

  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');

  const [customProduceName, setCustomProduceName] = useState('');
  const [customPrice, setCustomPrice] = useState('1.50');
  const [customUnit, setCustomUnit] = useState(user?.role === 'fodder_supplier' ? 'bale' : 'kg');
  const [customCategory, setCustomCategory] = useState(
    user?.role === 'fodder_supplier' ? 'Fodder & Animal Feed' : 'Vegetables'
  );
  const [customImageUrl] = useState('');

  const [dealHeadline, setDealHeadline] = useState('');
  const [dealDescription, setDealDescription] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(20);
  const [specialPrice, setSpecialPrice] = useState<string>('');
  const [days, setDays] = useState<number>(7);
  const [paymentMethod, setPaymentMethod] = useState<
    'ecocash' | 'onemoney' | 'innbucks' | 'bank_transfer' | 'cash'
  >('ecocash');
  const [paymentReference, setPaymentReference] = useState('');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [popUrl, setPopUrl] = useState<string>(SAMPLE_POP_RECEIPTS[0].url);
  const [popFileName, setPopFileName] = useState<string>('EcoCash_POP_Payment_Receipt.jpg');
  const [isCompressingPop, setIsCompressingPop] = useState(false);
  const [popUploadProgress, setPopUploadProgress] = useState<number>(0);
  const [popUploadNotice, setPopUploadNotice] = useState<string>('');
  const popAbortRef = useRef<AbortController | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  useEffect(() => {
    if (products && products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
      setProduceMode('catalog');
    }
  }, [products, selectedProductId]);

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

  const farmerId = user?.id || (user as any)?.uid || '';

  const loadMyAds = async () => {
    if (!farmerId) return;
    setLoadingAds(true);
    try {
      const list = await api.getAdRequests({ farmerId });
      if (list && Array.isArray(list)) {
        setMyAds((prev) => {
          const map = new Map<string, AdRequest>();
          prev.forEach((a) => map.set(a.id, a));
          list.forEach((a) => map.set(a.id, a));
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

    const unsubscribe = subscribeToFirebaseAdRequests(
      { farmerId },
      (fbAds) => {
        if (fbAds && fbAds.length > 0) {
          setMyAds((prev) => {
            const map = new Map<string, AdRequest>();
            prev.forEach((a) => map.set(a.id, a));
            fbAds.forEach((a) => map.set(a.id, a));
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

    loadMyAds();

    const ticker = setInterval(() => setNowMs(Date.now()), 30000);

    return () => {
      unsubscribe();
      clearInterval(ticker);
    };
  }, [farmerId]);

  const handleDiscountChange = (pct: number) => {
    setDiscountPercentage(pct);
    const basePrice =
      produceMode === 'catalog' ? selectedProduct?.price : parseFloat(customPrice) || 0;
    if (basePrice) {
      const discounted = (basePrice * (1 - pct / 100)).toFixed(2);
      setSpecialPrice(discounted);
    }
  };

  const handleCancelPopUpload = () => {
    popAbortRef.current?.abort();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const controller = new AbortController();
    popAbortRef.current = controller;

    setIsCompressingPop(true);
    setPopUploadProgress(5);
    setPopUploadNotice('');
    setErrorMsg('');

    try {
      const result = await uploadMediaAsset({
        file,
        folder: 'pop',
        userId: farmerId || 'farmer-1',
        allowVideo: false,
        allowPdf: true,
        compressImages: true,
        maxDimension: 1000,
        onProgress: (pct) => setPopUploadProgress(pct),
        signal: controller.signal
      });

      if (result.canceled) {
        setErrorMsg('Proof of payment upload cancelled.');
        return;
      }

      if (!result.ok || !result.url) {
        setErrorMsg(result.errorMessage || 'Failed to upload proof of payment.');
        return;
      }

      setPopUrl(result.url);
      setPopFileName(result.fileName || file.name);
      setPopUploadNotice('Proof of payment uploaded successfully!');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload proof of payment.');
    } finally {
      if (popAbortRef.current === controller) {
        popAbortRef.current = null;
      }
      setIsCompressingPop(false);
      setPopUploadProgress(0);
    }
  };

  const totalFee = days * 1.0;

  const handleSubmitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg('Please log in to submit an advertising request.');
      return;
    }

    const currentFarmerId = user.id || (user as any)?.uid || 'farmer-1';
    const isCustom = produceMode === 'custom' || !hasProducts;

    const prodName = isCustom
      ? customProduceName.trim()
      : selectedProduct?.name || 'Farm Produce';
    const parsedCustomPrice = parseFloat(customPrice);
    const prodPrice = isCustom
      ? Number.isFinite(parsedCustomPrice) && parsedCustomPrice >= 0
        ? parsedCustomPrice
        : undefined
      : typeof selectedProduct?.price === 'number' && Number.isFinite(selectedProduct.price)
        ? selectedProduct.price
        : undefined;
    const prodUnit = isCustom ? customUnit.trim() || 'kg' : selectedProduct?.unit || 'kg';
    const prodCategory = isCustom
      ? customCategory
      : selectedProduct?.categoryName || selectedProduct?.category || 'Fresh Produce';
    const defaultImg =
      customCategory === 'Fodder & Animal Feed' || user.role === 'fodder_supplier'
        ? 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800'
        : 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800';
    const prodImage = isCustom
      ? customImageUrl.trim() || defaultImg
      : selectedProduct?.images?.[0] || defaultImg;

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
      const dailyRate = 1.0;
      const totalAmount = finalDays * dailyRate;
      const rawDiscount = Number(discountPercentage);
      const discountPct = Number.isFinite(rawDiscount) && rawDiscount > 0 ? rawDiscount : undefined;
      const parsedSpecial = specialPrice ? parseFloat(specialPrice) : NaN;
      const safeSpecialPrice =
        Number.isFinite(parsedSpecial) && parsedSpecial > 0 ? parsedSpecial : undefined;
      const discountText = discountPct
        ? `${discountPct}% OFF`
        : safeSpecialPrice !== undefined
          ? `Special: $${safeSpecialPrice.toFixed(2)}`
          : 'PROMO DEAL';

      const payload: Partial<AdRequest> = {
        farmerId: currentFarmerId,
        farmerName: user.name || 'Farmer',
        farmerAvatar: user.avatar || '',
        farmName:
          user.farmerProfile?.farmName ||
          `${user.name || 'Farmer'}'s ${user.role === 'fodder_supplier' ? 'Fodder Supply' : 'Farm'}`,
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
        dealDescription:
          dealDescription.trim() ||
          `Special promotional offer for ${prodName} direct from ${user.farmerProfile?.farmName || user.name || 'our farm'}.`,
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

      let savedFbAd: AdRequest | null = null;
      try {
        savedFbAd = await createFirebaseAdRequest(payload);
      } catch (fbErr) {
        console.warn('Firestore ad save warning:', fbErr);
      }

      try {
        await api.createAdRequest({
          ...payload,
          id: savedFbAd?.id
        });
      } catch (apiErr) {
        console.warn('API store ad sync warning:', apiErr);
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
    <LiquidGlassModal
      id="farmer-advert-modal-dialog"
      isOpen
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      icon={<Flame className="w-5 h-5 text-[#F4D35E] fill-[#F4D35E]" />}
      title="Hot Deals & Featured Promotions ($1/Day)"
      subtitle="Boost your harvest visibility on the marketplace homepage with verified admin approval"
    >
      {/* Hidden compatibility ID for close button */}
      <span id="close-farmer-advert-modal-btn" className="sr-only" onClick={onClose} />

      {/* Tab Toggle Navigation */}
      <div className="px-6 pt-3 bg-[#DFF4E4]/55 border-b border-[#145A38]/15 flex items-center gap-2 text-xs font-bold shrink-0">
        <button
          id="tab-request-advert-btn"
          type="button"
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2.5 rounded-t-2xl transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'create'
              ? 'bg-white border-[#145A38] text-[#062B1F] shadow-xs'
              : 'border-transparent text-[#0B3D2B]/70 hover:text-[#062B1F]'
          }`}
        >
          <Megaphone className="w-4 h-4 text-[#145A38]" />
          <span>Request New Advertisement</span>
        </button>

        <button
          id="tab-my-campaigns-btn"
          type="button"
          onClick={() => setActiveTab('my_campaigns')}
          className={`px-4 py-2.5 rounded-t-2xl transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'my_campaigns'
              ? 'bg-white border-[#145A38] text-[#062B1F] shadow-xs'
              : 'border-transparent text-[#0B3D2B]/70 hover:text-[#062B1F]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#145A38]" />
          <span>Advertising Requests &amp; State</span>
          <span className="px-1.5 py-0.5 rounded-full bg-[#062B1F] text-[#A8E635] text-[10px] tabular-nums">
            {myAds.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Create Request */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmitAd} className="p-6 space-y-6 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-4 rounded-xl bg-[#DFF4E4] border border-[#145A38]/30 text-[#062B1F] font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#145A38] shrink-0" />
              <span>
                Advertising request submitted successfully! Status is now:{' '}
                <strong>Pending Admin Review</strong>
              </span>
            </div>
          )}

          {/* Step 1: Select Produce */}
          <div className="bg-[#DFF4E4]/45 p-4 rounded-2xl border border-[#145A38]/15 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#062B1F] flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <Tag className="w-4 h-4 text-[#145A38]" />
                <span>1. Select Produce to Feature</span>
              </label>
              {hasProducts && (
                <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-xl border border-[#0B3D2B]/12 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setProduceMode('catalog')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      produceMode === 'catalog'
                        ? 'bg-[#062B1F] text-[#A8E635]'
                        : 'text-[#0B3D2B]/70'
                    }`}
                  >
                    Listed Products
                  </button>
                  <button
                    type="button"
                    onClick={() => setProduceMode('custom')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      produceMode === 'custom'
                        ? 'bg-[#062B1F] text-[#A8E635]'
                        : 'text-[#0B3D2B]/70'
                    }`}
                  >
                    Custom Harvest
                  </button>
                </div>
              )}
            </div>

            {produceMode === 'catalog' && hasProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                {products.map((prod) => {
                  const isSelected = selectedProductId === prod.id;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => setSelectedProductId(prod.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-[#DFF4E4] border-[#145A38] ring-2 ring-[#A8E635]/60 shadow-xs'
                          : 'bg-white/85 border-[#0B3D2B]/12 hover:border-[#145A38]/40'
                      }`}
                    >
                      <img
                        src={
                          prod.images?.[0] ||
                          'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800'
                        }
                        alt={prod.name}
                        className="w-12 h-12 rounded-xl object-cover bg-white shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[#062B1F] truncate">{prod.name}</div>
                        <div className="text-[#0B3D2B]/70 text-[11px] tabular-nums">
                          ${prod.price.toFixed(2)} / {prod.unit} • Stock: {prod.quantityAvailable}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#145A38] text-[#A8E635] flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3 bg-white/85 p-4 rounded-2xl border border-[#0B3D2B]/12">
                <div className="flex items-center gap-1.5 text-[#0B3D2B]/75 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                  <span>
                    Promote your harvest, bulk produce, or seasonal special direct to customers:
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#062B1F] block mb-1">
                      Produce / Harvest Name *
                    </label>
                    <input
                      type="text"
                      value={customProduceName}
                      onChange={(e) => setCustomProduceName(e.target.value)}
                      placeholder="e.g. Farm-Fresh Roma Tomatoes or Butternut"
                      className="w-full px-3 py-2 rounded-xl border border-[#0B3D2B]/20 text-[#062B1F] font-semibold"
                      required={produceMode === 'custom' || !hasProducts}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#062B1F] block mb-1">Category</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#0B3D2B]/20 text-[#062B1F] bg-white"
                    >
                      <option value="Vegetables">Vegetables</option>
                      <option value="Fruits">Fruits</option>
                      <option value="Grains & Cereals">Grains &amp; Cereals</option>
                      <option value="Fodder & Animal Feed">Fodder &amp; Animal Feed</option>
                      <option value="Livestock & Poultry">Livestock &amp; Poultry</option>
                      <option value="Dairy & Eggs">Dairy &amp; Eggs</option>
                      <option value="Tubers">Tubers</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#062B1F] block mb-1">
                      Regular Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="1.50"
                      className="w-full px-3 py-2 rounded-xl border border-[#0B3D2B]/20 text-[#062B1F] font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#062B1F] block mb-1">Unit of Sale</label>
                    <input
                      type="text"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      placeholder="kg, crate, bag, bunch"
                      className="w-full px-3 py-2 rounded-xl border border-[#0B3D2B]/20 text-[#062B1F]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Campaign Duration Slider */}
          <div className="bg-[#F4D35E]/20 p-5 rounded-3xl border border-[#F4D35E]/60 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-extrabold text-[#062B1F] text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#145A38]" />
                  <span>2. Campaign Duration &amp; Pricing Slider</span>
                </label>
                <p className="text-[#0B3D2B]/75 text-xs">
                  Flat promotional fee of <strong>$1.00 per day</strong> (Range: 1 to 30 days)
                </p>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-2xl font-black text-[#062B1F]">${totalFee.toFixed(2)}</div>
                <div className="text-[11px] text-[#0B3D2B]/75 font-semibold">
                  {days} {days === 1 ? 'day' : 'days'} @ $1/day
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <input
                id="ad-days-slider"
                type="range"
                min={1}
                max={30}
                step={1}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full h-2.5 bg-[#0B3D2B]/20 rounded-lg appearance-none cursor-pointer accent-[#145A38]"
              />
              <div className="flex justify-between text-[11px] text-[#0B3D2B]/75 font-bold px-1 tabular-nums">
                <span>1 Day ($1)</span>
                <span>7 Days ($7)</span>
                <span>14 Days ($14)</span>
                <span>21 Days ($21)</span>
                <span>30 Days ($30 max)</span>
              </div>
            </div>
          </div>

          {/* Step 3: Headline & Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-[#062B1F] block mb-1">Deal Headline *</label>
              <input
                type="text"
                value={dealHeadline}
                onChange={(e) => setDealHeadline(e.target.value)}
                placeholder="e.g. 🔥 Flash 25% Off Farm-Fresh Roma Tomatoes!"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] font-semibold focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                required
              />
            </div>

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">
                Special Discount (%)
              </label>
              <div className="flex items-center gap-2">
                {[10, 15, 20, 25, 30].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleDiscountChange(pct)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex-1 cursor-pointer tabular-nums ${
                      discountPercentage === pct
                        ? 'bg-[#062B1F] text-[#A8E635] shadow-xs'
                        : 'bg-[#DFF4E4]/65 text-[#062B1F] hover:bg-[#DFF4E4]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-[#062B1F] block mb-1">
                Special Discount Price ($)
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-[#145A38] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  value={specialPrice}
                  onChange={(e) => setSpecialPrice(e.target.value)}
                  placeholder="1.20"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] font-bold"
                />
              </div>
              {produceMode === 'catalog' && selectedProduct && (
                <p className="text-[10px] text-[#0B3D2B]/65 mt-1 tabular-nums">
                  Standard regular price: ${selectedProduct.price.toFixed(2)} /{' '}
                  {selectedProduct.unit}
                </p>
              )}
            </div>

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">
                Deal Highlights / Promotion Notes
              </label>
              <input
                type="text"
                value={dealDescription}
                onChange={(e) => setDealDescription(e.target.value)}
                placeholder="e.g. Plump sweet produce picked daily. Minimum order 10kg."
                className="w-full px-3.5 py-2 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F]"
              />
            </div>
          </div>

          {/* Step 4: POP Upload */}
          <div className="bg-[#DFF4E4]/45 p-5 rounded-3xl border border-[#145A38]/15 space-y-4">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-[#062B1F] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#145A38]" />
                <span>3. Payment Method &amp; Proof of Payment (POP)</span>
              </label>
              <span className="text-[#145A38] font-extrabold text-xs tabular-nums">
                Pay Exactly: ${totalFee.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 bg-white/90 rounded-2xl border border-[#145A38]/20 text-[#062B1F] text-xs space-y-1">
              <div className="font-bold text-[#145A38] mb-1 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#145A38]" />
                <span>Direct FarmBridge Advertising Accounts:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <strong>EcoCash Biller Code:</strong> 99482 (FarmBridge Ads) or 0772 900 112
                </div>
                <div>
                  <strong>InnBucks Account:</strong> @AGROX-ADS (#99812)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-[#062B1F] block mb-1">
                  Payment Method Used
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#0B3D2B]/20 text-[#062B1F] bg-white/90"
                >
                  <option value="ecocash">EcoCash Mobile Money</option>
                  <option value="onemoney">OneMoney Mobile Wallet</option>
                  <option value="innbucks">InnBucks Remittance</option>
                  <option value="bank_transfer">Bank Transfer / Zipit</option>
                  <option value="cash">AgriConnect Cash Depot</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#062B1F] block mb-1">
                  Transaction Ref / Reference No.
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. EC-88912-7741 or INB9904"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 border border-[#0B3D2B]/20 text-[#062B1F] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">
                Upload Proof of Payment (POP Screenshot / PDF / Receipt) *
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {popUrl && (
                  <div className="relative group shrink-0">
                    {popUrl.startsWith('data:application/pdf') ||
                    popFileName.toLowerCase().endsWith('.pdf') ||
                    popUrl.toLowerCase().includes('.pdf') ? (
                      <div className="w-20 h-20 rounded-xl border-2 border-[#145A38] shadow-xs bg-[#DFF4E4] flex flex-col items-center justify-center text-[#062B1F] p-2 text-center">
                        <FileText className="w-7 h-7 text-[#145A38] mb-1" />
                        <span className="text-[9px] font-bold leading-tight truncate w-full">
                          PDF POP
                        </span>
                      </div>
                    ) : (
                      <img
                        src={popUrl}
                        alt="Proof of payment"
                        className="w-20 h-20 rounded-xl object-cover border-2 border-[#145A38] shadow-xs bg-white"
                      />
                    )}
                    <div className="absolute inset-0 bg-[#062B1F]/55 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
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
                      className="px-4 py-2.5 bg-white hover:bg-[#DFF4E4]/50 text-[#062B1F] border-2 border-dashed border-[#145A38]/45 rounded-xl font-bold flex items-center gap-2 transition-colors flex-1 justify-center cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 text-[#145A38]" />
                      <span>
                        {isCompressingPop
                          ? `Uploading (${popUploadProgress}%)...`
                          : popFileName
                            ? `Selected: ${popFileName}`
                            : 'Choose POP File / Screenshot'}
                      </span>
                    </button>
                    {isCompressingPop && (
                      <button
                        type="button"
                        onClick={handleCancelPopUpload}
                        className="px-3 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px] hover:bg-rose-100 cursor-pointer shrink-0"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {popUploadNotice && !isCompressingPop && (
                    <div className="text-[11px] text-[#145A38] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{popUploadNotice}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-[#0B3D2B]/70 flex-wrap">
                    <span className="font-bold">Sample POP:</span>
                    {SAMPLE_POP_RECEIPTS.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPopUrl(s.url);
                          setPopFileName(s.name);
                        }}
                        className="text-[#145A38] underline hover:text-[#062B1F] truncate cursor-pointer"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#0B3D2B]/10">
            <div className="text-[#0B3D2B] text-xs tabular-nums">
              Total Campaign Cost:{' '}
              <strong className="text-[#062B1F] text-base">${totalFee.toFixed(2)}</strong> ({days}{' '}
              days)
            </div>
            <div className="flex items-center gap-2">
              <LiquidGlassButton variant="light" size="sm" onClick={onClose}>
                Cancel
              </LiquidGlassButton>
              <LiquidGlassButton
                id="submit-ad-request-btn"
                type="submit"
                variant="lime"
                size="sm"
                disabled={isSubmitting || isCompressingPop}
              >
                <Megaphone className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'Submitting Request...' : 'Request Access & Submit POP'}
                </span>
              </LiquidGlassButton>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: My Campaigns */}
      {activeTab === 'my_campaigns' && (
        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-[#062B1F] text-sm">
              Your Advertisement Requests History
            </h3>
            <button
              type="button"
              onClick={loadMyAds}
              className="text-xs text-[#145A38] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Status
            </button>
          </div>

          {loadingAds ? (
            <div className="py-12 text-center text-[#0B3D2B]/65">
              Loading campaign statuses...
            </div>
          ) : myAds.length === 0 ? (
            <div className="py-12 text-center text-[#0B3D2B]/75 bg-[#DFF4E4]/40 rounded-2xl border border-[#145A38]/15 space-y-2.5">
              <Megaphone className="w-8 h-8 text-[#145A38]/40 mx-auto" />
              <p className="font-bold text-[#062B1F]">No advertisement requests yet</p>
              <p className="text-xs text-[#0B3D2B]/70">
                Create your first $1/day Hot Deal to feature on the homepage.
              </p>
              <LiquidGlassButton
                variant="lime"
                size="sm"
                onClick={() => setActiveTab('create')}
              >
                Create Ad Request
              </LiquidGlassButton>
            </div>
          ) : (
            <div className="space-y-4">
              {myAds.map((ad) => {
                const lifecycle = getAdLifecycle(ad, nowMs);
                const badge = getAdStatusBadgeMeta(lifecycle.effectiveStatus);
                const daysCount = lifecycle.durationDays;
                const totalCost = Number(ad.totalAmount ?? ad.totalFee ?? daysCount * 1.0);

                const isApprovedOrActive =
                  lifecycle.effectiveStatus === 'approved' ||
                  lifecycle.effectiveStatus === 'active';
                const isExpired = lifecycle.effectiveStatus === 'expired';
                const isRejected = lifecycle.effectiveStatus === 'rejected';
                const isUnderReview = ad.status === 'under_review';

                return (
                  <div
                    key={ad.id}
                    className="bg-white/85 rounded-2xl border border-[#0B3D2B]/12 p-4 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0B3D2B]/10 pb-3">
                      <div className="flex items-center gap-3">
                        {ad.productImage && (
                          <img
                            src={ad.productImage}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover bg-[#DFF4E4]"
                          />
                        )}
                        <div>
                          <div className="font-bold text-[#062B1F] text-sm">{ad.dealHeadline}</div>
                          <div className="text-[11px] text-[#0B3D2B]/70 tabular-nums">
                            {ad.productName} • {daysCount} Days • Total:{' '}
                            <strong>${totalCost.toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 self-start sm:self-center ${badge.className}`}
                      >
                        {isApprovedOrActive ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : isRejected ? (
                          <AlertCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {badge.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#DFF4E4]/45 p-3 rounded-xl border border-[#145A38]/12 text-[11px] tabular-nums">
                      <div>
                        <div className="text-[#0B3D2B]/65 font-medium">Start Date</div>
                        <div className="font-bold text-[#062B1F]">
                          {formatAdDate(lifecycle.startDateIso)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#0B3D2B]/65 font-medium">Expiry Date</div>
                        <div className="font-bold text-[#062B1F]">
                          {formatAdDate(lifecycle.endDateIso)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#0B3D2B]/65 font-medium">Remaining</div>
                        <div
                          className={`font-bold ${
                            lifecycle.effectiveStatus === 'active'
                              ? 'text-[#145A38]'
                              : isExpired
                                ? 'text-stone-500'
                                : isRejected
                                  ? 'text-rose-600'
                                  : 'text-amber-700'
                          }`}
                        >
                          {lifecycle.remainingLabel}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-white/70 rounded-xl border border-[#0B3D2B]/10 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-[#145A38]">1. Pending</span>
                        <span
                          className={
                            isUnderReview || isApprovedOrActive || isExpired
                              ? 'text-[#145A38]'
                              : 'text-[#0B3D2B]/40'
                          }
                        >
                          2. Approved / Active
                        </span>
                        <span
                          className={
                            isExpired
                              ? 'text-[#062B1F]'
                              : isRejected
                                ? 'text-rose-700'
                                : 'text-[#0B3D2B]/40'
                          }
                        >
                          3. {isRejected ? 'Rejected' : 'Expired'}
                        </span>
                      </div>

                      <div className="w-full bg-[#0B3D2B]/15 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isRejected
                              ? 'w-full bg-rose-500'
                              : isExpired
                                ? 'w-full bg-stone-400'
                                : isApprovedOrActive
                                  ? 'w-2/3 bg-[#145A38]'
                                  : 'w-1/3 bg-[#F4D35E]'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#0B3D2B]/75">
                      <div>
                        <strong>POP Reference:</strong> {ad.paymentReference || 'Direct Receipt'} (
                        {ad.paymentMethod})
                        {ad.proofOfPaymentFileName && ` • ${ad.proofOfPaymentFileName}`}
                      </div>
                      {(ad.adminNotes || ad.adminFeedback) && (
                        <div className="p-2 rounded-lg bg-[#DFF4E4]/60 text-[#062B1F] italic w-full border border-[#145A38]/15">
                          <strong>Admin Feedback:</strong> &ldquo;
                          {ad.adminNotes || ad.adminFeedback}&rdquo;
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
    </LiquidGlassModal>
  );
};
