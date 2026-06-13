import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { useAuthStore } from './store/useAuthStore';

// Страницы
import LoginPage from './pages/LoginPage';
import ChatsPage from './pages/ChatsPage';
import FeedPage from './pages/FeedPage';
import MarketPage from './pages/MarketPage';
import ProfilePage from './pages/ProfilePage';

import { 
  MessageSquare, Globe, Store, LogOut, Hexagon, Component
} from 'lucide-react';

// ==========================================
// ОСНОВНОЙ МАКЕТ (САЙДБАР ДЛЯ ПК / НИЖНЕЕ МЕНЮ ДЛЯ МОБИЛОК)
// ==========================================
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuthStore();

  // Обновленная структура меню (без профиля, он теперь сверху)
  const menuItems = [
    { path: '/feed', icon: <Globe size={22} />, label: 'Радар' },
    { path: '/', icon: <MessageSquare size={22} />, label: 'Чаты' },
    // Ленту (FeedPosts) мы добавим в следующем шаге, пока оставим место
    { path: '/posts', icon: <Component size={22} />, label: 'Лента' },
    { path: '/market', icon: <Store size={22} />, label: 'Маркет' },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Ошибка при выходе из системы:', error);
    }
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA] overflow-hidden font-sans antialiased text-gray-900 selection:bg-brand/20">
      
      {/* 💻 ДЕСКТОПНЫЙ САЙДБАР (Скрыт на мобильных) */}
      <aside className="hidden md:flex w-[260px] bg-white border-r border-gray-200/60 flex-col justify-between z-20 shadow-[1px_0_15px_rgba(0,0,0,0.02)]">
        <div>
          {/* Логотип AuraSync */}
          <div className="h-20 flex items-center px-6 border-b border-gray-100 gap-3">
            <div className="w-9 h-9 bg-gray-950 rounded-xl flex items-center justify-center shadow-md">
              <Hexagon size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-xl tracking-tight text-gray-950">
              AuraSync
            </span>
          </div>

          {/* Профиль пользователя (Кликабельный блок сверху) */}
          {user && (
            <Link 
              to="/profile" 
              className={`flex items-center gap-3 p-4 mx-4 mt-6 mb-2 rounded-2xl transition-all duration-200 border group ${
                location.pathname === '/profile' 
                  ? 'bg-gray-50 border-gray-200 shadow-sm' 
                  : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
              }`}
            >
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=random`} 
                alt="Profile" 
                className="w-11 h-11 rounded-xl object-cover border border-gray-200/60 shadow-sm group-hover:scale-105 transition-transform" 
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-950 truncate">{user.displayName || 'Профиль'}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Настройки</p>
              </div>
            </Link>
          )}

          {/* Навигация */}
          <nav className="px-4 py-2 space-y-1">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-3 mt-4">Меню платформы</div>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gray-950 text-white shadow-md hover:shadow-lg hover:bg-gray-900'
                      : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
                  }`}
                >
                  <div className={`transition-transform duration-300 ${isActive ? 'scale-110 text-white' : 'text-gray-400 group-hover:text-gray-900 group-hover:scale-110'}`}>
                    {item.icon}
                  </div>
                  {item.label}
                  {/* Декоративная точка активности */}
                  {isActive && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Кнопка Выхода */}
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all duration-200 group"
          >
            <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
            Выйти из аккаунта
          </button>
        </div>
      </aside>

      {/* 📱 МОБИЛЬНЫЙ ХЕДЕР (Стеклянный) */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/60 z-30 flex items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gray-950 rounded-lg flex items-center justify-center shadow-sm">
            <Hexagon size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-black text-lg tracking-tight text-gray-950">AuraSync</span>
        </div>
        {user && (
          <Link to="/profile">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}`} 
              alt="User" 
              className="w-9 h-9 rounded-xl object-cover border border-gray-200/60 shadow-sm active:scale-95 transition-transform" 
            />
          </Link>
        )}
      </header>

      {/* ОСНОВНОЙ КОНТЕЙНЕР ДЛЯ СТРАНИЦ */}
      {/* pt-16 - отступ под мобильный хедер. pb-[80px] - отступ под мобильное меню */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pt-16 md:pt-0 pb-[80px] md:pb-0">
        {children}
      </main>

      {/* 📱 МОБИЛЬНОЕ НИЖНЕЕ МЕНЮ (Bottom Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[80px] bg-white border-t border-gray-200/60 z-30 flex items-center justify-between px-6 pb-safe shadow-[0_-4px_25px_rgba(0,0,0,0.04)]">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 relative ${
                isActive ? 'text-gray-950' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {/* Индикатор активной вкладки (капелька сверху) */}
              <div className={`absolute top-0 w-8 h-1 bg-gray-950 rounded-b-full transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
              
              <div className={`transition-all duration-300 ${isActive ? '-translate-y-1 scale-110' : 'scale-100 mt-1'}`}>
                {item.icon}
              </div>
              
              <span className={`text-[10px] font-bold absolute bottom-1 transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
};

// ==========================================
// ГЛАВНЫЙ КОМПОНЕНТ APP
// ==========================================
export default function App() {
  const { user, setUser, isLoading, setLoading } = useAuthStore();
  
  // Глобальные состояния
  const [currentSync, setSync] = useState<'all' | 'business' | 'personal'>('all');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="w-12 h-12 relative flex items-center justify-center">
          <Hexagon size={40} className="text-gray-300 absolute" strokeWidth={1.5} />
          <div className="w-6 h-6 border-2 border-gray-950 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/feed" />} />
        
        {/* Защищенные роуты */}
        <Route path="/" element={user ? <MainLayout><ChatsPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/feed" element={user ? <MainLayout><FeedPage currentSync={currentSync} userGender={gender} /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/market" element={user ? <MainLayout><MarketPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <MainLayout><ProfilePage currentSync={currentSync} setSync={setSync} gender={gender} setGender={setGender} /></MainLayout> : <Navigate to="/login" />} />
        
        {/* Заглушка для будущей ленты постов (Задача 6) */}
        <Route path="/posts" element={user ? <MainLayout><div className="p-8 text-center mt-20 font-bold text-gray-400">Глобальная лента в разработке...</div></MainLayout> : <Navigate to="/login" />} />
        
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
    </HashRouter>
  );
}
