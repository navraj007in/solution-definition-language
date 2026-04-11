/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        sdl: {
          deterministic: '#16a34a',
          inferred: '#d97706',
          advisory: '#dc2626',
        },
      },
    },
  },
  plugins: [],
}
