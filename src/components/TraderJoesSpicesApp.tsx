import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Layers, 
  Grid, 
  BookOpen, 
  Sparkles,
  Info, 
  Check, 
  X, 
  ArrowUpDown,
  AlertCircle,
  HelpCircle,
  ShoppingBag
} from 'lucide-react';

// Interfaces
interface Seasoning {
  id: string;
  name: string;
  description: string;
  ingredients: string[]; // Normalized ingredients
  originalIngredients: string;
  tags: string[];
  status: 'Active' | 'Seasonal' | 'Discontinued';
  flavorProfile: string;
  useCase: string;
  sodiumFree?: boolean;
}

// 25 Trader Joe's seasonings dataset
const seasoningsData: Seasoning[] = [
  {
    id: 'everything-bagel',
    name: 'Everything But the Bagel Sesame Seasoning Blend',
    description: 'The legendary seasoning that started the "Everything But..." craze. A crunchy, savory blend that goes on everything.',
    ingredients: ['Salt', 'Garlic', 'Onion', 'Sesame Seeds', 'Poppy Seeds'],
    originalIngredients: 'Sesame seeds, sea salt flakes, dried minced garlic, dried minced onion, black sesame seeds, poppy seeds.',
    tags: ['Seeds', 'Salty', 'Garlicky', 'Crunchy'],
    status: 'Active',
    flavorProfile: 'Toasty, nutty, and garlicky with a sharp salt finish.',
    useCase: 'Avocado toast, eggs, cream cheese, roasted potatoes, salmon.'
  },
  {
    id: '21-seasoning',
    name: '21 Seasoning Salute',
    description: 'A complex, salt-free blend of herbs and spices that adds a bright, savory depth to dishes.',
    ingredients: [
      'Onion', 'Black Pepper', 'Celery Seed', 'Cayenne Pepper', 'Parsley', 'Basil', 
      'Marjoram', 'Bay Leaf', 'Oregano', 'Thyme', 'Savory', 'Rosemary', 'Cumin', 
      'Mustard', 'Coriander', 'Garlic', 'Orange/Lemon Peel', 'Tomato', 'Citric Acid', 'Lemon/Lime Oil'
    ],
    originalIngredients: 'Onion, black pepper, celery seed, cayenne pepper, parsley, basil, marjoram, bay leaf, oregano, thyme, savory, rosemary, cumin, mustard, coriander, garlic, carrot, orange peel, tomato granules, lemon juice powder, oil of lemon, citric acid.',
    tags: ['Salt-Free', 'Herbal', 'Citrusy', 'Complex'],
    status: 'Active',
    flavorProfile: 'Earthy and green, with warm undertones and a bright lemony finish.',
    useCase: 'Chicken marinade, roasted vegetables, turkey burgers, soups.',
    sodiumFree: true
  },
  {
    id: 'chile-lime',
    name: 'Chile Lime Seasoning Blend',
    description: 'A tart, salty, and mildly spicy blend inspired by Mexican street food.',
    ingredients: ['Salt', 'Chili Pepper', 'Citric Acid', 'Red Bell Pepper'],
    originalIngredients: 'Sea salt, chile pepper, red bell pepper, lime juice powder, citric acid, rice concentrate.',
    tags: ['Spicy', 'Citrusy', 'Salty'],
    status: 'Active',
    flavorProfile: 'Sharp citrus acidity balanced by dry, smoky chili heat.',
    useCase: 'Mango slices, watermelon, corn on the cob (Elote), chicken, fish tacos.'
  },
  {
    id: 'soffritto',
    name: 'Italian Style Soffritto Seasoning Blend',
    description: 'Inspired by the classic aromatic base of Italian cooking. A chunky blend that adds texture.',
    ingredients: ['Onion', 'Tomato', 'Salt', 'Garlic', 'Cayenne Pepper', 'Parsley', 'Rosemary', 'Sage'],
    originalIngredients: 'Dried minced onion, tomato flakes, sea salt, dried minced garlic, crushed chili peppers, parsley flakes, crushed red pepper, dried rosemary, sage leaves.',
    tags: ['Herbal', 'Garlicky', 'Chunky', 'Italian'],
    status: 'Active',
    flavorProfile: 'Sweet tomato and onion base with sharp garlic chunks and herbaceous pine notes.',
    useCase: 'Olive oil dipping sauce, pasta sauces, focaccia, roasted root vegetables.'
  },
  {
    id: 'everything-elote',
    name: 'Everything But the Elote Seasoning Blend',
    description: 'Captures the smoky, sweet, salty, and cheesy flavor of Mexican street corn.',
    ingredients: ['Sugar', 'Salt', 'Corn Flour', 'Chili Pepper', 'Cheese', 'Cumin', 'Cilantro'],
    originalIngredients: 'Cane sugar, sea salt, corn flour, chile pepper, parmesan cheese, chipotle powder, natural flavor, dried cilantro, organic rice fiber, cumin powder.',
    tags: ['Dairy', 'Sweet', 'Salty', 'Spicy', 'Smoky'],
    status: 'Active',
    flavorProfile: 'Sweet and buttery, with a kick of chipotle smoke and tangy cheese.',
    useCase: 'Popcorn, corn on the cob, grilled chicken, roasted potatoes, mac & cheese.'
  },
  {
    id: 'green-goddess',
    name: 'Green Goddess Seasoning Blend',
    description: 'A herbaceous and tangy blend inspired by the classic dressing. Great for dressing up dips.',
    ingredients: ['Onion', 'Salt', 'Garlic', 'Black Pepper', 'Dill', 'Spinach', 'Citric Acid', 'Lemon/Lime Oil', 'Parsley', 'Safflower/Sunflower Oil'],
    originalIngredients: 'Dried minced onion, salt, granulated garlic, ground black pepper, dried chives, dried green onion, spinach powder, lemon powder (citric acid, lemon oil, lemon juice), dried parsley, safflower oil.',
    tags: ['Herbal', 'Citrusy', 'Garlicky', 'Green'],
    status: 'Active',
    flavorProfile: 'Tangy and onion-forward, with heavy green notes of dill and parsley.',
    useCase: 'Greek yogurt dip, salad dressing, baked fish, cucumber slices, roasted chicken.'
  },
  {
    id: 'citrusy-garlic',
    name: 'Cuban Style Citrusy Garlic Seasoning Blend',
    description: 'A bright, garlic-heavy blend with zesty lime and warm cumin, mimicking mojo marinade.',
    ingredients: ['Garlic', 'Citric Acid', 'Onion', 'Salt', 'Lemon/Lime Oil', 'Cayenne Pepper', 'Bay Leaf', 'Coriander', 'Cumin', 'Black Pepper'],
    originalIngredients: 'Garlic, citric acid, onion powder, salt, lime oil, lime juice, red pepper, bay leaves, coriander powder, cumin powder, ground black pepper.',
    tags: ['Garlicky', 'Citrusy', 'Salty', 'Cuban'],
    status: 'Active',
    flavorProfile: 'Pucker-up lime tang combined with intense garlic aroma and warm spices.',
    useCase: 'Pork chops, black beans, chicken, grilled shrimp, rice.'
  },
  {
    id: 'leftovers',
    name: 'Everything But the Leftovers Seasoning Blend',
    description: 'Thanksgiving stuffing in a jar. A seasonal favorite full of warm savory herbs.',
    ingredients: ['Onion', 'Salt', 'Yeast Extract', 'Black Pepper', 'Turmeric', 'Celery Seed', 'Citric Acid', 'Sage', 'Rosemary', 'Thyme', 'Parsley'],
    originalIngredients: 'Dehydrated onion, sea salt, yeast extract, salt, ground black pepper, dried yeast, turmeric powder, dried celery seed, citric acid, ground sage, rosemary powder, dried thyme, dried parsley.',
    tags: ['Herbal', 'Umami', 'Salty', 'Seasonal'],
    status: 'Seasonal',
    flavorProfile: 'Highly savory, resembling slow-roasted poultry gravy and sage stuffing.',
    useCase: 'Roasted potatoes, turkey, roasted carrots, mashed potatoes, popcorn.'
  },
  {
    id: 'umami',
    name: 'Mushroom & Company Multipurpose Umami Seasoning',
    description: 'A savory powerhouse made with dried mushrooms, mustard, and thyme.',
    ingredients: ['Salt', 'Onion', 'Mustard', 'Mushroom', 'Cayenne Pepper', 'Black Pepper', 'Thyme'],
    originalIngredients: 'Kosher salt, dried onion, ground mustard seed, porcini mushroom powder, white button mushroom powder, crushed red pepper, black pepper, dried thyme.',
    tags: ['Umami', 'Earthy', 'Earthy/Warm'],
    status: 'Active',
    flavorProfile: 'Earthy, deep, and savory with a gentle kick of mustard and chili heat.',
    useCase: 'Burgers, scrambled eggs, roasted mushrooms, steaks, gravies.'
  },
  {
    id: 'ranch',
    name: 'Ranch Seasoning Blend',
    description: 'Classic ranch dressing flavor in powder form. Tangy, creamy, and herbal.',
    ingredients: ['Cheese', 'Garlic', 'Onion', 'Dill', 'Salt', 'Sugar', 'Black Pepper', 'Parsley'],
    originalIngredients: 'Buttermilk flavoring, garlic, onion, dill, salt, sugar, black pepper, green onion, chives.',
    tags: ['Dairy', 'Herbal', 'Sweet', 'Tangy'],
    status: 'Active',
    flavorProfile: 'Tangy and milky with sweet onion, sharp garlic, and clean dill notes.',
    useCase: 'Popcorn, french fries, chicken wings, sour cream dip, roasted potatoes.'
  },
  {
    id: 'aglio-olio',
    name: 'Aglio e Olio Seasoning Blend',
    description: 'Inspired by the classic Italian pasta dish of garlic, oil, and chili.',
    ingredients: ['Garlic', 'Salt', 'Parsley', 'Red Bell Pepper', 'Cayenne Pepper', 'Safflower/Sunflower Oil'],
    originalIngredients: 'Minced garlic, sea salt flakes, parsley, red bell pepper, red chili pepper, safflower oil.',
    tags: ['Garlicky', 'Spicy', 'Salty', 'Italian'],
    status: 'Active',
    flavorProfile: 'Heavy, crunchy garlic flavor backed by crisp chili flakes and clean parsley.',
    useCase: 'Pasta Aglio e Olio, garlic bread, olive oil dips, pizza topper, sautéed shrimp.'
  },
  {
    id: 'pickle',
    name: 'Everything But the Pickle Seasoning Blend',
    description: 'A tangy, dill-forward seasoning that captures the exact taste of a salty dill pickle.',
    ingredients: ['Salt', 'Onion', 'Vinegar', 'Sugar', 'Garlic', 'Dill', 'Citric Acid', 'Safflower/Sunflower Oil'],
    originalIngredients: 'Sea salt, granulated onion, vinegar powder, sugar, granulated garlic, dried dill, citric acid, rice concentrate, safflower oil, dillweed oil.',
    tags: ['Sour/Vinegar', 'Herbal', 'Salty', 'Seasonal'],
    status: 'Seasonal',
    flavorProfile: 'Extremely tangy, acidic, and dill-heavy with a garlic-salt backbone.',
    useCase: 'Popcorn, potato chips, roasted potatoes, chicken burgers, cucumber salad.'
  },
  {
    id: 'pizza',
    name: 'Pizza Sprinkle Seasoning Blend',
    description: 'A blend of tomato, garlic, and classic herbs that makes anything taste like a slice.',
    ingredients: ['Tomato', 'Garlic', 'Salt', 'Chili Pepper', 'Oregano', 'Basil'],
    originalIngredients: 'Tomato powder, granulated garlic, salt, paprika, oregano, basil.',
    tags: ['Tomato', 'Herbal', 'Italian', 'Salty'],
    status: 'Active',
    flavorProfile: 'Tangy tomato sweetness combined with pungent garlic and earthy oregano.',
    useCase: 'Garlic bread, mozzarella sticks, popcorn, plain pasta, fried eggs.'
  },
  {
    id: 'ketchup',
    name: 'Ketchup Flavored Sprinkle Seasoning Blend',
    description: 'All the sweet, tangy, tomatoey goodness of ketchup in a dry shake.',
    ingredients: ['Tomato', 'Sugar', 'Salt', 'Vinegar', 'Onion', 'Garlic'],
    originalIngredients: 'Tomato powder, sugar, kosher salt, vinegar powder, onion powder, garlic powder, rice concentrate.',
    tags: ['Tomato', 'Sour/Vinegar', 'Sweet', 'Seasonal'],
    status: 'Seasonal',
    flavorProfile: 'Sweet, highly acidic, and intensely tomatoey with onion and garlic hints.',
    useCase: 'French fries, potato chips, scrambled eggs, hot dogs, roasted potatoes.'
  },
  {
    id: 'dukkah',
    name: 'Dukkah Nut & Spice Blend',
    description: 'A traditional Egyptian blend of toasted nuts, seeds, and warm spices.',
    ingredients: ['Almonds', 'Sesame Seeds', 'Fennel/Anise', 'Coriander', 'Salt'],
    originalIngredients: 'Almonds, sesame seeds, fennel seeds, coriander, anise seeds, kosher salt.',
    tags: ['Nuts', 'Seeds', 'Licorice/Fennel', 'Warm'],
    status: 'Active',
    flavorProfile: 'Crunchy and nutty, with warm citrus notes of coriander and sweet anise seeds.',
    useCase: 'Bread dipped in olive oil, crusted fish, goat cheese roll, roasted carrots.'
  },
  {
    id: 'zaatar',
    name: 'Za\'atar Seasoning Blend',
    description: 'A Middle Eastern staple featuring toasted sesame, wild thyme, and sumac-like acidity.',
    ingredients: ['Sesame Seeds', 'Thyme', 'Marjoram', 'Coriander', 'Oregano', 'Chickpea Flour', 'Salt', 'Safflower/Sunflower Oil', 'Citric Acid', 'Lemon/Lime Oil'],
    originalIngredients: 'Toasted sesame seeds, spices (thyme, marjoram, coriander, oregano), chickpea flour, sea salt, sunflower oil, citric acid, lemon oil.',
    tags: ['Seeds', 'Herbal', 'Citrusy', 'Middle Eastern'],
    status: 'Active',
    flavorProfile: 'Nutty, earthy, and green, with a tangy sumac acidity.',
    useCase: 'Labneh, hummus, pita bread with olive oil, roasted chicken, grilled eggplant.'
  },
  {
    id: 'furikake',
    name: 'Nori Komi Furikake Japanese Multi-purpose Seasoning',
    description: 'A Japanese seasoning blend that brings rich umami flavor and sesame crunch.',
    ingredients: ['Sesame Seeds', 'Nori/Kelp', 'Salt'],
    originalIngredients: 'White sesame seeds, black sesame seeds, nori (dried seaweed), salt, kelp powder.',
    tags: ['Seeds', 'Seaweed', 'Umami', 'Japanese'],
    status: 'Active',
    flavorProfile: 'Richly ocean-salty, sweet-savory seaweed crunch and nutty sesame seeds.',
    useCase: 'White rice, poke bowls, avocado toast, fried fish, ramen.'
  },
  {
    id: 'salmon-rub',
    name: 'Sweet & Smoky Salmon Rub',
    description: 'A sweet and savory rub that forms a caramelized, smoky crust on salmon.',
    ingredients: ['Sugar', 'Chili Pepper', 'Salt', 'Black Pepper', 'Thyme'],
    originalIngredients: 'Brown sugar, smoked paprika, kosher salt, black pepper, dried thyme.',
    tags: ['Sweet', 'Smoky', 'Salty'],
    status: 'Active',
    flavorProfile: 'Sweet molasses sugar layered with rich wood smoke and mild chili warmth.',
    useCase: 'Grilled salmon, pork ribs, chicken thighs, sweet potatoes.'
  },
  {
    id: 'bbq-coffee',
    name: 'BBQ Rub & Seasoning with Coffee & Garlic',
    description: 'A robust dry rub with dark coffee notes and brown sugar sweetness.',
    ingredients: ['Coffee', 'Sugar', 'Salt', 'Garlic', 'Onion', 'Chili Pepper', 'Orange/Lemon Peel', 'Safflower/Sunflower Oil'],
    originalIngredients: 'Coffee, brown sugar, sea salt, sugar, roasted garlic and onion flakes, smoked paprika, red bell pepper, clemengold rind, paprika oil.',
    tags: ['Coffee', 'Sweet', 'Smoky', 'Garlicky'],
    status: 'Active',
    flavorProfile: 'Bitter, earthy coffee contrasted with caramelized sugar, garlic, and smoky chili.',
    useCase: 'Steaks, beef brisket, pork shoulder, roasted sweet potatoes.'
  },
  {
    id: 'spicy-italian',
    name: 'Spicy Italian Style Sprinkle',
    description: 'A robust Italian seasoning with a fiery red pepper kick and licorice fennel.',
    ingredients: ['Black Pepper', 'Salt', 'Garlic', 'Chili Pepper', 'Rosemary', 'Fennel/Anise', 'Cayenne Pepper', 'Cumin'],
    originalIngredients: 'Black pepper, salt, dried garlic, paprika, dried rosemary, cracked fennel, crushed red pepper, cumin (powder and seeds).',
    tags: ['Spicy', 'Herbal', 'Licorice/Fennel', 'Discontinued'],
    status: 'Discontinued',
    flavorProfile: 'Warm and punchy pepper heat layered with fennel sweetness and garlic.',
    useCase: 'Italian sausage, meatballs, pizza, garlic bread, baked ziti.'
  },
  {
    id: 'cheesy',
    name: 'Cheesy Seasoning Blend',
    description: 'A powder form of real cheddar cheese and herbs to add instant cheesiness.',
    ingredients: ['Cheese', 'Salt', 'Garlic', 'Onion', 'Rosemary', 'Oregano'],
    originalIngredients: 'Dried cheddar cheese blend, sea salt, garlic powder, onion powder, dried rosemary, dried oregano.',
    tags: ['Dairy', 'Salty', 'Garlicky', 'Herbal'],
    status: 'Active',
    flavorProfile: 'Creamy, sharp cheddar cheese flavor accented by sweet garlic and green herbs.',
    useCase: 'Popcorn, garlic bread, baked potatoes, pasta, roasted broccoli.'
  },
  {
    id: 'sriracha',
    name: 'Sriracha Sprinkle Seasoning Blend',
    description: 'Combines the sweet, spicy, and tangy kick of sriracha chili sauce in a dry powder.',
    ingredients: ['Garlic', 'Sugar', 'Salt', 'Chili Pepper', 'Vinegar', 'Cayenne Pepper', 'Citric Acid'],
    originalIngredients: 'Granulated garlic, sugar, kosher salt, paprika, vinegar powder, cayenne pepper, dried red bell pepper, rice concentrate, citric acid.',
    tags: ['Spicy', 'Sweet', 'Sour/Vinegar', 'Discontinued'],
    status: 'Discontinued',
    flavorProfile: 'Sweet and tangy fire with heavy garlic notes and a sharp sour finish.',
    useCase: 'French fries, chicken wings, ramen, edamame, roasted peanuts.'
  },
  {
    id: 'lemon-pepper',
    name: 'Lemon Pepper Seasoning Blend',
    description: 'A bright, zesty pepper blend with a strong citrus aroma and garlic backbone.',
    ingredients: ['Black Pepper', 'Salt', 'Onion', 'Orange/Lemon Peel', 'Garlic', 'Lemon/Lime Oil', 'Citric Acid'],
    originalIngredients: 'Black peppercorns, sea salt, onion, lemon rind, garlic, lemon oil, citric acid.',
    tags: ['Black Pepper', 'Citrusy', 'Salty', 'Sharp'],
    status: 'Active',
    flavorProfile: 'Sharp, peppery bite combined with mouth-puckering lemon tartness.',
    useCase: 'Lemon pepper wings, grilled tilapia, chicken breasts, roasted asparagus.'
  },
  {
    id: 'south-african',
    name: 'South African Smoke Seasoning Blend',
    description: 'Features sea salt crystals smoked over oak wood, blended with sweet paprika.',
    ingredients: ['Salt', 'Chili Pepper', 'Garlic', 'Basil'],
    originalIngredients: 'Large flakes of sea salt, smoked paprika, garlic, basil.',
    tags: ['Salty', 'Smoky', 'Garlicky', 'Seasonal'],
    status: 'Seasonal',
    flavorProfile: 'Savory and intensely woody/smoky, backed by sweet chili and sweet basil.',
    useCase: 'Grilled meats, barbecue chicken, baked beans, roasted sweet potatoes.'
  },
  {
    id: 'ajika',
    name: 'Ajika Georgian Seasoning Blend',
    description: 'A warm, aromatic blend of chili, garlic, and unique herbs like fenugreek and marigold.',
    ingredients: ['Cayenne Pepper', 'Coriander', 'Fenugreek', 'Garlic', 'Salt', 'Marigold'],
    originalIngredients: 'Crushed chili peppers, coriander, fenugreek, dried minced garlic, salt, marigold.',
    tags: ['Spicy', 'Herbal', 'Earthy', 'Discontinued'],
    status: 'Discontinued',
    flavorProfile: 'Complex and highly aromatic, with sweet herbal fenugreek and warm red pepper.',
    useCase: 'Roasted chicken, beef stews, flatbreads, grilled vegetables, bean soups.'
  }
];

