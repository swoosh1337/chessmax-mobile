import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';

export default function CompletionModal({ visible, success = true, title, message, variationName, onRetry, onNext, onClose, nextEnabled = true }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.headerText}>{title || (success ? 'Excellent Work!' : 'Variation Complete!')}</Text>
          </View>
          <Text style={styles.messageText} numberOfLines={2}>
            {message || (success ? "You've successfully mastered this variation." : "You've completed this variation.")}
          </Text>

          {variationName ? (
            <View style={styles.variationPill}>
              <Text style={styles.variationText} numberOfLines={1}>{variationName}</Text>
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={[styles.button, styles.retryButton]}> 
              <Text style={[styles.buttonText, styles.retryText]}>Restart</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={onNext} disabled={!nextEnabled} style={[styles.button, styles.nextButton, !nextEnabled && styles.buttonDisabled]}> 
              <Text style={styles.nextText}>Next</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeTapArea} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  headerRow: { alignItems: 'center', marginBottom: 8 },
  headerText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 18,
  },
  messageText: {
    textAlign: 'center',
    color: colors.textSoft,
    fontSize: 14,
  },
  variationPill: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#00000080',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  variationText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
    maxWidth: 280,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: { fontWeight: '800' },
  retryText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  nextText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '800',
  },
  closeTapArea: { alignItems: 'center', marginTop: 10 },
  closeText: { color: colors.textSubtle, fontSize: 12 },
});

