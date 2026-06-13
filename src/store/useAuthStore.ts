import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, // Изначально пользователь не авторизован
  isLoading: true, // При загрузке приложения мы проверяем статус
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
