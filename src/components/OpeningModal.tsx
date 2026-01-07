import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Image,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';

// Theme Palette (matches home screen)
const THEME = {
  background: '#131313',
  level1: '#58CC02',
  level2: '#FFD700',
  level3: '#4A90D9',
  playGreen: '#58CC02',
  playGreenDark: '#46A302',
  whiteSide: '#F5F0E1',
  whiteSideText: '#2D5016',
  blackSide: '#3A3A40',
  blackSideText: '#E8E8E8',
  text: '#FFFFFF',
  textMuted: '#888888',
};

// Assets
const ICONS = {
  pawn: require('../../assets/new-icons/icon_pawn.webp'),
  pawnBlack: require('../../assets/new-icons/icon_pawn_black.webp'),
  knight: require('../../assets/new-icons/icon_knight.webp'),
  rook: require('../../assets/new-icons/icon_rook.webp'),
};

const MASCOTS = {
  thinking: require('../../assets/mascot/turtle_thinking.webp'),
  sitting: require('../../assets/mascot/turtle_sitting.webp'),
};

export interface Opening {
  name: string;
  whitelevels?: Record<number, any>;
  blacklevels?: Record<number, any>;
}

export interface OpeningModalProps {
  visible: boolean;
  opening: Opening | null;
  selectedColor: 'w' | 'b';
  selectedLevel: number;
  onClose: () => void;
  onColorChange: (color: 'w' | 'b') => void;
  onLevelChange: (level: number) => void;
  onPlay: () => void;
}

/**
 * Modal for selecting opening color and difficulty level
 */
export default function OpeningModal({
  visible,
  opening,
  selectedColor,
  selectedLevel,
  onClose,
  onColorChange,
  onLevelChange,
  onPlay,
}: OpeningModalProps) {
  if (!opening) return null;

  const hasWhite = Object.keys(opening.whitelevels || {}).length > 0;
  const hasBlack = Object.keys(opening.blacklevels || {}).length > 0;

  const getAvailableLevels = (colorKey: 'w' | 'b') => {
    const levels = colorKey === 'w' ? opening.whitelevels : opening.blacklevels;
    return Object.keys(levels || {}).map(Number).sort();
  };

  const availLevels = getAvailableLevels(selectedColor);
  const lowestLevel = Math.min(...availLevels);
  const difficultyLabel = lowestLevel === 1 ? 'Beginner' : lowestLevel === 2 ? 'Intermediate' : 'Advanced';
  const difficultyColor = lowestLevel === 1 ? THEME.level1 : lowestLevel === 2 ? THEME.level2 : THEME.level3;

  const levelColors = [THEME.level1, THEME.level2, THEME.level3];
  const levelIcons = [ICONS.pawn, ICONS.knight, ICONS.rook];
  const levelLabels = ['Beginner', 'Intermediate', 'Advanced'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
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
          <Text style={styles.modalTitle}>{opening.name}</Text>

          {/* Difficulty Pill Badge */}
          <View style={[styles.difficultyPill, {
            backgroundColor: `${difficultyColor}20`,
            borderColor: difficultyColor,
          }]}>
            <Text style={[styles.difficultyPillText, { color: difficultyColor }]}>
              {difficultyLabel}
            </Text>
          </View>

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
                    onColorChange('w');
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
                    onColorChange('b');
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
          {hasWhite && !hasBlack && (
            <View style={styles.singleSideBadge}>
              <Image source={ICONS.pawn} style={styles.singleSideIcon} resizeMode="contain" />
              <Text style={styles.singleSideText}>Play as White</Text>
            </View>
          )}
          {!hasWhite && hasBlack && (
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
              const levelColor = levelColors[lvl - 1];

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
                      onLevelChange(lvl);
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
            onPress={onPlay}
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
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#1E1E22',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
    position: 'relative',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalCloseText: {
    color: '#888',
    fontSize: 24,
    fontWeight: '300',
  },
  heroContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroGlowOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#58CC0215',
  },
  heroGlowInner: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#58CC0225',
  },
  heroBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2A2A30',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#58CC0250',
  },
  heroIcon: {
    width: 60,
    height: 60,
  },
  modalTitle: {
    color: THEME.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  difficultyPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  difficultyPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    color: THEME.textMuted,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 12,
  },
  mascotMini: {
    width: 32,
    height: 32,
  },
  sideCards: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    width: '100%',
    justifyContent: 'center',
  },
  sideCard: {
    width: 130,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
  },
  sideCardWhite: {
    backgroundColor: THEME.whiteSide,
  },
  sideCardBlack: {
    backgroundColor: THEME.blackSide,
  },
  sideCardSelected: {
    borderColor: THEME.playGreen,
  },
  sideCardIcon: {
    width: 50,
    height: 50,
    marginBottom: 8,
  },
  sideCardLabel: {
    fontSize: 16,
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
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  singleSideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 20,
    gap: 10,
  },
  singleSideIcon: {
    width: 30,
    height: 30,
  },
  singleSideText: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: '600',
  },
  difficultyCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
    justifyContent: 'center',
  },
  difficultyCard: {
    width: 95,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#2A2A30',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  difficultyCardDisabled: {
    opacity: 0.4,
  },
  difficultyRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E22',
    marginBottom: 8,
  },
  difficultyRingIcon: {
    width: 32,
    height: 32,
  },
  difficultyCardLabel: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 12,
  },
  playButtonPremium: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: THEME.playGreen,
    alignItems: 'center',
    shadowColor: THEME.playGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  playButtonPremiumText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  mascotCorner: {
    position: 'absolute',
    bottom: 100,
    right: -10,
    zIndex: -1,
  },
  mascotImageModal: {
    width: 80,
    height: 80,
    opacity: 0.3,
  },
});
