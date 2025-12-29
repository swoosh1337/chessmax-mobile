/**
 * Tests for color constants
 */

import { Colors, colors } from '../../src/constants/colors';

describe('Colors', () => {
  describe('Colors object', () => {
    it('should have background color defined', () => {
      expect(Colors.background).toBe('#000000');
    });

    it('should have primary color defined', () => {
      expect(Colors.primary).toBe('#fbbf24');
    });

    it('should have text colors defined', () => {
      expect(Colors.text.primary).toBe('#ffffff');
      expect(Colors.text.secondary).toBeDefined();
      expect(Colors.text.muted).toBeDefined();
    });

    it('should have status colors defined', () => {
      expect(Colors.error).toBe('#ef4444');
      expect(Colors.success).toBe('#10b981');
      expect(Colors.warning).toBe('#f59e0b');
    });

    it('should have chess board colors defined', () => {
      expect(Colors.board.light).toBe('#f0d9b5');
      expect(Colors.board.dark).toBe('#b58863');
    });

    it('should have glass effect colors defined', () => {
      expect(Colors.glass.light).toBeDefined();
      expect(Colors.glass.medium).toBeDefined();
      expect(Colors.glass.strong).toBeDefined();
    });
  });

  describe('colors (legacy) object', () => {
    it('should be backwards compatible with theme/colors.js', () => {
      expect(colors.background).toBe('#000000');
      expect(colors.foreground).toBe('#ffffff');
      expect(colors.primary).toBe('#fbbf24');
      expect(colors.destructive).toBe('#ef4444');
      expect(colors.success).toBe('#10b981');
      expect(colors.boardLight).toBe('#f0d9b5');
      expect(colors.boardDark).toBe('#b58863');
    });

    it('should have all expected keys', () => {
      const expectedKeys = [
        'background',
        'card',
        'foreground',
        'textSoft',
        'textSubtle',
        'primary',
        'primaryForeground',
        'secondary',
        'muted',
        'mutedForeground',
        'border',
        'input',
        'destructive',
        'success',
        'accent',
        'accentForeground',
        'boardLight',
        'boardDark',
        'glass',
        'glassStrong',
      ];

      expectedKeys.forEach((key) => {
        expect(colors).toHaveProperty(key);
      });
    });
  });

  describe('Color values', () => {
    it('should have valid hex color formats', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      const rgbaColorRegex = /^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[\d.]+\)$/;

      expect(Colors.background).toMatch(hexColorRegex);
      expect(Colors.primary).toMatch(hexColorRegex);
      expect(Colors.error).toMatch(hexColorRegex);
      expect(Colors.success).toMatch(hexColorRegex);
    });

    it('should have contrasting colors for accessibility', () => {
      // Primary should contrast with its foreground
      expect(Colors.primary).not.toBe(Colors.primaryForeground);

      // Background should contrast with foreground
      expect(Colors.background).not.toBe(Colors.foreground);
    });
  });
});
