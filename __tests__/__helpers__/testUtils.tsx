/**
 * Test utilities and helpers
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';

// Mock providers for testing
const AllProviders = ({ children }: { children: ReactNode }) => {
  // Add context providers here as needed
  return <>{children}</>;
};

/**
 * Custom render function that wraps components with providers
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything
export * from '@testing-library/react-native';
export { customRender as render };

/**
 * Mock user for testing
 */
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

/**
 * Mock user profile for testing
 */
export const mockUserProfile = {
  id: 'test-user-id',
  username: 'TestPlayer',
  total_xp: 1500,
  weekly_xp: 250,
  level: 5,
  rank: 10,
};

/**
 * Mock opening for testing
 */
export const mockOpening = {
  id: 'opening-1',
  name: 'Italian Game',
  eco: 'C50',
  description: 'A classic opening',
  category: 'open',
  difficulty: 'beginner' as const,
  popularity: 100,
  variations: [
    {
      id: 'var-1',
      name: 'Main Line',
      pgn: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
      difficulty: 'beginner' as const,
      popularity: 100,
    },
  ],
};

/**
 * Mock leaderboard entry for testing
 */
export const mockLeaderboardEntry = {
  id: 'user-1',
  username: 'TopPlayer',
  total_xp: 5000,
  weekly_xp: 500,
  level: 10,
  rank: 1,
};

/**
 * Helper to wait for async operations
 */
export const waitForAsync = (ms = 0) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper to create a mock function with resolved value
 */
export const createMockFn = <T,>(resolvedValue: T) =>
  jest.fn().mockResolvedValue(resolvedValue);
