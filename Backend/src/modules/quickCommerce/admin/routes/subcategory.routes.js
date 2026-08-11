import express from 'express';
import {
    createSubcategory,
    getSubcategories,
    getSubcategoryById,
    updateSubcategory,
    toggleSubcategoryStatus,
    deleteSubcategory
} from '../controllers/subcategory.controller.js';

const router = express.Router();

// Routes relative to /v1/quick-commerce/admin/subcategories
router.route('/')
    .post(createSubcategory)
    .get(getSubcategories);

router.route('/:id')
    .get(getSubcategoryById)
    .put(updateSubcategory)
    .delete(deleteSubcategory);

router.patch('/:id/status', toggleSubcategoryStatus);

export default router;
