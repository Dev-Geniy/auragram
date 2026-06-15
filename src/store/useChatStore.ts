import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatState {
  soundEnabled: boolean;
  pushEnabled: boolean;
  activeChatId: string | null;
  setSoundEnabled: (val: boolean) => void;
  setPushEnabled: (val: boolean) => void;
  setActiveChatId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      pushEnabled: true,
      activeChatId: null,
      setSoundEnabled: (val) => set({ soundEnabled: val }),
      setPushEnabled: (val) => set({ pushEnabled: val }),
      setActiveChatId: (id) => set({ activeChatId: id }),
    }),
    {
      name: 'chat-preferences-storage', // Сохраняем настройки в localStorage
      partialize: (state) => ({ soundEnabled: state.soundEnabled, pushEnabled: state.pushEnabled }), // Сохраняем только настройки
    }
  )
);
