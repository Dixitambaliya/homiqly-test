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
          dark: '#0F4C5C',  // Dark teal
          DEFAULT: '#3BACB6', // Medium teal
          light: '#5ADBFF',  // Light blue/cyan
        },
        secondary: {
          dark: '#0A3A47',
          DEFAULT: '#2A8D9C',
          light: '#7EEAFD',
        },
        accent: '#E0FBFC',
        background: '#F0F7F8',
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