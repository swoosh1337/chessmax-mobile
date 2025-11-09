import { useEffect } from 'react';
import { Linking } from 'react-native';
import { ratingStorage } from '@/src/utils/storage';
import * as StoreReview from 'expo-store-review';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function RatingModal({ visible, onClose }: RatingModalProps) {
  // Automatically show native review when modal becomes visible
  useEffect(() => {
    if (visible) {
      showNativeReview();
    }
  }, [visible]);

  const showNativeReview = async () => {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();

      if (isAvailable) {
        // Request native in-app review (iOS star rating)
        await StoreReview.requestReview();

        // Mark as rated
        await ratingStorage.markAsRated();

        // Update last prompt count
        const currentCount = await ratingStorage.getVariationsCompleted();
        await ratingStorage.updateLastRatingPrompt(currentCount);
      } else {
        // Fallback: open store page
        const url = await StoreReview.storeUrl();
        if (url) {
          await Linking.openURL(url);
        }

        // Mark as rated
        await ratingStorage.markAsRated();
      }
    } catch (error) {
      console.error('[RatingModal] Error requesting review:', error);
    } finally {
      // Close modal after showing native review
      onClose();
    }
  };

  // Return null - the native iOS review will show automatically via useEffect
  return null;
}
