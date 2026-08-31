import { User, ProductCategory, Product, Order, Review, Message, Conversation, Notification, Announcement, Report, AdRequest } from '../src/types';

export const INITIAL_CATEGORIES: ProductCategory[] = [
  { id: 'cat-breeding', name: 'Breeding (Crossbreeds & Hybrids)', slug: 'breeding', icon: 'Dna', description: 'High-yield crossbred livestock, hybrid poultry, climate-resilient F1 seed varieties, and proven breeding stock' },
  { id: 'cat-veg', name: 'Vegetables', slug: 'vegetables', icon: 'Carrot', description: 'Fresh farm-picked leafy greens, roots, tubers & tomatoes' },
  { id: 'cat-fruits', name: 'Fruits', slug: 'fruits', icon: 'Apple', description: 'Seasonal orchard and field-harvested fresh fruits' },
  { id: 'cat-grains', name: 'Grains & Cereals', slug: 'grains', icon: 'Wheat', description: 'Maize, wheat, sorghum, millet, and rice' },
  { id: 'cat-legumes', name: 'Legumes & Pulses', slug: 'legumes', icon: 'Bean', description: 'Sugar beans, soya beans, cowpeas, and groundnuts' },
  { id: 'cat-poultry', name: 'Poultry & Eggs', slug: 'poultry', icon: 'Egg', description: 'Free-range broiler chickens, road runners & fresh farm eggs' },
  { id: 'cat-dairy', name: 'Dairy', slug: 'dairy', icon: 'Milk', description: 'Raw farm milk, sour milk (lacto), artisan cheeses & butter' },
  { id: 'cat-livestock', name: 'Livestock & Meat', slug: 'livestock', icon: 'Beef', description: 'Cattle, Boer goats, sheep, pork and processed cuts' },
  { id: 'cat-honey', name: 'Honey & Bee Products', slug: 'honey', icon: 'Hexagon', description: '100% pure raw unprocessed forest honey and beeswax' },
  { id: 'cat-herbs', name: 'Herbs & Spices', slug: 'herbs', icon: 'Sprout', description: 'Culinary herbs, mint, rosemary, coriander & dried spices' },
  { id: 'cat-seeds', name: 'Seeds & Seedlings', slug: 'seeds', icon: 'Flower2', description: 'Certified planting seeds, fruit tree saplings & nursery seedlings' },
  { id: 'cat-other', name: 'Other Farm Produce', slug: 'other', icon: 'Package', description: 'Compost, organic fertilizer, animal feed, dried goods' }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'farmer-1',
    name: 'Tendai Moyo',
    email: 'tendai.moyo@greenfields.co.zw',
    phone: '+263 77 212 3456',
    role: 'farmer',
    avatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
    location: {
      country: 'Zimbabwe',
      province: 'Mashonaland East',
      city: 'Marondera',
      community: 'Ruzawi Valley',
      address: 'Plot 14 GreenFields Estate'
    },
    status: 'active',
    createdAt: '2026-01-10T08:00:00Z',
    farmerProfile: {
      farmName: 'GreenFields Organic Farm',
      farmDescription: 'Pioneering eco-friendly sustainable agriculture. We specialize in organic heirloom vegetables, drip-irrigated greenhouse tomatoes, and natural honey.',
      farmSize: '25 Hectares',
      establishedYear: 2018,
      farmingPractices: ['organic', 'pesticide_free'],
      rating: 4.9,
      totalReviews: 28,
      verified: true,
      coverImage: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=1200',
      contactPreferences: ['phone', 'chat', 'whatsapp']
    }
  },
  {
    id: 'farmer-2',
    name: 'Chipo Sibanda',
    email: 'chipo@sunrisepoultry.co.zw',
    phone: '+263 71 889 0123',
    role: 'farmer',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    location: {
      country: 'Zimbabwe',
      province: 'Midlands',
      city: 'Gweru',
      community: 'Thornhill Farmlands',
      address: 'Stand 5B Sunrise Lane'
    },
    status: 'active',
    createdAt: '2026-01-15T09:30:00Z',
    farmerProfile: {
      farmName: 'Sunrise Pastoral & Poultry',
      farmDescription: 'Breeding healthy pasture-raised broiler chickens, indigenous roadrunners, and farm-fresh graded brown eggs delivered directly to households and eateries.',
      farmSize: '12 Hectares',
      establishedYear: 2020,
      farmingPractices: ['free_range', 'traditional'],
      rating: 4.8,
      totalReviews: 42,
      verified: true,
      coverImage: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=1200',
      contactPreferences: ['chat', 'phone']
    }
  },
  {
    id: 'farmer-3',
    name: 'Farai Ndlovu',
    email: 'farai@highlandsorchards.co.zw',
    phone: '+263 78 456 7890',
    role: 'farmer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    location: {
      country: 'Zimbabwe',
      province: 'Manicaland',
      city: 'Mutare',
      community: 'Vumba Highlands',
      address: 'Farm Road 9 Vumba Valley'
    },
    status: 'active',
    createdAt: '2026-02-01T10:15:00Z',
    farmerProfile: {
      farmName: 'Highlands Fruit & Dairy Estate',
      farmDescription: 'High-altitude cool climate produces the crispiest avocados, sweet macadamias, fresh dairy milk, and fragrant rosemary.',
      farmSize: '40 Hectares',
      establishedYear: 2015,
      farmingPractices: ['traditional', 'organic'],
      rating: 4.7,
      totalReviews: 19,
      verified: true,
      coverImage: 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?auto=format&fit=crop&q=80&w=1200',
      contactPreferences: ['chat', 'phone', 'whatsapp']
    }
  },
  {
    id: 'buyer-1',
    name: 'Grace Chidzero',
    email: 'grace.chidzero@gmail.com',
    phone: '+263 77 654 3210',
    role: 'buyer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    location: {
      country: 'Zimbabwe',
      province: 'Harare',
      city: 'Harare',
      community: 'Avondale',
      address: '22 King George Road, Avondale, Harare'
    },
    status: 'active',
    createdAt: '2026-01-20T11:00:00Z',
    buyerProfile: {
      preferredDeliveryAddress: '22 King George Road, Avondale, Harare',
      favoriteCategories: ['cat-veg', 'cat-poultry', 'cat-fruits'],
      totalOrdersPlaced: 7
    }
  },
  {
    id: 'buyer-2',
    name: 'Kudakwashe Mataruse',
    email: 'kuda.restocatering@gmail.com',
    phone: '+263 77 999 1122',
    role: 'buyer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    location: {
      country: 'Zimbabwe',
      province: 'Harare',
      city: 'Harare',
      community: 'Borrowdale',
      address: 'Mataruse Catering, Sam Levy Precinct'
    },
    status: 'active',
    createdAt: '2026-02-05T14:20:00Z',
    buyerProfile: {
      preferredDeliveryAddress: 'Shop 12 Borrowdale Village, Harare',
      favoriteCategories: ['cat-veg', 'cat-grains', 'cat-dairy'],
      totalOrdersPlaced: 14
    }
  },
  {
    id: 'admin-1',
    name: 'agroX Administrator',
    email: 'admin@agrox.org',
    phone: '+263 24 270 0000',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400',
    location: {
      country: 'Zimbabwe',
      province: 'Harare',
      city: 'Harare',
      address: 'agroX HQ, Agriculture House, Harare'
    },
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    farmerId: 'farmer-1',
    farmerName: 'Tendai Moyo',
    farmerAvatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
    farmName: 'GreenFields Organic Farm',
    name: 'Vine-Ripened Roma Tomatoes (Grade A)',
    category: 'cat-veg',
    categoryName: 'Vegetables',
    description: 'Juicy, deep red, greenhouse-grown Roma tomatoes. Firm texture and high sugar content make them perfect for fresh summer salads, sauces, and canning. Harvested daily at optimal sweetness.',
    price: 1.50,
    unit: 'kg',
    quantityAvailable: 450,
    minOrderQuantity: 5,
    images: [
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Mashonaland East',
      city: 'Marondera',
      community: 'Ruzawi Valley'
    },
    harvestDate: '2026-08-25',
    expiryDate: '2026-09-08',
    availability: 'available',
    isOrganic: true,
    featured: true,
    rating: 4.9,
    reviewsCount: 15,
    additionalNotes: 'Crates sanitized before dispatch. Bulk wholesale discounts available for 50kg+.',
    createdAt: '2026-08-20T09:00:00Z',
    updatedAt: '2026-08-25T07:30:00Z'
  },
  {
    id: 'prod-2',
    farmerId: 'farmer-1',
    farmerName: 'Tendai Moyo',
    farmerAvatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
    farmName: 'GreenFields Organic Farm',
    name: 'Pure Raw Wildflower Forest Honey',
    category: 'cat-honey',
    categoryName: 'Honey & Bee Products',
    description: '100% natural, unprocessed, unpasteurized honey harvested from our protected eucalyptus and wildflower apiaries in Marondera. Retains all natural enzymes, pollens, and medicinal antioxidants.',
    price: 8.00,
    unit: 'liter',
    quantityAvailable: 60,
    minOrderQuantity: 1,
    images: [
      'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Mashonaland East',
      city: 'Marondera',
      community: 'Ruzawi Valley'
    },
    harvestDate: '2026-08-10',
    availability: 'available',
    isOrganic: true,
    featured: true,
    rating: 5.0,
    reviewsCount: 9,
    additionalNotes: 'Packed in food-grade glass jars with seal.',
    createdAt: '2026-08-12T10:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z'
  },
  {
    id: 'prod-3',
    farmerId: 'farmer-2',
    farmerName: 'Chipo Sibanda',
    farmerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    farmName: 'Sunrise Pastoral & Poultry',
    name: 'Fresh Farm Table Eggs (Tray of 30)',
    category: 'cat-poultry',
    categoryName: 'Poultry & Eggs',
    description: 'Golden yolk, high-protein eggs laid daily by free-range hens fed on non-GMO grains and open pasture forage. Graded for premium quality and clean shells.',
    price: 4.50,
    unit: 'tray',
    quantityAvailable: 120,
    minOrderQuantity: 2,
    images: [
      'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Midlands',
      city: 'Gweru',
      community: 'Thornhill Farmlands'
    },
    harvestDate: '2026-08-25',
    expiryDate: '2026-09-24',
    availability: 'available',
    isOrganic: true,
    featured: true,
    rating: 4.9,
    reviewsCount: 23,
    additionalNotes: 'Secure molded pulp trays with protective wrapping.',
    createdAt: '2026-08-18T08:00:00Z',
    updatedAt: '2026-08-25T06:00:00Z'
  },
  {
    id: 'prod-4',
    farmerId: 'farmer-2',
    farmerName: 'Chipo Sibanda',
    farmerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    farmName: 'Sunrise Pastoral & Poultry',
    name: 'Whole Dressed Broiler Chicken (1.8kg - 2.1kg)',
    category: 'cat-poultry',
    categoryName: 'Poultry & Eggs',
    description: 'Tender, succulent grain-fed broiler chickens, hygienically slaughtered, dressed, vacuum packed, and flash-chilled to lock in farm-fresh flavor and tenderness.',
    price: 6.50,
    unit: 'piece',
    quantityAvailable: 85,
    minOrderQuantity: 1,
    images: [
      'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Midlands',
      city: 'Gweru',
      community: 'Thornhill Farmlands'
    },
    harvestDate: '2026-08-24',
    availability: 'available',
    isOrganic: false,
    featured: false,
    rating: 4.8,
    reviewsCount: 16,
    additionalNotes: 'Keep chilled below 4°C. Halal certified processing.',
    createdAt: '2026-08-22T12:00:00Z',
    updatedAt: '2026-08-24T14:00:00Z'
  },
  {
    id: 'prod-5',
    farmerId: 'farmer-3',
    farmerName: 'Farai Ndlovu',
    farmerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    farmName: 'Highlands Fruit & Dairy Estate',
    name: 'Hass Avocados (Creamy Grade A)',
    category: 'cat-fruits',
    categoryName: 'Fruits',
    description: 'Buttery, rich in healthy omega fats, handpicked from the misty slopes of Vumba Highlands. Perfect for guacamole, toast, and nutritious dining.',
    price: 0.80,
    unit: 'piece',
    quantityAvailable: 350,
    minOrderQuantity: 5,
    images: [
      'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1601039641847-7857b994d704?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Manicaland',
      city: 'Mutare',
      community: 'Vumba Highlands'
    },
    harvestDate: '2026-08-23',
    availability: 'available',
    isOrganic: true,
    featured: true,
    rating: 4.9,
    reviewsCount: 14,
    additionalNotes: 'Arrives firm-ripe; will reach buttery perfection in 2-3 days at room temperature.',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-23T08:00:00Z'
  },
  {
    id: 'prod-6',
    farmerId: 'farmer-3',
    farmerName: 'Farai Ndlovu',
    farmerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    farmName: 'Highlands Fruit & Dairy Estate',
    name: 'Fresh Whole Dairy Milk (Raw / Unprocessed)',
    category: 'cat-dairy',
    categoryName: 'Dairy',
    description: 'Creamy high-butterfat whole milk fresh from pasture-grazed Holstein-Friesian cows. Chilled immediately in stainless bulk tanks under strict hygiene protocols.',
    price: 1.20,
    unit: 'liter',
    quantityAvailable: 150,
    minOrderQuantity: 2,
    images: [
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Manicaland',
      city: 'Mutare',
      community: 'Vumba Highlands'
    },
    harvestDate: '2026-08-26',
    expiryDate: '2026-08-30',
    availability: 'available',
    isOrganic: false,
    featured: false,
    rating: 4.6,
    reviewsCount: 8,
    additionalNotes: 'Requires refrigeration below 4°C immediately upon receipt. Pasteurization recommended.',
    createdAt: '2026-08-24T06:00:00Z',
    updatedAt: '2026-08-26T05:00:00Z'
  },
  {
    id: 'prod-7',
    farmerId: 'farmer-1',
    farmerName: 'Tendai Moyo',
    farmerAvatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
    farmName: 'GreenFields Organic Farm',
    name: 'Sweet Yellow Field Maize (50kg Bag)',
    category: 'cat-grains',
    categoryName: 'Grains & Cereals',
    description: 'Clean, stone-free dried yellow maize grain with moisture content below 12.5%. Ideal for milling fine mealie-meal, animal feed formulation, or roasting.',
    price: 22.00,
    unit: 'bag',
    quantityAvailable: 35,
    minOrderQuantity: 1,
    images: [
      'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Mashonaland East',
      city: 'Marondera',
      community: 'Ruzawi Valley'
    },
    harvestDate: '2026-07-20',
    availability: 'low_stock',
    isOrganic: false,
    featured: false,
    rating: 4.7,
    reviewsCount: 11,
    additionalNotes: 'Packaged in heavy-duty polypropylene woven sacks.',
    createdAt: '2026-08-05T09:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  },
  {
    id: 'prod-8',
    farmerId: 'farmer-1',
    farmerName: 'Tendai Moyo',
    farmerAvatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
    farmName: 'GreenFields Organic Farm',
    name: 'Crisp Bell Peppers (Tricolor Mix)',
    category: 'cat-veg',
    categoryName: 'Vegetables',
    description: 'Vibrant red, yellow, and green bell peppers cultivated with organic compost in controlled shade houses. Crisp, sweet, and bursting with Vitamin C.',
    price: 2.20,
    unit: 'kg',
    quantityAvailable: 80,
    minOrderQuantity: 2,
    images: [
      'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Mashonaland East',
      city: 'Marondera',
      community: 'Ruzawi Valley'
    },
    harvestDate: '2026-08-24',
    availability: 'available',
    isOrganic: true,
    featured: false,
    rating: 4.9,
    reviewsCount: 7,
    additionalNotes: 'Mixed equal proportions of green, red, and yellow peppers.',
    createdAt: '2026-08-21T11:00:00Z',
    updatedAt: '2026-08-24T09:00:00Z'
  },
  {
    id: 'prod-9',
    farmerId: 'farmer-2',
    farmerName: 'Chipo Sibanda',
    farmerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    farmName: 'Sunrise Pastoral & Poultry',
    name: 'Fresh Red Onions (Medium Size Mesh Bag 10kg)',
    category: 'cat-veg',
    categoryName: 'Vegetables',
    description: 'Pungent, deeply colored red bulb onions properly sun-cured for prolonged shelf life. Essential base for stews, curries, roasts, and marinades.',
    price: 7.50,
    unit: 'bag',
    quantityAvailable: 45,
    minOrderQuantity: 1,
    images: [
      'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Midlands',
      city: 'Gweru',
      community: 'Thornhill Farmlands'
    },
    harvestDate: '2026-08-15',
    availability: 'available',
    isOrganic: false,
    featured: false,
    rating: 4.8,
    reviewsCount: 12,
    additionalNotes: 'Stores well for up to 3 months in a cool, ventilated dry pantry.',
    createdAt: '2026-08-16T10:00:00Z',
    updatedAt: '2026-08-22T08:00:00Z'
  },
  {
    id: 'prod-10',
    farmerId: 'farmer-3',
    farmerName: 'Farai Ndlovu',
    farmerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    farmName: 'Highlands Fruit & Dairy Estate',
    name: 'Freshly Cut Culinary Rosemary & Thyme Bundles',
    category: 'cat-herbs',
    categoryName: 'Herbs & Spices',
    description: 'Intensely fragrant fresh herbs harvested early morning before essential oils evaporate. Ideal for roasting meats, infusing oils, or artisanal seasoning.',
    price: 1.00,
    unit: 'bunch',
    quantityAvailable: 90,
    minOrderQuantity: 3,
    images: [
      'https://images.unsplash.com/photo-1515586000433-a5bc720b3ab2?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Manicaland',
      city: 'Mutare',
      community: 'Vumba Highlands'
    },
    harvestDate: '2026-08-25',
    availability: 'available',
    isOrganic: true,
    featured: false,
    rating: 4.9,
    reviewsCount: 5,
    additionalNotes: 'Wrapped in moist craft paper to retain hydration during transit.',
    createdAt: '2026-08-23T08:00:00Z',
    updatedAt: '2026-08-25T07:00:00Z'
  },
  {
    id: 'prod-11',
    farmerId: 'farmer-1',
    farmerName: 'Tendai Moyo',
    farmerAvatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
    farmName: 'GreenFields Organic Farm',
    name: 'Shelled Red Speckled Sugar Beans (20kg Bag)',
    category: 'cat-legumes',
    categoryName: 'Legumes & Pulses',
    description: 'First grade hand-sorted dry sugar beans. Clean, fast-cooking, and rich in natural plant protein and dietary fiber.',
    price: 28.00,
    unit: 'bag',
    quantityAvailable: 25,
    minOrderQuantity: 1,
    images: [
      'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Mashonaland East',
      city: 'Marondera',
      community: 'Ruzawi Valley'
    },
    harvestDate: '2026-07-28',
    availability: 'available',
    isOrganic: true,
    featured: false,
    rating: 4.8,
    reviewsCount: 6,
    additionalNotes: 'Airtight sack prevents pest penetration.',
    createdAt: '2026-08-10T14:00:00Z',
    updatedAt: '2026-08-21T09:00:00Z'
  },
  {
    id: 'prod-12',
    farmerId: 'farmer-2',
    farmerName: 'Chipo Sibanda',
    farmerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    farmName: 'Sunrise Pastoral & Poultry',
    name: 'Live Kalahari Red Boer Breeding Goat (Buck / Doe)',
    category: 'cat-livestock',
    categoryName: 'Livestock & Meat',
    description: 'Hardy, well-vaccinated, fast-growing Kalahari Red and Boer cross goats. Ideal for herd expansion or healthy organic meat.',
    price: 75.00,
    unit: 'head',
    quantityAvailable: 14,
    minOrderQuantity: 1,
    images: [
      'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Midlands',
      city: 'Gweru',
      community: 'Thornhill Farmlands'
    },
    availability: 'available',
    isOrganic: true,
    featured: false,
    rating: 5.0,
    reviewsCount: 4,
    additionalNotes: 'Veterinary health clearance certificates provided on collection.',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-19T11:00:00Z'
  },
  {
    id: 'prod-13',
    farmerId: 'farmer-2',
    farmerName: 'Chipo Sibanda',
    farmerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    farmName: 'Sunrise Pastoral & Poultry',
    name: 'Kuroiler x Roadrunner F1 Crossbreed Breeding Pullets & Cockerels',
    category: 'cat-breeding',
    categoryName: 'Breeding (Crossbreeds & Hybrids)',
    description: 'High-vitality F1 hybrid cross between dual-purpose Kuroiler genetics and indigenous resilient roadrunners. High egg laying capacity (220+ eggs/year), strong disease immunity, superior scavenging capability, and rapid meat maturity.',
    price: 9.50,
    unit: 'bird',
    quantityAvailable: 45,
    minOrderQuantity: 2,
    images: [
      'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Midlands',
      city: 'Gweru',
      community: 'Thornhill Farmlands'
    },
    availability: 'available',
    isOrganic: true,
    featured: true,
    rating: 4.9,
    reviewsCount: 11,
    additionalNotes: 'Fully vaccinated for Newcastle disease, Gumboro, and Fowl Pox. De-beaked and ready for free-range breeding.',
    createdAt: '2026-08-20T09:00:00Z',
    updatedAt: '2026-08-28T14:00:00Z'
  },
  {
    id: 'prod-14',
    farmerId: 'farmer-1',
    farmerName: 'Tendai Moyo',
    farmerAvatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
    farmName: 'GreenFields Organic Farm',
    name: 'Pure Boer x Mashona Cross Breeding Buck (Proven Sire Genetics)',
    category: 'cat-breeding',
    categoryName: 'Breeding (Crossbreeds & Hybrids)',
    description: 'First-generation Boer x Mashona hybrid breeding buck (14 months old). Combines the thick muscular frame and rapid growth genetics of South African Boer goats with the tick-resistance, heat tolerance, and hardiness of indigenous Mashona goats.',
    price: 135.00,
    unit: 'head',
    quantityAvailable: 5,
    minOrderQuantity: 1,
    images: [
      'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Mashonaland East',
      city: 'Marondera',
      community: 'Ruzawi Valley'
    },
    availability: 'available',
    isOrganic: true,
    featured: true,
    rating: 5.0,
    reviewsCount: 7,
    additionalNotes: 'Ear-tagged, dewormed, and vetted with complete herd pedigree records.',
    createdAt: '2026-08-18T10:00:00Z',
    updatedAt: '2026-08-27T12:00:00Z'
  },
  {
    id: 'prod-15',
    farmerId: 'farmer-3',
    farmerName: 'Farai Ndlovu',
    farmerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    farmName: 'Highlands Fruit & Dairy Estate',
    name: 'Brahman x Simmental Cross Heifer (F1 Hybrid Breeding Stock)',
    category: 'cat-breeding',
    categoryName: 'Breeding (Crossbreeds & Hybrids)',
    description: 'Top-tier F1 cross heifer showing remarkable hybrid vigor (heterosis). Exceptional daily weight gain, high milk yield potential for calves, superior foraging efficiency on veld pasture, and high tolerance to humid heat.',
    price: 480.00,
    unit: 'head',
    quantityAvailable: 3,
    minOrderQuantity: 1,
    images: [
      'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Manicaland',
      city: 'Mutare',
      community: 'Vumba Highlands'
    },
    availability: 'available',
    isOrganic: true,
    featured: false,
    rating: 4.9,
    reviewsCount: 3,
    additionalNotes: 'TB tested, Anthrax & Blackleg vaccinated. Sire breeding history available.',
    createdAt: '2026-08-15T08:00:00Z',
    updatedAt: '2026-08-26T16:00:00Z'
  },
  {
    id: 'prod-16',
    farmerId: 'farmer-1',
    farmerName: 'Tendai Moyo',
    farmerAvatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
    farmName: 'GreenFields Organic Farm',
    name: 'SC719 Certified Climate-Resilient Hybrid Seed Maize (50kg Bag)',
    category: 'cat-breeding',
    categoryName: 'Breeding (Crossbreeds & Hybrids)',
    description: 'Certified three-way hybrid white dent seed maize. Engineered for remarkable drought resilience, high double-cobbing propensity, and exceptional grain yields exceeding 10-12 tonnes per hectare under good agronomic practice.',
    price: 68.00,
    unit: 'bag_50kg',
    quantityAvailable: 40,
    minOrderQuantity: 1,
    images: [
      'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=800'
    ],
    location: {
      province: 'Mashonaland East',
      city: 'Marondera',
      community: 'Ruzawi Valley'
    },
    availability: 'available',
    isOrganic: false,
    featured: true,
    rating: 5.0,
    reviewsCount: 15,
    additionalNotes: 'Pre-treated with fungicide and insecticide seed coating for superior germination vigor.',
    createdAt: '2026-08-22T11:00:00Z',
    updatedAt: '2026-08-29T10:00:00Z'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'AGC-26-8801',
    buyerId: 'buyer-1',
    buyerName: 'Grace Chidzero',
    buyerPhone: '+263 77 654 3210',
    buyerEmail: 'grace.chidzero@gmail.com',
    farmerId: 'farmer-1',
    farmerName: 'Tendai Moyo',
    farmName: 'GreenFields Organic Farm',
    items: [
      {
        productId: 'prod-1',
        productName: 'Vine-Ripened Roma Tomatoes (Grade A)',
        productImage: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
        price: 1.50,
        unit: 'kg',
        quantity: 10,
        subtotal: 15.00
      },
      {
        productId: 'prod-2',
        productName: 'Pure Raw Wildflower Forest Honey',
        productImage: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800',
        price: 8.00,
        unit: 'liter',
        quantity: 2,
        subtotal: 16.00
      }
    ],
    totalAmount: 31.00,
    status: 'completed',
    deliveryMethod: 'delivery',
    deliveryAddress: '22 King George Road, Avondale, Harare',
    buyerNotes: 'Please ring the front gate bell on arrival.',
    farmerNotes: 'Freshly harvested this morning and packed with care.',
    createdAt: '2026-08-22T10:15:00Z',
    updatedAt: '2026-08-23T15:30:00Z',
    statusHistory: [
      { status: 'pending', timestamp: '2026-08-22T10:15:00Z', note: 'Order placed by buyer' },
      { status: 'accepted', timestamp: '2026-08-22T11:00:00Z', note: 'Farmer accepted the order' },
      { status: 'preparing', timestamp: '2026-08-23T06:30:00Z', note: 'Harvesting and packing' },
      { status: 'out_for_delivery', timestamp: '2026-08-23T12:00:00Z', note: 'Dispatched via AgriRoute Express' },
      { status: 'completed', timestamp: '2026-08-23T15:30:00Z', note: 'Delivered and received in good condition' }
    ],
    isReviewed: true
  },
  {
    id: 'ord-1002',
    orderNumber: 'AGC-26-8802',
    buyerId: 'buyer-1',
    buyerName: 'Grace Chidzero',
    buyerPhone: '+263 77 654 3210',
    buyerEmail: 'grace.chidzero@gmail.com',
    farmerId: 'farmer-2',
    farmerName: 'Chipo Sibanda',
    farmName: 'Sunrise Pastoral & Poultry',
    items: [
      {
        productId: 'prod-3',
        productName: 'Fresh Farm Table Eggs (Tray of 30)',
        productImage: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=800',
        price: 4.50,
        unit: 'tray',
        quantity: 4,
        subtotal: 18.00
      },
      {
        productId: 'prod-4',
        productName: 'Whole Dressed Broiler Chicken',
        productImage: 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=800',
        price: 6.50,
        unit: 'piece',
        quantity: 2,
        subtotal: 13.00
      }
    ],
    totalAmount: 31.00,
    status: 'ready_for_collection',
    deliveryMethod: 'pickup',
    pickupTimeWindow: 'Today between 14:00 - 17:00 at Thornhill Farm gate',
    buyerNotes: 'Collecting in a chilled cooler box in my car.',
    createdAt: '2026-08-25T14:00:00Z',
    updatedAt: '2026-08-26T04:30:00Z',
    statusHistory: [
      { status: 'pending', timestamp: '2026-08-25T14:00:00Z', note: 'Order placed by buyer' },
      { status: 'accepted', timestamp: '2026-08-25T14:45:00Z', note: 'Farmer accepted order' },
      { status: 'preparing', timestamp: '2026-08-26T03:00:00Z', note: 'Packing eggs and chilling broilers' },
      { status: 'ready_for_collection', timestamp: '2026-08-26T04:30:00Z', note: 'Order ready at pickup stand' }
    ]
  },
  {
    id: 'ord-1003',
    orderNumber: 'AGC-26-8803',
    buyerId: 'buyer-2',
    buyerName: 'Kudakwashe Mataruse',
    buyerPhone: '+263 77 999 1122',
    buyerEmail: 'kuda.restocatering@gmail.com',
    farmerId: 'farmer-1',
    farmerName: 'Tendai Moyo',
    farmName: 'GreenFields Organic Farm',
    items: [
      {
        productId: 'prod-1',
        productName: 'Vine-Ripened Roma Tomatoes (Grade A)',
        productImage: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
        price: 1.50,
        unit: 'kg',
        quantity: 40,
        subtotal: 60.00
      },
      {
        productId: 'prod-8',
        productName: 'Crisp Bell Peppers (Tricolor Mix)',
        productImage: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&q=80&w=800',
        price: 2.20,
        unit: 'kg',
        quantity: 15,
        subtotal: 33.00
      }
    ],
    totalAmount: 93.00,
    status: 'pending',
    deliveryMethod: 'delivery',
    deliveryAddress: 'Shop 12 Borrowdale Village, Harare',
    buyerNotes: 'For restaurant weekend prep. Early morning delivery preferred.',
    createdAt: '2026-08-26T04:00:00Z',
    updatedAt: '2026-08-26T04:00:00Z',
    statusHistory: [
      { status: 'pending', timestamp: '2026-08-26T04:00:00Z', note: 'Awaiting farmer acceptance' }
    ]
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    orderId: 'ord-1001',
    productId: 'prod-1',
    farmerId: 'farmer-1',
    buyerId: 'buyer-1',
    buyerName: 'Grace Chidzero',
    buyerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    rating: 5,
    qualityRating: 5,
    communicationRating: 5,
    deliveryRating: 5,
    comment: 'Exceptional quality! The Roma tomatoes were so flavorful and firm, miles ahead of supermarket stock. The wildflower honey is sublime. Farmer Tendai kept me updated throughout.',
    createdAt: '2026-08-24T08:30:00Z',
    farmerResponse: 'Thank you so much Grace! We take pride in chemical-free cultivation. Looking forward to your next harvest order!'
  },
  {
    id: 'rev-2',
    orderId: 'ord-prev-1',
    productId: 'prod-3',
    farmerId: 'farmer-2',
    buyerId: 'buyer-2',
    buyerName: 'Kudakwashe Mataruse',
    buyerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    rating: 5,
    qualityRating: 5,
    communicationRating: 5,
    deliveryRating: 4,
    comment: 'The egg quality is consistently top tier for our catering bakery. Yolks are vibrant and rich. Chipo is very professional and responsive.',
    createdAt: '2026-08-19T14:15:00Z',
    farmerResponse: 'Much appreciated Chef Kuda! Always glad to supply your kitchen.'
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    participants: [
      {
        id: 'buyer-1',
        name: 'Grace Chidzero',
        role: 'buyer',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 'farmer-1',
        name: 'Tendai Moyo',
        role: 'farmer',
        avatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
        farmName: 'GreenFields Organic Farm'
      }
    ],
    lastMessage: 'Good day Grace! Your tomatoes have been carefully sorted and will arrive early afternoon.',
    lastMessageTime: '2026-08-23T11:45:00Z',
    unreadCountFor: {
      'buyer-1': 0,
      'farmer-1': 0
    },
    productId: 'prod-1',
    productName: 'Vine-Ripened Roma Tomatoes (Grade A)',
    orderId: 'ord-1001'
  },
  {
    id: 'conv-2',
    participants: [
      {
        id: 'buyer-1',
        name: 'Grace Chidzero',
        role: 'buyer',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: 'farmer-2',
        name: 'Chipo Sibanda',
        role: 'farmer',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
        farmName: 'Sunrise Pastoral & Poultry'
      }
    ],
    lastMessage: 'Hi Chipo, I will be picking up the egg trays around 3:30 PM today.',
    lastMessageTime: '2026-08-26T05:00:00Z',
    unreadCountFor: {
      'farmer-2': 1,
      'buyer-1': 0
    },
    productId: 'prod-3',
    productName: 'Fresh Farm Table Eggs (Tray of 30)',
    orderId: 'ord-1002'
  }
];

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'buyer-1',
    senderName: 'Grace Chidzero',
    senderRole: 'buyer',
    text: 'Hello Mr. Moyo! Are these tomatoes suitable for slow simmering pasta sauce?',
    createdAt: '2026-08-22T09:30:00Z',
    read: true,
    productId: 'prod-1',
    productSnippet: {
      name: 'Vine-Ripened Roma Tomatoes (Grade A)',
      price: 1.50,
      unit: 'kg',
      image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800'
    }
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    senderId: 'farmer-1',
    senderName: 'Tendai Moyo',
    senderRole: 'farmer',
    text: 'Hello Grace! Absolutely. Roma tomatoes have a dense meat and very low water content compared to round table tomatoes, making them optimal for pastes and sauces.',
    createdAt: '2026-08-22T09:40:00Z',
    read: true
  },
  {
    id: 'msg-3',
    conversationId: 'conv-1',
    senderId: 'farmer-1',
    senderName: 'Tendai Moyo',
    senderRole: 'farmer',
    text: 'Good day Grace! Your tomatoes have been carefully sorted and will arrive early afternoon.',
    createdAt: '2026-08-23T11:45:00Z',
    read: true
  },
  {
    id: 'msg-4',
    conversationId: 'conv-2',
    senderId: 'buyer-1',
    senderName: 'Grace Chidzero',
    senderRole: 'buyer',
    text: 'Hi Chipo, I will be picking up the egg trays around 3:30 PM today.',
    createdAt: '2026-08-26T05:00:00Z',
    read: false,
    productId: 'prod-3',
    productSnippet: {
      name: 'Fresh Farm Table Eggs (Tray of 30)',
      price: 4.50,
      unit: 'tray',
      image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=800'
    }
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    userId: 'buyer-1',
    title: 'Order Status Update: Ready for Collection',
    message: 'Your order #AGC-26-8802 with Sunrise Pastoral & Poultry is now ready for pickup.',
    type: 'order',
    link: '/orders/ord-1002',
    read: false,
    createdAt: '2026-08-26T04:30:00Z',
    metadata: { orderId: 'ord-1002' }
  },
  {
    id: 'notif-2',
    userId: 'farmer-1',
    title: 'New Order Received! (#AGC-26-8803)',
    message: 'Kudakwashe Mataruse placed an order for 40kg Roma Tomatoes & 15kg Bell Peppers ($93.00).',
    type: 'order',
    link: '/orders/ord-1003',
    read: false,
    createdAt: '2026-08-26T04:00:00Z',
    metadata: { orderId: 'ord-1003' }
  },
  {
    id: 'notif-3',
    userId: 'farmer-2',
    title: 'New Message from Grace Chidzero',
    message: '"Hi Chipo, I will be picking up the egg trays around 3:30 PM today."',
    type: 'message',
    link: '/messages/conv-2',
    read: false,
    createdAt: '2026-08-26T05:00:00Z',
    metadata: { conversationId: 'conv-2' }
  },
  {
    id: 'notif-4',
    userId: 'buyer-1',
    title: 'Marketplace Announcement',
    message: 'Welcome to AgriConnect 2026 Spring Harvest Season with direct farmer-to-door deliveries!',
    type: 'announcement',
    read: true,
    createdAt: '2026-08-20T08:00:00Z'
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: '🌿 Welcome to agroX Marketplace: Direct Spring Harvest Season 2026',
    content: 'We are thrilled to welcome all local farmers and buyers to agroX. Our platform connects regional farming cooperatives directly with conscious household and wholesale buyers with guaranteed zero middlemen markups and maximum harvest freshness.',
    priority: 'normal',
    targetAudience: 'all',
    author: 'agroX Admin Team',
    authorRole: 'admin',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    createdAt: '2026-08-20T08:00:00Z',
    active: true,
    category: 'platform',
    pinned: true,
    likesCount: 24,
    reactions: { '👍': 18, '❤️': 12, '🌱': 15 }
  },
  {
    id: 'ann-2',
    title: '🚛 Cold-Chain Subsidized Routes for Registered Farmers',
    content: 'Producers in Mashonaland and Midlands can now book subsidized refrigerated collection routes every Tuesday and Friday through the AgriRoute cold-chain initiative. Keep perishables fresh from farm gate to door!',
    priority: 'urgent',
    targetAudience: 'farmers',
    author: 'Agricultural Logistics Board',
    authorRole: 'admin',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    createdAt: '2026-08-24T10:00:00Z',
    active: true,
    category: 'logistics',
    pinned: false,
    likesCount: 19,
    reactions: { '👍': 14, '🚛': 9 }
  },
  {
    id: 'ann-3',
    title: '🌧️ Regional Weather & Rainfall Advisory for Midlands & Manicaland',
    content: 'Scattered early showers are forecast across eastern highlands and central valleys this weekend. Buyers are advised to place weekend produce orders in advance to prevent road haulage delays.',
    priority: 'normal',
    targetAudience: 'all',
    author: 'AgriMeteorology Desk',
    authorRole: 'admin',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    createdAt: '2026-08-28T07:30:00Z',
    active: true,
    category: 'weather',
    pinned: false,
    likesCount: 15,
    reactions: { '🌧️': 11, '👍': 8 }
  }
];