// Normalized ingredient metadata
const ingredientDetails: { [key: string]: { category: string; description: string } } = {
  'Salt': { category: 'Base', description: 'Sea salt, Kosher salt, or Salt flakes. The main flavour enhancer.' },
  'Garlic': { category: 'Allium', description: 'Minced, granulated, or powdered garlic. Brings sweet, pungent warmth.' },
  'Onion': { category: 'Allium', description: 'Minced onion, green onion, chives, or onion powder. Adds sweet, savory depth.' },
  'Black Pepper': { category: 'Spice', description: 'Black pepper or peppercorns. Delivers sharp, woody heat.' },
  'Cayenne Pepper': { category: 'Spice', description: 'Red pepper flakes or cayenne. Provides sharp, direct tongue heat.' },
  'Chili Pepper': { category: 'Spice', description: 'Paprika, smoked paprika, or chipotle. Gives warm, smoky sweetness and color.' },
  'Coriander': { category: 'Seed/Spice', description: 'Ground coriander seeds. Adds warm, floral, and slightly citrus notes.' },
  'Cumin': { category: 'Spice', description: 'Ground cumin. Brings earthy, warm, and musky aromatics.' },
  'Rosemary': { category: 'Herb', description: 'Dried rosemary. Pine-like, woody, and aromatic herb.' },
  'Thyme': { category: 'Herb', description: 'Dried thyme. Earthy, slightly minty green herb.' },
  'Oregano': { category: 'Herb', description: 'Dried oregano. Pungent, slightly bitter, and peppery herb.' },
  'Basil': { category: 'Herb', description: 'Dried basil. Sweet, peppery, and green herb.' },
  'Parsley': { category: 'Herb', description: 'Dried parsley flakes. Clean, grassy herb used for color and balance.' },
  'Sesame Seeds': { category: 'Seed', description: 'White, black, or toasted sesame seeds. Adds nuttiness and a crunchy texture.' },
  'Poppy Seeds': { category: 'Seed', description: 'Black poppy seeds. Tiny seeds adding crunch and nuttiness.' },
  'Mustard': { category: 'Spice', description: 'Ground mustard seeds. Pungent, sharp, and slightly bitter warmth.' },
  'Citric Acid': { category: 'Acid', description: 'Citric acid, lemon juice powder, or lime powder. Adds clean sourness.' },
  'Lemon/Lime Oil': { category: 'Citrus', description: 'Essential citrus oils. Imparts strong lemon or lime fragrance.' },
  'Orange/Lemon Peel': { category: 'Citrus', description: 'Dried citrus rind. Offers aromatic, bittersweet citrus flavor.' },
  'Sugar': { category: 'Sweetener', description: 'White sugar or brown sugar. Balance spice and aids caramelization.' },
  'Tomato': { category: 'Vegetable', description: 'Tomato powder or flakes. Rich, sweet, and savory umami enhancer.' },
  'Vinegar': { category: 'Acid', description: 'Vinegar powder. Delivers sharp, fermented tanginess.' },
  'Celery Seed': { category: 'Seed', description: 'Dehydrated celery seeds. Concentrated, bitter celery flavor.' },
  'Fennel/Anise': { category: 'Seed', description: 'Fennel or anise seeds. Sweet, licorice-like aromatics.' },
  'Mushroom': { category: 'Umami', description: 'Porcini or white button mushroom powder. Packed with earthy glutamate.' },
  'Cheese': { category: 'Dairy', description: 'Parmesan, cheddar cheese powder, whey, or buttermilk. Tangy, rich dairy.' },
  'Yeast Extract': { category: 'Umami', description: 'Yeast extract or nutritional yeast. Rich, chicken-like, savory umami.' },
  'Dill': { category: 'Herb', description: 'Dried dillweed or dill oil. Grassy, refreshing anise-parsley flavor.' },
  'Nori/Kelp': { category: 'Seaweed', description: 'Dried nori seaweed and kelp powder. Salty, briny, ocean-like umami.' },
  'Almonds': { category: 'Nut', description: 'Toasted almonds. Crunchy, rich, and sweet nut base.' },
  'Fenugreek': { category: 'Herb/Spice', description: 'Dried fenugreek leaves or seeds. Sweet, maple-syrup-like smell with a bitter taste.' },
  'Marigold': { category: 'Flower', description: 'Dried marigold petals. Mild floral flavor and rich golden color.' },
  'Safflower/Sunflower Oil': { category: 'Oil', description: 'Safflower or sunflower oil. Used to coat spices and carry flavors.' },
  'Bay Leaf': { category: 'Herb', description: 'Ground bay leaves. Herbal, woodsy, and slightly medicinal.' },
  'Marjoram': { category: 'Herb', description: 'Dried marjoram. Sweet pine and citrus flavor, milder than oregano.' },
  'Savory': { category: 'Herb', description: 'Dried summer/winter savory. Peppery, thyme-like green note.' },
  'Sage': { category: 'Herb', description: 'Dried sage leaves. Piney, fuzzy herb synonymous with poultry stuffing.' },
  'Turmeric': { category: 'Spice', description: 'Ground turmeric root. Earthy, bitter flavor and bright yellow pigment.' },
  'Ginger': { category: 'Spice', description: 'Ground ginger root. Zesty, spicy, and warming note.' },
  'Cloves': { category: 'Spice', description: 'Ground clove buds. Sweet, pungent, and highly numbing spice.' },
  'Cardamom': { category: 'Spice', description: 'Ground cardamom pods. Sweet, herbal, citrus-like spice.' },
  'Cinnamon': { category: 'Spice', description: 'Ground cinnamon bark. Sweet, warm, and highly aromatic spice.' },
  'Nutmeg': { category: 'Spice', description: 'Ground nutmeg seed. Sweet, nutty, and woody warmth.' },
  'Coffee': { category: 'Spice', description: 'Ground coffee beans. Bitter, roasted, and dark earthy flavor.' },
  'Spinach': { category: 'Vegetable', description: 'Spinach powder. Earthy green coloring and mild nutrition.' },
  'Chickpea Flour': { category: 'Legume', description: 'Ground chickpeas. Used as a binder and to add substance.' },
  'Corn Flour': { category: 'Grain', description: 'Finely ground corn. Adds a toasted corn aroma and density.' }
};

