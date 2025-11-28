import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTraining } from '../context/TrainingContext';

export default function TrainingStatistics() {
  const { variationStats, openingStats, totalMinutes } = useTraining();
  const [expandedOpening, setExpandedOpening] = useState<string | null>(null);

  // OPTIMIZED: Use pre-aggregated opening stats from server (no client-side grouping needed)
  const openingGroups = openingStats;

  // Calculate unique openings count
  const uniqueOpenings = openingGroups.length;

  // Calculate completion rate
  const getCompletionRate = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  // Format duration in minutes
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  return (
    <View style={styles.container}>
      {/* Overall Stats */}
      <View style={styles.overallStats}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalMinutes}</Text>
          <Text style={styles.statLabel}>Total Minutes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{uniqueOpenings}</Text>
          <Text style={styles.statLabel}>Openings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {variationStats.reduce((sum, v) => sum + v.total_sessions, 0)}
          </Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
      </View>

      {/* Opening Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Openings Progress</Text>

        {openingGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No training sessions yet</Text>
            <Text style={styles.emptySubtext}>Start practicing to see your stats!</Text>
          </View>
        ) : (
          <ScrollView style={styles.statsScroll} showsVerticalScrollIndicator={false}>
            {openingGroups.map((opening, index) => {
              const completionRate = getCompletionRate(opening.completed_sessions, opening.total_sessions);
              const avgMistakes = opening.total_sessions > 0
                ? (opening.total_mistakes / opening.total_sessions).toFixed(1)
                : '0';
              const avgDuration = opening.total_sessions > 0
                ? Math.floor(opening.total_duration / opening.total_sessions)
                : 0;
              const isExpanded = expandedOpening === opening.opening_name;

              return (
                <View key={index} style={styles.openingCard}>
                  {/* Header */}
                  <TouchableOpacity
                    onPress={() => setExpandedOpening(isExpanded ? null : opening.opening_name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.openingHeader}>
                      <View style={styles.openingTitleContainer}>
                        <Text style={styles.openingName} numberOfLines={1}>
                          {opening.opening_name}
                        </Text>
                        <Text style={styles.variationsCount}>
                          {opening.variations_count} variation{opening.variations_count > 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={styles.completionBadge}>
                        <Text style={styles.completionText}>{completionRate}%</Text>
                      </View>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                      <View style={styles.miniStat}>
                        <Text style={styles.miniStatLabel}>Sessions</Text>
                        <Text style={styles.miniStatValue}>{opening.total_sessions}</Text>
                      </View>
                      <View style={styles.miniStat}>
                        <Text style={styles.miniStatLabel}>Avg Mistakes</Text>
                        <Text style={styles.miniStatValue}>{avgMistakes}</Text>
                      </View>
                      <View style={styles.miniStat}>
                        <Text style={styles.miniStatLabel}>Avg Time</Text>
                        <Text style={styles.miniStatValue}>
                          {formatDuration(avgDuration)}
                        </Text>
                      </View>
                      <View style={styles.miniStat}>
                        <Text style={styles.miniStatLabel}>Best Score</Text>
                        <Text style={styles.miniStatValue}>{opening.best_score}</Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${completionRate}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {opening.completed_sessions}/{opening.total_sessions} completed
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Variations */}
                  {isExpanded && (
                    <View style={styles.variationsExpanded}>
                      <Text style={styles.variationsTitle}>Variations</Text>
                      {variationStats
                        .filter((v) => v.opening_name.startsWith(opening.opening_name))
                        .map((variation, vIndex) => {
                          const vCompletionRate = getCompletionRate(variation.completed_sessions, variation.total_sessions);
                          const vAvgMistakes = variation.total_sessions > 0
                            ? (variation.total_mistakes / variation.total_sessions).toFixed(1)
                            : '0';

                          return (
                            <View key={vIndex} style={styles.variationItem}>
                              <View style={styles.variationItemHeader}>
                                <Text style={styles.variationItemName} numberOfLines={1}>
                                  {variation.variation_name}
                                </Text>
                                <Text style={styles.variationItemCompletion}>{vCompletionRate}%</Text>
                              </View>
                              <View style={styles.variationItemStats}>
                                <Text style={styles.variationItemStat}>
                                  {variation.total_sessions} sessions
                                </Text>
                                <Text style={styles.variationItemStat}>•</Text>
                                <Text style={styles.variationItemStat}>
                                  {vAvgMistakes} avg mistakes
                                </Text>
                                <Text style={styles.variationItemStat}>•</Text>
                                <Text style={styles.variationItemStat}>
                                  {formatDuration(variation.average_duration)} avg
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overallStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsScroll: {
    flex: 1,
  },
  openingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  openingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  openingTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  openingName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  variationsCount: {
    color: '#9ca3af',
    fontSize: 12,
  },
  completionBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  miniStat: {
    alignItems: 'center',
  },
  miniStatLabel: {
    color: '#6b7280',
    fontSize: 10,
    marginBottom: 2,
  },
  miniStatValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 3,
  },
  progressText: {
    color: '#6b7280',
    fontSize: 11,
    textAlign: 'right',
  },
  variationsExpanded: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  variationsTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  variationItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    marginBottom: 6,
  },
  variationItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  variationItemName: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  variationItemCompletion: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  variationItemStats: {
    flexDirection: 'row',
    gap: 6,
  },
  variationItemStat: {
    color: '#6b7280',
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
  },
});
