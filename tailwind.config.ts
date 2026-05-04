import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      colors: {
        bg: {
          DEFAULT: '#fafafa',
          subtle: '#f4f4f5',
          dark: '#0b0b0f',
          'dark-subtle': '#13131a',
        },
        border: {
          DEFAULT: '#e4e4e7',
          dark: '#27272a',
        },
        accent: {
          DEFAULT: '#7c3aed',
          hover: '#6d28d9',
          glow: '#a78bfa',
        },
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(124, 58, 237, 0.45)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
