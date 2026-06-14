import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  ArrowLeft, MessageCircle, Share2, 
  Phone, Mail, Globe, Package, Loader2, CheckCircle
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

  // Минималистичная функция Поделиться (Нативный Share API или копирование ссылки)
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

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#F2F2F7] flex justify-center items-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!shop || shop.type !== 'business') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F2F2F7] p-6">
        <Package size={48} className="text-gray-300 mb-4" />
        <h2 className="text-[17px] font-semibold text-gray-900 mb-1">Магазин не найден</h2>
        <p className="text-[14px] text-gray-500 mb-6">Возможно, он был удален.</p>
        <button onClick={() => navigate('/market')} className="text-blue-500 font-medium">
          Вернуться в маркет
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F2F2F7] pb-24 select-none custom-scrollbar relative">
      
      {/* ПЛАВАЮЩИЙ ХЕДЕР С КНОПКОЙ НАЗАД */}
      <div className="sticky top-0 z-20 bg-[#F2F2F7]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-gray-200/60">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium text-[16px] transition-colors"
        >
          <ArrowLeft size={20} /> <span className="hidden sm:inline">Назад</span>
        </button>
        <button 
          onClick={() => handleShare()}
          className="text-blue-500 hover:text-blue-600 transition-colors"
        >
          {isCopied ? <CheckCircle size={22} /> : <Share2 size={22} />}
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        
        {/* КАРТОЧКА ПРОФИЛЯ (Стиль Telegram) */}
        <div className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-sm border border-gray-200/50">
          <img 
            src={shop.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name)}&background=random`} 
            alt={shop.name} 
            loading="lazy" // ЛЕНИВАЯ ЗАГРУЗКА
            className="w-24 h-24 rounded-full object-cover border border-gray-100 mb-4 shadow-sm" 
          />
          <h1 className="text-xl font-bold text-gray-900 leading-tight mb-1">
            {shop.name}
          </h1>
          <p className="text-[14px] text-gray-500 leading-relaxed mb-5 max-w-md">
            {shop.role || 'Описание отсутствует.'}
          </p>

          <div className="flex items-center justify-center gap-3 w-full max-w-xs">
            <Link 
              to="/chats" 
              state={{ selectedUserId: shop.id }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-[15px] flex justify-center items-center gap-2 transition-colors"
            >
              <MessageCircle size={18} /> Написать
            </Link>
          </div>

          {/* Контакты */}
          {shop.contacts && (shop.contacts.phone || shop.contacts.email || shop.contacts.website) && (
            <div className="w-full mt-6 pt-5 border-t border-gray-100 flex flex-col gap-3 text-[14px]">
              {shop.contacts.phone && (
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <Phone size={16} className="text-gray-400" /> {shop.contacts.phone}
                </div>
              )}
              {shop.contacts.email && (
                <div className="flex items-center justify-center gap-2 text-gray-700">
                  <Mail size={16} className="text-gray-400" /> {shop.contacts.email}
                </div>
              )}
              {shop.contacts.website && (
                <a href={shop.contacts.website.startsWith('http') ? shop.contacts.website : `https://${shop.contacts.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-blue-500 hover:underline">
                  <Globe size={16} /> {shop.contacts.website}
                </a>
              )}
            </div>
          )}
        </div>

        {/* ВИТРИНА ТОВАРОВ */}
        <div>
          <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2 mt-4">
            Витрина
          </h2>

          {shop.products && shop.products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {shop.products.map(product => (
                <div key={product.id} className="bg-white border border-gray-200/50 rounded-xl overflow-hidden shadow-sm flex flex-col relative group">
                  
                  {/* Кнопка Поделиться товаром */}
                  <button 
                    onClick={(e) => { e.preventDefault(); handleShare(product); }}
                    className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-gray-500 hover:text-blue-500 shadow-sm transition-colors"
                    title="Поделиться товаром"
                  >
                    <Share2 size={14} />
                  </button>

                  <div className="h-32 sm:h-40 bg-gray-100 relative overflow-hidden shrink-0">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        loading="lazy" // ЛЕНИВАЯ ЗАГРУЗКА
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <Package className="absolute inset-0 m-auto text-gray-300" size={32} />
                    )}
                  </div>
                  
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-medium text-gray-900 text-[13px] leading-tight line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed mb-2">
                      {product.description || 'Нет описания'}
                    </p>
                    <p className="text-[14px] font-bold text-gray-900 mt-auto">
                      {product.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-white rounded-2xl border border-gray-200/50 text-gray-400">
              <Package size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-[14px] font-medium">У продавца пока нет товаров</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
