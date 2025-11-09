/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // TRON ARES - Red Neon Theme
        tron: {
          // Primary red colors
          red: '#ff1a2a',
          'red-bright': '#ff4757',
          'red-dark': '#cc1420',
          'red-neon': '#ff0066',
          'red-light': 'rgba(255, 71, 87, 0.6)',
          // Secondary colors (kept for variety)
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
          // City colors
          'city-dark': '#0a0a0a',
          'city-gray': '#1a1a1a',
          'city-gray-light': '#2a2a2a',
          'city-gray-muted': '#3a3a3a',
        },
        // Background colors - Tron Ares dark city
        bg: {
          primary: '#000000',
          secondary: '#0a0a0a',
          tertiary: '#1a1a1a',
          card: 'rgba(26, 26, 26, 0.85)',
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
        'neon-pulse': 'neonRedPulse 2s ease-in-out infinite',
        'neon-red-pulse': 'neonRedPulse 2s ease-in-out infinite',
        'grid-scroll': 'gridScroll 20s linear infinite',
        'shine': 'shine 3s infinite',
        'border-scan': 'borderScan 3s linear infinite',
        'text-glow': 'textRedGlow 2s ease-in-out infinite',
        'text-red-glow': 'textRedGlow 2s ease-in-out infinite',
        'energy-flow': 'energyFlow 2s linear infinite',
        'hex-move': 'hexMove 20s linear infinite',
        'particle-float': 'particleFloat 3s linear infinite',
        'data-stream': 'dataStream 3s linear infinite',
        'tron-spin': 'tronSpin 1s linear infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
        'tron-shimmer': 'tronShimmer 2s infinite',
        'red-neon-pulse': 'redNeonPulse 8s ease-in-out infinite',
        'fog-drift': 'fogDrift 25s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'zoom-in': 'zoomIn 0.3s ease-out',
      },
      keyframes: {
        neonRedPulse: {
          '0%, 100%': {
            boxShadow: '0 0 10px rgba(255, 26, 42, 0.8), inset 0 0 10px rgba(255, 26, 42, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 20px rgba(255, 26, 42, 1), 0 0 30px rgba(255, 26, 42, 1), inset 0 0 15px rgba(255, 26, 42, 0.5)',
          },
        },
        redNeonPulse: {
          '0%, 100%': {
            opacity: '0.5',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '0.7',
            transform: 'scale(1.1)',
          },
        },
        textRedGlow: {
          '0%, 100%': {
            textShadow: '0 0 10px rgba(255, 26, 42, 0.8), 0 0 20px rgba(255, 26, 42, 0.8), 0 0 30px rgba(255, 26, 42, 0.8)',
          },
          '50%': {
            textShadow: '0 0 15px rgba(255, 26, 42, 1), 0 0 30px rgba(255, 26, 42, 1), 0 0 40px rgba(255, 26, 42, 1), 0 0 50px rgba(255, 71, 87, 1)',
          },
        },
        fogDrift: {
          '0%, 100%': {
            transform: 'translateX(0)',
            opacity: '0.3',
          },
          '50%': {
            transform: 'translateX(20px)',
            opacity: '0.5',
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
        'neon-red': '0 0 20px rgba(255, 26, 42, 0.6)',
        'neon-red-lg': '0 0 40px rgba(255, 26, 42, 0.8)',
        'neon-red-xl': '0 0 60px rgba(255, 26, 42, 1)',
        'neon-cyan': '0 0 20px rgba(0, 229, 255, 0.5)',
        'neon-blue': '0 0 20px rgba(0, 102, 255, 0.5)',
        'neon-orange': '0 0 20px rgba(255, 107, 53, 0.5)',
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.5)',
        'tron-card': '0 4px 20px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 26, 42, 0.15)',
        'tron-card-hover': '0 8px 30px rgba(0, 0, 0, 0.7), 0 0 60px rgba(255, 26, 42, 0.25)',
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'grid-tron': `
          linear-gradient(90deg, rgba(255, 26, 42, 0.12) 1px, transparent 1px),
          linear-gradient(0deg, rgba(255, 26, 42, 0.12) 1px, transparent 1px)
        `,
        'gradient-tron': 'linear-gradient(135deg, rgba(255, 26, 42, 0.1) 0%, rgba(26, 26, 26, 0.95) 100%)',
        'gradient-radial': 'radial-gradient(ellipse at center, rgba(255, 26, 42, 0.1) 0%, rgba(0, 0, 0, 0.9) 100%)',
        'city-skyline': 'linear-gradient(180deg, transparent, rgba(26, 26, 26, 0.6) 100%)',
      },
      borderRadius: {
        tron: '8px',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        // Text glow utilities - Red Neon
        '.text-glow-red': {
          textShadow: '0 0 10px rgba(255, 26, 42, 0.8)',
        },
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
        // Box glow utilities - Red Neon
        '.box-glow-red': {
          boxShadow: '0 0 20px rgba(255, 26, 42, 0.6)',
        },
        '.box-glow-cyan': {
          boxShadow: '0 0 20px rgba(0, 229, 255, 0.5)',
        },
        '.box-glow-blue': {
          boxShadow: '0 0 20px rgba(0, 102, 255, 0.5)',
        },
        '.box-glow-orange': {
          boxShadow: '0 0 20px rgba(255, 107, 53, 0.5)',
        },
        // Neon border - Red
        '.border-neon': {
          border: '2px solid rgba(255, 26, 42, 0.8)',
          boxShadow: '0 0 10px rgba(255, 26, 42, 0.8), inset 0 0 10px rgba(255, 26, 42, 0.3)',
        },
        '.border-neon-red': {
          border: '2px solid rgba(255, 26, 42, 0.8)',
          boxShadow: '0 0 10px rgba(255, 26, 42, 0.8), inset 0 0 10px rgba(255, 26, 42, 0.3)',
        },
      }
      addUtilities(newUtilities)
    },
  ],
}

