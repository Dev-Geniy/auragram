import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Store, Search, Building2, MapPin, ExternalLink, Briefcase } from 'lucide-react';

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

  useEffect(() => {
    const fetchBusinesses = async () => {
      setIsLoading(true);
      try {
        // Делаем целевой запрос в Firestore: только аккаунты с типом 'business'
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
        console.error('Ошибка при загрузке бизнесов:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinesses();
  }, [user]);

  // Локальный поиск по названию, описанию или тегам
  const filteredBusinesses = businesses.filter(b => 
    b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Шапка Маркетплейса */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Store size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">B2B Витрина</h1>
              <p className="text-gray-500 mt-1 font-medium">Каталог компаний, услуг и корпоративных партнеров</p>
            </div>
          </div>
          
          <button className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2">
            <Briefcase size={18} />
            Мой бизнес-профиль
          </button>
        </div>

        {/* Строка поиска */}
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm mb-8 flex items-center focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
          <div className="pl-4 pr-2 text-gray-400">
            <Search size={20} />
          </div>
          <input 
            type="text" 
            placeholder="Поиск по названию компании, услугам или технологиям..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none py-3 px-2 text-sm focus:outline-none text-gray-900 placeholder-gray-400 font-medium"
          />
        </div>

        {/* Состояние загрузки */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          /* Сетка компаний */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.length > 0 ? (
              filteredBusinesses.map(company => (
                <div key={company.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all group flex flex-col h-full">
                  
                  <div className="flex items-start gap-4 mb-5">
                    <img 
                      src={company.avatar || `https://ui-avatars.com/api/?name=${company.name}&background=f59e0b&color=fff`} 
                      alt={company.name} 
                      className="w-16 h-16 rounded-2xl object-cover border border-gray-50 shadow-sm group-hover:scale-105 transition-transform" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg w-max mb-2">
                        <Building2 size={12} /> B2B
                      </div>
                      <h3 className="font-bold text-gray-900 leading-tight truncate text-lg group-hover:text-amber-600 transition-colors">
                        {company.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <MapPin size={12} /> Global Market
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-5 flex-1 line-clamp-3 leading-relaxed">
                    {company.role || 'Компания не предоставила описание своих услуг.'}
                  </p>
                  
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {company.skills?.map((skill, i) => (
                      <span key={i} className="text-[11px] font-bold bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                  
                  <button className="w-full py-3 bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 group/btn">
                    <ExternalLink size={18} className="group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5 transition-transform" />
                    Связаться с бизнесом
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4">
                  <Store size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ничего не найдено</h3>
                <p className="text-gray-500">По вашему запросу нет подходящих компаний. Попробуйте изменить параметры поиска.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
