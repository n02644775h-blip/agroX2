/**
 * Client-side image compression & conversion utility.
 * Resizes large camera photos and file uploads down to reasonable dimensions
 * and outputs both an optimized JPEG Blob (for Firebase Storage upload) and DataURL.
 */

export interface CompressedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  mimeType: 'image/jpeg';
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const header = parts[0] || '';
  const body = parts[1] || '';
  const mimeMatch = header.match(/data:([^;]+);base64/i);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(body);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function compressImageToBlob(
  fileOrDataUrl: File | Blob | string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const isBlobInput = typeof fileOrDataUrl !== 'string';
    const objectUrl = isBlobInput ? URL.createObjectURL(fileOrDataUrl) : null;
    let settled = false;

    const cleanup = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore revoke errors
        }
      }
    };

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Image decoding timed out. Please try a different JPG, PNG, or WebP file.'));
    }, 15000);

    const img = new Image();
    if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      if (settled) return;
      let width = img.naturalWidth || img.width || maxWidth;
      let height = img.naturalHeight || img.height || maxHeight;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.max(1, Math.round((height * maxWidth) / width));
          width = maxWidth;
        }
      } else if (height > maxHeight) {
        width = Math.max(1, Math.round((width * maxHeight) / height));
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        settled = true;
        clearTimeout(timeoutId);
        cleanup();
        reject(new Error('Browser canvas is unavailable for image optimization.'));
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      canvas.toBlob(
        (blob) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          cleanup();
          const finalBlob = blob || dataUrlToBlob(dataUrl);
          resolve({
            blob: finalBlob,
            dataUrl,
            width,
            height,
            mimeType: 'image/jpeg'
          });
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error('Could not decode image file. Please select a valid JPG, PNG, or WebP photo.'));
    };

    img.src = objectUrl || (fileOrDataUrl as string);
  });
}

export async function compressImage(
  fileOrDataUrl: File | Blob | string,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.8
): Promise<string> {
  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('http')) {
    return fileOrDataUrl;
  }

  try {
    const result = await compressImageToBlob(fileOrDataUrl, maxWidth, maxHeight, quality);
    return result.dataUrl;
  } catch (err) {
    if (typeof fileOrDataUrl === 'string') {
      return fileOrDataUrl;
    }
    throw err;
  }
}
