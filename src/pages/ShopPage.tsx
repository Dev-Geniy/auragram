import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, setDoc, updateDoc, addDoc, serverTimestamp, query, where, documentId } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Phone, Mail, Globe, Package, ArrowLeft, MessageSquare, 
  MapPin, Building2, Share2, X, Search, CheckCircle, RefreshCw, Link2, Users
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
  const { user } = useAuthStore();
  
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Состояния для модального окна "Поделиться"
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareItem, setShareItem] = useState<any>(null); // Хранит данные магазина или товара
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchContact, setSearchContact] = useState('');
  const [sharingStatus, setSharingStatus] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isContactsLoading, setIsContactsLoading] = useState(false);

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

  // Загрузка контактов при открытии модального окна (ОПТИМИЗИРОВАНО)
  const openShareModal = async (item: any, type: 'shop' | 'product') => {
    setShareItem({ ...item, shareType: type });
    setShowShareModal(true);
    
    if (contacts.length === 0 && user) {
      setIsContactsLoading(true);
      try {
        // 1. Ищем все чаты, где участвует текущий пользователь
        const chatsQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', user.uid)
        );
        const chatsSnap = await getDocs(chatsQuery);
        
        // 2. Собираем ID всех собеседников (исключая самого себя)
        const participantIds = new Set<string>();
        chatsSnap.forEach(doc => {
          const data = doc.data();
          if (data.participants && Array.isArray(data.participants)) {
            data.participants.forEach((pId: string) => {
              if (pId !== user.uid) participantIds.add(pId);
            });
          }
        });

        const idsArray = Array.from(participantIds);

        // Если чатов нет вообще, выходим
        if (idsArray.length === 0) {
          setContacts([]);
          setIsContactsLoading(false);
          return;
        }

        // 3. Загружаем профили только найденных собеседников
        const loadedUsers: any[] = [];
        
        // Firestore 'in' query поддерживает максимум 10 элементов.
        // Если собеседников больше 10, разбиваем на чанки
        const chunkSize = 10;
        for (let i = 0; i < idsArray.length; i += chunkSize) {
          const chunk = idsArray.slice(i, i + chunkSize);
          const usersQuery = query(
            collection(db, 'users'),
            where(documentId(), 'in', chunk)
          );
          const usersSnap = await getDocs(usersQuery);
          usersSnap.forEach(d => {
            loadedUsers.push({ id: d.id, ...d.data() });
          });
        }
        
        setContacts(loadedUsers);
      } catch (err) {
        console.error('Ошибка загрузки контактов:', err);
      } finally {
        setIsContactsLoading(false);
      }
    }
  };

  // Копирование универсальной ссылки (база для диплинков)
  const handleCopyLink = () => {
    if (!shareItem) return;
    const baseUrl = window.location.origin;
    const link = shareItem.shareType === 'shop' 
      ? `${baseUrl}/shop/${shop?.id}`
      : `${baseUrl}/shop/${shop?.id}?product=${shareItem.id}`;
      
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Отправка карточки пользователю в чат
  const sendShare = async (targetUser: any) => {
    if (!user) return alert('Пожалуйста, войдите в систему.');
    setSharingStatus(targetUser.id);
    
    try {
      const chatId = [user.uid, targetUser.id].sort().join('_');
      const baseUrl = window.location.origin;
      const link = shareItem.shareType === 'shop' 
        ? `${baseUrl}/shop/${shop?.id}`
        : `${baseUrl}/shop/${shop?.id}?product=${shareItem.id}`;

      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatRef);

      const chatData = {
        participants: [user.uid, targetUser.id],
        updatedAt: serverTimestamp(),
        lastMessage: `Поделился карточкой: ${shareItem.name}`
      };

      // Создаем чат, если его еще нет
      if (!chatSnap.exists()) {
        await setDoc(chatRef, chatData);
      } else {
        await updateDoc(chatRef, chatData);
      }

      // Отправляем структурированное сообщение
      await addDoc(collection(db, 'messages'), {
        chatId: chatId,
        senderId: user.uid,
        receiverId: targetUser.id,
        text: `Поделился: ${shareItem.name}`,
        createdAt: serverTimestamp(),
        type: 'share_card',
        cardData: {
          type: shareItem.shareType,
          title: shareItem.name,
          imageUrl: shareItem.imageUrl || shop?.avatar || '',
          link: link,
          description: shareItem.description || shareItem.role || '',
          price: shareItem.price || ''
        }
      });

      // Имитация успешной отправки для UI
      setTimeout(() => {
        setSharingStatus(null);
        setShowShareModal(false);
      }, 600);

    } catch (err) {
      console.error('Ошибка отправки:', err);
      setSharingStatus(null);
    }
  };

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
      <div className="sticky top-0 z-30 p-4 md:p-6 pointer-events-none flex justify-between items-start max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-md border border-gray-200/60 shadow-md rounded-2xl flex items-center justify-center text-gray-900 hover:bg-gray-50 transition-all pointer-events-auto active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
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
              
              {/* Кнопки Десктоп */}
              <div className="hidden md:flex items-center gap-3">
                <button 
                  onClick={() => openShareModal(shop, 'shop')}
                  className="w-12 h-12 bg-white border border-gray-200 text-gray-900 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                  title="Поделиться магазином"
                >
                  <Share2 size={18} />
                </button>
                <Link 
                  to="/chats" 
                  className="bg-gray-950 text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-brand transition-all shadow-md active:scale-95 items-center gap-2 flex"
                >
                  <MessageSquare size={16} /> Написать продавцу
                </Link>
              </div>
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                <Package size={20} />
              </div>
              <h2 className="text-2xl font-black text-gray-950 tracking-tight">Товары и услуги</h2>
            </div>
          </div>

          {shop.products && shop.products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {shop.products.map(product => (
                <div key={product.id} className="bg-white border border-gray-200/60 rounded-3xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:shadow-[0_10px_30px_rgba(245,158,11,0.08)] hover:border-amber-200 transition-all duration-300 group flex flex-col relative">
                  
                  {/* Кнопка поделиться товаром (Абсолютная позиция на картинке) */}
                  <button 
                    onClick={(e) => { e.preventDefault(); openShareModal(product, 'product'); }}
                    className="absolute top-3 left-3 z-20 w-8 h-8 bg-white/90 backdrop-blur-md border border-white/50 shadow-sm rounded-xl flex items-center justify-center text-gray-700 hover:bg-white hover:text-gray-950 transition-all active:scale-90"
                    title="Поделиться товаром"
                  >
                    <Share2 size={14} />
                  </button>

                  <div className="relative h-48 md:h-56 bg-gray-100 overflow-hidden">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-950 px-3 py-1.5 rounded-xl text-[11px] font-black shadow-sm z-10">
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

      {/* Мобильные кнопки снизу */}
      <div className="md:hidden fixed bottom-[90px] left-4 right-4 z-20 flex items-center gap-3">
        <button 
          onClick={() => openShareModal(shop, 'shop')}
          className="w-14 h-14 bg-white border border-gray-200 shadow-xl rounded-2xl flex items-center justify-center text-gray-900 active:scale-95 transition-transform shrink-0"
        >
          <Share2 size={20} />
        </button>
        <Link 
          to="/chats" 
          className="flex-1 bg-gray-950 text-white h-14 rounded-2xl font-bold text-sm shadow-xl flex justify-center items-center gap-2 active:scale-95 transition-transform"
        >
          <MessageSquare size={18} /> Написать продавцу
        </Link>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ПОДЕЛИТЬСЯ (Glassmorphism) */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-0 animate-fade-in">
          <div 
            className="bg-white/95 backdrop-blur-xl w-full max-w-md rounded-[2rem] overflow-hidden flex flex-col shadow-2xl border border-white/20 transform transition-all"
            style={{ maxHeight: '85vh' }}
          >
            {/* Шапка модалки */}
            <div className="p-5 md:p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <Share2 size={20} className="text-amber-500"/> Поделиться
              </h3>
              <button 
                onClick={() => setShowShareModal(false)} 
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <X size={16}/>
              </button>
            </div>

            {/* Блок копирования ссылки */}
            <div className="p-5 border-b border-gray-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200/50">
                  <img 
                    src={shareItem?.imageUrl || shareItem?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(shareItem?.name || '')}&background=random`} 
                    alt="preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    {shareItem?.shareType === 'shop' ? 'Магазин' : 'Товар'}
                  </p>
                  <p className="text-sm font-bold text-gray-900 truncate">{shareItem?.name}</p>
                </div>
                <button 
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${isCopied ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {isCopied ? <><CheckCircle size={14}/> Скопировано</> : <><Link2 size={14}/> Ссылка</>}
                </button>
              </div>
            </div>

            {/* Поиск контактов */}
            <div className="p-4 border-b border-gray-50 shrink-0 bg-gray-50/50">
              <div className="bg-white flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 focus-within:border-gray-400 focus-within:ring-4 focus-within:ring-gray-100 transition-all">
                <Search size={18} className="text-gray-400 shrink-0"/>
                <input 
                  type="text" 
                  placeholder="Найти диалог..." 
                  className="bg-transparent outline-none text-sm w-full font-medium text-gray-900 placeholder:text-gray-400" 
                  value={searchContact} 
                  onChange={e => setSearchContact(e.target.value)} 
                />
              </div>
            </div>

            {/* Список контактов (ТЕПЕРЬ ТОЛЬКО ИЗ ЧАТОВ) */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar relative">
              {isContactsLoading ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <RefreshCw size={24} className="animate-spin mb-2 opacity-50" />
                  <p className="text-xs font-medium">Загрузка ваших чатов...</p>
                </div>
              ) : contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-center px-4">
                  <Users size={32} className="mb-2 opacity-30" />
                  <p className="text-xs font-medium">У вас пока нет активных диалогов.<br/>Сначала напишите кому-нибудь.</p>
                </div>
              ) : (
                contacts
                  .filter(c => c.name?.toLowerCase().includes(searchContact.toLowerCase()))
                  .map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-3 hover:bg-gray-50/80 rounded-2xl transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`} 
                          alt={contact.name}
                          className="w-10 h-10 rounded-xl object-cover border border-gray-100" 
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-gray-900 block truncate">{contact.name}</span>
                          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                            {contact.type === 'business' ? 'Бизнес' : 'Пользователь'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => sendShare(contact)} 
                        disabled={sharingStatus === contact.id} 
                        className={`px-4 py-2 rounded-xl text-xs font-bold w-24 flex justify-center transition-all ${sharingStatus === contact.id ? 'bg-amber-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-800 opacity-0 group-hover:opacity-100 md:opacity-100'}`}
                      >
                        {sharingStatus === contact.id ? <RefreshCw className="animate-spin" size={14}/> : 'Отправить'}
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
