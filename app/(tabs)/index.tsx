import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, Dimensions, Alert } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path as SvgPath, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue } from 'react-native-reanimated';
import { chessApi } from '@/src/api/chessApi';
import { colors } from '@/src/theme/colors';
import { useSubscription } from '@/src/context/SubscriptionContext';
import { useLeaderboard } from '@/src/context/LeaderboardContext';
import { useTraining } from '@/src/context/TrainingContext';
import { getCachedAllOpenings, cacheAllOpenings } from '@/src/utils/openingsCache';
import { groupOpenings } from '@/src/utils/openingGrouping';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VERTICAL_SPACING = 150; // More space for larger nodes
const PATH_AMPLITUDE = 80;    // Wider path

// New Assets
const ICONS = {
  pawn: require('../../assets/new-icons/icon_pawn.png'),
  knight: require('../../assets/new-icons/icon_knight.png'),
  rook: require('../../assets/new-icons/icon_rook.png'),
  queen: require('../../assets/new-icons/icon_queen.png'),
  king: require('../../assets/new-icons/icon_king.png'),
  chest: require('../../assets/new-icons/icon_chest.png'),
  star: require('../../assets/new-icons/icon_star.png'),
  locked: require('../../assets/new-icons/icon_pawn.png'),
};

const MASCOTS = {
  thinking: require('../../assets/mascot/turtle_thinking.png'),
  playing: require('../../assets/mascot/turtle_playing_chess.png'),
  sitting: require('../../assets/mascot/turtle_sitting.png'),
};

// Theme Palette
const THEME = {
  background: '#131313',
  path: '#222',
  pathHighlight: '#2A2A2A',

  // Node Colors
  whiteOpening: '#E8D090', // Ivory/Light Gold
  blackOpening: '#5a3e3e', // Deep Red/Charcoal
  bothOpening: '#FFC800',  // Neutral Gold
  locked: '#333333',

  // Progress Ring
  ringEmpty: 'rgba(255,255,255,0.1)',
  ringFilled: '#58CC02',   // Success Green

  text: '#FFFFFF',
  textMuted: '#AAAAAA',
};

const UNITS = [
  { id: 1, name: 'Essential Openings', color: '#58CC02' },
  { id: 2, name: 'Tactical Play', color: '#CE82FF' },
  { id: 3, name: 'Positional Mastery', color: '#FF9600' },
  { id: 4, name: 'Grandmaster Repertoire', color: '#FF4B4B' },
];

interface PathNode {
  type: 'lesson' | 'reward' | 'unit_header';
  opening?: any;
  index?: number;
  status?: 'completed' | 'current' | 'next' | 'locked';
  unitId?: number;
  x: number;
  y: number;
  // Mastery Info
  masteryLevel: 0 | 1 | 2 | 3; // 0=none, 3=mastered
  repertoireColor: 'white' | 'black' | 'both';
}

