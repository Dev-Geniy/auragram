import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

const LoginPage = () => {
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      // Вызываем окно авторизации Google
      await signInWithPopup(auth, googleProvider);
      
      // Успешный вход! 
      // Наш слушатель onAuthStateChanged в App.tsx сам поймает пользователя
      // и автоматически перенаправит его в чат.
    } catch (err: any) {
      console.error('Ошибка авторизации:', err);
      setError('Не удалось войти. Попробуйте еще раз.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Auragram
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enterprise Messenger
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Показываем ошибку, если она есть */}
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-100">
              {error}
            </div>
          )}
          
          <button
            type="button"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand transition-colors"
            onClick={handleGoogleLogin}
          >
            Войти через Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
