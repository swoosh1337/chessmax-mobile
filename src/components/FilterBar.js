import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../theme/colors';

export default function FilterBar({
  selectedColorFilter,
  onColorFilterChange,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  favoritesCount = 0
}) {
  const colorFilters = [
    { value: 'all', label: 'All', icon: '♟' },
    { value: 'white', label: 'White', icon: '♔' },
    { value: 'black', label: 'Black', icon: '♚' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Color Filters */}
        {colorFilters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterPill,
              selectedColorFilter === filter.value && styles.filterPillActive,
              filter.value === 'white' && selectedColorFilter === 'white' && styles.filterPillWhite,
              filter.value === 'black' && selectedColorFilter === 'black' && styles.filterPillBlack,
            ]}
            onPress={() => onColorFilterChange(filter.value)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterIcon}>{filter.icon}</Text>
            <Text
              style={[
                styles.filterText,
                selectedColorFilter === filter.value && styles.filterTextActive,
                filter.value === 'white' && selectedColorFilter === 'white' && styles.filterTextWhite,
                filter.value === 'black' && selectedColorFilter === 'black' && styles.filterTextBlack,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Favorites Filter */}
        <TouchableOpacity
          style={[
            styles.filterPill,
            showFavoritesOnly && styles.filterPillFavorite,
          ]}
          onPress={onToggleFavoritesOnly}
          activeOpacity={0.7}
        >
          <Text style={styles.filterIcon}>
            {showFavoritesOnly ? '★' : '☆'}
          </Text>
          <Text
            style={[
              styles.filterText,
              showFavoritesOnly && styles.filterTextFavorite,
            ]}
          >
            Favorites
          </Text>
          {favoritesCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{favoritesCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillWhite: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  filterPillBlack: {
    backgroundColor: '#000000',
    borderColor: colors.primary,
  },
  filterPillFavorite: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterIcon: {
    fontSize: 16,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSubtle,
  },
  filterTextActive: {
    color: colors.primaryForeground,
    fontWeight: '700',
  },
  filterTextWhite: {
    color: colors.background,
    fontWeight: '700',
  },
  filterTextBlack: {
    color: colors.primary,
    fontWeight: '700',
  },
  filterTextFavorite: {
    color: colors.primaryForeground,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  badge: {
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
});
