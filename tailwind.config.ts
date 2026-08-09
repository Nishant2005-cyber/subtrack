import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { ink: '#20211d', lime: '#d7f96a', violet: '#6154d9' }, boxShadow: { card: '0 14px 35px rgba(35,39,29,.07)' } } },
  plugins: []
};
export default config;
