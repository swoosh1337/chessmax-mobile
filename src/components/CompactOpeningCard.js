import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import { WEB_URL } from '../config';
import { createLogger } from '../utils/logger';

const log = createLogger('CompactOpeningCard');

export default function CompactOpeningCard({ opening, onPress, onToggleFavorite, isFavorite, isLocked = false, isPremium = true, isInFirstThree = false }) {
  const whitelevels = opening?.whitelevels || {};
  const blacklevels = opening?.blacklevels || {};

  // Check which colors have variations
  const hasWhiteVariations = Object.keys(whitelevels).length > 0;
  const hasBlackVariations = Object.keys(blacklevels).length > 0;

  // Set initial color to the one that has variations
  const initialColor = hasWhiteVariations ? 'white' : 'black';
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [imageKey, setImageKey] = useState(0);

  // Get current color levels based on selected color
  const currentColorLevels = useMemo(() => {
    return selectedColor === 'white' ? whitelevels : blacklevels;
  }, [selectedColor, whitelevels, blacklevels]);

  // Get available levels for current color
  const availableLevels = useMemo(() => {
    return Object.keys(currentColorLevels).map(Number).filter(Boolean).sort((a, b) => a - b);
  }, [currentColorLevels]);

  // Auto-switch to first available level when color changes
  useEffect(() => {
    if (availableLevels.length > 0 && !availableLevels.includes(selectedLevel)) {
      setSelectedLevel(availableLevels[0]);
    }
  }, [selectedColor, availableLevels, selectedLevel]);

  // Get current level data
  const levelData = useMemo(() => {
    return currentColorLevels[selectedLevel] || {};
  }, [currentColorLevels, selectedLevel]);

  // Get image URL - prefer level-specific, fallback to opening default
  const imageUrl = useMemo(() => {
    // console.log(`📸 Building imageUrl for ${selectedColor} L${selectedLevel}:`);
    // console.log(`   levelData.id:`, levelData.id);
    // console.log(`   levelData.gif:`, levelData.gif);
    // console.log(`   opening.id:`, opening?.id);

    const currentGif = levelData.gif || opening?.gif;
    const currentImage = levelData.image || opening?.image;

    // If no gif/image from API, construct URL using levelData.id (each level has unique ID)
    let finalUrl;
    if (currentGif || currentImage) {
      finalUrl = currentGif || currentImage;
    } else {
      // Use levelData.id (specific to this color/level) not opening.id (grouped)
      const openingId = levelData.id || opening?.id;
      finalUrl = `${WEB_URL}/img/openings/${openingId}.gif`;
    }

    // console.log(`   → Final URL:`, finalUrl);
    return finalUrl;
  }, [levelData, opening, selectedColor, selectedLevel]);

  // Calculate stats
  const totalVariations = opening?.totalVariations || 0;
  const currentVariations = levelData?.variations?.length || 0;

  // Debug logging
  log.debug('Rendering card', {
    name: opening?.name,
    selectedColor,
    selectedLevel,
    currentVariations,
    hasLevelData: !!levelData
  });

  // Handle color selection
  const handleColorSelect = (color) => {
    log.debug('Color selected', { color, opening: opening?.name });
    setSelectedColor(color);
    setImageKey(prev => prev + 1); // Force image reload
  };

  // Check if the currently selected level is locked for free users
  // First 3 openings: All levels free
  // Other openings: Only level 1 free (levels 2+ require premium)
  const isCurrentLevelLocked = !isPremium && !isInFirstThree && selectedLevel > 1;

  return (
    <TouchableOpacity
      style={[styles.card, isCurrentLevelLocked && styles.cardLocked]}
      onPress={() => onPress(opening, selectedLevel, selectedColor)}
      activeOpacity={0.8}
    >
      {/* Board Preview Image/GIF */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            key={`${opening?.id}-${imageKey}`}
            source={{
              uri: imageUrl,
              cache: 'reload' // Force reload on key change
            }}
            style={[styles.boardImage, isCurrentLevelLocked && styles.boardImageLocked]}
            resizeMode="cover"
            onError={(error) => log.error('Failed to load image', undefined, { opening: opening?.name, error: error.nativeEvent })}
          />
        ) : (
          <View style={[styles.placeholderBoard, isCurrentLevelLocked && styles.placeholderLocked]}>
            <Text style={styles.placeholderText}>♟</Text>
          </View>
        )}

        {/* Lock Overlay - Only show when selected level is locked (Level 2 or 3 for free users) */}
        {isCurrentLevelLocked && (
          <View style={styles.lockOverlay}>
            <View style={styles.lockIconContainer}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
          </View>
        )}
      </View>

      {/* Opening Info */}
      <View style={styles.content}>
        {/* Opening Name */}
        <Text style={styles.title} numberOfLines={2}>
          {opening?.name || 'Opening'}
        </Text>

        {/* Stats - Show current level's variations */}
        <Text style={styles.stats}>
          {currentVariations} vars · L{selectedLevel}
        </Text>

        {/* Level Selector - Only show available levels */}
        {availableLevels.length > 0 && (
          <View style={styles.levelRow}>
            {[1, 2, 3].map(level => {
              const isAvailable = availableLevels.includes(level);
              if (!isAvailable) return null;

              return (
                <TouchableOpacity
                  key={level}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedLevel(level);
                    setImageKey(prev => prev + 1); // Force image reload
                  }}
                  style={[
                    styles.levelButton,
                    selectedLevel === level && styles.levelButtonActive
                  ]}
                >
                  <Text style={[
                    styles.levelText,
                    selectedLevel === level && styles.levelTextActive
                  ]}>
                    L{level}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Color Pills and Favorite Button Row */}
        <View style={styles.bottomRow}>
          <View style={styles.colorRow}>
            {hasWhiteVariations && (
              <TouchableOpacity
                style={[
                  styles.colorPill,
                  selectedColor === 'white' && styles.colorPillWhiteActive
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleColorSelect('white');
                }}
              >
                <Text style={[
                  styles.colorPillText,
                  selectedColor === 'white' && styles.colorPillTextActive
                ]}>
                  ♔
                </Text>
              </TouchableOpacity>
            )}
            {hasBlackVariations && (
              <TouchableOpacity
                style={[
                  styles.colorPill,
                  selectedColor === 'black' && styles.colorPillBlackActive
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleColorSelect('black');
                }}
              >
                <Text style={[
                  styles.colorPillText,
                  selectedColor === 'black' && styles.colorPillTextBlackActive
                ]}>
                  ♚
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(opening);
            }}
          >
            <Text style={styles.favoriteIcon}>
              {isFavorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    flex: 1,
    margin: 6,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  boardImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBoard: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 64,
    color: colors.textSubtle,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 6,
    minHeight: 36,
  },
  stats: {
    fontSize: 11,
    color: colors.textSubtle,
    marginBottom: 8,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSubtle,
  },
  levelTextActive: {
    color: colors.primaryForeground,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  colorPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorPillWhiteActive: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  colorPillBlackActive: {
    backgroundColor: '#000000',
    borderColor: colors.primary,
  },
  colorPillText: {
    fontSize: 16,
    color: colors.textSubtle,
  },
  colorPillTextActive: {
    color: colors.background,
  },
  colorPillTextBlackActive: {
    color: colors.primary,
  },
  favoriteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  favoriteIcon: {
    fontSize: 18,
    color: colors.primary,
  },
  cardLocked: {
    opacity: 0.6,
  },
  boardImageLocked: {
    opacity: 0.4,
  },
  placeholderLocked: {
    opacity: 0.4,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  lockIcon: {
    fontSize: 24,
  },
});
