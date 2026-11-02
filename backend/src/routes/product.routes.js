import express from 'express';
import { body } from 'express-validator';
import * as productController from '../controllers/product.controller.js';
import { protect, isVendor, isAdmin, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Validation rules
const productValidation = [
  body('name').notEmpty().withMessage('Le nom du produit est requis'),
  body('price').isFloat({ min: 0 }).withMessage('Prix invalide'),
  body('category_id').notEmpty().withMessage('Catégorie requise')
];

// Public routes
router.get('/', optionalAuth, productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/search', productController.searchProducts);
router.get('/category/:slug', productController.getProductsByCategory);
router.get('/:slug/related', productController.getRelatedProducts);
router.get('/:slug/frequently-bought', productController.getFrequentlyBought);
router.get('/:slug', optionalAuth, productController.getProductBySlug);

// Protected routes (vendor)
router.post('/', protect, isVendor, productValidation, productController.createProduct);
router.put('/:id', protect, isVendor, productController.updateProduct);
router.delete('/:id', protect, isVendor, productController.deleteProduct);
router.post('/:id/files', protect, isVendor, productController.addProductFiles);
router.delete('/:id/files/:fileId', protect, isVendor, productController.removeProductFile);
router.post('/:id/previews', protect, isVendor, productController.addProductPreviews);
router.delete('/:id/previews/:previewId', protect, isVendor, productController.removeProductPreview);

// Admin routes
router.put('/:id/status', protect, isAdmin, productController.updateProductStatus);
router.get('/admin/pending', protect, isAdmin, productController.getPendingProducts);

export default router;
