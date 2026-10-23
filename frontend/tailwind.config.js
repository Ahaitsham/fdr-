export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    colors: { brand: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' } },
    keyframes: {
      fadeUp: { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'none' } },
      fade: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
      slideLeft: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'none' } },
      pop: { '0%': { opacity: 0, transform: 'scale(.96)' }, '100%': { opacity: 1, transform: 'none' } },
    },
    animation: { 'fade-up': 'fadeUp .45s ease both', fade: 'fade .2s ease both', 'slide-left': 'slideLeft .25s ease both', pop: 'pop .2s ease both' },
  } },
  plugins: [],
};
