import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { FoodZone } from '../modules/food/admin/models/zone.model.js';
import { QuickCommerceCategory } from '../modules/quickCommerce/admin/models/category.model.js';
import { QuickCommerceSubcategory } from '../modules/quickCommerce/admin/models/subcategory.model.js';
import { QuickCommerceProduct } from '../modules/quickCommerce/admin/models/product.model.js';

const DEFAULT_ZONE_QUERY = 'indore test';

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const catalog = [
  {
    name: 'Fresh Vegetables',
    description: 'Daily fresh vegetables for home cooking and salads.',
    subcategories: [
      'Leafy Vegetables',
      'Root Vegetables',
      'Exotic Vegetables',
      'Tomato Onion Potato',
      'Green Peas Beans',
      'Cut & Peeled Vegetables',
    ],
  },
  {
    name: 'Fresh Fruits',
    description: 'Seasonal fruits, imported fruits and everyday favorites.',
    subcategories: [
      'Seasonal Fruits',
      'Banana Apple Pomegranate',
      'Citrus Fruits',
      'Tropical Fruits',
      'Exotic Fruits',
      'Cut Fruits & Packs',
    ],
  },
  {
    name: 'Dairy, Bread & Eggs',
    description: 'Milk, curd, paneer, breads and breakfast dairy staples.',
    subcategories: [
      'Milk',
      'Curd & Yogurt',
      'Paneer & Cheese',
      'Butter & Spreads',
      'Bread & Buns',
      'Eggs',
    ],
  },
  {
    name: 'Atta, Rice & Dal',
    description: 'Kitchen grain essentials for daily Indian cooking.',
    subcategories: [
      'Atta & Flour',
      'Rice',
      'Dal & Pulses',
      'Poha Suji Daliya',
      'Millets & Grains',
      'Besan & Specialty Flour',
    ],
  },
  {
    name: 'Oil, Ghee & Masala',
    description: 'Cooking oils, desi ghee and core spice essentials.',
    subcategories: [
      'Cooking Oil',
      'Ghee & Vanaspati',
      'Whole Spices',
      'Ground Masalas',
      'Salt Sugar & Jaggery',
      'Dry Fruits & Seeds',
    ],
  },
  {
    name: 'Snacks & Biscuits',
    description: 'Munching favorites for tea time and on-the-go cravings.',
    subcategories: [
      'Namkeen & Mixtures',
      'Chips & Crisps',
      'Biscuits & Cookies',
      'Chocolates',
      'Candy & Gums',
      'Healthy Snacks',
    ],
  },
  {
    name: 'Tea, Coffee & Health Drinks',
    description: 'Beverage basics for home, office and wellness routines.',
    subcategories: [
      'Tea',
      'Coffee',
      'Green Tea & Herbal Tea',
      'Health Drinks',
      'Milk Additives',
      'Sweeteners',
    ],
  },
  {
    name: 'Cold Drinks & Juices',
    description: 'Soft drinks, juices and ready-to-drink refreshment.',
    subcategories: [
      'Soft Drinks',
      'Fruit Juices',
      'Energy Drinks',
      'Flavored Water',
      'Soda & Mixers',
      'Ready To Drink Beverages',
    ],
  },
  {
    name: 'Instant & Packaged Food',
    description: 'Fast meal options, pantry packs and ready mixes.',
    subcategories: [
      'Instant Noodles & Pasta',
      'Soups',
      'Ready To Eat',
      'Breakfast Cereals',
      'Sauces & Spreads',
      'Baking Needs',
    ],
  },
  {
    name: 'Personal Care',
    description: 'Everyday grooming and hygiene products for the family.',
    subcategories: [
      'Bath & Soap',
      'Hair Care',
      'Oral Care',
      'Skin Care',
      'Deodorants & Perfumes',
      'Shaving & Grooming',
    ],
  },
  {
    name: 'Home Care',
    description: 'Cleaning and home maintenance essentials.',
    subcategories: [
      'Detergent & Fabric Care',
      'Dishwash Cleaners',
      'Floor & Surface Cleaners',
      'Toilet & Bathroom Cleaners',
      'Air Fresheners',
      'Garbage Bags & Foils',
    ],
  },
  {
    name: 'Baby Care',
    description: 'Baby daily care, hygiene and feeding support products.',
    subcategories: [
      'Baby Diapers',
      'Baby Wipes',
      'Baby Bath & Skin Care',
      'Baby Food',
      'Baby Powder & Lotion',
      'Feeding Accessories',
    ],
  },
];

