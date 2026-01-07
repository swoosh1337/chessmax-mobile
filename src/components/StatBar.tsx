import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const ICONS = {
  star: require('../../assets/new-icons/icon_star.webp'),
  flame: require('../../assets/new-icons/flame icon.webp'),
};

export interface StatBarProps {
  xp: number;
  streak: number;
}

/**
 * Top stats bar showing XP and streak
 */
export default function StatBar({ xp, streak }: StatBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.chip}>
        <Image source={ICONS.star} style={styles.icon} />
        <Text style={styles.text}>{xp}</Text>
      </View>
      <View style={styles.chip}>
        <Image source={ICONS.flame} style={styles.flameIcon} />
        <Text style={styles.text}>{streak}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    zIndex: 100,
    backgroundColor: 'rgba(19, 19, 19, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  icon: {
    width: 20,
    height: 20,
  },
  flameIcon: {
    width: 22,
    height: 22,
  },
  text: {
    color: '#FFC800',
    fontWeight: '800',
    fontSize: 15,
  },
});
