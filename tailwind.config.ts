import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'industrial-bg': '#071426',
        'industrial-dark': '#0A1B33',
        'industrial-darker': '#08111F',
        'industrial-card': '#0B213F',
        'industrial-border': '#1E90FF',
        'industrial-border-light': '#2CC8FF',
        'industrial-text': '#EAF4FF',
        'industrial-text-secondary': '#8FB3D9',
        'industrial-success': '#22C55E',
        'industrial-warning': '#FACC15',
        'industrial-error': '#EF4444',
        'industrial-info': '#38BDF8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(30, 144, 255, 0.5), 0 0 10px rgba(44, 200, 255, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 10px rgba(30, 144, 255, 0.8), 0 0 20px rgba(44, 200, 255, 0.5)',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;


