import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { MessageSquare, Send, User as UserIcon, Search } from 'lucide-react';

// Типы данных
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Загрузка списка контактов (всех пользователей из базы)
  useEffect(() => {
    const fetchContacts = async () => {
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
        console.error('Ошибка при загрузке контактов:', error);
      }
    };
    fetchContacts();
  }, [user]);

  // 2. Подписка на сообщения в реальном времени при выборе контакта
  useEffect(() => {
    if (!user || !selectedContact) return;

    // Генерируем уникальный ID чата (всегда одинаковый для двух людей)
    const chatId = [user.uid, selectedContact.id].sort().join('_');
    
    // Подписываемся на коллекцию сообщений для этого чата
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = [];
      snapshot.forEach((doc) => {
        loadedMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      
      // Сортируем сообщения по времени на клиенте (чтобы не требовать сложных индексов БД)
      loadedMessages.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || Date.now();
        const timeB = b.createdAt?.toMillis() || Date.now();
        return timeA - timeB;
      });
      
      setMessages(loadedMessages);
      
      // Прокручиваем чат вниз к новому сообщению
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe(); // Отписываемся при смене контакта
  }, [user, selectedContact]);

  // 3. Отправка сообщения
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedContact || !newMessage.trim()) return;

    const textToSend = newMessage.trim();
    setNewMessage(''); // Очищаем инпут сразу для отзывчивости

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
      console.error('Ошибка при отправке сообщения:', error);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-white w-full overflow-hidden">
      
      {/* ЛЕВАЯ ПАНЕЛЬ: СПИСОК КОНТАКТОВ */}
      <div className="w-1/3 border-r border-gray-100 flex flex-col min-w-[280px] max-w-[350px] bg-[#F8FAFC]">
        <div className="p-4 border-b border-gray-100 bg-white">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Сообщения</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Поиск по имени..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredContacts.map(contact => (
            <div 
              key={contact.id} 
              onClick={() => setSelectedContact(contact)}
              className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors group ${selectedContact?.id === contact.id ? 'bg-brand/10 border border-brand/20' : 'hover:bg-white border border-transparent'}`}
            >
              <div className="relative">
                <img 
                  src={contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}&background=random`} 
                  alt={contact.name} 
                  className="w-12 h-12 rounded-2xl object-cover shadow-sm" 
                />
                {contact.type === 'business' && (
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-[#F8FAFC]" />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className={`text-sm font-bold truncate transition-colors ${selectedContact?.id === contact.id ? 'text-brand' : 'text-gray-900 group-hover:text-brand'}`}>
                  {contact.name || 'Без имени'}
                </h4>
                <p className="text-xs text-gray-500 truncate mt-0.5">{contact.role || 'Пользователь'}</p>
              </div>
            </div>
          ))}
          {filteredContacts.length === 0 && (
            <div className="text-center p-4 text-gray-400 text-sm mt-10">
              Пользователи не найдены
            </div>
          )}
        </div>
      </div>
      
      {/* ПРАВАЯ ПАНЕЛЬ: ОКНО ЧАТА */}
      <div className="flex-1 flex flex-col bg-white relative">
        {selectedContact ? (
          <>
            {/* Шапка диалога */}
            <div className="h-[73px] bg-white border-b border-gray-100 flex items-center px-6 shadow-sm z-10 shrink-0">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedContact.avatar || `https://ui-avatars.com/api/?name=${selectedContact.name}&background=random`} 
                  alt={selectedContact.name} 
                  className="w-10 h-10 rounded-xl object-cover" 
                />
                <div>
                  <h3 className="font-bold text-gray-900">{selectedContact.name}</h3>
                  <p className="text-xs text-gray-500">{selectedContact.type === 'business' ? 'Бизнес-аккаунт' : 'Личный профиль'}</p>
                </div>
              </div>
            </div>
            
            {/* История сообщений */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F8FAFC]/50 scroll-smooth">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="w-16 h-16 bg-brand/5 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare size={32} className="text-brand/40" />
                  </div>
                  <p className="font-medium text-gray-500">Начните диалог первым</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user?.uid;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div 
                        className={`max-w-[70%] px-5 py-3 rounded-2xl text-sm shadow-sm ${
                          isMine 
                            ? 'bg-brand text-white rounded-br-sm' 
                            : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              {/* Невидимый элемент для прокрутки вниз */}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Ввод сообщения */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Введите сообщение..." 
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl pl-5 pr-14 py-3.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all font-medium"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center hover:bg-brand-dark transition-all disabled:opacity-50 disabled:hover:bg-brand shadow-md"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Экран, когда диалог не выбран */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <MessageSquare size={40} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Ваши сообщения</h3>
            <p className="text-sm max-w-sm text-center">Выберите собеседника из списка слева или найдите новых людей через Радар AuraSync</p>
          </div>
        )}
      </div>
    </div>
  );
}
