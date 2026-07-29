/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0f172a',
        panelBg: 'rgba(30, 41, 59, 0.7)',
        accentColor: '#38bdf8',
      }
    },
  },
  plugins: [],
}
