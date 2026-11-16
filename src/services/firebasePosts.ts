import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { sanitizeForFirestore } from '../context/AuthContext';
import { MediaPost, MediaPostItem } from '../types';

const toIsoString = (val: any, fallback: string): string => {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val?.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
  return fallback;
};

export function parseFirestoreMediaPost(docId: string, data: any): MediaPost {
  const fallbackNow = new Date().toISOString();
  const createdAt = toIsoString(data?.createdAt, fallbackNow);
  const updatedAt = toIsoString(data?.updatedAt, createdAt);
  const media: MediaPostItem[] = Array.isArray(data?.media)
    ? data.media.filter((m: any) => m && typeof m.url === 'string' && m.url.trim())
    : [];

  return {
    id: data?.id || docId,
    farmerId: data?.farmerId || '',
    farmerName: data?.farmerName || 'Farmer',
    farmerAvatar: data?.farmerAvatar || '',
    farmName: data?.farmName || 'Local Farm',
    sellerRole: data?.sellerRole || 'farmer',
    media,
    caption: data?.caption || '',
    description: data?.description || '',
    productName: data?.productName || undefined,
    price: typeof data?.price === 'number' ? data.price : undefined,
    unit: data?.unit || undefined,
    hashtags: Array.isArray(data?.hashtags) ? data.hashtags : [],
    taggedProductId: data?.taggedProductId || undefined,
    taggedProductName: data?.taggedProductName || undefined,
    shareLocation: data?.shareLocation !== undefined ? Boolean(data.shareLocation) : Boolean(data?.location),
    location: data?.location || undefined,
    likesCount: typeof data?.likesCount === 'number' ? data.likesCount : Array.isArray(data?.likedBy) ? data.likedBy.length : 0,
    likedBy: Array.isArray(data?.likedBy) ? data.likedBy : [],
    quoteRequestsCount: typeof data?.quoteRequestsCount === 'number' ? data.quoteRequestsCount : 0,
    createdAt,
    updatedAt
  };
}

export function subscribeToFirebasePosts(
  farmerId: string | undefined,
  onUpdate: (posts: MediaPost[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const colRef = collection(db, 'mediaPosts');
    const q = farmerId ? query(colRef, where('farmerId', '==', farmerId)) : query(colRef);

    return onSnapshot(
      q,
      (snapshot) => {
        const list: MediaPost[] = [];
        snapshot.forEach(d => {
          list.push(parseFirestoreMediaPost(d.id, d.data()));
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore mediaPosts subscription warning:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach mediaPosts listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveFirebasePost(post: MediaPost): Promise<void> {
  if (!post?.id || !post?.farmerId) {
    throw new Error('Cannot save post without a valid post ID and farmer ID.');
  }
  const hasMedia = Array.isArray(post.media) && post.media.length > 0;
  const hasCaption = Boolean(post.caption && String(post.caption).trim());
  if (!hasMedia && !hasCaption) {
    throw new Error('Please write an update caption or attach a photo/video.');
  }
  try {
    const docRef = doc(db, 'mediaPosts', post.id);
    await setDoc(
      docRef,
      sanitizeForFirestore({
        ...post,
        media: Array.isArray(post.media) ? post.media : [],
        updatedAt: serverTimestamp()
      }),
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `mediaPosts/${post.id}`);
  }
}

export async function deleteFirebasePost(postId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'mediaPosts', postId));
  } catch (err) {
    console.warn('Could not delete post from Firestore:', err);
  }
}

export async function toggleFirebasePostLike(
  postId: string,
  userId: string,
  currentLikedBy: string[]
): Promise<void> {
  if (!userId) return;
  try {
    const exists = currentLikedBy.includes(userId);
    const nextLikedBy = exists
      ? currentLikedBy.filter(id => id !== userId)
      : [...currentLikedBy, userId];

    await setDoc(
      doc(db, 'mediaPosts', postId),
      sanitizeForFirestore({
        likedBy: nextLikedBy,
        likesCount: nextLikedBy.length,
        updatedAt: serverTimestamp()
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not toggle post like in Firestore:', err);
  }
}

export async function incrementFirebasePostQuote(postId: string): Promise<void> {
  try {
    await setDoc(
      doc(db, 'mediaPosts', postId),
      {
        quoteRequestsCount: increment(1),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not increment post quote count in Firestore:', err);
  }
}
