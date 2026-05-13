/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf5f8',
          100: '#f3e8ee',
          200: '#e8d2dd',
          300: '#d3aabe',
          400: '#bb7e9b',
          500: '#a45c7d',
          600: '#8a4767',
          700: '#723b56',
          800: '#5e3349',
          900: '#5e3c50',
        },
      },
    },
  },
  plugins: [],
};
