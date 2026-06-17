import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { 
  MessageCircle, Phone, Mail, 
  Package, Loader2, CheckCircle, ShoppingCart, 
  Plus, Minus, MapPin, Sparkles, LogIn, Link2
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
}

interface ShopProfile {
  id: string;
  name: string;
  role: string;
  avatar: string;
  type: string;
  category?: string;
  location?: string;
  customUrl?: string;
  contacts?: { phone: string; email: string; website: string };
  products?: Product[];
}

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // Извлекаем методы корзины
  const { addItem, removeItem, getItemsByShop } = useCartStore();
  
  // Товары в корзине ТОЛЬКО для этого магазина
  const shopCartItems = shop?.id ? getItemsByShop(shop.id) : [];
  const cartTotalItems = shopCartItems.reduce((sum, item) => sum + item.quantity, 0);

  // ==========================================
  // 1. ЗАГРУЗКА МАГАЗИНА (ПО ID ИЛИ КРАСИВОЙ ССЫЛКЕ)
  // ==========================================
  useEffect(() => {
    const fetchShop = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().type === 'business') {
          setShop({ id: docSnap.id, ...docSnap.data() } as ShopProfile);
        } else {
          const q = query(collection(db, 'users'), where('customUrl', '==', id.toLowerCase()), where('type', '==', 'business'));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const shopDoc = querySnapshot.docs[0];
            setShop({ id: shopDoc.id, ...shopDoc.data() } as ShopProfile);
          } else {
            setShop(null);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки магазина:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShop();
  }, [id]);

  // ==========================================
  // 2. БАЗОВОЕ SEO (Меняем заголовок вкладки)
  // ==========================================
  useEffect(() => {
    if (shop) {
      document.title = `${shop.name} | Aura Store`;
    } else {
      document.title = `Магазин | Aura`;
    }
  }, [shop]);

  // ==========================================
  // 3. ФУНКЦИИ И ДЕЙСТВИЯ
  // ==========================================
  const handleShare = async () => {
    const baseUrl = window.location.origin;
    const shopLink = shop?.customUrl || shop?.id; 
    const link = `${baseUrl}/#/shop/${shopLink}`;
    
    const shareData = {
      title: shop?.name,
      text: `Посетите интернет-магазин ${shop?.name}!`,
      url: link,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Поделиться отменено', err);
      }
    } else {
      navigator.clipboard.writeText(link);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // УМНАЯ КНОПКА: Если гость — на логин, если свой — в чат
  const handleRequireAuthAction = (action: () => void) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
    } else {
      action();
    }
  };

  const handleCheckout = () => {
    handleRequireAuthAction(() => {
      navigate('/chats', { 
        state: { 
          selectedUserId: shop?.id, 
          checkoutCart: shopCartItems
        } 
      });
    });
  };

  const handleContactSeller = () => {
    handleRequireAuthAction(() => {
      navigate('/chats', { state: { selectedUserId: shop?.id } });
    });
  };

  // ==========================================
  // 4. РЕНДЕР
  // ==========================================
  if (isLoading) {
    return (
      <div className="flex-1 bg-[#F5F5F7] dark:bg-[#0A0A0B] flex justify-center items-center transition-colors h-[100dvh]">
        <Loader2 className="animate-spin text-blue-500" size={36} />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F5F5F7] dark:bg-[#0A0A0B] p-6 transition-colors h-[100dvh]">
        <div className="w-28 h-28 bg-gray-200 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-100 dark:border-gray-800">
          <Package size={48} className="text-gray-400 dark:text-gray-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Магазин не найден</h2>
        <p className="text-[15px] font-medium text-gray-500 dark:text-gray-400 mb-8 text-center max-w-sm leading-relaxed">
          Возможно, ссылка устарела, либо продавец приостановил свою деятельность.
        </p>
        <button onClick={() => navigate('/market')} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black active:scale-95 transition-all shadow-xl shadow-blue-500/20 text-[15px]">
          В каталог магазинов
        </button>
      </div>
    );
  }

  const isMyOwnShop = user?.uid === shop.id;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F5F7] dark:bg-[#0A0A0B] pb-[calc(env(safe-area-inset-bottom)+100px)] select-none custom-scrollbar relative transition-colors min-h-[100dvh]">
      
      {/* ИНТЕРНЕТ-МАГАЗИН: ТОНКИЙ HEADER */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl px-4 py-2.5 pt-[calc(env(safe-area-inset-top)+8px)] flex items-center justify-between border-b border-gray-200/60 dark:border-gray-800 transition-colors shadow-sm">
        
        {/* Левая часть: Логотип и Название */}
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <img 
            src={shop.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name)}&background=random`} 
            alt={shop.name} 
            loading="lazy"
            className="w-10 h-10 rounded-[12px] object-cover border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0 shadow-sm" 
          />
          <h1 className="text-[16px] md:text-[18px] font-black text-gray-900 dark:text-white truncate">
            {shop.name}
          </h1>
        </div>

        {/* Правая часть: Контакты и Действия */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Телефон (если указан) */}
          {shop.contacts?.phone && (
            <a href={`tel:${shop.contacts.phone}`} className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-green-50 dark:bg-gray-800 dark:hover:bg-green-500/20 text-gray-600 hover:text-green-500 dark:text-gray-300 dark:hover:text-green-400 rounded-full transition-colors">
              <Phone size={16} />
            </a>
          )}
          
          {/* Почта (если указана) */}
          {shop.contacts?.email && (
            <a href={`mailto:${shop.contacts.email}`} className="hidden sm:flex w-9 h-9 items-center justify-center bg-gray-100 hover:bg-orange-50 dark:bg-gray-800 dark:hover:bg-orange-500/20 text-gray-600 hover:text-orange-500 dark:text-gray-300 dark:hover:text-orange-400 rounded-full transition-colors">
              <Mail size={16} />
            </a>
          )}

          {/* Написать (Если это не наш собственный магазин) */}
          {!isMyOwnShop && (
            <button 
              onClick={handleContactSeller}
              className="w-9 h-9 flex items-center justify-center bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-blue-500 rounded-full transition-colors"
              title={user ? "Написать" : "Войти, чтобы написать"}
            >
              {user ? <MessageCircle size={18} className="fill-current" /> : <LogIn size={18} />}
            </button>
          )}

          {/* Поделиться (Копировать ссылку) */}
          <button 
            onClick={handleShare}
            className="w-9 h-9 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors ml-1"
          >
            {isCopied ? <CheckCircle size={18} className="text-green-500" /> : <Link2 size={18} />}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 w-full mt-4">
        
        {/* ИНФОРМАЦИЯ О МАГАЗИНЕ (ОПЦИОНАЛЬНО) */}
        {(shop.role || shop.category || shop.location) && (
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
              {shop.category && (
                <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[12px] font-bold px-3 py-1 rounded-lg border border-blue-100/50 dark:border-blue-900/30 flex items-center gap-1.5">
                  <Sparkles size={12} /> {shop.category}
                </span>
              )}
              {shop.location && (
                <span className="bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 text-[12px] font-bold px-3 py-1 rounded-lg border border-gray-200/50 dark:border-gray-700/50 flex items-center gap-1.5">
                  <MapPin size={12} /> {shop.location}
                </span>
              )}
            </div>
            {shop.role && (
              <p className="text-[14px] text-gray-500 dark:text-gray-400 max-w-2xl px-2 leading-relaxed">
                {shop.role}
              </p>
            )}
          </div>
        )}

        {/* ВИТРИНА ТОВАРОВ */}
        <div className="flex items-center justify-between mb-4 mt-2 px-1">
          <h2 className="text-[16px] font-black text-gray-900 dark:text-white tracking-widest uppercase">
            Витрина товаров
          </h2>
          <span className="text-[12px] font-bold text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-800 px-3 py-1 rounded-full">
            {shop.products?.length || 0}
          </span>
        </div>

        {shop.products && shop.products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {shop.products.map(product => {
              const cartItem = shopCartItems.find(item => item.id === product.id);
              const quantityInCart = cartItem ? cartItem.quantity : 0;

              return (
                <div key={product.id} className="bg-white dark:bg-[#151518] rounded-[24px] p-2 flex flex-col border border-gray-100 dark:border-gray-800/50 shadow-sm transition-all group overflow-hidden">
                  
                  {/* Изображение товара */}
                  <div className="relative w-full aspect-square bg-gray-50 dark:bg-gray-900/50 rounded-[16px] overflow-hidden mb-3 shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <Package className="absolute inset-0 m-auto text-gray-300 dark:text-gray-700" size={32} />
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                  
                  {/* Информация */}
                  <div className="px-2 flex flex-col flex-1 pb-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-[13px] sm:text-[14px] leading-snug line-clamp-2 mb-1.5">
                      {product.name}
                    </h3>
                    <span className="text-[15px] sm:text-[16px] font-black text-gray-900 dark:text-white tracking-tight mb-3">
                      {product.price}
                    </span>
                    
                    {/* Управление корзиной (Full Width Button) */}
                    <div className="mt-auto">
                      {!isMyOwnShop && (
                        quantityInCart > 0 ? (
                          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-500/10 rounded-xl p-1.5 border border-blue-100 dark:border-blue-900/30">
                            <button onClick={() => removeItem(product.id)} className="w-8 h-8 flex items-center justify-center text-blue-600 dark:text-blue-400 bg-white dark:bg-[#1A1C23] rounded-[10px] shadow-sm active:scale-95 transition-all"><Minus size={16}/></button>
                            <span className="font-black text-[14px] text-blue-700 dark:text-blue-300">{quantityInCart}</span>
                            <button onClick={() => handleRequireAuthAction(() => addItem(product, shop.id, shop.name))} className="w-8 h-8 flex items-center justify-center text-blue-600 dark:text-blue-400 bg-white dark:bg-[#1A1C23] rounded-[10px] shadow-sm active:scale-95 transition-all"><Plus size={16}/></button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleRequireAuthAction(() => addItem(product, shop.id, shop.name))}
                            className="w-full flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl text-[13px] font-bold transition-transform active:scale-[0.98] shadow-md shadow-blue-500/20"
                          >
                            <ShoppingCart size={16} className="fill-current" /> {user ? 'В корзину' : 'Войти для заказа'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center bg-white dark:bg-[#151518] rounded-[32px] border border-gray-100 dark:border-gray-800/50 text-gray-400 dark:text-gray-500 transition-colors flex flex-col items-center shadow-sm">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mb-4">
              <Package size={32} className="opacity-50" />
            </div>
            <h3 className="text-[18px] font-black text-gray-900 dark:text-white mb-1">Витрина пуста</h3>
            <p className="text-[14px] font-medium max-w-[200px]">В этом магазине пока нет товаров.</p>
          </div>
        )}
      </div>

      {/* ПЛАВАЮЩАЯ ПАНЕЛЬ ЗАКАЗА (Отображается, если в корзине магазина есть товары) */}
      {cartTotalItems > 0 && !isMyOwnShop && user && (
        <div className="fixed bottom-[80px] md:bottom-6 left-0 right-0 px-4 flex justify-center z-50 animate-slide-up">
          <button 
            onClick={handleCheckout}
            className="w-full max-w-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-[0_20px_40px_rgba(59,130,246,0.4)] rounded-[24px] px-6 py-4 flex items-center justify-between transition-transform active:scale-95 border border-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
                <ShoppingCart size={20} className="text-white fill-white" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-black text-[18px] leading-tight">Оформить заказ</span>
                <span className="font-medium text-[13px] text-blue-100">Перейти в чат</span>
              </div>
            </div>
            <div className="flex items-center justify-center bg-white text-blue-600 min-w-[40px] h-10 px-3 rounded-[14px] font-black text-[16px] shadow-sm">
              {cartTotalItems}
            </div>
          </button>
        </div>
      )}

    </div>
  );
}
