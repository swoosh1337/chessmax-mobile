import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, Dimensions, Alert, Modal, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Svg, { Path as SvgPath, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  useSharedValue,
  withSpring,
  Easing,
  interpolate,
  runOnJS
} from 'react-native-reanimated';
import { chessApi } from '@/src/api/chessApi';
import { colors } from '@/src/theme/colors';
import { useSubscription } from '@/src/context/SubscriptionContext';
import { useLeaderboard } from '@/src/context/LeaderboardContext';
import { useTraining } from '@/src/context/TrainingContext';
import { getCachedAllOpenings, cacheAllOpenings } from '@/src/utils/openingsCache';
import { groupOpenings } from '@/src/utils/openingGrouping';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VERTICAL_SPACING = 150;
const PATH_AMPLITUDE = 80;

// Animation Timings (Per Spec)
const TIMING = {
  idleBounce: 1800,
  idleDelay: 2500,
  tapDown: 80,
  tapUp: 120,
  ringFill: 400,
  bottomSheet: 320,
  sideSwitch: 250,
  mascotIn: 280,
  mascotOut: 200,
};

// Assets
const ICONS = {
  pawn: require('../../assets/new-icons/icon_pawn.png'),
  pawnBlack: require('../../assets/new-icons/icon_pawn_black.png'),
  knight: require('../../assets/new-icons/icon_knight.png'),
  rook: require('../../assets/new-icons/icon_rook.png'),
  queen: require('../../assets/new-icons/icon_queen.png'),
  king: require('../../assets/new-icons/icon_king.png'),
  chest: require('../../assets/new-icons/icon_chest.png'),
  star: require('../../assets/new-icons/icon_star.png'),
  flame: require('../../assets/new-icons/flame icon.png'),
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
  path: '#1a1a1a',
  pathHighlight: '#252525',

  // Node Colors by Repertoire
  whiteOpening: '#F5E6C8',  // Warm ivory/cream
  blackOpening: '#4A3A3A',  // Warm charcoal
  bothOpening: '#D4A84B',   // Neutral Gold

  locked: '#2a2a2a',
  lockedOverlay: 'rgba(0,0,0,0.5)',

  // Level Ring Colors (NO RED/AMBER - per spec)
  level1: '#58CC02',  // Soft Green - Beginner
  level2: '#FFD700',  // Bright Gold - Intermediate  
  level3: '#4A90D9',  // Deep Blue - Advanced (NOT red/amber)
  ringEmpty: 'rgba(255,255,255,0.08)',

  // Play button
  playGreen: '#58CC02',
  playGreenDark: '#46A302',

  // Side selection
  whiteSide: '#F5F0E1',     // Light cream/ivory
  whiteSideText: '#2D5016', // Dark green text
  blackSide: '#3A3A40',     // Dark slate (not pure black)
  blackSideText: '#E8E8E8', // Off-white text

  text: '#FFFFFF',
  textMuted: '#888888',
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
  masteryLevel: 0 | 1 | 2 | 3;
  repertoireColor: 'white' | 'black' | 'both';
}

const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedView = Animated.createAnimatedComponent(View);

// Pulsing Node Component for Current Opening Animation
const PulsingNode = ({ children, isActive }: { children: React.ReactNode, isActive: boolean }) => {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (isActive) {
      // Idle bounce: Scale 1.0 → 1.03 → 1.0 over 1.8s with 2.5s delay
      scale.value = withRepeat(
        withSequence(
          withDelay(TIMING.idleDelay, withTiming(1.03, { duration: TIMING.idleBounce / 2 })),
          withTiming(1, { duration: TIMING.idleBounce / 2 })
        ),
        -1, // Infinite repeat
        false
      );
    } else {
      scale.value = 1;
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <AnimatedView style={animatedStyle}>
      {children}
    </AnimatedView>
  );
};

// Level Ring Colors
const LEVEL_COLORS = [THEME.level1, THEME.level2, THEME.level3];

