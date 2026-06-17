import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, Package, X, ChevronRight, Loader2, 
  ShoppingBag, Flame, MessageCircle, ShieldCheck, Store, MapPin, Sparkles, Users, Star
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
  location?: string;
  rating?: string; 
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
  'Недвижимость (Аренда/Продажа)',
  'Цифровая инфо (Курсы, Книги)',
  'Другое', 
];

export default function MarketPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Все');

  const [displayLimit, setDisplayLimit] = useState(20);
  
  const [selectedProduct, setSelectedProduct] = useState<(Product & { shopId: string; shopName: string; shopAvatar: string; shopCategory: string; shopLocation: string; shopRating: string }) | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'users'), where('type', '==', 'business'));
        const querySnapshot = await getDocs(q);
        const loadedBusinesses: BusinessProfile[] = [];
        
        for (const document of querySnapshot.docs) {
          if (document.id !== user?.uid) {
            const data = document.data();
            
            // Получаем рейтинг магазина
            let avgRating = '0';
            try {
              const reviewsQ = query(collection(db, 'shop_reviews'), where('shopId', '==', document.id));
              const reviewsSnap = await getDocs(reviewsQ);
              if (!reviewsSnap.empty) {
                let totalScore = 0;
                reviewsSnap.forEach(r => totalScore += r.data().rating);
                avgRating = (totalScore / reviewsSnap.size).toFixed(1);
              }
            } catch (e) {
              console.error("Ошибка загрузки рейтинга", e);
            }

            loadedBusinesses.push({ 
              id: document.id, 
              ...data,
              products: data.products || [],
              category: data.category || 'Другое',
              location: data.location || 'Онлайн-магазин',
              rating: avgRating
            } as BusinessProfile);
          }
        }
        
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
    const productsList: (Product & { shopId: string; shopName: string; shopAvatar: string; shopCategory: string; shopLocation: string; shopRating: string })[] = [];
    
    businesses.forEach(shop => {
      if (shop.products && shop.products.length > 0) {
        shop.products.forEach(prod => {
          productsList.push({
            ...prod,
            shopId: shop.id,
            shopName: shop.name || 'Без названия',
            shopAvatar: shop.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name || 'M')}&background=random`,
            shopCategory: shop.category || 'Другое',
            shopLocation: shop.location || 'Онлайн-магазин',
            shopRating: shop.rating || '0'
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

  useEffect(() => {
    setDisplayLimit(20);
  }, [searchQuery, activeCategory]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (displayLimit < filteredProducts.length) {
        setDisplayLimit(prev => prev + 20);
      }
    }
  };

  // ФУНКЦИЯ "ЗАКАЗАТЬ В 1 КЛИК" (Передает товар прямо в чат)
  const handleDirectOrder = () => {
    if (!selectedProduct) return;
    
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    // Имитируем корзину с 1 товаром для передачи в ChatsPage
    const singleItemCart = [{
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      quantity: 1
    }];

    navigate('/chats', { 
      state: { 
        selectedUserId: selectedProduct.shopId, 
        checkoutCart: singleItemCart 
      } 
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F5F5F7] dark:bg-[#0A0A0B] overflow-hidden select-none font-sans relative transition-colors min-h-[100dvh]">
      
      {/* СОВРЕМЕННЫЙ УЛЬТРА-МИНИМАЛИСТИЧНЫЙ HEADER */}
      <div className="bg-[#F5F5F7]/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl sticky top-0 z-20 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 px-4 border-b border-gray-200/60 dark:border-gray-800 shrink-0 shadow-sm transition-colors">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-[14px] flex items-center justify-center shadow-[0_4px_12px_rgba(59,130,246,0.3)] shrink-0 transition-transform hover:scale-105 cursor-default">
            <ShoppingBag size={20} className="text-white" strokeWidth={2.5} />
          </div>
          
          <div className="relative flex-1 flex items-center bg-white dark:bg-[#151518] rounded-[16px] px-3 py-2.5 transition-all shadow-sm border border-gray-200/50 dark:border-gray-800/50 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20">
            <Search className="text-gray-400 dark:text-gray-500 shrink-0" size={18} />
            <input 
              type="text" 
              placeholder="Поиск по товарам и услугам..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent pl-3 pr-8 py-0.5 text-[15px] font-bold focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

        </div>

        <div className="max-w-5xl mx-auto flex overflow-x-auto gap-2 mt-4 pb-1 scrollbar-none">
          {BUSINESS_CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all shadow-sm ${
                activeCategory === category 
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' 
                  : 'bg-white dark:bg-[#151518] text-gray-600 dark:text-gray-300 border border-gray-200/50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {category === 'Популярное' ? <span className="flex items-center gap-1"><Flame size={14} className="text-orange-500" /> {category}</span> : category}
            </button>
          ))}
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+80px)] custom-scrollbar"
        onScroll={handleScroll}
      >
        <div className="max-w-5xl mx-auto p-3 md:p-4">
          
          {!searchQuery && activeCategory === 'Все' && (
            <div className="flex overflow-x-auto lg:grid lg:grid-cols-3 gap-3 md:gap-4 pb-4 mb-2 scrollbar-none snap-x">
              
              <div className="min-w-[280px] sm:min-w-[320px] lg:min-w-0 flex-1 shrink-0 snap-start bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[24px] p-6 text-white shadow-lg shadow-blue-500/20 flex flex-col justify-between relative overflow-hidden group">
                <div className="relative z-10">
                  <span className="bg-white/20 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 inline-block border border-white/20 shadow-sm">Торговая площадка</span>
                  <h3 className="text-[18px] md:text-xl font-black mb-1.5 leading-tight tracking-tight">Экосистема Aura</h3>
                  <p className="text-[13px] font-medium text-blue-100 max-w-[220px] leading-relaxed">
                    Доступ к предложениям от частных лиц и бизнеса. Все товары в одном месте.
                  </p>
                </div>
                <Users size={100} className="absolute -bottom-4 -right-4 text-white opacity-10 group-hover:scale-110 transition-transform duration-500" />
              </div>

              <div className="min-w-[280px] sm:min-w-[320px] lg:min-w-0 flex-1 shrink-0 snap-start bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[24px] p-6 text-white shadow-lg shadow-emerald-500/20 flex flex-col justify-between relative overflow-hidden group">
                <div className="relative z-10">
                  <span className="bg-white/20 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 inline-block border border-white/20 shadow-sm">Безопасность</span>
                  <h3 className="text-[18px] md:text-xl font-black mb-1.5 leading-tight tracking-tight">Прямой Контакт</h3>
                  <p className="text-[13px] font-medium text-emerald-100 max-w-[220px] leading-relaxed">
                    Связывайтесь с продавцами напрямую через защищенные чаты и покупайте в 1 клик.
                  </p>
                </div>
                <ShieldCheck size={100} className="absolute -bottom-4 -right-4 text-white opacity-10 group-hover:scale-110 transition-transform duration-500" />
              </div>

              <div className="min-w-[280px] sm:min-w-[320px] lg:min-w-0 flex-1 shrink-0 snap-start bg-gradient-to-br from-orange-500 to-amber-500 rounded-[24px] p-6 text-white shadow-lg shadow-amber-500/20 flex flex-col justify-between relative overflow-hidden group">
                <div className="relative z-10">
                  <span className="bg-white/20 backdrop-blur-md px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 inline-block border border-white/20 shadow-sm">Бизнесу</span>
                  <h3 className="text-[18px] md:text-xl font-black mb-1.5 leading-tight tracking-tight">Откройте Магазин</h3>
                  <p className="text-[13px] font-medium text-orange-100 max-w-[220px] leading-relaxed">
                    Создайте красивую витрину в настройках профиля и находите клиентов бесплатно.
                  </p>
                </div>
                <Store size={100} className="absolute -bottom-4 -right-4 text-white opacity-10 group-hover:scale-110 transition-transform duration-500" />
              </div>

            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-[#151518] rounded-[24px] p-2 flex flex-col gap-2 animate-pulse border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800/50 rounded-[16px]"></div>
                  <div className="px-2 py-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800/50 rounded-md w-3/4 mb-3"></div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 bg-gray-200 dark:bg-gray-800/50 rounded-full"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-800/50 rounded-md w-1/2"></div>
                    </div>
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800/50">
                      <div className="h-5 bg-gray-200 dark:bg-gray-800/50 rounded-md w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayedProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {displayedProducts.map(product => (
                  <div 
                    key={product.id} 
                    onClick={() => setSelectedProduct(product)}
                    className="bg-white dark:bg-[#151518] rounded-[24px] p-2 flex flex-col border border-gray-100 dark:border-gray-800/50 shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-all cursor-pointer group overflow-hidden"
                  >
                    <div className="relative w-full aspect-square bg-gray-50 dark:bg-gray-900/50 rounded-[16px] overflow-hidden mb-3">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                          <ShoppingBag size={32} />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>
                    
                    {/* Информация в карточке (НИКАКИХ КНОПОК) */}
                    <div className="px-2 flex flex-col flex-1 pb-1">
                      <h3 className="font-bold text-gray-900 dark:text-white text-[13px] sm:text-[14px] leading-snug line-clamp-2 mb-2 group-hover:text-blue-500 transition-colors">
                        {product.name}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 mb-3">
                        <img src={product.shopAvatar} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-700 bg-gray-100" />
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                          {product.shopName}
                        </span>
                        {product.shopRating !== '0' && (
                          <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5 ml-auto bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                            <Star size={10} className="fill-amber-500" /> {product.shopRating}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto pt-2.5 border-t border-gray-100 dark:border-gray-800/50 flex items-center justify-between">
                        <span className="text-[15px] sm:text-[17px] font-black text-gray-900 dark:text-white tracking-tight">
                          {product.price}
                        </span>
                        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {displayLimit < filteredProducts.length && (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-gray-400 dark:text-gray-600" size={24} />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[40vh] text-center px-4 animate-fade-in">
              <div className="w-24 h-24 bg-white dark:bg-[#151518] rounded-[32px] flex items-center justify-center mb-6 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                <Package size={40} className="text-gray-400 dark:text-gray-600" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Ничего не найдено</h2>
              <p className="text-[15px] font-medium text-gray-500 dark:text-gray-400 max-w-[280px]">
                В этой категории пока нет товаров или ваш запрос не дал результатов.
              </p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mt-6 px-6 py-3.5 bg-blue-500 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-blue-500/30">
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
            className="bg-white dark:bg-[#0A0A0B] w-full md:w-[480px] max-h-[95vh] overflow-y-auto custom-scrollbar rounded-t-[32px] md:rounded-[32px] shadow-2xl flex flex-col relative animate-slide-up transition-colors"
            onClick={e => e.stopPropagation()}
          >
            {/* Картинка товара */}
            <div className="relative w-full h-[40vh] md:h-[45vh] bg-gray-50 dark:bg-gray-900/50 shrink-0 md:rounded-t-[32px] overflow-hidden">
              {selectedProduct.imageUrl ? (
                <img src={selectedProduct.imageUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700"><ShoppingBag size={64}/></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-black/20 pointer-events-none" />
              
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md z-10 shadow-sm">
                <X size={20} />
              </button>

              <div className="absolute bottom-4 left-4">
                <span className="bg-white/20 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-xl border border-white/20 shadow-sm flex items-center gap-1.5">
                  <Sparkles size={12} /> {selectedProduct.shopCategory}
                </span>
              </div>
            </div>
            
            <div className="p-6 relative flex flex-col flex-1">
              <div className="flex items-start justify-between gap-4 mb-6">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                  {selectedProduct.name}
                </h2>
                <div className="bg-gradient-to-tr from-blue-500 to-indigo-500 px-4 py-2 rounded-2xl shadow-lg shadow-blue-500/20 shrink-0">
                  <span className="text-lg font-black text-white tracking-tight">{selectedProduct.price}</span>
                </div>
              </div>

              {/* Карточка продавца */}
              <div className="flex flex-col p-4 bg-gray-50 dark:bg-[#151518] rounded-[24px] border border-gray-100 dark:border-gray-800/50 mb-6 group">
                <div className="flex items-center gap-4">
                  <img src={selectedProduct.shopAvatar} className="w-14 h-14 rounded-full object-cover shadow-sm border border-gray-200 dark:border-gray-700 bg-white" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[16px] font-black text-gray-900 dark:text-white flex items-center gap-1.5 truncate">
                      {selectedProduct.shopName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                        <ShieldCheck size={14} className="text-green-500" /> Проверен
                      </p>
                      {selectedProduct.shopRating !== '0' && (
                        <>
                          <span className="text-gray-300 dark:text-gray-700">•</span>
                          <span className="flex items-center gap-1 text-[12px] font-bold text-amber-500">
                            <Star size={12} className="fill-amber-500" /> {selectedProduct.shopRating}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800/50 flex items-center gap-1.5 text-[13px] font-medium text-gray-500 dark:text-gray-400">
                  <MapPin size={14} className="text-blue-500" /> {selectedProduct.shopLocation}
                </div>
              </div>

              {/* Описание */}
              <div className="mb-6">
                <h3 className="text-[13px] font-black text-gray-400 uppercase tracking-widest mb-3">Описание</h3>
                <p className="text-[15px] text-gray-800 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-[#151518] p-5 rounded-[24px] border border-gray-100 dark:border-gray-800/50">
                  {selectedProduct.description || 'Продавец не добавил описание для этого товара.'}
                </p>
              </div>

              {/* УПРОЩЕННЫЕ КНОПКИ ДЕЙСТВИЙ */}
              <div className="mt-auto sticky bottom-0 bg-white/95 dark:bg-[#0A0A0B]/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800/80 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] flex gap-3 z-20">
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    navigate(`/shop/${selectedProduct.shopId}`);
                  }}
                  className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-[20px] font-bold flex justify-center items-center gap-2 transition-colors border border-transparent dark:border-gray-700"
                >
                  <Store size={20} /> Магазин
                </button>

                {selectedProduct.shopId !== user?.uid && (
                  <button 
                    onClick={handleDirectOrder}
                    className="flex-[1.5] py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-[20px] font-black flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-blue-500/25"
                  >
                    <MessageCircle size={20} className="fill-white" /> Заказать
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
