/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B1018',
        sidebar: '#101823',
        surface: '#172231',
        surfaceHover: '#1F2E42',
        surfaceBorder: '#27384E',
        accent: '#35D6E8',
        accentGlow: 'rgba(53, 214, 232, 0.25)',
        accentBlue: '#448AFF',
        success: '#35C98A',
        danger: '#FF5C5C',
        warning: '#F5A623',
        textMain: '#F5F7FA',
        textMuted: '#93A4B8',
        textSubtle: '#627284',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-accent': '0 0 15px rgba(53, 214, 232, 0.35)',
        'glow-blue': '0 0 15px rgba(68, 138, 255, 0.35)',
      }
    },
  },
  plugins: [],
}
