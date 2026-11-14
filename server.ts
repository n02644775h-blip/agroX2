import express, { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
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

  const uploadsDir = path.join(process.cwd(), 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  // Direct binary upload route (mounted before express.json so raw payloads stream cleanly)
  app.post(
    '/api/media/upload',
    express.raw({
      limit: '28mb',
      type: ['image/*', 'video/*', 'application/octet-stream']
    }),
    (req: Request, res: Response) => {
      try {
        const buffer = req.body as Buffer;
        if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
          return res.status(400).json({ error: 'No media file received.' });
        }

        const rawHeaderType = String(req.headers['x-file-type'] || req.headers['content-type'] || '').toLowerCase();
        const rawHeaderName = decodeURIComponent(String(req.headers['x-file-name'] || 'upload'));
        const extFromName = path.extname(rawHeaderName).toLowerCase();

        const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const allowedVideoTypes = ['video/mp4', 'video/webm'];
        const isImage =
          allowedImageTypes.includes(rawHeaderType) ||
          ['.jpg', '.jpeg', '.png', '.webp'].includes(extFromName);
        const isVideo =
          allowedVideoTypes.includes(rawHeaderType) ||
          ['.mp4', '.webm'].includes(extFromName);

        if (!isImage && !isVideo) {
          return res.status(400).json({
            error: 'Unsupported media format. Allowed: JPG, PNG, WebP images and MP4, WebM videos.'
          });
        }

        if (isImage && buffer.length > 8 * 1024 * 1024) {
          return res.status(400).json({ error: 'Image size exceeds the 8MB limit.' });
        }
        if (isVideo && buffer.length > 25 * 1024 * 1024) {
          return res.status(400).json({ error: 'Video size exceeds the 25MB limit.' });
        }

        const safeExt =
          extFromName && ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm'].includes(extFromName)
            ? extFromName
            : isVideo
              ? rawHeaderType.includes('webm') ? '.webm' : '.mp4'
              : rawHeaderType.includes('png') ? '.png' : rawHeaderType.includes('webp') ? '.webp' : '.jpg';

        const safeBase = path
          .basename(rawHeaderName, extFromName)
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 40) || 'media';
        const storedFileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeBase}${safeExt}`;
        const destPath = path.join(uploadsDir, storedFileName);
        fs.writeFileSync(destPath, buffer);

        return res.status(201).json({
          url: `/uploads/${storedFileName}`,
          type: isVideo ? 'video' : 'image',
          mimeType: rawHeaderType || (isVideo ? 'video/mp4' : 'image/jpeg'),
          fileName: rawHeaderName,
          size: buffer.length
        });
      } catch (err: any) {
        console.error('Media upload failed:', err);
        return res.status(500).json({ error: err?.message || 'Failed to save uploaded media.' });
      }
    }
  );

  app.use(express.json({ limit: '40mb' }));
  app.use(express.urlencoded({ extended: true, limit: '40mb' }));

  // --- Verification OTP Store (10-min TTL) ---
  const verificationCodes = new Map<string, {
    code: string;
    channel: 'email' | 'phone';
    target: string;
    expiresAt: number;
    verified: boolean;
  }>();

  const normalizeVerificationTarget = (channel: 'email' | 'phone', target: string): string => {
    const trimmed = target.trim();
    return channel === 'email' ? trimmed.toLowerCase() : trimmed.replace(/[\s()-]/g, '');
  };

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
      res.setHeader('Set-Cookie', [
        `agrox_uid=; Path=/; SameSite=None; Secure; Max-Age=0`,
        `agriconnect_token=; Path=/; SameSite=None; Secure; Max-Age=0`
      ]);
      return res.status(403).json({ error: 'Your account has been suspended by the agroX administration. Please contact support at admin@agrox.co.zw for assistance.' });
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

  app.post('/api/auth/send-verification', (req: Request, res: Response) => {
    try {
      const { channel, target, name } = req.body || {};
      if (channel !== 'email' && channel !== 'phone') {
        return res.status(400).json({ error: 'Verification channel must be email or phone.' });
      }
      if (!target || typeof target !== 'string' || !target.trim()) {
        return res.status(400).json({ error: channel === 'email' ? 'Please enter your email address first.' : 'Please enter your phone number first.' });
      }

      const normalized = normalizeVerificationTarget(channel, target);
      if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      if (channel === 'phone' && normalized.replace(/^\+/, '').length < 7) {
        return res.status(400).json({ error: 'Please enter a valid phone number (e.g. +263 77 123 4567).' });
      }

      const code = String(crypto.randomInt(100000, 999999));
      const key = `${channel}:${normalized}`;
      const expiresAt = Date.now() + 10 * 60 * 1000;

      verificationCodes.set(key, {
        code,
        channel,
        target: normalized,
        expiresAt,
        verified: false
      });

      console.log(`[agroX Verification] ${channel.toUpperCase()} OTP for ${normalized}${name ? ` (${name})` : ''}: ${code}`);

      return res.json({
        success: true,
        channel,
        target: target.trim(),
        expiresInSeconds: 600,
        sandboxCode: code,
        message: channel === 'email'
          ? `6-digit verification code dispatched to ${target.trim()}.`
          : `6-digit SMS verification code dispatched to ${target.trim()}.`
      });
    } catch (err: any) {
      console.error('Error sending verification code:', err);
      return res.status(500).json({ error: 'Failed to send verification code.' });
    }
  });

  app.post('/api/auth/verify-code', (req: Request, res: Response) => {
    try {
      const { channel, target, code } = req.body || {};
      if (channel !== 'email' && channel !== 'phone') {
        return res.status(400).json({ error: 'Invalid verification channel.' });
      }
      if (!target || !code) {
        return res.status(400).json({ error: 'Target and 6-digit verification code are required.' });
      }

      const normalized = normalizeVerificationTarget(channel, String(target));
      const key = `${channel}:${normalized}`;
      const entry = verificationCodes.get(key);

      if (!entry) {
        return res.status(400).json({ error: 'No verification code found. Please request a new code.' });
      }
      if (Date.now() > entry.expiresAt) {
        verificationCodes.delete(key);
        return res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
      }
      if (entry.code !== String(code).trim()) {
        return res.status(400).json({ error: 'Invalid verification code. Please check the 6-digit code and try again.' });
      }

      entry.verified = true;
      verificationCodes.set(key, entry);

      return res.json({
        verified: true,
        channel,
        target: target.trim()
      });
    } catch (err: any) {
      console.error('Error verifying code:', err);
      return res.status(500).json({ error: 'Failed to verify code.' });
    }
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const {
      name,
      email,
      phone,
      role,
      location,
      farmerProfile,
      buyerProfile,
      avatar,
      emailVerified,
      phoneVerified,
      verificationMethod
    } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required' });
    }

    const existing = store.getUserByEmail(email);
    if (existing) {
      if (existing.status === 'suspended') {
        return res.status(403).json({ error: 'Your account has been suspended by the agroX administration. Please contact support at admin@agrox.co.zw for assistance.' });
      }
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const isSeller = role === 'farmer' || role === 'fodder_supplier';
    const idPrefix = role === 'fodder_supplier' ? 'supplier' : role;
    const id = `${idPrefix}-${Date.now()}`;
    const defaultAvatar = isSeller
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
      emailVerified: Boolean(emailVerified),
      phoneVerified: Boolean(phoneVerified),
      verificationMethod,
      createdAt: new Date().toISOString(),
      farmerProfile: isSeller ? (farmerProfile || {
        farmName: role === 'fodder_supplier' ? `${name}'s Fodder Supply` : `${name}'s Farm`,
        farmDescription: role === 'fodder_supplier'
          ? 'Certified livestock fodder, hay bale, and animal feed supplier.'
          : 'Local agricultural producer offering fresh, high quality farm goods.',
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
      const existingById = store.getUserById(userId);
      const existingByEmail = user?.email ? store.getUserByEmail(user.email) : undefined;
      if (
        existingById?.status === 'suspended' ||
        existingByEmail?.status === 'suspended' ||
        user?.status === 'suspended'
      ) {
        res.setHeader('Set-Cookie', [
          `agrox_uid=; Path=/; SameSite=None; Secure; Max-Age=0`,
          `agriconnect_token=; Path=/; SameSite=None; Secure; Max-Age=0`
        ]);
        return res.status(403).json({ error: 'Your account has been suspended by the agroX administration.' });
      }
      if (user && !existingById) {
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

  app.get('/api/auth/status', (req: Request, res: Response) => {
    const email = (req.query.email as string | undefined)?.trim();
    const uid = (req.query.uid as string | undefined)?.trim();
    const byId = uid ? store.getUserById(uid) : undefined;
    const byEmail = email ? store.getUserByEmail(email) : undefined;
    const suspended = byId?.status === 'suspended' || byEmail?.status === 'suspended';
    return res.json({
      suspended,
      status: suspended ? 'suspended' : (byId?.status || byEmail?.status || 'unknown')
    });
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
        if (user.status === 'suspended') {
          res.setHeader('Set-Cookie', [
            `agrox_uid=; Path=/; SameSite=None; Secure; Max-Age=0`,
            `agriconnect_token=; Path=/; SameSite=None; Secure; Max-Age=0`
          ]);
          return res.json({ user: null, suspended: true });
        }
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
        sellerRole,
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
      const finalSellerRole = sellerRole || existingFarmer?.role || (category === 'cat-fodder' ? 'fodder_supplier' : 'farmer');

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
        sellerRole: finalSellerRole,
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
      id,
      orderNumber,
      checkoutGroupId,
      buyerId,
      buyerName,
      buyerPhone,
      buyerEmail,
      farmerId,
      farmerName,
      farmName,
      items,
      subtotalAmount,
      deliveryFee,
      totalAmount,
      deliveryMethod,
      deliveryAddress,
      deliveryLocation,
      pickupLocation,
      pickupTimeWindow,
      pickupInstructions,
      paymentMethod,
      proofOfPaymentUrl,
      proofOfPaymentFileName,
      paymentReference,
      farmerPaymentDetails,
      buyerNotes
    } = req.body;

    if (!buyerId || !farmerId || !items || !items.length) {
      return res.status(400).json({ error: 'Buyer, Farmer and Order Items are required' });
    }

    if (id) {
      const existingOrder = store.getOrderById(id);
      if (existingOrder) {
        return res.status(200).json(existingOrder);
      }
    }

    const buyer = store.getUserById(buyerId);
    const farmer = store.getUserById(farmerId);

    // Verify stock availability where product exists in backend store
    for (const item of items) {
      const prod = store.getProductById(item.productId);
      if (prod && prod.quantityAvailable < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${prod.name}. Available: ${prod.quantityAvailable} ${prod.unit}, Requested: ${item.quantity}`
        });
      }
    }

    const resolvedFarmerName = farmer?.name || farmerName || 'Local Producer';
    const resolvedFarmName = farmer?.farmerProfile?.farmName || farmName || `${resolvedFarmerName}'s Farm`;
    const resolvedPickupLocation = pickupLocation || (deliveryMethod === 'pickup' ? {
      farmName: resolvedFarmName,
      address: farmer?.farmerProfile?.address || farmer?.location?.address || `${farmer?.location?.city || 'Local'}, ${farmer?.location?.province || 'Zimbabwe'}`,
      city: farmer?.location?.city,
      province: farmer?.location?.province,
      instructions: farmer?.farmerProfile?.pickupInstructions || pickupInstructions || 'Collect at the farm gate dispatch point.',
      phone: farmer?.phone || farmer?.farmerProfile?.whatsapp
    } : undefined);

    const newOrder = store.createOrder({
      id,
      orderNumber,
      checkoutGroupId,
      buyerId,
      buyerName: buyer?.name || buyerName || 'Marketplace Buyer',
      buyerPhone: buyer?.phone || buyerPhone || '',
      buyerEmail: buyer?.email || buyerEmail || '',
      farmerId,
      farmerName: resolvedFarmerName,
      farmName: resolvedFarmName,
      items: items.map((item: any) => ({ ...item, farmerId: item.farmerId || farmerId })),
      subtotalAmount: subtotalAmount !== undefined ? parseFloat(subtotalAmount) : undefined,
      deliveryFee: deliveryFee !== undefined ? parseFloat(deliveryFee) : 0,
      totalAmount: parseFloat(totalAmount),
      status: 'received',
      deliveryMethod: deliveryMethod === 'pickup' ? 'pickup' : 'delivery',
      deliveryAddress: deliveryAddress || deliveryLocation?.formattedAddress || buyer?.location?.address,
      deliveryLocation,
      pickupLocation: resolvedPickupLocation,
      pickupTimeWindow,
      pickupInstructions: pickupInstructions || resolvedPickupLocation?.instructions,
      paymentMethod: paymentMethod || 'cash_on_delivery',
      paymentStatus: 'awaiting_payment',
      proofOfPaymentUrl,
      proofOfPaymentFileName,
      paymentReference,
      farmerPaymentDetails: farmerPaymentDetails || {
        ...(farmer?.farmerProfile?.paymentInfo || {}),
        phone: farmer?.phone
      },
      buyerNotes
    });

    res.status(201).json(newOrder);
  });

  app.put('/api/orders/:id/status', (req: Request, res: Response) => {
    const { status, note, pickupTimeWindow, pickupInstructions } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const order = store.updateOrderStatus(req.params.id, status, note, pickupTimeWindow, pickupInstructions);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json(order);
  });

  app.put('/api/orders/:id/payment', (req: Request, res: Response) => {
    const { paymentStatus, reason } = req.body || {};
    if (!paymentStatus) return res.status(400).json({ error: 'paymentStatus is required' });

    const order = store.updateOrderPaymentStatus(req.params.id, paymentStatus, reason);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json(order);
  });

  app.put('/api/orders/:id/pop', (req: Request, res: Response) => {
    const { proofOfPaymentUrl, proofOfPaymentFileName, paymentReference } = req.body || {};
    if (!proofOfPaymentUrl) return res.status(400).json({ error: 'Proof of payment file is required' });

    const order = store.submitOrderPop(req.params.id, {
      proofOfPaymentUrl,
      proofOfPaymentFileName,
      paymentReference
    });
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
    try {
      const {
        conversationId,
        senderId,
        recipientId,
        text,
        productId,
        productSnippet,
        postReference,
        requestReference,
        orderId,
        requestId,
        postId,
        senderName,
        senderAvatar,
        senderRole,
        recipientName,
        recipientAvatar,
        recipientRole,
        recipientFarmName
      } = req.body || {};
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
        postReference,
        requestReference,
        orderId,
        requestId,
        postId,
        senderName,
        senderAvatar,
        senderRole,
        recipientName,
        recipientAvatar,
        recipientRole,
        recipientFarmName
      });

      return res.status(201).json(result);
    } catch (err: any) {
      console.error('Error sending message:', err);
      return res.status(500).json({ error: err?.message || 'Failed to send message' });
    }
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
    if (!farmer || (farmer.role !== 'farmer' && farmer.role !== 'fodder_supplier')) {
      return res.status(404).json({ error: 'Producer not found' });
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
    const { status, email } = req.body;
    const updated = store.toggleUserStatus(req.params.id, status, email);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  });

  // --- Advertisements, POP & Hot Deals ---
  const handleGetAds = (req: Request, res: Response) => {
    const farmerId = req.query.farmerId as string | undefined;
    const status = req.query.status as string | undefined;
    res.json(store.getAdRequests(farmerId, status));
  };
  app.get('/api/ads', handleGetAds);
  app.get('/api/ad-requests', handleGetAds);
  app.get('/api/advertisers', handleGetAds);
  app.get('/api/advertising', handleGetAds);
  app.get('/ads', handleGetAds);
  app.get('/ad-requests', handleGetAds);

  const handleGetHotDeals = (_req: Request, res: Response) => {
    res.json(store.getActiveHotDeals());
  };
  app.get('/api/ads/hot-deals', handleGetHotDeals);
  app.get('/api/ads/featured', handleGetHotDeals);
  app.get('/api/hot-deals', handleGetHotDeals);
  app.get('/hot-deals', handleGetHotDeals);

  app.get('/api/ads/:id', (req: Request, res: Response) => {
    const ad = store.getAdRequestById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Ad request not found' });
    res.json(ad);
  });
  app.get('/api/ad-requests/:id', (req: Request, res: Response) => {
    const ad = store.getAdRequestById(req.params.id);
    if (!ad) return res.status(404).json({ error: 'Ad request not found' });
    res.json(ad);
  });

  const handleCreateAd = (req: Request, res: Response) => {
    try {
      const {
        id,
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
        discountText,
        days,
        durationDays,
        totalAmount,
        totalFee,
        proofOfPaymentUrl,
        proofOfPaymentFileName,
        paymentMethod,
        paymentReference,
        status
      } = req.body || {};

      const toFiniteNum = (val: unknown): number | undefined => {
        if (val === undefined || val === null || val === '') return undefined;
        const n = Number(val);
        return Number.isFinite(n) ? n : undefined;
      };

      const finalFarmerId = farmerId || (req as any).user?.id || 'farmer-1';
      const finalHeadline = (dealHeadline || '').trim() || (productName ? `Special Harvest Deal: ${productName}` : 'Fresh Harvest Special Promotion');
      const finalDays = toFiniteNum(days) || toFiniteNum(durationDays) || 7;

      const created = store.createAdRequest({
        id,
        farmerId: finalFarmerId,
        farmerName: farmerName || 'Farmer',
        farmerAvatar,
        farmName: farmName || 'Local Farm',
        farmerEmail,
        farmerPhone,
        productId,
        productName: productName || 'Harvest Produce',
        productImage,
        productPrice: toFiniteNum(productPrice),
        productUnit: productUnit || 'kg',
        category,
        categoryName,
        dealHeadline: finalHeadline,
        dealDescription: dealDescription || '',
        discountPercentage: toFiniteNum(discountPercentage),
        specialPrice: toFiniteNum(specialPrice),
        discountText,
        days: finalDays,
        durationDays: finalDays,
        totalAmount: toFiniteNum(totalAmount),
        totalFee: toFiniteNum(totalFee),
        proofOfPaymentUrl,
        proofOfPaymentFileName,
        paymentMethod: paymentMethod || 'ecocash',
        paymentReference: paymentReference || '',
        status: status || 'sent'
      });

      return res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creating ad request:', err);
      return res.status(500).json({ error: err?.message || 'Failed to submit advertising request.' });
    }
  };
  app.post('/api/ads', handleCreateAd);
  app.post('/api/ad-requests', handleCreateAd);
  app.post('/api/advertising', handleCreateAd);
  app.post('/ads', handleCreateAd);
  app.post('/ad-requests', handleCreateAd);

  const handleUpdateAdStatus = (req: Request, res: Response) => {
    const { status, adminFeedback, reviewedBy } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    const updated = store.updateAdRequestStatus(req.params.id, status, adminFeedback, reviewedBy);
    if (!updated) return res.status(404).json({ error: 'Ad request not found' });
    res.json(updated);
  };
  app.put('/api/ads/:id/status', handleUpdateAdStatus);
  app.put('/api/ad-requests/:id/status', handleUpdateAdStatus);

  const handleDeleteAd = (req: Request, res: Response) => {
    const deleted = store.deleteAdRequest(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Ad request not found' });
    res.json({ success: true });
  };
  app.delete('/api/ads/:id', handleDeleteAd);
  app.delete('/api/ad-requests/:id', handleDeleteAd);

  // --- Statistics ---
  app.get('/api/stats/farmer/:id', (req: Request, res: Response) => {
    res.json(store.getFarmerStats(req.params.id));
  });

  app.get('/api/stats/admin', (_req: Request, res: Response) => {
    res.json(store.getAdminStats());
  });

  // --- FarmBridge Community Media Posts ---
  app.get('/api/posts', (req: Request, res: Response) => {
    const farmerId = req.query.farmerId as string | undefined;
    res.json(store.getMediaPosts(farmerId));
  });

  app.get('/api/posts/:id', (req: Request, res: Response) => {
    const post = store.getMediaPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  });

  app.post('/api/posts', (req: Request, res: Response) => {
    try {
      const {
        id,
        farmerId,
        farmerName,
        farmerAvatar,
        farmName,
        sellerRole,
        media,
        caption,
        description,
        productName,
        price,
        unit,
        hashtags,
        taggedProductId,
        taggedProductName,
        shareLocation,
        location
      } = req.body || {};

      if (!farmerId || !caption || !Array.isArray(media) || media.length === 0) {
        return res.status(400).json({ error: 'Farmer ID, caption, and at least one photo or video are required.' });
      }

      const farmer = store.getUserById(farmerId);
      const parsedPrice = price !== undefined && price !== null && price !== '' ? Number(price) : undefined;
      const cleanHashtags = Array.isArray(hashtags)
        ? hashtags.map((h: string) => String(h).replace(/^#/, '').trim()).filter(Boolean)
        : [];

      const created = store.createMediaPost({
        id,
        farmerId,
        farmerName: farmerName || farmer?.name || 'Local Farmer',
        farmerAvatar:
          farmerAvatar ||
          farmer?.avatar ||
          'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
        farmName: farmName || farmer?.farmerProfile?.farmName || `${farmerName || 'Local'}'s Farm`,
        sellerRole: sellerRole || farmer?.role || 'farmer',
        media,
        caption: String(caption).trim(),
        description: description ? String(description).trim() : undefined,
        productName: productName ? String(productName).trim() : undefined,
        price: parsedPrice !== undefined && Number.isFinite(parsedPrice) ? parsedPrice : undefined,
        unit: unit ? String(unit).trim() : undefined,
        hashtags: cleanHashtags,
        taggedProductId: taggedProductId || undefined,
        taggedProductName: taggedProductName || undefined,
        shareLocation: Boolean(shareLocation),
        location: shareLocation
          ? location || (farmer?.location ? `${farmer.location.city}, ${farmer.location.province}` : undefined)
          : undefined
      });

      return res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creating community post:', err);
      return res.status(500).json({ error: err?.message || 'Failed to publish post.' });
    }
  });

  app.put('/api/posts/:id', (req: Request, res: Response) => {
    const { farmerId, ...updates } = req.body || {};
    const result = store.updateMediaPost(req.params.id, farmerId, updates);
    if (result === null) {
      return res.status(403).json({ error: 'Only the farmer who created this post can edit it.' });
    }
    if (!result) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    res.json(result);
  });

  app.delete('/api/posts/:id', (req: Request, res: Response) => {
    const farmerId = (req.query.farmerId as string | undefined) || req.body?.farmerId;
    const result = store.deleteMediaPost(req.params.id, farmerId);
    if (result === 'forbidden') {
      return res.status(403).json({ error: 'Only the farmer who created this post can delete it.' });
    }
    if (result === 'not_found') {
      return res.status(404).json({ error: 'Post not found.' });
    }
    res.json({ success: true });
  });

  app.post('/api/posts/:id/like', (req: Request, res: Response) => {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const updated = store.toggleMediaPostLike(req.params.id, userId);
    if (!updated) return res.status(404).json({ error: 'Post not found' });
    res.json(updated);
  });

  app.post('/api/posts/:id/quote', (req: Request, res: Response) => {
    const { buyerId, buyerName } = req.body || {};
    const updated = store.recordMediaPostQuote(req.params.id, buyerId || 'guest', buyerName || 'Marketplace Buyer');
    if (!updated) return res.status(404).json({ error: 'Post not found' });
    res.json(updated);
  });

  // --- Buyer Product Requests ---
  app.get('/api/buyer-requests', (req: Request, res: Response) => {
    const { buyerId, category, location, status } = req.query;
    res.json(
      store.getBuyerRequests({
        buyerId: buyerId as string | undefined,
        category: category as string | undefined,
        location: location as string | undefined,
        status: status as string | undefined
      })
    );
  });

  app.get('/api/buyer-requests/:id', (req: Request, res: Response) => {
    const item = store.getBuyerRequestById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Buyer request not found' });
    res.json(item);
  });

  app.post('/api/buyer-requests', (req: Request, res: Response) => {
    try {
      const {
        id,
        buyerId,
        buyerName,
        buyerAvatar,
        buyerPhone,
        productName,
        category,
        categoryName,
        description,
        quantityRequired,
        preferredPrice,
        budgetCurrency,
        budgetNotes,
        location,
        requiredDate,
        notes,
        referenceImages
      } = req.body || {};

      if (!buyerId || !productName || !quantityRequired || !location) {
        return res.status(400).json({
          error: 'Buyer ID, product name, quantity required, and preferred location are required.'
        });
      }

      const buyer = store.getUserById(buyerId);
      const parsedPrice =
        preferredPrice !== undefined && preferredPrice !== null && preferredPrice !== ''
          ? Number(preferredPrice)
          : undefined;

      const created = store.createBuyerRequest({
        id,
        buyerId,
        buyerName: buyerName || buyer?.name || 'Marketplace Buyer',
        buyerAvatar: buyerAvatar || buyer?.avatar,
        buyerPhone: buyerPhone || buyer?.phone,
        productName: String(productName).trim(),
        category: category || 'cat-other',
        categoryName: categoryName || 'Other Farm Produce',
        description: description ? String(description).trim() : '',
        quantityRequired: String(quantityRequired).trim(),
        preferredPrice: parsedPrice !== undefined && Number.isFinite(parsedPrice) ? parsedPrice : undefined,
        budgetCurrency: budgetCurrency || 'USD',
        budgetNotes: budgetNotes ? String(budgetNotes).trim() : undefined,
        location: String(location).trim(),
        requiredDate: requiredDate || undefined,
        notes: notes ? String(notes).trim() : undefined,
        referenceImages: Array.isArray(referenceImages) ? referenceImages : undefined
      });

      return res.status(201).json(created);
    } catch (err: any) {
      console.error('Error creating buyer request:', err);
      return res.status(500).json({ error: err?.message || 'Failed to create buyer request.' });
    }
  });

  app.put('/api/buyer-requests/:id', (req: Request, res: Response) => {
    const { buyerId, ...updates } = req.body || {};
    const result = store.updateBuyerRequest(req.params.id, buyerId, updates);
    if (result === null) {
      return res.status(403).json({ error: 'Only the buyer who created this request can edit it.' });
    }
    if (!result) return res.status(404).json({ error: 'Buyer request not found' });
    res.json(result);
  });

  app.put('/api/buyer-requests/:id/status', (req: Request, res: Response) => {
    const { status, buyerId } = req.body || {};
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const result = store.updateBuyerRequestStatus(req.params.id, status, buyerId);
    if (result === null) {
      return res.status(403).json({ error: 'Only the buyer who created this request can change its status.' });
    }
    if (!result) return res.status(404).json({ error: 'Buyer request not found' });
    res.json(result);
  });

  app.post('/api/buyer-requests/:id/respond', (req: Request, res: Response) => {
    const { farmerId, farmerName } = req.body || {};
    if (!farmerId) return res.status(400).json({ error: 'farmerId is required' });
    const result = store.markBuyerRequestResponded(req.params.id, farmerId, farmerName);
    if (result === 'closed') {
      return res.status(409).json({ error: 'This request has already been marked Handled or Cancelled.' });
    }
    if (!result) return res.status(404).json({ error: 'Buyer request not found' });
    res.json(result);
  });

  app.delete('/api/buyer-requests/:id', (req: Request, res: Response) => {
    const buyerId = (req.query.buyerId as string | undefined) || req.body?.buyerId;
    const result = store.deleteBuyerRequest(req.params.id, buyerId);
    if (result === 'forbidden') {
      return res.status(403).json({ error: 'Only the creator buyer can remove this request.' });
    }
    if (result === 'not_found') return res.status(404).json({ error: 'Buyer request not found' });
    res.json({ success: true });
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
