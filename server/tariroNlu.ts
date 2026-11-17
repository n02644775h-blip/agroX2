export interface ConversationContextSlots {
  activeCrop?: string;
  activeLivestock?: string;
  activeRegion?: string;
  activeTopic?: string;
}

export interface NluAnalysisResult {
  originalQuery: string;
  normalizedQuery: string;
  effectiveQuery: string;
  usedHistoryContext: boolean;
  resolvedContext: ConversationContextSlots;
  correctedTerms: string[];
  domainTokens: string[];
  expandedTokens: string[];
  classifiedTopic: string | null;
  topicConfidence: number;
  isMarketplaceIntent: boolean;
  isCategoryBrowse: boolean;
  clarifyingQuestions: string[];
}

export const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'was',
  'were', 'with', 'how', 'what', 'when', 'where', 'which', 'who', 'why', 'can', 'do',
  'does', 'did', 'i', 'you', 'we', 'they', 'my', 'your', 'our', 'their', 'from', 'at', 'by',
  'it', 'its', 'this', 'that', 'these', 'those', 'be', 'being', 'been', 'as', 'about',
  'have', 'has', 'had', 'will', 'would', 'should', 'could', 'please', 'tell', 'give',
  'need', 'want', 'some', 'any', 'more', 'much', 'many', 'there', 'here', 'them', 'also',
  'explain', 'describe', 'guide', 'steps', 'step', 'mean', 'means', 'difference', 'between',
  'sei', 'ne', 'pa', 'mu', 'ku', 'kuti', 'zvakadii', 'ndeipi', 'chii', 'njani', 'uku',
  'kunjani', 'nginga', 'ndinga', 'zviri', 'chiri', 'kuyini', 'okuyini', 'khathesi', 'izvozvi',
  'kana', 'loba', 'kumbe', 'nxa', 'uye', 'zvakanaka', 'kahle', 'yini', 'ani'
]);

export const GENERIC_NON_TOPIC_TOKENS = new Set([
  'farmbridge', 'kufarmbridge', 'pafarmbridge', 'mufarmbridge', 'agriconnect',
  'available', 'listed', 'listing', 'listings', 'marketplace', 'emakethe', 'musika',
  'market', 'price', 'prices', 'cost', 'buy', 'sell', 'selling', 'buying', 'sale', 'show', 'find',
  'kutengeswa', 'kutenga', 'kutengesa', 'okuthengiswayo', 'mutengo', 'mtengo', 'malini',
  'farm', 'farms', 'farmer', 'farmers', 'seller', 'sellers', 'producer', 'producers',
  'product', 'products', 'produce', 'categories', 'category', 'right', 'now', 'today',
  'best', 'good', 'practice', 'practices', 'manage', 'management', 'grow', 'growing',
  'zimbabwe', 'zimbabwean', 'control', 'prevent', 'prevention', 'use', 'using', 'used',
  'work', 'works', 'help', 'plant', 'planting', 'raise', 'raising', 'keep', 'keeping',
  'start', 'starting', 'make', 'making', 'apply', 'applying', 'improve', 'improving',
  'way', 'ways', 'tip', 'tips', 'proper', 'properly', 'common', 'cause', 'causes'
]);

// Valid non-agri English words >= 5 chars that should never be fuzzy-mutated into agri words
const COMMON_VALID_NON_AGRI_WORDS = new Set([
  'predict', 'exchange', 'forex', 'python', 'screen', 'repair', 'iphone', 'laptop',
  'bitcoin', 'crypto', 'soccer', 'football', 'winner', 'final', 'capital', 'brazil',
  'physics', 'quantum', 'particle', 'human', 'chest', 'antibiotic', 'antibiotics',
  'diagnose', 'combine', 'harvester', 'helicopter', 'machine', 'aircraft', 'tomorrow',
  'yesterday', 'compare', 'difference', 'shortage', 'shortages', 'prevent', 'precaution',
  'precautions', 'safely', 'healthy', 'clean', 'vital', 'faster', 'across', 'rotated'
]);

