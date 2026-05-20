/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        primary: '#1d2361',
        'primary-container': '#343a79',
        'on-primary': '#ffffff',
        'on-primary-container': '#a1a7ed',
        secondary: '#5e5e5e',
        'on-surface': '#191c1e',
        'on-surface-variant': '#444651',
        surface: '#f7f9fb',
        'surface-container': '#eceef0',
        'surface-container-low': '#f2f4f6',
        'surface-container-high': '#e6e8ea',
        'surface-container-highest': '#e0e3e5',
        'surface-container-lowest': '#ffffff',
        'outline-variant': '#c5c5d3',
        outline: '#757682',
        error: '#ba1a1a',
      },
    },
  },
  plugins: [],
}
