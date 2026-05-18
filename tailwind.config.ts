import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/order/**/*.{js,ts,jsx,tsx}',
    './app/admin/**/*.{js,ts,jsx,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#1a1109',
        },
      },
      screens: {
        xs: '375px',
      },
      animation: {
        'slide-up':   'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'fade-in':    'fadeIn 0.2s ease',
        'bounce-sm':  'bounceSm 0.3s ease',
        'spin-slow':  'spin 1.5s linear infinite',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        bounceSm: {
          '0%,100%': { transform: 'scale(1)' },
          '50%':     { transform: 'scale(0.95)' },
        },
      },
      boxShadow: {
        'app':      '0 0 60px -20px rgba(0,0,0,0.25)',
        'card':     '0 2px 12px -4px rgba(0,0,0,0.08)',
        'float':    '0 8px 32px -8px rgba(217,119,6,0.4)',
        'sheet':    '0 -8px 40px -8px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
} satisfies Config
