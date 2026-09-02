import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { sanitizeForFirestore } from '../context/AuthContext';
import { Announcement } from '../types';

export const INITIAL_ANNOUNCEMENTS: Partial<Announcement>[] = [
  {
    id: 'ann-1',
    title: '🚛 Subsidized Cold-Chain Collection Routes: Mashonaland & Midlands',
    content: 'The Ministry of Agriculture partnership cold-chain trucks will begin bi-weekly pickups every Tuesday and Friday across Marondera, Chinhoyi, and Gweru central aggregation depots. Farmers can schedule collection directly via their dashboard to minimize post-harvest transit losses.',
    priority: 'urgent',
    targetAudience: 'all',
    author: 'Tatenda Mutasa',
    authorRole: 'admin',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    category: 'logistics',
    pinned: true,
    reactions: { '👍': 42, '🚛': 38, '🌱': 19 },
    likesCount: 99
  },
  {
    id: 'ann-2',
    title: '💰 Smallholder Solar Irrigation Equipment Grant - Application Round 2',
    content: 'Applications are now officially open for the 2026 Smallholder Solar Irrigation and Drip Kit subsidy. Verified farmers on agroX with at least 3 completed marketplace orders qualify for 40% co-funding. Submit farm details through the Subsidies portal.',
    priority: 'normal',
    targetAudience: 'farmers',
    author: 'Kudzai Moyo',
    authorRole: 'admin',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    category: 'subsidy',
    pinned: false,
    reactions: { '❤️': 61, '🌱': 45, '👍': 34 },
    likesCount: 140
  },
  {
    id: 'ann-3',
    title: '🌧️ Regional Weather Bulletin: Early Seasonal Rainfall Patterns',
    content: 'Meteorological services forecast favorable early convective rains across Manicaland and Masvingo starting this weekend. Horticultural producers are advised to inspect greenhouse drainage and protect seedbed nurseries against runoff.',
    priority: 'normal',
    targetAudience: 'all',
    author: 'Farai Chidzero',
    authorRole: 'admin',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    category: 'weather',
    pinned: false,
    reactions: { '🌧️': 28, '🌱': 17 },
    likesCount: 45
  },
  {
    id: 'ann-4',
    title: '📊 Weekly Wholesale Price Benchmark & Demand Surge: Red Onions & Roadrunners',
    content: 'Wholesale demand for cured Red Creole onions has risen by +18% week-over-week in Mbare and Bulawayo fresh markets. Premium Kuroiler and indigenous roadrunner breeding stock are seeing record inquiries from commercial buyers.',
    priority: 'normal',
    targetAudience: 'all',
    author: 'agroX Market Intelligence',
    authorRole: 'admin',
    authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400',
    category: 'market_update',
    pinned: false,
    reactions: { '📊': 53, '👍': 41 },
    likesCount: 94
  },
  {
    id: 'ann-5',
    title: '🌿 Platform Upgrade: Instant Native Camera & Live P2P Produce Inquiries',
    content: 'Farmers can now snap and compress high-resolution harvest photos directly from their smartphone cameras and receive live direct inquiries from verified restaurant and bulk buyers with instant notification bells.',
    priority: 'normal',
    targetAudience: 'all',
    author: 'agroX Tech Team',
    authorRole: 'admin',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    category: 'platform',
    pinned: false,
    reactions: { '🌱': 39, '❤️': 27, '👍': 31 },
    likesCount: 97
  }
];

export function parseFirestoreAnnouncement(docId: string, data: any): Announcement {
  let createdAt = data?.createdAt;
  if (createdAt && typeof createdAt?.toDate === 'function') {
    createdAt = createdAt.toDate().toISOString();
  } else if (createdAt && typeof createdAt?.seconds === 'number') {
    createdAt = new Date(createdAt.seconds * 1000).toISOString();
  } else if (!createdAt || typeof createdAt !== 'string') {
    createdAt = new Date().toISOString();
  }

  return {
    id: docId,
    title: data?.title || 'Community Update',
    content: data?.content || data?.message || '',
    priority: data?.priority === 'urgent' ? 'urgent' : 'normal',
    targetAudience: data?.targetAudience || 'all',
    author: data?.author || 'agroX Admin Team',
    authorRole: data?.authorRole || 'admin',
    authorAvatar: data?.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    category: data?.category || 'general',
    pinned: Boolean(data?.pinned),
    reactions: data?.reactions || { '👍': 0 },
    likesCount: typeof data?.likesCount === 'number' ? data.likesCount : 0,
    createdAt,
    active: data?.active !== false
  };
}

