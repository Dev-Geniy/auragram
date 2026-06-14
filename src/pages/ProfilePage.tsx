import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Camera, User, Briefcase, 
  Phone, Globe, Package, Plus, Trash2, Image as ImageIcon, 
  Loader2, Edit2
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
}

// Утилита для загрузки изображений на ImgBB
const uploadToImgBB = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);
  const API_KEY = '22de10db6eb1f3ec3fca012dcc566961';
  
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
    method: 'POST',
    body: formData,
  });
  
  const data = await res.json();
  if (data.success) {
    return data.data.url;
  } else {
    throw new Error('Ошибка загрузки ImgBB');
  }
};

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Состояния загрузки фото
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
            avatar: data.avatar || user.photoURL || '',
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
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const url = await uploadToImgBB(file);
      setProfile(prev => ({ ...prev, avatar: url }));
    } catch (error) {
      alert('Не удалось загрузить фото.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleProductImageChange = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProductImage(true);
    try {
      const url = await uploadToImgBB(file);
      if (isEdit) {
        setEditingProduct(prev => prev ? { ...prev, imageUrl: url } : null);
      } else {
        setNewProduct(prev => ({ ...prev, imageUrl: url }));
      }
    } catch (error) {
      alert('Не удалось загрузить изображение товара.');
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
        await updateProfile(auth.currentUser, {
          displayName: profile.name,
          photoURL: profile.avatar
        });
        setUser({ ...auth.currentUser });
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Ошибка при сохранении профиля:', error);
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

  // UI Классы в стиле iOS/Telegram
  const blockClass = "bg-white rounded-2xl overflow-hidden border border-gray-200/50 mb-6";
  const inputRowClass = "flex items-center px-4 py-3 border-b border-gray-100 last:border-0";
  const inputClass = "flex-1 bg-transparent text-[15px] font-medium text-gray-900 placeholder-gray-400 outline-none ml-3 w-full";
  const labelClass = "text-[15px] font-medium text-gray-900 w-28 shrink-0";

  if (isLoading) {
    return <div className="flex-1 bg-[#F2F2F7] flex justify-center items-center"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F2F2F7] select-none pb-24 custom-scrollbar">
      
      {/* Шапка */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200/60 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Настройки</h1>
        <button 
          onClick={handleSaveProfile} 
          disabled={isSaving} 
          className="text-[15px] font-bold text-blue-500 hover:text-blue-600 disabled:opacity-50 transition-colors"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : showSuccess ? 'Сохранено' : 'Сохранить'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6">
        
        {/* Аватарка (по центру) */}
        <div className="flex flex-col items-center justify-center mb-8 mt-4">
          <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
            <img 
              src={profile.avatar} 
              alt="Avatar" 
              className="w-24 h-24 rounded-full object-cover shadow-sm bg-white border border-gray-200" 
            />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-white/60 rounded-full flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-gray-900" />
              </div>
            )}
            <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
          </div>
          <button onClick={() => avatarInputRef.current?.click()} className="text-[13px] font-medium text-blue-500 mt-3">
            Изменить фото
          </button>
        </div>

        {/* Основные данные */}
        <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide px-4 mb-2">Профиль</h2>
        <div className={blockClass}>
          <div className={inputRowClass}>
            <span className={labelClass}>Имя</span>
            <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className={inputClass} placeholder="Ваше имя" />
          </div>
          <div className="flex flex-col px-4 py-3">
            <span className="text-[15px] font-medium text-gray-900 mb-1">О себе</span>
            <textarea 
              value={profile.role} 
              onChange={(e) => setProfile({...profile, role: e.target.value})} 
              className="w-full bg-transparent text-[15px] text-gray-900 placeholder-gray-400 outline-none resize-none h-20" 
              placeholder="Расскажите о себе..." 
            />
          </div>
        </div>

        {/* Тип аккаунта */}
        <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide px-4 mb-2">Тип аккаунта</h2>
        <div className={blockClass}>
          <div className="flex bg-gray-100 p-1 m-2 rounded-xl">
            <button 
              onClick={() => setProfile({...profile, type: 'personal'})} 
              className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg text-[14px] font-semibold transition-all ${profile.type === 'personal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              <User size={16} /> Личный
            </button>
            <button 
              onClick={() => setProfile({...profile, type: 'business'})} 
              className={`flex-1 flex justify-center items-center gap-2 py-2 rounded-lg text-[14px] font-semibold transition-all ${profile.type === 'business' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              <Briefcase size={16} /> Бизнес
            </button>
          </div>
        </div>

        {/* Блок Бизнеса */}
        {profile.type === 'business' && (
          <div className="animate-fade-in">
            <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide px-4 mb-2">Контакты</h2>
            <div className={blockClass}>
              <div className={inputRowClass}>
                <Phone size={18} className="text-gray-400" />
                <input type="text" placeholder="Телефон" value={profile.contacts.phone} onChange={(e) => setProfile({...profile, contacts: {...profile.contacts, phone: e.target.value}})} className={inputClass} />
              </div>
              <div className={inputRowClass}>
                <Globe size={18} className="text-gray-400" />
                <input type="text" placeholder="Сайт или соцсеть" value={profile.contacts.website} onChange={(e) => setProfile({...profile, contacts: {...profile.contacts, website: e.target.value}})} className={inputClass} />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 mb-2 mt-6">
              <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide">Товары ({profile.products.length})</h2>
              <button onClick={() => { setIsAddingProduct(!isAddingProduct); setEditingProduct(null); }} className="text-[13px] font-semibold text-blue-500 flex items-center gap-1">
                {isAddingProduct ? 'Отмена' : <><Plus size={14} /> Добавить</>}
              </button>
            </div>

            {/* Форма товара (общая для добавления и редактирования) */}
            {(isAddingProduct || editingProduct) && (
              <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-sm mb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div 
                    onClick={() => (editingProduct ? editProductImgInputRef : productImgInputRef).current?.click()} 
                    className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center cursor-pointer border border-gray-200 shrink-0 overflow-hidden relative"
                  >
                    {(editingProduct ? editingProduct.imageUrl : newProduct.imageUrl) ? (
                      <img src={editingProduct ? editingProduct.imageUrl : newProduct.imageUrl} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={20} className="text-gray-400" />
                    )}
                    {isUploadingProductImg && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><Loader2 size={16} className="animate-spin text-gray-900" /></div>}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input type="text" placeholder="Название товара" value={editingProduct ? editingProduct.name : newProduct.name} onChange={e => editingProduct ? setEditingProduct({...editingProduct, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-gray-50 px-3 py-2 rounded-lg text-sm outline-none" />
                    <input type="text" placeholder="Цена" value={editingProduct ? editingProduct.price : newProduct.price} onChange={e => editingProduct ? setEditingProduct({...editingProduct, price: e.target.value}) : setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-gray-50 px-3 py-2 rounded-lg text-sm outline-none" />
                  </div>
                </div>
                <input type="file" ref={productImgInputRef} onChange={(e) => handleProductImageChange(e, false)} accept="image/*" className="hidden" />
                <input type="file" ref={editProductImgInputRef} onChange={(e) => handleProductImageChange(e, true)} accept="image/*" className="hidden" />
                <textarea placeholder="Описание товара..." value={editingProduct ? editingProduct.description : newProduct.description} onChange={e => editingProduct ? setEditingProduct({...editingProduct, description: e.target.value}) : setNewProduct({...newProduct, description: e.target.value})} className="w-full bg-gray-50 px-3 py-2 rounded-lg text-sm outline-none resize-none h-16 mb-3" />
                <button 
                  onClick={editingProduct ? handleSaveEditProduct : handleAddProduct} 
                  disabled={!(editingProduct ? editingProduct.name : newProduct.name) || !(editingProduct ? editingProduct.price : newProduct.price)} 
                  className="w-full bg-blue-500 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
                >
                  {editingProduct ? 'Сохранить изменения' : 'Добавить товар'}
                </button>
              </div>
            )}

            {/* Список товаров */}
            {profile.products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {profile.products.map(product => (
                  <div key={product.id} className="bg-white border border-gray-200/50 rounded-xl overflow-hidden shadow-sm flex flex-col relative group">
                    <div className="h-32 bg-gray-100 relative">
                      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" /> : <Package className="absolute inset-0 m-auto text-gray-300" size={32} />}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingProduct(product); setIsAddingProduct(false); }} className="w-7 h-7 bg-white/90 backdrop-blur rounded-md flex items-center justify-center text-gray-600 shadow-sm"><Edit2 size={14} /></button>
                        <button onClick={() => handleRemoveProduct(product.id)} className="w-7 h-7 bg-white/90 backdrop-blur rounded-md flex items-center justify-center text-red-500 shadow-sm"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-gray-900 text-[13px] truncate">{product.name}</p>
                      <p className="text-[12px] font-bold text-blue-500 mt-0.5">{product.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
               <div className="text-center py-6 bg-white rounded-2xl border border-gray-200/50 text-gray-400 text-sm">
                 Товаров пока нет
               </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
