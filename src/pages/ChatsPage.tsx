import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { 
  Send, Search, X, ShieldCheck, 
  Loader2, Paperclip, Check, CheckCheck, 
  Bookmark, ArrowLeft, Image as ExternalLink,
  Trash2, ShoppingBag, Truck, CheckCircle2, Package, 
  Bot, Sparkles, Users // Добавили иконку Users для папки клиентов
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  type: string;
  isSaved?: boolean;
}

interface Message {
  id: string;
  text: string;
  imageUrl?: string;
  senderId: string;
  receiverId: string;
  createdAt: any;
  isRead?: boolean;
  type?: 'share_card' | 'order_receipt' | 'system_status' | string;
  cardData?: any;
  orderData?: any;
  statusText?: string;
}

// -----------------------------------------------------
// ФУНКЦИИ СЖАТИЯ И ЗАГРУЗКИ
// -----------------------------------------------------
const compressImage = (file: File, maxWidth: number = 800): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        const width = img.width > maxWidth ? maxWidth : img.width;
        const height = img.width > maxWidth ? img.height * scaleSize : img.height;
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
            resolve(newFile);
          } else {
            reject(new Error('Ошибка сжатия'));
          }
        }, 'image/jpeg', 0.8);
      };
    };
    reader.onerror = error => reject(error);
  });
};

const uploadToImgBB = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);
  const API_KEY = '22de10db6eb1f3ec3fca012dcc566961'; 
  
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error('Ошибка загрузки');
};

