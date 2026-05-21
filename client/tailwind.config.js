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
          navy: '#1e3a8a',
          'blue-light': '#4a6fd4',
          'blue-light-hover': '#3b5fc4',
          'blue-muted': '#93b4f5',
          accent: '#4a6fd4',
          maroon: '#4a6fd4',
          'maroon-hover': '#3b5fc4',
          'nav-bg': '#1e3a8a',
          'nav-bg-subtle': '#172554',
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
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        xs: '0 1px 2px rgb(15 23 42 / 0.04)',
        card: '0 1px 2px rgb(30 58 138 / 0.06), 0 4px 16px rgb(30 58 138 / 0.08)',
        elevated: '0 8px 24px rgb(30 58 138 / 0.12)',
      },
    },
  },
  plugins: [],
}
