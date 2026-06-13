import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { MessageSquare, Send, Search, X, ShieldCheck, Loader2, Clock } from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  type: string;
  role: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

export default function ChatsPage() {
  const { user } = useAuthStore();
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [selectedContact, setSelectedContact] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Состояния загрузки
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Загрузка контактов
  useEffect(() => {
    const fetchContacts = async () => {
      setIsLoadingContacts(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const loadedContacts: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== user?.uid) {
            loadedContacts.push({ id: doc.id, ...doc.data() } as UserProfile);
          }
        });
        setContacts(loadedContacts);
      } catch (error) {
        console.error('Ошибка при инициализации контактов:', error);
      } finally {
        setIsLoadingContacts(false);
      }
    };
    fetchContacts();
  }, [user]);

  // 2. Подписка на сообщения
  useEffect(() => {
    if (!user || !selectedContact) return;

    const chatId = [user.uid, selectedContact.id].sort().join('_');
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = [];
      snapshot.forEach((doc) => {
        loadedMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      
      // Сортировка по времени создания (с учетом локального времени при отправке)
      loadedMessages.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || Date.now();
        const timeB = b.createdAt?.toMillis?.() || Date.now();
        return timeA - timeB;
      });
      
      setMessages(loadedMessages);
    });

    return () => unsubscribe();
  }, [user, selectedContact]);

  // Умный автоскролл при появлении новых сообщений
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Отправка сообщения
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedContact || !newMessage.trim() || isSending) return;

    const textToSend = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    const chatId = [user.uid, selectedContact.id].sort().join('_');

    try {
      await addDoc(collection(db, 'messages'), {
        chatId,
        text: textToSend,
        senderId: user.uid,
        receiverId: selectedContact.id,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      setNewMessage(textToSend); // Возвращаем текст при ошибке
    } finally {
      setIsSending(false);
    }
  };

  // Форматирование времени (HH:MM)
  const formatTime = (timestamp: any) => {
    if (!timestamp) return <Clock size={10} className="inline opacity-70" />;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filteredContacts = contacts.filter(c => 
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="flex h-full w-full overflow-hidden select-none bg-[#FAFAFA]">
      
      {/* ЛЕВАЯ ПАНЕЛЬ: КОНТАКТЫ */}
      <div className="w-[320px] shrink-0 border-r border-gray-200/60 flex flex-col bg-white shadow-[1px_0_10px_rgba(0,0,0,0.01)] z-10">
        
        {/* Шапка списка контактов */}
        <div className="p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-black text-gray-950 tracking-tight">Чаты</h2>
            <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 border border-gray-100">
              <span className="text-xs font-bold">{contacts.length}</span>
            </div>
          </div>
          
          {/* Поиск */}
          <div className="relative flex items-center bg-gray-50 rounded-xl border border-gray-200/60 focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all">
            <Search className="absolute left-3.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Поиск диалога..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent pl-10 pr-10 py-3 text-xs focus:outline-none text-gray-900 placeholder-gray-400 font-semibold"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        
        {/* Список контактов */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar bg-[#FAFAFA]/50">
          {isLoadingContacts ? (
            /* Skeleton Loaders */
            [1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center gap-3.5 p-3.5 animate-pulse">
                <div className="w-12 h-12 bg-gray-200/60 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2.5">
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
                className={`flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 ${
                  selectedContact?.id === contact.id 
                    ? 'bg-white shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-200/60' 
                    : 'hover:bg-white border border-transparent hover:shadow-[0_2px_8px_rgba(0,0,0,0.01)]'
                }`}
              >
                <div className="relative shrink-0">
                  <img 
                    src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`} 
                    alt={contact.name} 
                    className="w-12 h-12 rounded-xl object-cover border border-gray-100 bg-gray-50" 
                  />
                  {contact.type === 'business' && (
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-[2.5px] border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-bold truncate transition-colors ${selectedContact?.id === contact.id ? 'text-gray-950' : 'text-gray-900'}`}>
                    {contact.name || 'Пользователь'}
                  </h4>
                  <p className="text-[11px] text-gray-400 truncate mt-1 font-medium tracking-wide">
                    {contact.role || 'Нет описания'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-3">
                <Search size={18} />
              </div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Не найдено</p>
            </div>
          )}
        </div>
      </div>
      
      {/* ПРАВАЯ ПАНЕЛЬ: ОКНО ЧАТА */}
      <div className="flex-1 flex flex-col bg-white relative">
        {selectedContact ? (
          <>
            {/* Хедер диалога */}
            <div className="h-[85px] bg-white border-b border-gray-100 flex items-center px-8 shrink-0 justify-between shadow-[0_4px_20px_rgba(0,0,0,0.01)] z-10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img 
                    src={selectedContact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.name)}&background=random`} 
                    alt={selectedContact.name} 
                    className="w-11 h-11 rounded-xl object-cover border border-gray-100" 
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-950 leading-tight">{selectedContact.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {selectedContact.type === 'business' ? (
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-1.5 py-0.5 rounded">Бизнес-аккаунт</span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Личный профиль</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Лента сообщений */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 bg-gray-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <ShieldCheck size={48} className="text-gray-200 mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Сквозное шифрование</p>
                  <p className="text-xs text-gray-400 mt-2 font-medium">Ваша переписка надежно защищена алгоритмами AuraSync</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMine = msg.senderId === user?.uid;
                  // Проверяем, было ли предыдущее сообщение от того же пользователя (для группировки)
                  const isSequential = index > 0 && messages[index - 1].senderId === msg.senderId;

                  return (
                    <div key={msg.id} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'} ${isSequential ? 'mt-1' : 'mt-4'}`}>
                      <div 
                        className={`group relative max-w-[75%] px-4 py-2.5 text-[13px] font-medium tracking-wide flex flex-col gap-1 shadow-sm ${
                          isMine 
                            ? 'bg-gray-950 text-white rounded-2xl rounded-tr-sm' 
                            : 'bg-white border border-gray-100 text-gray-900 rounded-2xl rounded-tl-sm shadow-[0_2px_10px_rgba(0,0,0,0.02)]'
                        }`}
                      >
                        <span className="leading-relaxed whitespace-pre-wrap">{msg.text}</span>
                        <span className={`text-[9px] font-bold self-end select-none ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              {/* Невидимый якорь для скролла */}
              <div ref={messagesEndRef} className="h-1" />
            </div>
            
            {/* Панель ввода */}
            <div className="p-4 md:p-6 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-3 max-w-4xl mx-auto items-end">
                <div className="flex-1 relative bg-gray-50 border border-gray-200/60 rounded-2xl focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all">
                  <textarea 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Написать сообщение..." 
                    className="w-full bg-transparent px-5 py-4 text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-medium resize-none max-h-32 min-h-[52px] scrollbar-none"
                    rows={1}
                  />
                </div>
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="w-[52px] h-[52px] shrink-0 bg-gray-950 text-white rounded-2xl flex items-center justify-center hover:bg-gray-800 transition-all disabled:opacity-50 disabled:hover:bg-gray-950 shadow-md active:scale-95"
                >
                  {isSending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} className="ml-0.5" />
                  )}
                </button>
              </form>
              <div className="max-w-4xl mx-auto mt-2 text-center md:text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Нажмите Enter для отправки</p>
              </div>
            </div>
          </>
        ) : (
          /* Экран "Не выбран диалог" */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#FAFAFA] border-l border-gray-50">
            <div className="w-16 h-16 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center mb-6">
              <MessageSquare size={26} className="text-gray-300" />
            </div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">Ваши диалоги</h3>
            <p className="text-xs text-gray-400 mt-2 max-w-[260px] text-center font-medium leading-relaxed">
              Выберите чат из списка слева, чтобы продолжить общение или найти партнера.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
