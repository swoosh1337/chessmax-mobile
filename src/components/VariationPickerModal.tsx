import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/src/theme/colors';

export type VariationStatus = 'pending' | 'success' | 'error';

export interface VariationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  variations: Array<{ name?: string; pgn?: string }>;
  currentVariationIndex: number;
  variationStatuses: VariationStatus[];
  onSelectVariation: (index: number) => void;
}

/**
 * Modal for selecting a variation to practice
 */
export default function VariationPickerModal({
  visible,
  onClose,
  variations,
  currentVariationIndex,
  variationStatuses,
  onSelectVariation,
}: VariationPickerModalProps) {
  const handleSelect = (idx: number) => {
    onSelectVariation(idx);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Variation</Text>
          <ScrollView style={styles.modalScroll}>
            {variations.map((variation, idx) => {
              const isActive = currentVariationIndex === idx;
              const status = variationStatuses[idx];

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.variationItem,
                    isActive && styles.variationItemActive,
                  ]}
                  onPress={() => handleSelect(idx)}
                >
                  <View style={styles.variationItemContent}>
                    <Text
                      style={[
                        styles.variationText,
                        isActive && styles.variationTextActive,
                      ]}
                    >
                      Variation {idx + 1}
                    </Text>
                    {status === 'success' && (
                      <Text style={styles.statusBadge}>✓</Text>
                    )}
                    {status === 'error' && (
                      <Text style={[styles.statusBadge, styles.statusBadgeError]}>✗</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: 400,
  },
  variationItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  variationItemActive: {
    backgroundColor: colors.primary + '30',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  variationItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variationText: {
    color: colors.foreground,
    fontSize: 16,
  },
  variationTextActive: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  statusBadge: {
    fontSize: 18,
    color: '#22c55e',
  },
  statusBadgeError: {
    color: '#ef4444',
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: colors.textSubtle + '30',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
});
