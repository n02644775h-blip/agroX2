import React, { useState, useEffect } from 'react';
import { Announcement } from '../types';
import { api } from '../services/api';
import { subscribeToFirebaseAnnouncements } from '../services/firebaseAnnouncements';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Bell, X, ShieldAlert } from 'lucide-react';

export const AnnouncementsBanner: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_announcements') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    // Real-time Firestore subscription
    const unsubscribe = subscribeToFirebaseAnnouncements(user?.role, (data) => {
      setAnnouncements(data);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.role]);

  const handleDismiss = (id: string) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem('dismissed_announcements', JSON.stringify(updated));
  };

  const activeAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

  if (activeAnnouncements.length === 0) return null;

  const current = activeAnnouncements[0];

  const isUrgent = current.priority === 'urgent';

  return (
    <div
      id="announcement-banner"
      className={`px-4 py-2.5 transition-colors border-b ${
        isUrgent
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-900'
          : 'bg-emerald-700 text-white border-emerald-800'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
          {isUrgent ? (
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          ) : (
            <Bell className="w-4 h-4 text-emerald-200 shrink-0" />
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 truncate">
            <span className="font-semibold text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 inline-block w-fit">
              {current.priority === 'urgent' ? 'Important Notice' : 'Update'}
            </span>
            <span className="font-medium truncate">{current.title}:</span>
            <span className="truncate text-xs sm:text-sm opacity-90">{current.content}</span>
          </div>
        </div>
        <button
          id={`dismiss-announcement-${current.id}`}
          onClick={() => handleDismiss(current.id)}
          className="p-1 rounded-md hover:bg-black/10 transition-colors shrink-0"
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
