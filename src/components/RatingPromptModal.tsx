import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors } from '@/src/theme/colors';

export default function RatingPromptModal({ visible, onSubmit, onCancel }: { visible: boolean; onSubmit: () => void; onCancel: () => void; }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Image style={{ width: 34, height: 34, borderRadius: 7 }} source={require('../../assets/images/icon.png')} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Enjoying ChessMaxx?</Text>
              <Text style={styles.subtitle}>Tap a star to rate it on the App Store.</Text>
            </View>
          </View>
          <View style={styles.starsRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Text key={i} style={styles.star}>★</Text>
            ))}
          </View>
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={[styles.button, styles.primary]} onPress={onSubmit}>
              <Text style={[styles.buttonText, styles.primaryText]}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onCancel}>
              <Text style={[styles.buttonText, styles.secondaryText]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Mascot decoration */}
        <Image source={require('../../assets/mascot/turtle_sitting.png')} style={styles.mascot} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%', maxWidth: 380, backgroundColor: colors.card, borderRadius: 18,
    borderWidth: 1, borderColor: '#FFFFFF22', padding: 16
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.foreground, fontWeight: '800', fontSize: 16 },
  subtitle: { color: colors.textSubtle, marginTop: 4 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 8 },
  star: { fontSize: 24, color: '#3b82f6' },
  buttonsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#3b82f6' },
  primaryText: { color: '#fff' },
  secondary: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.foreground },
  buttonText: { fontWeight: '800' },
  mascot: { position: 'absolute', right: 24, bottom: 20, width: 64, height: 64, borderRadius: 14, opacity: 0.9 },
});
