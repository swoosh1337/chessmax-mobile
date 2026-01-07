import React from 'react';
import { Modal, View, Text, Image, StyleSheet } from 'react-native';

// Assets
const ICONS = {
  chest: require('../../assets/new-icons/icon_chest.webp'),
  star: require('../../assets/new-icons/icon_star.webp'),
  flame: require('../../assets/new-icons/flame icon.webp'),
};

export interface XPRewardModalProps {
  visible: boolean;
  xpAmount: number;
  streak: number;
  onClose: () => void;
}

/**
 * Modal for showing XP reward when opening a chest
 */
export default function XPRewardModal({
  visible,
  xpAmount,
  streak,
  onClose,
}: XPRewardModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Image source={ICONS.chest} style={styles.chestIcon} resizeMode="contain" />
          <View style={styles.xpBadge}>
            <Image source={ICONS.star} style={styles.starIcon} />
            <Text style={styles.xpText}>+{xpAmount} XP</Text>
          </View>
          <Text style={styles.title}>Chest Opened!</Text>
          <View style={styles.streakBadge}>
            <Image source={ICONS.flame} style={styles.flameIcon} />
            <Text style={styles.streakText}>{streak} Day Streak!</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 40,
  },
  chestIcon: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC800',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
    marginBottom: 16,
  },
  starIcon: {
    width: 30,
    height: 30,
  },
  xpText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,100,0,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FF6400',
  },
  flameIcon: {
    width: 24,
    height: 24,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6400',
  },
});
