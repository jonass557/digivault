import express from 'express';
import * as couponController from '../controllers/coupon.controller.js';
import { protect, isVendor, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Validation (client connecté) — ne consomme pas le coupon.
router.post('/validate', protect, couponController.validateCoupon);

// Admin
router.get('/admin', protect, isAdmin, couponController.getAllCoupons);
router.post('/admin', protect, isAdmin, couponController.createAdminCoupon);

// Vendeur
router.get('/my-coupons', protect, isVendor, couponController.getMyCoupons);
router.post('/', protect, isVendor, couponController.createCoupon);

// Vendeur/Admin — modification / suppression (ownership vérifié dans le contrôleur)
router.put('/:id', protect, isVendor, couponController.updateCoupon);
router.delete('/:id', protect, isVendor, couponController.deleteCoupon);

export default router;
