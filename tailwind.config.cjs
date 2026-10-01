module.exports = {
  darkMode: 'class',
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.{ts,tsx}', './utils/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        darkBg: '#020617',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};