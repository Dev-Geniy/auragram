import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { Hexagon, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const from = location.state?.from?.pathname + (location.state?.from?.search || '') || '/chats';

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithPopup(auth, googleProvider);
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Ошибка авторизации:', err);
      setError('Ошибка связи с сервером. Попробуйте еще раз.');
      setIsLoading(false);
    }
  };

  // ==========================================
  // 🌌 ИНТЕРАКТИВНЫЙ КОСМОС (CANVAS ENGINE)
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const numStars = window.innerWidth < 768 ? 400 : 800; // Оптимизация для мобилок
    const stars: { x: number, y: number, z: number, pz: number }[] = [];
    
    // Инициализация звезд
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width * 2 - width,
        y: Math.random() * height * 2 - height,
        z: Math.random() * width,
        pz: 0
      });
      stars[i].pz = stars[i].z;
    }

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetX = width / 2;
    let targetY = height / 2;
    
    let speed = 1;      // Текущая скорость
    let targetSpeed = 1; // Целевая скорость (при ускорении)

    let animationFrameId: number;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      targetX = width / 2;
      targetY = height / 2;
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      // Плавное следование за курсором/пальцем
      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;
      
      // Плавное ускорение/замедление (Варп)
      speed += (targetSpeed - speed) * 0.05;

      // Эффект следа (очистка с легкой прозрачностью)
      ctx.fillStyle = `rgba(0, 0, 0, ${speed > 5 ? 0.3 : 0.8})`; 
      ctx.fillRect(0, 0, width, height);

      const focalLength = width; // Фокусное расстояние
      const centerX = width / 2;
      const centerY = height / 2;

      stars.forEach(star => {
        star.pz = star.z;
        star.z -= speed;

        // Если звезда пролетела мимо камеры, сбрасываем её вдаль
        if (star.z <= 0) {
          star.x = Math.random() * width * 2 - width;
          star.y = Math.random() * height * 2 - height;
          star.z = width;
          star.pz = width;
        }

        // 3D в 2D проекция
        // Центром перспективы теперь является mouseX, mouseY (Направление полета)
        const offsetX = mouseX - centerX;
        const offsetY = mouseY - centerY;

        const sx = (star.x / star.z) * focalLength + centerX + offsetX * (1 - star.z / width);
        const sy = (star.y / star.z) * focalLength + centerY + offsetY * (1 - star.z / width);

        const px = (star.x / star.pz) * focalLength + centerX + offsetX * (1 - star.pz / width);
        const py = (star.y / star.pz) * focalLength + centerY + offsetY * (1 - star.pz / width);

        // Рисуем звезду (линией от прошлой позиции к новой для эффекта скорости)
        const opacity = Math.max(0, 1 - star.z / width);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = Math.max(0.5, (1 - star.z / width) * (speed > 5 ? 3 : 1.5));
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Управление полетом через Canvas
    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const onPointerDown = () => { targetSpeed = 25; }; // Варп прыжок!
    const onPointerUp = () => { targetSpeed = 1; };    // Обычный круиз

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center bg-black overflow-hidden font-sans select-none">
      
      {/* ИНТЕРАКТИВНЫЙ КОСМОС */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full z-0 cursor-crosshair touch-none"
        title="Зажмите и тяните для управления полетом"
      />

      {/* МИНИМАЛИСТИЧНЫЙ ИНТЕРФЕЙС (ПАРЯЩИЙ В ВАКУУМЕ) */}
      <div className="relative z-10 flex flex-col items-center animate-fade-in pointer-events-none">
        
        {/* Сияющее белое солнце с черным логотипом */}
        <div className="relative mb-8 flex justify-center items-center">
          <div className="absolute inset-0 bg-white blur-[60px] opacity-40 rounded-full animate-pulse" />
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.8)] z-10">
            <Hexagon size={48} className="text-black" strokeWidth={2} fill="black" />
          </div>
        </div>

        {/* Космическая Типографика */}
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-[0.2em] uppercase mb-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
          Aura
        </h1>
        <p className="text-gray-400 text-[14px] md:text-[15px] font-medium tracking-widest uppercase mb-16 text-center max-w-[280px]">
          Синхронизация с системой
        </p>

        {error && (
          <div className="mb-8 w-full max-w-[300px] text-center text-[12px] text-red-400 font-bold uppercase tracking-widest bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20 backdrop-blur-md">
            {error}
          </div>
        )}

        {/* Плавающая кнопка авторизации (Активирует Pointer Events) */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="pointer-events-auto relative group flex items-center justify-center gap-4 bg-white text-black px-8 py-4 rounded-full text-[15px] font-black uppercase tracking-widest transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.6)]"
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
              <span>Запуск...</span>
            </div>
          ) : (
            <>
              <svg className="w-5 h-5 shrink-0 transition-transform group-hover:rotate-12" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#000000" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#000000" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#000000" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#000000" />
              </svg>
              Вход через Google
              <ArrowRight size={18} className="ml-2 transition-transform group-hover:translate-x-2" />
            </>
          )}
        </button>
      </div>

      {/* Подсказка снизу */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center pointer-events-none opacity-50 animate-pulse-slow">
        <p className="text-[10px] text-white uppercase tracking-[0.3em]">
          Зажмите экран для варп-прыжка
        </p>
      </div>

    </div>
  );
}