// Broad cross-language & domain synonym map (English, Shona, Ndebele, Zim agronomy)
export const AGRI_SYNONYMS: Record<string, string[]> = {
  // Cereals & Cash Crops
  crop: ['crops', 'agronomy', 'zvirimwa', 'izilimo', 'establishment', 'germination', 'population'],
  maize: ['chibage', 'umbila', 'umumbu', 'corn', 'mealies', 'cereal', 'pfumvudza', 'intwasa'],
  chibage: ['maize', 'umbila', 'umumbu', 'pfumvudza'],
  umbila: ['maize', 'chibage', 'umumbu', 'intwasa', 'pfumvudza'],
  umumbu: ['maize', 'chibage', 'umbila', 'intwasa', 'pfumvudza'],
  tobacco: ['fodya', 'igwayi', 'flue', 'seedbed', 'curing', 'float', 'topping', 'suckering', 'timb', 'kutsaga'],
  fodya: ['tobacco', 'igwayi', 'curing'],
  igwayi: ['tobacco', 'fodya', 'curing'],
  soya: ['soyabean', 'soyabeans', 'soybean', 'soybeans', 'legume', 'inoculant', 'rhizobium', 'nodules'],
  soyabean: ['soya', 'soybean', 'soybeans', 'legume', 'inoculant', 'rhizobium'],
  soybean: ['soya', 'soyabean', 'soybeans', 'legume', 'inoculant', 'rhizobium'],
  wheat: ['gorosi', 'ingqoloyi', 'winter', 'tillering', 'rust', 'combine', 'quelea'],
  gorosi: ['wheat', 'ingqoloyi', 'winter'],
  ingqoloyi: ['wheat', 'gorosi', 'winter'],
  cotton: ['donje', 'utshinda', 'bollworm', 'lint', 'pegboard', 'jassid', 'jassids'],
  donje: ['cotton', 'utshinda', 'bollworm', 'lint'],
  utshinda: ['cotton', 'donje', 'bollworm', 'lint'],
  sorghum: ['mapfunde', 'amabele', 'drought', 'small', 'grain', 'grains'],
  mapfunde: ['sorghum', 'amabele', 'drought'],
  amabele: ['sorghum', 'mapfunde', 'drought'],
  millet: ['mhunga', 'rapoko', 'rukweza', 'inyawuthi', 'ophoko', 'drought', 'small', 'grains'],
  mhunga: ['millet', 'rapoko', 'sorghum', 'drought'],
  rapoko: ['millet', 'mhunga', 'rukweza', 'drought'],
  groundnut: ['groundnuts', 'nzungu', 'amazambane', 'peanut', 'peanuts', 'aflatoxin', 'legume'],
  nzungu: ['groundnut', 'groundnuts', 'amazambane', 'peanut', 'aflatoxin'],
  amazambane: ['groundnut', 'groundnuts', 'nzungu', 'peanut'],
  cowpea: ['cowpeas', 'nyemba', 'indumba', 'legume', 'striga', 'mufushwa'],

  // Horticulture, Vegetables & Fruits
  horticulture: ['nursery', 'seedling', 'tray', 'greenhouse', 'staggered', 'shadenet', 'vegetable', 'fruit'],
  vegetable: ['vegetables', 'muriwo', 'tomato', 'covo', 'rape', 'cabbage', 'onion', 'potato', 'butternut'],
  muriwo: ['vegetable', 'vegetables', 'covo', 'rape', 'cabbage', 'greens', 'horticulture'],
  tomato: ['tomatoes', 'madomasi', 'itamatisi', 'roma', 'trellis', 'blossom', 'tuta', 'blight'],
  madomasi: ['tomato', 'tomatoes', 'itamatisi'],
  itamatisi: ['tomato', 'tomatoes', 'madomasi'],
  covo: ['vegetable', 'rape', 'kale', 'brassica', 'muriwo', 'aphid'],
  rape: ['vegetable', 'covo', 'brassica', 'muriwo'],
  cabbage: ['vegetable', 'brassica', 'diamondback', 'muriwo'],
  onion: ['onions', 'hanyanisi', 'ihanyanisi', 'bulb', 'curing', 'allium'],
  potato: ['potatoes', 'mbambaira', 'matapiri', 'amazambane', 'tuber', 'ridging', 'blight'],
  fruit: ['fruits', 'orchard', 'citrus', 'mango', 'banana', 'avocado', 'apple', 'peach', 'orange', 'lemon', 'grafted', 'michero', 'izithelo'],
  michero: ['fruit', 'fruits', 'orchard', 'citrus', 'mango', 'banana'],
  izithelo: ['fruit', 'fruits', 'orchard', 'citrus', 'mango', 'banana'],
  citrus: ['orange', 'lemon', 'naartjie', 'fruit', 'orchard', 'grafted'],
  mango: ['fruit', 'orchard', 'grafted', 'fruitfly'],
  banana: ['fruit', 'orchard', 'sucker', 'tissue'],
  avocado: ['fruit', 'orchard', 'grafted'],

  // Livestock & Fodder
  livestock: ['zvipfuyo', 'izifuyo', 'cattle', 'poultry', 'goat', 'sheep', 'pig', 'fodder', 'veterinary', 'biosecurity'],
  zvipfuyo: ['livestock', 'huku', 'mombe', 'mbudzi', 'nguruve'],
  izifuyo: ['livestock', 'inkukhu', 'inkomo', 'imbuzi', 'ingulube'],
  poultry: ['chicken', 'chickens', 'broiler', 'broilers', 'layer', 'layers', 'roadrunner', 'huku', 'inkukhu', 'izinkukhu', 'egg', 'eggs', 'brooding', 'newcastle', 'gumboro', 'fcr'],
  chicken: ['poultry', 'broiler', 'layer', 'roadrunner', 'huku', 'inkukhu', 'brooding'],
  broiler: ['poultry', 'chicken', 'starter', 'grower', 'finisher', 'fcr', 'brooding', 'huku', 'inkukhu'],
  layer: ['poultry', 'chicken', 'egg', 'eggs', 'mash', 'point', 'huku', 'inkukhu'],
  roadrunner: ['poultry', 'indigenous', 'boschveld', 'sasso', 'chicken', 'huku'],
  huku: ['poultry', 'chicken', 'broiler', 'layer', 'inkukhu', 'eggs'],
  inkukhu: ['poultry', 'chicken', 'broiler', 'layer', 'huku', 'eggs'],
  izinkukhu: ['poultry', 'chicken', 'broiler', 'layer', 'huku', 'inkukhu'],
  cattle: ['beef', 'dairy', 'cow', 'cows', 'milk', 'mombe', 'inkomo', 'izinkomo', 'dipping', 'tick', 'theileriosis', 'january', 'mastitis'],
  dairy: ['cattle', 'cow', 'milk', 'mastitis', 'silage', 'lactating'],
  beef: ['cattle', 'cow', 'mashona', 'tuli', 'brahman', 'dipping'],
  mombe: ['cattle', 'inkomo', 'izinkomo', 'beef', 'dairy', 'dipping'],
  inkomo: ['cattle', 'mombe', 'izinkomo', 'beef', 'dairy', 'dipping'],
  izinkomo: ['cattle', 'mombe', 'inkomo', 'beef', 'dairy'],
  goat: ['goats', 'boer', 'matebele', 'mbudzi', 'imbuzi', 'ruminant', 'slatted', 'footrot', 'browse'],
  sheep: ['dorper', 'persian', 'hwai', 'imvu', 'izimvu', 'ruminant', 'lamb', 'ram', 'ewe', 'pulpy'],
  mbudzi: ['goat', 'goats', 'sheep', 'imbuzi'],
  imbuzi: ['goat', 'goats', 'sheep', 'mbudzi'],
  hwai: ['sheep', 'goat', 'dorper', 'imvu'],
  imvu: ['sheep', 'goat', 'dorper', 'hwai'],
  pig: ['pigs', 'pork', 'swine', 'sow', 'piglet', 'nguruve', 'ingulube', 'asf', 'swill', 'piggery', 'farrowing'],
  pork: ['pig', 'pigs', 'swine', 'nguruve', 'ingulube'],
  nguruve: ['pig', 'pigs', 'pork', 'ingulube', 'asf'],
  ingulube: ['pig', 'pigs', 'pork', 'nguruve', 'asf'],
  fodder: ['hay', 'silage', 'lucerne', 'katambora', 'stover', 'stockfeed', 'feed', 'bale', 'forage'],
  hay: ['fodder', 'bale', 'katambora', 'lucerne', 'silage'],
  silage: ['fodder', 'maize', 'sorghum', 'stover', 'hay'],

  // Soil, Fertility, pH, Lime & Fertilisers
  soil: ['ivhu', 'umhlabathi'],
  ivhu: ['soil', 'umhlabathi', 'fertility', 'lime', 'ph'],
  umhlabathi: ['soil', 'ivhu', 'fertility', 'lime', 'ph'],
  fertility: ['nutrient', 'nutrients', 'npk', 'nitrogen', 'phosphorus', 'potassium', 'manure', 'compost', 'isfm', 'deficiency'],
  nutrient: ['nutrients', 'npk', 'nitrogen', 'phosphorus', 'potassium', 'zinc', 'boron', 'sulphur', 'fertility'],
  ph: ['acid', 'acidic', 'acidity', 'lime', 'dolomitic', 'calcitic', 'cacl2', 'sour', 'aluminium'],
  acidic: ['ph', 'acidity', 'acid', 'lime', 'dolomitic', 'calcitic', 'sour'],
  acid: ['acidic', 'acidity', 'ph', 'lime', 'dolomitic', 'calcitic'],
  lime: ['liming', 'dolomitic', 'calcitic', 'ph', 'acidic', 'acidity', 'calcium', 'magnesium'],
  fertiliser: ['fertilizer', 'fetiraiza', 'umanyolo', 'compound', 'ammonium', 'nitrate', 'urea', 'basal', 'topdressing', 'leaching', 'volatilisation', '4r'],
  fertilizer: ['fertiliser', 'fetiraiza', 'umanyolo', 'compound', 'ammonium', 'nitrate', 'urea', 'basal'],
  fetiraiza: ['fertiliser', 'fertilizer', 'umanyolo', 'compound', 'urea'],
  umanyolo: ['fertiliser', 'fertilizer', 'fetiraiza', 'manure', 'compound', 'urea'],
  urea: ['nitrogen', 'topdressing', 'volatilisation', 'fertiliser', 'ammonium'],
  manure: ['compost', 'kraal', 'organic', 'fertility', 'soil', 'manyowa'],
  compost: ['manure', 'organic', 'fertility', 'soil'],

  // Water & Irrigation (keep plain 'water' neutral so livestock water troughs are not pulled into crop irrigation)
  irrigation: ['irrigating', 'irrigate', 'drip', 'sprinkler', 'furrow', 'borehole', 'solar', 'fertigation', 'scheduling', 'mvura', 'amanzi'],
  irrigate: ['irrigation', 'irrigating', 'drip', 'sprinkler', 'water'],
  irrigating: ['irrigation', 'irrigate', 'drip', 'sprinkler', 'water'],
  water: ['mvura', 'amanzi', 'moisture', 'hydration'],
  mvura: ['water', 'irrigation', 'amanzi', 'rainwater', 'drip'],
  amanzi: ['water', 'irrigation', 'mvura', 'rainwater', 'drip'],
  drip: ['irrigation', 'water', 'emitter', 'fertigation', 'tomato', 'blight'],
  sprinkler: ['irrigation', 'water', 'wheat', 'pasture'],

  // Pests, Diseases & Weeds
  pest: ['pests', 'ipm', 'scouting', 'armyworm', 'bollworm', 'tuta', 'aphid', 'aphids', 'mite', 'stalkborer', 'tupukanana', 'izinambuzane', 'makonye'],
  disease: ['diseases', 'blight', 'rust', 'streak', 'mosaic', 'newcastle', 'theileriosis', 'coccidiosis', 'asf', 'mastitis', 'footrot', 'anthrax', 'mkhuhlane'],
  armyworm: ['fallarmyworm', 'makonye', 'whorl', 'frass', 'maize', 'pest', 'ipm'],
  blight: ['earlyblight', 'lateblight', 'fungal', 'tomato', 'potato', 'disease', 'drip'],
  aphid: ['aphids', 'honeydew', 'virus', 'streak', 'covo', 'pest'],
  weed: ['weeds', 'weeding', 'masora', 'ukhula', 'ekhulaneni', 'striga', 'witchweed', 'herbicide', 'hoeing', 'mulch'],
  masora: ['weed', 'weeds', 'weeding', 'ukhula', 'striga'],
  ukhula: ['weed', 'weeds', 'weeding', 'masora', 'ekhulaneni'],
  striga: ['witchweed', 'bise', 'weed', 'weeds', 'legume', 'trap', 'rotation'],

  // Conservation, Climate-Smart & Natural Regions
  conservation: ['pfumvudza', 'intwasa', 'minimum', 'zero', 'tillage', 'mulch', 'mulching', 'basins', 'ripline', 'rotation', 'erosion'],
  pfumvudza: ['conservation', 'intwasa', 'maize', 'basins', 'mulch', 'tillage'],
  intwasa: ['conservation', 'pfumvudza', 'maize', 'basins', 'mulch', 'tillage'],
  climate: ['climatesmart', 'drought', 'elnino', 'rainfall', 'region', 'regions', 'sorghum', 'millet', 'msd', 'forecast'],
  drought: ['climate', 'climatesmart', 'sorghum', 'millet', 'mhunga', 'rapoko', 'region4', 'region5', 'conservation', 'mulch'],
  region: ['regions', 'agroecological', 'rainfall', 'natural', 'climate', 'zone'],

  // Economics, Management, Marketing, Post-Harvest & Entrepreneurship
  economics: ['budget', 'gross', 'margin', 'breakeven', 'profit', 'variable', 'fixed', 'cost', 'roi', 'cashflow'],
  budget: ['economics', 'gross', 'margin', 'breakeven', 'profit', 'cost', 'records'],
  profit: ['economics', 'gross', 'margin', 'breakeven', 'budget', 'entrepreneurship', 'marketing'],
  management: ['farm', 'calendar', 'records', 'record', 'cashbook', 'diary', 'labour', 'inventory', 'phi'],
  record: ['records', 'recordkeeping', 'management', 'cashbook', 'diary', 'farm'],
  marketing: ['market', 'grading', 'sorting', 'pricing', 'buyers', 'contracts', 'packaging', 'farmgate', 'farmbridge'],
  grading: ['marketing', 'sorting', 'grade', 'packaging', 'tomato', 'postharvest'],
  postharvest: ['storage', 'drying', 'moisture', 'weevil', 'weevils', 'lgb', 'borer', 'pics', 'hermetic', 'aflatoxin', 'coldchain', 'granary'],
  storage: ['postharvest', 'pics', 'hermetic', 'weevil', 'weevils', 'lgb', 'moisture', 'granary', 'onion'],
  weevil: ['weevils', 'postharvest', 'storage', 'pics', 'hermetic', 'lgb', 'grain'],
  aflatoxin: ['groundnut', 'maize', 'mould', 'moisture', 'drying', 'postharvest'],
  entrepreneurship: ['agripreneur', 'valueaddition', 'processing', 'peanutbutter', 'mufushwa', 'dried', 'diversification', 'scaling', 'workingcapital'],

  // Zimbabwe Geography -> Region Hints
  harare: ['region2', 'highveld'],
  mazowe: ['region2', 'highveld'],
  marondera: ['region2', 'highveld'],
  chinhoyi: ['region2', 'highveld'],
  mutare: ['region1', 'region2', 'highlands'],
  nyanga: ['region1', 'highlands'],
  chipinge: ['region1', 'highlands'],
  gweru: ['region3', 'midlands'],
  kwekwe: ['region3', 'midlands'],
  kadoma: ['region3', 'cotton'],
  gokwe: ['region3', 'region4', 'cotton'],
  bulawayo: ['region4', 'matabeleland'],
  lupane: ['region4', 'matabeleland', 'sorghum'],
  gwanda: ['region4', 'region5', 'goat'],
  masvingo: ['region3', 'region4'],
  chiredzi: ['region5', 'lowveld'],
  beitbridge: ['region5', 'lowveld']
};

