import { validationResult } from 'express-validator';
import slugify from 'slugify';
import { Product, Category, Vendor, ProductFile, ProductPreview, Review, User, OrderItem, ProductAffinity } from '../models/index.js';

// Get all products with filters
export const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      type,
      minPrice,
      maxPrice,
      sort = 'newest',
      vendor
    } = req.query;

    const skip = (page - 1) * limit;
    let query = { status: 'published' };

    // Category filter
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) {
        query.category_id = cat._id;
      }
    }

    if (type) {
      query.product_type = type;
    }

    if (minPrice) {
      query.$or = [
        { sale_price: { $gte: parseFloat(minPrice), $ne: null } },
        { sale_price: null, price: { $gte: parseFloat(minPrice) } }
      ];
    }

    if (maxPrice) {
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: [
            { sale_price: { $lte: parseFloat(maxPrice), $ne: null } },
            { sale_price: null, price: { $lte: parseFloat(maxPrice) } }
          ]}
        ];
        delete query.$or;
      } else {
        query.$or = [
          { sale_price: { $lte: parseFloat(maxPrice), $ne: null } },
          { sale_price: null, price: { $lte: parseFloat(maxPrice) } }
        ];
      }
    }

    // Vendor filter
    if (vendor) {
      const vendorDoc = await Vendor.findOne({ store_slug: vendor });
      if (vendorDoc) {
        query.vendor_id = vendorDoc._id;
      }
    }

    // Sort options
    let sortOption = { created_at: -1 };
    switch (sort) {
      case 'oldest':
        sortOption = { created_at: 1 };
        break;
      case 'price_asc':
        sortOption = { price: 1 };
        break;
      case 'price_desc':
        sortOption = { price: -1 };
        break;
      case 'popular':
        sortOption = { sales_count: -1 };
        break;
      case 'rating':
        sortOption = { rating: -1 };
        break;
    }

    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('category_id', 'name slug')
      .populate('vendor_id', 'store_name store_slug store_logo')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Transform for response
    const transformedProducts = products.map(p => ({
      ...p,
      id: p._id,
      category_name: p.category_id?.name,
      category_slug: p.category_id?.slug,
      store_name: p.vendor_id?.store_name,
      store_slug: p.vendor_id?.store_slug,
      store_logo: p.vendor_id?.store_logo
    }));

    res.json({
      products: transformedProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
  }
};

