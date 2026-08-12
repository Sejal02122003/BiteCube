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
        unit,
        unitValue,
        packSize,
        price,
        discountPrice,
        costPrice,
        stock,
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

    if (price === undefined || price === null || Number(price) < 0) {
        throw new Error('Valid product price is required');
    }

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
        unit: unit?.trim() || 'pcs',
        unitValue: Number(unitValue) || 1,
        packSize: packSize?.trim() || '',
        price: Number(price),
        discountPrice: discountPrice !== undefined && discountPrice !== null && discountPrice !== '' ? Number(discountPrice) : null,
        costPrice: costPrice !== undefined && costPrice !== null && costPrice !== '' ? Number(costPrice) : null,
        stock: stock !== undefined ? Math.max(0, parseInt(stock, 10) || 0) : 0,
        maxPurchaseQuantity: Number(maxPurchaseQuantity) || 10,
        minPurchaseQuantity: Number(minPurchaseQuantity) || 1,
        mainImage: mainImage?.trim() || (Array.isArray(images) && images[0] ? images[0] : ''),
        images: Array.isArray(images) ? images.filter(Boolean) : (mainImage ? [mainImage.trim()] : []),
        variants: Array.isArray(variants) ? variants : [],
        attributes: Array.isArray(attributes) ? attributes : [],
        tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : []),
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sellerId: options?.sellerId || sellerId || undefined,
        zoneId: zoneId || undefined
    });

    await product.save();
    return product;
};

/**
 * Get all Quick Commerce Products with search, filters & pagination
 */
export const getProductsService = async (query = {}, options = {}) => {
    const {
        search = '',
        categoryId,
        subcategoryId,
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
        filter.stock = { $gt: 0 };
    } else if (stockStatus === 'outOfStock') {
        filter.stock = { $lte: 0 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
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
        QuickCommerceProduct.countDocuments({ ...statsFilter, stock: { $lte: 0 } })
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
        products,
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
    return product;
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
        unit,
        unitValue,
        packSize,
        price,
        discountPrice,
        costPrice,
        stock,
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
    if (unit !== undefined) product.unit = unit.trim();
    if (unitValue !== undefined) product.unitValue = Number(unitValue) || 1;
    if (packSize !== undefined) product.packSize = packSize.trim();
    if (price !== undefined) product.price = Number(price);
    if (discountPrice !== undefined) product.discountPrice = (discountPrice !== null && discountPrice !== '') ? Number(discountPrice) : null;
    if (costPrice !== undefined) product.costPrice = (costPrice !== null && costPrice !== '') ? Number(costPrice) : null;
    if (stock !== undefined) product.stock = Math.max(0, parseInt(stock, 10) || 0);
    if (maxPurchaseQuantity !== undefined) product.maxPurchaseQuantity = Number(maxPurchaseQuantity) || 10;
    if (minPurchaseQuantity !== undefined) product.minPurchaseQuantity = Number(minPurchaseQuantity) || 1;
    if (mainImage !== undefined) product.mainImage = mainImage.trim();
    if (images !== undefined) product.images = Array.isArray(images) ? images.filter(Boolean) : [];
    if (variants !== undefined) product.variants = Array.isArray(variants) ? variants : [];
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
    return product;
};

/**
 * Toggle Active Status of Product
 */
export const toggleProductStatusService = async (id, options = {}) => {
    const product = await QuickCommerceProduct.findById(id);
    assertProductAccess(product, options);

    product.isActive = !product.isActive;
    await product.save();
    return product;
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
    return product;
};
