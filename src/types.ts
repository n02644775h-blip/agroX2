export type UserRole = 'farmer' | 'buyer' | 'admin';

export type ProductAvailability = 'available' | 'low_stock' | 'out_of_stock' | 'temporarily_unavailable';

export type ProductUnit =
  | 'kg'
  | 'g'
  | 'bunch'
  | 'crate'
  | 'tray'
  | 'bag'
  | 'bag_50kg'
  | 'piece'
  | 'liter'
  | 'litre'
  | 'head'
  | 'animal'
  | 'pair'
  | 'dozen'
  | 'box'
  | 'bird';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'preparing'
  | 'ready_for_collection'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type DeliveryMethod = 'pickup' | 'delivery';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar: string;
  location: {
    country?: string;
    province: string;
    city: string;
    community?: string;
    address?: string;
  };
  status: 'active' | 'suspended' | 'pending_verification';
  createdAt: string;
  farmerProfile?: FarmerProfile;
  buyerProfile?: BuyerProfile;
}

export interface FarmerProfile {
  farmName: string;
  farmDescription?: string;
  bio?: string;
  address?: string;
  bannerImage?: string;
  coverImage?: string;
  farmSize?: string;
  establishedYear?: number;
  farmingPractices?: string[];
  farmingMethods?: string[];
  rating?: number;
  totalReviews?: number;
  verified?: boolean;
  isVerified?: boolean;
  contactPreferences?: ('phone' | 'chat' | 'whatsapp')[];
}

export interface BuyerProfile {
  preferredDeliveryAddress?: string;
  favoriteCategories?: string[];
  totalOrdersPlaced?: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  itemCount?: number;
}

export interface Product {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerAvatar: string;
  farmName: string;
  name: string;
  category: string;
  categoryName: string;
  description: string;
  price: number;
  unit: ProductUnit;
  quantityAvailable: number;
  minOrderQuantity: number;
  images: string[];
  location: {
    province: string;
    city: string;
    community?: string;
    address?: string;
  };
  harvestDate?: string;
  expiryDate?: string;
  availability: ProductAvailability;
  isOrganic?: boolean;
  featured?: boolean;
  rating: number;
  reviewsCount: number;
  additionalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  unit: string;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  farmerId: string;
  farmerName: string;
  farmName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  pickupTimeWindow?: string;
  buyerNotes?: string;
  farmerNotes?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  isReviewed?: boolean;
}

export interface Review {
  id: string;
  orderId: string;
  productId?: string;
  productName?: string;
  farmerId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string;
  rating: number;
  qualityRating?: number;
  communicationRating?: number;
  deliveryRating?: number;
  comment: string;
  createdAt: string;
  farmerResponse?: string;
}

export interface Message {
  id: string;
  conversationId?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: UserRole;
  receiverId?: string;
  receiverName?: string;
  receiverAvatar?: string;
  content?: string;
  text?: string;
  createdAt: string;
  read: boolean;
  productId?: string;
  productSnippet?: {
    name: string;
    price: number;
    unit: string;
    image: string;
  };
}

export interface Conversation {
  id: string;
  participants: {
    id: string;
    name: string;
    role: UserRole;
    avatar: string;
    farmName?: string;
  }[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCountFor: Record<string, number>;
  productId?: string;
  productName?: string;
  orderId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'message' | 'announcement' | 'stock' | 'inventory' | 'system';
  link?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export type AppNotification = Notification;

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'urgent';
  targetAudience: 'all' | 'farmers' | 'buyers';
  author: string;
  authorRole?: string;
  authorAvatar?: string;
  createdAt: string;
  active: boolean;
  category?: 'logistics' | 'market_update' | 'subsidy' | 'weather' | 'general' | 'platform';
  pinned?: boolean;
  likesCount?: number;
  reactions?: Record<string, number>;
}

export interface PublicAnnouncementMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar: string;
  title?: string;
  content: string;
  priority: 'low' | 'normal' | 'urgent';
  targetAudience: 'all' | 'farmers' | 'buyers';
  category?: 'logistics' | 'market_update' | 'subsidy' | 'weather' | 'general' | 'platform';
  isPinned?: boolean;
  likesCount?: number;
  likedBy?: string[];
  createdAt: string;
  attachments?: {
    type: 'link' | 'image' | 'badge';
    label: string;
    url?: string;
  }[];
}

export type ReportReason =
  | 'inappropriate_content'
  | 'misleading_info'
  | 'out_of_stock_scam'
  | 'poor_quality'
  | 'spam'
  | 'other'
  | 'incorrect_information'
  | 'pricing_issue'
  | 'out_of_stock_unresponsive'
  | 'fraud';

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedItemId?: string;
  targetId?: string;
  itemType: 'product' | 'user' | 'review';
  itemTitle: string;
  reason: ReportReason;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: string;
}

export interface FilterState {
  searchQuery: string;
  category: string;
  province: string;
  city: string;
  minPrice?: number;
  maxPrice?: number;
  availability: string;
  isOrganic?: boolean;
  farmerId?: string;
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
}