export const INITIAL_REPORTS: Report[] = [
  {
    id: 'rep-1',
    reporterId: 'buyer-2',
    reporterName: 'Kudakwashe Mataruse',
    reportedItemId: 'prod-7',
    itemType: 'product',
    itemTitle: 'Sweet Yellow Field Maize (50kg Bag)',
    reason: 'misleading_info',
    description: 'Inquired if the grain was suitable for seed planting, farmer clarified it was for milling only. Suggested updating description notes for clarity.',
    status: 'resolved',
    adminNotes: 'Contacted farmer to clarify seed vs milling distinction in product specs.',
    createdAt: '2026-08-15T11:00:00Z'
  }
];

export const INITIAL_AD_REQUESTS: AdRequest[] = [
  {
    id: 'ad-101',
    farmerId: 'farmer-1',
    farmerName: 'Tendai Moyo',
    farmerAvatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
    farmName: 'GreenFields Organic Farm',
    farmerEmail: 'tendai.moyo@greenfields.co.zw',
    farmerPhone: '+263 77 234 5678',
    productId: 'prod-1',
    productName: 'Vine-Ripened Roma Tomatoes (Grade A)',
    productImage: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
    productPrice: 1.50,
    productUnit: 'kg',
    category: 'cat-veg',
    categoryName: 'Vegetables',
    dealHeadline: '🔥 Flash Sale: 25% Off Fresh Roma Tomatoes!',
    dealDescription: 'Plump, dense farm-picked Roma tomatoes on special discount this week. Ideal for restaurants, sauce makers, and bulk family canning.',
    discountPercentage: 25,
    specialPrice: 1.12,
    days: 14,
    dailyRate: 1.00,
    totalAmount: 14.00,
    proofOfPaymentUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
    proofOfPaymentFileName: 'EcoCash_Txn_EC88912_TendaiMoyo.jpg',
    paymentMethod: 'ecocash',
    paymentReference: 'EC88912-7741',
    status: 'approved',
    adminFeedback: 'Proof of payment verified via EcoCash Merchant. Campaign is active and featured on the Hot Deals banner!',
    reviewedBy: 'Admin - agroX Team',
    reviewedAt: '2026-08-25T10:00:00Z',
    startDate: '2026-08-25T00:00:00Z',
    endDate: '2026-09-08T23:59:59Z',
    createdAt: '2026-08-24T16:00:00Z',
    updatedAt: '2026-08-25T10:00:00Z'
  },
  {
    id: 'ad-102',
    farmerId: 'farmer-2',
    farmerName: 'Chipo Sibanda',
    farmerAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    farmName: 'Sunrise Pastoral & Poultry',
    farmerEmail: 'chipo@sunrisepoultry.co.zw',
    farmerPhone: '+263 71 890 1234',
    productId: 'prod-13',
    productName: 'Kuroiler x Roadrunner F1 Crossbreed Breeding Pullets & Cockerels',
    productImage: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=800',
    productPrice: 9.50,
    productUnit: 'bird',
    category: 'cat-breeding',
    categoryName: 'Breeding (Crossbreeds & Hybrids)',
    dealHeadline: '🐓 Special Breeding Trio Deal: High-Vigor F1 Kuroiler × Roadrunners',
    dealDescription: 'Ready-to-lay F1 hybrid pullets and hardy breeding cockerels. High disease tolerance and 220+ egg yield annually!',
    discountPercentage: 15,
    specialPrice: 8.00,
    days: 7,
    dailyRate: 1.00,
    totalAmount: 7.00,
    proofOfPaymentUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&q=80&w=800',
    proofOfPaymentFileName: 'InnBucks_Receipt_INB990412.png',
    paymentMethod: 'innbucks',
    paymentReference: 'INB990412-CS',
    status: 'approved',
    adminFeedback: 'Approved! Verified by InnBucks statement.',
    reviewedBy: 'Admin - agroX Team',
    reviewedAt: '2026-08-28T09:30:00Z',
    startDate: '2026-08-28T00:00:00Z',
    endDate: '2026-09-04T23:59:59Z',
    createdAt: '2026-08-27T14:30:00Z',
    updatedAt: '2026-08-28T09:30:00Z'
  },
  {
    id: 'ad-103',
    farmerId: 'farmer-1',
    farmerName: 'Tendai Moyo',
    farmerAvatar: 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?auto=format&fit=crop&q=80&w=400',
    farmName: 'GreenFields Organic Farm',
    farmerEmail: 'tendai.moyo@greenfields.co.zw',
    farmerPhone: '+263 77 234 5678',
    productId: 'prod-4',
    productName: 'Sweet Yellow Bell Peppers (Capsicum)',
    productImage: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&q=80&w=800',
    productPrice: 2.20,
    productUnit: 'kg',
    category: 'cat-veg',
    categoryName: 'Vegetables',
    dealHeadline: '🫑 Crisp Greenhouse Bell Peppers Wholesale Promo',
    dealDescription: 'Farm fresh sweet capsicums harvested same-day.',
    discountPercentage: 20,
    specialPrice: 1.76,
    days: 5,
    dailyRate: 1.00,
    totalAmount: 5.00,
    proofOfPaymentUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800',
    proofOfPaymentFileName: 'EcoCash_Txn_EC91244.jpg',
    paymentMethod: 'ecocash',
    paymentReference: 'EC91244-88',
    status: 'under_review',
    adminFeedback: 'Proof of payment is being checked with the finance department.',
    createdAt: '2026-08-30T11:00:00Z',
    updatedAt: '2026-08-30T11:30:00Z'
  }
];

