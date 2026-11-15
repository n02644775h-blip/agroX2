import { DeliveryMethod, Order, OrderStatus, PaymentMethod, PaymentStatus } from '../types';

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

export function isOrderCompleted(order?: Pick<Order, 'status' | 'deliveryMethod'> | null): boolean {
  if (!order) return false;
  return normalizeOrderStatus(order.status, order.deliveryMethod) === 'done';
}

export function isOrderAttributableToFarmer(order: Order | null | undefined, farmerId: string): boolean {
  if (!order || !farmerId) return false;
  if (order.farmerId === farmerId) return true;
  if (Array.isArray(order.items) && order.items.some(item => item.farmerId === farmerId)) {
    return true;
  }
  return false;
}

export function calculateFarmerOrderRevenue(order: Order | null | undefined, farmerId: string): number {
  if (!order || !farmerId) return 0;
  if (!isOrderCompleted(order)) return 0;

  const roundCurrency = (val: number): number => Math.round(Math.max(0, val) * 100) / 100;
  const items = Array.isArray(order.items) ? order.items : [];

  if (items.length > 0) {
    const farmerItems = items.filter(item =>
      item.farmerId ? item.farmerId === farmerId : order.farmerId === farmerId
    );
    if (farmerItems.length === 0) return 0;

    const hasOtherFarmerItems =
      order.farmerId !== farmerId ||
      items.some(item => Boolean(item.farmerId) && item.farmerId !== farmerId);

    const itemsTotal = farmerItems.reduce((sum, item) => {
      const lineSubtotal =
        typeof item.subtotal === 'number' && Number.isFinite(item.subtotal)
          ? item.subtotal
          : Number(item.price || 0) * Number(item.quantity || 0);
      return sum + (Number.isFinite(lineSubtotal) ? Math.max(0, lineSubtotal) : 0);
    }, 0);

    if (itemsTotal > 0) {
      return roundCurrency(itemsTotal);
    }

    if (hasOtherFarmerItems) {
      return 0;
    }
  } else if (order.farmerId !== farmerId) {
    return 0;
  }

  // Fallback for single-farmer orders without item breakdown or with 0 item sum
  if (typeof order.subtotalAmount === 'number' && Number.isFinite(order.subtotalAmount)) {
    return roundCurrency(order.subtotalAmount);
  }

  const total = Number(order.totalAmount || 0);
  const fee = typeof order.deliveryFee === 'number' && Number.isFinite(order.deliveryFee) ? order.deliveryFee : 0;
  if (!Number.isFinite(total)) return 0;
  return roundCurrency(Math.max(0, total - Math.max(0, fee)));
}

export function calculateFarmerSalesRevenue(orders: Order[], farmerId: string): number {
  if (!Array.isArray(orders) || !farmerId) return 0;
  const seenOrderIds = new Set<string>();
  let total = 0;

  for (const order of orders) {
    if (!order) continue;
    if (order.id) {
      if (seenOrderIds.has(order.id)) continue;
      seenOrderIds.add(order.id);
    }
    total += calculateFarmerOrderRevenue(order, farmerId);
  }

  return Math.round(total * 100) / 100;
}

export function calculateFarmerWeeklySalesChart(
  orders: Order[],
  farmerId: string
): { name: string; sales: number; orders: number }[] {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = new Map<string, { name: string; sales: number; orders: number }>();

  const today = new Date();
  const orderedKeys: string[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - offset);
    const key = d.toISOString().slice(0, 10);
    orderedKeys.push(key);
    buckets.set(key, { name: dayNames[d.getDay()], sales: 0, orders: 0 });
  }

  const seenOrderIds = new Set<string>();
  for (const order of orders) {
    if (!order || !isOrderCompleted(order)) continue;
    if (order.id) {
      if (seenOrderIds.has(order.id)) continue;
      seenOrderIds.add(order.id);
    }
    const rev = calculateFarmerOrderRevenue(order, farmerId);
    if (rev <= 0) continue;

    const dateStr = order.completedAt || order.updatedAt || order.createdAt;
    const parsed = dateStr ? new Date(dateStr) : null;
    if (!parsed || isNaN(parsed.getTime())) continue;
    const dayKey = parsed.toISOString().slice(0, 10);
    const bucket = buckets.get(dayKey);
    if (bucket) {
      bucket.sales = Math.round((bucket.sales + rev) * 100) / 100;
      bucket.orders += 1;
    }
  }

  return orderedKeys.map(k => buckets.get(k)!);
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
