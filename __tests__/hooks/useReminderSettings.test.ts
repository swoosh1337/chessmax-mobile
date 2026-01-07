import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useReminderSettings } from '@/src/hooks/useReminderSettings';
import { Alert, Linking, Platform } from 'react-native';

// Mock dependencies
const mockScheduleDailyReminder = jest.fn().mockResolvedValue(undefined);
const mockCancelDailyReminder = jest.fn().mockResolvedValue(undefined);
const mockGetReminderSettings = jest.fn().mockResolvedValue(null);
const mockRequestNotificationPermissions = jest.fn().mockResolvedValue(true);

jest.mock('@/src/utils/notifications', () => ({
  scheduleDailyReminder: (...args: any[]) => mockScheduleDailyReminder(...args),
  cancelDailyReminder: (...args: any[]) => mockCancelDailyReminder(...args),
  getReminderSettings: (...args: any[]) => mockGetReminderSettings(...args),
  requestNotificationPermissions: (...args: any[]) => mockRequestNotificationPermissions(...args),
}));

jest.mock('@/src/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.spyOn(Alert, 'alert');
jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

describe('useReminderSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetReminderSettings.mockResolvedValue(null);
    mockRequestNotificationPermissions.mockResolvedValue(true);
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useReminderSettings());

    expect(result.current.reminderEnabled).toBe(false);
    expect(result.current.reminderTime).toBeInstanceOf(Date);
    expect(result.current.showTimePicker).toBe(false);
  });

  it('should load saved reminder settings on mount', async () => {
    mockGetReminderSettings.mockResolvedValue({
      enabled: true,
      hour: 9,
      minute: 30,
    });

    const { result } = renderHook(() => useReminderSettings());

    await waitFor(() => {
      expect(result.current.reminderEnabled).toBe(true);
    });

    expect(result.current.reminderTime.getHours()).toBe(9);
    expect(result.current.reminderTime.getMinutes()).toBe(30);
  });

  it('should show time picker when enabling reminder with permission', async () => {
    const { result } = renderHook(() => useReminderSettings());

    await act(async () => {
      await result.current.handleReminderToggle(true);
    });

    expect(mockRequestNotificationPermissions).toHaveBeenCalled();
    expect(result.current.showTimePicker).toBe(true);
  });

  it('should show alert when notification permission denied', async () => {
    mockRequestNotificationPermissions.mockResolvedValue(false);

    const { result } = renderHook(() => useReminderSettings());

    await act(async () => {
      await result.current.handleReminderToggle(true);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Notification Permission Required',
      expect.any(String),
      expect.any(Array)
    );
    expect(result.current.showTimePicker).toBe(false);
  });

  it('should cancel reminder when toggling off', async () => {
    mockGetReminderSettings.mockResolvedValue({
      enabled: true,
      hour: 9,
      minute: 0,
    });

    const { result } = renderHook(() => useReminderSettings());

    await waitFor(() => {
      expect(result.current.reminderEnabled).toBe(true);
    });

    await act(async () => {
      await result.current.handleReminderToggle(false);
    });

    expect(mockCancelDailyReminder).toHaveBeenCalled();
    expect(result.current.reminderEnabled).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Success', expect.any(String));
  });

  it('should schedule reminder on confirm time', async () => {
    const { result } = renderHook(() => useReminderSettings());

    const testDate = new Date();
    testDate.setHours(14, 30, 0, 0);

    await act(async () => {
      await result.current.handleConfirmTime(testDate);
    });

    expect(mockScheduleDailyReminder).toHaveBeenCalledWith(14, 30);
    expect(result.current.reminderEnabled).toBe(true);
    expect(result.current.showTimePicker).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Success', expect.stringContaining('Daily training reminder set'));
  });

  it('should handle time change on iOS by updating state', async () => {
    const originalPlatform = Platform.OS;
    (Platform as any).OS = 'ios';

    const { result } = renderHook(() => useReminderSettings());

    const testDate = new Date();
    testDate.setHours(10, 15, 0, 0);

    act(() => {
      result.current.handleTimeChange({ type: 'set' }, testDate);
    });

    expect(result.current.reminderTime.getHours()).toBe(10);
    expect(result.current.reminderTime.getMinutes()).toBe(15);

    (Platform as any).OS = originalPlatform;
  });

  it('should close picker on dismissed event on iOS', () => {
    const originalPlatform = Platform.OS;
    (Platform as any).OS = 'ios';

    const { result } = renderHook(() => useReminderSettings());

    act(() => {
      result.current.setShowTimePicker(true);
    });

    expect(result.current.showTimePicker).toBe(true);

    act(() => {
      result.current.handleTimeChange({ type: 'dismissed' });
    });

    expect(result.current.showTimePicker).toBe(false);

    (Platform as any).OS = originalPlatform;
  });

  it('should handle time change on Android by scheduling immediately', async () => {
    const originalPlatform = Platform.OS;
    (Platform as any).OS = 'android';

    const { result } = renderHook(() => useReminderSettings());

    const testDate = new Date();
    testDate.setHours(8, 0, 0, 0);

    await act(async () => {
      result.current.handleTimeChange({ type: 'set' }, testDate);
    });

    expect(result.current.showTimePicker).toBe(false);
    expect(mockScheduleDailyReminder).toHaveBeenCalledWith(8, 0);

    (Platform as any).OS = originalPlatform;
  });

  it('should not schedule on Android dismiss', async () => {
    const originalPlatform = Platform.OS;
    (Platform as any).OS = 'android';

    const { result } = renderHook(() => useReminderSettings());

    act(() => {
      result.current.handleTimeChange({ type: 'dismissed' });
    });

    expect(mockScheduleDailyReminder).not.toHaveBeenCalled();
    expect(result.current.showTimePicker).toBe(false);

    (Platform as any).OS = originalPlatform;
  });

  it('should handle scheduling error gracefully', async () => {
    mockScheduleDailyReminder.mockRejectedValue(new Error('Scheduling failed'));

    const { result } = renderHook(() => useReminderSettings());

    const testDate = new Date();

    await act(async () => {
      await result.current.handleConfirmTime(testDate);
    });

    expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
  });

  it('should allow setting showTimePicker directly', () => {
    const { result } = renderHook(() => useReminderSettings());

    expect(result.current.showTimePicker).toBe(false);

    act(() => {
      result.current.setShowTimePicker(true);
    });

    expect(result.current.showTimePicker).toBe(true);
  });
});
