import { User, Vendor, SellerRequest, Product, Order, Withdrawal, OrderItem, Setting, Category } from '../models/index.js';

// Get dashboard stats
export const getDashboardStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total users
    const usersCount = await User.countDocuments();

    // Total vendors
    const vendorsCount = await Vendor.countDocuments({ status: 'approved' });

    // Pending vendor requests
    const pendingVendorsCount = await SellerRequest.countDocuments({ status: 'pending' });

    // Total products
    const productsCount = await Product.countDocuments({ status: 'published' });

    // Pending products
    const pendingProductsCount = await Product.countDocuments({ status: 'pending' });

    // Total orders
    const ordersCount = await Order.countDocuments({ payment_status: 'completed' });

    // Total revenue & commission
    const revenueResult = await Order.aggregate([
      { $match: { payment_status: 'completed' } },
      { $group: { _id: null, revenue: { $sum: '$total_amount' }, commission: { $sum: '$commission_amount' } } }
    ]);
    const revenue = revenueResult[0]?.revenue || 0;
    const commission = revenueResult[0]?.commission || 0;

    // Pending withdrawals
    const pendingWithdrawalsResult = await Withdrawal.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]);

    // Platform revenue from withdrawal fees (commission désormais prélevée au retrait)
    const withdrawalFeesResult = await Withdrawal.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$fee_amount' } } }
    ]);
    const withdrawalFees = withdrawalFeesResult[0]?.total || 0;

    // Recent orders
    const recentOrders = await Order.find()
      .populate('user_id', 'first_name last_name email')
      .sort({ created_at: -1 })
      .limit(10)
      .lean();

    const transformedOrders = recentOrders.map(o => ({
      ...o,
      id: o._id,
      first_name: o.user_id?.first_name,
      last_name: o.user_id?.last_name,
      email: o.user_id?.email
    }));

    // Sales chart (last 30 days)
    const salesChart = await Order.aggregate([
      { $match: { payment_status: 'completed', created_at: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total_amount' },
          commission: { $sum: '$commission_amount' }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', orders: 1, revenue: 1, commission: 1, _id: 0 } }
    ]);

    // Top selling products
    const topProducts = await Product.find()
      .populate('vendor_id', 'store_name')
      .select('name slug thumbnail sales_count rating')
      .sort({ sales_count: -1 })
      .limit(5)
      .lean();

    // Top vendors
    const topVendors = await Vendor.find({ status: 'approved' })
      .populate('user_id', 'email')
      .select('store_name store_slug store_logo total_sales rating')
      .sort({ total_sales: -1 })
      .limit(5)
      .lean();

    res.json({
      stats: {
        users: usersCount,
        vendors: vendorsCount,
        pendingVendors: pendingVendorsCount,
        products: productsCount,
        pendingProducts: pendingProductsCount,
        orders: ordersCount,
        revenue,
        commission,
        withdrawalFees,
        pendingWithdrawals: {
          count: pendingWithdrawalsResult[0]?.count || 0,
          total: pendingWithdrawalsResult[0]?.total || 0
        }
      },
      recentOrders: transformedOrders,
      salesChart,
      topProducts: topProducts.map(p => ({ ...p, id: p._id, store_name: p.vendor_id?.store_name })),
      topVendors: topVendors.map(v => ({ ...v, id: v._id, email: v.user_id?.email }))
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Get users
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select('email first_name last_name phone avatar role is_active email_verified created_at')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      users: users.map(u => ({ ...u, id: u._id })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, is_active } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Don't allow changing own role
    if (id === req.user.id && role && role !== user.role) {
      return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre rôle' });
    }

    await User.findByIdAndUpdate(id, {
      role: role || user.role,
      is_active: is_active ?? user.is_active
    });

    res.json({ message: 'Utilisateur mis à jour' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    // Check if user has orders
    const ordersCount = await Order.countDocuments({ user_id: id });
    if (ordersCount > 0) {
      await User.findByIdAndUpdate(id, { is_active: false });
      return res.json({ message: 'Utilisateur désactivé (a des commandes)' });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Get settings
export const getSettings = async (req, res) => {
  try {
    const settings = await Setting.find().sort({ setting_key: 1 });

    const settingsObj = {};
    for (const setting of settings) {
      let value = setting.setting_value;
      if (setting.setting_type === 'number') {
        value = parseFloat(value);
      } else if (setting.setting_type === 'boolean') {
        value = value === 'true';
      } else if (setting.setting_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {}
      }
      settingsObj[setting.setting_key] = value;
    }

    res.json(settingsObj);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Update settings
export const updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      let settingValue = value;
      let settingType = 'string';

      if (typeof value === 'number') {
        settingType = 'number';
        settingValue = value.toString();
      } else if (typeof value === 'boolean') {
        settingType = 'boolean';
        settingValue = value.toString();
      } else if (typeof value === 'object') {
        settingType = 'json';
        settingValue = JSON.stringify(value);
      }

      await Setting.findOneAndUpdate(
        { setting_key: key },
        { setting_key: key, setting_value: settingValue, setting_type: settingType },
        { upsert: true }
      );
    }

    res.json({ message: 'Paramètres mis à jour' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Get sales report
export const getSalesReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let matchQuery = { payment_status: 'completed' };
    if (start_date) matchQuery.created_at = { ...matchQuery.created_at, $gte: new Date(start_date) };
    if (end_date) matchQuery.created_at = { ...matchQuery.created_at, $lte: new Date(end_date) };

    const summary = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total_orders: { $sum: 1 },
          total_revenue: { $sum: '$total_amount' },
          total_commission: { $sum: '$commission_amount' },
          total_vendor: { $sum: '$vendor_amount' }
        }
      }
    ]);

    const daily = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total_amount' },
          commission: { $sum: '$commission_amount' }
        }
      },
      { $sort: { _id: -1 } },
      { $project: { date: '$_id', orders: 1, revenue: 1, commission: 1, _id: 0 } }
    ]);

    const byPaymentMethod = await Order.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$payment_method', orders: { $sum: 1 }, revenue: { $sum: '$total_amount' } } },
      { $project: { payment_method: '$_id', orders: 1, revenue: 1, _id: 0 } }
    ]);

    res.json({
      summary: summary[0] || { total_orders: 0, total_revenue: 0, total_commission: 0, total_vendor: 0 },
      daily,
      byPaymentMethod
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Get vendors report
export const getVendorsReport = async (req, res) => {
  try {
    const vendors = await Vendor.find({ status: 'approved' })
      .populate('user_id', 'email')
      .sort({ total_sales: -1 })
      .lean();

    const result = [];
    for (const v of vendors) {
      const products_count = await Product.countDocuments({ vendor_id: v._id, status: 'published' });
      const orders_count = await OrderItem.countDocuments({ vendor_id: v._id });
      result.push({ ...v, id: v._id, email: v.user_id?.email, products_count, orders_count });
    }

    res.json(result);
  } catch (error) {
    console.error('Get vendors report error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Get products report
export const getProductsReport = async (req, res) => {
  try {
    const products = await Product.find({ status: 'published' })
      .populate('category_id', 'name')
      .populate('vendor_id', 'store_name')
      .sort({ sales_count: -1 })
      .limit(50)
      .lean();

    const transformedProducts = [];
    for (const p of products) {
      const revenueResult = await OrderItem.aggregate([
        { $match: { product_id: p._id } },
        { $group: { _id: null, total: { $sum: '$price' } } }
      ]);
      transformedProducts.push({
        ...p,
        id: p._id,
        category_name: p.category_id?.name,
        store_name: p.vendor_id?.store_name,
        total_revenue: revenueResult[0]?.total || 0
      });
    }

    // By category
    const byCategory = await Product.aggregate([
      { $match: { status: 'published' } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category.name',
          products: { $sum: 1 },
          sales: { $sum: '$sales_count' }
        }
      },
      { $sort: { sales: -1 } },
      { $project: { name: '$_id', products: 1, sales: 1, _id: 0 } }
    ]);

    res.json({
      products: transformedProducts,
      byCategory
    });
  } catch (error) {
    console.error('Get products report error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
