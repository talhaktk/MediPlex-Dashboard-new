/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#0a1628',
          mid: '#112240',
          light: '#1a3358',
          muted: '#2a4a72',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8c87a',
          pale: '#f5edd8',
          dark: '#a07a2a',
        },
        cream: '#faf8f4',
        status: {
          confirmed: '#1a7f5e',
          'confirmed-bg': '#e8f7f2',
          cancelled: '#c53030',
          'cancelled-bg': '#fff0f0',
          rescheduled: '#b47a00',
          'rescheduled-bg': '#fff9e6',
          pending: '#2b6cb0',
          'pending-bg': '#ebf4ff',
        }
      },
      boxShadow: {
        card: '0 1px 8px rgba(10,22,40,0.06)',
        dashboard: '0 2px 24px rgba(10,22,40,0.07)',
      },
      borderRadius: {
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}
