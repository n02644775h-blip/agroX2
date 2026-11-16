import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { auth, storage } from '../firebase/config';
import { api } from './api';
import { compressImageToBlob } from '../utils/imageCompressor';

// Prevent Firebase SDK from retrying stalled uploads silently for 10 minutes
try {
  storage.maxUploadRetryTime = 15000;
  storage.maxOperationRetryTime = 15000;
} catch {
  // ignore in environments where storage instance is read-only
}

export const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence'
];

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v'
];

export interface FirebaseStorageUploadResult {
  ok: boolean;
  downloadUrl?: string;
  storagePath?: string;
  errorCode?: string;
  errorMessage?: string;
  canceled?: boolean;
}

export interface MediaValidationResult {
  valid: boolean;
  kind?: 'image' | 'video' | 'pdf';
  mimeType?: string;
  needsServerConvert?: boolean;
  error?: string;
}

export interface UnifiedMediaUploadParams {
  file: File | Blob;
  fileName?: string;
  folder: 'showcase' | 'products' | 'avatars' | 'pop';
  userId: string;
  allowVideo?: boolean;
  allowPdf?: boolean;
  compressImages?: boolean;
  maxDimension?: number;
  onProgress?: (percent: number) => void;
  onStatusNote?: (note: string) => void;
  signal?: AbortSignal;
}

