import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { sanitizeForFirestore } from '../context/AuthContext';
import { Order, OrderStatus, PaymentStatus } from '../types';

const toIsoString = (val: any, fallback: string): string => {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val?.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
  return fallback;
};

export function parseFirestoreOrder(docId: string, data: any): Order {
  const fallbackNow = new Date().toISOString();
  const createdAt = toIsoString(data?.createdAt, fallbackNow);
  const updatedAt = toIsoString(data?.updatedAt, createdAt);

  return {
    id: data?.id || docId,
    orderNumber: data?.orderNumber || `AGC-${docId.slice(-6).toUpperCase()}`,
    buyerId: data?.buyerId || '',
    buyerName: data?.buyerName || 'Buyer',
    buyerPhone: data?.buyerPhone || '',
    buyerEmail: data?.buyerEmail || '',
    farmerId: data?.farmerId || '',
    farmerName: data?.farmerName || 'Farmer',
    farmName: data?.farmName || 'Local Farm',
    items: Array.isArray(data?.items) ? data.items : [],
    subtotalAmount: typeof data?.subtotalAmount === 'number' ? data.subtotalAmount : undefined,
    deliveryFee: typeof data?.deliveryFee === 'number' ? data.deliveryFee : undefined,
    totalAmount: Number(data?.totalAmount) || 0,
    status: (data?.status as OrderStatus) || 'received',
    deliveryMethod: data?.deliveryMethod === 'pickup' ? 'pickup' : 'delivery',
    deliveryAddress: data?.deliveryAddress || '',
    deliveryLocation: data?.deliveryLocation || undefined,
    pickupLocation: data?.pickupLocation || undefined,
    pickupTimeWindow: data?.pickupTimeWindow || '',
    pickupInstructions: data?.pickupInstructions || '',
    paymentMethod: data?.paymentMethod || 'cash_on_delivery',
    paymentStatus: (data?.paymentStatus as PaymentStatus) || 'awaiting_payment',
    proofOfPaymentUrl: data?.proofOfPaymentUrl || '',
    proofOfPaymentFileName: data?.proofOfPaymentFileName || '',
    paymentReference: data?.paymentReference || '',
    paymentSubmittedAt: data?.paymentSubmittedAt || '',
    paymentVerifiedAt: data?.paymentVerifiedAt || '',
    paymentRejectionReason: data?.paymentRejectionReason || '',
    farmerPaymentDetails: data?.farmerPaymentDetails || undefined,
    buyerNotes: data?.buyerNotes || '',
    farmerNotes: data?.farmerNotes || '',
    createdAt,
    updatedAt,
    statusHistory: Array.isArray(data?.statusHistory) ? data.statusHistory : [
      { status: (data?.status as OrderStatus) || 'received', timestamp: createdAt, note: 'Order placed' }
    ],
    isReviewed: Boolean(data?.isReviewed)
  };
}

export function subscribeToFirebaseOrders(
  filter: { buyerId?: string; farmerId?: string; userId?: string; role?: string },
  onUpdate: (orders: Order[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const colRef = collection(db, 'orders');
    let q = query(colRef);

    if (filter.farmerId) {
      q = query(colRef, where('farmerId', '==', filter.farmerId));
    } else if (filter.buyerId) {
      q = query(colRef, where('buyerId', '==', filter.buyerId));
    } else if (filter.userId && filter.role === 'buyer') {
      q = query(colRef, where('buyerId', '==', filter.userId));
    } else if (filter.userId && (filter.role === 'farmer' || filter.role === 'fodder_supplier')) {
      q = query(colRef, where('farmerId', '==', filter.userId));
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach(d => {
          list.push(parseFirestoreOrder(d.id, d.data()));
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore orders subscription warning:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach Firestore orders listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveFirebaseOrder(order: Order): Promise<void> {
  try {
    const docRef = doc(db, 'orders', order.id);
    await setDoc(docRef, sanitizeForFirestore({
      ...order,
      updatedAt: serverTimestamp()
    }), { merge: true });
  } catch (err) {
    console.warn('Could not save order to Firestore:', err);
  }
}

export async function updateFirebaseOrderStatus(
  orderId: string,
  status: OrderStatus,
  existingOrder?: Order,
  note?: string,
  pickupTimeWindow?: string,
  pickupInstructions?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'orders', orderId);
    const now = new Date().toISOString();
    const history = Array.isArray(existingOrder?.statusHistory) ? [...existingOrder.statusHistory] : [];
    history.push({
      status,
      timestamp: now,
      note: note || `Status updated to ${status.replace(/_/g, ' ')}`
    });

    const payload: Record<string, any> = {
      status,
      statusHistory: history,
      updatedAt: serverTimestamp()
    };
    if (pickupTimeWindow !== undefined) payload.pickupTimeWindow = pickupTimeWindow;
    if (pickupInstructions !== undefined) {
      payload.pickupInstructions = pickupInstructions;
      if (existingOrder?.pickupLocation) {
        payload.pickupLocation = {
          ...existingOrder.pickupLocation,
          instructions: pickupInstructions,
          ...(pickupTimeWindow ? { readyAt: pickupTimeWindow } : {})
        };
      }
    }

    await updateDoc(docRef, sanitizeForFirestore(payload)).catch(async () => {
      if (existingOrder) {
        await setDoc(docRef, sanitizeForFirestore({ ...existingOrder, ...payload, updatedAt: now }), { merge: true });
      }
    });
  } catch (err) {
    console.warn('Could not update order status in Firestore:', err);
  }
}

export async function updateFirebaseOrderPayment(
  orderId: string,
  updates: {
    paymentStatus: PaymentStatus;
    paymentRejectionReason?: string;
    paymentVerifiedAt?: string;
    proofOfPaymentUrl?: string;
    proofOfPaymentFileName?: string;
    paymentReference?: string;
    paymentSubmittedAt?: string;
  },
  existingOrder?: Order
): Promise<void> {
  try {
    const docRef = doc(db, 'orders', orderId);
    const payload = sanitizeForFirestore({
      ...updates,
      updatedAt: serverTimestamp()
    });
    await updateDoc(docRef, payload).catch(async () => {
      if (existingOrder) {
        await setDoc(docRef, sanitizeForFirestore({ ...existingOrder, ...updates }), { merge: true });
      }
    });
  } catch (err) {
    console.warn('Could not update order payment in Firestore:', err);
  }
}
