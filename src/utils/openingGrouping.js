/**
 * Group openings by base name and organize by color and level
 * Matches web app's useOpenings.js logic
 */

import { getCategoryForOpening } from './openingCategories';
import { createLogger } from './logger';

const log = createLogger('OpeningGrouping');

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
    .replace(/\s*-\s*$/, '') // Remove trailing dash
    .trim();

  return baseName;
}

/**
 * Get version number from opening name (V3 = 3, V2 = 2, no version = 0)
 */
function getVersion(opening) {
  const name = opening.name || '';
  if (name.startsWith('V3 ')) return 3;
  if (name.startsWith('V2 ')) return 2;
  return 0; // No version prefix = oldest
}

/**
 * Check if opening should be filtered out
 */
function shouldFilterOut(opening) {
  const name = opening.name || '';

  // Filter out deprecated files
  if (name.includes('DEPRECATED')) return true;

  // Filter out demo files
  if (name.includes('My Demo')) return true;
  if (name.includes('Demo')) return true;

  return false;
}

export function groupOpenings(openings) {
  if (!Array.isArray(openings)) return [];

  log.debug('Grouping openings', { count: openings.length });

  // Step 1: Filter out unwanted openings
  const filtered = openings.filter(opening => !shouldFilterOut(opening));
  log.debug('Filtered openings', { remaining: filtered.length, removed: openings.length - filtered.length });

  // Step 2: Keep only highest version for each unique opening (including color/level)
  // Key format: "cleanBaseName|color|level" to compare versioned and non-versioned openings
  const versionMap = new Map();

  for (const opening of filtered) {
    const baseName = getBaseName(opening);
    // Remove version prefix from baseName for KEY comparison (so "V2 Scotch Game" and "Scotch Game" compete)
    const cleanBaseName = baseName.replace(/^V\d+\s+/, '').trim();
    const color = opening.color || 'w';
    const level = opening.level || 1;
    const key = `${cleanBaseName}|${color}|${level}`;
    const version = getVersion(opening);

    log.debug('Processing opening', { name: opening.name, key, version });

    if (!versionMap.has(key)) {
      versionMap.set(key, { version, opening });
    } else {
      const existing = versionMap.get(key);
      // Keep the higher version
      if (version > existing.version) {
        log.debug('Replacing with newer version', { old: existing.opening.name, oldVersion: existing.version, new: opening.name, newVersion: version });
        versionMap.set(key, { version, opening });
      }
    }
  }

  // Step 3: Use only the highest version openings for each color/level variant
  const latestVersionOpenings = Array.from(versionMap.values()).map(v => v.opening);
  log.debug('Kept latest version openings', { count: latestVersionOpenings.length });

  const groups = new Map();

  for (const opening of latestVersionOpenings) {
    let baseName = getBaseName(opening);

    // Remove version prefix from display name (V2, V3, etc.)
    baseName = baseName.replace(/^V\d+\s+/, '').trim();

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
      log.warn('Missing pgn', { name: opening.name, color, level });
    } else {
      log.debug('PGN present', { baseName, color, level });
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
  log.debug('Grouped into opening groups', { count: grouped.length });

  return grouped;
}
