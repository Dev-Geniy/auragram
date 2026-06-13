import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { MessageCircle, Briefcase, User as UserIcon, Sparkles, MapPin } from 'lucide-react';

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
}

export default function FeedPage({ currentSync, userGender }: FeedPageProps) {
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка пользователей из Firebase
  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const loadedProfiles: UserProfile[] = [];
        
        querySnapshot.forEach((doc) => {
          // Исключаем самого себя из выдачи
          if (doc.id !== user?.uid) {
            loadedProfiles.push({ id: doc.id, ...doc.data() } as UserProfile);
          }
        });
        
        setProfiles(loadedProfiles);
      } catch (error) {
        console.error('Ошибка при загрузке анкет:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, [user]);

  // Умная фильтрация AuraSync
  const filteredProfiles = profiles.filter(profile => {
    // 1. Фильтр по типу аккаунта (Все / Люди / Бизнес)
    if (currentSync !== 'all' && profile.type !== currentSync) {
      return false;
    }
    
    // 2. Фильтр по полу (работает только если мы не ищем чисто бизнес)
    if (currentSync !== 'business' && userGender !== 'all') {
      if (profile.type === 'personal' && profile.userGender !== userGender) {
        return false;
      }
    }
    
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="w-12 h-12 border-4 border-brand/30 border-t-brand rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">Радар сканирует окружение...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Шапка Радара */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Радар AuraSync</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                  {currentSync === 'business' ? <Briefcase size={12} /> : currentSync === 'personal' ? <UserIcon size={12} /> : <Sparkles size={12} />}
                  {currentSync === 'all' ? 'Поиск по всем' : currentSync === 'business' ? 'Только B2B' : 'Только люди'}
                </span>
                {currentSync !== 'business' && userGender !== 'all' && (
                  <span className="bg-gray-100 px-2 py-0.5 rounded-md">
                    Пол: {userGender === 'male' ? 'Мужской' : 'Женский'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-xl">
            Найдено: {filteredProfiles.length}
          </p>
        </div>

        {/* Сетка анкет */}
        {filteredProfiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => (
              <div key={profile.id} className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-all group flex flex-col">
                
                {/* Аватар и статус */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  <img 
                    src={profile.avatar || `https://ui-avatars.com/api/?name=${profile.name}&background=random`} 
                    alt={profile.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  
                  <div className="absolute top-4 left-4">
                    {profile.type === 'business' ? (
                      <span className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm">
                        Бизнес
                      </span>
                    ) : (
                      <span className="bg-brand text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm">
                        Личный
                      </span>
                    )}
                  </div>
                  
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-bold text-xl text-white drop-shadow-md truncate">{profile.name}</h3>
                    <p className="text-white/80 text-xs font-medium truncate flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> Global
                    </p>
                  </div>
                </div>
                
                {/* Информация */}
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">{profile.role || 'Пользователь не добавил описание'}</p>
                  
                  <div className="flex flex-wrap gap-1.5 mb-5 mt-auto">
                    {profile.skills?.slice(0, 4).map((skill, i) => (
                      <span key={i} className="text-[10px] font-bold bg-brand/5 text-brand px-2 py-1 rounded-md border border-brand/10">
                        {skill}
                      </span>
                    ))}
                    {profile.skills?.length > 4 && (
                      <span className="text-[10px] font-bold bg-gray-50 text-gray-500 px-2 py-1 rounded-md">
                        +{profile.skills.length - 4}
                      </span>
                    )}
                  </div>
                  
                  {/* Кнопка связи */}
                  <button className="w-full py-3 bg-gray-50 hover:bg-brand text-gray-900 hover:text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 group/btn">
                    <MessageCircle size={18} className="group-hover/btn:scale-110 transition-transform" />
                    Написать сообщение
                  </button>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center h-[50vh]">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
              <Sparkles size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">На радаре пока пусто</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Мы не нашли пользователей по вашим текущим фильтрам ({currentSync === 'business' ? 'Бизнес' : currentSync === 'personal' ? 'Люди' : 'Все'}). 
              Попробуйте изменить настройки в профиле.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
