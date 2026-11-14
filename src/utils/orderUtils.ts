import { DeliveryMethod, OrderStatus, PaymentMethod, PaymentStatus } from '../types';

export type CanonicalOrderStage = 'received' | 'packaged' | 'delivering' | 'ready_for_pickup' | 'done' | 'cancelled';

export interface OrderStageDef {
  key: Exclude<CanonicalOrderStage, 'cancelled'>;
  label: string;
  description: string;
}

export function normalizeOrderStatus(
  status: OrderStatus | string,
  deliveryMethod: DeliveryMethod = 'delivery'
): CanonicalOrderStage {
  switch (status) {
    case 'rejected':
    case 'cancelled':
      return 'cancelled';
    case 'received':
    case 'pending':
    case 'accepted':
      return 'received';
    case 'packaged':
    case 'preparing':
      return 'packaged';
    case 'ready_for_pickup':
    case 'ready_for_collection':
      return 'ready_for_pickup';
    case 'delivering':
    case 'out_for_delivery':
      return deliveryMethod === 'pickup' ? 'ready_for_pickup' : 'delivering';
    case 'done':
    case 'completed':
      return 'done';
    default:
      return 'received';
  }
}

export function getOrderStages(deliveryMethod: DeliveryMethod): OrderStageDef[] {
  if (deliveryMethod === 'pickup') {
    return [
      { key: 'received', label: 'Received', description: 'Order received by farm' },
      { key: 'packaged', label: 'Packaged', description: 'Prepared & packed for collection' },
      { key: 'ready_for_pickup', label: 'Ready for Pickup', description: 'Ready at farm pickup point' },
      { key: 'done', label: 'Done', description: 'Collected by buyer' }
    ];
  }
  return [
    { key: 'received', label: 'Received', description: 'Order received by farm' },
    { key: 'packaged', label: 'Packaged', description: 'Products prepared & packaged' },
    { key: 'delivering', label: 'Delivering', description: 'On the way to your address' },
    { key: 'done', label: 'Done', description: 'Delivered successfully' }
  ];
}

export function getNextOrderStage(
  status: OrderStatus,
  deliveryMethod: DeliveryMethod
): Exclude<CanonicalOrderStage, 'cancelled'> | null {
  const canonical = normalizeOrderStatus(status, deliveryMethod);
  if (canonical === 'cancelled' || canonical === 'done') return null;
  const stages = getOrderStages(deliveryMethod);
  const idx = stages.findIndex(s => s.key === canonical);
  if (idx === -1 || idx >= stages.length - 1) return null;
  return stages[idx + 1].key;
}

export function getOrderStatusMeta(
  status: OrderStatus,
  deliveryMethod: DeliveryMethod = 'delivery'
): { label: string; badgeClass: string; canonical: CanonicalOrderStage } {
  const canonical = normalizeOrderStatus(status, deliveryMethod);
  switch (canonical) {
    case 'received':
      return {
        canonical,
        label: 'Received',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200'
      };
    case 'packaged':
      return {
        canonical,
        label: 'Packaged',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
      };
    case 'delivering':
      return {
        canonical,
        label: 'Delivering',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
      };
    case 'ready_for_pickup':
      return {
        canonical,
        label: 'Ready for Pickup',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200'
      };
    case 'done':
      return {
        canonical,
        label: 'Done',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    case 'cancelled':
      return {
        canonical,
        label: status === 'rejected' ? 'Declined' : 'Cancelled',
        badgeClass: 'bg-red-50 text-red-700 border-red-200'
      };
  }
}

export function getPaymentMethodLabel(method?: PaymentMethod | string): string {
  switch (method) {
    case 'cash_on_delivery':
      return 'Cash on Delivery';
    case 'bank_transfer':
      return 'Bank Transfer';
    case 'ecocash':
      return 'EcoCash';
    case 'onemoney':
      return 'OneMoney';
    default:
      return 'Cash on Delivery';
  }
}

export function getPaymentStatusMeta(
  status?: PaymentStatus | string,
  method?: PaymentMethod | string
): { label: string; description: string; badgeClass: string; normalized: PaymentStatus } {
  const normalized: PaymentStatus =
    status === 'paid' || status === 'pending_verification' || status === 'rejected' || status === 'awaiting_payment'
      ? status
      : 'awaiting_payment';

  switch (normalized) {
    case 'paid':
      return {
        normalized,
        label: 'Paid',
        description: 'Payment confirmed by farmer',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    case 'pending_verification':
      return {
        normalized,
        label: 'Pending Verification',
        description: 'Proof of payment uploaded — awaiting farmer verification',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
      };
    case 'rejected':
      return {
        normalized,
        label: 'Rejected',
        description: 'Payment proof declined — please upload a valid POP',
        badgeClass: 'bg-red-50 text-red-700 border-red-200'
      };
    default:
      return {
        normalized: 'awaiting_payment',
        label: 'Awaiting Payment',
        description: method === 'cash_on_delivery' ? 'Pending until delivery / collection' : 'Awaiting electronic transfer & POP upload',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
      };
  }
}
