import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Notification } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  unreadNotifsCount: number;
  unreadMessagesCount: number;
  notifications: Notification[];
  favorites: string[];
  login: (email: string, password?: string) => Promise<void>;
  register: (userData: Partial<User>) => Promise<void>;
  logout: () => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

  const fetchUserData = async () => {
    try {
      const { user: currentUser } = await api.getMe();
      if (currentUser) {
        setUser(currentUser);
        // Load notifications
        const notifs = await api.getNotifications(currentUser.id).catch(() => []);
        setNotifications(notifs);

        // Load favorites
        const favProducts = await api.getFavorites(currentUser.id).catch(() => []);
        setFavorites(favProducts.map(p => p.id));

        // Load conversations unread count
        const convs = await api.getConversations(currentUser.id).catch(() => []);
        const unreadMsgs = (convs || []).reduce((acc: number, c) => acc + (c.unreadCountFor?.[currentUser.id] || 0), 0);
        setUnreadMessagesCount(unreadMsgs);
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    // Poll notifications & message pings periodically
    const interval = setInterval(fetchUserData, 15000);
    return () => clearInterval(interval);
  }, []);

  const login = async (email: string) => {
    setLoading(true);
    try {
      const res = await api.login(email);
      setUser(res.user);
      await fetchUserData();
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: Partial<User>) => {
    setLoading(true);
    try {
      const res = await api.register(userData);
      setUser(res.user);
      await fetchUserData();
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setNotifications([]);
    setFavorites([]);
    setUnreadMessagesCount(0);
  };

  const switchDemoRole = async (target: string) => {
    setLoading(true);
    let targetEmail = 'buyer-1';
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
      const res = await api.login(targetEmail);
      setUser(res.user);
      await fetchUserData();
    } catch (err) {
      console.error('Demo switch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return;
    const updated = await api.updateUser(user.id, updates);
    setUser(updated);
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
        user,
        loading,
        unreadNotifsCount,
        unreadMessagesCount,
        notifications,
        favorites,
        login,
        register,
        logout,
        switchDemoRole,
        demoLogin: switchDemoRole,
        updateUserProfile,
        refreshUserData: fetchUserData,
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