// Phrase-level intent expansions for natural alternative farmer phrasing
const PHRASE_EXPANSIONS: Array<{ pattern: RegExp; extraTokens: string[] }> = [
  { pattern: /\b(sour soil|soil is sour|low ph|acidic soil|fertiliser not working)\b/i, extraTokens: ['soil', 'ph', 'acidic', 'lime', 'dolomitic', 'calcitic', 'cacl2'] },
  { pattern: /\b(yellow leaves|yellowing leaves|pale bottom leaves)\b/i, extraTokens: ['nitrogen', 'fertility', 'deficiency', 'maize', 'streak', 'urea'] },
  { pattern: /\b(purple leaves|purplish leaves|stunted seedlings)\b/i, extraTokens: ['phosphorus', 'fertility', 'deficiency', 'acidic', 'lime'] },
  { pattern: /\b(worms eating|holes in leaves|windowpane|frass in whorl|funnel)\b/i, extraTokens: ['fall', 'armyworm', 'stalk', 'borer', 'pest', 'ipm'] },
  { pattern: /\b(black bottom tomato|blossom end rot|rotting tomato bottom)\b/i, extraTokens: ['blossom', 'end', 'rot', 'tomato', 'calcium', 'drip', 'vegetable'] },
  { pattern: /\b(bugs in stored|weevils|moths in grain|rotting stored|storing grain|keep maize after harvest)\b/i, extraTokens: ['postharvest', 'storage', 'pics', 'hermetic', 'moisture', 'lgb', 'weevil'] },
  { pattern: /\b(purple weed|parasitic weed|witchweed|bise)\b/i, extraTokens: ['striga', 'weed', 'rotation', 'legume', 'trap'] },
  { pattern: /\b(chicks huddling|day old chicks|brooding heat|chicks dying)\b/i, extraTokens: ['poultry', 'broiler', 'brooding', 'temperature', 'biosecurity', 'newcastle'] },
  { pattern: /\b(january disease|brown ear tick|cattle ticks|redwater|heartwater)\b/i, extraTokens: ['cattle', 'dipping', 'theileriosis', 'tick', 'veterinary'] },
  { pattern: /\b(swollen hooves|foot rot|lame goat|limping goat|muddy kraal)\b/i, extraTokens: ['goat', 'sheep', 'slatted', 'housing', 'foot', 'rot'] },
  { pattern: /\b(swine fever|swill feeding|pigs dying)\b/i, extraTokens: ['pig', 'african', 'swine', 'fever', 'asf', 'biosecurity'] },
  { pattern: /\b(make profit|losing money|how much cost|cost of production|break even|gross margin)\b/i, extraTokens: ['agricultural', 'economics', 'budget', 'gross', 'margin', 'breakeven', 'profit'] },
  { pattern: /\b(add value|process produce|peanut butter|dried vegetables|mufushwa|start agribusiness)\b/i, extraTokens: ['entrepreneurship', 'value', 'addition', 'processing', 'mufushwa'] },
  { pattern: /\b(grade produce|find buyers|sell direct|avoid middlemen|avoid gluts)\b/i, extraTokens: ['agricultural', 'marketing', 'grading', 'buyers', 'farmbridge'] },
  { pattern: /\b(zero tillage|minimum tillage|mulching|moisture conservation|dry spell)\b/i, extraTokens: ['conservation', 'pfumvudza', 'intwasa', 'mulch', 'tillage'] },
  { pattern: /\b(no rain|low rainfall|semi arid|el nino|drought tolerant|region iv|region 4|region v|region 5)\b/i, extraTokens: ['climate', 'smart', 'natural', 'regions', 'sorghum', 'millet', 'drought'] },
  { pattern: /\b(natural region|agro ecological|agroecological|rainfall zone)\b/i, extraTokens: ['natural', 'regions', 'climate', 'smart', 'zimbabwe'] },
  { pattern: /\b(verify email|proof of payment|buyer request|upload photo|upload video|hot deal)\b/i, extraTokens: ['farmbridge', 'platform', 'guide', 'verify', 'order', 'upload'] }
];

