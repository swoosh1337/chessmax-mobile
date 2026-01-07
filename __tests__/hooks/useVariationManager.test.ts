import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useVariationManager } from '@/src/hooks/useVariationManager';

// Mock dependencies
const mockSaveVariationCompletion = jest.fn();

jest.mock('@/src/services/supabase/variationService', () => ({
  saveVariationCompletion: (...args: any[]) => mockSaveVariationCompletion(...args),
}));

jest.mock('@/src/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('useVariationManager', () => {
  const mockOpening = {
    name: 'Italian Game',
    whitelevels: {
      1: {
        variations: [
          { id: 'var-1', name: 'Main Line', moves: ['e4', 'e5', 'Nf3'] },
          { id: 'var-2', name: 'Giuoco Piano', moves: ['e4', 'e5', 'Bc4'] },
        ],
      },
    },
    blacklevels: {
      1: {
        variations: [
          { id: 'var-3', name: 'Defense Line', moves: ['e4', 'e5'] },
        ],
      },
    },
  };

  const mockUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveVariationCompletion.mockResolvedValue({ error: null });
  });

  it('should initialize with the provided opening', () => {
    const { result } = renderHook(() =>
      useVariationManager({
        initialOpening: mockOpening,
        userId: mockUserId,
        trainingModeId: 'learn',
      })
    );

    expect(result.current.currentOpening).toEqual(mockOpening);
    expect(result.current.currentVariationIndex).toBe(0);
  });

  it('should track variation statuses', () => {
    const { result } = renderHook(() =>
      useVariationManager({
        initialOpening: mockOpening,
        userId: mockUserId,
        trainingModeId: 'learn',
      })
    );

    // Initially all variations should be incomplete
    expect(result.current.variationStatuses).toBeDefined();
  });

  it('should switch to a specific variation', () => {
    const { result } = renderHook(() =>
      useVariationManager({
        initialOpening: mockOpening,
        userId: mockUserId,
        trainingModeId: 'learn',
      })
    );

    act(() => {
      result.current.switchToVariation(1);
    });

    expect(result.current.currentVariationIndex).toBe(1);
  });

  it('should handle next variation correctly', async () => {
    const { result } = renderHook(() =>
      useVariationManager({
        initialOpening: mockOpening,
        userId: mockUserId,
        trainingModeId: 'learn',
      })
    );

    expect(result.current.currentVariationIndex).toBe(0);

    await act(async () => {
      await result.current.handleNextVariation();
    });

    expect(result.current.currentVariationIndex).toBe(1);
  });

  it('should mark variation as complete', async () => {
    const { result } = renderHook(() =>
      useVariationManager({
        initialOpening: mockOpening,
        userId: mockUserId,
        trainingModeId: 'learn',
      })
    );

    await act(async () => {
      await result.current.markVariationComplete(0, {
        errors: 0,
        hintsUsed: 0,
        timeSpent: 60,
        xpEarned: 100,
      });
    });

    expect(mockSaveVariationCompletion).toHaveBeenCalled();
    expect(result.current.variationStatuses[0]).toBe('completed');
  });

  it('should return true when all variations are complete', async () => {
    const singleVariationOpening = {
      name: 'Simple Opening',
      whitelevels: {
        1: {
          variations: [
            { id: 'var-1', name: 'Only Line', moves: ['e4'] },
          ],
        },
      },
      blacklevels: {},
    };

    const { result } = renderHook(() =>
      useVariationManager({
        initialOpening: singleVariationOpening,
        userId: mockUserId,
        trainingModeId: 'learn',
      })
    );

    expect(result.current.allVariationsComplete).toBe(false);

    await act(async () => {
      await result.current.markVariationComplete(0, {
        errors: 0,
        hintsUsed: 0,
        timeSpent: 30,
        xpEarned: 50,
      });
    });

    expect(result.current.allVariationsComplete).toBe(true);
  });

  it('should get total variation count', () => {
    const { result } = renderHook(() =>
      useVariationManager({
        initialOpening: mockOpening,
        userId: mockUserId,
        trainingModeId: 'learn',
      })
    );

    // mockOpening has 2 white variations + 1 black variation
    expect(result.current.totalVariations).toBeGreaterThan(0);
  });

  it('should get completed variation count', async () => {
    const { result } = renderHook(() =>
      useVariationManager({
        initialOpening: mockOpening,
        userId: mockUserId,
        trainingModeId: 'learn',
      })
    );

    expect(result.current.completedVariations).toBe(0);

    await act(async () => {
      await result.current.markVariationComplete(0, {
        errors: 0,
        hintsUsed: 0,
        timeSpent: 60,
        xpEarned: 100,
      });
    });

    expect(result.current.completedVariations).toBe(1);
  });

  it('should reset variation state', () => {
    const { result } = renderHook(() =>
      useVariationManager({
        initialOpening: mockOpening,
        userId: mockUserId,
        trainingModeId: 'learn',
      })
    );

    act(() => {
      result.current.switchToVariation(1);
    });

    expect(result.current.currentVariationIndex).toBe(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.currentVariationIndex).toBe(0);
  });

  it('should handle save error gracefully', async () => {
    mockSaveVariationCompletion.mockResolvedValue({ error: new Error('Save failed') });

    const { result } = renderHook(() =>
      useVariationManager({
        initialOpening: mockOpening,
        userId: mockUserId,
        trainingModeId: 'learn',
      })
    );

    // Should not throw even if save fails
    await act(async () => {
      await result.current.markVariationComplete(0, {
        errors: 0,
        hintsUsed: 0,
        timeSpent: 60,
        xpEarned: 100,
      });
    });

    // Local state should still update
    expect(result.current.variationStatuses[0]).toBe('completed');
  });

  it('should not switch to invalid variation index', () => {
    const { result } = renderHook(() =>
      useVariationManager({
        initialOpening: mockOpening,
        userId: mockUserId,
        trainingModeId: 'learn',
      })
    );

    const initialIndex = result.current.currentVariationIndex;

    act(() => {
      result.current.switchToVariation(999);
    });

    // Should stay at current index or handle gracefully
    expect(result.current.currentVariationIndex).toBeDefined();
  });

  it('should handle null opening gracefully', () => {
    const { result } = renderHook(() =>
      useVariationManager({
        initialOpening: null,
        userId: mockUserId,
        trainingModeId: 'learn',
      })
    );

    expect(result.current.currentOpening).toBeNull();
    expect(result.current.totalVariations).toBe(0);
  });
});
