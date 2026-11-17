export type UserRole = 'farmer' | 'fodder_supplier' | 'buyer' | 'admin';

export const isSellerRole = (role?: UserRole | string): boolean =>
  role === 'farmer' || role === 'fodder_supplier';

export type ProductAvailability = 'available' | 'low_stock' | 'out_of_stock' | 'temporarily_unavailable';

export type ProductUnit =
  | 'kg'
  | 'g'
  | 'bunch'
  | 'crate'
  | 'tray'
  | 'bag'
  | 'bag_50kg'
  | 'bale'
  | 'ton'
  | 'bundle'
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
  | 'received'
  | 'packaged'
  | 'delivering'
  | 'ready_for_pickup'
  | 'done'
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'preparing'
  | 'ready_for_collection'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type DeliveryMethod = 'pickup' | 'delivery';

export type PaymentMethod = 'cash_on_delivery' | 'bank_transfer' | 'ecocash' | 'onemoney';

export type PaymentStatus = 'awaiting_payment' | 'pending_verification' | 'paid' | 'rejected';

export interface DeliveryLocation {
  mode: 'gps' | 'manual';
  lat?: number;
  lng?: number;
  accuracy?: number;
  street?: string;
  suburb?: string;
  city?: string;
  instructions?: string;
  formattedAddress: string;
  confirmedAt?: string;
}

export interface PickupLocation {
  farmName: string;
  address: string;
  city?: string;
  province?: string;
  instructions?: string;
  phone?: string;
  readyAt?: string;
}

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
  status: 'active' | 'suspended' | 'pending_verification' | 'deleted';
  emailVerified?: boolean;
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
  practices?: string[];
  whatsapp?: string;
  pickupInstructions?: string;
  paymentInfo?: {
    ecocash?: string;
    onemoney?: string;
    innbucks?: string;
    bankAccount?: string;
  };
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
  sellerRole?: UserRole;
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
  farmerId?: string;
  price: number;
  unit: string;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  checkoutGroupId?: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  farmerId: string;
  farmerName: string;
  farmName: string;
  items: OrderItem[];
  subtotalAmount?: number;
  deliveryFee?: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  deliveryLocation?: DeliveryLocation;
  pickupLocation?: PickupLocation;
  pickupTimeWindow?: string;
  pickupInstructions?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  proofOfPaymentUrl?: string;
  proofOfPaymentFileName?: string;
  paymentReference?: string;
  paymentSubmittedAt?: string;
  paymentVerifiedAt?: string;
  paymentRejectionReason?: string;
  farmerPaymentDetails?: {
    ecocash?: string;
    onemoney?: string;
    bankAccount?: string;
    innbucks?: string;
    phone?: string;
  };
  buyerNotes?: string;
  farmerNotes?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  completedAt?: string;
  isReviewed?: boolean;
  rating?: number;
  reviewComment?: string;
  ratedAt?: string;
}

export interface Review {
  id: string;
  orderId: string;
  orderNumber?: string;
  productId?: string;
  productName?: string;
  farmerId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string;
  rating: number;
  ratingLabel?: string;
  qualityRating?: number;
  communicationRating?: number;
  deliveryRating?: number;
  comment?: string;
  createdAt: string;
  farmerResponse?: string;
}

