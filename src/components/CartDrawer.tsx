import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useCart, DELIVERY_FLAT_FEE } from '../context/CartContext';
import { LiquidGlassButton } from './glass';
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

  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="shopping-cart-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          className="fixed inset-0 z-50 bg-[#062B1F]/70 backdrop-blur-md flex justify-end"
          onClick={closeCart}
        >
          <motion.aside
            id="shopping-cart-drawer"
            role="dialog"
            aria-label="Shopping Cart"
            initial={prefersReducedMotion ? { opacity: 0 } : { x: 420 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { x: 420 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="w-full max-w-md bg-[#062B1F]/92 backdrop-blur-2xl h-full shadow-[0_24px_80px_rgba(0,0,0,0.65)] flex flex-col border-l border-white/20 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/15 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-[#A8E635] to-[#145A38] text-[#062B1F] flex items-center justify-center shadow-md border border-white/40 shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-extrabold text-white text-base leading-tight truncate tabular-nums">
                    Shopping Cart ({totalItems})
                  </h2>
                  {farmNameInCart && (
                    <p className="text-[11px] text-[#DFF4E4]/80 flex items-center gap-1 mt-0.5 truncate">
                      <Store className="w-3 h-3 text-[#A8E635] shrink-0" />
                      <span className="truncate">{farmNameInCart}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                id="close-cart-drawer-btn"
                type="button"
                onClick={closeCart}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-[#DFF4E4] hover:text-white transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close cart"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Farm Switch Confirmation Banner */}
            {pendingFarmSwitch && (
              <div className="m-4 p-4 rounded-2xl bg-[#F4D35E]/14 border border-[#F4D35E]/40 backdrop-blur-md space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-[#F4D35E] shrink-0 mt-0.5" />
                  <div className="text-xs text-[#F8FAF7] leading-relaxed">
                    <p className="font-bold">Start a new cart from {pendingFarmSwitch.product.farmName}?</p>
                    <p className="mt-0.5 text-[#DFF4E4]/80">
                      Your cart currently holds items from{' '}
                      <span className="font-semibold text-white">{pendingFarmSwitch.currentFarmName}</span>. Orders are
                      placed one farm at a time.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LiquidGlassButton
                    variant="lime"
                    size="xs"
                    onClick={confirmFarmSwitch}
                    className="flex-1"
                  >
                    Replace Cart & Add Item
                  </LiquidGlassButton>
                  <LiquidGlassButton variant="glass" size="xs" onClick={cancelFarmSwitch}>
                    Keep Current
                  </LiquidGlassButton>
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4">
                  <div className="w-16 h-16 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                    <ShoppingBag className="w-8 h-8 text-[#A8E635]" />
                  </div>
                  <h3 className="text-base font-extrabold text-white">Your cart is empty</h3>
                  <p className="text-xs text-[#DFF4E4]/75 mt-1.5 max-w-xs leading-relaxed">
                    Explore fresh farm produce and fodder from local growers. Your selected items stay saved as you browse.
                  </p>
                  <LiquidGlassButton variant="lime" size="sm" onClick={closeCart} className="mt-5">
                    Browse Marketplace
                  </LiquidGlassButton>
                </div>
              ) : (
                items.map((item) => {
                  const lineTotal = item.product.price * item.quantity;
                  return (
                    <div
                      key={item.product.id}
                      className="p-3.5 rounded-2xl border border-white/16 bg-white/8 backdrop-blur-md flex gap-3.5 items-start hover:bg-white/12 transition-colors"
                    >
                      <img
                        src={
                          item.product.images?.[0] ||
                          'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400'
                        }
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover bg-[#0B3D2B] border border-white/15 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-white text-xs leading-snug line-clamp-2">
                            {item.product.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1.5 rounded-lg text-[#DFF4E4]/60 hover:text-rose-300 hover:bg-rose-500/20 transition-colors shrink-0 cursor-pointer"
                            aria-label={`Remove ${item.product.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-[#DFF4E4]/75 mt-0.5 tabular-nums">
                          ${item.product.price.toFixed(2)} / {item.product.unit}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="inline-flex items-center border border-white/20 rounded-xl bg-white/10">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/15 rounded-l-xl transition-colors cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 text-xs font-bold text-white tabular-nums min-w-[2rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              disabled={item.quantity >= (item.product.quantityAvailable || 999)}
                              className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/15 disabled:opacity-40 rounded-r-xl transition-colors cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="font-extrabold text-sm text-[#A8E635] tabular-nums">
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
              <div className="p-5 border-t border-white/15 bg-white/6 backdrop-blur-xl space-y-3 pb-safe">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[#DFF4E4]/80">
                    <span>Products Subtotal ({totalItems} items)</span>
                    <span className="font-bold text-white tabular-nums">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[#DFF4E4]/65">
                    <span>Fulfillment</span>
                    <span className="tabular-nums">Delivery (${DELIVERY_FLAT_FEE.toFixed(2)}) or Free Pickup</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-white/15 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Cart Total</span>
                  <span className="text-xl font-extrabold text-[#A8E635] tabular-nums">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={clearCart}
                    className="px-4 py-3 rounded-2xl border border-white/25 bg-white/10 text-[#DFF4E4] hover:text-rose-200 hover:bg-rose-500/20 hover:border-rose-400/40 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Clear
                  </button>
                  <LiquidGlassButton
                    id="cart-proceed-checkout-btn"
                    variant="lime"
                    size="md"
                    onClick={openCheckout}
                    className="flex-1 shadow-xl"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </LiquidGlassButton>
                </div>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
