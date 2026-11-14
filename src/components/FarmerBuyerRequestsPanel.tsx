import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  subscribeToFirebaseBuyerRequests,
  markFirebaseRequestResponded
} from '../services/firebaseRequests';
import { createFirebaseNotification } from '../services/firebaseNotifications';
import { BuyerRequest, BuyerRequestStatus, ProductCategory, User } from '../types';
import {
  Megaphone,
  Search,
  MapPin,
  Package,
  DollarSign,
  Calendar,
  MessageSquareReply,
  CheckCircle2,
  Loader2,
  Archive,
  Clock
} from 'lucide-react';

interface FarmerBuyerRequestsPanelProps {
  user: User;
  onRespondToRequest: (request: BuyerRequest) => void;
}

const STATUS_BADGE: Record<BuyerRequestStatus, { label: string; classes: string }> = {
  open: {
    label: 'Open',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  in_discussion: {
    label: 'In Discussion',
    classes: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  handled: {
    label: 'Handled',
    classes: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-stone-100 text-stone-600 border-stone-200'
  }
};

export const FarmerBuyerRequestsPanel: React.FC<FarmerBuyerRequestsPanelProps> = ({
  user,
  onRespondToRequest
}) => {
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'open' | 'in_discussion' | 'handled' | 'all'>('active');

  const mergeRequests = (incoming: BuyerRequest[]) => {
    setRequests(prev => {
      const map = new Map<string, BuyerRequest>();
      for (const r of prev) map.set(r.id, r);
      for (const r of incoming) map.set(r.id, r);
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  };

  useEffect(() => {
    let active = true;
    api
      .getCategories()
      .then(cats => {
        if (active && Array.isArray(cats)) setCategories(cats);
      })
      .catch(() => {});

    api
      .getBuyerRequests()
      .then(list => {
        if (active && Array.isArray(list)) mergeRequests(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsub = subscribeToFirebaseBuyerRequests(
      undefined,
      fsList => {
        if (active && fsList.length > 0) mergeRequests(fsList);
        if (active) setLoading(false);
      },
      err => console.warn('Farmer buyer requests sub warning:', err)
    );

    return () => {
      active = false;
      unsub();
    };
  }, []);

  const matchesDateFilter = (createdAt: string): boolean => {
    if (dateFilter === 'all') return true;
    const ageMs = Date.now() - new Date(createdAt).getTime();
    if (dateFilter === 'today') return ageMs <= 24 * 60 * 60 * 1000;
    if (dateFilter === '7d') return ageMs <= 7 * 24 * 60 * 60 * 1000;
    if (dateFilter === '30d') return ageMs <= 30 * 24 * 60 * 60 * 1000;
    return true;
  };

  const baseFiltered = requests.filter(req => {
    if (categoryFilter !== 'all' && req.category !== categoryFilter) return false;
    if (
      locationFilter.trim() &&
      !req.location.toLowerCase().includes(locationFilter.trim().toLowerCase()) &&
      !req.productName.toLowerCase().includes(locationFilter.trim().toLowerCase())
    ) {
      return false;
    }
    if (!matchesDateFilter(req.createdAt)) return false;
    return true;
  });

  const activeRequests = baseFiltered.filter(r => {
    if (statusFilter === 'open') return r.status === 'open';
    if (statusFilter === 'in_discussion') return r.status === 'in_discussion';
    if (statusFilter === 'handled') return false;
    if (statusFilter === 'active') return r.status === 'open' || r.status === 'in_discussion';
    return r.status === 'open' || r.status === 'in_discussion';
  });

  const archivedRequests = baseFiltered.filter(r => {
    if (statusFilter === 'handled') return r.status === 'handled';
    if (statusFilter === 'all') return r.status === 'handled' || r.status === 'cancelled';
    return false;
  });

  const handleRespond = async (req: BuyerRequest) => {
    if (req.status === 'handled' || req.status === 'cancelled') return;
    setRespondingId(req.id);
    try {
      let updatedReq = req;
      try {
        updatedReq = await api.respondToBuyerRequest(req.id, user.id, user.name);
      } catch {
        const nextResponders = Array.from(
          new Set([...(req.respondedFarmerIds || []), user.id])
        );
        updatedReq = {
          ...req,
          status: 'in_discussion',
          respondedFarmerIds: nextResponders,
          responseCount: nextResponders.length,
          updatedAt: new Date().toISOString()
        };
      }
      await markFirebaseRequestResponded(req.id, user.id, req);
      await createFirebaseNotification({
        userId: req.buyerId,
        title: `Farmer Responded to Your Request`,
        message: `${user.farmerProfile?.farmName || user.name} responded regarding "${req.productName}".`,
        type: 'request',
        link: `/messages?requestId=${req.id}`,
        metadata: { requestId: req.id, farmerId: user.id }
      });

      mergeRequests([updatedReq]);
      onRespondToRequest(updatedReq);
    } finally {
      setRespondingId(null);
    }
  };

  const renderCard = (req: BuyerRequest) => {
    const badge = STATUS_BADGE[req.status] || STATUS_BADGE.open;
    const isClosed = req.status === 'handled' || req.status === 'cancelled';
    const hasResponded = (req.respondedFarmerIds || []).includes(user.id);

    return (
      <div
        key={req.id}
        className={`p-5 rounded-3xl border flex flex-col justify-between space-y-4 transition-all ${
          isClosed
            ? 'bg-stone-50/80 border-stone-200 opacity-85'
            : 'bg-white border-stone-200 shadow-xs hover:border-emerald-300'
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                {req.categoryName}
              </span>
              <h3 className="font-extrabold text-stone-900 text-base leading-snug">
                {req.productName}
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Posted by <span className="font-semibold text-stone-700">{req.buyerName}</span> •{' '}
                {new Date(req.createdAt).toLocaleDateString()}
              </p>
            </div>

            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${badge.classes}`}
            >
              {badge.label}
            </span>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">{req.description}</p>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-700">
            <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200">
              <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-bold truncate">{req.quantityRequired}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{req.location}</span>
            </div>
            {req.preferredPrice !== undefined && (
              <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold tabular-nums">
                  Budget: ${req.preferredPrice.toFixed(2)}
                </span>
              </div>
            )}
            {req.requiredDate && (
              <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>By {new Date(req.requiredDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {req.notes && (
            <p className="text-[11px] text-stone-500 bg-stone-50 px-3 py-2 rounded-xl border border-stone-100">
              <span className="font-semibold text-stone-700">Buyer Notes:</span> {req.notes}
            </p>
          )}

          {req.referenceImages && req.referenceImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pt-1">
              {req.referenceImages.map((imgUrl, idx) => (
                <img
                  key={`${req.id}-ref-${idx}`}
                  src={imgUrl}
                  alt="Buyer reference"
                  className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                />
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
          <div className="text-[11px] text-stone-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {req.responseCount || 0} farm response{(req.responseCount || 0) === 1 ? '' : 's'}
            </span>
          </div>

          <button
            type="button"
            disabled={isClosed || respondingId === req.id}
            onClick={() => handleRespond(req)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              isClosed
                ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
            }`}
          >
            {respondingId === req.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isClosed ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <MessageSquareReply className="w-3.5 h-3.5" />
            )}
            <span>
              {req.status === 'handled'
                ? 'Handled'
                : req.status === 'cancelled'
                  ? 'Cancelled'
                  : hasResponded
                    ? 'Continue Discussion'
                    : 'Respond to Request'}
            </span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mb-1.5">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Active Buyer Demand</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
              Buyer Requests Marketplace
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Browse what buyers are actively sourcing and respond directly to negotiate pricing, quantities, and delivery.
            </p>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 shrink-0">
            {requests.filter(r => r.status === 'open' || r.status === 'in_discussion').length} Active
            Requests
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2 border-t border-stone-100">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              placeholder="Filter by location or produce..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-900"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-900"
          >
            <option value="all">Any Date Posted</option>
            <option value="today">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 font-semibold"
          >
            <option value="active">Open & In Discussion (Default)</option>
            <option value="open">Open Only</option>
            <option value="in_discussion">In Discussion Only</option>
            <option value="handled">Handled Requests</option>
            <option value="all">All Requests (Including Handled)</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-500 text-xs flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Loading buyer requests...</span>
        </div>
      ) : activeRequests.length === 0 && archivedRequests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center space-y-2">
          <Megaphone className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-bold text-stone-900 text-sm">No Matching Buyer Requests</h3>
          <p className="text-xs text-stone-500">
            Try clearing your category or location filter to see more active requests from buyers.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeRequests.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeRequests.map(renderCard)}
            </div>
          )}

          {archivedRequests.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
                <Archive className="w-4 h-4" />
                <span>Handled & Closed Requests ({archivedRequests.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {archivedRequests.map(renderCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
