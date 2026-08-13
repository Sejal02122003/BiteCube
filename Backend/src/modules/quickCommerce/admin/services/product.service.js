import { QuickCommerceProduct } from '../models/product.model.js';
import { QuickCommerceCategory } from '../models/category.model.js';
import { QuickCommerceSubcategory } from '../models/subcategory.model.js';
import { deleteManagedUploadsByUrls } from '../../../../services/upload.service.js';

/**
 * Generate URL-friendly slug from string
 */
const generateSlug = (text) => {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const normalizeVariants = (variants) => {
    if (!Array.isArray(variants) || variants.length === 0) {
        throw new Error('At least one product variant is required');
    }

    return variants.map((variant, index) => {
        const name = String(variant?.name || '').trim();
        const unit = String(variant?.unit || '').trim();
        const unitValue = Number(variant?.unitValue);
        const price = Number(variant?.price);
        const hasDiscount = variant?.discountPrice !== undefined &&
            variant?.discountPrice !== null && variant?.discountPrice !== '';
        const discountPrice = hasDiscount ? Number(variant.discountPrice) : null;

        if (!name) throw new Error(`Variant #${index + 1} name is required`);
        if (!unit) throw new Error(`Variant #${index + 1} unit type is required`);
        if (!Number.isFinite(unitValue) || unitValue <= 0) {
            throw new Error(`Variant #${index + 1} requires a valid unit value`);
        }
        if (!Number.isFinite(price) || price < 0) {
            throw new Error(`Variant #${index + 1} requires a valid MRP price`);
        }
        if (hasDiscount && (!Number.isFinite(discountPrice) || discountPrice < 0 || discountPrice >= price)) {
            throw new Error(`Variant #${index + 1} selling price must be lower than its MRP price`);
        }

        return {
            ...(variant?._id ? { _id: variant._id } : {}),
            name,
            unit,
            unitValue,
            price,
            discountPrice,
            stock: Math.max(0, parseInt(variant?.stock, 10) || 0),
            sku: String(variant?.sku || '').trim(),
            image: String(variant?.image || '').trim(),
            isAvailable: variant?.isAvailable !== false
        };
    });
};

const normalizeProductImages = (mainImage, images) => {
    const orderedImages = [
        String(mainImage || '').trim(),
        ...(Array.isArray(images) ? images : []).map((image) => String(image || '').trim())
    ].filter(Boolean);
    const uniqueImages = [...new Set(orderedImages)];
    return {
        mainImage: uniqueImages[0] || '',
        images: uniqueImages
    };
};

const buildLegacyVariant = (product = {}) => {
    const price = Number(product?.price);
    if (!Number.isFinite(price) || price < 0) return null;

    const hasDiscount = product?.discountPrice !== undefined &&
        product?.discountPrice !== null && product?.discountPrice !== '';
    const rawDiscount = Number(product?.discountPrice);

    return {
        _id: product?._id,
        name: String(product?.packSize || '').trim() ||
            `${Number(product?.unitValue) || 1} ${product?.unit || 'pcs'}`.trim(),
        unit: String(product?.unit || 'pcs').trim(),
        unitValue: Number(product?.unitValue) || 1,
        price,
        discountPrice: hasDiscount && rawDiscount >= 0 && rawDiscount < price ? rawDiscount : null,
        stock: Math.max(0, parseInt(product?.stock, 10) || 0),
        sku: String(product?.sku || '').trim(),
        image: String(product?.mainImage || '').trim(),
        isAvailable: product?.isAvailable !== false
    };
};

const toVariantOnlyProduct = (value) => {
    if (!value) return value;
    const product = typeof value.toObject === 'function' ? value.toObject() : { ...value };
    if (!Array.isArray(product.variants) || product.variants.length === 0) {
        const legacyVariant = buildLegacyVariant(product);
        product.variants = legacyVariant ? [legacyVariant] : [];
    } else {
        product.variants = product.variants.map((variant) => ({
            ...variant,
            unit: String(variant?.unit || product?.unit || 'pcs').trim(),
            unitValue: Number(variant?.unitValue) > 0
                ? Number(variant.unitValue)
                : (Number(product?.unitValue) || 1)
        }));
    }
    delete product.price;
    delete product.discountPrice;
    delete product.costPrice;
    delete product.stock;
    delete product.unit;
    delete product.unitValue;
    delete product.packSize;
    return product;
};

const migrateLegacyVariant = (product) => {
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
        product.variants.forEach((variant) => {
            if (!String(variant?.unit || '').trim()) {
                variant.unit = String(product?._doc?.unit || 'pcs').trim();
            }
            if (!(Number(variant?.unitValue) > 0)) {
                variant.unitValue = Number(product?._doc?.unitValue) || 1;
            }
        });
        return;
    }
    const legacyVariant = buildLegacyVariant(product?._doc || product);
    if (legacyVariant) product.variants = [legacyVariant];
};

