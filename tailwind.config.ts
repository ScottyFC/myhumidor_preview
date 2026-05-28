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
        // After-hours editorial palette
        ember: {
          50: '#FAEEDA',
          100: '#FAC775',
          200: '#EF9F27',
          400: '#BA7517',
          600: '#854F0B',
          800: '#633806',
          900: '#412402',
        },
        leather: {
          DEFAULT: '#4A2C1A',
          dark: '#2C1810',
          deep: '#1A0E08',
        },
        smoke: {
          50: '#F5F2EB',
          100: '#E8E4D9',
          200: '#C2C0B6',
          400: '#888780',
          600: '#5F5E5A',
          800: '#2C2C2A',
          900: '#1a1a18',
        },
        char: '#0F0A06',
        paper: '#FAEEDA',
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
