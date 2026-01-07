import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SubscriptionCard from '@/src/components/SubscriptionCard';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

describe('SubscriptionCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Free Account', () => {
    it('should show free account title', () => {
      render(<SubscriptionCard isPremium={false} loadingSubscription={false} />);

      expect(screen.getByText('🎯 Free Account')).toBeTruthy();
    });

    it('should show upgrade message', () => {
      render(<SubscriptionCard isPremium={false} loadingSubscription={false} />);

      expect(screen.getByText('Upgrade to unlock all openings and variations.')).toBeTruthy();
    });

    it('should show upgrade button', () => {
      render(<SubscriptionCard isPremium={false} loadingSubscription={false} />);

      expect(screen.getByText('Upgrade to Premium')).toBeTruthy();
    });

    it('should navigate to paywall on upgrade button press', () => {
      render(<SubscriptionCard isPremium={false} loadingSubscription={false} />);

      fireEvent.press(screen.getByText('Upgrade to Premium'));

      expect(router.push).toHaveBeenCalledWith('/paywall');
    });

    it('should show free access details', () => {
      render(<SubscriptionCard isPremium={false} loadingSubscription={false} />);

      expect(screen.getByText('Access')).toBeTruthy();
      expect(screen.getByText('First 3 openings (all levels)')).toBeTruthy();
    });

    it('should not show premium badge', () => {
      render(<SubscriptionCard isPremium={false} loadingSubscription={false} />);

      expect(screen.queryByText('ACTIVE')).toBeNull();
    });
  });

  describe('Premium Account', () => {
    it('should show premium member title', () => {
      render(<SubscriptionCard isPremium={true} loadingSubscription={false} />);

      expect(screen.getByText('⭐ Premium Member')).toBeTruthy();
    });

    it('should show ACTIVE badge', () => {
      render(<SubscriptionCard isPremium={true} loadingSubscription={false} />);

      expect(screen.getByText('ACTIVE')).toBeTruthy();
    });

    it('should show premium message', () => {
      render(<SubscriptionCard isPremium={true} loadingSubscription={false} />);

      expect(screen.getByText('You have unlimited access to all openings and variations!')).toBeTruthy();
    });

    it('should not show upgrade button', () => {
      render(<SubscriptionCard isPremium={true} loadingSubscription={false} />);

      expect(screen.queryByText('Upgrade to Premium')).toBeNull();
    });

    it('should show subscription status details', () => {
      render(<SubscriptionCard isPremium={true} loadingSubscription={false} />);

      expect(screen.getByText('Status')).toBeTruthy();
      expect(screen.getByText('Subscribed')).toBeTruthy();
      expect(screen.getByText('All Content')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      const { UNSAFE_getByType } = render(
        <SubscriptionCard isPremium={false} loadingSubscription={true} />
      );

      expect(UNSAFE_getByType('ActivityIndicator' as any)).toBeTruthy();
    });

    it('should not show content when loading', () => {
      render(<SubscriptionCard isPremium={false} loadingSubscription={true} />);

      expect(screen.queryByText('Upgrade to Premium')).toBeNull();
      expect(screen.queryByText('Upgrade to unlock all openings and variations.')).toBeNull();
    });

    it('should still show title when loading', () => {
      render(<SubscriptionCard isPremium={false} loadingSubscription={true} />);

      expect(screen.getByText('🎯 Free Account')).toBeTruthy();
    });
  });
});
