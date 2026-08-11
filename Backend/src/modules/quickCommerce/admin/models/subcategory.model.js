import mongoose from 'mongoose';

const quickCommerceSubcategorySchema = new mongoose.Schema(
    {
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuickCommerceCategory', required: true, index: true },
        categoryName: { type: String, trim: true, default: '' },
        name: { type: String, required: true, trim: true, index: true },
        slug: { type: String, trim: true, lowercase: true, index: true },
        description: { type: String, trim: true, default: '' },
        image: { type: String, trim: true, default: '' },
        icon: { type: String, trim: true, default: '' },
        isActive: { type: Boolean, default: true, index: true },
        sortOrder: { type: Number, default: 0, index: true }
    },
    {
        collection: 'quick_commerce_subcategories',
        timestamps: true
    }
);

quickCommerceSubcategorySchema.index({ categoryId: 1, isActive: 1, sortOrder: 1 });

export const QuickCommerceSubcategory = mongoose.model('QuickCommerceSubcategory', quickCommerceSubcategorySchema);
export const QuickCommerceSubCategory = QuickCommerceSubcategory;
