import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, X, RefreshCw, MessageCircle, Star, 
  MapPin, Info, Flame, Sparkles
} from 'lucide-react';

interface DatingUser {
  id: string;
  name: string;
  avatar: string;
  gallery: string[];  // Массив фото
  interests: string[]; // Массив тегов
  age?: number;       // Возраст
  role?: string;
  type: string;
  lastSeen?: number;  // Для умной ленты
}

export default function DatingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<DatingUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0); // Индекс текущего фото в галерее
  
  // Кеш входящих лайков (чтобы моментально определять мэтч)
  const [incomingLikes, setIncomingLikes] = useState<Set<string>>(new Set());
  
  // Стейты для физики свайпа
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [leaveX, setLeaveX] = useState(0);
  
  // Стейт Мэтча
  const [matchData, setMatchData] = useState<DatingUser | null>(null);

  const startPanX = useRef(0);
  const startPanY = useRef(0);

  // ==========================================
  // 1. ЗАГРУЗКА ДАННЫХ И ЛОГИКА МЭТЧЕЙ
  // ==========================================
  useEffect(() => {
    const fetchDatingData = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // 1. Получаем всех, кто ищет знакомства
        const usersQuery = query(collection(db, 'users'), where('goals', 'array-contains', 'dating'));
        const usersSnap = await getDocs(usersQuery);
        
        // 2. Получаем историю наших свайпов
        const mySwipesQuery = query(collection(db, 'dating_swipes'), where('from', '==', user.uid));
        const mySwipesSnap = await getDocs(mySwipesQuery);
        const swipedIds = new Set(mySwipesSnap.docs.map(d => d.data().to));

        // 3. Получаем тех, кто лайкнул нас (для инста-мэтча)
        const likesMeQuery = query(
          collection(db, 'dating_swipes'), 
          where('to', '==', user.uid),
          where('action', '==', 'like')
        );
        const likesMeSnap = await getDocs(likesMeQuery);
        setIncomingLikes(new Set(likesMeSnap.docs.map(d => d.data().from)));

        // Фильтруем профили
        const loadedProfiles: DatingUser[] = [];
        usersSnap.forEach((doc) => {
          if (doc.id !== user.uid && !swipedIds.has(doc.id)) {
            const data = doc.data();
            const avatarFallback = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'A')}&background=random`;
            
            loadedProfiles.push({
              id: doc.id,
              name: data.name || 'Аноним',
              avatar: avatarFallback,
              // Защита от отсутствия полей у старых юзеров
              gallery: data.gallery?.length > 0 ? data.gallery : [avatarFallback],
              interests: data.interests || [],
              age: data.age,
              role: data.role,
              type: data.type,
              lastSeen: data.lastSeen?.toMillis?.() || 0
            });
          }
        });

        // 4. УМНАЯ ЛЕНТА (Сортировка: онлайн < 15 мин назад -> рандом)
        const now = Date.now();
        loadedProfiles.sort((a, b) => {
          const aOnline = (now - a.lastSeen!) < 15 * 60 * 1000;
          const bOnline = (now - b.lastSeen!) < 15 * 60 * 1000;
          
          if (aOnline && !bOnline) return -1;
          if (!aOnline && bOnline) return 1;
          return Math.random() - 0.5; // Перемешиваем остальных
        });

        setProfiles(loadedProfiles);
      } catch (error) {
        console.error("Ошибка загрузки анкет:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatingData();
  }, [user]);

  // ==========================================
  // 2. ФИЗИКА СВАЙПОВ (Drag & Drop)
  // ==========================================
  const handleTouchStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    startPanX.current = clientX - pan.x;
    startPanY.current = clientY - pan.y;
  };

  const handleTouchMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPan({
      x: clientX - startPanX.current,
      y: clientY - startPanY.current
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const threshold = window.innerWidth * 0.3; // 30% экрана для срабатывания

    if (pan.x > threshold) {
      processSwipe('like');
    } else if (pan.x < -threshold) {
      processSwipe('pass');
    } else {
      // Возврат карточки в центр
      setPan({ x: 0, y: 0 });
    }
  };

  // ==========================================
  // 3. ЛОГИКА ОЦЕНКИ И МЭТЧА
  // ==========================================
  const processSwipe = async (action: 'like' | 'pass') => {
    const swipedUser = profiles[currentIndex];
    if (!swipedUser || !user) return;

    // Анимация вылета карточки
    setLeaveX(action === 'like' ? 1000 : -1000);

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setPhotoIndex(0); // Сбрасываем фото для следующего юзера
      setPan({ x: 0, y: 0 });
      setLeaveX(0);
    }, 300); // Ждем окончания CSS анимации

    try {
      // Записываем свайп в базу
      await addDoc(collection(db, 'dating_swipes'), {
        from: user.uid,
        to: swipedUser.id,
        action: action,
        createdAt: serverTimestamp()
      });

      // ПРОВЕРКА НА МЭТЧ
      if (action === 'like' && incomingLikes.has(swipedUser.id)) {
        // Создаем системное сообщение в чате
        const chatId = [user.uid, swipedUser.id].sort().join('_');
        await addDoc(collection(db, 'messages'), {
          chatId,
          type: 'system_status',
          statusText: '💕 Вы образовали пару! Начните общение прямо сейчас.',
          senderId: user.uid,
          receiverId: swipedUser.id,
          createdAt: serverTimestamp(),
          isRead: false 
        });

        // Показываем красивое окно мэтча
        setMatchData(swipedUser);
      }
    } catch (error) {
      console.error("Ошибка сохранения свайпа:", error);
    }
  };

  const handleButtonSwipe = (action: 'like' | 'pass') => {
    if (isDragging || leaveX !== 0) return;
    processSwipe(action);
  };

  // Переключение фото (защита от ложных кликов при свайпе)
  const handlePhotoClick = (direction: 'next' | 'prev', e: React.MouseEvent) => {
    e.stopPropagation();
    if (Math.abs(pan.x) > 10 || Math.abs(pan.y) > 10) return; // Игнорируем, если был свайп
    
    if (direction === 'prev') {
      setPhotoIndex(p => Math.max(0, p - 1));
    } else {
      setPhotoIndex(p => Math.min(activeProfile.gallery.length - 1, p + 1));
    }
  };

  // ==========================================
  // 4. РЕНДЕР
  // ==========================================
  if (isLoading) {
    return (
      <div className="flex-1 bg-[#F2F2F7] dark:bg-gray-950 flex justify-center items-center">
        <div className="animate-bounce bg-pink-100 dark:bg-pink-500/20 p-4 rounded-full">
          <Heart size={32} className="text-pink-500 animate-pulse" />
        </div>
      </div>
    );
  }

  const activeProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-gray-50 dark:bg-gray-950 relative select-none">
      
      {/* HEADER */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-xl flex items-center justify-center shadow-md">
            <Flame size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Знакомства</h1>
        </div>
        <button onClick={() => window.location.reload()} className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* CARDS AREA */}
      <div className="flex-1 relative overflow-hidden flex justify-center items-center p-4">
        
        {/* ЕСЛИ АНКЕТЫ ЗАКОНЧИЛИСЬ */}
        {!activeProfile && (
          <div className="flex flex-col items-center justify-center text-center animate-fade-in p-6">
            <div className="w-24 h-24 bg-pink-50 dark:bg-pink-500/10 rounded-full flex items-center justify-center mb-6">
              <Sparkles size={40} className="text-pink-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Анкеты закончились</h2>
            <p className="text-[15px] font-medium text-gray-500 dark:text-gray-400 max-w-xs">
              Вы просмотрели всех пользователей поблизости. Загляните сюда чуть позже!
            </p>
          </div>
        )}

        {/* СЛЕДУЮЩАЯ КАРТОЧКА (Подложка) */}
        {nextProfile && (
          <div className="absolute inset-4 md:inset-x-auto md:w-[400px] bg-white dark:bg-gray-900 rounded-[32px] shadow-sm border border-gray-200/50 dark:border-gray-800 overflow-hidden transform scale-95 opacity-50 z-0">
            <img src={nextProfile.gallery[0] || nextProfile.avatar} className="w-full h-full object-cover" />
          </div>
        )}

        {/* АКТИВНАЯ КАРТОЧКА */}
        {activeProfile && (
          <div 
            className="absolute inset-4 md:inset-x-auto md:w-[400px] bg-white dark:bg-gray-900 rounded-[32px] shadow-2xl overflow-hidden z-10 cursor-grab active:cursor-grabbing border border-gray-200/50 dark:border-gray-700"
            style={{
              transform: `translate(${leaveX || pan.x}px, ${pan.y}px) rotate(${(leaveX || pan.x) * 0.05}deg)`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
            onMouseDown={(e) => handleTouchStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleTouchMove(e.clientX, e.clientY)}
            onMouseUp={handleTouchEnd}
            onMouseLeave={() => isDragging && handleTouchEnd()}
            onTouchStart={(e) => handleTouchStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleTouchMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleTouchEnd}
          >
            {/* ФОТО ГАЛЕРЕИ */}
            <div className="relative w-full h-full bg-gray-200 dark:bg-gray-800">
              
              {/* Индикаторы слайдов (точки) */}
              {activeProfile.gallery.length > 1 && (
                <div className="absolute top-4 left-4 right-4 flex gap-1 z-30 pointer-events-none">
                  {activeProfile.gallery.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        i === photoIndex 
                          ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' 
                          : 'bg-white/30 backdrop-blur-sm'
                      }`} 
                    />
                  ))}
                </div>
              )}

              {/* Зоны клика для смены фото */}
              <div className="absolute inset-0 z-20 flex">
                <div className="w-1/2 h-full" onClick={(e) => handlePhotoClick('prev', e)} />
                <div className="w-1/2 h-full" onClick={(e) => handlePhotoClick('next', e)} />
              </div>

              {/* Сама картинка */}
              <img 
                src={activeProfile.gallery[photoIndex]} 
                alt="Photo" 
                className="w-full h-full object-cover pointer-events-none transition-opacity duration-200" 
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90 pointer-events-none" />
              
              {/* STAMPS (Лайк / Скип поверх фото) */}
              <div className="absolute top-14 left-6 pointer-events-none z-30" style={{ opacity: pan.x > 0 ? pan.x / 100 : 0 }}>
                <div className="border-4 border-green-500 text-green-500 text-4xl font-black px-4 py-1 rounded-xl transform -rotate-12 tracking-widest bg-black/20 backdrop-blur-sm">LIKE</div>
              </div>
              <div className="absolute top-14 right-6 pointer-events-none z-30" style={{ opacity: pan.x < 0 ? Math.abs(pan.x) / 100 : 0 }}>
                <div className="border-4 border-red-500 text-red-500 text-4xl font-black px-4 py-1 rounded-xl transform rotate-12 tracking-widest bg-black/20 backdrop-blur-sm">NOPE</div>
              </div>

              {/* ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ */}
              <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none z-30">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <h2 className="text-3xl font-black text-white drop-shadow-md flex items-center gap-2">
                      {activeProfile.name}
                      {activeProfile.age ? <span className="font-light text-white/90">, {activeProfile.age}</span> : ''}
                      {activeProfile.type === 'business' && <Star size={20} className="text-amber-400 fill-amber-400 ml-1" />}
                    </h2>
                    <p className="text-[14px] font-medium text-white/80 flex items-center gap-1.5 mt-1 drop-shadow-md">
                      <MapPin size={14} /> Рядом с вами
                    </p>
                  </div>
                  <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto hover:bg-white/40 transition-colors shadow-lg">
                    <Info size={20} />
                  </button>
                </div>
                
                {/* Теги (Интересы) */}
                {activeProfile.interests && activeProfile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {activeProfile.interests.slice(0, 4).map((tag, idx) => (
                      <span key={idx} className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-bold text-white tracking-wide border border-white/10 shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* О себе (Роль) */}
                {activeProfile.role && (
                  <div className="bg-black/40 backdrop-blur-md rounded-2xl p-3 border border-white/10 mt-3 shadow-lg">
                    <p className="text-[13px] text-white/95 leading-relaxed font-medium line-clamp-2">
                      {activeProfile.role}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* КОНТРОЛЛЫ (Кнопки) */}
      <div className="pb-safe shrink-0 px-6 py-6 flex justify-center items-center gap-6 md:gap-10 z-20">
        <button 
          onClick={() => handleButtonSwipe('pass')}
          disabled={!activeProfile || isDragging}
          className="w-16 h-16 md:w-20 md:h-20 bg-white dark:bg-gray-800 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-700 flex items-center justify-center text-red-500 hover:scale-110 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          <X size={32} strokeWidth={3} />
        </button>
        <button 
          onClick={() => handleButtonSwipe('like')}
          disabled={!activeProfile || isDragging}
          className="w-16 h-16 md:w-20 md:h-20 bg-white dark:bg-gray-800 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-700 flex items-center justify-center text-green-500 hover:scale-110 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          <Heart size={32} strokeWidth={3} className="fill-green-500/20" />
        </button>
      </div>

      {/* ========================================== */}
      {/* МОДАЛКА МЭТЧА */}
      {/* ========================================== */}
      {matchData && (
        <div className="fixed inset-0 z-[200] bg-gray-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
          
          <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-600 tracking-tight mb-10 text-center animate-scale-up drop-shadow-lg">
            IT'S A MATCH!
          </h2>

          <div className="flex items-center justify-center mb-12 relative animate-scale-up">
            {/* Твоя аватарка */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gray-950 overflow-hidden relative z-10 transform translate-x-4 shadow-2xl">
              <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'Я')}`} className="w-full h-full object-cover" />
            </div>
            {/* Аватарка Мэтча */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gray-950 overflow-hidden relative z-0 transform -translate-x-4 shadow-2xl">
              <img src={matchData.avatar} className="w-full h-full object-cover" />
            </div>
            
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-gray-950 rounded-full p-2 shadow-xl">
              <div className="w-12 h-12 bg-gradient-to-tr from-pink-500 to-rose-500 rounded-full flex items-center justify-center shadow-inner">
                <Heart size={24} className="text-white fill-white" />
              </div>
            </div>
          </div>

          <p className="text-lg md:text-xl font-medium text-white/90 mb-10 text-center px-4">
            Вы и <span className="font-bold text-white">{matchData.name}</span> понравились друг другу!
          </p>

          <div className="w-full max-w-sm space-y-4">
            <button 
              onClick={() => navigate('/chats', { state: { selectedUserId: matchData.id } })}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-pink-500/25"
            >
              <MessageCircle size={20} /> Написать сообщение
            </button>
            <button 
              onClick={() => setMatchData(null)}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl transition-colors border border-white/10 active:scale-95"
            >
              Продолжить поиск
            </button>
          </div>
          
        </div>
      )}
    </div>
  );
}
