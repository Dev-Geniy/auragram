import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { useAuthStore } from './store/useAuthStore';
import LoginPage from './pages/LoginPage';

const App = () => {
  const { user, isLoading, setUser, setLoading } = useAuthStore();

  // Слушаем изменения статуса авторизации из Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Если нет пользователя - показываем логин */}
        <Route 
          path="/login" 
          element={!user ? <LoginPage /> : <Navigate to="/" />} 
        />
        
        {/* Главная страница чата (пока заглушка) */}
        <Route 
          path="/" 
          element={
            user ? (
              <div className="min-h-screen flex items-center justify-center text-2xl font-bold">
                Добро пожаловать в Auragram, {user.displayName || 'Пользователь'}!
              </div>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
