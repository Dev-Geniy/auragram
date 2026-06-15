import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Plus, MoreVertical, Trash2, X, User, DollarSign, 
  AlignLeft, Tag, CircleDashed, LayoutDashboard,
  CheckCircle2, Clock, Truck, Inbox
} from 'lucide-react';

// ==========================================
// ИНТЕРФЕЙСЫ
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
  
  // МОДАЛКА
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      
      // Сортируем новые сверху (по убыванию даты)
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
    // Прозрачность при перетаскивании
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = '0.4';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedDealId(null);
    if (e.target instanceof HTMLElement) e.target.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Необходимо для разрешения drop
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: DealStatus) => {
    e.preventDefault();
    if (!draggedDealId || !user) return;

    const dealToUpdate = deals.find(d => d.id === draggedDealId);
    if (!dealToUpdate || dealToUpdate.status === targetStatus) return;

    // Оптимистичное обновление UI (чтобы карточка прыгнула моментально)
    setDeals(prev => prev.map(d => d.id === draggedDealId ? { ...d, status: targetStatus } : d));

    try {
      await updateDoc(doc(db, 'crm_deals', draggedDealId), {
        status: targetStatus
      });
    } catch (error) {
      console.error("Ошибка при переносе:", error);
      // Firebase onSnapshot сам откатит изменения при ошибке
    }
  };

  // ==========================================
  // ЛОГИКА МОДАЛКИ (СОЗДАНИЕ / РЕДАКТИРОВАНИЕ)
  // ==========================================
  const openNewDealModal = (status: DealStatus = 'new') => {
    setEditingDeal({
      id: '',
      title: '',
      clientName: '',
      amount: '',
      status: status,
      notes: '',
      tags: [],
      createdAt: null,
      userId: user?.uid || ''
    });
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
        // Обновление
        await updateDoc(doc(db, 'crm_deals', editingDeal.id), {
          title: editingDeal.title,
          clientName: editingDeal.clientName,
          amount: editingDeal.amount,
          status: editingDeal.status,
          notes: editingDeal.notes,
          tags: editingDeal.tags
        });
      } else {
        // Создание
        await addDoc(collection(db, 'crm_deals'), {
          title: editingDeal.title,
          clientName: editingDeal.clientName,
          amount: editingDeal.amount,
          status: editingDeal.status,
          notes: editingDeal.notes,
          tags: editingDeal.tags,
          createdAt: serverTimestamp(),
          userId: user.uid
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Ошибка сохранения:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeal = async () => {
    if (!editingDeal?.id) return;
    if (window.confirm('Точно удалить карточку?')) {
      try {
        await deleteDoc(doc(db, 'crm_deals', editingDeal.id));
        setIsModalOpen(false);
      } catch (error) {
        console.error("Ошибка удаления:", error);
      }
    }
  };

  const toggleTag = (colorClass: string) => {
    if (!editingDeal) return;
    setEditingDeal(prev => {
      if (!prev) return prev;
      const hasTag = prev.tags.includes(colorClass);
      return {
        ...prev,
        tags: hasTag ? prev.tags.filter(t => t !== colorClass) : [...prev.tags, colorClass]
      };
    });
  };

  // ==========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ==========================================
  // Калькулятор суммы в колонке
  const getColumnTotal = (status: DealStatus) => {
    return deals
      .filter(d => d.status === status)
      .reduce((sum, deal) => {
        // Извлекаем только цифры из строки "1500 ₴" или "$ 50"
        const num = parseFloat(deal.amount.replace(/[^\d.-]/g, '')) || 0;
        return sum + num;
      }, 0);
  };

  const formatNumber = (num: number) => {
    if (num === 0) return '';
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#F2F2F7] dark:bg-gray-950 flex justify-center items-center transition-colors">
        <div className="animate-spin text-blue-500"><CircleDashed size={32} /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#F2F2F7] dark:bg-gray-950 transition-colors relative">
      
      {/* HEADER */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md sticky top-0 z-20 px-4 md:px-6 py-4 border-b border-gray-200/60 dark:border-gray-800 shrink-0 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <LayoutDashboard size={18} className="text-blue-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Smart CRM</h1>
        </div>
        <button 
          onClick={() => openNewDealModal('new')} 
          className="bg-blue-500 hover:bg-blue-600 text-white pl-3 pr-4 py-2 rounded-xl text-[13px] font-bold shadow-sm flex items-center gap-1 transition-transform active:scale-95"
        >
          <Plus size={16} /> Создать
        </button>
      </div>

      {/* KANBAN BOARD (Горизонтальный скролл) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar">
        <div className="flex gap-4 p-4 md:p-6 min-w-max h-full items-start">
          
          {COLUMNS.map(col => {
            const columnDeals = deals.filter(d => d.status === col.id);
            const totalStr = formatNumber(getColumnTotal(col.id));

            return (
              <div 
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="w-[280px] md:w-[300px] flex flex-col max-h-full bg-gray-100/50 dark:bg-gray-800/30 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shrink-0 transition-colors"
              >
                {/* Column Header */}
                <div className="p-3 pb-2 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.color}`} />
                    <h3 className="font-bold text-[14px] text-gray-900 dark:text-white">{col.title}</h3>
                    <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {columnDeals.length}
                    </span>
                  </div>
                  <button onClick={() => openNewDealModal(col.id)} className="text-gray-400 hover:text-blue-500 transition-colors p-1">
                    <Plus size={16} />
                  </button>
                </div>

                {/* Итоговая сумма колонки */}
                {totalStr && (
                  <div className="px-3 pb-2 shrink-0">
                    <p className={`text-[12px] font-black uppercase tracking-wider ${col.text}`}>∑ {totalStr}</p>
                  </div>
                )}

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pt-0 space-y-2">
                  {columnDeals.map(deal => (
                    <div 
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => openEditDealModal(deal)}
                      className="bg-white dark:bg-gray-900 p-3.5 rounded-[16px] shadow-sm border border-gray-200/60 dark:border-gray-800 cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors group"
                    >
                      {/* Теги */}
                      {deal.tags && deal.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {deal.tags.map(tag => (
                            <div key={tag} className={`w-8 h-1.5 rounded-full opacity-80 ${tag}`} />
                          ))}
                        </div>
                      )}
                      
                      {/* Заголовок */}
                      <h4 className="font-bold text-[14px] text-gray-900 dark:text-white leading-tight mb-1">
                        {deal.title || 'Без названия'}
                      </h4>
                      
                      {/* Клиент */}
                      {deal.clientName && (
                        <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-3">
                          <User size={12} /> {deal.clientName}
                        </p>
                      )}
                      
                      {/* Подвал карточки (Сумма) */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/60">
                        {deal.amount ? (
                          <span className="font-black text-[13px] text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                            {deal.amount}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium">Без суммы</span>
                        )}
                        {deal.notes && <AlignLeft size={14} className="text-gray-300 dark:text-gray-600" />}
                      </div>
                    </div>
                  ))}
                  
                  {columnDeals.length === 0 && (
                    <div className="h-20 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl m-1">
                      <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500">Пусто</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================== */}
      {/* МОДАЛКА КАРТОЧКИ (EDIT / CREATE) */}
      {/* ========================================== */}
      {isModalOpen && editingDeal && (
        <div className="fixed inset-0 z-[150] bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-gray-900 w-full md:max-w-md h-full md:h-auto md:max-h-[90vh] md:rounded-[2rem] shadow-2xl flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            
            {/* ШАПКА МОДАЛКИ */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">
                {editingDeal.id ? 'Редактировать сделку' : 'Новая сделка'}
              </h2>
              <div className="flex items-center gap-2">
                {editingDeal.id && (
                  <button onClick={handleDeleteDeal} className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-500/10 text-red-500 flex items-center justify-center transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* КОНТЕНТ МОДАЛКИ */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-6">
              
              {/* Выбор статуса (Для мобилок это заменяет drag-and-drop) */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Статус / Этап</label>
                <div className="grid grid-cols-2 gap-2">
                  {COLUMNS.map(col => (
                    <button 
                      key={col.id}
                      onClick={() => setEditingDeal({ ...editingDeal, status: col.id })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-bold transition-all border ${
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
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-[15px] font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><User size={12}/> Клиент</label>
                    <input 
                      type="text" 
                      value={editingDeal.clientName}
                      onChange={e => setEditingDeal({ ...editingDeal, clientName: e.target.value })}
                      placeholder="Имя, Ник..."
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><DollarSign size={12}/> Сумма</label>
                    <input 
                      type="text" 
                      value={editingDeal.amount}
                      onChange={e => setEditingDeal({ ...editingDeal, amount: e.target.value })}
                      placeholder="Напр. 500$"
                      className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-[14px] font-black text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Теги */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Tag size={12}/> Цветные метки</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map(color => {
                    const isSelected = editingDeal.tags.includes(color);
                    return (
                      <button
                        key={color}
                        onClick={() => toggleTag(color)}
                        className={`w-8 h-8 rounded-full ${color} flex items-center justify-center transition-transform ${isSelected ? 'ring-2 ring-offset-2 dark:ring-offset-gray-900 ring-blue-500 scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                      >
                        {isSelected && <CheckCircle2 size={16} className="text-white" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Заметки */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><AlignLeft size={12}/> Внутренние заметки</label>
                <textarea 
                  value={editingDeal.notes}
                  onChange={e => setEditingDeal({ ...editingDeal, notes: e.target.value })}
                  placeholder="Запишите сюда детали заказа, адрес доставки, предпочтения клиента. Эту информацию видите только вы."
                  className="w-full bg-yellow-50 dark:bg-amber-500/10 border border-yellow-200 dark:border-amber-500/30 rounded-xl p-3 text-[14px] text-gray-800 dark:text-amber-100 placeholder-gray-400 dark:placeholder-amber-500/50 outline-none resize-none h-32 custom-scrollbar transition-colors"
                />
              </div>

            </div>

            {/* ФУТЕР МОДАЛКИ (Кнопка сохранить) */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0 pb-safe">
              <button 
                onClick={handleSaveDeal}
                disabled={isSaving}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
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