const inStockCondition = {
    $or: [
        { variants: { $elemMatch: { stock: { $gt: 0 }, isAvailable: { $ne: false } } } },
        { 'variants.0': { $exists: false }, stock: { $gt: 0 } }
    ]
};

const outOfStockCondition = {
    $nor: [
        { variants: { $elemMatch: { stock: { $gt: 0 }, isAvailable: { $ne: false } } } },
        { 'variants.0': { $exists: false }, stock: { $gt: 0 } }
    ]
};

const buildOwnershipFilter = (options = {}) => {
    const filter = {};

    if (options?.sellerId) {
        filter.sellerId = options.sellerId;
    }

    return filter;
};

const assertProductAccess = (product, options = {}) => {
    if (!product) {
        throw new Error('Product not found');
    }

    if (options?.sellerId && String(product.sellerId || '') !== String(options.sellerId)) {
        throw new Error('Product not found');
    }
};

/**
 * Create a new Quick Commerce Product
 */
export const createProductService = async (data, options = {}) => {
    const {
        name,
        slug,
        description,
        categoryId,
        subcategoryId,
        brand,
        sku,
        barcode,
        maxPurchaseQuantity,
        minPurchaseQuantity,
        mainImage,
        images,
        variants,
        attributes,
        tags,
        isAvailable,
        isActive,
        zoneId,
        sellerId
    } = data;

    if (!name || !name.trim()) {
        throw new Error('Product name is required');
    }

    if (!categoryId) {
        throw new Error('Category is required');
    }

    const normalizedVariants = normalizeVariants(variants);
    const normalizedImages = normalizeProductImages(mainImage, images);

    // Verify parent category
    const categoryDoc = await QuickCommerceCategory.findById(categoryId).lean();
    if (!categoryDoc) {
        throw new Error('Category not found');
    }

    // Verify subcategory if provided
    let subcategoryName = '';
    if (subcategoryId) {
        const subDoc = await QuickCommerceSubcategory.findById(subcategoryId).lean();
        if (subDoc) {
            subcategoryName = subDoc.name || '';
        }
    }

    const finalSlug = (slug && slug.trim()) ? generateSlug(slug) : generateSlug(name);

    // Check duplicate slug
    const existingSlug = await QuickCommerceProduct.findOne({ slug: finalSlug }).lean();
    if (existingSlug) {
        const uniqueSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
        data.finalSlug = uniqueSlug;
    } else {
        data.finalSlug = finalSlug;
    }

    const product = new QuickCommerceProduct({
        name: name.trim(),
        slug: data.finalSlug,
        description: description?.trim() || '',
        categoryId,
        categoryName: categoryDoc.name || '',
        subcategoryId: subcategoryId || undefined,
        subcategoryName,
        brand: brand?.trim() || '',
        sku: sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        barcode: barcode?.trim() || '',
        maxPurchaseQuantity: Number(maxPurchaseQuantity) || 10,
        minPurchaseQuantity: Number(minPurchaseQuantity) || 1,
        mainImage: normalizedImages.mainImage,
        images: normalizedImages.images,
        variants: normalizedVariants,
        attributes: Array.isArray(attributes) ? attributes : [],
        tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : []),
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sellerId: options?.sellerId || sellerId || undefined,
        zoneId: zoneId || undefined
    });

    await product.save();
    return toVariantOnlyProduct(product);
};

/**
 * Get all Quick Commerce Products with search, filters & pagination
 */
