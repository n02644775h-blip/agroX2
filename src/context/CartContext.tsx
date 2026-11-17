import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  CartItem,
  Product,
  Order,
  DeliveryLocation,
  PickupLocation,
  PaymentMethod,
  PaymentStatus
} from '../types';
import { api } from '../services/api';
import { saveFirebaseOrder } from '../services/firebaseOrders';
import { createFirebaseNotification } from '../services/firebaseNotifications';
import { pushNotificationService } from '../services/pushNotificationService';
import confetti from 'canvas-confetti';

export const DELIVERY_FLAT_FEE = 3.0;

export interface CheckoutPayload {
  buyerId: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryAddress?: string;
  deliveryLocation?: DeliveryLocation;
  pickupLocation?: PickupLocation;
  pickupTimeWindow?: string;
  pickupInstructions?: string;
  paymentMethod: PaymentMethod;
  proofOfPaymentUrl?: string;
  proofOfPaymentFileName?: string;
  paymentReference?: string;
  farmerPaymentDetails?: {
    ecocash?: string;
    onemoney?: string;
    bankAccount?: string;
    innbucks?: string;
    phone?: string;
  };
  buyerNotes?: string;
}

interface PendingFarmSwitch {
  product: Product;
  quantity: number;
  notes?: string;
  currentFarmName: string;
}

