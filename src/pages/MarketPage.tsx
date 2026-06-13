import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import { Store, Search, Building2, ArrowRight, Package, X } from 'lucide-react';

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
  role: string;
  avatar: string;
  type: string;
  category?: string;
  createdAt?: any;
  products: Product[];
}

export const BUSINESS_CATEGORIES = [
  'Все категории',
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
  const [activeCategory, setActiveCategory] = useState<string>('Все категории');

  useEffect(() => {
    const fetchMarketData = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'users'), where('type', '==', 'business'));
        const querySnapshot = await getDocs(q);
        const loadedBusinesses: BusinessProfile[] = [];
        
        querySnapshot.forEach((doc) => {
          // ИСПРАВЛЕНО: Скрываем магазин самого пользователя из общей выдачи
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

  const topShops = useMemo(() => {
    return [...businesses].sort((a, b) => {
      const aScore = (a.products?.length || 0);
      const bScore = (b.products?.length || 0);
      if (bScore !== aScore) return bScore - aScore;
      
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  }, [businesses]);

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
      const matchCategory = activeCategory === 'Все категории' || item.shopCategory === activeCategory;
      const matchSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shopName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchCategory && matchSearch;
    });
  }, [allProducts, activeCategory, searchQuery]);


  if (isLoading) {
    return (
      <div className="flex-1 bg-[#FAFAFA] p-6 md:p-10 flex flex-col gap-10 animate-pulse">
        <div className="h-10 w-64 bg-gray-200/60 rounded-xl" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map(n => <div key={n} className="w-24 h-24 rounded-full bg-gray-200/60 shrink-0" />)}
        </div>
        <div className="h-14 w-full bg-gray-200/60 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => <div key={n} className="h-64 rounded-3xl bg-gray-200/60" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAFAFA] pb-24 select-none custom-scrollbar">
      
      {/* ХЕДЕР */}
      <div className="p-6 md:px-10 md:pt-10 md:pb-6 bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tight flex items-center gap-3">
                Маркетплейс
              </h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">Товары и услуги от проверенных B2B партнеров</p>
            </div>
            <Link to="/profile" className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all shadow-md active:scale-95 shrink-0">
              <Building2 size={16} /> Открыть свой магазин
            </Link>
          </div>

          {/* ПОИСК */}
          <div className="relative flex items-center bg-gray-50 rounded-2xl border border-gray-200/60 focus-within:border-amber-400 focus-within:bg-white focus-within:shadow-[0_4px_20px_rgba(245,158,11,0.08)] transition-all">
            <Search className="absolute left-4 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Поиск товаров, услуг или магазинов..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent pl-12 pr-10 py-4 text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-semibold"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">

        {/* 1. КАРУСЕЛЬ МАГАЗИНОВ */}
        {topShops.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Store size={20} className="text-amber-500" /> Топ магазины
              </h2>
            </div>
            
            <div className="flex overflow-x-auto gap-5 pb-4 scrollbar-none snap-x">
              {topShops.map(shop => (
                <Link 
                  key={shop.id} 
                  to={`/shop/${shop.id}`}
                  className="flex flex-col items-center gap-2 min-w-[90px] group snap-start"
                >
                  <div className="w-20 h-20 rounded-[1.5rem] p-1 bg-gradient-to-tr from-amber-400 to-amber-600 shadow-md group-hover:scale-105 transition-transform duration-300">
                    <img 
                      src={shop.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name)}&background=f59e0b&color=fff`} 
                      alt={shop.name} 
                      className="w-full h-full rounded-[1.2rem] object-cover border-2 border-white"
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-900 text-center w-full truncate group-hover:text-amber-600 transition-colors">
                    {shop.name || 'Магазин'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 2. ГЛОБАЛЬНАЯ ВИТРИНА ТОВАРОВ */}
        <section>
          {/* Категории */}
          <div className="flex overflow-x-auto gap-2 pb-6 mb-2 scrollbar-none">
            {BUSINESS_CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-5 py-2.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all duration-200 border ${
                  activeCategory === category 
                    ? 'bg-gray-950 text-white border-gray-950 shadow-md' 
                    : 'bg-white text-gray-600 border-gray-200/60 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Сетка товаров */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white border border-gray-200/60 rounded-3xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-[0_10px_30px_rgba(245,158,11,0.08)] hover:border-amber-200 transition-all duration-300 group flex flex-col">
                  
                  <div className="relative h-48 md:h-56 bg-gray-100 overflow-hidden">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                    />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-950 px-3 py-1.5 rounded-xl text-[11px] font-black shadow-sm">
                      {product.price}
                    </div>
                  </div>
                  
                  <div className="p-4 md:p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-gray-900 text-sm md:text-base leading-tight line-clamp-2 mb-2 group-hover:text-amber-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 font-medium leading-relaxed mb-4">
                      {product.description || 'Описание отсутствует'}
                    </p>
                    
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                      <Link to={`/shop/${product.shopId}`} className="flex items-center gap-2 group/shop min-w-0">
                        <img src={product.shopAvatar} alt={product.shopName} className="w-6 h-6 rounded-md object-cover border border-gray-200 shrink-0" />
                        <span className="text-[10px] font-bold text-gray-500 group-hover/shop:text-gray-900 truncate transition-colors">
                          {product.shopName}
                        </span>
                      </Link>
                      
                      <Link to={`/shop/${product.shopId}`} className="w-8 h-8 rounded-xl bg-gray-50 text-gray-900 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-3xl border border-gray-200/60 border-dashed">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mx-auto mb-4">
                <Package size={28} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Ничего не найдено</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto font-medium">
                В этой категории пока нет товаров, или ваш поисковый запрос не дал результатов.
              </p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mt-4 text-amber-600 font-bold text-sm">
                  Очистить поиск
                </button>
              )}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
