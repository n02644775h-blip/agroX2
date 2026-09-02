import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Product, Report, Announcement, ProductCategory, AdRequest, AdStatus } from '../types';
import {
  ShieldCheck,
  Users,
  Sprout,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Send,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Layers,
  FileText,
  TrendingUp,
  Tag,
  Flame,
  Clock,
  Eye,
  Check,
  X,
  ExternalLink,
  Receipt,
  FileCheck,
  CreditCard,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [adRequests, setAdRequests] = useState<AdRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'products' | 'reports' | 'announcements' | 'categories' | 'advertisers'>('overview');
  const [loading, setLoading] = useState(true);

  // Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'urgent'>('normal');
  const [annTarget, setAnnTarget] = useState<'all' | 'farmers' | 'buyers'>('all');
  const [annCategory, setAnnCategory] = useState<'general' | 'logistics' | 'subsidy' | 'weather' | 'platform' | 'market_update'>('general');
  const [annPinned, setAnnPinned] = useState(false);
  const [annSuccess, setAnnSuccess] = useState(false);
  const [annError, setAnnError] = useState<string | null>(null);
  const [isPublishingAnn, setIsPublishingAnn] = useState(false);
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);

  // Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Advertisers POP Viewer Modal
  const [viewingPopAd, setViewingPopAd] = useState<AdRequest | null>(null);
  const [adStatusFilter, setAdStatusFilter] = useState<'all' | 'submitted' | 'under_review' | 'approved' | 'rejected'>('all');
  const [adminNotesInput, setAdminNotesInput] = useState<{ [key: string]: string }>({});
  const [updatingAdId, setUpdatingAdId] = useState<string | null>(null);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, prodsData, repsData, catsData, annsData, adsData] = await Promise.all([
        api.getAdminStats(),
        api.getUsers(),
        api.getProducts({}),
        api.getReports(),
        api.getCategories(),
        api.getAnnouncements(),
        api.getAdRequests().catch(() => [])
      ]);
      setStats(statsData);
      setUsers(usersData);
      setProducts(prodsData);
      setReports(repsData);
      setCategories(catsData);
      setAnnouncementsList(annsData);
      setAdRequests(adsData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const next = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.toggleUserStatus(userId, next);
      await loadAdminData();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      await api.resolveReport(reportId, status, 'Resolved by Admin Portal');
      await loadAdminData();
    } catch (err) {
      console.error('Resolve report failed:', err);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Permanently remove this product from marketplace?')) return;
    try {
      await api.deleteProduct(productId);
      await loadAdminData();
    } catch (err) {
      console.error('Delete product failed:', err);
    }
  };

  // Fixed Announcement Publication
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      setAnnError('Please provide both a headline and content for the announcement.');
      return;
    }

    try {
      setIsPublishingAnn(true);
      setAnnError(null);
      const created = await api.createAnnouncement({
        title: annTitle.trim(),
        content: annContent.trim(),
        priority: annPriority,
        targetAudience: annTarget,
        author: 'agroX Admin Team',
        authorRole: 'admin',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
        category: annCategory,
        pinned: annPinned
      });

      setAnnSuccess(true);
      setAnnTitle('');
      setAnnContent('');
      setAnnPinned(false);
      setAnnouncementsList(prev => [created, ...prev]);
      setTimeout(() => setAnnSuccess(false), 4000);
      await loadAdminData();
    } catch (err: any) {
      console.error('Failed to send announcement:', err);
      setAnnError(err?.message || 'Failed to broadcast announcement. Please try again.');
    } finally {
      setIsPublishingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (!confirm('Remove this announcement post from public channels?')) return;
    try {
      await api.deleteAnnouncement(annId);
      setAnnouncementsList(prev => prev.filter(a => a.id !== annId));
      await loadAdminData();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.createCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim(),
        icon: 'Package'
      });
      setNewCatName('');
      setNewCatDesc('');
      await loadAdminData();
    } catch (err) {
      console.error('Create category failed:', err);
    }
  };

  // Advertisers Approval / Status Handlers
  const handleUpdateAdStatus = async (adId: string, status: AdStatus) => {
    setUpdatingAdId(adId);
    try {
      const notes = adminNotesInput[adId] || '';
      await api.updateAdRequestStatus(adId, status, notes);
      await loadAdminData();
      if (viewingPopAd && viewingPopAd.id === adId) {
        setViewingPopAd(prev => prev ? { ...prev, status, adminNotes: notes } : null);
      }
    } catch (err) {
      console.error('Failed to update ad status:', err);
    } finally {
      setUpdatingAdId(null);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Permanently delete this advertisement request?')) return;
    try {
      await api.deleteAdRequest(adId);
      await loadAdminData();
      if (viewingPopAd && viewingPopAd.id === adId) {
        setViewingPopAd(null);
      }
    } catch (err) {
      console.error('Failed to delete ad request:', err);
    }
  };

  const pendingAdsCount = adRequests.filter(a => a.status === 'submitted' || a.status === 'under_review').length;
  const filteredAds = adRequests.filter(a => {
    if (adStatusFilter === 'all') return true;
    return a.status === adStatusFilter;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="bg-purple-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 text-xs font-semibold backdrop-blur-xs">
            <ShieldCheck className="w-4 h-4 text-purple-300" />
            Platform Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            agroX Governance & Controls
          </h1>
          <p className="text-purple-200 text-xs sm:text-sm">
            Monitor platform metrics, approve farmer advertising requests & POPs, manage users, and broadcast announcements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="admin-nav-advertisers-btn"
            onClick={() => setActiveTab('advertisers')}
            className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shrink-0 transition-colors"
          >
            <Flame className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
            Advertisers {pendingAdsCount > 0 && `(${pendingAdsCount} Pending)`}
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shrink-0 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Broadcast Update
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold">Total Users</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{users.length}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Active accounts</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold">Registered Farmers</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {users.filter(u => u.role === 'farmer').length}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Producers</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold">Ad Requests</div>
          <div className="text-2xl font-black text-orange-600 mt-1">{adRequests.length}</div>
          <div className="text-[11px] text-orange-700 font-medium">
            {pendingAdsCount} awaiting review
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold">Total Products</div>
          <div className="text-2xl font-black text-stone-900 mt-1">{products.length}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Listed Produce</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold">Platform Volume</div>
          <div className="text-2xl font-black text-stone-900 mt-1">
            ${stats?.totalVolume ? stats.totalVolume.toFixed(2) : '155.00'}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Gross GMV</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="text-xs text-stone-500 font-semibold">Pending Reports</div>
          <div className="text-2xl font-black text-red-600 mt-1">
            {reports.filter(r => r.status === 'pending').length}
          </div>
          <div className="text-[11px] text-red-500 mt-0.5">Needs Review</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Platform Analytics' },
          { id: 'advertisers', label: `Advertisers (${adRequests.length})`, highlight: pendingAdsCount > 0 },
          { id: 'users', label: `Users (${users.length})` },
          { id: 'products', label: `Catalog Moderation (${products.length})` },
          { id: 'reports', label: `Reports (${reports.length})` },
          { id: 'announcements', label: `Broadcast Announcements (${announcementsList.length})` },
          { id: 'categories', label: `Categories (${categories.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? tab.id === 'advertisers'
                  ? 'bg-orange-600 text-white'
                  : 'bg-purple-800 text-white'
                : tab.highlight
                ? 'text-orange-700 bg-orange-50 hover:bg-orange-100'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {tab.id === 'advertisers' && <Flame className="w-3.5 h-3.5 text-amber-300" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: ADVERTISERS (Approve / Decline / Check POPs) */}
      {activeTab === 'advertisers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-600 fill-orange-500" />
                <h2 className="text-lg font-bold text-stone-900">Farmer Advertisement Requests & POP Approvals</h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Review farmer Hot Deals submissions, verify Proof of Payments (POP), and approve or decline $1/day promotions.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {[
                { id: 'all', label: 'All Requests' },
                { id: 'submitted', label: 'Sent / New' },
                { id: 'under_review', label: 'Under Review' },
                { id: 'approved', label: 'Approved (Live Deals)' },
                { id: 'rejected', label: 'Rejected' }
              ].map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setAdStatusFilter(pill.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    adStatusFilter === pill.id
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {filteredAds.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-6 space-y-3">
              <Flame className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="font-bold text-stone-800 text-base">No advertisement requests found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {adStatusFilter === 'all'
                  ? 'No farmers have submitted ad requests yet. Farmers can request ads at $1/day from their dashboard.'
                  : `No requests match the "${adStatusFilter}" filter.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAds.map(ad => {
                const isSent = ad.status === 'submitted';
                const isUnderReview = ad.status === 'under_review';
                const isApproved = ad.status === 'approved';
                const isRejected = ad.status === 'rejected';

                return (
                  <div
                    key={ad.id}
                    className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                      isSent
                        ? 'border-blue-300 bg-blue-50/20'
                        : isUnderReview
                        ? 'border-amber-300 bg-amber-50/20'
                        : isApproved
                        ? 'border-emerald-300'
                        : 'border-stone-200 opacity-90'
                    }`}
                  >
                    {/* Header line */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                          <Flame className="w-5 h-5 fill-orange-500 text-orange-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-stone-900 text-base">{ad.dealHeadline}</h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                isSent
                                  ? 'bg-blue-100 text-blue-800'
                                  : isUnderReview
                                  ? 'bg-amber-100 text-amber-900'
                                  : isApproved
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-red-100 text-red-900'
                              }`}
                            >
                              {ad.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-stone-500 mt-0.5">
                            Farmer: <strong>{ad.farmerName}</strong> ({ad.farmName}) • {ad.farmerPhone || 'No phone'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="text-xs text-stone-400 font-medium">Duration & Pricing</div>
                          <div className="text-sm font-black text-stone-900">
                            {ad.durationDays} Days @ $1/day = <strong className="text-orange-600">${ad.totalFee.toFixed(2)}</strong>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAd(ad.id)}
                          className="p-2 text-stone-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                          title="Delete Ad Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Middle grid info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Product details */}
                      <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
                        <span className="font-bold text-stone-700 block">Promoted Item</span>
                        <div className="flex items-center gap-2.5">
                          {ad.productImage && (
                            <img src={ad.productImage} alt="" className="w-12 h-12 rounded-xl object-cover bg-stone-200 shrink-0" />
                          )}
                          <div>
                            <div className="font-bold text-stone-900 text-xs">{ad.productName || 'General Farm Deal'}</div>
                            <div className="text-stone-500 text-[11px]">{ad.dealDescription || 'Special promo'}</div>
                            {ad.specialPrice ? (
                              <div className="font-black text-orange-700 text-xs mt-0.5">
                                Special: ${ad.specialPrice.toFixed(2)} {ad.discountPercentage ? `(${ad.discountPercentage}% off)` : ''}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Payment & POP */}
                      <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-700">Proof of Payment (POP)</span>
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                            {ad.paymentMethod.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-stone-600 text-[11px]">
                          <div>Ref / Ecocash: <strong>{ad.paymentReference || 'Direct Transfer'}</strong></div>
                          <div>Submitted: {new Date(ad.createdAt).toLocaleString()}</div>
                        </div>
                        {ad.proofOfPaymentUrl ? (
                          <button
                            onClick={() => setViewingPopAd(ad)}
                            className="w-full py-1.5 bg-stone-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Receipt className="w-3.5 h-3.5 text-amber-300" />
                            Inspect POP Receipt
                          </button>
                        ) : (
                          <div className="text-[11px] text-amber-700 italic">No receipt image attached</div>
                        )}
                      </div>

                      {/* Admin Notes & Control */}
                      <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="font-bold text-stone-700 block mb-1">Admin Resolution Notes</span>
                          <input
                            type="text"
                            placeholder="e.g. Verified $14 EcoCash ref #9834..."
                            defaultValue={ad.adminNotes || ''}
                            onChange={e => setAdminNotesInput(prev => ({ ...prev, [ad.id]: e.target.value }))}
                            className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>

                        {/* Status update buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {ad.status !== 'approved' && (
                            <button
                              onClick={() => handleUpdateAdStatus(ad.id, 'approved')}
                              disabled={updatingAdId === ad.id}
                              className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve Ad
                            </button>
                          )}

                          {ad.status !== 'under_review' && ad.status !== 'approved' && (
                            <button
                              onClick={() => handleUpdateAdStatus(ad.id, 'under_review')}
                              disabled={updatingAdId === ad.id}
                              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Under Review
                            </button>
                          )}

                          {ad.status !== 'rejected' && (
                            <button
                              onClick={() => handleUpdateAdStatus(ad.id, 'rejected')}
                              disabled={updatingAdId === ad.id}
                              className="py-1.5 px-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              Decline
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* POP Full-Screen Inspection Modal */}
      {viewingPopAd && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-stone-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-stone-900 text-base">
                  Proof of Payment: {viewingPopAd.farmerName}
                </h3>
              </div>
              <button
                onClick={() => setViewingPopAd(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-3 rounded-2xl border border-stone-200">
              <div><strong>Deal Headline:</strong> {viewingPopAd.dealHeadline}</div>
              <div><strong>Method:</strong> {viewingPopAd.paymentMethod.toUpperCase()}</div>
              <div><strong>Duration:</strong> {viewingPopAd.durationDays} Days @ $1/day</div>
              <div><strong>Amount Due:</strong> <span className="font-bold text-emerald-800">${viewingPopAd.totalFee.toFixed(2)}</span></div>
              <div><strong>Ref ID:</strong> {viewingPopAd.paymentReference || 'N/A'}</div>
              <div><strong>Status:</strong> <span className="uppercase font-bold text-orange-600">{viewingPopAd.status}</span></div>
            </div>

            {/* Image Preview Container */}
            <div className="max-h-96 overflow-auto rounded-2xl border border-stone-200 bg-stone-900 flex items-center justify-center p-2">
              <img
                src={viewingPopAd.proofOfPaymentUrl}
                alt="Proof of Payment"
                className="max-h-80 w-auto rounded-xl object-contain"
              />
            </div>

            {/* Decision Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handleUpdateAdStatus(viewingPopAd.id, 'rejected')}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl font-bold text-xs transition-colors"
              >
                Decline POP
              </button>
              <button
                onClick={() => handleUpdateAdStatus(viewingPopAd.id, 'approved')}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Check className="w-4 h-4" />
                Approve & Launch Hot Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-bold text-stone-900 text-base">Monthly Gross Marketplace Volume ($)</h3>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.volumeChart || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1917', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    formatter={(val: number) => [`$${val}`, 'Monthly Volume']}
                  />
                  <Bar dataKey="volume" fill="#7E22CE" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-bold text-stone-900 text-base">Farmer Onboarding Trend</h3>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.volumeChart || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E5E4" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1917', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="newFarmers" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB: USERS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm">Platform Registered Users</h3>
            <span className="text-xs text-stone-500">{users.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-stone-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover bg-stone-100" />
                        <div>
                          <div className="font-bold text-stone-900">{u.name}</div>
                          <div className="text-[11px] text-stone-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                        u.role === 'farmer' ? 'bg-emerald-100 text-emerald-900' : u.role === 'buyer' ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {u.location?.city || 'Harare'}, {u.location?.province || 'Harare'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.status)}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                          u.status === 'active' ? 'bg-stone-100 hover:bg-stone-200 text-stone-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm">Active Product Listings ({products.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Listing</th>
                  <th className="px-4 py-3">Producer</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map(prod => (
                  <tr key={prod.id} className="hover:bg-stone-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={prod.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover bg-stone-100" />
                        <div>
                          <div className="font-bold text-stone-900">{prod.name}</div>
                          <div className="text-[11px] text-stone-400">{prod.categoryName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-700">{prod.farmName || prod.farmerName}</td>
                    <td className="px-4 py-3 font-bold text-stone-900">${prod.price.toFixed(2)} / {prod.unit}</td>
                    <td className="px-4 py-3">{prod.quantityAvailable} {prod.unit}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm">Dispute & Content Reports ({reports.length})</h3>
          </div>
          {reports.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400">No reports submitted.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {reports.map(rep => (
                <div key={rep.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">{rep.itemTitle}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rep.status === 'pending' ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700'
                      }`}>
                        {rep.status}
                      </span>
                    </div>
                    <p className="text-stone-600 mt-1">Reason: <strong>{rep.reason}</strong> - {rep.description}</p>
                    <div className="text-[11px] text-stone-400 mt-0.5">By {rep.reporterName} on {new Date(rep.createdAt).toLocaleDateString()}</div>
                  </div>
                  {rep.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveReport(rep.id, 'resolved')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, 'dismissed')}
                        className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-lg"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ANNOUNCEMENTS (Fixed Bulletin & Broadcast) */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-700" />
              Broadcast Marketplace Bulletin
            </h3>
            <p className="text-xs text-stone-500">
              Publish official announcements to the public community group visible in all Buyer and Seller accounts.
            </p>

            {annSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Announcement broadcasted successfully to all user feeds and community channel!
              </div>
            )}

            {annError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                {annError}
              </div>
            )}

            <form onSubmit={handleSendAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Headline / Title</label>
                <input
                  id="admin-bulletin-title"
                  type="text"
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  placeholder="e.g. 🌿 Direct Spring Market 2026 Opening"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Content / Message</label>
                <textarea
                  id="admin-bulletin-content"
                  rows={4}
                  value={annContent}
                  onChange={e => setAnnContent(e.target.value)}
                  placeholder="Detailed instructions or update message for farmers and buyers..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Category</label>
                  <select
                    value={annCategory}
                    onChange={e => setAnnCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  >
                    <option value="general">General Updates</option>
                    <option value="platform">🌿 Platform Features</option>
                    <option value="logistics">🚛 Logistics & Transport</option>
                    <option value="subsidy">💰 Subsidies & Grants</option>
                    <option value="weather">🌧️ Weather Advisory</option>
                    <option value="market_update">📊 Market Prices</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Target Audience</label>
                  <select
                    value={annTarget}
                    onChange={e => setAnnTarget(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  >
                    <option value="all">Everyone (Farmers & Buyers)</option>
                    <option value="farmers">Farmers Only</option>
                    <option value="buyers">Buyers Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Priority</label>
                  <select
                    value={annPriority}
                    onChange={e => setAnnPriority(e.target.value as any)}
                    className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  >
                    <option value="normal">Normal (Green)</option>
                    <option value="urgent">Urgent Alert (Red)</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer select-none mt-4">
                  <input
                    type="checkbox"
                    checked={annPinned}
                    onChange={e => setAnnPinned(e.target.checked)}
                    className="rounded text-purple-700 focus:ring-purple-500"
                  />
                  <span>Pin to top of channel</span>
                </label>
              </div>

              <button
                id="admin-publish-announcement-btn"
                type="submit"
                disabled={isPublishingAnn}
                className="w-full py-3 bg-purple-800 hover:bg-purple-900 disabled:bg-stone-300 text-white font-bold rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {isPublishingAnn ? 'Publishing live...' : 'Publish & Broadcast Live'}
              </button>
            </form>
          </div>

          {/* Active Announcements Stream List */}
          <div className="lg:col-span-6 space-y-3">
            <h3 className="font-bold text-stone-900 text-base">Published Channel Bulletins ({announcementsList.length})</h3>
            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
              {announcementsList.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-xs text-stone-400">
                  No active announcements.
                </div>
              ) : (
                announcementsList.map(ann => (
                  <div
                    key={ann.id}
                    className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900">{ann.title}</span>
                        {ann.pinned && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Pinned
                          </span>
                        )}
                        {ann.priority === 'urgent' && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            Urgent
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="text-stone-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed">{ann.content}</p>

                    <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-100">
                      <span>Audience: <strong>{ann.targetAudience}</strong></span>
                      <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs max-w-xl space-y-3">
            <h3 className="font-bold text-stone-900 text-sm">Add New Product Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Category Name (e.g. Organic Mushrooms)"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
                required
              />
              <input
                type="text"
                value={newCatDesc}
                onChange={e => setNewCatDesc(e.target.value)}
                placeholder="Short Description"
                className="w-full px-3 py-2 rounded-xl border border-stone-300"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white font-bold rounded-xl"
              >
                Add Category
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">{cat.name}</span>
                  <Tag className="w-3.5 h-3.5 text-stone-400" />
                </div>
                <p className="text-xs text-stone-500">{cat.description}</p>
                <div className="text-[11px] text-emerald-700 font-semibold pt-1">
                  {cat.itemCount || 0} active listings
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
