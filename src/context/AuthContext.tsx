import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
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
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getFriendlyAuthErrorMessage } from '../firebase/authErrors';
import { checkFirestoreUserSuspended } from '../services/firebaseUsers';
import { User, UserRole, Notification, isSellerRole } from '../types';
import { api } from '../services/api';

const SUSPENDED_ACCOUNT_MESSAGE =
  'Your account has been suspended by the agroX administration. Please contact support at admin@agrox.co.zw for assistance.';

function createSuspendedError(message: string = SUSPENDED_ACCOUNT_MESSAGE): Error & { code?: string } {
  const err = new Error(message) as Error & { code?: string };
  err.name = 'AccountSuspendedError';
  err.code = 'auth/account-suspended';
  return err;
}

function isSuspendedError(err: any): boolean {
  return (
    err?.name === 'AccountSuspendedError' ||
    err?.code === 'auth/account-suspended' ||
    (typeof err?.message === 'string' && err.message.toLowerCase().includes('account has been suspended'))
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
  phoneVerified?: boolean;
  verificationMethod?: 'email' | 'phone';
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
  suspensionNotice: string | null;
  clearSuspensionNotice: () => void;
  unreadNotifsCount: number;
  unreadMessagesCount: number;
  notifications: Notification[];
  favorites: string[];
  signup: (fullName: string, email: string, password: string, additionalData?: Partial<UserProfileData>) => Promise<User>;
  login: (email: string, password?: string) => Promise<User>;
  loginAdmin: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  register: (userData: Partial<User>) => Promise<void>; // Backward-compatible alias
  switchDemoRole: (role: UserRole | string) => Promise<void>;
  demoLogin: (role: UserRole | string) => Promise<void>;
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
  const [suspensionNotice, setSuspensionNotice] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

  const clearSuspensionNotice = () => setSuspensionNotice(null);

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
    const [fsSuspended, apiStatus] = await Promise.all([
      checkFirestoreUserSuspended(uid, email),
      api.checkUserStatus({ uid, email }).catch(() => ({ suspended: false, status: 'unknown' }))
    ]);

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
      let userStatus: 'active' | 'suspended' = 'active';

      if (userSnap && userSnap.exists()) {
        const fsData = userSnap.data() as any;

        // Double-check document status directly
        if (fsData.status === 'suspended') {
          console.warn(`User ${uid} is suspended in Firestore. Denying access.`);
          await forceRevokeSuspendedSession(uid);
          throw createSuspendedError();
        }

        userStatus = fsData.status || 'active';

        // Merge giving local edits priority so recently saved farm profile changes are preserved
        const resolvedRole = (
          localCachedUser?.role ||
          fsData.role ||
          (uid.startsWith('supplier') ? 'fodder_supplier' : uid.startsWith('farmer') ? 'farmer' : uid.startsWith('admin') ? 'admin' : 'buyer')
        ) as UserRole;

        profileData = {
          uid,
          fullName: localCachedUser?.name || fsData.fullName || fbUser?.displayName || 'Producer User',
          email: fsData.email || localCachedUser?.email || fbUser?.email || `${uid}@agrox.org`,
          role: resolvedRole,
          phone: localCachedUser?.phone || fsData.phone || '',
          avatar: localCachedUser?.avatar || fsData.avatar || fbUser?.photoURL || '',
          emailVerified: Boolean(localCachedUser?.emailVerified ?? fsData.emailVerified),
          phoneVerified: Boolean(localCachedUser?.phoneVerified ?? fsData.phoneVerified),
          verificationMethod: localCachedUser?.verificationMethod || fsData.verificationMethod,
          location: {
            country: 'Zimbabwe',
            province: 'Harare',
            city: 'Harare',
            ...(fsData.location || {}),
            ...(localCachedUser?.location || {})
          },
          farmerProfile: {
            ...(fsData.farmerProfile || {}),
            ...(localCachedUser?.farmerProfile || {})
          },
          buyerProfile: {
            ...(fsData.buyerProfile || {}),
            ...(localCachedUser?.buyerProfile || {})
          }
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

        const role: UserRole = baseUser.role || (uid.startsWith('supplier') ? 'fodder_supplier' : uid.startsWith('farmer') ? 'farmer' : uid.startsWith('admin') ? 'admin' : 'buyer');
        const defaultAvatar = isSellerRole(role)
          ? 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';

        const initialProfile: Record<string, any> = {
          uid: uid,
          fullName: baseUser.name || fbUser?.displayName || (role === 'fodder_supplier' ? 'Tawanda Gumbo' : role === 'farmer' ? 'Tendai Moyo' : 'Marketplace User'),
          email: baseUser.email || fbUser?.email || `${uid}@agrox.org`,
          role: role,
          phone: baseUser.phone || (isSellerRole(role) ? '+263 77 210 4930' : ''),
          avatar: baseUser.avatar || fbUser?.photoURL || defaultAvatar,
          emailVerified: Boolean(baseUser.emailVerified),
          phoneVerified: Boolean(baseUser.phoneVerified),
          verificationMethod: baseUser.verificationMethod,
          location: baseUser.location || {
            country: 'Zimbabwe',
            province: 'Harare',
            city: 'Harare',
            community: 'Direct Market'
          },
          status: 'active',
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
        emailVerified: Boolean(profileData.emailVerified ?? localCachedUser?.emailVerified),
        phoneVerified: Boolean(profileData.phoneVerified ?? localCachedUser?.phoneVerified),
        verificationMethod: profileData.verificationMethod || localCachedUser?.verificationMethod,
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
        'Notice: Your account has been suspended by the agroX administration. Please contact support at admin@agrox.co.zw for appeal.'
      );
    };

    const activeUserDocRef = doc(db, 'users', user.id);
    const statusUnsubById = onSnapshot(
      activeUserDocRef,
      (snap) => {
        if (snap.exists() && snap.data()?.status === 'suspended') {
          handleRealtimeSuspension();
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
            if (d.data()?.status === 'suspended') {
              handleRealtimeSuspension();
              break;
            }
          }
        },
        () => {}
      );
    }

    return () => {
      statusUnsubById();
      if (statusUnsubByEmail) statusUnsubByEmail();
    };
  }, [user?.id, user?.email]);

  // 1. User Registration / Signup
  const signup = async (
    fullName: string,
    email: string,
    password: string,
    additionalData?: Partial<UserProfileData>
  ): Promise<User> => {
    setLoading(true);
    setSuspensionNotice(null);
    const role: UserRole = additionalData?.role || 'buyer';
    const isSeller = isSellerRole(role);
    const defaultAvatar = isSeller
      ? 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';

    try {
      // Prevent suspended users from creating a duplicate account with the same email
      await enforceNotSuspended(null, email.trim());

      // 1. Attempt creating account with Firebase Authentication
      let uid: string;
      let createdFbUser: FirebaseUser | null = null;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        createdFbUser = userCredential.user;
        uid = createdFbUser.uid;
        if (fullName) {
          await updateProfile(createdFbUser, { displayName: fullName }).catch(() => {});
        }
        if (additionalData?.verificationMethod === 'email') {
          await sendEmailVerification(createdFbUser).catch(() => {});
        }
      } catch (authErr: any) {
        // If Email/Password auth provider is not toggled on in Firebase Console yet,
        // create account directly in Cloud Firestore so registration succeeds seamlessly!
        if (authErr.code === 'auth/operation-not-allowed' || authErr.code === 'auth/admin-restricted-operation') {
          console.warn('Firebase Email/Password provider not enabled in console, using direct Firestore account setup');
          uid = (role === 'fodder_supplier' ? 'sup_' : 'usr_') + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
          localStorage.setItem('agrox_active_uid', uid);
        } else {
          throw authErr;
        }
      }

      // 2. Create Firestore document at users/{uid}
      const initialDocData: Record<string, any> = {
        uid: uid,
        fullName: fullName.trim(),
        email: email.trim(),
        role: role,
        avatar: additionalData?.avatar || defaultAvatar,
        phone: additionalData?.phone || '',
        emailVerified: Boolean(additionalData?.emailVerified),
        phoneVerified: Boolean(additionalData?.phoneVerified),
        verificationMethod: additionalData?.verificationMethod,
        location: additionalData?.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
        status: 'active',
        createdAt: serverTimestamp()
      };

      if (isSeller) {
        initialDocData.farmerProfile = additionalData?.farmerProfile || {
          farmName: role === 'fodder_supplier' ? `${fullName}'s Fodder Supply` : `${fullName}'s Farm`,
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

      // Register in backend store as well for offline/direct API queries
      await api.register({
        name: fullName.trim(),
        email: email.trim(),
        role: role,
        phone: additionalData?.phone || '',
        emailVerified: Boolean(additionalData?.emailVerified),
        phoneVerified: Boolean(additionalData?.phoneVerified),
        verificationMethod: additionalData?.verificationMethod,
        location: additionalData?.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
        farmerProfile: initialDocData.farmerProfile,
        buyerProfile: initialDocData.buyerProfile
      }).catch(() => {});

      // 3. Sync in app state
      const unified = await syncUserProfile(createdFbUser || auth.currentUser, uid);
      if (!unified) {
        const fallbackUser: User = {
          id: uid,
          name: fullName.trim(),
          email: email.trim(),
          phone: additionalData?.phone || '',
          role: role,
          avatar: additionalData?.avatar || defaultAvatar,
          location: additionalData?.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
          status: 'active',
          emailVerified: Boolean(additionalData?.emailVerified),
          phoneVerified: Boolean(additionalData?.phoneVerified),
          verificationMethod: additionalData?.verificationMethod,
          createdAt: new Date().toISOString(),
          farmerProfile: initialDocData.farmerProfile,
          buyerProfile: initialDocData.buyerProfile
        };
        persistUserSession(fallbackUser);
        setUser(fallbackUser);
        setUserProfile(initialDocData as UserProfileData);
        return fallbackUser;
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
        // Attempt Firebase Authentication login with email & password
        try {
          const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
          const unified = await syncUserProfile(userCredential.user);
          if (!unified) throw new Error('Unable to retrieve user record.');
          return unified;
        } catch (authErr: any) {
          if (isSuspendedError(authErr)) {
            throw authErr;
          }

          // If Email/Password is not enabled in Firebase Console, fallback to Firestore search or api store
          if (authErr.code === 'auth/operation-not-allowed' || authErr.code === 'auth/admin-restricted-operation') {
            const usersRef = collection(db, 'users');
            const emailCandidates = Array.from(new Set([cleanEmail, cleanEmail.toLowerCase()]));
            for (const candidate of emailCandidates) {
              const q = query(usersRef, where('email', '==', candidate));
              const querySnap = await getDocs(q);

              if (!querySnap.empty) {
                for (const d of querySnap.docs) {
                  if (d.data()?.status === 'suspended') {
                    await forceRevokeSuspendedSession(d.id);
                    throw createSuspendedError();
                  }
                }
                const docSnap = querySnap.docs[0];
                const uid = docSnap.id;
                const unified = await syncUserProfile(null, uid);
                if (unified) {
                  localStorage.setItem('agrox_active_uid', uid);
                  return unified;
                }
              }
            }

            // Also check api mock store
            const res = await api.login(cleanEmail).catch((err) => {
              if (err?.message?.toLowerCase().includes('suspended')) {
                throw createSuspendedError(err.message);
              }
              return null;
            });
            if (res?.user) {
              if (res.user.status === 'suspended') {
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

            throw new Error('Account not found. Please create an account to get started.');
          } else {
            throw authErr;
          }
        }
      } else {
        // Demo/mock login path
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

      // Sync merged admin avatar back to backend API store if different
      if (mergedAdmin.avatar !== baseAdmin.avatar || mergedAdmin.name !== baseAdmin.name) {
        api.updateUser('admin-1', { avatar: mergedAdmin.avatar, name: mergedAdmin.name }).catch(() => {});
      }

      const token = apiRes?.token || 'token_admin-1';
      persistUserSession(mergedAdmin, token);
      api.setToken(token);
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

  // Demo Switcher for fast testing
  const switchDemoRole = async (target: string) => {
    setLoading(true);
    setSuspensionNotice(null);
    let targetEmail = 'grace.chidzero@gmail.com';
    let targetId = 'buyer-1';
    if (target === 'farmer' || target === 'farmer-1') {
      targetEmail = 'tendai.moyo@greenfields.co.zw';
      targetId = 'farmer-1';
    } else if (target === 'farmer-2') {
      targetEmail = 'chipo@sunrisepoultry.co.zw';
      targetId = 'farmer-2';
    } else if (target === 'fodder_supplier' || target === 'supplier-1') {
      targetEmail = 'tawanda@greenbale.co.zw';
      targetId = 'supplier-1';
    } else if (target === 'buyer' || target === 'buyer-1') {
      targetEmail = 'grace.chidzero@gmail.com';
      targetId = 'buyer-1';
    } else if (target === 'buyer-2') {
      targetEmail = 'kuda.restocatering@gmail.com';
      targetId = 'buyer-2';
    } else if (target === 'admin' || target === 'admin-1') {
      targetEmail = 'admin@agrox.org';
      targetId = 'admin-1';
    } else {
      targetEmail = target;
      targetId = target;
    }

    try {
      await enforceNotSuspended(targetId, targetEmail);
      const res = await api.login(targetEmail).catch((err) => {
        if (err?.message?.toLowerCase().includes('suspended')) {
          throw createSuspendedError(err.message);
        }
        return null;
      });
      if (res?.user) {
        if (res.user.status === 'suspended') {
          await forceRevokeSuspendedSession(res.user.id);
          throw createSuspendedError();
        }
        await enforceNotSuspended(res.user.id, res.user.email);
        persistUserSession(res.user, res.token);
        await syncUserProfile(null, res.user.id);
      } else {
        await syncUserProfile(null, targetId);
      }
    } catch (err: any) {
      console.error('Demo switch failed:', err);
      if (isSuspendedError(err)) {
        throw err;
      }
      await syncUserProfile(null, targetId);
    } finally {
      setLoading(false);
    }
  };

  // 6. User Profile Update
  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.id);

      // Deeply merge into updated user object
      const updatedUser: User = {
        ...user,
        ...updates,
        name: updates.name ? updates.name.trim() : user.name,
        phone: updates.phone !== undefined ? updates.phone.trim() : user.phone,
        avatar: updates.avatar || user.avatar,
        location: updates.location ? {
          ...(user.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' }),
          ...updates.location
        } : user.location,
        farmerProfile: (isSellerRole(user.role) || updates.farmerProfile) ? {
          ...(user.farmerProfile || {}),
          ...(updates.farmerProfile || {})
        } : user.farmerProfile,
        buyerProfile: (user.role === 'buyer' || updates.buyerProfile) ? {
          ...(user.buyerProfile || {}),
          ...(updates.buyerProfile || {})
        } : user.buyerProfile
      };

      // 1. Immediately save to persistent multi-layer storage (cookies, localStorage, sessionStorage)
      persistUserSession(updatedUser);

      // 2. Prepare comprehensive Firestore document payload
      const firestoreDocPayload: Record<string, any> = {
        uid: user.id,
        fullName: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone || '',
        avatar: updatedUser.avatar,
        location: sanitizeForFirestore(updatedUser.location),
        updatedAt: serverTimestamp()
      };

      if (isSellerRole(updatedUser.role) && updatedUser.farmerProfile) {
        firestoreDocPayload.farmerProfile = sanitizeForFirestore(updatedUser.farmerProfile);
      }
      if (updatedUser.role === 'buyer' && updatedUser.buyerProfile) {
        firestoreDocPayload.buyerProfile = sanitizeForFirestore(updatedUser.buyerProfile);
      }

      // 3. Write to Firestore using setDoc with merge: true (creates or updates reliably)
      await setDoc(userDocRef, sanitizeForFirestore(firestoreDocPayload), { merge: true }).catch(err => {
        console.warn('Could not write profile to Firestore, relying on local persistence:', err);
      });

      if (currentUser && updates.name) {
        await updateProfile(currentUser, { displayName: updates.name.trim() }).catch(() => {});
      }

      // 4. Update backend API store
      await api.updateUser(user.id, updatedUser).catch(err => {
        console.warn('API store user update warning:', err);
      });

      // 5. Update local React state
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
    await api.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    await api.markAllNotificationsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        user,
        userProfile,
        loading,
        suspensionNotice,
        clearSuspensionNotice,
        unreadNotifsCount,
        unreadMessagesCount,
        notifications,
        favorites,
        signup,
        login,
        loginAdmin,
        logout,
        resetPassword,
        register,
        switchDemoRole,
        demoLogin: switchDemoRole,
        updateUserProfile,
        refreshUserData: () => syncUserProfile(currentUser),
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
