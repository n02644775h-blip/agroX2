import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  EmailAuthProvider,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  reload,
  verifyBeforeUpdateEmail,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import {
  FieldValue,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { deleteFirebaseStorageFile } from '../services/firebaseStorage';
import { normalizeOrderStatus } from '../utils/orderUtils';
import { auth, db } from '../firebase/config';
import { getFriendlyAuthErrorMessage } from '../firebase/authErrors';
import { checkFirestoreUserSuspended, checkFirestoreUserDeleted } from '../services/firebaseUsers';
import {
  subscribeToFirebaseNotifications,
  markFirebaseNotificationRead,
  markAllFirebaseNotificationsRead
} from '../services/firebaseNotifications';
import { User, UserRole, Notification, isSellerRole } from '../types';
import { api } from '../services/api';

const SUSPENDED_ACCOUNT_MESSAGE =
  'Your account has been suspended by the FarmBridge administration. Please contact support at farmbridge2026@gmail.com for assistance.';
const DELETED_ACCOUNT_MESSAGE =
  'This account has been permanently deleted by the FarmBridge administration.';

function createSuspendedError(message: string = SUSPENDED_ACCOUNT_MESSAGE): Error & { code?: string } {
  const err = new Error(message) as Error & { code?: string };
  err.name = 'AccountSuspendedError';
  err.code = 'auth/account-suspended';
  return err;
}

function createDeletedError(message: string = DELETED_ACCOUNT_MESSAGE): Error & { code?: string } {
  const err = new Error(message) as Error & { code?: string };
  err.name = 'AccountDeletedError';
  err.code = 'auth/account-deleted';
  return err;
}

function isSuspendedError(err: any): boolean {
  return (
    err?.name === 'AccountSuspendedError' ||
    err?.code === 'auth/account-suspended' ||
    err?.name === 'AccountDeletedError' ||
    err?.code === 'auth/account-deleted' ||
    (typeof err?.message === 'string' &&
      (err.message.toLowerCase().includes('account has been suspended') ||
        err.message.toLowerCase().includes('permanently deleted')))
  );
}
import {
  persistUserSession,
  getPersistedUserSession,
  clearUserSession,
  clearUserSession as clearPersistedUserSession,
  getCookie
} from '../services/cookieService';

// Helper to sanitize objects for Firestore to prevent "Unsupported field value: undefined" errors
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as any;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        !(value instanceof FieldValue) &&
        typeof (value as any)?._methodName !== 'string'
      ) {
        result[key] = sanitizeForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result as T;
}

