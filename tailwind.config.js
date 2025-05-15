/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4A6FA5',
          light: '#6B8DC1',
          dark: '#345282'
        },
        secondary: {
          DEFAULT: '#90A4AE',
          light: '#B0BEC5',
          dark: '#62757F'
        },
        background: {
          DEFAULT: '#F5F7FA',
          dark: '#2D3748'
        },
        card: {
          DEFAULT: '#FFFFFF',
          dark: '#3F4F68'
        },
        text: {
          DEFAULT: '#2D3748',
          secondary: '#718096',
          dark: '#E2E8F0',
          darkSecondary: '#A0AEC0'
        }
      },
      fontFamily: {
        sans: ['System', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 