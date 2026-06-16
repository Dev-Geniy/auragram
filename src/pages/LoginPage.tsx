import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { Hexagon, ArrowRight, Sparkles } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Генерация статичных координат для звезд, чтобы избежать скачков рендера
  const stars = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 2
    }));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const from = location.state?.from?.pathname + (location.state?.from?.search || '') || '/chats';

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Ошибка авторизации:', err);
      setError('Не удалось войти. Проверьте подключение и попробуйте еще раз.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-[#030712] overflow-hidden font-sans select-none">
      
      {/* ========================================== */}
      {/* 🌌 ОБЪЕМНЫЙ ЗВЕЗДНЫЙ ФОН */}
      {/* ========================================== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Центральное свечение */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] md:w-[60vw] md:h-[60vw] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-1000" />
        
        {/* Боковые градиенты для объема */}
        <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] bg-purple-500/10 rounded-full blur-[120px] mix-blend-screen" />

        {/* Звезды */}
        {mounted && stars.map(star => (
          <div 
            key={star.id} 
            className="absolute bg-white rounded-full opacity-30 animate-pulse" 
            style={{ 
              left: `${star.x}%`, 
              top: `${star.y}%`, 
              width: `${star.size}px`, 
              height: `${star.size}px`, 
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`
            }} 
          />
        ))}
      </div>

      {/* ========================================== */}
      {/* 📦 ЦЕНТРАЛЬНАЯ КАРТОЧКА АВТОРИЗАЦИИ */}
      {/* ========================================== */}
      <div className="relative z-10 w-full max-w-[400px] mx-4 p-8 sm:p-12 flex flex-col items-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_8px_40px_0_rgba(0,0,0,0.3)] transform transition-all animate-slide-up">
        
        {/* Логотип */}
        <div className="relative mb-6 group cursor-default">
          <div className="absolute inset-0 bg-blue-500 blur-xl opacity-40 rounded-full group-hover:opacity-60 transition-opacity duration-500" />
          <div className="relative w-20 h-20 bg-white/10 border border-white/20 rounded-[1.5rem] flex items-center justify-center shadow-2xl backdrop-blur-md transform group-hover:scale-105 transition-transform duration-500">
            <Hexagon size={40} className="text-white" strokeWidth={2} />
            <Sparkles size={16} className="absolute -top-1 -right-1 text-blue-300 animate-pulse" />
          </div>
        </div>

        {/* Заголовки */}
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">Aura</h1>
        <p className="text-gray-400 text-sm font-medium mb-10 text-center leading-relaxed">
          Единое цифровое пространство
        </p>

        {/* Уведомление об ошибке */}
        {error && (
          <div className="mb-6 w-full p-4 bg-red-500/10 border border-red-500/20 backdrop-blur-sm rounded-2xl text-xs text-red-200 font-bold flex items-center gap-3 animate-fade-in">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
            {error}
          </div>
        )}

        {/* Кнопка Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full group flex items-center justify-center gap-4 bg-white text-gray-900 px-6 py-4 rounded-2xl text-[15px] font-bold transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
        >
          {isLoading ? (
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
              <span>Вход в систему...</span>
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
        <div className="mt-8 text-center w-full">
          <p className="text-[10px] text-gray-500 font-medium leading-relaxed uppercase tracking-widest">
            © 2026 Aura<br />
            <a href="#" className="underline underline-offset-4 hover:text-white transition-colors mt-2 inline-block">
              Условия использования
            </a>
          </p>
        </div>
        
      </div>
    </div>
  );
};

export default LoginPage;
