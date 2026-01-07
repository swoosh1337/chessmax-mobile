import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';
import { TrainingModeId, TRAINING_MODES } from '@/src/types/trainingModes';

export interface ModePickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentModeId: TrainingModeId;
  hasMovesWithExplanations: boolean;
  onSelectMode: (modeId: TrainingModeId) => void;
}

/**
 * Modal for selecting training mode (Learn vs Drill)
 */
export default function ModePickerModal({
  visible,
  onClose,
  currentModeId,
  hasMovesWithExplanations,
  onSelectMode,
}: ModePickerModalProps) {
  const handleSelect = (modeId: TrainingModeId) => {
    onSelectMode(modeId);
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
          <Text style={styles.modalTitle}>Select Training Mode</Text>
          <View style={styles.modeOptionsContainer}>
            {Object.values(TRAINING_MODES).map((mode) => {
              // Learn mode is disabled if no explanations available
              const isDisabled = mode.id === 'learn' && !hasMovesWithExplanations;
              const isActive = currentModeId === mode.id;

              // Minimalistic icons for each mode
              const iconName = mode.id === 'learn' ? 'book-outline' : 'disc-outline';
              const iconColor = isDisabled
                ? colors.textSubtle
                : isActive
                ? mode.color
                : colors.foreground;

              return (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.modeOption,
                    isActive && styles.modeOptionActive,
                    isActive && {
                      borderColor: mode.color,
                      backgroundColor: mode.color + '15',
                    },
                    isDisabled && styles.modeOptionDisabled,
                  ]}
                  onPress={() => {
                    if (isDisabled) return;
                    handleSelect(mode.id);
                  }}
                  disabled={isDisabled}
                >
                  <Ionicons
                    name={iconName as any}
                    size={28}
                    color={iconColor}
                    style={styles.modeOptionIcon}
                  />
                  <Text
                    style={[
                      styles.modeOptionName,
                      isActive && styles.modeOptionNameActive,
                      isDisabled && styles.modeOptionDisabledText,
                    ]}
                  >
                    {mode.name}
                  </Text>
                  <Text
                    style={[
                      styles.modeOptionDescription,
                      isDisabled && styles.modeOptionDisabledText,
                    ]}
                  >
                    {mode.description}
                  </Text>
                  {isDisabled && (
                    <Text style={styles.modeDisabledNote}>
                      No explanations available
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
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
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  modeOptionsContainer: {
    gap: 12,
  },
  modeOption: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeOptionActive: {
    borderWidth: 2,
  },
  modeOptionDisabled: {
    opacity: 0.5,
  },
  modeOptionIcon: {
    marginBottom: 8,
  },
  modeOptionName: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modeOptionNameActive: {
    color: colors.primary,
  },
  modeOptionDescription: {
    color: colors.textSubtle,
    fontSize: 14,
    lineHeight: 18,
  },
  modeOptionDisabledText: {
    color: colors.textSubtle,
  },
  modeDisabledNote: {
    color: colors.textSubtle,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
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
