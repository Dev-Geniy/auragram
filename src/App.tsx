import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { useAuthStore } from './store/useAuthStore';
import LoginPage from './pages/LoginPage';
import { 
  MessageSquare, Globe, Store, User, LogOut, 
  Briefcase, Heart, Users, Sparkles, ChevronRight, ArrowLeft, Building, UserCheck, Plus, Share2
} from 'lucide-react';

// ==========================================
// ИМИТАЦИЯ БАЗЫ ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ (MOCK DATA)
// ==========================================
const MOCK_USERS = [
  { id: '1', name: 'Александр Котов', type: 'personal', readyFor: 'business', role: 'Senior React Разработчик', skills: ['React', 'TypeScript', 'Node.js'], gender: 'male', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { id: '2', name: 'Digital Agency Apex', type: 'business', readyFor: 'business', role: 'Ищем Маркетолога & Сейлза', skills: ['Продажи', 'B2B', 'Маркетинг'], gender: 'none', avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150' },
  { id: '3', name: 'Мария Днепрова', type: 'personal', readyFor: 'dating', role: '24 года, UI/UX Дизайнер', skills: ['Дизайн', 'Aesthetics'], gender: 'female', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { id: '4', name: 'Дмитрий Сейлз', type: 'personal', readyFor: 'business', role: 'Построение отделов продаж под ключ', skills: ['Продажи', 'B2B', 'Автоматизация'], gender: 'male', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { id: '5', name: 'Елена Руденко', type: 'personal', readyFor: 'dating', role: '26 лет, Архитектор', skills: ['Minimalism', 'Art'], gender: 'female', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150' },
  { id: '6', name: 'Игорь Власов', type: 'personal', readyFor: 'friends', role: 'Катаюсь на веле, учу Python', skills: ['Спорт', 'Код', 'Велосипед'], gender: 'male', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  { id: '7', name: 'Анна Кравченко', type: 'personal', readyFor: 'friends', role: 'Ищу компанию для походов в горы', skills: ['Путешествия', 'Горы', 'Фотография'], gender: 'female', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150' },
  { id: '8', name: 'Tech Solutions LLC', type: 'business', readyFor: 'business', role: 'Ищем Web-технолога', skills: ['React', 'HTML', 'Tailwind'], gender: 'none', avatar: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=150' }
];

// Имитация постов в общей ленте
const MOCK_POSTS = [
  { id: 'p1', author: 'Дмитрий Сейлз', text: 'Запустили новую ИИ-автоматизацию для обработки лидов. Конверсия выросла на 34%! Кому интересно — пишите в ЛС, поделюсь скриптом.', time: '2 часа назад' },
  { id: 'p2', author: 'Мария Днепрова', text: 'Закончила премиальный концепт интерфейса для экосистемы мессенджера. Минимализм, футуризм и легкий стеклянный эффект. Оцените в моем профиле!', time: '5 часов назад' }
];

// ==========================================
// ОСНОВНОЙ ПРОВИДЕЦ И СТРУКТУРА ПРИЛОЖЕНИЯ
// ==========================================
const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuthStore();

  const navItems = [
    { path: '/', icon: <MessageSquare size={22} />, label: 'Чаты' },
    { path: '/feed', icon: <Globe size={22} />, label: 'Радар (Лента)' },
    { path: '/market', icon: <Store size={22} />, label: 'Маркет' },
    { path: '/profile', icon: <User size={22} />, label: 'Профиль' },
  ];

  return (
    <div className="w-20 md:w-64 h-screen bg-white border-r border-gray-100 flex flex-col items-center md:items-stretch py-6 shadow-[4px_0_24px_rgba(0,0,0,0.01)] z-10 select-none">
      <div className="md:px-6 mb-8 text-center md:text-left">
        <h1 className="text-2xl font-black text-brand hidden md:flex items-center gap-2 tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Auragram
        </h1>
        <div className="w-10 h-10 bg-brand rounded-xl md:hidden flex items-center justify-center text-white font-bold text-xl shadow-md shadow-brand/20">A</div>
      </div>

      <nav className="flex-1 flex flex-col gap-1 px-2 md:px-4">
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
            <span className="hidden md:block text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto px-2 md:px-4 flex flex-col gap-4">
        <div className="hidden md:flex items-center gap-3 px-2 py-2 bg-gray-50 rounded-2xl">
          <img src={user?.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'} alt="avatar" className="w-9 h-9 rounded-full border border-gray-200" />
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-gray-900 truncate">{user?.displayName || 'Пользователь'}</p>
            <p className="text-[10px] text-gray-400 tracking-wide uppercase font-semibold">Active Sync</p>
          </div>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="flex items-center justify-center md:justify-start gap-4 p-3 md:px-4 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-colors"
        >
          <LogOut size={22} />
          <span className="hidden md:block text-sm font-medium">Выйти</span>
        </button>
      </div>
    </div>
  );
};

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden antialiased">
      <Sidebar />
      <main className="flex-1 relative flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

// ==========================================
// СТРАНИЦА: РАДАР + КИЛЛЕР-ФИЧА AURASYNC
// ==========================================
const FeedPage = ({ currentSync, userGender }: { currentSync: string, userGender: string }) => {
  const [isExploreMode, setIsExploreMode] = useState(false);

  // Алгоритм умной фильтрации в зависимости от выбранного режима в настройках
  const getFilteredUsers = () => {
    return MOCK_USERS.filter(u => {
      if (currentSync === 'off') return false;
      if (currentSync === 'business') {
        return u.readyFor === 'business';
      }
      if (currentSync === 'dating') {
        // Показываем только противоположный пол для дейтинга
        const targetGender = userGender === 'male' ? 'female' : 'male';
        return u.readyFor === 'dating' && u.gender === targetGender;
      }
      if (currentSync === 'friends') {
        return u.readyFor === 'friends';
      }
      return false;
    });
  };

  const matchedUsers = getFilteredUsers();

  // Разделение на два ряда для верхнего блока
  const row1 = matchedUsers.slice(0, Math.ceil(matchedUsers.length / 2));
  const row2 = matchedUsers.slice(Math.ceil(matchedUsers.length / 2));

  const getSyncTitle = () => {
    if (currentSync === 'business') return 'Деловой Нетворкинг';
    if (currentSync === 'dating') return 'Романтические Знакомства';
    if (currentSync === 'friends') return 'Поиск Друзей';
    return 'Синхронизация выключена';
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Шапка */}
      <div className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {isExploreMode && (
            <button onClick={() => setIsExploreMode(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="text-lg font-bold text-gray-800">
            {isExploreMode ? `Все анкеты: ${getSyncTitle()}` : 'Радар общего эфира'}
          </h2>
        </div>
        <div className="flex items-center gap-2 bg-brand/5 px-3 py-1.5 rounded-xl border border-brand/10">
          <Sparkles size={16} className="text-brand animate-pulse" />
          <span className="text-xs font-semibold text-brand-dark">AuraSync: {getSyncTitle()}</span>
        </div>
      </div>

      {/* ЕСЛИ ВКЛЮЧЕН РЕЖИМ ПОЛНОГО ЭКРАНА "БОЛЬШЕ" */}
      {isExploreMode ? (
        <div className="p-6 flex-1 bg-gradient-to-b from-white to-[#F8FAFC]">
          {matchedUsers.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p>В этой категории пока нет новых анкет. Включите другой режим в Профиле!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {matchedUsers.map((u) => (
                <div key={u.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] flex flex-col hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)] transition-all duration-300 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="relative">
                      <img src={u.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
                      u.type === 'business' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      {u.type === 'business' ? 'Company' : 'Pro'}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1 group-hover:text-brand transition-colors">{u.name}</h4>
                  <p className="text-xs text-gray-500 font-medium mb-3 min-h-[32px]">{u.role}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-4 mt-auto">
                    {u.skills.map((s, idx) => (
                      <span key={idx} className="bg-gray-50 text-gray-500 text-[10px] px-2 py-0.5 rounded-md font-medium">#{s}</span>
                    ))}
                  </div>

                  <button className="w-full py-2.5 bg-gray-900 hover:bg-brand text-white rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 shadow-sm shadow-gray-900/10 hover:shadow-brand/20">
                    Открыть диалог
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* СТАНДАРТНАЯ ЛЕНТА С ВЕРХНИМ ДВУХРЯДНЫМ БЛОКОМ MATCHING */
        <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
          
          {/* ФИЧА: БЛОК АУРАСИНК (ТОЛЬКО ЕСЛИ ОН ВКЛЮЧЕН) */}
          {currentSync !== 'off' && (
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-brand/10 rounded-xl text-brand">
                    {currentSync === 'business' && <Briefcase size={18} />}
                    {currentSync === 'dating' && <Heart size={18} />}
                    {currentSync === 'friends' && <Users size={18} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Радар совпадений</h3>
                    <p className="text-[11px] text-gray-400">Подобранные люди на базе ваших текущих целей</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsExploreMode(true)}
                  className="text-xs font-bold text-brand hover:text-brand-dark flex items-center gap-1 bg-brand/5 hover:bg-brand/10 px-3 py-1.5 rounded-xl transition-all"
                >
                  Больше <ChevronRight size={14} />
                </button>
              </div>

              {matchedUsers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Нет точных совпадений онлайн. Измените параметры в Профиле.</p>
              ) : (
                <div className="space-y-3 overflow-hidden">
                  {/* Ряд 1 */}
                  <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none snap-x">
                    {row1.map(u => (
                      <div key={u.id} className="flex items-center gap-3 bg-gray-50/60 border border-gray-100/50 rounded-2xl p-2 min-w-[200px] max-w-[220px] shrink-0 snap-start hover:bg-white hover:border-gray-200 transition-all cursor-pointer">
                        <img src={u.avatar} alt="" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-gray-900 truncate">{u.name}</p>
                          <p className="text-[10px] text-gray-400 truncate font-medium">{u.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Ряд 2 */}
                  <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none snap-x">
                    {row2.map(u => (
                      <div key={u.id} className="flex items-center gap-3 bg-gray-50/60 border border-gray-100/50 rounded-2xl p-2 min-w-[200px] max-w-[220px] shrink-0 snap-start hover:bg-white hover:border-gray-200 transition-all cursor-pointer">
                        <img src={u.avatar} alt="" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-gray-900 truncate">{u.name}</p>
                          <p className="text-[10px] text-gray-400 truncate font-medium">{u.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ИНФО-ПАРАДИГМА: ПРАВИЛО 2 ПОСТОВ */}
          <div className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-3xl p-5 text-white flex items-center justify-between shadow-xl shadow-gray-900/10">
            <div className="space-y-1 max-w-lg">
              <h4 className="text-sm font-bold tracking-wide">Ваш личный Громкоговоритель</h4>
              <p className="text-xs text-gray-300 leading-relaxed">Вы можете сделать только 2 публикации в общий глобальный эфир за сутки. Пишите емко, ценно и по делу — ваш пост увидят абсолютно все участники платформы.</p>
            </div>
            <button className="bg-white hover:bg-gray-100 text-gray-900 p-3 rounded-2xl shadow-md transition-colors shrink-0 ml-4">
              <Plus size={20} />
            </button>
          </div>

          {/* ГЛОБАЛЬНАЯ ЛЕНТА */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Глобальный поток новостей</h3>
            {MOCK_POSTS.map(post => (
              <div key={post.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">
                      {post.author[0]}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-gray-900">{post.author}</h5>
                      <p className="text-[10px] text-gray-400">{post.time}</p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg">
                    <Share2 size={16} />
                  </button>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">{post.text}</p>
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
};

// ==========================================
// СТРАНИЦА НАСТРОЕК: ЕДИНЫЙ ЦЕНТР УПРАВЛЕНИЯ
// ==========================================
const ProfilePage = ({ currentSync, setSync, gender, setGender }: any) => {
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');

  return (
    <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Интеллектуальный профиль</h2>
          <p className="text-xs text-gray-400">Настройте фокус вашей экосистемы Auragram</p>
        </div>

        {/* Переключатель типа аккаунта (CEO / PRO) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Тип Вашего Аккаунта</label>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => { setAccountType('personal'); if(currentSync === 'business') setSync('off'); }}
              className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                accountType === 'personal' ? 'border-brand bg-brand/5 ring-1 ring-brand text-brand' : 'border-gray-100 bg-gray-50/50 text-gray-500'
              }`}
            >
              <UserCheck size={20} />
              <div>
                <p className="text-xs font-bold text-gray-900">Личный (Personal)</p>
                <p className="text-[10px] text-gray-400">Для общения, дружбы и поиска работы</p>
              </div>
            </button>
            <button 
              onClick={() => setAccountType('business')}
              className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                accountType === 'business' ? 'border-amber-500 bg-amber-50/30 ring-1 ring-amber-500 text-amber-600' : 'border-gray-100 bg-gray-50/50 text-gray-500'
              }`}
            >
              <Building size={20} />
              <div>
                <p className="text-xs font-bold text-gray-900">Бизнес (Business)</p>
                <p className="text-[10px] text-gray-400">Магазин, витрина, вакансии и CRM</p>
              </div>
            </button>
          </div>
        </div>

        {/* Выбор пола для точного дейтинг-алгоритма */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ваш пол (для умного дейтинга)</label>
          <div className="flex gap-2">
            {['male', 'female'].map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  gender === g ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {g === 'male' ? 'Мужской' : 'Женский'}
              </button>
            ))}
          </div>
        </div>

        {/* ГЛАВНАЯ КИЛЛЕР-ФИЧА: ТУМБЛЕР ЦЕЛЕЙ AURASYNC */}
        <div className="space-y-3 pt-4 border-t border-gray-50">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
            🔥 Текущий фокус радара (В чём вы заинтересованы прямо сейчас?):
          </label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <button
              onClick={() => setSync('business')}
              className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                currentSync === 'business' ? 'bg-brand text-white border-brand shadow-md shadow-brand/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Briefcase size={18} />
              <span className="text-[11px] font-bold">Деловые связи</span>
              <span className="text-[9px] opacity-75">{accountType === 'personal' ? 'Ищу работу' : 'Ищу кадры'}</span>
            </button>

            <button
              onClick={() => setSync('dating')}
              className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                currentSync === 'dating' ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Heart size={18} />
              <span className="text-[11px] font-bold">Свидания</span>
              <span className="text-[9px] opacity-75">Встретить любовь</span>
            </button>

            <button
              onClick={() => setSync('friends')}
              className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                currentSync === 'friends' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Users size={18} />
              <span className="text-[11px] font-bold">Найти друзей</span>
              <span className="text-[9px] opacity-75">Единомышленники</span>
            </button>

            <button
              onClick={() => setSync('off')}
              className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                currentSync === 'off' ? 'bg-gray-500 text-white border-gray-500 shadow-md shadow-gray-500/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Sparkles size={18} />
              <span className="text-[11px] font-bold">Выключить</span>
              <span className="text-[9px] opacity-75">Обычная лента</span>
            </button>
          </div>
        </div>
      </div>

      {/* ФУНКЦИОНАЛЬНЫЙ БЛОК ДЛЯ БИЗНЕСА */}
      {accountType === 'business' && (
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200 rounded-3xl p-6 space-y-4 animate-fade-in">
          <div>
            <span className="bg-amber-100 text-amber-800 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md font-bold">Business Tool</span>
            <h3 className="text-base font-bold text-gray-900 mt-1">Витрина товаров и Микро-лендинг</h3>
            <p className="text-xs text-gray-500">Ваш профиль автоматически превращается в торговую точку для личных аккаунтов.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-amber-100 text-center cursor-pointer hover:border-amber-400 transition-colors">
              <Store className="mx-auto text-amber-500 mb-2" size={20} />
              <p className="text-xs font-bold text-gray-800">Управлять товарами</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Добавить услуги или прайс</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-amber-100 text-center cursor-pointer hover:border-amber-400 transition-colors">
              <Briefcase className="mx-auto text-amber-500 mb-2" size={20} />
              <p className="text-xs font-bold text-gray-800">Разместить вакансию</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Для автоматического подбора соискателей</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// КОРНЕВОЙ НАВИГАЦИОННЫЙ ЦЕНТР
// ==========================================
const App = () => {
  const { user, isLoading, setUser, setLoading } = useAuthStore();
  
  // Глобальное реактивное состояние для нашей фичи AuraSync
  const [currentSync, setSync] = useState<string>('business'); 
  const [gender, setGender] = useState<string>('male');

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
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        
        <Route path="/" element={user ? <MainLayout><div className="p-8 text-gray-400">Список личных диалогов (В разработке)...</div></MainLayout> : <Navigate to="/login" />} />
        
        {/* Главная интерактивная лента-радар */}
        <Route path="/feed" element={user ? <MainLayout><FeedPage currentSync={currentSync} userGender={gender} /></MainLayout> : <Navigate to="/login" />} />
        
        <Route path="/market" element={user ? <MainLayout><div className="p-8 text-gray-400">Маркетплейс, b2b-каталог и витрины услуг...</div></MainLayout> : <Navigate to="/login" />} />
        
        {/* Профиль, где переключаются алгоритмы */}
        <Route path="/profile" element={user ? <MainLayout><ProfilePage currentSync={currentSync} setSync={setSync} gender={gender} setGender={setGender} /></MainLayout> : <Navigate to="/login" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
