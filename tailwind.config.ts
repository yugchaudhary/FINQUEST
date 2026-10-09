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
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        'border-light': 'var(--border-light)',
        
        // Core backgrounds (legacy, keeping just in case)
        gambit: {
          bg: 'var(--background)',
          surface: 'var(--surface)',
          'surface-2': 'var(--surface-2)',
          border: 'var(--border)',
        accent: 'var(--accent)',
          'border-light': 'var(--border-light)',
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
          DEFAULT: '#5eb3d1', // Updated to match logo light blue
          hover: '#4ea2c0',
          dark: '#3e91b0',
          bg: 'rgba(94, 179, 209, 0.1)',
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
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.5)' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(94, 179, 209, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(94, 179, 209, 0.6)' },
        },
      },
      animation: {
        'pulse-live': 'pulse-live 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
