import React from 'react';
import { Modal, StyleSheet, Text, View, TouchableOpacity, Linking, Platform } from 'react-native';
import { colors } from '@/src/theme/colors';
import { ratingStorage } from '@/src/utils/storage';

// Lazy import StoreReview to avoid errors if not available
let StoreReview: any = null;
try {
  StoreReview = require('expo-store-review');
} catch (error) {
  console.log('[RatingModal] expo-store-review not available, using fallback');
}

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function RatingModal({ visible, onClose }: RatingModalProps) {
  const handleRate = async () => {
    try {
      if (StoreReview) {
        // Native module is available
        const isAvailable = await StoreReview.isAvailableAsync();

        if (isAvailable) {
          // Request in-app review
          await StoreReview.requestReview();
          console.log('[RatingModal] User rated the app');
        } else {
          // Fallback: open store page
          const url = await StoreReview.storeUrl();
          if (url) {
            await Linking.openURL(url);
          }
        }

        // Mark as rated
        await ratingStorage.markAsRated();
      } else {
        // Fallback: Open App Store/Play Store URL directly
        console.log('[RatingModal] StoreReview not available, using fallback');

        const appStoreUrl = Platform.select({
          ios: 'https://apps.apple.com/app/id<YOUR_APP_ID>', // Replace with your App Store ID
          android: 'https://play.google.com/store/apps/details?id=com.igrigolia.chessmaxmobile',
        });

        if (appStoreUrl) {
          console.log('[RatingModal] Would open:', appStoreUrl);
          // Uncomment when you have a real app store URL
          // await Linking.openURL(appStoreUrl);
        }

        // Mark as rated
        await ratingStorage.markAsRated();
      }
    } catch (error) {
      console.error('[RatingModal] Error requesting review:', error);
    } finally {
      onClose();
    }
  };

  const handleLater = async () => {
    try {
      // Update last rating prompt to current count
      const currentCount = await ratingStorage.getVariationsCompleted();
      await ratingStorage.updateLastRatingPrompt(currentCount);
      console.log('[RatingModal] User chose to rate later');
    } catch (error) {
      console.error('[RatingModal] Error updating rating prompt:', error);
    } finally {
      onClose();
    }
  };

  const handleNever = async () => {
    try {
      // Mark as rated so we never ask again
      await ratingStorage.markAsRated();
      console.log('[RatingModal] User chose never to rate');
    } catch (error) {
      console.error('[RatingModal] Error marking as rated:', error);
    } finally {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⭐</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Enjoying ChessMaxx?</Text>

          {/* Message */}
          <Text style={styles.message}>
            Your feedback helps us improve and create a better chess training experience for everyone!
          </Text>

          {/* Actions */}
          <TouchableOpacity style={styles.btnRate} onPress={handleRate}>
            <Text style={styles.btnRateText}>Rate ChessMaxx</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnLater} onPress={handleLater}>
            <Text style={styles.btnLaterText}>Maybe Later</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnNever} onPress={handleNever}>
            <Text style={styles.btnNeverText}>Don't Ask Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: colors.textSubtle,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  btnRate: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnRateText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '700',
  },
  btnLater: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnLaterText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
  },
  btnNever: {
    backgroundColor: 'transparent',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnNeverText: {
    color: colors.textSubtle,
    fontSize: 14,
    fontWeight: '500',
  },
});
