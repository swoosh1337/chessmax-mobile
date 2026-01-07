import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { useTraining } from '@/src/context/TrainingContext';
import { useOpenings } from '@/src/hooks/useOpenings';
import { groupOpenings } from '@/src/utils/openingGrouping';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VERTICAL_SPACING = 150;
const PATH_AMPLITUDE = 80;

const UNITS = [
  { id: 1, name: 'Essential Openings', color: '#58CC02' },
  { id: 2, name: 'Tactical Play', color: '#CE82FF' },
  { id: 3, name: 'Positional Mastery', color: '#FF9600' },
  { id: 4, name: 'Grandmaster Repertoire', color: '#FF4B4B' },
];

export interface PathNode {
  type: 'lesson' | 'reward' | 'unit_header';
  opening?: any;
  index?: number;
  status?: 'completed' | 'current' | 'next' | 'locked';
  unitId?: number;
  x: number;
  y: number;
  masteryLevel: 0 | 1 | 2 | 3;
  repertoireColor: 'white' | 'black' | 'both';
}

export interface UsePathNodesResult {
  pathNodes: PathNode[];
  loading: boolean;
  units: typeof UNITS;
}

/**
 * Hook to build the learning path nodes from openings data
 */
export function usePathNodes(): UsePathNodesResult {
  const { openingStats } = useTraining();
  const { openings: rawOpenings, loading } = useOpenings();
  const [pathNodes, setPathNodes] = useState<PathNode[]>([]);

  // Define Repertoire Colors Logic
  const getRepertoireColor = useCallback((opening: any): 'white' | 'black' | 'both' => {
    const hasWhite = opening.whitelevels && Object.keys(opening.whitelevels).length > 0;
    const hasBlack = opening.blacklevels && Object.keys(opening.blacklevels).length > 0;
    if (hasWhite && hasBlack) return 'both';
    if (hasWhite) return 'white';
    return 'black';
  }, []);

  // Helper to get the lowest available level for an opening
  const getLowestLevel = useCallback((opening: any): number => {
    const whiteLevels = opening.whitelevels ? Object.keys(opening.whitelevels).map(Number) : [];
    const blackLevels = opening.blacklevels ? Object.keys(opening.blacklevels).map(Number) : [];
    const allLevels = [...whiteLevels, ...blackLevels];
    if (allLevels.length === 0) return 99;
    return Math.min(...allLevels);
  }, []);

  // Build path from openings
  const buildPath = useCallback((openingsList: any[]) => {
    const nodes: PathNode[] = [];
    let yOffset = 120;

    const ITEMS_PER_UNIT = 6;
    const CHEST_INTERVAL = 4;

    // Calculate progress
    let currentIndex = 0;
    openingsList.forEach((op, idx) => {
      const stats = openingStats.find(s => s.opening_name === op.name);
      if (stats && stats.completed_sessions > 0) {
        currentIndex = idx + 1;
      }
    });

    openingsList.forEach((opening, index) => {
      const unitIndex = Math.floor(index / ITEMS_PER_UNIT);
      const isRight = index % 2 === 0;
      const x = SCREEN_WIDTH / 2 + (isRight ? 1 : -1) * PATH_AMPLITUDE;

      // Unit Header
      if (index % ITEMS_PER_UNIT === 0) {
        nodes.push({
          type: 'unit_header',
          unitId: UNITS[unitIndex % UNITS.length].id,
          x: SCREEN_WIDTH / 2,
          y: yOffset,
          masteryLevel: 0,
          repertoireColor: 'both'
        });
        yOffset += 120;
      }

      // Determine status and mastery
      let status: 'completed' | 'current' | 'next' | 'locked' = 'locked';
      let masteryLevel: 0 | 1 | 2 | 3 = 0;

      const stats = openingStats.find(s => s.opening_name === opening.name);

      if (stats && stats.completed_sessions > 0) {
        status = 'completed';
        const sessions = Math.min(stats.completed_sessions, 3);
        masteryLevel = sessions as 0 | 1 | 2 | 3;
      } else if (index === currentIndex) {
        status = 'current';
        masteryLevel = stats?.total_sessions ? 1 : 0;
      } else if (index === currentIndex + 1) {
        status = 'next';
        masteryLevel = 0;
      }

      nodes.push({
        type: 'lesson',
        opening,
        index,
        status,
        x,
        y: yOffset,
        masteryLevel,
        repertoireColor: getRepertoireColor(opening)
      });

      yOffset += VERTICAL_SPACING;

      // Add chest reward after every CHEST_INTERVAL openings
      if ((index + 1) % CHEST_INTERVAL === 0) {
        const chestX = SCREEN_WIDTH / 2 + (isRight ? -1 : 1) * 60;
        const chestStatus = index <= currentIndex ? 'completed' : 'locked';
        nodes.push({
          type: 'reward',
          status: chestStatus,
          index,
          x: chestX,
          y: yOffset - VERTICAL_SPACING / 2 + 20,
          masteryLevel: 0,
          repertoireColor: 'both'
        });
      }
    });

    setPathNodes(nodes);
  }, [openingStats, getRepertoireColor]);

  // Process openings when data changes
  useEffect(() => {
    if (rawOpenings.length > 0) {
      const grouped = groupOpenings(rawOpenings);

      // Sort by lowest available difficulty level
      const sorted = [...grouped].sort((a: any, b: any) => {
        const aLevel = getLowestLevel(a);
        const bLevel = getLowestLevel(b);
        if (aLevel !== bLevel) return aLevel - bLevel;
        return (a.name || '').localeCompare(b.name || '');
      });

      buildPath(sorted);
    }
  }, [rawOpenings, openingStats, getLowestLevel, buildPath]);

  return {
    pathNodes,
    loading,
    units: UNITS,
  };
}
