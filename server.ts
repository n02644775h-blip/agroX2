import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { store } from './server/store';
import { User, Product, Order, Review, Announcement, Report, ProductCategory } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const key = parts.shift()?.trim();
      if (key) {
        list[key] = decodeURIComponent(parts.join('='));
      }
    });
  }
  return list;
}

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

    const token = `token_${user.id}_${Date.now()}`;
    res.setHeader('Set-Cookie', [
      `agrox_uid=${user.id}; Path=/; SameSite=None; Secure; Max-Age=31536000`,
      `agriconnect_token=${token}; Path=/; SameSite=None; Secure; Max-Age=31536000`
    ]);

    return res.json({
      user,
      token
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

    const token = `token_${newUser.id}_${Date.now()}`;
    res.setHeader('Set-Cookie', [
      `agrox_uid=${newUser.id}; Path=/; SameSite=None; Secure; Max-Age=31536000`,
      `agriconnect_token=${token}; Path=/; SameSite=None; Secure; Max-Age=31536000`
    ]);

    return res.status(201).json({
      user: newUser,
      token
    });
  });

  app.post('/api/auth/session', (req: Request, res: Response) => {
    const { userId, user, token } = req.body || {};
    if (userId) {
      if (user && !store.getUserById(userId)) {
        store.createUser(user);
      }
      const sessionToken = token || `token_${userId}_${Date.now()}`;
      res.setHeader('Set-Cookie', [
        `agrox_uid=${userId}; Path=/; SameSite=None; Secure; Max-Age=31536000`,
        `agriconnect_token=${sessionToken}; Path=/; SameSite=None; Secure; Max-Age=31536000`
      ]);
      return res.json({ success: true, userId });
    }
    return res.status(400).json({ error: 'userId required' });
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    res.setHeader('Set-Cookie', [
      `agrox_uid=; Path=/; SameSite=None; Secure; Max-Age=0`,
      `agriconnect_token=; Path=/; SameSite=None; Secure; Max-Age=0`
    ]);
    return res.json({ success: true });
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
    const cookies = parseCookies(req);
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim();
      const parts = token.split('_');
      userId = parts[1] || token;
    } else if (cookies.agrox_uid) {
      userId = cookies.agrox_uid;
    } else if (cookies.agriconnect_token) {
      const parts = cookies.agriconnect_token.split('_');
      userId = parts[1] || cookies.agriconnect_token;
    }

    if (userId) {
      const user = store.getUserById(userId);
      if (user) {
        return res.json({ user });
      }
    }

    return res.json({ user: null });
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
    try {
      const {
        farmerId,
        farmerName,
        farmerAvatar,
        farmName,
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
        availability,
        additionalNotes
      } = req.body || {};

      if (!name || price === undefined || price === null || !unit) {
        return res.status(400).json({ error: 'Missing required produce listing fields (name, price, unit)' });
      }

      const numPrice = typeof price === 'number' ? price : parseFloat(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        return res.status(400).json({ error: 'Please provide a valid price greater than 0.' });
      }

      const numQty = quantityAvailable !== undefined ? (typeof quantityAvailable === 'number' ? quantityAvailable : parseFloat(quantityAvailable)) : 50;
      const numMin = minOrderQuantity !== undefined ? (typeof minOrderQuantity === 'number' ? minOrderQuantity : parseFloat(minOrderQuantity)) : 1;

      // Check if farmer exists in store; if not, use provided metadata from request safely
      const existingFarmer = farmerId ? store.getUserById(farmerId) : undefined;
      const finalFarmerId = farmerId || existingFarmer?.id || 'farmer-1';
      const finalFarmerName = (farmerName || existingFarmer?.name || 'Local Producer').toString().trim();
      const finalFarmerAvatar = farmerAvatar || existingFarmer?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400';
      const finalFarmName = (farmName || existingFarmer?.farmerProfile?.farmName || `${finalFarmerName}'s Farm`).toString().trim();

      const finalLocation = location || (existingFarmer?.location ? {
        province: existingFarmer.location?.province || 'Harare',
        city: existingFarmer.location?.city || 'Harare',
        community: existingFarmer.location?.community || 'Direct Market',
        address: existingFarmer.farmerProfile?.address || 'Direct Farm Gate'
      } : {
        province: 'Harare',
        city: 'Harare',
        community: 'Direct Market',
        address: 'Direct Farm Gate'
      });

      const defaultImages = [
        'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'
      ];

      const newProduct: Product = {
        id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        farmerId: finalFarmerId,
        farmerName: finalFarmerName,
        farmerAvatar: finalFarmerAvatar,
        farmName: finalFarmName,
        name: name.toString().trim(),
        category: category || 'cat-veg',
        categoryName: categoryName || 'Vegetables',
        description: description ? description.toString().trim() : `${name} freshly harvested from ${finalFarmName}.`,
        price: numPrice,
        unit: (unit || 'kg').toString().trim(),
        quantityAvailable: isNaN(numQty) ? 50 : Math.max(0, numQty),
        minOrderQuantity: isNaN(numMin) ? 1 : Math.max(1, numMin),
        images: (Array.isArray(images) && images.length > 0 && images[0]) ? images : defaultImages,
        location: finalLocation,
        harvestDate: harvestDate || undefined,
        expiryDate: expiryDate || undefined,
        availability: availability || (numQty <= 0 ? 'out_of_stock' : numQty <= 10 ? 'low_stock' : 'available'),
        isOrganic: Boolean(isOrganic),
        featured: false,
        rating: 5.0,
        reviewsCount: 0,
        additionalNotes: additionalNotes ? additionalNotes.toString().trim() : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      store.createProduct(newProduct);
      return res.status(201).json(newProduct);
    } catch (err: any) {
      console.error('Error creating product in /api/products:', err);
      return res.status(500).json({ error: err?.message || 'Server error creating produce listing' });
    }
  });

  app.put('/api/products/:id', (req: Request, res: Response) => {
    try {
      const updated = store.updateProduct(req.params.id, req.body);
      if (!updated) {
        // Safe auto-upsert if store was cleared or reloaded
        const fallbackProd: Product = {
          id: req.params.id,
          farmerId: req.body.farmerId || 'farmer-1',
          farmerName: req.body.farmerName || 'Local Producer',
          farmerAvatar: req.body.farmerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
          farmName: req.body.farmName || 'Direct Farm Gate',
          name: req.body.name || 'Produce Item',
          category: req.body.category || 'cat-veg',
          categoryName: req.body.categoryName || 'Vegetables',
          description: req.body.description || '',
          price: parseFloat(req.body.price) || 1.0,
          unit: req.body.unit || 'kg',
          quantityAvailable: parseFloat(req.body.quantityAvailable) || 10,
          minOrderQuantity: parseFloat(req.body.minOrderQuantity) || 1,
          images: req.body.images || ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'],
          location: req.body.location || { province: 'Harare', city: 'Harare', community: 'Direct' },
          availability: req.body.availability || 'available',
          isOrganic: Boolean(req.body.isOrganic),
          featured: false,
          rating: 5.0,
          reviewsCount: 0,
          additionalNotes: req.body.additionalNotes || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...req.body
        };
        store.createProduct(fallbackProd);
        return res.json(fallbackProd);
      }
      return res.json(updated);
    } catch (err: any) {
      console.error('Error updating product:', err);
      return res.status(500).json({ error: err?.message || 'Failed to update produce listing' });
    }
  });

  app.delete('/api/products/:id', (req: Request, res: Response) => {
    try {
      const success = store.deleteProduct(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Product not found or already removed' });
      }
      return res.json({ message: 'Product deleted successfully' });
    } catch (err: any) {
      console.error('Error deleting product:', err);
      return res.status(500).json({ error: 'Failed to delete produce listing' });
    }
  });

  app.put('/api/products/:id/toggle-status', (req: Request, res: Response) => {
    try {
      const { availability } = req.body || {};
      const updated = store.updateProductAvailability(req.params.id, availability || 'available');
      if (!updated) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.json(updated);
    } catch (err: any) {
      console.error('Error toggling product status:', err);
      return res.status(500).json({ error: 'Failed to update availability status' });
    }
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
    try {
      const role = req.query.role as string;
      const data = store.getAnnouncements(role);
      res.json(data);
    } catch (err: any) {
      console.error('Error fetching announcements:', err);
      res.status(500).json({ error: 'Failed to retrieve announcements' });
    }
  });

  app.post('/api/announcements', (req: Request, res: Response) => {
    try {
      const { title, content, message, text, priority, targetAudience, author, authorRole, authorAvatar, category, pinned } = req.body || {};
      const finalTitle = (title || '').toString().trim();
      const finalContent = (content || message || text || '').toString().trim();

      if (!finalTitle || !finalContent) {
        return res.status(400).json({ error: 'Both Title and Message content are required to publish an announcement.' });
      }

      const newAnn = store.createAnnouncement({
        title: finalTitle,
        content: finalContent,
        priority: priority || 'normal',
        targetAudience: targetAudience || 'all',
        author: author || 'agroX Admin Team',
        authorRole: authorRole || 'admin',
        authorAvatar: authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
        category: category || 'general',
        pinned: Boolean(pinned)
      });

      return res.status(201).json(newAnn);
    } catch (err: any) {
      console.error('Error creating announcement on server:', err);
      return res.status(500).json({ error: err?.message || 'Server error while publishing announcement.' });
    }
  });

  app.post('/api/announcements/:id/react', (req: Request, res: Response) => {
    try {
      const { reaction } = req.body || {};
      const updated = store.reactToAnnouncement(req.params.id, reaction || '👍');
      if (!updated) return res.status(404).json({ error: 'Announcement not found' });
      res.json(updated);
    } catch (err: any) {
      console.error('Error reacting to announcement:', err);
      res.status(500).json({ error: 'Failed to record reaction' });
    }
  });

  app.delete('/api/announcements/:id', (req: Request, res: Response) => {
    try {
      const deleted = store.deleteAnnouncement(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Announcement not found' });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Error deleting announcement:', err);
      res.status(500).json({ error: 'Failed to remove announcement' });
    }
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
    let updated = store.updateUser(req.params.id, req.body);
    if (!updated) {
      const fallbackUser: User = {
        id: req.params.id,
        name: req.body.name || 'Producer User',
        email: req.body.email || `${req.params.id}@agrox.org`,
        role: req.body.role || (req.params.id.startsWith('farmer') ? 'farmer' : 'buyer'),
        phone: req.body.phone || '',
        avatar: req.body.avatar || '',
        location: req.body.location || { country: 'Zimbabwe', province: 'Harare', city: 'Harare' },
        status: 'active',
        createdAt: new Date().toISOString(),
        ...req.body
      };
      store.createUser(fallbackUser);
      updated = fallbackUser;
    }
    res.json(updated);
  });

  app.put('/api/users/:id/status', (req: Request, res: Response) => {
    const { status } = req.body;
    const updated = store.toggleUserStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  });

  // --- Advertisements, POP & Hot Deals ---
  app.get('/api/ads', (req: Request, res: Response) => {
    const farmerId = req.query.farmerId as string | undefined;
    const status = req.query.status as string | undefined;
    res.json(store.getAdRequests(farmerId, status));
  });

  app.get('/api/ads/hot-deals', (_req: Request, res: Response) => {
    res.json(store.getActiveHotDeals());
  });

  app.get('/api/ads/:id', (req: Request, res: Response) => {
    const ad = store.getAdRequestById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Ad request not found' });
    res.json(ad);
  });

  app.post('/api/ads', (req: Request, res: Response) => {
    const {
      farmerId,
      farmerName,
      farmerAvatar,
      farmName,
      farmerEmail,
      farmerPhone,
      productId,
      productName,
      productImage,
      productPrice,
      productUnit,
      category,
      categoryName,
      dealHeadline,
      dealDescription,
      discountPercentage,
      specialPrice,
      days,
      proofOfPaymentUrl,
      proofOfPaymentFileName,
      paymentMethod,
      paymentReference
    } = req.body;

    if (!farmerId || !dealHeadline || !days) {
      return res.status(400).json({ error: 'Missing required ad request fields' });
    }

    const created = store.createAdRequest({
      farmerId,
      farmerName: farmerName || 'Farmer',
      farmerAvatar,
      farmName: farmName || 'Local Farm',
      farmerEmail,
      farmerPhone,
      productId,
      productName,
      productImage,
      productPrice,
      productUnit,
      category,
      categoryName,
      dealHeadline,
      dealDescription: dealDescription || '',
      discountPercentage: discountPercentage ? Number(discountPercentage) : undefined,
      specialPrice: specialPrice ? Number(specialPrice) : undefined,
      days: Number(days),
      proofOfPaymentUrl,
      proofOfPaymentFileName,
      paymentMethod: paymentMethod || 'ecocash',
      paymentReference: paymentReference || '',
      status: 'sent'
    });

    res.status(201).json(created);
  });

  app.put('/api/ads/:id/status', (req: Request, res: Response) => {
    const { status, adminFeedback, reviewedBy } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const updated = store.updateAdRequestStatus(req.params.id, status, adminFeedback, reviewedBy);
    if (!updated) return res.status(404).json({ error: 'Ad request not found' });
    res.json(updated);
  });

  app.delete('/api/ads/:id', (req: Request, res: Response) => {
    const deleted = store.deleteAdRequest(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Ad request not found' });
    res.json({ success: true });
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
