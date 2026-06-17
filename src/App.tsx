import { useEffect, useState, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { useAuthStore } from './store/useAuthStore';

import { 
  MessageCircle, Store, Settings, Hexagon,
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
// ГЛОБАЛЬНЫЙ ЗАГРУЗЧИК (COSMIC STYLE)
// ==========================================
const GlobalLoader = () => (
  <div className="min-h-[100dvh] flex items-center justify-center bg-[#F5F5F7] dark:bg-[#030712] w-full transition-colors duration-500 overflow-hidden relative">
    {/* Глубокое космическое свечение */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] md:w-[20vw] md:h-[20vw] bg-blue-500/10 rounded-full blur-[80px] animate-pulse duration-1000" />
    
    <div className="relative z-10 flex flex-col items-center">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <div className="absolute inset-0 bg-blue-500/20 dark:bg-white/10 rounded-full animate-ping opacity-50 duration-1000"></div>
        <Hexagon size={48} className="text-gray-900 dark:text-white relative z-10 animate-pulse" strokeWidth={1.5} />
      </div>
      <p className="mt-6 text-[10px] uppercase tracking-[0.4em] text-gray-400 dark:text-gray-500 font-black animate-pulse">
        Синхронизация
      </p>
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

  // Если пользователя нет (гостевой режим для магазина), не рендерим меню
  if (!user) {
    return (
      <div className="flex h-[100dvh] bg-[#F5F5F7] dark:bg-[#030712] overflow-hidden font-sans antialiased text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative transition-colors duration-300 z-10">
          <Suspense fallback={<GlobalLoader />}>
            {children}
          </Suspense>
        </main>
      </div>
    );
  }

  const availableItems = [];
  
  if (profile?.goals?.includes('dating')) {
    availableItems.push({ id: 'dating', path: '/dating', icon: <Heart size={22} strokeWidth={2} />, label: 'Знакомства' });
  }
  
  availableItems.push({ id: 'chats', path: '/chats', icon: <MessageCircle size={22} strokeWidth={2} />, label: 'Чаты' });
  availableItems.push({ id: 'market', path: '/market', icon: <Store size={22} strokeWidth={2} />, label: 'Маркет' });
  
  if (profile?.type === 'business') {
    const shopLink = profile.customUrl ? profile.customUrl : user.uid;
    availableItems.push({ id: 'myshop', path: `/shop/${shopLink}`, icon: <ShoppingBag size={22} strokeWidth={2} />, label: 'Мой магазин' });
    availableItems.push({ id: 'crm', path: '/crm', icon: <LineChart size={22} strokeWidth={2} />, label: 'Smart CRM' });
  }

  if (profile?.goals?.includes('productivity')) {
    availableItems.push({ id: 'productivity', path: '/productivity', icon: <LayoutDashboard size={22} strokeWidth={2} />, label: 'Продуктивность' });
  }

  availableItems.push({ id: 'profile', path: '/profile', icon: <Settings size={22} strokeWidth={2} />, label: 'Настройки' });

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
    <div className="flex h-[100dvh] bg-[#F5F5F7] dark:bg-[#030712] overflow-hidden font-sans antialiased text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* 💻 ДЕСКТОПНЫЙ САЙДБАР (GLASSMORPHISM) */}
      <aside 
        className={`hidden md:flex bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-2xl border-r border-gray-200/50 dark:border-white/5 flex-col justify-between z-30 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          isSidebarCollapsed ? 'w-[80px]' : 'w-[80px] lg:w-[260px]'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          
          <div 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`h-16 flex items-center mx-3 mb-6 mt-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 rounded-[20px] transition-all duration-200 ${
              isSidebarCollapsed ? 'justify-center' : 'justify-center lg:justify-start lg:px-4'
            }`}
            title={isSidebarCollapsed ? "Развернуть меню" : "Свернуть меню"}
          >
            <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-[14px] flex items-center justify-center shadow-lg shadow-black/10 dark:shadow-white/10 shrink-0 transition-transform hover:scale-105">
              <Hexagon size={22} className="text-white dark:text-black" strokeWidth={2.5} />
            </div>
            <span 
              className={`ml-3.5 font-black text-xl tracking-tight text-gray-900 dark:text-white truncate transition-all duration-300 ${
                isSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 hidden lg:block'
              }`}
            >
              Aura
            </span>
          </div>

          <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto custom-scrollbar pb-4">
            {availableItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center py-3.5 rounded-[18px] transition-all duration-300 group ${
                    isSidebarCollapsed ? 'justify-center px-0' : 'justify-center lg:justify-start lg:px-4'
                  } ${
                    isActive
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/10'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <div className={`flex w-full items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-center lg:justify-start'}`}>
                    <div className={`${isActive ? 'scale-105' : 'group-hover:scale-110'} transition-transform shrink-0`}>
                      {item.icon}
                    </div>
                    <span 
                      className={`ml-3.5 text-[14px] font-bold tracking-wide truncate transition-all duration-300 ${
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

          {/* Профиль внизу (Кликабельный) */}
          <div className="p-3 border-t border-gray-200/50 dark:border-white/5 shrink-0">
            {user && (
              <Link 
                to="/profile"
                className={`flex items-center p-2 rounded-[20px] transition-all duration-300 ${
                  isSidebarCollapsed ? 'justify-center' : 'justify-center lg:justify-start lg:px-3 hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer'
                }`}
                title="Настройки профиля"
              >
                <img 
                  src={profile?.avatar || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || user.displayName || 'U')}&background=random`} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-[14px] object-cover border border-gray-200 dark:border-gray-800 shrink-0 hover:scale-105 transition-transform shadow-sm" 
                />
                <div 
                  className={`flex-1 min-w-0 ml-3 transition-all duration-300 ${
                    isSidebarCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 hidden lg:block'
                  }`}
                >
                  <p className="text-[14px] font-bold text-gray-900 dark:text-white truncate">
                    {profile?.name || user.displayName || 'Пользователь'}
                  </p>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate uppercase tracking-widest mt-0.5">
                    {profile?.type === 'business' ? 'Бизнес' : 'Online'}
                  </p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* 📱 ОСНОВНОЙ КОНТЕЙНЕР РЕНДЕРА СТРАНИЦ */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-[60px] md:pb-0 transition-colors duration-300 z-10">
        <Suspense fallback={<GlobalLoader />}>
          {children}
        </Suspense>
      </main>

      {/* 📱 ШТОРКА (БОЛЬШЕ ПУНКТов) ДЛЯ МОБИЛОК */}
      {isMoreMenuOpen && isMobileOverflow && (
        <div className="md:hidden fixed inset-0 z-[60] bg-gray-950/60 backdrop-blur-sm animate-fade-in flex flex-col justify-end" onClick={() => setIsMoreMenuOpen(false)}>
          <div 
            className="bg-white/90 dark:bg-[#0A0A0B]/90 backdrop-blur-2xl rounded-t-[40px] p-6 pb-[100px] shadow-2xl animate-slide-up relative border-t border-white/20 dark:border-white/5"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setIsMoreMenuOpen(false)} className="absolute top-4 right-4 w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-6 ml-2">Все сервисы</h3>
            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
              {mobileMoreItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="flex flex-col items-center gap-2.5 group"
                  >
                    <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg scale-105' : 'bg-gray-50 dark:bg-[#151518] text-gray-600 dark:text-gray-400 group-hover:scale-105'}`}>
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

      {/* 📱 МОБИЛЬНОЕ НИЖНЕЕ МЕНЮ (GLASSMORPHISM) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[70px] pb-safe bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-2xl border-t border-gray-200/50 dark:border-white/5 z-50 flex items-center justify-around px-2 transition-colors duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              className="flex flex-col items-center justify-center w-full h-full relative group"
            >
              <div className={`transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isActive ? 'text-gray-900 dark:text-white scale-110 -translate-y-2' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                {item.icon}
              </div>
              <span className={`absolute bottom-2 text-[10px] font-bold transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isActive ? 'text-gray-900 dark:text-white opacity-100 transform translate-y-0' : 'text-gray-400 dark:text-gray-500 opacity-0 transform translate-y-2'}`}>
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
            <div className={`transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isMoreMenuOpen ? 'text-gray-900 dark:text-white scale-110 -translate-y-2' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
              <Menu size={24} strokeWidth={2.5} />
            </div>
            <span className={`absolute bottom-2 text-[10px] font-bold transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isMoreMenuOpen ? 'text-gray-900 dark:text-white opacity-100 transform translate-y-0' : 'text-gray-400 dark:text-gray-500 opacity-0 transform translate-y-2'}`}>
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
          
          {/* РОУТ МАГАЗИНА: ДОСТУПЕН ДЛЯ ВСЕХ */}
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