export function subscribeToFirebaseAnnouncements(
  role: string | undefined,
  callback: (announcements: Announcement[]) => void
): () => void {
  try {
    const annRef = collection(db, 'announcements');
    const q = query(annRef);

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          // If Firestore is empty, seed with initial platform announcements
          const seededList: Announcement[] = [];
          for (const initAnn of INITIAL_ANNOUNCEMENTS) {
            const annDocRef = doc(db, 'announcements', initAnn.id!);
            const docData = {
              ...initAnn,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            setDoc(annDocRef, sanitizeForFirestore(docData), { merge: true }).catch(() => {});
            seededList.push(parseFirestoreAnnouncement(initAnn.id!, {
              ...initAnn,
              createdAt: new Date().toISOString()
            }));
          }
          callback(seededList);
          return;
        }

        const list: Announcement[] = [];
        snapshot.forEach((docSnap) => {
          list.push(parseFirestoreAnnouncement(docSnap.id, docSnap.data()));
        });

        // Sort pinned first, then newest first
        list.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Filter audience if needed
        const filtered = list.filter(a => {
          if (a.targetAudience === 'all') return true;
          if (role && a.targetAudience === `${role}s`) return true;
          if (role && a.targetAudience === role) return true;
          if (role === 'admin') return true;
          return true;
        });

        callback(filtered);
      },
      (error) => {
        console.warn('Firestore announcements listener notice:', error?.message || error);
        callback(INITIAL_ANNOUNCEMENTS.map(a => parseFirestoreAnnouncement(a.id!, a)));
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('Firestore announcements subscription exception:', error);
    callback(INITIAL_ANNOUNCEMENTS.map(a => parseFirestoreAnnouncement(a.id!, a)));
    return () => {};
  }
}

export async function createFirebaseAnnouncement(data: Partial<Announcement>): Promise<Announcement> {
  const annId = data.id || `ann-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
  const annRef = doc(db, 'announcements', annId);

  const payload: any = {
    ...data,
    id: annId,
    title: data.title?.trim(),
    content: data.content?.trim(),
    category: data.category || 'general',
    priority: data.priority || 'normal',
    targetAudience: data.targetAudience || 'all',
    author: data.author || 'agroX Admin Team',
    authorRole: data.authorRole || 'admin',
    authorAvatar: data.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    pinned: Boolean(data.pinned),
    reactions: data.reactions || { '👍': 0 },
    likesCount: data.likesCount || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const sanitized = sanitizeForFirestore(payload);

  try {
    await setDoc(annRef, sanitized, { merge: true });
    return parseFirestoreAnnouncement(annId, { ...payload, createdAt: new Date().toISOString() });
  } catch (error) {
    console.warn('Firestore announcement write warning:', error);
    return parseFirestoreAnnouncement(annId, { ...payload, createdAt: new Date().toISOString() });
  }
}

export async function reactToFirebaseAnnouncement(annId: string, emoji: string): Promise<void> {
  try {
    const annRef = doc(db, 'announcements', annId);
    const snap = await getDocs(query(collection(db, 'announcements')));
    const target = snap.docs.find(d => d.id === annId);
    if (target) {
      const data = target.data();
      const currentReactions = { ...(data.reactions || {}) };
      currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
      const likes = (data.likesCount || 0) + 1;
      await updateDoc(annRef, {
        reactions: currentReactions,
        likesCount: likes,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.warn('Firestore announcement react warning:', error);
  }
}

export async function deleteFirebaseAnnouncement(annId: string): Promise<boolean> {
  try {
    const annRef = doc(db, 'announcements', annId);
    await deleteDoc(annRef);
    return true;
  } catch (error) {
    console.warn('Firestore announcement delete warning:', error);
    return true;
  }
}
