import { useEffect, useState, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { useAuthStore } from './store/useAuthStore';

import { 
  MessageSquare, Globe, Store, LogOut, Hexagon, Component
} from 'lucide-react';

// ==========================================
// ЛЕНИВАЯ ЗАГРУЗКА СТРАНИЦ (ОПТИМИЗАЦИЯ БАНДЛА)
// ==========================================
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ChatsPage = lazy(() => import('./pages/ChatsPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const MarketPage = lazy(() => import('./pages/MarketPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const FeedPostsPage = lazy(() => import('./pages/FeedPostsPage'));
const ShopPage = lazy(() => import('./pages/ShopPage')); // Подключили страницу магазина

// ==========================================
// ГЛОБАЛЬНЫЙ ЗАГРУЗЧИК (PRELOADER)
// ==========================================
const GlobalLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] w-full">
    <div className="w-16 h-16 relative flex items-center justify-center">
      <div className="absolute inset-0 bg-brand/10 rounded-full animate-ping"></div>
      <Hexagon size={40} className="text-gray-300 absolute" strokeWidth={1.5} />
      <div className="w-8 h-8 border-[3px] border-gray-950 border-t-transparent rounded-full animate-spin relative z-10"></div>
    </div>
  </div>
);

// ==========================================
// ОСНОВНОЙ МАКЕТ (САЙДБАР ПК / НИЖНЕЕ МЕНЮ МОБИЛОК)
// ==========================================
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuthStore();

  // Обновленная структура меню (Чаты и Радар поменяны местами)
  const menuItems = [
    { path: '/posts', icon: <Component size={22} />, label: 'Лента' },
    { path: '/chats', icon: <MessageSquare size={22} />, label: 'Чаты', badge: true }, // badge - индикатор уведомлений
    { path: '/feed', icon: <Globe size={22} />, label: 'Радар' },
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
      
      {/* 💻 ДЕСКТОПНЫЙ САЙДБАР */}
      <aside className="hidden md:flex w-[280px] bg-white border-r border-gray-200/60 flex-col justify-between z-20 shadow-[1px_0_20px_rgba(0,0,0,0.02)]">
        <div>
          {/* Кликабельный Логотип */}
          <Link to="/posts" className="h-20 flex items-center px-6 border-b border-gray-100 gap-3 group">
            <div className="w-10 h-10 bg-gray-950 rounded-xl flex items-center justify-center shadow-lg shadow-gray-950/20 group-hover:scale-105 transition-transform duration-300">
              <Hexagon size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-2xl tracking-tight text-gray-950 group-hover:text-brand transition-colors duration-300">
              Aura
            </span>
          </Link>

          {/* Профиль пользователя */}
          {user && (
            <Link 
              to="/profile" 
              className={`flex items-center gap-3.5 p-4 mx-4 mt-6 mb-4 rounded-2xl transition-all duration-300 border group ${
                location.pathname === '/profile' 
                  ? 'bg-gray-50 border-gray-200 shadow-sm' 
                  : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              <img 
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=random`} 
                alt="Profile" 
                className="w-12 h-12 rounded-xl object-cover border border-gray-200/60 shadow-sm group-hover:scale-105 transition-transform" 
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-950 truncate">{user.displayName || 'Профиль'}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                </p>
              </div>
            </Link>
          )}

          {/* Навигация */}
          <nav className="px-4 py-2 space-y-1.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-4 mt-2">Меню платформы</div>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path === '/market' && location.pathname.startsWith('/shop'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group relative ${
                    isActive
                      ? 'bg-gray-950 text-white shadow-md hover:bg-gray-900'
                      : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
                  }`}
                >
                  <div className={`relative transition-transform duration-300 ${isActive ? 'scale-110 text-white' : 'text-gray-400 group-hover:text-gray-900 group-hover:scale-110'}`}>
                    {item.icon}
                    {/* Бейдж непрочитанных (не показываем, если раздел активен) */}
                    {item.badge && !isActive && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand rounded-full border-2 border-white"></span>
                    )}
                  </div>
                  {item.label}
                  {/* Пульсирующая точка удалена по просьбе для чистоты интерфейса */}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Кнопка Выхода */}
        <div className="p-5 border-t border-gray-100/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all duration-200 group"
          >
            <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
            Выйти из сеанса
          </button>
        </div>
      </aside>

      {/* 📱 МОБИЛЬНЫЙ ХЕДЕР (Стеклянный) */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-[68px] bg-white/80 backdrop-blur-xl border-b border-gray-200/60 z-30 flex items-center justify-between px-5 pt-safe">
        <Link to="/posts" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-gray-950 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300">
            <Hexagon size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-black text-xl tracking-tight text-gray-950 group-hover:text-brand transition-colors duration-300">Aura</span>
        </Link>
        {user && (
          <Link to="/profile" className="relative group">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}`} 
              alt="User" 
              className="w-10 h-10 rounded-xl object-cover border border-gray-200/60 shadow-sm active:scale-95 transition-transform group-hover:border-brand" 
            />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </Link>
        )}
      </header>

      {/* ОСНОВНОЙ КОНТЕЙНЕР ДЛЯ СТРАНИЦ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pt-[68px] md:pt-0 pb-[84px] md:pb-0">
        <Suspense fallback={<GlobalLoader />}>
          {children}
        </Suspense>
      </main>

      {/* 📱 МОБИЛЬНОЕ НИЖНЕЕ МЕНЮ (Glassmorphism Bottom Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[84px] bg-white/90 backdrop-blur-xl border-t border-gray-200/60 z-30 flex items-center justify-around px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {menuItems.map((item) => {
          // Для магазина подсвечиваем иконку Маркета
          const isActive = location.pathname === item.path || (item.path === '/market' && location.pathname.startsWith('/shop'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 relative ${
                isActive ? 'text-gray-950' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {/* Полоска сверху убрана для более чистого iOS-стиля */}
              <div className={`relative transition-all duration-300 ${isActive ? '-translate-y-1.5 scale-110' : 'scale-100 mt-1'}`}>
                {item.icon}
                {item.badge && !isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand rounded-full border border-white"></span>
                )}
              </div>
              
              <span className={`text-[10px] font-bold absolute bottom-1 transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
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
    return <GlobalLoader />;
  }

  return (
    <HashRouter>
      <Suspense fallback={<GlobalLoader />}>
        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/posts" />} />
          
          {/* Защищенные роуты */}
          <Route path="/" element={<Navigate to="/posts" replace />} />
          <Route path="/chats" element={user ? <MainLayout><ChatsPage /></MainLayout> : <Navigate to="/login" />} />
          <Route path="/feed" element={user ? <MainLayout><FeedPage currentSync={currentSync} userGender={gender} /></MainLayout> : <Navigate to="/login" />} />
          <Route path="/posts" element={user ? <MainLayout><FeedPostsPage /></MainLayout> : <Navigate to="/login" />} />
          <Route path="/market" element={user ? <MainLayout><MarketPage /></MainLayout> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <MainLayout><ProfilePage currentSync={currentSync} setSync={setSync} gender={gender} setGender={setGender} /></MainLayout> : <Navigate to="/login" />} />
          
          {/* Страница отдельного магазина */}
          <Route path="/shop/:id" element={user ? <MainLayout><ShopPage /></MainLayout> : <Navigate to="/login" />} />
          
          <Route path="*" element={<Navigate to="/posts" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
