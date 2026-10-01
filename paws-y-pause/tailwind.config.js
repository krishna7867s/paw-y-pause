/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: 'var(--tinta)',
        'ink-strong': 'var(--tinta-fuerte)',
        pearl: 'var(--blanco-perlado)',
        blush: 'var(--rosa-chicle)',
        'blush-strong': 'var(--rosa-chicle-fuerte)',
        sky: 'var(--celeste)',
        apple: 'var(--verde-manzana)',
      },
      borderRadius: {
        soft: 'var(--radio-suave)',
      },
      boxShadow: {
        soft: 'var(--sombra-suave)',
      },
    },
  },
  plugins: [],
}
