import { AdRequest } from '../types';

export type EffectiveAdStatus = 'pending' | 'approved' | 'active' | 'expired' | 'rejected';

export interface AdLifecycleInfo {
  effectiveStatus: EffectiveAdStatus;
  durationDays: number;
  startDateIso: string | null;
  endDateIso: string | null;
  remainingMs: number;
  remainingLabel: string;
  isLiveOnHomepage: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function getAdLifecycle(ad: AdRequest, nowMs: number = Date.now()): AdLifecycleInfo {
  const durationDays = Math.min(Math.max(Number(ad.days || ad.durationDays || 7), 1), 30);

  const parseMs = (iso?: string): number | null => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : null;
  };

  let startMs = parseMs(ad.startDate);
  let endMs = parseMs(ad.endDate);

  const rawStatus = (ad.status || 'pending').toLowerCase();

  if ((rawStatus === 'approved' || rawStatus === 'active') && !endMs) {
    const baseMs = startMs || parseMs(ad.reviewedAt) || parseMs(ad.updatedAt) || parseMs(ad.createdAt) || nowMs;
    startMs = startMs || baseMs;
    endMs = baseMs + durationDays * DAY_MS;
  }

  let effectiveStatus: EffectiveAdStatus;
  if (rawStatus === 'rejected') {
    effectiveStatus = 'rejected';
  } else if (rawStatus === 'expired') {
    effectiveStatus = 'expired';
  } else if (rawStatus === 'approved' || rawStatus === 'active') {
    if (endMs !== null && nowMs > endMs) {
      effectiveStatus = 'expired';
    } else if (startMs !== null && nowMs >= startMs) {
      effectiveStatus = 'active';
    } else {
      effectiveStatus = 'approved';
    }
  } else {
    effectiveStatus = 'pending';
  }

  let remainingMs = 0;
  let remainingLabel = 'Awaiting review';

  if (effectiveStatus === 'rejected') {
    remainingLabel = 'Declined';
  } else if (effectiveStatus === 'expired') {
    remainingLabel = 'Expired';
  } else if (effectiveStatus === 'active' || effectiveStatus === 'approved') {
    if (endMs !== null) {
      remainingMs = Math.max(0, endMs - nowMs);
      remainingLabel = formatRemainingDuration(remainingMs);
    } else {
      remainingMs = durationDays * DAY_MS;
      remainingLabel = `${durationDays}d campaign`;
    }
  } else {
    remainingLabel = `${durationDays} day${durationDays === 1 ? '' : 's'} requested`;
  }

  return {
    effectiveStatus,
    durationDays,
    startDateIso: startMs ? new Date(startMs).toISOString() : null,
    endDateIso: endMs ? new Date(endMs).toISOString() : null,
    remainingMs,
    remainingLabel,
    isLiveOnHomepage: effectiveStatus === 'active' || effectiveStatus === 'approved'
  };
}

export function formatRemainingDuration(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalMinutes = Math.floor(ms / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m left`;
  }
  return `${Math.max(1, mins)}m left`;
}

export function isAdActiveNow(ad: AdRequest, nowMs: number = Date.now()): boolean {
  return getAdLifecycle(ad, nowMs).isLiveOnHomepage;
}

export function getAdStatusBadgeMeta(status: EffectiveAdStatus): { label: string; className: string } {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    case 'approved':
      return {
        label: 'Approved',
        className: 'bg-teal-50 text-teal-700 border-teal-200'
      };
    case 'expired':
      return {
        label: 'Expired',
        className: 'bg-slate-100 text-slate-600 border-slate-200'
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className: 'bg-red-50 text-red-700 border-red-200'
      };
    default:
      return {
        label: 'Pending',
        className: 'bg-amber-50 text-amber-800 border-amber-200'
      };
  }
}

export function formatAdDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
