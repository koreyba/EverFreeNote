/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic colors matching web design system
        background: '#ffffff',
        foreground: '#1f2937',

        card: {
          DEFAULT: '#ffffff',
          foreground: '#1f2937',
        },

        primary: {
          DEFAULT: '#16a34a',      // Emerald green - oklch(60% 0.18 145)
          foreground: '#ffffff',
        },

        secondary: {
          DEFAULT: '#f0fdf4',      // Light green - oklch(97% 0.01 145)
          foreground: '#166534',
        },

        muted: {
          DEFAULT: '#f3f4f6',      // Gray-100
          foreground: '#6b7280',   // Gray-500
        },

        accent: {
          DEFAULT: '#ecfdf5',      // Emerald-50
          foreground: '#166534',
        },

        destructive: {
          DEFAULT: '#dc2626',      // Red-600
          foreground: '#ffffff',
        },

        border: '#e5e7eb',         // Gray-200
        input: '#e5e7eb',
        ring: '#22c55e',           // Green-500
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      lineHeight: {
        heading: '1.25',
        body: '1.75',
      },

      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
