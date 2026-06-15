import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { 
  Send, Search, X, ShieldCheck, 
  Loader2, Paperclip, Check, CheckCheck, 
  Bookmark, ArrowLeft, Image as ExternalLink,
  ShoppingBag, Truck, CheckCircle2, Package, 
  Users, Zap, Clock, Archive, ArchiveRestore, Reply,
  Trash2, Edit2, ChevronDown, WifiOff, Volume2, VolumeX, Bell, BellOff,
  Phone, Globe, Store, User // Иконки для профиля
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  type: string;
  isSaved?: boolean;
  lastSeen?: any; 
  typingTo?: string | null;
  role?: string;
  contacts?: { phone?: string; website?: string; email?: string; };
  products?: { id: string; name: string; price: string; description: string; imageUrl: string; }[];
}

interface Message {
  id: string;
  text?: string; 
  imageUrl?: string;
  senderId: string;
  receiverId: string;
  createdAt: any;
  isRead?: boolean;
  isEdited?: boolean;
  type?: 'share_card' | 'order_receipt' | 'system_status' | string;
  cardData?: any;
  orderData?: any;
  statusText?: string;
  replyToText?: string;
  replyToSender?: string;
  chatId?: string;
}

interface ToastNotification {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  avatar: string;
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
        canvas.width = img.width > maxWidth ? maxWidth : img.width;
        canvas.height = img.width > maxWidth ? img.height * scaleSize : img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          else reject(new Error('Ошибка сжатия'));
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
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, { method: 'POST', body: formData });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error('Ошибка загрузки');
};

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
};

// -----------------------------------------------------
// СВАЙП СООБЩЕНИЯ (REPLY & DELETE)
// -----------------------------------------------------
const SwipeableMessage = ({ children, onReply, onDelete, isMine }: { children: React.ReactNode, onReply: () => void, onDelete: () => void, isMine: boolean }) => {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; isDragging.current = true; };
  const handleTouchMove = (e: React.TouchEvent) => { 
    if (!isDragging.current) return; 
    const diff = e.touches[0].clientX - startX.current; 
    if (diff > 0 && diff <= 60) setOffsetX(diff); 
    if (isMine && diff < 0 && diff >= -60) setOffsetX(diff);
  };
  const handleTouchEnd = () => { 
    isDragging.current = false; 
    if (offsetX > 40) onReply(); 
    if (offsetX < -40 && isMine) onDelete();
    setOffsetX(0); 
  };

  return (
    <div className="relative w-full flex items-center py-1 overflow-hidden">
      <div className="absolute left-4 transition-opacity flex items-center justify-center" style={{ opacity: offsetX > 0 ? offsetX / 60 : 0 }}>
        <div className="w-8 h-8 bg-gray-200/50 dark:bg-gray-800/50 rounded-full flex items-center justify-center"><Reply size={16} className="text-gray-500 dark:text-gray-400" /></div>
      </div>
      {isMine && (
        <div className="absolute right-4 transition-opacity flex items-center justify-center" style={{ opacity: offsetX < 0 ? Math.abs(offsetX) / 60 : 0 }}>
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center"><Trash2 size={16} className="text-red-500" /></div>
        </div>
      )}
      <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ transform: `translateX(${offsetX}px)`, transition: isDragging.current ? 'none' : 'transform 0.2s cubic-bezier(0.1, 1, 0.5, 1)' }} className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'}`}>
        {children}
      </div>
    </div>
  );
};

