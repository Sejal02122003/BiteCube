import { QuickCommerceSubcategory } from '../models/subcategory.model.js';
import { QuickCommerceCategory } from '../models/category.model.js';

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

/**
 * Create a new Quick Commerce Subcategory
 */
export const createSubcategoryService = async (data) => {
    const { categoryId, name, slug, description, image, icon, isActive, sortOrder } = data;

    if (!categoryId) {
        throw new Error('Parent Category ID is required');
    }

    if (!name || !name.trim()) {
        throw new Error('Subcategory name is required');
    }

    // Verify Parent Category exists
    const categoryDoc = await QuickCommerceCategory.findById(categoryId).lean();
    if (!categoryDoc) {
        throw new Error('Parent category not found');
    }

    const finalSlug = (slug && slug.trim()) ? generateSlug(slug) : generateSlug(name);

    // Check duplicate subcategory name or slug within the same category
    const existing = await QuickCommerceSubcategory.findOne({
        categoryId,
        $or: [
            { name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } },
            { slug: finalSlug }
        ]
    }).lean();

    if (existing) {
        if (existing.slug === finalSlug) {
            throw new Error(`Subcategory with slug '${finalSlug}' already exists in this category`);
        }
        throw new Error(`Subcategory with name '${name.trim()}' already exists in this category`);
    }

    const subcategory = new QuickCommerceSubcategory({
        categoryId,
        categoryName: categoryDoc.name || '',
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || '',
        image: image?.trim() || '',
        icon: icon?.trim() || '',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: Number(sortOrder) || 0
    });

    await subcategory.save();
    return subcategory;
};

/**
 * Get all Quick Commerce Subcategories with search, filters & pagination
 */
export const getSubcategoriesService = async (query = {}) => {
    const {
        search = '',
        categoryId,
        status = 'all', // 'all', 'active', 'inactive'
        page = 1,
        limit = 10,
        sortBy = 'sortOrder',
        sortOrder = 'asc'
    } = query;

    const filter = {};

    if (categoryId) {
        filter.categoryId = categoryId;
    }

    // Search by name, slug, categoryName or description
    if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        filter.$or = [
            { name: searchRegex },
            { slug: searchRegex },
            { categoryName: searchRegex },
            { description: searchRegex }
        ];
    }

    // Filter by active status
    if (status === 'active') {
        filter.isActive = true;
    } else if (status === 'inactive') {
        filter.isActive = false;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    if (sortBy !== 'createdAt') {
        sortOptions.createdAt = -1;
    }

    const [subcategories, total, totalActive, totalInactive] = await Promise.all([
        QuickCommerceSubcategory.find(filter)
            .populate('categoryId', 'name image slug')
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum)
            .lean(),
        QuickCommerceSubcategory.countDocuments(filter),
        QuickCommerceSubcategory.countDocuments({ isActive: true }),
        QuickCommerceSubcategory.countDocuments({ isActive: false })
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
        subcategories,
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
 * Get Subcategory by ID
 */
export const getSubcategoryByIdService = async (id) => {
    const subcategory = await QuickCommerceSubcategory.findById(id)
        .populate('categoryId', 'name image slug')
        .lean();
    if (!subcategory) {
        throw new Error('Subcategory not found');
    }
    return subcategory;
};

/**
 * Update Quick Commerce Subcategory
 */
export const updateSubcategoryService = async (id, data) => {
    const subcategory = await QuickCommerceSubcategory.findById(id);
    if (!subcategory) {
        throw new Error('Subcategory not found');
    }

    const { categoryId, name, slug, description, image, icon, isActive, sortOrder } = data;

    let targetCategoryId = subcategory.categoryId;
    if (categoryId && String(categoryId) !== String(subcategory.categoryId)) {
        const categoryDoc = await QuickCommerceCategory.findById(categoryId).lean();
        if (!categoryDoc) {
            throw new Error('Parent category not found');
        }
        subcategory.categoryId = categoryId;
        subcategory.categoryName = categoryDoc.name || '';
        targetCategoryId = categoryId;
    }

    if (name && name.trim() !== subcategory.name) {
        const newName = name.trim();
        const newSlug = (slug && slug.trim()) ? generateSlug(slug) : generateSlug(newName);

        // Check duplicate within target category
        const duplicate = await QuickCommerceSubcategory.findOne({
            _id: { $ne: id },
            categoryId: targetCategoryId,
            $or: [
                { name: { $regex: new RegExp(`^${newName}$`, 'i') } },
                { slug: newSlug }
            ]
        }).lean();

        if (duplicate) {
            if (duplicate.slug === newSlug) {
                throw new Error(`Subcategory with slug '${newSlug}' already exists in this category`);
            }
            throw new Error(`Subcategory with name '${newName}' already exists in this category`);
        }

        subcategory.name = newName;
        subcategory.slug = newSlug;
    } else if (slug && slug.trim() && slug.trim() !== subcategory.slug) {
        const newSlug = generateSlug(slug);
        const duplicate = await QuickCommerceSubcategory.findOne({
            _id: { $ne: id },
            categoryId: targetCategoryId,
            slug: newSlug
        }).lean();

        if (duplicate) {
            throw new Error(`Subcategory with slug '${newSlug}' already exists in this category`);
        }

        subcategory.slug = newSlug;
    }

    if (description !== undefined) subcategory.description = description.trim();
    if (image !== undefined) subcategory.image = image.trim();
    if (icon !== undefined) subcategory.icon = icon.trim();
    if (isActive !== undefined) subcategory.isActive = Boolean(isActive);
    if (sortOrder !== undefined) subcategory.sortOrder = Number(sortOrder) || 0;

    await subcategory.save();
    return subcategory;
};

/**
 * Toggle Active Status of Subcategory
 */
export const toggleSubcategoryStatusService = async (id) => {
    const subcategory = await QuickCommerceSubcategory.findById(id);
    if (!subcategory) {
        throw new Error('Subcategory not found');
    }

    subcategory.isActive = !subcategory.isActive;
    await subcategory.save();
    return subcategory;
};

/**
 * Delete Quick Commerce Subcategory
 */
export const deleteSubcategoryService = async (id) => {
    const subcategory = await QuickCommerceSubcategory.findByIdAndDelete(id);
    if (!subcategory) {
        throw new Error('Subcategory not found');
    }
    return subcategory;
};
