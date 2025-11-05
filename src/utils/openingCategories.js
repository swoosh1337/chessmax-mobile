/**
 * Chess Opening Categories
 * Categorizes openings into their standard chess classification
 */

export const OPENING_CATEGORIES = {
  OPEN_GAMES: 'Open Games',
  SEMI_OPEN: 'Semi-Open Games',
  CLOSED_GAMES: 'Closed Games',
  SEMI_CLOSED: 'Semi-Closed Games',
  FLANK_OPENINGS: 'Flank Openings',
  OTHER: 'Other Openings'
};

/**
 * Category definitions with keywords for classification
 */
const CATEGORY_KEYWORDS = {
  [OPENING_CATEGORIES.OPEN_GAMES]: [
    'italian', 'giuoco', 'ruy lopez', 'spanish', 'scotch',
    'four knights', 'king\'s gambit', 'vienna', 'bishop\'s opening',
    'center game', 'danish gambit', 'evans gambit', 'fried liver',
    'two knights', 'petroff', 'petrov', 'philidor'
  ],
  [OPENING_CATEGORIES.SEMI_OPEN]: [
    'sicilian', 'french', 'caro-kann', 'caro kann', 'pirc',
    'alekhine', 'scandinavian', 'modern defense', 'owen',
    'nimzowitsch', 'dragon', 'najdorf', 'sveshnikov',
    'accelerated dragon', 'classical sicilian'
  ],
  [OPENING_CATEGORIES.CLOSED_GAMES]: [
    'queen\'s gambit', 'queens gambit', 'london system', 'london',
    'colle system', 'stonewall', 'torre attack', 'trompowsky',
    'veresov', 'blackmar-diemer'
  ],
  [OPENING_CATEGORIES.SEMI_CLOSED]: [
    'king\'s indian', 'kings indian', 'nimzo-indian', 'nimzo indian',
    'queen\'s indian', 'queens indian', 'bogo-indian', 'bogo indian',
    'grünfeld', 'grunfeld', 'benoni', 'dutch defense', 'dutch',
    'catalan', 'budapest gambit', 'benko gambit'
  ],
  [OPENING_CATEGORIES.FLANK_OPENINGS]: [
    'english', 'reti', 'réti', 'bird', 'larsen', 'orangutan',
    'polish', 'sokolsky'
  ]
};

/**
 * Get category for an opening based on its name
 * @param {string} openingName - The name of the opening
 * @returns {string} - The category name
 */
export function getCategoryForOpening(openingName) {
  if (!openingName) return OPENING_CATEGORIES.OTHER;

  const lowerName = openingName.toLowerCase();

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }

  return OPENING_CATEGORIES.OTHER;
}

/**
 * Group openings by category
 * @param {Array} openings - Array of opening objects
 * @returns {Object} - Object with category names as keys and arrays of openings as values
 */
export function groupByCategory(openings) {
  const categorized = {};

  // Initialize all categories
  Object.values(OPENING_CATEGORIES).forEach(category => {
    categorized[category] = [];
  });

  // Categorize each opening
  openings.forEach(opening => {
    const category = getCategoryForOpening(opening.name);
    categorized[category].push(opening);
  });

  // Remove empty categories
  Object.keys(categorized).forEach(category => {
    if (categorized[category].length === 0) {
      delete categorized[category];
    }
  });

  return categorized;
}

/**
 * Get category order for display (most common first)
 */
export const CATEGORY_ORDER = [
  OPENING_CATEGORIES.OPEN_GAMES,
  OPENING_CATEGORIES.SEMI_OPEN,
  OPENING_CATEGORIES.CLOSED_GAMES,
  OPENING_CATEGORIES.SEMI_CLOSED,
  OPENING_CATEGORIES.FLANK_OPENINGS,
  OPENING_CATEGORIES.OTHER
];
