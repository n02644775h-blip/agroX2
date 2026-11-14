import React from 'react';
import { useCart, DELIVERY_FLAT_FEE } from '../context/CartContext';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Store,
  AlertTriangle
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    items,
    isOpen,
    closeCart,
    openCheckout,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    totalItems,
    farmNameInCart,
    pendingFarmSwitch,
    confirmFarmSwitch,
    cancelFarmSwitch
  } = useCart();

  if (!isOpen) return null;

  return (
    <div
      id="shopping-cart-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end"
      onClick={closeCart}
    >
      <aside
        id="shopping-cart-drawer"
        role="dialog"
        aria-label="Shopping Cart"
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900 text-base leading-tight">
                Shopping Cart ({totalItems})
              </h2>
              {farmNameInCart && (
                <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                  <Store className="w-3 h-3 text-emerald-600" />
                  <span>{farmNameInCart}</span>
                </p>
              )}
            </div>
          </div>
          <button
            id="close-cart-drawer-btn"
            type="button"
            onClick={closeCart}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Farm Switch Confirmation Banner (No window.confirm) */}
        {pendingFarmSwitch && (
          <div className="m-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <p className="font-bold">Start a new cart from {pendingFarmSwitch.product.farmName}?</p>
                <p className="mt-0.5 text-amber-800">
                  Your cart currently holds items from <span className="font-semibold">{pendingFarmSwitch.currentFarmName}</span>. Orders are placed one farm at a time.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confirmFarmSwitch}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Replace Cart & Add Item
              </button>
              <button
                type="button"
                onClick={cancelFarmSwitch}
                className="py-2 px-3 bg-white border border-amber-300 text-amber-900 text-xs font-semibold rounded-xl hover:bg-amber-100 transition-colors"
              >
                Keep Current
              </button>
            </div>
          </div>
        )}

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-stone-400" />
              </div>
              <h3 className="text-base font-bold text-stone-900">Your cart is empty</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-xs leading-relaxed">
                Explore fresh farm produce and fodder from local growers. Your selected items stay saved as you browse.
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="mt-5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Browse Marketplace
              </button>
            </div>
          ) : (
            items.map(item => {
              const lineTotal = item.product.price * item.quantity;
              return (
                <div
                  key={item.product.id}
                  className="p-3.5 rounded-2xl border border-stone-200 bg-white flex gap-3.5 items-start hover:border-stone-300 transition-colors"
                >
                  <img
                    src={item.product.images?.[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400'}
                    alt={item.product.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover bg-stone-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-stone-900 text-xs leading-snug line-clamp-2">
                        {item.product.name}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                        aria-label={`Remove ${item.product.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5 tabular-nums">
                      ${item.product.price.toFixed(2)} / {item.product.unit}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center border border-stone-200 rounded-xl bg-stone-50">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-stone-200/70 rounded-l-xl transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-stone-900 tabular-nums min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= (item.product.quantityAvailable || 999)}
                          className="w-8 h-8 flex items-center justify-center text-stone-600 hover:bg-stone-200/70 disabled:opacity-40 rounded-r-xl transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-extrabold text-sm text-stone-900 tabular-nums">
                        ${lineTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Totals & Checkout CTA */}
        {items.length > 0 && (
          <div className="p-5 border-t border-stone-200 bg-stone-50 space-y-3 pb-safe">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-stone-600">
                <span>Products Subtotal ({totalItems} items)</span>
                <span className="font-bold text-stone-900 tabular-nums">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-stone-500">
                <span>Fulfillment</span>
                <span className="tabular-nums">Delivery (${DELIVERY_FLAT_FEE.toFixed(2)}) or Free Pickup</span>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <span className="text-sm font-bold text-stone-900">Cart Total</span>
              <span className="text-lg font-extrabold text-emerald-700 tabular-nums">
                ${subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={clearCart}
                className="px-3.5 py-3 rounded-xl border border-stone-300 bg-white text-stone-600 hover:text-red-600 hover:border-red-200 text-xs font-bold transition-colors"
              >
                Clear
              </button>
              <button
                id="cart-proceed-checkout-btn"
                type="button"
                onClick={openCheckout}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-colors"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
