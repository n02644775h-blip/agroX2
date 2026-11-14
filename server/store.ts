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
  AdRequestStatus,
  PaymentStatus,
  MediaPost,
  BuyerRequest,
  BuyerRequestStatus
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
  INITIAL_AD_REQUESTS,
  INITIAL_MEDIA_POSTS,
  INITIAL_BUYER_REQUESTS
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
  private mediaPosts: MediaPost[] = [...INITIAL_MEDIA_POSTS];
  private buyerRequests: BuyerRequest[] = [...INITIAL_BUYER_REQUESTS];
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
    if (index === -1) {
      const newUser: User = {
        id,
        name: updates.name || 'User',
        email: updates.email || `${id}@agrox.org`,
        role: updates.role || (id.startsWith('farmer') ? 'farmer' : id.startsWith('admin') ? 'admin' : 'buyer'),
        phone: updates.phone || '',
        avatar: updates.avatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
        location: updates.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
        status: 'active',
        createdAt: new Date().toISOString(),
        farmerProfile: updates.farmerProfile,
        buyerProfile: updates.buyerProfile,
        ...updates
      };
      this.users.push(newUser);
      return newUser;
    }

    const existing = this.users[index];
    this.users[index] = {
      ...existing,
      ...updates,
      farmerProfile: updates.farmerProfile ? {
        ...(existing.farmerProfile || {}),
        ...updates.farmerProfile
      } : existing.farmerProfile,
      buyerProfile: updates.buyerProfile ? {
        ...(existing.buyerProfile || {}),
        ...updates.buyerProfile
      } : existing.buyerProfile,
      location: updates.location ? {
        ...(existing.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' }),
        ...updates.location
      } : existing.location
    };
    return this.users[index];
  }

  toggleUserStatus(id: string, status: 'active' | 'suspended' | 'pending_verification', email?: string): User | undefined {
    let matchedUser: User | undefined;

    for (let i = 0; i < this.users.length; i++) {
      const u = this.users[i];
      const idMatches = u.id === id;
      const emailMatches = Boolean(email && u.email && u.email.toLowerCase() === email.trim().toLowerCase());
      if (idMatches || emailMatches) {
        this.users[i] = { ...u, status };
        if (idMatches || !matchedUser) {
          matchedUser = this.users[i];
        }
      }
    }

    if (!matchedUser) {
      matchedUser = this.updateUser(id, {
        status,
        ...(email ? { email: email.trim() } : {})
      });
    }

    return matchedUser;
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
    const requestedFarmerId =
      params?.farmerId ||
      (params?.userId && (params?.role === 'farmer' || params?.role === 'fodder_supplier')
        ? params.userId
        : undefined);

    if (params?.userId && params?.role === 'buyer') {
      list = list.filter(o => o.buyerId === params.userId);
    } else if (requestedFarmerId) {
      list = list
        .filter(
          o =>
            o.farmerId === requestedFarmerId ||
            o.items.some(item => item.farmerId === requestedFarmerId)
        )
        .map(o => {
          const hasExplicitItemFarmers = o.items.some(i => Boolean(i.farmerId));
          if (!hasExplicitItemFarmers || o.farmerId === requestedFarmerId) {
            return o;
          }
          const scopedItems = o.items.filter(i => !i.farmerId || i.farmerId === requestedFarmerId);
          return {
            ...o,
            items: scopedItems
          };
        });
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter(o => o.status === params.status);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.find(o => o.id === id);
  }

  createOrder(
    orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'statusHistory'> & {
      id?: string;
      orderNumber?: string;
    }
  ): Order {
    if (orderData.id) {
      const existing = this.orders.find(o => o.id === orderData.id);
      if (existing) {
        return existing;
      }
    }
    const id = orderData.id || `ord-${Date.now()}`;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = orderData.orderNumber || `AGC-26-${randNum}`;
    const now = new Date().toISOString();

    const paymentMethod = orderData.paymentMethod || 'cash_on_delivery';
    const hasPop = Boolean(orderData.proofOfPaymentUrl && orderData.proofOfPaymentUrl.trim().length > 0);
    // CRITICAL: Never automatically mark an order as 'paid' just because a POP was uploaded.
    const paymentStatus: PaymentStatus =
      paymentMethod === 'cash_on_delivery'
        ? 'awaiting_payment'
        : hasPop
          ? 'pending_verification'
          : 'awaiting_payment';

    const newOrder: Order = {
      ...orderData,
      id,
      orderNumber,
      paymentMethod,
      paymentStatus,
      paymentSubmittedAt: hasPop ? (orderData.paymentSubmittedAt || now) : undefined,
      createdAt: now,
      updatedAt: now,
      status: 'received',
      statusHistory: [
        {
          status: 'received',
          timestamp: now,
          note: paymentMethod === 'cash_on_delivery'
            ? 'Order received (Cash on Delivery — payment pending until delivery)'
            : hasPop
              ? 'Order received (Proof of payment uploaded — awaiting farmer verification)'
              : 'Order received (Awaiting electronic payment & proof of payment)'
        }
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
      message: `${newOrder.buyerName} placed a ${newOrder.deliveryMethod === 'pickup' ? 'Farm Pickup' : 'Delivery'} order for $${newOrder.totalAmount.toFixed(2)}.`,
      type: 'order',
      link: `/orders/${newOrder.id}`,
      read: false,
      createdAt: now,
      metadata: { orderId: newOrder.id }
    });

    // Notify buyer
    this.createNotification({
      userId: newOrder.buyerId,
      title: `Order Received (${newOrder.orderNumber})`,
      message: `Your order with ${newOrder.farmName} has been received and is being tracked.`,
      type: 'order',
      link: `/orders/${newOrder.id}`,
      read: false,
      createdAt: now,
      metadata: { orderId: newOrder.id }
    });

    return newOrder;
  }

  updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string,
    pickupTimeWindow?: string,
    pickupInstructions?: string
  ): Order | undefined {
    const index = this.orders.findIndex(o => o.id === orderId);
    if (index === -1) return undefined;

    const order = this.orders[index];
    const now = new Date().toISOString();
    const prevStatus = order.status;

    order.status = status;
    order.updatedAt = now;
    if (pickupTimeWindow !== undefined) {
      order.pickupTimeWindow = pickupTimeWindow;
      if (order.pickupLocation) {
        order.pickupLocation = { ...order.pickupLocation, readyAt: pickupTimeWindow };
      }
    }
    if (pickupInstructions !== undefined) {
      order.pickupInstructions = pickupInstructions;
      if (order.pickupLocation) {
        order.pickupLocation = { ...order.pickupLocation, instructions: pickupInstructions };
      }
    }

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
      received: 'Order Received',
      packaged: 'Order Packaged!',
      delivering: 'Order Out for Delivery!',
      ready_for_pickup: 'Order Ready for Pickup!',
      done: 'Order Done!',
      pending: 'Order Pending',
      accepted: 'Order Accepted!',
      rejected: 'Order Declined',
      preparing: 'Order Being Prepared',
      ready_for_collection: 'Ready for Pickup!',
      out_for_delivery: 'Out for Delivery!',
      completed: 'Order Completed',
      cancelled: 'Order Cancelled'
    };

    const statusLabel = statusTitles[status] || `Order ${status.replace(/_/g, ' ')}`;

    // Notify buyer
    this.createNotification({
      userId: order.buyerId,
      title: `${statusLabel} (${order.orderNumber})`,
      message: `${order.farmName} updated your order status to "${status.replace(/_/g, ' ')}". ${pickupTimeWindow ? `Pickup time: ${pickupTimeWindow}. ` : ''}${note ? `Note: ${note}` : ''}`,
      type: 'order',
      link: `/orders/${order.id}`,
      read: false,
      createdAt: now,
      metadata: { orderId: order.id }
    });

    return order;
  }

  submitOrderPop(
    orderId: string,
    payload: { proofOfPaymentUrl: string; proofOfPaymentFileName?: string; paymentReference?: string }
  ): Order | undefined {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return undefined;
    const now = new Date().toISOString();

    order.proofOfPaymentUrl = payload.proofOfPaymentUrl;
    order.proofOfPaymentFileName = payload.proofOfPaymentFileName || 'Proof_of_Payment';
    if (payload.paymentReference !== undefined) {
      order.paymentReference = payload.paymentReference;
    }
    order.paymentSubmittedAt = now;
    // Never automatically mark as paid upon POP upload!
    order.paymentStatus = 'pending_verification';
    order.paymentRejectionReason = undefined;
    order.updatedAt = now;

    this.createNotification({
      userId: order.farmerId,
      title: `Proof of Payment Uploaded (${order.orderNumber})`,
      message: `${order.buyerName} uploaded Proof of Payment for $${order.totalAmount.toFixed(2)}. Please review and confirm.`,
      type: 'order',
      link: `/orders/${order.id}`,
      read: false,
      createdAt: now,
      metadata: { orderId: order.id }
    });

    return order;
  }

  updateOrderPaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus,
    reason?: string
  ): Order | undefined {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return undefined;
    const now = new Date().toISOString();

    order.paymentStatus = paymentStatus;
    order.updatedAt = now;
    if (paymentStatus === 'paid') {
      order.paymentVerifiedAt = now;
      order.paymentRejectionReason = undefined;
    } else if (paymentStatus === 'rejected') {
      order.paymentRejectionReason = reason || 'Proof of payment could not be verified.';
    }

    const label = paymentStatus === 'paid' ? 'Payment Confirmed' : paymentStatus === 'rejected' ? 'Payment Proof Rejected' : 'Payment Status Updated';
    this.createNotification({
      userId: order.buyerId,
      title: `${label} (${order.orderNumber})`,
      message:
        paymentStatus === 'paid'
          ? `${order.farmName} verified and confirmed your payment of $${order.totalAmount.toFixed(2)}.`
          : paymentStatus === 'rejected'
            ? `${order.farmName} declined your proof of payment.${reason ? ` Reason: ${reason}` : ' Please upload a valid receipt.'}`
            : `Payment status updated to ${paymentStatus.replace(/_/g, ' ')}.`,
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
    postReference?: Message['postReference'];
    requestReference?: Message['requestReference'];
    orderId?: string;
    requestId?: string;
    postId?: string;
    senderName?: string;
    senderAvatar?: string;
    senderRole?: string;
    recipientName?: string;
    recipientAvatar?: string;
    recipientRole?: string;
    recipientFarmName?: string;
  }): { message: Message; conversation: Conversation } {
    let conversation: Conversation | undefined;
    const now = new Date().toISOString();

    if (params.conversationId) {
      conversation = this.conversations.find(c => c.id === params.conversationId);
    }

    if (!conversation) {
      conversation = this.conversations.find(c =>
        c.participants.some(p => p.id === params.senderId) &&
        c.participants.some(p => p.id === params.recipientId)
      );
    }

    const sender = this.getUserById(params.senderId);
    const recipient = this.getUserById(params.recipientId);

    const senderParticipant = {
      id: params.senderId,
      name: sender?.name || params.senderName || 'agroX User',
      role: (sender?.role || params.senderRole || 'buyer') as any,
      avatar: sender?.avatar || params.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
      farmName: sender?.farmerProfile?.farmName
    };

    const recipientParticipant = {
      id: params.recipientId,
      name: recipient?.name || params.recipientName || 'Producer',
      role: (recipient?.role || params.recipientRole || 'farmer') as any,
      avatar: recipient?.avatar || params.recipientAvatar || 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
      farmName: recipient?.farmerProfile?.farmName || params.recipientFarmName
    };

    if (!conversation) {
      const sortedIds = [params.senderId, params.recipientId].sort();
      const convId = params.conversationId || `conv_${sortedIds[0]}__${sortedIds[1]}`;
      conversation = {
        id: convId,
        participants: [senderParticipant, recipientParticipant],
        lastMessage: params.text,
        lastMessageTime: now,
        unreadCountFor: {
          [params.recipientId]: 1,
          [params.senderId]: 0
        },
        productId: params.productId,
        productName: params.productSnippet?.name,
        orderId: params.orderId,
        requestId: params.requestId || params.requestReference?.requestId,
        postId: params.postId || params.postReference?.postId
      };
      this.conversations.unshift(conversation);
    } else {
      conversation.lastMessage = params.text;
      conversation.lastMessageTime = now;
      if (!conversation.unreadCountFor) conversation.unreadCountFor = {};
      conversation.unreadCountFor[params.recipientId] = (conversation.unreadCountFor[params.recipientId] || 0) + 1;
      if (params.productId && !conversation.productId) conversation.productId = params.productId;
      if (params.productSnippet?.name && !conversation.productName) conversation.productName = params.productSnippet.name;
      if (params.orderId && !conversation.orderId) conversation.orderId = params.orderId;
      if ((params.requestId || params.requestReference?.requestId) && !conversation.requestId) {
        conversation.requestId = params.requestId || params.requestReference?.requestId;
      }
      if ((params.postId || params.postReference?.postId) && !conversation.postId) {
        conversation.postId = params.postId || params.postReference?.postId;
      }
    }

    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      conversationId: conversation.id,
      senderId: params.senderId,
      senderName: senderParticipant.name,
      senderRole: senderParticipant.role,
      text: params.text,
      createdAt: now,
      read: false,
      productId: params.productId,
      productSnippet: params.productSnippet,
      postReference: params.postReference,
      requestReference: params.requestReference
    };

    this.messages.push(message);

    // If quote inquiry on a community post, increment post counter and notify specifically
    if (params.postReference?.postId) {
      const post = this.mediaPosts.find(p => p.id === params.postReference?.postId);
      if (post) {
        post.quoteRequestsCount = (post.quoteRequestsCount || 0) + 1;
      }
      this.createNotification({
        userId: params.recipientId,
        title: `Quote Request from ${senderParticipant.name}`,
        message: `${senderParticipant.name} requested a quote on your community post: "${params.postReference.productName || params.postReference.caption.slice(0, 60)}"`,
        type: 'post',
        link: 'messages',
        read: false,
        createdAt: now,
        metadata: { conversationId: conversation.id, postId: params.postReference.postId }
      });
    } else if (params.requestReference?.requestId) {
      // Farmer responding to a buyer request
      if (senderParticipant.role === 'farmer' || senderParticipant.role === 'fodder_supplier') {
        this.markBuyerRequestResponded(
          params.requestReference.requestId,
          params.senderId,
          senderParticipant.farmName || senderParticipant.name,
          false
        );
      }
      this.createNotification({
        userId: params.recipientId,
        title: `Response to Your Request: ${params.requestReference.productName}`,
        message: `${senderParticipant.farmName || senderParticipant.name}: ${params.text.slice(0, 90)}`,
        type: 'request',
        link: 'messages',
        read: false,
        createdAt: now,
        metadata: { conversationId: conversation.id, requestId: params.requestReference.requestId }
      });
    } else {
      // Notify recipient for regular 1-on-1 message
      this.createNotification({
        userId: params.recipientId,
        title: `New Message from ${senderParticipant.name}`,
        message: params.text.length > 80 ? params.text.substring(0, 80) + '...' : params.text,
        type: 'message',
        link: `/messages/${conversation.id}`,
        read: false,
        createdAt: now,
        metadata: { conversationId: conversation.id }
      });
    }

    return { message, conversation };
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
            (targetAudience === 'farmers' && (u.role === 'farmer' || u.role === 'fodder_supplier')) ||
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
  private syncExpiredAds(): void {
    const now = Date.now();
    this.adRequests.forEach(ad => {
      if ((ad.status === 'approved' || ad.status === 'active') && ad.endDate) {
        const endMs = new Date(ad.endDate).getTime();
        if (Number.isFinite(endMs) && now > endMs) {
          ad.status = 'expired';
          ad.updatedAt = new Date(now).toISOString();
        }
      }
    });
  }

  getAdRequests(farmerId?: string, status?: string): AdRequest[] {
    this.syncExpiredAds();
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
    this.syncExpiredAds();
    return this.adRequests.find(a => a.id === id);
  }

  getActiveHotDeals(): AdRequest[] {
    this.syncExpiredAds();
    const now = Date.now();
    return this.adRequests
      .filter(a => {
        if (a.status !== 'approved' && a.status !== 'active') return false;
        if (!a.endDate) return true;
        const endMs = new Date(a.endDate).getTime();
        return !Number.isFinite(endMs) || now <= endMs;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createAdRequest(data: Omit<AdRequest, 'id' | 'createdAt' | 'updatedAt' | 'dailyRate'> & { id?: string; days: number; durationDays?: number; totalFee?: number; totalAmount?: number; discountText?: string }): AdRequest {
    const id = data.id || `ad-${Date.now()}`;
    const rawDays = Number(data.days) || Number(data.durationDays) || 7;
    const days = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 30) : 7;
    const dailyRate = 1.00;
    const rawTotal = Number(data.totalAmount) || Number(data.totalFee);
    const totalAmount = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : (days * dailyRate);
    const safeSpecialPrice = data.specialPrice !== undefined && Number.isFinite(Number(data.specialPrice))
      ? Number(data.specialPrice)
      : undefined;
    const safeDiscountPct = data.discountPercentage !== undefined && Number.isFinite(Number(data.discountPercentage))
      ? Number(data.discountPercentage)
      : undefined;
    const safeProductPrice = data.productPrice !== undefined && Number.isFinite(Number(data.productPrice))
      ? Number(data.productPrice)
      : undefined;
    const discountText = data.discountText || (safeDiscountPct ? `${safeDiscountPct}% OFF` : (safeSpecialPrice !== undefined ? `Special: $${safeSpecialPrice.toFixed(2)}` : 'PROMO DEAL'));

    // Check if ad with this ID already exists (upsert)
    const existingIndex = this.adRequests.findIndex(a => a.id === id);

    const newAd: AdRequest = {
      ...data,
      id,
      productPrice: safeProductPrice,
      discountPercentage: safeDiscountPct,
      specialPrice: safeSpecialPrice,
      days,
      durationDays: days,
      dailyRate,
      totalAmount,
      totalFee: totalAmount,
      discountText,
      status: data.status || 'sent',
      createdAt: (existingIndex >= 0 ? this.adRequests[existingIndex].createdAt : undefined) || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.adRequests[existingIndex] = newAd;
    } else {
      this.adRequests.unshift(newAd);
    }

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
    if (newAd.farmerId) {
      this.createNotification({
        userId: newAd.farmerId,
        title: 'Advertisement Request Received (State: Sent)',
        message: `Your ${newAd.days}-day promotion request for "${newAd.dealHeadline}" has been received and queued for administrative POP review.`,
        type: 'order',
        metadata: { adRequestId: newAd.id }
      });
    }

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

    if (status === 'approved' || status === 'active') {
      const now = new Date();
      const durationDays = Math.min(Math.max(Number(ad.days || ad.durationDays || 7), 1), 30);
      ad.days = durationDays;
      ad.durationDays = durationDays;
      ad.startDate = now.toISOString();
      const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      ad.endDate = end.toISOString();

      // Notify farmer of approval
      this.createNotification({
        userId: ad.farmerId,
        title: 'Advertisement Request APPROVED!',
        message: `Your ad "${ad.dealHeadline}" has been approved and is now live on the Featured Advertisements homepage section for ${durationDays} days.`,
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
    const farmersCount = this.users.filter(u => u.role === 'farmer' || u.role === 'fodder_supplier').length;
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

  // --- FarmBridge Community Media Posts ---
  getMediaPosts(farmerId?: string): MediaPost[] {
    let list = [...this.mediaPosts];
    if (farmerId) {
      list = list.filter(p => p.farmerId === farmerId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getMediaPostById(id: string): MediaPost | undefined {
    return this.mediaPosts.find(p => p.id === id);
  }

  createMediaPost(
    data: Omit<MediaPost, 'id' | 'likesCount' | 'likedBy' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      likesCount?: number;
      likedBy?: string[];
    }
  ): MediaPost {
    const now = new Date().toISOString();
    const id = data.id || `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const existingIdx = this.mediaPosts.findIndex(p => p.id === id);
    const post: MediaPost = {
      ...data,
      id,
      hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
      media: Array.isArray(data.media) ? data.media : [],
      likesCount: data.likesCount ?? 0,
      likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
      quoteRequestsCount: data.quoteRequestsCount ?? 0,
      createdAt: existingIdx >= 0 ? this.mediaPosts[existingIdx].createdAt : now,
      updatedAt: now
    };
    if (existingIdx >= 0) {
      this.mediaPosts[existingIdx] = post;
    } else {
      this.mediaPosts.unshift(post);
    }
    return post;
  }

  updateMediaPost(id: string, farmerId: string | undefined, updates: Partial<MediaPost>): MediaPost | null | undefined {
    const idx = this.mediaPosts.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    const existing = this.mediaPosts[idx];
    if (farmerId && existing.farmerId !== farmerId) return null;
    this.mediaPosts[idx] = {
      ...existing,
      ...updates,
      id: existing.id,
      farmerId: existing.farmerId,
      updatedAt: new Date().toISOString()
    };
    return this.mediaPosts[idx];
  }

  deleteMediaPost(id: string, farmerId?: string): 'deleted' | 'forbidden' | 'not_found' {
    const idx = this.mediaPosts.findIndex(p => p.id === id);
    if (idx === -1) return 'not_found';
    if (farmerId && this.mediaPosts[idx].farmerId !== farmerId) return 'forbidden';
    this.mediaPosts.splice(idx, 1);
    return 'deleted';
  }

  toggleMediaPostLike(id: string, userId: string): MediaPost | undefined {
    const post = this.mediaPosts.find(p => p.id === id);
    if (!post) return undefined;
    const likedSet = new Set(post.likedBy || []);
    if (likedSet.has(userId)) {
      likedSet.delete(userId);
    } else {
      likedSet.add(userId);
    }
    post.likedBy = Array.from(likedSet);
    post.likesCount = post.likedBy.length;
    post.updatedAt = new Date().toISOString();
    return post;
  }

  recordMediaPostQuote(id: string, buyerId: string, buyerName: string): MediaPost | undefined {
    const post = this.mediaPosts.find(p => p.id === id);
    if (!post) return undefined;
    post.quoteRequestsCount = (post.quoteRequestsCount || 0) + 1;
    post.updatedAt = new Date().toISOString();
    if (post.farmerId && post.farmerId !== buyerId) {
      this.createNotification({
        userId: post.farmerId,
        title: `Quote Request from ${buyerName}`,
        message: `${buyerName} requested a quote on your community showcase post "${post.productName || post.caption.slice(0, 50)}".`,
        type: 'post',
        link: 'messages',
        metadata: { postId: post.id, buyerId }
      });
    }
    return post;
  }

  // --- Buyer Product Requests ---
  getBuyerRequests(filters?: {
    buyerId?: string;
    category?: string;
    location?: string;
    status?: string;
  }): BuyerRequest[] {
    let list = [...this.buyerRequests];
    if (filters) {
      if (filters.buyerId) {
        list = list.filter(r => r.buyerId === filters.buyerId);
      }
      if (filters.category && filters.category !== 'all') {
        list = list.filter(
          r =>
            r.category === filters.category ||
            r.categoryName.toLowerCase() === filters.category!.toLowerCase()
        );
      }
      if (filters.location && filters.location.trim() && filters.location.toLowerCase() !== 'all') {
        const loc = filters.location.trim().toLowerCase();
        list = list.filter(r => r.location.toLowerCase().includes(loc));
      }
      if (filters.status && filters.status !== 'all') {
        list = list.filter(r => r.status === filters.status);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getBuyerRequestById(id: string): BuyerRequest | undefined {
    return this.buyerRequests.find(r => r.id === id);
  }

  createBuyerRequest(
    data: Omit<BuyerRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      status?: BuyerRequestStatus;
    }
  ): BuyerRequest {
    const now = new Date().toISOString();
    const id = data.id || `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const existingIdx = this.buyerRequests.findIndex(r => r.id === id);
    const reqObj: BuyerRequest = {
      ...data,
      id,
      status: data.status || 'open',
      respondedFarmerIds: Array.isArray(data.respondedFarmerIds) ? data.respondedFarmerIds : [],
      responseCount: data.responseCount ?? 0,
      createdAt: existingIdx >= 0 ? this.buyerRequests[existingIdx].createdAt : now,
      updatedAt: now
    };

    if (existingIdx >= 0) {
      this.buyerRequests[existingIdx] = reqObj;
    } else {
      this.buyerRequests.unshift(reqObj);
      // Notify active farmers and fodder suppliers about new buyer demand
      this.users
        .filter(u => (u.role === 'farmer' || u.role === 'fodder_supplier') && u.status === 'active')
        .forEach(seller => {
          this.createNotification({
            userId: seller.id,
            title: `New Buyer Request: ${reqObj.productName}`,
            message: `${reqObj.buyerName} needs ${reqObj.quantityRequired} in ${reqObj.location}. Respond to send a quotation.`,
            type: 'request',
            link: 'farmer_dashboard',
            metadata: { requestId: reqObj.id }
          });
        });
    }

    return reqObj;
  }

  updateBuyerRequest(
    id: string,
    buyerId: string | undefined,
    updates: Partial<BuyerRequest>
  ): BuyerRequest | null | undefined {
    const idx = this.buyerRequests.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const existing = this.buyerRequests[idx];
    if (buyerId && existing.buyerId !== buyerId) return null;
    this.buyerRequests[idx] = {
      ...existing,
      ...updates,
      id: existing.id,
      buyerId: existing.buyerId,
      updatedAt: new Date().toISOString()
    };
    return this.buyerRequests[idx];
  }

  updateBuyerRequestStatus(
    id: string,
    status: BuyerRequestStatus,
    actorId?: string
  ): BuyerRequest | null | undefined {
    const idx = this.buyerRequests.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const existing = this.buyerRequests[idx];
    if (actorId && existing.buyerId !== actorId) return null;

    const now = new Date().toISOString();
    existing.status = status;
    existing.updatedAt = now;
    if (status === 'handled') {
      existing.handledAt = now;
      (existing.respondedFarmerIds || []).forEach(farmerId => {
        this.createNotification({
          userId: farmerId,
          title: `Buyer Request Marked Handled`,
          message: `${existing.buyerName} marked their request for "${existing.productName}" (${existing.quantityRequired}) as Handled.`,
          type: 'request',
          link: 'farmer_dashboard',
          metadata: { requestId: existing.id, status: 'handled' }
        });
      });
    } else if (status === 'open') {
      existing.handledAt = undefined;
    }

    return existing;
  }

  markBuyerRequestResponded(
    id: string,
    farmerId: string,
    farmerName?: string,
    notifyBuyer = true
  ): BuyerRequest | 'closed' | undefined {
    const reqObj = this.buyerRequests.find(r => r.id === id);
    if (!reqObj) return undefined;
    if (reqObj.status === 'handled' || reqObj.status === 'cancelled') return 'closed';

    const now = new Date().toISOString();
    const responders = new Set(reqObj.respondedFarmerIds || []);
    responders.add(farmerId);
    reqObj.respondedFarmerIds = Array.from(responders);
    reqObj.responseCount = Math.max(reqObj.responseCount || 0, reqObj.respondedFarmerIds.length);
    if (reqObj.status === 'open') {
      reqObj.status = 'in_discussion';
    }
    reqObj.updatedAt = now;

    if (notifyBuyer) {
      this.createNotification({
        userId: reqObj.buyerId,
        title: `Farmer Responded: ${reqObj.productName}`,
        message: `${farmerName || 'A local farmer'} responded to your request for ${reqObj.quantityRequired} of ${reqObj.productName}.`,
        type: 'request',
        link: 'messages',
        metadata: { requestId: reqObj.id, farmerId }
      });
    }

    return reqObj;
  }

  deleteBuyerRequest(id: string, buyerId?: string): 'deleted' | 'forbidden' | 'not_found' {
    const idx = this.buyerRequests.findIndex(r => r.id === id);
    if (idx === -1) return 'not_found';
    if (buyerId && this.buyerRequests[idx].buyerId !== buyerId) return 'forbidden';
    this.buyerRequests.splice(idx, 1);
    return 'deleted';
  }
}

export const store = new MarketplaceStore();