// -----------------------------------------------------
// СВАЙП КОНТАКТОВ В СПИСКЕ
// -----------------------------------------------------
const SwipeableContact = ({ contact, isSelected, onClick, onSwipeAction, onMarkRead, actionIcon: ActionIcon, actionColorClass, actionBgClass, unreadCount, currentUserId }: { contact: UserProfile, isSelected: boolean, onClick: () => void, onSwipeAction: (id: string) => void, onMarkRead: (id: string) => void, actionIcon: any, actionColorClass: string, actionBgClass: string, unreadCount: number, currentUserId?: string }) => {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; isDragging.current = true; };
  const handleTouchMove = (e: React.TouchEvent) => { if (!isDragging.current) return; const diff = e.touches[0].clientX - startX.current; if (diff > 80) setOffsetX(80); else if (diff < -80) setOffsetX(-80); else setOffsetX(diff); };
  const handleTouchEnd = () => { isDragging.current = false; if (offsetX > 60) onMarkRead(contact.id); else if (offsetX < -60) onSwipeAction(contact.id); setOffsetX(0); };

  return (
    <div className="relative w-full overflow-hidden bg-[#F2F2F7] dark:bg-gray-950 border-b border-gray-100/50 dark:border-gray-800/50">
      <div className="absolute inset-0 flex justify-between">
        <div className={`w-1/2 bg-blue-50 flex items-center pl-4 text-white transition-opacity ${offsetX > 0 ? 'opacity-100' : 'opacity-0'}`}><CheckCheck size={24} className="text-blue-500" /></div>
        <div className={`w-1/2 flex items-center justify-end pr-4 text-white transition-opacity ${offsetX < 0 ? 'opacity-100' : 'opacity-0'} ${actionBgClass}`}><ActionIcon size={24} className={actionColorClass} /></div>
      </div>
      <div onClick={onClick} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ transform: `translateX(${offsetX}px)` }} className={`relative z-10 flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 ${isSelected ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white'}`}>
        {contact.isSaved ? <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-blue-500 text-white'}`}><Bookmark size={20} /></div> : <img src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`} alt={contact.name} loading="lazy" className="w-12 h-12 rounded-full object-cover shrink-0 bg-gray-100 dark:bg-gray-800" />}
        <div className="flex-1 min-w-0 pb-1">
          <h4 className={`font-semibold text-[15px] truncate flex items-center justify-between ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            <span className="truncate">{contact.name}</span>
            {unreadCount > 0 && !isSelected && <span className="ml-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm shrink-0">{unreadCount}</span>}
          </h4>
          <p className={`text-[13px] truncate ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
            {contact.typingTo === currentUserId ? <span className="text-blue-500 dark:text-blue-400 italic animate-pulse">печатает...</span> : (contact.isSaved ? 'Сохраненные сообщения' : contact.type === 'business' ? 'Бизнес-аккаунт' : 'Клиент')}
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
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'business' | 'clients'>('all');
  
  const [isArchiveMode, setIsArchiveMode] = useState(false);
  const [archivedContacts, setArchivedContacts] = useState<string[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachedImage, setAttachedImage] = useState<string>('');
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // 🔥 МОДАЛЬНОЕ ОКНО ПРОФИЛЯ
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const [soundEnabled, setSoundEnabled] = useState(() => JSON.parse(localStorage.getItem('chat_sound') ?? 'true'));
  const [pushEnabled, setPushEnabled] = useState(() => JSON.parse(localStorage.getItem('chat_push') ?? 'true'));
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [messageLimit, setMessageLimit] = useState(30);
  const [showScrollButton, setShowScrollButton] = useState(false); 
  
  const currentChatRef = useRef<string | null>(null); 
  const activeContactIdRef = useRef<string | null>(null);
  const globalUsersRef = useRef<UserProfile[]>([]);
  const soundEnabledRef = useRef(soundEnabled);
  const pushEnabledRef = useRef(pushEnabled);
  
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { activeContactIdRef.current = selectedContact?.id || null; }, [selectedContact]);
  useEffect(() => { globalUsersRef.current = globalUsers; }, [globalUsers]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; localStorage.setItem('chat_sound', JSON.stringify(soundEnabled)); }, [soundEnabled]);
  useEffect(() => { pushEnabledRef.current = pushEnabled; localStorage.setItem('chat_push', JSON.stringify(pushEnabled)); }, [pushEnabled]);

  // ОФФЛАЙН ДЕТЕКТОР
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const handleTogglePush = () => {
    const newVal = !pushEnabled;
    setPushEnabled(newVal);
    if (newVal && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const showToast = (senderId: string, senderName: string, text: string, avatar: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, senderId, senderName, text, avatar }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000); 
  };

  useEffect(() => {
    if (!user) return;
    const updatePresence = async () => { try { await updateDoc(doc(db, 'users', user.uid), { lastSeen: serverTimestamp() }); } catch (error) {} };
    updatePresence();
    const interval = setInterval(updatePresence, 60000); 
    return () => clearInterval(interval);
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const savedArchive = localStorage.getItem(`archive_${user.uid}`);
    if (savedArchive) setArchivedContacts(JSON.parse(savedArchive));

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const loadedUsers: UserProfile[] = [];
      snapshot.forEach((doc) => {
        if (doc.id === user.uid) {
          setCurrentUserProfile(doc.data());
          loadedUsers.unshift({ id: doc.id, name: 'Избранное', avatar: '', type: 'personal', isSaved: true });
        } else {
          loadedUsers.push({ id: doc.id, ...doc.data() } as UserProfile);
        }
      });
      setGlobalUsers(loadedUsers);
    });

    const qUnread = query(collection(db, 'messages'), where('receiverId', '==', user.uid), where('isRead', '==', false));
    let initialLoad = true;

    const unsubscribeUnread = onSnapshot(qUnread, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(docSnap => {
        const msg = docSnap.data() as Message;
        counts[msg.senderId] = (counts[msg.senderId] || 0) + 1;
      });
      setUnreadCounts(counts);

      if (!initialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const msg = change.doc.data() as Message;
            if (msg.senderId !== activeContactIdRef.current) {
              const senderProfile = globalUsersRef.current.find(u => u.id === msg.senderId);
              const senderName = senderProfile?.name || 'Новое сообщение';
              const avatar = senderProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}`;
              const body = msg.text || (msg.imageUrl ? '📷 Фотография' : 'Вложение');

              if (soundEnabledRef.current) playNotificationSound();
              showToast(msg.senderId, senderName, body, avatar);

              if (pushEnabledRef.current && "Notification" in window && Notification.permission === "granted" && document.hidden) {
                new Notification(`Новое сообщение от ${senderName}`, { body, icon: avatar });
              }
            }
          }
        });
      } else {
        initialLoad = false;
      }
    });

    return () => { unsubscribeUsers(); unsubscribeUnread(); };
  }, [user]);

  // ОБРАБОТКА ПОКУПКИ
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

            try {
              await addDoc(collection(db, 'messages'), {
                chatId, text: '🛒 Оформлен новый заказ!', type: 'order_receipt',
                orderData: { items: itemsList, total: totalPrice, status: 'new' },
                senderId: user!.uid, receiverId: contact.id, createdAt: serverTimestamp(), isRead: false
              });
              clearCart(contact.id);
              navigate('.', { replace: true, state: {} }); 
            } catch (err) {}
          }
        }
      }
    };
    processCheckout();
  }, [globalUsers, location.state, user, navigate, clearCart]);

  // ЗАГРУЗКА ЛЕНТЫ ЧАТА И ЧЕРНОВИКОВ
  useEffect(() => {
    if (!user || !selectedContact) {
      setMessages([]);
      return;
    }

    const chatId = [user.uid, selectedContact.id].sort().join('_');
    
    if (currentChatRef.current !== chatId) {
      setMessages([]); 
      setMessageLimit(30);
      setReplyingTo(null); 
      setEditingMessage(null);
      setIsProfileModalOpen(false); // Закрываем профиль при смене чата
      currentChatRef.current = chatId;
      
      const savedDraft = localStorage.getItem(`draft_${user.uid}_${selectedContact.id}`);
      setNewMessage(savedDraft || '');
    }

    // Без orderBy - забираем всё и сортируем локально для идеальной мгновенной синхронизации
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId));
    
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      let loadedMessages: Message[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedMessages.push({ 
          id: docSnap.id, 
          ...data,
          createdAt: data.createdAt === null ? Timestamp.now() : data.createdAt 
        } as Message);
      });

      loadedMessages.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
        return timeA - timeB;
      });

      if (loadedMessages.length > messageLimit) {
        loadedMessages = loadedMessages.slice(-messageLimit);
      }

      setMessages(loadedMessages);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });

    markChatAsRead(selectedContact.id);

    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      updateDoc(doc(db, 'users', user.uid), { typingTo: null }).catch(() => {});
    };
  }, [user?.uid, selectedContact?.id, messageLimit]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0) setMessageLimit((prev) => prev + 30);
    const isScrolledUp = target.scrollHeight - target.scrollTop - target.clientHeight > 150;
    setShowScrollButton(isScrolledUp);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewMessage(text);
    
    if (selectedContact && user) {
      localStorage.setItem(`draft_${user.uid}_${selectedContact.id}`, text);

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        updateDoc(doc(db, 'users', user.uid), { typingTo: selectedContact.id }).catch(() => {});
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        updateDoc(doc(db, 'users', user.uid), { typingTo: null }).catch(() => {});
      }, 1500);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !selectedContact || (!newMessage.trim() && !attachedImage) || isOffline) return;

    const textToSend = newMessage.trim();
    const imageToSend = attachedImage;
    const replyToSend = replyingTo;

    setNewMessage('');
    setAttachedImage('');
    setReplyingTo(null);
    localStorage.removeItem(`draft_${user.uid}_${selectedContact.id}`);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateDoc(doc(db, 'users', user.uid), { typingTo: null }).catch(() => {});
    isTypingRef.current = false;

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);

    if (editingMessage) {
      try {
        await updateDoc(doc(db, 'messages', editingMessage.id), { text: textToSend, isEdited: true });
        setEditingMessage(null);
      } catch (err) { console.error("Ошибка редактирования:", err); }
      return;
    }

    const chatId = [user.uid, selectedContact.id].sort().join('_');
    const messageData: any = {
      chatId, text: textToSend, imageUrl: imageToSend,
      senderId: user.uid, receiverId: selectedContact.id,
      createdAt: serverTimestamp(), isRead: false
    };

    if (replyToSend) {
      messageData.replyToText = replyToSend.text || (replyToSend.imageUrl ? 'Фотография' : 'Вложение');
      messageData.replyToSender = replyToSend.senderId === user.uid ? 'Вы' : selectedContact.name;
    }

    try { await addDoc(collection(db, 'messages'), messageData); } catch (error) {}
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (window.confirm('Удалить сообщение у всех?')) {
      try { await deleteDoc(doc(db, 'messages', msgId)); } catch (error) { console.error("Ошибка удаления:", error); }
    }
  };

  const insertQuickReply = () => {
    if (!currentUserProfile?.aiSettings?.contextPrompt) return alert("Сначала добавьте текст быстрого ответа в настройках профиля!");
    setNewMessage(currentUserProfile.aiSettings.contextPrompt);
  };
  const insertFollowUp = () => setNewMessage("Здравствуйте! 👋 Вы ранее интересовались нашими товарами. Подскажите, актуален ли еще ваш запрос? Буду рад(а) помочь!");

  const handleOrderStatusUpdate = async (msgId: string, newStatus: string, statusText: string) => {
    if (!user || !selectedContact) return;
    const chatId = [user.uid, selectedContact.id].sort().join('_');
    try {
      await updateDoc(doc(db, 'messages', msgId), { 'orderData.status': newStatus });
      await addDoc(collection(db, 'messages'), {
        chatId, type: 'system_status', statusText, senderId: user.uid, receiverId: selectedContact.id,
        createdAt: serverTimestamp(), isRead: false 
      });
    } catch (error) {}
  };

  const handleImageAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const compressedFile = await compressImage(file, 800);
      const url = await uploadToImgBB(compressedFile);
      setAttachedImage(url);
    } catch (error) { alert('Не удалось загрузить изображение.'); } 
    finally { setIsUploadingImage(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const markChatAsRead = async (contactId: string) => {
    if (!user) return;
    const chatId = [user.uid, contactId].sort().join('_');
    const q = query(collection(db, 'messages'), where('chatId', '==', chatId), where('receiverId', '==', user.uid), where('isRead', '==', false));
    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => updateDoc(doc(db, 'messages', docSnap.id), { isRead: true }).catch(()=>{}));
    } catch (error) {}
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getOnlineStatus = (lastSeen: any) => {
    if (!lastSeen) return 'был(а) давно';
    const last = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 5) return 'в сети';
    if (diffHours < 4) return 'был(а) недавно';

    const isToday = last.getDate() === now.getDate() && last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear();
    if (isToday) return 'был(а) сегодня';
    return `был(а) ${last.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
  };

  const formatDateDivider = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Сегодня';
    if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const handleArchive = (contactId: string) => {
    const newArchived = [...archivedContacts, contactId];
    setArchivedContacts(newArchived);
    localStorage.setItem(`archive_${user?.uid}`, JSON.stringify(newArchived));
    if (selectedContact?.id === contactId) setSelectedContact(null); 
  };

  const handleUnarchive = (contactId: string) => {
    const newArchived = archivedContacts.filter(id => id !== contactId);
    setArchivedContacts(newArchived);
    localStorage.setItem(`archive_${user?.uid}`, JSON.stringify(newArchived));
  };

  const filteredContacts = globalUsers.filter(c => {
    const matchSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase().trim());
    if (!matchSearch) return false;
    if (isArchiveMode) return archivedContacts.includes(c.id);
    if (archivedContacts.includes(c.id)) return false;
    if (activeTab === 'personal') return c.type !== 'business' || c.isSaved;
    if (activeTab === 'business') return c.type === 'business';
    if (activeTab === 'clients') return c.type !== 'business' && !c.isSaved;
    return true; 
  });

  const isTemplatesAllowed = currentUserProfile?.type === 'business' && currentUserProfile?.aiSettings?.isEnabled && activeTab === 'clients' && selectedContact && !selectedContact.isSaved;
  const activeContactData = globalUsers.find(u => u.id === selectedContact?.id) || selectedContact;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-white dark:bg-gray-950 transition-colors relative">
      
      {/* ПЛАШКА ОТСУТСТВИЯ ИНТЕРНЕТА */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-red-500 text-white text-[12px] font-bold py-1.5 flex items-center justify-center gap-2 shadow-md">
          <WifiOff size={14} /> Нет подключения к интернету. Чат работает в оффлайн-режиме.
        </div>
      )}

      {/* IN-APP УВЕДОМЛЕНИЯ (ШТОРКИ) */}
      <div className={`fixed ${isOffline ? 'top-10' : 'top-4'} left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4 w-full md:w-[400px]`}>
        {toasts.map(t => (
          <div key={t.id} onClick={() => { const contactToOpen = globalUsers.find(c => c.id === t.senderId); if (contactToOpen) setSelectedContact(contactToOpen); setToasts(prev => prev.filter(toast => toast.id !== t.id)); }} className="pointer-events-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-xl rounded-2xl p-3 flex items-center gap-3 animate-fade-in w-full cursor-pointer border border-gray-100 dark:border-gray-700 hover:scale-[1.02] transition-transform">
            <img src={t.avatar} className="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-100 dark:bg-gray-900" />
            <div className="flex-1 min-w-0">
              <h4 className="text-[14px] font-bold text-gray-900 dark:text-white truncate">{t.senderName}</h4>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">{t.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ЛАЙТБОКС ДЛЯ ИЗОБРАЖЕНИЙ */}
      {viewingImage && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewingImage(null)}>
          <img src={viewingImage} alt="Full screen" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          <button className="absolute top-6 right-6 text-white/70 hover:text-white p-2 rounded-full bg-black/50 backdrop-blur-md transition-colors"><X size={28} /></button>
        </div>
      )}

      {/* 🌟 МОДАЛЬНОЕ ОКНО ПРОФИЛЯ / МАГАЗИНА */}
      {isProfileModalOpen && activeContactData && !activeContactData.isSaved && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center p-0 md:p-4 animate-fade-in" onClick={() => setIsProfileModalOpen(false)}>
          <div className="bg-white dark:bg-gray-900 w-full md:w-[480px] max-h-[90vh] overflow-y-auto custom-scrollbar rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col transition-transform transform translate-y-0" onClick={e => e.stopPropagation()}>
            {/* Градиентная обложка */}
            <div className="relative h-32 bg-gradient-to-r from-blue-500 to-indigo-500 shrink-0 rounded-t-3xl md:rounded-t-3xl">
              <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"><X size={18} /></button>
            </div>
            
            {/* Данные профиля */}
            <div className="px-6 pb-6 relative">
              <img src={activeContactData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeContactData.name)}`} alt={activeContactData.name} className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-900 absolute -top-12 shadow-md bg-white dark:bg-gray-800" />
              
              <div className="mt-14">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {activeContactData.name}
                  {activeContactData.type === 'business' ? <ShieldCheck size={18} className="text-blue-500" /> : <User size={18} className="text-gray-400" />}
                </h2>
                <p className={`text-[13px] font-medium mt-1 ${getOnlineStatus(activeContactData.lastSeen) === 'в сети' ? 'text-blue-500' : 'text-gray-500'}`}>
                  {getOnlineStatus(activeContactData.lastSeen)}
                </p>
                
                {/* О себе / Описание */}
                {activeContactData.role && <p className="mt-4 text-[14px] text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{activeContactData.role}</p>}
                
                {/* Контакты */}
                {activeContactData.contacts && (activeContactData.contacts.phone || activeContactData.contacts.website) && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {activeContactData.contacts.phone && <a href={`tel:${activeContactData.contacts.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><Phone size={14} /> {activeContactData.contacts.phone}</a>}
                    {activeContactData.contacts.website && <a href={activeContactData.contacts.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><Globe size={14} /> Веб-сайт</a>}
                  </div>
                )}
              </div>

              {/* ВИТРИНА МАГАЗИНА (Только для бизнеса) */}
              {activeContactData.type === 'business' && (
                <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
                  <h3 className="text-[15px] font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Package size={18} className="text-indigo-500"/> Витрина магазина</h3>
                  
                  {activeContactData.products && activeContactData.products.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Показываем только первые 4 товара в превью */}
                        {activeContactData.products.slice(0, 4).map((product: any) => (
                          <div key={product.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                            <div className="relative h-32 overflow-hidden bg-gray-50 dark:bg-gray-900">
                              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600"><ShoppingBag size={32}/></div>}
                            </div>
                            <div className="p-3 flex flex-col flex-1">
                              <h4 className="font-semibold text-[13px] text-gray-900 dark:text-white line-clamp-1 mb-1">{product.name}</h4>
                              <p className="text-blue-500 font-bold text-[13px] mt-auto">{product.price}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Кнопка перехода в полноценный магазин */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsProfileModalOpen(false); navigate(`/shop/${activeContactData.id}`); }}
                        className="w-full mt-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <ShoppingBag size={18} /> Смотреть все товары
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 border-dashed">
                      <Store size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Товаров пока нет</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ЛЕВАЯ ПАНЕЛЬ */}
      <div className={`w-full md:w-[320px] lg:w-[380px] shrink-0 bg-white dark:bg-gray-900 md:border-r border-gray-200 dark:border-gray-800 flex flex-col z-10 transition-colors ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        
        {isArchiveMode ? (
          <div className="pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-blue-50/50 dark:bg-gray-800/50 flex items-center justify-between px-4">
            <button onClick={() => setIsArchiveMode(false)} className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold transition-colors hover:opacity-80">
              <ArrowLeft size={20} /> Вернуться к чатам
            </button>
          </div>
        ) : (
          <div className={`pt-3 border-b border-gray-100 dark:border-gray-800 shrink-0 ${isOffline ? 'mt-6' : ''}`}>
            <div className="px-3 mb-3 flex items-center gap-2">
              <div className="relative flex-1 flex items-center bg-[#F2F2F7] dark:bg-gray-800 rounded-[10px] px-3 py-1.5 focus-within:bg-gray-200/80 dark:focus-within:bg-gray-700 transition-colors">
                <Search className="text-gray-400 dark:text-gray-500 shrink-0" size={18} />
                <input type="text" placeholder="Поиск..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent pl-2 pr-8 py-1 text-[15px] focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" />
                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={16} /></button>}
              </div>

              {/* НАСТРОЙКИ УВЕДОМЛЕНИЙ */}
              <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${soundEnabled ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button onClick={handleTogglePush} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${pushEnabled ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                {pushEnabled ? <Bell size={18} /> : <BellOff size={18} />}
              </button>
            </div>
            <div className="flex px-3 pb-2 gap-2 overflow-x-auto scrollbar-none">
              <button onClick={() => setActiveTab('all')} className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors shrink-0 ${activeTab === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Все</button>
              <button onClick={() => setActiveTab('personal')} className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors shrink-0 ${activeTab === 'personal' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Личные</button>
              <button onClick={() => setActiveTab('business')} className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors shrink-0 ${activeTab === 'business' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>Магазины</button>
              {currentUserProfile?.type === 'business' && (
                <button onClick={() => setActiveTab('clients')} className={`px-4 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-colors shrink-0 ${activeTab === 'clients' ? 'bg-indigo-500 text-white' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'}`}><Users size={14} /> Заказы</button>
              )}
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!isArchiveMode && archivedContacts.length > 0 && activeTab === 'all' && (
            <div onClick={() => setIsArchiveMode(true)} className="flex items-center gap-3 px-4 py-3 cursor-pointer bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100/50 dark:border-gray-800/50">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0"><Archive size={22} className="text-blue-500 dark:text-blue-400" /></div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-[15px] text-gray-900 dark:text-white">Архив</h4>
                <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Сохраненные чаты ({archivedContacts.length})</p>
              </div>
            </div>
          )}

          {filteredContacts.map(contact => (
            <SwipeableContact 
              key={contact.id} contact={contact} isSelected={selectedContact?.id === contact.id}
              onClick={() => setSelectedContact(contact)} onSwipeAction={isArchiveMode ? handleUnarchive : handleArchive} onMarkRead={markChatAsRead}
              actionIcon={isArchiveMode ? ArchiveRestore : Archive} actionBgClass={isArchiveMode ? "bg-blue-50" : "bg-orange-50"} actionColorClass={isArchiveMode ? "text-blue-500" : "text-orange-500"}
              unreadCount={unreadCounts[contact.id] || 0} currentUserId={user?.uid}
            />
          ))}
        </div>
      </div>
      
      {/* ПРАВАЯ ПАНЕЛЬ: ЧАТ */}
      <div className={`flex-1 flex flex-col bg-[#EFEFEF] dark:bg-[#0F0F0F] relative min-w-0 z-20 transition-colors ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
        
        {selectedContact && activeContactData ? (
          <>
            <div className={`h-[60px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-800 flex items-center justify-between px-4 shrink-0 shadow-sm z-10 transition-colors ${isOffline ? 'mt-6' : ''}`}>
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedContact(null)} className="md:hidden text-blue-500 dark:text-blue-400 p-1"><ArrowLeft size={24} /></button>
                
                {/* 🌟 КЛИКАБЕЛЬНАЯ ШАПКА ДЛЯ ОТКРЫТИЯ МОДАЛКИ */}
                <div className={`flex items-center gap-3 transition-opacity ${!selectedContact.isSaved ? 'cursor-pointer hover:opacity-80' : ''}`} onClick={() => !selectedContact.isSaved && setIsProfileModalOpen(true)}>
                  {selectedContact.isSaved ? (
                    <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center"><Bookmark size={18} /></div>
                  ) : (
                    <img src={selectedContact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.name)}`} alt={selectedContact.name} loading="lazy" className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-800 shadow-sm" />
                  )}
                  <div>
                    <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white leading-tight">{selectedContact.name}</h3>
                    {activeContactData.typingTo === user?.uid ? (
                      <span className="text-[12px] font-medium text-blue-500 dark:text-blue-400 italic animate-pulse">печатает...</span>
                    ) : (
                      <span className={`text-[12px] font-medium ${getOnlineStatus(activeContactData.lastSeen) === 'в сети' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {selectedContact.isSaved ? 'Избранное' : getOnlineStatus(activeContactData.lastSeen)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedContact(null)} className="hidden md:flex items-center gap-1.5 text-[13px] font-bold text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">Закрыть чат <X size={16} /></button>
            </div>
            
            {showScrollButton && (
              <button onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })} className="absolute bottom-[90px] right-6 z-30 w-11 h-11 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all animate-fade-in">
                <ChevronDown size={24} />
                {unreadCounts[selectedContact.id] > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm border-2 border-white dark:border-gray-800">{unreadCounts[selectedContact.id]}</span>}
              </button>
            )}

            <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col">
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center opacity-50">
                  <ShieldCheck size={48} className="text-gray-400 dark:text-gray-600 mb-2" />
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-800/50 px-4 py-1.5 rounded-full">Здесь пока нет сообщений</p>
                </div>
              )}

              {messages.length >= messageLimit && <div className="flex justify-center py-2 mb-2"><Loader2 size={20} className="animate-spin text-gray-400 dark:text-gray-600" /></div>}

              {messages.map((msg, index) => {
                const isMine = msg.senderId === user?.uid;
                
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;

                const currentMsgDateStr = msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)).toDateString() : new Date().toDateString();
                const prevMsgDateStr = prevMsg?.createdAt ? (prevMsg.createdAt.toDate ? prevMsg.createdAt.toDate() : new Date(prevMsg.createdAt)).toDateString() : null;
                const nextMsgDateStr = nextMsg?.createdAt ? (nextMsg.createdAt.toDate ? nextMsg.createdAt.toDate() : new Date(nextMsg.createdAt)).toDateString() : null;

                const showDateDivider = index === 0 || currentMsgDateStr !== prevMsgDateStr;
                const isPrevMine = prevMsg?.senderId === msg.senderId && currentMsgDateStr === prevMsgDateStr;
                const isNextMine = nextMsg?.senderId === msg.senderId && currentMsgDateStr === nextMsgDateStr;

                const isFirstInGroup = !isPrevMine;
                const isLastInGroup = !isNextMine;
                const marginTopClass = isFirstInGroup && !showDateDivider ? 'mt-3' : 'mt-0.5';

                let bubbleRadius = isMine ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm';
                if (isMine) {
                  if (isFirstInGroup && isLastInGroup) bubbleRadius = 'rounded-2xl rounded-br-sm'; 
                  else if (isFirstInGroup) bubbleRadius = 'rounded-2xl rounded-br-sm'; 
                  else if (isLastInGroup) bubbleRadius = 'rounded-2xl rounded-tr-sm';  
                  else bubbleRadius = 'rounded-2xl rounded-r-sm'; 
                } else {
                  if (isFirstInGroup && isLastInGroup) bubbleRadius = 'rounded-2xl rounded-bl-sm';
                  else if (isFirstInGroup) bubbleRadius = 'rounded-2xl rounded-bl-sm';
                  else if (isLastInGroup) bubbleRadius = 'rounded-2xl rounded-tl-sm';
                  else bubbleRadius = 'rounded-2xl rounded-l-sm';
                }

                const isCard = msg.type === 'share_card' && msg.cardData;
                const isReceipt = msg.type === 'order_receipt' && msg.orderData;
                const isSystem = msg.type === 'system_status';

                return (
                  <div key={msg.id}>
                    {showDateDivider && (
                      <div className="flex justify-center my-4">
                        <span className="bg-black/10 dark:bg-white/10 backdrop-blur-sm text-gray-600 dark:text-gray-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          {formatDateDivider(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    {isSystem ? (
                      <div className="flex justify-center my-3">
                        <div className="bg-gray-200/80 dark:bg-gray-800/80 backdrop-blur text-gray-600 dark:text-gray-300 text-[12px] font-medium px-4 py-1.5 rounded-full shadow-sm">{msg.statusText}</div>
                      </div>
                    ) : (
                      <SwipeableMessage onReply={() => setReplyingTo(msg)} onDelete={() => handleDeleteMessage(msg.id)} isMine={isMine}>
                        <div className={`relative max-w-[85%] sm:max-w-[70%] flex flex-col ${
                          isMine ? `bg-[#E3FECE] dark:bg-[#1E3A8A] text-gray-900 dark:text-white ${bubbleRadius}` 
                                 : `bg-white dark:bg-[#202020] text-gray-900 dark:text-white border border-gray-100 dark:border-gray-800 shadow-sm ${bubbleRadius}`
                        } ${(isCard || isReceipt) ? 'p-1.5' : 'px-3 pt-2 pb-1.5 text-[15px] leading-relaxed'} ${marginTopClass} group`}>
                          
                          {isMine && !isCard && !isReceipt && (
                            <div className="absolute top-1 -left-16 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                              <button onClick={() => { setEditingMessage(msg); setNewMessage(msg.text || ''); }} className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-sm text-gray-500 hover:text-blue-500 transition-colors"><Edit2 size={14}/></button>
                              <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-sm text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                            </div>
                          )}

                          {msg.replyToText && (
                            <div className="mb-1.5 pl-2 border-l-[3px] border-blue-500 bg-black/5 dark:bg-black/20 rounded-r-md py-1 pr-2">
                              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-300 block mb-0.5">{msg.replyToSender}</span>
                              <span className="text-[12px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-tight opacity-90">{msg.replyToText}</span>
                            </div>
                          )}

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
                                  {msg.orderData.status === 'new' && <button onClick={() => handleOrderStatusUpdate(msg.id, 'processing', '🛠 Продавец взял заказ в работу')} className="flex-1 bg-amber-500 text-white py-1.5 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1"><Package size={14}/> В работу</button>}
                                  {msg.orderData.status === 'processing' && <button onClick={() => handleOrderStatusUpdate(msg.id, 'shipped', '🚚 Заказ передан в службу доставки')} className="flex-1 bg-blue-500 text-white py-1.5 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1"><Truck size={14}/> Отправлено</button>}
                                  {msg.orderData.status === 'shipped' && <div className="flex-1 py-1.5 text-center text-[12px] font-bold text-green-500 flex items-center justify-center gap-1"><CheckCircle2 size={14}/> Выполнено</div>}
                                </div>
                              )}
                            </div>
                          ) : isCard ? (
                            <div className="flex flex-col w-[260px] bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700">
                              <img src={msg.cardData!.imageUrl} onClick={() => setViewingImage(msg.cardData!.imageUrl)} loading="lazy" className="w-full h-36 object-cover cursor-pointer hover:opacity-90 transition-opacity" alt="card" />
                              <div className="p-3">
                                <h4 className="font-semibold text-[14px] text-gray-900 dark:text-white line-clamp-1 mb-1">{msg.cardData!.title}</h4>
                                {msg.cardData!.price && <span className="text-[13px] font-bold text-blue-500 dark:text-blue-400">{msg.cardData!.price}</span>}
                                <a href={msg.cardData!.link} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center justify-center gap-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 py-1.5 rounded-lg text-[13px] font-medium">Смотреть <ExternalLink size={14} /></a>
                              </div>
                            </div>
                          ) : (
                            <>
                              {msg.imageUrl && <img src={msg.imageUrl} onClick={() => setViewingImage(msg.imageUrl!)} loading="lazy" alt="attachment" className="w-full max-w-[280px] h-auto rounded-xl mb-1 object-cover cursor-pointer hover:opacity-90 transition-opacity" />}
                              {msg.text && <span className="whitespace-pre-wrap break-words">{msg.text}</span>}
                            </>
                          )}

                          <div className={`flex items-center justify-end gap-1 mt-0.5 ml-4 float-right ${(isCard || isReceipt) && 'px-2 pb-1'}`}>
                            {msg.isEdited && <span className="text-[10px] text-gray-400 dark:text-gray-500 italic mr-1">изменено</span>}
                            <span className={`text-[11px] font-medium ${isMine ? 'text-green-700/60 dark:text-blue-200/60' : 'text-gray-400 dark:text-gray-500'}`}>{formatTime(msg.createdAt)}</span>
                            {isMine && !selectedContact.isSaved && (
                              <span className={`${isMine ? 'text-green-600/70 dark:text-blue-300/80' : ''}`}>
                                {msg.isRead ? <CheckCheck size={14} /> : <Check size={14} />}
                              </span>
                            )}
                          </div>
                        </div>
                      </SwipeableMessage>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-2" />
            </div>
            
            {(replyingTo || editingMessage) && (
              <div className="mx-3 mt-1 bg-gray-100 dark:bg-gray-800 rounded-t-xl border-l-[3px] border-blue-500 flex items-center justify-between px-3 py-2 animate-fade-in shadow-sm">
                <div className="flex flex-col min-w-0 pr-4">
                  <span className="text-[12px] font-bold text-blue-500 dark:text-blue-400">
                    {editingMessage ? 'Редактирование' : (replyingTo?.senderId === user?.uid ? 'Ответ себе' : `Ответ ${selectedContact.name}`)}
                  </span>
                  <span className="text-[13px] text-gray-600 dark:text-gray-300 truncate">
                    {editingMessage ? editingMessage.text : (replyingTo?.text || (replyingTo?.imageUrl ? 'Фотография' : 'Вложение'))}
                  </span>
                </div>
                <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setNewMessage(''); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"><X size={18}/></button>
              </div>
            )}

            {attachedImage && (
              <div className="absolute bottom-[90px] left-4 z-20">
                <div className="relative w-16 h-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-1">
                  <img src={attachedImage} alt="preview" className="w-full h-full object-cover rounded-lg" />
                  <button onClick={() => setAttachedImage('')} className="absolute -top-2 -right-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 w-5 h-5 rounded-full flex items-center justify-center"><X size={12} /></button>
                </div>
              </div>
            )}

            <div className={`bg-white dark:bg-gray-900 px-3 py-2 pb-safe md:pb-3 border-t border-gray-200 dark:border-gray-800 shrink-0 transition-colors flex flex-col ${(replyingTo || editingMessage) ? 'rounded-b-none border-t-0 pt-1' : ''}`}>
              
              {isTemplatesAllowed && !replyingTo && !editingMessage && (
                <div className="flex gap-2 mb-2 w-full max-w-4xl mx-auto overflow-x-auto scrollbar-none">
                  <button type="button" onClick={insertQuickReply} className="shrink-0 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors border border-indigo-100 dark:border-indigo-500/20"><Zap size={14} /> Шаблон ответа</button>
                  {currentUserProfile?.aiSettings?.followUps && <button type="button" onClick={insertFollowUp} className="shrink-0 flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors border border-purple-100 dark:border-purple-500/20"><Clock size={14} /> Напоминание</button>}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto relative w-full">
                <input type="file" ref={fileInputRef} onChange={handleImageAttach} accept="image/*" className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isOffline} className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors shrink-0 mb-1 disabled:opacity-50"><Paperclip size={24} /></button>
                <textarea value={newMessage} onChange={handleTyping} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={editingMessage ? "Отредактируйте сообщение..." : "Сообщение..."} disabled={isOffline} className="flex-1 bg-transparent text-[16px] max-h-32 min-h-[40px] py-2 outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none custom-scrollbar disabled:opacity-50" rows={1} />
                <button type="submit" disabled={(!newMessage.trim() && !attachedImage) || isOffline} className={`p-2 shrink-0 mb-1 rounded-full transition-colors ${(newMessage.trim() || attachedImage) && !isOffline ? 'text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10' : 'text-gray-300 dark:text-gray-600 disabled:opacity-50'}`}>
                  {editingMessage ? <Check size={24} /> : <Send size={24} />}
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
