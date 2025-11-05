import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function TrainingControls({
  onHint,
  onSeriesMode,
  onRandomMode,
  currentMode = 'series',
  variationLabel = 'Variation 1',
  progress = { filled: 0, total: 0 },
  progressStatus = 'neutral', // 'neutral' | 'success' | 'error'
  variationStatuses = [], // per-variation: 'pending' | 'success' | 'error'
  onPickVariation,
  hasMoves = false
}) {
  const filledColor = progressStatus === 'success'
    ? colors.success
    : progressStatus === 'error'
      ? colors.destructive
      : colors.primary;

  return (
    <View>
      {/* Control Buttons Row */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity onPress={onHint} style={styles.controlButton}>
          <Ionicons name="bulb-outline" size={24} color={colors.primary} />
          <Text style={styles.buttonLabel}>Hint</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSeriesMode}
          style={[
            styles.controlButton,
            currentMode === 'series' && styles.controlButtonActive
          ]}
          disabled={hasMoves}
        >
          <Ionicons
            name="list-outline"
            size={24}
            color={currentMode === 'series' ? colors.primaryForeground : colors.foreground}
          />
          <Text style={[
            styles.buttonLabel,
            currentMode === 'series' && styles.buttonLabelActive
          ]}>Series</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onRandomMode}
          style={[
            styles.controlButton,
            currentMode === 'random' && styles.controlButtonActive
          ]}
          disabled={hasMoves}
        >
          <Ionicons
            name="shuffle-outline"
            size={24}
            color={currentMode === 'random' ? colors.primaryForeground : colors.foreground}
          />
          <Text style={[
            styles.buttonLabel,
            currentMode === 'random' && styles.buttonLabelActive
          ]}>Random</Text>
        </TouchableOpacity>
      </View>

      {/* Variation Progress + Selector - Redesigned */}
      <TouchableOpacity onPress={onPickVariation} style={styles.variationSelector}>
        <View style={styles.variationContent}>
          {/* Top Row: Variation Name + Status Badge */}
          <View style={styles.variationHeader}>
            <Text style={styles.variationText} numberOfLines={1}>
              {variationLabel}
            </Text>
            {progressStatus === 'success' && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusIcon}>✓</Text>
              </View>
            )}
            {progressStatus === 'error' && (
              <View style={[styles.statusBadge, styles.statusBadgeError]}>
                <Text style={styles.statusIconError}>✗</Text>
              </View>
            )}
          </View>

          {/* Bottom Row: Progress + Variation Counter */}
          <View style={styles.variationFooter}>
            <View style={styles.progressInfo}>
              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progress.total > 0 ? (progress.filled / progress.total) * 100 : 0}%`,
                      backgroundColor: filledColor
                    }
                  ]}
                />
              </View>
              {/* Progress Text */}
              <Text style={styles.progressText}>
                {progress.filled}/{progress.total} moves
              </Text>
            </View>

            {/* Variation Counter + Summary */}
            {variationStatuses.length > 0 && (
              <View style={styles.variationSummary}>
                <Text style={styles.variationCounter}>
                  {variationStatuses.filter(s => s !== 'pending').length}/{variationStatuses.length}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSubtle} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  controlButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary + '80',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSubtle,
    marginTop: 2,
  },
  buttonLabelActive: {
    color: colors.primaryForeground,
    fontWeight: '700',
  },
  variationSelector: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.card,
  },
  variationContent: {
    gap: 10,
  },
  variationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variationText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    backgroundColor: colors.success,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeError: {
    backgroundColor: colors.destructive,
  },
  statusIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  statusIconError: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  variationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressInfo: {
    flex: 1,
    marginRight: 12,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '600',
  },
  variationSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  variationCounter: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
