import slugify from 'slugify';
import { Bundle, Product, Vendor } from '../models/index.js';
import { effectivePrice } from '../utils/pricing.utils.js';

// Enrichit un bundle avec ses produits + le prix de comparaison (somme des
// prix effectifs) et l'économie réalisée.
const decorateBundle = async (bundle, now = new Date()) => {
  const products = await Product.find({ _id: { $in: bundle.product_ids } })
    .select('name slug thumbnail price sale_price sale_starts_at sale_ends_at status')
    .lean();

  const compareAtPrice = products.reduce((sum, p) => sum + effectivePrice(p, now), 0);
  const savings = Math.max(0, compareAtPrice - bundle.bundle_price);

  return {
    ...bundle,
    id: bundle._id,
    products: products.map((p) => ({ ...p, id: p._id })),
    product_count: products.length,
    compare_at_price: compareAtPrice,
    savings,
    savings_percent: compareAtPrice > 0 ? Math.round((savings / compareAtPrice) * 100) : 0
  };
};

// ─── Public ──────────────────────────────────────────────────────────────────

// GET /api/bundles — packs publiés
export const getPublishedBundles = async (req, res) => {
  try {
    const { vendor, limit = 20 } = req.query;
    const query = { status: 'published' };

    if (vendor) {
      const vendorDoc = await Vendor.findOne({ store_slug: vendor });
      if (vendorDoc) query.vendor_id = vendorDoc._id;
    }

    const bundles = await Bundle.find(query)
      .populate('vendor_id', 'store_name store_slug')
      .sort({ sales_count: -1, created_at: -1 })
      .limit(parseInt(limit))
      .lean();

    const decorated = await Promise.all(bundles.map((b) => decorateBundle(b)));
    res.json(decorated.map((b) => ({
      ...b,
      store_name: b.vendor_id?.store_name,
      store_slug: b.vendor_id?.store_slug
    })));
  } catch (error) {
    console.error('Get published bundles error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// GET /api/bundles/:slug — détail public d'un pack
export const getBundleBySlug = async (req, res) => {
  try {
    const bundle = await Bundle.findOne({ slug: req.params.slug })
      .populate('vendor_id', 'store_name store_slug store_logo')
      .lean();

    if (!bundle || bundle.status !== 'published') {
      return res.status(404).json({ error: 'Pack non trouvé' });
    }

    const decorated = await decorateBundle(bundle);
    res.json({
      ...decorated,
      store_name: bundle.vendor_id?.store_name,
      store_slug: bundle.vendor_id?.store_slug,
      store_logo: bundle.vendor_id?.store_logo
    });
  } catch (error) {
    console.error('Get bundle by slug error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// GET /api/bundles/for-product/:productId — packs publiés contenant ce produit
export const getBundlesForProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const bundles = await Bundle.find({ status: 'published', product_ids: productId })
      .populate('vendor_id', 'store_name store_slug')
      .limit(5)
      .lean();

    const decorated = await Promise.all(bundles.map((b) => decorateBundle(b)));
    res.json(decorated.map((b) => ({
      ...b,
      store_name: b.vendor_id?.store_name,
      store_slug: b.vendor_id?.store_slug
    })));
  } catch (error) {
    console.error('Get bundles for product error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ─── Vendeur ─────────────────────────────────────────────────────────────────

// Vérifie que tous les produits appartiennent au vendeur et sont ≥ 2.
const validateBundleProducts = async (productIds, vendorId) => {
  if (!Array.isArray(productIds) || productIds.length < 2) {
    return { ok: false, error: 'Un pack doit contenir au moins 2 produits' };
  }
  const products = await Product.find({ _id: { $in: productIds }, vendor_id: vendorId });
  if (products.length !== productIds.length) {
    return { ok: false, error: 'Tous les produits doivent vous appartenir' };
  }
  return { ok: true, products };
};

// POST /api/bundles  (isVendor)
export const createBundle = async (req, res) => {
  try {
    const { name, description, thumbnail, product_ids, bundle_price, status } = req.body;
    if (!name || bundle_price == null) {
      return res.status(400).json({ error: 'Nom et prix du pack requis' });
    }

    const check = await validateBundleProducts(product_ids, req.vendor._id);
    if (!check.ok) return res.status(400).json({ error: check.error });

    let slug = slugify(name, { lower: true, strict: true });
    const existing = await Bundle.findOne({ slug: new RegExp(`^${slug}`) });
    if (existing) slug = `${slug}-${Date.now()}`;

    const bundle = await Bundle.create({
      vendor_id: req.vendor._id,
      name,
      slug,
      description,
      thumbnail: thumbnail || check.products[0]?.thumbnail,
      product_ids,
      bundle_price,
      status: status === 'published' ? 'published' : 'draft'
    });

    res.status(201).json({ message: 'Pack créé avec succès', bundle });
  } catch (error) {
    console.error('Create bundle error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du pack' });
  }
};

// GET /api/bundles/mine  (isVendor)
export const getMyBundles = async (req, res) => {
  try {
    const bundles = await Bundle.find({ vendor_id: req.vendor._id })
      .sort({ created_at: -1 })
      .lean();
    const decorated = await Promise.all(bundles.map((b) => decorateBundle(b)));
    res.json(decorated);
  } catch (error) {
    console.error('Get my bundles error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// PUT /api/bundles/:id  (isVendor)
export const updateBundle = async (req, res) => {
  try {
    const { id } = req.params;
    const bundle = await Bundle.findById(id);
    if (!bundle) return res.status(404).json({ error: 'Pack non trouvé' });

    if (bundle.vendor_id.toString() !== req.vendor._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const { name, description, thumbnail, product_ids, bundle_price, status } = req.body;
    const updateData = {};

    if (product_ids) {
      const check = await validateBundleProducts(product_ids, bundle.vendor_id);
      if (!check.ok) return res.status(400).json({ error: check.error });
      updateData.product_ids = product_ids;
    }
    if (name && name !== bundle.name) {
      updateData.name = name;
      let slug = slugify(name, { lower: true, strict: true });
      const existing = await Bundle.findOne({ slug, _id: { $ne: id } });
      if (existing) slug = `${slug}-${Date.now()}`;
      updateData.slug = slug;
    }
    if (description !== undefined) updateData.description = description;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (bundle_price != null) updateData.bundle_price = bundle_price;
    if (status && ['draft', 'published', 'archived'].includes(status)) updateData.status = status;

    const updated = await Bundle.findByIdAndUpdate(id, updateData, { new: true });
    res.json({ message: 'Pack mis à jour', bundle: updated });
  } catch (error) {
    console.error('Update bundle error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

// DELETE /api/bundles/:id  (isVendor)
export const deleteBundle = async (req, res) => {
  try {
    const { id } = req.params;
    const bundle = await Bundle.findById(id);
    if (!bundle) return res.status(404).json({ error: 'Pack non trouvé' });

    if (bundle.vendor_id.toString() !== req.vendor._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await Bundle.findByIdAndDelete(id);
    res.json({ message: 'Pack supprimé' });
  } catch (error) {
    console.error('Delete bundle error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};

export default {
  getPublishedBundles,
  getBundleBySlug,
  getBundlesForProduct,
  createBundle,
  getMyBundles,
  updateBundle,
  deleteBundle
};
