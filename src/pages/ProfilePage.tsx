import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { User, Briefcase, Heart, Users, Plus, X, Save, Sparkles, CheckCircle2 } from 'lucide-react';

interface ProfilePageProps {
  currentSync: 'all' | 'business' | 'personal';
  setSync: (val: 'all' | 'business' | 'personal') => void;
  gender: 'all' | 'male' | 'female';
  setGender: (val: 'all' | 'male' | 'female') => void;
}

export default function ProfilePage({ currentSync, setSync, gender, setGender }: ProfilePageProps) {
  const { user } = useAuthStore();
  
  // Состояния для анкеты пользователя
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

  // Загрузка данных профиля из Firestore при открытии страницы
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfile({ ...profile, ...docSnap.data() });
        } else {
          // Если профиля еще нет в базе, заполняем дефолтными данными из Auth
          setProfile(prev => ({
            ...prev,
            name: user.displayName || '',
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`
          }));
        }
      } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Сохранение данных в Firestore
  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Ошибка при сохранении профиля:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!profile.skills.includes(skillInput.trim()) && profile.skills.length < 10) {
        setProfile({ ...profile, skills: [...profile.skills, skillInput.trim()] });
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
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
      <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* БЛОК 1: НАСТРОЙКИ АЛГОРИТМА (РАДАРА) */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Настройки AuraSync</h2>
              <p className="text-sm text-gray-500">Кого вы ищете на радаре прямо сейчас?</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Режим поиска */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Режим поиска</label>
              <div className="flex bg-gray-50 p-1.5 rounded-2xl">
                <button
                  onClick={() => setSync('all')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${currentSync === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <Users size={16} /> Все
                </button>
                <button
                  onClick={() => setSync('personal')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${currentSync === 'personal' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <User size={16} /> Люди
                </button>
                <button
                  onClick={() => setSync('business')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${currentSync === 'business' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <Briefcase size={16} /> Бизнес
                </button>
              </div>
            </div>

            {/* Фильтр по полу (показываем только если не выбран бизнес) */}
            {currentSync !== 'business' && (
              <div className="animate-fade-in">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Пол собеседника</label>
                <div className="flex bg-gray-50 p-1.5 rounded-2xl max-w-sm">
                  <button
                    onClick={() => setGender('all')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${gender === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    Любой
                  </button>
                  <button
                    onClick={() => setGender('male')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${gender === 'male' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    Мужской
                  </button>
                  <button
                    onClick={() => setGender('female')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${gender === 'female' ? 'bg-pink-50 text-pink-600 shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                  >
                    Женский
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* БЛОК 2: АНКЕТА ПОЛЬЗОВАТЕЛЯ (FIREBASE) */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Ваша анкета</h2>
              <p className="text-sm text-gray-500">Эта информация видна другим пользователям</p>
            </div>
            {profile.avatar && (
              <img src={profile.avatar} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover border border-gray-100 shadow-sm" />
            )}
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Отображаемое имя / Название компании</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({...profile, name: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                placeholder="Иван Иванов"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Тип аккаунта</label>
                <select 
                  value={profile.type}
                  onChange={(e) => setProfile({...profile, type: e.target.value as 'personal' | 'business'})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 outline-none"
                >
                  <option value="personal">👤 Личный (Общение / Знакомства)</option>
                  <option value="business">💼 Бизнес (Услуги / B2B)</option>
                </select>
              </div>

              {profile.type === 'personal' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Ваш пол</label>
                  <select 
                    value={profile.userGender}
                    onChange={(e) => setProfile({...profile, userGender: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 outline-none"
                  >
                    <option value="none">Не указан</option>
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                {profile.type === 'business' ? 'Краткое описание бизнеса (Чем занимаетесь?)' : 'О себе (Роль / Должность / Цель)'}
              </label>
              <textarea
                value={profile.role}
                onChange={(e) => setProfile({...profile, role: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all resize-none h-24"
                placeholder={profile.type === 'business' ? "Например: Разрабатываем мобильные приложения под ключ..." : "Например: Junior Frontend разработчик, ищу ментора..."}
              />
            </div>

            {/* Блок добавления тегов / скиллов */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Ключевые навыки / Теги <span className="text-gray-400 font-normal">({profile.skills.length}/10)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {profile.skills.map(skill => (
                  <span key={skill} className="inline-flex items-center gap-1.5 bg-brand/10 text-brand px-3 py-1.5 rounded-lg text-sm font-semibold">
                    {skill}
                    <button onClick={() => handleRemoveSkill(skill)} className="hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                placeholder="Введите навык и нажмите Enter (например: TypeScript, Дизайн, B2B)"
                disabled={profile.skills.length >= 10}
              />
            </div>

            {/* Кнопка сохранения */}
            <div className="pt-4 flex items-center justify-between">
              <div className="h-6">
                {showSuccess && (
                  <span className="flex items-center gap-2 text-green-600 text-sm font-bold animate-fade-in">
                    <CheckCircle2 size={18} /> Сохранено в базу данных
                  </span>
                )}
              </div>
              
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={18} />
                    Сохранить профиль
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
