/**
 * ChessMaxx Dark Theme - High contrast black and white
 * Centralized color palette for the entire app
 */

export const Colors = {
  // Background colors - Pure black and dark grays
  background: '#000000',      // Pure black
  card: '#1a1a1a',            // Very dark gray for cards
  surface: '#0a0a0a',         // Slightly elevated surface

  // Text colors - High contrast whites
  foreground: '#ffffff',      // Pure white
  text: {
    primary: '#ffffff',       // Pure white for main text
    secondary: 'rgba(255, 255, 255, 0.85)', // Slightly dimmed
    muted: '#999999',         // Medium gray for subtle text
    disabled: '#666666',      // Disabled text
  },

  // Primary/Accent (Gold)
  primary: '#fbbf24',         // Bright gold/amber
  primaryForeground: '#000000',
  primaryLight: '#fcd34d',    // Lighter gold
  primaryDark: '#d97706',     // Darker gold

  // Secondary
  secondary: '#1a1a1a',       // Very dark gray
  secondaryForeground: '#ffffff',

  // Muted
  muted: '#2a2a2a',           // Dark gray
  mutedForeground: '#999999',

  // Border/Input
  border: '#333333',          // Dark gray borders
  borderLight: '#444444',     // Lighter border
  input: '#1a1a1a',           // Very dark gray

  // Status colors
  error: '#ef4444',           // Red for errors
  success: '#10b981',         // Green for success
  warning: '#f59e0b',         // Amber for warnings
  info: '#3b82f6',            // Blue for info

  // Legacy aliases for backwards compatibility
  destructive: '#ef4444',     // Same as error

  // Accent (Teal highlight)
  accent: '#06b6d4',          // Cyan
  accentForeground: '#000000',

  // Chess board colors
  board: {
    light: '#f0d9b5',
    dark: '#b58863',
    highlightYellow: 'rgba(255, 255, 0, 0.4)',
    highlightGreen: 'rgba(0, 255, 0, 0.3)',
    highlightRed: 'rgba(255, 0, 0, 0.3)',
  },

  // Glass effects for overlays
  glass: {
    light: 'rgba(0, 0, 0, 0.6)',
    medium: 'rgba(0, 0, 0, 0.7)',
    strong: 'rgba(0, 0, 0, 0.8)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  // Gradient colors
  gradient: {
    primary: ['#fbbf24', '#d97706'],
    dark: ['#1a1a1a', '#000000'],
    accent: ['#06b6d4', '#0891b2'],
  },

  // Level/XP colors
  xp: {
    bronze: '#cd7f32',
    silver: '#c0c0c0',
    gold: '#ffd700',
    platinum: '#e5e4e2',
  },
} as const;

// Type for Colors object
export type ColorsType = typeof Colors;

// Default export for backwards compatibility with theme/colors.js
export const colors = {
  background: Colors.background,
  card: Colors.card,
  foreground: Colors.foreground,
  textSoft: Colors.text.secondary,
  textSubtle: Colors.text.muted,
  primary: Colors.primary,
  primaryForeground: Colors.primaryForeground,
  secondary: Colors.secondary,
  muted: Colors.muted,
  mutedForeground: Colors.mutedForeground,
  border: Colors.border,
  input: Colors.input,
  destructive: Colors.destructive,
  success: Colors.success,
  accent: Colors.accent,
  accentForeground: Colors.accentForeground,
  boardLight: Colors.board.light,
  boardDark: Colors.board.dark,
  glass: Colors.glass.light,
  glassStrong: Colors.glass.strong,
};
