import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Package, X, ChevronRight, Loader2, 
  ShoppingBag, Flame, MessageCircle, ShieldCheck, Store, MapPin
} from 'lucide-react';

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
  const navigate = useNavigate();
  
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Все');

  // Лимит отображаемых товаров (Пагинация)
  const [displayLimit, setDisplayLimit] = useState(20);
  
  // Стейт для модалки детального просмотра товара
  const [selectedProduct, setSelectedProduct] = useState<(Product & { shopId: string; shopName: string; shopAvatar: string; shopCategory: string }) | null>(null);

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
            shopAvatar: shop.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name || 'M')}&background=random`,
            shopCategory: shop.category || 'Другое'
          });
        });
      }
    });

    // Перемешиваем или сортируем (сейчас по убыванию ID для "свежести")
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

  // Сбрасываем лимит пагинации при смене категории или поиске
  useEffect(() => {
    setDisplayLimit(20);
  }, [searchQuery, activeCategory]);

  const displayedProducts = filteredProducts.slice(0, displayLimit);

  // Обработчик скролла (Infinite Scroll)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (displayLimit < filteredProducts.length) {
        setDisplayLimit(prev => prev + 20);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden select-none font-sans relative">
      
      {/* HEADER: Единый стиль с Dating и Chats */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl sticky top-0 z-20 pt-3 pb-2 px-4 border-b border-gray-100 dark:border-gray-800 shrink-0 shadow-sm transition-colors">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-[14px] flex items-center justify-center shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
                <ShoppingBag size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Маркетплейс
              </h1>
            </div>
          </div>

          {/* Строка поиска */}
          <div className="relative flex items-center bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl px-3 py-2 transition-all focus-within:ring-2 ring-blue-500/50">
            <Search className="text-gray-400 dark:text-gray-500 shrink-0" size={18} />
            <input 
              type="text" 
              placeholder="Поиск товаров и магазинов..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent pl-3 pr-8 py-1.5 text-[15px] focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* КАТЕГОРИИ (Горизонтальный скролл) */}
        <div className="max-w-5xl mx-auto flex overflow-x-auto gap-2 mt-3 pb-1 scrollbar-none">
          {BUSINESS_CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm ${
                activeCategory === category 
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {category === 'Популярное' ? <span className="flex items-center gap-1"><Flame size={14} className="text-orange-500" /> {category}</span> : category}
            </button>
          ))}
        </div>
      </div>

      {/* СЕТКА ТОВАРОВ */}
      <div 
        className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+80px)] custom-scrollbar"
        onScroll={handleScroll}
      >
        <div className="max-w-5xl mx-auto p-3 sm:p-4">
          
          {isLoading ? (
            // СКЕЛЕТОН ЗАГРУЗКИ (КАК В ТОП ПРИЛОЖЕНИЯХ)
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 rounded-[24px] p-2 flex flex-col gap-2 animate-pulse border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded-[16px]"></div>
                  <div className="px-1 py-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-md w-3/4 mb-2"></div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-md w-1/2"></div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-md w-16"></div>
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayedProducts.length > 0 ? (
            // СПИСОК ТОВАРОВ
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {displayedProducts.map(product => (
                  <div 
                    key={product.id} 
                    onClick={() => setSelectedProduct(product)}
                    className="bg-white dark:bg-gray-900 rounded-[24px] p-2 flex flex-col border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-all cursor-pointer group"
                  >
                    {/* Изображение товара */}
                    <div className="relative w-full aspect-square bg-gray-50 dark:bg-gray-800 rounded-[16px] overflow-hidden mb-2">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                          <ShoppingBag size={32} />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>
                    
                    {/* Данные товара */}
                    <div className="px-1 flex flex-col flex-1">
                      <h3 className="text-[14px] font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-1 group-hover:text-blue-500 transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 pb-2">
                        <img src={product.shopAvatar} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700" />
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                          {product.shopName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-[15px] sm:text-[16px] font-black text-gray-900 dark:text-white tracking-tight">
                          {product.price}
                        </span>
                        <div className="w-8 h-8 bg-blue-50 hover:bg-blue-500 text-blue-600 hover:text-white dark:bg-blue-500/10 dark:hover:bg-blue-500 rounded-full flex items-center justify-center transition-colors shadow-sm">
                          <ShoppingBag size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Лоадер при подгрузке следующих товаров */}
              {displayLimit < filteredProducts.length && (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-gray-400 dark:text-gray-600" size={24} />
                </div>
              )}
            </>
          ) : (
            // ПУСТОЕ СОСТОЯНИЕ
            <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4 animate-fade-in">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <Search size={40} className="text-gray-300 dark:text-gray-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Ничего не найдено</h2>
              <p className="text-[15px] font-medium text-gray-500 dark:text-gray-400 max-w-[280px]">
                В этой категории пока нет товаров или ваш запрос не дал результатов.
              </p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mt-6 px-6 py-3 bg-blue-500 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-blue-500/30">
                  Очистить поиск
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* МОДАЛКА: ПРОСМОТР ТОВАРА */}
      {/* ========================================== */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 z-[150] bg-gray-950/80 backdrop-blur-sm flex justify-center items-end md:items-center p-0 md:p-4 animate-fade-in"
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="bg-white dark:bg-gray-900 w-full md:w-[480px] max-h-[90vh] overflow-y-auto custom-scrollbar rounded-t-[32px] md:rounded-[32px] shadow-2xl flex flex-col relative animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Картинка товара */}
            <div className="relative w-full h-[40vh] md:h-[45vh] bg-gray-100 dark:bg-gray-800 shrink-0 rounded-t-[32px] overflow-hidden">
              {selectedProduct.imageUrl ? (
                <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600"><ShoppingBag size={64}/></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-black/30 pointer-events-none" />
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 w-10 h-10 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md z-10">
                <X size={20} />
              </button>

              {/* Тег категории на фото */}
              <div className="absolute bottom-4 left-4">
                <span className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-white/20 shadow-sm">
                  {selectedProduct.shopCategory}
                </span>
              </div>
            </div>
            
            {/* Контент */}
            <div className="p-6 relative flex flex-col flex-1">
              <div className="flex items-start justify-between gap-4 mb-6">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                  {selectedProduct.name}
                </h2>
                <div className="bg-gradient-to-tr from-blue-500 to-indigo-500 px-4 py-2 rounded-xl shadow-md shrink-0">
                  <span className="text-lg font-black text-white tracking-tight">{selectedProduct.price}</span>
                </div>
              </div>

              {/* Карточка продавца (Кликабельная -> Ведет в Магазин) */}
              <div 
                onClick={() => navigate(`/shop/${selectedProduct.shopId}`)}
                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-700/50 transition-colors mb-6 group"
              >
                <img src={selectedProduct.shopAvatar} className="w-14 h-14 rounded-full object-cover shadow-sm border border-gray-200 dark:border-gray-700" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-[16px] font-bold text-gray-900 dark:text-white flex items-center gap-1.5 truncate group-hover:text-blue-500 transition-colors">
                    <Store size={18} className="text-gray-400" /> {selectedProduct.shopName}
                  </h4>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-0.5">
                    <ShieldCheck size={14} className="text-green-500" /> Проверенный продавец
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Описание */}
              <div className="mb-6">
                <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3">Описание товара</h3>
                <p className="text-[15px] text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/30 p-4 rounded-[20px] border border-gray-100 dark:border-gray-800">
                  {selectedProduct.description || 'Продавец не добавил описание для этого товара.'}
                </p>
              </div>

              {/* Кнопки действий (Sticky bottom) */}
              <div className="mt-auto sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)] flex gap-3 z-20">
                {selectedProduct.shopId !== user?.uid && (
                  <button 
                    onClick={() => navigate('/chats', { state: { selectedUserId: selectedProduct.shopId } })}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold flex justify-center items-center gap-2 transition-colors"
                  >
                    <MessageCircle size={20} /> Сообщение
                  </button>
                )}
                <button 
                  onClick={() => navigate(`/shop/${selectedProduct.shopId}`)}
                  className="flex-[1.5] py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-blue-500/25"
                >
                  <ShoppingBag size={20} /> Перейти в магазин
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
