/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#DBEAFE',
        },
        accent: {
          DEFAULT: '#DC2626',
          hover: '#B91C1C',
          light: '#FEE2E2',
        },
        background: '#FFFFFF',
        surface: '#F3F4F6',
        text: {
          DEFAULT: '#111827',
          muted: '#6B7280',
        },
      },
    },
  },
  plugins: [],
};
