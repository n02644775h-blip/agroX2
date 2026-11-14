import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { auth, storage } from '../firebase/config';

/**
 * Upload a Blob or File directly to Firebase Storage with optional progress callback.
 * Returns null gracefully if the user does not have an active Firebase Auth session
 * or if Firebase Storage rules reject the upload so server-side processed storage can serve seamlessly.
 */
export async function uploadBlobToFirebaseStorage(
  blob: Blob,
  storagePath: string,
  contentType?: string,
  onProgress?: (percent: number) => void
): Promise<{ downloadUrl: string; storagePath: string } | null> {
  if (!auth.currentUser) {
    return null;
  }

  try {
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, blob, {
      contentType: contentType || blob.type || 'application/octet-stream'
    });

    return await new Promise((resolve) => {
      task.on(
        'state_changed',
        (snapshot) => {
          if (onProgress && snapshot.totalBytes > 0) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (err) => {
          console.warn('Firebase Storage upload skipped:', err?.message || err);
          resolve(null);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(task.snapshot.ref);
            resolve({ downloadUrl, storagePath });
          } catch (err) {
            console.warn('Could not get Firebase Storage download URL:', err);
            resolve(null);
          }
        }
      );
    });
  } catch (err) {
    console.warn('Firebase Storage initialization/upload skipped:', err);
    return null;
  }
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
 * Best-effort deletion of a Firebase Storage object during post removal or account deletion.
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
