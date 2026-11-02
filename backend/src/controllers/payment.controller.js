import ikeepay from '../config/ikeepay.js';
import { Product, Vendor, Order, OrderItem, Commission, User, Coupon, CouponRedemption, Bundle, ProductAffinity } from '../models/index.js';
import { generateOrderNumber, generateDownloadToken } from '../utils/token.utils.js';
import { sendOrderConfirmationEmail, sendNewSaleEmail } from '../utils/email.utils.js';
import { effectivePrice, distributeProrata } from '../utils/pricing.utils.js';
import { evaluateCoupon } from './coupon.controller.js';
import { createNotification } from '../utils/notification.utils.js';

// Initialize payment (deposit) via iKeePay
export const initializePayment = async (req, res) => {
  try {
    const { items, payment_method, phone, operator, country, coupon_code, bundle_id, otp } = req.body;

    const now = new Date();

    // ── Résolution des lignes : achat d'un pack (bundle_id) OU de produits ────
    let bundle = null;
    let productIds;

    if (bundle_id) {
      bundle = await Bundle.findOne({ _id: bundle_id, status: 'published' }).lean();
      if (!bundle) {
        return res.status(400).json({ error: 'Pack non disponible' });
      }
      productIds = bundle.product_ids.map(id => id.toString());
    } else {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Aucun produit sélectionné' });
      }
      productIds = items.map(i => i.product_id);
    }

    // Get product details
    const products = await Product.find({ _id: { $in: productIds }, status: 'published' })
      .populate('vendor_id')
      .lean();

    if (products.length !== productIds.length) {
      return res.status(400).json({ error: 'Certains produits ne sont pas disponibles' });
    }

    // Check if user already owns any of these products
    const userOrders = await Order.find({ user_id: req.user.id, payment_status: 'completed' });
    const orderIds = userOrders.map(o => o._id);
    const existingPurchases = await OrderItem.find({
      order_id: { $in: orderIds },
      product_id: { $in: productIds }
    });

    if (existingPurchases.length > 0) {
      const ownedIds = existingPurchases.map(p => p.product_id);
      return res.status(400).json({
        error: 'Vous possédez déjà certains de ces produits',
        owned_products: ownedIds
      });
    }

    // ── Chiffrage (prix effectif = tient compte des ventes flash) ─────────────
    // La commission est prélevée au RETRAIT, pas à la vente : le vendeur
    // accumule 100 % du montant net de sa ligne (commission_amount = 0).
    const orderItems = products.map(product => {
      const price = effectivePrice(product, now);
      return {
        product_id: product._id,
        vendor_id: product.vendor_id._id,
        category_id: product.category_id,
        product_name: product.name,
        price,
        discount_amount: 0,
        discount_source: null,
        vendor_amount: price
      };
    });

    // ── Cas pack : le prix du pack remplace la somme, réparti au prorata ──────
    if (bundle) {
      const shares = distributeProrata(bundle.bundle_price, orderItems.map(i => i.price));
      orderItems.forEach((item, idx) => {
        const share = shares[idx];
        item.discount_amount = item.price - share; // remise implicite du pack
        item.discount_source = 'bundle';
        item.price = share;         // prix de la ligne = part du pack
        item.vendor_amount = share; // le vendeur absorbe la remise pack
      });
    }

    let totalAmount = orderItems.reduce((sum, i) => sum + i.price, 0);

    // ── Coupon : validé ET chiffré côté serveur (le client ne décide rien) ────
    let appliedCoupon = null;
    let couponDiscount = 0;
    if (coupon_code) {
      const coupon = await Coupon.findOne({ code: coupon_code.toUpperCase().trim() });
      const evaluation = coupon
        ? await evaluateCoupon({
            coupon,
            pricedItems: orderItems.map(i => ({
              product_id: i.product_id,
              vendor_id: i.vendor_id,
              category_id: i.category_id,
              price: i.price
            })),
            userId: req.user.id,
            now
          })
        : { valid: false, reason: 'Coupon introuvable' };

      if (!evaluation.valid) {
        return res.status(400).json({ error: evaluation.reason || 'Coupon invalide' });
      }

      appliedCoupon = coupon;
      couponDiscount = evaluation.discount_amount;

      // Répartit la remise sur les seuls items éligibles, au prorata du prix.
      const applicableSet = new Set(evaluation.applies_to);
      const applicableIdx = orderItems
        .map((i, idx) => (applicableSet.has(i.product_id.toString()) ? idx : -1))
        .filter(idx => idx >= 0);
      const shares = distributeProrata(couponDiscount, applicableIdx.map(idx => orderItems[idx].price));

      applicableIdx.forEach((idx, k) => {
        const d = shares[k];
        const item = orderItems[idx];
        item.discount_amount += d;
        if (evaluation.source === 'vendor') {
          // Coupon vendeur : remise retenue sur la part vendeur.
          item.vendor_amount = Math.max(0, item.vendor_amount - d);
          if (!item.discount_source) item.discount_source = 'vendor';
        } else if (!item.discount_source) {
          // Coupon admin : la plateforme absorbe ; part vendeur inchangée.
          item.discount_source = 'platform';
        }
      });

      totalAmount = Math.max(0, totalAmount - couponDiscount);
    }

    // Create order
    const orderNumber = generateOrderNumber();
    const resolvedCountry = (country || 'CI').toUpperCase();
    const currency = ikeepay.currencyForCountry(resolvedCountry);

    const order = await Order.create({
      order_number: orderNumber,
      user_id: req.user.id,
      total_amount: totalAmount,
      commission_amount: 0,
      vendor_amount: orderItems.reduce((sum, i) => sum + i.vendor_amount, 0),
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      discount_amount: couponDiscount,
      bundle_id: bundle ? bundle._id : null,
      payment_method: payment_method === 'card' ? 'card' : 'mobile_money',
      customer_email: req.user.email,
      customer_phone: phone || null,
      currency
    });

    // Create order items
    for (const item of orderItems) {
      await OrderItem.create({
        order_id: order._id,
        product_id: item.product_id,
        vendor_id: item.vendor_id,
        product_name: item.product_name,
        price: item.price,
        commission_amount: 0,
        vendor_amount: item.vendor_amount,
        discount_amount: item.discount_amount,
        discount_source: item.discount_source,
        max_downloads: parseInt(process.env.MAX_DOWNLOAD_ATTEMPTS) || 5
      });
    }

    // Initialize iKeePay collection (H2H)
    let collect;
    try {
      collect = await ikeepay.createCollect({
        amount: totalAmount,
        currency,
        operator: payment_method === 'card' ? undefined : operator,
        country: resolvedCountry,
        phone_no: phone || undefined,
        external_reference: orderNumber,
        customer_email: req.user.email,
        otp: otp || undefined,
        description: `Commande ${orderNumber} - DigiVault`
      });
    } catch (gatewayError) {
      await Order.findByIdAndUpdate(order._id, { payment_status: 'failed', status: 'cancelled' });
      return res.status(400).json({
        error: "Erreur lors de l'initialisation du paiement",
        details: gatewayError.message
      });
    }

    // Update order with payment reference
    await Order.findByIdAndUpdate(order._id, {
      payment_reference: collect.reference,
      status: 'processing'
    });

    res.json({
      success: true,
      order_number: orderNumber,
      payment_url: collect.payment_link,
      payment_reference: collect.reference
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({ error: "Erreur lors de l'initialisation du paiement" });
  }
};

// iKeePay webhook (notification H2H)
export const ikeepayWebhook = async (req, res) => {
  try {
    const signature =
      req.headers['x-ikeepay-signature'] ||
      req.headers['x-signature'] ||
      req.headers['ikeepay-signature'];

    // Vérifie la signature HMAC SHA-256 si un secret est configuré.
    const sigValid = await ikeepay.verifyWebhookSignature(req.body, signature);
    if (sigValid === false) {
      return res.status(401).json({ error: 'Signature invalide' });
    }

    const payloadData = req.body.data || req.body;
    const reference =
      payloadData.external_reference ||
      payloadData.reference ||
      payloadData.provider_reference ||
      payloadData.transaction_id ||
      payloadData.order_number ||
      req.body.external_reference;

    if (!reference) {
      return res.status(400).json({ error: 'Référence manquante' });
    }

    // Gestion cas notification retrait (payout)
    if (payloadData.type === 'payout' || req.body.event === 'payout.updated') {
      return res.json({ status: 'OK', type: 'payout_received' });
    }

    const order = await Order.findOne({
      $or: [{ order_number: reference }, { payment_reference: reference }]
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Re-vérification systématique du statut auprès de l'API iKeePay (H2H verify)
    const verification = await ikeepay.verifyTransaction(order.payment_reference || reference);

    if (verification.status === 'SUCCESS' && order.payment_status !== 'completed') {
      await processSuccessfulPayment(order, order.payment_method);
    } else if (verification.status === 'FAILED') {
      await Order.findByIdAndUpdate(order._id, { payment_status: 'failed', status: 'cancelled' });
    }

    res.json({ status: 'OK', received: true });
  } catch (error) {
    console.error('iKeePay webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Verify iKeePay payment
export const verifyIkeepayPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const order = await Order.findOne({
      $or: [{ order_number: reference }, { payment_reference: reference }]
    });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const verification = await ikeepay.verifyTransaction(order.payment_reference || reference);

    if (verification.status === 'SUCCESS' && order.payment_status !== 'completed') {
      await processSuccessfulPayment(order, order.payment_method);
    } else if (verification.status === 'FAILED' && order.payment_status !== 'completed') {
      await Order.findByIdAndUpdate(order._id, { payment_status: 'failed', status: 'cancelled' });
    }

    const updated = await Order.findById(order._id).lean();
    res.json({
      status: verification.status,
      order_number: order.order_number,
      payment_status: updated.payment_status
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification du paiement' });
  }
};

// Check payment status (for the frontend success page polling)
export const checkPaymentStatus = async (req, res) => {
  try {
    const { order_number } = req.params;

    const order = await Order.findOne({ order_number, user_id: req.user.id });

    if (!order) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // If not yet completed, re-check with iKeePay.
    if (order.payment_status === 'pending' || order.payment_status === 'processing') {
      try {
        const verification = await ikeepay.verifyTransaction(order.payment_reference || order_number);
        if (verification.status === 'SUCCESS' && order.payment_status !== 'completed') {
          await processSuccessfulPayment(order, order.payment_method);
          order.payment_status = 'completed';
        } else if (verification.status === 'FAILED') {
          await Order.findByIdAndUpdate(order._id, { payment_status: 'failed', status: 'cancelled' });
          order.payment_status = 'failed';
        }
      } catch (e) {
        // Ignore verification errors during polling.
      }
    }

    res.json({
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      total_amount: order.total_amount
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Process successful payment
async function processSuccessfulPayment(order, paymentMethod) {
  try {
    // Update order
    await Order.findByIdAndUpdate(order._id, {
      payment_status: 'completed',
      status: 'completed',
      transaction_id: paymentMethod
    });

    // Get order items
    const items = await OrderItem.find({ order_id: order._id });

    const downloadExpires = new Date();
    downloadExpires.setMinutes(downloadExpires.getMinutes() + (parseInt(process.env.DOWNLOAD_LINK_EXPIRE_MINUTES) || 60));

    for (const item of items) {
      // Generate download token
      const downloadToken = generateDownloadToken(item._id, item.product_id, order.user_id);

      // Update order item
      await OrderItem.findByIdAndUpdate(item._id, {
        download_token: downloadToken,
        download_expires: downloadExpires
      });

      // Create commission record.
      // La commission plateforme est retenue au retrait : ici le vendeur
      // crédite 100 % du prix (commission_amount = 0).
      await Commission.create({
        order_id: order._id,
        order_item_id: item._id,
        vendor_id: item.vendor_id,
        total_amount: item.price,
        commission_rate: 0,
        commission_amount: 0,
        vendor_amount: item.vendor_amount,
        status: 'available',
        available_at: new Date()
      });

      // Update product sales count
      await Product.findByIdAndUpdate(item.product_id, { $inc: { sales_count: 1 } });

      // Update vendor total sales
      await Vendor.findByIdAndUpdate(item.vendor_id, { $inc: { total_sales: item.vendor_amount } });

      // Get vendor email for notification
      const vendor = await Vendor.findById(item.vendor_id).populate('user_id', 'email');
      if (vendor) {
        sendNewSaleEmail(vendor, order, item);
      }
    }

    // Create notification for user
    await createNotification({
      user_id: order.user_id,
      type: 'order',
      title: 'Commande confirmée',
      message: `Votre commande ${order.order_number} a été confirmée. Téléchargez vos fichiers maintenant !`,
      link: '/account/downloads'
    });

    // ── Coupon : consommer (enregistrer la redemption + incrémenter le compteur) ─
    if (order.coupon_code && order.discount_amount > 0) {
      const coupon = await Coupon.findOne({ code: order.coupon_code });
      if (coupon) {
        const already = await CouponRedemption.findOne({ coupon_id: coupon._id, order_id: order._id });
        if (!already) {
          await CouponRedemption.create({
            coupon_id: coupon._id,
            user_id: order.user_id,
            order_id: order._id,
            code: coupon.code,
            amount_discounted: order.discount_amount
          });
          await Coupon.findByIdAndUpdate(coupon._id, { $inc: { used_count: 1 } });
        }
      }
    }

    // ── Bundle : incrémenter le compteur de ventes du pack ────────────────────
    if (order.bundle_id) {
      await Bundle.findByIdAndUpdate(order.bundle_id, { $inc: { sales_count: 1 } });
    }

    // ── Affinité produits : +1 pour chaque paire co-achetée ("achetés ensemble")
    const productIdList = items.map(i => i.product_id.toString());
    for (let a = 0; a < productIdList.length; a++) {
      for (let b = a + 1; b < productIdList.length; b++) {
        // Paire ordonnée stable (product_a < product_b) pour éviter les doublons.
        const [pa, pb] = [productIdList[a], productIdList[b]].sort();
        await ProductAffinity.updateOne(
          { product_a: pa, product_b: pb },
          { $inc: { count: 1 } },
          { upsert: true }
        );
      }
    }

    // Send confirmation email
    const user = await User.findById(order.user_id);
    if (user) {
      sendOrderConfirmationEmail(user, order, items);
    }
  } catch (error) {
    console.error('Process payment error:', error);
    throw error;
  }
}
