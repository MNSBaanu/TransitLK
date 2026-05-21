/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: '#f7f9fb',
        outline: '#777681',
        'outline-variant': '#e2e8f0',
        'surface-container': '#eceef0',
        'surface-container-low': '#f2f4f6',
        'on-surface-variant': '#464650',
        depot: {
          navy: '#000249',
          maroon: '#7a0016',
          'maroon-hover': '#5c0011',
          'nav-bg': '#141618',
          'nav-bg-subtle': '#1c1f23',
        },
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
