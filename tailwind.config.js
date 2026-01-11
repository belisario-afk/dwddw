/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#1e1e2e',
          cyan: '#00ffff',
          magenta: '#ff00ff',
          'cyan-dim': '#00cccc',
          'magenta-dim': '#cc00cc',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px #00ffff, 0 0 20px #00ffff40',
        'neon-magenta': '0 0 10px #ff00ff, 0 0 20px #ff00ff40',
      },
    },
  },
  plugins: [],
};
