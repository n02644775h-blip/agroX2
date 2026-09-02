import {
  User,
  ProductCategory,
  Product,
  Order,
  Review,
  Message,
  Conversation,
  Notification,
  Announcement,
  Report,
  OrderStatus,
  ProductAvailability,
  AdRequest,
  AdRequestStatus
} from '../src/types';
import {
  INITIAL_USERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_REVIEWS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_REPORTS,
  INITIAL_AD_REQUESTS
} from './data';

class MarketplaceStore {
  private users: User[] = [...INITIAL_USERS];
  private categories: ProductCategory[] = [...INITIAL_CATEGORIES];
  private products: Product[] = [...INITIAL_PRODUCTS];
  private orders: Order[] = [...INITIAL_ORDERS];
  private reviews: Review[] = [...INITIAL_REVIEWS];
  private conversations: Conversation[] = [...INITIAL_CONVERSATIONS];
  private messages: Message[] = [...INITIAL_MESSAGES];
  private notifications: Notification[] = [...INITIAL_NOTIFICATIONS];
  private announcements: Announcement[] = [...INITIAL_ANNOUNCEMENTS];
  private reports: Report[] = [...INITIAL_REPORTS];
  private adRequests: AdRequest[] = [...INITIAL_AD_REQUESTS];
  private favorites: Record<string, string[]> = {
    'buyer-1': ['prod-1', 'prod-2', 'prod-5'],
    'buyer-2': ['prod-3', 'prod-4']
  };

  // --- Auth & Users ---
  getUsers(): User[] {
    return this.users;
  }

  getUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: User): User {
    this.users.push(user);
    this.createNotification({
      userId: user.id,
      title: 'Welcome to AgriConnect!',
      message: `Hi ${user.name}, your account is active as a ${user.role}. Start exploring our fresh agricultural marketplace.`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString()
    });
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return undefined;
    this.users[index] = { ...this.users[index], ...updates };
    return this.users[index];
  }

  toggleUserStatus(id: string, status: 'active' | 'suspended' | 'pending_verification'): User | undefined {
    const user = this.updateUser(id, { status });
    return user;
  }

  // --- Categories ---
  getCategories(): ProductCategory[] {
    return this.categories.map(cat => ({
      ...cat,
      itemCount: this.products.filter(p => p.category === cat.id && p.availability !== 'temporarily_unavailable').length
    }));
  }

  addCategory(category: ProductCategory): ProductCategory {
    this.categories.push(category);
    return category;
  }

  // --- Products ---
  getProducts(filters?: {
    search?: string;
    category?: string;
    province?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    availability?: string;
    farmerId?: string;
    isOrganic?: boolean;
    sortBy?: string;
  }): Product[] {
    let list = [...this.products];

    if (filters) {
      if (filters.farmerId) {
        list = list.filter(p => p.farmerId === filters.farmerId);
      }
      if (filters.category && filters.category !== 'all') {
        list = list.filter(p => p.category === filters.category || (p.categoryName && p.categoryName.toLowerCase() === filters.category!.toLowerCase()));
      }
      if (filters.province && filters.province !== 'all') {
        list = list.filter(p => p.location?.province && p.location.province.toLowerCase() === filters.province!.toLowerCase());
      }
      if (filters.city && filters.city !== 'all') {
        list = list.filter(p => p.location?.city && p.location.city.toLowerCase() === filters.city!.toLowerCase());
      }
      if (filters.minPrice !== undefined && !isNaN(filters.minPrice)) {
        list = list.filter(p => p.price >= filters.minPrice!);
      }
      if (filters.maxPrice !== undefined && !isNaN(filters.maxPrice)) {
        list = list.filter(p => p.price <= filters.maxPrice!);
      }
      if (filters.availability && filters.availability !== 'all') {
        list = list.filter(p => p.availability === filters.availability);
      }
      if (filters.isOrganic !== undefined && filters.isOrganic) {
        list = list.filter(p => p.isOrganic);
      }
      if (filters.search && filters.search.trim() !== '') {
        const query = filters.search.toLowerCase().trim();
        list = list.filter(p =>
          (p.name && p.name.toLowerCase().includes(query)) ||
          (p.description && p.description.toLowerCase().includes(query)) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(query)) ||
          (p.farmerName && p.farmerName.toLowerCase().includes(query)) ||
          (p.farmName && p.farmName.toLowerCase().includes(query)) ||
          (p.location?.city && p.location.city.toLowerCase().includes(query)) ||
          (p.location?.province && p.location.province.toLowerCase().includes(query))
        );
      }
      // Sort
      if (filters.sortBy === 'price_asc') {
        list.sort((a, b) => a.price - b.price);
      } else if (filters.sortBy === 'price_desc') {
        list.sort((a, b) => b.price - a.price);
      } else if (filters.sortBy === 'popular') {
        list.sort((a, b) => b.reviewsCount - a.reviewsCount);
      } else if (filters.sortBy === 'rating') {
        list.sort((a, b) => b.rating - a.rating);
      } else {
        // default newest
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    }

    return list;
  }

  getProductById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  createProduct(product: Product): Product {
    this.products.unshift(product);
    return product;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    this.products[index] = {
      ...this.products[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return this.products[index];
  }

  deleteProduct(id: string): boolean {
    const initLen = this.products.length;
    this.products = this.products.filter(p => p.id !== id);
    return this.products.length < initLen;
  }

  updateProductAvailability(id: string, availability: ProductAvailability): Product | undefined {
    return this.updateProduct(id, { availability });
  }

  // --- Orders ---
  getOrders(params?: { userId?: string; role?: string; farmerId?: string; status?: string }): Order[] {
    let list = [...this.orders];
    if (params?.userId && params?.role === 'buyer') {
      list = list.filter(o => o.buyerId === params.userId);
    } else if (params?.farmerId || (params?.userId && params?.role === 'farmer')) {
      const fId = params.farmerId || params.userId;
      list = list.filter(o => o.farmerId === fId);
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter(o => o.status === params.status);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.find(o => o.id === id);
  }

  createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'statusHistory'>): Order {
    const id = `ord-${Date.now()}`;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `AGC-26-${randNum}`;
    const now = new Date().toISOString();

    const newOrder: Order = {
      ...orderData,
      id,
      orderNumber,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      statusHistory: [
        { status: 'pending', timestamp: now, note: 'Order placed by buyer' }
      ]
    };

    // Deduct preliminary inventory or check stock
    orderData.items.forEach(item => {
      const prod = this.getProductById(item.productId);
      if (prod) {
        const remaining = Math.max(0, prod.quantityAvailable - item.quantity);
        let availability: ProductAvailability = prod.availability;
        if (remaining === 0) {
          availability = 'out_of_stock';
        } else if (remaining < 10) {
          availability = 'low_stock';
        }
        this.updateProduct(prod.id, { quantityAvailable: remaining, availability });
      }
    });

    this.orders.unshift(newOrder);

    // Notify farmer
    this.createNotification({
      userId: newOrder.farmerId,
      title: `New Order Received (${newOrder.orderNumber})`,
      message: `${newOrder.buyerName} placed an order for $${newOrder.totalAmount.toFixed(2)}.`,
      type: 'order',
      link: `/orders/${newOrder.id}`,
      read: false,
      createdAt: now,
      metadata: { orderId: newOrder.id }
    });

    // Notify buyer
    this.createNotification({
      userId: newOrder.buyerId,
      title: `Order Submitted (${newOrder.orderNumber})`,
      message: `Your order with ${newOrder.farmName} has been submitted and is pending farmer confirmation.`,
      type: 'order',
      link: `/orders/${newOrder.id}`,
      read: false,
      createdAt: now,
      metadata: { orderId: newOrder.id }
    });

    return newOrder;
  }

  updateOrderStatus(orderId: string, status: OrderStatus, note?: string): Order | undefined {
    const index = this.orders.findIndex(o => o.id === orderId);
    if (index === -1) return undefined;

    const order = this.orders[index];
    const now = new Date().toISOString();
    const prevStatus = order.status;

    order.status = status;
    order.updatedAt = now;
    order.statusHistory.push({
      status,
      timestamp: now,
      note: note || `Status updated to ${status.replace(/_/g, ' ')}`
    });

    // If order was rejected or cancelled, restore inventory
    if ((status === 'rejected' || status === 'cancelled') && prevStatus !== 'rejected' && prevStatus !== 'cancelled') {
      order.items.forEach(item => {
        const prod = this.getProductById(item.productId);
        if (prod) {
          const restored = prod.quantityAvailable + item.quantity;
          this.updateProduct(prod.id, {
            quantityAvailable: restored,
            availability: restored > 0 ? 'available' : 'out_of_stock'
          });
        }
      });
    }

    // Status notification map
    const statusTitles: Record<OrderStatus, string> = {
      pending: 'Order Pending',
      accepted: 'Order Accepted!',
      rejected: 'Order Declined',
      preparing: 'Order Being Prepared',
      ready_for_collection: 'Ready for Collection!',
      out_for_delivery: 'Out for Delivery!',
      completed: 'Order Completed',
      cancelled: 'Order Cancelled'
    };

    // Notify buyer
    this.createNotification({
      userId: order.buyerId,
      title: `${statusTitles[status]} (${order.orderNumber})`,
      message: `${order.farmName} updated your order to "${status.replace(/_/g, ' ')}". ${note ? `Note: ${note}` : ''}`,
      type: 'order',
      link: `/orders/${order.id}`,
      read: false,
      createdAt: now,
      metadata: { orderId: order.id }
    });

    return order;
  }

  // --- Reviews ---
  getReviews(farmerId?: string, productId?: string): Review[] {
    let list = [...this.reviews];
    if (farmerId) list = list.filter(r => r.farmerId === farmerId);
    if (productId) list = list.filter(r => r.productId === productId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Review {
    const id = `rev-${Date.now()}`;
    const now = new Date().toISOString();
    const newReview: Review = { ...reviewData, id, createdAt: now };
    this.reviews.unshift(newReview);

    // Update order status if orderId provided
    if (reviewData.orderId) {
      const order = this.getOrderById(reviewData.orderId);
      if (order) order.isReviewed = true;
    }

    // Update Farmer rating
    const farmerReviews = this.reviews.filter(r => r.farmerId === reviewData.farmerId);
    const avgFarmerRating = farmerReviews.reduce((sum, r) => sum + r.rating, 0) / farmerReviews.length;
    const farmer = this.getUserById(reviewData.farmerId);
    if (farmer?.farmerProfile) {
      farmer.farmerProfile.rating = Number(avgFarmerRating.toFixed(1));
      farmer.farmerProfile.totalReviews = farmerReviews.length;
    }

    // Update Product rating
    if (reviewData.productId) {
      const prodReviews = this.reviews.filter(r => r.productId === reviewData.productId);
      const avgProdRating = prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length;
      this.updateProduct(reviewData.productId, {
        rating: Number(avgProdRating.toFixed(1)),
        reviewsCount: prodReviews.length
      });
    }

    // Notify farmer
    this.createNotification({
      userId: reviewData.farmerId,
      title: `New Review Received (${reviewData.rating} Stars)`,
      message: `${reviewData.buyerName} left a review: "${reviewData.comment.substring(0, 80)}..."`,
      type: 'system',
      link: `/farmer/${reviewData.farmerId}`,
      read: false,
      createdAt: now
    });

    return newReview;
  }

  // --- Conversations & Messaging ---
  getConversationsForUser(userId: string): Conversation[] {
    return this.conversations
      .filter(c => c.participants.some(p => p.id === userId))
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
  }

  getMessages(conversationId: string): Message[] {
    return this.messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  sendMessage(params: {
    conversationId?: string;
    senderId: string;
    recipientId: string;
    text: string;
    productId?: string;
    productSnippet?: any;
    orderId?: string;
  }): { message: Message; conversation: Conversation } {
    let conversation: Conversation | undefined;
    const now = new Date().toISOString();

    if (params.conversationId) {
      conversation = this.conversations.find(c => c.id === params.conversationId);
    }

    if (!conversation) {
      // Find existing between these 2 users
      conversation = this.conversations.find(c =>
        c.participants.some(p => p.id === params.senderId) &&
        c.participants.some(p => p.id === params.recipientId)
      );
    }

    const sender = this.getUserById(params.senderId);
    const recipient = this.getUserById(params.recipientId);

    if (!conversation && sender && recipient) {
      const convId = `conv-${Date.now()}`;
      conversation = {
        id: convId,
        participants: [
          {
            id: sender.id,
            name: sender.name,
            role: sender.role,
            avatar: sender.avatar,
            farmName: sender.farmerProfile?.farmName
          },
          {
            id: recipient.id,
            name: recipient.name,
            role: recipient.role,
            avatar: recipient.avatar,
            farmName: recipient.farmerProfile?.farmName
          }
        ],
        lastMessage: params.text,
        lastMessageTime: now,
        unreadCountFor: {
          [recipient.id]: 1,
          [sender.id]: 0
        },
        productId: params.productId,
        orderId: params.orderId
      };
      this.conversations.unshift(conversation);
    } else if (conversation) {
      conversation.lastMessage = params.text;
      conversation.lastMessageTime = now;
      conversation.unreadCountFor[params.recipientId] = (conversation.unreadCountFor[params.recipientId] || 0) + 1;
      if (params.productId && !conversation.productId) conversation.productId = params.productId;
      if (params.orderId && !conversation.orderId) conversation.orderId = params.orderId;
    }

    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      conversationId: conversation!.id,
      senderId: params.senderId,
      senderName: sender?.name || 'User',
      senderRole: sender?.role || 'buyer',
      text: params.text,
      createdAt: now,
      read: false,
      productId: params.productId,
      productSnippet: params.productSnippet
    };

    this.messages.push(message);

    // Notify recipient
    this.createNotification({
      userId: params.recipientId,
      title: `New Message from ${sender?.name || 'User'}`,
      message: params.text.length > 80 ? params.text.substring(0, 80) + '...' : params.text,
      type: 'message',
      link: `/messages/${conversation!.id}`,
      read: false,
      createdAt: now,
      metadata: { conversationId: conversation!.id }
    });

    return { message, conversation: conversation! };
  }

  markConversationRead(conversationId: string, userId: string): void {
    const conv = this.conversations.find(c => c.id === conversationId);
    if (conv && conv.unreadCountFor) {
      conv.unreadCountFor[userId] = 0;
    }
    this.messages
      .filter(m => m.conversationId === conversationId && m.senderId !== userId)
      .forEach(m => { m.read = true; });
  }

  // --- Notifications ---
  getNotifications(userId: string): Notification[] {
    return this.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createNotification(notif: Partial<Notification> & { userId: string; title: string; message: string; type: Notification['type'] }): Notification {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newNotif: Notification = {
      read: false,
      createdAt: new Date().toISOString(),
      ...notif,
      id
    };
    this.notifications.unshift(newNotif);
    return newNotif;
  }

  markNotificationRead(id: string): boolean {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      return true;
    }
    return false;
  }

  markAllNotificationsRead(userId: string): void {
    this.notifications
      .filter(n => n.userId === userId)
      .forEach(n => { n.read = true; });
  }

  // --- Favorites ---
  getFavorites(userId: string): Product[] {
    const favIds = this.favorites[userId] || [];
    return this.products.filter(p => favIds.includes(p.id));
  }

  toggleFavorite(userId: string, productId: string): { isFavorite: boolean; favoriteIds: string[] } {
    if (!this.favorites[userId]) {
      this.favorites[userId] = [];
    }
    const idx = this.favorites[userId].indexOf(productId);
    let isFavorite = false;
    if (idx > -1) {
      this.favorites[userId].splice(idx, 1);
      isFavorite = false;
    } else {
      this.favorites[userId].push(productId);
      isFavorite = true;
    }
    return { isFavorite, favoriteIds: this.favorites[userId] };
  }

  // --- Announcements ---
  getAnnouncements(role?: string): Announcement[] {
    return this.announcements.filter(a => {
      if (!a.active) return false;
      if (a.targetAudience === 'all') return true;
      if (role && a.targetAudience === `${role}s`) return true;
      return true;
    }).sort((a, b) => {
      // Pinned items first, then newest
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  createAnnouncement(ann: Partial<Announcement>): Announcement {
    const id = `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const title = (ann.title || 'Platform Announcement').toString().trim();
    const content = (ann.content || '').toString().trim();
    const category = ann.category || 'general';
    const priority = ann.priority || 'normal';
    const targetAudience = ann.targetAudience || 'all';
    const author = (ann.author || 'agroX Admin Team').toString().trim();
    const authorRole = ann.authorRole || 'admin';
    const authorAvatar = ann.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';

    const newAnn: Announcement = {
      id,
      title,
      content,
      category,
      priority,
      targetAudience,
      author,
      authorRole,
      authorAvatar,
      pinned: Boolean(ann.pinned),
      createdAt: new Date().toISOString(),
      active: true,
      likesCount: 0,
      reactions: { '👍': 1 }
    };

    if (!Array.isArray(this.announcements)) {
      this.announcements = [];
    }
    this.announcements.unshift(newAnn);

    // Broadcast notifications to targeted users safely
    try {
      if (Array.isArray(this.users)) {
        this.users.forEach(u => {
          if (
            targetAudience === 'all' ||
            (targetAudience === 'farmers' && u.role === 'farmer') ||
            (targetAudience === 'buyers' && u.role === 'buyer')
          ) {
            this.createNotification({
              userId: u.id,
              title: `Announcement: ${title}`,
              message: content.length > 100 ? `${content.substring(0, 100)}...` : content,
              type: 'announcement',
              link: '/messages',
              read: false,
              createdAt: new Date().toISOString()
            });
          }
        });
      }
    } catch (err) {
      console.warn('Failed to broadcast user notification for announcement:', err);
    }

    return newAnn;
  }

  reactToAnnouncement(id: string, reaction: string): Announcement | undefined {
    const ann = this.announcements.find(a => a.id === id);
    if (ann) {
      if (!ann.reactions) ann.reactions = {};
      ann.reactions[reaction] = (ann.reactions[reaction] || 0) + 1;
      ann.likesCount = (ann.likesCount || 0) + 1;
    }
    return ann;
  }

  deleteAnnouncement(id: string): boolean {
    const idx = this.announcements.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.announcements.splice(idx, 1);
      return true;
    }
    return false;
  }

  // --- Reports ---
  getReports(): Report[] {
    return this.reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createReport(reportData: Omit<Report, 'id' | 'status' | 'createdAt'>): Report {
    const id = `rep-${Date.now()}`;
    const newReport: Report = {
      ...reportData,
      id,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.reports.unshift(newReport);
    return newReport;
  }

  resolveReport(id: string, status: 'resolved' | 'dismissed', adminNotes?: string): Report | undefined {
    const rep = this.reports.find(r => r.id === id);
    if (rep) {
      rep.status = status;
      if (adminNotes) rep.adminNotes = adminNotes;
    }
    return rep;
  }

  // --- Advertisement Requests & Hot Deals ---
  getAdRequests(farmerId?: string, status?: string): AdRequest[] {
    let list = [...this.adRequests];
    if (farmerId) {
      list = list.filter(a => a.farmerId === farmerId);
    }
    if (status && status !== 'all') {
      list = list.filter(a => a.status === status);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAdRequestById(id: string): AdRequest | undefined {
    return this.adRequests.find(a => a.id === id);
  }

  getActiveHotDeals(): AdRequest[] {
    return this.adRequests
      .filter(a => a.status === 'approved')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createAdRequest(data: Omit<AdRequest, 'id' | 'createdAt' | 'updatedAt' | 'totalAmount' | 'dailyRate'> & { days: number }): AdRequest {
    const id = `ad-${Date.now()}`;
    const days = Math.min(Math.max(Number(data.days) || 1, 1), 30);
    const dailyRate = 1.00;
    const totalAmount = days * dailyRate;

    const newAd: AdRequest = {
      ...data,
      id,
      days,
      dailyRate,
      totalAmount,
      status: data.status || 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.adRequests.unshift(newAd);

    // Send notification to Admin
    const admins = this.users.filter(u => u.role === 'admin');
    admins.forEach(admin => {
      this.createNotification({
        userId: admin.id,
        title: 'New Advertisement Request Submitted',
        message: `${newAd.farmerName} (${newAd.farmName}) submitted a ${newAd.days}-day ad request ($${newAd.totalAmount.toFixed(2)}) for "${newAd.dealHeadline}".`,
        type: 'announcement',
        link: '/admin',
        metadata: { adRequestId: newAd.id }
      });
    });

    // Send confirmation to Farmer
    this.createNotification({
      userId: newAd.farmerId,
      title: 'Advertisement Request Received (State: Sent)',
      message: `Your ${newAd.days}-day promotion request for "${newAd.dealHeadline}" has been received and queued for administrative POP review.`,
      type: 'order',
      metadata: { adRequestId: newAd.id }
    });

    return newAd;
  }

  updateAdRequestStatus(
    id: string,
    status: AdRequestStatus,
    adminFeedback?: string,
    reviewedBy?: string
  ): AdRequest | undefined {
    const ad = this.adRequests.find(a => a.id === id);
    if (!ad) return undefined;

    ad.status = status;
    ad.updatedAt = new Date().toISOString();
    if (adminFeedback !== undefined) ad.adminFeedback = adminFeedback;
    if (reviewedBy) ad.reviewedBy = reviewedBy;
    ad.reviewedAt = new Date().toISOString();

    if (status === 'approved') {
      const now = new Date();
      ad.startDate = now.toISOString();
      const end = new Date(now.getTime() + ad.days * 24 * 60 * 60 * 1000);
      ad.endDate = end.toISOString();

      // Notify farmer of approval
      this.createNotification({
        userId: ad.farmerId,
        title: '🎉 Advertisement Request APPROVED!',
        message: `Your ad "${ad.dealHeadline}" has been approved and is now live on the Hot Deals banner for ${ad.days} days.`,
        type: 'announcement',
        metadata: { adRequestId: ad.id }
      });
    } else if (status === 'rejected') {
      // Notify farmer of rejection
      this.createNotification({
        userId: ad.farmerId,
        title: 'Advertisement Request Update: Rejected',
        message: `Your ad request for "${ad.dealHeadline}" was declined.${adminFeedback ? ` Reason: ${adminFeedback}` : ''}`,
        type: 'order',
        metadata: { adRequestId: ad.id }
      });
    } else if (status === 'under_review') {
      this.createNotification({
        userId: ad.farmerId,
        title: 'Advertisement Under Review',
        message: `Your ad request for "${ad.dealHeadline}" is currently under review by our moderation team.`,
        type: 'order',
        metadata: { adRequestId: ad.id }
      });
    }

    return ad;
  }

  deleteAdRequest(id: string): boolean {
    const idx = this.adRequests.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.adRequests.splice(idx, 1);
      return true;
    }
    return false;
  }

  // --- Analytics & Statistics ---
  getFarmerStats(farmerId: string) {
    const farmerProducts = this.products.filter(p => p.farmerId === farmerId);
    const farmerOrders = this.orders.filter(o => o.farmerId === farmerId);
    const totalSales = farmerOrders
      .filter(o => o.status === 'completed' || o.status === 'out_for_delivery' || o.status === 'ready_for_collection')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pendingOrdersCount = farmerOrders.filter(o => o.status === 'pending').length;
    const completedOrdersCount = farmerOrders.filter(o => o.status === 'completed').length;
    const activeListingsCount = farmerProducts.filter(p => p.availability === 'available' || p.availability === 'low_stock').length;

    // Daily/monthly sales grouping for charts
    const salesChart = [
      { name: 'Mon', sales: 45, orders: 2 },
      { name: 'Tue', sales: 120, orders: 4 },
      { name: 'Wed', sales: 85, orders: 3 },
      { name: 'Thu', sales: 160, orders: 5 },
      { name: 'Fri', sales: 210, orders: 7 },
      { name: 'Sat', sales: 340, orders: 11 },
      { name: 'Sun', sales: 190, orders: 6 }
    ];

    return {
      totalProducts: farmerProducts.length,
      activeListings: activeListingsCount,
      totalOrders: farmerOrders.length,
      pendingOrders: pendingOrdersCount,
      completedOrders: completedOrdersCount,
      totalRevenue: totalSales,
      salesChart,
      recentOrders: farmerOrders.slice(0, 5),
      lowStockProducts: farmerProducts.filter(p => p.availability === 'low_stock' || p.quantityAvailable < 10)
    };
  }

  getAdminStats() {
    const totalUsers = this.users.length;
    const farmersCount = this.users.filter(u => u.role === 'farmer').length;
    const buyersCount = this.users.filter(u => u.role === 'buyer').length;
    const totalProducts = this.products.length;
    const totalOrders = this.orders.length;
    const totalVolume = this.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingReports = this.reports.filter(r => r.status === 'pending').length;

    const volumeChart = [
      { month: 'Mar', volume: 1850, orders: 45, newFarmers: 3 },
      { month: 'Apr', volume: 2400, orders: 68, newFarmers: 6 },
      { month: 'May', volume: 3100, orders: 92, newFarmers: 8 },
      { month: 'Jun', volume: 4300, orders: 124, newFarmers: 11 },
      { month: 'Jul', volume: 5600, orders: 160, newFarmers: 14 },
      { month: 'Aug', volume: 7200, orders: 215, newFarmers: 19 }
    ];

    return {
      totalUsers,
      farmersCount,
      buyersCount,
      totalProducts,
      totalOrders,
      totalVolume,
      pendingReports,
      volumeChart,
      recentUsers: this.users.slice(-5).reverse(),
      recentOrders: this.orders.slice(0, 5),
      recentReports: this.reports.slice(0, 5)
    };
  }
}

export const store = new MarketplaceStore();
