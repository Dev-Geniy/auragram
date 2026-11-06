import { useState, useEffect, useRef, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile, signOut } from 'firebase/auth';
import { Camera, Loader2, Moon, Sun, Volume2, Bell, Check, LogOut, Phone } from 'lucide-react';
import { db, auth } from '../services/firebase';
import { compressImage, uploadToImgBB } from '../services/upload';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { enablePush, isPushConfigured, PushStatus } from '../services/push';

interface Profile {
  name: string;
  role: string; // «О себе»
  avatar: string;
  contacts: { phone: string };
}

const EMPTY: Profile = { name: '', role: '', avatar: '', contacts: { phone: '' } };

const Toggle = ({ on }: { on: boolean }) => (
  <div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${on ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${on ? 'translate-x-6' : 'translate-x-0'}`} />
  </div>
);

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { soundEnabled, pushEnabled, setSoundEnabled, setPushEnabled } = useChatStore();
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [original, setOriginal] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const fileRef = useRef<HTMLInputElement>(null);
  const [pushState, setPushState] = useState<PushStatus | 'idle' | 'loading'>('idle');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const d = snap.exists() ? snap.data() : {};
        const loaded: Profile = {
          name: d.name || user.displayName || '',
          role: d.role || '',
          avatar: d.avatar || user.photoURL || '',
          contacts: { phone: d.contacts?.phone || '' },
        };
        setProfile(loaded);
        setOriginal(loaded);
      } catch (e) {
        console.error('Ошибка загрузки профиля:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  const isDirty = useMemo(() => !!original && JSON.stringify(profile) !== JSON.stringify(original), [profile, original]);

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDark(next);
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadToImgBB(await compressImage(file, 800));
      setProfile((p) => ({ ...p, avatar: url }));
    } catch {
      alert('Не удалось загрузить фото.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEnablePush = async () => {
    if (!user) return;
    setPushState('loading');
    try { setPushState(await enablePush(user.uid)); }
    catch (e) { console.error('Ошибка push:', e); setPushState('unsupported'); }
  };

  const handleSave = async () => {
    if (!user || !isDirty) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { ...profile, updatedAt: new Date().toISOString() }, { merge: true });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: profile.name, photoURL: profile.avatar });
        setUser({ ...auth.currentUser });
      }
      setOriginal(profile);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (e) {
      console.error('Ошибка сохранения профиля:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const block = 'bg-white dark:bg-gray-900 rounded-[24px] overflow-hidden border border-gray-200/50 dark:border-gray-800 mb-6';
  const row = 'flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors';
  const input = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-[15px] font-medium text-gray-900 dark:text-white outline-none focus:border-blue-500';

  if (isLoading) {
    return <div className="flex-1 flex justify-center items-center bg-gray-50 dark:bg-gray-950"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 pb-[calc(env(safe-area-inset-bottom)+80px)]">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl sticky top-0 z-20 border-b border-gray-200/60 dark:border-gray-800 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 flex items-center justify-between">
        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight ml-2">Настройки</h1>
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={`text-[14px] font-bold px-5 py-2 rounded-full transition-all flex items-center gap-1.5 ${
            showSuccess ? 'bg-green-500 text-white' : isDirty ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : showSuccess ? <><Check size={16} /> Сохранено</> : 'Сохранить'}
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-2">
        <div className={`${block} p-5 flex flex-col items-center gap-4`}>
          <div className="relative group cursor-pointer w-28 h-28" onClick={() => fileRef.current?.click()}>
            <img
              src={profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'U')}&background=random`}
              alt="Avatar"
              className="w-full h-full rounded-[28px] object-cover bg-gray-100 dark:bg-gray-800"
            />
            <div className="absolute inset-0 bg-black/40 rounded-[28px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
            {isUploading && <div className="absolute inset-0 bg-white/60 dark:bg-black/60 rounded-[28px] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}
            <input type="file" ref={fileRef} onChange={handleAvatar} accept="image/*" className="hidden" />
          </div>
          <div className="w-full space-y-3">
            <input className={input} placeholder="Имя" value={profile.name} maxLength={50} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <textarea className={`${input} resize-none`} rows={3} placeholder="О себе" value={profile.role} maxLength={200} onChange={(e) => setProfile({ ...profile, role: e.target.value })} />
            <div className="relative">
              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className={`${input} pl-11`} placeholder="Телефон (необязательно)" value={profile.contacts.phone} onChange={(e) => setProfile({ ...profile, contacts: { phone: e.target.value } })} />
            </div>
          </div>
        </div>

        <h2 className="text-[13px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-4 mb-3">Уведомления и вид</h2>
        <div className={block}>
          <div className={row} onClick={() => setSoundEnabled(!soundEnabled)}>
            <span className="flex items-center gap-3 text-[15px] font-bold text-gray-900 dark:text-white"><Volume2 size={18} /> Звук сообщений</span>
            <Toggle on={soundEnabled} />
          </div>
          <div className={row} onClick={() => setPushEnabled(!pushEnabled)}>
            <span className="flex items-center gap-3 text-[15px] font-bold text-gray-900 dark:text-white"><Bell size={18} /> Всплывающие уведомления</span>
            <Toggle on={pushEnabled} />
          </div>
          {isPushConfigured() && (
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
              <span className="text-[15px] font-bold text-gray-900 dark:text-white">
                Push, когда приложение закрыто
                <span className="block text-[12px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                  {pushState === 'granted' || (pushState === 'idle' && typeof Notification !== 'undefined' && Notification.permission === 'granted') ? 'Включено на этом устройстве'
                    : pushState === 'denied' ? 'Запрещено в настройках браузера'
                    : pushState === 'unsupported' ? 'Не поддерживается этим браузером'
                    : 'Выключено'}
                </span>
              </span>
              <button onClick={handleEnablePush} disabled={pushState === 'loading'} className="px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-bold disabled:opacity-50 flex items-center gap-1.5">
                {pushState === 'loading' ? <Loader2 size={14} className="animate-spin" /> : 'Включить'}
              </button>
            </div>
          )}
          <div className={row} onClick={toggleTheme}>
            <span className="flex items-center gap-3 text-[15px] font-bold text-gray-900 dark:text-white">{isDark ? <Moon size={18} /> : <Sun size={18} />} Тёмная тема</span>
            <Toggle on={isDark} />
          </div>
        </div>

        <button
          onClick={() => signOut(auth).catch((e) => console.error(e))}
          className="w-full flex items-center justify-center gap-2 py-4 bg-white dark:bg-gray-900 border border-rose-100 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-900/10 text-rose-500 font-bold rounded-[24px] transition-colors"
        >
          <LogOut size={20} /> Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
