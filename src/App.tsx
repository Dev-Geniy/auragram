import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './services/firebase';
import { useAuthStore } from './store/useAuthStore';

// Импорт полноценных страниц из папки pages
import LoginPage from './pages/LoginPage';
import ChatsPage from './pages/ChatsPage';
import FeedPage from './pages/FeedPage';
import MarketPage from './pages/MarketPage';
import ProfilePage from './pages/ProfilePage';

import { 
  MessageSquare, Globe, Store, User, LogOut, Sparkles
} from 'lucide-react';

// ==========================================
// ОСНОВНОЙ МАКЕТ ПРИЛОЖЕНИЯ (ОБОЛОЧКА С СЕЙДБАРОМ)
// ==========================================
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuthStore();

  const menuItems = [
    { path: '/', icon: <MessageSquare size={22} />, label: 'Чаты' },
    { path: '/feed', icon: <Globe size={22} />, label: 'Радар (AuraSync)' },
    { path: '/market', icon: <Store size={22} />, label: 'Маркетплейс' },
    { path: '/profile', icon: <User size={22} />, label: 'Профиль' },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Ошибка при выходе из системы:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans antialiased text-gray-900">
      {/* Боковая панель навигации */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between z-20 shadow-sm">
        <div>
          {/* Брендинг / Логотип */}
          <div className="h-20 flex items-center px-6 border-b border-gray-50 gap-2.5">
            <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand/20">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-brand to-brand-dark bg-clip-text text-transparent">
              Auragram
            </span>
          </div>

          {/* Навигационное меню */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 group ${
                    isActive
                      ? 'bg-brand/5 text-brand shadow-sm shadow-brand/5'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className={`transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-brand' : 'text-gray-400 group-hover:text-gray-600'}`}>
                    {item.icon}
                  </div>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Профиль авторизованного пользователя и кнопка Выхода */}
        <div className="p-4 border-t border-gray-50 bg-gray-50/50">
          {user && (
            <div className="flex items-center gap-3 px-2 py-1.5 mb-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-9 h-9 rounded-xl object-cover border border-white shadow-sm" />
              ) : (
                <div className="w-9 h-9 bg-brand/10 text-brand font-bold rounded-xl flex items-center justify-center text-sm">
                  {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{user.displayName || 'Пользователь'}</p>
                <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-200 group"
          >
            <LogOut size={20} className="text-red-400 group-hover:text-red-500 transition-colors" />
            <span>Выйти из аккаунта</span>
          </button>
        </div>
      </aside>

      {/* Основной контейнер для страниц */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
};

// ==========================================
// ГЛАВНЫЙ ИНИЦИАЛИЗИРУЮЩИЙ КОМПОНЕНТ
// ==========================================
export default function App() {
  const { user, setUser, isLoading, setLoading } = useAuthStore();
  
  // Глобальные состояния фильтрации для алгоритмов поиска
  const [currentSync, setSync] = useState<'all' | 'business' | 'personal'>('all');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');

  // Слушатель состояния авторизации в реальном времени (Firebase Auth)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        {/* Публичный роут */}
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        
        {/* Защищенные роуты (доступны только авторизованным пользователям) */}
        <Route path="/" element={user ? <MainLayout><ChatsPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/feed" element={user ? <MainLayout><FeedPage currentSync={currentSync} userGender={gender} /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/market" element={user ? <MainLayout><MarketPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <MainLayout><ProfilePage currentSync={currentSync} setSync={setSync} gender={gender} setGender={setGender} /></MainLayout> : <Navigate to="/login" />} />
        
        {/* Автоматический редирект при вводе несуществующего пути */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