// -----------------------------------------------------
// КОМПОНЕНТ ДЛЯ СВАЙПОВ
// -----------------------------------------------------
const SwipeableContact = ({ 
  contact, isSelected, onClick, onHide, onMarkRead 
}: { 
  contact: UserProfile, isSelected: boolean, onClick: () => void, onHide: (id: string) => void, onMarkRead: (id: string) => void 
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    if (diff > 80) setOffsetX(80);
    else if (diff < -80) setOffsetX(-80);
    else setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (offsetX > 60) {
      onMarkRead(contact.id); 
    } else if (offsetX < -60) {
      onHide(contact.id); 
    }
    setOffsetX(0); 
  };

  return (
    <div className="relative w-full overflow-hidden bg-[#F2F2F7] dark:bg-gray-950">
      <div className="absolute inset-0 flex justify-between">
        <div className={`w-1/2 bg-blue-50 flex items-center pl-4 text-white transition-opacity ${offsetX > 0 ? 'opacity-100' : 'opacity-0'}`}>
          <CheckCheck size={24} className="text-blue-500" />
        </div>
        <div className={`w-1/2 bg-red-50 flex items-center justify-end pr-4 text-white transition-opacity ${offsetX < 0 ? 'opacity-100' : 'opacity-0'}`}>
          <Trash2 size={24} className="text-red-500" />
        </div>
      </div>

      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={onClick}
        style={{ transform: `translateX(${offsetX}px)` }}
        className={`relative z-10 flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'bg-blue-500 text-white' 
            : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white'
        }`}
      >
        {contact.isSaved ? (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-500 text-white'}`}>
            <Bookmark size={20} />
          </div>
        ) : (
          <img 
            src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`} 
            alt={contact.name} 
            loading="lazy"
            className="w-12 h-12 rounded-full object-cover shrink-0 bg-gray-100 dark:bg-gray-800" 
          />
        )}
        
        <div className="flex-1 min-w-0 border-b border-gray-100/50 dark:border-gray-800/50 pb-2">
          <h4 className={`font-semibold text-[15px] truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            {contact.name}
          </h4>
          <p className={`text-[13px] truncate ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
            {contact.isSaved ? 'Сохраненные сообщения' : contact.type === 'business' ? 'Бизнес-аккаунт' : 'Клиент'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function ChatsPage() {
  const { user } = useAuthStore();
  const location = useLocation(); 
  const navigate = useNavigate();
  const { clearCart } = useCartStore(); 
  
  const [globalUsers, setGlobalUsers] = useState<UserProfile[]>([]);
  const [selectedContact, setSelectedContact] = useState<UserProfile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // ДОБАВЛЕНА НОВАЯ ВКЛАДКА 'clients'
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'business' | 'clients'>('all');
  
  const [hiddenContacts, setHiddenContacts] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachedImage, setAttachedImage] = useState<string>('');
  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false); 

  const [messageLimit, setMessageLimit] = useState(30);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загрузка контактов и данных текущего профиля
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const loadedUsers: UserProfile[] = [];
      snapshot.forEach((doc) => {
        if (doc.id === user.uid) {
          setCurrentUserProfile(doc.data());
          loadedUsers.unshift({ 
            id: doc.id, name: 'Избранное', avatar: '', type: 'personal', isSaved: true
          });
        } else {
          loadedUsers.push({ id: doc.id, ...doc.data() } as UserProfile);
        }
      });
      setGlobalUsers(loadedUsers);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    setMessageLimit(30);
  }, [selectedContact]);

  // ОБРАБОТКА ПЕРЕХОДА ИЗ КОРЗИНЫ
  useEffect(() => {
    const processCheckout = async () => {
      if (globalUsers.length > 0 && location.state?.selectedUserId) {
        const contact = globalUsers.find(c => c.id === location.state.selectedUserId);
        if (contact) {
          setSelectedContact(contact);
          
          if (location.state.checkoutCart && location.state.checkoutCart.length > 0) {
            const cartItems = location.state.checkoutCart;
            const chatId = [user!.uid, contact.id].sort().join('_');
            
            let totalPrice = 0;
            const itemsList = cartItems.map((item: any) => {
              const numPrice = parseFloat(item.price.replace(/[^\d.-]/g, '')) || 0;
              totalPrice += numPrice * item.quantity;
              return `${item.name} (${item.quantity} шт)`;
            }).join('\n');

            const orderData = {
              items: itemsList,
              total: totalPrice,
              status: 'new'
            };

            try {
              await addDoc(collection(db, 'messages'), {
                chatId,
                text: '🛒 Оформлен новый заказ!',
                type: 'order_receipt',
                orderData,
                senderId: user!.uid,
                receiverId: contact.id,
                createdAt: serverTimestamp(),
                isRead: false
              });
              
              clearCart(contact.id);
              navigate('.', { replace: true, state: {} }); 
            } catch (err) {
              console.error('Ошибка создания заказа:', err);
            }
          }
        }
      }
    };
    processCheckout();
  }, [globalUsers, location.state, user, navigate, clearCart]);

  // Загрузка сообщений
  useEffect(() => {
    if (!user || !selectedContact) return;

    const chatId = [user.uid, selectedContact.id].sort().join('_');
    const q = query(
      collection(db, 'messages'), 
      where('chatId', '==', chatId),
      orderBy('createdAt', 'desc'),
      limit(messageLimit)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = [];
      snapshot.forEach((docSnap) => {
        const msg = { id: docSnap.id, ...docSnap.data() } as Message;
        loadedMessages.push(msg);

        if (msg.receiverId === user.uid && !msg.isRead && msg.senderId !== user.uid) {
          updateDoc(doc(db, 'messages', msg.id), { isRead: true }).catch(() => {});
        }
      });
      loadedMessages.reverse();
      setMessages(loadedMessages);

      if (messageLimit === 30) {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
      }
    });

    return () => unsubscribe();
  }, [user, selectedContact, messageLimit]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      if (chatContainerRef.current.scrollTop === 0) {
        setMessageLimit((prev) => prev + 30);
      }
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !selectedContact || (!newMessage.trim() && !attachedImage) || isSending) return;

    setIsSending(true);
    const chatId = [user.uid, selectedContact.id].sort().join('_');

    try {
      await addDoc(collection(db, 'messages'), {
        chatId,
        text: newMessage.trim(),
        imageUrl: attachedImage,
        senderId: user.uid,
        receiverId: selectedContact.id,
        createdAt: serverTimestamp(),
        isRead: false
      });
      setNewMessage('');
      setAttachedImage('');
      setMessageLimit(30);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      console.error('Ошибка отправки:', error);
    } finally {
      setIsSending(false);
    }
  };

  // ФУНКЦИИ ИИ
  const generateSmartReply = async () => {
    if (!currentUserProfile?.aiSettings?.contextPrompt) {
      alert("Сначала добавьте инструкции для ИИ в настройках профиля!");
      return;
    }
    setIsGeneratingAi(true);
    try {
      const recentMessages = messages.slice(-5).map(m => 
        `${m.senderId === user?.uid ? 'Мы' : 'Клиент'}: ${m.text || (m.imageUrl ? '[Изображение]' : '[Данные заказа]')}`
      ).join('\n');
      
      const prompt = `Ты менеджер нашего магазина. Напиши короткий, вежливый ответ клиенту на русском языке. Без лишних слов, только текст ответа.
Контекст последних сообщений:
${recentMessages}

Инструкции от владельца: ${currentUserProfile.aiSettings.contextPrompt}`;

      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: prompt
      });
      const text = await response.text();
      setNewMessage(text.trim());
    } catch (error) {
      console.error('Ошибка ИИ:', error);
      alert('Ошибка при генерации ответа');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const generateFollowUp = async () => {
    if (!currentUserProfile?.aiSettings?.contextPrompt) return;
    setIsGeneratingAi(true);
    try {
      const prompt = `Ты менеджер магазина. Клиент давно не отвечал нам. Напиши очень короткое, дружелюбное сообщение-напоминание (follow-up) на русском языке, чтобы мягко вернуть его к диалогу. Без воды.
Наши инструкции: ${currentUserProfile.aiSettings.contextPrompt}`;

      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: prompt
      });
      const text = await response.text();
      setNewMessage(text.trim());
    } catch (error) {
      console.error('Ошибка ИИ:', error);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleOrderStatusUpdate = async (msgId: string, newStatus: string, statusText: string) => {
    if (!user || !selectedContact) return;
    const chatId = [user.uid, selectedContact.id].sort().join('_');

    try {
      await updateDoc(doc(db, 'messages', msgId), { 'orderData.status': newStatus });
      await addDoc(collection(db, 'messages'), {
        chatId,
        type: 'system_status',
        statusText,
        senderId: user.uid, 
        receiverId: selectedContact.id,
        createdAt: serverTimestamp(),
        isRead: false
      });
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
    }
  };

  const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const compressedFile = await compressImage(file, 800);
      const url = await uploadToImgBB(compressedFile);
      setAttachedImage(url);
    } catch (error) {
      alert('Не удалось загрузить изображение.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hideContact = (contactId: string) => {
    setHiddenContacts(prev => [...prev, contactId]);
    if (selectedContact?.id === contactId) setSelectedContact(null);
  };

  const markChatAsRead = async (contactId: string) => {
    if (!user) return;
    const chatId = [user.uid, contactId].sort().join('_');
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId), where('receiverId', '==', user.uid), where('isRead', '==', false));
    
    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        updateDoc(doc(db, 'messages', docSnap.id), { isRead: true });
      });
    } catch (error) {
      console.error('Ошибка отметки прочитанным:', error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ЛОГИКА ФИЛЬТРАЦИИ ДЛЯ НОВОЙ ВКЛАДКИ
  const filteredContacts = globalUsers.filter(c => {
    if (hiddenContacts.includes(c.id)) return false;
    const matchSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase().trim());
    if (!matchSearch) return false;
    
    if (activeTab === 'personal') return c.type !== 'business' || c.isSaved;
    if (activeTab === 'business') return c.type === 'business';
    
    // В папку "Клиенты" попадают только обычные юзеры (не магазины) и исключается чат с самим собой
    if (activeTab === 'clients') return c.type !== 'business' && !c.isSaved;
    
    return true; 
  });

  // ИИ доступен ТОЛЬКО если: мы бизнес + ИИ включен + МЫ НАХОДИМСЯ ВО ВКЛАДКЕ "КЛИЕНТЫ" + это не сохраненки
  const isAiAllowed = 
    currentUserProfile?.type === 'business' && 
    currentUserProfile?.aiSettings?.isEnabled && 
    activeTab === 'clients' && 
    selectedContact && !selectedContact.isSaved;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-white dark:bg-gray-950 transition-colors">
      
      {/* ЛЕВАЯ ПАНЕЛЬ: СПИСОК ЧАТОВ */}
      <div className={`w-full md:w-[320px] lg:w-[380px] shrink-0 bg-white dark:bg-gray-900 md:border-r border-gray-200 dark:border-gray-800 flex flex-col z-10 transition-colors ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        
        <div className="pt-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="px-3 mb-3">
            <div className="relative flex items-center bg-[#F2F2F7] dark:bg-gray-800 rounded-[10px] px-3 py-1.5 focus-within:bg-gray-200/80 dark:focus-within:bg-gray-700 transition-colors">
              <Search className="text-gray-400 dark:text-gray-500 shrink-0" size={18} />
              <input 
                type="text" 
                placeholder="Поиск..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent pl-2 pr-8 py-1 text-[15px] focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex px-3 pb-2 gap-2 overflow-x-auto scrollbar-none">
            <button 
              onClick={() => setActiveTab('all')} 
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors shrink-0 ${activeTab === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              Все
            </button>
            <button 
              onClick={() => setActiveTab('personal')} 
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors shrink-0 ${activeTab === 'personal' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              Личные
            </button>
            <button 
              onClick={() => setActiveTab('business')} 
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors shrink-0 ${activeTab === 'business' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            >
              Магазины
            </button>

            {/* ВКЛАДКА КЛИЕНТЫ/ЗАКАЗЫ - ДОСТУПНА ТОЛЬКО БИЗНЕСУ */}
            {currentUserProfile?.type === 'business' && (
              <button 
                onClick={() => setActiveTab('clients')} 
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-colors shrink-0 ${activeTab === 'clients' ? 'bg-indigo-500 text-white' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'}`}
              >
                <Users size={14} /> Заказы
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredContacts.map(contact => (
            <SwipeableContact 
              key={contact.id}
              contact={contact}
              isSelected={selectedContact?.id === contact.id}
              onClick={() => setSelectedContact(contact)}
              onHide={hideContact}
              onMarkRead={markChatAsRead}
            />
          ))}
          {filteredContacts.length === 0 && (
             <div className="text-center mt-10 text-gray-400 dark:text-gray-500 text-[14px]">
               В этой папке пусто
             </div>
          )}
        </div>
      </div>
      
      {/* ПРАВАЯ ПАНЕЛЬ: ЧАТ */}
      <div className={`flex-1 flex flex-col bg-[#EFEFEF] dark:bg-[#0F0F0F] relative min-w-0 z-20 transition-colors ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        
        {selectedContact ? (
          <>
            <div className="h-[60px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800 flex items-center px-4 shrink-0 shadow-sm z-10 transition-colors">
              <button 
                onClick={() => setSelectedContact(null)}
                className="md:hidden mr-3 text-blue-500 dark:text-blue-400 p-1"
              >
                <ArrowLeft size={24} />
              </button>
              
              <div className="flex items-center gap-3 cursor-pointer">
                {selectedContact.isSaved ? (
                  <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
                    <Bookmark size={18} />
                  </div>
                ) : (
                  <img 
                    src={selectedContact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.name)}`} 
                    alt={selectedContact.name} 
                    loading="lazy"
                    className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-800" 
                  />
                )}
                <div>
                  <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white leading-tight">
                    {selectedContact.name}
                  </h3>
                  <span className="text-[12px] text-blue-500 dark:text-blue-400 font-medium">
                    {selectedContact.isSaved ? 'Избранное' : 'в сети'}
                  </span>
                </div>
              </div>
            </div>
            
            <div 
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <ShieldCheck size={48} className="text-gray-400 dark:text-gray-600 mb-2" />
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-800/50 px-4 py-1.5 rounded-full">
                    Здесь пока нет сообщений
                  </p>
                </div>
              )}

              {messages.length >= messageLimit && (
                <div className="flex justify-center py-2">
                  <Loader2 size={20} className="animate-spin text-gray-400 dark:text-gray-600" />
                </div>
              )}

              {messages.map((msg, index) => {
                const isMine = msg.senderId === user?.uid;
                const isSequential = index > 0 && messages[index - 1].senderId === msg.senderId;
                
                const isCard = msg.type === 'share_card' && msg.cardData;
                const isReceipt = msg.type === 'order_receipt' && msg.orderData;
                const isSystem = msg.type === 'system_status';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-3">
                      <div className="bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur text-gray-600 dark:text-gray-300 text-[12px] font-medium px-4 py-1.5 rounded-full shadow-sm">
                        {msg.statusText}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${isSequential ? 'mt-1' : 'mt-3'}`}>
                    <div className={`relative max-w-[85%] sm:max-w-[70%] flex flex-col ${
                      isMine 
                        ? 'bg-[#E3FECE] dark:bg-[#1E3A8A] text-gray-900 dark:text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white dark:bg-[#202020] text-gray-900 dark:text-white rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-800 shadow-sm'
                    } ${(isCard || isReceipt) ? 'p-1.5' : 'px-3 pt-2 pb-1.5 text-[15px] leading-relaxed'}`}>
                      
                      {/* ЧЕК ЗАКАЗА */}
                      {isReceipt ? (
                        <div className="flex flex-col min-w-[260px] bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-blue-200 dark:border-blue-900 shadow-sm">
                          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 border-b border-blue-100 dark:border-blue-800/50 flex items-center justify-between">
                            <span className="font-black text-blue-600 dark:text-blue-400 flex items-center gap-1.5"><ShoppingBag size={16}/> ЗАКАЗ</span>
                            <span className="text-[10px] font-bold uppercase text-gray-500 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-md">
                              {msg.orderData.status === 'new' && 'Ожидает'}
                              {msg.orderData.status === 'processing' && 'В работе'}
                              {msg.orderData.status === 'shipped' && 'Отправлен'}
                            </span>
                          </div>
                          <div className="p-3 text-[13px]">
                            <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-300 font-medium mb-3">{msg.orderData.items}</p>
                            <div className="flex justify-between items-center pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                              <span className="font-bold text-gray-400">Итого:</span>
                              <span className="font-black text-[15px]">{msg.orderData.total > 0 ? `${msg.orderData.total}` : 'Уточняется'}</span>
                            </div>
                          </div>

                          {!isMine && (
                            <div className="p-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                              {msg.orderData.status === 'new' && (
                                <button onClick={() => handleOrderStatusUpdate(msg.id, 'processing', '🛠 Продавец взял заказ в работу')} className="flex-1 bg-amber-500 text-white py-1.5 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1"><Package size={14}/> В работу</button>
                              )}
                              {msg.orderData.status === 'processing' && (
                                <button onClick={() => handleOrderStatusUpdate(msg.id, 'shipped', '🚚 Заказ передан в службу доставки')} className="flex-1 bg-blue-500 text-white py-1.5 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1"><Truck size={14}/> Отправлено</button>
                              )}
                              {msg.orderData.status === 'shipped' && (
                                <div className="flex-1 py-1.5 text-center text-[12px] font-bold text-green-500 flex items-center justify-center gap-1"><CheckCircle2 size={14}/> Выполнено</div>
                              )}
                            </div>
                          )}
                        </div>
                      ) 
                      /* КАРТОЧКА ТОВАРА */
                      : isCard ? (
                        <div className="flex flex-col w-[260px] bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700">
                          <img src={msg.cardData!.imageUrl} loading="lazy" className="w-full h-36 object-cover" alt="card" />
                          <div className="p-3">
                            <h4 className="font-semibold text-[14px] text-gray-900 dark:text-white line-clamp-1 mb-1">{msg.cardData!.title}</h4>
                            {msg.cardData!.price && <span className="text-[13px] font-bold text-blue-500 dark:text-blue-400">{msg.cardData!.price}</span>}
                            <a href={msg.cardData!.link} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 py-1.5 rounded-lg text-[13px] font-medium">
                              Смотреть <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      ) 
                      /* ТЕКСТ ИЛИ КАРТИНКА */
                      : (
                        <>
                          {msg.imageUrl && <img src={msg.imageUrl} loading="lazy" alt="attachment" className="w-full max-w-[280px] h-auto rounded-xl mb-1 object-cover" />}
                          {msg.text && <span className="whitespace-pre-wrap break-words">{msg.text}</span>}
                        </>
                      )}

                      <div className={`flex items-center justify-end gap-1 mt-0.5 ml-4 float-right ${(isCard || isReceipt) && 'px-2 pb-1'}`}>
                        <span className={`text-[11px] font-medium ${isMine ? 'text-green-700/60 dark:text-blue-200/60' : 'text-gray-400 dark:text-gray-500'}`}>
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMine && !selectedContact.isSaved && (
                          <span className={`${isMine ? 'text-green-600/70 dark:text-blue-300/80' : ''}`}>
                            {msg.isRead ? <CheckCheck size={14} /> : <Check size={14} />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-2" />
            </div>
            
            {attachedImage && (
              <div className="absolute bottom-[90px] left-4 z-20">
                <div className="relative w-16 h-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-1">
                  <img src={attachedImage} alt="preview" className="w-full h-full object-cover rounded-lg" />
                  <button onClick={() => setAttachedImage('')} className="absolute -top-2 -right-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 w-5 h-5 rounded-full flex items-center justify-center"><X size={12} /></button>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-gray-900 px-3 py-2 pb-safe md:pb-3 border-t border-gray-200 dark:border-gray-800 shrink-0 transition-colors flex flex-col">
              
              {/* ПАНЕЛЬ УПРАВЛЕНИЯ ИИ - ДОСТУПНА СТРОГО ВО ВКЛАДКЕ "КЛИЕНТЫ/ЗАКАЗЫ" */}
              {isAiAllowed && (
                <div className="flex gap-2 mb-2 w-full max-w-4xl mx-auto overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={generateSmartReply}
                    disabled={isGeneratingAi}
                    className="shrink-0 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50 border border-indigo-100 dark:border-indigo-500/20"
                  >
                    {isGeneratingAi ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                    Умный ответ
                  </button>

                  {currentUserProfile?.aiSettings?.followUps && (
                    <button
                      type="button"
                      onClick={generateFollowUp}
                      disabled={isGeneratingAi}
                      className="shrink-0 flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50 border border-purple-100 dark:border-purple-500/20"
                    >
                      {isGeneratingAi ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      Follow-up
                    </button>
                  )}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto relative w-full">
                <input type="file" ref={fileInputRef} onChange={handleImageAttach} accept="image/*" className="hidden" />
                
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors shrink-0 mb-1">
                  {isUploadingImage ? <Loader2 size={24} className="animate-spin" /> : <Paperclip size={24} />}
                </button>

                <textarea 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="Сообщение..." 
                  className="flex-1 bg-transparent text-[16px] max-h-32 min-h-[40px] py-2 outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none custom-scrollbar"
                  rows={1}
                />

                <button 
                  type="submit" 
                  disabled={(!newMessage.trim() && !attachedImage) || isSending || isUploadingImage} 
                  className={`p-2 shrink-0 mb-1 rounded-full transition-colors ${
                    (newMessage.trim() || attachedImage) ? 'text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10' : 'text-gray-300 dark:text-gray-600'
                  }`}
                >
                  {isSending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-950/50 transition-colors">
            <div className="bg-white/50 dark:bg-gray-800/50 px-4 py-1.5 rounded-full font-medium text-[14px] text-gray-500 dark:text-gray-400 shadow-sm border border-gray-200/50 dark:border-gray-800">
              Выберите чат, чтобы начать общение
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
