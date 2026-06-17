import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { 
  ArrowLeft, MessageCircle, Share2, 
  Phone, Mail, Globe, Package, Loader2, CheckCircle,
  ShoppingCart, Plus, Minus, ShieldCheck, MapPin, Sparkles, Store
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
  contacts?: { phone: string; email: string; website: string };
  products?: Product[];
}

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // Извлекаем методы корзины
  const { addItem, removeItem, getItemsByShop } = useCartStore();
  
  // Товары в корзине ТОЛЬКО для этого магазина
  const shopCartItems = id ? getItemsByShop(id) : [];
  const cartTotalItems = shopCartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const fetchShop = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setShop({ id: docSnap.id, ...docSnap.data() } as ShopProfile);
        }
      } catch (error) {
        console.error('Ошибка загрузки магазина:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShop();
  }, [id]);

  const handleShare = async (item?: Product) => {
    const baseUrl = window.location.origin;
    const link = item 
      ? `${baseUrl}/#/shop/${shop?.id}?product=${item.id}` 
      : `${baseUrl}/#/shop/${shop?.id}`;
    
    const shareData = {
      title: item ? item.name : shop?.name,
      text: item ? item.description : 'Посмотри этот магазин в Aura!',
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

  const handleCheckout = () => {
    navigate('/chats', { 
      state: { 
        selectedUserId: shop?.id, 
        checkoutCart: shopCartItems
      } 
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#F2F2F7] dark:bg-gray-950 flex justify-center items-center transition-colors">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!shop || shop.type !== 'business') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-gray-950 p-6 transition-colors">
        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
          <Package size={40} className="text-gray-400 dark:text-gray-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Магазин не найден</h2>
        <p className="text-[15px] font-medium text-gray-500 dark:text-gray-400 mb-8 text-center max-w-xs">
          Возможно, он был удален или продавец изменил тип аккаунта.
        </p>
        <button onClick={() => navigate('/market')} className="bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold active:scale-95 transition-transform shadow-lg shadow-blue-500/30">
          Вернуться в маркет
        </button>
      </div>
    );
  }

  const isMyOwnShop = user?.uid === shop.id;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 pb-32 select-none custom-scrollbar relative transition-colors">
      
      {/* ПЛАВАЮЩИЙ УЛЬТРА-МИНИМАЛИСТИЧНЫЙ ХЕДЕР */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)] flex items-center justify-between border-b border-gray-200/60 dark:border-gray-800 transition-colors shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-[16px] font-black text-gray-900 dark:text-white truncate max-w-[200px]">
          {shop.name}
        </h2>
        <button 
          onClick={() => handleShare()}
          className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center transition-colors shadow-sm"
        >
          {isCopied ? <CheckCircle size={20} /> : <Share2 size={20} />}
        </button>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* КАРТОЧКА ПРОФИЛЯ МАГАЗИНА */}
        <div className="bg-white dark:bg-gray-900 rounded-[32px] flex flex-col items-center text-center shadow-sm border border-gray-200/50 dark:border-gray-800 transition-colors overflow-hidden relative">
          
          {/* Обложка-градиент */}
          <div className="w-full h-32 md:h-40 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 absolute top-0 left-0 z-0" />

          {/* Аватарка */}
          <div className="relative mt-16 md:mt-24 mb-4 z-10">
            <img 
              src={shop.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name)}&background=random`} 
              alt={shop.name} 
              loading="lazy"
              className="w-28 h-28 md:w-32 md:h-32 rounded-[24px] object-cover border-4 border-white dark:border-gray-900 shadow-xl transition-colors bg-white dark:bg-gray-800" 
            />
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-[3px] border-white dark:border-gray-900 shadow-sm" title="Проверенный продавец">
              <ShieldCheck size={18} />
            </div>
          </div>

          <div className="px-6 pb-8 relative z-10 w-full flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight mb-3 tracking-tight transition-colors">
              {shop.name}
            </h1>

            {/* Теги магазина (Категория + Локация) */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
              <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[12px] font-bold px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/50 flex items-center gap-1.5 shadow-sm">
                <Sparkles size={14} /> {shop.category || 'Без категории'}
              </span>
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[12px] font-bold px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 shadow-sm">
                <MapPin size={14} /> {shop.location || 'Онлайн-магазин'}
              </span>
            </div>

            <p className="text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed font-medium bg-gray-50 dark:bg-gray-800/50 p-4 md:p-5 rounded-[24px] mb-6 max-w-lg border border-gray-100 dark:border-gray-800/50">
              {shop.role || 'Продавец еще не добавил описание своего магазина.'}
            </p>

            {/* Контакты и Действия (Smart Buttons) */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {!isMyOwnShop ? (
                <button 
                  onClick={() => navigate('/chats', { state: { selectedUserId: shop.id } })}
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-105 py-3.5 px-6 rounded-2xl font-black text-[14px] flex items-center gap-2 transition-transform shadow-lg shadow-black/10 dark:shadow-white/10"
                >
                  <MessageCircle size={20} className="fill-current" /> Написать
                </button>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 py-3.5 px-6 rounded-2xl font-bold text-[14px] flex items-center gap-2 border border-gray-200 dark:border-gray-700 cursor-not-allowed">
                  <Store size={20} /> Это ваш магазин
                </div>
              )}
              
              {/* Круглые иконки контактов */}
              {shop.contacts?.phone && (
                <a href={`tel:${shop.contacts.phone}`} className="w-12 h-12 bg-green-50 hover:bg-green-100 dark:bg-green-500/10 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 shadow-sm border border-green-100 dark:border-green-900/30">
                  <Phone size={20} />
                </a>
              )}
              {shop.contacts?.email && (
                <a href={`mailto:${shop.contacts.email}`} className="w-12 h-12 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 shadow-sm border border-orange-100 dark:border-orange-900/30">
                  <Mail size={20} />
                </a>
              )}
              {shop.contacts?.website && (
                <a href={shop.contacts.website.startsWith('http') ? shop.contacts.website : `https://${shop.contacts.website}`} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 shadow-sm border border-blue-100 dark:border-blue-900/30">
                  <Globe size={20} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ВИТРИНА ТОВАРОВ */}
        <div>
          <div className="flex items-center justify-between mb-4 mt-8 px-1">
            <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight uppercase">
              Витрина товаров
            </h2>
            <span className="text-[12px] font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">
              {shop.products?.length || 0}
            </span>
          </div>

          {shop.products && shop.products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {shop.products.map(product => {
                const cartItem = shopCartItems.find(item => item.id === product.id);
                const quantityInCart = cartItem ? cartItem.quantity : 0;

                return (
                  <div key={product.id} className="bg-white dark:bg-gray-900 rounded-[24px] p-2 flex flex-col border border-gray-100 dark:border-gray-800 shadow-sm transition-all group">
                    
                    {/* Изображение товара */}
                    <div className="relative w-full aspect-square bg-gray-50 dark:bg-gray-800 rounded-[16px] overflow-hidden mb-2 shrink-0 transition-colors">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <Package className="absolute inset-0 m-auto text-gray-300 dark:text-gray-600" size={32} />
                      )}
                      
                      {/* Кнопка Поделиться на фото */}
                      <button 
                        onClick={(e) => { e.preventDefault(); handleShare(product); }}
                        className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 shadow-sm transition-transform active:scale-95"
                      >
                        <Share2 size={14} />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>
                    
                    {/* Информация и корзина */}
                    <div className="px-1 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-900 dark:text-white text-[13px] sm:text-[14px] leading-snug line-clamp-2 mb-1 transition-colors">
                        {product.name}
                      </h3>
                      
                      {/* Цена и управление */}
                      <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2">
                        <span className="text-[15px] sm:text-[16px] font-black text-gray-900 dark:text-white tracking-tight">
                          {product.price}
                        </span>

                        {!isMyOwnShop && (
                          quantityInCart > 0 ? (
                            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 rounded-xl p-1 border border-blue-100 dark:border-blue-800/50 transition-colors">
                              <button onClick={() => removeItem(product.id)} className="w-8 h-8 flex items-center justify-center text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 rounded-lg shadow-sm active:scale-95 transition-all"><Minus size={14}/></button>
                              <span className="font-black text-[14px] text-blue-700 dark:text-blue-300">{quantityInCart} шт</span>
                              <button onClick={() => addItem(product, shop.id, shop.name)} className="w-8 h-8 flex items-center justify-center text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 rounded-lg shadow-sm active:scale-95 transition-all"><Plus size={14}/></button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => addItem(product, shop.id, shop.name)}
                              className="w-full flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-[13px] font-bold transition-transform active:scale-95 shadow-sm shadow-blue-500/20"
                            >
                              <ShoppingCart size={16} className="fill-current" /> В корзину
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
            <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-[32px] border border-gray-200/50 dark:border-gray-800 border-dashed text-gray-400 dark:text-gray-500 transition-colors flex flex-col items-center shadow-sm">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Package size={32} className="opacity-50" />
              </div>
              <h3 className="text-[18px] font-black text-gray-900 dark:text-white mb-1">Витрина пуста</h3>
              <p className="text-[14px] font-medium max-w-[200px]">Продавец пока не добавил ни одного товара.</p>
            </div>
          )}
        </div>

      </div>

      {/* ПЛАВАЮЩАЯ ПАНЕЛЬ ЗАКАЗА (Отображается, если в корзине магазина есть товары) */}
      {cartTotalItems > 0 && !isMyOwnShop && (
        <div className="fixed bottom-[80px] md:bottom-6 left-0 right-0 px-4 flex justify-center z-40 animate-slide-up">
          <button 
            onClick={handleCheckout}
            className="w-full max-w-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-[0_16px_40px_rgba(59,130,246,0.4)] rounded-[24px] px-6 py-4 flex items-center justify-between transition-transform active:scale-95 border border-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
                <ShoppingCart size={20} className="text-white fill-white" />
              </div>
              <div className="flex flex-col items-start">
                <span className="font-black text-[18px] leading-tight">Оформить заказ</span>
                <span className="font-medium text-[13px] text-blue-100">Перейти в чат</span>
              </div>
            </div>
            <div className="flex items-center justify-center bg-white text-blue-600 min-w-[40px] h-10 px-3 rounded-xl font-black text-[16px] shadow-sm">
              {cartTotalItems}
            </div>
          </button>
        </div>
      )}

    </div>
  );
}
