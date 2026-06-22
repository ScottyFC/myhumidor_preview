import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Theme-aware palette — values come from CSS vars (light/dark) so the
        // whole app flips with a single class. Channel format keeps /opacity working.
        ember: {
          50: 'rgb(var(--ember-50) / <alpha-value>)',
          100: 'rgb(var(--ember-100) / <alpha-value>)',
          200: 'rgb(var(--ember-200) / <alpha-value>)',
          300: 'rgb(var(--ember-300) / <alpha-value>)',
          400: 'rgb(var(--ember-400) / <alpha-value>)',
          600: 'rgb(var(--ember-600) / <alpha-value>)',
          800: 'rgb(var(--ember-800) / <alpha-value>)',
          900: 'rgb(var(--ember-900) / <alpha-value>)',
        },
        leather: {
          DEFAULT: 'rgb(var(--leather) / <alpha-value>)',
          dark: 'rgb(var(--leather-dark) / <alpha-value>)',
          deep: 'rgb(var(--leather-deep) / <alpha-value>)',
        },
        smoke: {
          50: 'rgb(var(--smoke-50) / <alpha-value>)',
          100: 'rgb(var(--smoke-100) / <alpha-value>)',
          200: 'rgb(var(--smoke-200) / <alpha-value>)',
          300: 'rgb(var(--smoke-300) / <alpha-value>)',
          400: 'rgb(var(--smoke-400) / <alpha-value>)',
          500: 'rgb(var(--smoke-500) / <alpha-value>)',
          600: 'rgb(var(--smoke-600) / <alpha-value>)',
          700: 'rgb(var(--smoke-700) / <alpha-value>)',
          800: 'rgb(var(--smoke-800) / <alpha-value>)',
          900: 'rgb(var(--smoke-900) / <alpha-value>)',
        },
        char: 'rgb(var(--char) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
      },
      letterSpacing: {
        tightest: '-0.04em',
        widest: '0.25em',
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.25, 1, 0.5, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'ember-pulse': 'ember-pulse 3.2s ease-in-out infinite',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'ember-pulse': {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
