import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { User, Briefcase, Users, X, Save, Sparkles, CheckCircle2, Settings, ShieldCheck, Info } from 'lucide-react';

interface ProfilePageProps {
  currentSync: 'all' | 'business' | 'personal';
  setSync: (val: 'all' | 'business' | 'personal') => void;
  gender: 'all' | 'male' | 'female';
  setGender: (val: 'all' | 'male' | 'female') => void;
}

export default function ProfilePage({ currentSync, setSync, gender, setGender }: ProfilePageProps) {
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  
  const [profile, setProfile] = useState({
    name: '',
    type: 'personal', // 'personal' | 'business'
    userGender: 'none', // 'male' | 'female' | 'none'
    role: '',
    skills: [] as string[],
    avatar: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfile({ ...profile, ...docSnap.data() });
        } else {
          setProfile(prev => ({
            ...prev,
            name: user.displayName || '',
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`
          }));
        }
      } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
      } finally {
        // Искусственная задержка для плавности анимации скелетона
        setTimeout(() => setIsLoading(false), 400);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (error) {
      console.error('Ошибка при сохранении профиля:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      const newSkill = skillInput.trim();
      if (!profile.skills.includes(newSkill) && profile.skills.length < 10) {
        setProfile({ ...profile, skills: [...profile.skills, newSkill] });
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter(s => s !== skillToRemove)
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6 md:p-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="h-10 w-48 bg-gray-200/60 rounded-lg animate-pulse mb-10" />
          
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm animate-pulse">
            <div className="h-8 w-64 bg-gray-200/60 rounded-lg mb-8" />
            <div className="space-y-4">
              <div className="h-12 w-full bg-gray-100 rounded-xl" />
              <div className="h-12 w-full bg-gray-100 rounded-xl" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm animate-pulse">
            <div className="flex justify-between items-center mb-8">
              <div className="h-8 w-48 bg-gray-200/60 rounded-lg" />
              <div className="w-16 h-16 bg-gray-200/60 rounded-2xl" />
            </div>
            <div className="space-y-6">
              <div className="h-12 w-full bg-gray-100 rounded-xl" />
              <div className="grid grid-cols-2 gap-5">
                <div className="h-12 w-full bg-gray-100 rounded-xl" />
                <div className="h-12 w-full bg-gray-100 rounded-xl" />
              </div>
              <div className="h-24 w-full bg-gray-100 rounded-xl" />
              <div className="h-12 w-full bg-gray-100 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6 md:p-10 select-none">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Заголовок страницы */}
        <div className="flex items-center gap-3 mb-2">
          <Settings size={28} className="text-gray-950" />
          <h1 className="text-3xl font-black text-gray-950 tracking-tight">Настройки профиля</h1>
        </div>

        {/* БЛОК 1: НАСТРОЙКИ РАДАРА */}
        <section className="bg-white rounded-3xl p-7 md:p-9 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-200/60">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Фильтры AuraSync</h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Настройте алгоритм выдачи в Радаре</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Режим поиска */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Кого вы ищете?</label>
              <div className="flex bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100">
                <button
                  onClick={() => setSync('all')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${currentSync === 'all' ? 'bg-white text-gray-950 shadow-sm border border-gray-200/60' : 'text-gray-500 hover:bg-gray-100/50 hover:text-gray-900'}`}
                >
                  <Users size={16} /> По всем
                </button>
                <button
                  onClick={() => setSync('personal')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${currentSync === 'personal' ? 'bg-white text-brand shadow-sm border border-gray-200/60' : 'text-gray-500 hover:bg-gray-100/50 hover:text-gray-900'}`}
                >
                  <User size={16} /> Люди
                </button>
                <button
                  onClick={() => setSync('business')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${currentSync === 'business' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-gray-500 hover:bg-gray-100/50 hover:text-gray-900'}`}
                >
                  <Briefcase size={16} /> Бизнес
                </button>
              </div>
            </div>

            {/* Фильтр по полу */}
            {currentSync !== 'business' && (
              <div className="animate-fade-in transition-all">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Предпочтительный пол</label>
                <div className="flex bg-gray-50/80 p-1.5 rounded-2xl max-w-md border border-gray-100">
                  <button
                    onClick={() => setGender('all')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${gender === 'all' ? 'bg-white text-gray-950 shadow-sm border border-gray-200/60' : 'text-gray-500 hover:bg-gray-100/50 hover:text-gray-900'}`}
                  >
                    Любой
                  </button>
                  <button
                    onClick={() => setGender('male')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${gender === 'male' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' : 'text-gray-500 hover:bg-gray-100/50 hover:text-gray-900'}`}
                  >
                    Мужчины
                  </button>
                  <button
                    onClick={() => setGender('female')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${gender === 'female' ? 'bg-pink-50 text-pink-700 shadow-sm border border-pink-100/50' : 'text-gray-500 hover:bg-gray-100/50 hover:text-gray-900'}`}
                  >
                    Женщины
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* БЛОК 2: АНКЕТА ПОЛЬЗОВАТЕЛЯ */}
        <section className="bg-white rounded-3xl p-7 md:p-9 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-200/60 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-8 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Публичная анкета
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">Эти данные будут видны в Радаре и Маркетплейсе</p>
            </div>
            
            <div className="flex items-center gap-4 bg-gray-50 pr-4 pl-1.5 py-1.5 rounded-2xl border border-gray-200/60">
              <img 
                src={profile.avatar} 
                alt="Avatar" 
                className="w-12 h-12 rounded-xl object-cover shadow-sm bg-white" 
              />
              <div>
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={12} /> Google Auth
                </p>
                <p className="text-xs font-semibold text-gray-500 mt-0.5">Фото синхронизировано</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Имя */}
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">
                Отображаемое имя / Название
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200/60 rounded-xl px-4 py-3.5 text-sm focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-semibold text-gray-900 placeholder-gray-400"
                placeholder="Например: Иван Иванов или ООО Вектор"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Тип аккаунта */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  Категория профиля
                  <div className="group relative">
                    <Info size={14} className="text-gray-400 cursor-help" />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-gray-900 text-white text-[10px] font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 text-center">
                      Влияет на то, в каком разделе вас увидят другие пользователи
                    </div>
                  </div>
                </label>
                <select 
                  value={profile.type}
                  onChange={(e) => setProfile({...profile, type: e.target.value as 'personal' | 'business'})}
                  className="w-full bg-gray-50 border border-gray-200/60 rounded-xl px-4 py-3.5 text-sm focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-semibold text-gray-900 appearance-none"
                >
                  <option value="personal">Личный профиль (Связи / Знакомства)</option>
                  <option value="business">Бизнес аккаунт (B2B / Услуги)</option>
                </select>
              </div>

              {/* Пол */}
              <div className={`transition-opacity duration-300 ${profile.type === 'business' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">
                  Ваш пол
                </label>
                <select 
                  value={profile.userGender}
                  onChange={(e) => setProfile({...profile, userGender: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200/60 rounded-xl px-4 py-3.5 text-sm focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-semibold text-gray-900 appearance-none"
                  disabled={profile.type === 'business'}
                >
                  <option value="none">Скрыт / Не указан</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>
            </div>

            {/* Описание */}
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">
                {profile.type === 'business' ? 'Сфера деятельности компании' : 'О себе (Bio)'}
              </label>
              <textarea
                value={profile.role}
                onChange={(e) => setProfile({...profile, role: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200/60 rounded-xl px-4 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all resize-none h-28 font-medium text-gray-900 placeholder-gray-400"
                placeholder={profile.type === 'business' ? "Опишите, какие услуги предоставляет ваша компания..." : "Расскажите о своих навыках, профессии и целях..."}
              />
            </div>

            {/* Теги */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                  Ключевые навыки / Теги
                </label>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${profile.skills.length >= 10 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                  {profile.skills.length} / 10
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {profile.skills.map(skill => (
                  <span key={skill} className="inline-flex items-center gap-1.5 bg-gray-950 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm group">
                    {skill}
                    <button 
                      onClick={() => handleRemoveSkill(skill)} 
                      className="text-gray-400 hover:text-red-400 transition-colors ml-1"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleAddSkill}
                  className="w-full bg-gray-50 border border-gray-200/60 rounded-xl pl-4 pr-12 py-3.5 text-sm focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium text-gray-900 placeholder-gray-400"
                  placeholder={profile.skills.length >= 10 ? "Достигнут лимит тегов" : "Введите навык и нажмите Enter..."}
                  disabled={profile.skills.length >= 10}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                  <div className="px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded text-[9px] font-bold">↵</div>
                </div>
              </div>
            </div>

            {/* Сохранение */}
            <div className="pt-8 mt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="h-6">
                {showSuccess && (
                  <span className="flex items-center gap-2 text-green-600 text-sm font-bold animate-fade-in">
                    <CheckCircle2 size={18} /> Сохранено в облаке
                  </span>
                )}
              </div>
              
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-brand text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-brand-dark transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2.5 disabled:opacity-70 disabled:hover:scale-100 min-w-[200px] justify-center"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Опубликовать профиль
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
