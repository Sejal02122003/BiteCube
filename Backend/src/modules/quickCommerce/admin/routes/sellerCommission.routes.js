import express from 'express';
import {
    createSellerCommission,
    deleteSellerCommission,
    getSellerCommissionBootstrap,
    getSellerCommissionById,
    getSellerCommissions,
    toggleSellerCommissionStatus,
    updateGlobalSellerCommissionSettings,
    updateSellerCommission
} from '../controllers/sellerCommission.controller.js';

const router = express.Router();

router.get('/bootstrap', getSellerCommissionBootstrap);
router.post('/global', updateGlobalSellerCommissionSettings);

router.route('/')
    .get(getSellerCommissions)
    .post(createSellerCommission);

router.route('/:id')
    .get(getSellerCommissionById)
    .patch(updateSellerCommission)
    .delete(deleteSellerCommission);

router.patch('/:id/toggle', toggleSellerCommissionStatus);

export default router;