// Get featured products
export const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const products = await Product.find({ status: 'published', is_featured: true })
      .populate('category_id', 'name slug')
      .populate('vendor_id', 'store_name store_slug')
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    const transformedProducts = products.map(p => ({
      ...p,
      id: p._id,
      category_name: p.category_id?.name,
      category_slug: p.category_id?.slug,
      store_name: p.vendor_id?.store_name,
      store_slug: p.vendor_id?.store_slug
    }));

    res.json(transformedProducts);
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Search products
export const searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;

    if (!q || q.trim().length < 2) {
      return res.json({ products: [], pagination: { total: 0, page: 1, limit, pages: 0 } });
    }

    const searchRegex = new RegExp(q, 'i');
    const query = {
      status: 'published',
      $or: [
        { name: searchRegex },
        { short_description: searchRegex },
        { description: searchRegex }
      ]
    };

    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('category_id', 'name slug')
      .populate('vendor_id', 'store_name store_slug')
      .sort({ sales_count: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const transformedProducts = products.map(p => ({
      ...p,
      id: p._id,
      category_name: p.category_id?.name,
      category_slug: p.category_id?.slug,
      store_name: p.vendor_id?.store_name,
      store_slug: p.vendor_id?.store_slug
    }));

    res.json({
      products: transformedProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
};

// Get products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;

    // Get category
    const category = await Category.findOne({ slug });
    if (!category) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Get subcategories
    const subcategories = await Category.find({ parent_id: category._id }).select('_id');
    const categoryIds = [category._id, ...subcategories.map(s => s._id)];

    const total = await Product.countDocuments({ status: 'published', category_id: { $in: categoryIds } });

    const products = await Product.find({ status: 'published', category_id: { $in: categoryIds } })
      .populate('category_id', 'name slug')
      .populate('vendor_id', 'store_name store_slug')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const transformedProducts = products.map(p => ({
      ...p,
      id: p._id,
      category_name: p.category_id?.name,
      category_slug: p.category_id?.slug,
      store_name: p.vendor_id?.store_name,
      store_slug: p.vendor_id?.store_slug
    }));

    res.json({
      category,
      products: transformedProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Get product by slug
export const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await Product.findOne({ slug })
      .populate('category_id', 'name slug')
      .populate({
        path: 'vendor_id',
        select: 'store_name store_slug store_logo store_description rating user_id',
        populate: { path: 'user_id', select: 'first_name' }
      })
      .lean();

    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Check if published or owner/admin
    if (product.status !== 'published') {
      if (!req.user || (req.user.role !== 'admin' && req.vendor?._id?.toString() !== product.vendor_id?._id?.toString())) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }
    }

    // Get product files (only metadata, not URLs)
    const files = await ProductFile.find({ product_id: product._id })
      .select('file_name file_size file_type is_main')
      .sort({ sort_order: 1 });

    // Get previews
    const previews = await ProductPreview.find({ product_id: product._id })
      .sort({ sort_order: 1 });

    // Get reviews
    const reviews = await Review.find({ product_id: product._id, is_visible: true })
      .populate('user_id', 'first_name last_name avatar')
      .sort({ created_at: -1 })
      .limit(10)
      .lean();

    const transformedReviews = reviews.map(r => ({
      ...r,
      id: r._id,
      first_name: r.user_id?.first_name,
      last_name: r.user_id?.last_name,
      avatar: r.user_id?.avatar
    }));

    // Increment view count
    await Product.findByIdAndUpdate(product._id, { $inc: { view_count: 1 } });

    res.json({
      ...product,
      id: product._id,
      category_name: product.category_id?.name,
      category_slug: product.category_id?.slug,
      store_name: product.vendor_id?.store_name,
      store_slug: product.vendor_id?.store_slug,
      store_logo: product.vendor_id?.store_logo,
      store_description: product.vendor_id?.store_description,
      vendor_rating: product.vendor_id?.rating,
      vendor_first_name: product.vendor_id?.user_id?.first_name,
      files,
      previews,
      reviews: transformedReviews
    });
  } catch (error) {
    console.error('Get product by slug error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Create product
export const createProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, short_description, description, price, sale_price,
      category_id, product_type, file_format, file_size,
      thumbnail, preview_url, tags, meta_title, meta_description
    } = req.body;

    // Generate unique slug
    let slug = slugify(name, { lower: true, strict: true });
    const existing = await Product.findOne({ slug: new RegExp(`^${slug}`) });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const product = await Product.create({
      vendor_id: req.vendor._id,
      category_id,
      name,
      slug,
      short_description,
      description,
      price,
      sale_price: sale_price || null,
      product_type: product_type || 'other',
      file_format,
      file_size,
      thumbnail,
      preview_url,
      tags: tags || [],
      meta_title: meta_title || name,
      meta_description: meta_description || short_description,
      status: 'pending'
    });

    // Update vendor product count
    await Vendor.findByIdAndUpdate(req.vendor._id, { $inc: { total_products: 1 } });

    res.status(201).json({
      message: 'Produit créé avec succès. En attente de validation.',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Erreur lors de la création du produit' });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check ownership
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    if (product.vendor_id.toString() !== req.vendor._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Build update object
    const allowedFields = [
      'name', 'short_description', 'description', 'price', 'sale_price',
      'category_id', 'product_type', 'file_format', 'file_size',
      'thumbnail', 'preview_url', 'tags', 'meta_title', 'meta_description'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Aucune modification fournie' });
    }

    // If name changed, update slug
    if (updates.name && updates.name !== product.name) {
      let slug = slugify(updates.name, { lower: true, strict: true });
      const existing = await Product.findOne({ slug, _id: { $ne: id } });
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }
      updateData.slug = slug;
    }

    // Reset to pending if product was published (requires re-approval)
    if (product.status === 'published') {
      updateData.status = 'pending';
    }

    const updated = await Product.findByIdAndUpdate(id, updateData, { new: true });

    res.json({
      message: 'Produit mis à jour avec succès',
      product: updated
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du produit' });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    if (product.vendor_id.toString() !== req.vendor._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Check if product has sales
    const salesCount = await OrderItem.countDocuments({ product_id: id });

    if (salesCount > 0) {
      // Archive instead of delete
      await Product.findByIdAndUpdate(id, { status: 'archived' });
      return res.json({ message: 'Produit archivé (des ventes existent)' });
    }

    // Delete product files and previews
    await ProductFile.deleteMany({ product_id: id });
    await ProductPreview.deleteMany({ product_id: id });
    await Product.findByIdAndDelete(id);

    // Update vendor product count
    await Vendor.findByIdAndUpdate(product.vendor_id, { $inc: { total_products: -1 } });

    res.json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du produit' });
  }
};

// Add product files
export const addProductFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const { files } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    if (product.vendor_id.toString() !== req.vendor._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const fileDocs = files.map(file => ({
      product_id: id,
      file_name: file.file_name,
      file_path: file.file_path,
      file_size: file.file_size,
      file_type: file.file_type,
      cloudinary_id: file.cloudinary_id,
      is_main: file.is_main || false,
      sort_order: file.sort_order || 0
    }));

    await ProductFile.insertMany(fileDocs);

    const updatedFiles = await ProductFile.find({ product_id: id });

    res.json({
      message: 'Fichiers ajoutés avec succès',
      files: updatedFiles
    });
  } catch (error) {
    console.error('Add product files error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout des fichiers' });
  }
};

// Remove product file
export const removeProductFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    if (product.vendor_id.toString() !== req.vendor._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await ProductFile.findOneAndDelete({ _id: fileId, product_id: id });

    res.json({ message: 'Fichier supprimé avec succès' });
  } catch (error) {
    console.error('Remove product file error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du fichier' });
  }
};

// Add product previews
export const addProductPreviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { previews } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    if (product.vendor_id.toString() !== req.vendor._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    if (!previews || !Array.isArray(previews) || previews.length === 0) {
      return res.status(400).json({ error: 'Aucun preview fourni' });
    }

    const previewDocs = previews.map(preview => ({
      product_id: id,
      type: preview.type || 'image',
      url: preview.url,
      cloudinary_id: preview.cloudinary_id,
      is_watermarked: preview.is_watermarked || false,
      sort_order: preview.sort_order || 0
    }));

    await ProductPreview.insertMany(previewDocs);

    const updatedPreviews = await ProductPreview.find({ product_id: id });

    res.json({
      message: 'Previews ajoutés avec succès',
      previews: updatedPreviews
    });
  } catch (error) {
    console.error('Add product previews error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout des previews' });
  }
};

