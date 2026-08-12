import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { QuickCommerceSubcategory } from '../modules/quickCommerce/admin/models/subcategory.model.js';

const iconMap = {
  'atta-flour': '🌾',
  rice: '🍚',
  'dal-pulses': '🫘',
  'poha-suji-daliya': '🥣',
  'millets-grains': '🌿',
  'besan-specialty-flour': '🥘',
  'baby-diapers': '🧷',
  'baby-wipes': '🧻',
  'baby-bath-skin-care': '🛁',
  'baby-food': '🍼',
  'baby-powder-lotion': '🧴',
  'feeding-accessories': '🥄',
  'soft-drinks': '🥤',
  'fruit-juices': '🧃',
  'energy-drinks': '⚡',
  'flavored-water': '💧',
  'soda-mixers': '🍹',
  'ready-to-drink-beverages': '🧋',
  milk: '🥛',
  'curd-yogurt': '🍶',
  'paneer-cheese': '🧀',
  'butter-spreads': '🧈',
  'bread-buns': '🍞',
  eggs: '🥚',
  'seasonal-fruits': '🍎',
  'banana-apple-pomegranate': '🍌',
  'citrus-fruits': '🍊',
  'tropical-fruits': '🥭',
  'exotic-fruits': '🥝',
  'cut-fruits-packs': '🍉',
  'leafy-vegetables': '🥬',
  'root-vegetables': '🥕',
  'exotic-vegetables': '🥦',
  'tomato-onion-potato': '🍅',
  'green-peas-beans': '🫛',
  'cut-peeled-vegetables': '🔪',
  'detergent-fabric-care': '🧺',
  'dishwash-cleaners': '🍽️',
  'floor-surface-cleaners': '🧽',
  'toilet-bathroom-cleaners': '🚽',
  'air-fresheners': '🌸',
  'garbage-bags-foils': '🗑️',
  'instant-noodles-pasta': '🍜',
  soups: '🍲',
  'ready-to-eat': '🍛',
  'breakfast-cereals': '🥣',
  'sauces-spreads': '🍯',
  'baking-needs': '🧁',
  'cooking-oil': '🫗',
  'ghee-vanaspati': '🧈',
  'whole-spices': '🌶️',
  'ground-masalas': '🥄',
  'salt-sugar-jaggery': '🧂',
  'dry-fruits-seeds': '🥜',
  'bath-soap': '🧼',
  'hair-care': '💇',
  'oral-care': '🪥',
  'skin-care': '🧴',
  'deodorants-perfumes': '🫧',
  'shaving-grooming': '🪒',
  'namkeen-mixtures': '🥨',
  'chips-crisps': '🍟',
  'biscuits-cookies': '🍪',
  chocolates: '🍫',
  'candy-gums': '🍬',
  'healthy-snacks': '🥜',
  tea: '🍵',
  coffee: '☕',
  'green-tea-herbal-tea': '🌿',
  'health-drinks': '💪',
  'milk-additives': '🥄',
  sweeteners: '🍯',
};

const escapeXml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const createDataUrl = ({ icon, label }) => {
  const safeIcon = escapeXml(icon || '🛒');
  const safeLabel = escapeXml(label || '').slice(0, 24);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" rx="48" fill="#ffffff"/>
      <circle cx="256" cy="208" r="120" fill="#f8fafc"/>
      <text x="256" y="236" text-anchor="middle" font-size="128">${safeIcon}</text>
      <text x="256" y="396" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#0f172a">${safeLabel}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
};

async function main() {
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI / MONGO_URI is missing');
  }

  await mongoose.connect(config.mongodbUri);

  try {
    const subcategories = await QuickCommerceSubcategory.find({})
      .select('_id name slug')
      .lean();

    let updatedCount = 0;

    for (const subcategory of subcategories) {
      const icon = iconMap[subcategory.slug] || '🛍️';
      const imageUrl = createDataUrl({
        icon,
        label: subcategory.name,
      });

      await QuickCommerceSubcategory.updateOne(
        { _id: subcategory._id },
        { $set: { image: imageUrl } },
      );

      updatedCount += 1;
    }

    console.log(
      JSON.stringify(
        {
          success: true,
          updatedCount,
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