async function main() {
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI / MONGO_URI is missing');
  }

  const zoneQueryRaw = process.argv[2] || DEFAULT_ZONE_QUERY;
  const zoneQuery = String(zoneQueryRaw).trim();
  const zoneRegex = new RegExp(`^${zoneQuery.replace(/[-\s]+/g, '[-\\s]*')}$`, 'i');

  await mongoose.connect(config.mongodbUri);

  try {
    const zone = await FoodZone.findOne({
      isActive: true,
      $or: [{ name: zoneRegex }, { zoneName: zoneRegex }],
    }).lean();

    if (!zone?._id) {
      throw new Error(`Active zone not found for "${zoneQuery}"`);
    }

    const zoneId = zone._id;
    const zoneLabel = zone.zoneName || zone.name || zoneQuery;

    const seededCategoryIds = [];
    const categoryMap = new Map();

    for (const [categoryIndex, categorySeed] of catalog.entries()) {
      const categorySlug = slugify(categorySeed.name);
      const categoryDoc = await QuickCommerceCategory.findOneAndUpdate(
        { zoneId, slug: categorySlug },
        {
          $set: {
            name: categorySeed.name,
            slug: categorySlug,
            description: categorySeed.description,
            image: '',
            icon: '',
            bannerImage: '',
            zoneId,
            isActive: true,
            sortOrder: categoryIndex,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      seededCategoryIds.push(categoryDoc._id);
      categoryMap.set(categorySlug, categoryDoc);

      for (const [subcategoryIndex, subcategoryName] of categorySeed.subcategories.entries()) {
        const subcategorySlug = slugify(subcategoryName);
        await QuickCommerceSubcategory.findOneAndUpdate(
          { categoryId: categoryDoc._id, slug: subcategorySlug },
          {
            $set: {
              categoryId: categoryDoc._id,
              categoryName: categorySeed.name,
              name: subcategoryName,
              slug: subcategorySlug,
              description: `${subcategoryName} under ${categorySeed.name}`,
              image: '',
              icon: '',
              isActive: true,
              sortOrder: subcategoryIndex,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      }
    }

    const staleCategories = await QuickCommerceCategory.find({
      zoneId,
      _id: { $nin: seededCategoryIds },
    }).select('_id name slug').lean();

    const staleCategoryIds = staleCategories.map((item) => item._id);
    if (staleCategoryIds.length > 0) {
      const linkedProductsCount = await QuickCommerceProduct.countDocuments({
        zoneId,
        categoryId: { $in: staleCategoryIds },
      });

      if (linkedProductsCount === 0) {
        await QuickCommerceSubcategory.deleteMany({ categoryId: { $in: staleCategoryIds } });
        await QuickCommerceCategory.deleteMany({ _id: { $in: staleCategoryIds } });
      }
    }

    for (const categorySeed of catalog) {
      const categoryDoc = categoryMap.get(slugify(categorySeed.name));
      if (!categoryDoc?._id) continue;

      const allowedSubcategorySlugs = categorySeed.subcategories.map(slugify);
      const staleSubcategories = await QuickCommerceSubcategory.find({
        categoryId: categoryDoc._id,
        slug: { $nin: allowedSubcategorySlugs },
      }).select('_id').lean();

      const staleSubcategoryIds = staleSubcategories.map((item) => item._id);
      if (staleSubcategoryIds.length === 0) continue;

      const linkedProductsCount = await QuickCommerceProduct.countDocuments({
        zoneId,
        subcategoryId: { $in: staleSubcategoryIds },
      });

      if (linkedProductsCount === 0) {
        await QuickCommerceSubcategory.deleteMany({ _id: { $in: staleSubcategoryIds } });
      }
    }

    const finalCategoryCount = await QuickCommerceCategory.countDocuments({ zoneId, isActive: true });
    const finalSubcategoryCount = await QuickCommerceSubcategory.countDocuments({
      categoryId: { $in: seededCategoryIds },
      isActive: true,
    });

    console.log(
      JSON.stringify(
        {
          success: true,
          zone: {
            id: String(zoneId),
            name: zoneLabel,
          },
          categoryCount: finalCategoryCount,
          subcategoryCount: finalSubcategoryCount,
          categories: catalog.map((item) => ({
            name: item.name,
            slug: slugify(item.name),
            subcategoryCount: item.subcategories.length,
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
