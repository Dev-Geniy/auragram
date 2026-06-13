import React from 'react';
import { Link } from 'react-router-dom';
import { X, Phone, Globe, MessageSquare, ShoppingBag } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
}

interface ProfileData {
  id?: string;
  name: string;
  type: string;
  avatar: string;
  role?: string;
  skills?: string[];
  contacts?: {
    phone?: string;
    website?: string;
    email?: string;
  };
  products?: Product[];
}

interface ProfileModalProps {
  profile: ProfileData;
  onClose: () => void;
}

export default function ProfileModal({ profile, onClose }: ProfileModalProps) {
  // Закрытие при клике вне карточки (на затемненный фон)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] bg-gray-950/40 backdrop-blur-md flex items-center justify-center p-4 md:p-10 overflow-y-auto animate-fade-in"
      onClick={handleBackdropClick}
    >
      {/* Добавили flex flex-col для правильного позиционирования футера */}
      <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl relative my-auto animate-scale-up flex flex-col">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 w-10 h-10 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-colors z-20"
        >
          <X size={20} />
        </button>
        
        {/* Шапка профиля */}
        <div className="relative h-64 bg-gray-100 overflow-hidden shrink-0">
          <img 
            src={profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}&background=random`} 
            alt="Avatar" 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/20 to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex gap-2 mb-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-md ${profile.type === 'business' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
                {profile.type === 'business' ? 'Бизнес' : 'Пользователь'}
              </span>
            </div>
            <h3 className="font-black text-2xl text-white drop-shadow-md truncate">
              {profile.name || 'Без имени'}
            </h3>
          </div>
        </div>
        
        {/* Тело профиля */}
        <div className="p-6 md:p-8 flex flex-col gap-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <p className="text-[15px] text-gray-600 font-medium leading-relaxed whitespace-pre-wrap">
            {profile.role || 'Описание отсутствует...'}
          </p>
          
          {/* Навыки */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(skill => (
                <span key={skill} className="text-[11px] font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl">
                  {skill}
                </span>
              ))}
            </div>
          )}
          
          {/* Бизнес контакты и товары */}
          {profile.type === 'business' && (
            <div className="space-y-6 pt-4 border-t border-gray-100">
              {(profile.contacts?.phone || profile.contacts?.website) && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Контакты</h4>
                  {profile.contacts.phone && (
                    <p className="text-sm font-bold flex items-center gap-2">
                      <Phone size={14} className="text-amber-500"/> {profile.contacts.phone}
                    </p>
                  )}
                  {profile.contacts.website && (
                    <p className="text-sm font-bold flex items-center gap-2 text-gray-900 truncate">
                      <Globe size={14} className="text-amber-500 shrink-0"/> 
                      <a href={profile.contacts.website.startsWith('http') ? profile.contacts.website : `https://${profile.contacts.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-amber-600 truncate">
                        {profile.contacts.website}
                      </a>
                    </p>
                  )}
                </div>
              )}
              
              {profile.products && profile.products.length > 0 && (
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

        {/* ФУТЕР С КНОПКАМИ ДЕЙСТВИЙ (Новый блок) */}
        {profile.id && (
          <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-100 flex items-center gap-3 shrink-0">
            {/* Кнопка магазина (только для бизнес-профилей) */}
            {profile.type === 'business' && (
              <Link 
                to={`/shop/${profile.id}`}
                onClick={onClose}
                className="flex-1 py-3.5 bg-white hover:bg-amber-500 text-gray-900 hover:text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm border border-gray-200/60 hover:border-amber-500 group"
              >
                <ShoppingBag size={16} className="group-hover:scale-110 transition-transform" />
                <span className="truncate">В магазин</span>
              </Link>
            )}
            
            {/* Универсальная кнопка "Написать" */}
            <Link 
              to="/chats" 
              state={{ selectedUserId: profile.id }}
              onClick={onClose}
              className="flex-1 py-3.5 bg-gray-950 hover:bg-gray-800 text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm group"
            >
              <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
              <span className="truncate">Написать</span>
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
