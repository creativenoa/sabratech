/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#28315E',
        royal: '#1F327A',
        /* DEFAULT is the accessible cyan (white text on it = 5.0:1). `bright` is the original brand cyan, for large decorative use only. */
        cyan: { DEFAULT: '#0099FF', bright: '#0099FF' },
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
