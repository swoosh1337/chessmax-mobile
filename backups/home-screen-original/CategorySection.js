import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import CompactOpeningCard from './CompactOpeningCard';

export default function CategorySection({
  categoryName,
  openings,
  onOpeningPress,
  onToggleFavorite,
  favorites = new Set(),
  isPremium = false,
  isOpeningAccessible = () => true,
  isInFirstThreeOpenings = () => false,
}) {
  if (!openings || openings.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {/* Category Header */}
      <View style={styles.header}>
        <Text style={styles.categoryTitle}>{categoryName}</Text>
        <Text style={styles.count}>{openings.length}</Text>
      </View>

      {/* 2-Column Grid */}
      <View style={styles.grid}>
        {openings.map((opening) => {
          const isAccessible = isOpeningAccessible(opening);
          const isInFirstThree = isInFirstThreeOpenings(opening);
          return (
            <View key={opening.id || opening.name} style={styles.gridItem}>
              <CompactOpeningCard
                opening={opening}
                onPress={onOpeningPress}
                onToggleFavorite={onToggleFavorite}
                isFavorite={favorites.has(opening.id || opening.name)}
                isLocked={!isAccessible}
                isPremium={isPremium}
                isInFirstThree={isInFirstThree}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
    flex: 1,
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSubtle,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  gridItem: {
    width: '50%',
  },
});
