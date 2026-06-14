import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  shopId: string;
  shopName: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: any, shopId: string, shopName: string) => void;
  removeItem: (productId: string) => void;
  clearCart: (shopId?: string) => void;
  getItemsByShop: (shopId: string) => CartItem[];
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      // Добавить товар (если уже есть — увеличиваем количество)
      addItem: (product, shopId, shopName) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.id === product.id);
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
              ),
            };
          }
          return {
            items: [...state.items, { ...product, shopId, shopName, quantity: 1 }],
          };
        });
      },
      
      // Удалить товар полностью
      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },
      
      // Очистить корзину (конкретного магазина или всю)
      clearCart: (shopId) => {
        if (shopId) {
          set((state) => ({ items: state.items.filter((item) => item.shopId !== shopId) }));
        } else {
          set({ items: [] });
        }
      },
      
      // Получить товары только для конкретного магазина (чтобы оформлять заказ именно ему)
      getItemsByShop: (shopId) => {
        return get().items.filter((item) => item.shopId === shopId);
      },
    }),
    {
      name: 'auragram-cart', // Имя ключа в localStorage
    }
  )
);
