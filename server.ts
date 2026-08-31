import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { store } from './server/store';
import { User, Product, Order, Review, Announcement, Report, ProductCategory } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // --- API Routes ---

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- Authentication Endpoints ---
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = store.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email address.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended by the platform administrator.' });
    }

    return res.json({
      user,
      token: `token_${user.id}_${Date.now()}`
    });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { name, email, phone, role, location, farmerProfile, buyerProfile, avatar } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required' });
    }

    const existing = store.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const id = `${role}-${Date.now()}`;
    const defaultAvatar = role === 'farmer'
      ? 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';

    const newUser: User = {
      id,
      name,
      email,
      phone: phone || '',
      role,
      avatar: avatar || defaultAvatar,
      location: location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
      status: 'active',
      createdAt: new Date().toISOString(),
      farmerProfile: role === 'farmer' ? (farmerProfile || {
        farmName: `${name}'s Farm`,
        farmDescription: 'Local agricultural producer offering fresh, high quality farm goods.',
        farmingPractices: ['traditional'],
        rating: 5.0,
        totalReviews: 0,
        verified: false,
        contactPreferences: ['phone', 'chat']
      }) : undefined,
      buyerProfile: role === 'buyer' ? (buyerProfile || {
        favoriteCategories: [],
        totalOrdersPlaced: 0
      }) : undefined
    };

    store.createUser(newUser);

    return res.status(201).json({
      user: newUser,
      token: `token_${newUser.id}_${Date.now()}`
    });
  });

  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    const { email } = req.body;
    const user = store.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email.' });
    }
    // Simulation
    return res.json({ message: `Password reset instructions sent to ${email}. Check your inbox.` });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // Default to buyer-1 for instant demo comfort if no token
      return res.json({ user: store.getUserById('buyer-1') });
    }
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('_');
    const userId = parts[1] || 'buyer-1';
    const user = store.getUserById(userId) || store.getUserById('buyer-1');
    return res.json({ user });
  });

  // --- Categories ---
  app.get('/api/categories', (_req: Request, res: Response) => {
    res.json(store.getCategories());
  });

  app.post('/api/categories', (req: Request, res: Response) => {
    const { name, icon, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newCategory: ProductCategory = {
      id: `cat-${Date.now()}`,
      name,
      slug,
      icon: icon || 'Package',
      description: description || ''
    };
    store.addCategory(newCategory);
    res.status(201).json(newCategory);
  });

  // --- Products ---
  app.get('/api/products', (req: Request, res: Response) => {
    const {
      search,
      category,
      province,
      city,
      minPrice,
      maxPrice,
      availability,
      farmerId,
      isOrganic,
      sortBy
    } = req.query;

    const products = store.getProducts({
      search: search as string,
      category: category as string,
      province: province as string,
      city: city as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      availability: availability as string,
      farmerId: farmerId as string,
      isOrganic: isOrganic === 'true',
      sortBy: sortBy as string
    });

    res.json(products);
  });

  app.get('/api/products/:id', (req: Request, res: Response) => {
    const product = store.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  });

  app.post('/api/products', (req: Request, res: Response) => {
    const {
      farmerId,
      name,
      category,
      categoryName,
      description,
      price,
      unit,
      quantityAvailable,
      minOrderQuantity,
      images,
      location,
      harvestDate,
      expiryDate,
      isOrganic,
      additionalNotes
    } = req.body;

    if (!name || !price || !unit || quantityAvailable === undefined || !farmerId) {
      return res.status(400).json({ error: 'Missing required product listing fields (name, price, unit, quantity, farmerId)' });
    }

    const farmer = store.getUserById(farmerId);
    if (!farmer) {
      return res.status(404).json({ error: 'Farmer profile not found' });
    }

    const defaultImages = [
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'
    ];

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      farmerId,
      farmerName: farmer.name,
      farmerAvatar: farmer.avatar,
      farmName: farmer.farmerProfile?.farmName || `${farmer.name}'s Farm`,
      name,
      category: category || 'cat-veg',
      categoryName: categoryName || 'Vegetables',
      description: description || '',
      price: parseFloat(price),
      unit,
      quantityAvailable: parseInt(quantityAvailable, 10),
      minOrderQuantity: parseInt(minOrderQuantity || '1', 10),
      images: (images && images.length > 0) ? images : defaultImages,
      location: location || {
        province: farmer.location.province,
        city: farmer.location.city,
        community: farmer.location.community
      },
      harvestDate: harvestDate || undefined,
      expiryDate: expiryDate || undefined,
      availability: parseInt(quantityAvailable, 10) > 0 ? 'available' : 'out_of_stock',
      isOrganic: Boolean(isOrganic),
      featured: false,
      rating: 5.0,
      reviewsCount: 0,
      additionalNotes: additionalNotes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.createProduct(newProduct);
    res.status(201).json(newProduct);
  });

  app.put('/api/products/:id', (req: Request, res: Response) => {
    const updated = store.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(updated);
  });

  app.delete('/api/products/:id', (req: Request, res: Response) => {
    const success = store.deleteProduct(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Product not found or already removed' });
    }
    res.json({ message: 'Product deleted successfully' });
  });

  app.put('/api/products/:id/toggle-status', (req: Request, res: Response) => {
    const { availability } = req.body;
    const updated = store.updateProductAvailability(req.params.id, availability);
    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(updated);
  });

  // --- Orders ---
  app.get('/api/orders', (req: Request, res: Response) => {
    const { userId, role, farmerId, status } = req.query;
    const orders = store.getOrders({
      userId: userId as string,
      role: role as string,
      farmerId: farmerId as string,
      status: status as string
    });
    res.json(orders);
  });

  app.get('/api/orders/:id', (req: Request, res: Response) => {
    const order = store.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  });

  app.post('/api/orders', (req: Request, res: Response) => {
    const {
      buyerId,
      farmerId,
      items,
      totalAmount,
      deliveryMethod,
      deliveryAddress,
      pickupTimeWindow,
      buyerNotes
    } = req.body;

    if (!buyerId || !farmerId || !items || !items.length) {
      return res.status(400).json({ error: 'Buyer, Farmer and Order Items are required' });
    }

    const buyer = store.getUserById(buyerId);
    const farmer = store.getUserById(farmerId);

    if (!buyer || !farmer) {
      return res.status(404).json({ error: 'Buyer or Farmer account not found' });
    }

    // Verify stock availability
    for (const item of items) {
      const prod = store.getProductById(item.productId);
      if (!prod) {
        return res.status(400).json({ error: `Product ${item.productName} is no longer available` });
      }
      if (prod.quantityAvailable < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${prod.name}. Available: ${prod.quantityAvailable} ${prod.unit}, Requested: ${item.quantity}`
        });
      }
    }

    const newOrder = store.createOrder({
      buyerId,
      buyerName: buyer.name,
      buyerPhone: buyer.phone,
      buyerEmail: buyer.email,
      farmerId,
      farmerName: farmer.name,
      farmName: farmer.farmerProfile?.farmName || `${farmer.name}'s Farm`,
      items,
      totalAmount: parseFloat(totalAmount),
      status: 'pending',
      deliveryMethod,
      deliveryAddress: deliveryAddress || buyer.location?.address,
      pickupTimeWindow,
      buyerNotes
    });

    res.status(201).json(newOrder);
  });

  app.put('/api/orders/:id/status', (req: Request, res: Response) => {
    const { status, note } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const order = store.updateOrderStatus(req.params.id, status, note);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json(order);
  });

  // --- Reviews ---
  app.get('/api/reviews', (req: Request, res: Response) => {
    const { farmerId, productId } = req.query;
    res.json(store.getReviews(farmerId as string, productId as string));
  });

  app.post('/api/orders/:id/review', (req: Request, res: Response) => {
    const { rating, qualityRating, communicationRating, deliveryRating, comment, buyerId, farmerId, productId } = req.body;

    if (!rating || !comment || !buyerId || !farmerId) {
      return res.status(400).json({ error: 'Rating, comment, buyerId, and farmerId are required' });
    }

    const buyer = store.getUserById(buyerId);

    const review = store.createReview({
      orderId: req.params.id,
      productId,
      farmerId,
      buyerId,
      buyerName: buyer?.name || 'Verified Buyer',
      buyerAvatar: buyer?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
      rating: parseInt(rating, 10),
      qualityRating: qualityRating ? parseInt(qualityRating, 10) : undefined,
      communicationRating: communicationRating ? parseInt(communicationRating, 10) : undefined,
      deliveryRating: deliveryRating ? parseInt(deliveryRating, 10) : undefined,
      comment
    });

    res.status(201).json(review);
  });

  // --- Conversations & Messages ---
  app.get('/api/conversations', (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    res.json(store.getConversationsForUser(userId));
  });

  app.get('/api/conversations/:id/messages', (req: Request, res: Response) => {
    res.json(store.getMessages(req.params.id));
  });

  app.post('/api/messages', (req: Request, res: Response) => {
    const { conversationId, senderId, recipientId, text, productId, productSnippet, orderId } = req.body;
    if (!senderId || !recipientId || !text) {
      return res.status(400).json({ error: 'Sender, recipient and message text are required' });
    }

    const result = store.sendMessage({
      conversationId,
      senderId,
      recipientId,
      text,
      productId,
      productSnippet,
      orderId
    });

    res.status(201).json(result);
  });

  app.put('/api/conversations/:id/read', (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    store.markConversationRead(req.params.id, userId);
    res.json({ success: true });
  });

  // --- Notifications ---
  app.get('/api/notifications', (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    res.json(store.getNotifications(userId));
  });

  app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
    store.markNotificationRead(req.params.id);
    res.json({ success: true });
  });

  app.put('/api/notifications/read-all', (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    store.markAllNotificationsRead(userId);
    res.json({ success: true });
  });

  // --- Favorites ---
  app.get('/api/favorites', (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    res.json(store.getFavorites(userId));
  });

  app.post('/api/favorites/toggle', (req: Request, res: Response) => {
    const { userId, productId } = req.body;
    if (!userId || !productId) return res.status(400).json({ error: 'userId and productId required' });
    res.json(store.toggleFavorite(userId, productId));
  });

  // --- Announcements ---
  app.get('/api/announcements', (req: Request, res: Response) => {
    const role = req.query.role as string;
    res.json(store.getAnnouncements(role));
  });

  app.post('/api/announcements', (req: Request, res: Response) => {
    const { title, content, priority, targetAudience, author, authorRole, authorAvatar, category, pinned } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

    const newAnn = store.createAnnouncement({
      title,
      content,
      priority: priority || 'normal',
      targetAudience: targetAudience || 'all',
      author: author || 'agroX Admin Team',
      authorRole: authorRole || 'admin',
      authorAvatar: authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
      category: category || 'general',
      pinned: Boolean(pinned)
    });

    res.status(201).json(newAnn);
  });

  app.post('/api/announcements/:id/react', (req: Request, res: Response) => {
    const { reaction } = req.body;
    const updated = store.reactToAnnouncement(req.params.id, reaction || '👍');
    if (!updated) return res.status(404).json({ error: 'Announcement not found' });
    res.json(updated);
  });

  app.delete('/api/announcements/:id', (req: Request, res: Response) => {
    const deleted = store.deleteAnnouncement(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ success: true });
  });

  // --- Reports ---
  app.get('/api/reports', (_req: Request, res: Response) => {
    res.json(store.getReports());
  });

  app.post('/api/reports', (req: Request, res: Response) => {
    const { reporterId, reportedItemId, itemType, itemTitle, reason, description } = req.body;
    if (!reporterId || !reportedItemId || !reason) {
      return res.status(400).json({ error: 'Missing report parameters' });
    }

    const reporter = store.getUserById(reporterId);
    const newReport = store.createReport({
      reporterId,
      reporterName: reporter?.name || 'Anonymous User',
      reportedItemId,
      itemType: itemType || 'product',
      itemTitle: itemTitle || 'Item',
      reason,
      description: description || ''
    });

    res.status(201).json(newReport);
  });

  app.put('/api/reports/:id/resolve', (req: Request, res: Response) => {
    const { status, adminNotes } = req.body;
    const resolved = store.resolveReport(req.params.id, status, adminNotes);
    if (!resolved) return res.status(404).json({ error: 'Report not found' });
    res.json(resolved);
  });

  // --- Users & Profiles (Admin / Farmer) ---
  app.get('/api/users', (_req: Request, res: Response) => {
    res.json(store.getUsers());
  });

  app.get('/api/farmers/:id', (req: Request, res: Response) => {
    const farmer = store.getUserById(req.params.id);
    if (!farmer || farmer.role !== 'farmer') {
      return res.status(404).json({ error: 'Farmer not found' });
    }
    const products = store.getProducts({ farmerId: farmer.id });
    const reviews = store.getReviews(farmer.id);
    res.json({
      farmer,
      products,
      reviews
    });
  });

  app.put('/api/users/:id', (req: Request, res: Response) => {
    const updated = store.updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  });

  app.put('/api/users/:id/status', (req: Request, res: Response) => {
    const { status } = req.body;
    const updated = store.toggleUserStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  });

  // --- Statistics ---
  app.get('/api/stats/farmer/:id', (req: Request, res: Response) => {
    res.json(store.getFarmerStats(req.params.id));
  });

  app.get('/api/stats/admin', (_req: Request, res: Response) => {
    res.json(store.getAdminStats());
  });

  // --- Vite Middleware & SPA Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AgriConnect Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AgriConnect server:', err);
  process.exit(1);
});
