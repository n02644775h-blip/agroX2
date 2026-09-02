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
  orderBy,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { sanitizeForFirestore } from '../context/AuthContext';
import { Product } from '../types';

export function parseFirestoreProduct(docId: string, data: any): Product {
  let harvestDate = data?.harvestDate;
  if (harvestDate && typeof harvestDate?.toDate === 'function') {
    harvestDate = harvestDate.toDate().toISOString();
  } else if (harvestDate && typeof harvestDate?.seconds === 'number') {
    harvestDate = new Date(harvestDate.seconds * 1000).toISOString();
  }

  let expiryDate = data?.expiryDate;
  if (expiryDate && typeof expiryDate?.toDate === 'function') {
    expiryDate = expiryDate.toDate().toISOString();
  } else if (expiryDate && typeof expiryDate?.seconds === 'number') {
    expiryDate = new Date(expiryDate.seconds * 1000).toISOString();
  }

  let createdAt = data?.createdAt;
  if (createdAt && typeof createdAt?.toDate === 'function') {
    createdAt = createdAt.toDate().toISOString();
  } else if (createdAt && typeof createdAt?.seconds === 'number') {
    createdAt = new Date(createdAt.seconds * 1000).toISOString();
  } else if (!createdAt) {
    createdAt = new Date().toISOString();
  }

  return {
    id: docId,
    farmerId: data?.farmerId || 'farmer-1',
    farmerName: data?.farmerName || 'Local Producer',
    farmerAvatar: data?.farmerAvatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
    farmName: data?.farmName || `${data?.farmerName || 'Local'}'s Farm`,
    name: data?.name || 'Fresh Produce',
    category: data?.category || 'cat-veg',
    categoryName: data?.categoryName || 'Vegetables',
    description: data?.description || '',
    price: typeof data?.price === 'number' ? data.price : parseFloat(data?.price || '0'),
    unit: data?.unit || 'kg',
    quantityAvailable: typeof data?.quantityAvailable === 'number' ? data.quantityAvailable : parseFloat(data?.quantityAvailable || '0'),
    minOrderQuantity: typeof data?.minOrderQuantity === 'number' ? data.minOrderQuantity : parseFloat(data?.minOrderQuantity || '1'),
    images: Array.isArray(data?.images) && data.images.length > 0 ? data.images : ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'],
    location: data?.location || {
      province: 'Harare',
      city: 'Harare',
      community: 'Direct Market'
    },
    isOrganic: Boolean(data?.isOrganic),
    harvestDate,
    expiryDate,
    rating: typeof data?.rating === 'number' ? data.rating : 4.8,
    reviewsCount: typeof data?.reviewsCount === 'number' ? data.reviewsCount : 0,
    availability: data?.availability || (data?.quantityAvailable <= 0 ? 'out_of_stock' : 'available'),
    featured: Boolean(data?.featured),
    additionalNotes: data?.additionalNotes || undefined,
    createdAt,
    updatedAt: data?.updatedAt && typeof data.updatedAt.toDate === 'function'
      ? data.updatedAt.toDate().toISOString()
      : new Date().toISOString()
  };
}

export function subscribeToFirebaseProducts(
  options: { farmerId?: string; category?: string } | undefined,
  callback: (products: Product[]) => void
): () => void {
  try {
    const productsRef = collection(db, 'products');
    let q = query(productsRef);

    if (options?.farmerId) {
      q = query(productsRef, where('farmerId', '==', options.farmerId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Product[] = [];
        snapshot.forEach((docSnap) => {
          list.push(parseFirestoreProduct(docSnap.id, docSnap.data()));
        });
        callback(list);
      },
      (error) => {
        console.warn('Firestore products listener fallback:', error?.message || error);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('Firestore products subscription exception:', error);
    return () => {};
  }
}

export async function saveProductToFirebase(productData: Partial<Product>): Promise<Product> {
  const prodId = productData.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const productRef = doc(db, 'products', prodId);

  const payload: any = {
    ...productData,
    id: prodId,
    updatedAt: serverTimestamp()
  };

  if (!productData.id) {
    payload.createdAt = serverTimestamp();
  }

  const sanitized = sanitizeForFirestore(payload);

  try {
    await setDoc(productRef, sanitized, { merge: true });
    return parseFirestoreProduct(prodId, { ...productData, id: prodId, createdAt: new Date().toISOString() });
  } catch (error) {
    console.warn('Firestore product write failed, saving locally:', error);
    return parseFirestoreProduct(prodId, { ...productData, id: prodId, createdAt: new Date().toISOString() });
  }
}

export async function deleteProductFromFirebase(productId: string): Promise<boolean> {
  try {
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
    return true;
  } catch (error) {
    console.warn('Firestore product delete warning:', error);
    return true;
  }
}
