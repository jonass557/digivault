import { Coupon, CouponRedemption, Product, Order } from '../models/index.js';
import { effectivePrice } from '../utils/pricing.utils.js';

// ─────────────────────────────────────────────────────────────────────────────
// Cœur : évaluation d'un coupon contre un panier déjà chiffré.
// Réutilisé par l'endpoint `validateCoupon` ET par le contrôleur de paiement,
// afin que la logique de réduction n'existe qu'à un seul endroit (source de vérité).
//
// pricedItems : [{ product_id, vendor_id, category_id, price }]  (price = prix effectif)
// Retourne : { valid, discount_amount, applies_to:[product_id], source, reason }
//   source ∈ 'vendor' | 'platform'  (déterminé par owner_type)
// ─────────────────────────────────────────────────────────────────────────────
export const evaluateCoupon = async ({ coupon, pricedItems, userId, now = new Date() }) => {
  const fail = (reason) => ({ valid: false, discount_amount: 0, applies_to: [], source: null, reason });

  if (!coupon) return fail('Coupon introuvable');
  if (!coupon.is_active) return fail('Ce coupon est désactivé');

  if (coupon.starts_at && now < new Date(coupon.starts_at)) return fail("Ce coupon n'est pas encore actif");
  if (coupon.expires_at && now > new Date(coupon.expires_at)) return fail('Ce coupon a expiré');

  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return fail("Ce coupon a atteint sa limite d'utilisation");
  }

  // Limite par utilisateur.
  if (userId && coupon.max_uses_per_user != null) {
    const usesByUser = await CouponRedemption.countDocuments({ coupon_id: coupon._id, user_id: userId });
    if (usesByUser >= coupon.max_uses_per_user) {
      return fail('Vous avez déjà utilisé ce coupon');
    }
  }

  // Réservé aux nouveaux clients.
  if (coupon.new_customers_only && userId) {
    const previousOrders = await Order.countDocuments({ user_id: userId, payment_status: 'completed' });
    if (previousOrders > 0) return fail('Coupon réservé aux nouveaux clients');
  }

  // Détermine les items éligibles selon la portée.
  const couponVendor = coupon.vendor_id?.toString();
  const productIdSet = new Set((coupon.product_ids || []).map((id) => id.toString()));
  const categoryIdSet = new Set((coupon.category_ids || []).map((id) => id.toString()));

  const applicable = pricedItems.filter((item) => {
    switch (coupon.scope) {
      case 'vendor':
        return item.vendor_id?.toString() === couponVendor;
      case 'product':
        return productIdSet.has(item.product_id.toString());
      case 'category':
        return item.category_id && categoryIdSet.has(item.category_id.toString());
      case 'all':
      default:
        // Un coupon vendeur reste borné aux produits de ce vendeur, même en scope 'all'.
        if (coupon.owner_type === 'vendor') {
          return item.vendor_id?.toString() === couponVendor;
        }
        return true;
    }
  });

  if (applicable.length === 0) return fail("Ce coupon ne s'applique à aucun produit du panier");

  // Le montant minimum de commande s'apprécie sur le total du panier.
  const orderSubtotal = pricedItems.reduce((sum, i) => sum + (i.price || 0), 0);
  if (coupon.min_order_amount && orderSubtotal < coupon.min_order_amount) {
    return fail(`Montant minimum de ${coupon.min_order_amount} non atteint`);
  }

  const applicableSubtotal = applicable.reduce((sum, i) => sum + (i.price || 0), 0);

  // Calcul de la réduction.
  let discount = coupon.discount_type === 'percentage'
    ? (applicableSubtotal * coupon.discount_value) / 100
    : coupon.discount_value;

  // Plafond éventuel, et jamais plus que le sous-total éligible.
  if (coupon.max_discount_amount) discount = Math.min(discount, coupon.max_discount_amount);
  discount = Math.min(discount, applicableSubtotal);
  discount = Math.round(discount); // FCFA : pas de centimes.

  if (discount <= 0) return fail('Réduction nulle');

  return {
    valid: true,
    discount_amount: discount,
    applies_to: applicable.map((i) => i.product_id.toString()),
    source: coupon.owner_type === 'vendor' ? 'vendor' : 'platform',
    reason: null
  };
};