// Progress Ring Component with Level-Specific Colors
const ProgressRing = ({ level, status = 'locked', size = 114 }: { level: number, status?: string, size?: number }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const gap = 16; // Degrees between segments
  const segmentAngle = 360 / 3;

  return (
    <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
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
      {/* Filled Ring Segments - Each level has its own color */}
      {[0, 1, 2].map(i => {
        if (i >= level) return null;
        const segmentColor = LEVEL_COLORS[i];
        return (
          <SvgPath
            key={`fill-${i}`}
            d={describeArc(size / 2, size / 2, radius, i * segmentAngle + gap / 2, (i + 1) * segmentAngle - gap / 2)}
            stroke={segmentColor}
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
  const { streak, openingStats, refreshStats } = useTraining();

  const [openings, setOpenings] = useState<any[]>([]);
  const [pathNodes, setPathNodes] = useState<PathNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Chest reward state
  const [showXPReward, setShowXPReward] = useState(false);
  const [pendingXP, setPendingXP] = useState(0);

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

    // Helper to get the lowest available level for an opening
    const getLowestLevel = (opening: any): number => {
      const whiteLevels = opening.whitelevels ? Object.keys(opening.whitelevels).map(Number) : [];
      const blackLevels = opening.blacklevels ? Object.keys(opening.blacklevels).map(Number) : [];
      const allLevels = [...whiteLevels, ...blackLevels];
      if (allLevels.length === 0) return 99; // No levels = put at end
      return Math.min(...allLevels);
    };

    // Sort by lowest available difficulty level (1=easiest first), then by name
    const sorted = [...grouped].sort((a: any, b: any) => {
      const aLevel = getLowestLevel(a);
      const bLevel = getLowestLevel(b);

      // Primary: sort by difficulty level (1 = Beginner first)
      if (aLevel !== bLevel) return aLevel - bLevel;

      // Secondary: alphabetically by name
      return (a.name || '').localeCompare(b.name || '');
    });

    setOpenings(sorted);
    buildPath(sorted);
  };

  const buildPath = (openingsList: any[]) => {
    const nodes: PathNode[] = [];
    let yOffset = 120;

    const ITEMS_PER_UNIT = 6;
    const CHEST_INTERVAL = 4; // Chest after every 4 openings

    // Calculate progress: Find what index user has reached
    // Based on openingStats - an opening is "completed" if it has completed_sessions > 0
    let currentIndex = 0;
    openingsList.forEach((op, idx) => {
      const stats = openingStats.find(s => s.opening_name === op.name);
      if (stats && stats.completed_sessions > 0) {
        currentIndex = idx + 1; // Move current to next opening
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

      // Determine status and mastery from actual progress
      let status: 'completed' | 'current' | 'next' | 'locked' = 'locked';
      let masteryLevel: 0 | 1 | 2 | 3 = 0;

      const stats = openingStats.find(s => s.opening_name === opening.name);

      if (stats && stats.completed_sessions > 0) {
        status = 'completed';
        // Calculate mastery based on completed sessions (1-3 maps to mastery level)
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
        // Chest is unlocked when user has REACHED this point (includes current)
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

  // Modal state for opening details
  const [selectedOpening, setSelectedOpening] = useState<any>(null);
  const [selectedColor, setSelectedColor] = useState<'w' | 'b'>('w');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);

  const handlePress = (node: PathNode) => {
    // Haptic feedback on tap (Duolingo-style)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (node.status === 'locked' && !isPremium && node.index && node.index > 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Locked', 'Upgrade to unlock.');
      return;
    }

    // Open modal with opening details
    if (node.opening) {
      setSelectedOpening(node.opening);
      // Default to first available color
      const hasWhite = Object.keys(node.opening.whitelevels || {}).length > 0;
      const hasBlack = Object.keys(node.opening.blacklevels || {}).length > 0;
      setSelectedColor(hasWhite ? 'w' : 'b');
      setSelectedLevel(1);
    }
  };

  const handleStartTraining = () => {
    if (!selectedOpening) return;

    const colorLevels = selectedColor === 'w' ? selectedOpening.whitelevels : selectedOpening.blacklevels;
    const levelData = colorLevels?.[selectedLevel];

    if (!levelData) {
      Alert.alert('Not Available', 'This level is not yet available for this color.');
      return;
    }

    setSelectedOpening(null);
    router.push({
      pathname: '/training',
      params: {
        openingData: JSON.stringify({
          ...levelData,
          level: selectedLevel,
          color: selectedColor
        })
      }
    });
  };

  const getAvailableLevels = (colorKey: 'w' | 'b') => {
    if (!selectedOpening) return [];
    const levels = colorKey === 'w' ? selectedOpening.whitelevels : selectedOpening.blacklevels;
    return Object.keys(levels || {}).map(Number).sort();
  };

  const getNodeColor = (node: PathNode) => {
    if (node.status === 'locked') return THEME.locked;
    if (node.repertoireColor === 'white') return THEME.whiteOpening;
    if (node.repertoireColor === 'black') return THEME.blackOpening;
    return THEME.bothOpening;
  };

  const getIconForOpening = (opening: any, index?: number) => {
    // Rotate through different piece icons for visual variety
    const pieces = [ICONS.pawn, ICONS.knight, ICONS.rook, ICONS.queen, ICONS.king];

    // Use opening name hash or index to pick an icon
    if (index !== undefined) {
      return pieces[index % pieces.length];
    }

    // Fallback: difficulty-based
    if (opening?.difficulty === 'advanced') return ICONS.rook;
    if (opening?.difficulty === 'intermediate') return ICONS.knight;
    return ICONS.pawn;
  };

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={THEME.bothOpening} />
      </View>
    );
  }

  const hasWhite = selectedOpening && Object.keys(selectedOpening.whitelevels || {}).length > 0;
  const hasBlack = selectedOpening && Object.keys(selectedOpening.blacklevels || {}).length > 0;

  return (
    <View style={styles.container}>
      {/* Top Stats Bar */}
      <View style={styles.topBar}>
        <View style={styles.statChip}>
          <Image source={ICONS.star} style={{ width: 20, height: 20 }} />
          <Text style={styles.statText}>{userXP}</Text>
        </View>
        <View style={styles.statChip}>
          <Image source={ICONS.flame} style={{ width: 22, height: 22 }} />
          <Text style={styles.statText}>{streak}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          // Calculate height based on last node's Y position + some padding
          minHeight: pathNodes.length > 0
            ? Math.max(...pathNodes.map(n => n.y)) + 180
            : 500,
          paddingBottom: 80
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Background Path */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width={SCREEN_WIDTH} height={pathNodes.length > 0 ? Math.max(...pathNodes.map(n => n.y)) + 200 : 500}>
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
                <View style={[styles.unitBadge, { backgroundColor: unit?.color || THEME.level1 }]}>
                  <Text style={styles.unitText}>{unit?.name}</Text>
                </View>
              </View>
            );
          }

          // Chest/Reward nodes - only visible when unlocked
          if (node.type === 'reward') {
            const isChestUnlocked = node.status === 'completed';

            // Only render if unlocked (user has reached this point)
            if (!isChestUnlocked) return null;

            return (
              <TouchableOpacity
                key={i}
                style={[styles.chestContainer, { left: node.x, top: node.y }]}
                activeOpacity={0.8}
                onPress={() => {
                  // Haptic feedback
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                  // Award XP
                  setPendingXP(1000);
                  setShowXPReward(true);

                  // Hide after animation
                  setTimeout(() => {
                    setShowXPReward(false);
                    setPendingXP(0);
                  }, 2500);
                }}
              >
                <Image
                  source={ICONS.chest}
                  style={styles.chestIcon}
                  resizeMode="contain"
                />
                <View style={styles.chestGlow} />
              </TouchableOpacity>
            );
          }

          const isCurrent = node.status === 'current';
          const isLocked = node.status === 'locked';
          const nodeColor = getNodeColor(node);
          const icon = getIconForOpening(node.opening, node.index);

          return (
            <View key={i} style={[styles.nodeContainer, { left: node.x, top: node.y }]}>
              {/* 
                MASCOT LOGIC:
                The turtle mascot appears next to the CURRENT opening.
                Rotates through different mascot images based on node index.
              */}
              {isCurrent && (() => {
                // Rotate through mascot images based on node index
                const mascotImages = [MASCOTS.thinking, MASCOTS.playing, MASCOTS.sitting];
                const mascotImage = mascotImages[(node.index || 0) % mascotImages.length];

                // Different messages based on node index
                const messages = ["Your Turn!", "Let's Go!", "Keep Going!", "You Got This!"];
                const message = messages[(node.index || 0) % messages.length];

                return (
                  <View style={styles.mascotContainer}>
                    <View style={styles.speechBubble}><Text style={styles.speechText}>{message}</Text></View>
                    <Image source={mascotImage} style={styles.mascotImage} resizeMode="contain" />
                  </View>
                );
              })()}

              {/* Progress Ring for Levels */}
              <View style={styles.ringContainer}>
                <ProgressRing level={node.masteryLevel} size={114} />
              </View>

              <PulsingNode isActive={isCurrent}>
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
              </PulsingNode>
              <View style={styles.labelContainer}><Text style={styles.nodeLabel}>{node.opening?.name}</Text></View>
            </View>
          );
        })}
      </ScrollView>

      {/* Opening Detail Modal - Premium Game-Like Design */}
      <Modal
        visible={!!selectedOpening}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedOpening(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedOpening(null)} />

          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedOpening(null)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            {/* HERO: Large Chess Piece Medallion */}
            <View style={styles.heroContainer}>
              <View style={styles.heroGlowOuter} />
              <View style={styles.heroGlowInner} />
              <View style={styles.heroBadge}>
                <Image
                  source={selectedColor === 'w' ? ICONS.pawn : ICONS.pawnBlack}
                  style={styles.heroIcon}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Opening Name */}
            <Text style={styles.modalTitle}>{selectedOpening?.name}</Text>

            {/* Difficulty Pill Badge - Based on available levels */}
            {(() => {
              const availLevels = getAvailableLevels(selectedColor);
              const lowestLevel = Math.min(...availLevels);
              const difficultyLabel = lowestLevel === 1 ? 'Beginner' : lowestLevel === 2 ? 'Intermediate' : 'Advanced';
              const difficultyColor = lowestLevel === 1 ? THEME.level1 : lowestLevel === 2 ? THEME.level2 : THEME.level3;

              return (
                <View style={[styles.difficultyPill, {
                  backgroundColor: `${difficultyColor}20`,
                  borderColor: difficultyColor,
                }]}>
                  <Text style={[styles.difficultyPillText, { color: difficultyColor }]}>
                    {difficultyLabel}
                  </Text>
                </View>
              );
            })()}

            {/* SIDE SELECTION - Only show if BOTH sides are available */}
            {hasWhite && hasBlack && (
              <>
                <View style={styles.sectionLabelRow}>
                  <Text style={styles.sectionLabel}>Choose your side:</Text>
                  <Image source={MASCOTS.thinking} style={styles.mascotMini} resizeMode="contain" />
                </View>
                <View style={styles.sideCards}>
                  {/* White Card */}
                  <TouchableOpacity
                    style={[
                      styles.sideCard,
                      styles.sideCardWhite,
                      selectedColor === 'w' && styles.sideCardSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedColor('w');
                    }}
                    activeOpacity={0.8}
                  >
                    <Image source={ICONS.pawn} style={styles.sideCardIcon} resizeMode="contain" />
                    <Text style={[styles.sideCardLabel, styles.sideCardLabelWhite]}>White</Text>
                    {selectedColor === 'w' && <View style={[styles.sideCardGlow, { shadowColor: THEME.playGreen }]} />}
                  </TouchableOpacity>

                  {/* Black Card */}
                  <TouchableOpacity
                    style={[
                      styles.sideCard,
                      styles.sideCardBlack,
                      selectedColor === 'b' && styles.sideCardSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedColor('b');
                    }}
                    activeOpacity={0.8}
                  >
                    <Image source={ICONS.pawnBlack} style={styles.sideCardIcon} resizeMode="contain" />
                    <Text style={[styles.sideCardLabel, styles.sideCardLabelBlack]}>Black</Text>
                    {selectedColor === 'b' && <View style={[styles.sideCardGlow, { shadowColor: THEME.playGreen }]} />}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* If only ONE side available, show which side it is */}
            {(hasWhite && !hasBlack) && (
              <View style={styles.singleSideBadge}>
                <Image source={ICONS.pawn} style={styles.singleSideIcon} resizeMode="contain" />
                <Text style={styles.singleSideText}>Play as White</Text>
              </View>
            )}
            {(!hasWhite && hasBlack) && (
              <View style={styles.singleSideBadge}>
                <Image source={ICONS.pawnBlack} style={styles.singleSideIcon} resizeMode="contain" />
                <Text style={styles.singleSideText}>Play as Black</Text>
              </View>
            )}

            {/* DIFFICULTY SELECTION - Cards with Rings */}
            <Text style={styles.sectionLabel}>Pick your challenge:</Text>
            <View style={styles.difficultyCards}>
              {[1, 2, 3].map(lvl => {
                const available = getAvailableLevels(selectedColor).includes(lvl);
                const isSelected = selectedLevel === lvl;
                const levelColors = [THEME.level1, THEME.level2, THEME.level3];
                const levelColor = levelColors[lvl - 1];
                const levelIcons = [ICONS.pawn, ICONS.knight, ICONS.rook];
                const levelLabels = ['Beginner', 'Intermediate', 'Advanced'];

                return (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.difficultyCard,
                      isSelected && { borderColor: levelColor, transform: [{ scale: 1.05 }] },
                      !available && styles.difficultyCardDisabled
                    ]}
                    onPress={() => {
                      if (available) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedLevel(lvl);
                      }
                    }}
                    disabled={!available}
                    activeOpacity={0.8}
                  >
                    {/* Circular Ring with Icon */}
                    <View style={[
                      styles.difficultyRing,
                      { borderColor: available ? levelColor : '#444' },
                      isSelected && { borderWidth: 4, shadowColor: levelColor, shadowOpacity: 0.6, shadowRadius: 8 }
                    ]}>
                      <Image
                        source={levelIcons[lvl - 1]}
                        style={[styles.difficultyRingIcon, !available && { opacity: 0.3 }]}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={[
                      styles.difficultyCardLabel,
                      isSelected && { color: levelColor, fontWeight: '700' }
                    ]}>
                      {levelLabels[lvl - 1]}
                    </Text>
                    {!available && <Text style={styles.lockBadge}>🔒</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* PLAY BUTTON - Large Premium Pill */}
            <TouchableOpacity
              style={styles.playButtonPremium}
              onPress={handleStartTraining}
              activeOpacity={0.9}
            >
              <Text style={styles.playButtonPremiumText}>▶  Play</Text>
            </TouchableOpacity>

            {/* MASCOT - Only show with speech if both sides are available */}
            {hasWhite && hasBlack && (
              <View style={styles.mascotCorner}>
                <Image source={MASCOTS.sitting} style={styles.mascotImageModal} resizeMode="contain" />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* XP Reward Animation Modal */}
      <Modal
        visible={showXPReward}
        transparent
        animationType="fade"
        onRequestClose={() => setShowXPReward(false)}
      >
        <View style={styles.xpRewardOverlay}>
          <View style={styles.xpRewardContent}>
            <Image source={ICONS.chest} style={styles.xpChestIcon} resizeMode="contain" />
            <View style={styles.xpBadge}>
              <Image source={ICONS.star} style={{ width: 30, height: 30 }} />
              <Text style={styles.xpRewardText}>+{pendingXP} XP</Text>
            </View>
            <Text style={styles.xpRewardTitle}>Chest Opened!</Text>
            <View style={styles.streakBadge}>
              <Image source={ICONS.flame} style={{ width: 24, height: 24 }} />
              <Text style={styles.streakBadgeText}>{streak} Day Streak!</Text>
            </View>
          </View>
        </View>
      </Modal>
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
    right: 110,  // Moved farther left from the node
    bottom: 20,
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 8,
    borderWidth: 3,
    borderColor: '#444',
  },
  modalIcon: {
    width: 60,
    height: 60,
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
    marginTop: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    marginTop: 16,
  },
  colorToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  colorButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#333',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonActive: {
    borderColor: '#58CC02',
    backgroundColor: 'rgba(88, 204, 2, 0.15)',
  },
  colorButtonDisabled: {
    opacity: 0.4,
  },
  colorButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  levelPills: {
    flexDirection: 'row',
    gap: 12,
  },
  levelPill: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#333',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelPillActive: {
    borderColor: '#FFC800',
    backgroundColor: 'rgba(255, 200, 0, 0.15)',
  },
  levelPillDisabled: {
    opacity: 0.4,
  },
  levelPillText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  levelPillTextActive: {
    color: '#FFC800',
  },
  lockIcon: {
    fontSize: 12,
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#58CC02',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#58CC02',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  levelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 6,
  },
  levelSubtext: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Chest Styles
  chestContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
    marginLeft: -40,
    marginTop: -40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  chestGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 200, 0, 0.2)',
    zIndex: -1,
  },

  // XP Reward Modal
  xpRewardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpRewardContent: {
    alignItems: 'center',
    padding: 40,
  },
  xpChestIcon: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC800',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
    marginBottom: 16,
  },
  xpRewardText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
  },
  xpRewardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,100,0,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FF6400',
  },
  streakBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6400',
  },

  // ============================================
  // NEW PLAYFUL MODAL STYLES (Duolingo-inspired)
  // ============================================

  modalIconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(88, 204, 2, 0.15)',
  },

  // Difficulty Badge
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 20,
    gap: 6,
  },
  difficultyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  difficultyText: {
    color: '#AAA',
    fontSize: 14,
    fontWeight: '500',
  },

  // Side Selector (Chess Piece Chips)
  sideSelector: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  sideChip: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sideChipWhite: {
    backgroundColor: '#F5E6C8',
  },
  sideChipBlack: {
    backgroundColor: '#3A3A3A',
  },
  sideChipActive: {
    borderColor: THEME.playGreen,
    shadowColor: THEME.playGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    transform: [{ translateY: -2 }],
  },
  sideChipDisabled: {
    opacity: 0.4,
  },
  sideChipIcon: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  sideChipLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  sideChipLabelActive: {
    color: THEME.playGreen,
  },

  // Level Badges (Circular)
  levelBadges: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  levelBadge: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelBadgeActive: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    transform: [{ scale: 1.02 }],
  },
  levelBadgeDisabled: {
    opacity: 0.4,
  },
  levelBadgeRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  levelBadgeIcon: {
    width: 28,
    height: 28,
  },
  levelBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lockIconSmall: {
    fontSize: 10,
    marginTop: 4,
  },

  // Play Button (Premium, Inviting)
  playButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 50,
    backgroundColor: THEME.playGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.playGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  playButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },

  // Mascot in Modal
  modalMascot: {
    position: 'absolute',
    bottom: -20,
    left: -10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  modalMascotBubble: {
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: -10,
    marginBottom: 30,
  },
  modalMascotText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  modalMascotImage: {
    width: 60,
    height: 60,
  },

  // =============================================
  // NEW PREMIUM MODAL STYLES (Duolingo-inspired)
  // =============================================

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },

  // Hero Section (Large Pawn Medallion)
  heroContainer: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroGlowOuter: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(88, 204, 2, 0.08)',
  },
  heroGlowInner: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(88, 204, 2, 0.15)',
  },
  heroBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2A3A2A',
    borderWidth: 3,
    borderColor: THEME.playGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.playGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  heroIcon: {
    width: 55,
    height: 55,
  },

  // Difficulty Pill
  difficultyPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  difficultyPillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Section Labels
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Side Selection Cards
  sideCards: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    width: '100%',
  },
  sideCard: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  sideCardWhite: {
    backgroundColor: THEME.whiteSide,
  },
  sideCardBlack: {
    backgroundColor: THEME.blackSide,
  },
  sideCardSelected: {
    borderColor: THEME.playGreen,
    transform: [{ scale: 1.02 }],
  },
  sideCardDisabled: {
    opacity: 0.4,
  },
  sideCardIcon: {
    width: 50,
    height: 50,
    marginBottom: 10,
  },
  sideCardLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  sideCardLabelWhite: {
    color: THEME.whiteSideText,
  },
  sideCardLabelBlack: {
    color: THEME.blackSideText,
  },
  sideCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },

  // Difficulty Cards
  difficultyCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
    width: '100%',
  },
  difficultyCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  difficultyCardDisabled: {
    opacity: 0.4,
  },
  difficultyRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  difficultyRingIcon: {
    width: 28,
    height: 28,
  },
  difficultyCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lockBadge: {
    fontSize: 10,
    marginTop: 4,
  },

  // Play Button Premium
  playButtonPremium: {
    width: '100%',
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.playGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.playGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    marginBottom: 20,
  },
  playButtonPremiumText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 2,
  },

  // Mascot Corner
  mascotCorner: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  mascotBubbleModal: {
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 35,
    marginRight: -15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  mascotBubbleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  mascotImageModal: {
    width: 55,
    height: 55,
  },

  // Section Label Row (with mini mascot)
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  mascotMini: {
    width: 32,
    height: 32,
  },

  // Single Side Badge (when only one side available)
  singleSideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(88, 204, 2, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: THEME.playGreen,
  },
  singleSideIcon: {
    width: 32,
    height: 32,
  },
  singleSideText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.playGreen,
  },
});
