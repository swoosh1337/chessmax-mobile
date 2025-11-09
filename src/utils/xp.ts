/**
 * XP Calculation Utilities for ChessMaxx
 */

export interface XPCalculationInput {
  difficulty: number; // 1, 2, or 3
  errors: number;
  hintsUsed: number;
  completionTimeSeconds: number;
}

export interface XPCalculationResult {
  baseXP: number;
  errorPenalty: number;
  hintPenalty: number;
  speedBonus: number;
  totalXP: number;
  breakdown: string[];
}

/**
 * Calculate XP earned for completing a variation
 *
 * Formula:
 * - Base XP by difficulty: Level 1 = 100, Level 2 = 150, Level 3 = 200
 * - Error penalty: -10 XP per mistake
 * - Hint penalty: -5 XP per hint used
 * - Speed bonus: +20 if completed in < 30s, +10 if < 60s
 * - Minimum XP: 10 (always earn at least 10 XP)
 */
export function calculateXP(input: XPCalculationInput): XPCalculationResult {
  const { difficulty, errors, hintsUsed, completionTimeSeconds } = input;

  // Base XP by difficulty
  const baseXPMap: Record<number, number> = {
    1: 100,
    2: 150,
    3: 200,
  };
  const baseXP = baseXPMap[difficulty] || 100;

  // Penalties
  const errorPenalty = errors * 10;
  const hintPenalty = hintsUsed * 5;

  // Speed bonus
  let speedBonus = 0;
  if (completionTimeSeconds < 30) {
    speedBonus = 20;
  } else if (completionTimeSeconds < 60) {
    speedBonus = 10;
  }

  // Calculate total (minimum 10 XP)
  const rawTotal = baseXP - errorPenalty - hintPenalty + speedBonus;
  const totalXP = Math.max(10, rawTotal);

  // Create breakdown for display
  const breakdown: string[] = [];
  breakdown.push(`Base XP (Level ${difficulty}): +${baseXP}`);

  if (errors > 0) {
    breakdown.push(`Errors (${errors}): -${errorPenalty}`);
  }

  if (hintsUsed > 0) {
    breakdown.push(`Hints (${hintsUsed}): -${hintPenalty}`);
  }

  if (speedBonus > 0) {
    const timeLabel = completionTimeSeconds < 30 ? '< 30s' : '< 60s';
    breakdown.push(`Speed bonus (${timeLabel}): +${speedBonus}`);
  }

  if (rawTotal < 10) {
    breakdown.push(`Minimum XP guarantee: ${10 - rawTotal}`);
  }

  return {
    baseXP,
    errorPenalty,
    hintPenalty,
    speedBonus,
    totalXP,
    breakdown,
  };
}

/**
 * Calculate user level based on total XP
 *
 * Formula: level = floor(sqrt(xp / 100)) + 1
 * - Level 1: 0-99 XP
 * - Level 2: 100-399 XP
 * - Level 3: 400-899 XP
 * - Level 4: 900-1599 XP
 * - etc.
 */
export function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

/**
 * Calculate XP required for next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  // Inverse of level formula: xp = (level - 1)^2 * 100
  return Math.pow(currentLevel, 2) * 100;
}

/**
 * Get XP progress to next level (0-1)
 */
export function getLevelProgress(totalXP: number): {
  currentLevel: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  progress: number; // 0-1
} {
  const currentLevel = calculateLevel(totalXP);
  const xpForCurrentLevel = getXPForNextLevel(currentLevel - 1);
  const xpForNextLevel = getXPForNextLevel(currentLevel);
  const xpInCurrentLevel = totalXP - xpForCurrentLevel;
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
  const progress = xpInCurrentLevel / xpNeededForNextLevel;

  return {
    currentLevel,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    progress,
  };
}

/**
 * Format XP with thousands separator
 */
export function formatXP(xp: number): string {
  return xp.toLocaleString();
}

/**
 * Get rank suffix (1st, 2nd, 3rd, 4th, etc.)
 */
export function getRankSuffix(rank: number): string {
  const j = rank % 10;
  const k = rank % 100;

  if (j === 1 && k !== 11) {
    return `${rank}st`;
  }
  if (j === 2 && k !== 12) {
    return `${rank}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${rank}rd`;
  }
  return `${rank}th`;
}
