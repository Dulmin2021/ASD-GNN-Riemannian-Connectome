/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eff6ff',
          100: '#dbeafe',
          600: '#002060',
          700: '#001a50',
          800: '#001240',
          900: '#000a30',
        },
        clinical: {
          green:  '#16a34a',
          amber:  '#d97706',
          red:    '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
