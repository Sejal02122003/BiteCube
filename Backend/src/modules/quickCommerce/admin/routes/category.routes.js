import express from 'express';
import {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory
} from '../controllers/category.controller.js';

const router = express.Router();

// Routes relative to /v1/quick-commerce/admin/categories
router.route('/')
    .post(createCategory)
    .get(getCategories);

router.route('/:id')
    .get(getCategoryById)
    .put(updateCategory)
    .delete(deleteCategory);

router.patch('/:id/status', toggleCategoryStatus);

export default router;