export interface FarmerRatingStats {
  averageRating: number;
  totalRatings: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
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
  postReference?: {
    postId: string;
    caption: string;
    productName?: string;
    price?: number;
    unit?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    farmerName: string;
    farmName?: string;
  };
  requestReference?: {
    requestId: string;
    productName: string;
    categoryName?: string;
    quantityRequired: string;
    location: string;
    budgetText?: string;
    status: BuyerRequestStatus;
    buyerName: string;
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
  requestId?: string;
  postId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'message' | 'announcement' | 'stock' | 'inventory' | 'system' | 'request' | 'post';
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

export type AdRequestStatus = 'pending' | 'submitted' | 'sent' | 'under_review' | 'approved' | 'active' | 'rejected' | 'expired';
export type AdStatus = AdRequestStatus;

export interface AdRequest {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerAvatar?: string;
  farmName: string;
  farmerEmail?: string;
  farmerPhone?: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  productPrice?: number;
  productUnit?: string;
  category?: string;
  categoryName?: string;
  dealHeadline: string;
  dealDescription: string;
  discountPercentage?: number;
  specialPrice?: number;
  discountText?: string;
  durationDays?: number; // 1 to 30 days
  days?: number; // 1 to 30 days
  dailyRate?: number; // $1 / day
  totalFee?: number; // days * $1
  totalAmount?: number; // days * $1
  proofOfPaymentUrl?: string; // POP image screenshot
  proofOfPaymentFileName?: string;
  paymentMethod?: string;
  paymentReference?: string;
  status: AdRequestStatus;
  adminNotes?: string;
  adminFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface MediaPostItem {
  url: string;
  type: 'image' | 'video';
  mimeType?: string;
  fileName?: string;
  thumbnailUrl?: string;
  convertedFrom?: string;
  durationSec?: number;
  storagePath?: string;
  size?: number;
}

export interface MediaPost {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerAvatar: string;
  farmName: string;
  sellerRole?: UserRole;
  media: MediaPostItem[];
  caption: string;
  description?: string;
  productName?: string;
  price?: number;
  unit?: string;
  hashtags: string[];
  taggedProductId?: string;
  taggedProductName?: string;
  shareLocation?: boolean;
  location?: string;
  likesCount: number;
  likedBy: string[];
  quoteRequestsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type BuyerRequestStatus = 'open' | 'in_discussion' | 'handled' | 'cancelled';

export interface BuyerRequest {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  buyerPhone?: string;
  productName: string;
  category: string;
  categoryName: string;
  description: string;
  quantityRequired: string;
  preferredPrice?: number;
  budgetCurrency?: string;
  budgetNotes?: string;
  location: string;
  requiredDate?: string;
  notes?: string;
  referenceImages?: string[];
  status: BuyerRequestStatus;
  respondedFarmerIds?: string[];
  responseCount?: number;
  handledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type SupportRequestStatus = 'pending' | 'in_review' | 'resolved' | 'rejected';

export interface SupportRequest {
  id: string;
  userId: string;
  userRole: UserRole;
  currentName: string;
  currentPhone?: string;
  userEmail: string;
  requestType: 'name' | 'phone' | 'both';
  requestedName?: string;
  requestedPhone?: string;
  reason: string;
  status: SupportRequestStatus;
  adminNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: 'edit_farmer_profile' | 'resolve_support_request' | string;
  affectedUserId: string;
  affectedUserName: string;
  changedFields: Record<string, { before: unknown; after: unknown }>;
  note?: string;
  timestamp: string;
}

export interface PushSubscriptionMeta {
  id: string;
  userId: string;
  token: string;
  platform: 'web' | 'android' | 'ios';
  provider: 'fcm' | 'web_notification' | 'capacitor_local';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TariroLanguage = 'auto' | 'en' | 'sn' | 'nd';

export type KnowledgeDocSourceType = 'pdf' | 'docx' | 'txt' | 'md' | 'manual';

export interface KnowledgeDocument {
  id: string;
  title: string;
  question?: string;
  alternativeQuestions?: string[];
  category: string;
  language: 'en' | 'sn' | 'nd' | 'multilingual';
  sourceType: KnowledgeDocSourceType;
  fileName?: string;
  fileSize?: number;
  tags: string[];
  summary: string;
  content?: string;
  followUpQuestions?: string[];
  sourceOrganization?: string;
  sourceReference?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewStatus?: 'verified' | 'needs_review' | 'draft';
  chunkCount: number;
  charCount: number;
  active: boolean;
  uploadedBy: string;
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TariroCitation {
  docId: string;
  title: string;
  category: string;
  excerpt: string;
  sourceOrganization?: string;
  reviewedAt?: string;
  confidenceScore?: number;
}

export interface TariroMatchedProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  farmName: string;
  farmerName: string;
  city: string;
  province: string;
  availability: string;
  quantityAvailable: number;
  categoryName: string;
  image?: string;
}

export interface TariroChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language?: 'en' | 'sn' | 'nd';
  topic?: string;
  timestamp: string;
  interactionId?: string;
  citations?: TariroCitation[];
  matchedProducts?: TariroMatchedProduct[];
  followUpQuestions?: string[];
  confidenceScore?: number;
  confidenceBand?: 'high' | 'moderate' | 'low';
  needsClarification?: boolean;
  correctedTerms?: string[];
  lowConfidence?: boolean;
  feedbackGiven?: 'helpful' | 'not_helpful';
  error?: boolean;
}

export interface TariroFeedbackEntry {
  id: string;
  interactionId: string;
  userId?: string;
  userRole?: string;
  question: string;
  answerSnippet: string;
  rating: 'helpful' | 'not_helpful';
  comment?: string;
  language?: string;
  createdAt: string;
}

export interface TariroUnansweredQuestion {
  id: string;
  question: string;
  language: string;
  userId?: string;
  userRole?: string;
  reason: string;
  botReplySnippet?: string;
  status: 'open' | 'resolved';
  resolvedDocId?: string;
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface TariroAnalyticsSummary {
  knowledgeEngineMode: 'free_local_kb';
  geminiConfigured?: boolean;
  totalQueries: number;
  helpfulCount: number;
  notHelpfulCount: number;
  openUnansweredCount: number;
  activeDocumentsCount: number;
  totalDocumentsCount: number;
  totalChunksCount: number;
  totalCategoriesCount: number;
  languageBreakdown: Record<string, number>;
  topTopics: { topic: string; count: number }[];
  recentFeedback: TariroFeedbackEntry[];
  unansweredQuestions: TariroUnansweredQuestion[];
}