interface CartContextType {
  cart: CartItem[];
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  isCheckoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  addToCart: (product: Product, quantity?: number, notes?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  totalItems: number;
  farmerIdInCart: string | null;
  farmNameInCart: string | null;
  pendingFarmSwitch: PendingFarmSwitch | null;
  confirmFarmSwitch: () => void;
  cancelFarmSwitch: () => void;
  checkout: (params: CheckoutPayload) => Promise<Order>;
  checkoutBatch: (params: CheckoutPayload) => Promise<Order[]>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('agriconnect_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [pendingFarmSwitch, setPendingFarmSwitch] = useState<PendingFarmSwitch | null>(null);
  const checkoutLockRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('agriconnect_cart', JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const openCheckout = () => {
    setIsOpen(false);
    setIsCheckoutOpen(true);
  };
  const closeCheckout = () => setIsCheckoutOpen(false);

  const farmerIdInCart = cart.length > 0 ? cart[0].product.farmerId : null;
  const farmNameInCart = cart.length > 0 ? cart[0].product.farmName : null;

  const addToCart = (product: Product, quantity = 1, notes?: string) => {
    const existingFarmer = cart.length > 0 ? cart[0].product.farmerId : null;
    if (existingFarmer && existingFarmer !== product.farmerId) {
      setPendingFarmSwitch({
        product,
        quantity,
        notes,
        currentFarmName: cart[0].product.farmName || 'another farm'
      });
      setIsOpen(true);
      return;
    }

    setCart(prev => {
      const prevFarmer = prev.length > 0 ? prev[0].product.farmerId : null;
      if (prevFarmer && prevFarmer !== product.farmerId) {
        return prev;
      }

      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      const maxAvail = Math.max(1, product.quantityAvailable || 999);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(maxAvail, updated[existingIndex].quantity + quantity);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          notes: notes || updated[existingIndex].notes
        };
        return updated;
      } else {
        const initialQty = Math.max(product.minOrderQuantity || 1, quantity);
        return [...prev, { product, quantity: Math.min(maxAvail, initialQty), notes }];
      }
    });
    setIsOpen(true);
  };

  const confirmFarmSwitch = () => {
    if (!pendingFarmSwitch) return;
    const { product, quantity, notes } = pendingFarmSwitch;
    const maxAvail = Math.max(1, product.quantityAvailable || 999);
    const initialQty = Math.max(product.minOrderQuantity || 1, quantity);
    setCart([{ product, quantity: Math.min(maxAvail, initialQty), notes }]);
    setPendingFarmSwitch(null);
    setIsOpen(true);
  };

  const cancelFarmSwitch = () => {
    setPendingFarmSwitch(null);
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
          const maxAvail = Math.max(1, item.product.quantityAvailable || 999);
          const clampedQty = Math.min(maxAvail, quantity);
          return { ...item, quantity: clampedQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setPendingFarmSwitch(null);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const subtotal = totalAmount;
  const deliveryFee = cart.length > 0 ? DELIVERY_FLAT_FEE : 0;
  const total = subtotal + deliveryFee;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const checkoutBatch = async (params: CheckoutPayload): Promise<Order[]> => {
    if (checkoutLockRef.current) {
      throw new Error('Your order is already being processed. Please wait.');
    }
    if (!farmerIdInCart || cart.length === 0) {
      throw new Error('Your shopping cart is empty.');
    }

    checkoutLockRef.current = true;
    try {
      // Group items by farmerId so if a cart ever spans multiple farmers each receives only their items
      const groupsMap = new Map<string, CartItem[]>();
      for (const item of cart) {
        const fId = item.product.farmerId || farmerIdInCart;
        const list = groupsMap.get(fId) || [];
        list.push(item);
        groupsMap.set(fId, list);
      }

      const farmerEntries = Array.from(groupsMap.entries());
      const checkoutGroupId = farmerEntries.length > 1 ? `grp-${Date.now()}` : undefined;
      const nowIso = new Date().toISOString();
      const hasPop = Boolean(params.proofOfPaymentUrl && params.proofOfPaymentUrl.trim().length > 0);
      // CRITICAL: Never automatically mark an order as paid simply because POP was uploaded.
      const resolvedPaymentStatus: PaymentStatus =
        params.paymentMethod === 'cash_on_delivery'
          ? 'awaiting_payment'
          : hasPop
            ? 'pending_verification'
            : 'awaiting_payment';

      const createdOrders: Order[] = [];

      for (let idx = 0; idx < farmerEntries.length; idx++) {
        const [groupFarmerId, groupItems] = farmerEntries[idx];
        const firstProd = groupItems[0].product;
        const orderItems = groupItems.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          productImage: item.product.images?.[0] || '',
          farmerId: groupFarmerId,
          price: item.product.price,
          unit: item.product.unit,
          quantity: item.quantity,
          subtotal: Number((item.product.price * item.quantity).toFixed(2))
        }));

        const groupSubtotal = Number(
          orderItems.reduce((sum, it) => sum + it.subtotal, 0).toFixed(2)
        );
        const appliedDeliveryFee = params.deliveryMethod === 'delivery' ? DELIVERY_FLAT_FEE : 0;
        const finalTotal = Number((groupSubtotal + appliedDeliveryFee).toFixed(2));
        const suffix = `${Date.now()}${farmerEntries.length > 1 ? `-${idx + 1}` : ''}`;
        const generatedId = `ord-${suffix}`;
        const generatedOrderNumber = `AGC-26-${Math.floor(1000 + Math.random() * 9000)}`;

        const orderPayload = {
          id: generatedId,
          orderNumber: generatedOrderNumber,
          checkoutGroupId,
          buyerId: params.buyerId,
          buyerName: params.buyerName || 'Marketplace Buyer',
          buyerPhone: params.buyerPhone || '',
          buyerEmail: params.buyerEmail || '',
          farmerId: groupFarmerId,
          farmerName: firstProd.farmerName || 'Farmer',
          farmName: firstProd.farmName || 'Local Farm',
          items: orderItems,
          subtotalAmount: groupSubtotal,
          deliveryFee: appliedDeliveryFee,
          totalAmount: finalTotal,
          deliveryMethod: params.deliveryMethod,
          deliveryAddress: params.deliveryAddress || params.deliveryLocation?.formattedAddress,
          deliveryLocation: params.deliveryLocation,
          pickupLocation: params.pickupLocation,
          pickupTimeWindow: params.pickupTimeWindow,
          pickupInstructions: params.pickupInstructions || params.pickupLocation?.instructions,
          paymentMethod: params.paymentMethod,
          paymentStatus: resolvedPaymentStatus,
          proofOfPaymentUrl: params.proofOfPaymentUrl,
          proofOfPaymentFileName: params.proofOfPaymentFileName,
          paymentReference: params.paymentReference,
          farmerPaymentDetails: params.farmerPaymentDetails,
          buyerNotes: params.buyerNotes
        };

        let createdOrder: Order;
        try {
          createdOrder = await api.createOrder(orderPayload);
        } catch (apiErr) {
          console.warn('Backend order endpoint fallback to Firestore:', apiErr);
          createdOrder = {
            ...orderPayload,
            status: 'received',
            paymentSubmittedAt: hasPop ? nowIso : undefined,
            createdAt: nowIso,
            updatedAt: nowIso,
            statusHistory: [
              {
                status: 'received',
                timestamp: nowIso,
                note: hasPop
                  ? 'Order received (POP uploaded — awaiting farmer verification)'
                  : 'Order received by farm'
              }
            ]
          };
        }

        // Persist in Firestore so buyer & farmer stay synchronized in real time across devices & reloads
        await saveFirebaseOrder(createdOrder);

        const farmerOrderTitle = `New Order Received (${createdOrder.orderNumber})`;
        const farmerOrderMsg = `${createdOrder.buyerName} placed a ${createdOrder.deliveryMethod === 'pickup' ? 'Farm Pickup' : 'Delivery'} order for $${createdOrder.totalAmount.toFixed(2)}.`;

        await Promise.all([
          createFirebaseNotification({
            userId: createdOrder.farmerId,
            title: farmerOrderTitle,
            message: farmerOrderMsg,
            type: 'order',
            link: `/orders/${createdOrder.id}`,
            metadata: { orderId: createdOrder.id }
          }),
          createFirebaseNotification({
            userId: createdOrder.buyerId,
            title: `Order Received (${createdOrder.orderNumber})`,
            message: `Your order with ${createdOrder.farmName} has been received.`,
            type: 'order',
            link: `/orders/${createdOrder.id}`,
            metadata: { orderId: createdOrder.id }
          })
        ]);

        // Ensure remote FCM dispatch fires even if server API order creation used fallback
        pushNotificationService
          .triggerRemotePushDispatch({
            userId: createdOrder.farmerId,
            title: farmerOrderTitle,
            body: farmerOrderMsg,
            type: 'order',
            link: '/#orders',
            data: {
              orderId: createdOrder.id,
              orderNumber: createdOrder.orderNumber,
              status: createdOrder.status
            }
          })
          .catch(() => {});

        createdOrders.push(createdOrder);
      }

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }

      clearCart();
      setIsOpen(false);
      setIsCheckoutOpen(false);
      return createdOrders;
    } finally {
      checkoutLockRef.current = false;
    }
  };

  const checkout = async (params: CheckoutPayload): Promise<Order> => {
    const orders = await checkoutBatch(params);
    return orders[0];
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        items: cart,
        isOpen,
        openCart,
        closeCart,
        isCheckoutOpen,
        openCheckout,
        closeCheckout,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalAmount,
        subtotal,
        deliveryFee,
        total,
        totalItems,
        farmerIdInCart,
        farmNameInCart,
        pendingFarmSwitch,
        confirmFarmSwitch,
        cancelFarmSwitch,
        checkout,
        checkoutBatch
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
