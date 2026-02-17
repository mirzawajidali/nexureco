import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItemLocal {
  productId: number;
  variantId: number | null;
  quantity: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  variantInfo?: string;
}

interface CartState {
  items: CartItemLocal[];
  couponCode: string | null;
  isCartOpen: boolean;
  addItem: (item: CartItemLocal) => void;
  removeItem: (productId: number, variantId: number | null) => void;
  updateQuantity: (productId: number, variantId: number | null, quantity: number) => void;
  clearCart: () => void;
  setCoupon: (code: string | null) => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  itemCount: () => number;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      isCartOpen: false,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.variantId === item.variantId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.variantId === item.variantId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),

      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        })),

      updateQuantity: (productId, variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter(
                  (i) => !(i.productId === productId && i.variantId === variantId)
                )
              : state.items.map((i) =>
                  i.productId === productId && i.variantId === variantId
                    ? { ...i, quantity }
                    : i
                ),
        })),

      clearCart: () => set({ items: [], couponCode: null }),

      setCoupon: (code) => set({ couponCode: code }),

      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

      setCartOpen: (open) => set({ isCartOpen: open }),

      itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    {
      name: 'mybrand-cart',
      partialize: (state) => ({ items: state.items, couponCode: state.couponCode }),
    }
  )
);
