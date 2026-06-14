import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import { Search, Package, X, ChevronRight, Loader2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
}

interface BusinessProfile {
  id: string;
  name: string;
  avatar: string;
  category?: string;
  products: Product[];
}

export const BUSINESS_CATEGORIES = [
  'Все',
  'IT & Разработка',
  'Дизайн & Графика',
  'Маркетинг & PR',
  'Консалтинг & Услуги',
  'E-commerce & Товары',
  'Образование',
];

export default function MarketPage() {
  const { user } = useAuthStore();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Все');

  useEffect(() => {
    const fetchMarketData = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'users'), where('type', '==', 'business'));
        const querySnapshot = await getDocs(q);
        const loadedBusinesses: BusinessProfile[] = [];
        
        querySnapshot.forEach((doc) => {
          if (doc.id !== user?.uid) {
            const data = doc.data();
            loadedBusinesses.push({ 
              id: doc.id, 
              ...data,
              products: data.products || [],
              category: data.category || 'Другое'
            } as BusinessProfile);
          }
        });
        
        setBusinesses(loadedBusinesses);
      } catch (error) {
        console.error('Ошибка при загрузке Маркетплейса:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketData();
  }, [user]);

  const allProducts = useMemo(() => {
    const productsList: (Product & { shopId: string; shopName: string; shopAvatar: string; shopCategory: string })[] = [];
    
    businesses.forEach(shop => {
      if (shop.products && shop.products.length > 0) {
        shop.products.forEach(prod => {
          productsList.push({
            ...prod,
            shopId: shop.id,
            shopName: shop.name || 'Без названия',
            shopAvatar: shop.avatar,
            shopCategory: shop.category || 'Другое'
          });
        });
      }
    });

    return productsList.sort((a, b) => Number(b.id) - Number(a.id));
  }, [businesses]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter(item => {
      const matchCategory = activeCategory === 'Все' || item.shopCategory === activeCategory;
      const matchSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shopName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchCategory && matchSearch;
    });
  }, [allProducts, activeCategory, searchQuery]);


  if (isLoading) {
    return (
      <div className="flex-1 bg-[#F2F2F7] flex justify-center items-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7] overflow-hidden select-none">
      
      {/* СТИКИ ХЕДЕР С ПОИСКОМ */}
      <div className="bg-white/90 backdrop-blur-md sticky top-0 z-20 pt-4 pb-2 px-4 border-b border-gray-200/60 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Маркет
            </h1>
          </div>

          {/* Строка поиска в стиле iOS/Telegram */}
          <div className="relative flex items-center bg-gray-100/80 rounded-[10px] px-3 py-1.5 transition-colors focus-within:bg-gray-200/60">
            <Search className="text-gray-400 shrink-0" size={18} />
            <input 
              type="text" 
              placeholder="Поиск товаров и магазинов" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent pl-2 pr-8 py-1 text-[15px] focus:outline-none text-gray-900 placeholder-gray-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* КАТЕГОРИИ (Горизонтальный скролл) */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-200/60 shrink-0">
        <div className="max-w-4xl mx-auto flex overflow-x-auto gap-2 px-4 py-2.5 scrollbar-none">
          {BUSINESS_CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors border ${
                activeCategory === category 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* СЕТКА ТОВАРОВ */}
      <div className="flex-1 overflow-y-auto pb-24 custom-scrollbar">
        <div className="max-w-4xl mx-auto p-4">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200/50 flex flex-col active:scale-[0.98] transition-transform">
                  
                  {/* Изображение товара */}
                  <div className="relative h-32 sm:h-40 bg-gray-100 shrink-0 overflow-hidden">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <Package className="absolute inset-0 m-auto text-gray-300" size={32} />
                    )}
                  </div>
                  
                  {/* Информация */}
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-medium text-gray-900 text-[14px] leading-tight line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-[14px] font-bold text-gray-900 mt-auto">
                      {product.price}
                    </p>
                    
                    {/* Магазин продавец */}
                    <Link 
                      to={`/shop/${product.shopId}`} 
                      className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img 
                          src={product.shopAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.shopName)}&background=random`} 
                          alt={product.shopName} 
                          className="w-5 h-5 rounded-full object-cover border border-gray-200 shrink-0" 
                        />
                        <span className="text-[11px] font-medium text-gray-500 truncate group-hover:text-blue-500 transition-colors">
                          {product.shopName}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-gray-300 shrink-0" />
                    </Link>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <Package size={48} className="text-gray-300 mb-3" />
              <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Ничего не найдено</h3>
              <p className="text-[13px] text-gray-500 max-w-[250px]">
                В этой категории пока нет товаров или ваш запрос не дал результатов.
              </p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mt-4 text-blue-500 font-medium text-[14px]">
                  Очистить поиск
                </button>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
