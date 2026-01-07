import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTrainingPreferences } from '@/src/hooks/useTrainingPreferences';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@/src/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('useTrainingPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should initialize with drill mode by default', () => {
    const { result } = renderHook(() =>
      useTrainingPreferences({ hasMovesWithExplanations: true })
    );

    // Hook initializes with 'drill' before loading from storage
    expect(result.current.trainingModeId).toBe('drill');
    expect(result.current.isLoading).toBe(true);
  });

  it('should initialize with drill mode when hasMovesWithExplanations is false', () => {
    const { result } = renderHook(() =>
      useTrainingPreferences({ hasMovesWithExplanations: false })
    );

    expect(result.current.trainingModeId).toBe('drill');
    expect(result.current.isLoading).toBe(true);
  });

  it('should load saved preference from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('drill');

    const { result } = renderHook(() =>
      useTrainingPreferences({ hasMovesWithExplanations: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.trainingModeId).toBe('drill');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(expect.stringContaining('training_mode'));
  });

  it('should fallback to default when no saved preference', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() =>
      useTrainingPreferences({ hasMovesWithExplanations: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Default is 'drill' when no saved preference
    expect(result.current.trainingModeId).toBe('drill');
  });

  it('should save preference when setTrainingModeId is called', async () => {
    const { result } = renderHook(() =>
      useTrainingPreferences({ hasMovesWithExplanations: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setTrainingModeId('drill');
    });

    expect(result.current.trainingModeId).toBe('drill');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      expect.stringContaining('training_mode'),
      'drill'
    );
  });

  it('should handle AsyncStorage errors gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() =>
      useTrainingPreferences({ hasMovesWithExplanations: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should keep default 'drill' on error
    expect(result.current.trainingModeId).toBe('drill');
  });

  it('should handle save errors gracefully', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Save error'));

    const { result } = renderHook(() =>
      useTrainingPreferences({ hasMovesWithExplanations: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should still update local state even if save fails
    await act(async () => {
      await result.current.setTrainingModeId('drill');
    });

    expect(result.current.trainingModeId).toBe('drill');
  });

  it('should force drill mode when learn saved but no explanations available', async () => {
    // User saved 'learn' mode
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('learn');

    const { result } = renderHook(() =>
      useTrainingPreferences({ hasMovesWithExplanations: false })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should force 'drill' since explanations not available
    expect(result.current.trainingModeId).toBe('drill');
  });

  it('should preserve user preference over default', async () => {
    // User previously selected drill mode
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('drill');

    const { result } = renderHook(() =>
      useTrainingPreferences({ hasMovesWithExplanations: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should use saved preference even though default would be learn
    expect(result.current.trainingModeId).toBe('drill');
  });
});
