/** @type {import('tailwindcss').Config} */
// نفس الثيم الذي كان يُعرَّف عبر cdn.tailwindcss.com — الآن مبني محلياً
// المصادر: الواجهة (app.js) + قالب HTML داخل (index.tsx)
export default {
  content: ['./public/static/app.js', './src/index.tsx'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eef7f5', 100: '#d7ece8', 200: '#b0d9d1', 300: '#7fc0b4', 400: '#4ba392', 500: '#0f766e', 600: '#0d5c4d', 700: '#0a4a3f', 800: '#083a32', 900: '#062c26' },
        gold: { 50: '#fbf8ec', 100: '#f5edc8', 200: '#ecdb8f', 300: '#e0c55a', 400: '#d4af37', 500: '#b8942a', 600: '#96761f', 700: '#775d1b', 800: '#644d1d', 900: '#55411c' },
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        amiri: ['Amiri', 'serif'],
      },
    },
  },
}
