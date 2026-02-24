/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Landing page specific colors
        brand: {
          dark: '#143628',      // Dark forest green used for headings and text
          green: '#6ab08c',     // Sage green used for primary buttons
          light0: '#6ab08c',    // Active/selected state background (sage green)
          light: '#f4f6f4',     // Off-white/light gray used for section backgrounds
          gray: '#e4ebe6',      // Grayish-green used for pills and icon backgrounds
          border: '#e6ece8',    // Light borders
          text: '#445a4f',      // Medium text color
        },
        // Arogya — mobile-first 375px, warm cream & olive
        beige: {
          DEFAULT: '#F4F1EA',
          50: '#FDFBF7',
          100: '#F4F1EA',
          200: '#EBE6DC',
          300: '#E0D9CC',
        },
        olive: {
          50: '#f4f5f2',
          100: '#e8ebe4',
          200: '#c9d1c0',
          300: '#7d8f6b',
          400: '#5C6B4A',  // Primary olive green
          500: '#5C6B4A',
          600: '#4A5D3A',  // Hover
          700: '#3d4d2f',
          800: '#2a3220',
          900: '#232a1b',
        },
        gold: {
          50: '#faf7f0',
          100: '#f2ebe0',
          200: '#e6d9c4',
          300: '#d4be9e',
          400: '#C4A96A',  // Warm gold accent
          500: '#C4A96A',
          600: '#b8925c',
          700: '#8a643c',
          800: '#715236',
          900: '#5d4530',
        },
        primary: {
          50: '#f4f5f2',
          100: '#e8ebe4',
          200: '#c9d1c0',
          300: '#7d8f6b',
          400: '#5C6B4A',
          500: '#5C6B4A',
          600: '#4A5D3A',
          700: '#323d26',
          800: '#2a3220',
          900: '#232a1b',
        },
        accent: {
          50: '#faf7f0',
          100: '#f2ebe0',
          200: '#e6d9c4',
          300: '#d4be9e',
          400: '#C4A96A',
          500: '#C4A96A',
          600: '#a67c48',
          700: '#8a643c',
          800: '#715236',
          900: '#5d4530',
        },
        charcoal: '#2D2D2D',
        neutral: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#2D2D2D',
          900: '#1c1917',
        }
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 8px 30px -4px rgba(0, 0, 0, 0.1)',
      },
      maxWidth: {
        'mobile': '28rem',
      },
      animation: {
        'fade-opacity': 'fadeOpacity 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeOpacity: {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
