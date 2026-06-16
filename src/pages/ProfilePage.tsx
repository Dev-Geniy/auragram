import { useState, useEffect, useRef, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';

import { 
  Camera, User, Briefcase, 
  Phone, Globe, Package, Plus, Trash2, Image as ImageIcon, 
  Loader2, Edit2, Moon, Sun, Zap, MessageSquareText,
  Target, LayoutList, GripVertical, Heart, Store, MessageCircle, ShoppingBag, LineChart, LayoutDashboard, Settings
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
}

const compressImage = (file: File, maxWidth: number = 800): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        const width = img.width > maxWidth ? maxWidth : img.width;
        const height = img.width > maxWidth ? img.height * scaleSize : img.height;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          } else {
            reject(new Error('Ошибка сжатия изображения'));
          }
        }, 'image/jpeg', 0.8);
      };
    };
    reader.onerror = error => reject(error);
  });
};

const uploadToImgBB = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);
  const API_KEY = '22de10db6eb1f3ec3fca012dcc566961';
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, { method: 'POST', body: formData });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error('Ошибка загрузки на ImgBB');
};

const ALL_MENU_ITEMS = [
  { id: 'chats', label: 'Чаты', icon: MessageCircle },
  { id: 'market', label: 'Маркет', icon: Store },
  { id: 'dating', label: 'Знакомства', icon: Heart },
  { id: 'myshop', label: 'Мой магазин', icon: ShoppingBag },
  { id: 'crm', label: 'Smart CRM', icon: LineChart },
  { id: 'productivity', label: 'Продуктивность', icon: LayoutDashboard }, // <- ОБНОВЛЕНО ИМЯ И ID
  { id: 'profile', label: 'Настройки', icon: Settings },
];

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingProductImg, setIsUploadingProductImage] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const productImgInputRef = useRef<HTMLInputElement>(null);
  const editProductImgInputRef = useRef<HTMLInputElement>(null);

  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>({ id: '', name: '', price: '', description: '', imageUrl: '' });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [profile, setProfile] = useState({
    name: '',
    type: 'personal', 
    role: '',
    avatar: '',
    contacts: { phone: '', email: '', website: '' },
    products: [] as Product[],
    goals: [] as string[],
    menuOrder: [] as string[],
    aiSettings: {
      isEnabled: false,
      contextPrompt: '', 
      followUps: true 
    }
  });

  // DRAG AND DROP (Сортировка меню)
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

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
            avatar: data.avatar || user.photoURL || '',
            contacts: data.contacts || { phone: '', email: '', website: '' },
            products: data.products || [],
            goals: data.goals || [],
            menuOrder: data.menuOrder || ['chats', 'market', 'profile'],
            aiSettings: data.aiSettings || { isEnabled: false, contextPrompt: '', followUps: true }
          });
        } else {
          setProfile(prev => ({
            ...prev,
            name: user.displayName || '',
            avatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`
          }));
        }
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // Формируем активные пункты меню для сортировки
  const activeMenuItems = useMemo(() => {
    let items = ['chats', 'market', 'profile'];
    if (profile.goals.includes('dating')) items.push('dating');
    if (profile.goals.includes('productivity')) items.push('productivity'); // <- ОБНОВЛЕН ID
    if (profile.type === 'business') {
      items.push('myshop');
      items.push('crm');
    }
    
    // Применяем сохраненный порядок
    let currentOrder = profile.menuOrder.filter(id => items.includes(id));
    // Добавляем новые модули, если они появились, но их нет в order
    items.forEach(id => {
      if (!currentOrder.includes(id)) currentOrder.push(id);
    });

    return currentOrder.map(id => ALL_MENU_ITEMS.find(item => item.id === id)).filter(Boolean) as typeof ALL_MENU_ITEMS;
  }, [profile.goals, profile.type, profile.menuOrder]);

  const handleSortMenu = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      let _menuOrder = [...activeMenuItems.map(i => i.id)];
      const draggedItemContent = _menuOrder.splice(dragItem.current, 1)[0];
      _menuOrder.splice(dragOverItem.current, 0, draggedItemContent);
      setProfile(prev => ({ ...prev, menuOrder: _menuOrder }));
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const compressedFile = await compressImage(file, 800);
      const url = await uploadToImgBB(compressedFile);
      setProfile(prev => ({ ...prev, avatar: url }));
    } catch (error) {
      alert('Ошибка при загрузке фото.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleProductImageChange = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProductImage(true);
    try {
      const compressedFile = await compressImage(file, 800);
      const url = await uploadToImgBB(compressedFile);
      if (isEdit) {
        setEditingProduct(prev => prev ? { ...prev, imageUrl: url } : null);
      } else {
        setNewProduct(prev => ({ ...prev, imageUrl: url }));
      }
    } catch (error) {
      alert('Ошибка при загрузке фото.');
    } finally {
      setIsUploadingProductImage(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: profile.name, photoURL: profile.avatar });
        setUser({ ...auth.currentUser });
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Ошибка сохранения профиля:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) return;
    const productToAdd = { ...newProduct, id: Date.now().toString() };
    setProfile({ ...profile, products: [productToAdd, ...profile.products] });
    setNewProduct({ id: '', name: '', price: '', description: '', imageUrl: '' });
    setIsAddingProduct(false);
  };

  const handleRemoveProduct = (productId: string) => {
    if (window.confirm('Удалить этот товар?')) {
      setProfile({ ...profile, products: profile.products.filter(p => p.id !== productId) });
    }
  };

  const handleSaveEditProduct = () => {
    if (!editingProduct || !editingProduct.name || !editingProduct.price) return;
    setProfile({
      ...profile,
      products: profile.products.map(p => p.id === editingProduct.id ? editingProduct : p)
    });
    setEditingProduct(null);
  };

  const toggleGoal = (goalId: string) => {
    setProfile(prev => {
      const newGoals = prev.goals.includes(goalId) 
        ? prev.goals.filter(g => g !== goalId) 
        : [...prev.goals, goalId];
      return { ...prev, goals: newGoals };
    });
  };

  const blockClass = "bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200/50 dark:border-gray-800 mb-6 transition-colors";
  const inputRowClass = "flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0";
  const inputClass = "flex-1 bg-transparent text-[15px] font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none ml-3 w-full";
  const labelClass = "text-[15px] font-medium text-gray-900 dark:text-gray-100 w-28 shrink-0";

  if (isLoading) {
    return <div className="flex-1 bg-[#F2F2F7] dark:bg-gray-950 flex justify-center items-center transition-colors"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F2F2F7] dark:bg-gray-950 select-none pb-24 custom-scrollbar transition-colors">
      
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200/60 dark:border-gray-800 px-4 py-3 flex items-center justify-between transition-colors">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Настройки</h1>
        <button onClick={handleSaveProfile} disabled={isSaving} className="text-[15px] font-bold text-blue-500 hover:text-blue-600 disabled:opacity-50 transition-colors">
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : showSuccess ? 'Сохранено!' : 'Сохранить'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6">
        
        {/* АВАТАРКА */}
        <div className="flex flex-col items-center justify-center mb-8 mt-4">
          <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
            <img src={profile.avatar} alt="Avatar" loading="lazy" className="w-24 h-24 rounded-full object-cover shadow-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors" />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
            {isUploadingAvatar && <div className="absolute inset-0 bg-white/60 dark:bg-black/60 rounded-full flex items-center justify-center"><Loader2 size={24} className="animate-spin text-gray-900 dark:text-white" /></div>}
            <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
          </div>
          <button onClick={() => avatarInputRef.current?.click()} className="text-[13px] font-medium text-blue-500 mt-3">Изменить фото</button>
        </div>

        {/* ТЕМА */}
        <h2 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 mb-2">Оформление</h2>
        <div className={blockClass}>
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={toggleTheme}>
            <div className="flex items-center gap-3">
              {isDark ? <Moon size={20} className="text-blue-500" /> : <Sun size={20} className="text-amber-500" />}
              <span className="text-[15px] font-medium text-gray-900 dark:text-white">Ночная тема</span>
            </div>
            <div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${isDark ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>

        {/* ЦЕЛИ (МОДУЛИ) */}
        <h2 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 mb-2 mt-6 flex items-center gap-1.5"><Target size={16}/> Дополнительные модули</h2>
        <div className={blockClass}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer" onClick={() => toggleGoal('dating')}>
            <div className="flex items-center gap-3">
              <Heart size={20} className={profile.goals.includes('dating') ? "text-pink-500" : "text-gray-400"} />
              <div>
                <span className="text-[15px] font-medium text-gray-900 dark:text-white block">Знакомства</span>
                <span className="text-[12px] text-gray-500 dark:text-gray-400 block mt-0.5">Классическая Tinder-свайпалка</span>
              </div>
            </div>
            <div className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors ${profile.goals.includes('dating') ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${profile.goals.includes('dating') ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>
          
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => toggleGoal('productivity')}>
            <div className="flex items-center gap-3">
              <LayoutDashboard size={20} className={profile.goals.includes('productivity') ? "text-indigo-500" : "text-gray-400"} />
              <div>
                <span className="text-[15px] font-medium text-gray-900 dark:text-white block">Продуктивность</span>
                <span className="text-[12px] text-gray-500 dark:text-gray-400 block mt-0.5">Mind Map, Задачи, Таймер</span>
              </div>
            </div>
            <div className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors ${profile.goals.includes('productivity') ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${profile.goals.includes('productivity') ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>

        {/* НАСТРОЙКА МЕНЮ (DRAG AND DROP) */}
        <h2 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 mb-2 mt-6 flex items-center gap-1.5"><LayoutList size={16}/> Порядок меню</h2>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 px-4 mb-3">Зажмите и потяните пункт, чтобы изменить его позицию.</p>
        <div className={`${blockClass} py-2`}>
          {activeMenuItems.map((item, index) => (
            <div 
              key={item.id}
              draggable
              onDragStart={() => (dragItem.current = index)}
              onDragEnter={() => (dragOverItem.current = index)}
              onDragEnd={handleSortMenu}
              onDragOver={(e) => e.preventDefault()}
              className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-grab active:cursor-grabbing border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <div className="flex items-center gap-3 pointer-events-none">
                <item.icon size={20} className="text-gray-400 dark:text-gray-500" />
                <span className="text-[15px] font-medium text-gray-900 dark:text-white">{item.label}</span>
              </div>
              <GripVertical size={20} className="text-gray-300 dark:text-gray-600" />
            </div>
          ))}
        </div>

        {/* ИНФОРМАЦИЯ */}
        <h2 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 mb-2 mt-6">Личные данные</h2>
        <div className={blockClass}>
          <div className={inputRowClass}>
            <span className={labelClass}>Имя</span>
            <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className={inputClass} placeholder="Иван Иванов" />
          </div>
          <div className="flex flex-col px-4 py-3">
            <span className="text-[15px] font-medium text-gray-900 dark:text-gray-100 mb-1">О себе</span>
            <textarea value={profile.role} onChange={(e) => setProfile({...profile, role: e.target.value})} className="w-full bg-transparent text-[15px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none h-20 custom-scrollbar" placeholder="Напишите пару слов о себе..." />
          </div>
        </div>

        {/* ТИП АККАУНТА */}
        <h2 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 mb-2">Тип аккаунта</h2>
        <div className={blockClass}>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 m-2 rounded-xl transition-colors">
            <button onClick={() => setProfile({...profile, type: 'personal'})} className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg text-[14px] font-semibold transition-all ${profile.type === 'personal' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}><User size={16} /> Обычный</button>
            <button onClick={() => setProfile({...profile, type: 'business'})} className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg text-[14px] font-semibold transition-all ${profile.type === 'business' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}><Briefcase size={16} /> Бизнес</button>
          </div>
        </div>

        {/* БЛОК ДЛЯ БИЗНЕСА */}
        {profile.type === 'business' && (
          <div className="animate-fade-in">
            
            {/* AI Assistant */}
            <h2 className="text-[13px] font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide px-4 mb-2 mt-6 flex items-center gap-1.5"><Zap size={16}/> Smart CRM / ИИ-Автоматизация</h2>
            <div className={`${blockClass} border-indigo-100 dark:border-indigo-900/50`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer" onClick={() => setProfile({...profile, aiSettings: {...profile.aiSettings, isEnabled: !profile.aiSettings.isEnabled}})}>
                <div>
                  <span className="text-[15px] font-bold text-gray-900 dark:text-white block">ИИ Ассистент продаж</span>
                  <span className="text-[12px] text-gray-500 dark:text-gray-400 block mt-0.5">Включить автоматические ответы для клиентов</span>
                </div>
                <div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${profile.aiSettings.isEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${profile.aiSettings.isEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>
              
              {profile.aiSettings.isEnabled && (
                <>
                  <div className="flex flex-col px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 mb-1">Промпт контекста магазина</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">Опишите условия доставки, возврата, цены и гарантии. ИИ будет использовать это для ответов.</span>
                    <textarea 
                      value={profile.aiSettings.contextPrompt} 
                      onChange={(e) => setProfile({...profile, aiSettings: {...profile.aiSettings, contextPrompt: e.target.value}})} 
                      className="w-full bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none h-24 custom-scrollbar" 
                      placeholder="Например: Доставка Новой Почтой, гарантия 15 дней. Мы продаем только оригинальную обувь..." 
                    />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setProfile({...profile, aiSettings: {...profile.aiSettings, followUps: !profile.aiSettings.followUps}})}>
                    <div className="flex items-center gap-2">
                      <MessageSquareText size={18} className="text-gray-400" />
                      <div>
                        <span className="text-[14px] font-semibold text-gray-900 dark:text-white block">Шаблоны Follow-up</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">Предлагать готовые варианты продолжения диалога</span>
                      </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors ${profile.aiSettings.followUps ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${profile.aiSettings.followUps ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </>
              )}
            </div>

            <h2 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 mb-2 mt-6">Контакты бизнеса</h2>
            <div className={blockClass}>
              <div className={inputRowClass}>
                <Phone size={18} className="text-gray-400 dark:text-gray-500" />
                <input type="text" placeholder="Телефон" value={profile.contacts.phone} onChange={(e) => setProfile({...profile, contacts: {...profile.contacts, phone: e.target.value}})} className={inputClass} />
              </div>
              <div className={inputRowClass}>
                <Globe size={18} className="text-gray-400 dark:text-gray-500" />
                <input type="text" placeholder="Сайт или ссылка" value={profile.contacts.website} onChange={(e) => setProfile({...profile, contacts: {...profile.contacts, website: e.target.value}})} className={inputClass} />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 mb-2 mt-6">
              <h2 className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Каталог товаров ({profile.products.length})</h2>
              <button onClick={() => { setIsAddingProduct(!isAddingProduct); setEditingProduct(null); }} className="text-[13px] font-semibold text-blue-500 flex items-center gap-1">
                {isAddingProduct ? 'Отменить' : <><Plus size={14} /> Добавить товар</>}
              </button>
            </div>

            {(isAddingProduct || editingProduct) && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-blue-200 dark:border-blue-900 shadow-sm mb-4 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <div onClick={() => (editingProduct ? editProductImgInputRef : productImgInputRef).current?.click()} className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center cursor-pointer border border-gray-200 dark:border-gray-700 shrink-0 overflow-hidden relative">
                    {(editingProduct ? editingProduct.imageUrl : newProduct.imageUrl) ? <img src={editingProduct ? editingProduct.imageUrl : newProduct.imageUrl} loading="lazy" className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-gray-400 dark:text-gray-500" />}
                    {isUploadingProductImg && <div className="absolute inset-0 bg-white/70 dark:bg-black/60 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-gray-900 dark:text-white" /></div>}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input type="text" placeholder="Название товара (обязательно)" value={editingProduct ? editingProduct.name : newProduct.name} onChange={e => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 rounded-lg text-[15px] outline-none font-semibold transition-colors" />
                    <input type="text" placeholder="Цена, например: 1500 ₴" value={editingProduct ? editingProduct.price : newProduct.price} onChange={e => editingProduct ? setEditingProduct({...editingProduct, price: e.target.value}) : setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 rounded-lg text-sm outline-none transition-colors" />
                  </div>
                </div>
                
                <textarea 
                  placeholder="Описание товара..." 
                  value={editingProduct ? editingProduct.description : newProduct.description} 
                  onChange={e => editingProduct ? setEditingProduct({...editingProduct, description: e.target.value}) : setNewProduct({...newProduct, description: e.target.value})} 
                  className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2 rounded-lg text-sm outline-none resize-none h-24 custom-scrollbar transition-colors mb-3" 
                />
                <input type="file" ref={productImgInputRef} onChange={(e) => handleProductImageChange(e, false)} accept="image/*" className="hidden" />
                <input type="file" ref={editProductImgInputRef} onChange={(e) => handleProductImageChange(e, true)} accept="image/*" className="hidden" />
                <button onClick={editingProduct ? handleSaveEditProduct : handleAddProduct} disabled={!(editingProduct ? editingProduct.name : newProduct.name) || !(editingProduct ? editingProduct.price : newProduct.price)} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors">
                  {editingProduct ? 'Сохранить изменения' : 'Сохранить в каталог'}
                </button>
              </div>
            )}

            {profile.products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {profile.products.map(product => (
                  <div key={product.id} className="bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm flex flex-col relative group transition-colors">
                    <div className="h-32 bg-gray-100 dark:bg-gray-800 relative">
                      {product.imageUrl ? <img src={product.imageUrl} loading="lazy" className="w-full h-full object-cover" /> : <Package className="absolute inset-0 m-auto text-gray-300 dark:text-gray-600" size={32} />}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingProduct(product); setIsAddingProduct(false); }} className="w-7 h-7 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-md flex items-center justify-center text-gray-600 dark:text-gray-300 shadow-sm"><Edit2 size={14} /></button>
                        <button onClick={() => handleRemoveProduct(product.id)} className="w-7 h-7 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-md flex items-center justify-center text-red-500 shadow-sm"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-gray-900 dark:text-white text-[13px] truncate">{product.name}</p>
                      <p className="text-[12px] font-bold text-blue-500 mt-0.5">{product.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
               <div className="text-center py-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/50 dark:border-gray-800 text-gray-400 dark:text-gray-500 text-sm transition-colors">У вас пока нет товаров в каталоге</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
