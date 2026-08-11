import mongoose from 'mongoose';

const productVariantSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        unit: { type: String, trim: true, default: '' },
        unitValue: { type: Number, default: 1 },
        price: { type: Number, required: true, min: 0 },
        discountPrice: { type: Number, default: null, min: 0 },
        stock: { type: Number, default: 0, min: 0 },
        sku: { type: String, trim: true, default: '' },
        image: { type: String, trim: true, default: '' },
        isAvailable: { type: Boolean, default: true }
    },
    { _id: true }
);

const quickCommerceProductSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, index: true },
        slug: { type: String, trim: true, lowercase: true, index: true },
        description: { type: String, trim: true, default: '' },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuickCommerceCategory', required: true, index: true },
        categoryName: { type: String, trim: true, default: '' },
        subcategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuickCommerceSubcategory', index: true },
        subcategoryName: { type: String, trim: true, default: '' },
        brand: { type: String, trim: true, default: '', index: true },
        sku: { type: String, trim: true, index: true },
        barcode: { type: String, trim: true, default: '' },
        unit: { type: String, trim: true, default: 'pcs' },
        unitValue: { type: Number, default: 1 },
        packSize: { type: String, trim: true, default: '' },
        price: { type: Number, required: true, min: 0 },
        discountPrice: { type: Number, default: null, min: 0 },
        costPrice: { type: Number, default: null, min: 0 },
        stock: { type: Number, default: 0, min: 0, index: true },
        maxPurchaseQuantity: { type: Number, default: 10 },
        minPurchaseQuantity: { type: Number, default: 1 },
        mainImage: { type: String, trim: true, default: '' },
        images: [{ type: String, trim: true }],
        variants: { type: [productVariantSchema], default: [] },
        attributes: [
            {
                key: { type: String, trim: true },
                value: { type: String, trim: true }
            }
        ],
        tags: [{ type: String, trim: true }],
        isAvailable: { type: Boolean, default: true, index: true },
        isActive: { type: Boolean, default: true, index: true },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        reviewCount: { type: Number, default: 0 },
        storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodRestaurant', index: true, default: undefined },
        zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodZone', index: true, default: undefined },
        approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved', index: true },
        rejectionReason: { type: String, trim: true, default: '' }
    },
    {
        collection: 'quick_commerce_products',
        timestamps: true
    }
);

quickCommerceProductSchema.index({ categoryId: 1, subcategoryId: 1, isActive: 1 });
quickCommerceProductSchema.index({ isAvailable: 1, isActive: 1, stock: 1 });

export const QuickCommerceProduct = mongoose.model('QuickCommerceProduct', quickCommerceProductSchema);
export const QuickCommerceItem = QuickCommerceProduct;
