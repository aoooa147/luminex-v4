/** @type {import('tailwindcss').Config} */

module.exports = {

  content: [

    './app/**/*.{js,ts,jsx,tsx,mdx}',

    './components/**/*.{js,ts,jsx,tsx,mdx}',

  ],

  theme: {

    extend: {

      colors: {

        // Tron color palette

        tron: {

          cyan: '#00e5ff',

          'cyan-dark': '#00a8cc',

          'cyan-light': '#6ff6ff',

          blue: '#0066ff',

          'blue-dark': '#003d99',

          'blue-light': '#4d94ff',

          orange: '#ff6b35',

          'orange-dark': '#cc4420',

          'orange-light': '#ff9872',

          purple: '#a855f7',

          'purple-dark': '#7c3aed',

          pink: '#ec4899',

          'pink-dark': '#db2777',

        },

        // Background colors

        bg: {

          primary: '#000000',

          secondary: '#0a0a0f',

          tertiary: '#0f0f1a',

          card: 'rgba(10, 10, 20, 0.8)',

        },

      },

      fontFamily: {

        orbitron: ['Orbitron', 'sans-serif'],

        exo: ['Exo 2', 'sans-serif'],

        jetbrains: ['JetBrains Mono', 'monospace'],

      },

      animation: {

        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',

        'spin-slow': 'spin 3s linear infinite',

        'neon-pulse': 'neonPulse 2s ease-in-out infinite',

        'grid-scroll': 'gridScroll 20s linear infinite',

        'shine': 'shine 3s infinite',

        'border-scan': 'borderScan 3s linear infinite',

        'text-glow': 'textGlow 2s ease-in-out infinite',

        'energy-flow': 'energyFlow 2s linear infinite',

        'hex-move': 'hexMove 20s linear infinite',

        'particle-float': 'particleFloat 3s linear infinite',

        'data-stream': 'dataStream 3s linear infinite',

        'tron-spin': 'tronSpin 1s linear infinite',

        'gradient-shift': 'gradientShift 3s ease infinite',

        'tron-shimmer': 'tronShimmer 2s infinite',

        'fade-in': 'fadeIn 0.5s ease-out',

        'slide-up': 'slideUp 0.3s ease-out',

        'slide-down': 'slideDown 0.3s ease-out',

        'zoom-in': 'zoomIn 0.3s ease-out',

      },

      keyframes: {

        neonPulse: {

          '0%, 100%': {

            boxShadow: '0 0 10px var(--tron-cyan), inset 0 0 10px rgba(0, 229, 255, 0.2)',

          },

          '50%': {

            boxShadow: '0 0 20px var(--tron-cyan), 0 0 30px var(--tron-cyan), inset 0 0 15px rgba(0, 229, 255, 0.3)',

          },

        },

        gridScroll: {

          '0%': { backgroundPosition: '0 0' },

          '100%': { backgroundPosition: '50px 50px' },

        },

        shine: {

          '0%': { left: '-100%' },

          '50%, 100%': { left: '200%' },

        },

        borderScan: {

          '0%': { transform: 'translateX(-100%)' },

          '100%': { transform: 'translateX(100%)' },

        },

        textGlow: {

          '0%, 100%': {

            textShadow: '0 0 10px var(--tron-cyan), 0 0 20px var(--tron-cyan), 0 0 30px var(--tron-cyan)',

          },

          '50%': {

            textShadow: '0 0 15px var(--tron-cyan), 0 0 30px var(--tron-cyan), 0 0 40px var(--tron-cyan), 0 0 50px var(--tron-cyan)',

          },

        },

        energyFlow: {

          '0%': { transform: 'translateX(-100%)', opacity: '0' },

          '50%': { opacity: '1' },

          '100%': { transform: 'translateX(100%)', opacity: '0' },

        },

        hexMove: {

          '0%': { transform: 'translateY(0)' },

          '100%': { transform: 'translateY(100px)' },

        },

        particleFloat: {

          '0%': { transform: 'translateY(100vh) translateX(0)', opacity: '0' },

          '10%': { opacity: '1' },

          '90%': { opacity: '1' },

          '100%': { transform: 'translateY(-10vh) translateX(100px)', opacity: '0' },

        },

        dataStream: {

          '0%': { transform: 'translateY(-100%)', opacity: '0' },

          '10%': { opacity: '1' },

          '90%': { opacity: '1' },

          '100%': { transform: 'translateY(100%)', opacity: '0' },

        },

        tronSpin: {

          '0%': { transform: 'rotate(0deg)' },

          '100%': { transform: 'rotate(360deg)' },

        },

        gradientShift: {

          '0%, 100%': { backgroundPosition: '0% 50%' },

          '50%': { backgroundPosition: '100% 50%' },

        },

        tronShimmer: {

          '0%': { backgroundPosition: '-1000px 0' },

          '100%': { backgroundPosition: '1000px 0' },

        },

        fadeIn: {

          from: { opacity: '0', transform: 'translateY(20px)' },

          to: { opacity: '1', transform: 'translateY(0)' },

        },

        slideUp: {

          from: { transform: 'translateY(100%)', opacity: '0' },

          to: { transform: 'translateY(0)', opacity: '1' },

        },

        slideDown: {

          from: { transform: 'translateY(-100%)', opacity: '0' },

          to: { transform: 'translateY(0)', opacity: '1' },

        },

        zoomIn: {

          from: { transform: 'scale(0.8)', opacity: '0' },

          to: { transform: 'scale(1)', opacity: '1' },

        },

      },

      boxShadow: {

        'neon-cyan': '0 0 20px rgba(0, 229, 255, 0.5)',

        'neon-blue': '0 0 20px rgba(0, 102, 255, 0.5)',

        'neon-orange': '0 0 20px rgba(255, 107, 53, 0.5)',

        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.5)',

        'tron-card': '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 229, 255, 0.1)',

        'tron-card-hover': '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 60px rgba(0, 229, 255, 0.2)',

      },

      backdropBlur: {

        xs: '2px',

      },

      backgroundImage: {

        'grid-tron': `

          linear-gradient(90deg, rgba(0, 229, 255, 0.15) 1px, transparent 1px),

          linear-gradient(0deg, rgba(0, 229, 255, 0.15) 1px, transparent 1px)

        `,

        'gradient-tron': 'linear-gradient(135deg, rgba(0, 229, 255, 0.1) 0%, rgba(0, 102, 255, 0.05) 100%)',

        'gradient-radial': 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 102, 255, 0.05) 50%, rgba(0, 0, 0, 0.8) 100%)',

      },

      borderRadius: {

        tron: '8px',

      },

    },

  },

  plugins: [

    function({ addUtilities }) {

      const newUtilities = {

        // Text glow utilities

        '.text-glow-cyan': {

          textShadow: '0 0 10px var(--tron-cyan)',

        },

        '.text-glow-blue': {

          textShadow: '0 0 10px var(--tron-blue)',

        },

        '.text-glow-orange': {

          textShadow: '0 0 10px var(--tron-orange)',

        },

        '.text-glow-purple': {

          textShadow: '0 0 10px var(--tron-purple)',

        },

        // Box glow utilities

        '.box-glow-cyan': {

          boxShadow: '0 0 20px rgba(0, 229, 255, 0.5)',

        },

        '.box-glow-blue': {

          boxShadow: '0 0 20px rgba(0, 102, 255, 0.5)',

        },

        '.box-glow-orange': {

          boxShadow: '0 0 20px rgba(255, 107, 53, 0.5)',

        },

        // Neon border

        '.border-neon': {

          border: '2px solid var(--tron-cyan)',

          boxShadow: '0 0 10px var(--tron-cyan), inset 0 0 10px rgba(0, 229, 255, 0.2)',

        },

      }

      addUtilities(newUtilities)

    },

  ],

}
