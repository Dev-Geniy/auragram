import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useCartStore } from '../store/useCartStore'; // Подключаем корзину
import { 
  ArrowLeft, MessageCircle, Share2, 
  Phone, Mail, Globe, Package, Loader2, CheckCircle,
  ShoppingCart, Plus, Minus
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
  contacts?: { phone: string; email: string; website: string };
  products?: Product[];
}

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // Извлекаем методы корзины
  const { items, addItem, removeItem, getItemsByShop } = useCartStore();
  
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
      text: item ? item.description : 'Посмотри этот магазин!',
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

  // Переход в чат с передачей данных корзины
  const handleCheckout = () => {
    navigate('/chats', { 
      state: { 
        selectedUserId: shop?.id, 
        checkoutCart: shopCartItems // Передаем корзину в чат!
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
        <Package size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white mb-1">Магазин не найден</h2>
        <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6">Возможно, он был удален.</p>
        <button onClick={() => navigate('/market')} className="text-blue-500 font-medium hover:text-blue-400 transition-colors">
          Вернуться в маркет
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F2F2F7] dark:bg-gray-950 pb-32 select-none custom-scrollbar relative transition-colors">
      
      {/* ПЛАВАЮЩИЙ ХЕДЕР */}
      <div className="sticky top-0 z-20 bg-[#F2F2F7]/90 dark:bg-gray-950/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-gray-200/60 dark:border-gray-800 transition-colors">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-[16px] transition-colors"
        >
          <ArrowLeft size={20} /> <span className="hidden sm:inline">Назад</span>
        </button>
        <button 
          onClick={() => handleShare()}
          className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {isCopied ? <CheckCircle size={22} /> : <Share2 size={22} />}
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        
        {/* КАРТОЧКА ПРОФИЛЯ */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 flex flex-col items-center text-center shadow-sm border border-gray-200/50 dark:border-gray-800 transition-colors">
          <img 
            src={shop.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name)}&background=random`} 
            alt={shop.name} 
            loading="lazy"
            className="w-24 h-24 rounded-full object-cover border border-gray-100 dark:border-gray-800 mb-4 shadow-sm transition-colors" 
          />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-1 transition-colors">
            {shop.name}
          </h1>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed mb-5 max-w-md transition-colors">
            {shop.role || 'Описание отсутствует.'}
          </p>

          <div className="flex items-center justify-center gap-3 w-full max-w-xs">
            <Link 
              to="/chats" 
              state={{ selectedUserId: shop.id }}
              className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-2.5 rounded-xl font-semibold text-[15px] flex justify-center items-center gap-2 transition-colors"
            >
              <MessageCircle size={18} /> Написать
            </Link>
          </div>

          {/* Контакты */}
          {shop.contacts && (shop.contacts.phone || shop.contacts.email || shop.contacts.website) && (
            <div className="w-full mt-6 pt-5 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3 text-[14px] transition-colors">
              {shop.contacts.phone && (
                <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                  <Phone size={16} className="text-gray-400 dark:text-gray-500" /> {shop.contacts.phone}
                </div>
              )}
              {shop.contacts.email && (
                <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300">
                  <Mail size={16} className="text-gray-400 dark:text-gray-500" /> {shop.contacts.email}
                </div>
              )}
              {shop.contacts.website && (
                <a href={shop.contacts.website.startsWith('http') ? shop.contacts.website : `https://${shop.contacts.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-blue-500 hover:text-blue-400 hover:underline transition-colors">
                  <Globe size={16} /> {shop.contacts.website}
                </a>
              )}
            </div>
          )}
        </div>

        {/* ВИТРИНА ТОВАРОВ */}
        <div>
          <h2 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2 mb-2 mt-4 transition-colors">
            Витрина
          </h2>

          {shop.products && shop.products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {shop.products.map(product => {
                const cartItem = shopCartItems.find(item => item.id === product.id);
                const quantityInCart = cartItem ? cartItem.quantity : 0;

                return (
                  <div key={product.id} className="bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm flex flex-col relative group transition-colors">
                    
                    {/* Кнопка Поделиться */}
                    <button 
                      onClick={(e) => { e.preventDefault(); handleShare(product); }}
                      className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 shadow-sm transition-colors"
                    >
                      <Share2 size={14} />
                    </button>

                    <div className="h-32 sm:h-40 bg-gray-100 dark:bg-gray-800 relative overflow-hidden shrink-0 transition-colors">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="absolute inset-0 m-auto text-gray-300 dark:text-gray-600" size={32} />
                      )}
                    </div>
                    
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white text-[13px] leading-tight line-clamp-2 mb-1 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-[14px] font-bold text-gray-900 dark:text-white mt-auto mb-2 transition-colors">
                        {product.price}
                      </p>

                      {/* КНОПКА КОРЗИНЫ */}
                      {quantityInCart > 0 ? (
                        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 rounded-lg p-1 border border-blue-100 dark:border-blue-800/50 transition-colors">
                          <button onClick={() => removeItem(product.id)} className="w-7 h-7 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-gray-800 rounded-md shadow-sm transition-colors"><Minus size={14}/></button>
                          <span className="font-bold text-[13px] text-blue-700 dark:text-blue-300">{quantityInCart} шт</span>
                          <button onClick={() => addItem(product, shop.id, shop.name)} className="w-7 h-7 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-gray-800 rounded-md shadow-sm transition-colors"><Plus size={14}/></button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addItem(product, shop.id, shop.name)}
                          className="w-full flex items-center justify-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
                        >
                          <ShoppingCart size={14} /> В корзину
                        </button>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/50 dark:border-gray-800 text-gray-400 dark:text-gray-500 transition-colors">
              <Package size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-[14px] font-medium">У продавца пока нет товаров</p>
            </div>
          )}
        </div>

      </div>

      {/* ПЛАВАЮЩАЯ ПАНЕЛЬ ЗАКАЗА (Отображается, если в корзине магазина есть товары) */}
      {cartTotalItems > 0 && (
        <div className="fixed bottom-[80px] md:bottom-6 left-0 right-0 px-4 flex justify-center z-40 animate-fade-in">
          <button 
            onClick={handleCheckout}
            className="w-full max-w-sm bg-blue-500 hover:bg-blue-600 text-white shadow-[0_8px_30px_rgba(59,130,246,0.3)] rounded-2xl px-6 py-4 flex items-center justify-between transition-transform active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <ShoppingCart size={16} className="text-white" />
              </div>
              <span className="font-bold text-[15px]">Оформить заказ</span>
            </div>
            <span className="font-black text-[15px] bg-white text-blue-600 px-3 py-1 rounded-lg">
              {cartTotalItems} шт
            </span>
          </button>
        </div>
      )}

    </div>
  );
}
