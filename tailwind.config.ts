import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        gambit: {
          bg: '#0a0a0f',
          surface: '#16161f',
          'surface-2': '#1e1e2d',
          border: '#2a2a3a',
          'border-light': '#3a3a4f',
        },
        // Team colors
        'gambit-red': {
          DEFAULT: '#ef4444',
          hover: '#dc2626',
          dark: '#b91c1c',
          bg: 'rgba(239, 68, 68, 0.1)',
          'bg-hover': 'rgba(239, 68, 68, 0.2)',
        },
        'gambit-blue': {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          dark: '#1d4ed8',
          bg: 'rgba(59, 130, 246, 0.1)',
          'bg-hover': 'rgba(59, 130, 246, 0.2)',
        },
        // Accent colors
        'gambit-gold': {
          DEFAULT: '#f59e0b',
          hover: '#d97706',
          dark: '#b45309',
          bg: 'rgba(245, 158, 11, 0.1)',
        },
        'gambit-purple': {
          DEFAULT: '#8b5cf6',
          hover: '#7c3aed',
          dark: '#6d28d9',
          bg: 'rgba(139, 92, 246, 0.1)',
        },
        // Status colors
        'profit-green': {
          DEFAULT: '#22c55e',
          bg: 'rgba(34, 197, 94, 0.1)',
        },
        'loss-red': {
          DEFAULT: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.1)',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-sm': ['2rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.5)' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(139, 92, 246, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)' },
        },
        'glow-red': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(239, 68, 68, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)' },
        },
        'glow-blue': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'rank-pulse': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'pulse-live': 'pulse-live 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'glow-red': 'glow-red 2s ease-in-out infinite',
        'glow-blue': 'glow-blue 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.5s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'rank-pulse': 'rank-pulse 0.6s ease-in-out',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-dark': 'linear-gradient(135deg, #0a0a0f 0%, #16161f 50%, #0a0a0f 100%)',
        'shimmer-gradient': 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.05), transparent)',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(139, 92, 246, 0.15)',
        'glow-md': '0 0 20px rgba(139, 92, 246, 0.25)',
        'glow-lg': '0 0 40px rgba(139, 92, 246, 0.35)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.25)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.25)',
        'glow-gold': '0 0 20px rgba(245, 158, 11, 0.25)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 10px 25px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}

export default config