export interface UserProfileData {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  emailVerified?: boolean;
  location?: {
    country?: string;
    province: string;
    city: string;
    community?: string;
    address?: string;
  };
  farmerProfile?: any;
  buyerProfile?: any;
  createdAt?: any;
  updatedAt?: any;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  user: User | null; // Unified application user representation
  userProfile: UserProfileData | null;
  loading: boolean;
  isEmailVerified: boolean;
  requiresEmailVerification: boolean;
  lastVerificationError: string | null;
  suspensionNotice: string | null;
  clearSuspensionNotice: () => void;
  accountDeletionNotice: string | null;
  clearAccountDeletionNotice: () => void;
  unreadNotifsCount: number;
  unreadMessagesCount: number;
  notifications: Notification[];
  favorites: string[];
  signup: (fullName: string, email: string, password: string, additionalData?: Partial<UserProfileData>) => Promise<User>;
  login: (email: string, password?: string) => Promise<User>;
  loginAdmin: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  deleteAccount: (options?: { password?: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: (targetUser?: FirebaseUser) => Promise<{ sent: boolean; errorMessage?: string }>;
  checkEmailVerification: () => Promise<{ verified: boolean; user?: User }>;
  updatePendingEmail: (newEmail: string, currentPassword?: string) => Promise<{ sent: boolean; errorMessage?: string }>;
  register: (userData: Partial<User>) => Promise<void>; // Backward-compatible alias
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  refreshUserData: () => Promise<void>;
  toggleFavorite: (productId: string) => Promise<boolean>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronously restore user from multi-layer storage (cookies, localStorage, sessionStorage)
  const initialPersistedUser = getPersistedUserSession();

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(() => {
    if (!initialPersistedUser) return null;
    return {
      uid: initialPersistedUser.id,
      fullName: initialPersistedUser.name,
      email: initialPersistedUser.email,
      role: initialPersistedUser.role,
      phone: initialPersistedUser.phone,
      avatar: initialPersistedUser.avatar,
      location: initialPersistedUser.location,
      farmerProfile: initialPersistedUser.farmerProfile,
      buyerProfile: initialPersistedUser.buyerProfile
    };
  });
  const [user, setUser] = useState<User | null>(() => initialPersistedUser);
  const [loading, setLoading] = useState<boolean>(!initialPersistedUser);
  const [lastVerificationError, setLastVerificationError] = useState<string | null>(null);
  const [suspensionNotice, setSuspensionNotice] = useState<string | null>(null);
  const [accountDeletionNotice, setAccountDeletionNotice] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

  const clearSuspensionNotice = () => setSuspensionNotice(null);
  const clearAccountDeletionNotice = () => setAccountDeletionNotice(null);

  const forceRevokeSuspendedSession = async (uid?: string | null, noticeMessage: string = SUSPENDED_ACCOUNT_MESSAGE) => {
    clearPersistedUserSession(uid || undefined);
    api.setToken(null);
    await signOut(auth).catch(() => {});
    setCurrentUser(null);
    setUser(null);
    setUserProfile(null);
    setNotifications([]);
    setFavorites([]);
    setUnreadMessagesCount(0);
    setSuspensionNotice(noticeMessage);
  };

  const enforceNotSuspended = async (uid?: string | null, email?: string | null): Promise<void> => {
    const [fsSuspended, fsDeleted, apiStatus] = await Promise.all([
      checkFirestoreUserSuspended(uid, email),
      checkFirestoreUserDeleted(uid, email),
      api.checkUserStatus({ uid, email }).catch(() => ({ suspended: false, deleted: false, status: 'unknown' }))
    ]);

    if (fsDeleted || apiStatus?.deleted) {
      await forceRevokeSuspendedSession(uid, DELETED_ACCOUNT_MESSAGE);
      throw createDeletedError();
    }

    if (fsSuspended || apiStatus?.suspended) {
      await forceRevokeSuspendedSession(uid);
      throw createSuspendedError();
    }
  };

  // Helper to fetch or synchronize Firestore user profile document with app user state
  const syncUserProfile = async (fbUser: FirebaseUser | null, customUid?: string): Promise<User | null> => {
    const uid = fbUser?.uid || customUid;
    if (!uid) {
      // Only clear if explicitly empty
      if (!initialPersistedUser && !user) {
        setUser(null);
        setUserProfile(null);
        setNotifications([]);
        setFavorites([]);
        setUnreadMessagesCount(0);
      }
      return null;
    }

    let localCachedUser: User | null = null;

    try {
      // 1. Check local cached user profile first
      try {
        const persisted = getPersistedUserSession();
        if (persisted && persisted.id === uid) {
          localCachedUser = persisted;
        } else {
          const cachedRaw = localStorage.getItem(`agrox_user_profile_${uid}`);
          if (cachedRaw) {
            localCachedUser = JSON.parse(cachedRaw);
          }
        }
      } catch (err) {
        console.warn('Error reading local user cache:', err);
      }

      const userDocRef = doc(db, 'users', uid);
      const userSnap = await getDocFromServer(userDocRef)
        .catch(() => getDoc(userDocRef))
        .catch(err => {
          console.warn('Firestore getDoc warning:', err);
          return null;
        });

      const knownEmail = fbUser?.email || (userSnap?.exists() ? (userSnap.data() as any)?.email : undefined) || localCachedUser?.email;

      // CRITICAL: Check suspension across Firestore (by uid and email) and backend API before proceeding
      await enforceNotSuspended(uid, knownEmail);

      let profileData: UserProfileData;
      let userStatus: 'active' | 'suspended' | 'pending_verification' = 'active';
      let authoritativeEmailVerified = fbUser ? Boolean(fbUser.emailVerified) : true;

      if (userSnap && userSnap.exists()) {
        const fsData = userSnap.data() as any;

        // Double-check document status directly
        if (fsData.status === 'suspended') {
          console.warn(`User ${uid} is suspended in Firestore. Denying access.`);
          await forceRevokeSuspendedSession(uid);
          throw createSuspendedError();
        }
        if (fsData.status === 'deleted') {
          await forceRevokeSuspendedSession(uid, DELETED_ACCOUNT_MESSAGE);
          throw createDeletedError();
        }

        if (fbUser) {
          authoritativeEmailVerified = Boolean(fbUser.emailVerified);
          if (authoritativeEmailVerified && (fsData.status === 'pending_verification' || fsData.emailVerified !== true)) {
            await fbUser.getIdToken(true).catch(() => {});
            await updateDoc(userDocRef, {
              status: 'active',
              emailVerified: true,
              updatedAt: serverTimestamp()
            }).catch(() => {});
            userStatus = 'active';
          } else {
            userStatus = authoritativeEmailVerified ? (fsData.status || 'active') : 'pending_verification';
          }
        } else {
          // Non-Firebase Auth sessions (legacy admin-1 / seeded local users)
          authoritativeEmailVerified = fsData.status !== 'pending_verification';
          userStatus = fsData.status || 'active';
        }

        // Authoritative Firestore data takes precedence over stale localStorage so admin edits persist everywhere
        const resolvedRole = (
          fsData.role ||
          localCachedUser?.role ||
          (uid.startsWith('supplier') ? 'fodder_supplier' : uid.startsWith('farmer') ? 'farmer' : uid.startsWith('admin') ? 'admin' : 'buyer')
        ) as UserRole;

        profileData = {
          uid,
          fullName: fsData.fullName || fsData.name || fbUser?.displayName || localCachedUser?.name || 'Producer User',
          email: fbUser?.email || fsData.email || localCachedUser?.email || `${uid}@farmbridge.local`,
          role: resolvedRole,
          phone: fsData.phone ?? localCachedUser?.phone ?? '',
          avatar: fsData.avatar || fbUser?.photoURL || localCachedUser?.avatar || '',
          emailVerified: authoritativeEmailVerified,
          location: {
            country: 'Zimbabwe',
            province: 'Harare',
            city: 'Harare',
            ...(localCachedUser?.location || {}),
            ...(fsData.location || {})
          },
          farmerProfile:
            fsData.farmerProfile || localCachedUser?.farmerProfile
              ? {
                  ...(localCachedUser?.farmerProfile || {}),
                  ...(fsData.farmerProfile || {})
                }
              : undefined,
          buyerProfile:
            fsData.buyerProfile || localCachedUser?.buyerProfile
              ? {
                  ...(localCachedUser?.buyerProfile || {}),
                  ...(fsData.buyerProfile || {})
                }
              : undefined
        };
      } else {
        // If document does not exist in Firestore yet:
        let baseUser: Partial<User> = localCachedUser || {};
        if (!baseUser.name || !baseUser.role) {
          const apiUser = await api.getUserById(uid).catch(() => null);
          if (apiUser) {
            baseUser = apiUser;
          }
        }

        if (baseUser.status === 'suspended') {
          await forceRevokeSuspendedSession(uid);
          throw createSuspendedError();
        }

        authoritativeEmailVerified = fbUser ? Boolean(fbUser.emailVerified) : baseUser.status !== 'pending_verification';
        userStatus = authoritativeEmailVerified ? 'active' : 'pending_verification';

        const role: UserRole = baseUser.role || (uid.startsWith('supplier') ? 'fodder_supplier' : uid.startsWith('farmer') ? 'farmer' : uid.startsWith('admin') ? 'admin' : 'buyer');
        const defaultAvatar = isSellerRole(role)
          ? 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';

        const initialProfile: Record<string, any> = {
          uid: uid,
          fullName: baseUser.name || fbUser?.displayName || (role === 'fodder_supplier' ? 'Tawanda Gumbo' : role === 'farmer' ? 'Tendai Moyo' : 'Marketplace User'),
          email: fbUser?.email || baseUser.email || `${uid}@agrox.org`,
          role: role,
          phone: baseUser.phone || (isSellerRole(role) ? '+263 77 210 4930' : ''),
          avatar: baseUser.avatar || fbUser?.photoURL || defaultAvatar,
          emailVerified: authoritativeEmailVerified,
          location: baseUser.location || {
            country: 'Zimbabwe',
            province: 'Harare',
            city: 'Harare',
            community: 'Direct Market'
          },
          status: userStatus,
          createdAt: serverTimestamp()
        };

        if (isSellerRole(role)) {
          initialProfile.farmerProfile = baseUser.farmerProfile || {
            farmName: role === 'fodder_supplier' ? `${initialProfile.fullName}'s Fodder Supply` : `${initialProfile.fullName}'s Farm`,
            bio: role === 'fodder_supplier'
              ? 'Supplier of high-nutrition lucerne hay bales, silage, and livestock forage.'
              : 'Local agricultural producer offering fresh, high quality farm produce.',
            farmSize: '15 Hectares',
            address: 'Plot 14, Golden Valley Corridor',
            whatsapp: initialProfile.phone || '+263 77 210 4930',
            practices: ['100% Organic', 'Same-Day Harvest', 'Drip Irrigated'],
            farmingMethods: ['Organic Compost', 'Drip Irrigation'],
            rating: 5.0,
            totalReviews: 0,
            isVerified: true,
            verified: true,
            paymentInfo: {
              ecocash: '0772 210 493',
              innbucks: 'INB-8839',
              bankAccount: 'CABS 100492812'
            }
          };
        } else if (role === 'buyer') {
          initialProfile.buyerProfile = baseUser.buyerProfile || {
            preferredDeliveryAddress: '',
            favoriteCategories: [],
            totalOrdersPlaced: 0
          };
        }

        // Persist initial doc to Firestore using setDoc with merge: true
        await setDoc(userDocRef, sanitizeForFirestore(initialProfile), { merge: true }).catch(err => {
          console.warn('Could not bootstrap initial user in Firestore:', err);
        });
        profileData = initialProfile as UserProfileData;
      }

      setUserProfile(profileData);

      // Build unified User model for marketplace interoperability
      const unifiedUser: User = {
        id: uid,
        name: profileData.fullName || fbUser?.displayName || localCachedUser?.name || 'Marketplace User',
        email: fbUser?.email || profileData.email || localCachedUser?.email || '',
        phone: profileData.phone || localCachedUser?.phone || '',
        role: profileData.role || localCachedUser?.role || 'buyer',
        avatar: profileData.avatar || fbUser?.photoURL || localCachedUser?.avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
        location: profileData.location || localCachedUser?.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
        status: userStatus,
        emailVerified: authoritativeEmailVerified,
        createdAt: (localCachedUser && localCachedUser.createdAt) || (typeof profileData.createdAt === 'string' ? profileData.createdAt : new Date().toISOString()),
        farmerProfile: profileData.farmerProfile || localCachedUser?.farmerProfile,
        buyerProfile: profileData.buyerProfile || localCachedUser?.buyerProfile
      };

      setUser(unifiedUser);
      // Multi-layer persistence across localStorage, sessionStorage, and browser cookies
      persistUserSession(unifiedUser);

      // Ensure API token is set
      api.setToken(`token_${uid}`);

      // Fetch related user activity: notifications, favorites, and messages
      try {
        const notifs = await api.getNotifications(uid).catch(() => []);
        setNotifications(notifs);

        const favProducts = await api.getFavorites(uid).catch(() => []);
        setFavorites(favProducts.map(p => p.id));

        const convs = await api.getConversations(uid).catch(() => []);
        const unreadMsgs = (convs || []).reduce((acc: number, c) => acc + (c.unreadCountFor?.[uid] || 0), 0);
        setUnreadMessagesCount(unreadMsgs);
      } catch (err) {
        console.warn('Could not load user secondary records:', err);
      }

      return unifiedUser;
    } catch (error) {
      if (isSuspendedError(error)) {
        // NEVER fall back to cached local user when an account is suspended
        throw error;
      }
      console.error('Error synchronizing user profile from Firestore:', error);
      if (localCachedUser && localCachedUser.status !== 'suspended') {
        setUser(localCachedUser);
        return localCachedUser;
      }
      return null;
    }
  };

  // Listen to Firebase Authentication state changes across refresh & tab reload
  useEffect(() => {
    // If we have an initial persisted user, configure API token immediately
    const existingUser = getPersistedUserSession();
    if (existingUser) {
      api.setToken(localStorage.getItem('agriconnect_token') || `token_${existingUser.id}`);
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setCurrentUser(fbUser);
      if (fbUser) {
        try {
          await syncUserProfile(fbUser);
        } catch (err) {
          if (isSuspendedError(err)) {
            await forceRevokeSuspendedSession(fbUser.uid);
          }
        }
      } else {
        // Firebase has no active session or returned null.
        // Check our multi-layer session storage:
        const currentPersisted = getPersistedUserSession();
        const activeUid = currentPersisted?.id || localStorage.getItem('agrox_active_uid') || getCookie('agrox_uid');

        if (activeUid) {
          try {
            const synced = await syncUserProfile(null, activeUid);
            if (synced) {
              setLoading(false);
              return;
            } else if (currentPersisted && currentPersisted.status !== 'suspended') {
              // Keep the persisted user - do NOT log out on transient errors
              setUser(currentPersisted);
              setUserProfile({
                uid: currentPersisted.id,
                fullName: currentPersisted.name,
                email: currentPersisted.email,
                role: currentPersisted.role,
                phone: currentPersisted.phone,
                avatar: currentPersisted.avatar,
                location: currentPersisted.location,
                farmerProfile: currentPersisted.farmerProfile,
                buyerProfile: currentPersisted.buyerProfile
              });
              setLoading(false);
              return;
            }
          } catch (err) {
            if (isSuspendedError(err)) {
              await forceRevokeSuspendedSession(activeUid);
              setLoading(false);
              return;
            }
          }
        }

        // Fallback check if server session has a logged-in user
        const meRes = await api.getMe().catch(() => ({ user: null, suspended: false }));
        if (meRes?.suspended) {
          await forceRevokeSuspendedSession(activeUid);
        } else if (meRes?.user) {
          try {
            await syncUserProfile(null, meRes.user.id);
          } catch (err) {
            if (isSuspendedError(err)) {
              await forceRevokeSuspendedSession(meRes.user.id);
            }
          }
        } else if (!currentPersisted) {
          // Only clear if genuinely no user was persisted anywhere
          setUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    // Listen for storage access granted events from CookieAccessBanner
    const handleStorageAccessGranted = () => {
      const refreshedUser = getPersistedUserSession();
      if (refreshedUser) {
        persistUserSession(refreshedUser);
        syncUserProfile(null, refreshedUser.id).catch(() => {});
      }
    };
    window.addEventListener('agrox_storage_access_granted', handleStorageAccessGranted);

    return () => {
      unsubscribe();
      window.removeEventListener('agrox_storage_access_granted', handleStorageAccessGranted);
    };
  }, []);

  // Real-time synchronization of active user's account status (kicks out suspended users immediately)
  useEffect(() => {
    if (!user?.id) return;

    const handleRealtimeSuspension = () => {
      console.warn('Real-time notice: Account has been suspended by administration.');
      forceRevokeSuspendedSession(
        user.id,
        'Notice: Your account has been suspended by the FarmBridge administration. Please contact support at farmbridge2026@gmail.com for appeal.'
      );
    };

    const handleRealtimeDeletion = () => {
      console.warn('Real-time notice: Account has been permanently deleted by administration.');
      forceRevokeSuspendedSession(user.id, DELETED_ACCOUNT_MESSAGE);
    };

    const activeUserDocRef = doc(db, 'users', user.id);
    const statusUnsubById = onSnapshot(
      activeUserDocRef,
      (snap) => {
        if (!snap.exists()) return;
        const fsData = snap.data() as any;
        const st = fsData?.status;
        if (st === 'suspended') {
          handleRealtimeSuspension();
          return;
        }
        if (st === 'deleted') {
          handleRealtimeDeletion();
          return;
        }

        // Real-time sync when Admin or another tab updates the active profile in Firestore
        const incomingName = fsData.fullName || fsData.name;
        const incomingPhone = fsData.phone !== undefined ? fsData.phone : undefined;
        const fbNow = auth.currentUser;
        const canBeActive = fbNow ? Boolean(fbNow.emailVerified) : fsData.status !== 'pending_verification';
        const resolvedStatus: User['status'] = canBeActive ? (fsData.status || 'active') : 'pending_verification';
        setUser(prev => {
          if (!prev || prev.id !== user.id) return prev;
          const nextUser: User = {
            ...prev,
            name: incomingName || prev.name,
            phone: incomingPhone !== undefined ? incomingPhone : prev.phone,
            avatar: fsData.avatar || prev.avatar,
            status: resolvedStatus,
            emailVerified: canBeActive,
            location: fsData.location ? { ...prev.location, ...fsData.location } : prev.location,
            farmerProfile: fsData.farmerProfile
              ? { ...(prev.farmerProfile || {}), ...fsData.farmerProfile }
              : prev.farmerProfile,
            buyerProfile: fsData.buyerProfile
              ? { ...(prev.buyerProfile || {}), ...fsData.buyerProfile }
              : prev.buyerProfile
          };
          if (JSON.stringify(nextUser) === JSON.stringify(prev)) return prev;
          persistUserSession(nextUser);
          setUserProfile({
            uid: nextUser.id,
            fullName: nextUser.name,
            email: nextUser.email,
            role: nextUser.role,
            phone: nextUser.phone,
            avatar: nextUser.avatar,
            emailVerified: nextUser.emailVerified,
            location: nextUser.location,
            farmerProfile: nextUser.farmerProfile,
            buyerProfile: nextUser.buyerProfile
          });
          return nextUser;
        });
      },
      () => {}
    );

    const deletedTombstoneUnsub = onSnapshot(
      doc(db, 'deletedAccounts', user.id),
      (snap) => {
        if (snap.exists()) {
          handleRealtimeDeletion();
        }
      },
      () => {}
    );

    let statusUnsubByEmail: (() => void) | null = null;
    if (user.email) {
      const emailQuery = query(collection(db, 'users'), where('email', '==', user.email));
      statusUnsubByEmail = onSnapshot(
        emailQuery,
        (snapshot) => {
          for (const d of snapshot.docs) {
            const st = d.data()?.status;
            if (st === 'suspended') {
              handleRealtimeSuspension();
              break;
            }
            if (st === 'deleted') {
              handleRealtimeDeletion();
              break;
            }
          }
        },
        () => {}
      );
    }

    return () => {
      statusUnsubById();
      deletedTombstoneUnsub();
      if (statusUnsubByEmail) statusUnsubByEmail();
    };
  }, [user?.id, user?.email]);

  // Real-time synchronization of user notifications (order updates, POP reviews, broadcasts)
  useEffect(() => {
    if (!user?.id) return;

    const unsubNotifs = subscribeToFirebaseNotifications(user.id, (fbNotifs) => {
      setNotifications(prev => {
        const map = new Map<string, Notification>();
        prev.forEach(n => map.set(n.id, n));
        fbNotifs.forEach(n => {
          const existing = map.get(n.id);
          map.set(n.id, {
            ...n,
            read: Boolean(n.read || existing?.read)
          });
        });
        return Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    });

    return () => {
      unsubNotifs();
    };
  }, [user?.id]);

  // Send or resend Firebase Auth verification email
  const sendVerificationEmail = async (
    targetUser?: FirebaseUser
  ): Promise<{ sent: boolean; errorMessage?: string }> => {
    const fbTarget = targetUser || auth.currentUser;
    if (!fbTarget) {
      const msg = 'No active Firebase Authentication session found. Please sign in with your email and password first.';
      setLastVerificationError(msg);
      return { sent: false, errorMessage: msg };
    }
    setLastVerificationError(null);
    try {
      const continueUrl =
        typeof window !== 'undefined' && window.location?.origin
          ? `${window.location.origin}/#verified`
          : undefined;
      if (continueUrl) {
        try {
          await sendEmailVerification(fbTarget, {
            url: continueUrl,
            handleCodeInApp: false
          });
          return { sent: true };
        } catch (err: any) {
          if (
            err?.code === 'auth/unauthorized-continue-uri' ||
            err?.code === 'auth/invalid-continue-uri'
          ) {
            await sendEmailVerification(fbTarget);
            return { sent: true };
          }
          throw err;
        }
      }
      await sendEmailVerification(fbTarget);
      return { sent: true };
    } catch (err: any) {
      const friendly = getFriendlyAuthErrorMessage(err);
      console.error('sendVerificationEmail error:', err);
      setLastVerificationError(friendly);
      return { sent: false, errorMessage: friendly };
    }
  };

  // Reload Firebase Auth user & verify whether email link was confirmed
  const checkEmailVerification = async (): Promise<{ verified: boolean; user?: User }> => {
    const fbTarget = auth.currentUser;
    if (!fbTarget) {
      if (user && user.emailVerified !== false && user.status !== 'pending_verification') {
        return { verified: true, user };
      }
      return { verified: false };
    }
    try {
      await reload(fbTarget);
      if (!fbTarget.emailVerified) {
        return { verified: false };
      }
      await fbTarget.getIdToken(true).catch(() => {});
      await setDoc(
        doc(db, 'users', fbTarget.uid),
        sanitizeForFirestore({
          status: 'active',
          emailVerified: true,
          updatedAt: serverTimestamp()
        }),
        { merge: true }
      ).catch(() => {});
      await api.updateUser(fbTarget.uid, {
        actingUserId: fbTarget.uid,
        emailVerified: true,
        status: 'active'
      } as any).catch(() => {});
      setLastVerificationError(null);
      const synced = await syncUserProfile(fbTarget);
      return { verified: true, user: synced || undefined };
    } catch (err: any) {
      console.error('checkEmailVerification error:', err);
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  };

  // Change pending email address and send verification to the new inbox
  const updatePendingEmail = async (
    newEmail: string,
    currentPassword?: string
  ): Promise<{ sent: boolean; errorMessage?: string }> => {
    const cleanNewEmail = newEmail.trim();
    if (!cleanNewEmail || !/\S+@\S+\.\S+/.test(cleanNewEmail)) {
      return { sent: false, errorMessage: 'Please enter a valid email address.' };
    }
    const fbTarget = auth.currentUser;
    if (!fbTarget) {
      return {
        sent: false,
        errorMessage: 'No active account session found. Please log in again and retry.'
      };
    }
    try {
      await enforceNotSuspended(fbTarget.uid, cleanNewEmail);
      const continueUrl =
        typeof window !== 'undefined' && window.location?.origin
          ? `${window.location.origin}/#verified`
          : undefined;

      const performEmailUpdate = async () => {
        if (continueUrl) {
          try {
            await verifyBeforeUpdateEmail(fbTarget, cleanNewEmail, {
              url: continueUrl,
              handleCodeInApp: false
            });
          } catch (err: any) {
            if (
              err?.code === 'auth/unauthorized-continue-uri' ||
              err?.code === 'auth/invalid-continue-uri'
            ) {
              await verifyBeforeUpdateEmail(fbTarget, cleanNewEmail);
            } else {
              throw err;
            }
          }
        } else {
          await verifyBeforeUpdateEmail(fbTarget, cleanNewEmail);
        }
      };

      try {
        await performEmailUpdate();
      } catch (err: any) {
        if (err?.code === 'auth/requires-recent-login') {
          if (!currentPassword || !fbTarget.email) {
            return {
              sent: false,
              errorMessage: 'Please enter your current password to confirm changing your email address.'
            };
          }
          const cred = EmailAuthProvider.credential(fbTarget.email, currentPassword);
          await reauthenticateWithCredential(fbTarget, cred);
          await performEmailUpdate();
        } else {
          throw err;
        }
      }

      await setDoc(
        doc(db, 'users', fbTarget.uid),
        sanitizeForFirestore({
          email: cleanNewEmail,
          emailVerified: false,
          status: 'pending_verification',
          updatedAt: serverTimestamp()
        }),
        { merge: true }
      ).catch(() => {});

      setUser(prev =>
        prev
          ? {
              ...prev,
              email: cleanNewEmail,
              emailVerified: false,
              status: 'pending_verification'
            }
          : prev
      );
      setUserProfile(prev =>
        prev
          ? {
              ...prev,
              email: cleanNewEmail,
              emailVerified: false
            }
          : prev
      );
      setLastVerificationError(null);
      return { sent: true };
    } catch (err: any) {
      const friendly = getFriendlyAuthErrorMessage(err);
      setLastVerificationError(friendly);
      return { sent: false, errorMessage: friendly };
    }
  };

  // 1. User Registration / Signup (Authoritative Firebase Auth + Mandatory Email Verification)
  const signup = async (
    fullName: string,
    email: string,
    password: string,
    additionalData?: Partial<UserProfileData>
  ): Promise<User> => {
    setLoading(true);
    setSuspensionNotice(null);
    setLastVerificationError(null);

    const requestedRole = additionalData?.role || 'buyer';
    const role: UserRole = requestedRole === 'admin' ? 'buyer' : requestedRole;
    const isSeller = isSellerRole(role);
    const defaultAvatar = isSeller
      ? 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    try {
      // Prevent suspended or deleted users from creating a duplicate account with the same email
      await enforceNotSuspended(null, cleanEmail);

      // 1. Create real account with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const createdFbUser = userCredential.user;
      const uid = createdFbUser.uid;

      if (cleanName) {
        await updateProfile(createdFbUser, { displayName: cleanName }).catch(() => {});
      }

      // 2. Dispatch Firebase verification email immediately
      await sendVerificationEmail(createdFbUser);

      // 3. Create Firestore document at users/{uid} with pending_verification status
      const initialDocData: Record<string, any> = {
        uid,
        fullName: cleanName,
        name: cleanName,
        email: cleanEmail,
        role,
        avatar: additionalData?.avatar || defaultAvatar,
        phone: additionalData?.phone || '',
        emailVerified: false,
        location: additionalData?.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
        status: 'pending_verification',
        createdAt: serverTimestamp()
      };

      if (isSeller) {
        initialDocData.farmerProfile = additionalData?.farmerProfile || {
          farmName: role === 'fodder_supplier' ? `${cleanName}'s Fodder Supply` : `${cleanName}'s Farm`,
          bio: role === 'fodder_supplier'
            ? 'Dedicated livestock fodder, hay bale, and animal feed supplier.'
            : 'Local agricultural producer dedicated to fresh produce.',
          farmingMethods: ['Organic Compost', 'Drip Irrigation'],
          establishedYear: new Date().getFullYear(),
          isVerified: true,
          verified: true
        };
      }

      if (role === 'buyer') {
        initialDocData.buyerProfile = additionalData?.buyerProfile || {
          preferredDeliveryAddress: '',
          favoriteCategories: [],
          totalOrdersPlaced: 0
        };
      }

      const sanitizedDocData = sanitizeForFirestore(initialDocData);
      await setDoc(doc(db, 'users', uid), sanitizedDocData);

      // Mirror registration in backend store
      await api.register({
        id: uid,
        name: cleanName,
        email: cleanEmail,
        role,
        phone: additionalData?.phone || '',
        emailVerified: false,
        status: 'pending_verification',
        location: additionalData?.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
        farmerProfile: initialDocData.farmerProfile,
        buyerProfile: initialDocData.buyerProfile
      }).catch(() => {});

      // 4. Sync in app state (remains pending_verification until email is verified)
      const unified = await syncUserProfile(createdFbUser, uid);
      if (!unified) {
        const pendingUser: User = {
          id: uid,
          name: cleanName,
          email: cleanEmail,
          phone: additionalData?.phone || '',
          role,
          avatar: additionalData?.avatar || defaultAvatar,
          location: additionalData?.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
          status: 'pending_verification',
          emailVerified: false,
          createdAt: new Date().toISOString(),
          farmerProfile: initialDocData.farmerProfile,
          buyerProfile: initialDocData.buyerProfile
        };
        persistUserSession(pendingUser);
        setUser(pendingUser);
        setUserProfile(initialDocData as UserProfileData);
        return pendingUser;
      }
      return unified;
    } catch (err: any) {
      console.error('Signup error:', err);
      throw new Error(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Backward-compatible register method
  const register = async (userData: Partial<User>): Promise<void> => {
    const fullName = userData.name || '';
    const email = userData.email || '';
    const password = (userData as any).password || 'Password123!';
    await signup(fullName, email, password, {
      role: userData.role || 'buyer',
      phone: userData.phone,
      location: userData.location,
      farmerProfile: userData.farmerProfile,
      buyerProfile: userData.buyerProfile,
      avatar: userData.avatar
    });
  };

  // 2. User Login
  const login = async (email: string, password?: string): Promise<User> => {
    setLoading(true);
    setSuspensionNotice(null);
    const cleanEmail = email.trim();

    try {
      // Pre-check suspension status by email before signing in
      await enforceNotSuspended(null, cleanEmail);

      if (password) {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        await reload(userCredential.user).catch(() => {});
        if (userCredential.user.emailVerified) {
          await userCredential.user.getIdToken(true).catch(() => {});
        }
        const unified = await syncUserProfile(userCredential.user);
        if (!unified) throw new Error('Unable to retrieve user record.');
        return unified;
      } else {
        // Demo/seed login path when no password is supplied
        const res = await api.login(cleanEmail);
        if (res?.user?.status === 'suspended') {
          await forceRevokeSuspendedSession(res.user.id);
          throw createSuspendedError();
        }
        await enforceNotSuspended(res.user.id, res.user.email);
        persistUserSession(res.user, res.token);
        setUser(res.user);
        setUserProfile({
          uid: res.user.id,
          fullName: res.user.name,
          email: res.user.email,
          role: res.user.role,
          phone: res.user.phone,
          avatar: res.user.avatar,
          location: res.user.location,
          farmerProfile: res.user.farmerProfile,
          buyerProfile: res.user.buyerProfile
        });
        return res.user;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      throw new Error(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // 4. Administrator Dedicated Login (Credentials: ULLY / LISSA)
  const loginAdmin = async (username: string, pass: string): Promise<User> => {
    const cleanUser = username.trim().toUpperCase();
    const cleanPass = pass.trim().toUpperCase();

    if (cleanUser !== 'ULLY' || cleanPass !== 'LISSA') {
      throw new Error('Invalid administrator credentials. Access restricted.');
    }

    setLoading(true);
    try {
      // Check Firestore & local cache first so edited admin profile picture / name survives re-login & server restarts
      let cachedAdmin: Partial<User> | null = null;
      try {
        const raw = localStorage.getItem('agrox_user_profile_admin-1');
        if (raw) cachedAdmin = JSON.parse(raw);
      } catch {}

      const fsSnap = await getDocFromServer(doc(db, 'users', 'admin-1'))
        .catch(() => getDoc(doc(db, 'users', 'admin-1')).catch(() => null));
      const fsAdminData = fsSnap && fsSnap.exists() ? (fsSnap.data() as any) : null;

      const apiRes = await api.login('admin@agrox.org').catch(() => null);
      const baseAdmin: User = apiRes?.user || {
        id: 'admin-1',
        name: 'agroX Administrator',
        email: 'admin@agrox.org',
        phone: '+263 24 270 0000',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400',
        location: {
          country: 'Zimbabwe',
          province: 'Harare',
          city: 'Harare',
          address: 'agroX HQ, Agriculture House, Harare'
        },
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z'
      };

      const mergedAdmin: User = {
        ...baseAdmin,
        name: fsAdminData?.fullName || fsAdminData?.name || cachedAdmin?.name || baseAdmin.name,
        avatar: fsAdminData?.avatar || cachedAdmin?.avatar || baseAdmin.avatar,
        phone: fsAdminData?.phone || cachedAdmin?.phone || baseAdmin.phone,
        location: fsAdminData?.location || cachedAdmin?.location || baseAdmin.location
      };

      const token = apiRes?.token || 'token_admin-1';
      persistUserSession(mergedAdmin, token);
      api.setToken(token);

      // Sync merged admin avatar back to backend API store if different
      if (mergedAdmin.avatar !== baseAdmin.avatar || mergedAdmin.name !== baseAdmin.name) {
        api.updateUser('admin-1', { avatar: mergedAdmin.avatar, name: mergedAdmin.name, actingUserId: 'admin-1' }).catch(() => {});
      }

      setUser(mergedAdmin);
      setUserProfile({
        uid: 'admin-1',
        fullName: mergedAdmin.name,
        email: mergedAdmin.email,
        role: 'admin',
        phone: mergedAdmin.phone,
        avatar: mergedAdmin.avatar,
        location: mergedAdmin.location
      });
      return mergedAdmin;
    } finally {
      setLoading(false);
    }
  };

  // 5. Logout
  const logout = async (): Promise<void> => {
    clearUserSession();
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut error:', err);
    }
    api.setToken(null);
    setCurrentUser(null);
    setUserProfile(null);
    setUser(null);
    setNotifications([]);
    setFavorites([]);
    setUnreadMessagesCount(0);
  };

  // 5b. Permanent Account Deletion (Firebase Auth + Firestore + Storage + Backend Store)
  const deleteAccount = async (options?: { password?: string }): Promise<void> => {
    if (!user) {
      throw new Error('You must be signed in to delete your account.');
    }

    const targetUid = user.id;
    const isSeller = isSellerRole(user.role);

    // 1. Reauthenticate active Firebase Auth user if password was supplied
    const fbUser = auth.currentUser;
    if (fbUser && fbUser.email && options?.password) {
      const credential = EmailAuthProvider.credential(fbUser.email, options.password);
      try {
        await reauthenticateWithCredential(fbUser, credential);
      } catch (reauthErr: any) {
        if (reauthErr?.code === 'auth/wrong-password' || reauthErr?.code === 'auth/invalid-credential') {
          throw new Error('Incorrect password. Please re-enter your current password to confirm deletion.');
        }
        throw new Error(getFriendlyAuthErrorMessage(reauthErr));
      }
    }

    // 2. Farmer safety guard: check Firestore orders as well as backend orders for open transactions
    if (isSeller) {
      const farmerOrdersSnap = await getDocs(
        query(collection(db, 'orders'), where('farmerId', '==', targetUid))
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
            `Account deletion blocked: you still have ${activeOrderNumbers.length} active or unverified order(s) (${activeOrderNumbers.join(', ')}). Complete or cancel active buyer orders before deleting your account.`
          );
        }
      }
    }

    // 3. Enforce backend deletion + active-order guard + PII anonymization
    await api.deleteOwnAccount(targetUid);

    // 4. Clean up user's owned content & storage assets in Cloud Firestore & Firebase Storage
    try {
      const postsSnap = await getDocs(
        query(collection(db, 'mediaPosts'), where('farmerId', '==', targetUid))
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

      const collectionsToDelete: [string, string][] = [
        ['products', 'farmerId'],
        ['adRequests', 'farmerId'],
        ['buyerRequests', 'buyerId'],
        ['notifications', 'userId']
      ];

      for (const [colName, fieldName] of collectionsToDelete) {
        const snap = await getDocs(
          query(collection(db, colName), where(fieldName, '==', targetUid))
        ).catch(() => null);
        if (snap && !snap.empty) {
          for (const d of snap.docs) {
            await deleteDoc(d.ref).catch(() => {});
          }
        }
      }

      // 5. Anonymize completed/closed orders in Firestore without erasing transaction records
      const buyerOrdersSnap = await getDocs(
        query(collection(db, 'orders'), where('buyerId', '==', targetUid))
      ).catch(() => null);
      if (buyerOrdersSnap && !buyerOrdersSnap.empty) {
        for (const oDoc of buyerOrdersSnap.docs) {
          const data = oDoc.data() as any;
          await updateDoc(oDoc.ref, sanitizeForFirestore({
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
          })).catch(() => {});
        }
      }

      const sellerOrdersSnap = await getDocs(
        query(collection(db, 'orders'), where('farmerId', '==', targetUid))
      ).catch(() => null);
      if (sellerOrdersSnap && !sellerOrdersSnap.empty) {
        for (const oDoc of sellerOrdersSnap.docs) {
          await updateDoc(oDoc.ref, sanitizeForFirestore({
            farmerName: 'Former Producer',
            farmerPaymentDetails: null,
            updatedAt: serverTimestamp()
          })).catch(() => {});
        }
      }

      // 6. Write deletion tombstone & delete user profile document(s) in Cloud Firestore
      const cleanEmail = user.email?.trim() || '';
      await setDoc(doc(db, 'deletedAccounts', targetUid), {
        uid: targetUid,
        email: cleanEmail,
        emailLower: cleanEmail.toLowerCase(),
        deletedBy: 'self',
        reason: 'Self-service account deletion',
        deletedAt: serverTimestamp()
      }).catch(() => {});

      const userDocRef = doc(db, 'users', targetUid);
      await deleteDoc(userDocRef).catch(async () => {
        await setDoc(
          userDocRef,
          {
            uid: targetUid,
            fullName: 'Deleted User',
            email: '',
            phone: '',
            avatar: '',
            status: 'deleted',
            deletedAt: serverTimestamp()
          },
          { merge: true }
        ).catch(() => {});
      });

      const byUidDocs = await getDocs(
        query(collection(db, 'users'), where('uid', '==', targetUid))
      ).catch(() => null);
      if (byUidDocs && !byUidDocs.empty) {
        for (const d of byUidDocs.docs) {
          if (d.id !== targetUid) {
            await deleteDoc(d.ref).catch(() => {});
          }
        }
      }
    } catch (fsErr) {
      console.warn('Firestore cleanup partial warning during account deletion:', fsErr);
    }

    // 7. Delete Firebase Authentication account (handle requires-recent-login cleanly)
    if (fbUser && fbUser.uid === targetUid) {
      try {
        await deleteUser(fbUser);
      } catch (delAuthErr: any) {
        if (delAuthErr?.code === 'auth/requires-recent-login') {
          throw new Error(
            'For security, please enter your current password to confirm your identity before permanently deleting your Firebase login.'
          );
        }
        console.warn('Firebase Auth deleteUser warning:', delAuthErr);
      }
    }

    // 8. Sign out cleanly, clear local state & redirect notice
    clearPersistedUserSession(targetUid);
    try {
      localStorage.removeItem(`agrox_user_profile_${targetUid}`);
      localStorage.setItem('agrox_current_view', 'marketplace');
    } catch {}
    await logout();
    setAccountDeletionNotice(
      'Your FarmBridge account has been permanently deleted and your personal profile has been removed.'
    );
  };

  // 5. Password Reset
  const resetPassword = async (email: string): Promise<void> => {
    if (!email || !email.trim()) {
      throw new Error('Please enter a valid email address.');
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      console.error('Password reset error:', err);
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  };

  // 6. User Profile Update (locks protected full name & phone for non-admin users, confirms DB save before updating UI)
  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) {
      throw new Error('You must be signed in to update your profile.');
    }

    const isAdminUser = user.role === 'admin';
    if (!isAdminUser) {
      const incomingName = updates.name !== undefined ? updates.name.trim() : undefined;
      const incomingPhone = updates.phone !== undefined ? updates.phone.trim() : undefined;
      const nameChanged = incomingName !== undefined && incomingName !== (user.name || '').trim();
      const phoneChanged = incomingPhone !== undefined && incomingPhone !== (user.phone || '').trim();
      if (nameChanged || phoneChanged) {
        throw new Error('Full name and phone number are protected and can only be changed through FarmBridge Support.');
      }
    }

    try {
      const userDocRef = doc(db, 'users', user.id);
      const existingSnap = await getDoc(userDocRef).catch(() => null);

      // Build sanitized update payload keeping locked fields immutable for non-admin users
      const updatedUser: User = {
        ...user,
        ...updates,
        name: isAdminUser && updates.name ? updates.name.trim() : user.name,
        phone: isAdminUser && updates.phone !== undefined ? updates.phone.trim() : user.phone,
        avatar: updates.avatar || user.avatar,
        location: updates.location
          ? {
              ...(user.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' }),
              ...updates.location
            }
          : user.location,
        farmerProfile:
          isSellerRole(user.role) || updates.farmerProfile
            ? {
                ...(user.farmerProfile || {}),
                ...(updates.farmerProfile || {})
              }
            : user.farmerProfile,
        buyerProfile:
          user.role === 'buyer' || updates.buyerProfile
            ? {
                ...(user.buyerProfile || {}),
                ...(updates.buyerProfile || {})
              }
            : user.buyerProfile
      };

      // 1. Prepare Firestore document payload (never mutate locked name/phone/role on existing non-admin docs)
      const docExists = Boolean(existingSnap && existingSnap.exists());
      const existingData = docExists ? (existingSnap?.data() || {}) : {};
      const firestoreDocPayload: Record<string, any> = {
        uid: user.id,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        location: sanitizeForFirestore(updatedUser.location),
        updatedAt: serverTimestamp()
      };

      if (!docExists) {
        firestoreDocPayload.role = updatedUser.role;
        firestoreDocPayload.fullName = updatedUser.name;
        firestoreDocPayload.name = updatedUser.name;
        firestoreDocPayload.phone = updatedUser.phone || '';
        firestoreDocPayload.createdAt = serverTimestamp();
      } else if (isAdminUser) {
        firestoreDocPayload.role = updatedUser.role;
        firestoreDocPayload.fullName = updatedUser.name;
        firestoreDocPayload.name = updatedUser.name;
        firestoreDocPayload.phone = updatedUser.phone || '';
      } else if (existingData.role === undefined) {
        firestoreDocPayload.role = updatedUser.role;
      }

      if (isSellerRole(updatedUser.role) && updatedUser.farmerProfile) {
        firestoreDocPayload.farmerProfile = sanitizeForFirestore(updatedUser.farmerProfile);
      }
      if (updatedUser.role === 'buyer' && updatedUser.buyerProfile) {
        firestoreDocPayload.buyerProfile = sanitizeForFirestore(updatedUser.buyerProfile);
      }

      // 2. Confirm persistence against Backend API and Cloud Firestore BEFORE updating local state or showing success
      const apiUpdates: Partial<User> & { actingUserId: string } = {
        actingUserId: user.id,
        avatar: updatedUser.avatar,
        location: updatedUser.location,
        ...(isAdminUser ? { name: updatedUser.name, phone: updatedUser.phone } : {}),
        ...(updatedUser.farmerProfile ? { farmerProfile: updatedUser.farmerProfile } : {}),
        ...(updatedUser.buyerProfile ? { buyerProfile: updatedUser.buyerProfile } : {})
      };

      await Promise.all([
        setDoc(userDocRef, sanitizeForFirestore(firestoreDocPayload), { merge: true }),
        api.updateUser(user.id, apiUpdates)
      ]);

      if (currentUser && isAdminUser && updates.name) {
        await updateProfile(currentUser, { displayName: updates.name.trim() }).catch(() => {});
      }

      // 3. Persist locally and update React state immediately AFTER DB confirmation succeeds
      persistUserSession(updatedUser);
      setUser(updatedUser);
      setUserProfile({
        uid: user.id,
        fullName: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        location: updatedUser.location,
        farmerProfile: updatedUser.farmerProfile,
        buyerProfile: updatedUser.buyerProfile
      });
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      throw new Error(getFriendlyAuthErrorMessage(err));
    }
  };

  const toggleFavorite = async (productId: string): Promise<boolean> => {
    if (!user) return false;
    const res = await api.toggleFavorite(user.id, productId);
    setFavorites(res.favoriteIds);
    return res.isFavorite;
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await Promise.all([
      api.markNotificationRead(id).catch(() => {}),
      markFirebaseNotificationRead(id).catch(() => {})
    ]);
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await Promise.all([
      api.markAllNotificationsRead(user.id).catch(() => {}),
      markAllFirebaseNotificationsRead(user.id).catch(() => {})
    ]);
  };

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  const isEmailVerified = !user
    ? false
    : currentUser
      ? Boolean(currentUser.emailVerified)
      : user.status !== 'pending_verification' && user.emailVerified !== false;
  const requiresEmailVerification = Boolean(user && !isEmailVerified);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user,
        userProfile,
        loading,
        isEmailVerified,
        requiresEmailVerification,
        lastVerificationError,
        suspensionNotice,
        clearSuspensionNotice,
        accountDeletionNotice,
        clearAccountDeletionNotice,
        unreadNotifsCount,
        unreadMessagesCount,
        notifications,
        favorites,
        signup,
        login,
        loginAdmin,
        logout,
        deleteAccount,
        resetPassword,
        sendVerificationEmail,
        checkEmailVerification,
        updatePendingEmail,
        register,
        updateUserProfile,
        refreshUserData: async () => {
          await syncUserProfile(currentUser);
        },
        toggleFavorite,
        markNotificationAsRead,
        markAllNotificationsAsRead
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
