import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "auragram-enterprise.firebaseapp.com",
  projectId: "auragram-enterprise",
  storageBucket: "auragram-enterprise.firebasestorage.app",
  messagingSenderId: "1089884500236",
  appId: "1:1089884500236:web:6b030acbca7628d543d929"
};

// Инициализация Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // ЭКСПОРТИРУЕМ STORAGE
export const googleProvider = new GoogleAuthProvider();
