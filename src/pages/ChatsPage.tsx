import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useLocation, Link } from 'react-router-dom'; // ДОБАВИЛИ ДЛЯ ПЕРЕХВАТА ССЫЛОК И НАВИГАЦИИ
import { 
  MessageSquare, Send, Search, X, ShieldCheck, 
  Loader2, Clock, Image as ImageIcon, Heart, ExternalLink 
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  type: string;
  role: string;
}

// РАСШИРИЛИ ИНТЕРФЕЙС ДЛЯ ПОДДЕРЖКИ КАРТОЧЕК
interface Message {
  id: string;
  text: string;
  imageUrl?: string;
  likes?: string[];
  senderId: string;
  createdAt: any;
  type?: 'share_card' | string;
  cardData?: {
    type: 'shop' | 'product';
    title: string;
    imageUrl: string;
    link: string;
    description: string;
    price?: string;
  };
}

const uploadToImgBB = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);
  const API_KEY = '22de10db6eb1f3ec3fca012dcc566961';
  
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
    method: 'POST',
    body: formData,
  });
  
  const data = await res.json();
  if (data.success) {
    return data.data.url;
  } else {
    throw new Error('Ошибка загрузки ImgBB');
  }
};

export default function ChatsPage() {
  const { user } = useAuthStore();
  const location = useLocation(); 
  
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [selectedContact, setSelectedContact] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [attachedImage, setAttachedImage] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Загрузка контактов (REAL-TIME)
  useEffect(() => {
    setIsLoadingContacts(true);
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const loadedContacts: UserProfile[] = [];
      snapshot.forEach((doc) => {
        if (doc.id !== user?.uid) {
          loadedContacts.push({ id: doc.id, ...doc.data() } as UserProfile);
        }
      });
      setContacts(loadedContacts);
      setIsLoadingContacts(false);
    }, (error) => {
      console.error('Ошибка при синхронизации контактов:', error);
      setIsLoadingContacts(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. АВТОМАТИЧЕСКИЙ ВЫБОР ДИАЛОГА (При клике "Написать" из Радара или Магазина)
  useEffect(() => {
    if (contacts.length > 0 && location.state?.selectedUserId) {
      const contactToSelect = contacts.find(c => c.id === location.state.selectedUserId);
      if (contactToSelect && selectedContact?.id !== contactToSelect.id) {
        setSelectedContact(contactToSelect);
      }
    }
  }, [contacts, location.state]);

  // 3. Подписка на сообщения
  useEffect(() => {
    if (!user || !selectedContact) return;

    const chatId = [user.uid, selectedContact.id].sort().join('_');
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = [];
      snapshot.forEach((doc) => {
        loadedMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      
      loadedMessages.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || Date.now();
        const timeB = b.createdAt?.toMillis?.() || Date.now();
        return timeA - timeB;
      });
      
      setMessages(loadedMessages);
    });

    return () => unsubscribe();
  }, [user, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingImage(true);
    try {
      const url = await uploadToImgBB(file);
      setAttachedImage(url);
    } catch (error) {
      console.error(error);
      alert('Не удалось загрузить изображение.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedContact || (!newMessage.trim() && !attachedImage) || isSending || isUploadingImage) return;

    const textToSend = newMessage.trim();
    const imageToSend = attachedImage;
    
    setNewMessage('');
    setAttachedImage('');
    setIsSending(true);

    const chatId = [user.uid, selectedContact.id].sort().join('_');

    try {
      await addDoc(collection(db, 'messages'), {
        chatId,
        text: textToSend,
        imageUrl: imageToSend,
        likes: [],
        senderId: user.uid,
        receiverId: selectedContact.id,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      setNewMessage(textToSend);
      setAttachedImage(imageToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleLikeMessage = async (msgId: string, currentLikes: string[] = []) => {
    if (!user) return;
    const msgRef = doc(db, 'messages', msgId);
    
    const hasLiked = currentLikes.includes(user.uid);
    const newLikes = hasLiked 
      ? currentLikes.filter(id => id !== user.uid) 
      : [...currentLikes, user.uid];

    try {
      await updateDoc(msgRef, { likes: newLikes });
    } catch (error) {
      console.error("Ошибка при обновлении лайка:", error);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return <Clock size={10} className="inline opacity-70" />;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredContacts = contacts.filter(c => 
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="flex flex-col md:flex-row h-full w-full overflow-hidden select-none bg-white md:bg-[#FAFAFA]">
      
      {/* ЛЕВАЯ ПАНЕЛЬ */}
      <div className="w-full md:w-[320px] shrink-0 md:border-r border-b border-gray-100 flex flex-col bg-white md:shadow-[1px_0_10px_rgba(0,0,0,0.01)] z-20">
        <div className="p-3 md:p-5 shrink-0 flex items-center justify-between md:block">
          <div className="flex items-center justify-between md:mb-5 w-full md:w-auto">
            <h2 className="text-xl md:text-2xl font-black text-gray-950 tracking-tight">Чаты</h2>
            <div className="w-7 h-7 md:w-8 md:h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 border border-gray-100">
              <span className="text-xs font-bold">{contacts.length}</span>
            </div>
          </div>
          <div className="hidden md:flex relative items-center bg-gray-50 rounded-xl border border-gray-200/60 focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all">
            <Search className="absolute left-3.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Поиск диалога..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent pl-10 pr-10 py-3 text-xs focus:outline-none text-gray-900 placeholder-gray-400 font-semibold"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"><X size={14} /></button>
            )}
          </div>
        </div>
        
        <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto md:flex-1 px-3 pb-3 md:p-2 space-x-4 md:space-x-0 md:space-y-0.5 scrollbar-none custom-scrollbar bg-white md:bg-[#FAFAFA]/50">
          {isLoadingContacts ? (
            [1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex md:items-center flex-col md:flex-row gap-2 md:gap-3.5 md:p-3.5 animate-pulse shrink-0">
                <div className="w-14 h-14 md:w-12 md:h-12 bg-gray-200/60 rounded-[18px] md:rounded-xl shrink-0" />
                <div className="hidden md:block flex-1 space-y-2.5">
                  <div className="h-3 bg-gray-200/60 rounded w-1/2" />
                  <div className="h-2 bg-gray-200/60 rounded w-3/4" />
                </div>
              </div>
            ))
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map(contact => (
              <div 
                key={contact.id} 
                onClick={() => setSelectedContact(contact)}
                className={`flex flex-col md:flex-row items-center gap-1.5 md:gap-3.5 md:p-3.5 md:rounded-2xl cursor-pointer transition-all duration-200 shrink-0 ${
                  selectedContact?.id === contact.id 
                    ? 'md:bg-white md:shadow-[0_4px_15px_rgba(0,0,0,0.03)] md:border md:border-gray-200/60 scale-105 md:scale-100' 
                    : 'md:hover:bg-white md:border md:border-transparent md:hover:shadow-[0_2px_8px_rgba(0,0,0,0.01)]'
                }`}
              >
                <div className="relative shrink-0">
                  <img 
                    src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`} 
                    alt={contact.name} 
                    className={`object-cover border bg-gray-50 transition-all ${
                      selectedContact?.id === contact.id 
                        ? 'w-[60px] h-[60px] md:w-12 md:h-12 rounded-[20px] md:rounded-xl border-brand/50 shadow-md' 
                        : 'w-14 h-14 md:w-12 md:h-12 rounded-[18px] md:rounded-xl border-gray-100'
                    }`} 
                  />
                  {contact.type === 'business' && <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-[2.5px] border-white" />}
                </div>
                
                <div className="md:hidden w-16 text-center">
                  <p className={`text-[10px] truncate ${selectedContact?.id === contact.id ? 'font-bold text-gray-900' : 'font-medium text-gray-500'}`}>
                    {contact.name ? contact.name.split(' ')[0] : '...'}
                  </p>
                </div>

                <div className="hidden md:block flex-1 min-w-0">
                  <h4 className={`text-sm font-bold truncate transition-colors ${selectedContact?.id === contact.id ? 'text-gray-950' : 'text-gray-900'}`}>
                    {contact.name || 'Пользователь'}
                  </h4>
                  <p className="text-[11px] text-gray-400 truncate mt-1 font-medium tracking-wide">
                    {contact.role || 'Связь защищена'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center w-full py-6 md:py-10">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-2 md:mb-3">
                <Search size={16} />
              </div>
              <p className="text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider">Не найдено</p>
            </div>
          )}
        </div>
      </div>
      
      {/* ПРАВАЯ ПАНЕЛЬ */}
      <div className="flex-1 flex flex-col bg-white relative min-h-0">
        {selectedContact ? (
          <>
            <div className="h-[60px] md:h-[85px] bg-white border-b border-gray-100 flex items-center px-4 md:px-8 shrink-0 justify-between shadow-[0_4px_20px_rgba(0,0,0,0.01)] z-10">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="relative">
                  <img src={selectedContact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.name)}&background=random`} alt={selectedContact.name} className="w-9 h-9 md:w-11 md:h-11 rounded-xl object-cover border border-gray-100" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base text-gray-950 leading-tight">{selectedContact.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {selectedContact.type === 'business' ? (
                      <span className="text-[9px] md:text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-1.5 py-0.5 rounded">Бизнес-аккаунт</span>
                    ) : (
                      <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Личный профиль</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 bg-gray-50/50 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <ShieldCheck size={48} className="text-gray-200 mb-4" />
                  <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-400">Сквозное шифрование</p>
                  <p className="text-[10px] md:text-xs text-gray-400 mt-2 font-medium max-w-[200px] text-center">Ваша переписка защищена алгоритмами Aura</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMine = msg.senderId === user?.uid;
                  const isSequential = index > 0 && messages[index - 1].senderId === msg.senderId;
                  const hasLikes = msg.likes && msg.likes.length > 0;
                  const isLikedByMe = msg.likes?.includes(user?.uid || '');

                  // ЯВЛЯЕТСЯ ЛИ СООБЩЕНИЕ ИНТЕРАКТИВНОЙ КАРТОЧКОЙ
                  const isCard = msg.type === 'share_card' && msg.cardData;

                  return (
                    <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${isSequential ? 'mt-1' : 'mt-4'}`}>
                      <div className="group relative max-w-[85%] md:max-w-[75%]">
                        
                        <div className={`relative flex flex-col gap-1.5 shadow-sm transition-all ${
                          isMine 
                            ? 'bg-gray-950 text-white rounded-2xl rounded-tr-sm' 
                            : 'bg-white border border-gray-100 text-gray-900 rounded-2xl rounded-tl-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                        } ${isCard ? 'p-1.5' : 'px-4 py-2.5 text-[13px] font-medium tracking-wide'}`}>
                          
                          {/* ======= РЕНДЕР КАРТОЧКИ (ЕСЛИ ЭТО SHARE_CARD) ======= */}
                          {isCard ? (
                            <div className="flex flex-col w-[240px] md:w-[280px] bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100/50">
                              <div className="relative h-32 md:h-36 bg-gray-100 shrink-0">
                                <img src={msg.cardData!.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.cardData!.title)}`} className="w-full h-full object-cover" alt="card cover" />
                                <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-gray-900 shadow-sm border border-white/50">
                                  {msg.cardData!.type === 'shop' ? 'Магазин' : 'Товар'}
                                </div>
                              </div>
                              <div className="p-4 flex flex-col">
                                <h4 className="font-bold text-sm text-gray-900 line-clamp-1 mb-1.5">{msg.cardData!.title}</h4>
                                {msg.cardData!.description && (
                                  <p className="text-[11px] text-gray-500 font-medium line-clamp-2 leading-relaxed mb-3">
                                    {msg.cardData!.description}
                                  </p>
                                )}
                                <div className="flex items-center justify-between mt-auto">
                                  {msg.cardData!.price ? (
                                    <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                                      {msg.cardData!.price}
                                    </span>
                                  ) : <span />}
                                  
                                  <Link 
                                    to={msg.cardData!.link.replace(window.location.origin, '')} 
                                    className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-xl text-[11px] font-bold hover:bg-brand transition-colors active:scale-95 shrink-0"
                                  >
                                    Подробнее <ExternalLink size={12} />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* ======= РЕНДЕР ОБЫЧНОГО СООБЩЕНИЯ ======= */
                            <>
                              {msg.imageUrl && (
                                <div className="w-full max-w-[250px] rounded-xl overflow-hidden mb-1 border border-white/10">
                                  <img src={msg.imageUrl} alt="attachment" className="w-full h-auto object-cover" />
                                </div>
                              )}
                              {msg.text && <span className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</span>}
                            </>
                          )}

                          {/* ВРЕМЯ СООБЩЕНИЯ */}
                          <span className={`text-[9px] font-bold self-end select-none ${isCard ? 'px-2 pb-1' : 'mt-1'} ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
                            {formatTime(msg.createdAt)}
                          </span>

                          {/* КНОПКА ЛАЙКА ПРИ НАВЕДЕНИИ */}
                          <div className={`absolute ${isMine ? '-left-8' : '-right-8'} bottom-1 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <button onClick={() => handleLikeMessage(msg.id, msg.likes)} className="p-1.5 rounded-full bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-pink-500 hover:bg-pink-50 transition-colors">
                              <Heart size={14} className={isLikedByMe ? "fill-pink-500 text-pink-500" : ""} />
                            </button>
                          </div>
                        </div>

                        {/* ОТОБРАЖЕНИЕ СЧЕТЧИКА ЛАЙКОВ */}
                        {hasLikes && (
                          <div className={`absolute -bottom-3 ${isMine ? 'right-2' : 'left-2'} bg-white border border-gray-100 shadow-sm rounded-full px-2 py-0.5 flex items-center gap-1 z-10 animate-fade-in`}>
                            <Heart size={10} className="fill-pink-500 text-pink-500" />
                            <span className="text-[9px] font-black text-gray-600">{msg.likes?.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
            
            {attachedImage && (
              <div className="absolute bottom-[72px] md:bottom-[90px] left-4 md:left-8 z-20 animate-fade-in">
                <div className="relative w-24 h-24 bg-white rounded-xl shadow-lg border border-gray-200 p-1">
                  <img src={attachedImage} alt="preview" className="w-full h-full object-cover rounded-lg" />
                  <button onClick={() => setAttachedImage('')} className="absolute -top-2 -right-2 bg-gray-950 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 md:p-6 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3 max-w-4xl mx-auto items-end">
                <input type="file" ref={fileInputRef} onChange={handleImageAttach} accept="image/*" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage} className="w-[44px] h-[44px] md:w-[52px] md:h-[52px] shrink-0 bg-gray-50 text-gray-500 rounded-[14px] md:rounded-2xl flex items-center justify-center hover:bg-gray-100 hover:text-brand transition-all border border-gray-200/60">
                  {isUploadingImage ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={20} />}
                </button>

                <div className="flex-1 relative bg-gray-50 border border-gray-200/60 rounded-[14px] md:rounded-2xl focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all">
                  <textarea 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
                    }}
                    placeholder="Написать сообщение..." 
                    className="w-full bg-transparent px-4 md:px-5 py-3.5 md:py-4 text-[13px] md:text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-medium resize-none max-h-24 md:max-h-32 min-h-[44px] md:min-h-[52px] scrollbar-none"
                    rows={1}
                  />
                </div>

                <button type="submit" disabled={(!newMessage.trim() && !attachedImage) || isSending || isUploadingImage} className="w-[44px] h-[44px] md:w-[52px] md:h-[52px] shrink-0 bg-gray-950 text-white rounded-[14px] md:rounded-2xl flex items-center justify-center hover:bg-gray-800 transition-all disabled:opacity-50 disabled:hover:bg-gray-950 shadow-md active:scale-95">
                  {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#FAFAFA] md:border-l border-gray-50 p-6">
            <div className="w-16 h-16 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center mb-6">
              <MessageSquare size={26} className="text-gray-300" />
            </div>
            <h3 className="text-base font-black text-gray-900 tracking-tight text-center">Ваши диалоги</h3>
            <p className="text-xs text-gray-400 mt-2 max-w-[260px] text-center font-medium leading-relaxed">
              Выберите чат из списка, чтобы продолжить общение или отправить фото.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
