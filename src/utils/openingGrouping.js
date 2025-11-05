/**
 * Group openings by base name and organize by color and level
 * Matches web app's useOpenings.js logic
 */

import { getCategoryForOpening } from './openingCategories';

function getBaseName(opening) {
  // Remove level indicators like "lvl 1", "lvl 2", "level 3", etc.
  // Remove color indicators like "for White", "for Black", "as White", "as Black"
  let baseName = opening.name || '';

  baseName = baseName
    .replace(/\s*lvl?\s*\d+/gi, '')
    .replace(/\s*level\s*\d+/gi, '')
    .replace(/\s*for\s+(white|black)/gi, '')
    .replace(/\s*as\s+(white|black)/gi, '')
    .replace(/\s*\(white\)/gi, '')
    .replace(/\s*\(black\)/gi, '')
    .replace(/\s*-\s*(white|black)/gi, '')
    .trim();

  return baseName;
}

export function groupOpenings(openings) {
  if (!Array.isArray(openings)) return [];

  console.log(`📦 Grouping ${openings.length} openings...`);

  const groups = new Map();

  for (const opening of openings) {
    const baseName = getBaseName(opening);

    if (!groups.has(baseName)) {
      // Create new group with empty level structures
      groups.set(baseName, {
        ...opening,
        name: baseName,
        category: getCategoryForOpening(baseName),
        whitelevels: {},
        blacklevels: {},
        // Keep reference to first opening's data
        id: opening.id,
        description: opening.description,
        image: opening.image,
        gif: opening.gif,
      });
    }

    const group = groups.get(baseName);
    const level = opening.level || 1;
    const color = opening.color || 'w';

    // Store level data with all opening properties
    const levelData = {
      ...opening,
      name: opening.name, // Keep full name for this specific level
      variations: opening.variations || [],
    };

    // Debug: Verify pgn is present
    if (!levelData.pgn) {
      console.warn(`⚠️ Missing pgn for ${opening.name} (${color} L${level})`);
    } else {
      console.log(`✅ ${baseName} ${color} L${level}: pgn present (${levelData.pgn.substring(0, 30)}...)`);
    }

    // Organize by color and level
    if (color === 'w') {
      group.whitelevels[level] = levelData;
    } else if (color === 'b') {
      group.blacklevels[level] = levelData;
    }

    // Calculate total variations across all levels
    const allVariations = [
      ...Object.values(group.whitelevels),
      ...Object.values(group.blacklevels),
    ].reduce((total, levelData) => {
      return total + (levelData?.variations?.length || 0);
    }, 0);

    group.totalVariations = allVariations;
  }

  const grouped = Array.from(groups.values());
  console.log(`📦 Grouped into ${grouped.length} opening groups`);

  return grouped;
}
