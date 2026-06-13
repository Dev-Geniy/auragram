import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import { MessageCircle, Briefcase, User as UserIcon, Sparkles, MapPin, Activity, ShoppingBag } from 'lucide-react';

interface FeedPageProps {
  currentSync: 'all' | 'business' | 'personal';
  userGender: 'all' | 'male' | 'female';
}

interface UserProfile {
  id: string;
  name: string;
  type: 'personal' | 'business';
  userGender: 'male' | 'female' | 'none';
  role: string;
  skills: string[];
  avatar: string;
  products?: any[]; // Добавили поле для проверки товаров
}

export default function FeedPage({ currentSync, userGender }: FeedPageProps) {
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const loadedProfiles: UserProfile[] = [];
        
        querySnapshot.forEach((doc) => {
          if (doc.id !== user?.uid) {
            loadedProfiles.push({ id: doc.id, ...doc.data() } as UserProfile);
          }
        });
        
        setProfiles(loadedProfiles);
      } catch (error) {
        console.error('Ошибка при сканировании радара:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, [user]);

  const filteredProfiles = profiles.filter(profile => {
    if (currentSync !== 'all' && profile.type !== currentSync) {
      return false;
    }
    
    if (currentSync !== 'business' && userGender !== 'all') {
      if (profile.type === 'personal' && profile.userGender !== userGender) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6 md:p-10 select-none pb-24">
      <div className="max-w-6xl mx-auto">
        
        {/* ВЕРХНЯЯ ПАНЕЛЬ (РАДАР) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand">Live Radar Active</span>
            </div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight flex items-center gap-3">
              AuraSync Network
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-3">
              <span className="flex items-center gap-1.5 bg-white border border-gray-200/60 shadow-sm px-3 py-1.5 rounded-xl font-semibold">
                {currentSync === 'business' ? <Briefcase size={14} className="text-amber-500" /> : currentSync === 'personal' ? <UserIcon size={14} className="text-brand" /> : <Sparkles size={14} className="text-purple-500" />}
                {currentSync === 'all' ? 'Поиск по всем профилям' : currentSync === 'business' ? 'Только B2B партнеры' : 'Только личные профили'}
              </span>
              {currentSync !== 'business' && userGender !== 'all' && (
                <span className="bg-white border border-gray-200/60 shadow-sm px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5">
                  Пол: {userGender === 'male' ? 'Мужской' : 'Женский'}
                </span>
              )}
            </div>
          </div>
          
          <div className="bg-white border border-gray-200/60 shadow-sm px-5 py-3 rounded-2xl flex items-center gap-3">
            <Activity size={18} className="text-gray-400" />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Найдено рядом</p>
              <p className="text-sm font-black text-gray-900 leading-none mt-0.5">{filteredProfiles.length} профилей</p>
            </div>
          </div>
        </div>

        {/* СЕТКА АНКЕТ */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm animate-pulse flex flex-col">
                <div className="h-48 bg-gray-200/60 w-full" />
                <div className="p-6 space-y-4 flex-1">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-5/6" />
                  <div className="pt-4 mt-auto">
                    <div className="h-11 bg-gray-100 rounded-xl w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProfiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => (
              <div key={profile.id} className="bg-white rounded-[2rem] overflow-hidden border border-gray-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-gray-300 transition-all duration-300 group flex flex-col">
                
                <div className="relative h-56 bg-gray-100 overflow-hidden shrink-0">
                  <img 
                    src={profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=random`} 
                    alt={profile.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-900/40 to-transparent"></div>
                  
                  <div className="absolute top-4 left-4 flex gap-2">
                    {profile.type === 'business' ? (
                      <span className="bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-sm backdrop-blur-sm">
                        Бизнес
                      </span>
                    ) : (
                      <span className="bg-brand text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg shadow-sm backdrop-blur-sm">
                        Личный
                      </span>
                    )}
                  </div>
                  
                  <div className="absolute bottom-4 left-5 right-5">
                    <h3 className="font-black text-xl text-white drop-shadow-md truncate tracking-tight">{profile.name || 'Пользователь'}</h3>
                    <p className="text-white/80 text-[11px] font-semibold truncate flex items-center gap-1 mt-1">
                      <MapPin size={12} /> В вашей сети
                    </p>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-[13px] text-gray-600 mb-5 line-clamp-2 min-h-[40px] font-medium leading-relaxed">
                    {profile.role || 'Пользователь пока не добавил описание профиля.'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6 mt-auto">
                    {(profile.skills || []).slice(0, 4).map((skill, i) => (
                      <span key={i} className="text-[10px] font-bold bg-gray-50 text-gray-500 px-2.5 py-1.5 rounded-lg border border-gray-200/60">
                        {skill}
                      </span>
                    ))}
                    {(profile.skills || []).length > 4 && (
                      <span className="text-[10px] font-bold bg-gray-50 text-gray-400 px-2.5 py-1.5 rounded-lg border border-gray-200/60">
                        +{(profile.skills || []).length - 4}
                      </span>
                    )}
                  </div>
                  
                  {/* ИНТЕЛЛЕКТУАЛЬНЫЕ КНОПКИ ДЕЙСТВИЙ */}
                  <div className="flex items-center gap-2 w-full mt-auto">
                    {/* Если это бизнес и у него есть товары — показываем кнопку "В магазин" */}
                    {profile.type === 'business' && profile.products && profile.products.length > 0 && (
                      <Link 
                        to={`/shop/${profile.id}`}
                        className="flex-1 py-3.5 bg-gray-50 hover:bg-amber-500 text-gray-900 hover:text-white font-bold text-[10px] sm:text-[11px] uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm group/btn"
                      >
                        <ShoppingBag size={16} className="group-hover/btn:scale-110 transition-transform duration-300" />
                        <span className="truncate">В магазин</span>
                      </Link>
                    )}

                    {/* Кнопка "Написать" с передачей состояния (state) */}
                    <Link 
                      to="/chats" 
                      state={{ selectedUserId: profile.id }}
                      className="flex-1 py-3.5 bg-gray-50 hover:bg-gray-950 text-gray-900 hover:text-white font-bold text-[10px] sm:text-[11px] uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm group/btn2"
                    >
                      <MessageCircle size={16} className="group-hover/btn2:scale-110 transition-transform duration-300" />
                      <span className="truncate">Написать</span>
                    </Link>
                  </div>

                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-16 text-center border border-gray-200/60 shadow-sm flex flex-col items-center justify-center min-h-[50vh]">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-brand/20 rounded-full animate-ping"></div>
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 relative z-10 border border-gray-100">
                <Sparkles size={32} />
              </div>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Вне зоны доступа</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto font-medium leading-relaxed">
              Радар не зафиксировал пользователей по фильтру. 
              Попробуйте расширить зону поиска.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
