import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyChHiBebIPnMxRAV8Qc78GlmhIQDYGo61Y",
  authDomain: "auragram-enterprise.firebaseapp.com",
  projectId: "auragram-enterprise",
  storageBucket: "auragram-enterprise.firebasestorage.app",
  messagingSenderId: "1089884500236",
  appId: "1:1089884500236:web:6b030acbca7628d543d929"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);

// Экспортируем сервисы, чтобы использовать их по всему приложению
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
