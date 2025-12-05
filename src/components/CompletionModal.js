import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Confetti particle component
const ConfettiParticle = ({ delay, startX, color }) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const randomX = (Math.random() - 0.5) * 200;
    const randomRotation = Math.random() * 720 - 360;
    const duration = 2000 + Math.random() * 1000;

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT / 2,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: randomX,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: randomRotation,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          delay: duration - 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          left: startX,
          backgroundColor: color,
          opacity,
          transform: [
            { translateY },
            { translateX },
            { rotate: spin },
            { scale },
          ],
        },
      ]}
    />
  );
};

export default function CompletionModal({
  visible,
  success = true,
  title,
  message,
  variationName,
  onRetry,
  onNext,
  onClose,
  nextEnabled = true,
  xpEarned = 0,
  correctCount = 0,
  incorrectCount = 0,
  currentStreak = 1,
  weeklyProgress = [true, false, false, false, false]
}) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(50)).current;

  // Flame animation values
  const flameScale = useRef(new Animated.Value(0)).current;
  const flameRotate = useRef(new Animated.Value(0)).current;
  const flameBounce = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;

  // Staggered element animations
  const streakNumberScale = useRef(new Animated.Value(0)).current;
  const streakLabelOpacity = useRef(new Animated.Value(0)).current;
  const calendarOpacity = useRef(new Animated.Value(0)).current;
  const calendarTranslateY = useRef(new Animated.Value(20)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const statsTranslateY = useRef(new Animated.Value(20)).current;
  const buttonScale = useRef(new Animated.Value(0)).current;

  // Day circle animations
  const dayAnimations = useRef(
    weeklyProgress.map(() => new Animated.Value(0))
  ).current;

  // Animated streak number
  const [displayedStreak, setDisplayedStreak] = useState(0);

  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiColors = ['#FFA500', '#FFD700', '#FF6B35', '#58CC02', '#FF4B4B', '#4DA6FF'];

  useEffect(() => {
    if (visible) {
      setShowConfetti(true);

      // Haptic feedback on modal open
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset animated streak
      setDisplayedStreak(0);

      // Main card entrance animation
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(cardTranslateY, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start();

      // Flame entrance with impact haptic
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Animated.spring(flameScale, {
          toValue: 1.2,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }).start(() => {
          Animated.spring(flameScale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          }).start();
        });

        // Start continuous animations
        Animated.loop(
          Animated.parallel([
            Animated.sequence([
              Animated.timing(flameBounce, {
                toValue: -10,
                duration: 500,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(flameBounce, {
                toValue: 0,
                duration: 500,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(flameRotate, {
                toValue: 1,
                duration: 1500,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(flameRotate, {
                toValue: -1,
                duration: 1500,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(glowPulse, {
                toValue: 0.6,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(glowPulse, {
                toValue: 0.3,
                duration: 800,
                useNativeDriver: true,
              }),
            ]),
          ])
        ).start();

        // Sparkle animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(sparkleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(sparkleOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          ])
        ).start();
      }, 200);

      // Streak number pop animation with counting
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        Animated.spring(streakNumberScale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }).start();

        // Animate the number counting up
        let count = 0;
        const interval = setInterval(() => {
          count++;
          setDisplayedStreak(count);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (count >= currentStreak) {
            clearInterval(interval);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }, 100);

        Animated.timing(streakLabelOpacity, {
          toValue: 1,
          duration: 300,
          delay: 200,
          useNativeDriver: true,
        }).start();
      }, 400);

      // Calendar entrance
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(calendarOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(calendarTranslateY, { toValue: 0, friction: 6, useNativeDriver: true }),
        ]).start();

        // Stagger day circle animations
        weeklyProgress.forEach((completed, index) => {
          if (completed) {
            setTimeout(() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Animated.spring(dayAnimations[index], {
                toValue: 1,
                friction: 3,
                tension: 100,
                useNativeDriver: true,
              }).start();
            }, index * 80);
          }
        });
      }, 600);

      // Stats entrance
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(statsOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(statsTranslateY, { toValue: 0, friction: 6, useNativeDriver: true }),
        ]).start();
      }, 800);

      // Button entrance
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.spring(buttonScale, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }).start();
      }, 1000);

    } else {
      // Reset all animations
      overlayOpacity.setValue(0);
      cardScale.setValue(0.8);
      cardOpacity.setValue(0);
      cardTranslateY.setValue(50);
      flameScale.setValue(0);
      flameRotate.setValue(0);
      flameBounce.setValue(0);
      sparkleOpacity.setValue(0);
      glowPulse.setValue(0.3);
      streakNumberScale.setValue(0);
      streakLabelOpacity.setValue(0);
      calendarOpacity.setValue(0);
      calendarTranslateY.setValue(20);
      statsOpacity.setValue(0);
      statsTranslateY.setValue(20);
      buttonScale.setValue(0);
      dayAnimations.forEach(anim => anim.setValue(0));
      setShowConfetti(false);
      setDisplayedStreak(0);
    }
  }, [visible, currentStreak]);

  const rotation = flameRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-8deg', '8deg'],
  });

  const dayLabels = ['W', 'Th', 'F', 'Sa', 'Su'];

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onNext();
  };

  const handleClose = () => {
    Haptics.selectionAsync();
    onClose();
  };

  // Generate confetti particles
  const confettiParticles = [];
  if (showConfetti) {
    for (let i = 0; i < 30; i++) {
      confettiParticles.push(
        <ConfettiParticle
          key={i}
          delay={i * 50}
          startX={Math.random() * SCREEN_WIDTH}
          color={confettiColors[Math.floor(Math.random() * confettiColors.length)]}
        />
      );
    }
  }

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <View style={styles.confettiContainer}>
        {confettiParticles}
      </View>

      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { scale: cardScale },
                { translateY: cardTranslateY },
              ],
              opacity: cardOpacity
            }
          ]}
        >
          {/* Glow effect behind flame */}
          <Animated.View style={[styles.flameGlow, { opacity: glowPulse }]} />

          {/* Streak Celebration Section */}
          <View style={styles.streakContainer}>
            {/* Animated Flame */}
            <Animated.View
              style={[
                styles.flameContainer,
                {
                  transform: [
                    { scale: flameScale },
                    { rotate: rotation },
                    { translateY: flameBounce },
                  ],
                },
              ]}
            >
              {/* Multiple sparkles */}
              <Animated.Text style={[styles.sparkle, { opacity: sparkleOpacity, top: -15, right: -5 }]}>
                ✨
              </Animated.Text>
              <Animated.Text style={[styles.sparkle, { opacity: sparkleOpacity, top: 0, left: -15, fontSize: 12 }]}>
                ✨
              </Animated.Text>

              {/* Flame emoji */}
              <Text style={styles.flameEmoji}>🔥</Text>
            </Animated.View>

            {/* Streak Number with pop animation */}
            <Animated.Text
              style={[
                styles.streakNumber,
                { transform: [{ scale: streakNumberScale }] }
              ]}
            >
              {displayedStreak}
            </Animated.Text>

            <Animated.Text style={[styles.streakLabel, { opacity: streakLabelOpacity }]}>
              {currentStreak === 1 ? '1 day streak' : `${currentStreak} day streak`}
            </Animated.Text>

            {/* Weekly Progress Calendar */}
            <Animated.View
              style={[
                styles.weeklyCalendar,
                {
                  opacity: calendarOpacity,
                  transform: [{ translateY: calendarTranslateY }]
                }
              ]}
            >
              {dayLabels.map((day, index) => {
                const dayScale = dayAnimations[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                });

                return (
                  <View key={day} style={styles.dayContainer}>
                    <Text style={styles.dayLabel}>{day}</Text>
                    <Animated.View
                      style={[
                        styles.dayCircle,
                        weeklyProgress[index] && styles.dayCircleActive,
                        weeklyProgress[index] && { transform: [{ scale: dayScale }] }
                      ]}
                    >
                      {weeklyProgress[index] && (
                        <Text style={styles.dayCheckmark}>✓</Text>
                      )}
                    </Animated.View>
                  </View>
                );
              })}
            </Animated.View>
          </View>

          {/* Stats Section */}
          <Animated.View
            style={[
              styles.statsContainer,
              {
                opacity: statsOpacity,
                transform: [{ translateY: statsTranslateY }]
              }
            ]}
          >
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
          </Animated.View>

          {/* Continue Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleContinue}
              disabled={!nextEnabled}
              style={[styles.continueButton, !nextEnabled && styles.buttonDisabled]}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>CONTINUE</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeTapArea}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
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
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1A1A1A',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#FFA500',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    shadowColor: '#FFA500',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
    overflow: 'hidden',
  },
  flameGlow: {
    position: 'absolute',
    top: 40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFA500',
    alignSelf: 'center',
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  flameContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  flameEmoji: {
    fontSize: 90,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 18,
  },
  streakNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFA500',
    marginBottom: 4,
    textShadowColor: 'rgba(255, 165, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  streakLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFA500',
    marginBottom: 24,
  },
  weeklyCalendar: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#252525',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  dayContainer: {
    alignItems: 'center',
    gap: 10,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: '#FFA500',
    shadowColor: '#FFA500',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  dayCheckmark: {
    fontSize: 20,
    color: '#000',
    fontWeight: '900',
  },
  statsContainer: {
    backgroundColor: '#252525',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#333',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statLabel: {
    fontSize: 16,
    color: '#888',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '800',
  },
  statSuccess: {
    color: '#58CC02',
  },
  statError: {
    color: '#FF4B4B',
  },
  continueButton: {
    marginTop: 24,
    backgroundColor: '#FFA500',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#FFA500',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.5
  },
  closeTapArea: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  closeText: {
    color: '#555',
    fontSize: 15,
    fontWeight: '600',
  },
});
