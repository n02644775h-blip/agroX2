import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import {
  SupportRequest,
  SupportRequestStatus,
  AdminAuditLog,
  UserRole
} from '../types';

function toIsoTimestamp(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val?.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
  return new Date().toISOString();
}

function stripUndefinedDeep<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.filter(v => v !== undefined).map(v => stripUndefinedDeep(v)) as unknown as T;
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj as Record<string, any>)) {
    if (v !== undefined) {
      out[k] = typeof v === 'object' && v !== null && !(v instanceof Date) && typeof v._methodName !== 'string'
        ? stripUndefinedDeep(v)
        : v;
    }
  }
  return out as T;
}

export function parseSupportRequestDoc(docId: string, data: any): SupportRequest {
  return {
    id: data?.id || docId,
    userId: data?.userId || '',
    userRole: (data?.userRole as UserRole) || 'buyer',
    currentName: data?.currentName || 'FarmBridge User',
    currentPhone: data?.currentPhone || '',
    userEmail: data?.userEmail || '',
    requestType: data?.requestType === 'name' || data?.requestType === 'phone' ? data.requestType : 'both',
    requestedName: data?.requestedName || undefined,
    requestedPhone: data?.requestedPhone || undefined,
    reason: data?.reason || '',
    status: (data?.status as SupportRequestStatus) || 'pending',
    adminNotes: data?.adminNotes || undefined,
    resolvedBy: data?.resolvedBy || undefined,
    resolvedAt: data?.resolvedAt ? toIsoTimestamp(data.resolvedAt) : undefined,
    createdAt: toIsoTimestamp(data?.createdAt),
    updatedAt: toIsoTimestamp(data?.updatedAt)
  };
}

export function parseAdminAuditLogDoc(docId: string, data: any): AdminAuditLog {
  return {
    id: data?.id || docId,
    adminId: data?.adminId || 'admin-1',
    adminName: data?.adminName || 'FarmBridge Admin',
    action: data?.action || 'edit_farmer_profile',
    affectedUserId: data?.affectedUserId || '',
    affectedUserName: data?.affectedUserName || 'Farmer',
    changedFields: data?.changedFields && typeof data.changedFields === 'object' ? data.changedFields : {},
    note: data?.note || undefined,
    timestamp: toIsoTimestamp(data?.timestamp || data?.createdAt)
  };
}

export async function createFirebaseSupportRequest(
  reqData: SupportRequest
): Promise<void> {
  try {
    const ref = doc(db, 'supportRequests', reqData.id);
    await setDoc(
      ref,
      stripUndefinedDeep({
        ...reqData,
        createdAt: reqData.createdAt || new Date().toISOString(),
        updatedAt: reqData.updatedAt || new Date().toISOString(),
        serverCreatedAt: serverTimestamp()
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `supportRequests/${reqData.id}`);
  }
}

export async function updateFirebaseSupportRequestStatus(
  requestId: string,
  updates: {
    status: SupportRequestStatus;
    adminNotes?: string;
    resolvedBy?: string;
  }
): Promise<void> {
  try {
    const ref = doc(db, 'supportRequests', requestId);
    const now = new Date().toISOString();
    await updateDoc(
      ref,
      stripUndefinedDeep({
        status: updates.status,
        adminNotes: updates.adminNotes,
        resolvedBy: updates.resolvedBy,
        ...(updates.status === 'resolved' || updates.status === 'rejected'
          ? { resolvedAt: now }
          : {}),
        updatedAt: now
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `supportRequests/${requestId}`);
  }
}

export function subscribeToFirebaseSupportRequests(
  onUpdate: (requests: SupportRequest[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    return onSnapshot(
      collection(db, 'supportRequests'),
      (snap) => {
        const list = snap.docs
          .map(d => parseSupportRequestDoc(d.id, d.data()))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore supportRequests subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

export async function fetchAllFirebaseSupportRequests(): Promise<SupportRequest[]> {
  try {
    const snap = await getDocs(collection(db, 'supportRequests'));
    return snap.docs
      .map(d => parseSupportRequestDoc(d.id, d.data()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Failed to fetch supportRequests from Firestore:', err);
    return [];
  }
}

export async function createFirebaseAdminAuditLog(log: AdminAuditLog): Promise<void> {
  try {
    await setDoc(
      doc(db, 'adminAuditLogs', log.id),
      stripUndefinedDeep({
        ...log,
        serverTimestamp: serverTimestamp()
      })
    );
  } catch (error) {
    console.warn('Failed to persist adminAuditLog in Firestore:', error);
  }
}

export function subscribeToFirebaseAdminAuditLogs(
  onUpdate: (logs: AdminAuditLog[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    return onSnapshot(
      collection(db, 'adminAuditLogs'),
      (snap) => {
        const list = snap.docs
          .map(d => parseAdminAuditLogDoc(d.id, d.data()))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore adminAuditLogs subscription error:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}
