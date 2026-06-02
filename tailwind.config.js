/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './404.html', './main.js'],
  theme: {
    extend: {
      // 인라인 <style>의 CSS 변수(--navy/--gold)와 동일한 값.
      // bg-gold·border-gold·hover:text-navy·focus:ring-navy 등 죽어있던 클래스 활성화.
      colors: {
        navy: { DEFAULT: '#1e3a8a', dark: '#152e6e', light: '#2d4ea0' },
        gold: { DEFAULT: '#b4975a', light: '#d4b97a' },
      },
    },
  },
  plugins: [],
}
