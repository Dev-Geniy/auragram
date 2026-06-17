import { create } from 'zustand';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Инициализация прослушивателя состояний
  onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      // Обновляем данные пользователя в Firestore при каждом входе
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Создаем профиль для нового пользователя
        await setDoc(userRef, {
          name: currentUser.displayName || 'Аноним',
          email: currentUser.email,
          avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'U')}&background=random`,
          type: 'personal',
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp()
        });
      } else {
        // Обновляем lastSeen
        await setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
      }
    }
    set({ user: currentUser, isLoading: false });
  });

  return {
    user: null,
    isLoading: true,
    setLoading: (loading) => set({ isLoading: loading }),
    setUser: (user) => set({ user }),
    
    loginWithGoogle: async () => {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error("Ошибка входа через Google:", error);
      }
    },
    
    logout: async () => {
      try {
        await firebaseSignOut(auth);
      } catch (error) {
        console.error("Ошибка при выходе:", error);
      }
    },
  };
});
