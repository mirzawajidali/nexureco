import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#000000',
          white: '#FFFFFF',
          // Darkened from #E63946 to reach WCAG AA (4.5:1) for white text / text on white
          accent: '#D62839',
          gold: '#FFD700',
        },
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#767677',
          600: '#525252',
          700: '#404040',
          800: '#333333',
          900: '#1A1A1A',
        },
        success: '#00A651',
        error: '#E63946',
        warning: '#F5A623',
        info: '#2196F3',
        // Discounted price (spec #E32B2B, darkened for WCAG AA on light-grey backgrounds)
        sale: '#DE2828',
      },
      // Typography system — the values live as CSS variables on :root in styles/globals.css.
      //   font-display: Archivo, for headlines (use the .type-display / .type-section / .type-promo classes)
      //   font-body / font-heading: Barlow. "font-heading" marks bold uppercase UI labels and buttons,
      //   which use the body face in this system; real headlines use font-display.
      fontFamily: {
        sans: ['var(--font-body)'],
        body: ['var(--font-body)'],
        heading: ['var(--font-body)'],
        display: ['var(--font-display)'],
      },
      // Body copy only uses 400 and 700; 800 is reserved for Archivo headlines
      fontWeight: {
        medium: '400',
        semibold: '700',
        black: '800',
      },
      letterSpacing: {
        // Uppercase UI labels and buttons
        wider: '1.5px',
      },
      fontSize: {
        'display-xl': ['38px', { lineHeight: '40px', letterSpacing: '3px' }],
        'display-lg': ['38px', { lineHeight: '40px', letterSpacing: '3px' }],
        'display': ['38px', { lineHeight: '40px', letterSpacing: '3px' }],
        'heading-xl': ['24px', { lineHeight: '28px', letterSpacing: '2.5px' }],
        'heading-lg': ['24px', { lineHeight: '28px', letterSpacing: '2.5px' }],
        'heading': ['20px', { lineHeight: '24px', letterSpacing: '2px' }],
        'heading-sm': ['20px', { lineHeight: '24px', letterSpacing: '2px' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '120': '30rem',
      },
      maxWidth: {
        '8xl': '90rem',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
