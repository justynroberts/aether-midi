/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        accent: '#00ff88',
        bg: '#0a0a0a',
        surface: '#111111',
        border: '#1e1e1e',
        muted: '#444444',
      },
    },
  },
  plugins: [],
}