// Topic Classifier Rules -> Official Knowledge Categories
const TOPIC_CLASSIFICATION_RULES: Array<{
  topic: string;
  patterns: RegExp[];
  keywords: string[];
}> = [
  {
    topic: 'Maize Production',
    patterns: [/\b(maize|chibage|umbila|umumbu|mealies|corn)\b/i],
    keywords: ['maize', 'chibage', 'umbila', 'umumbu', 'pfumvudza']
  },
  {
    topic: 'Tobacco Production',
    patterns: [/\b(tobacco|fodya|igwayi|flue cured|float tray|kutsaga|timb|stalk destruction|topping|low chloride)\b/i],
    keywords: ['tobacco', 'fodya', 'igwayi', 'flue', 'cured', 'chloride', 'curing', 'topping']
  },
  {
    topic: 'Soya Bean Production',
    patterns: [/\b(soya|soyabean|soybean|rhizobium|inoculant|nodule|pod shattering)\b/i],
    keywords: ['soya', 'soyabean', 'soybean', 'inoculant', 'rhizobium']
  },
  {
    topic: 'Wheat Production',
    patterns: [/\b(wheat|gorosi|ingqoloyi|tillering|stem rust|winter irrigated wheat)\b/i],
    keywords: ['wheat', 'gorosi', 'ingqoloyi', 'tillering', 'rust']
  },
  {
    topic: 'Cotton Production',
    patterns: [/\b(cotton|donje|utshinda|bollworm|pegboard|lint)\b/i],
    keywords: ['cotton', 'donje', 'utshinda', 'bollworm', 'lint']
  },
  {
    topic: 'Vegetable Production',
    patterns: [/\b(tomato|tomatoes|madomasi|itamatisi|covo|rape|cabbage|onion|onions|potato|potatoes|muriwo|blossom end rot)\b/i],
    keywords: ['tomato', 'covo', 'rape', 'cabbage', 'onion', 'potato', 'vegetable']
  },
  {
    topic: 'Fruit Production',
    patterns: [/\b(fruit|fruits|orchard|citrus|orange|lemon|mango|banana|avocado|apple|peach|macadamia|michero|izithelo)\b/i],
    keywords: ['fruit', 'orchard', 'citrus', 'mango', 'banana', 'avocado']
  },
  {
    topic: 'Horticulture',
    patterns: [/\b(horticulture|seedling tray|nursery|shade net|greenhouse|staggered planting)\b/i],
    keywords: ['horticulture', 'nursery', 'seedling', 'greenhouse']
  },
  {
    topic: 'Poultry Production',
    patterns: [/\b(poultry|chicken|chickens|broiler|broilers|layers|roadrunner|huku|inkukhu|izinkukhu|brooding|newcastle|gumboro)\b/i],
    keywords: ['poultry', 'chicken', 'broiler', 'layer', 'huku', 'inkukhu']
  },
  {
    topic: 'Cattle Production',
    patterns: [/\b(cattle|beef|dairy|cow|cows|milk|mombe|inkomo|izinkomo|dipping|theileriosis|january disease|mastitis)\b/i],
    keywords: ['cattle', 'beef', 'dairy', 'mombe', 'inkomo', 'dipping']
  },
  {
    topic: 'Goat and Sheep Production',
    patterns: [/\b(goat|goats|sheep|boer|matebele|dorper|mbudzi|imbuzi|hwai|imvu|foot rot|pulpy kidney)\b/i],
    keywords: ['goat', 'sheep', 'mbudzi', 'imbuzi', 'hwai', 'imvu']
  },
  {
    topic: 'Pig Production',
    patterns: [/\b(pig|pigs|pork|swine|sow|piglet|nguruve|ingulube|african swine fever|asf|piggery)\b/i],
    keywords: ['pig', 'pork', 'swine', 'nguruve', 'ingulube', 'asf']
  },
  {
    topic: 'Livestock Production',
    patterns: [/\b(livestock|zvipfuyo|izifuyo|fodder|hay bale|silage|stover|stockfeed|lucerne|water trough|quarantine pen)\b/i],
    keywords: ['livestock', 'zvipfuyo', 'izifuyo', 'fodder', 'hay', 'silage', 'stockfeed', 'quarantine', 'trough']
  },
  {
    topic: 'Soil pH and Lime Requirements',
    patterns: [/\b(soil ph|ph|acidic|acidity|sour soil|lime|liming|dolomitic|calcitic|cacl2)\b/i],
    keywords: ['ph', 'acidic', 'lime', 'dolomitic', 'calcitic']
  },
  {
    topic: 'Fertiliser Management',
    patterns: [/\b(fertiliser|fertilizer|fetiraiza|umanyolo|compound d|compound s|compound l|compound c|ammonium nitrate|urea|volatilisation|leaching|top dressing|basal|4r)\b/i],
    keywords: ['fertiliser', 'fetiraiza', 'umanyolo', 'compound', 'urea', 'volatilisation', 'leaching']
  },
  {
    topic: 'Soil Fertility and Nutrient Management',
    patterns: [/\b(soil fertility|npk|nitrogen deficiency|phosphorus deficiency|potassium|micronutrient|zinc|boron|kraal manure|compost|isfm|deficiency|yellow leaves|purple leaves|bottom leaves)\b/i],
    keywords: ['fertility', 'nutrient', 'npk', 'manure', 'compost', 'deficiency']
  },
  {
    topic: 'Soil Science',
    patterns: [/\b(soil science|soil sample|soil test|sandy soil|clay soil|red clay|loam|soil structure|hardpan|plough pan|organic matter)\b/i],
    keywords: ['soil', 'texture', 'structure', 'sampling', 'hardpan']
  },
  {
    topic: 'Irrigation and Water Management',
    patterns: [/\b(irrigation|irrigate|irrigating|irrigated|drip|sprinkler|furrow|borehole|solar pump|rainwater|harvesting|tied ridge|contour bund|mvura|amanzi)\b/i],
    keywords: ['irrigation', 'irrigate', 'drip', 'sprinkler', 'rainwater', 'bund', 'water']
  },
  {
    topic: 'Agricultural Pests and Diseases',
    patterns: [/\b(pest|pests|pesticide|pesticides|insecticide|fungicide|active ingredient|rotate.*spray|disease|diseases|armyworm|fallarmyworm|tuta|aphid|aphids|red spider mite|blight|maize streak|stalk borer|scouting|ipm|makonye|tupukanana|izinambuzane)\b/i],
    keywords: ['pest', 'pesticide', 'disease', 'armyworm', 'blight', 'tuta', 'aphid', 'ipm']
  },
  {
    topic: 'Weed Management',
    patterns: [/\b(weed|weeds|weeding|masora|ukhula|ekhulaneni|striga|witchweed|bise|herbicide|herbicides|preemergence|postemergence|couch grass)\b/i],
    keywords: ['weed', 'masora', 'ukhula', 'striga', 'witchweed', 'herbicide', 'preemergence']
  },
  {
    topic: 'Conservation Agriculture',
    patterns: [/\b(conservation agriculture|minimum tillage|zero tillage|permanent soil cover|rip line|ripline|pfumvudza|intwasa|mulched.*basin|basins.*mulch)\b/i],
    keywords: ['conservation', 'tillage', 'mulch', 'pfumvudza', 'intwasa', 'basin']
  },
  {
    topic: 'Climate-Smart Agriculture',
    patterns: [/\b(climatesmart|climate smart|natural region|region[1-5]|agro ecological|agroecological|drought|el nino|small grain|mhunga|rapoko)\b/i],
    keywords: ['climate', 'region', 'drought', 'sorghum', 'millet']
  },
  {
    topic: 'Post-Harvest Management',
    patterns: [/\b(postharvest|pics bag|hermetic|weevil|weevils|large grain borer|lgb|aflatoxin|grain moisture|drying grain|salt bottle|cold chain|granary)\b/i],
    keywords: ['postharvest', 'storage', 'pics', 'weevil', 'lgb', 'aflatoxin', 'drying']
  },
  {
    topic: 'Agricultural Economics',
    patterns: [/\b(agricultural economics|gross margin|breakeven|enterprise budget|variable cost|fixed cost|cost of production|profitability|roi|losing money)\b/i],
    keywords: ['economics', 'budget', 'gross', 'margin', 'breakeven', 'profit']
  },
  {
    topic: 'Farm Management',
    patterns: [/\b(farm management|recordkeeping|farm records|cashbook|cropping calendar|labour|storeroom|input.*log|inventory|pre harvest interval)\b/i],
    keywords: ['management', 'records', 'recordkeeping', 'calendar', 'labour', 'cashbook', 'storeroom']
  },
  {
    topic: 'Agricultural Marketing',
    patterns: [/\b(agricultural marketing|grading|sorting|market research|buyers|middlemen|contracts|farm gate|pricing produce)\b/i],
    keywords: ['marketing', 'grading', 'sorting', 'buyers', 'pricing']
  },
  {
    topic: 'Agricultural Entrepreneurship',
    patterns: [/\b(entrepreneurship|agripreneur|valueaddition|processing|peanut butter|mufushwa|dried vegetable|working capital|diversification|scaling)\b/i],
    keywords: ['entrepreneurship', 'valueaddition', 'processing', 'peanutbutter', 'mufushwa']
  },
  {
    topic: 'Crop Production',
    patterns: [/\b(crop production|land preparation|winter ploughing|certified seed|plant population|gap fill|crop rotation|what (should|can|do) i plant|which crop|zvirimwa|izilimo)\b/i],
    keywords: ['crop', 'seed', 'population', 'ploughing', 'rotation']
  },
  {
    topic: 'FarmBridge Platform Guide',
    patterns: [/\b(farmbridge|verify email|verification link|proof of payment|buyer request|hot deal|upload photo|upload video|place order|checkout)\b/i],
    keywords: ['farmbridge', 'verify', 'pop', 'checkout', 'order']
  }
];