export const getProductsService = async (query = {}, options = {}) => {
    const {
        search = '',
        categoryId,
        subcategoryId,
        isActive,
        isAvailable,
        approvalStatus,
        showInLowestPriceEver,
        status = 'all', // 'all', 'active', 'inactive'
        stockStatus = 'all', // 'all', 'inStock', 'outOfStock'
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = query;

    const filter = buildOwnershipFilter(options);

    if (categoryId) {
        filter.categoryId = categoryId;
    }

    if (subcategoryId) {
        filter.subcategoryId = subcategoryId;
    }

    if (typeof isActive !== 'undefined') {
        filter.isActive = isActive === true || isActive === 'true';
    }

    if (typeof isAvailable !== 'undefined') {
        filter.isAvailable = isAvailable === true || isAvailable === 'true';
    }

    if (approvalStatus) {
        filter.approvalStatus = approvalStatus;
    }

    if (typeof showInLowestPriceEver !== 'undefined') {
        filter.showInLowestPriceEver =
            showInLowestPriceEver === true || showInLowestPriceEver === 'true';
    }

    // Search by name, brand, SKU, tags, categoryName, description
    if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        filter.$or = [
            { name: searchRegex },
            { brand: searchRegex },
            { sku: searchRegex },
            { categoryName: searchRegex },
            { subcategoryName: searchRegex },
            { tags: searchRegex },
            { description: searchRegex }
        ];
    }

    // Filter by active status
    if (status === 'active') {
        filter.isActive = true;
    } else if (status === 'inactive') {
        filter.isActive = false;
    }

    // Filter by Stock Status
    if (stockStatus === 'inStock') {
        filter.$and = [...(filter.$and || []), inStockCondition];
    } else if (stockStatus === 'outOfStock') {
        filter.$and = [...(filter.$and || []), outOfStockCondition];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy === 'price' ? 'variants.price' : sortBy] = sortOrder === 'asc' ? 1 : -1;
    const statsFilter = buildOwnershipFilter(options);

    const [products, total, totalActive, totalInactive, totalOutOfStock] = await Promise.all([
        QuickCommerceProduct.find(filter)
            .populate('categoryId', 'name slug')
            .populate('subcategoryId', 'name slug')
            .populate('sellerId', 'storeName ownerName')
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum)
            .lean(),
        QuickCommerceProduct.countDocuments(filter),
        QuickCommerceProduct.countDocuments({ ...statsFilter, isActive: true }),
        QuickCommerceProduct.countDocuments({ ...statsFilter, isActive: false }),
        QuickCommerceProduct.countDocuments({
            ...statsFilter,
            ...outOfStockCondition
        })
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
        products: products.map(toVariantOnlyProduct),
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1
        },
        stats: {
            totalAll: totalActive + totalInactive,
            active: totalActive,
            inactive: totalInactive,
            outOfStock: totalOutOfStock
        }
    };
};

/**
 * Get Product by ID
 */
export const getProductByIdService = async (id, options = {}) => {
    const product = await QuickCommerceProduct.findById(id)
        .populate('categoryId', 'name slug')
        .populate('subcategoryId', 'name slug')
        .populate('sellerId', 'storeName ownerName')
        .lean();
    assertProductAccess(product, options);
    return toVariantOnlyProduct(product);
};

/**
 * Update Quick Commerce Product
 */
