import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { chessApi } from '@/src/api/chessApi';
import { colors } from '@/src/theme/colors';
import FilterBar from '@/src/components/FilterBar';
import CategorySection from '@/src/components/CategorySection';
import { groupOpenings } from '@/src/utils/openingGrouping';
import { groupByCategory } from '@/src/utils/openingCategories';

const FAVORITES_KEY = '@chessmax_favorites';

export default function HomeScreen() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [colorFilter, setColorFilter] = useState('all');
  const [favorites, setFavorites] = useState(new Set<string>());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  

  // Load openings data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const openings = await chessApi.getOpenings();
        if (!mounted) return;
        const grouped = groupOpenings(Array.isArray(openings) ? openings : []);
        setData(grouped);
      } catch (e: any) {
        setError(e?.message || 'Failed to load openings');
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Load favorites from storage
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_KEY);
        if (stored) {
          setFavorites(new Set(JSON.parse(stored)));
        }
      } catch (error) {
        console.warn('Failed to load favorites:', error);
      }
    };
    loadFavorites();
  }, []);

  // Toggle favorite
  const toggleFavorite = async (opening: any) => {
    const openingId = opening.id || opening.name;
    const newFavorites = new Set(favorites);

    if (newFavorites.has(openingId)) {
      newFavorites.delete(openingId);
    } else {
      newFavorites.add(openingId);
    }

    setFavorites(newFavorites);

    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...newFavorites]));
    } catch (error) {
      console.warn('Failed to save favorites:', error);
    }
  };

  // Apply filters
  let filteredData = data;

  if (searchTerm.trim()) {
    filteredData = filteredData.filter(o =>
      o?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (colorFilter !== 'all') {
    filteredData = filteredData.filter(opening => {
      if (colorFilter === 'white') {
        return Object.keys(opening.whitelevels || {}).length > 0;
      } else if (colorFilter === 'black') {
        return Object.keys(opening.blacklevels || {}).length > 0;
      }
      return true;
    });
  }

  if (showFavoritesOnly) {
    filteredData = filteredData.filter(opening => {
      const openingId = opening.id || opening.name;
      return favorites.has(openingId);
    });
  }

  const categorizedOpenings = groupByCategory(filteredData);

  // Handle opening press - navigate to training screen
  const handleOpeningPress = (opening: any, level: number, color: string) => {
    const colorLevels = color === 'white' ? opening.whitelevels : opening.blacklevels;
    const levelData = colorLevels?.[level];

    if (!levelData) {
      console.warn(`❌ No level data found for ${opening.name} level ${level} color ${color}`);
      return;
    }

    let trainingData = { ...levelData };
    if (!trainingData.pgn && trainingData.variations?.length > 0) {
      trainingData.pgn = trainingData.variations[0].pgn;
    }

    if (!trainingData.pgn) {
      console.error('❌ No PGN available for training!');
      return;
    }

    // Navigate to training screen with opening parameter
    router.push({
      pathname: '/training',
      params: {
        openingData: JSON.stringify({
          ...trainingData,
          level,
          color: color === 'white' ? 'w' : 'b'
        })
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>♟</Text>
          <Text style={styles.logoText}>ChessMaxx</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>


      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.mainTitle}>Master Chess Openings</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search openings..."
          placeholderTextColor={colors.textSubtle}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Filter Bar */}
      <FilterBar
        selectedColorFilter={colorFilter}
        onColorFilterChange={setColorFilter}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavoritesOnly={() => setShowFavoritesOnly(!showFavoritesOnly)}
        favoritesCount={favorites.size}
      />

      {/* Openings List */}
      <ScrollView style={styles.scrollView}>
        {Object.keys(categorizedOpenings).map((category) => (
          <CategorySection
            key={category}
            categoryName={category}
            openings={categorizedOpenings[category]}
            onOpeningPress={handleOpeningPress}
            onToggleFavorite={toggleFavorite}
            favorites={favorites}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 70,
    paddingBottom: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 28,
    marginRight: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  
  hamburger: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 24,
    height: 3,
    backgroundColor: colors.foreground,
    borderRadius: 2,
  },
  titleContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.foreground,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
  },
  scrollView: {
    flex: 1,
  },
  errorText: {
    color: colors.destructive,
    fontSize: 16,
  },
});
