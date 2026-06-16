import { useState } from 'react';
import { LayoutGrid, Calendar, Timer, Mic, ArrowLeft } from 'lucide-react';
import TasksBoard from './TasksBoard';
import CalendarPage from './CalendarPage';
import Pomodoro from './Pomodoro';
import VoiceNotes from './VoiceNotes';

type TabType = 'hub' | 'tasks' | 'calendar' | 'pomodoro' | 'notes';

export default function ProductivityLayout() {
  const [activeTab, setActiveTab] = useState<TabType>('hub');

  const apps = [
    {
      id: 'tasks',
      name: 'Личные задачи',
      description: 'Простые чек-листы и канбан-доска для дел без хаоса CRM',
      icon: LayoutGrid,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/20',
      hoverBorder: 'hover:border-indigo-500/50 dark:hover:border-indigo-500/40',
      shadow: 'hover:shadow-indigo-500/5'
    },
    {
      id: 'calendar',
      name: 'Календарь времени',
      description: 'Полноэкранное расписание на день и месяц как в Google',
      icon: Calendar,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20',
      hoverBorder: 'hover:border-emerald-500/50 dark:hover:border-emerald-500/40',
      shadow: 'hover:shadow-emerald-500/5'
    },
    {
      id: 'pomodoro',
      name: 'Таймер Помодоро',
      description: 'Фоновое управление циклами фокуса и отдыха с пушами',
      icon: Timer,
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20',
      hoverBorder: 'hover:border-rose-500/50 dark:hover:border-rose-500/40',
      shadow: 'hover:shadow-rose-500/5'
    },
    {
      id: 'notes',
      name: 'Голосовые заметки',
      description: 'ИИ-расшифровка мыслей в абзацы, редактура и шифрование',
      icon: Mic,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-500/20',
      hoverBorder: 'hover:border-amber-500/50 dark:hover:border-amber-500/40',
      shadow: 'hover:shadow-amber-500/5'
    },
  ];

  // Если мы на главном экране Хаба Продуктивности
  if (activeTab === 'hub') {
    return (
      <div className="h-full overflow-y-auto bg-[#F2F2F7] dark:bg-gray-950 transition-colors p-6 md:p-12 flex flex-col justify-center items-center">
        <div className="w-full max-w-5xl">
          {/* Заголовок Хаба */}
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
              Продуктивность
            </h1>
            <p className="text-[15px] font-medium text-gray-500 dark:text-gray-400">
              Экосистема персональной эффективности. Всё просто, быстро и конфиденциально.
            </p>
          </div>

          {/* Сетка из 4 крупных квадратных блоков */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {apps.map((app) => {
              const Icon = app.icon;
              return (
                <button
                  key={app.id}
                  onClick={() => setActiveTab(app.id as TabType)}
                  className={`aspect-square bg-white dark:bg-gray-900 rounded-[32px] p-6 border border-gray-200/60 dark:border-gray-800/60 flex flex-col justify-between text-left transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl ${app.hoverBorder} ${app.shadow} group`}
                >
                  {/* Иконка приложения */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${app.color}`}>
                    <Icon size={28} strokeWidth={2} />
                  </div>

                  {/* Текстовое описание */}
                  <div className="mt-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 leading-normal">
                      {app.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Если открыто конкретное приложение, рендерим его с верхней навигационной панелью «Назад»
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950 transition-colors">
      {/* Минималистичный верхний бар управления */}
      <div className="h-14 px-4 border-b border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-md flex items-center justify-between shrink-0">
        <button
          onClick={() => setActiveTab('hub')}
          className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 px-3 py-1.5 rounded-xl shadow-sm"
        >
          <ArrowLeft size={14} strokeWidth={2.5} />
          Панель инструментов
        </button>
        
        {/* Компактный индикатор текущего открытого приложения */}
        <div className="text-xs font-black tracking-wider uppercase text-gray-400 dark:text-gray-500">
          {apps.find(a => a.id === activeTab)?.name}
        </div>
      </div>

      {/* Контент открытого приложения */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'tasks' && <TasksBoard />}
        {activeTab === 'calendar' && <CalendarPage />}
        {activeTab === 'pomodoro' && <Pomodoro />}
        {activeTab === 'notes' && <VoiceNotes />}
      </div>
    </div>
  );
}