function lightStem(word: string): string {
  if (word.length <= 4) return word;
  if (word.endsWith('ies') && word.length > 5) return word.slice(0, -3) + 'y';
  if (word.endsWith('oes') && word.length > 5) return word.slice(0, -2);
  if (word.endsWith('es') && /(ch|sh|x|s|z)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && word.length > 4) {
    return word.slice(0, -1);
  }
  return word;
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\bfertilizer(s?)\b/g, 'fertiliser$1')
    .replace(/\bpost[\s-]harvest\b/g, 'postharvest')
    .replace(/\bclimate[\s-]smart\b/g, 'climatesmart')
    .replace(/\bfall[\s-]armyworm\b/g, 'fallarmyworm')
    .replace(/\bvalue[\s-]addition\b/g, 'valueaddition')
    .replace(/\bbreak[\s-]even\b/g, 'breakeven')
    .replace(/\bfoot[\s-]rot\b/g, 'footrot')
    .replace(/\brecord[\s-]keeping\b/g, 'recordkeeping')
    .replace(/\bstore[\s-]room(s?)\b/g, 'storeroom')
    .replace(/\bpre[\s-]emergence\b/g, 'preemergence')
    .replace(/\bpost[\s-]emergence\b/g, 'postemergence')
    .replace(/\bsoya[\s-]bean(s?)\b/g, 'soyabean')
    .replace(/\bsoy[\s-]bean(s?)\b/g, 'soybean')
    // Bantu (Shona & Ndebele) noun-class prefixes on core agricultural nouns
    .replace(/\b(w|k|ng|l|y)omumbu\b/g, 'umumbu')
    .replace(/\b(w|k|ng|l|y)ombila\b/g, 'umbila')
    .replace(/\b(w|n|p|k|m)echibage\b/g, 'chibage')
    .replace(/\bpachibage\b/g, 'chibage')
    .replace(/\b(dz|n|k)ehuku\b/g, 'huku')
    .replace(/\b(w|l|ng|y)ezinkukhu\b/g, 'izinkukhu')
    .replace(/\b(w|l|ng|y)emikhaza\b/g, 'tick')
    .replace(/\bngeintwasa\b/g, 'intwasa')
    .replace(/\bngepfumvudza\b/g, 'pfumvudza')
    .replace(/\bnepfumvudza\b/g, 'pfumvudza')
    .replace(/\bnatural region\s*([1-5iv]+)\b/gi, (_, r: string) => {
      const map: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5' };
      const num = map[r.toLowerCase()] || r.toLowerCase();
      return `natural region${num} region`;
    })
    .replace(/\bregion\s*([1-5]|ii|iii|iv|i|v)\b/gi, (_, r: string) => {
      const map: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5' };
      const num = map[r.toLowerCase()] || r.toLowerCase();
      return `region${num} region`;
    });
}

