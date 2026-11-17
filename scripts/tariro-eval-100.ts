import fs from 'fs';
import path from 'path';
import { tariroService } from '../server/tariroService';

interface TestCase {
  id: string;
  group: string;
  query: string;
  language?: 'auto' | 'en' | 'sn' | 'nd';
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  expectedCategories?: string[];
  expectLowConfidence?: boolean;
  expectClarification?: boolean;
  expectCorrectedTerm?: boolean;
  expectMarketplaceProducts?: boolean;
  expectNoMarketplaceMatch?: boolean;
  expectContextCropOrLivestockOrRegion?: string;
}

const TEST_CASES: TestCase[] = [
  // 1. Crop Production (3)
  { id: 'crop-1', group: 'Crop Production', query: 'How do farmers plan a crop season from land preparation to planting?', expectedCategories: ['Crop Production'] },
  { id: 'crop-2', group: 'Crop Production', query: 'Why is winter ploughing and certified seed important in Zimbabwe?', expectedCategories: ['Crop Production'] },
  { id: 'crop-3', group: 'Crop Production', query: 'When should I gap-fill missing plant stations after emergence?', expectedCategories: ['Crop Production'] },

  // 2. Maize Production (3)
  { id: 'maize-1', group: 'Maize Production', query: 'How do I plant and space maize under Pfumvudza?', expectedCategories: ['Maize Production', 'Conservation Agriculture'] },
  { id: 'maize-2', group: 'Maize Production', query: 'When do I apply top dressing AN on chibage?', expectedCategories: ['Maize Production', 'Fertiliser Management'] },
  { id: 'maize-3', group: 'Maize Production', query: 'Why should maize seed not touch raw Compound D in the basin?', expectedCategories: ['Maize Production', 'Fertiliser Management'] },

  // 3. Tobacco Production (3)
  { id: 'tob-1', group: 'Tobacco Production', query: 'How are flue-cured tobacco seedlings raised in float trays?', expectedCategories: ['Tobacco Production'] },
  { id: 'tob-2', group: 'Tobacco Production', query: 'When do Zimbabwean growers top tobacco and destroy stalks?', expectedCategories: ['Tobacco Production'] },
  { id: 'tob-3', group: 'Tobacco Production', query: 'Why does flue-cured fodya require low-chloride basal fertiliser?', expectedCategories: ['Tobacco Production'] },

  // 4. Soya Bean Production (3)
  { id: 'soya-1', group: 'Soya Bean Production', query: 'How do I apply Rhizobium inoculant to soya bean seed?', expectedCategories: ['Soya Bean Production'] },
  { id: 'soya-2', group: 'Soya Bean Production', query: 'What soil pH and harvest moisture prevent soya pod shattering?', expectedCategories: ['Soya Bean Production', 'Soil pH and Lime Requirements'] },
  { id: 'soya-3', group: 'Soya Bean Production', query: 'How much residual nitrogen do soyabeans leave for maize rotation?', expectedCategories: ['Soya Bean Production'] },

  // 5. Wheat Production (3)
  { id: 'wheat-1', group: 'Wheat Production', query: 'When is the planting window for winter irrigated wheat in Zimbabwe?', expectedCategories: ['Wheat Production'] },
  { id: 'wheat-2', group: 'Wheat Production', query: 'How much seasonal water does irrigated wheat need during tillering and grain fill?', expectedCategories: ['Wheat Production', 'Irrigation and Water Management'] },
  { id: 'wheat-3', group: 'Wheat Production', query: 'What diseases and birds attack ripening winter gorosi?', expectedCategories: ['Wheat Production', 'Agricultural Pests and Diseases'] },

  // 6. Cotton Production (3)
  { id: 'cot-1', group: 'Cotton Production', query: 'How do farmers use a pegboard to scout cotton for bollworms?', expectedCategories: ['Cotton Production'] },
  { id: 'cot-2', group: 'Cotton Production', query: 'Why must clean cotton lint never be picked into plastic polypropylene bags?', expectedCategories: ['Cotton Production'] },
  { id: 'cot-3', group: 'Cotton Production', query: 'Which Natural Regions in Zimbabwe produce donje and why are stalks destroyed?', expectedCategories: ['Cotton Production'] },

  // 7. Horticulture (3)
  { id: 'hort-1', group: 'Horticulture', query: 'How do seedling trays and shade nets improve horticultural returns?', expectedCategories: ['Horticulture'] },
  { id: 'hort-2', group: 'Horticulture', query: 'How does staggered planting reduce horticulture price gluts?', expectedCategories: ['Horticulture', 'Agricultural Marketing'] },
  { id: 'hort-3', group: 'Horticulture', query: 'Why is cold-chain handling important in commercial horticulture?', expectedCategories: ['Horticulture', 'Post-Harvest Management'] },

  // 8. Vegetable Production (3)
  { id: 'veg-1', group: 'Vegetable Production', query: 'What causes black rotting bottoms or blossom end rot on tomatoes?', expectedCategories: ['Vegetable Production'] },
  { id: 'veg-2', group: 'Vegetable Production', query: 'How do I cure onions after harvest and ridge potatoes properly?', expectedCategories: ['Vegetable Production', 'Post-Harvest Management'] },
  { id: 'veg-3', group: 'Vegetable Production', query: 'How do I control aphids and diamondback moth on covo and cabbage?', expectedCategories: ['Vegetable Production', 'Agricultural Pests and Diseases'] },

  // 9. Fruit Production (3)
  { id: 'fruit-1', group: 'Fruit Production', query: 'How do I establish a citrus, mango, or avocado orchard?', expectedCategories: ['Fruit Production'] },
  { id: 'fruit-2', group: 'Fruit Production', query: 'Why should fruit farmers buy grafted seedlings instead of growing from seed?', expectedCategories: ['Fruit Production'] },
  { id: 'fruit-3', group: 'Fruit Production', query: 'How do you prune fruit trees and control fruit fly in Zimbabwe?', expectedCategories: ['Fruit Production'] },

  // 10. Livestock Production (3)
  { id: 'live-1', group: 'Livestock Production', query: 'What dry-season fodder planning and biosecurity do livestock need?', expectedCategories: ['Livestock Production'] },
  { id: 'live-2', group: 'Livestock Production', query: 'How can farmers prepare hay bales and maize silage for winter cattle feed?', expectedCategories: ['Livestock Production', 'Cattle Production'] },
  { id: 'live-3', group: 'Livestock Production', query: 'Why are clean water troughs and quarantine pens vital for zvipfuyo?', expectedCategories: ['Livestock Production'] },

  // 11. Poultry Production (3)
  { id: 'poul-1', group: 'Poultry Production', query: 'What brooding temperatures do day-old broiler chicks need in week 1?', expectedCategories: ['Poultry Production'] },
  { id: 'poul-2', group: 'Poultry Production', query: 'How do you manage Newcastle vaccine and biosecurity in roadrunners and layers?', expectedCategories: ['Poultry Production'] },
  { id: 'poul-3', group: 'Poultry Production', query: 'How is Feed Conversion Ratio calculated in broiler chickens?', expectedCategories: ['Poultry Production'] },

  // 12. Cattle Production (3)
  { id: 'cat-1', group: 'Cattle Production', query: 'How often should cattle be dipped to prevent January Disease?', expectedCategories: ['Cattle Production'] },
  { id: 'cat-2', group: 'Cattle Production', query: 'What feed and mastitis hygiene do dairy cows need?', expectedCategories: ['Cattle Production'] },
  { id: 'cat-3', group: 'Cattle Production', query: 'Which indigenous cattle breeds like Mashona and Tuli resist ticks well?', expectedCategories: ['Cattle Production'] },

  // 13. Goat and Sheep Production (3)
  { id: 'goat-1', group: 'Goat and Sheep Production', query: 'Why do goats get swollen hooves and foot rot in muddy kraals?', expectedCategories: ['Goat and Sheep Production'] },
  { id: 'goat-2', group: 'Goat and Sheep Production', query: 'How should I design a raised slatted goat house and deworm kids?', expectedCategories: ['Goat and Sheep Production'] },
  { id: 'goat-3', group: 'Goat and Sheep Production', query: 'Which vaccines protect Boer goats and Dorper sheep against pulpy kidney?', expectedCategories: ['Goat and Sheep Production'] },

  // 14. Pig Production (3)
  { id: 'pig-1', group: 'Pig Production', query: 'How do pig farmers prevent African Swine Fever in Zimbabwe?', expectedCategories: ['Pig Production'] },
  { id: 'pig-2', group: 'Pig Production', query: 'Why is boiling kitchen swill mandatory before feeding pigs?', expectedCategories: ['Pig Production'] },
  { id: 'pig-3', group: 'Pig Production', query: 'How are farrowing pens and creep feed managed for newborn piglets?', expectedCategories: ['Pig Production'] },

  // 15. Soil Science (3)
  { id: 'soil-1', group: 'Soil Science', query: 'How do I collect a representative soil sample before laboratory testing?', expectedCategories: ['Soil Science'] },
  { id: 'soil-2', group: 'Soil Science', query: 'What is the difference between sandy granite soils and red clay loam in Zimbabwe?', expectedCategories: ['Soil Science'] },
  { id: 'soil-3', group: 'Soil Science', query: 'How do farmers break a compacted plough hardpan in field soils?', expectedCategories: ['Soil Science'] },

  // 16. Soil Fertility and Nutrient Management (3)
  { id: 'fertN-1', group: 'Soil Fertility and Nutrient Management', query: 'How do I tell nitrogen deficiency apart from phosphorus deficiency in maize?', expectedCategories: ['Soil Fertility and Nutrient Management', 'Maize Production'] },
  { id: 'fertN-2', group: 'Soil Fertility and Nutrient Management', query: 'What is Integrated Soil Fertility Management combining manure and NPK?', expectedCategories: ['Soil Fertility and Nutrient Management'] },
  { id: 'fertN-3', group: 'Soil Fertility and Nutrient Management', query: 'Why do bottom leaves turn yellow while young leaves stay green?', expectedCategories: ['Soil Fertility and Nutrient Management'] },

  // 17. Soil pH and Lime Requirements (3)
  { id: 'ph-1', group: 'Soil pH and Lime Requirements', query: 'Why does fertiliser fail to work when soil is sour or acidic?', expectedCategories: ['Soil pH and Lime Requirements'] },
  { id: 'ph-2', group: 'Soil pH and Lime Requirements', query: 'What is the difference between dolomitic lime and calcitic lime?', expectedCategories: ['Soil pH and Lime Requirements'] },
  { id: 'ph-3', group: 'Soil pH and Lime Requirements', query: 'How many months before planting should agricultural lime be incorporated?', expectedCategories: ['Soil pH and Lime Requirements'] },

  // 18. Fertiliser Management (3)
  { id: 'fert-1', group: 'Fertiliser Management', query: 'What is the difference between Compound D, Ammonium Nitrate, and Urea?', expectedCategories: ['Fertiliser Management'] },
  { id: 'fert-2', group: 'Fertiliser Management', query: 'How do farmers reduce Urea volatilisation and nitrogen leaching on sandy soil?', expectedCategories: ['Fertiliser Management'] },
  { id: 'fert-3', group: 'Fertiliser Management', query: 'What are the 4R fertiliser stewardship rules for top dressing?', expectedCategories: ['Fertiliser Management'] },

  // 19. Irrigation and Water Management (3)
  { id: 'irr-1', group: 'Irrigation and Water Management', query: 'How do I compare drip irrigation versus sprinkler irrigation efficiency?', expectedCategories: ['Irrigation and Water Management'] },
  { id: 'irr-2', group: 'Irrigation and Water Management', query: 'How does rainwater harvesting using tied ridges and contour bunds work?', expectedCategories: ['Irrigation and Water Management'] },
  { id: 'irr-3', group: 'Irrigation and Water Management', query: 'Why should tomatoes be irrigated early morning at the root zone?', expectedCategories: ['Irrigation and Water Management', 'Vegetable Production'] },

  // 20. Agricultural Pests and Diseases (3)
  { id: 'pest-1', group: 'Agricultural Pests and Diseases', query: 'How do I identify Fall Armyworm versus maize stalk borer and apply IPM?', expectedCategories: ['Agricultural Pests and Diseases'] },
  { id: 'pest-2', group: 'Agricultural Pests and Diseases', query: 'How do farmers control Tuta absoluta and early blight on tomatoes?', expectedCategories: ['Agricultural Pests and Diseases', 'Vegetable Production'] },
  { id: 'pest-3', group: 'Agricultural Pests and Diseases', query: 'Why should active pesticide ingredients be rotated across sprays?', expectedCategories: ['Agricultural Pests and Diseases'] },

  // 21. Weed Management (3)
  { id: 'weed-1', group: 'Weed Management', query: 'When is the critical weed-free period for summer maize?', expectedCategories: ['Weed Management'] },
  { id: 'weed-2', group: 'Weed Management', query: 'How do farmers suppress purple witchweed Striga or bise in cereal fields?', expectedCategories: ['Weed Management'] },
  { id: 'weed-3', group: 'Weed Management', query: 'What precautions apply before spraying pre-emergence herbicides safely?', expectedCategories: ['Weed Management'] },

  // 22. Conservation Agriculture (3)
  { id: 'cons-1', group: 'Conservation Agriculture', query: 'What are the three core principles of Conservation Agriculture?', expectedCategories: ['Conservation Agriculture'] },
  { id: 'cons-2', group: 'Conservation Agriculture', query: 'How do minimum tillage rip lines and mulch protect crops during dry spells?', expectedCategories: ['Conservation Agriculture'] },
  { id: 'cons-3', group: 'Conservation Agriculture', query: 'Why does bare soil lose moisture faster than mulched Intwasa basins?', expectedCategories: ['Conservation Agriculture', 'Maize Production'] },

  // 23. Climate-Smart Agriculture (3)
  { id: 'clim-1', group: 'Climate-Smart Agriculture', query: 'What crops suit Zimbabwe Natural Regions IV and V under El Nino drought?', expectedCategories: ['Climate-Smart Agriculture'] },
  { id: 'clim-2', group: 'Climate-Smart Agriculture', query: 'Compare Zimbabwe Natural Regions I, II, III, IV, and V rainfall zones.', expectedCategories: ['Climate-Smart Agriculture'] },
  { id: 'clim-3', group: 'Climate-Smart Agriculture', query: 'Why should semi-arid farmers plant sorghum, pearl millet, and cowpeas?', expectedCategories: ['Climate-Smart Agriculture'] },

  // 24. Agricultural Economics (3)
  { id: 'econ-1', group: 'Agricultural Economics', query: 'How do I calculate gross margin and break-even yield for my farm enterprise?', expectedCategories: ['Agricultural Economics'] },
  { id: 'econ-2', group: 'Agricultural Economics', query: 'What is the difference between variable costs and fixed costs in budgeting?', expectedCategories: ['Agricultural Economics'] },
  { id: 'econ-3', group: 'Agricultural Economics', query: 'How can a broiler farmer check if the business is losing money or profitable?', expectedCategories: ['Agricultural Economics', 'Poultry Production'] },

  // 25. Farm Management (3)
  { id: 'mgmt-1', group: 'Farm Management', query: 'What farm records and cashbooks should smallholders maintain weekly?', expectedCategories: ['Farm Management'] },
  { id: 'mgmt-2', group: 'Farm Management', query: 'Why is tracking pesticide Pre-Harvest Interval critical in farm management?', expectedCategories: ['Farm Management'] },
  { id: 'mgmt-3', group: 'Farm Management', query: 'How do cropping calendars and input store-room logs prevent shortages?', expectedCategories: ['Farm Management'] },

  // 26. Agricultural Marketing (3)
  { id: 'mkt-1', group: 'Agricultural Marketing', query: 'How do grading, sorting, and market research get farmers better prices?', expectedCategories: ['Agricultural Marketing'] },
  { id: 'mkt-2', group: 'Agricultural Marketing', query: 'How can farmers avoid middlemen and sell directly to buyers on FarmBridge?', expectedCategories: ['Agricultural Marketing', 'FarmBridge Platform Guide'] },
  { id: 'mkt-3', group: 'Agricultural Marketing', query: 'How should fresh produce be packaged and weighed cleanly before delivery?', expectedCategories: ['Agricultural Marketing'] },

  // 27. Post-Harvest Management (3)
  { id: 'post-1', group: 'Post-Harvest Management', query: 'How do PICS hermetic bags stop maize weevils and Larger Grain Borer?', expectedCategories: ['Post-Harvest Management'] },
  { id: 'post-2', group: 'Post-Harvest Management', query: 'What safe moisture percentage prevents aflatoxin mould in stored grain and groundnuts?', expectedCategories: ['Post-Harvest Management'] },
  { id: 'post-3', group: 'Post-Harvest Management', query: 'How do farmers check grain dryness using the salt-bottle test before storage?', expectedCategories: ['Post-Harvest Management'] },

  // 28. Agricultural Entrepreneurship (3)
  { id: 'ent-1', group: 'Agricultural Entrepreneurship', query: 'How can farmers add value through peanut butter, dried mufushwa, or packaging?', expectedCategories: ['Agricultural Entrepreneurship'] },
  { id: 'ent-2', group: 'Agricultural Entrepreneurship', query: 'How should a young agripreneur start small and protect working capital?', expectedCategories: ['Agricultural Entrepreneurship'] },
  { id: 'ent-3', group: 'Agricultural Entrepreneurship', query: 'Why does enterprise diversification reduce agribusiness risk?', expectedCategories: ['Agricultural Entrepreneurship'] },

  // 29. FarmBridge Platform Guide (2)
  { id: 'plat-1', group: 'FarmBridge Platform', query: 'How do buyers verify email, place an order, and upload Proof of Payment on FarmBridge?', expectedCategories: ['FarmBridge Platform Guide'] },
  { id: 'plat-2', group: 'FarmBridge Platform', query: 'How does a farmer list a product or post a Hot Deal on FarmBridge?', expectedCategories: ['FarmBridge Platform Guide'] },

  // 30. Shona & Ndebele Multilingual Queries (10)
  { id: 'sn-1', group: 'Shona & Ndebele', query: 'Ndingarimire sei chibage nePfumvudza kuti ndiwane goho rakanaka?', language: 'auto', expectedCategories: ['Zimbabwean Agricultural Practices', 'Maize Production', 'Conservation Agriculture'] },
  { id: 'sn-2', group: 'Shona & Ndebele', query: 'Chii chinokonzera makonye pachibage uye ndingaadzivirira sei?', language: 'auto', expectedCategories: ['Agricultural Pests and Diseases', 'Maize Production'] },
  { id: 'sn-3', group: 'Shona & Ndebele', query: 'Ndingachengeta sei huku dzebroiler zvakanaka?', language: 'auto', expectedCategories: ['Poultry Production', 'Zimbabwean Agricultural Practices'] },
  { id: 'sn-4', group: 'Shona & Ndebele', query: 'Ivhu rangu rine acid yakawanda, ndinoisa lime rinhi?', language: 'auto', expectedCategories: ['Soil pH and Lime Requirements', 'Zimbabwean Agricultural Practices'] },
  { id: 'sn-5', group: 'Shona & Ndebele', query: 'Ndezvipi zvirimwa zviri kutengeswa paFarmBridge izvozvi?', language: 'auto', expectedCategories: ['FarmBridge Marketplace'], expectMarketplaceProducts: true },
  { id: 'nd-1', group: 'Shona & Ndebele', query: 'Ngingawulungiselela njani umhlabathi womumbu ngeIntwasa?', language: 'auto', expectedCategories: ['Zimbabwean Agricultural Practices', 'Maize Production', 'Conservation Agriculture'] },
  { id: 'nd-2', group: 'Shona & Ndebele', query: 'Ngingavikela njani izinkukhu zami emkhuhlaneni?', language: 'auto', expectedCategories: ['Poultry Production', 'Zimbabwean Agricultural Practices'] },
  { id: 'nd-3', group: 'Shona & Ndebele', query: 'Izinkomo zami zilomkhuhlane wemikhaza, ngizidipha kangaki?', language: 'auto', expectedCategories: ['Cattle Production'] },
  { id: 'nd-4', group: 'Shona & Ndebele', query: 'Ngingakhupha njani ukhula emasimini omumbu?', language: 'auto', expectedCategories: ['Weed Management'] },
  { id: 'nd-5', group: 'Shona & Ndebele', query: 'Kuyini okuthengiswayo kuFarmBridge khathesi?', language: 'auto', expectedCategories: ['FarmBridge Marketplace'], expectMarketplaceProducts: true },

  // 31. Spelling Errors & Typos (12)
  { id: 'typo-1', group: 'Spelling Errors', query: 'When should I apply fertlizer to my maize?', expectedCategories: ['Fertiliser Management', 'Maize Production'], expectCorrectedTerm: true },
  { id: 'typo-2', group: 'Spelling Errors', query: 'How do I dig pfumvuza basins properly?', expectedCategories: ['Maize Production', 'Conservation Agriculture'], expectCorrectedTerm: true },
  { id: 'typo-3', group: 'Spelling Errors', query: 'Which irigation method saves the most water?', expectedCategories: ['Irrigation and Water Management'], expectCorrectedTerm: true },
  { id: 'typo-4', group: 'Spelling Errors', query: 'How do farmers stop fall armywrm in cereal crops?', expectedCategories: ['Agricultural Pests and Diseases'], expectCorrectedTerm: true },
  { id: 'typo-5', group: 'Spelling Errors', query: 'Why are my tommatoes getting black rot at the bottom?', expectedCategories: ['Vegetable Production'], expectCorrectedTerm: true },
  { id: 'typo-6', group: 'Spelling Errors', query: 'How do I inoculate soyben seeds before planting?', expectedCategories: ['Soya Bean Production'], expectCorrectedTerm: true },
  { id: 'typo-7', group: 'Spelling Errors', query: 'What brooding heat do broiller chicks need?', expectedCategories: ['Poultry Production'], expectCorrectedTerm: true },
  { id: 'typo-8', group: 'Spelling Errors', query: 'Are pre-emergence herbicids safe on sandy soil?', expectedCategories: ['Weed Management'], expectCorrectedTerm: true },
  { id: 'typo-9', group: 'Spelling Errors', query: 'How do PICS bags kill maize wevils after harvest?', expectedCategories: ['Post-Harvest Management'], expectCorrectedTerm: true },
  { id: 'typo-10', group: 'Spelling Errors', query: 'When do I incorporate dolomtik lime for acidic soil?', expectedCategories: ['Soil pH and Lime Requirements'], expectCorrectedTerm: true },
  { id: 'typo-11', group: 'Spelling Errors', query: 'How do you control theleriosis tick disease in cattle?', expectedCategories: ['Cattle Production'], expectCorrectedTerm: true },
  { id: 'typo-12', group: 'Spelling Errors', query: 'What postharvst moisture avoids groundnut aflatoxin?', expectedCategories: ['Post-Harvest Management'], expectCorrectedTerm: true },

  // 32. Multi-Turn Context & Clarifying Questions (10)
  {
    id: 'ctx-1',
    group: 'Context & Clarification',
    query: 'What pests attack them?',
    history: [{ role: 'user', content: 'I am planting tomatoes this month.' }],
    expectedCategories: ['Agricultural Pests and Diseases', 'Vegetable Production'],
    expectContextCropOrLivestockOrRegion: 'Tomatoes'
  },
  {
    id: 'ctx-2',
    group: 'Context & Clarification',
    query: 'How should I irrigate them to prevent blight?',
    history: [
      { role: 'user', content: 'I am planting tomatoes this month.' },
      { role: 'assistant', content: 'Here is tomato guidance.' },
      { role: 'user', content: 'What pests attack them?' }
    ],
    expectedCategories: ['Irrigation and Water Management', 'Vegetable Production'],
    expectContextCropOrLivestockOrRegion: 'Tomatoes'
  },
  {
    id: 'ctx-3',
    group: 'Context & Clarification',
    query: 'What crops grow well there?',
    history: [{ role: 'user', content: 'My farm is in Natural Region IV near Bulawayo.' }],
    expectedCategories: ['Climate-Smart Agriculture'],
    expectContextCropOrLivestockOrRegion: 'Natural Region IV'
  },
  {
    id: 'ctx-4',
    group: 'Context & Clarification',
    query: 'How do I prevent diseases in them?',
    history: [{ role: 'user', content: 'I want to start raising pigs.' }],
    expectedCategories: ['Pig Production'],
    expectContextCropOrLivestockOrRegion: 'Pigs'
  },
  {
    id: 'ctx-5',
    group: 'Context & Clarification',
    query: 'How do I calculate break even profit for it?',
    history: [{ role: 'user', content: 'I raise 200 broiler chickens per cycle.' }],
    expectedCategories: ['Agricultural Economics', 'Poultry Production'],
    expectContextCropOrLivestockOrRegion: 'Poultry'
  },
  {
    id: 'ctx-6',
    group: 'Context & Clarification',
    query: 'When do I apply top dressing on it?',
    history: [{ role: 'user', content: 'We planted Pfumvudza maize last week.' }],
    expectedCategories: ['Maize Production', 'Fertiliser Management'],
    expectContextCropOrLivestockOrRegion: 'Maize'
  },
  {
    id: 'ctx-7',
    group: 'Context & Clarification',
    query: 'How do I store it after harvest?',
    history: [{ role: 'user', content: 'I harvested 3 tonnes of soya beans.' }],
    expectedCategories: ['Post-Harvest Management', 'Soya Bean Production'],
    expectContextCropOrLivestockOrRegion: 'Soya Beans'
  },
  {
    id: 'ctx-8',
    group: 'Context & Clarification',
    query: 'What should I plant on my farm this season?',
    expectedCategories: ['Crop Production', 'Climate-Smart Agriculture'],
    expectClarification: true
  },
  {
    id: 'ctx-9',
    group: 'Context & Clarification',
    query: 'How much fertiliser per hectare do I need?',
    expectedCategories: ['Fertiliser Management'],
    expectClarification: true
  },
  {
    id: 'ctx-10',
    group: 'Context & Clarification',
    query: 'My crop leaves are turning yellow and stunted, why?',
    expectedCategories: ['Soil Fertility and Nutrient Management', 'Maize Production'],
    expectClarification: true
  },

  // 33. Live Marketplace & Unlisted Honesty (4)
  { id: 'mkt-live-1', group: 'Live Marketplace', query: 'Show me fresh tomatoes available for sale on FarmBridge right now.', expectedCategories: ['FarmBridge Marketplace', 'Vegetable Production'], expectMarketplaceProducts: true },
  { id: 'mkt-live-2', group: 'Live Marketplace', query: 'What categories of products are listed on FarmBridge?', expectedCategories: ['FarmBridge Marketplace'], expectMarketplaceProducts: true },
  { id: 'mkt-live-3', group: 'Live Marketplace', query: 'Do you have any poultry or chicken meat for sale?', expectedCategories: ['FarmBridge Marketplace', 'Poultry Production'] },
  { id: 'mkt-live-4', group: 'Live Marketplace', query: 'Is there any combine harvester helicopter for sale on FarmBridge?', expectNoMarketplaceMatch: true },

  // 34. Unsupported / Out-of-Scope Honesty (7)
  { id: 'oos-1', group: 'Unsupported / Out-of-Scope', query: 'Who won the 2022 FIFA World Cup final?', expectLowConfidence: true },
  { id: 'oos-2', group: 'Unsupported / Out-of-Scope', query: 'Write a Python web scraper using BeautifulSoup.', expectLowConfidence: true },
  { id: 'oos-3', group: 'Unsupported / Out-of-Scope', query: 'What is the capital city of Brazil?', expectLowConfidence: true },
  { id: 'oos-4', group: 'Unsupported / Out-of-Scope', query: 'Diagnose sharp human chest pain and prescribe antibiotics.', expectLowConfidence: true },
  { id: 'oos-5', group: 'Unsupported / Out-of-Scope', query: 'Can you predict tomorrow Euro to USD forex exchange rate?', expectLowConfidence: true },
  { id: 'oos-6', group: 'Unsupported / Out-of-Scope', query: 'How do I repair a broken iPhone screen?', expectLowConfidence: true },
  { id: 'oos-7', group: 'Unsupported / Out-of-Scope', query: 'Explain quantum entanglement in particle physics.', expectLowConfidence: true }
];

