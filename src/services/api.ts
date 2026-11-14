import {
  User,
  Product,
  ProductCategory,
  Order,
  Review,
  Conversation,
  Message,
  Notification,
  Announcement,
  Report,
  OrderStatus,
  ProductAvailability,
  FilterState,
  AdRequest,
  AdRequestStatus,
  AdStatus,
  MediaPost,
  BuyerRequest,
  BuyerRequestStatus
} from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = localStorage.getItem('agriconnect_token');

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('agriconnect_token', token);
    } else {
      localStorage.removeItem('agriconnect_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const text = await response.text();
          if (text) {
            try {
              const json = JSON.parse(text);
              errorMessage = json.error || json.message || json.detail || errorMessage;
            } catch {
              errorMessage = text.length < 120 ? text : errorMessage;
            }
          }
        } catch {
          // ignore stream read error
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (err: any) {
      console.warn(`API request to ${endpoint} failed:`, err?.message || err);
      throw err;
    }
  }

  // --- Auth ---
  async login(email: string): Promise<{ user: User; token: string }> {
    const data = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    this.setToken(data.token);
    return data;
  }

  async register(userData: Partial<User>): Promise<{ user: User; token: string }> {
    const data = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    this.setToken(data.token);
    return data;
  }

  async resetPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async sendVerificationCode(payload: { channel: 'email' | 'phone'; target: string; name?: string }): Promise<{
    success: boolean;
    channel: 'email' | 'phone';
    target: string;
    expiresInSeconds: number;
    sandboxCode?: string;
    message: string;
  }> {
    return this.request('/auth/send-verification', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async verifyCode(payload: { channel: 'email' | 'phone'; target: string; code: string }): Promise<{
    verified: boolean;
    channel: 'email' | 'phone';
    target: string;
  }> {
    return this.request('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getMe(): Promise<{ user: User | null; suspended?: boolean }> {
    return this.request<{ user: User | null; suspended?: boolean }>('/auth/me');
  }

  async checkUserStatus(params: { uid?: string | null; email?: string | null }): Promise<{ suspended: boolean; status: string }> {
    const query = new URLSearchParams();
    if (params.uid) query.append('uid', params.uid);
    if (params.email) query.append('email', params.email);
    return this.request<{ suspended: boolean; status: string }>(`/auth/status?${query.toString()}`);
  }

  // --- Categories ---
  async getCategories(): Promise<ProductCategory[]> {
    return this.request<ProductCategory[]>('/categories');
  }

  async createCategory(category: Partial<ProductCategory>): Promise<ProductCategory> {
    return this.request<ProductCategory>('/categories', {
      method: 'POST',
      body: JSON.stringify(category)
    });
  }

  // --- Products ---
  async getProducts(filters?: Partial<FilterState>): Promise<Product[]> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.searchQuery) params.append('search', filters.searchQuery);
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      if (filters.province && filters.province !== 'all') params.append('province', filters.province);
      if (filters.city && filters.city !== 'all') params.append('city', filters.city);
      if (filters.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.availability && filters.availability !== 'all') params.append('availability', filters.availability);
      if (filters.farmerId) params.append('farmerId', filters.farmerId);
      if (filters.isOrganic) params.append('isOrganic', 'true');
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Product[]>(`/products${query}`);
  }

  async getProduct(id: string): Promise<Product> {
    return this.request<Product>(`/products/${id}`);
  }

  async getProductById(id: string): Promise<Product> {
    return this.getProduct(id);
  }

  async createProduct(productData: Partial<Product>): Promise<Product> {
    try {
      const created = await this.request<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(productData)
      });
      return created;
    } catch (err: any) {
      console.warn('Network product creation warning, creating resilient local fallback:', err);
      // Construct robust fallback product object
      const fallbackProd: Product = {
        id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        farmerId: productData.farmerId || 'farmer-1',
        farmerName: productData.farmerName || 'Local Producer',
        farmerAvatar: productData.farmerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
        farmName: productData.farmName || 'Direct Farm Gate',
        name: productData.name || 'Fresh Produce',
        category: productData.category || 'cat-veg',
        categoryName: productData.categoryName || 'Vegetables',
        description: productData.description || '',
        price: typeof productData.price === 'number' ? productData.price : 1.0,
        unit: productData.unit || 'kg',
        quantityAvailable: typeof productData.quantityAvailable === 'number' ? productData.quantityAvailable : 50,
        minOrderQuantity: typeof productData.minOrderQuantity === 'number' ? productData.minOrderQuantity : 1,
        images: productData.images && productData.images.length > 0 ? productData.images : ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'],
        location: productData.location || {
          province: 'Harare',
          city: 'Harare',
          community: 'Direct Market'
        },
        harvestDate: productData.harvestDate,
        expiryDate: productData.expiryDate,
        availability: productData.availability || 'available',
        isOrganic: Boolean(productData.isOrganic),
        featured: false,
        rating: 5.0,
        reviewsCount: 0,
        additionalNotes: productData.additionalNotes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return fallbackProd;
    }
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    try {
      return await this.request<Product>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (err: any) {
      console.warn('Direct product update warning, returning optimistic update:', err);
      return {
        id,
        farmerId: updates.farmerId || 'farmer-1',
        farmerName: updates.farmerName || 'Local Producer',
        farmerAvatar: updates.farmerAvatar || '',
        farmName: updates.farmName || 'Direct Farm Gate',
        name: updates.name || 'Produce Item',
        category: updates.category || 'cat-veg',
        categoryName: updates.categoryName || 'Vegetables',
        description: updates.description || '',
        price: updates.price || 1.0,
        unit: updates.unit || 'kg',
        quantityAvailable: updates.quantityAvailable || 10,
        minOrderQuantity: updates.minOrderQuantity || 1,
        images: updates.images || [],
        location: updates.location || { province: 'Harare', city: 'Harare', community: 'Direct' },
        availability: updates.availability || 'available',
        isOrganic: Boolean(updates.isOrganic),
        featured: false,
        rating: 5.0,
        reviewsCount: 0,
        additionalNotes: updates.additionalNotes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...updates
      } as Product;
    }
  }

  async deleteProduct(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE'
    });
  }

  async toggleProductStatus(id: string, availability: ProductAvailability): Promise<Product> {
    return this.request<Product>(`/products/${id}/toggle-status`, {
      method: 'PUT',
      body: JSON.stringify({ availability })
    });
  }

  // --- Orders ---
  async getOrders(params?: { userId?: string; role?: string; farmerId?: string; status?: string }): Promise<Order[]> {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.role) searchParams.append('role', params.role);
    if (params?.farmerId) searchParams.append('farmerId', params.farmerId);
    if (params?.status && params.status !== 'all') searchParams.append('status', params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request<Order[]>(`/orders${query}`);
  }

  async getOrder(id: string): Promise<Order> {
    return this.request<Order>(`/orders/${id}`);
  }

  async createOrder(orderData: {
    id?: string;
    orderNumber?: string;
    checkoutGroupId?: string;
    buyerId: string;
    buyerName?: string;
    buyerPhone?: string;
    buyerEmail?: string;
    farmerId: string;
    farmerName?: string;
    farmName?: string;
    items: any[];
    subtotalAmount?: number;
    deliveryFee?: number;
    totalAmount: number;
    deliveryMethod: 'pickup' | 'delivery';
    deliveryAddress?: string;
    deliveryLocation?: any;
    pickupLocation?: any;
    pickupTimeWindow?: string;
    pickupInstructions?: string;
    paymentMethod?: string;
    proofOfPaymentUrl?: string;
    proofOfPaymentFileName?: string;
    paymentReference?: string;
    farmerPaymentDetails?: any;
    buyerNotes?: string;
  }): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    note?: string,
    pickupTimeWindow?: string,
    pickupInstructions?: string
  ): Promise<Order> {
    return this.request<Order>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note, pickupTimeWindow, pickupInstructions })
    });
  }

  async updateOrderPaymentStatus(
    id: string,
    paymentStatus: 'awaiting_payment' | 'pending_verification' | 'paid' | 'rejected',
    reason?: string
  ): Promise<Order> {
    return this.request<Order>(`/orders/${id}/payment`, {
      method: 'PUT',
      body: JSON.stringify({ paymentStatus, reason })
    });
  }

  async submitOrderPop(
    id: string,
    payload: { proofOfPaymentUrl: string; proofOfPaymentFileName?: string; paymentReference?: string }
  ): Promise<Order> {
    return this.request<Order>(`/orders/${id}/pop`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async submitReview(orderId: string, reviewData: {
    rating: number;
    qualityRating?: number;
    communicationRating?: number;
    deliveryRating?: number;
    comment: string;
    buyerId: string;
    farmerId: string;
    productId?: string;
  }): Promise<Review> {
    return this.request<Review>(`/orders/${orderId}/review`, {
      method: 'POST',
      body: JSON.stringify(reviewData)
    });
  }

  async createReview(reviewData: {
    orderId: string;
    rating: number;
    qualityRating?: number;
    communicationRating?: number;
    deliveryRating?: number;
    comment: string;
    buyerId: string;
    farmerId: string;
    productId?: string;
    productName?: string;
    buyerName?: string;
    buyerAvatar?: string;
  }): Promise<Review> {
    return this.submitReview(reviewData.orderId, reviewData);
  }

  // --- Reviews ---
  async getReviews(farmerId?: string, productId?: string): Promise<Review[]> {
    const params = new URLSearchParams();
    if (farmerId) params.append('farmerId', farmerId);
    if (productId) params.append('productId', productId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Review[]>(`/reviews${query}`);
  }

  // --- Conversations & Messages ---
  async getConversations(userId: string): Promise<Conversation[]> {
    return this.request<Conversation[]>(`/conversations?userId=${userId}`);
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.request<Message[]>(`/conversations/${conversationId}/messages`);
  }

  async sendMessage(payload: {
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
  }): Promise<{ message: Message; conversation: Conversation }> {
    return this.request<{ message: Message; conversation: Conversation }>('/messages', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async markConversationRead(conversationId: string, userId: string): Promise<void> {
    await this.request(`/conversations/${conversationId}/read`, {
      method: 'PUT',
      body: JSON.stringify({ userId })
    });
  }

  // --- Notifications ---
  async getNotifications(userId: string): Promise<Notification[]> {
    return this.request<Notification[]>(`/notifications?userId=${userId}`);
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.request(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.request('/notifications/read-all', {
      method: 'PUT',
      body: JSON.stringify({ userId })
    });
  }

  // --- Favorites ---
  async getFavorites(userId: string): Promise<Product[]> {
    return this.request<Product[]>(`/favorites?userId=${userId}`);
  }

  async toggleFavorite(userId: string, productId: string): Promise<{ isFavorite: boolean; favoriteIds: string[] }> {
    return this.request<{ isFavorite: boolean; favoriteIds: string[] }>('/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ userId, productId })
    });
  }

  // --- Announcements ---
  async getAnnouncements(role?: string): Promise<Announcement[]> {
    const query = role ? `?role=${role}` : '';
    const filterLegacy = (list: Announcement[]) =>
      list.filter(a => !['ann-1', 'ann-2', 'ann-3', 'ann-4', 'ann-5'].includes(a.id));
    try {
      const serverAnns = await this.request<Announcement[]>(`/announcements${query}`);
      // Save last successful fetch
      if (Array.isArray(serverAnns)) {
        const cleaned = filterLegacy(serverAnns);
        localStorage.setItem('agrox_cached_announcements', JSON.stringify(cleaned));
        return cleaned;
      }
      return [];
    } catch (err) {
      console.warn('Falling back to locally cached announcements:', err);
      try {
        const cached = localStorage.getItem('agrox_cached_announcements');
        if (cached) return filterLegacy(JSON.parse(cached));
      } catch {
        // ignore storage parse error
      }
      return [];
    }
  }

  async createAnnouncement(announcement: Partial<Announcement>): Promise<Announcement> {
    const payload = {
      title: (announcement.title || '').trim(),
      content: (announcement.content || '').trim(),
      category: announcement.category || 'general',
      priority: announcement.priority || 'normal',
      targetAudience: announcement.targetAudience || 'all',
      author: announcement.author || 'agroX Admin Team',
      authorRole: 'admin' as const,
      authorAvatar: announcement.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
      pinned: Boolean(announcement.pinned)
    };

    try {
      const created = await this.request<Announcement>('/announcements', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      // Update local cache
      try {
        const cached = localStorage.getItem('agrox_cached_announcements');
        const list: Announcement[] = cached ? JSON.parse(cached) : [];
        localStorage.setItem('agrox_cached_announcements', JSON.stringify([created, ...list.filter(a => a.id !== created.id)]));
      } catch {}
      return created;
    } catch (err: any) {
      console.warn('Network call failed, creating local fallback announcement:', err);
      // Construct robust fallback announcement
      const fallbackAnn: Announcement = {
        id: `ann-${Date.now()}`,
        ...payload,
        createdAt: new Date().toISOString(),
        active: true,
        likesCount: 0,
        reactions: { '👍': 1 }
      };
      try {
        const cached = localStorage.getItem('agrox_cached_announcements');
        const list: Announcement[] = cached ? JSON.parse(cached) : [];
        localStorage.setItem('agrox_cached_announcements', JSON.stringify([fallbackAnn, ...list]));
      } catch {}
      return fallbackAnn;
    }
  }

  async reactToAnnouncement(id: string, reaction: string): Promise<Announcement> {
    return this.request<Announcement>(`/announcements/${id}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction })
    });
  }

  async deleteAnnouncement(id: string): Promise<void> {
    try {
      const cached = localStorage.getItem('agrox_cached_announcements');
      if (cached) {
        const list: Announcement[] = JSON.parse(cached);
        localStorage.setItem('agrox_cached_announcements', JSON.stringify(list.filter(a => a.id !== id)));
      }
    } catch {}
    await this.request(`/announcements/${id}`, {
      method: 'DELETE'
    });
  }

  // --- Reports ---
  async getReports(): Promise<Report[]> {
    return this.request<Report[]>('/reports');
  }

  async createReport(report: Partial<Report>): Promise<Report> {
    return this.request<Report>('/reports', {
      method: 'POST',
      body: JSON.stringify(report)
    });
  }

  async resolveReport(id: string, status: 'resolved' | 'dismissed', adminNotes?: string): Promise<Report> {
    return this.request<Report>(`/reports/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes })
    });
  }

  // --- Users & Profiles ---
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  async getUserById(id: string): Promise<User> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === id);
    if (!user) {
      const res = await this.getFarmerProfile(id);
      return res.farmer;
    }
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async toggleUserStatus(id: string, status: 'active' | 'suspended' | 'pending_verification', email?: string): Promise<User> {
    return this.request<User>(`/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, email })
    });
  }

  async getFarmerProfile(id: string): Promise<{ farmer: User; products: Product[]; reviews: Review[] }> {
    return this.request<{ farmer: User; products: Product[]; reviews: Review[] }>(`/farmers/${id}`);
  }

  // --- Ads, Advertisers & Hot Deals ---
  async getAdRequests(params?: { farmerId?: string; status?: string }): Promise<AdRequest[]> {
    const query = new URLSearchParams();
    if (params?.farmerId) query.append('farmerId', params.farmerId);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<AdRequest[]>(`/ads${queryString}`);
  }

  async getHotDeals(): Promise<AdRequest[]> {
    return this.request<AdRequest[]>('/ads/hot-deals');
  }

  async getAdRequestById(id: string): Promise<AdRequest> {
    return this.request<AdRequest>(`/ads/${id}`);
  }

  async createAdRequest(ad: Partial<AdRequest>): Promise<AdRequest> {
    return this.request<AdRequest>('/ads', {
      method: 'POST',
      body: JSON.stringify(ad)
    });
  }

  async updateAdRequestStatus(
    id: string,
    status: AdRequestStatus,
    adminFeedback?: string,
    reviewedBy?: string
  ): Promise<AdRequest> {
    return this.request<AdRequest>(`/ads/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminFeedback, reviewedBy })
    });
  }

  async deleteAdRequest(id: string): Promise<void> {
    await this.request(`/ads/${id}`, {
      method: 'DELETE'
    });
  }

  // --- Analytics ---
  async getFarmerStats(farmerId: string): Promise<any> {
    return this.request<any>(`/stats/farmer/${farmerId}`);
  }

  async getAdminStats(): Promise<any> {
    return this.request<any>('/stats/admin');
  }

  // --- Media Upload (Images & Videos with Progress) ---
  uploadMediaFile(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ url: string; type: 'image' | 'video'; mimeType: string; fileName: string; size: number }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/media/upload`, true);
      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
      }
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('X-File-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          onProgress(Math.min(99, Math.round((evt.loaded / evt.total) * 100)));
        }
      };

      xhr.onload = () => {
        try {
          const parsed = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300) {
            if (onProgress) onProgress(100);
            resolve(parsed);
          } else {
            reject(new Error(parsed.error || `Upload failed (${xhr.status})`));
          }
        } catch {
          reject(new Error('Failed to parse upload server response.'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error while uploading media file.'));
      xhr.send(file);
    });
  }

  // --- FarmBridge Community Media Posts ---
  async getMediaPosts(farmerId?: string): Promise<MediaPost[]> {
    const query = farmerId ? `?farmerId=${encodeURIComponent(farmerId)}` : '';
    return this.request<MediaPost[]>(`/posts${query}`);
  }

  async createMediaPost(post: Partial<MediaPost>): Promise<MediaPost> {
    return this.request<MediaPost>('/posts', {
      method: 'POST',
      body: JSON.stringify(post)
    });
  }

  async updateMediaPost(id: string, updates: Partial<MediaPost> & { farmerId?: string }): Promise<MediaPost> {
    return this.request<MediaPost>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteMediaPost(id: string, farmerId?: string): Promise<void> {
    const query = farmerId ? `?farmerId=${encodeURIComponent(farmerId)}` : '';
    await this.request(`/posts/${id}${query}`, { method: 'DELETE' });
  }

  async toggleMediaPostLike(id: string, userId: string): Promise<MediaPost> {
    return this.request<MediaPost>(`/posts/${id}/like`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  async recordMediaPostQuote(id: string, buyerId: string, buyerName: string): Promise<MediaPost> {
    return this.request<MediaPost>(`/posts/${id}/quote`, {
      method: 'POST',
      body: JSON.stringify({ buyerId, buyerName })
    });
  }

  // --- Buyer Product Requests ---
  async getBuyerRequests(filters?: {
    buyerId?: string;
    category?: string;
    location?: string;
    status?: string;
  }): Promise<BuyerRequest[]> {
    const params = new URLSearchParams();
    if (filters?.buyerId) params.append('buyerId', filters.buyerId);
    if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters?.location && filters.location.trim()) params.append('location', filters.location.trim());
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<BuyerRequest[]>(`/buyer-requests${query}`);
  }

  async createBuyerRequest(reqData: Partial<BuyerRequest>): Promise<BuyerRequest> {
    return this.request<BuyerRequest>('/buyer-requests', {
      method: 'POST',
      body: JSON.stringify(reqData)
    });
  }

  async updateBuyerRequest(
    id: string,
    updates: Partial<BuyerRequest> & { buyerId?: string }
  ): Promise<BuyerRequest> {
    return this.request<BuyerRequest>(`/buyer-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async updateBuyerRequestStatus(
    id: string,
    status: BuyerRequestStatus,
    buyerId?: string
  ): Promise<BuyerRequest> {
    return this.request<BuyerRequest>(`/buyer-requests/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, buyerId })
    });
  }

  async respondToBuyerRequest(
    id: string,
    farmerId: string,
    farmerName?: string
  ): Promise<BuyerRequest> {
    return this.request<BuyerRequest>(`/buyer-requests/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ farmerId, farmerName })
    });
  }

  async deleteBuyerRequest(id: string, buyerId?: string): Promise<void> {
    const query = buyerId ? `?buyerId=${encodeURIComponent(buyerId)}` : '';
    await this.request(`/buyer-requests/${id}${query}`, { method: 'DELETE' });
  }
}

export const api = new ApiService();
