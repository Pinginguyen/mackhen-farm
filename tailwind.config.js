/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'border-beam': {
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'border-beam': 'border-beam 8s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};