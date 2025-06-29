/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#1e3a8a',
          light: '#3b82f6',
          DEFAULT: '#3b82f6',
        },
        secondary: {
          dark: '#1e40af',
          light: '#60a5fa',
          DEFAULT: '#60a5fa',
        },
        accent: '#dbeafe',
        background: '#f8fafc',
        surface: '#ffffff',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
}