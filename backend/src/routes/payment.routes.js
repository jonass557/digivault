import express from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Initialize payment (deposit)
router.post('/initialize', protect, paymentController.initializePayment);

// iKeePay routes
router.post('/ikeepay/webhook', paymentController.ikeepayWebhook);
router.get('/ikeepay/verify/:reference', paymentController.verifyIkeepayPayment);

// Check payment status (frontend polling)
router.get('/status/:order_number', protect, paymentController.checkPaymentStatus);

export default router;
