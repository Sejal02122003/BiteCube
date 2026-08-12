import express from 'express';
import { upload } from '../../../../middleware/upload.js';
import {
    listQuickHeroBannersController,
    uploadQuickHeroBannersController,
    deleteQuickHeroBannerController,
    updateQuickHeroBannerOrderController,
    toggleQuickHeroBannerStatusController,
    getPublicQuickHeroBannersController
} from '../controllers/quickHeroBanner.controller.js';

const router = express.Router();

// Public route for frontend user app
router.get('/public', getPublicQuickHeroBannersController);

// Admin Quick Hero Banner management
router.get('/', listQuickHeroBannersController);
router.post('/multiple', upload.array('files'), uploadQuickHeroBannersController);
router.delete('/:id', deleteQuickHeroBannerController);
router.patch('/:id/order', updateQuickHeroBannerOrderController);
router.patch('/:id/status', toggleQuickHeroBannerStatusController);

export default router;
