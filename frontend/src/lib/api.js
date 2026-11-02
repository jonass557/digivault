import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getFeatured: (limit) => api.get('/products/featured', { params: { limit } }),
  getBySlug: (slug) => api.get(`/products/${slug}`),
  getByCategory: (slug, params) => api.get(`/products/category/${slug}`, { params }),
  getRelated: (slug, params) => api.get(`/products/${slug}/related`, { params }),
  getFrequentlyBought: (slug, params) => api.get(`/products/${slug}/frequently-bought`, { params }),
  search: (params) => api.get('/products/search', { params }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  addFiles: (id, files) => api.post(`/products/${id}/files`, { files }),
  addPreviews: (id, previews) => api.post(`/products/${id}/previews`, { previews }),
};

// Categories API
export const categoriesAPI = {
  getAll: (params) => api.get('/categories', { params }),
  getBySlug: (slug) => api.get(`/categories/${slug}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Vendors API
export const vendorsAPI = {
  getAll: (params) => api.get('/vendors', { params }),
  getBySlug: (slug) => api.get(`/vendors/${slug}`),
  getProducts: (slug, params) => api.get(`/vendors/${slug}/products`, { params }),
  apply: (data) => api.post('/vendors/apply', data),
  getDashboard: () => api.get('/vendors/me/dashboard'),
  getMyProducts: (params) => api.get('/vendors/me/products', { params }),
  getMyOrders: (params) => api.get('/vendors/me/orders', { params }),
  getMyStats: () => api.get('/vendors/me/stats'),
  updateProfile: (data) => api.put('/vendors/me/profile', data),
};

// Orders API
export const ordersAPI = {
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),
  getOrderDetails: (id) => api.get(`/orders/my-orders/${id}`),
  getMyDownloads: () => api.get('/orders/my-downloads'),
};

// Payments API
export const paymentsAPI = {
  initialize: (data) => api.post('/payments/initialize', data),
  checkStatus: (orderNumber) => api.get(`/payments/status/${orderNumber}`),
};

// Downloads API
export const downloadsAPI = {
  generate: (data) => api.post('/downloads/generate', data),
  getHistory: () => api.get('/downloads/history'),
};

// Reviews API
export const reviewsAPI = {
  getByProduct: (productId, params) => api.get(`/reviews/product/${productId}`, { params }),
  create: (data) => api.post('/reviews', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// Blog API
export const blogAPI = {
  getPosts: (params) => api.get('/blog/posts', { params }),
  getFeatured: (limit) => api.get('/blog/posts/featured', { params: { limit } }),
  getBySlug: (slug) => api.get(`/blog/posts/${slug}`),
  getCategories: () => api.get('/blog/categories'),
};

// Templates API
export const templatesAPI = {
  getAll: (params) => api.get('/templates', { params }),
  getFeatured: (limit) => api.get('/templates/featured', { params: { limit } }),
  getBySlug: (slug) => api.get(`/templates/${slug}`),
};

// Banners API
export const bannersAPI = {
  getActive: () => api.get('/banners'),
  getByPosition: (position) => api.get(`/banners/position/${position}`),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/password', data),
  updateAvatar: (avatar) => api.put('/users/avatar', { avatar }),
  getWishlist: () => api.get('/users/wishlist'),
  addToWishlist: (productId) => api.post(`/users/wishlist/${productId}`),
  removeFromWishlist: (productId) => api.delete(`/users/wishlist/${productId}`),
  getCart: () => api.get('/users/cart'),
  addToCart: (productId) => api.post('/users/cart', { product_id: productId }),
  removeFromCart: (productId) => api.delete(`/users/cart/${productId}`),
  clearCart: () => api.delete('/users/cart'),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Withdrawals API
export const withdrawalsAPI = {
  getMyWithdrawals: (params) => api.get('/withdrawals/my-withdrawals', { params }),
  getBalance: () => api.get('/withdrawals/balance'),
  request: (data) => api.post('/withdrawals/request', data),
};

// Upload API
export const uploadAPI = {
  uploadImage: (file, folder) => {
    const formData = new FormData();
    formData.append('image', file);
    if (folder) formData.append('folder', folder);
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadProductFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/product-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  getVendorRequests: (params) => api.get('/vendors/admin/requests', { params }),
  processVendorRequest: (id, data) => api.put(`/vendors/admin/requests/${id}`, data),
  getAllVendors: (params) => api.get('/vendors/admin/all', { params }),
  getAllWithdrawals: (params) => api.get('/withdrawals', { params }),
  processWithdrawal: (id, data) => api.put(`/withdrawals/${id}/process`, data),
  getAllOrders: (params) => api.get('/orders', { params }),
  getPendingProducts: (params) => api.get('/products/admin/pending', { params }),
  updateProductStatus: (id, data) => api.put(`/products/${id}/status`, data),
  getAllBanners: () => api.get('/banners/all'),
  createBanner: (data) => api.post('/banners', data),
  updateBanner: (id, data) => api.put(`/banners/${id}`, data),
  deleteBanner: (id) => api.delete(`/banners/${id}`),
};

// Coupons API
export const couponsAPI = {
  validate: (code, items) => api.post('/coupons/validate', { code, items }),
  // Vendor
  getMine: () => api.get('/coupons/my-coupons'),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  delete: (id) => api.delete(`/coupons/${id}`),
  // Admin
  getAllAdmin: (params) => api.get('/coupons/admin', { params }),
  createAdmin: (data) => api.post('/coupons/admin', data),
};

// Bundles API
export const bundlesAPI = {
  getPublished: (params) => api.get('/bundles', { params }),
  getBySlug: (slug) => api.get(`/bundles/${slug}`),
  getForProduct: (productId) => api.get(`/bundles/for-product/${productId}`),
  // Vendor
  getMine: () => api.get('/bundles/mine'),
  create: (data) => api.post('/bundles', data),
  update: (id, data) => api.put(`/bundles/${id}`, data),
  delete: (id) => api.delete(`/bundles/${id}`),
};

export default api;
