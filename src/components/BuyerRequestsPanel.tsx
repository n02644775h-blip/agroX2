import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  subscribeToFirebaseBuyerRequests,
  saveFirebaseBuyerRequest,
  updateFirebaseBuyerRequestStatus,
  deleteFirebaseBuyerRequest
} from '../services/firebaseRequests';
import { createFirebaseNotification } from '../services/firebaseNotifications';
import { BuyerRequest, BuyerRequestStatus, ProductCategory, User } from '../types';
import { LiquidGlassCard, LiquidGlassButton, LiquidGlassModal } from './glass';
import {
  Plus,
  Megaphone,
  MapPin,
  Calendar,
  Package,
  DollarSign,
  CheckCircle2,
  MessageSquare,
  Edit3,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  ImagePlus,
  RotateCcw,
  Ban
} from 'lucide-react';

interface BuyerRequestsPanelProps {
  user: User;
  onOpenMessages?: (req: BuyerRequest) => void;
}

const STATUS_BADGE: Record<BuyerRequestStatus, { label: string; classes: string }> = {
  open: {
    label: 'Open',
    classes: 'bg-[#DFF4E4]/90 text-[#145A38] border-[#145A38]/20'
  },
  in_discussion: {
    label: 'In Discussion',
    classes: 'bg-[#F4D35E]/30 text-[#694800] border-[#F4D35E]/50'
  },
  handled: {
    label: 'Handled',
    classes: 'bg-sky-500/15 text-sky-900 border-sky-500/25'
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-black/5 text-[#062B1F]/65 border-[#062B1F]/15'
  }
};

export const BuyerRequestsPanel: React.FC<BuyerRequestsPanelProps> = ({
  user,
  onOpenMessages
}) => {
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | BuyerRequestStatus>('all');

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<BuyerRequest | null>(null);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [quantityRequired, setQuantityRequired] = useState('');
  const [preferredPrice, setPreferredPrice] = useState('');
  const [location, setLocation] = useState(
    `${user.location?.city || 'Harare'}, ${user.location?.province || 'Zimbabwe'}`
  );
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusNotice, setStatusNotice] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const mergeRequests = (incoming: BuyerRequest[]) => {
    setRequests(prev => {
      const map = new Map<string, BuyerRequest>();
      for (const r of prev) {
        if (r.buyerId === user.id) map.set(r.id, r);
      }
      for (const r of incoming) {
        if (r.buyerId === user.id) map.set(r.id, r);
      }
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
        if (active && Array.isArray(cats)) {
          setCategories(cats);
          if (cats.length > 0 && !category) setCategory(cats[0].id);
        }
      })
      .catch(() => {});

    api
      .getBuyerRequests({ buyerId: user.id })
      .then(list => {
        if (active && Array.isArray(list)) mergeRequests(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsub = subscribeToFirebaseBuyerRequests(
      { buyerId: user.id },
      fsList => {
        if (active && fsList.length > 0) mergeRequests(fsList);
        if (active) setLoading(false);
      },
      err => console.warn('Buyer requests sub warning:', err)
    );

    return () => {
      active = false;
      unsub();
    };
  }, [user.id]);

  const resetForm = () => {
    setEditingReq(null);
    setProductName('');
    setCategory(categories[0]?.id || 'cat-vegetables');
    setDescription('');
    setQuantityRequired('');
    setPreferredPrice('');
    setLocation(
      `${user.location?.city || 'Harare'}, ${user.location?.province || 'Zimbabwe'}`
    );
    setRequiredDate('');
    setNotes('');
    setReferenceImages([]);
    setUploadProgress(null);
    setErrorMsg('');
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (req: BuyerRequest) => {
    setEditingReq(req);
    setProductName(req.productName);
    setCategory(req.category);
    setDescription(req.description);
    setQuantityRequired(req.quantityRequired);
    setPreferredPrice(req.preferredPrice !== undefined ? String(req.preferredPrice) : '');
    setLocation(req.location);
    setRequiredDate(req.requiredDate || '');
    setNotes(req.notes || '');
    setReferenceImages(req.referenceImages || []);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;

    if (referenceImages.length + files.length > 4) {
      setErrorMsg('You can attach up to 4 reference images.');
      return;
    }

    setErrorMsg('');
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Only image files (JPG, PNG, WebP) are allowed for reference photos.');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setErrorMsg(`Image "${file.name}" exceeds 8MB.`);
        return;
      }
      try {
        setUploadProgress(10);
        const uploaded = await api.uploadMediaFile(file, pct => setUploadProgress(pct));
        setReferenceImages(prev => [...prev, uploaded.url]);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Failed to upload image.');
        break;
      } finally {
        setUploadProgress(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!productName.trim() || !description.trim() || !quantityRequired.trim() || !location.trim()) {
      setErrorMsg('Please complete all required fields (Product/Service, Quantity, Location, Description).');
      return;
    }

    const catObj = categories.find(c => c.id === category);
    const parsedPrice =
      preferredPrice.trim() && !isNaN(Number(preferredPrice))
        ? Number(preferredPrice)
        : undefined;

    setSubmitting(true);
    try {
      const payload = {
        buyerId: user.id,
        buyerName: user.name,
        buyerAvatar: user.avatar,
        buyerPhone: user.phone,
        productName: productName.trim(),
        category: category || 'cat-other',
        categoryName: catObj?.name || 'Other Produce',
        description: description.trim(),
        quantityRequired: quantityRequired.trim(),
        preferredPrice: parsedPrice,
        location: location.trim(),
        requiredDate: requiredDate || undefined,
        notes: notes.trim() || undefined,
        referenceImages
      };

      let savedReq: BuyerRequest;
      if (editingReq) {
        try {
          savedReq = await api.updateBuyerRequest(editingReq.id, payload);
        } catch {
          savedReq = {
            ...editingReq,
            ...payload,
            updatedAt: new Date().toISOString()
          };
        }
        await saveFirebaseBuyerRequest(savedReq);
        setStatusNotice('Buyer request updated.');
      } else {
        try {
          savedReq = await api.createBuyerRequest(payload);
        } catch {
          const now = new Date().toISOString();
          savedReq = {
            id: `req-${Date.now()}`,
            ...payload,
            status: 'open',
            respondedFarmerIds: [],
            responseCount: 0,
            createdAt: now,
            updatedAt: now
          };
        }
        await saveFirebaseBuyerRequest(savedReq);

        // Notify active farmers in Firestore (best effort)
        api
          .getUsers()
          .then(allUsers => {
            const sellers = allUsers
              .filter(
                u =>
                  (u.role === 'farmer' || u.role === 'fodder_supplier') &&
                  u.status === 'active'
              )
              .slice(0, 20);
            return Promise.all(
              sellers.map(s =>
                createFirebaseNotification({
                  userId: s.id,
                  title: `New Buyer Request: ${savedReq.productName}`,
                  message: `${user.name} needs ${savedReq.quantityRequired} in ${savedReq.location}.`,
                  type: 'request',
                  link: `/farmer-dashboard?tab=requests&requestId=${savedReq.id}`,
                  metadata: { requestId: savedReq.id }
                })
              )
            );
          })
          .catch(() => {});

        setStatusNotice('Your request has been posted! Farmers can now review and respond.');
      }

      mergeRequests([savedReq]);
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save buyer request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (req: BuyerRequest, nextStatus: BuyerRequestStatus) => {
    try {
      let updated: BuyerRequest;
      try {
        updated = await api.updateBuyerRequestStatus(req.id, nextStatus, user.id);
      } catch {
        updated = {
          ...req,
          status: nextStatus,
          handledAt: nextStatus === 'handled' ? new Date().toISOString() : req.handledAt,
          updatedAt: new Date().toISOString()
        };
      }
      await updateFirebaseBuyerRequestStatus(req.id, nextStatus, req);

      if (nextStatus === 'handled' && Array.isArray(req.respondedFarmerIds)) {
        await Promise.all(
          req.respondedFarmerIds.map(fId =>
            createFirebaseNotification({
              userId: fId,
              title: `Buyer Request Handled`,
              message: `${user.name} marked "${req.productName}" as Handled.`,
              type: 'request',
              link: `/farmer-dashboard?tab=requests&requestId=${req.id}`,
              metadata: { requestId: req.id }
            })
          )
        );
      }

      mergeRequests([updated]);
      setStatusNotice(
        nextStatus === 'handled'
          ? `Request "${req.productName}" marked as Handled.`
          : nextStatus === 'open'
            ? `Request "${req.productName}" reopened.`
            : `Request "${req.productName}" cancelled.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not update request status.');
    }
  };

  const handleDelete = async (reqId: string) => {
    try {
      await api.deleteBuyerRequest(reqId, user.id).catch(() => {});
      await deleteFirebaseBuyerRequest(reqId);
      setRequests(prev => prev.filter(r => r.id !== reqId));
      setConfirmDeleteId(null);
      setStatusNotice('Request removed.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not delete request.');
    }
  };

  const filtered = requests.filter(r =>
    filterStatus === 'all' ? true : r.status === filterStatus
  );

  return (
    <LiquidGlassCard id="buyer-my-requests-section" variant="light" className="p-5 sm:p-7">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#062B1F]/10 pb-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#145A38] flex items-center gap-1.5 mb-1">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Sourcing & Inquiries</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#062B1F]">
              My Requests
            </h2>
            <p className="text-xs text-[#0B3D2B]/70 mt-0.5">
              Looking for bulk produce, specific varieties, or custom deliveries? Post a request for local farmers to respond.
            </p>
          </div>

          <LiquidGlassButton
            id="buyer-create-request-btn"
            type="button"
            variant="lime"
            size="sm"
            onClick={openCreateModal}
          >
            <Plus className="w-4 h-4" />
            <span>Create Request</span>
          </LiquidGlassButton>
        </div>

        {statusNotice && (
          <div className="p-3.5 rounded-2xl bg-[#DFF4E4]/80 border border-[#145A38]/20 text-[#062B1F] text-xs font-semibold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#145A38] shrink-0" />
              <span>{statusNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusNotice('')}
              className="text-[#145A38] hover:text-[#062B1F] p-1 cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: `All (${requests.length})` },
              { id: 'open', label: `Open (${requests.filter(r => r.status === 'open').length})` },
              {
                id: 'in_discussion',
                label: `In Discussion (${requests.filter(r => r.status === 'in_discussion').length})`
              },
              {
                id: 'handled',
                label: `Handled (${requests.filter(r => r.status === 'handled').length})`
              }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                filterStatus === tab.id
                  ? 'bg-[#062B1F] text-[#A8E635] border-[#062B1F] shadow-sm'
                  : 'bg-white/70 text-[#0B3D2B]/75 border-[#062B1F]/12 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Request Cards */}
        {loading ? (
          <div className="py-12 text-center text-[#0B3D2B]/65 text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#145A38]" />
            <span>Loading your product requests...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center bg-white/50 rounded-2xl border border-dashed border-[#062B1F]/15 space-y-3 px-4">
            <Megaphone className="w-9 h-9 text-[#145A38]/40 mx-auto" />
            <h3 className="font-bold text-[#062B1F] text-sm">No Product Requests Found</h3>
            <p className="text-xs text-[#0B3D2B]/70 max-w-md mx-auto">
              Create a request detailing the agricultural products, quantity, and location you need so verified farmers can reach out with quotes.
            </p>
            <div className="pt-1">
              <LiquidGlassButton type="button" variant="emerald" size="sm" onClick={openCreateModal}>
                <Plus className="w-4 h-4" />
                <span>Create Request</span>
              </LiquidGlassButton>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(req => {
              const badge = STATUS_BADGE[req.status] || STATUS_BADGE.open;
              const isClosed = req.status === 'handled' || req.status === 'cancelled';

              return (
                <div
                  key={req.id}
                  className="p-4 sm:p-5 rounded-2xl border border-white/75 bg-white/65 backdrop-blur-md flex flex-col justify-between space-y-3.5 shadow-xs hover:bg-white/80 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-[#145A38] uppercase tracking-wider">
                          {req.categoryName}
                        </span>
                        <h4 className="font-extrabold text-[#062B1F] text-sm sm:text-base leading-snug">
                          {req.productName}
                        </h4>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <p className="text-xs text-[#0B3D2B]/80 leading-relaxed">{req.description}</p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#062B1F] pt-1">
                      <div className="flex items-center gap-1.5 bg-white/85 px-2.5 py-1.5 rounded-xl border border-[#062B1F]/10">
                        <Package className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                        <span className="font-semibold truncate">{req.quantityRequired}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/85 px-2.5 py-1.5 rounded-xl border border-[#062B1F]/10">
                        <MapPin className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                        <span className="truncate">{req.location}</span>
                      </div>
                      {req.preferredPrice !== undefined && (
                        <div className="flex items-center gap-1.5 bg-white/85 px-2.5 py-1.5 rounded-xl border border-[#062B1F]/10">
                          <DollarSign className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                          <span className="font-semibold tabular-nums">
                            Target: ${req.preferredPrice.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {req.requiredDate && (
                        <div className="flex items-center gap-1.5 bg-white/85 px-2.5 py-1.5 rounded-xl border border-[#062B1F]/10">
                          <Calendar className="w-3.5 h-3.5 text-[#145A38] shrink-0" />
                          <span>Needed: {new Date(req.requiredDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {req.notes && (
                      <p className="text-[11px] text-[#0B3D2B]/65 italic">Note: {req.notes}</p>
                    )}

                    {req.referenceImages && req.referenceImages.length > 0 && (
                      <div className="flex gap-2 pt-1 overflow-x-auto">
                        {req.referenceImages.map((imgUrl, idx) => (
                          <img
                            key={`${req.id}-img-${idx}`}
                            src={imgUrl}
                            alt="Reference"
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover border border-white/80 shadow-xs shrink-0"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer & Ownership Controls */}
                  <div className="pt-3 border-t border-[#062B1F]/10 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[#0B3D2B]/65">
                      <span>Posted {new Date(req.createdAt).toLocaleDateString()}</span>
                      <span className="font-bold text-[#062B1F] tabular-nums">
                        {req.responseCount || 0} farmer response{(req.responseCount || 0) === 1 ? '' : 's'}
                      </span>
                    </div>

                    {confirmDeleteId === req.id ? (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-rose-800">Delete request?</span>
                        <div className="flex items-center gap-1.5">
                          <LiquidGlassButton
                            type="button"
                            variant="danger"
                            size="xs"
                            onClick={() => handleDelete(req.id)}
                          >
                            Delete
                          </LiquidGlassButton>
                          <LiquidGlassButton
                            type="button"
                            variant="light"
                            size="xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Keep
                          </LiquidGlassButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {!isClosed && (
                          <LiquidGlassButton
                            type="button"
                            variant="emerald"
                            size="xs"
                            onClick={() => handleStatusChange(req, 'handled')}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark as Handled</span>
                          </LiquidGlassButton>
                        )}

                        {req.status === 'handled' && (
                          <LiquidGlassButton
                            type="button"
                            variant="light"
                            size="xs"
                            onClick={() => handleStatusChange(req, 'open')}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reopen Request</span>
                          </LiquidGlassButton>
                        )}

                        {onOpenMessages && (
                          <LiquidGlassButton
                            type="button"
                            variant="light"
                            size="xs"
                            onClick={() => onOpenMessages(req)}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-[#145A38]" />
                            <span>Messages</span>
                          </LiquidGlassButton>
                        )}

                        {req.status === 'open' && (
                          <LiquidGlassButton
                            type="button"
                            variant="light"
                            size="xs"
                            onClick={() => openEditModal(req)}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </LiquidGlassButton>
                        )}

                        {!isClosed && (
                          <LiquidGlassButton
                            type="button"
                            variant="light"
                            size="xs"
                            onClick={() => handleStatusChange(req, 'cancelled')}
                            title="Cancel Request"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </LiquidGlassButton>
                        )}

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(req.id)}
                          className="ml-auto p-1.5 rounded-xl text-[#0B3D2B]/45 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          aria-label="Delete request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Request Modal */}
      <LiquidGlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReq ? 'Edit Product Request' : 'Create Product Request'}
        subtitle="Specify produce quantities, location, and target pricing for farmers"
        icon={<Megaphone className="w-5 h-5 text-[#A8E635]" />}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-[#062B1F] block mb-1">
                Product or Service Name *
              </label>
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="e.g. Fresh Roma Tomatoes"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                required
              />
            </div>

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                required
              >
                {categories.length === 0 ? (
                  <option value="cat-vegetables">Fresh Vegetables</option>
                ) : (
                  categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">
                Quantity Required *
              </label>
              <input
                type="text"
                value={quantityRequired}
                onChange={e => setQuantityRequired(e.target.value)}
                placeholder="e.g. 500 kg / 40 crates"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                required
              />
            </div>

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">
                Preferred Price / Budget USD (Optional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={preferredPrice}
                onChange={e => setPreferredPrice(e.target.value)}
                placeholder="e.g. 420.00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25 tabular-nums"
              />
            </div>

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">Location *</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Bulawayo CBD"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                required
              />
            </div>

            <div>
              <label className="font-bold text-[#062B1F] block mb-1">
                Required By Date (Optional)
              </label>
              <input
                type="date"
                value={requiredDate}
                onChange={e => setRequiredDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[#062B1F] block mb-1">
              Detailed Description *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe quality specs, packaging preferences, delivery vs pickup options..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
              required
            />
          </div>

          <div>
            <label className="font-bold text-[#062B1F] block mb-1">
              Additional Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Ongoing weekly supply contract possible"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#062B1F]/15 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
            />
          </div>

          {/* Optional Reference Images */}
          <div className="space-y-2">
            <label className="font-bold text-[#062B1F] block">
              Reference Images (Optional, up to 4)
            </label>
            <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-[#145A38]/35 bg-[#DFF4E4]/45 hover:bg-[#DFF4E4]/75 text-[#062B1F] font-bold cursor-pointer transition-colors">
              <ImagePlus className="w-4 h-4 text-[#145A38]" />
              <span>Upload Reference Photo</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {uploadProgress !== null && (
              <div className="w-full h-1.5 rounded-full bg-[#062B1F]/10 overflow-hidden">
                <div
                  className="h-full bg-[#145A38]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
            {referenceImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {referenceImages.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="relative w-16 h-16">
                    <img
                      src={url}
                      alt="Reference preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-xl border border-white/80 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setReferenceImages(prev => prev.filter((_, i) => i !== idx))
                      }
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#062B1F] text-white flex items-center justify-center cursor-pointer"
                      aria-label="Remove reference image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#062B1F]/10">
            <LiquidGlassButton
              type="button"
              variant="light"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </LiquidGlassButton>
            <LiquidGlassButton
              type="submit"
              variant="emerald"
              size="sm"
              disabled={submitting || uploadProgress !== null}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingReq ? 'Update Request' : 'Submit Buyer Request'}</span>
            </LiquidGlassButton>
          </div>
        </form>
      </LiquidGlassModal>
    </LiquidGlassCard>
  );
};
