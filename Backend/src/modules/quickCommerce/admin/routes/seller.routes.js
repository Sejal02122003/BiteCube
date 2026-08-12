import express from 'express';
import {
    getSellerById,
    getSellers,
    toggleSellerActive,
    updateSeller,
    updateSellerStatus
} from '../controllers/seller.controller.js';

const router = express.Router();

router.route('/')
    .get(getSellers);

router.route('/:id')
    .get(getSellerById)
    .put(updateSeller);

router.patch('/:id/status', updateSellerStatus);
router.patch('/:id/active', toggleSellerActive);

export default router;