export interface UnifiedMediaUploadResult {
  ok: boolean;
  url?: string;
  thumbnailUrl?: string;
  storagePath?: string;
  type?: 'image' | 'video' | 'pdf';
  mimeType?: string;
  fileName?: string;
  convertedFrom?: string;
  durationSec?: number;
  size?: number;
  canceled?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

function buildSafeStoragePath(prefix: string, ownerId: string, fileName: string): string {
  const safeOwnerId = (ownerId || 'farmer').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dotIdx = fileName.lastIndexOf('.');
  const rawBase = dotIdx > 0 ? fileName.slice(0, dotIdx) : fileName;
  const rawExt = dotIdx > 0 ? fileName.slice(dotIdx).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
  const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'media';
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}/${safeOwnerId}/${Date.now()}_${rand}_${safeBase}${rawExt}`;
}

export function buildShowcaseStoragePath(farmerId: string, fileName: string): string {
  return buildSafeStoragePath('showcase', farmerId, fileName);
}

export function buildProductStoragePath(farmerId: string, fileName: string): string {
  return buildSafeStoragePath('products', farmerId, fileName);
}

export function buildAvatarStoragePath(userId: string, fileName: string): string {
  return buildSafeStoragePath('avatars', userId, fileName);
}

export function buildPopStoragePath(userId: string, fileName: string): string {
  return buildSafeStoragePath('pop', userId, fileName);
}

export function validateMediaFile(
  file: File | Blob,
  options?: {
    fileName?: string;
    allowVideo?: boolean;
    allowPdf?: boolean;
    maxImageBytes?: number;
    maxVideoBytes?: number;
  }
): MediaValidationResult {
  const fileName = options?.fileName || (file instanceof File ? file.name : 'upload.jpg');
  const allowVideo = Boolean(options?.allowVideo);
  const allowPdf = Boolean(options?.allowPdf);
  const maxImg = options?.maxImageBytes ?? MAX_IMAGE_UPLOAD_BYTES;
  const maxVid = options?.maxVideoBytes ?? MAX_VIDEO_UPLOAD_BYTES;

  if (!file || file.size === 0) {
    return {
      valid: false,
      error: `File "${fileName}" is empty (0 bytes). Please choose a valid file.`
    };
  }

  const mime = (file.type || '').split(';')[0].trim().toLowerCase();
  const lowerName = fileName.toLowerCase();

  const isPdf = allowPdf && (mime === 'application/pdf' || lowerName.endsWith('.pdf'));
  if (isPdf) {
    if (file.size > maxImg) {
      return {
        valid: false,
        error: `PDF "${fileName}" exceeds the ${Math.round(maxImg / (1024 * 1024))}MB limit.`
      };
    }
    return {
      valid: true,
      kind: 'pdf',
      mimeType: 'application/pdf',
      needsServerConvert: false
    };
  }

  const isImage =
    ALLOWED_IMAGE_MIME_TYPES.includes(mime) || /\.(jpg|jpeg|png|webp|heic|heif)$/.test(lowerName);
  const isVideo =
    !isImage &&
    allowVideo &&
    (ALLOWED_VIDEO_MIME_TYPES.includes(mime) || /\.(mp4|webm|mov|m4v)$/.test(lowerName));

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: allowVideo
        ? `Unsupported file "${fileName}". Supported: JPG, PNG, WebP, HEIC images and MP4, WebM, MOV videos.`
        : allowPdf
          ? `Unsupported file "${fileName}". Supported: JPG, PNG, WebP images and PDF.`
          : `Unsupported image "${fileName}". Please upload a JPG, JPEG, PNG, or WebP photo.`
    };
  }

  if (isImage && file.size > maxImg) {
    return {
      valid: false,
      error: `Image "${fileName}" exceeds the ${Math.round(maxImg / (1024 * 1024))}MB limit.`
    };
  }

  if (isVideo && file.size > maxVid) {
    return {
      valid: false,
      error: `Video "${fileName}" exceeds the ${Math.round(maxVid / (1024 * 1024))}MB limit.`
    };
  }

  const isHeic =
    /\.(heic|heif)$/.test(lowerName) ||
    ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'].includes(mime);
  const isMov = /\.(mov|m4v)$/.test(lowerName) || ['video/quicktime', 'video/x-m4v'].includes(mime);

  const resolvedMime =
    mime && mime !== 'application/octet-stream'
      ? mime
      : /\.png$/.test(lowerName)
        ? 'image/png'
        : /\.webp$/.test(lowerName)
          ? 'image/webp'
          : /\.webm$/.test(lowerName)
            ? 'video/webm'
            : /\.mov$/.test(lowerName)
              ? 'video/quicktime'
              : isVideo
                ? 'video/mp4'
                : 'image/jpeg';

  return {
    valid: true,
    kind: isVideo ? 'video' : 'image',
    mimeType: resolvedMime,
    needsServerConvert: isHeic || isMov
  };
}

function mapFirebaseStorageError(err: any): { code: string; message: string } {
  const code = String(err?.code || 'storage/unknown');
  switch (code) {
    case 'storage/unauthorized':
    case 'storage/unauthenticated':
      return {
        code,
        message: 'Cloud storage permission denied. Please make sure your email is verified and you are signed in.'
      };
    case 'storage/canceled':
      return { code, message: 'Upload cancelled.' };
    case 'storage/quota-exceeded':
      return { code, message: 'Cloud storage quota exceeded. Please try a smaller file.' };
    case 'storage/retry-limit-exceeded':
    case 'storage/timeout':
      return {
        code,
        message: 'Upload timed out waiting for cloud storage. Please check your internet connection and retry.'
      };
    case 'storage/invalid-argument':
      return { code, message: 'Invalid media file or storage path.' };
    default:
      return {
        code,
        message: err?.message || 'Cloud storage upload failed. Please try again.'
      };
  }
}

/**
 * Upload a Blob or File directly to Firebase Storage with bounded stall detection,
 * AbortSignal cancellation, progress updates, and guaranteed listener cleanup.
 */
export async function uploadBlobToFirebaseStorageWithResult(
  blob: Blob,
  storagePath: string,
  contentType?: string,
  onProgress?: (percent: number) => void,
  options?: {
    signal?: AbortSignal;
    stallTimeoutMs?: number;
  }
): Promise<FirebaseStorageUploadResult> {
  if (!auth.currentUser) {
    return {
      ok: false,
      errorCode: 'storage/unauthenticated',
      errorMessage: 'No active Firebase Auth session.'
    };
  }

  if (options?.signal?.aborted) {
    return {
      ok: false,
      canceled: true,
      errorCode: 'storage/canceled',
      errorMessage: 'Upload cancelled.'
    };
  }

  const stallTimeoutMs = options?.stallTimeoutMs ?? 18000;

  try {
    const resolvedType = (contentType || blob.type || 'application/octet-stream')
      .split(';')[0]
      .trim()
      .toLowerCase();
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, blob, {
      contentType: resolvedType || 'application/octet-stream'
    });

    return await new Promise<FirebaseStorageUploadResult>((resolve) => {
      let settled = false;
      let lastBytes = -1;
      let unsubscribeTask: (() => void) | null = null;
      let stallTimer: ReturnType<typeof setTimeout> | null = null;

      const onAbort = () => {
        if (settled) return;
        try {
          task.cancel();
        } catch {
          // ignore
        }
        finish({
          ok: false,
          canceled: true,
          errorCode: 'storage/canceled',
          errorMessage: 'Upload cancelled.'
        });
      };

      const resetStallTimer = () => {
        if (stallTimer) clearTimeout(stallTimer);
        stallTimer = setTimeout(() => {
          if (settled) return;
          try {
            task.cancel();
          } catch {
            // ignore
          }
          finish({
            ok: false,
            errorCode: 'storage/timeout',
            errorMessage:
              'Upload stalled without progress. Please check your connection or storage configuration and retry.'
          });
        }, stallTimeoutMs);
      };

      const finish = (result: FirebaseStorageUploadResult) => {
        if (settled) return;
        settled = true;
        if (stallTimer) clearTimeout(stallTimer);
        if (options?.signal) {
          options.signal.removeEventListener('abort', onAbort);
        }
        if (unsubscribeTask) {
          try {
            unsubscribeTask();
          } catch {
            // ignore
          }
        }
        resolve(result);
      };

      if (options?.signal) {
        options.signal.addEventListener('abort', onAbort, { once: true });
      }

      resetStallTimer();

      unsubscribeTask = task.on(
        'state_changed',
        (snapshot) => {
          if (settled) return;
          if (snapshot.bytesTransferred > lastBytes) {
            lastBytes = snapshot.bytesTransferred;
            resetStallTimer();
          }
          if (onProgress && snapshot.totalBytes > 0) {
            const pct = Math.min(99, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
            onProgress(pct);
          }
        },
        (err) => {
          const mapped = mapFirebaseStorageError(err);
          finish({
            ok: false,
            canceled: mapped.code === 'storage/canceled',
            errorCode: mapped.code,
            errorMessage: mapped.message
          });
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            if (onProgress) onProgress(100);
            finish({ ok: true, downloadUrl, storagePath });
          } catch (err: any) {
            const mapped = mapFirebaseStorageError(err);
            finish({
              ok: false,
              errorCode: mapped.code,
              errorMessage: mapped.message
            });
          }
        }
      );
    });
  } catch (err: any) {
    const mapped = mapFirebaseStorageError(err);
    return {
      ok: false,
      errorCode: mapped.code,
      errorMessage: mapped.message
    };
  }
}

/**
 * Unified Farmer & User Media Upload Pipeline:
 * - Validates file type and size limits (15MB images, 50MB videos)
 * - Optimizes large web images cleanly before transfer
 * - Uploads directly to Firebase Storage when authenticated & email-verified
 * - Falls back to Express /api/media/upload in local/Node environments (or when transcoding HEIC/MOV)
 * - Supports AbortSignal cancellation and surfaces explicit errors (never hangs silently or fakes completion)
 */
export async function uploadMediaAsset(
  params: UnifiedMediaUploadParams
): Promise<UnifiedMediaUploadResult> {
  const {
    file,
    folder,
    userId,
    allowVideo = false,
    allowPdf = false,
    compressImages = true,
    maxDimension = 1200,
    onProgress,
    onStatusNote,
    signal
  } = params;

  const rawFileName = params.fileName || (file instanceof File ? file.name : `${folder}_${Date.now()}.jpg`);

  const validation = validateMediaFile(file, {
    fileName: rawFileName,
    allowVideo,
    allowPdf
  });

  if (!validation.valid || !validation.kind || !validation.mimeType) {
    return {
      ok: false,
      errorCode: 'media/validation-failed',
      errorMessage: validation.error || 'Invalid media file selected.'
    };
  }

  if (signal?.aborted) {
    return {
      ok: false,
      canceled: true,
      errorCode: 'storage/canceled',
      errorMessage: 'Upload cancelled.'
    };
  }

  let uploadFileObj: File =
    file instanceof File
      ? file
      : new File([file], rawFileName, { type: validation.mimeType });
  let uploadMime = validation.mimeType;
  let uploadName = rawFileName;
  let optimizedDataUrl: string | undefined;

  // Compress large standard web images (keeps quality crisp while making transfers reliable & fast)
  if (
    compressImages &&
    validation.kind === 'image' &&
    !validation.needsServerConvert &&
    uploadFileObj.size > 350 * 1024
  ) {
    try {
      onStatusNote?.('Optimizing image for fast upload...');
      const compressed = await compressImageToBlob(uploadFileObj, maxDimension, maxDimension, 0.82);
      if (signal?.aborted) {
        return { ok: false, canceled: true, errorCode: 'storage/canceled', errorMessage: 'Upload cancelled.' };
      }
      if (compressed.blob.size < uploadFileObj.size) {
        const baseName = rawFileName.replace(/\.[^.]+$/, '');
        uploadName = `${baseName}.jpg`;
        uploadMime = 'image/jpeg';
        uploadFileObj = new File([compressed.blob], uploadName, { type: 'image/jpeg' });
        optimizedDataUrl = compressed.dataUrl;
      }
    } catch (compErr: any) {
      return {
        ok: false,
        errorCode: 'media/corrupt-image',
        errorMessage: compErr?.message || `Could not read image "${rawFileName}".`
      };
    }
  }

  const fbUser = auth.currentUser;
  if (fbUser && !fbUser.emailVerified) {
    return {
      ok: false,
      errorCode: 'auth/email-not-verified',
      errorMessage: 'Please verify your email address before uploading photos or videos.'
    };
  }

  let storageFailure: { code?: string; message?: string } | null = null;

  // 1. Primary path: Direct client-to-Firebase Storage upload (required for Vercel & scalable media hosting)
  if (fbUser && !validation.needsServerConvert) {
    onStatusNote?.('Uploading to cloud storage...');
    onProgress?.(4);

    const storagePath = buildSafeStoragePath(folder, fbUser.uid || userId, uploadName);
    const storageResult = await uploadBlobToFirebaseStorageWithResult(
      uploadFileObj,
      storagePath,
      uploadMime,
      onProgress,
      { signal, stallTimeoutMs: 18000 }
    );

    if (storageResult.ok && storageResult.downloadUrl && storageResult.storagePath) {
      return {
        ok: true,
        url: storageResult.downloadUrl,
        storagePath: storageResult.storagePath,
        type: validation.kind,
        mimeType: uploadMime,
        fileName: uploadName,
        size: uploadFileObj.size
      };
    }

    if (storageResult.canceled || storageResult.errorCode === 'storage/canceled') {
      return {
        ok: false,
        canceled: true,
        errorCode: 'storage/canceled',
        errorMessage: 'Upload cancelled.'
      };
    }

    storageFailure = {
      code: storageResult.errorCode,
      message: storageResult.errorMessage
    };
  }

  // 2. Fallback / Transcoding path: Express /api/media/upload (for HEIC/MOV conversion, non-Firebase sessions, or dev environments)
  try {
    onStatusNote?.(
      validation.needsServerConvert
        ? 'Uploading & converting for web playback...'
        : 'Uploading media...'
    );
    const uploaded = await api.uploadMediaFile(
      uploadFileObj,
      (percent) => {
        onProgress?.(percent);
        if (percent >= 99 && validation.needsServerConvert) {
          onStatusNote?.('Finalizing media format...');
        }
      },
      signal
    );

    return {
      ok: true,
      url: uploaded.url,
      thumbnailUrl: uploaded.thumbnailUrl,
      type: uploaded.type || validation.kind,
      mimeType: uploaded.mimeType || uploadMime,
      fileName: uploaded.fileName || uploadName,
      convertedFrom: uploaded.convertedFrom,
      durationSec: uploaded.durationSec,
      size: uploaded.size || uploadFileObj.size
    };
  } catch (serverErr: any) {
    if (serverErr?.name === 'AbortError' || signal?.aborted) {
      return {
        ok: false,
        canceled: true,
        errorCode: 'storage/canceled',
        errorMessage: 'Upload cancelled.'
      };
    }

    // Small compressed image fallback (<300KB) ONLY when user is in a non-Firebase session or image upload when Storage isn't configured
    if (!allowVideo && !allowPdf && validation.kind === 'image') {
      try {
        const fallbackComp =
          optimizedDataUrl
            ? { dataUrl: optimizedDataUrl, blob: uploadFileObj }
            : await compressImageToBlob(uploadFileObj, 720, 720, 0.72);
        // Only if resulting DataURL fits comfortably well below Firestore 1MB limit (~320KB max)
        if (fallbackComp.dataUrl.length <= 320 * 1024 && !fbUser) {
          onProgress?.(100);
          return {
            ok: true,
            url: fallbackComp.dataUrl,
            type: 'image',
            mimeType: 'image/jpeg',
            fileName: uploadName,
            size: fallbackComp.blob.size
          };
        }
      } catch {
        // fall through to explicit error reporting
      }
    }

    const detailedError =
      storageFailure?.message ||
      serverErr?.message ||
      `Failed to upload "${rawFileName}". Please check your connection and try again.`;
    return {
      ok: false,
      errorCode: storageFailure?.code || 'upload/failed',
      errorMessage: detailedError
    };
  }
}

/**
 * Backward-compatible helper returning { downloadUrl, storagePath } or null.
 */
export async function uploadBlobToFirebaseStorage(
  blob: Blob,
  storagePath: string,
  contentType?: string,
  onProgress?: (percent: number) => void
): Promise<{ downloadUrl: string; storagePath: string } | null> {
  const result = await uploadBlobToFirebaseStorageWithResult(blob, storagePath, contentType, onProgress);
  if (result.ok && result.downloadUrl && result.storagePath) {
    return { downloadUrl: result.downloadUrl, storagePath: result.storagePath };
  }
  return null;
}

/**
 * Best-effort deletion of a Firebase Storage object during post removal, cancellation, or cleanup.
 */
export async function deleteFirebaseStorageFile(storagePath?: string): Promise<void> {
  if (!storagePath) return;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('Firebase Storage delete warning:', err);
  }
}
