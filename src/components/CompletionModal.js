import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { colors } from '../theme/colors';

export default function CompletionModal({ visible, success = true, title, message, variationName, onRetry, onNext, onClose, nextEnabled = true, xpEarned = 0, correctCount = 0, incorrectCount = 0 }) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 100 }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true })
      ]).start();
    } else {
      overlayOpacity.setValue(0);
      cardScale.setValue(0.95);
      cardOpacity.setValue(0);
    }
  }, [visible]);

  const headerText = title || (success ? 'Perfect!' : 'Completed');
  const bodyText = message || (success ? 'You mastered this variation.' : 'Give it another go.');

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }], opacity: cardOpacity }]}> 
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, styles.iconCircleLight]}>
              <Text style={[styles.iconText, success ? styles.iconTextSuccess : styles.iconTextError]}>
                {success ? '✓' : '✗'}
              </Text>
            </View>
            <Text style={styles.headerText}>{headerText}</Text>
          </View>

          <Text style={styles.messageText} numberOfLines={2}>{bodyText}</Text>

          {variationName ? (
            <View style={styles.variationPill}>
              <Text style={styles.variationText} numberOfLines={1}>{variationName}</Text>
            </View>
          ) : null}

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            {xpEarned > 0 && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Points Earned:</Text>
                <Text style={styles.statValue}>+{xpEarned} XP</Text>
              </View>
            )}
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Correct:</Text>
              <Text style={[styles.statValue, styles.statSuccess]}>{correctCount}</Text>
            </View>
            <View style={[styles.statRow, { marginBottom: 0 }]}>
              <Text style={styles.statLabel}>Incorrect:</Text>
              <Text style={[styles.statValue, styles.statError]}>{incorrectCount}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={[styles.button, styles.buttonOutline]}> 
              <Text style={[styles.buttonText, styles.buttonTextLight]}>Restart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                console.log('🔄 [MODAL] Next button pressed');
                onNext();
              }}
              disabled={!nextEnabled}
              style={[styles.button, styles.buttonSolid, !nextEnabled && styles.buttonDisabled]}
            >
              <Text style={[styles.buttonText, styles.buttonTextDark]}>Next</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeTapArea} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF22',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  headerRow: { alignItems: 'center', marginBottom: 10 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconCircleLight: { backgroundColor: '#fff' },
  iconCircleDark: { backgroundColor: '#000', borderWidth: 1, borderColor: '#ffffff' },
  iconText: { fontSize: 24, fontWeight: '800' },
  iconTextSuccess: { color: colors.success },
  iconTextError: { color: colors.destructive },
  headerText: {
    color: colors.foreground,
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
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  variationText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 13,
    maxWidth: 300,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  button: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
  },
  buttonSolid: {
    backgroundColor: '#fff',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontWeight: '800', fontSize: 14 },
  buttonTextLight: { color: '#fff' },
  buttonTextDark: { color: '#000' },
  closeTapArea: { alignItems: 'center', marginTop: 10 },
  closeText: { color: colors.textSubtle, fontSize: 12 },
  statsContainer: {
    marginTop: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSoft,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    color: colors.foreground,
    fontWeight: '700',
  },
  statSuccess: {
    color: colors.success,
  },
  statError: {
    color: colors.destructive,
  },
});
