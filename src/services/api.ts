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
  FilterState
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

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    return response.json();
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

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
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
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
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
    buyerId: string;
    farmerId: string;
    items: any[];
    totalAmount: number;
    deliveryMethod: 'pickup' | 'delivery';
    deliveryAddress?: string;
    pickupTimeWindow?: string;
    buyerNotes?: string;
  }): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  async updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<Order> {
    return this.request<Order>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note })
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
    orderId?: string;
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
    return this.request<Announcement[]>(`/announcements${query}`);
  }

  async createAnnouncement(announcement: Partial<Announcement>): Promise<Announcement> {
    return this.request<Announcement>('/announcements', {
      method: 'POST',
      body: JSON.stringify(announcement)
    });
  }

  async reactToAnnouncement(id: string, reaction: string): Promise<Announcement> {
    return this.request<Announcement>(`/announcements/${id}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction })
    });
  }

  async deleteAnnouncement(id: string): Promise<void> {
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

  async toggleUserStatus(id: string, status: 'active' | 'suspended' | 'pending_verification'): Promise<User> {
    return this.request<User>(`/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async getFarmerProfile(id: string): Promise<{ farmer: User; products: Product[]; reviews: Review[] }> {
    return this.request<{ farmer: User; products: Product[]; reviews: Review[] }>(`/farmers/${id}`);
  }

  // --- Analytics ---
  async getFarmerStats(farmerId: string): Promise<any> {
    return this.request<any>(`/stats/farmer/${farmerId}`);
  }

  async getAdminStats(): Promise<any> {
    return this.request<any>('/stats/admin');
  }
}

export const api = new ApiService();
