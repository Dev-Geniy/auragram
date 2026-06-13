import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import { Store, Search, Building2, MapPin, ExternalLink, Briefcase, Sparkles, X } from 'lucide-react';

interface BusinessProfile {
  id: string;
  name: string;
  role: string;
  skills: string[];
  avatar: string;
}

export default function MarketPage() {
  const { user } = useAuthStore();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinesses = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'users'), where('type', '==', 'business'));
        const querySnapshot = await getDocs(q);
        const loadedBusinesses: BusinessProfile[] = [];
        
        querySnapshot.forEach((doc) => {
          if (doc.id !== user?.uid) {
            loadedBusinesses.push({ id: doc.id, ...doc.data() } as BusinessProfile);
          }
        });
        
        setBusinesses(loadedBusinesses);
      } catch (error) {
        console.error('Ошибка при загрузке бизнес-аккаунтов:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinesses();
  }, [user]);

  // Умный подсчет и сортировка тегов по популярности
  const topTags = useMemo(() => {
    const tagCounts = businesses.reduce((acc, company) => {
      company.skills?.forEach(skill => {
        const normalizedSkill = skill.trim();
        acc[normalizedSkill] = (acc[normalizedSkill] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1]) // Сортируем по убыванию популярности
      .slice(0, 6)                 // Берем топ-6
      .map(entry => entry[0]);
  }, [businesses]);

  const filteredBusinesses = businesses.filter(b => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !searchLower ||
      (b.name || '').toLowerCase().includes(searchLower) ||
      (b.role || '').toLowerCase().includes(searchLower) ||
      (b.skills || []).some(s => s.toLowerCase().includes(searchLower));
      
    const matchesTag = selectedTag ? (b.skills || []).includes(selectedTag) : true;
    
    return matchesSearch && matchesTag;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6 md:p-10 select-none">
      <div className="max-w-6xl mx-auto">
        
        {/* ВЕРХНЯЯ ПАНЕЛЬ (ENTERPRISE HEADER) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight flex items-center gap-3">
              B2B Маркетплейс
              <Sparkles size={24} className="text-amber-500 animate-pulse" />
            </h1>
            <p className="text-sm text-gray-500 mt-2 font-medium max-w-2xl">
              Экосистема проверенных корпоративных услуг и технологических партнеров. Находите решения для масштабирования вашего бизнеса.
            </p>
          </div>
          
          <Link 
            to="/profile" 
            className="inline-flex items-center justify-center gap-2.5 bg-gray-950 hover:bg-gray-800 text-white px-6 py-3.5 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <Briefcase size={16} />
            Мой бизнес-профиль
          </Link>
        </div>

        {/* СТРОКА ПОИСКА И БЫСТРЫЕ ФИЛЬТРЫ */}
        <div className="space-y-5 mb-12">
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm flex items-center transition-all focus-within:border-amber-400 focus-within:shadow-[0_4px_20px_rgba(245,158,11,0.08)]">
            <div className="pl-6 pr-3 text-gray-400 shrink-0">
              <Search size={20} />
            </div>
            <input 
              type="text" 
              placeholder="Поиск по названию компании, ключевым услугам или стеку технологий..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none py-4 px-2 text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-semibold"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="pr-6 text-gray-300 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Быстрые теги (Тренды) */}
          {topTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mr-2">Тренды:</span>
              <button
                onClick={() => setSelectedTag(null)}
                className={`px-4 py-2 rounded-xl font-bold transition-all duration-200 ${!selectedTag ? 'bg-gray-950 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200/60 hover:border-gray-300 hover:text-gray-900'}`}
              >
                Все категории
              </button>
              {topTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-4 py-2 rounded-xl font-bold transition-all duration-200 ${selectedTag === tag ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-white text-gray-500 border border-gray-200/60 hover:border-gray-300 hover:text-gray-900'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* СЕТКА С КАРТОЧКАМИ */}
        {isLoading ? (
          /* Премиальный Skeleton Loader */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-7 border border-gray-100 space-y-6 animate-pulse shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100/80 rounded-2xl shrink-0" />
                  <div className="space-y-3 flex-1">
                    <div className="h-4 bg-gray-100/80 rounded-md w-1/3" />
                    <div className="h-5 bg-gray-100/80 rounded-md w-3/4" />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="h-3 bg-gray-100/80 rounded w-full" />
                  <div className="h-3 bg-gray-100/80 rounded w-full" />
                  <div className="h-3 bg-gray-100/80 rounded w-4/5" />
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="h-7 bg-gray-100/80 rounded-lg w-16" />
                  <div className="h-7 bg-gray-100/80 rounded-lg w-20" />
                  <div className="h-7 bg-gray-100/80 rounded-lg w-14" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.length > 0 ? (
              filteredBusinesses.map(company => (
                <div key={company.id} className="bg-white rounded-3xl p-7 border border-gray-200/60 shadow-sm hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1 hover:border-amber-200/60 transition-all duration-300 group flex flex-col h-full relative overflow-hidden">
                  
                  <div className="flex items-start gap-4 mb-6">
                    <img 
                      src={company.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=f59e0b&color=fff`} 
                      alt={company.name} 
                      className="w-16 h-16 rounded-2xl object-cover border border-gray-100 bg-gray-50 shadow-sm" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md w-max mb-2">
                        <Building2 size={10} /> Корпоративный
                      </div>
                      <h3 className="font-bold text-gray-950 leading-snug truncate text-lg group-hover:text-amber-600 transition-colors">
                        {company.name || 'Без названия'}
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 font-semibold">
                        <MapPin size={11} /> Верифицирован
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-6 flex-1 line-clamp-3 leading-relaxed font-medium">
                    {company.role || 'Описание деятельности компании не предоставлено. Свяжитесь напрямую для получения деталей.'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-8">
                    {(company.skills || []).map((skill, i) => (
                      <span key={i} className="text-[10px] font-bold bg-gray-50 text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200/60">
                        {skill}
                      </span>
                    ))}
                  </div>
                  
                  <Link
                    to="/"
                    className="w-full py-3.5 bg-gray-50 group-hover:bg-amber-500 text-gray-900 group-hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ExternalLink size={16} />
                    Открыть диалог
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-gray-200/60 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-5 border border-gray-100">
                  <Store size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ничего не найдено</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto font-medium leading-relaxed">
                  Мы не смогли найти компании по вашему запросу. Попробуйте изменить параметры поиска или сбросить фильтры.
                </p>
                {(searchQuery || selectedTag) && (
                  <button 
                    onClick={() => { setSearchQuery(''); setSelectedTag(null); }}
                    className="mt-6 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors"
                  >
                    Сбросить все фильтры
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
