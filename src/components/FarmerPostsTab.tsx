import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { auth } from '../firebase/config';
import {
  subscribeToFirebasePosts,
  saveFirebasePost,
  deleteFirebasePost
} from '../services/firebasePosts';
import {
  buildShowcaseStoragePath,
  uploadBlobToFirebaseStorageWithResult,
  syncServerMediaToFirebaseStorage,
  deleteFirebaseStorageFile
} from '../services/firebaseStorage';
import { MediaPost, MediaPostItem, Product, ProductUnit, User } from '../types';
import { LiquidGlassCard, LiquidGlassButton } from './glass';
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

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence'
];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];

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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<MediaPost | null>(null);

  const [mediaItems, setMediaItems] = useState<MediaPostItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const [uploadStatusNote, setUploadStatusNote] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

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

  const submitLockRef = useRef(false);
  const pendingStoragePathsRef = useRef<string[]>([]);

  const cleanupPendingStorageUploads = async (paths?: string[]) => {
    const targets = paths ? [...paths] : [...pendingStoragePathsRef.current];
    if (targets.length === 0) return;
    if (!paths) {
      pendingStoragePathsRef.current = [];
    }
    for (const p of targets) {
      await deleteFirebaseStorageFile(p);
    }
  };

  useEffect(() => {
    return () => {
      if (pendingStoragePathsRef.current.length > 0) {
        const paths = [...pendingStoragePathsRef.current];
        pendingStoragePathsRef.current = [];
        paths.forEach((p) => {
          void deleteFirebaseStorageFile(p);
        });
      }
    };
  }, []);

  const extractFriendlyError = (err: any, fallback: string): string => {
    const raw = err?.message ? String(err.message) : '';
    if (!raw) return fallback;
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.error) {
          if (String(parsed.error).toLowerCase().includes('permission')) {
            return 'Permission denied saving your showcase post. Please confirm you are signed in as the farm owner.';
          }
          return String(parsed.error);
        }
      } catch {
        // fallback below
      }
    }
    return raw;
  };

  const mergePosts = (incoming: MediaPost[]) => {
    setPosts((prev) => {
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
      .then((list) => {
        if (active && Array.isArray(list)) mergePosts(list);
      })
      .catch((err) => console.warn('Could not load farmer posts from API:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsub = subscribeToFirebasePosts(
      user.id,
      (fsPosts) => {
        if (active && fsPosts.length > 0) {
          mergePosts(fsPosts);
        }
        if (active) setLoading(false);
      },
      (err) => console.warn('Firebase posts sub warning:', err)
    );

    return () => {
      active = false;
      unsub();
    };
  }, [user.id]);

  const resetForm = (discardPendingUploads = true) => {
    if (discardPendingUploads) {
      void cleanupPendingStorageUploads();
    } else {
      pendingStoragePathsRef.current = [];
    }
    setEditingPost(null);
    setMediaItems([]);
    setUploadProgress(null);
    setUploadingFileName('');
    setUploadStatusNote('');
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
    resetForm(true);
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
    const found = products.find((p) => p.id === prodId);
    if (found) {
      if (!productName.trim()) setProductName(found.name);
      if (!price.trim()) setPrice(String(found.price));
      if (found.unit) setUnit(found.unit);
    }
  };

  const processUploadedFiles = async (files: File[]) => {
    if (files.length === 0) return;
    if (uploadProgress !== null || submitting) return;
    setErrorMsg('');

    if (!user?.id) {
      setErrorMsg('Please sign in as a farmer before uploading showcase media.');
      return;
    }

    if (mediaItems.length + files.length > 6) {
      setErrorMsg('You can attach up to 6 photos or videos in a single showcase post.');
      return;
    }

    const validatedFiles: {
      file: File;
      baseMime: string;
      isImage: boolean;
      isVideo: boolean;
      needsServerConvert: boolean;
    }[] = [];

    for (const file of files) {
      if (file.size === 0) {
        setErrorMsg(`File "${file.name}" is empty (0 bytes). Please choose a valid image or video.`);
        return;
      }

      const mime = (file.type || '').split(';')[0].trim().toLowerCase();
      const lowerName = file.name.toLowerCase();
      const isImage =
        ALLOWED_IMAGE_TYPES.includes(mime) || /\.(jpg|jpeg|png|webp|heic|heif)$/.test(lowerName);
      const isVideo =
        !isImage &&
        (ALLOWED_VIDEO_TYPES.includes(mime) || /\.(mp4|webm|mov|m4v)$/.test(lowerName));

      if (!isImage && !isVideo) {
        setErrorMsg(
          `Unsupported file "${file.name}". Supported formats: JPG, JPEG, PNG, WebP, HEIC/HEIF images and MP4, WebM, MOV videos.`
        );
        return;
      }

      if (isImage && file.size > MAX_IMAGE_BYTES) {
        setErrorMsg(`Image "${file.name}" exceeds the 15MB limit.`);
        return;
      }

      if (isVideo && file.size > MAX_VIDEO_BYTES) {
        setErrorMsg(`Video "${file.name}" exceeds the 50MB limit.`);
        return;
      }

      const needsServerConvert =
        /\.(heic|heif|mov|m4v)$/.test(lowerName) ||
        [
          'image/heic',
          'image/heif',
          'image/heic-sequence',
          'image/heif-sequence',
          'video/quicktime',
          'video/x-m4v'
        ].includes(mime);

      const resolvedMime =
        mime ||
        (/\.(png)$/.test(lowerName)
          ? 'image/png'
          : /\.(webp)$/.test(lowerName)
            ? 'image/webp'
            : /\.(webm)$/.test(lowerName)
              ? 'video/webm'
              : isVideo
                ? 'video/mp4'
                : 'image/jpeg');

      validatedFiles.push({
        file,
        baseMime: resolvedMime,
        isImage,
        isVideo,
        needsServerConvert
      });
    }

    for (const entry of validatedFiles) {
      const { file, baseMime, isVideo, needsServerConvert } = entry;
      try {
        setUploadingFileName(file.name);
        setUploadStatusNote(
          needsServerConvert ? 'Uploading & converting for web playback...' : 'Uploading media...'
        );
        setUploadProgress(5);

        let uploadedItem: MediaPostItem | null = null;
        let storageFailureNote: string | undefined;

        if (!needsServerConvert && auth.currentUser) {
          const storagePath = buildShowcaseStoragePath(user.id, file.name);
          const storageResult = await uploadBlobToFirebaseStorageWithResult(
            file,
            storagePath,
            baseMime,
            (percent) => setUploadProgress(percent)
          );

          if (storageResult.ok && storageResult.downloadUrl && storageResult.storagePath) {
            pendingStoragePathsRef.current.push(storageResult.storagePath);
            uploadedItem = {
              url: storageResult.downloadUrl,
              type: isVideo ? 'video' : 'image',
              mimeType: baseMime,
              fileName: file.name,
              storagePath: storageResult.storagePath,
              size: file.size
            };
          } else if (storageResult.errorCode === 'storage/canceled') {
            throw new Error(storageResult.errorMessage || 'Upload was cancelled.');
          } else {
            storageFailureNote = storageResult.errorMessage;
          }
        }

        if (!uploadedItem) {
          let uploaded;
          try {
            uploaded = await api.uploadMediaFile(file, (percent) => {
              setUploadProgress(percent);
              if (percent >= 99 && needsServerConvert) {
                setUploadStatusNote('Optimizing HEIC / MOV format for web browsers...');
              }
            });
          } catch (serverErr: any) {
            const combinedMessage = serverErr?.message || storageFailureNote;
            throw new Error(
              combinedMessage ||
                `Failed to upload "${file.name}". Please check your file format and connection.`
            );
          }

          let finalUrl = uploaded.url;
          let storagePath: string | undefined;

          const syncedStorage = await syncServerMediaToFirebaseStorage(
            uploaded.url,
            buildShowcaseStoragePath(user.id, uploaded.fileName),
            uploaded.mimeType
          ).catch(() => null);

          if (syncedStorage?.downloadUrl && syncedStorage?.storagePath) {
            finalUrl = syncedStorage.downloadUrl;
            storagePath = syncedStorage.storagePath;
            pendingStoragePathsRef.current.push(storagePath);
          }

          uploadedItem = {
            url: finalUrl,
            thumbnailUrl: uploaded.thumbnailUrl,
            type: uploaded.type,
            mimeType: uploaded.mimeType,
            fileName: uploaded.fileName,
            convertedFrom: uploaded.convertedFrom,
            durationSec: uploaded.durationSec,
            storagePath,
            size: uploaded.size
          };
        }

        if (!uploadedItem?.url) {
          throw new Error(`Upload completed for "${file.name}" but no media URL was returned.`);
        }

        setMediaItems((prev) => [...prev, uploadedItem!]);
      } catch (err: any) {
        setErrorMsg(
          extractFriendlyError(
            err,
            `Failed to process "${file.name}". The file may be corrupted or in an unsupported codec.`
          )
        );
        break;
      } finally {
        setUploadProgress(null);
        setUploadingFileName('');
        setUploadStatusNote('');
      }
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    await processUploadedFiles(files);
  };

  const handleDropFiles = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (uploadProgress !== null) return;
    const files: File[] = e.dataTransfer?.files ? (Array.from(e.dataTransfer.files) as File[]) : [];
    await processUploadedFiles(files);
  };

  const parseHashtags = (raw: string): string[] => {
    return Array.from(
      new Set(
        raw
          .split(/[\s,]+/)
          .map((t) => t.trim())
          .filter(Boolean)
          .map((t) => (t.startsWith('#') ? t : `#${t}`))
      )
    ).slice(0, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || submitting || uploadProgress !== null) return;
    setErrorMsg('');

    if (!user?.id) {
      setErrorMsg('Your session has expired. Please sign in again to publish.');
      return;
    }

    if (mediaItems.length === 0) {
      setErrorMsg('Please upload at least one image or video for your showcase post.');
      return;
    }
    if (!caption.trim()) {
      setErrorMsg('Please add a caption describing what you are showcasing.');
      return;
    }

    const taggedProd = products.find((p) => p.id === taggedProductId);
    const parsedPrice = price.trim() && !isNaN(Number(price)) ? Number(price) : undefined;
    const parsedHashtags = parseHashtags(hashtagsInput);

    submitLockRef.current = true;
    setSubmitting(true);
    let apiCreatedPostId: string | null = null;
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
          apiCreatedPostId = savedPost.id;
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
        try {
          await saveFirebasePost(savedPost);
        } catch (fsErr: any) {
          if (apiCreatedPostId) {
            await api.deleteMediaPost(apiCreatedPostId, user.id).catch(() => {});
          }
          throw fsErr;
        }
        setStatusMsg('Your Farm Showcase post is now live in the FarmBridge Community!');
      }

      pendingStoragePathsRef.current = [];
      mergePosts([savedPost]);
      setIsFormOpen(false);
      resetForm(false);
    } catch (err: any) {
      setErrorMsg(extractFriendlyError(err, 'Could not publish post. Please try again.'));
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      const targetPost = posts.find((p) => p.id === postId);
      if (targetPost?.media) {
        for (const m of targetPost.media) {
          if (m.storagePath) {
            await deleteFirebaseStorageFile(m.storagePath);
          }
        }
      }
      await api.deleteMediaPost(postId, user.id).catch(() => {});
      await deleteFirebasePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setConfirmDeleteId(null);
      setStatusMsg('Post deleted from FarmBridge Community.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not delete post.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <LiquidGlassCard
        variant="light"
        className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#145A38] bg-[#DFF4E4] border border-[#145A38]/20 px-2.5 py-0.5 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Farm Showcase</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#062B1F]">
            Posts &amp; Community Showcase
          </h2>
          <p className="text-xs text-[#0B3D2B]/75 mt-0.5">
            Share photos and short videos of your harvests, livestock, or fodder directly with
            marketplace buyers.
          </p>
        </div>

        <LiquidGlassButton
          id="new-showcase-post-btn"
          variant="lime"
          size="sm"
          onClick={openCreateForm}
        >
          <Plus className="w-4 h-4" />
          <span>Create Showcase Post</span>
        </LiquidGlassButton>
      </LiquidGlassCard>

      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-[#DFF4E4] border border-[#145A38]/25 text-[#062B1F] text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#145A38] shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg('')}
            className="text-[#145A38] hover:text-[#062B1F] p-1 cursor-pointer"
            aria-label="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create / Edit Post Drawer */}
      {isFormOpen && (
        <LiquidGlassCard variant="light" className="p-5 sm:p-6 border-2 border-[#145A38]/30">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center justify-between border-b border-[#0B3D2B]/10 pb-3">
              <h3 className="font-extrabold text-[#062B1F] text-base">
                {editingPost ? 'Edit Showcase Post' : 'New Farm Showcase Post'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm(true);
                }}
                className="p-1.5 rounded-xl text-[#0B3D2B]/60 hover:text-[#062B1F] hover:bg-[#DFF4E4]/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Media Uploader */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-[#062B1F]">
                  Photos or Videos * (JPG, PNG, WebP, HEIC/HEIF ≤15MB • MP4, WebM, MOV ≤50MB)
                </label>
                <span className="text-[11px] text-[#0B3D2B]/70 tabular-nums">
                  {mediaItems.length}/6 uploaded
                </span>
              </div>

              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingOver(false);
                }}
                onDrop={handleDropFiles}
                className={`flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-colors text-center ${
                  isDraggingOver
                    ? 'border-[#145A38] bg-[#DFF4E4]'
                    : 'border-[#145A38]/40 bg-[#DFF4E4]/40 hover:bg-[#DFF4E4]/70'
                }`}
              >
                <div className="flex items-center gap-2 text-[#145A38]">
                  <ImagePlus className="w-5 h-5" />
                  <Video className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#062B1F]">
                  Drag &amp; drop or click to select photos / videos
                </span>
                <span className="text-[11px] text-[#0B3D2B]/70">
                  Supports iPhone HEIC/HEIF &amp; MOV (auto-converted for instant web playback)
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif,video/mp4,video/webm,video/quicktime,.mov"
                  onChange={handleMediaUpload}
                  className="hidden"
                  disabled={uploadProgress !== null}
                />
              </label>

              {uploadProgress !== null && (
                <div className="p-3 rounded-xl bg-white/80 border border-[#0B3D2B]/12 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#062B1F]">
                    <span className="truncate">
                      {uploadStatusNote || 'Uploading'} {uploadingFileName}...
                    </span>
                    <span className="tabular-nums text-[#145A38] font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#DFF4E4] overflow-hidden">
                    <div
                      className="h-full bg-[#145A38] transition-all duration-150"
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
                      className="relative rounded-xl overflow-hidden border border-[#0B3D2B]/15 bg-[#062B1F] aspect-square group"
                    >
                      {m.type === 'video' ? (
                        <video
                          src={m.url}
                          poster={m.thumbnailUrl}
                          controls
                          muted
                          playsInline
                          preload="metadata"
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
                        onClick={() => {
                          if (m.storagePath) {
                            pendingStoragePathsRef.current =
                              pendingStoragePathsRef.current.filter((p) => p !== m.storagePath);
                            void deleteFirebaseStorageFile(m.storagePath);
                          }
                          setMediaItems((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#062B1F]/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
                        aria-label="Remove media"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {m.type === 'video' && (
                        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#062B1F]/80 text-[#A8E635] text-[10px] font-bold">
                          {m.convertedFrom ? `${m.convertedFrom.toUpperCase()}→MP4` : 'VIDEO'}
                        </span>
                      )}
                      {m.type === 'image' && m.convertedFrom && (
                        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#062B1F]/80 text-[#A8E635] text-[10px] font-bold">
                          {m.convertedFrom.toUpperCase()}→JPG
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
                <label className="font-bold text-[#062B1F] block mb-1">Caption *</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Morning harvest of greenhouse Roma tomatoes ready for dispatch!"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-[#062B1F] block mb-1">
                  Detailed Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share quality notes, pack sizes, harvest practices, or bulk delivery terms..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                />
              </div>

              <div>
                <label className="font-bold text-[#062B1F] block mb-1">
                  Tag Existing Listing (Optional)
                </label>
                <select
                  value={taggedProductId}
                  onChange={(e) => handleTaggedProductChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#0B3D2B]/20 bg-white/85 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                >
                  <option value="">-- No linked product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.price.toFixed(2)}/{p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#062B1F] block mb-1">
                  Featured Product Name (Optional)
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Organic Roma Tomatoes"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                />
              </div>

              <div>
                <label className="font-bold text-[#062B1F] block mb-1">
                  Indicative Price USD (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 12.00"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-28 px-2.5 py-2.5 rounded-xl border border-[#0B3D2B]/20 bg-white/85 text-[#062B1F]"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        /{u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#062B1F] block mb-1 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-[#145A38]" />
                  <span>Hashtags (Optional)</span>
                </label>
                <input
                  type="text"
                  value={hashtagsInput}
                  onChange={(e) => setHashtagsInput(e.target.value)}
                  placeholder="#FreshHarvest #HarareFarms #Organic"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#0B3D2B]/20 text-[#062B1F] focus:outline-none focus:ring-2 focus:ring-[#145A38]/25"
                />
              </div>

              <div className="sm:col-span-2 p-3.5 rounded-2xl bg-[#DFF4E4]/50 border border-[#145A38]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 font-semibold text-[#062B1F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareLocation}
                    onChange={(e) => setShareLocation(e.target.checked)}
                    className="rounded border-[#145A38] text-[#145A38] focus:ring-[#145A38]"
                  />
                  <MapPin className="w-4 h-4 text-[#145A38]" />
                  <span>Share farm location on this post</span>
                </label>
                {shareLocation && (
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="City, Province"
                    className="sm:w-64 px-3 py-1.5 rounded-xl border border-[#0B3D2B]/20 bg-white text-[#062B1F]"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <LiquidGlassButton
                variant="light"
                size="sm"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm(true);
                }}
              >
                Cancel
              </LiquidGlassButton>
              <LiquidGlassButton
                type="submit"
                variant="lime"
                size="sm"
                disabled={submitting || uploadProgress !== null}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{editingPost ? 'Save Post Changes' : 'Publish to Community'}</span>
              </LiquidGlassButton>
            </div>
          </form>
        </LiquidGlassCard>
      )}

      {/* Existing Posts List */}
      {loading ? (
        <LiquidGlassCard
          variant="light"
          className="p-12 text-center text-[#0B3D2B]/70 text-xs flex flex-col items-center gap-2"
        >
          <Loader2 className="w-6 h-6 animate-spin text-[#145A38]" />
          <span>Loading your Farm Showcase posts...</span>
        </LiquidGlassCard>
      ) : posts.length === 0 ? (
        <LiquidGlassCard variant="light" className="p-10 text-center space-y-3">
          <ImagePlus className="w-10 h-10 text-[#145A38]/40 mx-auto" />
          <h3 className="font-bold text-[#062B1F] text-sm">No Showcase Posts Yet</h3>
          <p className="text-xs text-[#0B3D2B]/70 max-w-md mx-auto">
            Upload photos or videos of your crops, livestock, or fodder bales so buyers can discover
            your farm and request quotes directly.
          </p>
          <LiquidGlassButton variant="emerald" size="sm" onClick={openCreateForm}>
            <Plus className="w-4 h-4" />
            <span>Post Your First Update</span>
          </LiquidGlassButton>
        </LiquidGlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => {
            const leadMedia = post.media?.[0];
            return (
              <LiquidGlassCard
                key={post.id}
                variant="light"
                interactive
                className="overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-[#062B1F]">
                  {leadMedia?.type === 'video' ? (
                    <video
                      src={leadMedia.url}
                      poster={leadMedia.thumbnailUrl}
                      controls
                      muted
                      playsInline
                      preload="metadata"
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
                    <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-[#062B1F]/80 backdrop-blur-md text-white text-[11px] font-bold">
                      1 / {post.media.length}
                    </span>
                  )}
                  {post.price !== undefined && (
                    <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-xl bg-white/95 text-[#062B1F] text-xs font-extrabold shadow-xs tabular-nums">
                      ${post.price.toFixed(2)}
                      {post.unit ? `/${post.unit}` : ''}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-[#0B3D2B]/65">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      {post.location && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                          <MapPin className="w-3 h-3 text-[#145A38] shrink-0" />
                          {post.location}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-[#062B1F] text-sm line-clamp-2">{post.caption}</h4>
                    {post.description && (
                      <p className="text-xs text-[#0B3D2B]/75 line-clamp-2">{post.description}</p>
                    )}
                    {post.taggedProductName && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#DFF4E4] text-[#0B3D2B] text-[11px] font-semibold">
                        <Tag className="w-3 h-3" />
                        <span>{post.taggedProductName}</span>
                      </div>
                    )}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {post.hashtags.slice(0, 4).map((tag) => (
                          <span key={tag} className="text-[11px] text-[#145A38] font-semibold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#0B3D2B]/10 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-[#0B3D2B]/80">
                      <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        {post.likesCount || 0} likes
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                        <MessageSquareQuote className="w-3.5 h-3.5 text-[#145A38]" />
                        {post.quoteRequestsCount || 0} quote inquiries
                      </span>
                    </div>

                    {confirmDeleteId === post.id ? (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-rose-800">Delete this post?</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-semibold cursor-pointer"
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
                          className="flex-1 py-2 px-3 rounded-xl border border-[#0B3D2B]/15 bg-white/80 text-[#062B1F] hover:bg-[#DFF4E4]/50 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(post.id)}
                          className="py-2 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </LiquidGlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