// Construit un tableau `pricedItems` à partir d'une liste de product_id.
// Renvoie null si un produit est indisponible.
const buildPricedItems = async (productIds, now = new Date()) => {
  const products = await Product.find({ _id: { $in: productIds }, status: 'published' }).lean();
  if (products.length !== productIds.length) return null;
  return products.map((p) => ({
    product_id: p._id,
    vendor_id: p.vendor_id,
    category_id: p.category_id,
    price: effectivePrice(p, now)
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/coupons/validate  (protect)  — vérifie sans consommer
// body: { code, items: [product_id] }
// ─────────────────────────────────────────────────────────────────────────────
export const validateCoupon = async (req, res) => {
  try {
    const { code, items } = req.body;
    if (!code || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Code et articles requis' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
    if (!coupon) {
      return res.status(404).json({ valid: false, error: 'Coupon introuvable' });
    }

    const pricedItems = await buildPricedItems(items);
    if (!pricedItems) {
      return res.status(400).json({ valid: false, error: 'Certains produits ne sont pas disponibles' });
    }

    const result = await evaluateCoupon({ coupon, pricedItems, userId: req.user.id });

    if (!result.valid) {
      return res.status(200).json({ valid: false, error: result.reason });
    }

    res.json({
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: result.discount_amount,
      applies_to: result.applies_to
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ error: 'Erreur lors de la validation du coupon' });
  }
};

// ─── CRUD helpers ────────────────────────────────────────────────────────────

const buildCouponPayload = (body, { owner_type, vendor_id }) => {
  const payload = {
    owner_type,
    vendor_id: owner_type === 'vendor' ? vendor_id : null,
    description: body.description,
    discount_type: body.discount_type,
    discount_value: body.discount_value,
    scope: body.scope || 'all',
    product_ids: body.product_ids || [],
    category_ids: body.category_ids || [],
    min_order_amount: body.min_order_amount || 0,
    max_discount_amount: body.max_discount_amount || null,
    max_uses: body.max_uses ?? null,
    max_uses_per_user: body.max_uses_per_user ?? null,
    starts_at: body.starts_at || null,
    expires_at: body.expires_at || null,
    new_customers_only: !!body.new_customers_only,
    subscribers_only: !!body.subscribers_only,
    is_active: body.is_active !== undefined ? !!body.is_active : true
  };
  return payload;
};

// ─── Vendeur ─────────────────────────────────────────────────────────────────

// POST /api/coupons  (isVendor)
export const createCoupon = async (req, res) => {
  try {
    const { code, discount_type, discount_value } = req.body;
    if (!code || !discount_type || discount_value == null) {
      return res.status(400).json({ error: 'Code, type et valeur de réduction requis' });
    }

    const normalizedCode = code.toUpperCase().trim();
    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(400).json({ error: 'Ce code de coupon existe déjà' });
    }

    // Un vendeur ne peut créer que des coupons bornés à sa propre boutique.
    const payload = buildCouponPayload(req.body, { owner_type: 'vendor', vendor_id: req.vendor._id });
    payload.code = normalizedCode;
    if (payload.scope === 'all') payload.scope = 'vendor';

    const coupon = await Coupon.create(payload);
    res.status(201).json({ message: 'Coupon créé avec succès', coupon });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du coupon' });
  }
};

// GET /api/coupons/my-coupons  (isVendor)
export const getMyCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ vendor_id: req.vendor._id, owner_type: 'vendor' })
      .sort({ created_at: -1 })
      .lean();
    res.json(coupons.map((c) => ({ ...c, id: c._id })));
  } catch (error) {
    console.error('Get my coupons error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// PUT /api/coupons/:id  (isVendor — borné à ses coupons)
export const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) return res.status(404).json({ error: 'Coupon non trouvé' });

    const isOwnerVendor = coupon.owner_type === 'vendor' &&
      coupon.vendor_id?.toString() === req.vendor?._id?.toString();
    if (!isOwnerVendor && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const payload = buildCouponPayload(req.body, {
      owner_type: coupon.owner_type,
      vendor_id: coupon.vendor_id
    });
    // On ne renomme pas le code via update (évite les collisions/refs).
    delete payload.code;

    const updated = await Coupon.findByIdAndUpdate(id, payload, { new: true });
    res.json({ message: 'Coupon mis à jour', coupon: updated });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

// DELETE /api/coupons/:id  (isVendor — borné à ses coupons)
export const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) return res.status(404).json({ error: 'Coupon non trouvé' });

    const isOwnerVendor = coupon.owner_type === 'vendor' &&
      coupon.vendor_id?.toString() === req.vendor?._id?.toString();
    if (!isOwnerVendor && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await Coupon.findByIdAndDelete(id);
    res.json({ message: 'Coupon supprimé' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

// ─── Admin ───────────────────────────────────────────────────────────────────

// POST /api/coupons/admin  (isAdmin)
export const createAdminCoupon = async (req, res) => {
  try {
    const { code, discount_type, discount_value } = req.body;
    if (!code || !discount_type || discount_value == null) {
      return res.status(400).json({ error: 'Code, type et valeur de réduction requis' });
    }

    const normalizedCode = code.toUpperCase().trim();
    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(400).json({ error: 'Ce code de coupon existe déjà' });
    }

    const payload = buildCouponPayload(req.body, { owner_type: 'admin', vendor_id: null });
    payload.code = normalizedCode;

    const coupon = await Coupon.create(payload);
    res.status(201).json({ message: 'Coupon créé avec succès', coupon });
  } catch (error) {
    console.error('Create admin coupon error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du coupon' });
  }
};

// GET /api/coupons/admin  (isAdmin) — tous les coupons
export const getAllCoupons = async (req, res) => {
  try {
    const { owner_type } = req.query;
    const query = owner_type ? { owner_type } : {};
    const coupons = await Coupon.find(query)
      .populate('vendor_id', 'store_name store_slug')
      .sort({ created_at: -1 })
      .lean();
    res.json(coupons.map((c) => ({ ...c, id: c._id, store_name: c.vendor_id?.store_name })));
  } catch (error) {
    console.error('Get all coupons error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export default {
  evaluateCoupon,
  validateCoupon,
  createCoupon,
  getMyCoupons,
  updateCoupon,
  deleteCoupon,
  createAdminCoupon,
  getAllCoupons
};
