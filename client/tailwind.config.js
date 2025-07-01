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
          dark: '#007867',
          DEFAULT: '#00A76F',
          light: '#5BE49B',
        },
        secondary: {
          dark: '#0A3A47',
          DEFAULT: '#2A8D9C',
          light: '#7EEAFD',
        },
        text:{
          primary: '#141A21',
          secondary: '#1C252E',
          muted: '#454F5B',
        },
        accent: '#E0FBFC',
        background: '#F9FAFB',
        backgroundSecondary: '#F4F6F8',
        backgroundTertiary: '#DFE3E8',
        surface: '#FFFFFF',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}