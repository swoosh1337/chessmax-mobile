import { useEffect } from 'react';
import { Linking } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { ratingStorage } from '@/src/utils/storage';

export default function RatingPromptModal({ visible, onSubmit, onCancel }: { visible: boolean; onSubmit: () => void; onCancel: () => void; }) {
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
      console.error('[RatingPromptModal] Error requesting review:', error);
    } finally {
      // Continue with onboarding flow
      onSubmit();
    }
  };

  // Return null - the native iOS review will show automatically via useEffect
  return null;
}
