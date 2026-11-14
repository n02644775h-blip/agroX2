import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { sanitizeForFirestore } from '../context/AuthContext';
import { Notification } from '../types';

const toIsoString = (val: any): string => {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val?.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
  return new Date().toISOString();
};

export function subscribeToFirebaseNotifications(
  userId: string,
  onUpdate: (notifications: Notification[]) => void
): () => void {
  if (!userId) return () => {};
  try {
    const colRef = collection(db, 'notifications');
    const q = query(colRef, where('userId', '==', userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: Notification[] = [];
        snapshot.forEach(d => {
          const data = d.data();
          list.push({
            id: data?.id || d.id,
            userId: data?.userId || userId,
            title: data?.title || 'Notification',
            message: data?.message || '',
            type: data?.type || 'system',
            link: data?.link,
            read: Boolean(data?.read),
            createdAt: toIsoString(data?.createdAt),
            metadata: data?.metadata
          });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore notifications listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach notifications listener:', err);
    return () => {};
  }
}

export async function createFirebaseNotification(
  notif: Omit<Notification, 'id' | 'read' | 'createdAt'> & { id?: string; read?: boolean; createdAt?: string }
): Promise<void> {
  if (!notif.userId) return;
  try {
    const id = notif.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const docRef = doc(db, 'notifications', id);
    await setDoc(docRef, sanitizeForFirestore({
      ...notif,
      id,
      read: Boolean(notif.read),
      createdAt: notif.createdAt || new Date().toISOString(),
      serverCreatedAt: serverTimestamp()
    }));
  } catch (err) {
    console.warn('Could not write notification to Firestore:', err);
  }
}

export async function markFirebaseNotificationRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch {
    // ignore if notification only existed in backend memory
  }
}

export async function markAllFirebaseNotificationsRead(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false));
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch {
    // ignore
  }
}
