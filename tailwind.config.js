/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Включаем поддержку темной темы по классу
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3b82f6', 
          dark: '#2563eb',
        }
      }
    },
  },
  plugins: [],
}
