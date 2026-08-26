import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Order } from '../types';
import {
  X,
  ShoppingBag,
  Truck,
  MapPin,
  CreditCard,
  Smartphone,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface CheckoutModalProps {
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ onClose, onOrderSuccess }) => {
  const { user } = useAuth();
  const { items, subtotal, deliveryFee, total, checkout, updateQuantity, removeFromCart } = useCart();

  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.location?.address || `${user?.location?.community ? `${user.location.community}, ` : ''}${user?.location?.city || 'Harare'}, ${user?.location?.province || 'Harare'}`
  );
  const [pickupWindow, setPickupWindow] = useState('Today 2:00 PM - 5:00 PM');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card' | 'bank_transfer'>('mobile_money');
  const [notes, setNotes] = useState('');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone || '+263 77 123 4567');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto" />
          <h2 className="text-xl font-bold text-stone-900">Your Cart is Empty</h2>
          <p className="text-xs text-stone-500">Add fresh farm produce from our marketplace to proceed to checkout.</p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
          >
            Browse Produce
          </button>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deliveryMethod === 'delivery' && !deliveryAddress.trim()) {
      setErrorMessage('Please provide a delivery address.');
      return;
    }
    if (!buyerPhone.trim()) {
      setErrorMessage('Please provide a contact phone number for delivery coordination.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const order = await checkout(
        deliveryMethod,
        deliveryMethod === 'delivery' ? deliveryAddress : undefined,
        paymentMethod,
        notes,
        deliveryMethod === 'pickup' ? pickupWindow : undefined
      );
      onOrderSuccess(order);
    } catch (err: any) {
      console.error('Checkout failed:', err);
      setErrorMessage(err?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        id="checkout-dialog"
        className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-6 border border-stone-200 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-white/95 border-b border-stone-200 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-stone-900 text-lg">Secure Farm Checkout</h2>
          </div>
          <button
            id="close-checkout-btn"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <form onSubmit={handlePlaceOrder} className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Cart Item Summary */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Order Items ({items.length})</h3>
            <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
              {items.map(item => (
                <div key={item.product.id} className="p-3 bg-white flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={item.product.images[0]} alt="" className="w-12 h-12 rounded-xl object-cover bg-stone-100 shrink-0" />
                    <div>
                      <div className="font-bold text-stone-900 text-xs">{item.product.name}</div>
                      <div className="text-[11px] text-stone-500">
                        ${item.product.price.toFixed(2)} / {item.product.unit} • From {item.product.farmName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-stone-200 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="px-2 py-1 text-stone-600 hover:bg-stone-100 font-bold"
                      >
                        -
                      </button>
                      <span className="px-2 font-bold text-stone-900">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="px-2 py-1 text-stone-600 hover:bg-stone-100 font-bold"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-bold text-xs text-stone-900 min-w-14 text-right">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-stone-400 hover:text-red-500 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery or Pickup Options */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Fulfillment Method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  deliveryMethod === 'delivery'
                    ? 'border-emerald-600 bg-emerald-50/50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="fulfillment"
                  checked={deliveryMethod === 'delivery'}
                  onChange={() => setDeliveryMethod('delivery')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-stone-900 text-xs">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    Local AgriDelivery
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Direct delivery to your doorstep ($3.00 flat fee)
                  </p>
                </div>
              </label>

              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  deliveryMethod === 'pickup'
                    ? 'border-emerald-600 bg-emerald-50/50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="fulfillment"
                  checked={deliveryMethod === 'pickup'}
                  onChange={() => setDeliveryMethod('pickup')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-stone-900 text-xs">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Farm Gate Pickup
                  </div>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Collect directly from the farmer (FREE)
                  </p>
                </div>
              </label>
            </div>

            {deliveryMethod === 'delivery' ? (
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-stone-700 block">Delivery Address</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  placeholder="Street name, suburb, city, province"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
            ) : (
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-stone-700 block">Preferred Pickup Time</label>
                <input
                  type="text"
                  value={pickupWindow}
                  onChange={e => setPickupWindow(e.target.value)}
                  placeholder="e.g. Tomorrow 9:00 AM - 12:00 PM"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            )}
          </div>

          {/* Contact and Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-stone-700 block mb-1">Contact Phone Number</label>
              <input
                type="tel"
                value={buyerPhone}
                onChange={e => setBuyerPhone(e.target.value)}
                placeholder="+263 77 000 0000"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-stone-900 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-stone-700 block mb-1">Notes for Farmer (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Please select slightly greener tomatoes"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-stone-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Payment Option</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'mobile_money', label: 'EcoCash / Mobile', icon: Smartphone },
                { id: 'cash', label: 'Cash on Delivery', icon: Banknote },
                { id: 'card', label: 'Debit / Credit Card', icon: CreditCard },
                { id: 'bank_transfer', label: 'Bank Transfer', icon: ShieldCheck }
              ].map(method => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-bold'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-stone-400'}`} />
                    <span className="text-[11px]">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total Breakdown & Place Order Button */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>Produce Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Fulfillment Fee:</span>
              <span>{deliveryMethod === 'delivery' ? `$${deliveryFee.toFixed(2)}` : 'FREE (Pickup)'}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Platform Service Fee:</span>
              <span className="text-emerald-700 font-semibold">$0.00 (Zero markup)</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-stone-900 pt-2 border-t border-stone-200">
              <span>Total Amount Due:</span>
              <span className="text-emerald-800">${(subtotal + (deliveryMethod === 'delivery' ? deliveryFee : 0)).toFixed(2)}</span>
            </div>
          </div>

          <button
            id="submit-place-order-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Placing Farm Order...' : `Confirm & Place Order ($${(subtotal + (deliveryMethod === 'delivery' ? deliveryFee : 0)).toFixed(2)})`}
          </button>
        </form>
      </div>
    </div>
  );
};
