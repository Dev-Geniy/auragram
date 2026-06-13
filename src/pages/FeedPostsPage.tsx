import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, query, orderBy, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import ProfileModal from '../components/ProfileModal';
import { 
  Sparkles, MessageSquare, Plus, X, UserPlus, Image as ImageIcon, 
  FileText, ShoppingBag, AlertCircle, Calendar, RefreshCw, Layers, UploadCloud
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: string;
  description: string;
  imageUrl: string;
}

interface FirestorePost {
  id: string;
  title: string;
  text: string;
  imageUrl: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'classic' | 'avatar_update';
  createdAt: any;
}

interface FeedItem {
  id: string;
  type: 'product' | 'classic' | 'registration' | 'avatar_update';
  timestamp: number;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title?: string;
  text?: string;
  price?: string;
  imageUrl?: string;
}

export default function FeedPostsPage() {
  const { user } = useAuthStore();
  
  // Состояния данных
  const [usersList, setUsersList] = useState<any[]>([]);
  const [classicPosts, setClassicPosts] = useState<FirestorePost[]>([]);
  
  // Разделяем загрузку, чтобы точно знать, когда оба потока данных готовы
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const isLoading = isLoadingUsers || isLoadingPosts;

  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'classic' | 'events'>('all');

  // Состояние для предпросмотра профиля
  const [previewProfile, setPreviewProfile] = useState<any | null>(null);

  // Состояния формы создания поста
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);

  // 1. РЕАКТИВНАЯ ЗАГРУЗКА ДАННЫХ (onSnapshot)
  useEffect(() => {
    if (!user) return;

    // Слушатель списка пользователей (для товаров и системных уведомлений)
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const loadedUsers: any[] = [];
      snapshot.forEach((doc) => {
        loadedUsers.push({ id: doc.id, ...doc.data() });
      });
      setUsersList(loadedUsers);
      setIsLoadingUsers(false);
    }, (error) => {
      console.error('Ошибка загрузки пользователей:', error);
      setIsLoadingUsers(false);
    });

    // Слушатель постов
    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const loadedPosts: FirestorePost[] = [];
      snapshot.forEach((doc) => {
        loadedPosts.push({ id: doc.id, ...doc.data() } as FirestorePost);
      });
      setClassicPosts(loadedPosts);
      setIsLoadingPosts(false);
    }, (error) => {
      console.error('Ошибка загрузки постов:', error);
      setIsLoadingPosts(false);
    });

    // Очищаем слушатели при размонтировании компонента
    return () => {
      unsubscribeUsers();
      unsubscribePosts();
    };
  }, [user]);

  // Проверка лимита: количество постов пользователя за сегодня
  const todayPostsCount = useMemo(() => {
    if (!user) return 0;
    const today = new Date();
    return classicPosts.filter(post => {
      if (post.userId !== user.uid || post.type !== 'classic') return false;
      if (!post.createdAt) return false; // Игнорируем посты, которые еще не получили timestamp от сервера
      
      const postDate = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
      return (
        postDate.getDate() === today.getDate() &&
        postDate.getMonth() === today.getMonth() &&
        postDate.getFullYear() === today.getFullYear()
      );
    }).length;
  }, [classicPosts, user]);

  // 2. Сборка единого сквозного таймлайна
  const timelineItems = useMemo(() => {
    const items: FeedItem[] = [];

    // А) Добавление товаров из бизнес-аккаунтов
    usersList.forEach(u => {
      if (u.type === 'business' && u.products && Array.isArray(u.products)) {
        u.products.forEach((prod: Product) => {
          items.push({
            id: `prod_${prod.id}`,
            type: 'product',
            timestamp: Number(prod.id) || Date.now(),
            authorId: u.id,
            authorName: u.name || 'Бизнес аккаунт',
            authorAvatar: u.avatar,
            title: prod.name,
            text: prod.description,
            price: prod.price,
            imageUrl: prod.imageUrl
          });
        });
      }

      // Б) Системные уведомления о регистрации новых пользователей
      if (u.createdAt && u.isPublicJoin !== false) {
        const regTime = new Date(u.createdAt).getTime();
        items.push({
          id: `reg_${u.id}`,
          type: 'registration',
          timestamp: regTime,
          authorId: u.id,
          authorName: u.name || 'Новый пользователь',
          authorAvatar: u.avatar
        });
      }
    });

    // В) Добавление пользовательских текстовых постов
    classicPosts.forEach(p => {
      // Поддержка мгновенного отображения (когда createdAt еще null при локальном сохранении)
      const postTime = p.createdAt?.toMillis ? p.createdAt.toMillis() : (p.createdAt ? new Date(p.createdAt).getTime() : Date.now());
      items.push({
        id: p.id,
        type: p.type || 'classic',
        timestamp: postTime,
        authorId: p.userId,
        authorName: p.userName || 'Автор',
        authorAvatar: p.userAvatar,
        title: p.title,
        text: p.text,
        imageUrl: p.imageUrl
      });
    });

    // Сортировка по убыванию времени (свежие сверху)
    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [usersList, classicPosts]);

  // Фильтрация по вкладкам интерфейса
  const filteredTimeline = useMemo(() => {
    return timelineItems.filter(item => {
      if (activeTab === 'all') return true;
      if (activeTab === 'products') return item.type === 'product';
      if (activeTab === 'classic') return item.type === 'classic';
      if (activeTab === 'events') return item.type === 'registration' || item.type === 'avatar_update';
      return true;
    });
  }, [timelineItems, activeTab]);

  // Загрузка картинки через ImgBB
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImg(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY || '22de10db6eb1f3ec3fca012dcc566961'; 
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      if (data.success) {
        setImageUrl(data.data.url);
      } else {
        alert('Ошибка при загрузке изображения на сервер');
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      alert('Произошла ошибка при загрузке. Проверьте подключение.');
    } finally {
      setIsUploadingImg(false);
      e.target.value = '';
    }
  };

  // 3. Обработчик отправки публикации
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim() || todayPostsCount >= 2 || isSending) return;

    setIsSending(true);
    try {
      const currentUserData = usersList.find(u => u.id === user.uid);
      const authorName = currentUserData?.name || user.displayName || 'Пользователь';
      const authorAvatar = currentUserData?.avatar || user.photoURL || '';

      await addDoc(collection(db, 'posts'), {
        title: title.trim(),
        text: text.trim(),
        imageUrl: imageUrl.trim(),
        userId: user.uid,
        userName: authorName,
        userAvatar: authorAvatar,
        type: 'classic',
        createdAt: serverTimestamp()
      });

      setTitle('');
      setText('');
      setImageUrl('');
      setIsCreating(false);
      // УДАЛЕНО: await fetchData(); — Теперь onSnapshot обновит всё автоматически!
    } catch (error) {
      console.error('Ошибка добавления публикации в ленту:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Открытие профиля автора
  const handleOpenProfile = (authorId: string) => {
    const profile = usersList.find(u => u.id === authorId);
    if (profile) {
      setPreviewProfile(profile);
    }
  };

  const formatItemDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-6 md:p-10 select-none relative">
      <div className="max-w-4xl mx-auto">
        
        {/* ХЕДЕР СТРАНИЦЫ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-950 tracking-tight flex items-center gap-3">
              Глобальная лента
              <Layers size={22} className="text-gray-400" />
            </h1>
            <p className="text-sm text-gray-400 mt-1.5 font-medium">Единый поток событий, предложений и обновлений сети AuraSync</p>
          </div>
          
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="inline-flex items-center justify-center gap-2 bg-gray-950 hover:bg-gray-800 text-white px-5 py-3.5 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all shadow-md active:scale-95"
          >
            {isCreating ? <X size={15} /> : <Plus size={15} />}
            {isCreating ? 'Закрыть форму' : 'Создать публикацию'}
          </button>
        </div>

        {/* ФОРМА ПУБЛИКАЦИИ */}
        {isCreating && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200/60 shadow-lg shadow-gray-200/20 mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-brand" /> Создание новой публикации
              </h3>
              <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${todayPostsCount >= 2 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>
                Лимит на сегодня: {todayPostsCount} / 2
              </span>
            </div>

            {todayPostsCount >= 2 ? (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-600 flex items-center gap-3">
                <AlertCircle size={18} />
                Вы исчерпали суточный лимит публикаций. Добавление текстовых постов заблокировано до завтра.
              </div>
            ) : (
              <form onSubmit={handleCreatePost} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Заголовок публикации (необязательно)" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200/60 rounded-xl px-4 py-3.5 text-sm focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all font-semibold text-gray-900"
                />
                
                <textarea 
                  placeholder="О чем вы хотите рассказать сообществу?..." 
                  value={text}
                  onChange={e => setText(e.target.value)}
                  required
                  className="w-full bg-gray-50 border border-gray-200/60 rounded-xl px-4 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand outline-none transition-all resize-none h-28 font-medium text-gray-900"
                />

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full flex items-center gap-3 bg-gray-50 border border-gray-200/60 rounded-xl px-4 py-3 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 focus-within:bg-white transition-all">
                    <ImageIcon size={18} className="text-gray-400 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Прямая ссылка на изображение" 
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none font-medium text-gray-900"
                    />
                  </div>
                  <label className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-3 rounded-xl text-xs font-bold cursor-pointer transition-all border border-gray-200/50">
                    {isUploadingImg ? <RefreshCw size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                    {isUploadingImg ? 'Загрузка...' : 'Выбрать файл'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload} 
                      disabled={isUploadingImg}
                    />
                  </label>
                </div>

                {imageUrl && (
                  <div className="mt-3 relative inline-block rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                    <img src={imageUrl} alt="Preview" className="h-24 w-auto object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setImageUrl('')}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={!text.trim() || isSending || isUploadingImg}
                    className="bg-gray-950 text-white px-6 py-3 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-gray-800 disabled:opacity-40 transition-all flex items-center gap-2"
                  >
                    {isSending && <RefreshCw size={14} className="animate-spin" />}
                    Опубликовать пост
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* НАВИГАЦИОННЫЕ ВКЛАДКИ */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-8 text-xs font-bold scrollbar-none border-b border-gray-200/40">
          <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-gray-950 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200/60 hover:text-gray-900'}`}>Все события</button>
          <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'products' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200/60 hover:text-gray-900'}`}>Товары бизнес-витрин</button>
          <button onClick={() => setActiveTab('classic')} className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'classic' ? 'bg-gray-950 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200/60 hover:text-gray-900'}`}>Публикации участников</button>
          <button onClick={() => setActiveTab('events')} className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${activeTab === 'events' ? 'bg-gray-950 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200/60 hover:text-gray-900'}`}>Инфо-поводы</button>
        </div>

        {/* ТАЙМЛАЙН */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-white rounded-3xl p-6 border border-gray-100 h-48 animate-pulse" />
            ))}
          </div>
        ) : filteredTimeline.length > 0 ? (
          <div className="space-y-6">
            {filteredTimeline.map(item => (
              <div 
                key={item.id} 
                className="bg-white rounded-3xl p-6 border border-gray-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.03)] hover:border-gray-300/80 transition-all duration-300 flex flex-col sm:flex-row gap-5"
              >
                {/* Изображение поста */}
                {item.imageUrl && (
                  <div className="w-full sm:w-44 h-44 rounded-2xl overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                    <img src={item.imageUrl} alt={item.title || 'Post cover'} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Контентная часть */}
                <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                  <div>
                    {/* Мета-хедер автора (С КЛИКОМ НА ПРОФИЛЬ) */}
                    <div className="flex items-center justify-between gap-4 mb-3.5">
                      <div 
                        className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleOpenProfile(item.authorId)}
                      >
                        <img 
                          src={item.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.authorName)}&background=random`} 
                          alt={item.authorName} 
                          className="w-9 h-9 rounded-xl object-cover border border-gray-100 bg-gray-50" 
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-gray-950 truncate hover:text-brand transition-colors">{item.authorName}</h4>
                          <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 mt-0.5">
                            <Calendar size={10} /> {formatItemDate(item.timestamp)}
                          </p>
                        </div>
                      </div>

                      {/* Категория карточки */}
                      <div>
                        {item.type === 'product' && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200/50 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Товар</span>
                        )}
                        {item.type === 'classic' && (
                          <span className="bg-gray-100 text-gray-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Пост</span>
                        )}
                        {item.type === 'registration' && (
                          <span className="bg-green-50 text-green-700 border border-green-200/50 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">Welcome</span>
                        )}
                      </div>
                    </div>

                    {/* Тело контента */}
                    {item.type === 'registration' ? (
                      <div className="p-4 bg-green-50/40 border border-green-100/50 rounded-2xl flex items-center gap-3.5">
                        <div className="w-9 h-9 bg-green-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-green-500/20">
                          <UserPlus size={16} />
                        </div>
                        <p className="text-xs text-gray-600 font-medium leading-relaxed">
                          Радар зафиксировал нового участника в сети! Добро пожаловать, <span className="font-bold text-gray-900">{item.authorName}</span>. Профиль открыт для защищенного нетворкинга.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {item.title && <h3 className="text-base font-black text-gray-950 leading-snug tracking-tight">{item.title}</h3>}
                        {item.text && <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-3 whitespace-pre-wrap">{item.text}</p>}
                      </div>
                    )}
                  </div>

                  {/* Футер карточки с кнопками действий */}
                  {item.type !== 'registration' && (
                    <div className="flex items-center justify-between gap-4 pt-5 mt-4 border-t border-gray-100 shrink-0">
                      <div>
                        {item.type === 'product' && item.price && (
                          <span className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                            {item.price}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.type === 'product' && (
                          <Link 
                            to={`/shop/${item.authorId}`} 
                            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-100 transition-colors flex items-center gap-1.5"
                          >
                            <ShoppingBag size={14} /> В магазин
                          </Link>
                        )}
                        <Link 
                          to="/chats" 
                          state={{ selectedUserId: item.authorId }}
                          className="px-4 py-2 bg-gray-950 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <MessageSquare size={14} /> Написать
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-gray-200/60 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mx-auto mb-4 border border-gray-100">
              <Sparkles size={26} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Лента пуста</h3>
            <p className="text-sm text-gray-400 max-w-xs mx-auto font-medium leading-relaxed">В выбранной категории событий пока нет публикаций от участников.</p>
          </div>
        )}

      </div>

      {/* ======= РЕНДЕР МОДАЛКИ ПРЕДПРОСМОТРА ПРОФИЛЯ ======= */}
      {previewProfile && (
        <ProfileModal 
          profile={previewProfile} 
          onClose={() => setPreviewProfile(null)} 
        />
      )}
      
    </div>
  );
}
