import { QuickCommerceCategory } from '../models/category.model.js';
import { FoodZone } from '../../../food/admin/models/zone.model.js';
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

const resolveValidZoneId = async (zoneId) => {
    if (!zoneId) {
        throw new Error('Zone is required');
    }

    if (!QuickCommerceCategory.db.base.Types.ObjectId.isValid(zoneId)) {
        throw new Error('Invalid zone selected');
    }

    const zone = await FoodZone.findById(zoneId).lean();
    if (!zone) {
        throw new Error('Selected zone does not exist');
    }

    return zone._id;
};

/**
 * Create a new Quick Commerce Category
 */
export const createCategoryService = async (data) => {
    const { name, slug, description, image, icon, bannerImage, zoneId, isActive, sortOrder } = data;

    if (!name || !name.trim()) {
        throw new Error('Category name is required');
    }

    const resolvedZoneId = await resolveValidZoneId(zoneId);

    const finalSlug = (slug && slug.trim()) ? generateSlug(slug) : generateSlug(name);

    // Check if category with same name or slug already exists within the same zone (case-insensitive)
    const existingCategory = await QuickCommerceCategory.findOne({
        zoneId: resolvedZoneId,
        $or: [
            { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
            { slug: finalSlug }
        ]
    }).lean();

    if (existingCategory) {
        if (existingCategory.slug === finalSlug) {
            throw new Error(`Category with slug '${finalSlug}' already exists`);
        }
        throw new Error(`Category with name '${name.trim()}' already exists`);
    }

    const category = new QuickCommerceCategory({
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || '',
        image: image?.trim() || '',
        icon: icon?.trim() || '',
        bannerImage: bannerImage?.trim() || '',
        zoneId: resolvedZoneId,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: Number(sortOrder) || 0
    });

    await category.save();
    return category;
};

/**
 * Get all Quick Commerce Categories with search, filters & pagination
 */
export const getCategoriesService = async (query = {}) => {
    const {
        search = '',
        status = 'all', // 'all', 'active', 'inactive'
        zoneId,
        page = 1,
        limit = 10,
        sortBy = 'sortOrder',
        sortOrder = 'asc'
    } = query;

    const filter = {};

    // Search by name or slug
    if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        filter.$or = [
            { name: searchRegex },
            { slug: searchRegex },
            { description: searchRegex }
        ];
    }

    // Filter by active status
    if (status === 'active') {
        filter.isActive = true;
    } else if (status === 'inactive') {
        filter.isActive = false;
    }

    // Filter by Zone
    if (zoneId) {
        filter.zoneId = zoneId;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    if (sortBy !== 'createdAt') {
        sortOptions.createdAt = -1;
    }

    const statsFilter = { ...filter };

    const [categories, total, totalActive, totalInactive] = await Promise.all([
        QuickCommerceCategory.find(filter)
            .populate('zoneId', 'name zoneName serviceLocation isActive')
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum)
            .lean(),
        QuickCommerceCategory.countDocuments(filter),
        QuickCommerceCategory.countDocuments({ ...statsFilter, isActive: true }),
        QuickCommerceCategory.countDocuments({ ...statsFilter, isActive: false })
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
        categories,
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
            inactive: totalInactive
        }
    };
};

/**
 * Get Category by ID
 */
export const getCategoryByIdService = async (id) => {
    const category = await QuickCommerceCategory.findById(id)
        .populate('zoneId', 'name zoneName serviceLocation isActive')
        .lean();
    if (!category) {
        throw new Error('Category not found');
    }
    return category;
};

/**
 * Update Quick Commerce Category
 */
export const updateCategoryService = async (id, data) => {
    const category = await QuickCommerceCategory.findById(id);
    if (!category) {
        throw new Error('Category not found');
    }

    const { name, slug, description, image, icon, bannerImage, zoneId, isActive, sortOrder } = data;
    const nextZoneId = zoneId !== undefined ? await resolveValidZoneId(zoneId) : category.zoneId;
    const previousImage = String(category.image || '').trim();
    const previousIcon = String(category.icon || '').trim();
    const previousBannerImage = String(category.bannerImage || '').trim();

    if (name && name.trim() !== category.name) {
        const newName = name.trim();
        const newSlug = (slug && slug.trim()) ? generateSlug(slug) : generateSlug(newName);

        // Check duplicates excluding current category
        const duplicate = await QuickCommerceCategory.findOne({
            _id: { $ne: id },
            zoneId: nextZoneId,
            $or: [
                { name: { $regex: new RegExp(`^${newName}$`, 'i') } },
                { slug: newSlug }
            ]
        }).lean();

        if (duplicate) {
            if (duplicate.slug === newSlug) {
                throw new Error(`Category with slug '${newSlug}' already exists`);
            }
            throw new Error(`Category with name '${newName}' already exists`);
        }

        category.name = newName;
        category.slug = newSlug;
    } else if (slug && slug.trim() && slug.trim() !== category.slug) {
        const newSlug = generateSlug(slug);
        const duplicate = await QuickCommerceCategory.findOne({
            _id: { $ne: id },
            zoneId: nextZoneId,
            slug: newSlug
        }).lean();

        if (duplicate) {
            throw new Error(`Category with slug '${newSlug}' already exists`);
        }

        category.slug = newSlug;
    }

    if (description !== undefined) category.description = description.trim();
    if (image !== undefined) category.image = image.trim();
    if (icon !== undefined) category.icon = icon.trim();
    if (bannerImage !== undefined) category.bannerImage = bannerImage.trim();
    if (zoneId !== undefined) category.zoneId = nextZoneId;
    if (isActive !== undefined) category.isActive = Boolean(isActive);
    if (sortOrder !== undefined) category.sortOrder = Number(sortOrder) || 0;

    await category.save();
    await deleteManagedUploadsByUrls([
        image !== undefined && previousImage !== String(category.image || '').trim() ? previousImage : '',
        icon !== undefined && previousIcon !== String(category.icon || '').trim() ? previousIcon : '',
        bannerImage !== undefined && previousBannerImage !== String(category.bannerImage || '').trim() ? previousBannerImage : ''
    ]);
    return category;
};

/**
 * Toggle Active Status of Category
 */
export const toggleCategoryStatusService = async (id) => {
    const category = await QuickCommerceCategory.findById(id);
    if (!category) {
        throw new Error('Category not found');
    }

    category.isActive = !category.isActive;
    await category.save();
    return category;
};

/**
 * Delete Quick Commerce Category
 */
export const deleteCategoryService = async (id) => {
    const category = await QuickCommerceCategory.findByIdAndDelete(id);
    if (!category) {
        throw new Error('Category not found');
    }
    await deleteManagedUploadsByUrls([category.image, category.icon, category.bannerImage]);
    return category;
};
