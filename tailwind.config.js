/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0D17', // Deep space background
        surface: '#151928',    // Control panel surface
        surfaceBorder: '#2A3048', // Subtle borders
        primary: '#00E5FF',    // Cyan/neon blue
        primaryHover: '#00B8D4',
        secondary: '#7000FF',  // Deep purple
        accent: '#FF0055',     // Critical/neon red
        success: '#00FF9D',    // Neon green
        warning: '#FFC800',    // Neon yellow
        textMain: '#E0E6ED',   // Light gray text
        textMuted: '#8F9BB3',  // Muted text
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-grid': 'linear-gradient(rgba(0, 229, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255, 0.05) 1px, transparent 1px)',
      }
    },
  },
  plugins: [],
}
