/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'Noto Sans Bengali', 'sans-serif'],
        sans: ['Inter', 'Noto Sans Bengali', 'sans-serif'],
        bengali: ['Noto Sans Bengali', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,43,38,0.04), 0 8px 24px -8px rgba(11,43,38,0.12)',
        glow: '0 0 0 4px rgba(15,118,110,0.12)',
      },
      backgroundImage: {
        'taka-gradient': 'linear-gradient(135deg, #0F766E 0%, #115E59 55%, #0B2B26 100%)',
        'gold-gradient': 'linear-gradient(135deg, #F5B841 0%, #D4A017 100%)',
      },
    },
  },
  daisyui: {
    themes: [
      {
        takasathi: {
          primary: '#0F766E',
          'primary-content': '#F0FDFA',
          secondary: '#D4A017',
          'secondary-content': '#241B02',
          accent: '#F5B841',
          'accent-content': '#241B02',
          neutral: '#0B2B26',
          'neutral-content': '#E7F3F0',
          'base-100': '#FFFFFF',
          'base-200': '#F5F7F6',
          'base-300': '#E7ECEA',
          'base-content': '#122320',
          info: '#0EA5E9',
          success: '#16A34A',
          warning: '#F59E0B',
          error: '#DC2626',
          '--rounded-box': '1rem',
          '--rounded-btn': '0.65rem',
          '--rounded-badge': '999px',
        },
      },
    ],
    darkTheme: 'takasathi',
  },
  plugins: [require('daisyui')],
};
