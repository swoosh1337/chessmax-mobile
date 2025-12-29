/**
 * Spacing constants for consistent margins, paddings, and gaps
 */

export const Spacing = {
  // Base spacing scale (4px increments)
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Semantic spacing
  screenPadding: 20,       // Standard screen edge padding
  cardPadding: 16,         // Padding inside cards
  sectionGap: 24,          // Gap between sections
  itemGap: 12,             // Gap between list items
  buttonPadding: {
    horizontal: 24,
    vertical: 12,
  },

  // Layout
  headerHeight: 60,
  tabBarHeight: 80,
  inputHeight: 48,
  buttonHeight: 48,
  iconSize: {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  },

  // Border radius
  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
} as const;

// Type for Spacing object
export type SpacingType = typeof Spacing;
