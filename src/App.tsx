import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { useAuthStore } from './store/useAuthStore';
import LoginPage from './pages/LoginPage';
import { MessageSquare, Globe, Store, User, LogOut, Search } from 'lucide-react';

// Компонент боковой панели (Сайдбар)
const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuthStore();

  const navItems = [
    { path: '/', icon: <MessageSquare size={24} />, label: 'Чаты' },
    { path: '/feed', icon: <Globe size={24} />, label: 'Радар' },
    { path: '/market', icon: <Store size={24} />, label: 'Маркет' },
    { path: '/profile', icon: <User size={24} />, label: 'Профиль' },
  ];

  return (
    <div className="w-20 md:w-64 h-screen bg-white border-r border-gray-100 flex flex-col items-center md:items-stretch py-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
      <div className="md:px-6 mb-8 text-center md:text-left">
        <h1 className="text-2xl font-black text-brand hidden md:block tracking-tight">Auragram</h1>
        <div className="w-10 h-10 bg-brand rounded-xl md:hidden flex items-center justify-center text-white font-bold text-xl">A</div>
      </div>

      <nav className="flex-1 flex flex-col gap-2 px-2 md:px-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center justify-center md:justify-start gap-4 p-3 md:px-4 rounded-2xl transition-all duration-300 ${
              location.pathname === item.path
                ? 'bg-brand/10 text-brand font-semibold shadow-sm'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            {item.icon}
            <span className="hidden md:block">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto px-2 md:px-4 flex flex-col gap-4">
        <div className="hidden md:flex items-center gap-3 px-2">
          <img src={user?.photoURL || 'https://via.placeholder.com/40'} alt="avatar" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.displayName}</p>
            <p className="text-xs text-gray-400 truncate">Личный профиль</p>
          </div>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="flex items-center justify-center md:justify-start gap-4 p-3 md:px-4 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-colors"
        >
          <LogOut size={24} />
          <span className="hidden md:block">Выйти</span>
        </button>
      </div>
    </div>
  );
};

// Главный компонент (Лейаут приложения)
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar />
      <main className="flex-1 relative flex flex-col">
        {children}
      </main>
    </div>
  );
};

// Временные заглушки для новых страниц
const ChatsPage = () => (
  <div className="flex-1 flex items-center justify-center flex-col gap-4 text-gray-400">
    <MessageSquare size={48} className="opacity-20" />
    <h2 className="text-xl font-medium">Выберите чат или начните новый</h2>
  </div>
);

const FeedPage = () => (
  <div className="flex-1 flex flex-col">
    <div className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center px-8 z-10 sticky top-0">
      <h2 className="text-lg font-bold text-gray-800">Общая лента (Радар)</h2>
    </div>
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-w-md w-full text-center">
        <Globe size={40} className="text-brand mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Здесь будет Радар</h3>
        <p className="text-gray-500 text-sm">Публикуйте идеи, товары или запросы. Вас услышит весь Auragram. (Осталось 2 поста на сегодня).</p>
      </div>
    </div>
  </div>
);

const App = () => {
  const { user, isLoading, setUser, setLoading } = useAuthStore();

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
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        
        {/* Защищенные роуты внутри MainLayout */}
        <Route path="/" element={user ? <MainLayout><ChatsPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/feed" element={user ? <MainLayout><FeedPage /></MainLayout> : <Navigate to="/login" />} />
        <Route path="/market" element={user ? <MainLayout><div className="p-8">Маркетплейс в разработке...</div></MainLayout> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <MainLayout><div className="p-8">Настройки профиля (Бизнес / Личный)...</div></MainLayout> : <Navigate to="/login" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
