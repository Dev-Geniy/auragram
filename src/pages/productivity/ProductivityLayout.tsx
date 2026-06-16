import { useState } from 'react';
import { LayoutGrid, Calendar, Timer, Mic } from 'lucide-react'; 
import TasksBoard from './TasksBoard';
import CalendarPage from './CalendarPage';
import Pomodoro from './Pomodoro';
import VoiceNotes from './VoiceNotes';

export default function ProductivityLayout() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar' | 'pomodoro' | 'notes'>('tasks');

  const tabs = [
    { id: 'tasks', name: 'Задачи', icon: LayoutGrid }, // <-- Исправлено здесь: LayoutBoard заменено на LayoutGrid
    { id: 'calendar', name: 'Календарь', icon: Calendar },
    { id: 'pomodoro', name: 'Помодоро', icon: Timer },
    { id: 'notes', name: 'Заметки', icon: Mic },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Навигация раздела */}
      <div className="flex p-2 gap-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <tab.icon size={18} />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Контент */}
      <div className="flex-1 overflow-hidden p-4">
        {activeTab === 'tasks' && <TasksBoard />}
        {activeTab === 'calendar' && <CalendarPage />}
        {activeTab === 'pomodoro' && <Pomodoro />}
        {activeTab === 'notes' && <VoiceNotes />}
      </div>
    </div>
  );
}
