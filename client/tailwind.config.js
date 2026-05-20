/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        fleet: {
          primary: 'var(--fleet-primary)',
          black: 'var(--fleet-black)',
          tertiary: 'var(--fleet-tertiary)',
          canvas: 'var(--fleet-canvas)',
          surface: 'var(--fleet-surface)',
          muted: 'var(--fleet-muted)',
          'muted-low': 'var(--fleet-muted-low)',
          line: 'var(--fleet-line)',
          ink: 'var(--fleet-ink)',
          'ink-muted': 'var(--fleet-ink-muted)',
          'primary-light': 'var(--fleet-primary-light)',
          'tertiary-light': 'var(--fleet-tertiary-light)',
        },
      },
      borderRadius: {
        DEFAULT: '0.25rem',
      },
    },
  },
  plugins: [],
}
