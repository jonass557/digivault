import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';

// Layouts
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import VendorLayout from './layouts/VendorLayout';
import AuthLayout from './layouts/AuthLayout';

// Public Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductPage from './pages/ProductPage';
import TemplatesPage from './pages/TemplatesPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import VendorsPage from './pages/VendorsPage';
import VendorStorePage from './pages/VendorStorePage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import BecomeVendorPage from './pages/BecomeVendorPage';
import SearchPage from './pages/SearchPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Client Account Pages
import AccountPage from './pages/account/AccountPage';
import OrdersPage from './pages/account/OrdersPage';
import DownloadsPage from './pages/account/DownloadsPage';
import WishlistPage from './pages/account/WishlistPage';
import ProfilePage from './pages/account/ProfilePage';

// Vendor Dashboard Pages
import VendorDashboard from './pages/vendor/VendorDashboard';
import VendorProducts from './pages/vendor/VendorProducts';
import VendorProductForm from './pages/vendor/VendorProductForm';
import VendorOrders from './pages/vendor/VendorOrders';
import VendorWithdrawals from './pages/vendor/VendorWithdrawals';
import VendorSettings from './pages/vendor/VendorSettings';
import VendorCoupons from './pages/vendor/VendorCoupons';
import VendorBundles from './pages/vendor/VendorBundles';

// Admin Dashboard Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminVendors from './pages/admin/AdminVendors';
import AdminVendorRequests from './pages/admin/AdminVendorRequests';
import AdminOrders from './pages/admin/AdminOrders';
import AdminUsers from './pages/admin/AdminUsers';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminCategories from './pages/admin/AdminCategories';
import AdminBanners from './pages/admin/AdminBanners';
import AdminBlog from './pages/admin/AdminBlog';
import AdminSettings from './pages/admin/AdminSettings';
import AdminCoupons from './pages/admin/AdminCoupons';

// Route Guards
import ProtectedRoute from './components/ProtectedRoute';
import VendorRoute from './components/VendorRoute';
import AdminRoute from './components/AdminRoute';

// 404 Page
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:slug" element={<ProductPage />} />
        <Route path="category/:slug" element={<ProductsPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="blog/:slug" element={<BlogPostPage />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="store/:slug" element={<VendorStorePage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="payment/success" element={<PaymentSuccessPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="become-vendor" element={<BecomeVendorPage />} />
        <Route path="search" element={<SearchPage />} />
      </Route>

      {/* Auth Routes */}
      <Route path="/" element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Account Routes */}
      <Route path="/account" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<AccountPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="downloads" element={<DownloadsPage />} />
        <Route path="wishlist" element={<WishlistPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Vendor Routes */}
      <Route path="/vendor" element={<VendorRoute><VendorLayout /></VendorRoute>}>
        <Route path="dashboard" element={<VendorDashboard />} />
        <Route path="products" element={<VendorProducts />} />
        <Route path="products/new" element={<VendorProductForm />} />
        <Route path="products/:id/edit" element={<VendorProductForm />} />
        <Route path="orders" element={<VendorOrders />} />
        <Route path="coupons" element={<VendorCoupons />} />
        <Route path="bundles" element={<VendorBundles />} />
        <Route path="withdrawals" element={<VendorWithdrawals />} />
        <Route path="settings" element={<VendorSettings />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="vendors" element={<AdminVendors />} />
        <Route path="vendor-requests" element={<AdminVendorRequests />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="withdrawals" element={<AdminWithdrawals />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="coupons" element={<AdminCoupons />} />
        <Route path="banners" element={<AdminBanners />} />
        <Route path="blog" element={<AdminBlog />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
