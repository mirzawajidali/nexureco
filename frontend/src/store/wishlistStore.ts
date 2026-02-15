import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  productIds: number[];
  addToWishlist: (productId: number) => void;
  removeFromWishlist: (productId: number) => void;
  isInWishlist: (productId: number) => boolean;
  toggleWishlist: (productId: number) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      productIds: [],

      addToWishlist: (productId) =>
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds
            : [...state.productIds, productId],
        })),

      removeFromWishlist: (productId) =>
        set((state) => ({
          productIds: state.productIds.filter((id) => id !== productId),
        })),

      isInWishlist: (productId) => get().productIds.includes(productId),

      toggleWishlist: (productId) => {
        const { productIds } = get();
        if (productIds.includes(productId)) {
          set({ productIds: productIds.filter((id) => id !== productId) });
        } else {
          set({ productIds: [...productIds, productId] });
        }
      },
    }),
    { name: 'mybrand-wishlist' }
  )
);
