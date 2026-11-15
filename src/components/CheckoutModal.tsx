import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { useCart, DELIVERY_FLAT_FEE } from '../context/CartContext';
import { api } from '../services/api';
import { compressImage } from '../utils/imageCompressor';
import { LiquidGlassModal, LiquidGlassButton } from './glass';
import {
  Order,
  User,
  PaymentMethod,
  DeliveryLocation,
  PickupLocation
} from '../types';
import {
  X,
  ShoppingBag,
  Truck,
  MapPin,
  Navigation,
  Smartphone,
  Banknote,
  Building2,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Store,
  ShieldCheck,
  Clock,
  Lock
} from 'lucide-react';

interface CheckoutModalProps {
  onClose: () => void;
  onOrderSuccess: (orders: Order[]) => void;
  onRequireAuth?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  onClose,
  onOrderSuccess,
  onRequireAuth
}) => {
  const { user } = useAuth();
  const {
    items,
    subtotal,
    farmerIdInCart,
    farmNameInCart,
    checkoutBatch,
    updateQuantity,
    removeFromCart
  } = useCart();
  const submitLockRef = useRef(false);

  // Fulfillment
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('manual');

  // Delivery Address Fields
  const [street, setStreet] = useState(user?.location?.address || '');
  const [suburb, setSuburb] = useState(user?.location?.community || '');
  const [city, setCity] = useState(user?.location?.city || 'Harare');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // GPS Coordinates
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsConfirmed, setGpsConfirmed] = useState(false);

  // Farm Pickup & Seller Details
  const [sellerUser, setSellerUser] = useState<User | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [pickupTimeWindow, setPickupTimeWindow] = useState('Today 2:00 PM - 5:00 PM');

  // Payment State
  const [paymentCategory, setPaymentCategory] = useState<'cash_on_delivery' | 'electronic'>('cash_on_delivery');
  const [electronicMethod, setElectronicMethod] = useState<'ecocash' | 'onemoney' | 'bank_transfer'>('ecocash');
  const [paymentReference, setPaymentReference] = useState('');
  const [popUrl, setPopUrl] = useState('');
  const [popFileName, setPopFileName] = useState('');
  const [popUploading, setPopUploading] = useState(false);

  // Buyer Contact & Submit
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user) {
      if (!buyerPhone && user.phone) setBuyerPhone(user.phone);
      if (!street && user.location?.address) setStreet(user.location.address);
      if (!suburb && user.location?.community) setSuburb(user.location.community);
      if (!city && user.location?.city) setCity(user.location.city);
    }
  }, [user]);

  useEffect(() => {
    if (!farmerIdInCart) return;
    let cancelled = false;
    setLoadingSeller(true);

    const loadSeller = async () => {
      try {
        const apiRes = await api.getFarmerProfile(farmerIdInCart).catch(() => null);
        if (!cancelled && apiRes?.farmer) {
          setSellerUser(apiRes.farmer);
          setLoadingSeller(false);
          return;
        }

        const snap = await getDoc(doc(db, 'users', farmerIdInCart)).catch(() => null);
        if (!cancelled && snap?.exists()) {
          const d = snap.data() as any;
          setSellerUser({
            id: farmerIdInCart,
            name: d.fullName || d.name || items[0]?.product.farmerName || 'Farmer',
            email: d.email || '',
            phone: d.phone || '',
            role: d.role || 'farmer',
            avatar: d.avatar || '',
            location: d.location || { province: 'Harare', city: 'Harare' },
            status: d.status || 'active',
            createdAt: d.createdAt || new Date().toISOString(),
            farmerProfile: d.farmerProfile
          });
        }
      } finally {
        if (!cancelled) setLoadingSeller(false);
      }
    };

    loadSeller();
    return () => {
      cancelled = true;
    };
  }, [farmerIdInCart]);

  if (items.length === 0) {
    return (
      <LiquidGlassModal
        id="checkout-dialog"
        isOpen
        onClose={onClose}
        maxWidthClass="max-w-md"
        title="Checkout"
        subtitle="Your cart is currently empty"
        icon={<ShoppingBag className="w-5 h-5 text-[#A8E635]" />}
      >
        <div className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#DFF4E4] text-[#145A38] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#062B1F]">Your Cart is Empty</h2>
          <p className="text-xs text-[#2B4338] leading-relaxed">
            Add fresh farm produce from our marketplace to proceed to checkout.
          </p>
          <LiquidGlassButton variant="emerald" size="md" onClick={onClose} className="w-full">
            Browse Produce
          </LiquidGlassButton>
        </div>
      </LiquidGlassModal>
    );
  }

  const appliedDeliveryFee = deliveryMethod === 'delivery' ? DELIVERY_FLAT_FEE : 0;
  const finalTotal = subtotal + appliedDeliveryFee;
  const selectedPaymentMethod: PaymentMethod =
    paymentCategory === 'cash_on_delivery' ? 'cash_on_delivery' : electronicMethod;

  const firstProd = items[0].product;
  const designatedPickupAddress =
    sellerUser?.farmerProfile?.address ||
    sellerUser?.location?.address ||
    firstProd.location?.address ||
    `${firstProd.location?.community ? `${firstProd.location.community}, ` : ''}${firstProd.location?.city || 'Local'}, ${firstProd.location?.province || 'Zimbabwe'}`;

  const designatedPickupInstructions =
    sellerUser?.farmerProfile?.pickupInstructions ||
    'Proceed to the main farm gate dispatch desk and present your Order Number.';

  const sellerPaymentInfo = {
    ecocash: sellerUser?.farmerProfile?.paymentInfo?.ecocash || sellerUser?.phone || 'Contact farmer for EcoCash number',
    onemoney: sellerUser?.farmerProfile?.paymentInfo?.onemoney || sellerUser?.phone || 'Contact farmer for OneMoney number',
    bankAccount: sellerUser?.farmerProfile?.paymentInfo?.bankAccount || 'Request bank account details via chat or phone',
    innbucks: sellerUser?.farmerProfile?.paymentInfo?.innbucks,
    phone: sellerUser?.phone || sellerUser?.farmerProfile?.whatsapp
  };

  const handleDetectLocation = () => {
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('GPS geolocation is not supported by this browser. Please enter your delivery address manually below.');
      setLocationMode('manual');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy || 0);
        setGpsCoords({ lat, lng, accuracy });
        setGpsConfirmed(false);

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            { signal: controller.signal }
          );
          clearTimeout(timer);
          if (res.ok) {
            const data = await res.json();
            const addr = data?.address || {};
            const detectedStreet = [addr.house_number, addr.road].filter(Boolean).join(' ') || addr.neighbourhood || '';
            const detectedSuburb = addr.suburb || addr.quarter || addr.village || '';
            const detectedCity = addr.city || addr.town || addr.county || addr.state || '';
            if (detectedStreet && !street) setStreet(detectedStreet);
            if (detectedSuburb && !suburb) setSuburb(detectedSuburb);
            if (detectedCity) setCity(detectedCity);
          }
        } catch {
          // Graceful fallback
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location permission was denied. You can complete checkout easily using Manual Address Entry.');
        } else {
          setGpsError('Could not retrieve GPS signal. Please enter your delivery address manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const handlePopUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage('');
    setPopUploading(true);

    try {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        if (file.size > 700 * 1024) {
          setErrorMessage('PDF Proof of Payment must be under 700KB. Please upload a smaller PDF or a screenshot image.');
          return;
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Failed to read PDF file'));
          reader.readAsDataURL(file);
        });
        setPopUrl(dataUrl);
        setPopFileName(file.name);
      } else if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file, 900, 900, 0.72);
        setPopUrl(compressed);
        setPopFileName(file.name);
      } else {
        setErrorMessage('Please upload an image (JPG, PNG, WebP) or PDF Proof of Payment.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not process Proof of Payment file.');
    } finally {
      setPopUploading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!user) {
      if (onRequireAuth) {
        onRequireAuth();
      } else {
        setErrorMessage('Please sign in or create an account to place your order.');
      }
      return;
    }

    if (!buyerPhone.trim()) {
      setErrorMessage('Please enter a contact phone number for order coordination.');
      return;
    }

    let deliveryLocation: DeliveryLocation | undefined;
    let formattedDeliveryAddress: string | undefined;

    if (deliveryMethod === 'delivery') {
      const parts = [street.trim(), suburb.trim(), city.trim()].filter(Boolean);
      if (locationMode === 'gps') {
        if (!gpsCoords && parts.length === 0) {
          setErrorMessage('Please detect your GPS location or enter your delivery street and city.');
          return;
        }
        formattedDeliveryAddress =
          parts.length > 0
            ? parts.join(', ')
            : `GPS Pin (${gpsCoords!.lat.toFixed(5)}, ${gpsCoords!.lng.toFixed(5)})`;
        deliveryLocation = {
          mode: gpsCoords ? 'gps' : 'manual',
          lat: gpsCoords?.lat,
          lng: gpsCoords?.lng,
          accuracy: gpsCoords?.accuracy,
          street: street.trim() || undefined,
          suburb: suburb.trim() || undefined,
          city: city.trim() || undefined,
          instructions: deliveryInstructions.trim() || undefined,
          formattedAddress: formattedDeliveryAddress,
          confirmedAt: new Date().toISOString()
        };
      } else {
        if (!street.trim() || !city.trim()) {
          setErrorMessage('Please provide your street address and city/town for delivery.');
          return;
        }
        formattedDeliveryAddress = parts.join(', ');
        deliveryLocation = {
          mode: 'manual',
          street: street.trim(),
          suburb: suburb.trim() || undefined,
          city: city.trim(),
          instructions: deliveryInstructions.trim() || undefined,
          formattedAddress: formattedDeliveryAddress,
          confirmedAt: new Date().toISOString()
        };
      }
    }

    const pickupLocation: PickupLocation | undefined =
      deliveryMethod === 'pickup'
        ? {
            farmName: farmNameInCart || firstProd.farmName,
            address: designatedPickupAddress,
            city: sellerUser?.location?.city || firstProd.location?.city,
            province: sellerUser?.location?.province || firstProd.location?.province,
            instructions: designatedPickupInstructions,
            phone: sellerPaymentInfo.phone,
            readyAt: pickupTimeWindow.trim() || undefined
          }
        : undefined;

    if (submitLockRef.current || isSubmitting) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const orders = await checkoutBatch({
        buyerId: user.id,
        buyerName: user.name,
        buyerPhone: buyerPhone.trim(),
        buyerEmail: user.email,
        deliveryMethod,
        deliveryAddress: formattedDeliveryAddress,
        deliveryLocation,
        pickupLocation,
        pickupTimeWindow: deliveryMethod === 'pickup' ? pickupTimeWindow.trim() : undefined,
        pickupInstructions: deliveryMethod === 'pickup' ? designatedPickupInstructions : undefined,
        paymentMethod: selectedPaymentMethod,
        proofOfPaymentUrl: paymentCategory === 'electronic' && popUrl ? popUrl : undefined,
        proofOfPaymentFileName: paymentCategory === 'electronic' && popFileName ? popFileName : undefined,
        paymentReference: paymentCategory === 'electronic' && paymentReference.trim() ? paymentReference.trim() : undefined,
        farmerPaymentDetails: sellerPaymentInfo,
        buyerNotes: notes.trim() || undefined
      });
      onOrderSuccess(orders);
    } catch (err: any) {
      console.error('Checkout failed:', err);
      setErrorMessage(err?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const osmEmbedUrl = gpsCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${gpsCoords.lng - 0.008}%2C${gpsCoords.lat - 0.008}%2C${gpsCoords.lng + 0.008}%2C${gpsCoords.lat + 0.008}&layer=mapnik&marker=${gpsCoords.lat}%2C${gpsCoords.lng}`
    : '';

  const lightInputClass =
    'w-full px-3.5 py-2.5 rounded-xl border border-[#0B3D2B]/18 bg-white/90 text-[#062B1F] placeholder-[#2B4338]/50 focus:outline-none focus:ring-2 focus:ring-[#145A38]/25 focus:border-[#145A38] transition-all';

  return (
    <LiquidGlassModal
      id="checkout-dialog"
      isOpen
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      title="Farm Checkout"
      subtitle={`Ordering directly from ${farmNameInCart}`}
      icon={<ShoppingBag className="w-5 h-5 text-[#A8E635]" />}
    >
      <form onSubmit={handlePlaceOrder} className="p-5 sm:p-6 space-y-6">
        {!user && (
          <div className="p-4 rounded-2xl bg-[#F4D35E]/20 border border-[#F4D35E]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-[#062B1F]">
              <Lock className="w-4 h-4 text-[#145A38] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Sign in to complete your order</p>
                <p className="text-[#2B4338] mt-0.5">Your cart items stay saved while you sign in or register.</p>
              </div>
            </div>
            {onRequireAuth && (
              <LiquidGlassButton variant="emerald" size="xs" onClick={onRequireAuth}>
                Sign In / Register
              </LiquidGlassButton>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Cart Item Summary */}
        <div className="space-y-2.5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#145A38]">
            Order Items ({items.length})
          </h3>
          <div className="divide-y divide-[#0B3D2B]/10 border border-[#0B3D2B]/12 rounded-2xl overflow-hidden max-h-48 overflow-y-auto bg-white/80 backdrop-blur-md">
            {items.map((item) => (
              <div key={item.product.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.product.images?.[0]}
                    alt={item.product.name}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-xl object-cover bg-[#DFF4E4] shrink-0 border border-[#0B3D2B]/10"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-[#062B1F] text-xs truncate">{item.product.name}</div>
                    <div className="text-[11px] text-[#2B4338] tabular-nums">
                      ${item.product.price.toFixed(2)} / {item.product.unit}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex items-center border border-[#0B3D2B]/18 rounded-xl bg-[#F8FAF7] text-xs">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="px-2.5 py-1 text-[#062B1F] hover:bg-[#DFF4E4] rounded-l-xl font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-2 font-bold text-[#062B1F] tabular-nums">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="px-2.5 py-1 text-[#062B1F] hover:bg-[#DFF4E4] rounded-r-xl font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-extrabold text-xs text-[#062B1F] min-w-14 text-right tabular-nums">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-[#2B4338]/60 hover:text-rose-600 p-1 cursor-pointer"
                    aria-label="Remove item"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Fulfillment Method */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#145A38]">
            Fulfillment Method
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              id="fulfillment-delivery-btn"
              onClick={() => setDeliveryMethod('delivery')}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                deliveryMethod === 'delivery'
                  ? 'border-[#145A38] bg-[#DFF4E4]/65 shadow-sm'
                  : 'border-[#0B3D2B]/14 bg-white/75 hover:border-[#145A38]/40'
              }`}
            >
              <Truck
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  deliveryMethod === 'delivery' ? 'text-[#145A38]' : 'text-[#2B4338]/60'
                }`}
              />
              <div>
                <div className="font-bold text-[#062B1F] text-xs">Home Delivery</div>
                <p className="text-[11px] text-[#2B4338] mt-0.5 tabular-nums">
                  Delivered to your GPS pin or street address (${DELIVERY_FLAT_FEE.toFixed(2)})
                </p>
              </div>
            </button>

            <button
              type="button"
              id="fulfillment-pickup-btn"
              onClick={() => setDeliveryMethod('pickup')}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                deliveryMethod === 'pickup'
                  ? 'border-[#145A38] bg-[#DFF4E4]/65 shadow-sm'
                  : 'border-[#0B3D2B]/14 bg-white/75 hover:border-[#145A38]/40'
              }`}
            >
              <Store
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  deliveryMethod === 'pickup' ? 'text-[#145A38]' : 'text-[#2B4338]/60'
                }`}
              />
              <div>
                <div className="font-bold text-[#062B1F] text-xs">Pickup at Farm</div>
                <p className="text-[11px] text-[#2B4338] mt-0.5">
                  Collect directly from {farmNameInCart} (FREE)
                </p>
              </div>
            </button>
          </div>

          {deliveryMethod === 'delivery' ? (
            <div className="p-4 rounded-2xl border border-[#0B3D2B]/14 bg-white/70 backdrop-blur-md space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#062B1F] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#145A38]" />
                  Delivery Location
                </span>
                <div className="inline-flex rounded-xl border border-[#0B3D2B]/15 bg-white p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setLocationMode('gps')}
                    className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                      locationMode === 'gps' ? 'bg-[#062B1F] text-[#A8E635]' : 'text-[#2B4338] hover:bg-[#DFF4E4]/50'
                    }`}
                  >
                    <Navigation className="w-3 h-3" />
                    Detect Location
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode('manual')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      locationMode === 'manual' ? 'bg-[#062B1F] text-[#A8E635]' : 'text-[#2B4338] hover:bg-[#DFF4E4]/50'
                    }`}
                  >
                    Manual Address
                  </button>
                </div>
              </div>

              {locationMode === 'gps' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <LiquidGlassButton
                      variant="emerald"
                      size="xs"
                      onClick={handleDetectLocation}
                      disabled={gpsLoading}
                    >
                      {gpsLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Navigation className="w-3.5 h-3.5" />
                      )}
                      <span>{gpsCoords ? 'Re-detect GPS Coordinates' : 'Allow & Detect My Location'}</span>
                    </LiquidGlassButton>

                    {gpsCoords && (
                      <span className="text-[11px] font-bold text-[#145A38] bg-[#DFF4E4] border border-[#145A38]/25 px-2.5 py-1 rounded-lg tabular-nums">
                        GPS: {gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}
                        {gpsCoords.accuracy ? ` (±${gpsCoords.accuracy}m)` : ''}
                      </span>
                    )}
                  </div>

                  {gpsError && (
                    <div className="p-3 rounded-xl bg-[#F4D35E]/20 border border-[#F4D35E]/50 text-[#062B1F] text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[#B48A18] shrink-0 mt-0.5" />
                      <span>{gpsError}</span>
                    </div>
                  )}

                  {gpsCoords && (
                    <div className="space-y-2.5">
                      <div className="rounded-2xl overflow-hidden border border-[#0B3D2B]/15 bg-white h-44">
                        <iframe
                          title="Detected Delivery Location Map"
                          src={osmEmbedUrl}
                          className="w-full h-full border-0"
                          loading="lazy"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] font-semibold text-[#2B4338] block mb-1">
                            Adjust Latitude
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={gpsCoords.lat}
                            onChange={(e) =>
                              setGpsCoords((prev) => (prev ? { ...prev, lat: Number(e.target.value) } : prev))
                            }
                            className={`${lightInputClass} tabular-nums`}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-[#2B4338] block mb-1">
                            Adjust Longitude
                          </label>
                          <input
                            type="number"
                            step="0.0001"
                            value={gpsCoords.lng}
                            onChange={(e) =>
                              setGpsCoords((prev) => (prev ? { ...prev, lng: Number(e.target.value) } : prev))
                            }
                            className={`${lightInputClass} tabular-nums`}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setGpsConfirmed(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                          gpsConfirmed
                            ? 'bg-[#145A38] text-white border-[#145A38]'
                            : 'bg-white text-[#145A38] border-[#145A38]/30 hover:bg-[#DFF4E4]'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{gpsConfirmed ? 'Location Pin Confirmed' : 'Confirm Detected Pin'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-1">
                  <label className="font-semibold text-[#062B1F] block mb-1">
                    Street Address {locationMode === 'manual' ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g. 22 King George Rd"
                    className={lightInputClass}
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#062B1F] block mb-1">Suburb / Area</label>
                  <input
                    type="text"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    placeholder="e.g. Avondale"
                    className={lightInputClass}
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#062B1F] block mb-1">
                    City / Town {locationMode === 'manual' ? '*' : ''}
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Harare"
                    className={lightInputClass}
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="font-semibold text-[#062B1F] block mb-1">
                  Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="e.g. Blue gate opposite clinic, call on arrival"
                  className={lightInputClass}
                />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-[#145A38]/25 bg-[#DFF4E4]/55 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-[#062B1F] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#145A38]" />
                    Designated Farm Pickup Location
                  </h4>
                  <p className="text-[#062B1F] font-semibold mt-1">{farmNameInCart}</p>
                  <p className="text-[#2B4338] mt-0.5">
                    {loadingSeller ? 'Loading farm pickup address...' : designatedPickupAddress}
                  </p>
                </div>
                {sellerPaymentInfo.phone && (
                  <span className="text-[11px] font-bold text-[#062B1F] bg-white px-2.5 py-1 rounded-xl border border-[#145A38]/20 shrink-0 tabular-nums">
                    {sellerPaymentInfo.phone}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-white/85 border border-[#145A38]/15 text-[#2B4338]">
                <span className="font-bold text-[#062B1F]">Collection Instructions: </span>
                {designatedPickupInstructions}
              </div>

              <div>
                <label className="font-semibold text-[#062B1F] block mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#145A38]" />
                  Preferred Collection Window
                </label>
                <input
                  type="text"
                  value={pickupTimeWindow}
                  onChange={(e) => setPickupTimeWindow(e.target.value)}
                  placeholder="e.g. Tomorrow 9:00 AM - 12:00 PM"
                  className={lightInputClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Contact & Order Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-[#062B1F] block mb-1">Contact Phone Number *</label>
            <input
              type="tel"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="+263 77 000 0000"
              className={lightInputClass}
              required
            />
          </div>

          <div>
            <label className="font-semibold text-[#062B1F] block mb-1">Notes for Farmer (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please pack crates for easy loading"
              className={lightInputClass}
            />
          </div>
        </div>

        {/* 4. Payment Options */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#145A38]">
            Payment Option
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              id="payment-option-cod"
              onClick={() => setPaymentCategory('cash_on_delivery')}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                paymentCategory === 'cash_on_delivery'
                  ? 'border-[#145A38] bg-[#DFF4E4]/65 shadow-sm'
                  : 'border-[#0B3D2B]/14 bg-white/75 hover:border-[#145A38]/40'
              }`}
            >
              <Banknote
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  paymentCategory === 'cash_on_delivery' ? 'text-[#145A38]' : 'text-[#2B4338]/60'
                }`}
              />
              <div>
                <div className="font-bold text-[#062B1F] text-xs">Option A: Cash on Delivery</div>
                <p className="text-[11px] text-[#2B4338] mt-0.5">
                  Pay in cash when your products are delivered or collected.
                </p>
              </div>
            </button>

            <button
              type="button"
              id="payment-option-electronic"
              onClick={() => setPaymentCategory('electronic')}
              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer ${
                paymentCategory === 'electronic'
                  ? 'border-[#145A38] bg-[#DFF4E4]/65 shadow-sm'
                  : 'border-[#0B3D2B]/14 bg-white/75 hover:border-[#145A38]/40'
              }`}
            >
              <Smartphone
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  paymentCategory === 'electronic' ? 'text-[#145A38]' : 'text-[#2B4338]/60'
                }`}
              />
              <div>
                <div className="font-bold text-[#062B1F] text-xs">Option B: Electronic Payment</div>
                <p className="text-[11px] text-[#2B4338] mt-0.5">
                  Bank Transfer, EcoCash, or OneMoney with Proof of Payment (POP).
                </p>
              </div>
            </button>
          </div>

          {paymentCategory === 'cash_on_delivery' ? (
            <div className="p-3.5 rounded-2xl bg-white/80 border border-[#0B3D2B]/12 text-xs text-[#2B4338] flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#B48A18] shrink-0" />
              <span>
                Payment status will remain{' '}
                <strong className="text-[#062B1F]">Awaiting Payment (Pending until delivery)</strong> until you pay
                upon delivery or pickup.
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-[#0B3D2B]/14 bg-white/75 backdrop-blur-md space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ecocash', label: 'EcoCash', icon: Smartphone },
                  { id: 'onemoney', label: 'OneMoney', icon: Smartphone },
                  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 }
                ].map((m) => {
                  const Icon = m.icon;
                  const active = electronicMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setElectronicMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        active
                          ? 'border-[#062B1F] bg-[#062B1F] text-[#A8E635] shadow-md'
                          : 'border-[#0B3D2B]/14 bg-white text-[#2B4338] hover:bg-[#DFF4E4]/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-xl bg-[#DFF4E4]/55 border border-[#145A38]/20 space-y-1.5 text-xs">
                <div className="font-bold text-[#062B1F] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#145A38]" />
                  <span>{farmNameInCart} Payment Details</span>
                </div>
                {electronicMethod === 'ecocash' && (
                  <p className="text-[#2B4338]">
                    <span className="font-semibold">EcoCash Number / Merchant:</span>{' '}
                    <span className="font-mono font-bold text-[#062B1F]">{sellerPaymentInfo.ecocash}</span>
                  </p>
                )}
                {electronicMethod === 'onemoney' && (
                  <p className="text-[#2B4338]">
                    <span className="font-semibold">OneMoney Number:</span>{' '}
                    <span className="font-mono font-bold text-[#062B1F]">{sellerPaymentInfo.onemoney}</span>
                  </p>
                )}
                {electronicMethod === 'bank_transfer' && (
                  <p className="text-[#2B4338]">
                    <span className="font-semibold">Bank Account Details:</span>{' '}
                    <span className="font-mono font-bold text-[#062B1F]">{sellerPaymentInfo.bankAccount}</span>
                  </p>
                )}
                <p className="text-[11px] text-[#2B4338]">
                  Reference to use: <span className="font-bold text-[#062B1F]">{user?.name || 'Your Name'}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-[#062B1F] block mb-1">
                    Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. EC261114.9921"
                    className={lightInputClass}
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#062B1F] block mb-1">
                    Upload Proof of Payment (Image or PDF)
                  </label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-[#145A38] bg-[#DFF4E4]/50 hover:bg-[#DFF4E4] text-[#062B1F] font-bold cursor-pointer transition-colors">
                    {popUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{popFileName ? 'Replace POP File' : 'Choose POP Screenshot / PDF'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handlePopUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {popUrl && (
                <div className="p-3 rounded-xl bg-white border border-[#0B3D2B]/15 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {popUrl.startsWith('data:application/pdf') ? (
                      <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    ) : (
                      <img
                        src={popUrl}
                        alt="Proof of payment preview"
                        className="w-10 h-10 rounded-lg object-cover border border-[#0B3D2B]/15 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#062B1F] truncate">{popFileName}</p>
                      <p className="text-[11px] text-[#B48A18] font-semibold">
                        Status upon checkout: Pending Verification
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPopUrl('');
                      setPopFileName('');
                    }}
                    className="text-xs text-[#2B4338] hover:text-rose-600 font-semibold px-2 py-1 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              <p className="text-[11px] text-[#2B4338] leading-relaxed">
                Note: Your order will be marked{' '}
                <span className="font-bold text-[#062B1F]">{popUrl ? 'Pending Verification' : 'Awaiting Payment'}</span>.
                Payment is only marked <span className="font-bold text-[#062B1F]">Paid</span> after the farmer verifies
                your Proof of Payment.
              </p>
            </div>
          )}
        </div>

        {/* 5. Total Breakdown & Place Order Button */}
        <div className="p-4 rounded-2xl bg-[#062B1F] text-white space-y-2 text-xs shadow-lg border border-white/15">
          <div className="flex justify-between text-[#DFF4E4]/80">
            <span>Produce Subtotal</span>
            <span className="tabular-nums font-bold text-white">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[#DFF4E4]/80">
            <span>Fulfillment Fee</span>
            <span className="tabular-nums font-bold text-white">
              {deliveryMethod === 'delivery' ? `$${appliedDeliveryFee.toFixed(2)}` : 'FREE (Farm Pickup)'}
            </span>
          </div>
          <div className="flex justify-between text-base font-extrabold pt-2 border-t border-white/15">
            <span>Total Amount</span>
            <span className="text-[#A8E635] tabular-nums">${finalTotal.toFixed(2)}</span>
          </div>
        </div>

        <LiquidGlassButton
          id="submit-place-order-btn"
          type="submit"
          variant="lime"
          size="lg"
          disabled={isSubmitting || popUploading}
          className="w-full shadow-xl"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>
            {isSubmitting ? 'Placing Farm Order...' : `Confirm & Place Order ($${finalTotal.toFixed(2)})`}
          </span>
        </LiquidGlassButton>
      </form>
    </LiquidGlassModal>
  );
};
