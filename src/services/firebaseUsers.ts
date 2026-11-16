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
  serverTimestamp,
  getDocFromServer,
  getDocsFromServer
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { deleteFirebaseStorageFile } from './firebaseStorage';
import { normalizeOrderStatus } from '../utils/orderUtils';
import { createFirebaseAdminAuditLog } from './firebaseSupportRequests';
import { createFirebaseNotification } from './firebaseNotifications';
import { AdminAuditLog, User, UserRole } from '../types';

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

  const role: UserRole = (
    data?.role === 'farmer' ||
    data?.role === 'fodder_supplier' ||
    data?.role === 'admin' ||
    data?.role === 'buyer'
  )
    ? data.role
    : (data?.farmerProfile ? 'farmer' : 'buyer');

  const isSeller = role === 'farmer' || role === 'fodder_supplier';
  const defaultAvatar = isSeller
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
    emailVerified: Boolean(data?.emailVerified),
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
    if (u.role === 'farmer' || u.role === 'fodder_supplier') farmersCount++;
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
        if (u.role === 'farmer' || u.role === 'fodder_supplier') monthMap[monthName].farmers++;
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
 * Check directly against Firestore whether a user is suspended by UID or email.
 */
export async function checkFirestoreUserSuspended(uid?: string | null, email?: string | null): Promise<boolean> {
  try {
    if (uid) {
      const userDocRef = doc(db, 'users', uid);
      const snap = await getDocFromServer(userDocRef).catch(() => getDoc(userDocRef).catch(() => null));
      if (snap && snap.exists() && snap.data()?.status === 'suspended') {
        return true;
      }

      // Also check any doc whose `uid` field matches
      const byUidQuery = query(collection(db, 'users'), where('uid', '==', uid));
      const byUidSnap = await getDocsFromServer(byUidQuery).catch(() => getDocs(byUidQuery).catch(() => null));
      if (byUidSnap && !byUidSnap.empty) {
        for (const d of byUidSnap.docs) {
          if (d.data()?.status === 'suspended') return true;
        }
      }
    }

    if (email && email.trim()) {
      const cleanEmail = email.trim();
      const emailCandidates = Array.from(new Set([cleanEmail, cleanEmail.toLowerCase()]));
      for (const candidate of emailCandidates) {
        const emailQuery = query(collection(db, 'users'), where('email', '==', candidate));
        const emailSnap = await getDocsFromServer(emailQuery).catch(() => getDocs(emailQuery).catch(() => null));
        if (emailSnap && !emailSnap.empty) {
          for (const d of emailSnap.docs) {
            if (d.data()?.status === 'suspended') return true;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not verify suspension status in Firestore:', err);
  }
  return false;
}

/**
 * Toggle user status directly in Firestore for immediate sync across all matching docs
 */
export async function updateFirebaseUserStatus(userId: string, status: 'active' | 'suspended', email?: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        uid: userId,
        id: userId,
        ...(email ? { email: email.trim() } : {}),
        status,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    // Also update any Firestore docs with matching uid field (in case docId !== uid)
    const uidQuery = query(collection(db, 'users'), where('uid', '==', userId));
    const uidSnap = await getDocs(uidQuery).catch(() => null);
    if (uidSnap && !uidSnap.empty) {
      for (const d of uidSnap.docs) {
        if (d.id !== userId) {
          await setDoc(d.ref, { status, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
        }
      }
    }

    // Also update any Firestore docs with matching email (prevents demo/legacy vs Firebase Auth UID split)
    if (email && email.trim()) {
      const cleanEmail = email.trim();
      const emailCandidates = Array.from(new Set([cleanEmail, cleanEmail.toLowerCase()]));
      for (const candidate of emailCandidates) {
        const emailQuery = query(collection(db, 'users'), where('email', '==', candidate));
        const emailSnap = await getDocs(emailQuery).catch(() => null);
        if (emailSnap && !emailSnap.empty) {
          for (const d of emailSnap.docs) {
            if (d.id !== userId) {
              await setDoc(d.ref, { status, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to update status for user ${userId} in Firestore:`, error);
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

/**
 * Check directly against Firestore whether a user account has been permanently deleted
 * (checks `deletedAccounts` tombstones as well as `status === 'deleted'` in `users`).
 */
export async function checkFirestoreUserDeleted(uid?: string | null, email?: string | null): Promise<boolean> {
  try {
    if (uid) {
      const tombRef = doc(db, 'deletedAccounts', uid);
      const tombSnap = await getDocFromServer(tombRef).catch(() => getDoc(tombRef).catch(() => null));
      if (tombSnap && tombSnap.exists()) {
        return true;
      }

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDocFromServer(userRef).catch(() => getDoc(userRef).catch(() => null));
      if (userSnap && userSnap.exists() && userSnap.data()?.status === 'deleted') {
        return true;
      }
    }

    if (email && email.trim()) {
      const cleanEmail = email.trim();
      const lowerEmail = cleanEmail.toLowerCase();

      const tombEmailQuery = query(collection(db, 'deletedAccounts'), where('emailLower', '==', lowerEmail));
      const tombEmailSnap = await getDocsFromServer(tombEmailQuery).catch(() => getDocs(tombEmailQuery).catch(() => null));
      if (tombEmailSnap && !tombEmailSnap.empty) {
        return true;
      }

      const emailCandidates = Array.from(new Set([cleanEmail, lowerEmail]));
      for (const candidate of emailCandidates) {
        const emailQuery = query(collection(db, 'users'), where('email', '==', candidate));
        const emailSnap = await getDocsFromServer(emailQuery).catch(() => getDocs(emailQuery).catch(() => null));
        if (emailSnap && !emailSnap.empty) {
          for (const d of emailSnap.docs) {
            if (d.data()?.status === 'deleted') return true;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not verify deletion status in Firestore:', err);
  }
  return false;
}

/**
 * Permanently delete a user account and all associated content in Cloud Firestore & Firebase Storage,
 * anonymize historical orders/conversations, and record a tombstone in `deletedAccounts` so spam
 * accounts cannot sign back in or auto-recreate their profile.
 */
export async function deleteFirebaseUserAccount(params: {
  userId: string;
  email?: string;
  isSeller?: boolean;
  force?: boolean;
  deletedByAdminId?: string;
  reason?: string;
}): Promise<void> {
  const { userId, email, isSeller, force, deletedByAdminId, reason } = params;
  const cleanEmail = email?.trim() || '';

  // 1. Guard against active seller orders unless admin explicitly chose force delete
  if (isSeller && !force) {
    const farmerOrdersSnap = await getDocs(
      query(collection(db, 'orders'), where('farmerId', '==', userId))
    ).catch(() => null);
    if (farmerOrdersSnap && !farmerOrdersSnap.empty) {
      const activeOrderNumbers: string[] = [];
      for (const orderDoc of farmerOrdersSnap.docs) {
        const data = orderDoc.data() as any;
        const canonical = normalizeOrderStatus(data?.status, data?.deliveryMethod);
        const pendingPop = data?.paymentStatus === 'pending_verification';
        if ((canonical !== 'done' && canonical !== 'cancelled') || pendingPop) {
          activeOrderNumbers.push(data?.orderNumber || orderDoc.id);
        }
      }
      if (activeOrderNumbers.length > 0) {
        throw new Error(
          `Seller has ${activeOrderNumbers.length} active or unverified order(s) (${activeOrderNumbers.join(', ')}). Enable Force Delete to cancel open orders and remove this spam account.`
        );
      }
    }
  }

  // 2. Delete media posts + Firebase Storage media files
  const postsSnap = await getDocs(
    query(collection(db, 'mediaPosts'), where('farmerId', '==', userId))
  ).catch(() => null);
  if (postsSnap && !postsSnap.empty) {
    for (const pDoc of postsSnap.docs) {
      const mediaArr = (pDoc.data() as any)?.media;
      if (Array.isArray(mediaArr)) {
        for (const m of mediaArr) {
          if (m?.storagePath) {
            await deleteFirebaseStorageFile(m.storagePath);
          }
        }
      }
      await deleteDoc(pDoc.ref).catch(() => {});
    }
  }

  // 3. Delete user-owned listings, ad requests, buyer requests, and notifications
  const collectionsToDelete: [string, string][] = [
    ['products', 'farmerId'],
    ['adRequests', 'farmerId'],
    ['buyerRequests', 'buyerId'],
    ['notifications', 'userId']
  ];
  for (const [colName, fieldName] of collectionsToDelete) {
    const snap = await getDocs(
      query(collection(db, colName), where(fieldName, '==', userId))
    ).catch(() => null);
    if (snap && !snap.empty) {
      for (const d of snap.docs) {
        await deleteDoc(d.ref).catch(() => {});
      }
    }
  }

  // 4. Anonymize historical orders in Firestore (rules forbid deleting orders)
  const buyerOrdersSnap = await getDocs(
    query(collection(db, 'orders'), where('buyerId', '==', userId))
  ).catch(() => null);
  if (buyerOrdersSnap && !buyerOrdersSnap.empty) {
    for (const oDoc of buyerOrdersSnap.docs) {
      const data = oDoc.data() as any;
      await updateDoc(oDoc.ref, {
        buyerName: 'Deleted User',
        buyerEmail: '',
        buyerPhone: '',
        deliveryAddress: data?.deliveryAddress ? 'Redacted (Account Deleted)' : '',
        deliveryLocation: data?.deliveryLocation
          ? {
              mode: data.deliveryLocation.mode || 'manual',
              city: data.deliveryLocation.city || '',
              formattedAddress: 'Redacted (Account Deleted)'
            }
          : null,
        buyerNotes: '',
        updatedAt: serverTimestamp()
      }).catch(() => {});
    }
  }

  const sellerOrdersSnap = await getDocs(
    query(collection(db, 'orders'), where('farmerId', '==', userId))
  ).catch(() => null);
  if (sellerOrdersSnap && !sellerOrdersSnap.empty) {
    for (const oDoc of sellerOrdersSnap.docs) {
      const data = oDoc.data() as any;
      const canonical = normalizeOrderStatus(data?.status, data?.deliveryMethod);
      const pendingPop = data?.paymentStatus === 'pending_verification';
      const shouldCancel = Boolean(force && ((canonical !== 'done' && canonical !== 'cancelled') || pendingPop));
      await updateDoc(oDoc.ref, {
        farmerName: 'Former Producer',
        farmerPaymentDetails: null,
        ...(shouldCancel
          ? {
              status: 'cancelled',
              ...(pendingPop ? { paymentStatus: 'rejected' } : {}),
              paymentRejectionReason:
                data?.paymentRejectionReason || 'Seller account removed by platform administration.'
            }
          : {}),
        updatedAt: serverTimestamp()
      }).catch(() => {});
    }
  }

  // 5. Anonymize participant display metadata in conversations
  const convSnap = await getDocs(
    query(collection(db, 'conversations'), where('participantIds', 'array-contains', userId))
  ).catch(() => null);
  if (convSnap && !convSnap.empty) {
    for (const cDoc of convSnap.docs) {
      const data = cDoc.data() as any;
      if (Array.isArray(data?.participants)) {
        const updatedParticipants = data.participants.map((p: any) =>
          p?.id === userId ? { ...p, name: 'Deleted User', avatar: '', farmName: null } : p
        );
        await updateDoc(cDoc.ref, {
          participants: updatedParticipants,
          updatedAt: serverTimestamp()
        }).catch(() => {});
      }
    }
  }

  // 6. Write deletion tombstone so spam account cannot re-login or recreate profile
  try {
    await setDoc(doc(db, 'deletedAccounts', userId), {
      uid: userId,
      email: cleanEmail,
      emailLower: cleanEmail.toLowerCase(),
      deletedBy: deletedByAdminId || 'admin',
      reason: reason?.trim() || 'Removed by platform administration',
      deletedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `deletedAccounts/${userId}`);
  }

  // 7. Delete primary user document and any duplicate docs matching uid or email
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
  }

  const byUidSnap = await getDocs(
    query(collection(db, 'users'), where('uid', '==', userId))
  ).catch(() => null);
  if (byUidSnap && !byUidSnap.empty) {
    for (const d of byUidSnap.docs) {
      if (d.id !== userId) {
        await deleteDoc(d.ref).catch(() => {});
      }
    }
  }

  if (cleanEmail) {
    const emailCandidates = Array.from(new Set([cleanEmail, cleanEmail.toLowerCase()]));
    for (const candidate of emailCandidates) {
      const byEmailSnap = await getDocs(
        query(collection(db, 'users'), where('email', '==', candidate))
      ).catch(() => null);
      if (byEmailSnap && !byEmailSnap.empty) {
        for (const d of byEmailSnap.docs) {
          await deleteDoc(d.ref).catch(() => {});
        }
      }
    }
  }
}

/**
 * Administrative farmer/fodder supplier profile update synced across Firestore
 * (user document, producer products, immutable admin audit log, and farmer notification).
 * Strictly excludes password or credential fields.
 */
export async function adminUpdateFarmerProfileInFirebase(params: {
  targetUser: User;
  updates: {
    name: string;
    phone: string;
    location: {
      country?: string;
      province: string;
      city: string;
      address?: string;
      community?: string;
    };
    farmerProfile: {
      farmName: string;
      address?: string;
      bio?: string;
      farmDescription?: string;
      farmSize?: string;
      practices?: string[];
      farmingPractices?: string[];
      whatsapp?: string;
    };
  };
  admin: { id: string; name: string };
  auditLog?: AdminAuditLog;
  note?: string;
}): Promise<void> {
  const { targetUser, updates, admin, auditLog, note } = params;
  const userRef = doc(db, 'users', targetUser.id);
  const nowIso = new Date().toISOString();

  const mergedFarmerProfile = {
    ...(targetUser.farmerProfile || {}),
    ...updates.farmerProfile,
    farmName: updates.farmerProfile.farmName.trim(),
    address: (updates.farmerProfile.address ?? updates.location.address ?? targetUser.farmerProfile?.address ?? '').trim(),
    bio: (updates.farmerProfile.bio ?? targetUser.farmerProfile?.bio ?? '').trim(),
    farmDescription: (updates.farmerProfile.farmDescription ?? updates.farmerProfile.bio ?? targetUser.farmerProfile?.farmDescription ?? '').trim(),
    farmSize: (updates.farmerProfile.farmSize ?? targetUser.farmerProfile?.farmSize ?? '').trim(),
    practices: updates.farmerProfile.practices ?? targetUser.farmerProfile?.practices ?? [],
    farmingPractices: updates.farmerProfile.farmingPractices ?? updates.farmerProfile.practices ?? targetUser.farmerProfile?.farmingPractices ?? []
  };

  const mergedLocation = {
    country: 'Zimbabwe',
    province: updates.location.province.trim(),
    city: updates.location.city.trim(),
    address: (updates.location.address ?? mergedFarmerProfile.address ?? '').trim(),
    ...(updates.location.community ? { community: updates.location.community } : {})
  };

  const firestorePayload: Record<string, any> = {
    uid: targetUser.id,
    id: targetUser.id,
    fullName: updates.name.trim(),
    name: updates.name.trim(),
    phone: updates.phone.trim(),
    email: targetUser.email || '',
    role: targetUser.role,
    avatar: targetUser.avatar || '',
    status: targetUser.status || 'active',
    location: mergedLocation,
    farmerProfile: mergedFarmerProfile,
    updatedAt: serverTimestamp(),
    lastAdminEditedAt: nowIso,
    lastAdminEditedBy: admin.id
  };

  try {
    await setDoc(userRef, firestorePayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.id}`);
  }

  // Sync matching UID docs if docId differs
  const uidSnap = await getDocs(
    query(collection(db, 'users'), where('uid', '==', targetUser.id))
  ).catch(() => null);
  if (uidSnap && !uidSnap.empty) {
    for (const d of uidSnap.docs) {
      if (d.id !== targetUser.id) {
        await setDoc(d.ref, firestorePayload, { merge: true }).catch(() => {});
      }
    }
  }

  // Keep producer listings' farmerName & farmName in sync in Firestore
  const prodsSnap = await getDocs(
    query(collection(db, 'products'), where('farmerId', '==', targetUser.id))
  ).catch(() => null);
  if (prodsSnap && !prodsSnap.empty) {
    for (const pDoc of prodsSnap.docs) {
      await updateDoc(pDoc.ref, {
        farmerName: updates.name.trim(),
        farmName: mergedFarmerProfile.farmName,
        updatedAt: nowIso
      }).catch(() => {});
    }
  }

  const postsSnap = await getDocs(
    query(collection(db, 'mediaPosts'), where('farmerId', '==', targetUser.id))
  ).catch(() => null);
  if (postsSnap && !postsSnap.empty) {
    for (const postDoc of postsSnap.docs) {
      await updateDoc(postDoc.ref, {
        farmerName: updates.name.trim(),
        farmName: mergedFarmerProfile.farmName,
        updatedAt: nowIso
      }).catch(() => {});
    }
  }

  const finalAuditLog: AdminAuditLog = auditLog || {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    adminId: admin.id,
    adminName: admin.name,
    action: 'edit_farmer_profile',
    affectedUserId: targetUser.id,
    affectedUserName: updates.name.trim(),
    changedFields: {
      name: { before: targetUser.name, after: updates.name.trim() },
      phone: { before: targetUser.phone || '', after: updates.phone.trim() },
      farmName: {
        before: targetUser.farmerProfile?.farmName || '',
        after: mergedFarmerProfile.farmName
      }
    },
    note: note || 'Updated farmer profile from Admin Panel',
    timestamp: nowIso
  };

  await createFirebaseAdminAuditLog(finalAuditLog);

  await createFirebaseNotification({
    userId: targetUser.id,
    title: 'Profile Updated by FarmBridge Support',
    message: `An administrator updated your farmer profile details (${mergedFarmerProfile.farmName}).`,
    type: 'system',
    metadata: { auditLogId: finalAuditLog.id }
  }).catch(() => {});
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
