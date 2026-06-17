import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Plus, Trash2, X, User, DollarSign, 
  AlignLeft, Tag, CircleDashed, LayoutDashboard,
  CheckCircle2, Clock, Truck, Inbox, Loader2,
  Archive, BarChart3, Minimize2, 
  ChevronRight, ChevronLeft, Calendar,
  Zap, Package
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
  isArchived?: boolean;
  orderMessageId?: string; // Привязка к конкретному заказу из чата
  buyerId?: string;        // ID покупателя для обратной связи с чатом
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

  // ФИЧИ (Архив, Аналитика, Компактный вид)
  const [showArchive, setShowArchive] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [collapsedCols, setCollapsedCols] = useState<string[]>([]);
  
  // МОБИЛЬНЫЕ ТАБЫ
  const [activeMobileTab, setActiveMobileTab] = useState<DealStatus>('new');

  // ==========================================
  // 1. ПОДПИСКА НА ДАННЫЕ СДЕЛОК
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
  // 2. АВТО-ПЕРЕХВАТ ЗАКАЗОВ ИЗ ЧАТА
  // ==========================================
  useEffect(() => {
    if (!user) return;

    const qOrders = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      where('type', '==', 'order_receipt')
    );

    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const msgData = change.doc.data();
          const msgId = change.doc.id;

          // Проверяем, существует ли уже сделка с таким orderMessageId
          const dealQ = query(collection(db, 'crm_deals'), where('userId', '==', user.uid), where('orderMessageId', '==', msgId));
          const dealSnap = await getDocs(dealQ);
          
          if (dealSnap.empty) {
            // Пытаемся получить имя клиента
            let clientName = 'Новый клиент';
            try {
              const userDoc = await getDoc(doc(db, 'users', msgData.senderId));
              if (userDoc.exists() && userDoc.data().name) {
                clientName = userDoc.data().name;
              }
            } catch (error) {
              console.error("Ошибка получения имени клиента", error);
            }

            // Создаем новую сделку автоматически (и сохраняем buyerId для обратной связи)
            try {
              await addDoc(collection(db, 'crm_deals'), {
                title: 'Заказ из чата',
                clientName: clientName,
                amount: msgData.orderData?.total ? `${msgData.orderData.total}` : '0',
                status: 'new',
                notes: `🛒 АВТОМАТИЧЕСКИЙ ЗАКАЗ\n\nТовары:\n${msgData.orderData?.items || 'Нет данных'}\n\n(Свяжитесь с клиентом через вкладку Чаты)`,
                tags: ['bg-blue-500'], 
                createdAt: msgData.createdAt || serverTimestamp(),
                userId: user.uid,
                isArchived: false,
                orderMessageId: msgId,
                buyerId: msgData.senderId // <-- Важно для отправки статусов назад в чат!
              });
            } catch (error) {
              console.error('Ошибка автосоздания сделки:', error);
            }
          }
        }
      });
    });

    return () => unsubscribeOrders();
  }, [user]);

  // ==========================================
  // 3. СИНХРОНИЗАЦИЯ СТАТУСА CRM -> ЧАТ
  // ==========================================
  const syncDealStatusToChat = async (deal: Deal, newStatus: DealStatus) => {
    if (!deal.orderMessageId || !deal.buyerId || !user) return;
    try {
      // Обновляем сам статус чека
      let chatStatus = 'new';
      if (newStatus === 'processing') chatStatus = 'processing';
      if (newStatus === 'delivery' || newStatus === 'completed') chatStatus = 'shipped'; // Упрощаем для клиента

      await updateDoc(doc(db, 'messages', deal.orderMessageId), { 'orderData.status': chatStatus });
      
      // Отправляем системное уведомление в чат покупателю
      let statusText = '';
      if (newStatus === 'processing') statusText = '🛠 Продавец взял ваш заказ в работу';
      if (newStatus === 'delivery') statusText = '🚚 Ваш заказ передан в доставку';
      if (newStatus === 'completed') statusText = '✅ Заказ успешно завершен';

      if (statusText) {
        const chatId = [user.uid, deal.buyerId].sort().join('_');
        await addDoc(collection(db, 'messages'), {
          chatId, type: 'system_status', statusText, senderId: user.uid, receiverId: deal.buyerId,
          createdAt: serverTimestamp(), isRead: false 
        });
      }
    } catch (e) {
      console.error("Ошибка синхронизации с чатом", e);
    }
  };

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
    try { 
      await updateDoc(doc(db, 'crm_deals', draggedDealId), { status: targetStatus }); 
      await syncDealStatusToChat(dealToUpdate, targetStatus); // Синхронизируем с чатом!
    } catch (error) { console.error("Ошибка при переносе:", error); }
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
    
    try { 
      await updateDoc(doc(db, 'crm_deals', deal.id), { status: targetStatus }); 
      await syncDealStatusToChat(deal, targetStatus); // Синхронизируем с чатом!
    } catch (error) { console.error("Ошибка перемещения:", error); }
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
        const originalDeal = deals.find(d => d.id === editingDeal.id);
        await updateDoc(doc(db, 'crm_deals', editingDeal.id), {
          title: editingDeal.title, clientName: editingDeal.clientName, amount: editingDeal.amount,
          status: editingDeal.status, notes: editingDeal.notes, tags: editingDeal.tags, isArchived: editingDeal.isArchived || false
        });
        // Если статус поменялся вручную в настройках сделки — обновляем чат
        if (originalDeal && originalDeal.status !== editingDeal.status) {
          await syncDealStatusToChat(originalDeal, editingDeal.status);
        }
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

  const calculateAnalytics = () => {
    const completedDeals = deals.filter(d => d.status === 'completed');
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
      <div className="flex-1 bg-gray-50 dark:bg-gray-950 flex justify-center items-center transition-colors">
        <div className="animate-spin text-blue-500"><CircleDashed size={32} /></div>
      </div>
    );
  }

  const stats = calculateAnalytics();

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors relative">
      
      {/* СОВРЕМЕННЫЙ МИНИМАЛИСТИЧНЫЙ HEADER */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl sticky top-0 z-20 pt-3 pb-2 px-4 border-b border-gray-100 dark:border-gray-800 shrink-0 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-[14px] flex items-center justify-center shadow-[0_4px_12px_rgba(59,130,246,0.3)] shrink-0 transition-transform hover:scale-105 cursor-default">
                <LayoutDashboard size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">CRM</h1>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  {showArchive ? 'Архив сделок' : 'Воронка продаж'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsAnalyticsOpen(true)}
                className="w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors shadow-sm"
                title="Аналитика продаж"
              >
                <BarChart3 size={18} />
              </button>
              
              <button 
                onClick={() => setShowArchive(!showArchive)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                  showArchive 
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title={showArchive ? "Выйти из архива" : "Архив сделок"}
              >
                <Archive size={18} />
              </button>

              <button 
                onClick={() => openNewDealModal(activeMobileTab)} 
                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-md flex items-center justify-center transition-transform active:scale-95 ml-1"
                title="Создать сделку"
              >
                <Plus size={20} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* 📱 МОБИЛЬНЫЕ ТАБЫ */}
          <div className="md:hidden flex overflow-x-auto gap-2 pb-1 scrollbar-none max-w-7xl mx-auto">
            {COLUMNS.map(col => {
              const count = activeDeals.filter(d => d.status === col.id).length;
              const isActive = activeMobileTab === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveMobileTab(col.id)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all shadow-sm flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {col.title}
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-md ml-1 ${isActive ? 'bg-white/20 dark:bg-black/10' : 'bg-gray-100 dark:bg-gray-700'}`}>{count}</span>
                </button>
              )
            })}
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 💻 РАБОЧАЯ ОБЛАСТЬ (KANBAN) */}
      {/* ========================================== */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 p-3 md:p-6 min-w-max h-full md:items-start pb-[calc(env(safe-area-inset-bottom)+80px)] md:pb-6">
          
          {COLUMNS.map(col => {
            const columnDeals = activeDeals.filter(d => d.status === col.id);
            const totalStr = formatNumber(getColumnTotal(col.id));
            const isCollapsed = collapsedCols.includes(col.id);
            
            const mobileDisplay = activeMobileTab === col.id ? 'flex' : 'hidden md:flex';

            if (isCollapsed) {
              return (
                <div 
                  key={col.id}
                  onClick={() => toggleColumnCollapse(col.id)}
                  className={`${mobileDisplay} hidden md:flex flex-col items-center w-[60px] h-full bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-[32px] border border-gray-200 dark:border-gray-800 cursor-pointer transition-all py-6 shrink-0 shadow-sm`}
                >
                  <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center ${col.bg} ${col.text} mb-8 shadow-sm transition-transform hover:scale-110`}>
                    <col.icon size={20} />
                  </div>
                  <span className="text-[14px] font-black text-gray-400 dark:text-gray-500 tracking-widest uppercase rotate-180" style={{ writingMode: 'vertical-rl' }}>
                    {col.title}
                  </span>
                  <div className="mt-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[12px] font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-md">
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
                className={`${mobileDisplay} w-full md:w-[320px] flex-col h-full bg-transparent md:bg-gray-100/50 md:dark:bg-gray-800/30 md:rounded-[32px] md:border border-gray-200/60 dark:border-gray-800/60 shrink-0 transition-colors`}
              >
                {/* Column Header */}
                <div className="hidden md:flex p-4 pb-3 items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${col.color} shadow-sm`} />
                    <h3 className="font-black text-[14px] uppercase tracking-wide text-gray-900 dark:text-white">{col.title}</h3>
                    <span className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                      {columnDeals.length}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleColumnCollapse(col.id)} className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shadow-sm" title="Свернуть">
                      <Minimize2 size={14} />
                    </button>
                    <button onClick={() => openNewDealModal(col.id)} className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-500 transition-colors shadow-sm" title="Добавить">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Сумма */}
                {getColumnTotal(col.id) > 0 && (
                  <div className="hidden md:block px-4 pb-4 shrink-0">
                    <p className={`text-[13px] font-black uppercase tracking-wider ${col.text}`}>∑ {totalStr}</p>
                  </div>
                )}

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar md:p-3 md:pt-0 space-y-3">
                  {columnDeals.map(deal => (
                    <div 
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onDragEnd={handleDragEnd}
                      className="bg-white dark:bg-gray-900 p-4 md:p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-800 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group flex flex-col"
                    >
                      <div onClick={() => openEditDealModal(deal)} className="flex-1">
                        
                        {/* Теги */}
                        {((deal.tags && deal.tags.length > 0) || deal.orderMessageId) && (
                          <div className="flex flex-wrap gap-1.5 mb-3 items-center">
                            {deal.tags?.map(tag => (
                              <div key={tag} className={`w-8 h-2 rounded-full opacity-80 ${tag} shadow-sm`} />
                            ))}
                            {deal.orderMessageId && (
                               <span className="ml-auto text-[10px] font-black text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                                 <Zap size={10}/> АВТО-ЗАКАЗ
                               </span>
                            )}
                          </div>
                        )}
                        
                        <h4 className="font-black text-[15px] md:text-[14px] text-gray-900 dark:text-white leading-snug mb-1.5 group-hover:text-blue-500 transition-colors">
                          {deal.title || 'Без названия'}
                        </h4>
                        
                        {deal.clientName && (
                          <p className="text-[13px] md:text-[12px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-3">
                            <User size={14} className="shrink-0" /> <span className="truncate">{deal.clientName}</span>
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 dark:border-gray-800/80">
                          {deal.amount ? (
                            <span className="font-black text-[15px] md:text-[14px] text-gray-900 dark:text-white">
                              {deal.amount}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-medium">Без суммы</span>
                          )}
                          {deal.notes && <AlignLeft size={16} className="text-gray-300 dark:text-gray-600" />}
                        </div>
                      </div>

                      {/* Мобильные действия */}
                      <div className="md:hidden flex items-center justify-between mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-gray-800">
                        <button 
                          onClick={() => moveCard(deal, 'prev')}
                          disabled={COLUMNS.findIndex(c => c.id === deal.status) === 0}
                          className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-full disabled:opacity-30 text-gray-600 dark:text-gray-400 shadow-sm"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Переместить</span>
                        <button 
                          onClick={() => moveCard(deal, 'next')}
                          disabled={COLUMNS.findIndex(c => c.id === deal.status) === COLUMNS.length - 1}
                          className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-full disabled:opacity-30 text-gray-600 dark:text-gray-400 shadow-sm"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {columnDeals.length === 0 && (
                    <div className="h-32 md:h-24 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[24px] mx-1 mt-2">
                      <div className="flex flex-col items-center opacity-50">
                        <Package size={24} className="text-gray-400 mb-1" />
                        <p className="text-[13px] md:text-[12px] font-bold text-gray-400 dark:text-gray-500">
                          {showArchive ? 'Архив пуст' : 'Нет карточек'}
                        </p>
                      </div>
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
          <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm z-[100] animate-fade-in" onClick={() => setIsAnalyticsOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full md:w-[420px] bg-white dark:bg-gray-900 shadow-2xl z-[110] animate-slide-left flex flex-col md:rounded-l-[32px] border-l border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-md rounded-tl-[32px]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-[16px] flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                  <BarChart3 size={24} strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Отчет о продажах</h2>
              </div>
              <button onClick={() => setIsAnalyticsOpen(false)} className="w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-[24px] text-white shadow-lg shadow-green-500/20 relative overflow-hidden">
                <BarChart3 size={100} className="absolute -bottom-4 -right-4 opacity-10" />
                <p className="text-white/80 text-[13px] font-black uppercase tracking-widest mb-1 relative z-10">Всего заработано</p>
                <p className="text-4xl font-black relative z-10 tracking-tight">{formatNumber(stats.total)} ₴</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Calendar size={14} /> Периоды
                </h3>
                
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[20px] p-5 flex items-center justify-between border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div>
                    <p className="text-[16px] font-bold text-gray-900 dark:text-white">Сегодня</p>
                  </div>
                  <p className="text-xl font-black text-green-600 dark:text-green-400">{formatNumber(stats.day)} ₴</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[20px] p-5 flex items-center justify-between border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div>
                    <p className="text-[16px] font-bold text-gray-900 dark:text-white">В этом месяце</p>
                  </div>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400">{formatNumber(stats.month)} ₴</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[20px] p-5 flex items-center justify-between border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div>
                    <p className="text-[16px] font-bold text-gray-900 dark:text-white">За год</p>
                  </div>
                  <p className="text-xl font-black text-purple-600 dark:text-purple-400">{formatNumber(stats.year)} ₴</p>
                </div>
              </div>
              
              <p className="text-[13px] font-medium text-gray-400 text-center mt-8 bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">Аналитика строится на основе карточек, перенесенных в колонку "Завершено".</p>
            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* 📝 МОДАЛКА КАРТОЧКИ (EDIT / CREATE) */}
      {/* ========================================== */}
      {isModalOpen && editingDeal && (
        <div className="fixed inset-0 z-[150] bg-gray-950/80 backdrop-blur-sm flex flex-col justify-end md:items-center md:justify-center p-0 md:p-4 animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-gray-900 w-full md:max-w-md h-[95vh] md:h-auto md:max-h-[90vh] rounded-t-[32px] md:rounded-[32px] shadow-2xl flex flex-col animate-slide-up relative" onClick={e => e.stopPropagation()}>
            
            {/* ШАПКА МОДАЛКИ */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-800/20 md:rounded-t-[32px]">
              <h2 className="text-[18px] font-black text-gray-900 dark:text-white flex items-center gap-2">
                {editingDeal.id ? 'Карточка сделки' : 'Новая сделка'}
                {editingDeal.orderMessageId && <span className="bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900 text-[10px] px-2.5 py-1 rounded-full uppercase font-black shadow-sm">Авто-заказ</span>}
              </h2>
              <div className="flex items-center gap-2">
                {editingDeal.id && (
                  <>
                    <button 
                      onClick={() => handleArchiveDeal(editingDeal.id, !editingDeal.isArchived)} 
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm ${editingDeal.isArchived ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-amber-500'}`}
                      title={editingDeal.isArchived ? "Вернуть из архива" : "В архив"}
                    >
                      <Archive size={18} />
                    </button>
                    <button onClick={handleDeleteDeal} className="w-10 h-10 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-500/10 border border-red-100 dark:border-red-900/50 text-red-500 flex items-center justify-center transition-colors shadow-sm">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center transition-colors ml-2 shadow-sm">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* КОНТЕНТ МОДАЛКИ */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              
              {/* Выбор статуса */}
              <div>
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Статус этапа</label>
                <div className="grid grid-cols-2 gap-3">
                  {COLUMNS.map(col => (
                    <button 
                      key={col.id}
                      onClick={() => setEditingDeal({ ...editingDeal, status: col.id })}
                      className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[14px] font-bold transition-all border ${
                        editingDeal.status === col.id 
                          ? `${col.bg} border-transparent ${col.text} shadow-sm` 
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <col.icon size={18} /> {col.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Основные поля */}
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-inner">
                <div>
                  <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Суть заказа / Название</label>
                  <input 
                    type="text" 
                    value={editingDeal.title}
                    onChange={e => setEditingDeal({ ...editingDeal, title: e.target.value })}
                    placeholder="Напр. Дизайн сайта"
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-[16px] px-4 py-3.5 text-[16px] font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><User size={14}/> Клиент</label>
                    <input 
                      type="text" 
                      value={editingDeal.clientName}
                      onChange={e => setEditingDeal({ ...editingDeal, clientName: e.target.value })}
                      placeholder="Имя, Контакт..."
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-[16px] px-4 py-3.5 text-[15px] font-medium text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                    />
                  </div>
                  <div className="md:w-1/3">
                    <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><DollarSign size={14}/> Бюджет</label>
                    <input 
                      type="text" 
                      value={editingDeal.amount}
                      onChange={e => setEditingDeal({ ...editingDeal, amount: e.target.value })}
                      placeholder="Напр. 500$"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-[16px] px-4 py-3.5 text-[15px] font-black text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Теги */}
              <div>
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Tag size={14}/> Цветные Метки</label>
                <div className="flex flex-wrap gap-2.5">
                  {AVAILABLE_TAGS.map(color => {
                    const isSelected = editingDeal.tags.includes(color);
                    return (
                      <button
                        key={color}
                        onClick={() => toggleTag(color)}
                        className={`w-10 h-10 rounded-full ${color} flex items-center justify-center transition-transform shadow-sm ${isSelected ? 'ring-2 ring-offset-2 dark:ring-offset-gray-900 ring-blue-500 scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                      >
                        {isSelected && <CheckCircle2 size={18} className="text-white" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Заметки */}
              <div>
                <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><AlignLeft size={14}/> Внутренние записи</label>
                <textarea 
                  value={editingDeal.notes}
                  onChange={e => setEditingDeal({ ...editingDeal, notes: e.target.value })}
                  placeholder="Запишите сюда детали заказа, адрес доставки, предпочтения клиента."
                  className="w-full bg-yellow-50/50 dark:bg-amber-500/10 border border-yellow-200 dark:border-amber-500/30 rounded-[20px] p-5 text-[15px] font-medium text-gray-800 dark:text-amber-100/90 placeholder-gray-400 dark:placeholder-amber-500/50 outline-none resize-none h-36 custom-scrollbar transition-colors shadow-inner"
                />
              </div>

            </div>

            {/* ФУТЕР МОДАЛКИ */}
            <div className="p-4 md:p-6 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-800/20 md:rounded-b-[32px] pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <button 
                onClick={handleSaveDeal}
                disabled={isSaving}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-[20px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25 disabled:opacity-50 text-[16px]"
              >
                {isSaving ? <><Loader2 size={20} className="animate-spin" /> Сохранение...</> : 'Сохранить сделку'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
