import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  subscribeToFirebasePosts,
  saveFirebasePost,
  deleteFirebasePost
} from '../services/firebasePosts';
import { MediaPost, MediaPostItem, Product, ProductUnit, User } from '../types';
import {
  ImagePlus,
  Video,
  Sparkles,
  Trash2,
  Edit3,
  MapPin,
  Tag,
  Heart,
  MessageSquareQuote,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Hash
} from 'lucide-react';

interface FarmerPostsTabProps {
  user: User;
  products: Product[];
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

const UNITS: ProductUnit[] = [
  'kg',
  'crate',
  'tray',
  'bag',
  'bag_50kg',
  'bale',
  'bunch',
  'bundle',
  'dozen',
  'litre',
  'bird',
  'head',
  'ton',
  'piece'
];

export const FarmerPostsTab: React.FC<FarmerPostsTabProps> = ({ user, products }) => {
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal / state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<MediaPost | null>(null);

  const [mediaItems, setMediaItems] = useState<MediaPostItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState('');

  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [productName, setProductName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState<string>('kg');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [taggedProductId, setTaggedProductId] = useState('');
  const [shareLocation, setShareLocation] = useState(true);
  const [customLocation, setCustomLocation] = useState(
    `${user.location?.city || 'Harare'}, ${user.location?.province || 'Zimbabwe'}`
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const mergePosts = (incoming: MediaPost[]) => {
    setPosts(prev => {
      const map = new Map<string, MediaPost>();
      for (const p of prev) {
        if (p.farmerId === user.id) map.set(p.id, p);
      }
      for (const p of incoming) {
        if (p.farmerId === user.id) map.set(p.id, p);
      }
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  };

  useEffect(() => {
    let active = true;
    setLoading(true);

    api
      .getMediaPosts(user.id)
      .then(list => {
        if (active && Array.isArray(list)) mergePosts(list);
      })
      .catch(err => console.warn('Could not load farmer posts from API:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsub = subscribeToFirebasePosts(
      user.id,
      fsPosts => {
        if (active && fsPosts.length > 0) {
          mergePosts(fsPosts);
        }
        if (active) setLoading(false);
      },
      err => console.warn('Firebase posts sub warning:', err)
    );

    return () => {
      active = false;
      unsub();
    };
  }, [user.id]);

  const resetForm = () => {
    setEditingPost(null);
    setMediaItems([]);
    setUploadProgress(null);
    setUploadingFileName('');
    setCaption('');
    setDescription('');
    setProductName('');
    setPrice('');
    setUnit('kg');
    setHashtagsInput('');
    setTaggedProductId('');
    setShareLocation(true);
    setCustomLocation(
      `${user.location?.city || 'Harare'}, ${user.location?.province || 'Zimbabwe'}`
    );
    setErrorMsg('');
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (post: MediaPost) => {
    setEditingPost(post);
    setMediaItems(post.media || []);
    setUploadProgress(null);
    setUploadingFileName('');
    setCaption(post.caption || '');
    setDescription(post.description || '');
    setProductName(post.productName || '');
    setPrice(post.price !== undefined ? String(post.price) : '');
    setUnit(post.unit || 'kg');
    setHashtagsInput((post.hashtags || []).join(' '));
    setTaggedProductId(post.taggedProductId || '');
    setShareLocation(post.shareLocation !== false && Boolean(post.location));
    setCustomLocation(
      post.location ||
        `${user.location?.city || 'Harare'}, ${user.location?.province || 'Zimbabwe'}`
    );
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleTaggedProductChange = (prodId: string) => {
    setTaggedProductId(prodId);
    const found = products.find(p => p.id === prodId);
    if (found) {
      if (!productName.trim()) setProductName(found.name);
      if (!price.trim()) setPrice(String(found.price));
      if (found.unit) setUnit(found.unit);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;

    setErrorMsg('');

    if (mediaItems.length + files.length > 6) {
      setErrorMsg('You can attach up to 6 photos or videos in a single showcase post.');
      return;
    }

    for (const file of files) {
      const mime = (file.type || '').toLowerCase();
      const lowerName = file.name.toLowerCase();
      const isImage =
        ALLOWED_IMAGE_TYPES.includes(mime) || /\.(jpg|jpeg|png|webp)$/.test(lowerName);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(mime) || /\.(mp4|webm)$/.test(lowerName);

      if (!isImage && !isVideo) {
        setErrorMsg(
          `Unsupported file "${file.name}". Please upload JPG, PNG, WebP images or MP4, WebM videos.`
        );
        return;
      }

      if (isImage && file.size > MAX_IMAGE_BYTES) {
        setErrorMsg(`Image "${file.name}" exceeds the 8MB limit.`);
        return;
      }

      if (isVideo && file.size > MAX_VIDEO_BYTES) {
        setErrorMsg(`Video "${file.name}" exceeds the 25MB limit.`);
        return;
      }
    }

    for (const file of files) {
      try {
        setUploadingFileName(file.name);
        setUploadProgress(5);
        const uploaded = await api.uploadMediaFile(file, percent => {
          setUploadProgress(percent);
        });
        setMediaItems(prev => [
          ...prev,
          {
            url: uploaded.url,
            type: uploaded.type,
            mimeType: uploaded.mimeType,
            fileName: uploaded.fileName
          }
        ]);
      } catch (err: any) {
        setErrorMsg(err?.message || `Failed to upload ${file.name}.`);
        break;
      } finally {
        setUploadProgress(null);
        setUploadingFileName('');
      }
    }
  };

  const parseHashtags = (raw: string): string[] => {
    return Array.from(
      new Set(
        raw
          .split(/[\s,]+/)
          .map(t => t.trim())
          .filter(Boolean)
          .map(t => (t.startsWith('#') ? t : `#${t}`))
      )
    ).slice(0, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (mediaItems.length === 0) {
      setErrorMsg('Please upload at least one image or video for your showcase post.');
      return;
    }
    if (!caption.trim()) {
      setErrorMsg('Please add a caption describing what you are showcasing.');
      return;
    }

    const taggedProd = products.find(p => p.id === taggedProductId);
    const parsedPrice = price.trim() && !isNaN(Number(price)) ? Number(price) : undefined;
    const parsedHashtags = parseHashtags(hashtagsInput);

    setSubmitting(true);
    try {
      const payload = {
        farmerId: user.id,
        farmerName: user.name,
        farmerAvatar: user.avatar,
        farmName: user.farmerProfile?.farmName || `${user.name}'s Farm`,
        sellerRole: user.role,
        media: mediaItems,
        caption: caption.trim(),
        description: description.trim() || undefined,
        productName: productName.trim() || taggedProd?.name || undefined,
        price: parsedPrice,
        unit: parsedPrice !== undefined ? unit : undefined,
        hashtags: parsedHashtags,
        taggedProductId: taggedProd?.id || undefined,
        taggedProductName: taggedProd?.name || undefined,
        shareLocation,
        location: shareLocation ? customLocation.trim() : undefined
      };

      let savedPost: MediaPost;
      if (editingPost) {
        try {
          savedPost = await api.updateMediaPost(editingPost.id, payload);
        } catch {
          savedPost = {
            ...editingPost,
            ...payload,
            updatedAt: new Date().toISOString()
          };
        }
        await saveFirebasePost(savedPost);
        setStatusMsg('Showcase post updated successfully.');
      } else {
        try {
          savedPost = await api.createMediaPost(payload);
        } catch {
          const now = new Date().toISOString();
          savedPost = {
            id: `post-${Date.now()}`,
            ...payload,
            likesCount: 0,
            likedBy: [],
            quoteRequestsCount: 0,
            createdAt: now,
            updatedAt: now
          };
        }
        await saveFirebasePost(savedPost);
        setStatusMsg('Your Farm Showcase post is now live in the FarmBridge Community!');
      }

      mergePosts([savedPost]);
      setIsFormOpen(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not publish post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await api.deleteMediaPost(postId, user.id).catch(() => {});
      await deleteFirebasePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setConfirmDeleteId(null);
      setStatusMsg('Post deleted from FarmBridge Community.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not delete post.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Farm Showcase</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
            Posts & Community Showcase
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Share photos and short videos of your harvests, livestock, or fodder directly with marketplace buyers.
          </p>
        </div>

        <button
          id="new-showcase-post-btn"
          type="button"
          onClick={openCreateForm}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Showcase Post</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg('')}
            className="text-emerald-700 hover:text-emerald-900 p-1"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create / Edit Post Drawer or Panel */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border-2 border-emerald-200 p-5 sm:p-6 space-y-5 shadow-md"
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="font-bold text-stone-900 text-base">
              {editingPost ? 'Edit Showcase Post' : 'New Farm Showcase Post'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Media Uploader */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-stone-700">
                Photos or Videos * (JPG, PNG, WebP ≤8MB • MP4, WebM ≤25MB)
              </label>
              <span className="text-[11px] text-stone-500">{mediaItems.length}/6 uploaded</span>
            </div>

            <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 cursor-pointer transition-colors text-center">
              <div className="flex items-center gap-2 text-emerald-700">
                <ImagePlus className="w-5 h-5" />
                <Video className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-emerald-900">
                Click to select single or multiple photos / videos
              </span>
              <span className="text-[11px] text-stone-500">
                Supports carousel galleries and farm video clips
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                onChange={handleMediaUpload}
                className="hidden"
                disabled={uploadProgress !== null}
              />
            </label>

            {uploadProgress !== null && (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                  <span className="truncate">Uploading {uploadingFileName}...</span>
                  <span className="tabular-nums text-emerald-700">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {mediaItems.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {mediaItems.map((m, idx) => (
                  <div
                    key={`${m.url}-${idx}`}
                    className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-100 aspect-square group"
                  >
                    {m.type === 'video' ? (
                      <video
                        src={m.url}
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={m.url}
                        alt={m.fileName || `Media ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setMediaItems(prev => prev.filter((_, i) => i !== idx))
                      }
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      aria-label="Remove media"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {m.type === 'video' && (
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
                        VIDEO
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Post Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="font-bold text-stone-700 block mb-1">Caption *</label>
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="e.g. Morning harvest of greenhouse Roma tomatoes ready for dispatch!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-stone-700 block mb-1">
                Detailed Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Share quality notes, pack sizes, harvest practices, or bulk delivery terms..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Tag Existing Listing (Optional)
              </label>
              <select
                value={taggedProductId}
                onChange={e => handleTaggedProductChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- No linked product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.price.toFixed(2)}/{p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Featured Product Name (Optional)
              </label>
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="e.g. Organic Roma Tomatoes"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1">
                Indicative Price USD (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="e.g. 12.00"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="w-28 px-2.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900"
                >
                  {UNITS.map(u => (
                    <option key={u} value={u}>
                      /{u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-stone-700 block mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-emerald-600" />
                Hashtags (Optional)
              </label>
              <input
                type="text"
                value={hashtagsInput}
                onChange={e => setHashtagsInput(e.target.value)}
                placeholder="#FreshHarvest #HarareFarms #Organic"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="sm:col-span-2 p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 font-semibold text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareLocation}
                  onChange={e => setShareLocation(e.target.checked)}
                  className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Share farm location on this post</span>
              </label>
              {shareLocation && (
                <input
                  type="text"
                  value={customLocation}
                  onChange={e => setCustomLocation(e.target.value)}
                  placeholder="City, Province"
                  className="sm:w-64 px-3 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-900"
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold text-xs hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadProgress !== null}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingPost ? 'Save Post Changes' : 'Publish to Community'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Existing Posts List */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-500 text-xs flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Loading your Farm Showcase posts...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center space-y-3">
          <ImagePlus className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-bold text-stone-900 text-sm">No Showcase Posts Yet</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Upload photos or videos of your crops, livestock, or fodder bales so buyers can discover your farm and request quotes directly.
          </p>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            <span>Post Your First Update</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map(post => {
            const leadMedia = post.media?.[0];
            return (
              <div
                key={post.id}
                className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-stone-100">
                  {leadMedia?.type === 'video' ? (
                    <video
                      src={leadMedia.url}
                      controls
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : leadMedia ? (
                    <img
                      src={leadMedia.url}
                      alt={post.caption}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                  {post.media.length > 1 && (
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-bold">
                      1 / {post.media.length}
                    </span>
                  )}
                  {post.price !== undefined && (
                    <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-white/95 text-emerald-800 text-xs font-extrabold shadow-xs tabular-nums">
                      ${post.price.toFixed(2)}
                      {post.unit ? `/${post.unit}` : ''}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      {post.location && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          {post.location}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-stone-900 text-sm line-clamp-2">
                      {post.caption}
                    </h4>
                    {post.description && (
                      <p className="text-xs text-stone-600 line-clamp-2">{post.description}</p>
                    )}
                    {post.taggedProductName && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-semibold">
                        <Tag className="w-3 h-3" />
                        <span>{post.taggedProductName}</span>
                      </div>
                    )}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {post.hashtags.slice(0, 4).map(tag => (
                          <span
                            key={tag}
                            className="text-[11px] text-emerald-700 font-semibold"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-stone-100 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-stone-600">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        {post.likesCount || 0} likes
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <MessageSquareQuote className="w-3.5 h-3.5 text-emerald-600" />
                        {post.quoteRequestsCount || 0} quote inquiries
                      </span>
                    </div>

                    {confirmDeleteId === post.id ? (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-red-800">Delete this post?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(post)}
                          className="flex-1 py-2 px-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(post.id)}
                          className="py-2 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
