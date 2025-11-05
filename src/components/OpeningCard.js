import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import { WEB_URL } from '../config';

export default function OpeningCard({ opening, onStartTraining }) {
  // Get level-specific data based on selected color and level
  const whitelevels = opening?.whitelevels || {};
  const blacklevels = opening?.blacklevels || {};

  // Check which colors have variations
  const hasWhiteVariations = Object.keys(whitelevels).length > 0;
  const hasBlackVariations = Object.keys(blacklevels).length > 0;

  // Set initial color to the one that has variations
  const initialColor = hasWhiteVariations ? 'white' : 'black';
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedColor, setSelectedColor] = useState(initialColor);

  // Use grouped total variations if available
  const totalVariations = opening?.totalVariations || opening?.variations?.length || 0;

  const currentColorLevels = selectedColor === 'white' ? whitelevels : blacklevels;

  // Get available levels for current color
  const availableLevels = Object.keys(currentColorLevels).map(Number).filter(Boolean);

  // Auto-switch to first available level if current level doesn't exist
  React.useEffect(() => {
    if (availableLevels.length > 0 && !availableLevels.includes(selectedLevel)) {
      setSelectedLevel(availableLevels[0]);
    }
  }, [selectedColor, availableLevels, selectedLevel]);

  const currentLevelData = currentColorLevels[selectedLevel] || {};

  // Construct image URLs - images are served from web server, not API
  const baseUrl = WEB_URL;

  // Use GIF from level data first, then fall back to opening's default gif
  const currentGif = currentLevelData.gif || opening?.gif;
  const currentImage = currentLevelData.image || opening?.image;

  // Use GIF if available, otherwise use image, otherwise construct default URL
  const imageUrl = currentGif || currentImage || `${baseUrl}/img/openings/${opening?.id}.gif`;

  const handleStartTraining = () => {
    if (onStartTraining) {
      onStartTraining(opening, selectedLevel, selectedColor);
    }
  };
  
  return (
    <View style={styles.card}>
      {/* Board Preview Image/GIF - Click to start training */}
      <TouchableOpacity onPress={handleStartTraining} activeOpacity={0.8}>
        {imageUrl ? (
          <Image
            key={`${selectedColor}-${selectedLevel}-${imageUrl}`}
            source={{ uri: imageUrl }}
            style={styles.boardPreview}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.boardPreview, styles.placeholderBoard]}>
            <Text style={styles.placeholderText}>♟</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Opening Info */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>{opening?.name || 'Opening'}</Text>
          <View style={styles.variationsBadge}>
            <Text style={styles.variationsText}>📖 {totalVariations} variations</Text>
          </View>
        </View>

        {/* Level Selector - Only show available levels */}
        <View style={styles.levelRow}>
          {[1, 2, 3].map(level => {
            const isAvailable = availableLevels.includes(level);
            if (!isAvailable) return null;

            return (
              <TouchableOpacity
                key={level}
                onPress={() => setSelectedLevel(level)}
                style={[
                  styles.levelButton,
                  selectedLevel === level && styles.levelButtonActive
                ]}
              >
                {selectedLevel === level && <Text style={styles.levelIcon}>⚡</Text>}
                <Text style={[
                  styles.levelText,
                  selectedLevel === level && styles.levelTextActive
                ]}>
                  Level {level}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Color Selector - Only show if both colors have variations */}
        {(hasWhiteVariations || hasBlackVariations) && (
          <View style={styles.colorRow}>
            {hasWhiteVariations && (
              <TouchableOpacity
                onPress={() => setSelectedColor('white')}
                style={[
                  styles.colorButton,
                  !hasBlackVariations && styles.colorButtonFullWidth,
                  selectedColor === 'white' && styles.colorButtonActive
                ]}
              >
                <Text style={[
                  styles.colorText,
                  selectedColor === 'white' && styles.colorTextActive
                ]}>
                  White
                </Text>
              </TouchableOpacity>
            )}
            {hasBlackVariations && (
              <TouchableOpacity
                onPress={() => setSelectedColor('black')}
                style={[
                  styles.colorButton,
                  !hasWhiteVariations && styles.colorButtonFullWidth,
                  selectedColor === 'black' && styles.colorButtonBlackActive
                ]}
              >
                <Text style={[
                  styles.colorText,
                  selectedColor === 'black' && styles.colorTextBlackActive
                ]}>
                  Black
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🎯</Text>
            <Text style={styles.statLabel}>Learned</Text>
            <Text style={styles.statValue}>0 / 30</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statLabel}>Mastered</Text>
            <Text style={styles.statValue}>0 / 30</Text>
          </View>
        </View>

        {/* Success Rate */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>📊 0% success</Text>
          <Text style={styles.footerText}>⭐ 0 attempts</Text>
        </View>

        {/* Start Training Button */}
        <TouchableOpacity 
          onPress={handleStartTraining}
          style={styles.startButton}
        >
          <Text style={styles.startButtonIcon}>▶</Text>
          <Text style={styles.startButtonText}>
            Start level {selectedLevel} as {selectedColor === 'white' ? 'White' : 'Black'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  boardPreview: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.background,
  },
  placeholderBoard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 64,
    color: colors.textSubtle,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 8,
  },
  variationsBadge: {
    alignSelf: 'flex-start',
  },
  variationsText: {
    fontSize: 13,
    color: colors.textSubtle,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  levelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    gap: 4,
  },
  levelButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  levelIcon: {
    fontSize: 14,
  },
  levelText: {
    fontSize: 13,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  levelTextActive: {
    color: colors.primaryForeground,
    fontWeight: '700',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  colorButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  colorButtonFullWidth: {
    flex: 0,
    minWidth: '100%',
  },
  colorButtonActive: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  colorButtonBlackActive: {
    backgroundColor: '#000000',
    borderColor: colors.primary,
  },
  colorText: {
    fontSize: 14,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  colorTextActive: {
    fontSize: 14,
    color: colors.background,
    fontWeight: '700',
  },
  colorTextBlackActive: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSubtle,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    color: colors.foreground,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSubtle,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonIcon: {
    fontSize: 14,
    color: colors.primaryForeground,
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryForeground,
  },
});
