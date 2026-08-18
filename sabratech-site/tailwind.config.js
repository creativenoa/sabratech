/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#28315E',
        royal: '#1F327A',
        cyan: '#00A5E0',
        cream: '#F5F5F5',
        sand: '#D9D9D9',
        ink: '#292929',
      },
      fontFamily: {
        sans: ['Assistant', 'sans-serif'],
        serif: ['Rubik', 'sans-serif'] /* 'serif' token = display font */,
      },
    },
  },
  plugins: [],
}
