import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors } from '@/src/theme/colors';

export interface LearnCompleteModalProps {
  visible: boolean;
  onClose: () => void;
  variationName: string;
  onContinueLearning: () => void;
  onSwitchToDrill: () => void;
}

/**
 * Modal shown when completing a variation in Learn mode
 */
export default function LearnCompleteModal({
  visible,
  onClose,
  variationName,
  onContinueLearning,
  onSwitchToDrill,
}: LearnCompleteModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>Variation Complete!</Text>
          <Text style={styles.subtitle}>{variationName}</Text>
          <Text style={styles.message}>
            Great job! You've learned this variation. Continue learning or
            practice what you've learned.
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onContinueLearning}
            >
              <Text style={styles.primaryText}>Continue Learning →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onSwitchToDrill}
            >
              <Text style={styles.secondaryText}>Practice in Drill Mode</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    color: colors.textSubtle,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: colors.textSubtle + '20',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
});
