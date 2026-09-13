import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { sanitizeForFirestore } from '../context/AuthContext';
import { AdRequest, AdRequestStatus } from '../types';

export function parseFirestoreAdRequest(docId: string, data: any): AdRequest {
  let createdAtStr = new Date().toISOString();
  if (data?.createdAt) {
    if (typeof data.createdAt === 'string') {
      createdAtStr = data.createdAt;
    } else if (typeof data.createdAt?.toDate === 'function') {
      createdAtStr = data.createdAt.toDate().toISOString();
    } else if (data.createdAt instanceof Date) {
      createdAtStr = data.createdAt.toISOString();
    } else if (typeof data.createdAt?.seconds === 'number') {
      createdAtStr = new Date(data.createdAt.seconds * 1000).toISOString();
    }
  }

  let updatedAtStr = createdAtStr;
  if (data?.updatedAt) {
    if (typeof data.updatedAt === 'string') {
      updatedAtStr = data.updatedAt;
    } else if (typeof data.updatedAt?.toDate === 'function') {
      updatedAtStr = data.updatedAt.toDate().toISOString();
    } else if (data.updatedAt instanceof Date) {
      updatedAtStr = data.updatedAt.toISOString();
    } else if (typeof data.updatedAt?.seconds === 'number') {
      updatedAtStr = new Date(data.updatedAt.seconds * 1000).toISOString();
    }
  }

  const days = Number(data?.days) || Number(data?.durationDays) || 7;
  const dailyRate = Number(data?.dailyRate) || 1.00;
  const totalAmount = Number(data?.totalAmount) || Number(data?.totalFee) || (days * dailyRate);

  return {
    id: data?.id || docId,
    farmerId: data?.farmerId || '',
    farmerName: data?.farmerName || 'Farmer',
    farmerAvatar: data?.farmerAvatar || '',
    farmName: data?.farmName || `${data?.farmerName || 'Local'}'s Farm`,
    farmerEmail: data?.farmerEmail || '',
    farmerPhone: data?.farmerPhone || '',
    productId: data?.productId || '',
    productName: data?.productName || 'Harvest Produce',
    productImage: data?.productImage || '',
    productPrice: Number(data?.productPrice) || undefined,
    productUnit: data?.productUnit || 'kg',
    category: data?.category || '',
    categoryName: data?.categoryName || '',
    dealHeadline: data?.dealHeadline || 'Special Fresh Harvest Offer',
    dealDescription: data?.dealDescription || '',
    discountPercentage: data?.discountPercentage ? Number(data.discountPercentage) : undefined,
    specialPrice: data?.specialPrice ? Number(data.specialPrice) : undefined,
    days: days,
    durationDays: days,
    dailyRate: dailyRate,
    totalFee: totalAmount,
    totalAmount: totalAmount,
    proofOfPaymentUrl: data?.proofOfPaymentUrl || '',
    proofOfPaymentFileName: data?.proofOfPaymentFileName || 'Payment_Proof.jpg',
    paymentMethod: data?.paymentMethod || 'ecocash',
    paymentReference: data?.paymentReference || '',
    status: (data?.status as AdRequestStatus) || 'sent',
    adminNotes: data?.adminNotes || '',
    adminFeedback: data?.adminFeedback || '',
    reviewedBy: data?.reviewedBy || '',
    reviewedAt: data?.reviewedAt || '',
    startDate: data?.startDate || '',
    endDate: data?.endDate || '',
    createdAt: createdAtStr,
    updatedAt: updatedAtStr
  };
}

/**
 * Real-time listener for Ad Requests in Firestore
 */
export function subscribeToFirebaseAdRequests(
  filter?: { farmerId?: string; status?: string },
  onUpdate?: (ads: AdRequest[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const colRef = collection(db, 'adRequests');
    let q = query(colRef);

    if (filter?.farmerId) {
      q = query(colRef, where('farmerId', '==', filter.farmerId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const adsList: AdRequest[] = [];
        snapshot.forEach(docSnap => {
          adsList.push(parseFirestoreAdRequest(docSnap.id, docSnap.data()));
        });

        // Sort descending by creation date
        adsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // In-memory status filter if provided
        const filtered = (filter?.status && filter.status !== 'all')
          ? adsList.filter(a => a.status === filter.status)
          : adsList;

        if (onUpdate) onUpdate(filtered);
      },
      (error) => {
        console.error('Firebase ad requests subscription error:', error);
        if (onError) onError(error);
        else handleFirestoreError(error, OperationType.LIST, 'adRequests');
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error('Failed to attach ad requests listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Create a new Ad Request directly in Firestore
 */
export async function createFirebaseAdRequest(data: Partial<AdRequest>): Promise<AdRequest> {
  const adId = data.id || `ad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const docRef = doc(db, 'adRequests', adId);

  const days = Number(data.days) || Number(data.durationDays) || 7;
  const dailyRate = 1.00;
  const totalAmount = days * dailyRate;

  const payload: Record<string, any> = {
    id: adId,
    farmerId: data.farmerId || '',
    farmerName: data.farmerName || 'Farmer',
    farmerAvatar: data.farmerAvatar || '',
    farmName: data.farmName || '',
    farmerEmail: data.farmerEmail || '',
    farmerPhone: data.farmerPhone || '',
    productId: data.productId || '',
    productName: data.productName || '',
    productImage: data.productImage || '',
    productPrice: data.productPrice !== undefined ? Number(data.productPrice) : null,
    productUnit: data.productUnit || 'kg',
    category: data.category || '',
    categoryName: data.categoryName || '',
    dealHeadline: data.dealHeadline || '',
    dealDescription: data.dealDescription || '',
    discountPercentage: data.discountPercentage ? Number(data.discountPercentage) : null,
    specialPrice: data.specialPrice ? Number(data.specialPrice) : null,
    days: days,
    durationDays: days,
    dailyRate: dailyRate,
    totalFee: totalAmount,
    totalAmount: totalAmount,
    proofOfPaymentUrl: data.proofOfPaymentUrl || '',
    proofOfPaymentFileName: data.proofOfPaymentFileName || 'Payment_Proof.jpg',
    paymentMethod: data.paymentMethod || 'ecocash',
    paymentReference: data.paymentReference || '',
    status: data.status || 'sent',
    adminNotes: '',
    adminFeedback: '',
    reviewedBy: '',
    reviewedAt: '',
    startDate: '',
    endDate: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(docRef, sanitizeForFirestore(payload));

  return parseFirestoreAdRequest(adId, {
    ...payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

/**
 * Update status of an Ad Request in Firestore (approved, rejected, etc.)
 */
export async function updateFirebaseAdRequestStatus(
  id: string,
  status: AdRequestStatus,
  adminFeedback?: string,
  reviewedBy?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'adRequests', id);
    const updates: Record<string, any> = {
      status,
      updatedAt: serverTimestamp()
    };
    if (adminFeedback !== undefined) updates.adminFeedback = adminFeedback;
    if (reviewedBy !== undefined) updates.reviewedBy = reviewedBy;
    if (status === 'approved') {
      const now = new Date();
      updates.startDate = now.toISOString();
      updates.endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      updates.reviewedAt = now.toISOString();
    }
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `adRequests/${id}`);
  }
}

/**
 * Delete an Ad Request from Firestore
 */
export async function deleteFirebaseAdRequest(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'adRequests', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `adRequests/${id}`);
  }
}
