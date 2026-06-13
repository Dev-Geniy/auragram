import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const App = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col justify-center items-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-brand mb-4">Auragram Enterprise</h1>
          <p className="text-gray-500 font-medium">UI-движок и роутинг успешно инициализированы.</p>
        </div>
        <Routes>
          {/* В будущем здесь будут роуты: <Route path="/login" element={<LoginPage />} /> */}
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
