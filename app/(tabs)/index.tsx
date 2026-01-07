import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, Dimensions, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Svg, { Path as SvgPath } from 'react-native-svg';
import Animated, { useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, useSharedValue } from 'react-native-reanimated';
import { useSubscription } from '@/src/context/SubscriptionContext';
import { useLeaderboard } from '@/src/context/LeaderboardContext';
import { useTraining } from '@/src/context/TrainingContext';
import { usePathNodes, PathNode } from '@/src/hooks/usePathNodes';
import StatBar from '@/src/components/StatBar';
import OpeningModal from '@/src/components/OpeningModal';
import XPRewardModal from '@/src/components/XPRewardModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Theme constants
const THEME = {
  background: '#131313',
  path: '#1a1a1a',
  pathHighlight: '#252525',
  whiteOpening: '#F5E6C8',
  blackOpening: '#4A3A3A',
  bothOpening: '#D4A84B',
  locked: '#2a2a2a',
  level1: '#58CC02',
  level2: '#FFD700',
  level3: '#4A90D9',
  ringEmpty: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
};

// Assets
const ICONS = {
  pawn: require('../../assets/new-icons/icon_pawn.webp'),
  pawnBlack: require('../../assets/new-icons/icon_pawn_black.webp'),
  knight: require('../../assets/new-icons/icon_knight.webp'),
  rook: require('../../assets/new-icons/icon_rook.webp'),
  queen: require('../../assets/new-icons/icon_queen.webp'),
  king: require('../../assets/new-icons/icon_king.webp'),
  chest: require('../../assets/new-icons/icon_chest.webp'),
};

const MASCOTS = {
  thinking: require('../../assets/mascot/turtle_thinking.webp'),
  playing: require('../../assets/mascot/turtle_playing_chess.webp'),
  sitting: require('../../assets/mascot/turtle_sitting.webp'),
};

const LEVEL_COLORS = [THEME.level1, THEME.level2, THEME.level3];

const AnimatedView = Animated.createAnimatedComponent(View);

