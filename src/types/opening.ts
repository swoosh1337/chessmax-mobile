/**
 * Opening-related type definitions
 */

/**
 * Chess opening category
 */
export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
}

/**
 * A single chess opening
 */
export interface Opening {
  id: string;
  name: string;
  eco?: string; // ECO classification (e.g., "B20")
  description?: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  popularity: number;
  image_url?: string;
  variations: Variation[];
  created_at?: string;
  updated_at?: string;
}

/**
 * A variation within an opening
 */
export interface Variation {
  id: string;
  name: string;
  pgn: string; // PGN notation of the variation
  moves: string[]; // Array of moves in algebraic notation
  description?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  popularity: number;
  explanations?: MoveExplanation[];
}

/**
 * Explanation for a specific move
 */
export interface MoveExplanation {
  moveIndex: number;
  text: string;
  concept?: 'development' | 'center-control' | 'king-safety' | 'attack' | 'defense' | 'positional';
  visualHints?: {
    highlightSquares: string[];
    arrows?: Array<[string, string]>;
  };
}

/**
 * Opening with user progress data
 */
export interface OpeningWithProgress extends Opening {
  completedVariations: number;
  totalVariations: number;
  progress: number; // 0-1 completion percentage
  lastPracticed?: string;
  masteryLevel: 'not_started' | 'learning' | 'practiced' | 'mastered';
}

/**
 * Opening group for display
 */
export interface OpeningGroup {
  category: Category;
  openings: OpeningWithProgress[];
}

/**
 * PGN parsed data
 */
export interface ParsedPGN {
  moves: string[];
  fen: string;
  headers: Record<string, string>;
}

/**
 * Opening filter options
 */
export interface OpeningFilters {
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  searchQuery?: string;
  sortBy?: 'name' | 'popularity' | 'difficulty' | 'progress';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Opening cache entry
 */
export interface OpeningCacheEntry {
  openings: Opening[];
  timestamp: number;
  expiresAt: number;
}

/**
 * Type guard for Opening
 */
export function isOpening(obj: unknown): obj is Opening {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'variations' in obj &&
    Array.isArray((obj as Opening).variations)
  );
}

/**
 * Type guard for Variation
 */
export function isVariation(obj: unknown): obj is Variation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'pgn' in obj &&
    'moves' in obj
  );
}
