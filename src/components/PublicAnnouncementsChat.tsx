import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Announcement, UserRole } from '../types';
import {
  Megaphone,
  Send,
  Pin,
  Sparkles,
  Flame,
  ShieldCheck,
  Tag,
  Clock,
  ThumbsUp,
  Heart,
  Sprout,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Lock,
  ChevronDown
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
  
  // Admin message authoring inputs (visible to admins or when authorized)
  const [titleInput, setTitleInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [priorityInput, setPriorityInput] = useState<'normal' | 'urgent'>('normal');
  const [targetAudience, setTargetAudience] = useState<'all' | 'farmers' | 'buyers'>('all');
  const [categoryInput, setCategoryInput] = useState<'general' | 'logistics' | 'market_update' | 'subsidy' | 'weather' | 'platform'>('general');
  const [pinInput, setPinInput] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showAdminComposer, setShowAdminComposer] = useState(false);
  const [postSuccessMessage, setPostSuccessMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin' || user?.email?.toLowerCase().includes('admin') || user?.name?.toLowerCase().includes('admin');

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await api.getAnnouncements(user?.role);
      setAnnouncements(data);
    } catch (err) {
      console.error('Failed to load announcements group chat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    // Auto refresh periodically every 15s to catch new announcements live
    const interval = setInterval(loadAnnouncements, 15000);
    return () => clearInterval(interval);
  }, [user?.role]);

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !titleInput.trim()) return;

    try {
      setIsSending(true);
      await api.createAnnouncement({
        title: titleInput.trim(),
        content: messageInput.trim(),
        priority: priorityInput,
        targetAudience: targetAudience,
        author: user?.name || 'agroX Admin Team',
        authorRole: 'admin',
        authorAvatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
        category: categoryInput,
        pinned: pinInput
      });

      setTitleInput('');
      setMessageInput('');
      setPinInput(false);
      setPostSuccessMessage(true);
      setTimeout(() => setPostSuccessMessage(false), 4000);
      await loadAnnouncements();
    } catch (err) {
      console.error('Failed to broadcast announcement to chat:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (annId: string, emoji: string) => {
    try {
      // Optimistic update
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
      await api.reactToAnnouncement(annId, emoji);
    } catch (err) {
      console.error('Failed to submit reaction:', err);
    }
  };

  const handleDelete = async (annId: string) => {
    if (!confirm('Are you sure you want to remove this announcement post?')) return;
    try {
      setAnnouncements(prev => prev.filter(a => a.id !== annId));
      await api.deleteAnnouncement(annId);
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    const matchesSearch =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoriesList = [
    { id: 'all', label: 'All Updates' },
    { id: 'platform', label: '🌿 Platform' },
    { id: 'logistics', label: '🚛 Logistics & Routes' },
    { id: 'subsidy', label: '💰 Subsidies & Grants' },
    { id: 'weather', label: '🌧️ Weather Advisory' },
    { id: 'market_update', label: '📊 Market Prices' }
  ];

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-[750px]">
      {/* Top Group Banner */}
      <div className="p-4 sm:p-5 bg-linear-to-r from-emerald-900 via-teal-900 to-stone-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-emerald-800">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/40 border border-emerald-400/40 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Megaphone className="w-6 h-6 text-emerald-300 animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-emerald-950 rounded-full flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                Community Announcements Channel
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Official Broadcast
              </span>
            </div>
            <p className="text-xs text-emerald-200/90 mt-0.5">
              Live updates, regional logistics routes, subsidies, and harvest bulletins directly from the agroX Admin Team.
            </p>
          </div>
        </div>

        {/* Action button for Admin or status badge for Buyers/Sellers */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          {isAdmin ? (
            <button
              id="admin-new-announcement-toggle-btn"
              onClick={() => setShowAdminComposer(prev => !prev)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              {showAdminComposer ? 'Close Composer' : 'Post Announcement'}
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-white/10 text-white/90 text-xs font-medium backdrop-blur-xs flex items-center gap-1.5 border border-white/10">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Visible to All Buyers & Producers</span>
            </div>
          )}
        </div>
      </div>

      {/* Admin Post Composer Drawer (If opened by Admin) */}
      {isAdmin && showAdminComposer && (
        <div className="p-4 bg-emerald-50/70 border-b border-emerald-200 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Admin Announcement Creator</span>
              </div>
              <span className="text-[11px] text-emerald-700">Posting as <strong>{user?.name}</strong> (Administrator)</span>
            </div>

            {postSuccessMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Announcement broadcasted successfully to all Buyer and Farmer feeds!
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
                    placeholder="Announcement Headline (e.g. 🚛 Subsidized Cold-Chain Pickup Routes)"
                    className="w-full px-3.5 py-2 bg-white rounded-xl border border-emerald-300 text-xs text-stone-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <select
                    id="admin-ann-category-select"
                    value={categoryInput}
                    onChange={e => setCategoryInput(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-emerald-300 text-xs text-stone-800 font-medium"
                  >
                    <option value="general">Category: General</option>
                    <option value="platform">Category: 🌿 Platform Updates</option>
                    <option value="logistics">Category: 🚛 Logistics & Transport</option>
                    <option value="subsidy">Category: 💰 Subsidies & Aid</option>
                    <option value="weather">Category: 🌧️ Weather Advisory</option>
                    <option value="market_update">Category: 📊 Market & Prices</option>
                  </select>
                </div>
              </div>

              <div>
                <textarea
                  id="admin-ann-content-input"
                  rows={2}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  placeholder="Type the full announcement details here for buyers and farmers to read..."
                  className="w-full px-3.5 py-2 bg-white rounded-xl border border-emerald-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={priorityInput}
                    onChange={e => setPriorityInput(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-white rounded-lg border border-emerald-200 text-xs text-stone-700"
                  >
                    <option value="normal">Priority: Normal</option>
                    <option value="urgent">Priority: Urgent Alert 🔥</option>
                  </select>

                  <select
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-white rounded-lg border border-emerald-200 text-xs text-stone-700"
                  >
                    <option value="all">Audience: All Accounts</option>
                    <option value="farmers">Audience: Farmers Only</option>
                    <option value="buyers">Audience: Buyers Only</option>
                  </select>

                  <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={pinInput}
                      onChange={e => setPinInput(e.target.checked)}
                      className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <Pin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Pin to top of channel</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminComposer(false)}
                    className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-announcement-post-btn"
                    type="submit"
                    disabled={isSending || !messageInput.trim() || !titleInput.trim()}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSending ? 'Broadcasting...' : 'Broadcast to Group'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-3 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-0.5">
          {categoriesList.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filterCategory === cat.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-stone-600 hover:bg-stone-200/70 border border-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search bulletins..."
            className="w-full pl-8 pr-3 py-1.5 bg-white rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Messages Stream Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 bg-stone-50/50">
        {loading && announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-stone-400 space-y-2">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Loading community announcements...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 space-y-2">
            <Megaphone className="w-10 h-10 text-stone-300" />
            <h4 className="font-bold text-stone-700 text-sm">No announcements matching criteria</h4>
            <p className="text-xs text-stone-400 max-w-sm">
              Check back soon for new logistic subsidies, weather bulletins, and regional harvest updates from the admin team.
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((ann, idx) => {
            const isUrgent = ann.priority === 'urgent';
            const isPinned = ann.pinned;

            return (
              <div
                key={ann.id || idx}
                className={`relative rounded-2xl p-4 sm:p-5 transition-all shadow-xs ${
                  isPinned
                    ? 'bg-amber-50/60 border-2 border-amber-300'
                    : isUrgent
                    ? 'bg-rose-50/40 border-2 border-rose-200'
                    : 'bg-white border border-stone-200/90'
                }`}
              >
                {/* Top metadata badges */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={ann.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover border border-stone-200 shadow-xs"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-stone-900 text-xs sm:text-sm">
                          {ann.author}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold flex items-center gap-1 border border-purple-200">
                          <ShieldCheck className="w-3 h-3 text-purple-700" />
                          Admin Team
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(ann.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span>•</span>
                        <span className="capitalize text-stone-500 font-medium">
                          Audience: {ann.targetAudience === 'all' ? 'All Members' : ann.targetAudience}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isPinned && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center gap-1 border border-amber-300">
                        <Pin className="w-3 h-3 fill-amber-700 text-amber-700" />
                        Pinned
                      </span>
                    )}

                    {isUrgent && (
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1 border border-rose-300 animate-pulse">
                        <Flame className="w-3 h-3" />
                        Urgent
                      </span>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Announcement Headline */}
                <h3 className="text-sm sm:text-base font-bold text-stone-900 mb-2 leading-snug">
                  {ann.title}
                </h3>

                {/* Announcement Text Body */}
                <div className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </div>

                {/* Bottom Reactions and Interaction Strip */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-stone-400 mr-1">Reactions:</span>
                    {['👍', '❤️', '🌱', '🚛', '🌧️'].map(emoji => {
                      const count = ann.reactions?.[emoji] || 0;
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(ann.id, emoji)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-all border ${
                            count > 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span className="text-[10px] font-bold">{count}</span>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-[11px] text-stone-400 font-medium">
                    Verified Broadcast by agroX Trust & Safety
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Footer Notice for Members */}
      <div className="p-3 bg-stone-100/80 border-t border-stone-200 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-700" />
        <span>
          This public channel is managed exclusively by the <strong>Admin Team</strong>. All registered Buyers and Farmers receive live updates here.
        </span>
      </div>
    </div>
  );
};
