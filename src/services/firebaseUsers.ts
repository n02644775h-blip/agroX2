import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { User, UserRole } from '../types';

export interface FirebaseSignupStats {
  totalSignups: number;
  farmersCount: number;
  buyersCount: number;
  adminsCount: number;
  activeCount: number;
  suspendedCount: number;
  signupsToday: number;
  signupsThisWeek: number;
  signupsByMonth: { month: string; signups: number; farmers: number; buyers: number }[];
  recentSignups: User[];
  isConnected: boolean;
  lastUpdated: string;
}

// Convert Firestore user document to application User model safely
export function parseFirestoreUser(docId: string, data: any): User {
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

  const role: UserRole = (data?.role === 'farmer' || data?.role === 'admin' || data?.role === 'buyer')
    ? data.role
    : (data?.farmerProfile ? 'farmer' : 'buyer');

  const defaultAvatar = role === 'farmer'
    ? 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';

  return {
    id: data?.uid || docId,
    name: data?.fullName || data?.name || data?.displayName || (data?.email ? data.email.split('@')[0] : 'Community Member'),
    email: data?.email || '',
    phone: data?.phone || '',
    role: role,
    avatar: data?.avatar || data?.photoURL || defaultAvatar,
    location: data?.location || {
      country: 'Zimbabwe',
      province: 'Harare',
      city: 'Harare'
    },
    status: (data?.status === 'suspended' || data?.status === 'pending_verification') ? data.status : 'active',
    createdAt: createdAtStr,
    farmerProfile: data?.farmerProfile,
    buyerProfile: data?.buyerProfile
  };
}

// Calculate comprehensive signup metrics from a list of users
export function calculateSignupStats(usersList: User[], isConnected: boolean = true): FirebaseSignupStats {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let farmersCount = 0;
  let buyersCount = 0;
  let adminsCount = 0;
  let activeCount = 0;
  let suspendedCount = 0;
  let signupsToday = 0;
  let signupsThisWeek = 0;

  // Monthly buckets
  const monthMap: { [key: string]: { signups: number; farmers: number; buyers: number } } = {
    Jan: { signups: 0, farmers: 0, buyers: 0 },
    Feb: { signups: 0, farmers: 0, buyers: 0 },
    Mar: { signups: 0, farmers: 0, buyers: 0 },
    Apr: { signups: 0, farmers: 0, buyers: 0 },
    May: { signups: 0, farmers: 0, buyers: 0 },
    Jun: { signups: 0, farmers: 0, buyers: 0 },
    Jul: { signups: 0, farmers: 0, buyers: 0 },
    Aug: { signups: 0, farmers: 0, buyers: 0 },
    Sep: { signups: 0, farmers: 0, buyers: 0 },
    Oct: { signups: 0, farmers: 0, buyers: 0 },
    Nov: { signups: 0, farmers: 0, buyers: 0 },
    Dec: { signups: 0, farmers: 0, buyers: 0 },
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  usersList.forEach(u => {
    if (u.role === 'farmer') farmersCount++;
    else if (u.role === 'admin') adminsCount++;
    else buyersCount++;

    if (u.status === 'active') activeCount++;
    else suspendedCount++;

    const created = new Date(u.createdAt);
    if (!isNaN(created.getTime())) {
      if (created >= oneDayAgo) signupsToday++;
      if (created >= oneWeekAgo) signupsThisWeek++;

      const monthName = monthNames[created.getMonth()];
      if (monthName && monthMap[monthName]) {
        monthMap[monthName].signups++;
        if (u.role === 'farmer') monthMap[monthName].farmers++;
        else monthMap[monthName].buyers++;
      }
    }
  });

  const signupsByMonth = monthNames.map(m => ({
    month: m,
    signups: monthMap[m].signups,
    farmers: monthMap[m].farmers,
    buyers: monthMap[m].buyers
  }));

  // Sort by recent created date descending
  const sortedUsers = [...usersList].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime() || 0;
    const timeB = new Date(b.createdAt).getTime() || 0;
    return timeB - timeA;
  });

  return {
    totalSignups: usersList.length,
    farmersCount,
    buyersCount,
    adminsCount,
    activeCount,
    suspendedCount,
    signupsToday,
    signupsThisWeek,
    signupsByMonth,
    recentSignups: sortedUsers.slice(0, 15),
    isConnected,
    lastUpdated: new Date().toLocaleTimeString()
  };
}

/**
 * Real-time listener for Firestore `users` collection.
 * Triggers callback instantly whenever a new signup occurs or a user profile updates.
 */
export function subscribeToFirebaseUsers(
  onUpdate: (users: User[], stats: FirebaseSignupStats) => void,
  onError?: (err: any) => void
): () => void {
  const usersCollectionRef = collection(db, 'users');

  try {
    const unsubscribe = onSnapshot(
      usersCollectionRef,
      (snapshot) => {
        const usersList: User[] = [];
        snapshot.forEach((docSnap) => {
          try {
            const parsed = parseFirestoreUser(docSnap.id, docSnap.data());
            usersList.push(parsed);
          } catch (e) {
            console.error('Error parsing user document:', docSnap.id, e);
          }
        });

        const stats = calculateSignupStats(usersList, true);
        onUpdate(usersList, stats);
      },
      (error) => {
        console.error('Real-time Firestore user subscription error:', error);
        if (onError) {
          onError(error);
        } else {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error('Failed to attach users snapshot listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Direct fetch of all users from Firestore
 */
export async function fetchAllFirebaseUsers(): Promise<User[]> {
  try {
    const usersCollectionRef = collection(db, 'users');
    const snapshot = await getDocs(usersCollectionRef);
    const usersList: User[] = [];
    snapshot.forEach((docSnap) => {
      usersList.push(parseFirestoreUser(docSnap.id, docSnap.data()));
    });
    return usersList;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'users');
  }
}

/**
 * Toggle user status directly in Firestore for immediate sync
 */
export async function updateFirebaseUserStatus(userId: string, status: 'active' | 'suspended'): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

/**
 * Validate connection to Firestore
 */
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'users', 'connection_test_probe')).catch(() => null);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is currently offline or unreachable.');
      return false;
    }
    return true;
  }
}