const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Progress Ring Component
const ProgressRing = ({ level, totalLevels = 3, size = 110, color = THEME.ringFilled }: { level: number, totalLevels?: number, size?: number, color?: string }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 14; // Gap between segments in degrees

  // Each segment spans (360 / total) - gap
  const segmentAngle = 360 / totalLevels;
  const segmentLength = (segmentAngle - gap) / 360 * circumference;
  const gapLength = (gap / 360) * circumference;

  return (
    <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
      <Defs>
        <SvgGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset="1" stopColor="#46A302" stopOpacity="1" />
        </SvgGradient>
      </Defs>
      {/* Background Ring Segments */}
      {[0, 1, 2].map(i => (
        <SvgPath
          key={`bg-${i}`}
          d={describeArc(size / 2, size / 2, radius, i * segmentAngle + gap / 2, (i + 1) * segmentAngle - gap / 2)}
          stroke={THEME.ringEmpty}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      {/* Filled Ring Segments */}
      {[0, 1, 2].map(i => {
        if (i >= level) return null;
        return (
          <SvgPath
            key={`fill-${i}`}
            d={describeArc(size / 2, size / 2, radius, i * segmentAngle + gap / 2, (i + 1) * segmentAngle - gap / 2)}
            stroke="url(#ringGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
    </Svg>
  );
};

// SVG Arc Helper
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  var start = polarToCartesian(x, y, radius, endAngle);
  var end = polarToCartesian(x, y, radius, startAngle);
  var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  var d = [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
  return d;
}

export default function HomeScreen() {
  const { isPremium } = useSubscription();
  const { data: leaderboardData } = useLeaderboard();
  const { streak } = useTraining();

  const [openings, setOpenings] = useState<any[]>([]);
  const [pathNodes, setPathNodes] = useState<PathNode[]>([]);
  const [loading, setLoading] = useState(true);

  const userXP = leaderboardData?.currentUser?.total_xp || 0;

  // Define Repertoire Colors Logic
  const getRepertoireColor = (opening: any): 'white' | 'black' | 'both' => {
    // Simplified logic: random/mock for now, or based on 'color' prop if available
    // In real app, check opening.whitelevels and opening.blacklevels existence
    const hasWhite = opening.whitelevels && Object.keys(opening.whitelevels).length > 0;
    const hasBlack = opening.blacklevels && Object.keys(opening.blacklevels).length > 0;

    if (hasWhite && hasBlack) return 'both';
    if (hasWhite) return 'white';
    return 'black'; // Default to black if only black or unknown
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const cached = await getCachedAllOpenings();
        if (cached && mounted) processOpenings(cached);

        const fetched = await chessApi.getOpenings();
        if (!mounted) return;

        if (Array.isArray(fetched)) {
          processOpenings(fetched);
          await cacheAllOpenings(fetched);
        }
      } catch (e) {
        // Error handling
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const processOpenings = (data: any[]) => {
    const grouped = groupOpenings(data);
    // Sort logic...
    setOpenings(grouped);
    buildPath(grouped);
  };

  const buildPath = (openingsList: any[]) => {
    const nodes: PathNode[] = [];
    let yOffset = 120;

    // Mock user progress: level 0-3 for each opening
    // In production, fetch this from user profile/progress

    // Demo: First 3 completed (L3), next 1 current (L1), rest locked (L0)
    const currentIndex = 3;

    const ITEMS_PER_UNIT = 6;

    openingsList.forEach((opening, index) => {
      const unitIndex = Math.floor(index / ITEMS_PER_UNIT);
      const isRight = index % 2 === 0;
      const x = SCREEN_WIDTH / 2 + (isRight ? 1 : -1) * PATH_AMPLITUDE;

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

      let status: 'completed' | 'current' | 'next' | 'locked' = 'locked';
      let masteryLevel: 0 | 1 | 2 | 3 = 0;

      if (index < currentIndex) {
        status = 'completed';
        masteryLevel = 3;
      } else if (index === currentIndex) {
        status = 'current';
        masteryLevel = 1; // In progress
      } else if (index === currentIndex + 1) {
        status = 'next'; // Readable but locked
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

      // Chest logic...
      if ((index + 1) % 4 === 0) {
        nodes.push({ type: 'reward', status: index < currentIndex ? 'completed' : 'locked', x: SCREEN_WIDTH / 2 + (isRight ? -1 : 1) * 50, y: yOffset - VERTICAL_SPACING / 2, masteryLevel: 0, repertoireColor: 'both' });
      }
    });
    setPathNodes(nodes);
  };

  const pathSvg = useMemo(() => {
    if (pathNodes.length === 0) return '';
    const lessonNodes = pathNodes.filter(n => n.type === 'lesson');
    if (lessonNodes.length === 0) return '';
    let d = `M ${SCREEN_WIDTH / 2} 0`;
    lessonNodes.forEach((node, i) => {
      const prev = i === 0 ? { x: SCREEN_WIDTH / 2, y: 0 } : lessonNodes[i - 1];
      const curr = node;
      const cp1x = prev.x;
      const cp1y = (prev.y + curr.y) / 2;
      const cp2x = curr.x;
      const cp2y = (prev.y + curr.y) / 2;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    });
    return d;
  }, [pathNodes]);

  const handlePress = (node: PathNode) => {
    if (node.status === 'locked' && !isPremium && node.index && node.index > 3) {
      Alert.alert('Locked', 'Upgrade to unlock.');
      return;
    }
    router.push({ pathname: '/training', params: { openingData: JSON.stringify({ ...node.opening, level: 1, color: 'w' }) } });
  };

  const getNodeColor = (node: PathNode) => {
    if (node.status === 'locked') return THEME.locked;
    if (node.repertoireColor === 'white') return THEME.whiteOpening;
    if (node.repertoireColor === 'black') return THEME.blackOpening;
    return THEME.bothOpening;
  };

  const getIconForOpening = (opening: any) => {
    // Map specific opening names to special icons if desired, otherwise difficulty
    if (opening.difficulty === 'advanced') return ICONS.rook;
    if (opening.difficulty === 'intermediate') return ICONS.knight;
    return ICONS.pawn;
  };

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={THEME.bothOpening} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Stats Bar */}
      <View style={styles.topBar}>
        <View style={styles.statChip}>
          <Image source={ICONS.star} style={{ width: 20, height: 20 }} />
          <Text style={styles.statText}>{userXP}</Text>
        </View>
        <View style={styles.statChip}>
          <Text style={{ fontSize: 16 }}>🔥</Text>
          <Text style={styles.statText}>{streak}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ minHeight: pathNodes.length * 100 + 200, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Background Path */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width={SCREEN_WIDTH} height={pathNodes.length * VERTICAL_SPACING + 500}>
            <SvgPath
              d={pathSvg}
              stroke={THEME.path}
              strokeWidth="80"
              fill="none"
              strokeLinecap="round"
            />
            <SvgPath
              d={pathSvg}
              stroke={THEME.pathHighlight}
              strokeWidth="70"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="15, 25"
            />
          </Svg>
        </View>

        {pathNodes.map((node, i) => {
          if (node.type === 'unit_header') {
            const unit = UNITS.find(u => u.id === node.unitId);
            return (
              <View key={i} style={[styles.unitHeader, { top: node.y - 40 }]}>
                <View style={[styles.unitBadge, { backgroundColor: unit?.color || THEME.ringFilled }]}>
                  <Text style={styles.unitText}>{unit?.name}</Text>
                </View>
              </View>
            );
          }
          if (node.type === 'reward') {
            return (
              <View key={i} style={[styles.nodeContainer, { left: node.x, top: node.y }]}>
                <Image source={ICONS.chest} style={[styles.chestIcon, node.status === 'locked' && { opacity: 0.5, tintColor: '#555' }]} resizeMode="contain" />
              </View>
            );
          }

          const isCurrent = node.status === 'current';
          const isLocked = node.status === 'locked';
          const nodeColor = getNodeColor(node);
          const icon = getIconForOpening(node.opening);

          return (
            <View key={i} style={[styles.nodeContainer, { left: node.x, top: node.y }]}>
              {isCurrent && (
                <View style={styles.mascotContainer}>
                  <View style={styles.speechBubble}><Text style={styles.speechText}>Your Turn!</Text></View>
                  <Image source={MASCOTS.thinking} style={styles.mascotImage} resizeMode="contain" />
                </View>
              )}

              {/* Progress Ring for Levels */}
              <View style={styles.ringContainer}>
                <ProgressRing level={node.masteryLevel} size={114} />
              </View>

              <TouchableOpacity activeOpacity={0.8} onPress={() => handlePress(node)} style={styles.nodeButton}>
                {/* Skewed Base for 3D effect */}
                <View style={[styles.nodeBase, { backgroundColor: '#111' }]} />
                <View style={[styles.nodeSurface, { backgroundColor: nodeColor, borderColor: isCurrent ? '#FFF' : 'rgba(255,255,255,0.1)' }]}>
                  <Image source={icon} style={[styles.nodeIcon, isLocked && { tintColor: '#000', opacity: 0.3 }]} resizeMode="contain" />

                  {/* Color Dots for Repertoire */}
                  <View style={styles.dotContainer}>
                    {node.repertoireColor === 'both' && (
                      <>
                        <View style={[styles.repDot, { backgroundColor: '#EEE' }]} />
                        <View style={[styles.repDot, { backgroundColor: '#222' }]} />
                      </>
                    )}
                    {node.repertoireColor === 'white' && <View style={[styles.repDot, { backgroundColor: '#EEE' }]} />}
                    {node.repertoireColor === 'black' && <View style={[styles.repDot, { backgroundColor: '#222' }]} />}
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.labelContainer}><Text style={styles.nodeLabel}>{node.opening?.name}</Text></View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  centerContent: {
    flex: 1,
    backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    zIndex: 100,
    backgroundColor: 'rgba(19, 19, 19, 0.95)', // Slightly more opaque
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  statText: {
    color: '#FFC800',
    fontWeight: '800',
    fontSize: 15,
  },
  nodeContainer: {
    position: 'absolute',
    width: 120, // Wider for mascot containment
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  nodeButton: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeBase: {
    position: 'absolute',
    bottom: -8,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
  },
  nodeSurface: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'visible', // Allow icon to pop out
  },
  nodeIcon: {
    width: 95,
    height: 95,
    marginTop: -28,
    zIndex: 10,
  },
  chestIcon: {
    width: 70,
    height: 70,
  },
  labelContainer: {
    position: 'absolute',
    bottom: -30,
    width: 160,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nodeLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  unitHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  unitBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  unitText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 2,
  },
  mascotContainer: {
    position: 'absolute',
    right: 85,
    bottom: 25,
    width: 100,
    height: 100,
    zIndex: 20,
    alignItems: 'center',
  },
  mascotImage: {
    width: 90,
    height: 90,
  },
  speechBubble: {
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  speechText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
  },
  ringContainer: {
    position: 'absolute',
    width: 114,
    height: 114,
    zIndex: 0,
    // Center in 120x120 container: (120-114)/2 = 3
    // Account for 3D base visual offset (+4px down)
    left: 3,
    top: 7,
  },
  dotContainer: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    gap: 4,
  },
  repDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  starsRow: {
    position: 'absolute',
    bottom: -10,
    flexDirection: 'row',
    gap: 2,
  },
  miniStar: {
    width: 14,
    height: 14,
  },
});
