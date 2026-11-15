import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { auth, storage } from '../firebase/config';

export interface FirebaseStorageUploadResult {
  ok: boolean;
  downloadUrl?: string;
  storagePath?: string;
  errorCode?: string;
  errorMessage?: string;
}

export function buildShowcaseStoragePath(farmerId: string, fileName: string): string {
  const safeFarmerId = (farmerId || 'farmer').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dotIdx = fileName.lastIndexOf('.');
  const rawBase = dotIdx > 0 ? fileName.slice(0, dotIdx) : fileName;
  const rawExt = dotIdx > 0 ? fileName.slice(dotIdx).toLowerCase().replace(/[^a-z0-9.]/g, '') : '';
  const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'media';
  const rand = Math.random().toString(36).slice(2, 7);
  return `showcase/${safeFarmerId}/${Date.now()}_${rand}_${safeBase}${rawExt}`;
}

function mapFirebaseStorageError(err: any): { code: string; message: string } {
  const code = String(err?.code || 'storage/unknown');
  switch (code) {
    case 'storage/unauthorized':
    case 'storage/unauthenticated':
      return {
        code,
        message: 'Cloud storage permission denied. Please verify your farmer sign-in session.'
      };
    case 'storage/canceled':
      return { code, message: 'Media upload was cancelled.' };
    case 'storage/quota-exceeded':
      return { code, message: 'Cloud storage quota exceeded. Please try a smaller file.' };
    case 'storage/retry-limit-exceeded':
      return {
        code,
        message: 'Network timeout while uploading to cloud storage. Please check your connection and try again.'
      };
    case 'storage/invalid-argument':
      return { code, message: 'Invalid media file or storage path.' };
    default:
      return {
        code,
        message: err?.message || 'Cloud storage upload failed.'
      };
  }
}

/**
 * Upload a Blob or File directly to Firebase Storage with progress callback and structured error result.
 */
export async function uploadBlobToFirebaseStorageWithResult(
  blob: Blob,
  storagePath: string,
  contentType?: string,
  onProgress?: (percent: number) => void
): Promise<FirebaseStorageUploadResult> {
  if (!auth.currentUser) {
    return {
      ok: false,
      errorCode: 'storage/unauthenticated',
      errorMessage: 'No active Firebase Auth session.'
    };
  }

  try {
    const resolvedType = (contentType || blob.type || 'application/octet-stream')
      .split(';')[0]
      .trim()
      .toLowerCase();
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, blob, {
      contentType: resolvedType || 'application/octet-stream'
    });

    return await new Promise((resolve) => {
      task.on(
        'state_changed',
        (snapshot) => {
          if (onProgress && snapshot.totalBytes > 0) {
            const pct = Math.min(99, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
            onProgress(pct);
          }
        },
        (err) => {
          const mapped = mapFirebaseStorageError(err);
          console.warn('Firebase Storage upload error:', mapped.code, mapped.message);
          resolve({
            ok: false,
            errorCode: mapped.code,
            errorMessage: mapped.message
          });
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve({ ok: true, downloadUrl, storagePath });
          } catch (err: any) {
            const mapped = mapFirebaseStorageError(err);
            console.warn('Could not get Firebase Storage download URL:', mapped.code, mapped.message);
            resolve({
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
    console.warn('Firebase Storage initialization/upload error:', mapped.code, mapped.message);
    return {
      ok: false,
      errorCode: mapped.code,
      errorMessage: mapped.message
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
 * Sync a server-processed media asset (e.g. converted JPEG or H.264 MP4) into Firebase Storage
 * when a Firebase Auth user is active.
 */
export async function syncServerMediaToFirebaseStorage(
  serverUrl: string,
  storagePath: string,
  contentType?: string
): Promise<{ downloadUrl: string; storagePath: string } | null> {
  if (!auth.currentUser || !serverUrl) return null;
  try {
    const res = await fetch(serverUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await uploadBlobToFirebaseStorage(blob, storagePath, contentType || blob.type);
  } catch {
    return null;
  }
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