async function runSuite() {
  const analyticsPath = path.join(process.cwd(), 'server', 'data', 'tariro', 'analytics.json');
  const hadAnalytics = fs.existsSync(analyticsPath);
  const analyticsBackup = hadAnalytics ? fs.readFileSync(analyticsPath, 'utf8') : null;

  let passed = 0;
  let failed = 0;
  const failures: Array<{ id: string; group: string; query: string; reason: string; topic: string; score: number }> = [];
  const weakMatches: Array<{ id: string; group: string; query: string; topic: string; score: number }> = [];
  const groupStats = new Map<string, { total: number; pass: number; confSum: number }>();

  try {
    console.log(`\nRunning TARIRO Intelligence Eval Suite (${TEST_CASES.length} questions)...\n`);

    for (const tc of TEST_CASES) {
      const res = await tariroService.chat({
        message: tc.query,
        history: tc.history,
        language: tc.language || 'auto'
      });

      const stats = groupStats.get(tc.group) || { total: 0, pass: 0, confSum: 0 };
      stats.total += 1;
      stats.confSum += res.confidenceScore;

      const reasons: string[] = [];

      if (tc.expectLowConfidence) {
        if (!res.lowConfidence && res.confidenceScore >= 0.4) {
          reasons.push(`Expected lowConfidence/refusal, got topic="${res.topic}" score=${res.confidenceScore}`);
        }
      } else if (tc.expectNoMarketplaceMatch) {
        if (res.matchedProducts.length > 0) {
          reasons.push(`Expected 0 marketplace matches, got ${res.matchedProducts.length}`);
        }
      } else {
        if (res.lowConfidence) {
          reasons.push(`Unexpected lowConfidence=true (Knowledge Gap)`);
        }
        if (tc.expectedCategories && !tc.expectedCategories.includes(res.topic)) {
          reasons.push(`Expected topic in [${tc.expectedCategories.join(', ')}], got "${res.topic}"`);
        }
        if (tc.expectCorrectedTerm && res.correctedTerms.length === 0) {
          reasons.push(`Expected spelling correction, got correctedTerms=[]`);
        }
        if (tc.expectClarification && !res.needsClarification) {
          reasons.push(`Expected needsClarification=true, got false`);
        }
        if (tc.expectMarketplaceProducts && res.matchedProducts.length === 0) {
          reasons.push(`Expected matchedProducts.length > 0, got 0`);
        }
        if (tc.expectContextCropOrLivestockOrRegion) {
          const ctxValues = Object.values(res.resolvedContext || {}).filter(Boolean);
          if (!ctxValues.includes(tc.expectContextCropOrLivestockOrRegion)) {
            reasons.push(
              `Expected context slot "${tc.expectContextCropOrLivestockOrRegion}", got ${JSON.stringify(res.resolvedContext)}`
            );
          }
        }
        if (res.confidenceScore < 0.45 && reasons.length === 0) {
          weakMatches.push({
            id: tc.id,
            group: tc.group,
            query: tc.query,
            topic: res.topic,
            score: res.confidenceScore
          });
        }
      }

      if (reasons.length === 0) {
        passed += 1;
        stats.pass += 1;
      } else {
        failed += 1;
        failures.push({
          id: tc.id,
          group: tc.group,
          query: tc.query,
          reason: reasons.join('; '),
          topic: res.topic,
          score: res.confidenceScore
        });
      }

      groupStats.set(tc.group, stats);
    }

    console.log('=== Category / Group Summary ===');
    for (const [grp, st] of groupStats.entries()) {
      const avgConf = (st.confSum / st.total).toFixed(2);
      console.log(`  ${grp.padEnd(40)} ${st.pass}/${st.total} passed  (avg conf: ${avgConf})`);
    }

    console.log(`\nOVERALL: ${passed}/${TEST_CASES.length} passed (${((passed / TEST_CASES.length) * 100).toFixed(1)}%), ${failed} failed.`);

    if (failures.length > 0) {
      console.log('\n=== Failures ===');
      for (const f of failures) {
        console.log(`  [FAIL] ${f.id} (${f.group}) -> "${f.query}"\n         Reason: ${f.reason} (topic="${f.topic}", score=${f.score})`);
      }
    }

    if (weakMatches.length > 0) {
      console.log('\n=== Weak Supported Matches (confidence < 0.45) ===');
      for (const w of weakMatches) {
        console.log(`  [WEAK] ${w.id} (${w.group}) -> "${w.query}" (topic="${w.topic}", score=${w.score})`);
      }
    }

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (hadAnalytics && analyticsBackup !== null) {
      fs.writeFileSync(analyticsPath, analyticsBackup, 'utf8');
    }
  }
}

runSuite().catch(err => {
  console.error('Eval suite error:', err);
  process.exit(1);
});
