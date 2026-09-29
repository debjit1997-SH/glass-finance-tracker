/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'rgba(15, 23, 42, 0.65)',
          'bg-light': 'rgba(255, 255, 255, 0.08)',
          'bg-card': 'rgba(30, 41, 59, 0.55)',
          'bg-hover': 'rgba(255, 255, 255, 0.12)',
          border: 'rgba(255, 255, 255, 0.12)',
          'border-highlight': 'rgba(255, 255, 255, 0.25)',
        }
      },
      backdropBlur: {
        xs: '2px',
        glass: '16px',
        heavy: '24px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-card': '0 10px 30px -5px rgba(0, 0, 0, 0.4), 0 0 1px 1px rgba(255, 255, 255, 0.1) inset',
        'glass-glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'glass-glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.3)',
        'glass-glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.3)',
        'glass-glow-rose': '0 0 25px -5px rgba(244, 63, 94, 0.3)',
        'glass-glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
