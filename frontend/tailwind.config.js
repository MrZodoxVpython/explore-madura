/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { forest: '#123d35', leaf: '#2d725b', sand: '#f4efe5', coral: '#e58b62' }, fontFamily: { sans: ['DM Sans','sans-serif'], display: ['Playfair Display','serif'] } } },
  plugins: []
};
