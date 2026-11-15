import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  subscribeToFirebaseAnnouncements,
  createFirebaseAnnouncement,
  reactToFirebaseAnnouncement,
  deleteFirebaseAnnouncement
} from '../services/firebaseAnnouncements';
import { Announcement } from '../types';
import { LiquidGlassCard, LiquidGlassButton } from './glass';
import {
  Megaphone,
  Send,
  Pin,
  Sparkles,
  Flame,
  ShieldCheck,
  Clock,
  Users,
  Search,
  CheckCircle2,
  Trash2,
  Truck,
  CloudRain,
  Coins,
  TrendingUp
} from 'lucide-react';

interface PublicAnnouncementsChatProps {
  onNavigateToUser?: (userId: string) => void;
}

export const PublicAnnouncementsChat: React.FC<PublicAnnouncementsChatProps> = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Admin message authoring inputs
  const [titleInput, setTitleInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [priorityInput, setPriorityInput] = useState<'normal' | 'urgent'>('normal');
  const [targetAudience, setTargetAudience] = useState<'all' | 'farmers' | 'buyers'>('all');
  const [categoryInput, setCategoryInput] = useState<
    'general' | 'logistics' | 'market_update' | 'subsidy' | 'weather' | 'platform'
  >('general');
  const [pinInput, setPinInput] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showAdminComposer, setShowAdminComposer] = useState(false);
  const [postSuccessMessage, setPostSuccessMessage] = useState(false);
  const [postErrorMessage, setPostErrorMessage] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin =
    user?.role === 'admin' ||
    user?.email?.toLowerCase().includes('admin') ||
    user?.name?.toLowerCase().includes('admin');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToFirebaseAnnouncements(user?.role, data => {
      setAnnouncements(data);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.role]);

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setPostErrorMessage(
        'Access denied: Only verified FarmBridge platform administrators can publish platform announcements.'
      );
      return;
    }

    if (!messageInput.trim() || !titleInput.trim()) {
      setPostErrorMessage('Please enter both a title and message content.');
      return;
    }

    try {
      setIsSending(true);
      setPostErrorMessage(null);

      const payload: Partial<Announcement> = {
        title: titleInput.trim(),
        content: messageInput.trim(),
        priority: priorityInput,
        targetAudience: targetAudience,
        author: user?.role === 'admin' && user?.name ? user.name : 'FarmBridge Admin Team',
        authorRole: 'admin',
        authorAvatar:
          user?.avatar ||
          'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400',
        category: categoryInput,
        pinned: pinInput,
        reactions: { '👍': 1 },
        likesCount: 1
      };

      await createFirebaseAnnouncement(payload);
      try {
        await api.createAnnouncement(payload);
      } catch (err) {
        console.warn('Backend store announcement sync fallback:', err);
      }

      setTitleInput('');
      setMessageInput('');
      setPinInput(false);
      setPostSuccessMessage(true);
      setTimeout(() => setPostSuccessMessage(false), 4000);
    } catch (err: any) {
      console.error('Failed to broadcast announcement to channel:', err);
      setPostErrorMessage(err?.message || 'Failed to post announcement. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (annId: string, emoji: string) => {
    try {
      setAnnouncements(prev =>
        prev.map(ann => {
          if (ann.id === annId) {
            const rx = { ...(ann.reactions || {}) };
            rx[emoji] = (rx[emoji] || 0) + 1;
            return {
              ...ann,
              reactions: rx,
              likesCount: (ann.likesCount || 0) + 1
            };
          }
          return ann;
        })
      );
      await reactToFirebaseAnnouncement(annId, emoji);
      try {
        await api.reactToAnnouncement(annId, emoji);
      } catch {}
    } catch (err) {
      console.error('Failed to submit reaction:', err);
    }
  };

  const handleDelete = async (annId: string) => {
    setPendingDeleteId(null);
    try {
      setAnnouncements(prev => prev.filter(a => a.id !== annId));
      await deleteFirebaseAnnouncement(annId);
      try {
        await api.deleteAnnouncement(annId);
      } catch {}
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  const categoriesList = [
    { id: 'all', label: 'All Updates', icon: Megaphone, count: announcements.length },
    {
      id: 'platform',
      label: 'Platform & App',
      icon: Sparkles,
      count: announcements.filter(a => a.category === 'platform').length
    },
    {
      id: 'logistics',
      label: 'Logistics & Routes',
      icon: Truck,
      count: announcements.filter(a => a.category === 'logistics').length
    },
    {
      id: 'subsidy',
      label: 'Subsidies & Grants',
      icon: Coins,
      count: announcements.filter(a => a.category === 'subsidy').length
    },
    {
      id: 'weather',
      label: 'Weather Advisory',
      icon: CloudRain,
      count: announcements.filter(a => a.category === 'weather').length
    },
    {
      id: 'market_update',
      label: 'Market Prices',
      icon: TrendingUp,
      count: announcements.filter(a => a.category === 'market_update').length
    }
  ];

  const filteredAnnouncements = announcements.filter(a => {
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    const matchesSearch =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <LiquidGlassCard variant="light" className="overflow-hidden flex flex-col h-[780px] p-0">
      <div className="flex flex-col h-full">
        {/* Top Group Banner */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-[#062B1F] via-[#0B3D2B] to-[#145A38] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/15">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/14 border border-white/30 backdrop-blur-md flex items-center justify-center text-[#A8E635] shadow-inner shrink-0">
              <Megaphone className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  Community Bulletin Channels
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#A8E635]/20 text-[#A8E635] border border-[#A8E635]/35">
                  Official Broadcasts
                </span>
              </div>
              <p className="text-xs text-[#DFF4E4]/85 mt-0.5">
                Live updates, regional logistics routes, subsidies, and harvest bulletins posted by FarmBridge Administrators.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
            {isAdmin ? (
              <LiquidGlassButton
                id="admin-new-announcement-toggle-btn"
                type="button"
                variant="lime"
                size="xs"
                onClick={() => setShowAdminComposer(prev => !prev)}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{showAdminComposer ? 'Close Composer' : 'Broadcast Announcement'}</span>
              </LiquidGlassButton>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-white/12 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 border border-white/20">
                <Users className="w-3.5 h-3.5 text-[#A8E635]" />
                <span>Visible to All Members</span>
              </div>
            )}
          </div>
        </div>

        {/* Admin Post Composer Drawer */}
        {isAdmin && showAdminComposer && (
          <div className="p-4 bg-[#DFF4E4]/75 backdrop-blur-md border-b border-[#145A38]/20">
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#062B1F] font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-[#145A38]" />
                  <span>Admin Announcement Creator</span>
                </div>
                <span className="text-[11px] text-[#0B3D2B]">
                  Posting as <strong>{user?.name}</strong> (Administrator)
                </span>
              </div>

              {postSuccessMessage && (
                <div className="p-2.5 rounded-xl bg-white/85 border border-[#145A38]/25 text-[#062B1F] text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#145A38]" />
                  <span>Announcement broadcasted successfully to all Buyer and Farmer feeds.</span>
                </div>
              )}

              {postErrorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-800 text-xs font-semibold">
                  {postErrorMessage}
                </div>
              )}

              <form onSubmit={handleSendAnnouncement} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      id="admin-ann-title-input"
                      type="text"
                      value={titleInput}
                      onChange={e => setTitleInput(e.target.value)}
                      placeholder="Announcement Headline"
                      className="w-full px-3.5 py-2 bg-white/90 rounded-xl border border-[#062B1F]/15 text-xs text-[#062B1F] font-semibold focus:outline-none focus:ring-2 focus:ring-[#145A38]/30"
                      required
                    />
                  </div>

                  <div>
                    <select
                      id="admin-ann-category-select"
                      value={categoryInput}
                      onChange={e => setCategoryInput(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white/90 rounded-xl border border-[#062B1F]/15 text-xs text-[#062B1F] font-medium"
                    >
                      <option value="general">Category: General</option>
                      <option value="platform">Category: Platform Updates</option>
                      <option value="logistics">Category: Logistics & Transport</option>
                      <option value="subsidy">Category: Subsidies & Aid</option>
                      <option value="weather">Category: Weather Advisory</option>
                      <option value="market_update">Category: Market & Prices</option>
                    </select>
                  </div>
                </div>

                <textarea
                  id="admin-ann-content-input"
                  rows={3}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  placeholder="Type the full announcement details here for buyers and farmers to read..."
                  className="w-full px-3.5 py-2 bg-white/90 rounded-xl border border-[#062B1F]/15 text-xs text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/30"
                  required
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={priorityInput}
                      onChange={e => setPriorityInput(e.target.value as any)}
                      className="px-2.5 py-1.5 bg-white/90 rounded-xl border border-[#062B1F]/15 text-xs text-[#062B1F]"
                    >
                      <option value="normal">Priority: Normal</option>
                      <option value="urgent">Priority: Urgent Alert</option>
                    </select>

                    <select
                      value={targetAudience}
                      onChange={e => setTargetAudience(e.target.value as any)}
                      className="px-2.5 py-1.5 bg-white/90 rounded-xl border border-[#062B1F]/15 text-xs text-[#062B1F]"
                    >
                      <option value="all">Audience: All Accounts</option>
                      <option value="farmers">Audience: Farmers Only</option>
                      <option value="buyers">Audience: Buyers Only</option>
                    </select>

                    <label className="flex items-center gap-1.5 text-xs text-[#062B1F] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pinInput}
                        onChange={e => setPinInput(e.target.checked)}
                        className="rounded border-[#145A38]/30 text-[#145A38] focus:ring-[#145A38]"
                      />
                      <Pin className="w-3.5 h-3.5 text-[#145A38]" />
                      <span>Pin to top of channel</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <LiquidGlassButton
                      type="button"
                      variant="light"
                      size="xs"
                      onClick={() => setShowAdminComposer(false)}
                    >
                      Cancel
                    </LiquidGlassButton>
                    <LiquidGlassButton
                      id="submit-announcement-post-btn"
                      type="submit"
                      variant="emerald"
                      size="xs"
                      disabled={isSending || !messageInput.trim() || !titleInput.trim()}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSending ? 'Broadcasting...' : 'Broadcast to Channel'}</span>
                    </LiquidGlassButton>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filter and Channel Selector Tabs */}
        <div className="p-3 bg-white/60 border-b border-[#062B1F]/10 flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto py-1">
            {categoriesList.map(cat => {
              const Icon = cat.icon;
              const isSelected = filterCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#062B1F] text-[#A8E635] shadow-xs'
                      : 'bg-white/80 text-[#0B3D2B]/80 hover:bg-white border border-[#062B1F]/10'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#A8E635]' : 'text-[#145A38]'}`} />
                  <span>{cat.label}</span>
                  {cat.count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                        isSelected ? 'bg-[#145A38] text-white' : 'bg-[#DFF4E4] text-[#062B1F]'
                      }`}
                    >
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-64">
            <Search className="w-3.5 h-3.5 text-[#0B3D2B]/45 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search bulletins & alerts..."
              className="w-full pl-8 pr-3 py-1.5 bg-white/85 rounded-xl border border-[#062B1F]/12 text-xs text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/20"
            />
          </div>
        </div>

        {/* Messages Stream Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#F8FAF7]/65">
          {loading && announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-[#0B3D2B]/60 space-y-2">
              <div className="w-6 h-6 border-2 border-[#145A38] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Connecting to live bulletin channels...</p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-2">
              <Megaphone className="w-10 h-10 text-[#145A38]/35" />
              <h4 className="font-bold text-[#062B1F] text-sm">No announcements yet</h4>
              <p className="text-xs text-[#0B3D2B]/65 max-w-sm">
                Only official announcements manually published by the FarmBridge administrator appear in this channel.
              </p>
            </div>
          ) : (
            filteredAnnouncements.map((ann, idx) => {
              const isUrgent = ann.priority === 'urgent';
              const isPinned = ann.pinned;

              return (
                <div
                  key={ann.id || idx}
                  className={`relative rounded-2xl p-4 sm:p-5 transition-all backdrop-blur-md shadow-xs ${
                    isPinned
                      ? 'bg-[#F4D35E]/20 border border-[#F4D35E]/60'
                      : isUrgent
                      ? 'bg-rose-500/8 border border-rose-500/30'
                      : 'bg-white/85 border border-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          ann.authorAvatar ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
                        }
                        alt={ann.author}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover border border-white shadow-xs"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[#062B1F] text-xs sm:text-sm">
                            {ann.author}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#062B1F] text-[#A8E635] text-[10px] font-extrabold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Admin Team
                          </span>
                          {ann.category && ann.category !== 'general' && (
                            <span className="px-2 py-0.5 rounded-md bg-[#DFF4E4] text-[#145A38] text-[10px] font-bold capitalize">
                              {ann.category.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#0B3D2B]/60 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(ann.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize font-medium">
                            Audience: {ann.targetAudience === 'all' ? 'All Members' : ann.targetAudience}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPinned && (
                        <span className="px-2.5 py-1 rounded-full bg-[#F4D35E]/35 text-[#062B1F] text-[10px] font-bold flex items-center gap-1 border border-[#F4D35E]/60">
                          <Pin className="w-3 h-3" />
                          Pinned
                        </span>
                      )}

                      {isUrgent && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-800 text-[10px] font-bold flex items-center gap-1 border border-rose-500/30">
                          <Flame className="w-3 h-3" />
                          Urgent
                        </span>
                      )}

                      {isAdmin &&
                        (pendingDeleteId === ann.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(ann.id)}
                              className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(null)}
                              className="px-2 py-1 rounded-lg bg-white border border-[#062B1F]/15 text-[#062B1F] text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteId(ann.id)}
                            className="p-1.5 text-[#0B3D2B]/45 hover:text-rose-600 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Announcement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ))}
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-extrabold text-[#062B1F] mb-2 leading-snug">
                    {ann.title}
                  </h3>

                  <div className="text-xs sm:text-sm text-[#0B3D2B]/85 leading-relaxed whitespace-pre-wrap">
                    {ann.content}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#062B1F]/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-medium text-[#0B3D2B]/55 mr-1">Reactions:</span>
                      {['👍', '❤️', '🌱', '🚛', '🌧️', '📊'].map(emoji => {
                        const count = ann.reactions?.[emoji] || 0;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReaction(ann.id, emoji)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all border cursor-pointer tabular-nums ${
                              count > 0
                                ? 'bg-[#DFF4E4] text-[#062B1F] border-[#145A38]/25 hover:bg-[#DFF4E4]/80'
                                : 'bg-white/75 text-[#0B3D2B]/70 border-[#062B1F]/10 hover:bg-white'
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 0 && <span className="text-[10px] font-bold">{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-[11px] text-[#0B3D2B]/55 font-medium">
                      Verified Broadcast by FarmBridge Administration
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Footer Notice for Members */}
        <div className="p-3 bg-white/75 border-t border-[#062B1F]/10 text-center text-xs text-[#0B3D2B]/70 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#145A38]" />
          <span>
            This public channel is managed exclusively by the <strong>Admin Team</strong>. All registered Buyers and Farmers receive live updates here.
          </span>
        </div>
      </div>
    </LiquidGlassCard>
  );
};
