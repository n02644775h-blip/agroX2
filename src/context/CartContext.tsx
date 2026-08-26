import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, Order } from '../types';
import { api } from '../services/api';
import confetti from 'canvas-confetti';

interface CartContextType {
  cart: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: Product, quantity?: number, notes?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalItems: number;
  farmerIdInCart: string | null;
  farmNameInCart: string | null;
  checkout: (params: {
    buyerId: string;
    deliveryMethod: 'pickup' | 'delivery';
    deliveryAddress?: string;
    pickupTimeWindow?: string;
    buyerNotes?: string;
  }) => Promise<Order>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('agriconnect_cart');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('agriconnect_cart', JSON.stringify(cart));
  }, [cart]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const farmerIdInCart = cart.length > 0 ? cart[0].product.farmerId : null;
  const farmNameInCart = cart.length > 0 ? cart[0].product.farmName : null;

  const addToCart = (product: Product, quantity = 1, notes?: string) => {
    setCart(prev => {
      // If adding from a different farmer, we can support replacing or warning
      const existingFarmer = prev.length > 0 ? prev[0].product.farmerId : null;
      if (existingFarmer && existingFarmer !== product.farmerId) {
        if (!confirm(`Your cart already contains items from ${prev[0].product.farmName}. Clear cart and add items from ${product.farmName} instead?`)) {
          return prev;
        }
        return [{ product, quantity: Math.max(product.minOrderQuantity, quantity), notes }];
      }

      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(product.quantityAvailable, updated[existingIndex].quantity + quantity);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          notes: notes || updated[existingIndex].notes
        };
        return updated;
      } else {
        const initialQty = Math.max(product.minOrderQuantity || 1, quantity);
        return [...prev, { product, quantity: Math.min(product.quantityAvailable, initialQty), notes }];
      }
    });
    setIsOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const clampedQty = Math.min(item.product.quantityAvailable, quantity);
          return { ...item, quantity: clampedQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const checkout = async (params: {
    buyerId: string;
    deliveryMethod: 'pickup' | 'delivery';
    deliveryAddress?: string;
    pickupTimeWindow?: string;
    buyerNotes?: string;
  }): Promise<Order> => {
    if (!farmerIdInCart || cart.length === 0) {
      throw new Error('Cart is empty');
    }

    const orderItems = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      productImage: item.product.images[0] || '',
      price: item.product.price,
      unit: item.product.unit,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity
    }));

    const newOrder = await api.createOrder({
      buyerId: params.buyerId,
      farmerId: farmerIdInCart,
      items: orderItems,
      totalAmount,
      deliveryMethod: params.deliveryMethod,
      deliveryAddress: params.deliveryAddress,
      pickupTimeWindow: params.pickupTimeWindow,
      buyerNotes: params.buyerNotes
    });

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }

    clearCart();
    setIsOpen(false);
    return newOrder;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        openCart,
        closeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalAmount,
        totalItems,
        farmerIdInCart,
        farmNameInCart,
        checkout
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
