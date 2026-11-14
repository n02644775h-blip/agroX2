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

export const BANNED_UNAUTHORIZED_AUTHORS = [
  'Tatenda Mutasa',
  'Kudzai Moyo',
  'Farai Chidzero'
];

const LEGACY_SEEDED_ANNOUNCEMENT_IDS = new Set([
  'ann-1',
  'ann-2',
  'ann-3',
  'ann-4',
  'ann-5'
]);

const LEGACY_SEEDED_TITLE_SNIPPETS = [
  'subsidized cold-chain collection routes',
  'cold-chain subsidized routes',
  'smallholder solar irrigation equipment grant',
  'regional weather bulletin',
  'regional weather & rainfall advisory',
  'weekly wholesale price benchmark',
  'platform upgrade: instant native camera',
  'welcome to agrox marketplace: direct spring harvest season'
];

export function isAutoSeededOrUnauthorizedAnnouncement(ann: Partial<Announcement> & { id?: string }): boolean {
  const id = (ann.id || '').trim();
  const title = (ann.title || '').toLowerCase();
  const author = (ann.author || '').trim();

  if (BANNED_UNAUTHORIZED_AUTHORS.includes(author)) return true;
  if (ann.authorRole && ann.authorRole !== 'admin') return true;
  if (LEGACY_SEEDED_ANNOUNCEMENT_IDS.has(id)) return true;
  if (LEGACY_SEEDED_TITLE_SNIPPETS.some(snippet => title.includes(snippet))) return true;
  return false;
}

export const INITIAL_ANNOUNCEMENTS: Partial<Announcement>[] = [];

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
    title: data?.title || 'Platform Announcement',
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
          // Never auto-seed AI or default announcements; only admin-created posts should appear
          callback([]);
          return;
        }

        const list: Announcement[] = [];
        snapshot.forEach((docSnap) => {
          const ann = parseFirestoreAnnouncement(docSnap.id, docSnap.data());
          // Auto-purge any legacy AI/seeded announcements or unauthorized authors from Firestore
          if (isAutoSeededOrUnauthorizedAnnouncement(ann)) {
            deleteDoc(doc(db, 'announcements', docSnap.id)).catch(() => {});
            return;
          }
          list.push(ann);
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
          if (role === 'fodder_supplier' && a.targetAudience === 'farmers') return true;
          if (role && a.targetAudience === role) return true;
          if (role === 'admin') return true;
          return false;
        });

        callback(filtered);
      },
      (error) => {
        console.warn('Firestore announcements listener notice:', error?.message || error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.warn('Firestore announcements subscription exception:', error);
    callback([]);
    return () => {};
  }
}

export async function createFirebaseAnnouncement(data: Partial<Announcement>): Promise<Announcement> {
  if (data.authorRole && data.authorRole !== 'admin') {
    throw new Error('Only platform administrators can publish announcements.');
  }

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
    authorRole: 'admin',
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
