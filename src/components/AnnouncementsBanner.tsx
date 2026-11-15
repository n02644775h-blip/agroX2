import React, { useState, useEffect } from 'react';
import { Announcement } from '../types';
import { subscribeToFirebaseAnnouncements } from '../services/firebaseAnnouncements';
import { useAuth } from '../context/AuthContext';
import { Bell, X, ShieldAlert } from 'lucide-react';

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
      className={`px-4 py-2.5 transition-colors border-b backdrop-blur-xl ${
        isUrgent
          ? 'bg-[#F4D35E]/25 border-[#F4D35E]/45 text-[#062B1F]'
          : 'bg-[#0B3D2B] border-white/12 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
          {isUrgent ? (
            <ShieldAlert className="w-5 h-5 text-[#062B1F] shrink-0" />
          ) : (
            <Bell className="w-4 h-4 text-[#A8E635] shrink-0" />
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 truncate">
            <span
              className={`font-bold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block w-fit ${
                isUrgent
                  ? 'bg-[#062B1F] text-[#F4D35E]'
                  : 'bg-[#A8E635]/20 text-[#A8E635] border border-[#A8E635]/30'
              }`}
            >
              {current.priority === 'urgent' ? 'Important Notice' : 'Update'}
            </span>
            <span className="font-bold truncate">{current.title}:</span>
            <span className="truncate text-xs sm:text-sm opacity-90">{current.content}</span>
          </div>
        </div>
        <button
          id={`dismiss-announcement-${current.id}`}
          onClick={() => handleDismiss(current.id)}
          className="p-1.5 rounded-full hover:bg-black/15 transition-colors shrink-0 cursor-pointer"
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
