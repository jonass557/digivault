import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      coupon: null, // { code, discount_amount, discount_type, discount_value, applies_to }

      addItem: (product) => {
        const items = get().items || [];
        const productId = product.id || product._id;
        const exists = items.find((item) => (item.id || item._id) === productId);

        if (exists) {
          return false;
        }

        const cartItem = {
          id: productId,
          _id: productId,
          name: product.name,
          slug: product.slug,
          price: product.price,
          sale_price: product.sale_price,
          thumbnail: product.thumbnail,
          store_name: product.store_name
        };

        // Un changement de panier invalide le coupon (il devra être re-validé).
        set({ items: [...items, cartItem], coupon: null });
        return true;
      },

      removeItem: (productId) => {
        const items = get().items || [];
        set({ items: items.filter((item) => (item.id || item._id) !== productId), coupon: null });
      },

      clearCart: () => {
        set({ items: [], coupon: null });
      },

      // Coupon validé côté serveur (le serveur reste seul juge au paiement).
      applyCoupon: (coupon) => set({ coupon }),
      removeCoupon: () => set({ coupon: null }),

      getTotal: () => {
        const items = get().items || [];
        return items.reduce((total, item) => {
          return total + (item.sale_price || item.price || 0);
        }, 0);
      },

      // Total après réduction coupon (indicatif ; le serveur recalcule au paiement).
      getDiscount: () => {
        const coupon = get().coupon;
        return coupon?.discount_amount || 0;
      },

      getNetTotal: () => {
        const total = get().getTotal();
        return Math.max(0, total - get().getDiscount());
      },

      getCount: () => {
        const items = get().items || [];
        return items.length;
      },

      hasItem: (productId) => {
        const items = get().items || [];
        return items.some((item) => (item.id || item._id) === productId);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
