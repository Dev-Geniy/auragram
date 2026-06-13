import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { Hexagon, ArrowRight, ShieldCheck, Zap, Globe } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Извлекаем сохраненный URL. Если его нет — по умолчанию ведем в ленту '/posts'
  const from = location.state?.from?.pathname + (location.state?.from?.search || '') || '/posts';

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
      
      // ИДЕАЛЬНЫЙ РЕДИРЕКТ: 
      // Отправляем пользователя туда, куда он изначально хотел попасть
      navigate(from, { replace: true });
      
    } catch (err: any) {
      console.error('Ошибка авторизации:', err);
      setError('Не удалось войти. Проверьте подключение и попробуйте еще раз.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white overflow-hidden select-none font-sans">
      
      {/* ЛЕВАЯ ЧАСТЬ - БРЕНДИНГ И УТП (Скрыто на мобильных) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-950 relative flex-col justify-between p-14 overflow-hidden z-0">
        {/* Абстрактные фоновые градиенты */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-brand/20 blur-[120px] mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-amber-500/10 blur-[100px] mix-blend-screen pointer-events-none" />
        
        {/* Логотип */}
        <div className="relative z-10 flex items-center gap-3 text-white">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-lg">
            <Hexagon size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-black tracking-tight">AuraSync</span>
        </div>

        {/* Главное УТП */}
        <div className="relative z-10 max-w-xl">
          <h1 className="text-6xl xl:text-7xl font-black text-white leading-[1.05] tracking-tight mb-8">
            Общайся.<br/>
            Знакомься.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-brand">
              Работай. Продавай.
            </span>
          </h1>
          <p className="text-lg text-gray-400 font-medium leading-relaxed mb-12 max-w-md">
            Единая экосистема для ваших личных связей и масштабирования бизнеса. Находите партнеров, клиентов и друзей на умном радаре.
          </p>
          
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4 text-gray-300 font-medium text-sm">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 shrink-0">
                <Globe size={18} className="text-brand" />
              </div>
              Глобальный нетворкинг и B2B маркетплейс
            </div>
            <div className="flex items-center gap-4 text-gray-300 font-medium text-sm">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 shrink-0">
                <ShieldCheck size={18} className="text-amber-400" />
              </div>
              Защищенные чаты со сквозным шифрованием
            </div>
            <div className="flex items-center gap-4 text-gray-300 font-medium text-sm">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5 shrink-0">
                <Zap size={18} className="text-yellow-400" />
              </div>
              Умный алгоритм подбора профилей
            </div>
          </div>
        </div>

        {/* Футер */}
        <div className="relative z-10 text-xs text-gray-500 font-bold uppercase tracking-widest">
          © 2026 AuraSync Enterprise
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ - ФОРМА АВТОРИЗАЦИИ */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 relative bg-[#FAFAFA]">
        
        {/* Мобильный логотип (виден только на телефонах) */}
        <div className="lg:hidden flex flex-col items-center gap-4 mb-12">
          <div className="w-16 h-16 bg-gray-950 rounded-2xl flex items-center justify-center shadow-xl">
            <Hexagon size={32} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-3xl font-black tracking-tight text-gray-950">AuraSync</span>
        </div>

        {/* Карточка входа */}
        <div className="w-full max-w-md bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-gray-100 relative overflow-hidden">
          {/* Декоративная полоса сверху */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand via-amber-400 to-brand"></div>
          
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-gray-950 tracking-tight mb-2">Вход в систему</h2>
            <p className="text-sm text-gray-500 font-medium">Авторизуйтесь, чтобы получить доступ к сети</p>
          </div>

          {/* Уведомление об ошибке */}
          {error && (
            <div className="mb-8 p-4 bg-red-50/80 border border-red-100 rounded-2xl text-xs text-red-600 font-bold flex items-center gap-3 animate-fade-in">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
              {error}
            </div>
          )}

          {/* Кнопка Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full group flex items-center justify-center gap-4 bg-white border-2 border-gray-100 hover:border-gray-200 text-gray-900 px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
          >
            {isLoading ? (
              <div className="flex items-center gap-3 text-gray-500">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                <span>Безопасное соединение...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Продолжить с Google
                <ArrowRight size={18} className="ml-auto text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1.5 transition-all" />
              </>
            )}
          </button>

          {/* Политика конфиденциальности */}
          <div className="mt-10 text-center">
            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed max-w-[260px] mx-auto uppercase tracking-wide">
              Продолжая, вы соглашаетесь с <a href="#" className="text-gray-900 underline underline-offset-4 hover:text-brand transition-colors">Правилами платформы</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
