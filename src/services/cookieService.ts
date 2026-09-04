import { User } from '../types';

/**
 * Cookie and Storage Access Service
 * Handles multi-layered persistent authentication across page refreshes,
 * browser restarts, and sandboxed iframe environments via the W3C Storage Access API.
 */

// Helper to determine if running inside an iframe
export function isIframeEnvironment(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

// Low-level cookie helpers
export function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    const encodedVal = encodeURIComponent(value);
    // In iframe environments, SameSite=None and Secure are required for cookie retention
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    const sameSiteFlag = isHttps ? '; SameSite=None' : '; SameSite=Lax';
    document.cookie = `${name}=${encodedVal}; expires=${expires}; path=/${sameSiteFlag}${secureFlag}`;
  } catch (err) {
    console.warn(`Failed to set cookie "${name}":`, err);
  }
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
  } catch (err) {
    console.warn(`Failed to read cookie "${name}":`, err);
  }
  return null;
}

export function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  try {
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    const sameSiteFlag = isHttps ? '; SameSite=None' : '; SameSite=Lax';
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${sameSiteFlag}${secureFlag}`;
  } catch (err) {
    console.warn(`Failed to remove cookie "${name}":`, err);
  }
}

// Storage Access API helpers
export async function checkStorageAccessStatus(): Promise<{
  hasAccess: boolean;
  isIframe: boolean;
  supportsAPI: boolean;
}> {
  const isIframe = isIframeEnvironment();
  const supportsAPI = typeof document !== 'undefined' && 'hasStorageAccess' in document;

  if (!isIframe) {
    return { hasAccess: true, isIframe: false, supportsAPI };
  }

  if (supportsAPI) {
    try {
      const hasAccess = await document.hasStorageAccess();
      return { hasAccess: Boolean(hasAccess), isIframe, supportsAPI: true };
    } catch (err) {
      console.warn('hasStorageAccess check failed:', err);
    }
  }

  // Fallback: test if cookies and localStorage are accessible
  try {
    const testKey = '__agrox_test__';
    setCookie(testKey, '1', 1);
    const cookieWorks = getCookie(testKey) === '1';
    removeCookie(testKey);

    localStorage.setItem(testKey, '1');
    const storageWorks = localStorage.getItem(testKey) === '1';
    localStorage.removeItem(testKey);

    return { hasAccess: cookieWorks && storageWorks, isIframe, supportsAPI };
  } catch {
    return { hasAccess: false, isIframe, supportsAPI };
  }
}

/**
 * Explicitly request the browser to grant cookie & storage access
 * Note: Must be invoked during a user interaction (click/tap) in most browsers.
 */
export async function requestStorageAccessPermission(): Promise<boolean> {
  if (typeof document !== 'undefined' && 'requestStorageAccess' in document) {
    try {
      await document.requestStorageAccess();
      console.info('Storage Access granted by browser.');
      return true;
    } catch (err) {
      console.warn('Storage Access request rejected or not available:', err);
    }
  }

  // Verify whether cookies still work even if request rejected
  try {
    setCookie('__agrox_perm_test', 'true', 1);
    const works = getCookie('__agrox_perm_test') === 'true';
    removeCookie('__agrox_perm_test');
    return works;
  } catch {
    return false;
  }
}

// Multi-layer session persistence
export function persistUserSession(user: User, token?: string): void {
  if (!user || !user.id) return;

  const userJson = JSON.stringify(user);
  const activeToken = token || `token_${user.id}`;

  // 1. LocalStorage
  try {
    localStorage.setItem('agrox_current_user', userJson);
    localStorage.setItem('agrox_active_uid', user.id);
    localStorage.setItem(`agrox_user_profile_${user.id}`, userJson);
    localStorage.setItem('agriconnect_token', activeToken);
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }

  // 2. SessionStorage
  try {
    sessionStorage.setItem('agrox_current_user', userJson);
    sessionStorage.setItem('agrox_active_uid', user.id);
  } catch (err) {
    console.warn('SessionStorage save error:', err);
  }

  // 3. Document Cookies
  try {
    setCookie('agrox_uid', user.id, 365);
    setCookie('agrox_user', userJson, 365);
    setCookie('agriconnect_token', activeToken, 365);
  } catch (err) {
    console.warn('Cookie save error:', err);
  }

  // 4. Server-Side Session Sync
  try {
    fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, user, token: activeToken })
    }).catch(() => {});
  } catch {}
}

export function getPersistedUserSession(): User | null {
  // Layer 1: LocalStorage current user
  try {
    const rawLocal = localStorage.getItem('agrox_current_user');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && parsed.id && parsed.name) return parsed;
    }
  } catch {}

  // Layer 2: SessionStorage
  try {
    const rawSession = sessionStorage.getItem('agrox_current_user');
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (parsed && parsed.id && parsed.name) return parsed;
    }
  } catch {}

  // Layer 3: Document Cookie
  try {
    const rawCookie = getCookie('agrox_user');
    if (rawCookie) {
      const parsed = JSON.parse(rawCookie);
      if (parsed && parsed.id && parsed.name) return parsed;
    }
  } catch {}

  // Layer 4: LocalStorage by UID
  try {
    const activeUid = localStorage.getItem('agrox_active_uid') || getCookie('agrox_uid');
    if (activeUid) {
      const rawUser = localStorage.getItem(`agrox_user_profile_${activeUid}`);
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed && parsed.id && parsed.name) return parsed;
      }
    }
  } catch {}

  return null;
}

export function clearUserSession(): void {
  try {
    localStorage.removeItem('agrox_current_user');
    localStorage.removeItem('agrox_active_uid');
    localStorage.removeItem('agriconnect_token');
    sessionStorage.removeItem('agrox_current_user');
    sessionStorage.removeItem('agrox_active_uid');
    removeCookie('agrox_uid');
    removeCookie('agrox_user');
    removeCookie('agriconnect_token');
  } catch (err) {
    console.warn('Error clearing session:', err);
  }

  try {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  } catch {}
}
