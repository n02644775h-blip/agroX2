import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Product, Report, Announcement, ProductCategory } from '../types';
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
  Tag
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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'products' | 'reports' | 'announcements' | 'categories'>('overview');
  const [loading, setLoading] = useState(true);

  // Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'urgent'>('normal');
  const [annTarget, setAnnTarget] = useState<'all' | 'farmers' | 'buyers'>('all');
  const [annCategory, setAnnCategory] = useState<'general' | 'logistics' | 'subsidy' | 'weather' | 'platform' | 'market_update'>('general');
  const [annPinned, setAnnPinned] = useState(false);
  const [annSuccess, setAnnSuccess] = useState(false);
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, prodsData, repsData, catsData, annsData] = await Promise.all([
        api.getAdminStats(),
        api.getUsers(),
        api.getProducts({}),
        api.getReports(),
        api.getCategories(),
        api.getAnnouncements()
      ]);
      setStats(statsData);
      setUsers(usersData);
      setProducts(prodsData);
      setReports(repsData);
      setCategories(catsData);
      setAnnouncementsList(annsData);
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

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    try {
      await api.createAnnouncement({
        title: annTitle,
        content: annContent,
        priority: annPriority,
        targetAudience: annTarget,
        author: 'agroX Admin Team',
        category: annCategory,
        pinned: annPinned
      });
      setAnnSuccess(true);
      setAnnTitle('');
      setAnnContent('');
      setAnnPinned(false);
      setTimeout(() => setAnnSuccess(false), 3000);
      await loadAdminData();
    } catch (err) {
      console.error('Failed to send announcement:', err);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (!confirm('Remove this announcement post from public channels?')) return;
    try {
      await api.deleteAnnouncement(annId);
      await loadAdminData();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      await api.createCategory({
        name: newCatName,
        description: newCatDesc,
        icon: 'Package'
      });
      setNewCatName('');
      setNewCatDesc('');
      await loadAdminData();
    } catch (err) {
      console.error('Create category failed:', err);
    }
  };

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
            Monitor platform metrics, manage producers and buyers, resolve reports, and broadcast agricultural announcements.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('announcements')}
          className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shrink-0 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          Broadcast Update
        </button>
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
          <div className="text-xs text-stone-500 font-semibold">Registered Buyers</div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {users.filter(u => u.role === 'buyer').length}
          </div>
          <div className="text-[11px] text-amber-600 mt-0.5">Consumers</div>
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
          { id: 'users', label: `Users (${users.length})` },
          { id: 'products', label: `Catalog Moderation (${products.length})` },
          { id: 'reports', label: `Reports (${reports.length})` },
          { id: 'announcements', label: 'Broadcast Announcements' },
          { id: 'categories', label: `Categories (${categories.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
                  <tr key={u.id} className="hover:bg-stone-50/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <div className="font-bold text-stone-900">{u.name}</div>
                          <div className="text-stone-400 text-[11px]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                          u.role === 'farmer'
                            ? 'bg-emerald-100 text-emerald-800'
                            : u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {u.location?.city}, {u.location?.province}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            u.status === 'active'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
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
            <h3 className="font-bold text-stone-900 text-sm">Product Catalog Moderation</h3>
            <span className="text-xs text-stone-500">{products.length} listed produce</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Producer / Farm</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock Available</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Moderate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map(prod => (
                  <tr key={prod.id} className="hover:bg-stone-50/80">
                    <td className="px-4 py-3 font-bold text-stone-900">
                      <div className="flex items-center gap-2">
                        <img src={prod.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        <span>{prod.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600 font-medium">{prod.farmName}</td>
                    <td className="px-4 py-3 font-bold text-stone-900">${prod.price.toFixed(2)} / {prod.unit}</td>
                    <td className="px-4 py-3 font-semibold">{prod.quantityAvailable} {prod.unit}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 capitalize">
                        {prod.availability.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                        title="Remove listing"
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
        <div className="space-y-4">
          <h3 className="font-bold text-stone-900 text-base">Inappropriate Content & Listing Reports</h3>
          {reports.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-xs text-stone-500">
              No reports filed yet.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(rep => (
                <div key={rep.id} className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="font-bold text-stone-900 text-sm">
                        Report on: {rep.itemTitle} ({rep.itemType})
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                        rep.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : rep.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {rep.status}
                    </span>
                  </div>

                  <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl">
                    <div className="font-semibold text-stone-800 mb-1">
                      Reason: <span className="text-red-700">{rep.reason.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-stone-600">{rep.description}</p>
                    <div className="text-[11px] text-stone-400 mt-2">
                      Reported by {rep.reporterName} on {new Date(rep.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {rep.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolveReport(rep.id, 'resolved')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Resolve & Moderate
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.id, 'dismissed')}
                        className="px-3.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-bold transition-colors"
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

      {/* TAB: ANNOUNCEMENTS */}
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
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Announcement broadcasted successfully to all user feeds and community group!
              </div>
            )}

            <form onSubmit={handleSendAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Headline / Title</label>
                <input
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
                type="submit"
                className="w-full py-3 bg-purple-800 hover:bg-purple-900 text-white font-bold rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Publish & Broadcast Live
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
