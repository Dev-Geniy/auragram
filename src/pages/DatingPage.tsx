import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, X, RefreshCw, MessageCircle, Star, 
  MapPin, Flame, Info, Sparkles, ChevronDown, ChevronLeft, ChevronRight, Zap
} from 'lucide-react';

interface DatingUser {
  id: string;
  name: string;
  avatar: string;
  gallery: string[];
  interests: string[];
  age?: number;
  role?: string;
  type: string;
  lastSeen?: number;
}

export default function DatingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<DatingUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  
  const [incomingLikes, setIncomingLikes] = useState<Set<string>>(new Set());
  const [likedProfilesData, setLikedProfilesData] = useState<DatingUser[]>([]); // Данные тех, кто лайкнул меня
  
  // Стейты физики свайпа
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [leaveX, setLeaveX] = useState(0);
  
  // Модалки
  const [matchData, setMatchData] = useState<DatingUser | null>(null);
  const [detailedProfile, setDetailedProfile] = useState<DatingUser | null>(null); 

  const startPanX = useRef(0);
  const startPanY = useRef(0);

  // ==========================================
  // 1. ЗАГРУЗКА ДАННЫХ И ЛОГИКА МЭТЧЕЙ
  // ==========================================
  const fetchDatingData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // 1. Все пользователи, ищущие знакомства
      const usersQuery = query(collection(db, 'users'), where('goals', 'array-contains', 'dating'));
      const usersSnap = await getDocs(usersQuery);
      
      // 2. История наших свайпов
      const mySwipesQuery = query(collection(db, 'dating_swipes'), where('from', '==', user.uid));
      const mySwipesSnap = await getDocs(mySwipesQuery);
      const myLikedIds = new Set();
      mySwipesSnap.docs.forEach(d => {
        if (d.data().action === 'like') myLikedIds.add(d.data().to);
        // Мы НЕ добавляем 'pass' в исключения, чтобы ленту можно было крутить бесконечно!
      });

      // 3. Кто лайкнул НАС
      const likesMeQuery = query(collection(db, 'dating_swipes'), where('to', '==', user.uid), where('action', '==', 'like'));
      const likesMeSnap = await getDocs(likesMeQuery);
      const likesMeIds = new Set<string>();
      likesMeSnap.docs.forEach(d => likesMeIds.add(d.data().from));
      setIncomingLikes(likesMeIds);

      // Собираем профили
      const loadedProfiles: DatingUser[] = [];
      const incomingLikesData: DatingUser[] = [];

      usersSnap.forEach((doc) => {
        if (doc.id !== user.uid) {
          const data = doc.data();
          const avatarFallback = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'A')}&background=random`;
          const profileData: DatingUser = {
            id: doc.id,
            name: data.name || 'Аноним',
            avatar: avatarFallback,
            gallery: data.gallery?.length > 0 ? data.gallery : [avatarFallback],
            interests: data.interests || [],
            age: data.age,
            role: data.role,
            type: data.type,
            lastSeen: data.lastSeen?.toMillis?.() || 0
          };

          // Добавляем в верхнюю панель симпатий тех, кто лайкнул нас (и кого мы еще не лайкнули)
          if (likesMeIds.has(doc.id) && !myLikedIds.has(doc.id)) {
            incomingLikesData.push(profileData);
          }

          // Показываем в ленте тех, кого мы ЕЩЕ НЕ ЛАЙКАЛИ
          if (!myLikedIds.has(doc.id)) {
            loadedProfiles.push(profileData);
          }
        }
      });

      setLikedProfilesData(incomingLikesData);

      // Умная сортировка ленты
      const now = Date.now();
      loadedProfiles.sort((a, b) => {
        // Те, кто нас лайкнул - в приоритете!
        if (likesMeIds.has(a.id) && !likesMeIds.has(b.id)) return -1;
        if (!likesMeIds.has(a.id) && likesMeIds.has(b.id)) return 1;

        const aOnline = (now - a.lastSeen!) < 15 * 60 * 1000;
        const bOnline = (now - b.lastSeen!) < 15 * 60 * 1000;
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        return Math.random() - 0.5;
      });

      setProfiles(loadedProfiles);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Ошибка загрузки анкет:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDatingData(); }, [user]);

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
    setPan({ x: clientX - startPanX.current, y: clientY - startPanY.current });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const threshold = window.innerWidth * 0.3;

    if (pan.x > threshold) processSwipe('like');
    else if (pan.x < -threshold) processSwipe('pass');
    else setPan({ x: 0, y: 0 }); // Отскок в центр
  };

  // ==========================================
  // 3. ЛОГИКА ОЦЕНКИ И МЭТЧА
  // ==========================================
  const processSwipe = async (action: 'like' | 'pass', customProfile?: DatingUser) => {
    const swipedUser = customProfile || profiles[currentIndex];
    if (!swipedUser || !user) return;

    const isMainCard = !customProfile || customProfile.id === profiles[currentIndex]?.id;

    // Анимация вылета только для карточек из основной ленты
    if (isMainCard) {
      setLeaveX(action === 'like' ? 1000 : -1000);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setPhotoIndex(0);
        setPan({ x: 0, y: 0 });
        setLeaveX(0);
      }, 300);
    } else {
      // Если мы свайпнули из модалки профиля
      setLikedProfilesData(prev => prev.filter(p => p.id !== swipedUser.id));
      if (action === 'like') {
        setProfiles(prev => prev.filter(p => p.id !== swipedUser.id));
      }
    }

    try {
      await addDoc(collection(db, 'dating_swipes'), {
        from: user.uid,
        to: swipedUser.id,
        action: action,
        createdAt: serverTimestamp()
      });

      // Удаляем из списка входящих лайков, если мы приняли решение
      setLikedProfilesData(prev => prev.filter(p => p.id !== swipedUser.id));

      if (action === 'like' && incomingLikes.has(swipedUser.id)) {
        const chatId = [user.uid, swipedUser.id].sort().join('_');
        await addDoc(collection(db, 'messages'), {
          chatId, type: 'system_status', statusText: '💕 Вы образовали пару! Начните общение прямо сейчас.',
          senderId: user.uid, receiverId: swipedUser.id, createdAt: serverTimestamp(), isRead: false 
        });
        setMatchData(swipedUser);
        setDetailedProfile(null);
      } else if (action === 'pass' && customProfile) {
         setDetailedProfile(null); // Просто закрываем профиль, если скипнули из модалки
      }
    } catch (error) { console.error("Ошибка сохранения свайпа:", error); }
  };

  const handleButtonSwipe = (action: 'like' | 'pass') => {
    if (isDragging || leaveX !== 0) return;
    processSwipe(action);
  };

  const handlePhotoClick = (direction: 'next' | 'prev', e: React.MouseEvent, maxPhotos: number) => {
    e.stopPropagation();
    if (Math.abs(pan.x) > 10 || Math.abs(pan.y) > 10) return;
    if (direction === 'prev') setPhotoIndex(p => Math.max(0, p - 1));
    else setPhotoIndex(p => Math.min(maxPhotos - 1, p + 1));
  };

  const getOnlineStatus = (lastSeen: number) => {
    if (!lastSeen) return 'Был(а) давно';
    const now = Date.now();
    const diffMins = Math.floor((now - lastSeen) / (1000 * 60));
    if (diffMins < 15) return 'В сети';
    if (diffMins < 60) return `${diffMins} мин назад`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    return 'Был(а) недавно';
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
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-gray-50 dark:bg-gray-950 relative select-none font-sans">
      
      {/* HEADER */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl sticky top-0 z-20 px-4 md:px-6 py-3 flex items-center justify-between shrink-0 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-400 rounded-[14px] flex items-center justify-center shadow-[0_4px_12px_rgba(236,72,153,0.3)]">
            <Flame size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Знакомства</h1>
        </div>
        
        <button onClick={fetchDatingData} className="w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* ПАНЕЛЬ СИМПАТИЙ (НОВЫЙ БЛОК) */}
      {likedProfilesData.length > 0 && (
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-3 shrink-0 z-10 flex gap-4 overflow-x-auto scrollbar-none items-center shadow-sm animate-fade-in">
          <div className="flex flex-col text-[10px] font-black uppercase tracking-widest text-pink-500 shrink-0 leading-tight border-r border-pink-100 dark:border-pink-900/30 pr-4">
            <span>Ваши</span>
            <span>Симпатии ({likedProfilesData.length})</span>
          </div>
          <div className="flex gap-3">
            {likedProfilesData.map(p => (
              <div 
                key={p.id} 
                onClick={() => setDetailedProfile(p)} 
                className="relative w-14 h-14 shrink-0 rounded-full border-[3px] border-pink-500 p-[2px] cursor-pointer hover:scale-105 transition-transform shadow-[0_4px_10px_rgba(236,72,153,0.2)]"
              >
                <img src={p.gallery[0] || p.avatar} className="w-full h-full rounded-full object-cover" />
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-pink-500 to-rose-500 rounded-full p-1 border-2 border-white dark:border-gray-900 shadow-sm">
                  <Heart size={12} className="text-white fill-white"/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ОСНОВНАЯ ЗОНА (КАРТОЧКИ) */}
      <div className="flex-1 relative overflow-hidden flex justify-center items-center p-4 pb-2">
        
        {/* ЕСЛИ АНКЕТЫ ЗАКОНЧИЛИСЬ (Цикл) */}
        {!activeProfile && (
          <div className="flex flex-col items-center justify-center text-center animate-fade-in p-6 z-0">
            <div className="w-24 h-24 bg-pink-50 dark:bg-pink-500/10 rounded-[24px] rotate-12 flex items-center justify-center mb-6">
              <RefreshCw size={40} className="text-pink-500 -rotate-12" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Новых анкет пока нет</h2>
            <p className="text-[15px] font-medium text-gray-500 dark:text-gray-400 max-w-xs mb-8">
              Вы просмотрели всех пользователей поблизости. Хотите пройтись по списку пропущенных заново?
            </p>
            <button 
              onClick={() => { setCurrentIndex(0); setPhotoIndex(0); }} 
              className="px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-pink-500/25 flex items-center gap-2"
            >
              <Zap size={18} className="fill-white" /> Пойти на новый круг
            </button>
          </div>
        )}

        {/* СЛЕДУЮЩАЯ КАРТОЧКА (Подложка) */}
        {nextProfile && (
          <div className="absolute inset-4 bottom-2 md:inset-y-4 md:inset-x-auto md:w-[420px] bg-gray-200 dark:bg-gray-800 rounded-[32px] shadow-sm overflow-hidden transform scale-[0.95] translate-y-4 opacity-60 z-0">
            <img src={nextProfile.gallery[0] || nextProfile.avatar} className="w-full h-full object-cover" />
          </div>
        )}

        {/* АКТИВНАЯ КАРТОЧКА */}
        {activeProfile && (
          <div 
            className="absolute inset-4 bottom-2 md:inset-y-4 md:inset-x-auto md:w-[420px] bg-white dark:bg-gray-900 rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.15)] overflow-hidden z-10 cursor-grab active:cursor-grabbing border border-gray-200/50 dark:border-gray-800"
            style={{
              transform: `translate(${leaveX || pan.x}px, ${pan.y}px) rotate(${(leaveX || pan.x) * 0.04}deg)`,
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
            <div className="relative w-full h-full bg-gray-900">
              
              {/* Индикаторы слайдов */}
              {activeProfile.gallery.length > 1 && (
                <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-30 pointer-events-none">
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

              {/* Зоны клика */}
              <div className="absolute inset-0 z-20 flex">
                <div className="w-1/2 h-full" onClick={(e) => handlePhotoClick('prev', e, activeProfile.gallery.length)} />
                <div className="w-1/2 h-full" onClick={(e) => handlePhotoClick('next', e, activeProfile.gallery.length)} />
              </div>

              {/* Картинка */}
              <img 
                src={activeProfile.gallery[photoIndex]} 
                alt="Photo" 
                draggable={false}
                className="w-full h-full object-cover pointer-events-none transition-opacity duration-200" 
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90 pointer-events-none" />
              
              {/* STAMPS */}
              <div className="absolute top-20 left-8 pointer-events-none z-30" style={{ opacity: pan.x > 0 ? pan.x / 100 : 0 }}>
                <div className="border-[5px] border-green-400 text-green-400 text-5xl font-black px-6 py-2 rounded-[20px] transform -rotate-[15deg] tracking-widest bg-black/20 backdrop-blur-md shadow-2xl">LIKE</div>
              </div>
              <div className="absolute top-20 right-8 pointer-events-none z-30" style={{ opacity: pan.x < 0 ? Math.abs(pan.x) / 100 : 0 }}>
                <div className="border-[5px] border-rose-500 text-rose-500 text-5xl font-black px-6 py-2 rounded-[20px] transform rotate-[15deg] tracking-widest bg-black/20 backdrop-blur-md shadow-2xl">NOPE</div>
              </div>

              {/* ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ */}
              <div className="absolute bottom-0 left-0 right-0 p-6 pt-20 pointer-events-none z-30 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <h2 className="text-3xl font-black text-white drop-shadow-lg flex items-center gap-2 tracking-tight leading-none mb-1">
                      {activeProfile.name}
                      {activeProfile.age ? <span className="font-medium text-white/80">, {activeProfile.age}</span> : ''}
                      {activeProfile.type === 'business' && <Star size={20} className="text-amber-400 fill-amber-400 ml-1 drop-shadow-md" />}
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg text-[12px] font-bold text-white border border-white/10">
                        <div className={`w-2 h-2 rounded-full ${getOnlineStatus(activeProfile.lastSeen!) === 'В сети' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                        {getOnlineStatus(activeProfile.lastSeen!)}
                      </div>
                      <div className="flex items-center gap-1 text-[13px] font-medium text-white/80 drop-shadow-md">
                        <MapPin size={14} /> Поблизости
                      </div>
                    </div>
                  </div>
                  
                  {/* Кнопка открытия профиля */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDetailedProfile(activeProfile); }}
                    className="w-12 h-12 rounded-full bg-white/10 border border-white/20 backdrop-blur-lg flex items-center justify-center text-white pointer-events-auto hover:bg-white/20 hover:scale-105 transition-all shadow-xl"
                  >
                    <ChevronDown size={24} className="transform rotate-180" />
                  </button>
                </div>
                
                {/* Теги (Интересы) */}
                {activeProfile.interests && activeProfile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pointer-events-none">
                    {activeProfile.interests.slice(0, 4).map((tag, idx) => (
                      <span key={idx} className="bg-gray-950/50 backdrop-blur-md px-3 py-1.5 rounded-xl text-[12px] font-bold text-white border border-white/10 shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* КОНТРОЛЛЫ (Кнопки Свайпа) */}
      <div className="pb-safe shrink-0 px-6 py-4 md:py-6 flex justify-center items-center gap-6 md:gap-10 z-20 bg-gray-50 dark:bg-gray-950">
        <button 
          onClick={() => handleButtonSwipe('pass')}
          disabled={!activeProfile || isDragging}
          className="w-16 h-16 md:w-20 md:h-20 bg-white dark:bg-gray-900 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-gray-100 dark:border-gray-800 flex items-center justify-center text-rose-500 hover:scale-110 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all disabled:opacity-50 disabled:hover:scale-100 group"
        >
          <X size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
        <button 
          onClick={() => handleButtonSwipe('like')}
          disabled={!activeProfile || isDragging}
          className="w-16 h-16 md:w-20 md:h-20 bg-white dark:bg-gray-900 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-gray-100 dark:border-gray-800 flex items-center justify-center text-green-500 hover:scale-110 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all disabled:opacity-50 disabled:hover:scale-100 group"
        >
          <Heart size={32} strokeWidth={3} className="fill-green-500/20 group-hover:scale-110 transition-transform duration-300" />
        </button>
      </div>

      {/* ========================================== */}
      {/* МОДАЛКА: ПОЛНЫЙ ПРОФИЛЬ */}
      {/* ========================================== */}
      {detailedProfile && (
        <div className="fixed inset-0 z-[150] bg-gray-950/90 backdrop-blur-sm flex justify-center items-end md:items-center p-0 md:p-4 animate-fade-in" onClick={() => setDetailedProfile(null)}>
          <div className="bg-white dark:bg-gray-900 w-full md:w-[460px] h-[95vh] md:h-auto md:max-h-[90vh] overflow-y-auto custom-scrollbar rounded-t-[32px] md:rounded-[32px] shadow-2xl flex flex-col relative animate-slide-up" onClick={e => e.stopPropagation()}>
            
            {/* Галерея анкеты */}
            <div className="relative h-[45vh] md:h-[50vh] bg-gray-100 dark:bg-gray-800 shrink-0">
              <img src={detailedProfile.gallery[photoIndex]} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />
              
              <button onClick={() => setDetailedProfile(null)} className="absolute top-4 right-4 w-10 h-10 bg-black/30 hover:bg-black/50 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md z-10">
                <ChevronDown size={24} />
              </button>
              
              {detailedProfile.gallery.length > 1 && (
                <>
                  <div className="absolute top-4 left-4 right-16 flex gap-1 z-10 pointer-events-none">
                    {detailedProfile.gallery.map((_, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i === photoIndex ? 'bg-white shadow-sm' : 'bg-white/30'}`} />
                    ))}
                  </div>
                  <button onClick={(e) => handlePhotoClick('prev', e, detailedProfile.gallery.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm z-10"><ChevronLeft size={24}/></button>
                  <button onClick={(e) => handlePhotoClick('next', e, detailedProfile.gallery.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/20 rounded-full flex items-center justify-center text-white backdrop-blur-sm z-10"><ChevronRight size={24}/></button>
                </>
              )}
            </div>
            
            <div className="flex-1 flex flex-col relative">
              
              {/* УВЕДОМЛЕНИЕ ЕСЛИ ЭТО ВЗАИМНАЯ СИМПАТИЯ (Кто-то лайкнул вас) */}
              {incomingLikes.has(detailedProfile.id) && (
                <div className="mx-6 mt-6 p-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl text-white shadow-lg shadow-pink-500/20 flex flex-col gap-1">
                  <h4 className="font-black text-[16px] flex items-center gap-1.5 tracking-tight"><Heart size={18} className="fill-white animate-pulse" /> Вы понравились!</h4>
                  <p className="text-[13px] font-medium text-pink-50">Ответьте взаимностью, чтобы образовать пару и начать переписку.</p>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-[28px] font-black text-gray-900 dark:text-white flex items-center gap-2 leading-none">
                      {detailedProfile.name}
                      {detailedProfile.age ? <span className="font-medium text-gray-500">{detailedProfile.age}</span> : ''}
                    </h2>
                    <div className="flex items-center gap-1.5 text-[14px] font-semibold text-gray-500 dark:text-gray-400 mt-2">
                      <div className={`w-2 h-2 rounded-full ${getOnlineStatus(detailedProfile.lastSeen!) === 'В сети' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      {getOnlineStatus(detailedProfile.lastSeen!)}
                    </div>
                  </div>
                </div>

                {detailedProfile.role && (
                  <div className="mb-6">
                    <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Info size={16}/> О себе</h3>
                    <p className="text-[16px] text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-[20px]">{detailedProfile.role}</p>
                  </div>
                )}
                
                {detailedProfile.interests && detailedProfile.interests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={16}/> Интересы</h3>
                    <div className="flex flex-wrap gap-2">
                      {detailedProfile.interests.map((tag, idx) => (
                        <span key={idx} className="bg-white dark:bg-gray-800 px-4 py-2 rounded-xl text-[14px] font-bold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* КНОПКИ ДЕЙСТВИЙ ВНИЗУ АНКЕТЫ */}
              <div className="mt-auto sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 p-4 pb-safe flex gap-3 z-20">
                <button 
                  onClick={() => processSwipe('pass', detailedProfile)} 
                  className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold flex justify-center items-center gap-2 transition-colors"
                >
                  <X size={20} /> Скрыть
                </button>
                <button 
                  onClick={() => processSwipe('like', detailedProfile)} 
                  className="flex-[2] py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl font-black flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-pink-500/25"
                >
                  <Heart size={20} className="fill-white" /> Ответить взаимностью
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* МОДАЛКА МЭТЧА (Пара совпала) */}
      {/* ========================================== */}
      {matchData && (
        <div className="fixed inset-0 z-[200] bg-gray-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
          
          <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-600 tracking-tight mb-10 text-center animate-scale-up drop-shadow-lg">
            IT'S A MATCH!
          </h2>

          <div className="flex items-center justify-center mb-12 relative animate-scale-up">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-gray-950 overflow-hidden relative z-10 transform translate-x-4 shadow-2xl">
              <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'Я')}`} className="w-full h-full object-cover" />
            </div>
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
              <MessageCircle size={20} className="fill-white" /> Написать сообщение
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
