/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#eef1f7',
          100: '#d5dcec',
          200: '#aab8d9',
          300: '#7f94c6',
          400: '#5470b3',
          500: '#3a5a9e',
          600: '#2d4880',
          700: '#1B2A4A',
          800: '#162240',
          900: '#0F1923',
        },
        gold: {
          50:  '#fdf9ed',
          100: '#faf0cc',
          200: '#f4de98',
          300: '#eec864',
          400: '#E8C547',
          500: '#C9A227',
          600: '#a8851f',
          700: '#876818',
          800: '#664b11',
          900: '#45300a',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
