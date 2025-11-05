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

      {/* Variation Progress + Selector */}
      <TouchableOpacity onPress={onPickVariation} style={styles.variationSelector}>
        <View style={styles.variationLeft}>
          <Text style={styles.variationText} numberOfLines={1}>{variationLabel}</Text>
          <Text style={styles.progressText}>{progress.filled}/{progress.total} moves</Text>
        </View>
        <View style={styles.variationRight}>
          <View style={styles.segmentBar}>
            {(variationStatuses && variationStatuses.length ? variationStatuses : Array(5).fill('pending')).map((s, i) => (
              <View
                key={`seg-${i}`}
                style={[styles.segment,
                  s === 'success' && { backgroundColor: colors.success, borderColor: colors.success },
                  s === 'error' && { backgroundColor: colors.destructive, borderColor: colors.destructive },
                  s === 'pending' && { backgroundColor: colors.border, borderColor: colors.border }
                ]}
              />
            ))}
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textSubtle} style={{ marginLeft: 6 }} />
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  variationLeft: {
    flex: 1,
    marginRight: 12,
  },
  variationText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  progressText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '500',
  },
  variationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  segmentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  segment: {
    width: 14,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: colors.border,
    borderColor: colors.border,
    marginHorizontal: 2,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
    backgroundColor: colors.border,
  },
  progressDotFilled: {
    backgroundColor: colors.primary,
  },
});