export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  const words = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w))
    .map(lightStem);
  return Array.from(new Set(words.filter(w => w.length >= 2 && !STOP_WORDS.has(w))));
}

function damerauLevenshtein(a: string, b: string): number {
  const alen = a.length;
  const blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;

  const dp: number[][] = Array.from({ length: alen + 1 }, () => new Array(blen + 1).fill(0));
  for (let i = 0; i <= alen; i++) dp[i][0] = i;
  for (let j = 0; j <= blen; j++) dp[0][j] = j;

  for (let i = 1; i <= alen; i++) {
    for (let j = 1; j <= blen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        val = Math.min(val, dp[i - 2][j - 2] + 1);
      }
      dp[i][j] = val;
    }
  }
  return dp[alen][blen];
}

export function buildDomainVocabulary(extraWords: string[]): Set<string> {
  const vocab = new Set<string>(extraWords.map(w => lightStem(w.toLowerCase())));
  for (const [k, syns] of Object.entries(AGRI_SYNONYMS)) {
    vocab.add(lightStem(k));
    for (const s of syns) vocab.add(lightStem(s));
  }
  return vocab;
}

export function correctSpelling(
  tokens: string[],
  vocabulary: Set<string>
): { correctedTokens: string[]; correctedTerms: string[] } {
  const correctedTokens: string[] = [];
  const correctedTerms: string[] = [];

  for (const tok of tokens) {
    if (
      vocabulary.has(tok) ||
      GENERIC_NON_TOPIC_TOKENS.has(tok) ||
      COMMON_VALID_NON_AGRI_WORDS.has(tok) ||
      tok.length < 5 ||
      /^\d+$/.test(tok)
    ) {
      correctedTokens.push(tok);
      continue;
    }

    const maxDist = tok.length >= 8 ? 2 : 1;
    let bestWord = tok;
    let bestDist = maxDist + 1;

    for (const candidate of vocabulary) {
      if (candidate.length < 5) continue;
      if (Math.abs(candidate.length - tok.length) > maxDist) continue;
      // Require same starting character (or adjacent swap at start) so unrelated short non-agri words never false-match
      const sameStart =
        candidate[0] === tok[0] ||
        (tok.length >= 4 && candidate[0] === tok[1] && candidate[1] === tok[0]);
      if (!sameStart) continue;

      const d = damerauLevenshtein(tok, candidate);
      if (d > 0 && d < bestDist) {
        bestDist = d;
        bestWord = candidate;
      }
    }

    if (bestWord !== tok) {
      correctedTerms.push(`${tok}→${bestWord}`);
    }
    correctedTokens.push(bestWord);
  }

  return {
    correctedTokens: Array.from(new Set(correctedTokens)),
    correctedTerms
  };
}

