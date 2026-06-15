import { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

interface Toast {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  avatar: string;
}

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

export default function GlobalNotifications() {
  const { user } = useAuthStore();
  const { soundEnabled, pushEnabled, activeChatId } = useChatStore();
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isInitialLoad = useRef(true);

  // Запрашиваем права на Push-уведомления при старте
  useEffect(() => {
    if (pushEnabled && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [pushEnabled]);

  useEffect(() => {
    if (!user) return;

    // Слушаем ВСЕ непрочитанные сообщения, адресованные нам
    const q = query(
      collection(db, 'messages'), 
      where('receiverId', '==', user.uid), 
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Игнорируем первый рендер (чтобы старые непрочитанные сообщения не звенели при загрузке сайта)
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return;
      }

      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          
          // Проверяем: если мы СЕЙЧАС читаем этот чат, то уведомление не нужно
          if (msg.senderId !== activeChatId) {
            
            // Получаем данные отправителя для красивого уведомления
            const senderDoc = await getDoc(doc(db, 'users', msg.senderId));
            const senderData = senderDoc.data();
            const senderName = senderData?.name || 'Новое сообщение';
            const avatar = senderData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}`;
            const body = msg.text || (msg.imageUrl ? '📷 Фотография' : 'Вложение');

            // 1. Звуковое уведомление
            if (soundEnabled) playNotificationSound();

            // 2. In-App шторка (поверх сайта)
            const toastId = Date.now().toString();
            setToasts((prev) => [...prev, { id: toastId, senderId: msg.senderId, senderName, text: body, avatar }]);
            setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== toastId)), 5000);

            // 3. OS Push Уведомление (Только если вкладка свернута или мы в другом окне)
            if (pushEnabled && "Notification" in window && Notification.permission === "granted" && document.hidden) {
              const notification = new Notification(senderName, { body, icon: avatar });
              notification.onclick = () => {
                window.focus();
                navigate('/chats', { state: { selectedUserId: msg.senderId } });
              };
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user, activeChatId, soundEnabled, pushEnabled, navigate]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none px-4 w-full md:w-[400px]">
      {toasts.map(t => (
        <div 
          key={t.id} 
          onClick={() => {
            setToasts(prev => prev.filter(toast => toast.id !== t.id));
            navigate('/chats', { state: { selectedUserId: t.senderId } });
          }} 
          className="pointer-events-auto bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-2xl rounded-2xl p-3 flex items-center gap-3 animate-fade-in w-full cursor-pointer border border-gray-100 dark:border-gray-700 hover:scale-[1.02] transition-transform"
        >
          <img src={t.avatar} className="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-100 dark:bg-gray-900" />
          <div className="flex-1 min-w-0">
            <h4 className="text-[14px] font-bold text-gray-900 dark:text-white truncate">{t.senderName}</h4>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 truncate">{t.text}</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setToasts(prev => prev.filter(toast => toast.id !== t.id)); }} 
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
