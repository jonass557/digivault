import express from 'express';
import * as bundleController from '../controllers/bundle.controller.js';
import { protect, isVendor } from '../middleware/auth.middleware.js';

const router = express.Router();

// Vendeur — routes spécifiques avant /:slug
router.get('/mine', protect, isVendor, bundleController.getMyBundles);
router.post('/', protect, isVendor, bundleController.createBundle);
router.put('/:id', protect, isVendor, bundleController.updateBundle);
router.delete('/:id', protect, isVendor, bundleController.deleteBundle);

// Public
router.get('/', bundleController.getPublishedBundles);
router.get('/for-product/:productId', bundleController.getBundlesForProduct);
router.get('/:slug', bundleController.getBundleBySlug);

export default router;