export default function TraderJoesSpicesApp() {
  const [activeTab, setActiveTab] = useState<'network' | 'matrix' | 'venn' | 'library'>('network');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Hover states for interactions
  const [hoveredSeasoning, setHoveredSeasoning] = useState<string | null>(null);
  const [hoveredIngredient, setHoveredIngredient] = useState<string | null>(null);

  // Click-lock states for detail panel
  const [selectedSeasoning, setSelectedSeasoning] = useState<string | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

  const handleClearSelection = () => {
    setSelectedSeasoning(null);
    setSelectedIngredient(null);
  };

  // Find what to display in the details panel (hover overrides lock)
  const activeDetailSeasoningId = hoveredSeasoning || (hoveredIngredient ? null : selectedSeasoning);
  const activeDetailIngredientName = hoveredIngredient || (hoveredSeasoning ? null : selectedIngredient);
  
  // Venn selection (supports up to 3)
  const [selectedVenn, setSelectedVenn] = useState<string[]>(['everything-bagel', 'everything-elote']);
  
  // Matrix sorting
  const [matrixSortKey, setMatrixSortKey] = useState<'name' | 'ingredientsCount'>('name');
  const [matrixSortDirection, setMatrixSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Status filter for Library Explorer
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  // Tag filter for Library Explorer
  const [tagFilter, setTagFilter] = useState<string>('All');

  // Derive unique ingredients and their frequencies across all 25 mixes
  const allIngredientsWithFrequencies = useMemo(() => {
    const counts: { [key: string]: number } = {};
    seasoningsData.forEach(s => {
      s.ingredients.forEach(i => {
        counts[i] = (counts[i] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, freq]) => ({
        name,
        freq,
        category: ingredientDetails[name]?.category || 'Other',
        description: ingredientDetails[name]?.description || ''
      }))
      .sort((a, b) => b.freq - a.freq || a.name.localeCompare(b.name));
  }, []);

  // Filtered seasonings based on search
  const filteredSeasonings = useMemo(() => {
    return seasoningsData.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.ingredients.some(i => i.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      const matchesTag = tagFilter === 'All' || s.tags.includes(tagFilter);
      
      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [searchQuery, statusFilter, tagFilter]);

  // All unique tags for filtering
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    seasoningsData.forEach(s => s.tags.forEach(t => tagsSet.add(t)));
    return Array.from(tagsSet).sort();
  }, []);

  // Sort seasonings for Matrix View
  const sortedSeasoningsForMatrix = useMemo(() => {
    const visibleIds = new Set(filteredSeasonings.map(s => s.id));
    const toSort = seasoningsData.filter(s => visibleIds.has(s.id));
    
    return toSort.sort((a, b) => {
      let multiplier = matrixSortDirection === 'asc' ? 1 : -1;
      if (matrixSortKey === 'name') {
        return a.name.localeCompare(b.name) * multiplier;
      } else if (matrixSortKey === 'ingredientsCount') {
        return (a.ingredients.length - b.ingredients.length) * multiplier;
      }
      return 0;
    });
  }, [filteredSeasonings, matrixSortKey, matrixSortDirection]);

  // List of visible ingredients in current search (useful for Network view to hide disconnected ingredients)
  const visibleIngredientsInNetwork = useMemo(() => {
    const ingredientsSet = new Set<string>();
    filteredSeasonings.forEach(s => s.ingredients.forEach(i => ingredientsSet.add(i)));
    return allIngredientsWithFrequencies.filter(i => ingredientsSet.has(i.name));
  }, [filteredSeasonings, allIngredientsWithFrequencies]);

  // Toggle selection for Venn view
  const handleVennToggle = (id: string) => {
    if (selectedVenn.includes(id)) {
      if (selectedVenn.length > 2) {
        setSelectedVenn(selectedVenn.filter(v => v !== id));
      }
    } else {
      if (selectedVenn.length < 3) {
        setSelectedVenn([...selectedVenn, id]);
      } else {
        // Swap last selected
        setSelectedVenn([selectedVenn[0], selectedVenn[1], id]);
      }
    }
  };

  // Derive Venn categories (A, B, C, A&B, B&C, A&C, A&B&C, None)
  const vennCrossover = useMemo(() => {
    if (selectedVenn.length < 2) return null;
    
    const [idA, idB, idC] = selectedVenn;
    const sA = seasoningsData.find(s => s.id === idA);
    const sB = seasoningsData.find(s => s.id === idB);
    const sC = idC ? seasoningsData.find(s => s.id === idC) : null;
    
    if (!sA || !sB) return null;
    
    const setA = new Set(sA.ingredients);
    const setB = new Set(sB.ingredients);
    const setC = sC ? new Set(sC.ingredients) : new Set<string>();
    
    const allVennIngredients = Array.from(new Set([
      ...sA.ingredients,
      ...sB.ingredients,
      ...(sC ? sC.ingredients : [])
    ])).sort();
    
    const classification: {
      onlyA: string[];
      onlyB: string[];
      onlyC: string[];
      sharedAB: string[];
      sharedBC: string[];
      sharedAC: string[];
      sharedAll: string[];
    } = {
      onlyA: [],
      onlyB: [],
      onlyC: [],
      sharedAB: [],
      sharedBC: [],
      sharedAC: [],
      sharedAll: []
    };
    
    allVennIngredients.forEach(i => {
      const inA = setA.has(i);
      const inB = setB.has(i);
      const inC = sC ? setC.has(i) : false;
      
      if (inA && inB && inC) classification.sharedAll.push(i);
      else if (inA && inB && !inC) classification.sharedAB.push(i);
      else if (!inA && inB && inC) classification.sharedBC.push(i);
      else if (inA && !inB && inC) classification.sharedAC.push(i);
      else if (inA && !inB && !inC) classification.onlyA.push(i);
      else if (!inA && inB && !inC) classification.onlyB.push(i);
      else if (!inA && !inB && inC) classification.onlyC.push(i);
    });
    
    return {
      sA, sB, sC,
      classification
    };
  }, [selectedVenn]);

  // Clean filters helper
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setTagFilter('All');
  };

  return (
    <div className="w-full bg-slate-950 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col font-sans transition-all duration-300">
      
      {/* Hero Section */}
      <div className="relative w-full h-[320px] md:h-[400px] overflow-hidden flex items-end">
        <img 
          src="/images/tjs-spice-hero.png" 
          alt="Trader Joe's Spice Mixes Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-md rounded-full text-xs font-semibold text-cyan-400">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Interactive Data Visualization
        </div>

        <div className="relative w-full max-w-6xl mx-auto px-6 md:px-8 pb-8 md:pb-12 z-10 flex flex-col gap-3">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent leading-none animate-fade-in">
            Trader Joe's Spice Matrix
          </h1>
          <p className="text-sm md:text-lg text-slate-300 max-w-2xl font-light leading-relaxed">
            An interactive crossover analysis of 25 popular Trader Joe's seasoning blends. Discover shared ingredients, compare flavor ratios, and explore the anatomy of your pantry staple.
          </p>
          
          {/* Key Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 max-w-4xl">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-col justify-center">
              <span className="text-2xl font-black text-cyan-400">25</span>
              <span className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-0.5">Blends Mapped</span>
            </div>
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-col justify-center">
              <span className="text-2xl font-black text-cyan-400">47</span>
              <span className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-0.5">Ingredients Mapped</span>
            </div>
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-col justify-center">
              <span className="text-2xl font-black text-cyan-400">Salt</span>
              <span className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-0.5">Most Shared (24/25)</span>
            </div>
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-col justify-center">
              <span className="text-2xl font-black text-cyan-400">21 Salute</span>
              <span className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-0.5">Only Salt-Free Blend</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar & Navigation Tabs */}
      <div className="w-full border-y border-slate-800 bg-slate-900/60 backdrop-blur-md p-4 sticky top-0 z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1">
          <button 
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'network' 
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 scale-[1.02]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            Connection Map
          </button>
          
          <button 
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'matrix' 
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 scale-[1.02]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Grid className="w-4 h-4" />
            Crossover Grid
          </button>
          
          <button 
            onClick={() => setActiveTab('venn')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'venn' 
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 scale-[1.02]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Venn Comparison
          </button>
          
          <button 
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === 'library' 
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25 scale-[1.02]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Library Explorer
          </button>
        </div>

        {/* Global Search and Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-grow sm:flex-grow-0 sm:w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search blends or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500/50 outline-none rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 transition-all duration-200 focus:ring-2 focus:ring-cyan-500/10"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          {(activeTab === 'library') && (
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer focus:border-cyan-500/30"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Seasonal">Seasonal</option>
                <option value="Discontinued">Discontinued</option>
              </select>
              
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 outline-none cursor-pointer focus:border-cyan-500/30"
              >
                <option value="All">All Tags</option>
                {allTags.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </>
          )}

          {(searchQuery || statusFilter !== 'All' || tagFilter !== 'All') && (
            <button 
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow p-6 md:p-8 bg-slate-950">
        
        {/* Zero state when search returns nothing */}
        {filteredSeasonings.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto">
            <AlertCircle className="w-12 h-12 text-slate-500" />
            <h3 className="text-xl font-bold text-white">No Results Found</h3>
            <p className="text-sm text-slate-400">
              We couldn't find any seasonings matching "{searchQuery}" with the current filters. Try checking your spelling or clearing filters.
            </p>
            <button 
              onClick={handleResetFilters}
              className="mt-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
            >
              Clear Search & Filters
            </button>
          </div>
        )}

        {filteredSeasonings.length > 0 && (
          <>
            {/* VIEW 1: BIPARTITE CONNECTION NETWORK */}
            {activeTab === 'network' && (
              <div className="flex flex-col gap-6">
                
                {/* View Instructions */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs md:text-sm text-slate-300 leading-relaxed">
                    <strong className="text-white">Interactivity Guide:</strong> Hover over any seasoning blend on the left to see its specific ingredients highlighted on the right. Conversely, hover over any ingredient on the right to see which seasoning blends utilize it in their recipe.
                  </div>
                </div>

                <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch">
                  
                  {/* SVG Network Map container */}
                  <div className="flex-grow bg-slate-900/20 border border-slate-900 rounded-3xl p-4 min-h-[600px] overflow-x-auto relative select-none">
                    
                    {/* SVG Canvas */}
                    <div className="w-full min-w-[700px] h-[750px] relative">
                      <svg className="w-full h-full overflow-visible">
                        
                        {/* Define gradients for connecting wires */}
                        <defs>
                          <linearGradient id="glow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                          </linearGradient>
                          <linearGradient id="dim-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#1e293b" stopOpacity="0.15" />
                          </linearGradient>
                        </defs>

                        {/* Connection Lines (Bezier Paths) */}
                        {(() => {
                          const paths: React.ReactNode[] = [];
                          const maxSeasonings = filteredSeasonings.length;
                          const maxIngredients = visibleIngredientsInNetwork.length;

                          filteredSeasonings.forEach((s, sIdx) => {
                            const ySeasoning = 25 + (sIdx / (maxSeasonings > 1 ? maxSeasonings - 1 : 1)) * 700;

                            s.ingredients.forEach(ingName => {
                              const ingIdx = visibleIngredientsInNetwork.findIndex(i => i.name === ingName);
                              if (ingIdx === -1) return;

                              const yIngredient = 25 + (ingIdx / (maxIngredients > 1 ? maxIngredients - 1 : 1)) * 700;

                              const activeS = hoveredSeasoning || (hoveredIngredient ? null : selectedSeasoning);
                              const activeI = hoveredIngredient || (hoveredSeasoning ? null : selectedIngredient);

                              const isHighLighted = 
                                (activeS === s.id) || 
                                (activeI === ingName) ||
                                (activeS === null && activeI === null);

                              const strokeColor = isHighLighted 
                                ? 'url(#glow-grad)' 
                                : '#1e293b'; // Slate-800

                              const strokeWidth = isHighLighted 
                                ? (activeS || activeI ? 2.5 : 1) 
                                : 0.5;

                              const opacity = isHighLighted 
                                ? (activeS || activeI ? 1 : 0.4) 
                                : 0.08;

                              paths.push(
                                <path
                                  key={`${s.id}-${ingName}`}
                                  d={`M 180 ${ySeasoning} C 310 ${ySeasoning}, 310 ${yIngredient}, 480 ${yIngredient}`}
                                  fill="none"
                                  stroke={strokeColor}
                                  strokeWidth={strokeWidth}
                                  opacity={opacity}
                                  className="transition-all duration-300"
                                />
                              );
                            });
                          });
                          return paths;
                        })()}

                        {/* Seasonings Labels (Left Column) */}
                        {filteredSeasonings.map((s, idx) => {
                          const y = 25 + (idx / (filteredSeasonings.length > 1 ? filteredSeasonings.length - 1 : 1)) * 700;
                          
                          const isSelected = selectedSeasoning === s.id;
                          const isHovered = hoveredSeasoning === s.id;
                          
                          const activeS = hoveredSeasoning || (hoveredIngredient ? null : selectedSeasoning);
                          const activeI = hoveredIngredient || (hoveredSeasoning ? null : selectedIngredient);
                          const isHighlighted = activeS === s.id;
                          const isDimmed = activeS !== null && activeS !== s.id && !s.ingredients.includes(activeI || '');

                          return (
                            <g 
                              key={s.id} 
                              transform={`translate(0, ${y})`}
                              onMouseEnter={() => setHoveredSeasoning(s.id)}
                              onMouseLeave={() => setHoveredSeasoning(null)}
                              onClick={() => {
                                setSelectedSeasoning(isSelected ? null : s.id);
                                setSelectedIngredient(null);
                              }}
                              className="cursor-pointer select-none group"
                            >
                              {/* Background highlight */}
                              <rect
                                x="-10"
                                y="-18"
                                width="200"
                                height="36"
                                rx="8"
                                fill={isHovered || isSelected ? 'rgba(6, 182, 212, 0.15)' : 'transparent'}
                                stroke={isHovered ? 'rgba(6, 182, 212, 0.3)' : (isSelected ? 'rgba(6, 182, 212, 0.15)' : 'transparent')}
                                strokeWidth="1"
                                className="transition-all duration-200"
                              />

                              {/* Glowing connection dot */}
                              <circle
                                cx="180"
                                cy="0"
                                r={isHovered ? 6 : (isSelected ? 5 : 4)}
                                fill={isHovered ? '#06b6d4' : (isSelected ? '#0891b2' : '#475569')}
                                className="transition-all duration-200 shadow-sm"
                              />

                              {/* Seasoning Text */}
                              <text
                                x="165"
                                y="4"
                                textAnchor="end"
                                className={`text-[11px] font-semibold transition-colors duration-200 ${
                                  isHovered ? 'fill-cyan-400 font-bold' : isSelected ? 'fill-cyan-300 font-bold' : isDimmed ? 'fill-slate-650' : 'fill-slate-200'
                                }`}
                              >
                                {s.name.length > 26 ? `${s.name.slice(0, 24)}...` : s.name}
                              </text>
                            </g>
                          );
                        })}

                        {/* Ingredients Labels (Right Column) */}
                        {visibleIngredientsInNetwork.map((ing, idx) => {
                          const y = 25 + (idx / (visibleIngredientsInNetwork.length > 1 ? visibleIngredientsInNetwork.length - 1 : 1)) * 700;
                          
                          const isSelected = selectedIngredient === ing.name;
                          const isHovered = hoveredIngredient === ing.name;
                          
                          const activeS = hoveredSeasoning || (hoveredIngredient ? null : selectedSeasoning);
                          const activeI = hoveredIngredient || (hoveredSeasoning ? null : selectedIngredient);
                          const isConnecting = activeS !== null && seasoningsData.find(s => s.id === activeS)?.ingredients.includes(ing.name);
                          const isDimmed = activeI !== null && activeI !== ing.name && !isConnecting;

                          return (
                            <g 
                              key={ing.name} 
                              transform={`translate(480, ${y})`}
                              onMouseEnter={() => setHoveredIngredient(ing.name)}
                              onMouseLeave={() => setHoveredIngredient(null)}
                              onClick={() => {
                                setSelectedIngredient(isSelected ? null : ing.name);
                                setSelectedSeasoning(null);
                              }}
                              className="cursor-pointer select-none group"
                            >
                              {/* Background highlight */}
                              <rect
                                x="10"
                                y="-16"
                                width="200"
                                height="32"
                                rx="8"
                                fill={isHovered || isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent'}
                                stroke={isHovered ? 'rgba(59, 130, 246, 0.3)' : (isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent')}
                                strokeWidth="1"
                                className="transition-all duration-200"
                              />

                              {/* Glowing connection dot */}
                              <circle
                                cx="0"
                                cy="0"
                                r={isHovered ? 6 : (isSelected ? 5 : (isConnecting ? 5 : 4))}
                                fill={isHovered ? '#3b82f6' : (isSelected ? '#2563eb' : (isConnecting ? '#06b6d4' : '#475569'))}
                                className="transition-all duration-200"
                              />

                              {/* Ingredient Text */}
                              <text
                                x="15"
                                y="4"
                                textAnchor="start"
                                className={`text-[11px] font-semibold transition-colors duration-200 ${
                                  isHovered ? 'fill-blue-400 font-bold' : isSelected ? 'fill-blue-300 font-bold' : isConnecting ? 'fill-cyan-300' : isDimmed ? 'fill-slate-650' : 'fill-slate-300'
                                }`}
                              >
                                {ing.name} 
                                <tspan className="text-[9px] fill-slate-500 font-normal ml-1">
                                  {" "}({ing.freq})
                                </tspan>
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Sidebar stats/detail panel */}
                  <div className="w-full lg:w-[360px] flex flex-col gap-4 flex-shrink-0">
                                        {/* Hover detail panel */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex-grow flex flex-col justify-start relative">
                      {/* Close button for locked selection */}
                      {(selectedSeasoning || selectedIngredient) && !hoveredSeasoning && !hoveredIngredient && (
                        <button 
                          onClick={handleClearSelection}
                          title="Clear selection"
                          className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      {activeDetailSeasoningId && (() => {
                        const s = seasoningsData.find(sec => sec.id === activeDetailSeasoningId)!;
                        const isLocked = selectedSeasoning === s.id && !hoveredSeasoning;
                        return (
                          <div className="flex flex-col gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                  s.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                  s.status === 'Seasonal' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {s.status}
                                </span>
                                {isLocked && (
                                  <span className="text-[10px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                                    Pinned
                                  </span>
                                )}
                              </div>
                              <h3 className="text-lg font-bold text-white mt-2 leading-snug">{s.name}</h3>
                            </div>
                            
                            <div>
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</h4>
                              <p className="text-xs text-slate-300 leading-relaxed">{s.description}</p>
                            </div>

                            <div>
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Shared Ingredients ({s.ingredients.length})</h4>
                              <div className="flex flex-wrap gap-1">
                                {s.ingredients.map(i => (
                                  <span 
                                    key={i} 
                                    onClick={() => {
                                      setSelectedIngredient(i);
                                      setSelectedSeasoning(null);
                                    }}
                                    className="text-[10px] bg-slate-950 hover:bg-slate-850 hover:text-cyan-400 border border-slate-800 text-slate-300 px-2 py-1 rounded-md font-medium cursor-pointer transition-colors"
                                  >
                                    {i}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Flavor Profile</h4>
                              <p className="text-xs text-slate-300 leading-relaxed italic">"{s.flavorProfile}"</p>
                            </div>

                            <div className="border-t border-slate-800 pt-3">
                              <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">Great on:</h4>
                              <p className="text-xs text-slate-300 leading-relaxed">{s.useCase}</p>
                            </div>
                          </div>
                        );
                      })()}

                      {activeDetailIngredientName && (() => {
                        const freqObj = allIngredientsWithFrequencies.find(i => i.name === activeDetailIngredientName)!;
                        const matchingSeasonings = seasoningsData.filter(s => s.ingredients.includes(activeDetailIngredientName));
                        const isLocked = selectedIngredient === freqObj.name && !hoveredIngredient;
                        
                        return (
                          <div className="flex flex-col gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  {freqObj.category}
                                </span>
                                {isLocked && (
                                  <span className="text-[10px] font-extrabold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md">
                                    Pinned
                                  </span>
                                )}
                              </div>
                              <h3 className="text-lg font-bold text-white mt-2">{freqObj.name}</h3>
                            </div>

                            <div>
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">About Ingredient</h4>
                              <p className="text-xs text-slate-300 leading-relaxed">{freqObj.description}</p>
                            </div>

                            <div>
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Used in {freqObj.freq} blends:</h4>
                              <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                                {matchingSeasonings.map(s => (
                                  <div 
                                    key={s.id} 
                                    onClick={() => {
                                      setSelectedSeasoning(s.id);
                                      setSelectedIngredient(null);
                                    }}
                                    className="flex items-center justify-between text-xs bg-slate-950 hover:bg-slate-900 border border-slate-855 hover:border-cyan-500/35 p-2 rounded-xl cursor-pointer transition-all"
                                  >
                                    <span className="font-medium text-slate-200 truncate pr-2 hover:text-cyan-400 transition-colors">{s.name}</span>
                                    <span className="text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                                      {s.ingredients.length} items
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {!activeDetailSeasoningId && !activeDetailIngredientName && (
                        <div className="flex-grow flex flex-col items-center justify-center text-center p-6 gap-3">
                          <ShoppingBag className="w-12 h-12 text-slate-600" />
                          <h3 className="text-sm font-bold text-slate-300">No Selection</h3>
                          <p className="text-xs text-slate-500 max-w-[200px]">
                            Hover or click a blend or ingredient in the graph to lock and display detailed culinary information here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* VIEW 2: CROSSOVER GRID MATRIX */}
            {activeTab === 'matrix' && (
              <div className="flex flex-col gap-6">
                
                {/* Controls Bar for Matrix */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/30 border border-slate-800 p-4 rounded-3xl">
                  <div className="text-xs text-slate-300 flex items-center gap-2">
                    <Info className="w-4 h-4 text-cyan-400" />
                    Hover over cells to see intersection. Click columns to select for Venn Comparison.
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Sort Columns by:</span>
                    <button
                      onClick={() => {
                        if (matrixSortKey === 'name') {
                          setMatrixSortDirection(matrixSortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setMatrixSortKey('name');
                          setMatrixSortDirection('asc');
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                        matrixSortKey === 'name' 
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' 
                          : 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      Name
                      <ArrowUpDown className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => {
                        if (matrixSortKey === 'ingredientsCount') {
                          setMatrixSortDirection(matrixSortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setMatrixSortKey('ingredientsCount');
                          setMatrixSortDirection('desc'); // default to desc for counts
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                        matrixSortKey === 'ingredientsCount' 
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' 
                          : 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      Ingredient Count
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Matrix Grid Container */}
                <div className="w-full bg-slate-900/20 border border-slate-900 rounded-3xl p-6 overflow-x-auto">
                  <div className="min-w-[900px]">
                    <table className="w-full border-collapse">
                      
                      {/* Table Header: Seasonings */}
                      <thead>
                        <tr>
                          {/* Top-Left empty space for ingredient names */}
                          <th className="sticky left-0 z-20 bg-slate-950 p-2 text-left text-xs font-bold text-slate-400 border-b border-slate-800 w-[180px]">
                            Ingredients
                          </th>
                          
                          {/* Seasoning Column Headers (Angled) */}
                          {sortedSeasoningsForMatrix.map(s => {
                            const isSelectedInVenn = selectedVenn.includes(s.id);
                            return (
                              <th 
                                key={s.id} 
                                className="p-2 border-b border-slate-800 text-center align-bottom min-w-[34px] max-w-[38px] transition-colors"
                              >
                                <div className="flex justify-center items-center h-[120px] pb-1">
                                  <button
                                    onClick={() => handleVennToggle(s.id)}
                                    title={`Click to select/unselect for Venn comparison. Status: ${s.status}`}
                                    className={`origin-bottom-left -rotate-45 translate-x-2 text-[10px] whitespace-nowrap text-left font-semibold inline-block transition-colors cursor-pointer hover:text-cyan-400 ${
                                      isSelectedInVenn ? 'text-cyan-400 font-black' : 'text-slate-300'
                                    }`}
                                  >
                                    {s.name.length > 20 ? `${s.name.slice(0, 18)}...` : s.name}
                                    {isSelectedInVenn && (
                                      <span className="ml-1 text-[8px] bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 px-1 rounded-sm uppercase">
                                        Selected
                                      </span>
                                    )}
                                  </button>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>

                      {/* Table Body: Ingredients vs Seasonings */}
                      <tbody>
                        {allIngredientsWithFrequencies.map((ing) => {
                          const isIngHovered = hoveredIngredient === ing.name;

                          return (
                            <tr 
                              key={ing.name}
                              className={`border-b border-slate-900/60 hover:bg-slate-900/30 transition-colors ${
                                isIngHovered ? 'bg-cyan-500/5' : ''
                              }`}
                              onMouseEnter={() => setHoveredIngredient(ing.name)}
                              onMouseLeave={() => setHoveredIngredient(null)}
                            >
                              {/* Row Header: Ingredient name */}
                              <td className={`sticky left-0 z-10 p-2 text-[11px] font-bold border-r border-slate-900 flex justify-between items-center w-[180px] transition-colors ${
                                isIngHovered ? 'bg-slate-900 text-cyan-400' : 'bg-slate-950 text-slate-300'
                              }`}>
                                <span className="truncate">{ing.name}</span>
                                <span className="text-[9px] font-normal text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">
                                  {ing.freq}
                                </span>
                              </td>

                              {/* Grid Cells */}
                              {sortedSeasoningsForMatrix.map(s => {
                                const hasIngredient = s.ingredients.includes(ing.name);
                                const isSelectedInVenn = selectedVenn.includes(s.id);
                                const isColHovered = hoveredSeasoning === s.id;

                                return (
                                  <td 
                                    key={`${s.id}-${ing.name}`}
                                    onMouseEnter={() => setHoveredSeasoning(s.id)}
                                    onMouseLeave={() => setHoveredSeasoning(null)}
                                    className={`p-2 text-center transition-all ${
                                      isColHovered ? 'bg-cyan-500/5' : ''
                                    }`}
                                  >
                                    <div className="flex justify-center items-center">
                                      {hasIngredient ? (
                                        <div 
                                          title={`${s.name} contains ${ing.name}`}
                                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all transform scale-110 shadow-md ${
                                            isSelectedInVenn 
                                              ? 'bg-gradient-to-br from-cyan-400 to-blue-500 ring-2 ring-cyan-500/30' 
                                              : 'bg-cyan-500/35 border border-cyan-500/60'
                                          }`}
                                        >
                                          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                                        </div>
                                      ) : (
                                        <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>

                    </table>
                  </div>
                </div>

                {/* Grid legend */}
                <div className="flex items-center gap-6 justify-center text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-500/35 border border-cyan-500/60"></div>
                    <span>Contains Ingredient</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 ring-2 ring-cyan-500/30"></div>
                    <span>Venn Selected Blend</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                    <span>Does Not Contain</span>
                  </div>
                </div>

              </div>
            )}

            {/* VIEW 3: VENN COMPARISON TOOL */}
            {activeTab === 'venn' && (
              <div className="flex flex-col gap-6">
                
                {/* Selector Header */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-md font-bold text-white">Compare Blends</h3>
                      <p className="text-xs text-slate-400">Select 2 or 3 blends to find ingredient crossover.</p>
                    </div>
                    <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-xl font-bold">
                      {selectedVenn.length} selected
                    </span>
                  </div>

                  {/* Selector List */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-h-[140px] overflow-y-auto pr-2">
                    {seasoningsData.map(s => {
                      const isSelected = selectedVenn.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => handleVennToggle(s.id)}
                          className={`flex items-center justify-between p-2 rounded-xl text-left border text-xs transition-all ${
                            isSelected 
                              ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 font-bold scale-[1.02]' 
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="truncate pr-1">{s.name.replace(' Seasoning Blend', '').replace(' Japanese Multi-purpose Seasoning', '')}</span>
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 flex-shrink-0" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-slate-700 flex-shrink-0"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Venn Display & Crossover List */}
                {vennCrossover && (
                  <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                    
                    {/* Visual Crossover Diagram (interactive cards or rings) */}
                    <div className="flex-grow bg-slate-900/20 border border-slate-900 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[450px]">
                      
                      {selectedVenn.length === 2 && (
                        <div className="relative w-full max-w-[500px] aspect-[4/3] flex items-center justify-between gap-2 select-none">
                          {/* Blend A Circle */}
                          <div className="w-[280px] h-[280px] rounded-full bg-cyan-500/5 border border-cyan-500/30 flex flex-col justify-between p-6 items-start text-left absolute left-0 z-0">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-cyan-400 tracking-wider">Blend A</span>
                              <h4 className="text-sm font-bold text-white truncate max-w-[200px]">{vennCrossover.sA.name}</h4>
                            </div>
                            <div className="mt-auto">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Unique ({vennCrossover.classification.onlyA.length})</span>
                              <div className="flex flex-wrap gap-1 mt-1 max-w-[170px]">
                                {vennCrossover.classification.onlyA.slice(0, 5).map(i => (
                                  <span key={i} className="text-[9px] bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded border border-slate-850">{i}</span>
                                ))}
                                {vennCrossover.classification.onlyA.length > 5 && (
                                  <span className="text-[9px] text-slate-500">+{vennCrossover.classification.onlyA.length - 5} more</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Intersection Overlay */}
                          <div className="w-[120px] h-[280px] mx-auto z-10 flex flex-col items-center justify-center text-center p-2">
                            <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-4 shadow-xl flex flex-col items-center">
                              <span className="text-[10px] font-extrabold uppercase text-cyan-300 tracking-wider">Shared</span>
                              <span className="text-2xl font-black text-white my-1">{vennCrossover.classification.sharedAB.length}</span>
                              <span className="text-[9px] text-slate-400 font-medium">Ingredients</span>
                            </div>
                          </div>

                          {/* Blend B Circle */}
                          <div className="w-[280px] h-[280px] rounded-full bg-blue-500/5 border border-blue-500/30 flex flex-col justify-between p-6 items-end text-right absolute right-0 z-0">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase text-blue-400 tracking-wider">Blend B</span>
                              <h4 className="text-sm font-bold text-white truncate max-w-[200px]">{vennCrossover.sB.name}</h4>
                            </div>
                            <div className="mt-auto">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Unique ({vennCrossover.classification.onlyB.length})</span>
                              <div className="flex flex-wrap gap-1 mt-1 max-w-[170px] justify-end">
                                {vennCrossover.classification.onlyB.slice(0, 5).map(i => (
                                  <span key={i} className="text-[9px] bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded border border-slate-850">{i}</span>
                                ))}
                                {vennCrossover.classification.onlyB.length > 5 && (
                                  <span className="text-[9px] text-slate-500">+{vennCrossover.classification.onlyB.length - 5} more</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedVenn.length === 3 && (
                        <div className="relative w-full max-w-[600px] h-[400px] select-none flex items-center justify-center">
                          {/* Circular layouts representing 3 loops */}
                          
                          {/* Blend A (Top) */}
                          <div className="w-[240px] h-[240px] rounded-full bg-cyan-500/5 border border-cyan-500/30 p-4 absolute top-0 z-0 flex flex-col justify-start items-center">
                            <span className="text-[9px] font-extrabold uppercase text-cyan-400 tracking-wide">Blend A</span>
                            <h4 className="text-xs font-bold text-white truncate max-w-[160px]">{vennCrossover.sA.name}</h4>
                          </div>

                          {/* Blend B (Bottom-Left) */}
                          <div className="w-[240px] h-[240px] rounded-full bg-blue-500/5 border border-blue-500/30 p-4 absolute bottom-0 left-[30px] z-0 flex flex-col justify-end items-center">
                            <span className="text-[9px] font-extrabold uppercase text-blue-400 tracking-wide">Blend B</span>
                            <h4 className="text-xs font-bold text-white truncate max-w-[160px]">{vennCrossover.sB.name}</h4>
                          </div>

                          {/* Blend C (Bottom-Right) */}
                          <div className="w-[240px] h-[240px] rounded-full bg-purple-500/5 border border-purple-500/30 p-4 absolute bottom-0 right-[30px] z-0 flex flex-col justify-end items-center">
                            <span className="text-[9px] font-extrabold uppercase text-purple-400 tracking-wide">Blend C</span>
                            <h4 className="text-xs font-bold text-white truncate max-w-[160px]">{vennCrossover.sC?.name}</h4>
                          </div>

                          {/* Center Intersection Card */}
                          <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-4 shadow-2xl flex flex-col items-center text-center z-10 absolute">
                            <span className="text-[9px] font-extrabold uppercase text-cyan-400 tracking-wider">All 3 Share</span>
                            <span className="text-2xl font-black text-white my-1">{vennCrossover.classification.sharedAll.length}</span>
                            <span className="text-[9px] text-slate-400 font-medium">Ingredients</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detailed Crossover Lists */}
                    <div className="w-full lg:w-[400px] bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-5 max-h-[550px] overflow-y-auto">
                      
                      {/* Shared Category (2-Way or 3-Way) */}
                      {selectedVenn.length === 2 && (
                        <div>
                          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                              Shared by Both ({vennCrossover.classification.sharedAB.length})
                            </h4>
                          </div>
                          {vennCrossover.classification.sharedAB.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {vennCrossover.classification.sharedAB.map(i => (
                                <span key={i} className="text-xs bg-slate-950 text-cyan-300 border border-cyan-500/20 px-2 py-1 rounded-lg">
                                  {i}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic block">No shared ingredients found.</span>
                          )}
                        </div>
                      )}

                      {selectedVenn.length === 3 && (
                        <>
                          {/* Shared by All */}
                          <div>
                            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
                              <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                                Shared by All 3 ({vennCrossover.classification.sharedAll.length})
                              </h4>
                            </div>
                            {vennCrossover.classification.sharedAll.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {vennCrossover.classification.sharedAll.map(i => (
                                  <span key={i} className="text-xs bg-slate-950 text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded-lg font-bold">
                                    {i}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 italic block">No ingredients shared by all three.</span>
                            )}
                          </div>

                          {/* Shared AB */}
                          <div>
                            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                                Shared A & B Only ({vennCrossover.classification.sharedAB.length})
                              </h4>
                            </div>
                            {vennCrossover.classification.sharedAB.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {vennCrossover.classification.sharedAB.map(i => (
                                  <span key={i} className="text-xs bg-slate-950 text-slate-300 border border-slate-850 px-2 py-1 rounded-lg">
                                    {i}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 italic block">None.</span>
                            )}
                          </div>

                          {/* Shared BC */}
                          <div>
                            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                                Shared B & C Only ({vennCrossover.classification.sharedBC.length})
                              </h4>
                            </div>
                            {vennCrossover.classification.sharedBC.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {vennCrossover.classification.sharedBC.map(i => (
                                  <span key={i} className="text-xs bg-slate-950 text-slate-300 border border-slate-850 px-2 py-1 rounded-lg">
                                    {i}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 italic block">None.</span>
                            )}
                          </div>

                          {/* Shared AC */}
                          <div>
                            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
                              <div className="w-2 h-2 rounded-full bg-cyan-600"></div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                                Shared A & C Only ({vennCrossover.classification.sharedAC.length})
                              </h4>
                            </div>
                            {vennCrossover.classification.sharedAC.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {vennCrossover.classification.sharedAC.map(i => (
                                  <span key={i} className="text-xs bg-slate-950 text-slate-300 border border-slate-850 px-2 py-1 rounded-lg">
                                    {i}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 italic block">None.</span>
                            )}
                          </div>
                        </>
                      )}

                      {/* Unique Blend A */}
                      <div>
                        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                            Unique to {vennCrossover.sA.name.split(' ')[0]} ({vennCrossover.classification.onlyA.length})
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {vennCrossover.classification.onlyA.map(i => (
                            <span key={i} className="text-xs bg-slate-950 text-slate-400 px-2 py-1 rounded-lg border border-slate-850">
                              {i}
                            </span>
                          ))}
                          {vennCrossover.classification.onlyA.length === 0 && (
                            <span className="text-xs text-slate-500 italic block">No unique ingredients.</span>
                          )}
                        </div>
                      </div>

                      {/* Unique Blend B */}
                      <div>
                        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                            Unique to {vennCrossover.sB.name.split(' ')[0]} ({vennCrossover.classification.onlyB.length})
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {vennCrossover.classification.onlyB.map(i => (
                            <span key={i} className="text-xs bg-slate-950 text-slate-400 px-2 py-1 rounded-lg border border-slate-850">
                              {i}
                            </span>
                          ))}
                          {vennCrossover.classification.onlyB.length === 0 && (
                            <span className="text-xs text-slate-500 italic block">No unique ingredients.</span>
                          )}
                        </div>
                      </div>

                      {/* Unique Blend C */}
                      {vennCrossover.sC && (
                        <div>
                          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                              Unique to {vennCrossover.sC.name.split(' ')[0]} ({vennCrossover.classification.onlyC.length})
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {vennCrossover.classification.onlyC.map(i => (
                              <span key={i} className="text-xs bg-slate-950 text-slate-400 px-2 py-1 rounded-lg border border-slate-850">
                                {i}
                              </span>
                            ))}
                            {vennCrossover.classification.onlyC.length === 0 && (
                              <span className="text-xs text-slate-500 italic block">No unique ingredients.</span>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}

              </div>
            )}

            {/* VIEW 4: SEASONING LIBRARY EXPLORER */}
            {activeTab === 'library' && (
              <div className="flex flex-col gap-6">
                
                {/* Stats summary of visible cards */}
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Showing {filteredSeasonings.length} of 25 seasoning blends</span>
                  {tagFilter !== 'All' && <span>Filtered by tag: {tagFilter}</span>}
                </div>

                {/* Library Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSeasonings.map(s => {
                    // Highlighter for search terms
                    const highlightSearch = (text: string) => {
                      if (!searchQuery) return text;
                      const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
                      return (
                        <span>
                          {parts.map((p, i) => 
                            p.toLowerCase() === searchQuery.toLowerCase() 
                              ? <mark key={i} className="bg-cyan-500/30 text-white font-semibold rounded-sm px-0.5">{p}</mark>
                              : p
                          )}
                        </span>
                      );
                    };

                    return (
                      <div 
                        key={s.id} 
                        className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700/80 transition-all duration-300 hover:-translate-y-1 group"
                      >
                        {/* Card Header */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg ${
                              s.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                              s.status === 'Seasonal' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                              'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {s.status}
                            </span>
                            {s.sodiumFree && (
                              <span className="text-[10px] font-extrabold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
                                Salt-Free
                              </span>
                            )}
                          </div>
                          
                          <h3 className="text-lg font-bold text-white mt-3 group-hover:text-cyan-400 transition-colors leading-snug">
                            {highlightSearch(s.name)}
                          </h3>
                          
                          <p className="text-xs text-slate-400 leading-relaxed mt-2">
                            {s.description}
                          </p>

                          {/* Custom tags */}
                          <div className="flex flex-wrap gap-1 mt-3">
                            {s.tags.map(t => (
                              <button 
                                key={t} 
                                onClick={() => setTagFilter(t)}
                                className="text-[9px] bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-900 transition-colors"
                              >
                                #{t}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Ingredients & Flavor Profile */}
                        <div className="mt-5 border-t border-slate-850 pt-4 flex flex-col gap-4">
                          
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ingredients</span>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {s.ingredients.map(i => (
                                <span 
                                  key={i} 
                                  onClick={() => setSearchQuery(i)}
                                  className="text-[10px] bg-slate-950 border border-slate-900 hover:border-cyan-500/35 text-slate-300 hover:text-cyan-400 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                >
                                  {highlightSearch(i)}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Flavor profile</span>
                            <p className="text-xs text-slate-300 italic mt-0.5">"{s.flavorProfile}"</p>
                          </div>

                          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-900">
                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Best with:</span>
                            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{s.useCase}</p>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </>
        )}

      </div>
      
      {/* Footer Info */}
      <div className="border-t border-slate-800 bg-slate-900/60 backdrop-blur-md p-4 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 px-6">
        <span>Trader Joe's Spice Matrix &copy; {new Date().getFullYear()}</span>
        <div className="flex items-center gap-4">
          <a href="/projects" className="hover:text-white transition-colors">More Projects</a>
          <span>&middot;</span>
          <span className="text-slate-400">Created for portfolio optimization</span>
        </div>
      </div>

    </div>
  );
}
