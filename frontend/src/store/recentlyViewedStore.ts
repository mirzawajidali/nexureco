import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_ITEMS = 20;

interface RecentlyViewedState {
  productIds: number[];
  addProduct: (productId: number) => void;
  getExcluding: (productId: number) => number[];
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      productIds: [],

      addProduct: (productId) =>
        set((state) => {
          const filtered = state.productIds.filter((id) => id !== productId);
          return { productIds: [productId, ...filtered].slice(0, MAX_ITEMS) };
        }),

      getExcluding: (productId) =>
        get().productIds.filter((id) => id !== productId),
    }),
    { name: 'mybrand-recently-viewed' }
  )
);
