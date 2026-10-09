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
        'border-light': 'var(--border-light)',
        accent: 'var(--accent)',
        
        // Core backgrounds (legacy)
        gambit: {
          bg: 'var(--background)',
          surface: 'var(--surface)',
          'surface-2': 'var(--surface-2)',
          border: 'var(--border)',
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
          DEFAULT: '#5eb3d1',
          hover: '#4ea2c0',
          dark: '#3e91b0',
          bg: 'rgba(94, 179, 209, 0.1)',
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
          '50%': { opacity: '0.8', transform: 'scale(1.2)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-live': 'pulse-live 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'bounce-subtle': 'bounce-subtle 2s infinite',
      },
    },
  },
  plugins: [],
}

export default config
