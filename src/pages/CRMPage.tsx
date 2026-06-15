import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Plus, Trash2, X, User, DollarSign, 
  AlignLeft, Tag, CircleDashed, LayoutDashboard,
  CheckCircle2, Clock, Truck, Inbox, Loader2,
  Archive, BarChart3, Minimize2, 
  ChevronRight, ChevronLeft, Calendar
} from 'lucide-react';

// ==========================================
// ИНТЕРФЕЙСЫ И ТИПЫ
// ==========================================
type DealStatus = 'new' | 'processing' | 'delivery' | 'completed';

interface Deal {
  id: string;
  title: string;
  clientName: string;
  amount: string;
  status: DealStatus;
  notes: string;
  tags: string[];
  createdAt: any;
  userId: string;
  isArchived?: boolean; // Новое поле для архивации
}

// ==========================================
// КОНСТАНТЫ КОЛОНОК И ТЕГОВ
// ==========================================
const COLUMNS: { id: DealStatus; title: string; icon: any; color: string; bg: string; text: string }[] = [
  { id: 'new', title: 'Новые', icon: Inbox, color: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  { id: 'processing', title: 'В работе', icon: Clock, color: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  { id: 'delivery', title: 'Доставка', icon: Truck, color: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  { id: 'completed', title: 'Завершено', icon: CheckCircle2, color: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
];

const AVAILABLE_TAGS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
  'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
  'bg-pink-500', 'bg-rose-500'
];

export default function CRMPage() {
  const { user } = useAuthStore();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // DRAG & DROP СТЕЙТЫ
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  
  // МОДАЛКА РЕДАКТИРОВАНИЯ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // НОВЫЕ ФИЧИ (Архив, Аналитика, Компактный вид)
  const [showArchive, setShowArchive] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [collapsedCols, setCollapsedCols] = useState<string[]>([]);
  
  // МОБИЛЬНЫЕ ТАБЫ
  const [activeMobileTab, setActiveMobileTab] = useState<DealStatus>('new');

  // ==========================================
  // ПОДПИСКА НА ДАННЫЕ (FIREBASE)
  // ==========================================
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'crm_deals'), 
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedDeals: Deal[] = [];
      snapshot.forEach((doc) => {
        loadedDeals.push({ id: doc.id, ...doc.data() } as Deal);
      });
      
      loadedDeals.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setDeals(loadedDeals);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ==========================================
  // DRAG AND DROP ЛОГИКА (ДЕСКТОП)
  // ==========================================
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    setTimeout(() => { if (e.target instanceof HTMLElement) e.target.style.opacity = '0.4'; }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedDealId(null);
    if (e.target instanceof HTMLElement) e.target.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = async (e: React.DragEvent, targetStatus: DealStatus) => {
    e.preventDefault();
    if (!draggedDealId || !user) return;

    const dealToUpdate = deals.find(d => d.id === draggedDealId);
    if (!dealToUpdate || dealToUpdate.status === targetStatus) return;

    setDeals(prev => prev.map(d => d.id === draggedDealId ? { ...d, status: targetStatus } : d));
    try { await updateDoc(doc(db, 'crm_deals', draggedDealId), { status: targetStatus }); } 
    catch (error) { console.error("Ошибка при переносе:", error); }
  };

  // ==========================================
  // БЫСТРОЕ ПЕРЕМЕЩЕНИЕ (ДЛЯ МОБИЛОК)
  // ==========================================
  const moveCard = async (deal: Deal, direction: 'prev' | 'next') => {
    const currentIndex = COLUMNS.findIndex(c => c.id === deal.status);
    let newIndex = currentIndex;
    
    if (direction === 'prev' && currentIndex > 0) newIndex--;
    if (direction === 'next' && currentIndex < COLUMNS.length - 1) newIndex++;
    if (newIndex === currentIndex) return;

    const targetStatus = COLUMNS[newIndex].id;
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, status: targetStatus } : d));
    
    try { await updateDoc(doc(db, 'crm_deals', deal.id), { status: targetStatus }); } 
    catch (error) { console.error("Ошибка перемещения:", error); }
  };

  // ==========================================
  // ЛОГИКА МОДАЛКИ (СОЗДАНИЕ / РЕДАКТИРОВАНИЕ)
  // ==========================================
  const openNewDealModal = (status: DealStatus = 'new') => {
    setEditingDeal({ id: '', title: '', clientName: '', amount: '', status: status, notes: '', tags: [], createdAt: null, userId: user?.uid || '', isArchived: false });
    setIsModalOpen(true);
  };

  const openEditDealModal = (deal: Deal) => {
    setEditingDeal({ ...deal });
    setIsModalOpen(true);
  };

  const handleSaveDeal = async () => {
    if (!user || !editingDeal) return;
    if (!editingDeal.title.trim() && !editingDeal.clientName.trim()) return alert('Введите название или имя клиента');
    
    setIsSaving(true);
    try {
      if (editingDeal.id) {
        await updateDoc(doc(db, 'crm_deals', editingDeal.id), {
          title: editingDeal.title, clientName: editingDeal.clientName, amount: editingDeal.amount,
          status: editingDeal.status, notes: editingDeal.notes, tags: editingDeal.tags, isArchived: editingDeal.isArchived || false
        });
      } else {
        await addDoc(collection(db, 'crm_deals'), {
          title: editingDeal.title, clientName: editingDeal.clientName, amount: editingDeal.amount,
          status: editingDeal.status, notes: editingDeal.notes, tags: editingDeal.tags,
          createdAt: serverTimestamp(), userId: user.uid, isArchived: false
        });
      }
      setIsModalOpen(false);
    } catch (error) { console.error("Ошибка сохранения:", error); } 
    finally { setIsSaving(false); }
  };

  const handleDeleteDeal = async () => {
    if (!editingDeal?.id) return;
    if (window.confirm('Точно удалить карточку навсегда?')) {
      try {
        await deleteDoc(doc(db, 'crm_deals', editingDeal.id));
        setIsModalOpen(false);
      } catch (error) { console.error("Ошибка удаления:", error); }
    }
  };

  const handleArchiveDeal = async (dealId: string, archiveState: boolean) => {
    try {
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, isArchived: archiveState } : d));
      await updateDoc(doc(db, 'crm_deals', dealId), { isArchived: archiveState });
      setIsModalOpen(false);
    } catch (error) { console.error("Ошибка архивации:", error); }
  };

  const toggleTag = (colorClass: string) => {
    if (!editingDeal) return;
    setEditingDeal(prev => {
      if (!prev) return prev;
      return { ...prev, tags: prev.tags.includes(colorClass) ? prev.tags.filter(t => t !== colorClass) : [...prev.tags, colorClass] };
    });
  };

  // ==========================================
  // АНАЛИТИКА И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ==========================================
  const parseAmount = (amountStr: string) => parseFloat(amountStr.replace(/[^\d.-]/g, '')) || 0;
  const formatNumber = (num: number) => num === 0 ? '0' : new Intl.NumberFormat('ru-RU').format(num);

  const getColumnTotal = (status: DealStatus) => {
    return deals.filter(d => d.status === status && !d.isArchived).reduce((sum, deal) => sum + parseAmount(deal.amount), 0);
  };

  const toggleColumnCollapse = (colId: string) => {
    setCollapsedCols(prev => prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]);
  };

  // Расчет аналитики
  const calculateAnalytics = () => {
    const completedDeals = deals.filter(d => d.status === 'completed'); // Считаем даже архивные успешные сделки
    const now = new Date();
    
    let stats = { day: 0, month: 0, year: 0, total: 0 };

    completedDeals.forEach(deal => {
      const val = parseAmount(deal.amount);
      stats.total += val;
      
      if (deal.createdAt?.toMillis) {
        const date = new Date(deal.createdAt.toMillis());
        if (date.getFullYear() === now.getFullYear()) {
          stats.year += val;
          if (date.getMonth() === now.getMonth()) {
            stats.month += val;
            if (date.getDate() === now.getDate()) {
              stats.day += val;
            }
          }
        }
      }
    });
    return stats;
  };

  const activeDeals = deals.filter(d => showArchive ? d.isArchived : !d.isArchived);

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#F2F2F7] dark:bg-gray-950 flex justify-center items-center transition-colors">
        <div className="animate-spin text-blue-500"><CircleDashed size={32} /></div>
      </div>
    );
  }

  const stats = calculateAnalytics();

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#F2F2F7] dark:bg-gray-950 transition-colors relative">
      
      {/* HEADER */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md sticky top-0 z-20 px-4 md:px-6 py-3 border-b border-gray-200/60 dark:border-gray-800 shrink-0 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <LayoutDashboard size={20} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">Smart CRM</h1>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {showArchive ? 'Архив сделок' : 'Активные сделки'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Кнопка Аналитики */}
          <button 
            onClick={() => setIsAnalyticsOpen(true)}
            className="w-10 h-10 md:w-auto md:px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2 transition-colors"
          >
            <BarChart3 size={18} />
            <span className="hidden md:inline text-[13px] font-bold">Аналитика</span>
          </button>
          
          {/* Кнопка Архива */}
          <button 
            onClick={() => setShowArchive(!showArchive)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${
              showArchive 
                ? 'bg-amber-100 border-amber-200 text-amber-600 dark:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-400' 
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Archive size={18} />
          </button>

          {/* Кнопка Создать */}
          <button 
            onClick={() => openNewDealModal(activeMobileTab)} 
            className="bg-blue-500 hover:bg-blue-600 text-white pl-3 pr-4 md:px-4 h-10 rounded-xl text-[13px] font-bold shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95 ml-1"
          >
            <Plus size={18} /> <span className="hidden md:inline">Создать</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 📱 МОБИЛЬНЫЕ ТАБЫ (Видны только на мобильных) */}
      {/* ========================================== */}
      <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-2 py-2 flex overflow-x-auto custom-scrollbar gap-2 shrink-0">
        {COLUMNS.map(col => {
          const count = activeDeals.filter(d => d.status === col.id).length;
          const isActive = activeMobileTab === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setActiveMobileTab(col.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-colors flex-1 justify-center min-w-[120px] ${
                isActive ? `${col.bg} ${col.text} border border-transparent` : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <col.icon size={16} />
              <span className="text-[13px] font-bold">{col.title}</span>
              <span className="bg-white/50 dark:bg-black/20 px-1.5 rounded-md text-[11px]">{count}</span>
            </button>
          )
        })}
      </div>

      {/* ========================================== */}
      {/* 💻 РАБОЧАЯ ОБЛАСТЬ (KANBAN для ПК / СПИСОК для МОБИЛОК) */}
      {/* ========================================== */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative">
        <div className="flex flex-col md:flex-row gap-4 p-4 md:p-6 min-w-max h-full md:items-start pb-20 md:pb-6">
          
          {COLUMNS.map(col => {
            const columnDeals = activeDeals.filter(d => d.status === col.id);
            const totalStr = formatNumber(getColumnTotal(col.id));
            const isCollapsed = collapsedCols.includes(col.id);
            
            // На мобилках скрываем все колонки, кроме активной вкладки
            const mobileDisplay = activeMobileTab === col.id ? 'flex' : 'hidden md:flex';

            if (isCollapsed) {
              return (
                <div 
                  key={col.id}
                  onClick={() => toggleColumnCollapse(col.id)}
                  className={`${mobileDisplay} hidden md:flex flex-col items-center w-[60px] h-full bg-gray-200/50 dark:bg-gray-800/40 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-2xl border border-gray-300/50 dark:border-gray-700 cursor-pointer transition-all py-4 shrink-0 group`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${col.bg} ${col.text} mb-6 group-hover:scale-110 transition-transform`}>
                    <col.icon size={18} />
                  </div>
                  <span className="text-[13px] font-black text-gray-500 dark:text-gray-400 tracking-widest uppercase rotate-180" style={{ writingMode: 'vertical-rl' }}>
                    {col.title}
                  </span>
                  <div className="mt-6 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-[12px] font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                    {columnDeals.length}
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`${mobileDisplay} w-full md:w-[320px] flex-col h-full bg-transparent md:bg-gray-100/50 md:dark:bg-gray-800/30 md:rounded-2xl md:border border-gray-200/50 dark:border-gray-800/50 shrink-0 transition-colors`}
              >
                {/* Column Header (Только на ПК) */}
                <div className="hidden md:flex p-3 pb-2 items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.color}`} />
                    <h3 className="font-bold text-[14px] text-gray-900 dark:text-white">{col.title}</h3>
                    <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {columnDeals.length}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleColumnCollapse(col.id)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1" title="Свернуть">
                      <Minimize2 size={14} />
                    </button>
                    <button onClick={() => openNewDealModal(col.id)} className="text-gray-400 hover:text-blue-500 transition-colors p-1" title="Добавить">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Итоговая сумма колонки (Только на ПК) */}
                {getColumnTotal(col.id) > 0 && (
                  <div className="hidden md:block px-3 pb-3 shrink-0">
                    <p className={`text-[12px] font-black uppercase tracking-wider ${col.text}`}>∑ {totalStr}</p>
                  </div>
                )}

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar md:p-2 md:pt-0 space-y-3 md:space-y-2">
                  {columnDeals.map(deal => (
                    <div 
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onDragEnd={handleDragEnd}
                      className="bg-white dark:bg-gray-900 p-4 md:p-3.5 rounded-[16px] md:rounded-[14px] shadow-sm md:shadow-none border border-gray-200/80 dark:border-gray-800 cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-500/50 transition-all group flex flex-col"
                    >
                      {/* Верхняя часть карточки (кликабельна для редактирования) */}
                      <div onClick={() => openEditDealModal(deal)} className="flex-1">
                        {/* Теги */}
                        {deal.tags && deal.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {deal.tags.map(tag => (
                              <div key={tag} className={`w-8 h-1.5 rounded-full opacity-80 ${tag}`} />
                            ))}
                          </div>
                        )}
                        
                        <h4 className="font-bold text-[15px] md:text-[14px] text-gray-900 dark:text-white leading-tight mb-1.5">
                          {deal.title || 'Без названия'}
                        </h4>
                        
                        {deal.clientName && (
                          <p className="text-[13px] md:text-[12px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-3">
                            <User size={14} className="md:w-3 md:h-3" /> {deal.clientName}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100 dark:border-gray-800/60">
                          {deal.amount ? (
                            <span className="font-black text-[14px] md:text-[13px] text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                              {deal.amount}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-medium">Без суммы</span>
                          )}
                          {deal.notes && <AlignLeft size={14} className="text-gray-300 dark:text-gray-600" />}
                        </div>
                      </div>

                      {/* 📱 Панель быстрых действий (Только на мобилках) */}
                      <div className="md:hidden flex items-center justify-between mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-800">
                        <button 
                          onClick={() => moveCard(deal, 'prev')}
                          disabled={COLUMNS.findIndex(c => c.id === deal.status) === 0}
                          className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl disabled:opacity-30 text-gray-600 dark:text-gray-400"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Переместить</span>
                        <button 
                          onClick={() => moveCard(deal, 'next')}
                          disabled={COLUMNS.findIndex(c => c.id === deal.status) === COLUMNS.length - 1}
                          className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl disabled:opacity-30 text-gray-600 dark:text-gray-400"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {columnDeals.length === 0 && (
                    <div className="h-24 md:h-20 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl m-1">
                      <p className="text-[13px] md:text-[12px] font-medium text-gray-400 dark:text-gray-500">
                        {showArchive ? 'Архив пуст' : 'Нет карточек'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================== */}
      {/* 📊 ПАНЕЛЬ АНАЛИТИКИ (Drawer) */}
      {/* ========================================== */}
      {isAnalyticsOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] animate-fade-in" onClick={() => setIsAnalyticsOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full md:w-[400px] bg-white dark:bg-gray-900 shadow-2xl z-[110] animate-slide-left flex flex-col border-l border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                  <BarChart3 size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Отчет о продажах</h2>
              </div>
              <button onClick={() => setIsAnalyticsOpen(false)} className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-5 rounded-2xl text-white shadow-lg shadow-green-500/20">
                <p className="text-white/80 text-[13px] font-bold uppercase tracking-wider mb-1">Всего заработано</p>
                <p className="text-3xl font-black">{formatNumber(stats.total)} ₴</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={14} /> Периоды (по дате создания)
                </h3>
                
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 flex items-center justify-between border border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-white">Сегодня</p>
                  </div>
                  <p className="text-lg font-black text-green-600 dark:text-green-400">{formatNumber(stats.day)} ₴</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 flex items-center justify-between border border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-white">В этом месяце</p>
                  </div>
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400">{formatNumber(stats.month)} ₴</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 flex items-center justify-between border border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="text-[15px] font-bold text-gray-900 dark:text-white">За год</p>
                  </div>
                  <p className="text-lg font-black text-purple-600 dark:text-purple-400">{formatNumber(stats.year)} ₴</p>
                </div>
              </div>
              
              <p className="text-[12px] text-gray-400 text-center mt-6">Аналитика строится на основе завершенных карточек.</p>
            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* 📝 МОДАЛКА КАРТОЧКИ (EDIT / CREATE) */}
      {/* ========================================== */}
      {isModalOpen && editingDeal && (
        <div className="fixed inset-0 z-[150] bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm flex flex-col justify-end md:items-center md:justify-center p-0 md:p-4 animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-gray-900 w-full md:max-w-md h-[90vh] md:h-auto md:max-h-[90vh] rounded-t-[32px] md:rounded-[2rem] shadow-2xl flex flex-col animate-slide-up relative" onClick={e => e.stopPropagation()}>
            
            {/* ШАПКА МОДАЛКИ */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">
                {editingDeal.id ? 'Карточка сделки' : 'Новая сделка'}
              </h2>
              <div className="flex items-center gap-2">
                {editingDeal.id && (
                  <>
                    <button 
                      onClick={() => handleArchiveDeal(editingDeal.id, !editingDeal.isArchived)} 
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${editingDeal.isArchived ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-amber-500'}`}
                      title={editingDeal.isArchived ? "Вернуть из архива" : "В архив"}
                    >
                      <Archive size={16} />
                    </button>
                    <button onClick={handleDeleteDeal} className="w-9 h-9 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-500/10 text-red-500 flex items-center justify-center transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
                <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center transition-colors ml-2">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* КОНТЕНТ МОДАЛКИ */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* Выбор статуса */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Статус этапа</label>
                <div className="grid grid-cols-2 gap-2">
                  {COLUMNS.map(col => (
                    <button 
                      key={col.id}
                      onClick={() => setEditingDeal({ ...editingDeal, status: col.id })}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all border ${
                        editingDeal.status === col.id 
                          ? `${col.bg} border-transparent ${col.text}` 
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <col.icon size={16} /> {col.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Основные поля */}
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Суть заказа / Название</label>
                  <input 
                    type="text" 
                    value={editingDeal.title}
                    onChange={e => setEditingDeal({ ...editingDeal, title: e.target.value })}
                    placeholder="Напр. Дизайн сайта"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[15px] font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 transition-colors shadow-sm"
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><User size={12}/> Клиент</label>
                    <input 
                      type="text" 
                      value={editingDeal.clientName}
                      onChange={e => setEditingDeal({ ...editingDeal, clientName: e.target.value })}
                      placeholder="Имя, Контакт..."
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 transition-colors shadow-sm"
                    />
                  </div>
                  <div className="md:w-1/3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><DollarSign size={12}/> Бюджет</label>
                    <input 
                      type="text" 
                      value={editingDeal.amount}
                      onChange={e => setEditingDeal({ ...editingDeal, amount: e.target.value })}
                      placeholder="Напр. 500$"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[14px] font-black text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 transition-colors shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Теги */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Tag size={12}/> Метки (Теги)</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map(color => {
                    const isSelected = editingDeal.tags.includes(color);
                    return (
                      <button
                        key={color}
                        onClick={() => toggleTag(color)}
                        className={`w-9 h-9 rounded-full ${color} flex items-center justify-center transition-transform ${isSelected ? 'ring-2 ring-offset-2 dark:ring-offset-gray-900 ring-blue-500 scale-110' : 'opacity-50 hover:opacity-100 hover:scale-105'}`}
                      >
                        {isSelected && <CheckCircle2 size={16} className="text-white" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Заметки */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><AlignLeft size={12}/> Внутренние записи</label>
                <textarea 
                  value={editingDeal.notes}
                  onChange={e => setEditingDeal({ ...editingDeal, notes: e.target.value })}
                  placeholder="Запишите сюда детали заказа, адрес доставки, предпочтения клиента."
                  className="w-full bg-yellow-50/50 dark:bg-amber-500/5 border border-yellow-200/50 dark:border-amber-500/20 rounded-xl p-4 text-[14px] text-gray-800 dark:text-amber-100/80 placeholder-gray-400 dark:placeholder-amber-500/40 outline-none resize-none h-32 custom-scrollbar transition-colors shadow-inner"
                />
              </div>

            </div>

            {/* ФУТЕР МОДАЛКИ */}
            <div className="p-4 md:p-6 border-t border-gray-100 dark:border-gray-800 shrink-0 pb-safe">
              <button 
                onClick={handleSaveDeal}
                disabled={isSaving}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md disabled:opacity-50 text-[15px]"
              >
                {isSaving ? <><Loader2 size={18} className="animate-spin" /> Сохранение...</> : 'Сохранить сделку'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