export function expandQueryTokens(tokens: string[], rawNormalizedQuery: string): string[] {
  const expanded = new Set<string>(tokens);

  for (const rule of PHRASE_EXPANSIONS) {
    if (rule.pattern.test(rawNormalizedQuery)) {
      for (const et of rule.extraTokens) {
        const s = lightStem(et);
        expanded.add(s);
        const syns = AGRI_SYNONYMS[s];
        if (syns) syns.forEach(x => expanded.add(lightStem(x)));
      }
    }
  }

  for (const t of tokens) {
    const syns = AGRI_SYNONYMS[t];
    if (syns) {
      for (const s of syns) expanded.add(lightStem(s));
    }
  }
  return Array.from(expanded);
}

export function classifyTopic(
  normalizedQuery: string,
  expandedTokens: string[]
): { topic: string | null; confidence: number } {
  const tokenSet = new Set(expandedTokens);
  let bestTopic: string | null = null;
  let bestScore = 0;

  for (const rule of TOPIC_CLASSIFICATION_RULES) {
    let score = 0;
    for (const p of rule.patterns) {
      if (p.test(normalizedQuery)) score += 6;
    }
    for (const kw of rule.keywords) {
      if (tokenSet.has(lightStem(kw))) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopic = rule.topic;
    }
  }

  const confidence = Math.min(1, Number((bestScore / 10).toFixed(2)));
  return { topic: bestScore >= 2 ? bestTopic : null, confidence };
}

const CROP_SLOT_PATTERNS: Array<{ label: string; tokens: string[]; regex: RegExp }> = [
  { label: 'Maize', tokens: ['maize', 'chibage', 'umbila'], regex: /\b(maize|chibage|umbila|umumbu|mealies|corn)\b/i },
  { label: 'Tobacco', tokens: ['tobacco', 'fodya', 'igwayi'], regex: /\b(tobacco|fodya|igwayi)\b/i },
  { label: 'Soya Beans', tokens: ['soya', 'soyabean', 'soybean'], regex: /\b(soya|soyabean|soybean)\b/i },
  { label: 'Wheat', tokens: ['wheat', 'gorosi', 'ingqoloyi'], regex: /\b(wheat|gorosi|ingqoloyi)\b/i },
  { label: 'Cotton', tokens: ['cotton', 'donje', 'utshinda'], regex: /\b(cotton|donje|utshinda)\b/i },
  { label: 'Tomatoes', tokens: ['tomato', 'madomasi', 'itamatisi'], regex: /\b(tomato|tomatoes|madomasi|itamatisi)\b/i },
  { label: 'Vegetables', tokens: ['vegetable', 'covo', 'rape', 'cabbage', 'onion', 'potato'], regex: /\b(covo|rape|cabbage|onion|onions|potato|potatoes|vegetables|muriwo)\b/i },
  { label: 'Fruit Orchards', tokens: ['fruit', 'citrus', 'mango', 'banana', 'avocado', 'orchard'], regex: /\b(fruit|fruits|citrus|mango|banana|avocado|orchard|michero|izithelo)\b/i }
];

const LIVESTOCK_SLOT_PATTERNS: Array<{ label: string; tokens: string[]; regex: RegExp }> = [
  { label: 'Poultry', tokens: ['poultry', 'broiler', 'layer', 'huku', 'inkukhu'], regex: /\b(poultry|chicken|chickens|broiler|broilers|layers|roadrunner|huku|inkukhu|izinkukhu)\b/i },
  { label: 'Cattle', tokens: ['cattle', 'beef', 'dairy', 'mombe', 'inkomo'], regex: /\b(cattle|beef|dairy|cow|cows|mombe|inkomo|izinkomo)\b/i },
  { label: 'Goats & Sheep', tokens: ['goat', 'sheep', 'mbudzi', 'imbuzi', 'hwai', 'imvu'], regex: /\b(goat|goats|sheep|boer|dorper|mbudzi|imbuzi|hwai|imvu)\b/i },
  { label: 'Pigs', tokens: ['pig', 'pork', 'swine', 'nguruve', 'ingulube'], regex: /\b(pig|pigs|pork|swine|nguruve|ingulube|piggery)\b/i }
];

const REGION_SLOT_PATTERNS: Array<{ label: string; tokens: string[]; regex: RegExp }> = [
  { label: 'Natural Region I', tokens: ['region1', 'region', 'natural'], regex: /\b(region\s*(1|i)\b|eastern highlands|nyanga|chimanimani|chipinge|mutare)\b/i },
  { label: 'Natural Region II', tokens: ['region2', 'region', 'natural'], regex: /\b(region\s*(2|ii|2a|2b)\b|harare|mazowe|marondera|chinhoyi|bindura|norton)\b/i },
  { label: 'Natural Region III', tokens: ['region3', 'region', 'natural'], regex: /\b(region\s*(3|iii)\b|gweru|kwekwe|kadoma|midlands)\b/i },
  { label: 'Natural Region IV', tokens: ['region4', 'region', 'natural'], regex: /\b(region\s*(4|iv)\b|bulawayo|lupane|gwanda|matabeleland|gokwe)\b/i },
  { label: 'Natural Region V', tokens: ['region5', 'region', 'natural'], regex: /\b(region\s*(5|v)\b|beitbridge|chiredzi|lowveld)\b/i }
];

