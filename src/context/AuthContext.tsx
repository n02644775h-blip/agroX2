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
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getFriendlyAuthErrorMessage } from '../firebase/authErrors';
import { User, UserRole, Notification } from '../types';
import { api } from '../services/api';

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
  login: (email: string, password: string) => Promise<User>;
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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

  // Helper to fetch or synchronize Firestore user profile document with app user state
  const syncUserProfile = async (fbUser: FirebaseUser | null): Promise<User | null> => {
    if (!fbUser) {
      setUser(null);
      setUserProfile(null);
      setNotifications([]);
      setFavorites([]);
      setUnreadMessagesCount(0);
      return null;
    }

    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      let profileData: UserProfileData;

      if (userSnap.exists()) {
        profileData = userSnap.data() as UserProfileData;
      } else {
        // Create initial Firestore document if user signed in without doc
        profileData = {
          uid: fbUser.uid,
          fullName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email: fbUser.email || '',
          role: 'buyer',
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
          location: {
            country: 'Zimbabwe',
            province: 'Harare',
            city: 'Harare'
          },
          createdAt: serverTimestamp()
        };
        await setDoc(userDocRef, profileData, { merge: true });
      }

      setUserProfile(profileData);

      // Build unified User model for marketplace interoperability
      const unifiedUser: User = {
        id: fbUser.uid,
        name: profileData.fullName || fbUser.displayName || 'Marketplace User',
        email: fbUser.email || profileData.email || '',
        phone: profileData.phone || '',
        role: profileData.role || 'buyer',
        avatar: profileData.avatar || fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
        location: profileData.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
        status: 'active',
        createdAt: typeof profileData.createdAt === 'string' ? profileData.createdAt : new Date().toISOString(),
        farmerProfile: profileData.farmerProfile,
        buyerProfile: profileData.buyerProfile
      };

      setUser(unifiedUser);

      // Also ensure in-memory store in local session has this user for backend queries
      api.setToken(`fb_${fbUser.uid}`);

      // Fetch related user activity: notifications, favorites, and messages
      try {
        const notifs = await api.getNotifications(fbUser.uid).catch(() => []);
        setNotifications(notifs);

        const favProducts = await api.getFavorites(fbUser.uid).catch(() => []);
        setFavorites(favProducts.map(p => p.id));

        const convs = await api.getConversations(fbUser.uid).catch(() => []);
        const unreadMsgs = (convs || []).reduce((acc: number, c) => acc + (c.unreadCountFor?.[fbUser.uid] || 0), 0);
        setUnreadMessagesCount(unreadMsgs);
      } catch (err) {
        console.warn('Could not load user secondary records:', err);
      }

      return unifiedUser;
    } catch (error) {
      console.error('Error synchronizing user profile from Firestore:', error);
      return null;
    }
  };

  // Listen to Firebase Authentication state changes across refresh & tab reload
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setCurrentUser(fbUser);
      if (fbUser) {
        await syncUserProfile(fbUser);
      } else {
        // Fallback check if user is using demo mock login mode
        const { user: currentApiUser } = await api.getMe().catch(() => ({ user: null }));
        if (currentApiUser && !fbUser) {
          setUser(currentApiUser);
          setUserProfile({
            uid: currentApiUser.id,
            fullName: currentApiUser.name,
            email: currentApiUser.email,
            role: currentApiUser.role,
            phone: currentApiUser.phone,
            avatar: currentApiUser.avatar,
            location: currentApiUser.location,
            farmerProfile: currentApiUser.farmerProfile,
            buyerProfile: currentApiUser.buyerProfile
          });
        } else {
          setUser(null);
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. User Registration / Signup
  const signup = async (
    fullName: string,
    email: string,
    password: string,
    additionalData?: Partial<UserProfileData>
  ): Promise<User> => {
    setLoading(true);
    try {
      // 1. Create account with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = userCredential.user;

      // 2. Set Firebase Auth display name
      if (fullName) {
        await updateProfile(fbUser, { displayName: fullName });
      }

      // 3. Create Firestore document at users/{uid}
      const role: UserRole = additionalData?.role || 'buyer';
      const defaultAvatar = role === 'farmer'
        ? 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';

      const initialDocData: UserProfileData = {
        uid: fbUser.uid,
        fullName: fullName.trim(),
        email: fbUser.email || email.trim(),
        role: role,
        avatar: additionalData?.avatar || defaultAvatar,
        phone: additionalData?.phone || '',
        location: additionalData?.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
        farmerProfile: role === 'farmer' ? (additionalData?.farmerProfile || {
          farmName: `${fullName}'s Farm`,
          bio: 'Local agricultural producer dedicated to fresh produce.',
          farmingMethods: ['Organic Compost', 'Drip Irrigation'],
          establishedYear: new Date().getFullYear(),
          isVerified: true
        }) : undefined,
        buyerProfile: role === 'buyer' ? (additionalData?.buyerProfile || {
          preferredDeliveryAddress: '',
          favoriteCategories: [],
          totalOrdersPlaced: 0
        }) : undefined,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', fbUser.uid), initialDocData);

      // 4. Sync in app store
      const unified = await syncUserProfile(fbUser);
      if (!unified) throw new Error('Failed to load user profile after registration.');
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
        // Firebase Authentication login with email & password
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const unified = await syncUserProfile(userCredential.user);
        if (!unified) throw new Error('Unable to retrieve user record.');
        return unified;
      } else {
        // Fallback demo/mock login path
        const res = await api.login(email);
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

  // 4. Logout
  const logout = async (): Promise<void> => {
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
    if (target === 'farmer' || target === 'farmer-1') {
      targetEmail = 'tendai.moyo@greenfields.co.zw';
    } else if (target === 'farmer-2') {
      targetEmail = 'chipo@sunrisepoultry.co.zw';
    } else if (target === 'buyer' || target === 'buyer-1') {
      targetEmail = 'grace.chidzero@gmail.com';
    } else if (target === 'buyer-2') {
      targetEmail = 'kuda.restocatering@gmail.com';
    } else if (target === 'admin' || target === 'admin-1') {
      targetEmail = 'admin@agrox.org';
    } else {
      targetEmail = target;
    }

    try {
      // Try demo in-memory session or fallback
      const res = await api.login(targetEmail);
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
    } catch (err) {
      console.error('Demo switch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // 6. User Profile Update
  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      if (currentUser) {
        // Update Firestore document at users/{uid}
        const userDocRef = doc(db, 'users', currentUser.uid);
        const firestoreUpdates: Record<string, any> = {
          updatedAt: serverTimestamp()
        };

        if (updates.name) firestoreUpdates.fullName = updates.name.trim();
        if (updates.phone !== undefined) firestoreUpdates.phone = updates.phone;
        if (updates.avatar) firestoreUpdates.avatar = updates.avatar;
        if (updates.location) firestoreUpdates.location = updates.location;
        if (updates.farmerProfile) firestoreUpdates.farmerProfile = updates.farmerProfile;
        if (updates.buyerProfile) firestoreUpdates.buyerProfile = updates.buyerProfile;

        await updateDoc(userDocRef, firestoreUpdates);

        if (updates.name) {
          await updateProfile(currentUser, { displayName: updates.name.trim() });
        }
      }

      // Also update local API store
      const updated = await api.updateUser(user.id, updates).catch(() => ({ ...user, ...updates }));
      setUser(updated);
      setUserProfile(prev => prev ? {
        ...prev,
        fullName: updates.name || prev.fullName,
        phone: updates.phone || prev.phone,
        avatar: updates.avatar || prev.avatar,
        location: updates.location || prev.location
      } : null);
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
