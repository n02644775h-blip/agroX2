import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Product, AdRequest, AdRequestStatus } from '../types';
import {
  X,
  Megaphone,
  Flame,
  Calendar,
  DollarSign,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Layers,
  Tag,
  ArrowRight,
  ShieldCheck,
  FileText,
  Info,
  Sliders,
  Check
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
  products
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [myAds, setMyAds] = useState<AdRequest[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'my_campaigns'>('create');

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [dealHeadline, setDealHeadline] = useState('');
  const [dealDescription, setDealDescription] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(20);
  const [specialPrice, setSpecialPrice] = useState<string>('');
  const [days, setDays] = useState<number>(7); // Default 7 days
  const [paymentMethod, setPaymentMethod] = useState<'ecocash' | 'innbucks' | 'bank_transfer' | 'cash'>('ecocash');
  const [paymentReference, setPaymentReference] = useState('');
  const [popUrl, setPopUrl] = useState<string>(SAMPLE_POP_RECEIPTS[0].url);
  const [popFileName, setPopFileName] = useState<string>('EcoCash_POP_Payment_Receipt.jpg');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  useEffect(() => {
    if (selectedProduct) {
      if (!dealHeadline) {
        setDealHeadline(`🔥 Special Harvest Deal: ${selectedProduct.name}`);
      }
      if (!specialPrice && selectedProduct.price) {
        const discounted = (selectedProduct.price * (1 - discountPercentage / 100)).toFixed(2);
        setSpecialPrice(discounted);
      }
    }
  }, [selectedProductId, selectedProduct]);

  const loadMyAds = async () => {
    if (!user) return;
    setLoadingAds(true);
    try {
      const list = await api.getAdRequests({ farmerId: user.id });
      setMyAds(list);
    } catch (err) {
      console.error('Failed to load ad requests:', err);
    } finally {
      setLoadingAds(false);
    }
  };

  useEffect(() => {
    loadMyAds();
  }, [user]);

  const handleDiscountChange = (pct: number) => {
    setDiscountPercentage(pct);
    if (selectedProduct?.price) {
      const discounted = (selectedProduct.price * (1 - pct / 100)).toFixed(2);
      setSpecialPrice(discounted);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Proof of Payment file must be under 8MB.');
      return;
    }

    setPopFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPopUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!dealHeadline.trim()) {
      setErrorMsg('Please enter a promotion headline.');
      return;
    }

    if (!popUrl) {
      setErrorMsg('Please upload or select a Proof of Payment (POP).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload: Partial<AdRequest> = {
        farmerId: user.id,
        farmerName: user.name,
        farmerAvatar: user.avatar,
        farmName: user.farmerProfile?.farmName || `${user.name}'s Farm`,
        farmerEmail: user.email,
        farmerPhone: user.phone,
        productId: selectedProduct?.id,
        productName: selectedProduct?.name,
        productImage: selectedProduct?.images?.[0],
        productPrice: selectedProduct?.price,
        productUnit: selectedProduct?.unit,
        category: selectedProduct?.category,
        categoryName: selectedProduct?.categoryName,
        dealHeadline: dealHeadline.trim(),
        dealDescription: dealDescription.trim() || `Special promotional offer for ${selectedProduct?.name || 'fresh produce'} direct from ${user.farmerProfile?.farmName || user.name}.`,
        discountPercentage: Number(discountPercentage) || undefined,
        specialPrice: specialPrice ? parseFloat(specialPrice) : undefined,
        days: days,
        dailyRate: 1.00,
        totalAmount: days * 1.00,
        proofOfPaymentUrl: popUrl,
        proofOfPaymentFileName: popFileName,
        paymentMethod,
        paymentReference: paymentReference.trim() || `TXN-${Date.now().toString().slice(-6)}`,
        status: 'sent'
      };

      await api.createAdRequest(payload);
      setFormSuccess(true);
      await loadMyAds();

      setTimeout(() => {
        setFormSuccess(false);
        setActiveTab('my_campaigns');
      }, 1500);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Failed to create ad request:', err);
      setErrorMsg(err?.message || 'Failed to submit advertising request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalFee = days * 1.00;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        id="farmer-advert-modal-dialog"
        className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-6 border border-stone-200 flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-amber-600 via-orange-600 to-emerald-700 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 backdrop-blur-xs rounded-2xl">
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
            className="p-1.5 rounded-full text-amber-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="px-6 pt-3 bg-stone-50 border-b border-stone-200 flex items-center gap-2 text-xs font-bold">
          <button
            id="tab-request-advert-btn"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 ${
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
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
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

            {/* 1. Step: Select Produce to Feature */}
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
              <label className="font-bold text-stone-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <Tag className="w-4 h-4 text-orange-600" />
                1. Select Produce to Feature
              </label>

              {products.length === 0 ? (
                <div className="p-4 bg-white rounded-xl border border-dashed border-stone-300 text-stone-500 text-center">
                  You do not have any active product listings yet. Please add a product first before requesting an ad.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          src={prod.images[0]}
                          alt=""
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
              )}
            </div>

            {/* 2. Step: Ad Duration Custom Throttle Slider ($1/day, max 30 days) */}
            <div className="bg-amber-50/50 p-5 rounded-3xl border border-amber-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-orange-600" />
                    2. Campaign Duration & Pricing Slider
                  </label>
                  <p className="text-stone-500 text-xs">
                    Flat promotional fee of <strong>$1.00 per day</strong> (Throttle range: 1 to 30 days)
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

            {/* 3. Step: Deal Headline, Discount & Offer Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-stone-700 block mb-1">Deal Headline *</label>
                <input
                  type="text"
                  value={dealHeadline}
                  onChange={e => setDealHeadline(e.target.value)}
                  placeholder="e.g. 🔥 Flash 25% Off Farm-Fresh Roma Tomatoes!"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
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
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex-1 ${
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
                {selectedProduct && (
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
                  placeholder="e.g. Plump sweet tomatoes picked daily. Minimum order 10kg."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-stone-900"
                />
              </div>
            </div>

            {/* 4. Step: Payment Instructions & Proof of Payment (POP) Upload */}
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
                      <img
                        src={popUrl}
                        alt="Proof of payment"
                        className="w-20 h-20 rounded-xl object-cover border-2 border-emerald-600 shadow-xs bg-white"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                        POP Verified
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
                        className="px-4 py-2.5 bg-white hover:bg-stone-100 text-emerald-800 border-2 border-dashed border-emerald-400 rounded-xl font-bold flex items-center gap-2 transition-colors w-full justify-center"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{popFileName ? `Selected: ${popFileName}` : 'Choose POP File / Screenshot'}</span>
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
                          className="text-emerald-700 underline hover:text-emerald-900 truncate"
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
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="submit-ad-request-btn"
                  type="submit"
                  disabled={isSubmitting || products.length === 0}
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
                className="text-xs text-emerald-700 font-bold hover:underline"
              >
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
                  className="px-4 py-2 bg-orange-600 text-white font-bold rounded-xl text-xs mt-2"
                >
                  Create Ad Request
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myAds.map(ad => {
                  const isSent = ad.status === 'sent';
                  const isUnderReview = ad.status === 'under_review';
                  const isApproved = ad.status === 'approved';
                  const isRejected = ad.status === 'rejected';

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
                              {ad.productName} • {ad.days} Days • Total: <strong>${ad.totalAmount.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* State Tracker Badge */}
                        <div>
                          {isSent && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              State: Sent
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
                              isApproved ? 'w-full bg-emerald-600' : isUnderReview ? 'w-2/3 bg-amber-500' : isRejected ? 'w-full bg-red-500' : 'w-1/3 bg-blue-500'
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
