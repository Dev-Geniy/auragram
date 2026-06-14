import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useLocation } from 'react-router-dom';
import { 
  Send, Search, X, ShieldCheck, 
  Loader2, Paperclip, Check, CheckCheck, 
  Bookmark, ArrowLeft, Image as ExternalLink
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
  type?: 'share_card' | string;
  cardData?: any;
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
  if (data.success) return data.data.url;
  throw new Error('Ошибка загрузки');
};

export default function ChatsPage() {
  const { user } = useAuthStore();
  const location = useLocation(); 
  
  // Состояния контактов
  const [globalUsers, setGlobalUsers] = useState<UserProfile[]>([]);
  const [selectedContact, setSelectedContact] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Состояния чата
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachedImage, setAttachedImage] = useState<string>('');
  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Загрузка всех пользователей для Глобального Поиска + "Избранное"
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const loadedUsers: UserProfile[] = [];
      snapshot.forEach((doc) => {
        if (doc.id === user.uid) {
          loadedUsers.unshift({ 
            id: doc.id, 
            name: 'Избранное', 
            avatar: '', 
            type: 'personal', 
            isSaved: true
          });
        } else {
          loadedUsers.push({ id: doc.id, ...doc.data() } as UserProfile);
        }
      });
      setGlobalUsers(loadedUsers);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Обработка перехода из других страниц (например, Написать из Маркета)
  useEffect(() => {
    if (globalUsers.length > 0 && location.state?.selectedUserId) {
      const contact = globalUsers.find(c => c.id === location.state.selectedUserId);
      if (contact) setSelectedContact(contact);
    }
  }, [globalUsers, location.state]);

  // 3. Загрузка сообщений и маркировка как прочитанных
  useEffect(() => {
    if (!user || !selectedContact) return;

    const chatId = [user.uid, selectedContact.id].sort().join('_');
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = [];
      
      snapshot.forEach((docSnap) => {
        const msg = { id: docSnap.id, ...docSnap.data() } as Message;
        loadedMessages.push(msg);

        // Читаем чужие сообщения
        if (msg.receiverId === user.uid && !msg.isRead && msg.senderId !== user.uid) {
          updateDoc(doc(db, 'messages', msg.id), { isRead: true }).catch(() => {});
        }
      });
      
      loadedMessages.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || Date.now();
        const timeB = b.createdAt?.toMillis?.() || Date.now();
        return timeA - timeB;
      });
      
      setMessages(loadedMessages);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [user, selectedContact]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (error) {
      console.error('Ошибка отправки:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const url = await uploadToImgBB(file);
      setAttachedImage(url);
    } catch (error) {
      alert('Не удалось загрузить изображение.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredContacts = globalUsers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-white md:bg-[#F2F2F7]">
      
      {/* ЛЕВАЯ ПАНЕЛЬ: СПИСОК ЧАТОВ */}
      <div className={`w-full md:w-[320px] lg:w-[380px] shrink-0 bg-white md:border-r border-gray-200 flex flex-col z-10 ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Поиск */}
        <div className="p-3 border-b border-gray-100 shrink-0">
          <div className="relative flex items-center bg-[#F2F2F7] rounded-[10px] px-3 py-1.5 focus-within:bg-gray-200/80 transition-colors">
            <Search className="text-gray-400 shrink-0" size={18} />
            <input 
              type="text" 
              placeholder="Поиск по имени..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent pl-2 pr-8 py-1.5 text-[15px] focus:outline-none text-gray-900 placeholder-gray-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        
        {/* Список контактов */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredContacts.map(contact => (
            <div 
              key={contact.id} 
              onClick={() => setSelectedContact(contact)}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                selectedContact?.id === contact.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-50 text-gray-900'
              }`}
            >
              {contact.isSaved ? (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${selectedContact?.id === contact.id ? 'bg-white/20 text-white' : 'bg-blue-500 text-white'}`}>
                  <Bookmark size={20} />
                </div>
              ) : (
                <img 
                  src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`} 
                  alt={contact.name} 
                  className="w-12 h-12 rounded-full object-cover shrink-0 bg-gray-100" 
                />
              )}
              
              <div className="flex-1 min-w-0 border-b border-gray-100/50 pb-2">
                <h4 className={`font-semibold text-[15px] truncate ${selectedContact?.id === contact.id ? 'text-white' : 'text-gray-900'}`}>
                  {contact.name}
                </h4>
                <p className={`text-[13px] truncate ${selectedContact?.id === contact.id ? 'text-white/80' : 'text-gray-500'}`}>
                  {contact.isSaved ? 'Сохраненные сообщения' : contact.type === 'business' ? 'Бизнес-аккаунт' : 'Пользователь'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* ПРАВАЯ ПАНЕЛЬ: ЧАТ */}
      <div className={`flex-1 flex flex-col bg-[#EFEFEF] md:bg-chat-pattern relative min-w-0 z-20 ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        
        {selectedContact ? (
          <>
            {/* Хедер чата */}
            <div className="h-[60px] bg-white/95 backdrop-blur-md border-b border-gray-200/60 flex items-center px-4 shrink-0 shadow-sm z-10">
              <button 
                onClick={() => setSelectedContact(null)}
                className="md:hidden mr-3 text-blue-500 p-1"
              >
                <ArrowLeft size={24} />
              </button>
              
              <div className="flex items-center gap-3 cursor-pointer">
                {selectedContact.isSaved ? (
                  <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
                    <Bookmark size={18} />
                  </div>
                ) : (
                  <img src={selectedContact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.name)}`} alt={selectedContact.name} className="w-10 h-10 rounded-full object-cover" />
                )}
                <div>
                  <h3 className="font-semibold text-[15px] text-gray-900 leading-tight">
                    {selectedContact.name}
                  </h3>
                  <span className="text-[12px] text-blue-500 font-medium">
                    {selectedContact.isSaved ? 'Избранное' : 'в сети'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <ShieldCheck size={48} className="text-gray-400 mb-2" />
                  <p className="text-[13px] font-medium text-gray-500 bg-gray-200/50 px-4 py-1.5 rounded-full">
                    Здесь пока нет сообщений
                  </p>
                </div>
              )}

              {messages.map((msg, index) => {
                const isMine = msg.senderId === user?.uid;
                const isSequential = index > 0 && messages[index - 1].senderId === msg.senderId;
                const isCard = msg.type === 'share_card' && msg.cardData;

                return (
                  <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${isSequential ? 'mt-1' : 'mt-3'}`}>
                    <div className={`relative max-w-[85%] sm:max-w-[70%] flex flex-col ${
                      isMine 
                        ? 'bg-[#E3FECE] text-gray-900 rounded-2xl rounded-tr-sm' 
                        : 'bg-white text-gray-900 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm'
                    } ${isCard ? 'p-1.5' : 'px-3 pt-2 pb-1.5 text-[15px] leading-relaxed'}`}>
                      
                      {isCard ? (
                        <div className="flex flex-col w-[260px] bg-white rounded-xl overflow-hidden border border-gray-200/50">
                          <img src={msg.cardData!.imageUrl} className="w-full h-36 object-cover" alt="card" />
                          <div className="p-3">
                            <h4 className="font-semibold text-[14px] text-gray-900 line-clamp-1 mb-1">{msg.cardData!.title}</h4>
                            {msg.cardData!.price && <span className="text-[13px] font-bold text-blue-500">{msg.cardData!.price}</span>}
                            <a href={msg.cardData!.link} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 py-1.5 rounded-lg text-[13px] font-medium">
                              Смотреть <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.imageUrl && (
                            <img src={msg.imageUrl} alt="attachment" className="w-full max-w-[280px] h-auto rounded-xl mb-1 object-cover" />
                          )}
                          {msg.text && <span className="whitespace-pre-wrap break-words">{msg.text}</span>}
                        </>
                      )}

                      {/* Время и статус прочтения (как в TG: в углу пузыря) */}
                      <div className={`flex items-center justify-end gap-1 mt-0.5 ml-4 float-right ${isCard && 'px-2 pb-1'}`}>
                        <span className={`text-[11px] font-medium ${isMine ? 'text-green-700/60' : 'text-gray-400'}`}>
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMine && !selectedContact.isSaved && (
                          <span className="text-green-600/70">
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
            
            {/* Предпросмотр изображения */}
            {attachedImage && (
              <div className="absolute bottom-[70px] left-4 z-20">
                <div className="relative w-16 h-16 bg-white rounded-xl shadow-lg border border-gray-200 p-1">
                  <img src={attachedImage} alt="preview" className="w-full h-full object-cover rounded-lg" />
                  <button onClick={() => setAttachedImage('')} className="absolute -top-2 -right-2 bg-gray-900 text-white w-5 h-5 rounded-full flex items-center justify-center"><X size={12} /></button>
                </div>
              </div>
            )}

            {/* Панель ввода */}
            <div className="bg-white px-3 py-2 pb-safe md:pb-3 border-t border-gray-200 shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto relative">
                <input type="file" ref={fileInputRef} onChange={handleImageAttach} accept="image/*" className="hidden" />
                
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage} className="p-2 text-gray-400 hover:text-blue-500 transition-colors shrink-0 mb-1">
                  {isUploadingImage ? <Loader2 size={24} className="animate-spin" /> : <Paperclip size={24} />}
                </button>

                <textarea 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                  placeholder="Сообщение..." 
                  className="flex-1 bg-transparent text-[16px] max-h-32 min-h-[40px] py-2 outline-none text-gray-900 resize-none custom-scrollbar"
                  rows={1}
                />

                <button 
                  type="submit" 
                  disabled={(!newMessage.trim() && !attachedImage) || isSending || isUploadingImage} 
                  className={`p-2 shrink-0 mb-1 rounded-full transition-colors ${
                    (newMessage.trim() || attachedImage) ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-300'
                  }`}
                >
                  {isSending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-gray-50/50">
            <div className="bg-white/50 px-4 py-1.5 rounded-full font-medium text-[14px] text-gray-500 shadow-sm border border-gray-200/50">
              Выберите чат, чтобы начать общение
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
