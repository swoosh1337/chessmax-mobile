import React, { useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/src/theme/colors';
import RatingPromptModal from '@/src/components/RatingPromptModal';
import { onboardingStorage } from '@/src/utils/storage';

const { width } = Dimensions.get('window');

type SlideKey = 'welcome' | 'precision' | 'progress' | 'leaderboard' | 'done';

const slides: Array<{ key: SlideKey; title: string; text: string; mascot: any }>= [
  {
    key: 'welcome',
    title: 'Welcome to ChessMaxx',
    text: 'Master openings with guided move-by-move drills.',
    mascot: require('../assets/mascot/turtle_thinking.png'),
  },
  {
    key: 'precision',
    title: 'Train With Precision',
    text: 'Learn the exact line and get instant feedback.',
    mascot: require('../assets/mascot/turtle_holding_board.png'),
  },
  {
    key: 'progress',
    title: 'Track Your Progress',
    text: 'Earn XP, perfect variations, and level up.',
    mascot: require('../assets/mascot/turtle_playing_chess.png'),
  },
  {
    key: 'leaderboard',
    title: 'Compete on Leaderboards',
    text: 'Climb ranks by completing variations flawlessly.',
    mascot: require('../assets/mascot/turtle_sitting.png'),
  },
  {
    key: 'done',
    title: "You're All Set!",
    text: 'Let’s get started and improve your chess.',
    mascot: require('../assets/mascot/turtle_sleeping.png'),
  },
];

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [showRating, setShowRating] = useState(false);

  const onScroll = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const skip = async () => {
    // console.log('[Onboarding] User clicked SKIP');
    await onboardingStorage.markOnboardingSeen();
    // console.log('[Onboarding] Navigating to /paywall after skip');
    router.replace('/paywall');
  };

  const next = async () => {
    if (index < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    } else {
      // last slide → show rating mock then go to paywall
      // console.log('[Onboarding] User clicked GET STARTED on last slide');
      await onboardingStorage.markOnboardingSeen();
      // console.log('[Onboarding] Showing rating modal');
      setShowRating(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ width: 60 }} />
        <TouchableOpacity onPress={skip}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {slides.map((s, i) => (
          <View key={i} style={[styles.slide, { width }] }>
            <Text style={styles.title}>{s.title}</Text>
            <View style={styles.illustration}>
              <View style={styles.circle}>
                {renderCenter(slides[i].key)}
              </View>
            </View>
            <Text style={styles.text}>{s.text}</Text>
            {/* Bottom-right mascot */}
            <Image source={slides[i].mascot} style={styles.mascot} />
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} onPress={next}>
          <Text style={styles.ctaText}>{index === slides.length - 1 ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>

      <RatingPromptModal
        visible={showRating}
        onSubmit={() => { setShowRating(false); router.replace('/paywall'); }}
        onCancel={() => { setShowRating(false); router.replace('/paywall'); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12 },
  skip: { color: colors.textSubtle, fontWeight: '600' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  title: { color: colors.foreground, fontSize: 28, fontWeight: '800', marginTop: 40, textAlign: 'center' },
  illustration: { marginTop: 40, marginBottom: 20 },
  circle: { width: 200, height: 200, borderRadius: 100, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  mascotHero: { width: 140, height: 140, resizeMode: 'contain' },
  text: { color: colors.textSubtle, fontSize: 16, textAlign: 'center', paddingHorizontal: 24, marginTop: 6 },
  dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  footer: { paddingHorizontal: 16, paddingVertical: 20 },
  cta: { backgroundColor: colors.primary, borderRadius: 999, alignItems: 'center', paddingVertical: 14 },
  ctaText: { color: colors.primaryForeground, fontWeight: '800', fontSize: 16 },
  mascot: { position: 'absolute', right: 20, bottom: 28, width: 96, height: 96, borderRadius: 14, opacity: 0.95 },
  // Center illustrations
  boardGrid: { width: 120, height: 120, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: '#ffffff1f' },
  boardRow: { flex: 1, flexDirection: 'row' },
  sqLight: { flex: 1, backgroundColor: '#f0d9b5' },
  sqDark: { flex: 1, backgroundColor: '#b58863' },
  targetRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: '#fbbf24' },
  crossHair: { position: 'absolute', width: 2, height: 160, backgroundColor: '#fbbf24' },
  crossHairH: { position: 'absolute', height: 2, width: 160, backgroundColor: '#fbbf24' },
  progressCard: { width: 160, padding: 14, backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  bar: { height: 10, backgroundColor: colors.border, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', width: '70%', backgroundColor: colors.success },
  trophy: { fontSize: 70 },
});

function renderCenter(key: SlideKey) {
  switch (key) {
    case 'precision':
      return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <View style={styles.boardGrid}>
            {Array.from({ length: 8 }).map((_, r) => (
              <View key={r} style={styles.boardRow}>
                {Array.from({ length: 8 }).map((_, c) => (
                  <View key={c} style={(r + c) % 2 === 0 ? styles.sqLight : styles.sqDark} />
                ))}
              </View>
            ))}
          </View>
          <View style={styles.targetRing} />
          <View style={[styles.crossHair, { transform: [{ translateX: -1 }] }]} />
          <View style={[styles.crossHairH, { transform: [{ translateY: -1 }] }]} />
        </View>
      );
    case 'progress':
      return (
        <View style={styles.progressCard}>
          <Text style={{ color: colors.foreground, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>Progress</Text>
          <View style={styles.bar}>
            <View style={styles.barFill} />
          </View>
          <Text style={{ color: colors.textSubtle, marginTop: 8, textAlign: 'center' }}>11/30 moves</Text>
        </View>
      );
    case 'leaderboard':
      return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[styles.trophy]}>🏆</Text>
          <Text style={{ color: colors.textSubtle, marginTop: 6 }}>Top Players</Text>
        </View>
      );
    case 'welcome':
      return <Text style={{ fontSize: 72 }}>♟</Text>;
    case 'done':
      return <Text style={{ fontSize: 64 }}>✓</Text>;
  }
}
