import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { sanitizeForFirestore } from '../context/AuthContext';
import { BuyerRequest, BuyerRequestStatus } from '../types';

const toIsoString = (val: any, fallback: string): string => {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val?.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
  return fallback;
};

export function parseFirestoreBuyerRequest(docId: string, data: any): BuyerRequest {
  const fallbackNow = new Date().toISOString();
  const createdAt = toIsoString(data?.createdAt, fallbackNow);
  const updatedAt = toIsoString(data?.updatedAt, createdAt);

  return {
    id: data?.id || docId,
    buyerId: data?.buyerId || '',
    buyerName: data?.buyerName || 'Marketplace Buyer',
    buyerAvatar: data?.buyerAvatar || '',
    buyerPhone: data?.buyerPhone || '',
    productName: data?.productName || '',
    category: data?.category || 'cat-other',
    categoryName: data?.categoryName || 'Other Produce',
    description: data?.description || '',
    quantityRequired: data?.quantityRequired || '',
    preferredPrice: typeof data?.preferredPrice === 'number' ? data.preferredPrice : undefined,
    budgetCurrency: data?.budgetCurrency || 'USD',
    budgetNotes: data?.budgetNotes || undefined,
    location: data?.location || '',
    requiredDate: data?.requiredDate || undefined,
    notes: data?.notes || undefined,
    referenceImages: Array.isArray(data?.referenceImages) ? data.referenceImages : [],
    status: (data?.status as BuyerRequestStatus) || 'open',
    respondedFarmerIds: Array.isArray(data?.respondedFarmerIds) ? data.respondedFarmerIds : [],
    responseCount: typeof data?.responseCount === 'number'
      ? data.responseCount
      : Array.isArray(data?.respondedFarmerIds)
        ? data.respondedFarmerIds.length
        : 0,
    handledAt: data?.handledAt ? toIsoString(data.handledAt, updatedAt) : undefined,
    createdAt,
    updatedAt
  };
}

export function subscribeToFirebaseBuyerRequests(
  filter: { buyerId?: string } | undefined,
  onUpdate: (requests: BuyerRequest[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const colRef = collection(db, 'buyerRequests');
    const q = filter?.buyerId
      ? query(colRef, where('buyerId', '==', filter.buyerId))
      : query(colRef);

    return onSnapshot(
      q,
      (snapshot) => {
        const list: BuyerRequest[] = [];
        snapshot.forEach(d => {
          list.push(parseFirestoreBuyerRequest(d.id, d.data()));
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore buyerRequests subscription warning:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach buyerRequests listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveFirebaseBuyerRequest(req: BuyerRequest): Promise<void> {
  try {
    await setDoc(
      doc(db, 'buyerRequests', req.id),
      sanitizeForFirestore({
        ...req,
        updatedAt: serverTimestamp()
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not save buyerRequest to Firestore:', err);
  }
}

export async function updateFirebaseBuyerRequestStatus(
  id: string,
  status: BuyerRequestStatus,
  existingReq?: BuyerRequest
): Promise<void> {
  try {
    const now = new Date().toISOString();
    await setDoc(
      doc(db, 'buyerRequests', id),
      sanitizeForFirestore({
        ...(existingReq || {}),
        id,
        status,
        handledAt: status === 'handled' ? now : existingReq?.handledAt || null,
        updatedAt: serverTimestamp()
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not update buyerRequest status in Firestore:', err);
  }
}

export async function markFirebaseRequestResponded(
  id: string,
  farmerId: string,
  existingReq?: BuyerRequest
): Promise<void> {
  if (!farmerId) return;
  try {
    const existingResponders = Array.isArray(existingReq?.respondedFarmerIds)
      ? existingReq.respondedFarmerIds
      : [];
    const nextResponders = existingResponders.includes(farmerId)
      ? existingResponders
      : [...existingResponders, farmerId];

    const nextStatus: BuyerRequestStatus =
      existingReq?.status === 'handled' || existingReq?.status === 'cancelled'
        ? existingReq.status
        : 'in_discussion';

    await setDoc(
      doc(db, 'buyerRequests', id),
      sanitizeForFirestore({
        ...(existingReq || {}),
        id,
        status: nextStatus,
        respondedFarmerIds: nextResponders,
        responseCount: nextResponders.length,
        updatedAt: serverTimestamp()
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not record farmer response in Firestore:', err);
  }
}

export async function deleteFirebaseBuyerRequest(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'buyerRequests', id));
  } catch (err) {
    console.warn('Could not delete buyerRequest from Firestore:', err);
  }
}
