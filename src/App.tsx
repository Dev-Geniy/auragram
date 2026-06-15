import { useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { useAuthStore } from './store/useAuthStore';

import { 
  MessageCircle, Store, Settings, LogOut, Hexagon
} from 'lucide-react';

// 🌟 ДОБАВЛЯЕМ ИМПОРТ ГЛОБАЛЬНЫХ УВЕДОМЛЕНИЙ
import GlobalNotifications from './components/GlobalNotifications';

// ==========================================
// ЛЕНИВАЯ ЗАГРУЗКА СТРАНИЦ
// ==========================================
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ChatsPage = lazy(() => import('./pages/ChatsPage'));
const MarketPage = lazy(() => import('./pages/MarketPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));

// ==========================================
// ГЛОБАЛЬНЫЙ ЗАГРУЗЧИК
// ==========================================
const GlobalLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 w-full transition-colors duration-300">
    <div className="w-12 h-12 relative flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-full animate-ping opacity-50"></div>
      <Hexagon size={32} className="text-gray-900 dark:text-white absolute" strokeWidth={1.5} />
      <div className="w-12 h-12 border-[2px] border-gray-900 dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin relative z-10"></div>
    </div>
  </div>
);

// ==========================================
// ЗАЩИТА МАРШРУТОВ
// ==========================================
const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};

// ==========================================
// ОСНОВНОЙ МАКЕТ (САЙДБАР ПК / НИЖНЕЕ МЕНЮ МОБИЛОК)
// ==========================================
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuthStore();

  const menuItems = [
    { path: '/chats', icon: <MessageCircle size={24} strokeWidth={2} />, label: 'Чаты' },
    { path: '/market', icon: <Store size={24} strokeWidth={2} />, label: 'Маркет' },
    { path: '/profile', icon: <Settings size={24} strokeWidth={2} />, label: 'Настройки' },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  return (
    <div className="flex h-[100dvh] bg-white dark:bg-gray-950 overflow-hidden font-sans antialiased text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* 💻 ДЕСКТОПНЫЙ САЙДБАР */}
      <aside className="hidden md:flex w-[80px] lg:w-[260px] bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col justify-between z-20 transition-colors duration-300">
        <div className="flex flex-col h-full">
          
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 mb-4 mt-2">
            <div className="w-10 h-10 bg-gray-900 dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
              <Hexagon size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="hidden lg:block ml-3 font-black text-xl tracking-tight text-gray-900 dark:text-white">
              Aura
            </span>
          </div>

          <nav className="flex-1 px-3 space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path === '/market' && location.pathname.startsWith('/shop'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center lg:px-4 py-3 rounded-2xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-gray-900 dark:bg-gray-800 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={item.label}
                >
                  <div className="flex w-full items-center justify-center lg:justify-start">
                    <div className={`${isActive ? 'scale-105' : 'group-hover:scale-105'} transition-transform`}>
                      {item.icon}
                    </div>
                    <span className="hidden lg:block ml-3.5 text-[15px] font-semibold tracking-wide">
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 mb-2">
            {user && (
              <div className="hidden lg:flex items-center gap-3 p-3 mb-2">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=random`} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700" 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.displayName || 'Пользователь'}</p>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">Online</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center lg:justify-start lg:px-4 py-3 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-colors group"
              title="Выйти"
            >
              <LogOut size={22} className="lg:mr-3" />
              <span className="hidden lg:block text-[15px] font-semibold">Выйти</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 📱 ОСНОВНОЙ КОНТЕЙНЕР */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-[60px] md:pb-0 bg-white dark:bg-gray-950 transition-colors duration-300">
        <Suspense fallback={<GlobalLoader />}>
          {children}
        </Suspense>
      </main>

      {/* 📱 МОБИЛЬНОЕ НИЖНЕЕ МЕНЮ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] pb-safe bg-white/85 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-800/80 z-50 flex items-center justify-around px-2 transition-colors duration-300">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/market' && location.pathname.startsWith('/shop'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center w-full h-full relative"
            >
              <div className={`transition-colors duration-200 ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-medium mt-1 transition-colors duration-200 ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
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
// ГЛАВНЫЙ КОМПОНЕНТ
// ==========================================
export default function App() {
  const { user, setUser, isLoading, setLoading } = useAuthStore();

  // Инициализация темной темы при старте приложения
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

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
        
        {/* 🌟 ГЛОБАЛЬНЫЕ УВЕДОМЛЕНИЯ (Рисуются поверх всего интерфейса) */}
        {user && <GlobalNotifications />}

        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/chats" />} />
          
          <Route path="/" element={<Navigate to="/chats" replace />} />
          <Route path="/chats" element={<RequireAuth><MainLayout><ChatsPage /></MainLayout></RequireAuth>} />
          <Route path="/market" element={<RequireAuth><MainLayout><MarketPage /></MainLayout></RequireAuth>} />
          
          <Route path="/profile" element={<RequireAuth><MainLayout><ProfilePage /></MainLayout></RequireAuth>} />
          <Route path="/shop/:id" element={<RequireAuth><MainLayout><ShopPage /></MainLayout></RequireAuth>} />
          
          <Route path="*" element={<Navigate to="/chats" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
