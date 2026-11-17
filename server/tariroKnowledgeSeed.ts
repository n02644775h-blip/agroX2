export interface SeedKnowledgeEntry {
  id: string;
  title: string;
  question: string;
  alternativeQuestions: string[];
  category: string;
  language: 'en' | 'sn' | 'nd' | 'multilingual';
  tags: string[];
  sourceOrganization: string;
  sourceReference: string;
  reviewedAt: string;
  reviewStatus: 'verified' | 'needs_review' | 'draft';
  content: string;
  followUpQuestions: string[];
}

export const TARIRO_SEED_VERSION = '2026-11-phase1c';

export const TARIRO_SEED_KNOWLEDGE: SeedKnowledgeEntry[] = [
  {
    id: 'seed-crop-production-planning',
    title: 'Crop Production Planning: Seed Selection, Land Preparation & Plant Population',
    question: 'How do farmers plan a successful crop season from land preparation to planting?',
    alternativeQuestions: [
      'What steps should I take before planting summer crops in Zimbabwe?',
      'How do I choose the right certified seed and spacing for field crops?',
      'Why is early land preparation and winter ploughing important?'
    ],
    category: 'Crop Production',
    language: 'multilingual',
    tags: [
      'crop production', 'land preparation', 'seed', 'certified seed', 'germination',
      'plant population', 'spacing', 'winter ploughing', 'crop rotation', 'agronomy'
    ],
    sourceOrganization: 'AGRITEX / Ministry of Lands, Agriculture, Fisheries, Water and Rural Development',
    sourceReference: 'Zimbabwe Good Agronomic Practices (GAP) Field Handbook',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Overview',
      'High crop yields start before the first rains fall. Selecting certified seed suited to your Zimbabwean Natural Region, preparing a clean seedbed early, and achieving the target plant population protect yields from dry spells and weed competition.',
      '### Step-by-Step Crop Establishment',
      '1. **Soil Testing & Rotation**: Review last season’s crop so you do not plant cereal after cereal or Solanaceae after Solanaceae. Take soil samples between April and August.',
      '2. **Early Land Preparation**: Carry out winter ploughing immediately after harvest while soil still has residual moisture, or dig conservation basins early before October.',
      '3. **Seed Selection**: Buy **certified seed** matched to your rainfall zone (short-season <120 days for Regions III–V; medium/long-season 130–150 days for Region II). Never plant F2 saved hybrid grain because yields drop sharply.',
      '4. **Calibrated Planting Depth & Spacing**: Ensure uniform seeding depth (typically 3–5 cm for large grains in moist soil) and proper inter-row spacing so roots access moisture evenly.',
      '5. **Gap Filling**: Inspect emergence 7–10 days after rain or irrigation and gap-fill missing stations promptly.',
      '### Key Terms Explained',
      '• **Plant Population**: Number of healthy plants per hectare (for example, 37,000–44,000 plants/ha for dryland maize depending on rainfall zone).',
      '• **Effective Rainfall**: At least 25–30 mm of rain falling over 2–3 days that wets soil to 15 cm depth for reliable germination.',
      '### Practical Zimbabwe Example',
      'A farmer in Guruve (Natural Region IIa) winter-ploughs in June, limes soil in August, and plants medium-season certified maize on 20 November at 90 cm × 25 cm spacing, achieving uniform emergence before December heavy rains.'
    ].join('\n'),
    followUpQuestions: [
      'Which crops suit my Natural Region in Zimbabwe?',
      'How do I test soil pH and apply agricultural lime?',
      'How do I prepare soil for maize under Pfumvudza?'
    ]
  },
  {
    id: 'seed-pfumvudza-maize',
    title: 'Maize Production & Pfumvudza / Intwasa Management Guide',
    question: 'How do I plant and manage maize (chibage / umbila) in Zimbabwe?',
    alternativeQuestions: [
      'What spacing and fertiliser do I use for maize?',
      'How do I grow chibage using Pfumvudza?',
      'When is the best time to plant maize and apply top dressing?'
    ],
    category: 'Maize Production',
    language: 'multilingual',
    tags: [
      'maize', 'chibage', 'umbila', 'umumbu', 'pfumvudza', 'intwasa', 'planting',
      'spacing', 'compound d', 'an', 'urea', 'top dressing', 'mealies', 'cereal'
    ],
    sourceOrganization: 'AGRITEX & CIMMYT Southern Africa',
    sourceReference: 'Pfumvudza / Intwasa Conservation Agriculture & Maize Agronomy Manual',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Maize Management in Zimbabwe',
      'Maize (*Zea mays*, chibage / umbila) responds strongly to timely planting, moisture conservation, balanced basal phosphorus, and well-timed nitrogen top-dressing.',
      '### Step-by-Step Management',
      '1. **Plot Layout (Pfumvudza vs. Conventional)**: For Pfumvudza/Intwasa, prepare standard 16 m × 39 m plots (approx. 1/16th ha) with basins 15 cm wide × 15 cm deep at 75 cm between rows and 60 cm in-row (3–4 plants/station thinned to 2 strong plants). In conventional ox/tractor planting in Region II, rows are often 90 cm apart with 25–30 cm in-row.',
      '2. **Basal Nutrition**: Place kraal manure/compost plus basal Compound D (7-14-7) in the basin or furrow and cover with 2–3 cm of soil so bare seed does not touch raw fertiliser (preventing salt scorch).',
      '3. **Mulching & Planting**: Plant into moist soil with the first effective rains (mid-November to mid-December). Maintain dry grass/stover mulch between rows to cut evaporation and block weeds.',
      '4. **Top Dressing**: Apply Ammonium Nitrate (AN, 34.5% N) or Urea (46% N) when maize reaches knee height (4–6 weeks after emergence). On sandy soils, split AN into two applications (at 4 weeks and 7 weeks) when soil is moist.',
      '5. **Confirmed vs. Possible Causes of Stunted Maize**: *Confirmed rule*: weeds during the first 5 weeks or planting after late December cuts grain yield heavily. *Possible explanations* for yellow leaves include nitrogen leaching, acidic soil (pH < 5.0) locking out phosphorus, or waterlogging—confirm with soil pH testing and field inspection.',
      '### Key Terms Explained',
      '• **Basal Dressing**: Fertiliser placed at planting to feed early root development (phosphorus) and initial growth.',
      '• **Fertiliser Scorch**: Seedling root dehydration caused by direct contact between dry/moist seed and concentrated fertiliser salts.',
      '### Practical Zimbabwe Example',
      'In Mazowe (Region II), applying one standard bottle-cap (~8–10 g) of Compound D per Pfumvudza station under thin soil cover plus split AN at 4 and 7 weeks protects seedlings and reduces nitrogen washing away on granite sands.'
    ].join('\n'),
    followUpQuestions: [
      'How do I identify and manage Fall Armyworm in maize?',
      'When should I apply Compound D, AN, or Urea?',
      'How do I store harvested maize grain without weevils?'
    ]
  },
  {
    id: 'seed-tobacco-production',
    title: 'Tobacco Production Management (Float Seedbeds to Curing & Stalk Destruction)',
    question: 'What are the key stages of growing flue-cured tobacco in Zimbabwe?',
    alternativeQuestions: [
      'How do I manage tobacco seedbeds, topping, suckering, and curing?',
      'When do farmers transplant tobacco and destroy stalks in Zimbabwe?',
      'What fertiliser should I use for fodya or igwayi?'
    ],
    category: 'Tobacco Production',
    language: 'multilingual',
    tags: [
      'tobacco', 'fodya', 'igwayi', 'float tray', 'nursery', 'transplanting',
      'topping', 'suckering', 'curing', 'barn', 'timb', 'kutsaga', 'stalk destruction'
    ],
    sourceOrganization: 'Tobacco Research Board (Kutsaga) / TIMB',
    sourceReference: 'Flue-Cured Virginia Tobacco Production Guidelines for Zimbabwe',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Tobacco (Flue-Cured Virginia) Lifecycle',
      'Leaf weight and grade depend heavily on uniform seedlings, low-chloride nutrition, timely topping, and clean curing.',
      '### Step-by-Step Production',
      '1. **Sterile Float-Tray Nursery (June–August)**: Raise seedlings in floating polystyrene trays with sterilised pine-bark medium for 8–10 weeks. Clip leaves when oversized to harden stems and control root-knot nematodes and wildfire.',
      '2. **Ridging & Transplanting**: Construct deep ridges on sandy loams. Transplant irrigated crops in September and dryland crops in late October/November at roughly 1.2 m × 0.55 m (~15,000 plants/ha).',
      '3. **Fertilisation**: Apply specialised low-chloride tobacco basal blends (e.g., Compound C / High-P blends based on soil tests) in split bands. Avoid excess late nitrogen, which delays ripening and cures dark/green.',
      '4. **Topping & Suckering**: Break out the flower head (topping) at the button-to-early-flower stage so nutrients expand the upper leaves, then apply approved suckercides cleanly.',
      '5. **Reaping & Curing**: Harvest 2–4 ripe bottom/cutter leaves per week once tips yellow slightly. Cure through controlled yellowing (35–38°C), colour-fixing, lamina drying, and midrib drying stages.',
      '6. **Statutory Stalk Destruction**: By Zimbabwean plant-health regulations (Plant Pests and Diseases Act), destroy all tobacco stalks and roots promptly by the statutory deadline (typically May) to prevent Tobacco Mosaic Virus and aphids carrying over.',
      '### Key Terms Explained',
      '• **Topping**: Removing the floral apex to shift plant energy from seed production into leaf thickness and nicotine balance.',
      '• **Low-Chloride Basal**: Specialised sulphate-of-potash fertiliser that avoids excess chloride, which causes poor leaf burn and grey ash.',
      '### Practical Zimbabwe Example',
      'A Marondera grower who tops uniformly at 18–20 leaves and destroys stalks immediately after final reaping avoids Potato Virus Y build-up for neighbours in the next spring seedbed.'
    ].join('\n'),
    followUpQuestions: [
      'How should I test and lime acidic soil before planting tobacco or maize?',
      'How do I calculate enterprise gross margin for cash crops?',
      'Which agro-ecological region suits tobacco?'
    ]
  },
  {
    id: 'seed-soya-beans',
    title: 'Soya Bean Production, Inoculation & Rotation Management',
    question: 'How do I plant, inoculate, and harvest soya beans in Zimbabwe?',
    alternativeQuestions: [
      'How do I apply Rhizobium inoculant to soya bean seed?',
      'What fertiliser and spacing does soya bean need?',
      'Why is soya bean good in rotation with maize?'
    ],
    category: 'Soya Bean Production',
    language: 'multilingual',
    tags: [
      'soya', 'soya bean', 'soyabean', 'soybean', 'soybeans', 'inoculant',
      'rhizobium', 'nodules', 'legume', 'rotation', 'compound l', 'shattering'
    ],
    sourceOrganization: 'Department of Research & Specialist Services (DR&SS) / AGRITEX',
    sourceReference: 'Soyabean Production Manual for Smallholder & Commercial Farmers in Zimbabwe',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Soya Bean Management & Biological Nitrogen Fixation',
      'Soya beans (*Glycine max*) supply high-protein oilseed grain and leave residual soil nitrogen (often 30–60 kg N/ha) for the following maize or wheat crop.',
      '### Step-by-Step Guide',
      '1. **Soil pH Check**: Aim for **pH 5.2–6.0 (CaCl2)**. Strongly acidic soil kills *Bradyrhizobium* bacteria and starves nodule formation.',
      '2. **Rhizobium Inoculation**: Immediately before planting—and **in the shade**—mix fresh *Rhizobium* inoculant slurry gently onto the seed until evenly coated. Keep coated seed out of hot sunlight and plant into moist soil within a few hours.',
      '3. **Planting Window & Spacing**: Plant from mid-November to mid-December in Natural Regions II and III (earlier determinant varieties suit shorter rains). Row spacing is typically 45 cm (or 30–45 cm under irrigation) at 3–4 cm depth, targeting ~350,000–400,000 plants/ha.',
      '4. **Fertilisation**: Apply phosphorus and potassium (Compound L or S based on soil tests). Avoid heavy nitrogen top-dressing because high soil mineral nitrogen makes plants lazy at forming pink root nodules.',
      '5. **Harvest Timing**: Cut or combine promptly once ~95% of pods turn golden-brown and seeds rattle cleanly (~12–13% moisture) to prevent severe pod-shattering losses.',
      '### Key Terms Explained',
      '• **Root Nodules**: Swellings on legume roots housing beneficial bacteria; slice one open 4–6 weeks after emergence—pink/red inside confirms active nitrogen fixation.',
      '• **Pod Shattering**: Dried pods splitting open in hot afternoon sun, dropping seed before harvest.',
      '### Practical Zimbabwe Example',
      'A Mazowe farmer following soya beans with winter wheat sees improved wheat germination and reduces next season’s maize basal nitrogen demand while breaking maize Striga cycles.'
    ].join('\n'),
    followUpQuestions: [
      'How do I grow winter irrigated wheat after soya beans?',
      'What soil pH do legumes require?',
      'Are soya beans or stockfeed meals listed on FarmBridge?'
    ]
  },
  {
    id: 'seed-wheat-production',
    title: 'Winter Irrigated Wheat Production in Zimbabwe',
    question: 'How do I grow winter wheat under irrigation in Zimbabwe?',
    alternativeQuestions: [
      'When is wheat planted in Zimbabwe and how much water does it need?',
      'How do farmers manage wheat tillering, rust disease, and harvesting?',
      'What temperature and sowing window work best for gorosi / wheat?'
    ],
    category: 'Wheat Production',
    language: 'multilingual',
    tags: [
      'wheat', 'gorosi', 'ingqoloyi', 'winter wheat', 'irrigated wheat', 'tillering',
      'rust', 'stem rust', 'leaf rust', 'combine', 'quelea', 'sprinkler', 'pivot'
    ],
    sourceOrganization: 'Crop Breeding Institute (DR&SS) / AGRITEX',
    sourceReference: 'Zimbabwe Winter Irrigated Wheat Agronomy Manual',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Winter Wheat Production (May–October)',
      'In Zimbabwe, commercial and smallholder wheat (*Triticum aestivum*, gorosi) is grown almost exclusively during the cool dry winter (May–October) under full irrigation—frequently following a summer soya bean or short-season maize crop.',
      '### Step-by-Step Management',
      '1. **Strict Planting Window (May)**: Sow between late April and **late May** (latest early June in warmer Lowveld/Midlands zones). Delaying past early June exposes flowering to hot September winds and reduces grain-fill and yield sharply.',
      '2. **Seedbed & Sowing**: Prepare a fine, firm seedbed so small wheat seed sits at uniform 3–4 cm depth, typically at ~100–125 kg certified seed/ha depending on variety and tiller vigour.',
      '3. **Fertility**: Apply basal phosphorus/potassium (Compound D or high-P cereal blends per soil test) and split nitrogen top-dressing (e.g., at 3–4 weeks early tillering and before stem elongation/booting).',
      '4. **Irrigation Scheduling**: Wheat needs roughly **450–550 mm** total seasonal water. Light, frequent irrigation ensures uniform emergence; the two most critical moisture stages are crown-root initiation/tillering (~21 days) and flowering/milk-dough grain filling.',
      '5. **Disease & Pest Monitoring**: Scout regularly for leaf rust, stem rust, aphids, and ripening-stage Quelea bird flocks. Harvest cleanly once grain moisture drops below 12.5–13% before early October storms.',
      '### Key Terms Explained',
      '• **Tillering**: Side shoots emerging from the wheat base that produce extra grain heads per plant.',
      '• **Lodging**: Stems bending flat under excess nitrogen + heavy wind/irrigation, making combine harvesting difficult.',
      '### Practical Zimbabwe Example',
      'A Norton farm harvesting soya beans in April immediately discs residue, drills winter wheat by 18 May under centre-pivot irrigation, and harvests clean grain in late September ahead of October rains.'
    ].join('\n'),
    followUpQuestions: [
      'Which irrigation system works best for field crops like wheat?',
      'How do I rotate wheat with soya beans?',
      'How do I prevent storage pests after harvesting grain?'
    ]
  },
  {
    id: 'seed-cotton-production',
    title: 'Cotton Production, Bollworm Scouting & Harvesting Clean Lint',
    question: 'How do farmers grow and manage cotton (donje / utshinda) in Zimbabwe?',
    alternativeQuestions: [
      'Where is cotton grown in Zimbabwe and how do I scout for bollworms?',
      'How do I harvest clean grade-A cotton without contamination?',
      'What are cotton planting dates and stalk destruction rules?'
    ],
    category: 'Cotton Production',
    language: 'multilingual',
    tags: [
      'cotton', 'donje', 'utshinda', 'bollworm', 'red bollworm', 'heliothis', 'aphids',
      'jassids', 'gokwe', 'muzarabani', 'chiredzi', 'lowveld', 'lint', 'stalk destruction'
    ],
    sourceOrganization: 'Cotton Research Institute (Kadoma / DR&SS)',
    sourceReference: 'Zimbabwe Cotton Production & Pegboard Scouting Handbook',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Cotton Production in Natural Regions III–V',
      'Cotton (*Gossypium hirsutum*, donje) is a deep-rooted, relatively drought-tolerant cash crop widely grown in Gokwe, Sanyati, Muzarabani, Chinhoyi margins, and the Lowveld.',
      '### Step-by-Step Production',
      '1. **Planting Window & Spacing**: Plant with effective rains from **November to mid-December** at ~90 cm–100 cm between rows and 25–30 cm in-row, thinning excess plants at 3–4 weeks to avoid crowding.',
      '2. **Basal & Nitrogen Balance**: Cotton needs phosphorus and potassium plus modest nitrogen (soil-test guided). Over-applying nitrogen causes rank leafy vegetative growth that shades lower bolls and attracts sucking pests.',
      '3. **Pegboard Pest Scouting**: Scout weekly across 24–30 randomly sampled plants per field checking squares, flowers, and bolls for **Red Bollworm, American Bollworm, Spiny Bollworm, Aphids, Jassids, and Whitefly**. Act only when economic egg/larvae thresholds are reached (confirming exact threshold and registered products with Cotton Research Institute / AGRITEX).',
      '4. **Clean Picking**: Pick dry open bolls into clean **cotton bags** (never polypropylene plastic grain sacks, as plastic fibres contaminate lint bales and trigger heavy price downgrades). Keep clean white cotton separate from stained/trashy bolls.',
      '5. **Mandatory Stalk Destruction**: Destroy cotton stalks and pick clean fallen bolls by the statutory winter date (usually August/September) to break Pink and Red Bollworm carryover.',
      '### Key Terms Explained',
      '• **Squares**: Triangular green flower buds where early bollworms lay eggs.',
      '• **Polypropylene Contamination**: Plastic threads torn from woven feed sacks mixed into raw lint, ruining spinning quality.',
      '### Practical Zimbabwe Example',
      'A Gokwe smallholder picking Grade A white cotton into clean cotton-cloth picking aprons and bagging Grade B stained cotton separately earns top-tier lint grading.'
    ].join('\n'),
    followUpQuestions: [
      'How do I control weeds during the critical first 6 weeks?',
      'Which crops suit Natural Regions III and IV?',
      'How do I calculate break-even prices for a cash crop?'
    ]
  },
  {
    id: 'seed-horticulture-overview',
    title: 'Horticulture Production: Nursery Raising, Staggered Planting & High-Value Crops',
    question: 'How do farmers run a productive horticulture enterprise year-round?',
    alternativeQuestions: [
      'What makes a horticulture farm profitable in Zimbabwe?',
      'How do I set up seedling trays and schedule staggered harvests?',
      'Which horticultural crops bring steady weekly cashflow?'
    ],
    category: 'Horticulture',
    language: 'en',
    tags: [
      'horticulture', 'seedling', 'nursery', 'seedling tray', 'greenhouse', 'shade net',
      'staggered planting', 'transplanting', 'irrigation', 'high value crops'
    ],
    sourceOrganization: 'Horticultural Research Institute (Marondera / DR&SS) & AGRITEX',
    sourceReference: 'Zimbabwe Smallholder Horticulture Enterprise Manual',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Running Horticulture as a Continuous Business',
      'Horticulture demands intensive water management, strict pest hygiene, and smart market timing compared with dryland grains.',
      '### Key Pillars of Horticulture',
      '1. **Disease-Free Seedling Production**: Raise seedlings in raised nursery beds or plug trays filled with sterile compost/pine-bark media under shade netting rather than open weed-infested soil. Drench/harden off 5 days before transplanting.',
      '2. **Strict Crop Family Rotation**: Rotate across at least 3–4 plant families: *Solanaceae* (tomatoes, potatoes, pepper) → *Brassicas* (cabbage, rape, covo) → *Alliums* (onions, garlic) → *Cucurbits* (butternut, cucumber) or legumes.',
      '3. **Staggered Planting Calendar**: Instead of planting your entire block on one day (risking market gluts or spoilage), plant smaller weekly or bi-weekly batches so you supply buyers reliably every week.',
      '4. **Drip Moisture & Windbreaks**: Drip irrigation cuts foliar blights, while Napier grass or pigeon-pea borders shelter tender seedlings from dry winds and block drifting thrips/aphids.',
      '### Key Terms Explained',
      '• **Hardening Off**: Gradually reducing shade and watering frequency for 5–7 days before transplanting so seedlings survive field sun and wind.',
      '• **Market Glut**: Temporary oversupply (e.g., mid-summer open-field tomatoes) pushing farm-gate prices down.',
      '### Practical Zimbabwe Example',
      'A Goromonzi grower dividing 0.5 ha into four 0.125 ha blocks planted 3 weeks apart supplies uniform fresh greens and tomatoes to FarmBridge buyers continuously rather than dumping ungraded produce during a peak week.'
    ].join('\n'),
    followUpQuestions: [
      'How do I grow tomatoes, covo, onions, and potatoes specifically?',
      'How does drip irrigation save water and cut blight?',
      'What fresh vegetables are currently listed on FarmBridge?'
    ]
  },
  {
    id: 'seed-vegetable-production',
    title: 'Vegetable Production: Tomatoes, Leafy Greens (Covo/Rape), Cabbage, Onions & Potatoes',
    question: 'How do I grow tomatoes, covo, cabbage, onions, and Irish potatoes for market?',
    alternativeQuestions: [
      'What spacing and care do tomatoes and madomasi need?',
      'How do I stop blossom end rot in tomatoes or bolster covo and rape yields?',
      'How do I store onions and harvest potatoes cleanly?'
    ],
    category: 'Vegetable Production',
    language: 'multilingual',
    tags: [
      'vegetable', 'vegetables', 'muriwo', 'tomato', 'tomatoes', 'madomasi', 'itamatisi',
      'covo', 'rape', 'cabbage', 'onion', 'onions', 'potato', 'potatoes', 'butternut', 'blossom end rot'
    ],
    sourceOrganization: 'Horticultural Research Institute / AGRITEX Zimbabwe',
    sourceReference: 'Commercial Vegetable Production Extension Guide',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## High-Demand Zimbabwean Vegetables',
      'Vegetables offer rapid turnover (35–110 days) when nursery care, calcium/moisture balance, and post-harvest cooling are maintained.',
      '### Practical Production by Crop',
      '1. **Tomatoes (Madomasi / Itamatisi)**: Space ~1.0–1.2 m between rows × 40–50 cm in-row. Stake/trellis early and prune lower leaves touching wet soil. *Confirmed tip*: irregular watering + calcium shortage triggers **Blossom End Rot** (sunken black patch at fruit bottom)—keep moisture steady via drip.',
      '2. **Leafy Greens (Covo, Rape, TSunga, Cabbage)**: Incorporate well-rotted kraal manure/compost pre-plant. Pick lower covo leaves cleanly to stimulate new shoots; inspect undersides weekly for aphids and Diamondback Moth larvae.',
      '3. **Onions**: Direct-seed or transplant pencil-thick sets in well-drained soil (avoid excess late nitrogen which causes thick necks that rot in storage). Bend/let tops dry naturally when ~70% fall over, then cure bulbs in shaded ventilation for 10–14 days.',
      '4. **Irish Potatoes**: Plant certified disease-free seed tubers (never table potatoes) at ~75–90 cm × 30 cm, ridge soil ("earthing up") twice to protect developing tubers from greening and Tuber Moth.',
      '### Confirmed Guidance vs. Possible Causes (Wilting Tomatoes)',
      '• *Confirmed best practice*: Never plant tomatoes where tomatoes, potatoes, or eggplants grew in the last 3 years.',
      '• *Possible explanations* for sudden wilting include root-knot nematodes (check roots for knotted galls), Bacterial Wilt (cut stem in clear water to check milky ooze), or under-watering—verify before treating.',
      '### Practical Zimbabwe Example',
      'Packing firm-ripe Grade A Roma tomatoes into shallow ventilated crates (never tall deep sacks that crush bottom layers) preserves shelf life for Harare and Bulawayo FarmBridge buyers.'
    ].join('\n'),
    followUpQuestions: [
      'What tomatoes or fresh vegetables are on FarmBridge right now?',
      'How do I identify and control Tuta absoluta and blight?',
      'How should I grade and price vegetables for FarmBridge?'
    ]
  },
  {
    id: 'seed-fruit-production',
    title: 'Fruit Production: Citrus, Mango, Banana, Avocado & Deciduous Orchards',
    question: 'How do I establish and manage fruit trees (citrus, mango, banana, avocado) in Zimbabwe?',
    alternativeQuestions: [
      'What orchard spacing, pruning, and watering do fruit trees need?',
      'Which fruits grow best in Zimbabwe Natural Regions I–V?',
      'How do farmers fertilise and protect citrus and banana orchards?'
    ],
    category: 'Fruit Production',
    language: 'multilingual',
    tags: [
      'fruit', 'fruits', 'orchard', 'citrus', 'orange', 'lemon', 'mango', 'banana',
      'avocado', 'apple', 'peach', 'macadamia', 'pruning', 'grafted', 'michero', 'izithelo'
    ],
    sourceOrganization: 'Horticultural Research Institute (Nyanga & Marondera) / AGRITEX',
    sourceReference: 'Orchard Establishment & Subtropical/Deciduous Fruit Manual for Zimbabwe',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Orchard Planning & Fruit Tree Care',
      'Fruit production (michero / izithelo) creates long-term multi-year income when certified grafted/tissue-cultured planting material is matched to local altitude and frost risk.',
      '### Step-by-Step Orchard Management',
      '1. **Match Fruit to Natural Region**: *Natural Region I (Eastern Highlands)* excels at apples, peaches, pears, plums, macadamia, avocados, and bananas (Burma Valley/Honde). *Regions II & III* suit citrus (oranges, naartjies, lemons), mangoes, pawpaw, and guava. *Lowveld Regions IV–V* excel at irrigated citrus, bananas, and mangoes without frost damage.',
      '2. **Grafted Trees & Planting Holes**: Always buy certified grafted seedlings (citrus, mango, avocado) or tissue-culture banana suckers so trees bear true-to-type in 2–4 years rather than 8+ years. Dig wide pits (60 cm × 60 cm × 60 cm), mix topsoil with well-rotted compost/manure and basal phosphate, and ensure the graft union stays cleanly above soil level.',
      '3. **Tree Basins, Mulch & Drip Watering**: Form a watering basin around the drip-line (outer canopy edge, NOT touching the main trunk bark to avoid collar rot). Keep heavy grass mulch around trees and clear weeds within 1 m of young trunks.',
      '4. **Pruning & Fruit Fly Sanitation**: Prune dead wood, low dragging branches, and crossing inward shoots after harvest for sunlight penetration. Collect and bury fallen stinging/maggoty fruit weekly to break **Fruit Fly** breeding cycles.',
      '### Key Terms Explained',
      '• **Graft Union**: The healed scar near the stem base joining a disease-resistant rootstock to a high-yielding scion variety; shoots sprouting below this scar (water shoots/suckers) must be snapped off.',
      '• **Drip-Line**: The outer circle on the ground beneath leaf tips where active feeder roots absorb water and fertiliser.',
      '### Practical Zimbabwe Example',
      'A Mutare/Burma Valley grower maintaining tissue-culture bananas at 2.5 m × 2.5 m spacing with 3–4 followers (mother, daughter, granddaughter pseudostems) harvests uniform green bunches year-round.'
    ].join('\n'),
    followUpQuestions: [
      'Are fresh fruits listed on FarmBridge right now?',
      'How do I prevent soil erosion and manage orchard irrigation?',
      'How can I add value by drying mangoes or packaging fruit?'
    ]
  },
  {
    id: 'seed-livestock-overview',
    title: 'Livestock Production Overview: Nutrition, Fodder Conservation & Biosecurity',
    question: 'What are the core principles of profitable livestock farming in Zimbabwe?',
    alternativeQuestions: [
      'How do farmers prepare winter stockfeed, hay, and silage for livestock?',
      'How do water quality, housing, and vaccination protect herd profits?',
      'What livestock management practices apply across cattle, goats, poultry, and pigs?'
    ],
    category: 'Livestock Production',
    language: 'multilingual',
    tags: [
      'livestock', 'zvipfuyo', 'izifuyo', 'fodder', 'hay', 'silage', 'lucerne',
      'stockfeed', 'urea treatment', 'stover', 'water', 'biosecurity', 'veterinary'
    ],
    sourceOrganization: 'Department of Livestock Production & Development (DLPD) / DVS Zimbabwe',
    sourceReference: 'Zimbabwe Climate-Resilient Livestock & Fodder Conservation Handbook',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Core Principles Across All Livestock Enterprises',
      'Livestock convert pastures, crop residues, and balanced feeds into meat, milk, eggs, and manure—provided dry-season nutrition gaps and disease prevention are planned before winter.',
      '### Four Pillars of Livestock Productivity',
      '1. **Year-Round Fodder Banking**: Zimbabwe’s dry winter (May–October) sharply drops grass protein. Conserve summer surpluses via Katambora Rhodes grass/Velvet bean hay bales, chopped maize/sorghum silage, or urea-treated maize stover.',
      '2. **Clean Drinking Water**: Feed intake drops immediately if water is scarce or muddy. Provide clean daily troughs (scour troughs weekly to limit algae and parasites).',
      '3. **Hygiene & Ventilation**: Keep floors dry and clean without damp ammonia fumes; build raised housing for goats/sheep and footbaths at poultry and piggery entrances.',
      '4. **Preventive Veterinary Health**: Quarantine newly bought animals for 21 days away from existing stock, keep vaccination and dosing calendars current, and consult a registered Veterinarian or Animal Health Inspector immediately when sudden deaths or notifiable symptoms appear.',
      '### Key Terms Explained',
      '• **Fodder Conservation**: Preserving nutritious wet-season forage (as dry hay or anaerobic silage) so livestock do not lose body condition in August–November.',
      '• **Quarantine**: Isolating new or sick animals in a separate pen to stop contagious diseases entering your herd/flock.',
      '### Practical Zimbabwe Example',
      'A Mazowe mixed farm ensiles 2 hectares of lush maize-cowpea mix in March and purchases compressed hay bales early on FarmBridge, maintaining cow body condition and dairy output right through October.'
    ].join('\n'),
    followUpQuestions: [
      'Is any hay, silage, or stockfeed available on FarmBridge?',
      'How do I manage poultry broilers and layers?',
      'How do I care for beef and dairy cattle in winter?'
    ]
  },
  {
    id: 'seed-poultry-broilers-layers',
    title: 'Poultry Production: Broilers, Layers & Indigenous Roadrunners',
    question: 'What are the best practices for brooding, feeding, housing, and biosecurity in poultry?',
    alternativeQuestions: [
      'How do I raise broiler chickens from day-old to 6 weeks in Zimbabwe?',
      'What temperature and feed phases do chicks and layers need?',
      'Ndingachengeta sei huku dzebroiler kana maroadrunner?'
    ],
    category: 'Poultry Production',
    language: 'multilingual',
    tags: [
      'poultry', 'chicken', 'chickens', 'broiler', 'broilers', 'layers', 'eggs',
      'roadrunner', 'huku', 'inkukhu', 'izinkukhu', 'brooding', 'biosecurity', 'newcastle', 'gumboro', 'fcr'
    ],
    sourceOrganization: 'Department of Livestock Production & Veterinary Services Zimbabwe',
    sourceReference: 'Zimbabwe Small-Scale & Commercial Poultry Husbandry Manual',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Profitable Poultry Production (Broilers, Layers & Roadrunners)',
      'Success in poultry turns on the **first 7 days of brooding**, dry bedding, uninterrupted water, and disciplined biosecurity.',
      '### Step-by-Step Poultry Management',
      '1. **Pre-Warm Brooder House**: Disinfect, rest the house for 10–14 days between batches ("all-in, all-out"), lay 5–8 cm dry wood shavings/sawdust (never smooth slippery paper or dusty chaff), and heat to ~32°C *before* chicks arrive. Check chick distribution: huddling under the heater means too cold; crowding far edges means too hot; quiet even spreading means comfortable.',
      '2. **Feeding & Clean Water**: Keep clean drinker height aligned with bird backs. Feed **Broiler Starter** (Weeks 1–2), **Grower** (Weeks 3–4), and **Finisher** (Weeks 5–6). For layers: **Chick Mash** (0–8 wks), **Grower Mash** (9–18 wks), then **Layer Mash** (~18+ wks with calcium grit). For Roadrunners (Boschveld, Sasso, local), provide nighttime predator-proof housing plus daytime forage and supplemental grain.',
      '3. **Biosecurity & Litter Hygiene**: Maintain fresh disinfectant footbaths at entrances, forbid non-essential visitors, keep wild birds out with chicken-mesh wire, and turn/replace wet litter immediately to stop ammonia burns and coccidiosis.',
      '4. **Vaccination Discipline**: Follow a registered veterinarian/agro-dealer vaccination calendar (Newcastle Disease, Infectious Bursal Disease / Gumboro). Keep vaccine vials chilled and never vaccinate using chlorinated tap water (let municipal water sit 24 hrs or add vaccine stabiliser).',
      '### Confirmed Guidance vs. Possible Causes (Sudden Mortality / Ruffled Chicks)',
      '• *Confirmed steps*: Isolate weak birds immediately, inspect bedding wetness and brooder heat, and call a vet or agro-extension officer promptly.',
      '• *Possible causes*: Dropping wings and bloody droppings may suggest coccidiosis; gasping/twisted necks may relate to Newcastle or respiratory infection; sudden night deaths could be chilling or poor ventilation—laboratory/vet post-mortem is needed to confirm.',
      '### Practical Zimbabwe Example',
      'For 100 broilers harvested cleanly at 6 weeks (~2.0 kg live / ~1.5 kg dressed), tracking total feed bags (usually ~3.5–4.0 kg feed per live chicken) helps verify Feed Conversion Ratio (FCR) before pricing dressed birds on FarmBridge.'
    ].join('\n'),
    followUpQuestions: [
      'Are broiler chickens or eggs available on FarmBridge right now?',
      'How do I calculate enterprise budget and profit for 100 broilers?',
      'How do livestock biosecurity and vaccinations work?'
    ]
  },
  {
    id: 'seed-cattle-management',
    title: 'Cattle Production: Beef, Dairy, Dry-Season Supplementation & Dipping',
    question: 'How do farmers care for beef and dairy cattle across wet and dry seasons in Zimbabwe?',
    alternativeQuestions: [
      'How often should cattle be dipped to prevent January disease and ticks?',
      'What should I feed cattle during the dry winter season May to October?',
      'How much water do beef and dairy cows need daily?'
    ],
    category: 'Cattle Production',
    language: 'multilingual',
    tags: [
      'cattle', 'beef', 'dairy', 'cow', 'cows', 'milk', 'mombe', 'inkomo', 'izinkomo',
      'dipping', 'ticks', 'theileriosis', 'january disease', 'heartwater', 'redwater', 'urea', 'stover'
    ],
    sourceOrganization: 'Department of Veterinary Services (DVS) & DLPD Zimbabwe',
    sourceReference: 'Zimbabwe Cattle Husbandry & Tick-Borne Disease Control Manual',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Cattle Production & Tick-Borne Disease Prevention',
      'Zimbabwean beef (Mashona, Tuli, Brahman, Bonsmara crosses) and dairy herds thrive when strict tick control meets strategic winter protein supplementation.',
      '### Step-by-Step Herd Management',
      '1. **Strict Dipping Schedule**: Dip or spray cattle **weekly (every 7 days)** during the rainy season (November–April) and **fortnightly (every 14 days)** during winter to control brown ear, bont, and blue ticks. Inspect inside ears, under tail bases, and udders after dipping.',
      '2. **Dry-Season Supplementation (May–October)**: Winter veld loses crude protein. Supply preserved hay bales, silage, cottonseed/sunflower cake, protein/urea winter licks, or urea-treated maize stover alongside clean salt blocks so cows maintain weight and conceive cleanly.',
      '3. **Water Requirements**: Mature beef cattle drink 35–55 L/day; high-yielding dairy cows need 70–120 L/day depending on milk yield and heat. Clean troughs weekly.',
      '4. **Dairy Mastitis Hygiene**: Wash teats gently with clean lukewarm water, dry with individual clean paper/cloth towels, test first strip-cup squirts for clots, milk hygienically, and apply post-milking teat dip.',
      '5. **Veterinary Alert**: Contact your local Veterinary Officer immediately if animals show swollen lymph nodes, fever, eye/mouth discharge, or sudden mortality (**suspected Theileriosis / January Disease, Anthrax, Blackleg, or Foot-and-Mouth**)—never open carcasses suspected of Anthrax!',
      '### Key Terms Explained',
      '• **Theileriosis (January Disease)**: Fatal tick-borne disease transmitted mainly by brown ear ticks peaking in December–March; controlled via 5-5-4/weekly dipping and rapid early vet treatment.',
      '• **Urea-Treated Stover**: Treating chopped dry maize stalks with an exact agricultural urea-water mix sealed airtight for 3–4 weeks to boost digestibility—follow AGRITEX ratios strictly to avoid urea poisoning.',
      '### Practical Zimbabwe Example',
      'A Beatrice dairy farmer maintains weekly dipping through summer, feeds Napier grass + concentrate rations tied to milk yield, and markets raw chilled milk or cattle feeds reliably through FarmBridge.'
    ].join('\n'),
    followUpQuestions: [
      'Is any hay, silage, or dairy milk listed on FarmBridge?',
      'How do farmers conserve fodder and silage for winter?',
      'How do I manage goats and sheep on my farm?'
    ]
  },
  {
    id: 'seed-goat-sheep-production',
    title: 'Goat & Sheep Production Management (Breeds, Housing & Parasite Control)',
    question: 'How do I house, feed, and manage goats and sheep profitably in Zimbabwe?',
    alternativeQuestions: [
      'What housing prevents foot rot and pneumonia in goats and sheep?',
      'How do goats and sheep differ in feeding habits (browsers vs grazers)?',
      'Ndingachengeta sei mbudzi nemakwai / imbuzi lezimvu?'
    ],
    category: 'Goat and Sheep Production',
    language: 'multilingual',
    tags: [
      'goat', 'goats', 'sheep', 'boer', 'matebele', 'mashona goat', 'dorper', 'persian',
      'mbudzi', 'imbuzi', 'hwai', 'imvu', 'foot rot', 'deworming', 'pulpy kidney', 'browse'
    ],
    sourceOrganization: 'Matopos Research Institute & DLPD Zimbabwe',
    sourceReference: 'Small Ruminant (Goat & Sheep) Production Manual for Southern Africa',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Goat & Sheep Husbandry in Zimbabwe',
      'Small ruminants (Boer, Kalahari Red, indigenous Matebele/Mashona goats; Dorper & Blackhead Persian sheep) reproduce fast and cope remarkably well in semi-arid Regions III–V.',
      '### Step-by-Step Husbandry',
      '1. **Dry Raised Housing**: Goats and sheep are highly vulnerable to damp muddy kraals, causing **foot rot** and fatal pneumonia. Build elevated **slatted wooden housing** (~60–90 cm off the ground) with leak-proof roofing and draught-free walls—or steeply sloped drained stone/concrete floors cleaned daily.',
      '2. **Feeding Strategy (Browsers vs. Grazers)**: *Goats* prefer browsing bushes, acacia pods, pigeon pea, and leucaena leaves at head height; *sheep* prefer low pasture grazing. In winter, supply legume hay (cowpea/lucerne), stover, crushed pods, and mineral blocks.',
      '3. **Breeding & Kid/Lamb Survival**: Keep 1 healthy buck/ram per 25–30 does/ewes and record mating dates so kids/lambs drop when forage and warmth are sufficient. Ensure newborns suckle **colostrum** within 2 hours of birth and trim overgrown hooves before rainy season.',
      '4. **Parasite & Vaccination Health**: Rotate paddocks, dose strategically for internal roundworms/liver fluke after faecal checks (watch pale eyelids via **FAMACHA** anaemia checks), and keep **Pulpy Kidney (Enterotoxaemia)** and Pasteurella vaccinations updated with veterinary guidance.',
      '### Confirmed Guidance vs. Possible Explanations (Slow / Weight-Losing Goats)',
      '• *Confirmed actions*: Check inner lower eyelids for paleness (anaemia), examine hooves for foul smell/rot, and check manure for scours.',
      '• *Possible explanations*: Heavy barber’s pole worm load (*Haemonchus*), Heartwater, tick stress, or protein-deficient winter grazing—consult your Vet/AGRITEX before dosing.',
      '### Practical Zimbabwe Example',
      'A Gwanda farmer crosses hardy indigenous Matebele does with a registered Boer buck in raised slatted pens, cutting pre-weaning kid mortality sharply during December storms.'
    ].join('\n'),
    followUpQuestions: [
      'Are goats, sheep, or hay bales listed on FarmBridge right now?',
      'How should farmers manage livestock water and fodder reserves?',
      'What are climate-smart practices for Region IV & V?'
    ]
  },
  {
    id: 'seed-pig-production',
    title: 'Pig Production: Housing, Feeding Stages & African Swine Fever Biosecurity',
    question: 'How do farmers house, feed, and protect pigs (nguruve / ingulube) from disease?',
    alternativeQuestions: [
      'How do I prevent African Swine Fever in my piggery?',
      'What feed rations do piglets, growers, and sows need?',
      'How should pig pens be built for hygiene and cooling?'
    ],
    category: 'Pig Production',
    language: 'multilingual',
    tags: [
      'pig', 'pigs', 'pork', 'swine', 'sow', 'boar', 'piglet', 'nguruve', 'ingulube',
      'african swine fever', 'asf', 'creep feed', 'grower', 'finisher', 'piggery'
    ],
    sourceOrganization: 'Pig Industry Board (PIB) / DVS Zimbabwe',
    sourceReference: 'Commercial & Smallholder Pig Husbandry and Biosecurity Guide',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Pig Production & Strict Piggery Biosecurity',
      'Pigs (Large White, Landrace, Duroc crosses) offer rapid weight gain (reaching ~85–95 kg live weight in 5.5–6.5 months) when housing ventilation, feed rations, and **African Swine Fever (ASF)** biosecurity are strictly enforced.',
      '### Step-by-Step Management',
      '1. **Pen Design & Hygiene**: Build rough-finished sloped concrete floors draining cleanly to outside gullies, solid shade roofs, cool wallows or misting in hot Lowveld areas, and creep boxes with heat lamps for newborn piglets (preventing crushing by farrowing rails).',
      '2. **Stage-Based Feeding & Water**: Pigs cannot survive on grass alone; provide balanced concentrates tailored to stage—**Creep Meal** (2–8 wks), **Grower/Weaner** (8–16 wks), **Finisher** (to slaughter), plus high-energy lactating sow rations—and continuous clean water from bite nipples or heavy anchored troughs.',
      '3. **Strict African Swine Fever (ASF) Biosecurity**: ASF has NO vaccine or cure. **NEVER feed raw kitchen swill containing pork/meat scraps**; if using agricultural by-products, heat-treat per veterinary rules. Maintain double perimeter fencing to block stray/bush pigs, footbaths at entrances, dedicated farm boots, and zero unauthorised truck/buyer entry near pens.',
      '### Key Terms Explained',
      '• **Farrowing Guard Rails**: Pipes fitted ~20 cm above the floor along farrowing walls so piglets slip safely out when a sow lies down.',
      '• **Iron Injection / Oral Paste**: Essential 2–3 days after birth because sow milk lacks iron, preventing fatal piglet anaemia in concrete pens.',
      '### Practical Zimbabwe Example',
      'An Arcturus piggery keeps 10 sows under strict closed-herd biosecurity (quarantining replacement gilts for 30 days and locking boots inside the piggery entrance), avoiding neighbourhood ASF outbreaks.'
    ].join('\n'),
    followUpQuestions: [
      'Are pigs or pig feed listed on FarmBridge right now?',
      'How do I build an enterprise gross margin budget for a piggery?',
      'How does agricultural marketing work for direct farm sales?'
    ]
  },
  {
    id: 'seed-soil-science',
    title: 'Soil Science Fundamentals: Texture, Structure, Sampling & Organic Matter',
    question: 'What are Zimbabwe’s main soil types and how do I take a proper soil sample?',
    alternativeQuestions: [
      'What is the difference between sandy soils and red clay loam soils?',
      'How do farmers improve soil organic matter and prevent compaction?',
      'How do I collect a soil sample to send for lab testing?'
    ],
    category: 'Soil Science',
    language: 'multilingual',
    tags: [
      'soil', 'soil science', 'ivhu', 'umhlabathi', 'sandy soil', 'clay', 'loam',
      'texture', 'structure', 'compaction', 'organic matter', 'sampling', 'erosion', 'hardpan'
    ],
    sourceOrganization: 'Chemistry & Soil Research Institute (CSRI / DR&SS) Zimbabwe',
    sourceReference: 'Zimbabwe Soil Classification, Texture & Sampling Extension Manual',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Understanding Soil Properties Before Spending on Inputs',
      'Across Zimbabwe, soils range from coarse **granite sands** (dominant in communal and smallholder areas) to fertile **red dolerite clays and loams** (such as Mazowe and Shamva) and self-mulching **black vertisol clays** (such as Chisumbanje).',
      '### Step-by-Step Soil Science Practice',
      '1. **Know Your Texture**: *Sandy soils* drain fast, warm quickly, and hold little water or nitrogen (requiring compost + split fertilisation). *Clay/loam soils* hold nutrients and moisture longer but crust or waterlog easily if ploughed wet.',
      '2. **Protect Soil Structure & Stop Hardpans**: Repeated ox/tractor ploughing at the exact same shallow depth creates a dense **plough pan** that blocks roots. Periodically rip deeper or adopt conservation tillage with permanent mulch.',
      '3. **Build Soil Organic Matter (SOM)**: Apply decomposed kraal manure, compost, crop residues, and legume rotations. Organic matter acts like a sponge holding 3–5× its weight in water and prevents nutrient washout.',
      '4. **How to Take a Representative Soil Sample (0–20 cm)**: Divide fields into uniform soil/crop blocks. Using a clean trowel or auger, take **15–20 sub-samples** in a zig-zag across each block (avoiding anthills, old kraals, or roadsides), mix thoroughly in a clean plastic bucket, and pack ~500 g cleanly labelled for Chemistry & Soil Research Institute or an accredited lab.',
      '### Key Terms Explained',
      '• **Soil Texture**: Relative mix of sand, silt, and clay particles (permanent property of your land).',
      '• **Plough Pan / Hardpan**: Compacted layer 15–25 cm underground where tractor tyres or mouldboard shares smear wet soil, stopping taproots.',
      '### Practical Zimbabwe Example',
      'A Wedza farmer on coarse granite sand sends one composite 500 g soil sample in June, learns organic carbon is low, and combines 5 tonnes/ha well-rotted kraal manure in Pfumvudza basins to triple moisture holding during mid-season dry spells.'
    ].join('\n'),
    followUpQuestions: [
      'How do I check soil pH and calculate agricultural lime needs?',
      'How do I manage soil fertility and nutrients naturally?',
      'How does conservation agriculture stop soil erosion?'
    ]
  },
  {
    id: 'seed-soil-fertility-nutrients',
    title: 'Soil Fertility & Nutrient Management: N-P-K, Micronutrients & Crop Rotation',
    question: 'How do plants use N-P-K, manure, and micronutrients to build strong crop yields?',
    alternativeQuestions: [
      'What does nitrogen, phosphorus, and potassium do for crops?',
      'Why do maize leaves turn yellow or purple in the field?',
      'How do I combine kraal manure with inorganic fertiliser?'
    ],
    category: 'Soil Fertility and Nutrient Management',
    language: 'multilingual',
    tags: [
      'soil fertility', 'nutrients', 'npk', 'nitrogen', 'phosphorus', 'potassium',
      'zinc', 'boron', 'sulphur', 'manure', 'compost', 'deficiency', 'yellow leaves', 'purple leaves'
    ],
    sourceOrganization: 'Chemistry & Soil Research Institute (DR&SS) / AGRITEX',
    sourceReference: 'Integrated Soil Fertility Management (ISFM) in Zimbabwe',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Integrated Soil Fertility Management (ISFM)',
      'Sustainable fertility combines **organic resources (manure, compost, legumes)** with **targeted mineral nutrients** rather than relying solely on bags of chemicals or depleted soils.',
      '### Primary Nutrients & Common Signals',
      '1. **Nitrogen (N)**: Drives leafy green growth and chlorophyll. *Possible deficiency sign*: older bottom leaves turn pale yellow in a V-shape from tip down the midrib (could also stem from waterlogging or Striga—inspect field drainage).',
      '2. **Phosphorus (P)**: Powers early root establishment, energy transfer, and seed setting. *Possible deficiency sign*: seedlings stunted with **purplish-red edges** in cold or acidic soils.',
      '3. **Potassium (K)**: Regulates water balance, stalk strength, and disease tolerance. *Possible deficiency sign*: scorching/yellow-brown margins along older leaf edges.',
      '4. **Key Micronutrients in Zimbabwe**: **Sulphur (S)** on intensively cropped sands, **Zinc (Zn)** in maize, **Boron (B)** in cotton/vegetables/oilseeds, and **Molybdenum (Mo)** for legume nodulation.',
      '5. **Integrated Strategy**: Never apply raw fresh chicken/cattle litter directly onto germinating roots—compost manure thoroughly for 6–10 weeks so heat subsides and weed seeds die, then combine with basal mineral fertiliser.',
      '### Practical Zimbabwe Example',
      'Rotating Region II maize with groundnuts or soya beans and incorporating decomposed composted manure keeps soil microbes active and recovers phosphorus trapped in iron-rich clays.'
    ].join('\n'),
    followUpQuestions: [
      'How do I apply Compound D, AN, and Urea properly?',
      'When should I apply calcitic or dolomitic agricultural lime?',
      'How do soya beans fix nitrogen naturally?'
    ]
  },
  {
    id: 'seed-soil-ph-lime',
    title: 'Soil pH & Agricultural Lime Requirements (Calcitic vs. Dolomitic Lime)',
    question: 'Why does soil acidity matter and how should farmers apply agricultural lime?',
    alternativeQuestions: [
      'What is the ideal soil pH in Zimbabwe (CaCl2 scale)?',
      'When do I use dolomitic lime instead of calcitic lime?',
      'My fertiliser is not working well—could my soil be too acidic?'
    ],
    category: 'Soil pH and Lime Requirements',
    language: 'multilingual',
    tags: [
      'ph', 'soil ph', 'acidic', 'acidity', 'lime', 'agricultural lime', 'dolomitic',
      'calcitic', 'cacl2', 'calcium', 'magnesium', 'aluminium toxicity', 'sour soil'
    ],
    sourceOrganization: 'Chemistry & Soil Research Institute (DR&SS) Zimbabwe',
    sourceReference: 'Soil Acidity & Liming Recommendations for Zimbabwean Soils',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Fixing Soil Acidity Before Applying Costly Fertilisers',
      'Zimbabwe laboratories typically measure soil pH using **Calcium Chloride (CaCl2)**, which reads roughly 0.5–0.8 units lower than water-based pH tests. Over time, rainfall leaching and ammonium fertilisers make granite sands acidic.',
      '### Step-by-Step Liming Guide',
      '1. **Know Optimal Target pH (CaCl2)**: Most crops (maize, soya, tobacco, vegetables) thrive at **pH 5.2–5.8 (CaCl2)**; legumes/lucerne prefer **5.5–6.2**. Below **pH 4.8**, soluble aluminium turns toxic to roots and **locks up up to half of your applied phosphorus**!',
      '2. **Choose the Right Lime**:',
      '   • **Dolomitic Lime** (contains Calcium + Magnesium carbonate): Best when soil tests show *both* low pH and low magnesium—very common on Zimbabwean sandy soils.',
      '   • **Calcitic Lime** (Calcium carbonate): Best when soil has adequate magnesium and mainly needs pH rise + calcium.',
      '3. **Timing & Incorporation**: Apply agricultural lime **at least 6–8 weeks before planting** (ideally right after harvest during winter ploughing or early basin prep) and mix thoroughly into the top 15–20 cm of moist soil. Do NOT confuse agricultural lime with quicklime/slaked building lime, which burns seed and soil biology!',
      '4. **Confirmed Rates Require Soil Lab Results**: Heavy clays take more lime than light sandy soils to shift pH by 0.5 units—always confirm tonnage/ha from your soil test report.',
      '### Key Terms Explained',
      '• **Nutrient Lock-Up**: Even when fertiliser sits in acidic soil, chemical reactions bind phosphorus to iron/aluminium so crop roots cannot drink it.',
      '### Practical Zimbabwe Example',
      'A Chinamhora smallholder finding maize fails to respond to Compound D tests soil at pH 4.3 (CaCl2). After incorporating dolomitic lime in July ahead of November planting, phosphorus uptake recovers dramatically.'
    ].join('\n'),
    followUpQuestions: [
      'How do I collect a soil sample properly?',
      'What fertilisers should I apply after liming?',
      'How do I grow soya beans in balanced soil?'
    ]
  },
  {
    id: 'seed-fertilisers-guide',
    title: 'Fertiliser Management: Compound Blends (D, S, L, C), AN, Urea & 4R Timing',
    question: 'How do farmers choose and apply basal and top-dressing fertilisers effectively?',
    alternativeQuestions: [
      'What is the difference between Compound D, Compound S, AN, and Urea?',
      'When should I split nitrogen top dressing on sandy soils?',
      'What are the 4Rs of fertiliser management?'
    ],
    category: 'Fertiliser Management',
    language: 'multilingual',
    tags: [
      'fertiliser', 'fertilizer', 'fetiraiza', 'umanyolo', 'compound d', 'compound s',
      'compound l', 'compound c', 'ammonium nitrate', 'an', 'urea', 'top dressing', 'basal', '4r', 'leaching'
    ],
    sourceOrganization: 'AGRITEX & Zimbabwe Fertiliser Industry Extension Notes',
    sourceReference: '4R Nutrient Stewardship & Crop Fertilisation Handbook',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Applying the 4Rs (Right Source, Rate, Time & Place)',
      'Because fertiliser is often the largest cash expense on a farm, avoiding leaching, volatilisation, and salt scorch protects your profit margin.',
      '### Common Zimbabwean Fertiliser Grades & Uses',
      '1. **Compound D (7-14-7 + S)**: General-purpose basal fertiliser for maize, sorghum, and many vegetables.',
      '2. **Compound L / S / C Blends**: Balanced with lower N or specialised K/B/S ratios—*Compound L* (with Boron) suits cotton and legumes; *Compound C* (low-chloride) suits tobacco and potatoes; *Compound S* suits vegetables and nurseries.',
      '3. **Ammonium Nitrate (AN, 34.5% N)**: Fast-acting top-dressing furnishing both nitrate and ammonium nitrogen.',
      '4. **Urea (46% N)**: Concentrated nitrogen source. Always **incorporate Urea lightly under damp soil** (or apply just before light rain/irrigation)—leaving Urea on hot dry ground loses nitrogen as ammonia gas (**volatilisation**).',
      '### Step-by-Step Application Timing',
      '1. Place basal fertiliser in planting stations/bands slightly away from or covered under 2 cm soil below seed.',
      '2. Top-dress when roots are active and soil is moist (never onto bone-dry drought-stressed plants or right ahead of flood storms).',
      '3. On coarse sandy soils, **split nitrogen top-dressing** (e.g., half at 4 weeks, half at 7 weeks/tassel initiation) so heavy January rains do not wash nutrients past root reach.',
      '4. *Safety/Accuracy Note*: Confirm exact kg/ha rates against a soil test and target yield with your AGRITEX officer.',
      '### Key Terms Explained',
      '• **Leaching**: Rainwater flushing dissolved nitrate nitrogen deep below root depth, especially on sandy soils.',
      '• **Volatilisation**: Urea nitrogen turning into escaping ammonia gas when left exposed on hot or alkaline surfaces.',
      '### Practical Zimbabwe Example',
      'Switching from a single heavy Urea dump at 5 weeks to two moist-soil split side-dressings covered lightly with a hoe reduces nitrogen loss by up to a third on sandy Mhondoro soils.'
    ].join('\n'),
    followUpQuestions: [
      'Why should I check soil pH and lime before fertilising?',
      'What fertiliser schedule suits maize under Pfumvudza?',
      'How do I budget fertiliser costs before planting?'
    ]
  },
  {
    id: 'seed-irrigation-water',
    title: 'Irrigation & Water Management: Drip, Sprinkler, Solar Pumping & Water Harvesting',
    question: 'Which irrigation system and water-saving practices work best for Zimbabwean farms?',
    alternativeQuestions: [
      'How does drip irrigation compare with sprinkler irrigation?',
      'How should I irrigate tomatoes and vegetables to prevent fungal blight?',
      'How do farmers use solar borehole pumps and rainwater harvesting?',
      'When is the best time of day to irrigate crops?'
    ],
    category: 'Irrigation and Water Management',
    language: 'multilingual',
    tags: [
      'irrigation', 'irrigate', 'water', 'mvura', 'amanzi', 'drip', 'sprinkler', 'furrow',
      'borehole', 'solar pump', 'rainwater harvesting', 'tied ridges', 'mulch', 'tomato', 'blight', 'zimbabwe'
    ],
    sourceOrganization: 'Department of Irrigation / AGRITEX Zimbabwe',
    sourceReference: 'Smallholder Irrigation Scheduling & Water Conservation Handbook',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Saving Water, Fuel & Disease Risk Through Smart Irrigation',
      'Whether irrigating from a solar borehole, farm dam, or seasonal weir, matching delivery method to crop type cuts pumping expenses and prevents leaf diseases.',
      '### Comparing Irrigation Methods',
      '1. **Drip Irrigation (85–90% Efficiency)**: Delivers drops slowly right onto the root zone. *Best for*: tomatoes, onions, covo, chillies, orchards, and small high-value plots. Keeps foliage dry (cutting blight) and lets you apply water-soluble nutrients directly (**fertigation**). Clean screen/disc filters weekly so emitters do not clog.',
      '2. **Sprinkler & Micro-Jet (70–75% Efficiency)**: Good for winter wheat, lawns, pastures, nurseries, and field vegetables. Irrigate **early morning or late afternoon**—midday sun and wind waste huge water to evaporation.',
      '3. **Gravity Furrow / Basin Flood (50–60% Efficiency)**: Low equipment cost on gentle slopes, but risks uneven wetting and waterlogging if run too long.',
      '4. **Solar Pumping & Elevated Storage**: Pair solar DC borehole pumps with elevated 5,000–10,000 L JoJo/water tanks so gravity runs drip kits quietly even on cloudy afternoons.',
      '5. **In-Field Rainwater Harvesting**: Use dead-level contours, tied ridges, infiltration pits, and surface mulch to hold storm runoff right in the crop zone.',
      '### Key Terms Explained',
      '• **Field Capacity**: The ideal moist state after surplus water drains out—soil squeezed in hand holds shape lightly without dripping.',
      '• **Tied Ridges**: Small cross-dams built every 1.5–2 m inside crop furrows to trap rainwater instead of letting it rush off-field.',
      '### Practical Zimbabwe Example',
      'A Bulawayo peri-urban market gardener replaces hosepipe overhead watering on tomatoes with a gravity-fed drip kit from a solar-pumped tank, cutting daily borehole draw by ~40% while halving Early Blight pressure.'
    ].join('\n'),
    followUpQuestions: [
      'How do I prevent fungal blights in irrigated tomatoes?',
      'How much water does winter irrigated wheat require?',
      'How does Pfumvudza mulch conserve moisture?'
    ]
  },
  {
    id: 'seed-pests-diseases-ipm',
    title: 'Agricultural Pests & Diseases: Scouting, Symptom Triage & Integrated Pest Management',
    question: 'How do farmers scout and manage common crop pests and diseases safely?',
    alternativeQuestions: [
      'How do I recognise and manage Fall Armyworm, Tuta absoluta, aphids, or blight?',
      'What does Integrated Pest Management (IPM) mean in farming?',
      'Ndingadzivirira sei makonye nezvirwere muzvirimwa?'
    ],
    category: 'Agricultural Pests and Diseases',
    language: 'multilingual',
    tags: [
      'pest', 'pests', 'disease', 'diseases', 'armyworm', 'fall armyworm', 'tuta',
      'tuta absoluta', 'aphids', 'blight', 'early blight', 'late blight', 'red spider mite',
      'maize streak', 'stalk borer', 'ipm', 'scouting', 'tupukanana', 'izinambuzane', 'makonye'
    ],
    sourceOrganization: 'Plant Protection Research Institute (DR&SS) / AGRITEX Zimbabwe',
    sourceReference: 'Integrated Pest Management (IPM) & Crop Scouting Manual for Zimbabwe',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Integrated Pest Management (IPM) & Responsible Scouting',
      'Spraying blindly wastes cash, kills helpful predator insects (ladybirds, parasitic wasps), and drives chemical resistance. IPM starts with accurate weekly field scouting.',
      '### Step-by-Step IPM Approach',
      '1. **W-Pattern Scouting (Twice Weekly)**: Walk diagonally in a W across your block inspecting 20–30 plants cleanly—checking young maize funnels/whorls, leaf undersides, stems, and developing fruit.',
      '2. **High-Impact Zimbabwe Pests & Diseases**:',
      '   • **Fall Armyworm (FAW) & Stalk Borer**: Look for pinholes, ragged papery "windowpanes", and fresh sawdust-like frass inside maize whorls. Control early while larvae are tiny (first 2 weeks after hatching).',
      '   • **Tuta absoluta & Red Spider Mite (Tomatoes)**: Serpentine clear mines in leaves/fruit (*Tuta*) vs. fine bronzing/webbing on undersides (*Mites*). Monitor pheromone traps early.',
      '   • **Aphids & Whiteflies**: Cluster under tender leaves, excrete sticky honeydew, and transmit viral diseases like **Maize Streak Virus** or Tobacco Bushy Top.',
      '   • **Early & Late Blight**: Dark concentric rings vs. water-soaked grey-green lesions spreading fast in cool wet weather—avoid wet leaves late evening and remove infected lower leaves.',
      '3. **Cultural & Biological First**: Rotate non-related crop families, destroy old crop residues, keep borders free of virus-hosting weeds, and protect natural predators.',
      '4. **Important Chemical Safety Rule**: TARIRO does **not** prescribe chemical mixing dosages. Confirm pest identity with an AGRITEX/Plant Protection officer or registered agro-dealer, rotate chemical active ingredients (IRAC/FRAC groups), wear full PPE (gloves, mask, goggles, overalls), and strictly obey label **Pre-Harvest Intervals (PHI)**.',
      '### Confirmed Guidance vs. Possible Explanations (Holes or Yellow Streaks)',
      '• *Confirmed*: Regular weekly scouting catches outbreaks before yield collapse.',
      '• *Possible explanations*: Yellow pale streaks parallel along maize veins suggest Maize Streak Virus (leafhopper-borne); ragged whorl chewing suggests Fall Armyworm or Stalk Borer—inspect inside the funnel directly.',
      '### Practical Zimbabwe Example',
      'Using 2–3 pheromone delta traps per half-hectare of greenhouse/open tomatoes alerts a Rusape farmer to *Tuta absoluta* moths weeks before fruit boring starts.'
    ].join('\n'),
    followUpQuestions: [
      'How do I control weeds that host crop pests and Striga?',
      'How does crop rotation break disease cycles?',
      'What post-harvest grain pests like Large Grain Borer should I watch for?'
    ]
  },
  {
    id: 'seed-weed-management',
    title: 'Weed Management, Critical Clean Periods & Striga (Witchweed) Control',
    question: 'When and how should farmers control weeds and Striga in Zimbabwe?',
    alternativeQuestions: [
      'What is the critical weed-free period for maize and vegetables?',
      'How do I stop Striga (witchweed / bise) in my field?',
      'Ndingabvisa sei masora / ukhula mumunda?'
    ],
    category: 'Weed Management',
    language: 'multilingual',
    tags: [
      'weed', 'weeds', 'weeding', 'masora', 'ukhula', 'ekhulaneni', 'striga',
      'witchweed', 'bise', 'couch grass', 'herbicide', 'herbicides', 'pre-emergence',
      'post-emergence', 'spraying', 'precautions', 'mulching', 'hoeing', 'cultivation'
    ],
    sourceOrganization: 'Weed Research Team (Henderson Research Station / DR&SS)',
    sourceReference: 'Integrated Weed Management & Parasitic Striga Control Guide',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Controlling Weeds Before They Steal Fertiliser & Moisture',
      'Weeds grow aggressively after first rains, stealing sunlight, water, and expensive basal fertiliser from young seedlings.',
      '### Step-by-Step Weed Management',
      '1. **Protect the Critical Weed-Free Window**: Keep summer row crops clean during the **first 4–6 weeks after emergence**. Research shows weeds left beyond week 4 cause the sharpest irreversible yield drop—even if you weed later!',
      '2. **Combine Mechanical & Mulch Control**: Shallow hand-hoeing or tine cultivation removes small 2–4 leaf weeds cleanly without cutting deep crop feeder roots. Heavy Pfumvudza surface mulch blocks light so fewer weed seeds sprout.',
      '3. **Defeating Striga (Witchweed / Bise)**: Bright purple-flowered *Striga asiatica* parasitises maize and sorghum roots on tired low-fertility sandy soils. Follow a 3-step strategy: (a) **rotate with legume "trap crops"** (cowpea, soya, groundnut) that trigger Striga germination without letting it attach; (b) **apply kraal manure & nitrogen**; (c) **hand-pull every Striga plant BEFORE it flowers** (one plant sheds tens of thousands of long-lived seeds).',
      '4. **Herbicide Precision**: If using pre-emergence or selective post-emergence herbicides, calibrate knapsack nozzles carefully for exact crop, soil clay% (light sands need lower pre-emergence rates), and clean water—never spray windy midday gusts.',
      '### Key Terms Explained',
      '• **Pre-Emergence Herbicide**: Soil-applied barrier sprayed onto moist weed-free ground right after planting before weeds sprout.',
      '• **Trap Crop**: Legume (e.g., cowpea or desmodium) that tricks parasitic Striga seeds to germinate and die without a host.',
      '### Practical Zimbabwe Example',
      'A Mutoko farmer battling Striga switches an infested plot to cowpeas + kraal manure for one season and hand-pulls stray witchweed spikes in bordering maize, cutting infestation sharply the following summer.'
    ].join('\n'),
    followUpQuestions: [
      'How do I use Pfumvudza mulch to suppress weeds and keep moisture?',
      'How do soya beans and legumes fit into crop rotation?',
      'How do I calibrate inputs safely and budget weed control?'
    ]
  },
  {
    id: 'seed-conservation-agriculture',
    title: 'Conservation Agriculture (CA): Minimum Tillage, Permanent Soil Cover & Rotation',
    question: 'What are the three core principles of Conservation Agriculture (Pfumvudza / Intwasa)?',
    alternativeQuestions: [
      'Why does conservation agriculture improve yields during mid-season dry spells?',
      'What is minimum tillage and crop residue mulching?',
      'How does Pfumvudza differ from conventional ox or tractor ploughing?'
    ],
    category: 'Conservation Agriculture',
    language: 'multilingual',
    tags: [
      'conservation agriculture', 'pfumvudza', 'intwasa', 'minimum tillage', 'zero tillage',
      'mulch', 'mulching', 'soil cover', 'crop rotation', 'basins', 'ripper', 'erosion'
    ],
    sourceOrganization: 'AGRITEX & FAO / Foundations for Farming Zimbabwe',
    sourceReference: 'Three Principles of Conservation Agriculture in Southern Africa',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## The Three Interlinked Principles of Conservation Agriculture',
      'Conservation Agriculture (including Zimbabwe’s **Pfumvudza / Intwasa** basin system and mechanised rip-line planting) stops topsoil erosion and boosts rainfall capture in drought-prone seasons.',
      '### The 3 Core Principles',
      '1. **Minimal Soil Disturbance (Minimum / Zero Tillage)**: Only open the narrow basin or rip-line where seed and fertiliser go—leaving ~80–90% of soil undisturbed so natural earthworm tunnels, root channels, and soil carbon remain intact instead of turning soil upside down every year.',
      '2. **Permanent Organic Soil Cover (Mulching ≥30%)**: Blanket ground between rows with dry grass, maize stover, or cover-crop residue. Mulch cushions heavy raindrop impact (preventing surface crusting), cools soil temperature, feeds soil microbes, and cuts moisture evaporation.',
      '3. **Diversified Crop Rotation**: Alternate cereals (maize/sorghum) with nitrogen-fixing legumes (soya, groundnuts, cowpeas, sugar beans) or oilseeds across plots every season to break weed, Striga, and pest cycles.',
      '### Key Terms Explained',
      '• **Surface Crusting / Capping**: Rain pounding bare ploughed soil seals the top millimetre like concrete, forcing rainwater to run away instead of soaking in.',
      '• **Rip-Line**: Narrow vertical slit cut 20–25 cm deep by an ox/tractor ripper tine along fixed permanent tramlines.',
      '### Practical Zimbabwe Example',
      'During a 3-week January dry spell in Masvingo, mulched Pfumvudza basins stay damp 3–5 cm below the surface days after bare ploughed neighbouring fields wilt.'
    ].join('\n'),
    followUpQuestions: [
      'How do I lay out and plant a Pfumvudza maize plot?',
      'What is climate-smart agriculture for dry Natural Regions IV & V?',
      'How do I build soil organic matter on sandy land?'
    ]
  },
  {
    id: 'seed-climate-smart-ag',
    title: 'Climate-Smart Agriculture & Zimbabwe Agro-Ecological Natural Regions (I–V)',
    question: 'Which crops, livestock, and climate-smart practices suit my Natural Region in Zimbabwe?',
    alternativeQuestions: [
      'Explain Zimbabwe Natural Regions 1, 2, 3, 4, and 5.',
      'How should farmers adapt to El Nino droughts and late onset of rains?',
      'Should I grow sorghum, pearl millet (mhunga), or maize in dry areas?'
    ],
    category: 'Climate-Smart Agriculture',
    language: 'multilingual',
    tags: [
      'climate smart', 'natural regions', 'zimbabwe', 'drought', 'el nino', 'rainfall',
      'sorghum', 'mapfunde', 'amabele', 'millet', 'mhunga', 'rapoko', 'cowpeas', 'nyemba',
      'region 1', 'region 2', 'region 3', 'region 4', 'region 5', 'agroforestry'
    ],
    sourceOrganization: 'Meteorological Services Department (MSD), ICRISAT & AGRITEX Zimbabwe',
    sourceReference: 'Revised Zimbabwe Agro-Ecological Zones & Climate-Smart Farming Guide',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Matching Enterprises to Zimbabwe’s Natural Regions (I–V)',
      'Climate-smart agriculture means adapting planting dates, crop choices, livestock breeds, and water harvesting to shifting rainfall patterns across Zimbabwe’s five agro-ecological zones:',
      '### Guide by Natural Region',
      '1. **Natural Region I (Eastern Highlands — >1,000 mm/yr)**: Cool high-rainfall mountains (Nyanga, Chimanimani, Chipinge). Ideal for tea, coffee, macadamia, deciduous/subtropical fruits, seed potatoes, timber, and intensive dairy.',
      '2. **Natural Region II (Highveld — 750–1,000 mm/yr, Mazowe, Harare, Marondera, Chinhoyi)**: Zimbabwe’s prime cropping belt for rain-fed maize, tobacco, soya beans, irrigated winter wheat, horticulture, dairy, and intensive beef.',
      '3. **Natural Region III (Mid-Rainfall — 650–800 mm/yr with dry spells, Gweru, Kwekwe, Parts of Masvingo)**: Combine medium/short-season maize with **soya beans, cotton, sunflower, groundnuts, cowpeas**, and semi-intensive beef/goats using moisture-retaining tied ridges.',
      '4. **Natural Region IV (Semi-Arid — 450–650 mm/yr, Bulawayo surrounds, Matabeleland, Masvingo South, Kariba fringes)**: Prioritise drought-hardy **small grains (sorghum/mapfunde/amabele, pearl millet/mhunga, finger millet/rapoko)**, cowpeas, Bambara nuts (nyimo), sesame, Boer/Matebele goats, and indigenous cattle.',
      '5. **Natural Region V (Arid Lowveld — <450 mm/yr, Beitbridge, Chiredzi, Gwanda South)**: Focus on extensive cattle/goat ranching, indigenous poultry, drought-tolerant browse trees, and **irrigated** sugarcane/citrus/horticulture where dam or borehole water exists.',
      '### Climate-Smart Risk Spread',
      'Follow **Meteorological Services Department (MSD)** seasonal forecasts in September, stagger planting across 2–3 dates rather than risking 100% seed on a false October shower, and plant **small grains alongside maize** as household food insurance.',
      '### Practical Zimbabwe Example',
      'In Lupane (Region IV), dedicating 60% of grain area to open-pollinated/hybrid red or white sorghum + cowpeas and 40% to extra-early maize under Pfumvudza basins guarantees harvest even when rains end early in February.'
    ].join('\n'),
    followUpQuestions: [
      'How do conservation agriculture and mulching protect dryland crops?',
      'How do I harvest rainwater with tied ridges and drip irrigation?',
      'What livestock suit Natural Regions IV and V?'
    ]
  },
  {
    id: 'seed-agricultural-economics',
    title: 'Agricultural Economics: Enterprise Budgets, Gross Margins & Break-Even Pricing',
    question: 'How do farmers calculate production costs, gross margins, and break-even prices?',
    alternativeQuestions: [
      'How do I tell if a crop or poultry batch is actually making a profit?',
      'What is the difference between variable costs and fixed costs on a farm?',
      'How do I create a farm enterprise budget?'
    ],
    category: 'Agricultural Economics',
    language: 'en',
    tags: [
      'economics', 'agricultural economics', 'gross margin', 'break even', 'budget',
      'enterprise budget', 'variable costs', 'fixed costs', 'profit', 'roi', 'cashflow', 'cost of production'
    ],
    sourceOrganization: 'AGRITEX Farm Management & Economics Branch',
    sourceReference: 'Farm Enterprise Budgeting & Gross Margin Analysis Guide for Zimbabwe',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Making Money on Every Hectare & Animal Batch',
      'High biological yield does not automatically guarantee cash profit if input, transport, or shrinkage costs exceed selling prices. Enterprise budgeting reveals true profitability.',
      '### Step-by-Step Gross Margin Method',
      '1. **Calculate Gross Income**: Multiply *marketable yield* (excluding spoilt/home-eaten units if tracking cash return) by realistic net selling price.',
      '2. **Sum All Variable Costs**: Add costs that rise with scale—seed/day-old chicks, fertilisers/stockfeed, chemicals/vaccines, casual weeding/harvest labour, fuel/pumping, crates/bags, and transport to market.',
      '3. **Compute Gross Margin**: `Gross Margin = Gross Income − Total Variable Costs`. If positive, this covers fixed overheads (permanent wages, loan interest, depreciation on pumps/barns) and leaves net farm profit.',
      '4. **Find Your Break-Even Price**: `Break-Even Price per kg/bird = Total Variable Costs ÷ Marketable Units`. Never knowingly contract or price below break-even unless clearing perishable stock urgently.',
      '### Key Terms Explained',
      '• **Variable Costs**: Expenses tied directly to producing one crop or batch (grow if you plant 2 ha instead of 1 ha).',
      '• **Opportunity Cost**: The income missed by locking land or cash into one low-margin enterprise instead of a better alternative.',
      '### Practical Zimbabwe Example (100-Broiler Cost Check)',
      'If 100 day-old chicks ($95) + starter/grower/finisher feed ($260) + vaccines/bedding/heating/slaughter ($45) total **$400 variable cost** and 96 birds survive to market, your break-even cost is **$4.17 per bird**. Selling dressed birds directly at $6.00 yields ~$176 gross margin before fixed barn overheads.'
    ].join('\n'),
    followUpQuestions: [
      'How do I keep simple farm records and manage seasonal cashflow?',
      'How should I price and grade produce on FarmBridge?',
      'How can value addition increase farm profit margins?'
    ]
  },
  {
    id: 'seed-farm-management',
    title: 'Farm Management: Cropping Calendars, Record Keeping & Input Control',
    question: 'What systems and records help farmers manage daily operations and labour effectively?',
    alternativeQuestions: [
      'What farm records should every Zimbabwean farmer keep?',
      'How do I plan inputs, cashflow, and seasonal work calendars?',
      'How do I track farm inventory and prevent input wastage?'
    ],
    category: 'Farm Management',
    language: 'en',
    tags: [
      'farm management', 'records', 'record keeping', 'calendar', 'planning', 'labour',
      'inventory', 'logbook', 'cashbook', 'receipts', 'supervision'
    ],
    sourceOrganization: 'FarmBridge Agronomy & Zimbabwe Farm Business Extension',
    sourceReference: 'Practical Small & Medium Farm Operations Record-Keeping Workbook',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Running Farming with Discipline & Clear Records',
      'Without written records, farmers forget exact planting dates, repeat unprofitable crops, miss vaccination boosters, or lose track of credit and input stocks.',
      '### Five Essential Farm Management Habits',
      '1. **Master Cropping & Livestock Calendar**: Map every task month-by-month—soil sampling (May–July), input procurement (Aug–Sept), Pfumvudza/land prep (Sept–Oct), planting/dipping/vaccinations, and harvest marketing.',
      '2. **Simple Cashbook & Enterprise Ledger**: Record every dollar spent (date, item, enterprise—e.g. "Tomatoes Block B") and every sale (FarmBridge order #, buyer, quantity, payment method).',
      '3. **Field & Flock Diary**: Log planting date, variety/batch number, fertiliser dates, chemical spray dates (vital for Pre-Harvest Interval compliance!), rain mm, and mortality counts.',
      '4. **Store Room Stock Control**: Keep fertilisers, seeds, and chemicals off damp floors on wooden pallets; lock agro-chemicals separately away from livestock feeds and children.',
      '5. **Labour Task Allocation**: Give casual/permanent workers clear daily piece or zone targets (e.g., rows weeded cleanly or crates graded) and verify quality before signing off.',
      '### Key Terms Explained',
      '• **Pre-Harvest Interval (PHI)**: Mandatory waiting days between spraying a crop/dosing an animal and harvesting/milking safely for buyers.',
      '### Practical Zimbabwe Example',
      'Reviewing last year’s Field Diary shows a Norton grower that November-planted Block A cabbage beat Block C planted in hot February for Diamondback Moth—guiding this year’s seed investment.'
    ].join('\n'),
    followUpQuestions: [
      'How do I calculate gross margins and break-even prices?',
      'How do I market and grade produce on FarmBridge?',
      'How do I build a value-addition agribusiness plan?'
    ]
  },
  {
    id: 'seed-agricultural-marketing',
    title: 'Agricultural Marketing: Grading, Market Research & Direct Selling on FarmBridge',
    question: 'How do farmers find reliable buyers, grade produce, and market profitably?',
    alternativeQuestions: [
      'Why should farmers grade produce before selling?',
      'How do I attract repeat buyers and negotiate fair farm-gate prices?',
      'How does FarmBridge help farmers avoid middleman losses?'
    ],
    category: 'Agricultural Marketing',
    language: 'multilingual',
    tags: [
      'marketing', 'agricultural marketing', 'grading', 'sorting', 'buyers', 'market research',
      'pricing', 'farm gate', 'contracts', 'farmbridge', 'packaging', 'middlemen', 'mbare'
    ],
    sourceOrganization: 'AMA (Agricultural Marketing Authority) & FarmBridge Extension',
    sourceReference: 'Direct Farm-to-Buyer Agricultural Marketing Guide for Zimbabwe',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Marketing Before You Plant—Not Just After Harvest',
      'Selling starts with knowing what buyers want (size, variety, packaging, delivery schedule) rather than rushing perishable harvests to crowded open markets at distress prices.',
      '### Step-by-Step Marketing Strategy',
      '1. **Know Your Customer Segments**: Household buyers want clean fresh bundles/trays; restaurants/caterers want steady weekly graded crates; feedlot/dairy buyers want consistent moisture-tested grain or bale weights.',
      '2. **Honest Grading & Sorting**: Never mix bruised/over-ripe Grade B fruit beneath shiny top layers ("topping up"). Grade uniformly into **Grade A** (premium price), **Grade B** (budget/processing), and damaged culls (farm compost/feed). Honest grading builds 5-star FarmBridge reviews and repeat orders.',
      '3. **Clear Pricing & Units**: Check your break-even cost first, benchmark current local prices, and list exact clear weights/units (kg, 50 kg bag, crate, tray, bale) with genuine photos/videos.',
      '4. **Direct Digital Selling on FarmBridge**: Post verified inventory, respond promptly to **Buyer Requests**, set clear farm-pickup windows or delivery radius, and use Hot Deals ($1/day) during peak harvests.',
      '### Key Terms Explained',
      '• **Market Gluts vs. Off-Peak Windows**: Growing crops slightly before or after main open-field supply often doubles net farm-gate return.',
      '### Practical Zimbabwe Example',
      'Instead of paying middlemen commissions at 4 AM, a Domboshava vegetable grower lists graded Grade-A tomato crates and fresh covo bundles on FarmBridge, fulfils 12 direct household & lodge orders via EcoCash/COD, and earns higher margins with less wastage.'
    ].join('\n'),
    followUpQuestions: [
      'How do I list produce and answer Buyer Requests on FarmBridge?',
      'How do post-harvest cooling and packaging preserve produce quality?',
      'What agricultural products are listed on FarmBridge right now?'
    ]
  },
  {
    id: 'seed-post-harvest',
    title: 'Post-Harvest Management: Grain Drying, Hermetic Storage, LGB Control & Cold Chain',
    question: 'How do farmers reduce post-harvest losses in maize, legumes, and fresh horticulture?',
    alternativeQuestions: [
      'How do I store maize grain without weevils or Large Grain Borer?',
      'What are hermetic PICS bags and why must grain moisture be below 12.5%?',
      'How should I handle tomatoes and leafy greens immediately after picking?'
    ],
    category: 'Post-Harvest Management',
    language: 'multilingual',
    tags: [
      'post harvest', 'post-harvest', 'storage', 'weevil', 'weevils', 'lgb', 'large grain borer',
      'pics bag', 'hermetic', 'moisture', 'drying', 'aflatoxin', 'cold chain', 'grading', 'granary'
    ],
    sourceOrganization: 'Institute of Agricultural Engineering (IAE / AGRITEX) Zimbabwe',
    sourceReference: 'Zimbabwe Post-Harvest Grain & Horticulture Loss-Reduction Manual',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Cutting 20–30% Harvest Losses After Leaving the Field',
      'Post-harvest losses happen through damp mould (**aflatoxin**), weevils, **Large Grain Borer (LGB)**, rodents, and rough heat handling of fresh vegetables.',
      '### Grain & Legume Storage Steps',
      '1. **Harvest & Dry to Safe Moisture**: Harvest maize/soya promptly once ripe. Dry cobs/pods on clean raised tarpaulins or drying cribs (**never bare dirty soil**) until grain moisture is **≤12.5%** for maize (≤11% for groundnuts/soya). *Practical check*: press dry maize teeth/salt-jar test—damp salt clumps if grain is still wet.',
      '2. **Granary Hygiene**: Sweep, burn/dispose old infested grain dust, and plaster wall cracks weeks before bringing new grain in.',
      '3. **Hermetic Storage (PICS / SuperGrain Bags)**: Triple-layer hermetic bags seal airtight so insects consume remaining oxygen and suffocate **without chemical dust**—provided grain is thoroughly dry (<12.5%) and the liner is tied tightly without punctures.',
      '4. **Protectants (If Using Grain Dust)**: Only use registered dual-purpose grain protectants effective against both maize weevil and LGB, following exact label rules and withholding period before eating/milling.',
      '### Fresh Horticulture Post-Harvest Steps',
      '1. Pick early morning while field heat is low, place immediately under shade trees/packhouse, handle gently in rigid ventilated crates (avoid deep sacks), and trim stem stubs cleanly.',
      '### Key Terms Explained',
      '• **Aflatoxin**: Dangerous fungal toxin growing on damp, damaged groundnuts and maize—prevented by rapid clean drying and sorting out mouldy kernels.',
      '• **Field Heat**: Natural warmth absorbed by produce under sun that rapidly speeds wilting and rotting unless shaded promptly.',
      '### Practical Zimbabwe Example',
      'A Hurungwe maize farmer dries shelled grain to ~12% moisture on a clean tarpaulin and seals 50 kg batches in triple-layer hermetic PICS bags kept off cement floors on wooden pallets—selling spotless weevil-free maize in December when market prices peak.'
    ].join('\n'),
    followUpQuestions: [
      'How do I harvest and cure onions and tomatoes for transport?',
      'How does smart agricultural marketing help sell stored grain at peak prices?',
      'What farm records should I track for stored inventory?'
    ]
  },
  {
    id: 'seed-agribusiness-entrepreneurship',
    title: 'Agricultural Entrepreneurship & Value Addition: Scaling Small Farms into Businesses',
    question: 'How can Zimbabwean farmers build profitable agribusinesses and add value to raw produce?',
    alternativeQuestions: [
      'What value-addition ideas work for small farmers in Zimbabwe?',
      'How do I diversify farm income and manage risk as an agripreneur?',
      'How do farmers move from subsistence farming to commercial agribusiness?'
    ],
    category: 'Agricultural Entrepreneurship',
    language: 'en',
    tags: [
      'entrepreneurship', 'agripreneur', 'agribusiness', 'value addition', 'processing',
      'peanut butter', 'dried vegetables', 'mufushwa', 'dressed poultry', 'diversification', 'scaling'
    ],
    sourceOrganization: 'Zimbabwe Youth Agricultural Entrepreneurs & FarmBridge Extension',
    sourceReference: 'Agripreneurship & Rural Value-Addition Starter Guide',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Moving from Growing Raw Produce to Building an Agri-Enterprise',
      'Agricultural entrepreneurship combines reliable farm production with **value addition**, **risk diversification**, and **direct customer relationships** to stabilise year-round income.',
      '### Practical Entrepreneurship & Value-Addition Pathways',
      '1. **Simple High-Margin Value Addition**:',
      '   • Shell, sort, roast, and mill clean groundnuts into sealed jars of natural **peanut butter**.',
      '   • Solar-dry surplus leafy greens (covo/cowpea leaves/*mufushwa*) or tomatoes cleanly in hygienic netted dryers for urban dry-season buyers.',
      '   • Dress, weigh, chill, and hygienically wrap broilers instead of selling live birds only.',
      '   • Chop and bag cured hay/stover or composted organic manure for peri-urban growers on FarmBridge.',
      '2. **Enterprise Pairing (Closed-Loop Synergies)**: Pair poultry/cattle with horticulture—manure feeds vegetable beds, while vegetable culls/crop stover supplement livestock feed, lowering cash input bills.',
      '3. **Reinvest Margins Deliberately**: Separate personal household spending from farm working capital; reinvest early profits into bottleneck savers like drip kits, scales, grading crates, or solar pumping.',
      '4. **Verify Standards & Packaging**: Clear weight labels, harvest dates, clean food-grade bags/jars, and reliable FarmBridge communication turn first-time shoppers into monthly contract clients.',
      '### Key Terms Explained',
      '• **Value Addition**: Transforming, grading, drying, processing, or convenient-packaging raw produce so buyers gladly pay more per kg.',
      '• **Working Capital**: Cash reserved strictly for buying seed, feed, packaging, and transport for the next production cycle.',
      '### Practical Zimbabwe Example',
      'A Chikomba women’s cooperative grows groundnuts and cowpeas, sells fresh Grade-A nuts during harvest on FarmBridge, and processes Grade-B shelled nuts into labelled 375 g peanut butter jars year-round—doubling net return per hectare.'
    ].join('\n'),
    followUpQuestions: [
      'How do I calculate break-even cost and gross margin for value-added goods?',
      'How do I list farm products and build buyer trust on FarmBridge?',
      'How do post-harvest drying and packaging prevent spoilage?'
    ]
  },
  {
    id: 'seed-farmbridge-platform-guide',
    title: 'FarmBridge Marketplace Guide: Account Verification, Buying, Selling & Push Alerts',
    question: 'How do users register, verify email, buy produce, post Buyer Requests, or sell on FarmBridge?',
    alternativeQuestions: [
      'How do I buy products and upload proof of payment on FarmBridge?',
      'How do farmers upload product photos, videos, and receive order notifications?',
      'Why do I need to verify my email on FarmBridge?'
    ],
    category: 'FarmBridge Platform Guide',
    language: 'multilingual',
    tags: [
      'farmbridge', 'agriconnect', 'buy', 'sell', 'order', 'cart', 'delivery', 'pickup',
      'pop', 'proof of payment', 'ecocash', 'verify', 'email', 'buyer request', 'upload', 'hot deal', 'push'
    ],
    sourceOrganization: 'FarmBridge Platform Support & Documentation',
    sourceReference: 'FarmBridge Zimbabwe User & Seller Operations Guide',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Navigating FarmBridge Marketplace Safely & Easily',
      'FarmBridge connects verified Zimbabwean farmers, fodder suppliers, and buyers directly with transparent pricing and order tracking.',
      '### Step-by-Step Platform Workflows',
      '1. **Registration & Email Verification**: Create your Buyer, Farmer, or Fodder Supplier account and click the verification link sent to your email (`farmbridge2026@gmail.com`). Active verification unlocks produce uploads, direct chat, and checkout.',
      '2. **Buying Produce**: Browse categories or ask TARIRO what is in stock right now. Add items from a chosen farm to your cart, choose **Home/Business Delivery** or **Farm Pickup**, select **Cash on Delivery** or **EcoCash / OneMoney / Bank Transfer** (uploading your Proof of Payment screenshot), and track order status (*Received → Packaged → Delivering / Ready for Pickup → Done*).',
      '3. **Buyer Requests**: Cannot find a specific crop, livestock batch, or tonnage? Post a **Buyer Request** so nearby verified producers can respond directly.',
      '4. **Selling & Community Posts (Farmers / Fodder Suppliers)**: List products with real photos, stock quantities, and pickup instructions in your **Farmer Dashboard**, post Community Farm Showcase photos/videos, and submit **Hot Deals ($1/day)** for homepage promotion.',
      '5. **Notifications**: Farmers get alerted for new incoming orders; buyers receive real-time alerts as order status moves to packaged, out for delivery, or ready for pickup.',
      '### Practical Example',
      'A caterer in Harare needing 200 kg of tomatoes checks live FarmBridge listings with TARIRO first, messages the farmer directly, and completes delivery checkout without middleman markups.'
    ].join('\n'),
    followUpQuestions: [
      'What products are available on FarmBridge right now?',
      'How do farmers grade and price produce before listing?',
      'How do I post a Buyer Request?'
    ]
  },
  {
    id: 'seed-shona-agriculture-overview',
    title: 'Kurima neKuchengeta Zvipfuyo muZimbabwe (Nhungamiro yeShona)',
    question: 'Ndingarima sei chibage, fodya, soya nemuriwo, kana kuchengeta huku nemombe muZimbabwe?',
    alternativeQuestions: [
      'Ndingagadzirira sei munda wePfumvudza uye fetiraiza ipi yekushandisa?',
      'Ndingachengeta sei huku dzebroiler, mombe, kana mbudzi zvakanaka?',
      'Ndezvipi zvirimwa zviri kutengeswa uye ndingatengesa sei paFarmBridge?'
    ],
    category: 'Zimbabwean Agricultural Practices',
    language: 'sn',
    tags: [
      'shona', 'chibage', 'pfumvudza', 'fodya', 'soya', 'gorosi', 'donje',
      'huku', 'mombe', 'mbudzi', 'nguruve', 'madomasi', 'muriwo', 'ivhu',
      'mvura', 'fetiraiza', 'masora', 'makonye', 'farmbridge', 'kurima'
    ],
    sourceOrganization: 'AGRITEX Zimbabwe & FarmBridge Extension (Shona Edition)',
    sourceReference: 'Nhungamiro yeKurima neBhizinesi reZvipfuyo muZimbabwe',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Nhungamiro yeKurima neKuchengeta Zvipfuyo (Shona)',
      'Mazvita nekushandisa TARIRO! Heino nhungamiro yakarongeka yezvirimwa, zvipfuyo, ivhu, nemisika yeFarmBridge:',
      '### 1. Chibage & Pfumvudza (Maize)',
      '• Cherai makomba ePfumvudza akafara **15 cm × 15 cm**, pakati pemitsara **75 cm × 60 cm**. Isai manyowa akanyatsovora kana Compound D pasi pembeu makavharira nevhu (2–3 cm) kuti mbeu isatsve. Waridzai uswa (mulch) pakati pemitsara kuchengetedza hunyoro nekudzivirira **masora** (weeds).',
      '• Kana chibage chasvika pabvi (**4–6 weeks**), isai **AN kana Urea** ivhu rine hunyoro (muvhu jecha, kamurai kaviri: 4 weeks ne7 weeks). Tarisai makonye e**Fall Armyworm** muvhiki imwe neimwe.',
      '### 2. Zvimwe Zvirimwa (Soya, Gorosi, Madomasi)',
      '• **Soya**: Dzora mbeu ne*Rhizobium inoculant* mumumvuri uchangodyara; dzivirira kupisa kwezuva.',
      '• **Muriwo nemadomasi**: Shandisai *drip irrigation* mangwanani kuti mashizha asanyorova manheru (kudzivirira *blight*).',
      '### 3. Ivhu neFetiraiza (Soil & Lime)',
      '• Tora ivhu rinoongororwa (0–20 cm). Kana ivhu rine asidi (pH < 5.0), isai **agricultural lime** (dolomitic kana calcitic) mavhiki 6–8 musati madyara kuti fetiraiza ishande nemazvo.',
      '### 4. Zvipfuyo (Huku, Mombe, Mbudzi, Nguruve)',
      '• **Huku (Broilers/Layers)**: Dzivirirai kutonhora muvhiki yekutanga (~32°C), marara eimba ngaagare akaoma, ipai Starter–Grower–Finisher nemvura yakachena, uye chengetedzai *biosecurity* (footbath nekuvharira vaeni/shiri).',
      '• **Mombe neMbudzi**: Dhipisai mombe svondo rega rega mumwaka wemvura; vatai dzimba dzembudzi dzakakwidziridzwa kubva pamatope kudzivirira *foot rot*, uye rongai *hay bales* kana *silage* yechirimo.',
      '### 5. FarmBridge Marketplace',
      '• Verifayai email yenyu mutenge kana kutengesa zvirimwa, madomasi, chikafu chemombe, uye huku zvakananga paFarmBridge.',
      '• *Chenjedzo*: Pakurapa zvirwere zvakaoma kana kusarudza mishonga, bvunzai mudhumeni we**AGRITEX** kana chiremba wezvipfuyo (**Veterinary Officer**).'
    ].join('\n'),
    followUpQuestions: [
      'Ndezvipi zvirimwa zviri kutengeswa paFarmBridge izvozvi?',
      'Ndingadzivirira sei makonye eFall Armyworm nemasora muchibage?',
      'Ndingachengeta sei zvirimwa zvangu mushure mekukohwa (PICS bags)?'
    ]
  },
  {
    id: 'seed-ndebele-agriculture-overview',
    title: 'Ukulima Lokufuya eZimbabwe (Isihloko SeSiNdebele)',
    question: 'Ngingalima njani umumbu ngePfumvudza, ngifuye izinkukhu lezinkomo, kumbe ngithengise kuFarmBridge?',
    alternativeQuestions: [
      'Ngingalungisa njani umhlabathi lomanyolo wokulima umumbu kumbe amabele?',
      'Ngingavikela njani izinkukhu, izinkomo, lembuzi emkhuhlaneni?',
      'Kuyini okuthengiswayo njalo ngithengisa njani kuFarmBridge?'
    ],
    category: 'Zimbabwean Agricultural Practices',
    language: 'nd',
    tags: [
      'ndebele', 'umbila', 'umumbu', 'intwasa', 'pfumvudza', 'amabele', 'igwayi', 'isoya',
      'inkukhu', 'izinkukhu', 'inkomo', 'izinkomo', 'imbuzi', 'imvu', 'ingulube',
      'itamatisi', 'umhlabathi', 'amanzi', 'umanyolo', 'ukhula', 'farmbridge', 'ukulima'
    ],
    sourceOrganization: 'AGRITEX Zimbabwe & FarmBridge Extension (Ndebele Edition)',
    sourceReference: 'Umhlahlandlela Wokulima Lokufuya eZimbabwe',
    reviewedAt: '2026-11-01',
    reviewStatus: 'verified',
    content: [
      '## Umhlahlandlela Wokulima Lokufuya (SiNdebele)',
      'Siyabonga ngokusebenzisa uTARIRO! Nanku okubalulekileyo ngekulima, ukufuya, umhlabathi, lemakethe yeFarmBridge:',
      '### 1. Umumbu / Intwasa (Maize) & Amabele (Regions IV–V)',
      '• Gebhani amagodi ePfumvudza/Intwasa angama-**15 cm × 15 cm**, amabanga abe yi-**75 cm × 60 cm**. Faka umanyolo wemvelo loba iCompound D uwugqibele kancane ngomhlabathi (2–3 cm) ngaphambi kokuhlanyela inhlanyelo. Gqibela phakathi kwemigqa ngotshani obomileyo (mulch) ukuze umhlabathi ugcine amanzi njalo wehlise **ukhula**.',
      '• Emavikini ama-**4–6** faka i-**AN loba i-Urea** umhlabathi umanzi (ehlukanisa kabili emhlabathini wesihlabathi). Endaweni ezomileyo (Region IV–V), hlanganisa umumbu lamabele (**sorghum**) lenyawuthi (**mhunga**) ukuzivikela ekhomini yezulu.',
      '### 2. Umhlabathi LeLime (Soil pH & Fertilisers)',
      '• Hlolisa umhlabathi ngaphambi kokuthenga umanyolo. Nxa umhlabathi ulesidi (pH < 5.0), faka **agricultural lime** (dolomitic loba calcitic) emavikini ama-6–8 ngaphambi kokuhlanyela.',
      '### 3. Izifuyo (Izinkukhu, Izinkomo, Imbuzi, Ingulube)',
      '• **Izinkukhu**: Gcina amachwane efudumele ngeviki yokuqala (~32°C), indawo yokulala ihlale yomile, nika ukudla okuqondileyo (Starter–Grower–Finisher) lamanzi ahlanzekileyo, njalo ufake i-*footbath* emnyango.',
      '• **Izinkomo leMbuzi**: Dibhisa izinkomo maviki wonke ngesikhathi sezulu ukuvikela i-**January Disease** lemikhuhlane yemikhaza; akhela imbuzi izindlu eziphakanyisiweyo ukuvikela ukubola kwamanqina (*foot rot*); njalo ulungiselele i-**hay** loba i-**silage** yesikhathi somumo.',
      '### 4. FarmBridge Marketplace',
      '• Qinisekisa i-email yakho uthenge loba uthengise itamatisi, izinkukhu, uchago, lokudla kwezifuyo ngqo kuFarmBridge.',
      '• *Isixwayiso*: Nxa izilimo loba izifuyo zilomkhuhlane onzima, xhumana lamluleki we**AGRITEX** loba udokotela wezifuyo (**Veterinary Officer**) ngaphambi kokusebenzisa imithi.'
    ].join('\n'),
    followUpQuestions: [
      'Kuyini okuthengiswayo kuFarmBridge khathesi?',
      'Ngingavikela njani izilimo ekhulaneni lezibungwini?',
      'Ngingagcina njani umumbu ungadliwa yizibungu emva kokuvuna?'
    ]
  }
];
