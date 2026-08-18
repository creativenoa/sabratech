/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#28315E',
        royal: '#1F327A',
        cream: '#F5F5F5',
        sand: '#D9D9D9',
        lightgray: '#D9D9D9',
        ink: '#292929',
      },
      fontFamily: {
        sans: ['Assistant', 'sans-serif'],
        serif: ['Rubik', 'sans-serif'] /* 'serif' token = display font */,
      },
      borderRadius: { arch: '999px 999px 0 0' },
    },
  },
  plugins: [],
}