// Pulsing animation for current node
const PulsingNode = ({ children, isActive }: { children: React.ReactNode; isActive: boolean }) => {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (isActive) {
      scale.value = withRepeat(
        withSequence(withDelay(2500, withTiming(1.03, { duration: 900 })), withTiming(1, { duration: 900 })),
        -1, false
      );
    } else {
      scale.value = 1;
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <AnimatedView style={animatedStyle}>{children}</AnimatedView>;
};

// Progress Ring Component
const ProgressRing = ({ level, size = 114 }: { level: number; size?: number }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const gap = 16;
  const segmentAngle = 360 / 3;

  return (
    <Svg width={size} height={size} style={styles.progressRingSvg}>
      {[0, 1, 2].map(i => (
        <SvgPath key={`bg-${i}`} d={describeArc(size / 2, size / 2, radius, i * segmentAngle + gap / 2, (i + 1) * segmentAngle - gap / 2)} stroke={THEME.ringEmpty} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
      ))}
      {[0, 1, 2].map(i => {
        if (i >= level) return null;
        return (
          <SvgPath key={`fill-${i}`} d={describeArc(size / 2, size / 2, radius, i * segmentAngle + gap / 2, (i + 1) * segmentAngle - gap / 2)} stroke={LEVEL_COLORS[i]} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
        );
      })}
    </Svg>
  );
};

// SVG Arc Helpers
function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(x: number, y: number, r: number, start: number, end: number) {
  const s = polarToCartesian(x, y, r, end);
  const e = polarToCartesian(x, y, r, start);
  const large = end - start <= 180 ? '0' : '1';
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

// Helper functions
const getNodeColor = (node: PathNode) => {
  if (node.status === 'locked') return THEME.locked;
  if (node.repertoireColor === 'white') return THEME.whiteOpening;
  if (node.repertoireColor === 'black') return THEME.blackOpening;
  return THEME.bothOpening;
};

const getIconForOpening = (index?: number) => {
  const pieces = [ICONS.pawn, ICONS.knight, ICONS.rook, ICONS.queen, ICONS.king];
  return pieces[(index || 0) % pieces.length];
};

export default function HomeScreen() {
  const { isPremium } = useSubscription();
  const { data: leaderboardData } = useLeaderboard();
  const { streak } = useTraining();
  const { pathNodes, loading, units } = usePathNodes();

  // Modal state
  const [selectedOpening, setSelectedOpening] = useState<any>(null);
  const [selectedColor, setSelectedColor] = useState<'w' | 'b'>('w');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);

  // XP Reward state
  const [showXPReward, setShowXPReward] = useState(false);
  const [pendingXP, setPendingXP] = useState(0);

  const userXP = leaderboardData?.currentUser?.total_xp || 0;

  // Build path SVG
  const pathSvg = useMemo(() => {
    if (pathNodes.length === 0) return '';
    const lessonNodes = pathNodes.filter(n => n.type === 'lesson');
    if (lessonNodes.length === 0) return '';
    let d = `M ${SCREEN_WIDTH / 2} 0`;
    lessonNodes.forEach((node, i) => {
      const prev = i === 0 ? { x: SCREEN_WIDTH / 2, y: 0 } : lessonNodes[i - 1];
      const cp1y = (prev.y + node.y) / 2;
      d += ` C ${prev.x} ${cp1y}, ${node.x} ${cp1y}, ${node.x} ${node.y}`;
    });
    return d;
  }, [pathNodes]);

  const handlePress = (node: PathNode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (node.status === 'locked' && !isPremium && node.index && node.index > 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Locked', 'Upgrade to unlock.');
      return;
    }
    if (node.opening) {
      setSelectedOpening(node.opening);
      const hasWhite = Object.keys(node.opening.whitelevels || {}).length > 0;
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
    router.push({ pathname: '/training', params: { openingData: JSON.stringify({ ...levelData, level: selectedLevel, color: selectedColor }) } });
  };

  const handleChestPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPendingXP(1000);
    setShowXPReward(true);
    setTimeout(() => { setShowXPReward(false); setPendingXP(0); }, 2500);
  };

  if (loading) {
    return <View style={styles.centerContent}><ActivityIndicator size="large" color={THEME.bothOpening} /></View>;
  }

  const maxY = pathNodes.length > 0 ? Math.max(...pathNodes.map(n => n.y)) : 500;

  return (
    <View style={styles.container}>
      <StatBar xp={userXP} streak={streak} />

      <ScrollView contentContainerStyle={{ minHeight: maxY + 180, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Background Path */}
        <View style={StyleSheet.absoluteFill}>
          <Svg width={SCREEN_WIDTH} height={maxY + 200}>
            <SvgPath d={pathSvg} stroke={THEME.path} strokeWidth="80" fill="none" strokeLinecap="round" />
            <SvgPath d={pathSvg} stroke={THEME.pathHighlight} strokeWidth="70" fill="none" strokeLinecap="round" strokeDasharray="15, 25" />
          </Svg>
        </View>

        {pathNodes.map((node, i) => {
          if (node.type === 'unit_header') {
            const unit = units.find(u => u.id === node.unitId);
            return (
              <View key={i} style={[styles.unitHeader, { top: node.y - 40 }]}>
                <View style={[styles.unitBadge, { backgroundColor: unit?.color || THEME.level1 }]}>
                  <Text style={styles.unitText}>{unit?.name}</Text>
                </View>
              </View>
            );
          }

          if (node.type === 'reward') {
            if (node.status !== 'completed') return null;
            return (
              <TouchableOpacity key={i} style={[styles.chestContainer, { left: node.x, top: node.y }]} activeOpacity={0.8} onPress={handleChestPress}>
                <Image source={ICONS.chest} style={styles.chestIcon} resizeMode="contain" />
                <View style={styles.chestGlow} />
              </TouchableOpacity>
            );
          }

          const isCurrent = node.status === 'current';
          const isLocked = node.status === 'locked';
          const nodeColor = getNodeColor(node);
          const icon = getIconForOpening(node.index);

          return (
            <View key={i} style={[styles.nodeContainer, { left: node.x, top: node.y }]}>
              {/* Mascot for current node */}
              {isCurrent && (
                <View style={styles.mascotContainer}>
                  <View style={styles.speechBubble}><Text style={styles.speechText}>Your Turn!</Text></View>
                  <Image source={MASCOTS.thinking} style={styles.mascotImage} resizeMode="contain" />
                </View>
              )}

              {/* Progress Ring */}
              <View style={styles.ringContainer}>
                <ProgressRing level={node.masteryLevel} size={114} />
              </View>

              <PulsingNode isActive={isCurrent}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => handlePress(node)} style={styles.nodeButton}>
                  <View style={[styles.nodeBase, { backgroundColor: '#111' }]} />
                  <View style={[styles.nodeSurface, { backgroundColor: nodeColor, borderColor: isCurrent ? '#FFF' : 'rgba(255,255,255,0.1)' }]}>
                    <Image source={icon} style={[styles.nodeIcon, isLocked && { tintColor: '#000', opacity: 0.3 }]} resizeMode="contain" />
                    <View style={styles.dotContainer}>
                      {node.repertoireColor === 'both' && <><View style={[styles.repDot, { backgroundColor: '#EEE' }]} /><View style={[styles.repDot, { backgroundColor: '#222' }]} /></>}
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

      {/* Opening Modal */}
      <OpeningModal
        visible={!!selectedOpening}
        opening={selectedOpening}
        selectedColor={selectedColor}
        selectedLevel={selectedLevel}
        onClose={() => setSelectedOpening(null)}
        onColorChange={setSelectedColor}
        onLevelChange={setSelectedLevel}
        onPlay={handleStartTraining}
      />

      {/* XP Reward Modal */}
      <XPRewardModal
        visible={showXPReward}
        xpAmount={pendingXP}
        streak={streak}
        onClose={() => setShowXPReward(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  centerContent: { flex: 1, backgroundColor: THEME.background, justifyContent: 'center', alignItems: 'center' },
  nodeContainer: { position: 'absolute', width: 120, height: 120, marginLeft: -60, marginTop: -60, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  nodeButton: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  nodeBase: { position: 'absolute', bottom: -8, width: 80, height: 80, borderRadius: 40, backgroundColor: '#333' },
  nodeSurface: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.1)', overflow: 'visible' },
  nodeIcon: { width: 95, height: 95, marginTop: -28, zIndex: 10 },
  chestIcon: { width: 70, height: 70 },
  labelContainer: { position: 'absolute', bottom: -30, width: 160, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  nodeLabel: { color: '#FFF', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  unitHeader: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 5 },
  unitBadge: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  unitText: { color: '#FFF', fontWeight: 'bold', fontSize: 18, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2 },
  mascotContainer: { position: 'absolute', right: 110, bottom: 20, width: 100, height: 100, zIndex: 20, alignItems: 'center' },
  mascotImage: { width: 90, height: 90 },
  speechBubble: { backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  speechText: { fontSize: 12, fontWeight: '800', color: '#000' },
  ringContainer: { position: 'absolute', width: 114, height: 114, zIndex: 0, left: 3, top: 7 },
  progressRingSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  dotContainer: { position: 'absolute', bottom: 8, flexDirection: 'row', gap: 4 },
  repDot: { width: 6, height: 6, borderRadius: 3 },
  chestContainer: { position: 'absolute', width: 80, height: 80, marginLeft: -40, marginTop: -40, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  chestGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255, 200, 0, 0.2)', zIndex: -1 },
});