// Remove product preview
export const removeProductPreview = async (req, res) => {
  try {
    const { id, previewId } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    if (product.vendor_id.toString() !== req.vendor._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await ProductPreview.findOneAndDelete({ _id: previewId, product_id: id });

    res.json({ message: 'Preview supprimé avec succès' });
  } catch (error) {
    console.error('Remove product preview error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du preview' });
  }
};

// Update product status (admin)
export const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    const validStatuses = ['pending', 'published', 'rejected', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    await Product.findByIdAndUpdate(id, {
      status,
      rejection_reason: status === 'rejected' ? rejection_reason : null
    });

    res.json({ message: 'Statut mis à jour avec succès' });
  } catch (error) {
    console.error('Update product status error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Get pending products (admin)
export const getPendingProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const total = await Product.countDocuments({ status: 'pending' });

    const products = await Product.find({ status: 'pending' })
      .populate('category_id', 'name')
      .populate('vendor_id', 'store_name')
      .sort({ created_at: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const transformedProducts = products.map(p => ({
      ...p,
      id: p._id,
      category_name: p.category_id?.name,
      store_name: p.vendor_id?.store_name
    }));

    res.json({
      products: transformedProducts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get pending products error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Get related products (same category) — GET /api/products/:slug/related
export const getRelatedProducts = async (req, res) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 8;

    const product = await Product.findOne({ slug }).select('_id category_id').lean();
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const products = await Product.find({
      status: 'published',
      category_id: product.category_id,
      _id: { $ne: product._id }
    })
      .populate('vendor_id', 'store_name store_slug')
      .sort({ sales_count: -1, rating: -1 })
      .limit(limit)
      .lean();

    res.json(products.map((p) => ({
      ...p,
      id: p._id,
      store_name: p.vendor_id?.store_name,
      store_slug: p.vendor_id?.store_slug
    })));
  } catch (error) {
    console.error('Get related products error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Get "frequently bought together" — GET /api/products/:slug/frequently-bought
export const getFrequentlyBought = async (req, res) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 4;

    const product = await Product.findOne({ slug }).select('_id').lean();
    if (!product) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    // Paires contenant ce produit, triées par co-achats décroissants.
    const pairs = await ProductAffinity.find({
      $or: [{ product_a: product._id }, { product_b: product._id }]
    })
      .sort({ count: -1 })
      .limit(limit * 3)
      .lean();

    // Identifie "l'autre" produit de chaque paire.
    const others = pairs.map((p) =>
      p.product_a.toString() === product._id.toString() ? p.product_b : p.product_a
    );
    const countByOther = new Map();
    pairs.forEach((p, i) => countByOther.set(others[i].toString(), p.count));

    const products = await Product.find({ _id: { $in: others }, status: 'published' })
      .populate('vendor_id', 'store_name store_slug')
      .lean();

    // Conserve l'ordre par co-achats et applique la limite finale.
    const result = products
      .map((p) => ({
        ...p,
        id: p._id,
        store_name: p.vendor_id?.store_name,
        store_slug: p.vendor_id?.store_slug,
        bought_together_count: countByOther.get(p._id.toString()) || 0
      }))
      .sort((a, b) => b.bought_together_count - a.bought_together_count)
      .slice(0, limit);

    res.json(result);
  } catch (error) {
    console.error('Get frequently bought error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
