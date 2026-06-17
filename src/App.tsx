import { useEffect, useState, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { useAuthStore } from './store/useAuthStore';

import { 
  MessageCircle, Store, Settings, LogOut, Hexagon,
  Heart, ShoppingBag, LineChart, LayoutDashboard, Menu, X
} from 'lucide-react';

import GlobalNotifications from './components/GlobalNotifications';
import ProductivityLayout from './pages/productivity/ProductivityLayout';

// ==========================================
// ЛЕНИВАЯ ЗАГРУЗКА СТРАНИЦ
// ==========================================
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ChatsPage = lazy(() => import('./pages/ChatsPage'));
const MarketPage = lazy(() => import('./pages/MarketPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const DatingPage = lazy(() => import('./pages/DatingPage'));
const CRMPage = lazy(() => import('./pages/CRMPage'));

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
// ОСНОВНОЙ МАКЕТ С ДИНАМИЧЕСКИМ МЕНЮ
// ==========================================
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { console.error(error); }
  };

  // Если пользователя нет (гостевой режим для магазина), не рендерим меню
  if (!user) {
    return (
      <div className="flex h-[100dvh] bg-white dark:bg-gray-950 overflow-hidden font-sans antialiased text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-white dark:bg-gray-950 transition-colors duration-300 z-10">
          <Suspense fallback={<GlobalLoader />}>
            {children}
          </Suspense>
        </main>
      </div>
    );
  }

  const availableItems = [];
  
  if (profile?.goals?.includes('dating')) {
    availableItems.push({ id: 'dating', path: '/dating', icon: <Heart size={24} strokeWidth={2} />, label: 'Знакомства' });
  }
  
  availableItems.push({ id: 'chats', path: '/chats', icon: <MessageCircle size={24} strokeWidth={2} />, label: 'Чаты' });
  availableItems.push({ id: 'market', path: '/market', icon: <Store size={24} strokeWidth={2} />, label: 'Маркет' });
  
  if (profile?.type === 'business') {
    // Если у пользователя есть customUrl, используем его в меню, иначе id
    const shopLink = profile.customUrl ? profile.customUrl : user.uid;
    availableItems.push({ id: 'myshop', path: `/shop/${shopLink}`, icon: <ShoppingBag size={24} strokeWidth={2} />, label: 'Мой магазин' });
    availableItems.push({ id: 'crm', path: '/crm', icon: <LineChart size={24} strokeWidth={2} />, label: 'Smart CRM' });
  }

  if (profile?.goals?.includes('productivity')) {
    availableItems.push({ id: 'productivity', path: '/productivity', icon: <LayoutDashboard size={24} strokeWidth={2} />, label: 'Продуктивность' });
  }

  availableItems.push({ id: 'profile', path: '/profile', icon: <Settings size={24} strokeWidth={2} />, label: 'Настройки' });

  if (profile?.menuOrder && Array.isArray(profile.menuOrder)) {
    availableItems.sort((a, b) => {
      const idxA = profile.menuOrder.indexOf(a.id);
      const idxB = profile.menuOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }

  const isMobileOverflow = availableItems.length > 4;
  const mobileNavItems = isMobileOverflow ? availableItems.slice(0, 3) : availableItems;
  const mobileMoreItems = isMobileOverflow ? availableItems.slice(3) : [];

  return (
    <div className="flex h-[100dvh] bg-white dark:bg-gray-950 overflow-hidden font-sans antialiased text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* 💻 ДЕСКТОПНЫЙ САЙДБАР */}
      <aside 
        className={`hidden md:flex bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col justify-between z-20 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-[80px]' : 'w-[80px] lg:w-[260px]'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          
          <div 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`h-16 flex items-center mx-3 mb-4 mt-2 cursor-pointer hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-2xl transition-all duration-200 ${
              isSidebarCollapsed ? 'justify-center' : 'justify-center lg:justify-start lg:px-3'
            }`}
            title={isSidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
          >
            <div className="w-10 h-10 bg-gray-900 dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-transform hover:scale-105">
              <Hexagon size={22} className="text-white" strokeWidth={2.5} />
            </div>
            <span 
              className={`ml-3 font-black text-xl tracking-tight text-gray-900 dark:text-white truncate transition-all duration-300 ${
                isSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 hidden lg:block'
              }`}
            >
              Aura
            </span>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar pb-4">
            {availableItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center py-3 rounded-2xl transition-all duration-200 group ${
                    isSidebarCollapsed ? 'justify-center px-0' : 'justify-center lg:justify-start lg:px-4'
                  } ${
                    isActive
                      ? 'bg-gray-900 dark:bg-gray-800 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <div className={`flex w-full items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-center lg:justify-start'}`}>
                    <div className={`${isActive ? 'scale-105' : 'group-hover:scale-110'} transition-transform shrink-0`}>
                      {item.icon}
                    </div>
                    <span 
                      className={`ml-3.5 text-[15px] font-semibold tracking-wide truncate transition-all duration-300 ${
                        isSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 hidden lg:block'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
            {user && (
              <div className={`flex items-center mb-2 p-2 rounded-2xl transition-all ${
                isSidebarCollapsed ? 'justify-center' : 'justify-center lg:justify-start lg:px-3 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 cursor-pointer'
              }`}>
                <img 
                  src={profile?.avatar || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || user.displayName || 'U')}&background=random`} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0 hover:scale-105 transition-transform" 
                />
                <div 
                  className={`flex-1 min-w-0 ml-3 transition-all duration-300 ${
                    isSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 hidden lg:block'
                  }`}
                >
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {profile?.name || user.displayName || 'Пользователь'}
                  </p>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                    {profile?.type === 'business' ? 'Бизнес-аккаунт' : 'Online'}
                  </p>
                </div>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className={`w-full flex items-center py-3 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-colors group ${
                isSidebarCollapsed ? 'justify-center px-0' : 'justify-center lg:justify-start lg:px-4'
              }`}
              title="Выйти"
            >
              <LogOut size={22} className={`${!isSidebarCollapsed && 'lg:mr-3'} shrink-0 group-hover:scale-110 transition-transform`} />
              <span 
                className={`text-[15px] font-semibold truncate transition-all duration-300 ${
                  isSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 hidden lg:block'
                }`}
              >
                Выйти
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* 📱 ОСНОВНОЙ КОНТЕЙНЕР РЕНДЕРА СТРАНИЦ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-[60px] md:pb-0 bg-white dark:bg-gray-950 transition-colors duration-300 z-10">
        <Suspense fallback={<GlobalLoader />}>
          {children}
        </Suspense>
      </main>

      {/* 📱 ШТОРКА (БОЛЬШЕ ПУНКТов) ДЛЯ МОБИЛОК */}
      {isMoreMenuOpen && isMobileOverflow && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-fade-in flex flex-col justify-end" onClick={() => setIsMoreMenuOpen(false)}>
          <div 
            className="bg-white dark:bg-gray-900 rounded-t-[32px] p-6 pb-[90px] shadow-2xl animate-slide-up relative"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setIsMoreMenuOpen(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <X size={18} />
            </button>
            <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-2">Все сервисы</h3>
            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
              {mobileMoreItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isActive ? 'bg-gray-900 dark:bg-gray-800 text-white shadow-md scale-105' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:scale-105 group-hover:bg-gray-100 dark:group-hover:bg-gray-700'}`}>
                      {item.icon}
                    </div>
                    <span className={`text-[10px] font-bold text-center leading-tight w-full truncate px-1 transition-colors ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 📱 МОБИЛЬНОЕ НИЖНЕЕ МЕНЮ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[65px] pb-safe bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border-t border-gray-200/80 dark:border-gray-800/80 z-50 flex items-center justify-around px-2 transition-colors duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              className="flex flex-col items-center justify-center w-full h-full relative group"
            >
              <div className={`transition-all duration-300 ${isActive ? 'text-gray-900 dark:text-white scale-110 -translate-y-1' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                {item.icon}
              </div>
              <span className={`absolute bottom-1.5 text-[9px] font-bold transition-all duration-300 ${isActive ? 'text-gray-900 dark:text-white opacity-100' : 'text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {isMobileOverflow && (
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full relative group"
          >
            <div className={`transition-all duration-300 ${isMoreMenuOpen ? 'text-gray-900 dark:text-white scale-110 -translate-y-1' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
              <Menu size={24} strokeWidth={2} />
            </div>
            <span className={`absolute bottom-1.5 text-[9px] font-bold transition-all duration-300 ${isMoreMenuOpen ? 'text-gray-900 dark:text-white opacity-100' : 'text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100'}`}>
              Меню
            </span>
          </button>
        )}
      </nav>

    </div>
  );
};

// ==========================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ==========================================
export default function App() {
  const { user, setUser, isLoading, setLoading } = useAuthStore();

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
        
        {/* 🌟 ГЛОБАЛЬНЫЕ УВЕДОМЛЕНИЯ */}
        {user && <GlobalNotifications />}

        <Routes>
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/chats" />} />
          
          <Route path="/" element={<Navigate to="/chats" replace />} />
          <Route path="/chats" element={<RequireAuth><MainLayout><ChatsPage /></MainLayout></RequireAuth>} />
          <Route path="/market" element={<RequireAuth><MainLayout><MarketPage /></MainLayout></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><MainLayout><ProfilePage /></MainLayout></RequireAuth>} />
          
          {/* РОУТ МАГАЗИНА: ТЕПЕРЬ ОН ДОСТУПЕН ДЛЯ ВСЕХ (БЕЗ RequireAuth) */}
          <Route path="/shop/:id" element={<MainLayout><ShopPage /></MainLayout>} />
          
          <Route path="/dating" element={<RequireAuth><MainLayout><DatingPage /></MainLayout></RequireAuth>} />
          <Route path="/crm" element={<RequireAuth><MainLayout><CRMPage /></MainLayout></RequireAuth>} />
          <Route path="/productivity" element={<RequireAuth><MainLayout><ProductivityLayout /></MainLayout></RequireAuth>} />
          
          <Route path="*" element={<Navigate to="/chats" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
