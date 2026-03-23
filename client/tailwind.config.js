/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          500: '#1565C0',
          600: '#0D47A1',
          700: '#1A237E',
        }
      }
    },
  },
  plugins: [],
}
