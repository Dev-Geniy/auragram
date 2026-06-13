import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  Phone, Mail, Globe, Package, ArrowLeft, MessageSquare, 
  MapPin, Building2 
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
  contacts?: { phone: string; email: string; website: string };
  products?: Product[];
}

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    fetchShop(); // ИСПРАВЛЕНО: Вызываем правильное имя функции
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#FAFAFA] p-6 md:p-10 animate-pulse">
        <div className="max-w-4xl mx-auto h-[60vh] bg-white rounded-3xl border border-gray-100"></div>
      </div>
    );
  }

  if (!shop || shop.type !== 'business') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#FAFAFA] p-6">
        <Package size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2">Магазин не найден</h2>
        <p className="text-gray-500 mb-6 text-sm">Возможно, этот бизнес был удален или скрыт.</p>
        <button onClick={() => navigate('/market')} className="bg-gray-950 text-white px-6 py-3 rounded-xl font-bold text-sm">
          Вернуться в маркетплейс
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAFAFA] pb-24 select-none custom-scrollbar">
      
      {/* ПЛАВАЮЩИЙ ХЕДЕР С КНОПКОЙ НАЗАД */}
      <div className="sticky top-0 z-30 p-4 md:p-6 pointer-events-none">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-md border border-gray-200/60 shadow-md rounded-2xl flex items-center justify-center text-gray-900 hover:bg-gray-50 transition-all pointer-events-auto active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-10 -mt-16 md:-mt-20">
        
        {/* КАРТОЧКА МАГАЗИНА */}
        <div className="bg-white rounded-[2rem] shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden mb-8">
          
          <div className="relative h-48 md:h-64 bg-gradient-to-tr from-amber-500 to-amber-300 overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '24px 24px' }}></div>
          </div>

          <div className="px-6 md:px-10 pb-8 md:pb-10 relative">
            <div className="flex justify-between items-end -mt-16 md:-mt-20 mb-6">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-white p-1.5 shadow-lg border border-gray-100 relative z-10">
                <img 
                  src={shop.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name)}&background=f59e0b&color=fff`} 
                  alt={shop.name} 
                  className="w-full h-full object-cover rounded-[1.2rem]" 
                />
              </div>
              <Link 
                to="/chats" 
                className="hidden md:flex bg-gray-950 text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-brand transition-all shadow-md active:scale-95 items-center gap-2"
              >
                <MessageSquare size={16} /> Написать продавцу
              </Link>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                  <Building2 size={10} className="inline mr-1 -mt-0.5" /> B2B ПАРТНЕР
                </span>
                <span className="bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                  {shop.category || 'Бизнес'}
                </span>
              </div>
              
              <h1 className="text-2xl md:text-4xl font-black text-gray-950 tracking-tight leading-none mb-3">
                {shop.name}
              </h1>
              
              <p className="text-[11px] md:text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-6">
                <MapPin size={14} className="text-amber-500" /> Глобальный рынок (Verified)
              </p>

              <p className="text-sm md:text-[15px] text-gray-600 font-medium leading-relaxed max-w-2xl whitespace-pre-wrap">
                {shop.role || 'Описание компании не предоставлено.'}
              </p>
            </div>

            {shop.contacts && (shop.contacts.phone || shop.contacts.email || shop.contacts.website) && (
              <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {shop.contacts.phone && (
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-500 shrink-0"><Phone size={18} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Телефон</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{shop.contacts.phone}</p>
                    </div>
                  </div>
                )}
                {shop.contacts.email && (
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-500 shrink-0"><Mail size={18} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Email</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{shop.contacts.email}</p>
                    </div>
                  </div>
                )}
                {shop.contacts.website && (
                  <a href={shop.contacts.website.startsWith('http') ? shop.contacts.website : `https://${shop.contacts.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors p-4 rounded-2xl border border-gray-100 group">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-105 transition-transform"><Globe size={18} /></div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Веб-сайт</p>
                      <p className="text-sm font-bold text-gray-900 truncate">{shop.contacts.website}</p>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ВИТРИНА ТОВАРОВ */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Package size={20} />
            </div>
            <h2 className="text-2xl font-black text-gray-950 tracking-tight">Товары и услуги</h2>
          </div>

          {shop.products && shop.products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {shop.products.map(product => (
                <div key={product.id} className="bg-white border border-gray-200/60 rounded-3xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-[0_10px_30px_rgba(245,158,11,0.08)] hover:border-amber-200 transition-all duration-300 group flex flex-col">
                  <div className="relative h-48 md:h-56 bg-gray-100 overflow-hidden">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-950 px-3 py-1.5 rounded-xl text-[11px] font-black shadow-sm">
                      {product.price}
                    </div>
                  </div>
                  <div className="p-4 md:p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-gray-900 text-sm md:text-base leading-tight line-clamp-2 mb-2 group-hover:text-amber-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-3 font-medium leading-relaxed mt-auto">
                      {product.description || 'Описание отсутствует'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-3xl border border-gray-200/60 border-dashed">
              <Package size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-base font-bold text-gray-900">Витрина пуста</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">Компания пока не добавила товары.</p>
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden fixed bottom-[90px] left-4 right-4 z-40">
        <Link 
          to="/chats" 
          className="w-full bg-gray-950 text-white px-6 py-4 rounded-2xl font-bold text-sm shadow-xl flex justify-center items-center gap-2 active:scale-95 transition-transform"
        >
          <MessageSquare size={18} /> Написать продавцу
        </Link>
      </div>

    </div>
  );
}
