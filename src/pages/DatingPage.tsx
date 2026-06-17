import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, X, RefreshCw, MessageCircle, Star, 
  MapPin, Flame, Sparkles, ChevronDown, ChevronLeft, ChevronRight, Zap,
  SlidersHorizontal, Check, Users
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
  gender?: string;
  location?: string;
}

const CITIES = ['Весь мир', 'Киев', 'Днепр', 'Львов', 'Одесса', 'Харьков', 'Запорожье'];

export default function DatingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  
  // Данные пользователей
  const [allProfiles, setAllProfiles] = useState<DatingUser[]>([]);
  const [profiles, setProfiles] = useState<DatingUser[]>([]); // Отфильтрованная лента
  const [likedMeProfiles, setLikedMeProfiles] = useState<DatingUser[]>([]); // Кто лайкнул меня
  const [myLikesProfiles, setMyLikesProfiles] = useState<DatingUser[]>([]); // Кого лайкнул я
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [incomingLikes, setIncomingLikes] = useState<Set<string>>(new Set());
  
  // UI Стейты
  const [sidebarTab, setSidebarTab] = useState<'likedMe' | 'myLikes'>('likedMe');
  const [detailedProfile, setDetailedProfile] = useState<DatingUser | null>(null); 
  const [matchData, setMatchData] = useState<DatingUser | null>(null);
  
  // Фильтры
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ lookingFor: 'Любой', city: 'Весь мир' });
  
  // Стейты физики свайпа
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [leaveX, setLeaveX] = useState(0);
  const startPanX = useRef(0);
  const startPanY = useRef(0);

  // ==========================================
  // 1. ЗАГРУЗКА И РАСПРЕДЕЛЕНИЕ ДАННЫХ
  // ==========================================
  const fetchDatingData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const usersQuery = query(collection(db, 'users'), where('goals', 'array-contains', 'dating'));
      const usersSnap = await getDocs(usersQuery);
      
      const mySwipesQuery = query(collection(db, 'dating_swipes'), where('from', '==', user.uid));
      const mySwipesSnap = await getDocs(mySwipesQuery);
      const myLikedIds = new Set<string>();
      const myPassedIds = new Set<string>();
      mySwipesSnap.docs.forEach(d => {
        if (d.data().action === 'like') myLikedIds.add(d.data().to);
        if (d.data().action === 'pass') myPassedIds.add(d.data().to);
      });

      const likesMeQuery = query(collection(db, 'dating_swipes'), where('to', '==', user.uid), where('action', '==', 'like'));
      const likesMeSnap = await getDocs(likesMeQuery);
      const likesMeIds = new Set<string>();
      likesMeSnap.docs.forEach(d => likesMeIds.add(d.data().from));
      setIncomingLikes(likesMeIds);

      const tempAllProfiles: DatingUser[] = [];
      const tempLikedMe: DatingUser[] = [];
      const tempMyLikes: DatingUser[] = [];

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
            lastSeen: data.lastSeen?.toMillis?.() || 0,
            gender: data.gender || 'Не указан',
            location: data.location || ''
          };

          tempAllProfiles.push(profileData);

          // Заполняем списки симпатий
          if (likesMeIds.has(doc.id) && !myLikedIds.has(doc.id) && !myPassedIds.has(doc.id)) {
            tempLikedMe.push(profileData);
          }
          if (myLikedIds.has(doc.id)) {
            tempMyLikes.push(profileData);
          }
        }
      });

      setAllProfiles(tempAllProfiles);
      setLikedMeProfiles(tempLikedMe);
      setMyLikesProfiles(tempMyLikes);
    } catch (error) {
      console.error("Ошибка загрузки анкет:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDatingData(); }, [user]);

  // ==========================================
  // ПРИМЕНЕНИЕ ФИЛЬТРОВ К ЛЕНТЕ
  // ==========================================
  useEffect(() => {
    let feed = allProfiles.filter(p => {
      // 1. Исключаем тех, кого мы уже лайкнули
      const alreadyLiked = myLikesProfiles.some(liked => liked.id === p.id);
      if (alreadyLiked) return false;

      // 2. Фильтр по полу (Если не 'Любой')
      if (filters.lookingFor !== 'Любой') {
        if (p.gender !== filters.lookingFor) return false;
      }

      // 3. Фильтр по городу (Если не 'Весь мир')
      if (filters.city !== 'Весь мир') {
        // Простая проверка вхождения строки города в location профиля
        if (!p.location?.toLowerCase().includes(filters.city.toLowerCase())) return false;
      }

      return true;
    });

    // Умная сортировка
    const now = Date.now();
    feed.sort((a, b) => {
      const aLikesMe = incomingLikes.has(a.id);
      const bLikesMe = incomingLikes.has(b.id);
      if (aLikesMe && !bLikesMe) return -1;
      if (!aLikesMe && bLikesMe) return 1;

      const aOnline = (now - a.lastSeen!) < 15 * 60 * 1000;
      const bOnline = (now - b.lastSeen!) < 15 * 60 * 1000;
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      return Math.random() - 0.5;
    });

    setProfiles(feed);
    setCurrentIndex(0);
    setPhotoIndex(0);
  }, [allProfiles, filters, incomingLikes, myLikesProfiles]);

  // ==========================================
  // 2. ФИЗИКА СВАЙПОВ
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
    else setPan({ x: 0, y: 0 });
  };

  // ==========================================
  // 3. ЛОГИКА ОЦЕНКИ И МЭТЧА
  // ==========================================
  const processSwipe = async (action: 'like' | 'pass', customProfile?: DatingUser) => {
    const swipedUser = customProfile || profiles[currentIndex];
    if (!swipedUser || !user) return;

    const isMainCard = !customProfile || customProfile.id === profiles[currentIndex]?.id;

    if (isMainCard) {
      setLeaveX(action === 'like' ? 1000 : -1000);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setPhotoIndex(0);
        setPan({ x: 0, y: 0 });
        setLeaveX(0);
      }, 300);
    } else {
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

      // Обновляем списки
      setLikedMeProfiles(prev => prev.filter(p => p.id !== swipedUser.id));
      if (action === 'like') {
        setMyLikesProfiles(prev => [...prev, swipedUser]);
      }

      if (action === 'like' && incomingLikes.has(swipedUser.id)) {
        const chatId = [user.uid, swipedUser.id].sort().join('_');
        await addDoc(collection(db, 'messages'), {
          chatId, type: 'system_status', statusText: '💕 Вы образовали пару! Начните общение прямо сейчас.',
          senderId: user.uid, receiverId: swipedUser.id, createdAt: serverTimestamp(), isRead: false 
        });
        setMatchData(swipedUser);
        setDetailedProfile(null);
      } else if (action === 'pass' && customProfile) {
         setDetailedProfile(null);
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

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#F2F2F7] dark:bg-gray-950 flex justify-center items-center transition-colors">
        <div className="animate-bounce bg-pink-100 dark:bg-pink-500/20 p-4 rounded-full">
          <Heart size={32} className="text-pink-500 animate-pulse fill-pink-500" />
        </div>
      </div>
    );
  }

  const activeProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  // Массив для вывода в боковой/верхней панели
  const activeSidebarData = sidebarTab === 'likedMe' ? likedMeProfiles : myLikesProfiles;

  return (
    <div className="flex h-[100dvh] w-full bg-gray-50 dark:bg-gray-950 overflow-hidden font-sans transition-colors relative">
      
      {/* ========================================== */}
      {/* 💻 ЛЕВАЯ КОЛОНКА (ПК) - СИМПАТИИ */}
      {/* ========================================== */}
      <div className="hidden lg:flex w-[380px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col z-10 transition-colors">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/30 shrink-0">
              <Flame size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Dating</h1>
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
            <button onClick={() => setSidebarTab('likedMe')} className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${sidebarTab === 'likedMe' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              Кому я нравлюсь {likedMeProfiles.length > 0 && <span className="ml-1 text-pink-500">{likedMeProfiles.length}</span>}
            </button>
            <button onClick={() => setSidebarTab('myLikes')} className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${sidebarTab === 'myLikes' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              Мои симпатии
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pt-0">
          <div className="grid grid-cols-2 gap-3">
            {activeSidebarData.map(p => (
              <div key={p.id} onClick={() => setDetailedProfile(p)} className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden cursor-pointer group hover:shadow-md transition-all border border-gray-100 dark:border-gray-700">
                <div className="relative h-40">
                  <img src={p.gallery[0] || p.avatar} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <h4 className="text-white font-bold text-[13px] truncate">{p.name}</h4>
                  </div>
                  {sidebarTab === 'likedMe' && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-sm">
                      <Heart size={10} className="text-white fill-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {activeSidebarData.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 opacity-50 py-10 text-center">
              <Users size={48} className="mb-3" />
              <p className="text-[14px] font-bold px-4">{sidebarTab === 'likedMe' ? 'У вас пока нет новых симпатий' : 'Вы еще никого не лайкнули'}</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* 📱 ЦЕНТРАЛЬНАЯ ЧАСТЬ (Лента) */}
      {/* ========================================== */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* МИНИМАЛИСТИЧНЫЙ HEADER */}
        <div className="absolute top-0 left-0 right-0 z-20 pt-[env(safe-area-inset-top)] px-4 py-4 flex items-center justify-between pointer-events-none">
          {/* На мобилках логотип показываем поверх карточек */}
          <div className="lg:hidden w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/20 pointer-events-auto">
            <Flame size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="hidden lg:block"></div> {/* Spacer */}

          <button onClick={() => setShowFilters(true)} className="w-10 h-10 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full flex items-center justify-center text-white pointer-events-auto transition-colors border border-white/20 shadow-lg">
            <SlidersHorizontal size={20} />
          </button>
        </div>

        {/* МОБИЛЬНАЯ ПАНЕЛЬ СИМПАТИЙ (Видна только на узких экранах) */}
        <div className="lg:hidden absolute top-[env(safe-area-inset-top)] left-16 right-16 z-20 overflow-x-auto scrollbar-none pointer-events-auto flex items-center gap-2 pt-1 pb-4">
          {likedMeProfiles.map(p => (
            <div key={p.id} onClick={() => setDetailedProfile(p)} className="relative w-10 h-10 shrink-0 rounded-full border-2 border-pink-500 p-0.5 cursor-pointer shadow-lg bg-white/20 backdrop-blur-md">
              <img src={p.gallery[0] || p.avatar} className="w-full h-full rounded-full object-cover" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full border border-white"></div>
            </div>
          ))}
        </div>

        {/* ОСНОВНАЯ ЗОНА С КАРТОЧКАМИ */}
        <div className="flex-1 relative overflow-hidden flex justify-center items-center bg-gray-950 pb-20 md:pb-24">
          
          {/* Подложка "Пусто" */}
          {!activeProfile && (
            <div className="flex flex-col items-center justify-center text-center animate-fade-in p-6 z-0">
              <div className="w-24 h-24 bg-white/5 rounded-[24px] rotate-12 flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10">
                <RefreshCw size={40} className="text-white/50 -rotate-12" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Новых анкет пока нет</h2>
              <p className="text-[15px] font-medium text-white/50 max-w-xs mb-8">
                Вы просмотрели всех пользователей по заданным фильтрам. Попробуйте изменить поиск или пройдитесь по ленте заново.
              </p>
              <button 
                onClick={() => { fetchDatingData(); }} 
                className="px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-2xl active:scale-95 transition-transform shadow-lg shadow-pink-500/25 flex items-center gap-2"
              >
                <Zap size={18} className="fill-white" /> Обновить анкеты
              </button>
            </div>
          )}

          {/* Карточки */}
          {nextProfile && (
            <div className="absolute inset-0 md:inset-y-6 md:inset-x-auto md:w-[440px] bg-gray-900 md:rounded-[32px] overflow-hidden transform scale-[0.95] translate-y-4 opacity-50 z-0">
              <img src={nextProfile.gallery[0] || nextProfile.avatar} className="w-full h-full object-cover blur-sm" />
            </div>
          )}

          {activeProfile && (
            <div 
              className="absolute inset-0 md:inset-y-6 md:inset-x-auto md:w-[440px] bg-gray-900 md:rounded-[32px] shadow-2xl overflow-hidden z-10 cursor-grab active:cursor-grabbing border-0 md:border border-white/10"
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
              <div className="relative w-full h-full">
                
                {/* Индикаторы слайдов */}
                {activeProfile.gallery.length > 1 && (
                  <div className="absolute top-[env(safe-area-inset-top)] pt-16 lg:pt-4 left-4 right-4 flex gap-1.5 z-30 pointer-events-none">
                    {activeProfile.gallery.map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i === photoIndex ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/30 backdrop-blur-sm'}`} />
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
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none transition-opacity duration-200" 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/90 pointer-events-none" />
                
                {/* STAMPS */}
                <div className="absolute top-1/4 left-8 pointer-events-none z-30" style={{ opacity: pan.x > 0 ? pan.x / 100 : 0 }}>
                  <div className="border-[4px] border-green-400 text-green-400 text-5xl font-black px-6 py-2 rounded-2xl transform -rotate-[15deg] tracking-widest bg-black/20 backdrop-blur-md shadow-2xl">LIKE</div>
                </div>
                <div className="absolute top-1/4 right-8 pointer-events-none z-30" style={{ opacity: pan.x < 0 ? Math.abs(pan.x) / 100 : 0 }}>
                  <div className="border-[4px] border-rose-500 text-rose-500 text-5xl font-black px-6 py-2 rounded-2xl transform rotate-[15deg] tracking-widest bg-black/20 backdrop-blur-md shadow-2xl">NOPE</div>
                </div>

                {/* ИНФОРМАЦИЯ */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pt-32 pointer-events-none z-30">
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <h2 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg flex items-center gap-2 tracking-tight leading-none mb-2">
                        {activeProfile.name}
                        {activeProfile.age ? <span className="font-medium text-white/90">{activeProfile.age}</span> : ''}
                        {activeProfile.type === 'business' && <Star size={24} className="text-amber-400 fill-amber-400 ml-1 drop-shadow-md" />}
                      </h2>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[12px] font-bold text-white border border-white/10 shadow-sm">
                          <div className={`w-2 h-2 rounded-full ${getOnlineStatus(activeProfile.lastSeen!) === 'В сети' ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                          {getOnlineStatus(activeProfile.lastSeen!)}
                        </div>
                        <div className="flex items-center gap-1 text-[13px] font-medium text-white/90 drop-shadow-md">
                          <MapPin size={14} /> {activeProfile.location || 'Поблизости'}
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); setDetailedProfile(activeProfile); }}
                      className="w-12 h-12 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl flex items-center justify-center text-white pointer-events-auto hover:bg-white/30 hover:scale-105 transition-all shadow-xl mb-1"
                    >
                      <Info size={24} />
                    </button>
                  </div>
                  
                  {activeProfile.interests && activeProfile.interests.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pointer-events-none">
                      {activeProfile.interests.slice(0, 4).map((tag, idx) => (
                        <span key={idx} className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-[12px] font-bold text-white border border-white/10 shadow-sm">
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

        {/* КНОПКИ УПРАВЛЕНИЯ */}
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+20px)] left-0 right-0 flex justify-center items-center gap-6 md:gap-12 z-20 pointer-events-none">
          <button 
            onClick={() => handleButtonSwipe('pass')}
            disabled={!activeProfile || isDragging}
            className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20 flex items-center justify-center text-rose-500 hover:scale-110 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50 disabled:hover:scale-100 pointer-events-auto"
          >
            <X size={32} strokeWidth={3} />
          </button>
          <button 
            onClick={() => handleButtonSwipe('like')}
            disabled={!activeProfile || isDragging}
            className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20 flex items-center justify-center text-green-400 hover:scale-110 hover:bg-green-500 hover:text-white transition-all disabled:opacity-50 disabled:hover:scale-100 pointer-events-auto"
          >
            <Heart size={32} strokeWidth={3} className="fill-current" />
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* МОДАЛКА: ФИЛЬТРЫ */}
      {/* ========================================== */}
      {showFilters && (
        <div className="fixed inset-0 z-[300] bg-white dark:bg-gray-950 md:bg-gray-950/80 md:backdrop-blur-sm flex justify-center md:items-center p-0 md:p-4 animate-fade-in flex-col">
          <div className="bg-white dark:bg-gray-900 w-full md:w-[400px] h-full md:h-auto md:rounded-[32px] shadow-2xl flex flex-col relative animate-slide-up">
            <div className="pt-[env(safe-area-inset-top)] px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Кого ищем?</h2>
              <button onClick={() => setShowFilters(false)} className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500"><X size={18} /></button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-8">
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Пол</label>
                <div className="flex gap-2">
                  {['Любой', 'Мужской', 'Женский'].map(g => (
                    <button 
                      key={g} 
                      onClick={() => setFilters({ ...filters, lookingFor: g })}
                      className={`flex-1 py-3 rounded-xl font-bold text-[14px] transition-colors border ${filters.lookingFor === g ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-500/20' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Город (Украина)</label>
                <div className="grid grid-cols-2 gap-2">
                  {CITIES.map(c => (
                    <button 
                      key={c} 
                      onClick={() => setFilters({ ...filters, city: c })}
                      className={`py-3 rounded-xl font-bold text-[14px] transition-colors border flex items-center justify-center gap-2 ${filters.city === c ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}
                    >
                      {c === 'Весь мир' && <Globe size={16} opacity={0.5} />} {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 pt-4 border-t border-gray-100 dark:border-gray-800 pb-[calc(env(safe-area-inset-bottom)+24px)]">
              <button onClick={() => setShowFilters(false)} className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black rounded-2xl active:scale-95 transition-transform shadow-lg shadow-pink-500/25">
                Показать результаты
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* МОДАЛКА: ПОЛНЫЙ ПРОФИЛЬ */}
      {/* ========================================== */}
      {detailedProfile && (
        <div className="fixed inset-0 z-[250] bg-gray-950/90 backdrop-blur-sm flex justify-center items-end md:items-center p-0 md:p-4 animate-fade-in" onClick={() => setDetailedProfile(null)}>
          <div className="bg-white dark:bg-gray-900 w-full md:w-[460px] h-[95vh] md:h-auto md:max-h-[90vh] overflow-y-auto custom-scrollbar rounded-t-[32px] md:rounded-[32px] shadow-2xl flex flex-col relative animate-slide-up transition-colors" onClick={e => e.stopPropagation()}>
            
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
              {/* Уведомление о взаимной симпатии */}
              {incomingLikes.has(detailedProfile.id) && !myLikesProfiles.some(p => p.id === detailedProfile.id) && (
                <div className="mx-6 mt-6 p-4 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl text-white shadow-lg shadow-pink-500/20 flex flex-col gap-1">
                  <h4 className="font-black text-[16px] flex items-center gap-1.5 tracking-tight"><Heart size={18} className="fill-white animate-pulse" /> Вы понравились!</h4>
                  <p className="text-[13px] font-medium text-pink-50">Ответьте взаимностью, чтобы образовать пару и начать переписку.</p>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-[28px] font-black text-gray-900 dark:text-white flex items-center gap-2 leading-none mb-2">
                      {detailedProfile.name}
                      {detailedProfile.age ? <span className="font-medium text-gray-500">{detailedProfile.age}</span> : ''}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5 text-[14px] font-semibold text-gray-500 dark:text-gray-400">
                        <div className={`w-2 h-2 rounded-full ${getOnlineStatus(detailedProfile.lastSeen!) === 'В сети' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        {getOnlineStatus(detailedProfile.lastSeen!)}
                      </div>
                      <div className="flex items-center gap-1 text-[13px] font-medium text-gray-400">
                        <MapPin size={14} /> {detailedProfile.location || 'Поблизости'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Кнопка "Написать" доступна только если уже есть мэтч (он в моих лайках И лайкнул меня) */}
                  {(myLikesProfiles.some(p => p.id === detailedProfile.id) && incomingLikes.has(detailedProfile.id)) && (
                    <button 
                      onClick={() => navigate('/chats', { state: { selectedUserId: detailedProfile.id } })}
                      className="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/30 transition-transform active:scale-95 shrink-0"
                      title="Написать сообщение"
                    >
                      <MessageCircle size={22} className="fill-white" />
                    </button>
                  )}
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
                        <span key={idx} className="bg-white dark:bg-gray-800 px-4 py-2 rounded-xl text-[14px] font-bold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* КНОПКИ ДЕЙСТВИЙ ВНИЗУ АНКЕТЫ */}
              <div className="mt-auto sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 pt-4 pb-[calc(env(safe-area-inset-bottom)+16px)] px-4 flex gap-3 z-20">
                {myLikesProfiles.some(p => p.id === detailedProfile.id) ? (
                  // Если профиль уже лайкнут
                  <div className="w-full flex justify-center py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl font-bold flex items-center gap-2 cursor-not-allowed">
                    <Check size={20} /> {incomingLikes.has(detailedProfile.id) ? 'У вас взаимная симпатия!' : 'Симпатия отправлена'}
                  </div>
                ) : (
                  // Обычные кнопки свайпа
                  <>
                    <button 
                      onClick={() => processSwipe('pass', detailedProfile)} 
                      className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold flex justify-center items-center gap-2 transition-colors"
                    >
                      <X size={20} /> Скрыть
                    </button>
                    <button 
                      onClick={() => processSwipe('like', detailedProfile)} 
                      className="flex-[1.5] py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl font-black flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-pink-500/25"
                    >
                      <Heart size={20} className="fill-white" /> {incomingLikes.has(detailedProfile.id) ? 'Ответить взаимностью' : 'Лайк'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* МОДАЛКА МЭТЧА (Пара совпала) */}
      {/* ========================================== */}
      {matchData && (
        <div className="fixed inset-0 z-[300] bg-gray-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
          
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

          <div className="w-full max-w-sm space-y-4 z-30">
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
