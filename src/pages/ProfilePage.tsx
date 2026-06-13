import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { 
  User, Briefcase, Users, X, Save, Sparkles, CheckCircle2, 
  Settings, ShieldCheck, Info, Phone, Mail, Globe, Package, Plus, Trash2, Image as ImageIcon
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
  
  // Состояние для формы добавления нового товара
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>({
    id: '', name: '', price: '', description: '', imageUrl: ''
  });
  
  const [profile, setProfile] = useState({
    name: '',
    type: 'personal', // 'personal' | 'business'
    userGender: 'none',
    role: '',
    skills: [] as string[],
    avatar: '',
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

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter(s => s !== skillToRemove)
    });
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) return;
    
    const productToAdd = {
      ...newProduct,
      id: Date.now().toString(),
      imageUrl: newProduct.imageUrl || `https://placehold.co/400x400/f8fafc/a3a3a3?text=${encodeURIComponent(newProduct.name)}`
    };

    setProfile({
      ...profile,
      products: [productToAdd, ...profile.products]
    });
    
    setNewProduct({ id: '', name: '', price: '', description: '', imageUrl: '' });
    setIsAddingProduct(false);
  };

  const handleRemoveProduct = (productId: string) => {
    setProfile({
      ...profile,
      products: profile.products.filter(p => p.id !== productId)
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6 md:p-10">
        <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
          <div className="h-10 w-48 bg-gray-200/60 rounded-lg mb-10" />
          <div className="h-64 bg-white rounded-3xl border border-gray-100" />
          <div className="h-96 bg-white rounded-3xl border border-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6 md:p-10 select-none">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        
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
              <p className="text-xs text-gray-500 font-medium mt-0.5">Кого вы ищете на радаре?</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100">
                <button onClick={() => setSync('all')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${currentSync === 'all' ? 'bg-white text-gray-950 shadow-sm border border-gray-200/60' : 'text-gray-500 hover:bg-gray-100/50'}`}>
                  <Users size={16} /> По всем
                </button>
                <button onClick={() => setSync('personal')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${currentSync === 'personal' ? 'bg-white text-brand shadow-sm border border-gray-200/60' : 'text-gray-500 hover:bg-gray-100/50'}`}>
                  <User size={16} /> Люди
                </button>
                <button onClick={() => setSync('business')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${currentSync === 'business' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-gray-500 hover:bg-gray-100/50'}`}>
                  <Briefcase size={16} /> Бизнес
                </button>
              </div>
            </div>

            {currentSync !== 'business' && (
              <div className="animate-fade-in transition-all">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Предпочтительный пол</label>
                <div className="flex bg-gray-50/80 p-1.5 rounded-2xl max-w-md border border-gray-100">
                  <button onClick={() => setGender('all')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${gender === 'all' ? 'bg-white text-gray-950 shadow-sm border border-gray-200/60' : 'text-gray-500 hover:bg-gray-100/50'}`}>Любой</button>
                  <button onClick={() => setGender('male')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${gender === 'male' ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50' : 'text-gray-500 hover:bg-gray-100/50'}`}>Мужчины</button>
                  <button onClick={() => setGender('female')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${gender === 'female' ? 'bg-pink-50 text-pink-700 shadow-sm border border-pink-100/50' : 'text-gray-500 hover:bg-gray-100/50'}`}>Женщины</button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* БЛОК 2: ОСНОВНАЯ АНКЕТА */}
        <section className="bg-white rounded-3xl p-7 md:p-9 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-200/60 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-8 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Публичный профиль</h2>
              <p className="text-xs text-gray-500 font-medium mt-1">Основа вашей карточки на платформе</p>
            </div>
            
            <div className="flex items-center gap-4 bg-gray-50 pr-4 pl-1.5 py-1.5 rounded-2xl border border-gray-200/60">
              <img src={profile.avatar} alt="Avatar" className="w-12 h-12 rounded-xl object-cover shadow-sm bg-white" />
              <div>
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={12} /> Google Auth
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                  Тип профиля
                  <Info size={14} className="text-gray-400" />
                </label>
                <select 
                  value={profile.type}
                  onChange={(e) => setProfile({...profile, type: e.target.value as 'personal' | 'business'})}
                  className="w-full bg-amber-50/50 border border-amber-200/60 rounded-xl px-4 py-3.5 text-sm focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-bold text-amber-900 appearance-none cursor-pointer"
                >
                  <option value="personal">👤 Личный профиль (Нетворкинг)</option>
                  <option value="business">💼 Бизнес аккаунт (Магазин / B2B)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">
                  {profile.type === 'business' ? 'Название компании / Магазина' : 'Отображаемое Имя'}
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200/60 rounded-xl px-4 py-3.5 text-sm focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-semibold text-gray-900"
                  placeholder={profile.type === 'business' ? "ООО Вектор" : "Иван Иванов"}
                />
              </div>
            </div>

            {profile.type === 'personal' && (
              <div className="animate-fade-in w-full md:w-1/2 md:pr-3">
                <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">Ваш пол</label>
                <select 
                  value={profile.userGender}
                  onChange={(e) => setProfile({...profile, userGender: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200/60 rounded-xl px-4 py-3.5 text-sm focus:bg-white focus:ring-4 focus:ring-brand/10 outline-none transition-all font-semibold text-gray-900 appearance-none"
                >
                  <option value="none">Не указан</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">
                {profile.type === 'business' ? 'Описание деятельности и УТП' : 'О себе (Bio)'}
              </label>
              <textarea
                value={profile.role}
                onChange={(e) => setProfile({...profile, role: e.target.value})}
                className="w-full bg-gray-50 border border-gray-200/60 rounded-xl px-4 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all resize-none h-28 font-medium text-gray-900"
                placeholder="Расскажите подробнее..."
              />
            </div>

            {/* Теги */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide">
                  Ключевые навыки / Теги
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                  {profile.skills.length} / 10
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {profile.skills.map(skill => (
                  <span key={skill} className="inline-flex items-center gap-1.5 bg-gray-950 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                    {skill}
                    <button onClick={() => handleRemoveSkill(skill)} className="text-gray-400 hover:text-red-400 transition-colors ml-1">
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
                className="w-full bg-gray-50 border border-gray-200/60 rounded-xl px-4 py-3.5 text-sm focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-medium text-gray-900"
                placeholder={profile.skills.length >= 10 ? "Достигнут лимит" : "Введите тег и нажмите Enter..."}
                disabled={profile.skills.length >= 10}
              />
            </div>
          </div>
        </section>

        {/* БЛОК 3: БИЗНЕС-НАСТРОЙКИ (КОНТАКТЫ) - Только для Business */}
        {profile.type === 'business' && (
          <section className="bg-white rounded-3xl p-7 md:p-9 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-200/60 animate-fade-in">
            <div className="mb-8">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Контакты магазина</h2>
              <p className="text-xs text-gray-500 font-medium mt-1">Как клиенты смогут с вами связаться вне чата</p>
            </div>

            <div className="space-y-5">
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl border border-gray-200/60 focus-within:border-brand focus-within:bg-white focus-within:ring-4 focus-within:ring-brand/10 transition-all overflow-hidden">
                <div className="pl-4 text-gray-400"><Phone size={18} /></div>
                <input 
                  type="text" 
                  placeholder="Телефон (например: +380...)" 
                  value={profile.contacts.phone}
                  onChange={(e) => setProfile({...profile, contacts: {...profile.contacts, phone: e.target.value}})}
                  className="w-full bg-transparent py-3.5 pr-4 text-sm font-semibold text-gray-900 outline-none"
                />
              </div>
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl border border-gray-200/60 focus-within:border-brand focus-within:bg-white focus-within:ring-4 focus-within:ring-brand/10 transition-all overflow-hidden">
                <div className="pl-4 text-gray-400"><Mail size={18} /></div>
                <input 
                  type="email" 
                  placeholder="Email для связи" 
                  value={profile.contacts.email}
                  onChange={(e) => setProfile({...profile, contacts: {...profile.contacts, email: e.target.value}})}
                  className="w-full bg-transparent py-3.5 pr-4 text-sm font-semibold text-gray-900 outline-none"
                />
              </div>
              <div className="flex items-center gap-4 bg-gray-50 rounded-xl border border-gray-200/60 focus-within:border-brand focus-within:bg-white focus-within:ring-4 focus-within:ring-brand/10 transition-all overflow-hidden">
                <div className="pl-4 text-gray-400"><Globe size={18} /></div>
                <input 
                  type="text" 
                  placeholder="Сайт или ссылка на соцсеть" 
                  value={profile.contacts.website}
                  onChange={(e) => setProfile({...profile, contacts: {...profile.contacts, website: e.target.value}})}
                  className="w-full bg-transparent py-3.5 pr-4 text-sm font-semibold text-gray-900 outline-none"
                />
              </div>
            </div>
          </section>
        )}

        {/* БЛОК 4: ВИТРИНА ТОВАРОВ - Только для Business */}
        {profile.type === 'business' && (
          <section className="bg-white rounded-3xl p-7 md:p-9 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-200/60 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Package size={22} className="text-amber-500" /> Витрина товаров
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">Добавьте услуги или товары для глобальной ленты</p>
              </div>
              <button 
                onClick={() => setIsAddingProduct(!isAddingProduct)}
                className="bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                {isAddingProduct ? <X size={16} /> : <Plus size={16} />}
                {isAddingProduct ? 'Отменить' : 'Добавить товар'}
              </button>
            </div>

            {/* Форма добавления товара */}
            {isAddingProduct && (
              <div className="bg-gray-50 border border-gray-200/60 rounded-2xl p-6 mb-8 animate-fade-in">
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Новая позиция</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input 
                      type="text" 
                      placeholder="Название товара/услуги" 
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full bg-white border border-gray-200/60 rounded-xl px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 outline-none font-semibold text-gray-900"
                    />
                    <input 
                      type="text" 
                      placeholder="Цена (например: 1 500 ₴ или Договорная)" 
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                      className="w-full bg-white border border-gray-200/60 rounded-xl px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 outline-none font-semibold text-gray-900"
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-white border border-gray-200/60 rounded-xl px-4 py-3 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/10 transition-all">
                    <ImageIcon size={18} className="text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Ссылка на фото товара (URL)" 
                      value={newProduct.imageUrl}
                      onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})}
                      className="w-full bg-transparent text-sm outline-none font-medium text-gray-900"
                    />
                  </div>
                  <textarea 
                    placeholder="Краткое описание товара..." 
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full bg-white border border-gray-200/60 rounded-xl px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 outline-none resize-none h-20 font-medium text-gray-900"
                  />
                  <button 
                    onClick={handleAddProduct}
                    disabled={!newProduct.name || !newProduct.price}
                    className="bg-gray-900 text-white px-6 py-3 rounded-xl text-xs font-bold tracking-wide uppercase hover:bg-gray-800 disabled:opacity-50 transition-colors w-full sm:w-auto"
                  >
                    Сохранить товар
                  </button>
                </div>
              </div>
            )}

            {/* Список товаров */}
            {profile.products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.products.map(product => (
                  <div key={product.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden flex flex-col group hover:border-gray-200 transition-colors">
                    <div className="h-32 bg-gray-100 relative overflow-hidden">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <button 
                        onClick={() => handleRemoveProduct(product.id)}
                        className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur text-red-500 rounded-lg flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h4 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{product.name}</h4>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-1 rounded-md shrink-0 whitespace-nowrap">{product.price}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-auto">{product.description || 'Нет описания'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                <Package size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-bold text-gray-900">Витрина пуста</p>
                <p className="text-xs text-gray-500 mt-1">Добавьте свои первые товары, чтобы начать продажи</p>
              </div>
            )}
          </section>
        )}

        {/* ГЛОБАЛЬНАЯ КНОПКА СОХРАНЕНИЯ ПРОФИЛЯ */}
        <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200/60 flex items-center justify-between z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between px-4">
            <div className="h-6">
              {showSuccess && (
                <span className="flex items-center gap-2 text-green-600 text-sm font-bold animate-fade-in">
                  <CheckCircle2 size={18} /> Данные сохранены
                </span>
              )}
            </div>
            
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="bg-brand text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-brand-dark transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2.5 disabled:opacity-70 disabled:hover:scale-100"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Опубликовать изменения
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
