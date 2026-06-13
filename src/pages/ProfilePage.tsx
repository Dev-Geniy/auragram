import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { 
  User, Briefcase, Users, X, Save, Sparkles, CheckCircle2, 
  Settings, ShieldCheck, Info, Phone, Mail, Globe, Package, 
  Plus, Trash2, Image as ImageIcon, Eye, Search, Camera, Bell
} from 'lucide-react';

interface ProfilePageProps {
  currentSync: 'all' | 'business' | 'personal';
  setSync: (val: 'all' | 'business' | 'personal') => void;
  gender: 'all' | 'male' | 'female';
  setGender: (val: 'all' | 'male' | 'female') => void;
}

interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
}

export default function ProfilePage({ currentSync, setSync, gender, setGender }: ProfilePageProps) {
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  
  // Состояния UI
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false); // Предпросмотр
  
  const [newProduct, setNewProduct] = useState<Product>({
    id: '', name: '', price: '', description: '', imageUrl: ''
  });
  
  const [profile, setProfile] = useState({
    name: '',
    type: 'personal', 
    userGender: 'none',
    role: '',
    skills: [] as string[],
    avatar: '',
    isPublic: true, // Галочка публичности для Ленты
    contacts: { phone: '', email: '', website: '' },
    products: [] as Product[]
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({ 
            ...profile, 
            ...data,
            isPublic: data.isPublic !== undefined ? data.isPublic : true,
            contacts: data.contacts || { phone: '', email: '', website: '' },
            products: data.products || []
          });
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

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) return;
    const productToAdd = {
      ...newProduct,
      id: Date.now().toString(),
      imageUrl: newProduct.imageUrl || `https://placehold.co/400x400/f8fafc/a3a3a3?text=${encodeURIComponent(newProduct.name)}`
    };
    setProfile({ ...profile, products: [productToAdd, ...profile.products] });
    setNewProduct({ id: '', name: '', price: '', description: '', imageUrl: '' });
    setIsAddingProduct(false);
  };

  // Единые стили для инпутов (Enterprise Design Code)
  const inputClass = "w-full bg-gray-50 border border-gray-200/60 rounded-2xl px-5 py-4 text-[15px] focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-semibold text-gray-900 placeholder-gray-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]";
  const labelClass = "block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest pl-1";
  const sectionClass = "bg-white rounded-[2rem] p-6 md:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-100 relative overflow-hidden";

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6 md:p-10">
        <div className="max-w-3xl mx-auto space-y-8 animate-pulse">
          <div className="h-12 w-64 bg-gray-200/60 rounded-xl mb-10" />
          <div className="h-64 bg-white rounded-[2rem] border border-gray-100" />
          <div className="h-96 bg-white rounded-[2rem] border border-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-4 md:p-10 select-none pb-[160px] md:pb-32 relative">
      
      {/* =========================================
          ПОЛНОЭКРАННЫЙ ПРЕДПРОСМОТР (MODAL)
      ========================================= */}
      {isPreviewMode && (
        <div className="fixed inset-0 z-50 bg-gray-950/40 backdrop-blur-md flex items-center justify-center p-4 md:p-10 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl relative my-auto">
            <button 
              onClick={() => setIsPreviewMode(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-colors z-10"
            >
              <X size={20} />
            </button>

            {/* Обложка предпросмотра */}
            <div className="relative h-64 bg-gray-100 overflow-hidden">
              <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex gap-2 mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-md ${profile.type === 'business' ? 'bg-amber-500 text-white' : 'bg-brand text-white'}`}>
                    {profile.type === 'business' ? 'Бизнес' : 'Личный'}
                  </span>
                </div>
                <h3 className="font-black text-2xl text-white drop-shadow-md truncate">{profile.name || 'Без имени'}</h3>
              </div>
            </div>

            {/* Контент предпросмотра */}
            <div className="p-6 md:p-8 flex flex-col gap-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <p className="text-[15px] text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
                {profile.role || 'Описание отсутствует...'}
              </p>
              
              {profile.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map(skill => (
                    <span key={skill} className="text-[11px] font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {profile.type === 'business' && (
                <div className="space-y-6 pt-4 border-t border-gray-100">
                  <div className="flex flex-col gap-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Контакты</h4>
                    {profile.contacts.phone && <p className="text-sm font-bold flex items-center gap-2"><Phone size={14} className="text-brand"/> {profile.contacts.phone}</p>}
                    {profile.contacts.website && <p className="text-sm font-bold flex items-center gap-2"><Globe size={14} className="text-brand"/> {profile.contacts.website}</p>}
                  </div>
                  
                  {profile.products.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {profile.products.map(p => (
                        <div key={p.id} className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                          <img src={p.imageUrl} alt={p.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                          <p className="text-[11px] font-bold text-gray-900 truncate">{p.name}</p>
                          <p className="text-[11px] font-black text-amber-600 mt-0.5">{p.price}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          ОСНОВНОЙ ИНТЕРФЕЙС НАСТРОЕК
      ========================================= */}
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Заголовок страницы */}
        <div className="flex items-center gap-4 mb-4 ml-2">
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-200/60 flex items-center justify-center shrink-0">
            <Settings size={24} className="text-gray-950" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tight">Настройки</h1>
            <p className="text-sm text-gray-500 font-medium">Управление профилем и алгоритмами</p>
          </div>
        </div>

        {/* 🔍 БЛОК 1: НАСТРОЙКИ ПОИСКА (РАДАР) */}
        <section className={sectionClass}>
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-gray-950 text-white flex items-center justify-center">
              <Search size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Настройки поиска</h2>
              <p className="text-[13px] text-gray-500 font-medium mt-0.5">Настройте алгоритм выдачи в Радаре Aura</p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <label className={labelClass}>Кого вы ищете?</label>
              <div className="flex flex-col sm:flex-row bg-gray-50 p-1.5 rounded-2xl border border-gray-200/60 gap-1.5">
                <button onClick={() => setSync('all')} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[14px] text-[15px] font-bold transition-all ${currentSync === 'all' ? 'bg-white text-gray-950 shadow-sm border border-gray-200/60' : 'text-gray-500 hover:bg-gray-100'}`}>
                  <Users size={18} /> Все аккаунты
                </button>
                <button onClick={() => setSync('personal')} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[14px] text-[15px] font-bold transition-all ${currentSync === 'personal' ? 'bg-white text-brand shadow-sm border border-gray-200/60' : 'text-gray-500 hover:bg-gray-100'}`}>
                  <User size={18} /> Только люди
                </button>
                <button onClick={() => setSync('business')} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[14px] text-[15px] font-bold transition-all ${currentSync === 'business' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
                  <Briefcase size={18} /> Бизнес B2B
                </button>
              </div>
            </div>

            {currentSync !== 'business' && (
              <div className="animate-fade-in transition-all">
                <label className={labelClass}>Предпочтительный пол собеседника</label>
                <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-200/60 gap-1.5">
                  <button onClick={() => setGender('all')} className={`flex-1 py-3.5 rounded-[14px] text-[15px] font-bold transition-all ${gender === 'all' ? 'bg-white text-gray-950 shadow-sm border border-gray-200/60' : 'text-gray-500 hover:bg-gray-100'}`}>Любой</button>
                  <button onClick={() => setGender('male')} className={`flex-1 py-3.5 rounded-[14px] text-[15px] font-bold transition-all ${gender === 'male' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-gray-500 hover:bg-gray-100'}`}>Мужской</button>
                  <button onClick={() => setGender('female')} className={`flex-1 py-3.5 rounded-[14px] text-[15px] font-bold transition-all ${gender === 'female' ? 'bg-pink-50 text-pink-700 shadow-sm border border-pink-100' : 'text-gray-500 hover:bg-gray-100'}`}>Женский</button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 👤 БЛОК 2: НАСТРОЙКИ ПРОФИЛЯ */}
        <section className={sectionClass}>
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-gray-950 text-white flex items-center justify-center">
              <User size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Настройки профиля</h2>
              <p className="text-[13px] text-gray-500 font-medium mt-0.5 truncate">Ваша публичная карточка и аватар</p>
            </div>
          </div>

          <div className="space-y-8">
            
            {/* Аватар и Ссылка */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 bg-gray-50 p-6 rounded-[2rem] border border-gray-200/60">
              <div className="relative shrink-0">
                <img src={profile.avatar} alt="Avatar" className="w-24 h-24 rounded-3xl object-cover shadow-md bg-white border-2 border-white" />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gray-950 text-white rounded-xl flex items-center justify-center shadow-lg">
                  <Camera size={14} />
                </div>
              </div>
              <div className="flex-1">
                <label className={labelClass}>Ссылка на новое фото (URL)</label>
                <input
                  type="text"
                  value={profile.avatar}
                  onChange={(e) => setProfile({...profile, avatar: e.target.value})}
                  className={inputClass}
                  placeholder="https://example.com/my-photo.jpg"
                />
              </div>
            </div>

            {/* Настройки Приватности Ленты (Тумблер) */}
            <div className="flex items-center justify-between bg-white border border-gray-200/60 p-5 rounded-2xl shadow-sm hover:border-gray-300 transition-all cursor-pointer" onClick={() => setProfile({...profile, isPublic: !profile.isPublic})}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${profile.isPublic ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Bell size={20} />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-gray-900">Активность в Ленте</h4>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Публиковать создание аккаунта и смену фото</p>
                </div>
              </div>
              {/* iOS Style Toggle */}
              <div className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${profile.isPublic ? 'bg-green-500' : 'bg-gray-200'}`}>
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${profile.isPublic ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className={labelClass}>Тип профиля</label>
                <select 
                  value={profile.type}
                  onChange={(e) => setProfile({...profile, type: e.target.value as 'personal' | 'business'})}
                  className={`${inputClass} appearance-none cursor-pointer ${profile.type === 'business' ? 'border-amber-400 ring-4 ring-amber-500/10' : ''}`}
                >
                  <option value="personal">👤 Личный (Нетворкинг)</option>
                  <option value="business">💼 Бизнес (Магазин / B2B)</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>{profile.type === 'business' ? 'Название компании' : 'Отображаемое Имя'}</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className={inputClass}
                  placeholder={profile.type === 'business' ? "ООО Вектор" : "Иван Иванов"}
                />
              </div>
            </div>

            {profile.type === 'personal' && (
              <div className="animate-fade-in w-full md:w-1/2 md:pr-4">
                <label className={labelClass}>Ваш пол</label>
                <select 
                  value={profile.userGender}
                  onChange={(e) => setProfile({...profile, userGender: e.target.value})}
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="none">Скрыть из профиля</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>
            )}

            <div>
              <label className={labelClass}>{profile.type === 'business' ? 'Описание деятельности и УТП' : 'О себе (Bio)'}</label>
              <textarea
                value={profile.role}
                onChange={(e) => setProfile({...profile, role: e.target.value})}
                className={`${inputClass} resize-none h-32`}
                placeholder="Расскажите о себе или вашем бизнесе..."
              />
            </div>

            {/* Теги */}
            <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <label className="text-[13px] font-black text-gray-900 uppercase tracking-wide">Ключевые навыки / Теги</label>
                <span className={`text-[11px] font-black px-3 py-1 rounded-lg ${profile.skills.length >= 10 ? 'bg-red-100 text-red-700' : 'bg-white border border-gray-200/60 text-gray-500'}`}>
                  {profile.skills.length} / 10
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.skills.map(skill => (
                  <span key={skill} className="inline-flex items-center gap-2 bg-gray-950 text-white px-4 py-2 rounded-xl text-[13px] font-bold shadow-sm">
                    {skill}
                    <button onClick={() => handleRemoveSkill(skill)} className="text-gray-400 hover:text-red-400 transition-colors">
                      <X size={16} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                className={inputClass}
                placeholder={profile.skills.length >= 10 ? "Достигнут лимит" : "Введите тег и нажмите Enter..."}
                disabled={profile.skills.length >= 10}
              />
            </div>
          </div>
        </section>

        {/* 💼 БЛОК 3: НАСТРОЙКИ БИЗНЕСА */}
        {profile.type === 'business' && (
          <section className={`${sectionClass} border-amber-200/60 shadow-[0_4px_20px_rgba(245,158,11,0.05)] animate-fade-in`}>
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
                <Briefcase size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Настройки бизнеса</h2>
                <p className="text-[13px] text-gray-500 font-medium mt-0.5">Витрина товаров и контакты</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Контакты */}
              <div className="space-y-4">
                <label className={labelClass}>Публичные контакты</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"><Phone size={20} /></div>
                  <input type="text" placeholder="Телефон (+380...)" value={profile.contacts.phone} onChange={(e) => setProfile({...profile, contacts: {...profile.contacts, phone: e.target.value}})} className={`${inputClass} pl-14`} />
                </div>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"><Mail size={20} /></div>
                  <input type="email" placeholder="Email для связи" value={profile.contacts.email} onChange={(e) => setProfile({...profile, contacts: {...profile.contacts, email: e.target.value}})} className={`${inputClass} pl-14`} />
                </div>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"><Globe size={20} /></div>
                  <input type="text" placeholder="Сайт или соцсеть (URL)" value={profile.contacts.website} onChange={(e) => setProfile({...profile, contacts: {...profile.contacts, website: e.target.value}})} className={`${inputClass} pl-14`} />
                </div>
              </div>

              {/* Товары */}
              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <label className={labelClass + " mb-0"}>Витрина товаров ({profile.products.length})</label>
                  <button onClick={() => setIsAddingProduct(!isAddingProduct)} className="bg-amber-100 text-amber-800 hover:bg-amber-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
                    {isAddingProduct ? <X size={16} /> : <Plus size={16} />} {isAddingProduct ? 'Скрыть' : 'Добавить'}
                  </button>
                </div>

                {isAddingProduct && (
                  <div className="bg-amber-50/50 border border-amber-200/60 rounded-3xl p-6 mb-6 animate-fade-in">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" placeholder="Название товара" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className={inputClass} />
                        <input type="text" placeholder="Цена (100 $)" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className={inputClass} />
                      </div>
                      <div className="relative">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"><ImageIcon size={20} /></div>
                        <input type="text" placeholder="Ссылка на фото (URL)" value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} className={`${inputClass} pl-14`} />
                      </div>
                      <textarea placeholder="Краткое описание товара..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className={`${inputClass} h-24 resize-none`} />
                      <button onClick={handleAddProduct} disabled={!newProduct.name || !newProduct.price} className="bg-amber-500 text-white px-8 py-4 rounded-xl text-[15px] font-bold uppercase w-full hover:bg-amber-600 disabled:opacity-50 transition-colors">
                        Сохранить в витрину
                      </button>
                    </div>
                  </div>
                )}

                {profile.products.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {profile.products.map(product => (
                      <div key={product.id} className="bg-white border border-gray-200/80 shadow-sm rounded-2xl overflow-hidden flex flex-col group">
                        <div className="h-40 bg-gray-100 relative overflow-hidden">
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <button onClick={() => handleRemoveProduct(product.id)} className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur text-red-500 rounded-xl flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex justify-between items-start gap-3 mb-2">
                            <h4 className="font-bold text-gray-950 text-[15px] leading-tight line-clamp-2">{product.name}</h4>
                            <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-1 rounded-lg shrink-0">{product.price}</span>
                          </div>
                          <p className="text-[13px] font-medium text-gray-500 line-clamp-2 mt-auto">{product.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-3xl border border-gray-200 border-dashed">
                    <Package size={32} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-[15px] font-bold text-gray-900">Витрина пуста</p>
                    <p className="text-xs font-medium text-gray-500 mt-1">Добавьте свои товары для маркетплейса</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* =========================================
          ФИКСИРОВАННАЯ НИЖНЯЯ ПАНЕЛЬ
      ========================================= */}
      {/* На мобильных (md:hidden) панель поднимается над Bottom Navigation Bar (bottom-[84px]) */}
      <div className="fixed bottom-[84px] md:bottom-0 left-0 md:left-[280px] right-0 p-4 md:p-6 bg-white/90 backdrop-blur-xl border-t border-gray-200/60 flex items-center justify-between z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.04)]">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between px-2 md:px-4 gap-4">
          
          <button 
            onClick={() => setIsPreviewMode(true)}
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-950 px-6 py-4 rounded-2xl font-bold text-[15px] transition-colors flex-1 md:flex-none"
          >
            <Eye size={20} /> <span className="hidden sm:inline">Предпросмотр</span>
          </button>
          
          <div className="hidden md:block h-6 mx-auto flex-1 text-center">
            {showSuccess && (
              <span className="inline-flex items-center gap-2 text-green-600 text-sm font-bold animate-fade-in bg-green-50 px-4 py-1.5 rounded-full border border-green-100">
                <CheckCircle2 size={18} /> Сохранено
              </span>
            )}
          </div>
          
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="bg-gray-950 text-white px-8 py-4 rounded-2xl font-bold text-[15px] hover:bg-brand transition-all shadow-md active:scale-95 flex items-center justify-center gap-2.5 disabled:opacity-70 flex-1 md:flex-none"
          >
            {isSaving ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div></>
            ) : (
              <><Save size={20} /> <span className="hidden sm:inline">Сохранить</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
