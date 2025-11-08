export const tronColors = {
  background: {
    primary: '#050505',
    secondary: '#090812',
    tertiary: '#0d101d',
    card: 'rgba(8, 12, 24, 0.85)',
  },
  accent: {
    cyan: '#00f0ff',
    cyanDark: '#03adc4',
    blue: '#0066ff',
    blueDark: '#0038a8',
    orange: '#ff1a2a',
    orangeDark: '#b30616',
    purple: '#9900ff',
    purpleDark: '#5b00a8',
    pink: '#ff4df0',
  },
  neutral: {
    white: '#f5f9ff',
    gray50: 'rgba(255, 255, 255, 0.85)',
    gray200: 'rgba(255, 255, 255, 0.65)',
    gray400: 'rgba(255, 255, 255, 0.45)',
    gray600: 'rgba(255, 255, 255, 0.25)',
    gray800: 'rgba(255, 255, 255, 0.12)',
  },
  status: {
    success: '#17ffb8',
    warning: '#ffd166',
    danger: '#ff1a2a',
    info: '#56ccf2',
  },
} as const;

export const tronGradients = {
  horizon: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(8, 12, 24, 0.95) 75%, #050505 100%)',
  energy: 'radial-gradient(circle at 50% 0%, rgba(255, 26, 42, 0.35) 0%, rgba(255, 26, 42, 0) 60%)',
  neonBlue: 'linear-gradient(130deg, rgba(0, 240, 255, 0.25) 0%, rgba(0, 102, 255, 0.08) 100%)',
  neonPurple: 'linear-gradient(145deg, rgba(153, 0, 255, 0.28) 0%, rgba(91, 0, 168, 0.1) 100%)',
  neonOrange: 'linear-gradient(155deg, rgba(255, 26, 42, 0.32) 0%, rgba(179, 6, 22, 0.1) 100%)',
} as const;

export const tronFonts = {
  heading: 'var(--font-orbitron, "Orbitron", sans-serif)',
  body: 'var(--font-exo, "Exo 2", "Segoe UI", sans-serif)',
  mono: 'var(--font-jetbrains, "JetBrains Mono", monospace)',
} as const;

export const tronSpacing = {
  xs: '0.375rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
} as const;

export const tronRadii = {
  sm: '0.75rem',
  md: '1.25rem',
  lg: '1.75rem',
  pill: '999px',
} as const;

export const tronEffects = {
  glowSm: '0 0 10px rgba(0, 240, 255, 0.35)',
  glowMd: '0 0 18px rgba(0, 102, 255, 0.45)',
  glowLg: '0 0 28px rgba(255, 26, 42, 0.5)',
  innerGlow: 'inset 0 0 18px rgba(0, 240, 255, 0.35)',
  border: '1px solid rgba(0, 240, 255, 0.25)',
} as const;

export const tronTokens = {
  colors: tronColors,
  gradients: tronGradients,
  fonts: tronFonts,
  spacing: tronSpacing,
  radii: tronRadii,
  effects: tronEffects,
} as const;
