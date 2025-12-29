/**
 * Typography constants for consistent text styling
 */

export const Typography = {
  // Font families (as configured in app)
  fontFamily: {
    regular: 'System',       // Default system font
    mono: 'SpaceMono',       // Monospace font for code/numbers
    display: 'System',       // Could be a custom display font
  },

  // Font sizes
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Font weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
    widest: 1,
  },

  // Pre-defined text styles
  styles: {
    h1: {
      fontSize: 36,
      fontWeight: '700' as const,
      lineHeight: 1.1,
    },
    h2: {
      fontSize: 30,
      fontWeight: '600' as const,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 1.25,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 1.3,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 1.5,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 1.5,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 1.4,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 1,
      letterSpacing: 0.5,
    },
    label: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 1.4,
    },
  },
} as const;

// Type for Typography object
export type TypographyType = typeof Typography;
