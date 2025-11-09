import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import { WEB_URL } from '../config';

export default function CompactOpeningCard({ opening, onPress, onToggleFavorite, isFavorite }) {
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

  // Handle color selection
  const handleColorSelect = (color) => {
    // console.log(`🎨 Color selected: ${color} for ${opening?.name}`);
    // console.log(`   whitelevels[1].gif:`, whitelevels?.[1]?.gif);
    // console.log(`   blacklevels[1].gif:`, blacklevels?.[1]?.gif);
    // console.log(`   opening.gif:`, opening?.gif);
    setSelectedColor(color);
    setImageKey(prev => prev + 1); // Force image reload
  };

  return (
    <TouchableOpacity
      style={styles.card}
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
            style={styles.boardImage}
            resizeMode="cover"
            // onLoadStart={() => console.log(`🖼️ Loading image for ${opening?.name} (${selectedColor} L${selectedLevel}): ${imageUrl}`)}
            // onLoad={() => console.log(`✅ Image loaded successfully`)}
            onError={(error) => console.error(`❌ Failed to load image for ${opening?.name}:`, error.nativeEvent)}
          />
        ) : (
          <View style={styles.placeholderBoard}>
            <Text style={styles.placeholderText}>♟</Text>
          </View>
        )}
      </View>

      {/* Opening Info */}
      <View style={styles.content}>
        {/* Opening Name */}
        <Text style={styles.title} numberOfLines={2}>
          {opening?.name || 'Opening'}
        </Text>

        {/* Stats */}
        <Text style={styles.stats}>
          {totalVariations} vars · {availableLevels.length} lvl{availableLevels.length !== 1 ? 's' : ''}
        </Text>

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
});