export const updateProductService = async (id, data, options = {}) => {
    const product = await QuickCommerceProduct.findById(id);
    assertProductAccess(product, options);
    const previousMainImage = String(product.mainImage || '').trim();
    const previousImages = Array.isArray(product.images) ? product.images.map((image) => String(image || '').trim()).filter(Boolean) : [];

    const {
        name,
        slug,
        description,
        categoryId,
        subcategoryId,
        brand,
        sku,
        barcode,
        maxPurchaseQuantity,
        minPurchaseQuantity,
        mainImage,
        images,
        variants,
        attributes,
        tags,
        isAvailable,
        isActive,
        zoneId
    } = data;

    if (categoryId && String(categoryId) !== String(product.categoryId)) {
        const categoryDoc = await QuickCommerceCategory.findById(categoryId).lean();
        if (!categoryDoc) {
            throw new Error('Category not found');
        }
        product.categoryId = categoryId;
        product.categoryName = categoryDoc.name || '';
    }

    if (subcategoryId !== undefined) {
        if (subcategoryId) {
            const subDoc = await QuickCommerceSubcategory.findById(subcategoryId).lean();
            product.subcategoryId = subcategoryId;
            product.subcategoryName = subDoc?.name || '';
        } else {
            product.subcategoryId = undefined;
            product.subcategoryName = '';
        }
    }

    if (name && name.trim() !== product.name) {
        const newName = name.trim();
        const newSlug = (slug && slug.trim()) ? generateSlug(slug) : generateSlug(newName);

        const duplicate = await QuickCommerceProduct.findOne({
            _id: { $ne: id },
            slug: newSlug
        }).lean();

        product.name = newName;
        product.slug = duplicate ? `${newSlug}-${Date.now().toString().slice(-4)}` : newSlug;
    } else if (slug && slug.trim() && slug.trim() !== product.slug) {
        const newSlug = generateSlug(slug);
        const duplicate = await QuickCommerceProduct.findOne({
            _id: { $ne: id },
            slug: newSlug
        }).lean();

        if (duplicate) {
            throw new Error(`Product with slug '${newSlug}' already exists`);
        }
        product.slug = newSlug;
    }

    if (description !== undefined) product.description = description.trim();
    if (brand !== undefined) product.brand = brand.trim();
    if (sku !== undefined) product.sku = sku.trim();
    if (barcode !== undefined) product.barcode = barcode.trim();
    if (maxPurchaseQuantity !== undefined) product.maxPurchaseQuantity = Number(maxPurchaseQuantity) || 10;
    if (minPurchaseQuantity !== undefined) product.minPurchaseQuantity = Number(minPurchaseQuantity) || 1;
    if (mainImage !== undefined || images !== undefined) {
        const primaryImage = mainImage !== undefined
            ? mainImage
            : (images !== undefined && Array.isArray(images) ? images[0] : product.mainImage);
        const normalizedImages = normalizeProductImages(
            primaryImage,
            images !== undefined ? images : product.images
        );
        product.mainImage = normalizedImages.mainImage;
        product.images = normalizedImages.images;
    }
    if (variants !== undefined) product.variants = normalizeVariants(variants);
    else migrateLegacyVariant(product);
    if (attributes !== undefined) product.attributes = Array.isArray(attributes) ? attributes : [];
    if (tags !== undefined) product.tags = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : []);
    if (isAvailable !== undefined) product.isAvailable = Boolean(isAvailable);
    if (isActive !== undefined) product.isActive = Boolean(isActive);
    if (zoneId !== undefined) product.zoneId = zoneId || undefined;

    await product.save();
    const nextMainImage = String(product.mainImage || '').trim();
    const nextImages = Array.isArray(product.images) ? product.images.map((image) => String(image || '').trim()).filter(Boolean) : [];
    const removedImages = previousImages.filter((image) => !nextImages.includes(image) && image !== nextMainImage);
    if (previousMainImage && previousMainImage !== nextMainImage && !nextImages.includes(previousMainImage)) {
        removedImages.push(previousMainImage);
    }
    await deleteManagedUploadsByUrls(removedImages);
    return toVariantOnlyProduct(product);
};

/**
 * Toggle Active Status of Product
 */
export const toggleProductStatusService = async (id, options = {}) => {
    const product = await QuickCommerceProduct.findById(id);
    assertProductAccess(product, options);

    migrateLegacyVariant(product);
    product.isActive = !product.isActive;
    await product.save();
    return toVariantOnlyProduct(product);
};

/**
 * Delete Quick Commerce Product
 */
export const deleteProductService = async (id, options = {}) => {
    const product = await QuickCommerceProduct.findById(id);
    assertProductAccess(product, options);
    await product.deleteOne();
    await deleteManagedUploadsByUrls([
        product.mainImage,
        ...(Array.isArray(product.images) ? product.images : [])
    ]);
    return toVariantOnlyProduct(product);
};

export const updateLowestPriceEverSelectionService = async (id, data = {}, options = {}) => {
    const product = await QuickCommerceProduct.findById(id);
    assertProductAccess(product, options);
    migrateLegacyVariant(product);

    const {
        showInLowestPriceEver,
        lowestPriceEverOrder
    } = data;

    if (typeof showInLowestPriceEver !== 'undefined') {
        product.showInLowestPriceEver = Boolean(showInLowestPriceEver);
    }

    if (typeof lowestPriceEverOrder !== 'undefined') {
        product.lowestPriceEverOrder = Number(lowestPriceEverOrder) || 0;
    }

    await product.save();
    return toVariantOnlyProduct(product);
};
