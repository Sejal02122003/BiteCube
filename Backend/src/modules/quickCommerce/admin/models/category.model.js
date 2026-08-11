import mongoose from 'mongoose';

const quickCommerceCategorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, index: true },
        slug: { type: String, trim: true, lowercase: true, index: true },
        description: { type: String, trim: true, default: '' },
        image: { type: String, trim: true, default: '' },
        icon: { type: String, trim: true, default: '' },
        bannerImage: { type: String, trim: true, default: '' },
        zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodZone', index: true, default: undefined },
        isActive: { type: Boolean, default: true, index: true },
        sortOrder: { type: Number, default: 0, index: true }
    },
    {
        collection: 'quick_commerce_categories',
        timestamps: true
    }
);

quickCommerceCategorySchema.index({ isActive: 1, sortOrder: 1 });
quickCommerceCategorySchema.index({ name: 1, isActive: 1 });

export const QuickCommerceCategory = mongoose.model('QuickCommerceCategory', quickCommerceCategorySchema);
