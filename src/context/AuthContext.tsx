import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getFriendlyAuthErrorMessage } from '../firebase/authErrors';
import { User, UserRole, Notification } from '../types';
import { api } from '../services/api';
import {
  persistUserSession,
  getPersistedUserSession,
  clearUserSession,
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
        !(value?.constructor?.name === 'FieldValue')
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

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

    try {
      // 1. Check local cached user profile first
      let localCachedUser: User | null = null;
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
      const userSnap = await getDoc(userDocRef).catch(err => {
        console.warn('Firestore getDoc warning:', err);
        return null;
      });

      let profileData: UserProfileData;

      if (userSnap && userSnap.exists()) {
        const fsData = userSnap.data() as UserProfileData;
        // Merge giving local edits priority so recently saved farm profile changes are preserved
        profileData = {
          uid,
          fullName: localCachedUser?.name || fsData.fullName || fbUser?.displayName || 'Producer User',
          email: fsData.email || localCachedUser?.email || fbUser?.email || `${uid}@agrox.org`,
          role: (localCachedUser?.role || fsData.role || (uid.startsWith('farmer') ? 'farmer' : uid.startsWith('admin') ? 'admin' : 'buyer')) as UserRole,
          phone: localCachedUser?.phone || fsData.phone || '',
          avatar: localCachedUser?.avatar || fsData.avatar || fbUser?.photoURL || '',
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

        const role: UserRole = baseUser.role || (uid.startsWith('farmer') ? 'farmer' : uid.startsWith('admin') ? 'admin' : 'buyer');
        const defaultAvatar = role === 'farmer'
          ? 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';

        const initialProfile: Record<string, any> = {
          uid: uid,
          fullName: baseUser.name || fbUser?.displayName || (role === 'farmer' ? 'Tendai Moyo' : 'Marketplace User'),
          email: baseUser.email || fbUser?.email || `${uid}@agrox.org`,
          role: role,
          phone: baseUser.phone || (role === 'farmer' ? '+263 77 210 4930' : ''),
          avatar: baseUser.avatar || fbUser?.photoURL || defaultAvatar,
          location: baseUser.location || {
            country: 'Zimbabwe',
            province: 'Harare',
            city: 'Harare',
            community: 'Direct Market'
          },
          createdAt: serverTimestamp()
        };

        if (role === 'farmer') {
          initialProfile.farmerProfile = baseUser.farmerProfile || {
            farmName: `${initialProfile.fullName}'s Farm`,
            bio: 'Local agricultural producer offering fresh, high quality farm produce.',
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
        status: 'active',
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
      console.error('Error synchronizing user profile from Firestore:', error);
      if (localCachedUser) {
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
        await syncUserProfile(fbUser);
      } else {
        // Firebase has no active session or returned null.
        // Check our multi-layer session storage:
        const currentPersisted = getPersistedUserSession();
        const activeUid = currentPersisted?.id || localStorage.getItem('agrox_active_uid') || getCookie('agrox_uid');

        if (activeUid) {
          const synced = await syncUserProfile(null, activeUid);
          if (synced) {
            setLoading(false);
            return;
          } else if (currentPersisted) {
            // Keep the persisted user - do NOT log out!
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
        }

        // Fallback check if server session has a logged-in user
        const { user: currentApiUser } = await api.getMe().catch(() => ({ user: null }));
        if (currentApiUser) {
          await syncUserProfile(null, currentApiUser.id);
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
        syncUserProfile(null, refreshedUser.id);
      }
    };
    window.addEventListener('agrox_storage_access_granted', handleStorageAccessGranted);

    return () => {
      unsubscribe();
      window.removeEventListener('agrox_storage_access_granted', handleStorageAccessGranted);
    };
  }, []);

  // 1. User Registration / Signup
  const signup = async (
    fullName: string,
    email: string,
    password: string,
    additionalData?: Partial<UserProfileData>
  ): Promise<User> => {
    setLoading(true);
    const role: UserRole = additionalData?.role || 'buyer';
    const defaultAvatar = role === 'farmer'
      ? 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';

    try {
      // 1. Attempt creating account with Firebase Authentication
      let uid: string;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = userCredential.user;
        uid = fbUser.uid;
        if (fullName) {
          await updateProfile(fbUser, { displayName: fullName }).catch(() => {});
        }
      } catch (authErr: any) {
        // If Email/Password auth provider is not toggled on in Firebase Console yet,
        // create account directly in Cloud Firestore so registration succeeds seamlessly!
        if (authErr.code === 'auth/operation-not-allowed' || authErr.code === 'auth/admin-restricted-operation') {
          console.warn('Firebase Email/Password provider not enabled in console, using direct Firestore account setup');
          uid = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
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
        location: additionalData?.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
        createdAt: serverTimestamp()
      };

      if (role === 'farmer') {
        initialDocData.farmerProfile = additionalData?.farmerProfile || {
          farmName: `${fullName}'s Farm`,
          bio: 'Local agricultural producer dedicated to fresh produce.',
          farmingMethods: ['Organic Compost', 'Drip Irrigation'],
          establishedYear: new Date().getFullYear(),
          isVerified: true
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

      // Register in backend mock store as well for offline fallback queries
      await api.register({
        name: fullName.trim(),
        email: email.trim(),
        role: role,
        phone: additionalData?.phone || '',
        location: additionalData?.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
        farmerProfile: initialDocData.farmerProfile,
        buyerProfile: initialDocData.buyerProfile
      }).catch(() => {});

      // 3. Sync in app state
      const unified = await syncUserProfile(auth.currentUser, uid);
      if (!unified) {
        // Immediate fallback user object
        const fallbackUser: User = {
          id: uid,
          name: fullName.trim(),
          email: email.trim(),
          phone: additionalData?.phone || '',
          role: role,
          avatar: additionalData?.avatar || defaultAvatar,
          location: additionalData?.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
          status: 'active',
          createdAt: new Date().toISOString(),
          farmerProfile: initialDocData.farmerProfile,
          buyerProfile: initialDocData.buyerProfile
        };
        setUser(fallbackUser);
        setUserProfile(initialDocData);
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
    try {
      if (password) {
        // Attempt Firebase Authentication login with email & password
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
          const unified = await syncUserProfile(userCredential.user);
          if (!unified) throw new Error('Unable to retrieve user record.');
          return unified;
        } catch (authErr: any) {
          // If Email/Password is not enabled in Firebase Console, fallback to Firestore search or api store
          if (authErr.code === 'auth/operation-not-allowed' || authErr.code === 'auth/admin-restricted-operation') {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', email.trim()));
            const querySnap = await getDocs(q);

            if (!querySnap.empty) {
              const docSnap = querySnap.docs[0];
              const uid = docSnap.id;
              localStorage.setItem('agrox_active_uid', uid);
              const unified = await syncUserProfile(null, uid);
              if (unified) return unified;
            }

            // Also check api mock store
            const res = await api.login(email.trim()).catch(() => null);
            if (res?.user) {
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
        const res = await api.login(email);
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
      const res = await api.login('admin@agrox.org');
      persistUserSession(res.user, res.token);
      setUser(res.user);
      setUserProfile({
        uid: res.user.id,
        fullName: res.user.name,
        email: res.user.email,
        role: 'admin',
        phone: res.user.phone,
        avatar: res.user.avatar,
        location: res.user.location
      });
      return res.user;
    } catch (err: any) {
      // Fallback admin user object if server mock API is offline
      const adminFallbackUser: User = {
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
      persistUserSession(adminFallbackUser, 'token_admin-1');
      setUser(adminFallbackUser);
      setUserProfile({
        uid: 'admin-1',
        fullName: adminFallbackUser.name,
        email: adminFallbackUser.email,
        role: 'admin',
        phone: adminFallbackUser.phone,
        avatar: adminFallbackUser.avatar,
        location: adminFallbackUser.location
      });
      api.setToken('token_admin-1');
      return adminFallbackUser;
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
    let targetEmail = 'grace.chidzero@gmail.com';
    let targetId = 'buyer-1';
    if (target === 'farmer' || target === 'farmer-1') {
      targetEmail = 'tendai.moyo@greenfields.co.zw';
      targetId = 'farmer-1';
    } else if (target === 'farmer-2') {
      targetEmail = 'chipo@sunrisepoultry.co.zw';
      targetId = 'farmer-2';
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
      const res = await api.login(targetEmail).catch(() => null);
      if (res?.user) {
        persistUserSession(res.user, res.token);
        await syncUserProfile(null, res.user.id);
      } else {
        await syncUserProfile(null, targetId);
      }
    } catch (err) {
      console.error('Demo switch failed:', err);
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
        farmerProfile: (user.role === 'farmer' || updates.farmerProfile) ? {
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

      if (updatedUser.role === 'farmer' && updatedUser.farmerProfile) {
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
