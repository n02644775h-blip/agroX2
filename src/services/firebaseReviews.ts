import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { sanitizeForFirestore } from '../context/AuthContext';
import { FarmerRatingStats, Order, Review } from '../types';
import { normalizeOrderStatus } from '../utils/orderUtils';

export const RATING_LABELS: Record<number, string> = {
  1: '1 Star – Very Poor',
  2: '2 Stars – Poor',
  3: '3 Stars – Average',
  4: '4 Stars – Good',
  5: '5 Stars – Excellent'
};

export function getRatingLabel(rating: number): string {
  const rounded = Math.min(5, Math.max(1, Math.round(rating)));
  return RATING_LABELS[rounded] || `${rounded} Stars`;
}

const toIsoString = (val: any, fallback: string): string => {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val?.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
  return fallback;
};

export function parseFirestoreReview(docId: string, data: any): Review {
  const fallbackNow = new Date().toISOString();
  const createdAt = toIsoString(data?.createdAt, fallbackNow);
  const numericRating = Math.min(5, Math.max(1, Math.round(Number(data?.rating) || 5)));

  return {
    id: data?.id || docId,
    orderId: data?.orderId || '',
    orderNumber: data?.orderNumber || undefined,
    productId: data?.productId || undefined,
    productName: data?.productName || undefined,
    farmerId: data?.farmerId || '',
    buyerId: data?.buyerId || '',
    buyerName: data?.buyerName || 'Verified Buyer',
    buyerAvatar:
      data?.buyerAvatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    rating: numericRating,
    ratingLabel: data?.ratingLabel || getRatingLabel(numericRating),
    qualityRating: data?.qualityRating ? Number(data.qualityRating) : undefined,
    communicationRating: data?.communicationRating ? Number(data.communicationRating) : undefined,
    deliveryRating: data?.deliveryRating ? Number(data.deliveryRating) : undefined,
    comment: typeof data?.comment === 'string' ? data.comment : '',
    createdAt,
    farmerResponse: data?.farmerResponse || undefined
  };
}

export function calculateFarmerRatingStats(reviews: Review[]): FarmerRatingStats {
  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };

  if (!Array.isArray(reviews) || reviews.length === 0) {
    return {
      averageRating: 0,
      totalRatings: 0,
      distribution
    };
  }

  let sum = 0;
  for (const rev of reviews) {
    const r = Math.min(5, Math.max(1, Math.round(Number(rev.rating) || 0))) as 1 | 2 | 3 | 4 | 5;
    if (r >= 1 && r <= 5) {
      distribution[r] += 1;
      sum += r;
    }
  }

  const totalRatings = Object.values(distribution).reduce((acc, count) => acc + count, 0);
  const averageRating = totalRatings > 0 ? Number((sum / totalRatings).toFixed(1)) : 0;

  return {
    averageRating,
    totalRatings,
    distribution
  };
}

export function subscribeToFirebaseReviews(
  filter: { farmerId?: string; buyerId?: string; orderId?: string },
  onUpdate: (reviews: Review[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const colRef = collection(db, 'reviews');
    let q = query(colRef);

    if (filter.orderId) {
      q = query(colRef, where('orderId', '==', filter.orderId));
    } else if (filter.farmerId) {
      q = query(colRef, where('farmerId', '==', filter.farmerId));
    } else if (filter.buyerId) {
      q = query(colRef, where('buyerId', '==', filter.buyerId));
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Review[] = [];
        snapshot.forEach((docSnap) => {
          list.push(parseFirestoreReview(docSnap.id, docSnap.data()));
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore reviews subscription warning:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach Firestore reviews listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function fetchFirebaseReviewsByFarmer(farmerId: string): Promise<Review[]> {
  try {
    const q = query(collection(db, 'reviews'), where('farmerId', '==', farmerId));
    const snap = await getDocs(q);
    const list: Review[] = [];
    snap.forEach((d) => list.push(parseFirestoreReview(d.id, d.data())));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export async function submitFirebaseReview(params: {
  order: Order;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  rating: number;
  comment?: string;
}): Promise<Review> {
  const { order, buyerId, buyerName, buyerAvatar, rating, comment } = params;

  if (!order || order.buyerId !== buyerId) {
    throw new Error('Only the buyer who placed this order can rate it.');
  }

  const canonical = normalizeOrderStatus(order.status, order.deliveryMethod);
  if (canonical !== 'done') {
    throw new Error('Ratings are available only after the order reaches Done status.');
  }

  const cleanRating = Math.min(5, Math.max(1, Math.round(Number(rating))));
  if (!Number.isFinite(cleanRating) || cleanRating < 1 || cleanRating > 5) {
    throw new Error('Please choose a rating between 1 and 5 stars.');
  }

  const deterministicReviewId = `rev_${order.id}`;
  const reviewDocRef = doc(db, 'reviews', deterministicReviewId);

  // Prevent duplicate rating for the same completed order
  const existingById = await getDocFromServer(reviewDocRef)
    .catch(() => getDoc(reviewDocRef))
    .catch(() => null);
  if (existingById && existingById.exists()) {
    throw new Error('You have already rated this completed order.');
  }

  const dupQuery = query(
    collection(db, 'reviews'),
    where('orderId', '==', order.id),
    where('buyerId', '==', buyerId)
  );
  const dupSnap = await getDocs(dupQuery).catch(() => null);
  if (dupSnap && !dupSnap.empty) {
    throw new Error('You have already rated this completed order.');
  }

  const nowIso = new Date().toISOString();
  const cleanComment = (comment || '').trim();
  const ratingLabel = getRatingLabel(cleanRating);
  const firstItem = order.items?.[0];

  const reviewObj: Review = {
    id: deterministicReviewId,
    orderId: order.id,
    orderNumber: order.orderNumber,
    productId: firstItem?.productId || '',
    productName: firstItem?.productName || 'Farm Order',
    farmerId: order.farmerId,
    buyerId,
    buyerName: buyerName || order.buyerName || 'Verified Buyer',
    buyerAvatar:
      buyerAvatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    rating: cleanRating,
    ratingLabel,
    comment: cleanComment,
    createdAt: nowIso
  };

  await setDoc(
    reviewDocRef,
    sanitizeForFirestore({
      ...reviewObj,
      createdAt: serverTimestamp(),
      submittedAtIso: nowIso
    })
  );

  // Mark order as rated in Firestore
  const orderRef = doc(db, 'orders', order.id);
  await setDoc(
    orderRef,
    sanitizeForFirestore({
      isReviewed: true,
      rating: cleanRating,
      reviewComment: cleanComment,
      ratedAt: nowIso,
      updatedAt: serverTimestamp()
    }),
    { merge: true }
  ).catch((err) => console.warn('Could not mark Firestore order as reviewed:', err));

  // Recompute farmer's genuine aggregate rating from Firestore reviews
  try {
    const farmerReviews = await fetchFirebaseReviewsByFarmer(order.farmerId);
    const merged = farmerReviews.some((r) => r.id === reviewObj.id)
      ? farmerReviews
      : [reviewObj, ...farmerReviews];
    const stats = calculateFarmerRatingStats(merged);

    await updateDoc(doc(db, 'users', order.farmerId), {
      'farmerProfile.rating': stats.averageRating,
      'farmerProfile.totalReviews': stats.totalRatings,
      updatedAt: serverTimestamp()
    }).catch(() => {});
  } catch (err) {
    console.warn('Could not recompute farmer aggregate rating in Firestore:', err);
  }

  return reviewObj;
}