export function extractConversationContext(
  currentMessage: string,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
): {
  slots: ConversationContextSlots;
  carryForwardTokens: string[];
  usedHistoryContext: boolean;
} {
  const currentNorm = normalizeText(currentMessage);
  const currentTokens = tokenize(currentMessage).filter(t => !GENERIC_NON_TOPIC_TOKENS.has(t));

  let activeCrop: string | undefined;
  let activeLivestock: string | undefined;
  let activeRegion: string | undefined;
  const carryForward = new Set<string>();

  const findInText = (txt: string, allowRegion = true) => {
    if (!activeCrop) {
      const m = CROP_SLOT_PATTERNS.find(c => c.regex.test(txt));
      if (m) {
        activeCrop = m.label;
        m.tokens.forEach(t => carryForward.add(t));
      }
    }
    if (!activeLivestock) {
      const m = LIVESTOCK_SLOT_PATTERNS.find(l => l.regex.test(txt));
      if (m) {
        activeLivestock = m.label;
        m.tokens.forEach(t => carryForward.add(t));
      }
    }
    if (allowRegion && !activeRegion) {
      const m = REGION_SLOT_PATTERNS.find(r => r.regex.test(txt));
      if (m) {
        activeRegion = m.label;
        m.tokens.forEach(t => carryForward.add(t));
      }
    }
  };

  findInText(currentNorm);

  const hasPronounOrFollowUp =
    currentTokens.length <= 3 ||
    /\b(it|its|them|they|that|those|this|there|also|more|else|spacing|water|irrigate|fertiliser|fertilizer|pest|pests|disease|weed|harvest|store|sell|sale|price|market|region|cost|profit|shona|ndebele|simpler|any for sale|what about|how about|when do i|how much)\b/i.test(
      currentNorm
    );

  let usedHistoryContext = false;
  if (hasPronounOrFollowUp && Array.isArray(history) && history.length > 0) {
    const recentMsgs = [...history].slice(-6).reverse();
    const hadAnySlotBeforeHistory = Boolean(activeCrop || activeLivestock);

    for (const msg of recentMsgs) {
      if (!msg || typeof msg.content !== 'string') continue;
      const before = `${activeCrop || ''}|${activeLivestock || ''}|${activeRegion || ''}`;
      findInText(normalizeText(msg.content));
      const after = `${activeCrop || ''}|${activeLivestock || ''}|${activeRegion || ''}`;
      if (after !== before) usedHistoryContext = true;

      // Only carry over raw prior user tokens when no structured entity slot was found and the follow-up is ultra-short (e.g. "how much?" or "why?")
      if (msg.role === 'user' && !hadAnySlotBeforeHistory && !activeCrop && !activeLivestock && currentTokens.length <= 1) {
        const prevTokens = tokenize(msg.content).filter(t => !GENERIC_NON_TOPIC_TOKENS.has(t));
        prevTokens.slice(0, 4).forEach(t => carryForward.add(t));
        if (prevTokens.length > 0) usedHistoryContext = true;
      }
    }
  }

  return {
    slots: { activeCrop, activeLivestock, activeRegion },
    carryForwardTokens: Array.from(carryForward),
    usedHistoryContext
  };
}

export function detectClarifyingQuestions(
  rawQuery: string,
  slots: ConversationContextSlots,
  lang: 'en' | 'sn' | 'nd'
): string[] {
  const q = rawQuery.toLowerCase();
  const questions: string[] = [];

  // 1. Asking what crop/animal to farm without mentioning Natural Region or water access
  if (
    /\b(which crop|what crop|what should i plant|what livestock|best crop|what grows)\b/i.test(q) &&
    !slots.activeRegion
  ) {
    if (lang === 'sn') {
      questions.push('Muri munzvimbo ipi yeZimbabwe (Natural Region I–V kana dunhu renyu), uye mune mvura yekudiridza here?');
    } else if (lang === 'nd') {
      questions.push('Likuyiphi indawo eZimbabwe (Natural Region I–V kumbe edolobheni bani), njalo lilamanzi okunkcenkceshela na?');
    } else {
      questions.push('Which district or Natural Region (I–V) is your farm in, and do you have reliable irrigation water?');
    }
  }

  // 2. Asking fertiliser rates without naming soil test or crop
  if (
    /\b(how much fertiliser|how much fertilizer|fertiliser rate|fertilizer rate|how many bags)\b/i.test(q) &&
    !slots.activeCrop
  ) {
    if (lang === 'sn') {
      questions.push('Ndechipi chirimwa chamuri kudyara, uye ivhu renyu rati raongororwa pH nemanyowa here?');
    } else if (lang === 'nd') {
      questions.push('Lihlanyela siphi isilimo, njalo umhlabathi wenu usuhloliwe yini i-pH?');
    } else {
      questions.push('Which specific crop are you growing, and do you have a recent soil pH/nutrient test?');
    }
  }

  // 3. Describing vague symptoms in plants or poultry/livestock
  if (/\b(leaves yellow|yellowing|wilting|dying|sick|spots on leaves|stunted)\b/i.test(q)) {
    if (slots.activeLivestock === 'Poultry' || /\b(chicken|chick|broiler|huku|inkukhu)\b/i.test(q)) {
      questions.push('How old are the birds, is the bedding dry, and what signs appear in droppings or breathing?');
    } else {
      questions.push('Did the problem start on older lower leaves or new top shoots, and are there insects/webbing underneath?');
    }
  }

  return questions.slice(0, 2);
}

export function detectMarketplaceIntent(normalizedQuery: string): {
  isMarketplaceIntent: boolean;
  isCategoryBrowse: boolean;
} {
  const isMarketplaceIntent =
    /\b(available|for sale|sale|buy|buying|price|prices|cost|listing|listings|listed|stock|marketplace|sell|sells|seller|sellers|farmers|suppliers|order|cart|categories|category|kutengeswa|kutengesa|mutengo|mtengo|okuthengiswayo|malini|emakethe|musika|any for sale|who sells)\b/i.test(
      normalizedQuery
    );

  const isCategoryBrowse =
    /\b(categories|category|what types|what do you sell|everything|all products|all listings|what is available|what is for sale|(chii|ndezvipi|zvipi).*kutengeswa|kuyini.*okuthengiswayo)\b/i.test(
      normalizedQuery
    );

  return { isMarketplaceIntent, isCategoryBrowse };
}
