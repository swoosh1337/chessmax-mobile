/**
 * Tests for type guard functions
 */

import {
  isUserProfile,
  isOpening,
  isVariation,
  isLeaderboardEntry,
  isSpeedrunEntry,
  isApiError,
  isTrainingSession,
  isVariationCompletion,
} from '../../src/types';

describe('Type Guards', () => {
  describe('isUserProfile', () => {
    it('should return true for valid user profile', () => {
      const validProfile = {
        id: 'user-1',
        username: 'TestUser',
        total_xp: 1000,
        weekly_xp: 100,
        level: 5,
      };

      expect(isUserProfile(validProfile)).toBe(true);
    });

    it('should return false for missing id', () => {
      const invalidProfile = {
        username: 'TestUser',
        total_xp: 1000,
        weekly_xp: 100,
        level: 5,
      };

      expect(isUserProfile(invalidProfile)).toBe(false);
    });

    it('should return false for missing total_xp', () => {
      const invalidProfile = {
        id: 'user-1',
        username: 'TestUser',
        weekly_xp: 100,
        level: 5,
      };

      expect(isUserProfile(invalidProfile)).toBe(false);
    });

    it('should return false for non-string id', () => {
      const invalidProfile = {
        id: 123,
        username: 'TestUser',
        total_xp: 1000,
        weekly_xp: 100,
        level: 5,
      };

      expect(isUserProfile(invalidProfile)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isUserProfile(null)).toBe(false);
      expect(isUserProfile(undefined)).toBe(false);
      expect(isUserProfile('string')).toBe(false);
      expect(isUserProfile(123)).toBe(false);
    });
  });

  describe('isOpening', () => {
    it('should return true for valid opening', () => {
      const validOpening = {
        id: 'opening-1',
        name: 'Italian Game',
        variations: [],
        category: 'open',
        difficulty: 'beginner',
        popularity: 100,
      };

      expect(isOpening(validOpening)).toBe(true);
    });

    it('should return true for opening with variations', () => {
      const validOpening = {
        id: 'opening-1',
        name: 'Italian Game',
        variations: [
          { id: 'var-1', name: 'Main', pgn: '1.e4', moves: ['e4'] },
        ],
        category: 'open',
        difficulty: 'beginner',
        popularity: 100,
      };

      expect(isOpening(validOpening)).toBe(true);
    });

    it('should return false for missing variations', () => {
      const invalidOpening = {
        id: 'opening-1',
        name: 'Italian Game',
      };

      expect(isOpening(invalidOpening)).toBe(false);
    });

    it('should return false for non-array variations', () => {
      const invalidOpening = {
        id: 'opening-1',
        name: 'Italian Game',
        variations: 'not an array',
      };

      expect(isOpening(invalidOpening)).toBe(false);
    });
  });

  describe('isVariation', () => {
    it('should return true for valid variation', () => {
      const validVariation = {
        id: 'var-1',
        name: 'Main Line',
        pgn: '1.e4 e5 2.Nf3',
        moves: ['e4', 'e5', 'Nf3'],
      };

      expect(isVariation(validVariation)).toBe(true);
    });

    it('should return false for missing pgn', () => {
      const invalidVariation = {
        id: 'var-1',
        name: 'Main Line',
        moves: ['e4', 'e5'],
      };

      expect(isVariation(invalidVariation)).toBe(false);
    });

    it('should return false for missing moves', () => {
      const invalidVariation = {
        id: 'var-1',
        name: 'Main Line',
        pgn: '1.e4 e5',
      };

      expect(isVariation(invalidVariation)).toBe(false);
    });
  });

  describe('isLeaderboardEntry', () => {
    it('should return true for valid leaderboard entry', () => {
      const validEntry = {
        id: 'user-1',
        username: 'Player1',
        total_xp: 5000,
        weekly_xp: 500,
        level: 10,
        rank: 1,
      };

      expect(isLeaderboardEntry(validEntry)).toBe(true);
    });

    it('should return false for missing rank', () => {
      const invalidEntry = {
        id: 'user-1',
        username: 'Player1',
        total_xp: 5000,
      };

      expect(isLeaderboardEntry(invalidEntry)).toBe(false);
    });

    it('should return false for non-number rank', () => {
      const invalidEntry = {
        id: 'user-1',
        rank: 'first',
      };

      expect(isLeaderboardEntry(invalidEntry)).toBe(false);
    });
  });

  describe('isSpeedrunEntry', () => {
    it('should return true for valid speedrun entry', () => {
      const validEntry = {
        id: 'user-1',
        username: 'SpeedPlayer',
        avg_time_seconds: 45.5,
        perfect_completions: 10,
        rank: 1,
      };

      expect(isSpeedrunEntry(validEntry)).toBe(true);
    });

    it('should return false for missing avg_time_seconds', () => {
      const invalidEntry = {
        id: 'user-1',
        username: 'SpeedPlayer',
        rank: 1,
      };

      expect(isSpeedrunEntry(invalidEntry)).toBe(false);
    });

    it('should return false for non-number avg_time_seconds', () => {
      const invalidEntry = {
        id: 'user-1',
        avg_time_seconds: 'fast',
        rank: 1,
      };

      expect(isSpeedrunEntry(invalidEntry)).toBe(false);
    });
  });

  describe('isApiError', () => {
    it('should return true for valid API error', () => {
      const validError = {
        message: 'Something went wrong',
        code: 'ERROR_CODE',
        statusCode: 500,
      };

      expect(isApiError(validError)).toBe(true);
    });

    it('should return true for minimal API error', () => {
      const minimalError = {
        message: 'Error message',
      };

      expect(isApiError(minimalError)).toBe(true);
    });

    it('should return false for missing message', () => {
      const invalidError = {
        code: 'ERROR_CODE',
        statusCode: 500,
      };

      expect(isApiError(invalidError)).toBe(false);
    });

    it('should return false for non-string message', () => {
      const invalidError = {
        message: 123,
      };

      expect(isApiError(invalidError)).toBe(false);
    });
  });

  describe('isTrainingSession', () => {
    it('should return true for valid training session', () => {
      const validSession = {
        id: 'session-1',
        user_id: 'user-1',
        opening_id: 'opening-1',
        variation_id: 'var-1',
      };

      expect(isTrainingSession(validSession)).toBe(true);
    });

    it('should return false for missing required fields', () => {
      const invalidSession = {
        id: 'session-1',
        user_id: 'user-1',
      };

      expect(isTrainingSession(invalidSession)).toBe(false);
    });
  });

  describe('isVariationCompletion', () => {
    it('should return true for valid completion', () => {
      const validCompletion = {
        id: 'completion-1',
        user_id: 'user-1',
        variation_id: 'var-1',
        completed_at: '2024-01-01T00:00:00.000Z',
      };

      expect(isVariationCompletion(validCompletion)).toBe(true);
    });

    it('should return false for missing completed_at', () => {
      const invalidCompletion = {
        id: 'completion-1',
        variation_id: 'var-1',
      };

      expect(isVariationCompletion(invalidCompletion)).toBe(false);
    });
  });
});
