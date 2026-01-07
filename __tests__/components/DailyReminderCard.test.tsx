import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Platform, Switch } from 'react-native';
import DailyReminderCard from '@/src/components/DailyReminderCard';
import { UseReminderSettingsResult } from '@/src/hooks/useReminderSettings';

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onChange, value }: any) => {
      return React.createElement('View', {
        testID: 'datetime-picker',
        onChange,
        value,
      });
    },
  };
});

describe('DailyReminderCard', () => {
  const createMockReminderSettings = (
    overrides: Partial<UseReminderSettingsResult> = {}
  ): UseReminderSettingsResult => {
    const reminderTime = new Date();
    reminderTime.setHours(9, 0, 0, 0);

    return {
      reminderEnabled: false,
      reminderTime,
      showTimePicker: false,
      setShowTimePicker: jest.fn(),
      handleReminderToggle: jest.fn(),
      handleTimeChange: jest.fn(),
      handleConfirmTime: jest.fn(),
      ...overrides,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render title', () => {
    const mockSettings = createMockReminderSettings();
    render(<DailyReminderCard reminderSettings={mockSettings} />);

    expect(screen.getByText('Daily Training Reminder')).toBeTruthy();
  });

  it('should show default subtitle when disabled', () => {
    const mockSettings = createMockReminderSettings({ reminderEnabled: false });
    render(<DailyReminderCard reminderSettings={mockSettings} />);

    expect(screen.getByText('Stay consistent with daily practice')).toBeTruthy();
  });

  it('should show time in subtitle when enabled', () => {
    const time = new Date();
    time.setHours(14, 30, 0, 0);

    const mockSettings = createMockReminderSettings({
      reminderEnabled: true,
      reminderTime: time,
    });
    render(<DailyReminderCard reminderSettings={mockSettings} />);

    // Should show formatted time like "Set for 2:30 PM"
    expect(screen.getByText(/Set for/)).toBeTruthy();
  });

  it('should render switch component', () => {
    const mockSettings = createMockReminderSettings();
    const { UNSAFE_getByType } = render(<DailyReminderCard reminderSettings={mockSettings} />);

    expect(UNSAFE_getByType(Switch)).toBeTruthy();
  });

  it('should call handleReminderToggle when switch is toggled', () => {
    const handleReminderToggle = jest.fn();
    const mockSettings = createMockReminderSettings({ handleReminderToggle });
    const { UNSAFE_getByType } = render(<DailyReminderCard reminderSettings={mockSettings} />);

    const switchComponent = UNSAFE_getByType(Switch);
    fireEvent(switchComponent, 'valueChange', true);

    expect(handleReminderToggle).toHaveBeenCalledWith(true);
  });

  it('should show Change Time button when enabled', () => {
    const mockSettings = createMockReminderSettings({ reminderEnabled: true });
    render(<DailyReminderCard reminderSettings={mockSettings} />);

    expect(screen.getByText('Change Time')).toBeTruthy();
  });

  it('should not show Change Time button when disabled', () => {
    const mockSettings = createMockReminderSettings({ reminderEnabled: false });
    render(<DailyReminderCard reminderSettings={mockSettings} />);

    expect(screen.queryByText('Change Time')).toBeNull();
  });

  it('should call setShowTimePicker when Change Time is pressed', () => {
    const setShowTimePicker = jest.fn();
    const mockSettings = createMockReminderSettings({
      reminderEnabled: true,
      setShowTimePicker,
    });
    render(<DailyReminderCard reminderSettings={mockSettings} />);

    fireEvent.press(screen.getByText('Change Time'));

    expect(setShowTimePicker).toHaveBeenCalledWith(true);
  });

  it('should show time picker when showTimePicker is true', () => {
    const mockSettings = createMockReminderSettings({ showTimePicker: true });
    render(<DailyReminderCard reminderSettings={mockSettings} />);

    expect(screen.getByTestId('datetime-picker')).toBeTruthy();
  });

  it('should not show time picker when showTimePicker is false', () => {
    const mockSettings = createMockReminderSettings({ showTimePicker: false });
    render(<DailyReminderCard reminderSettings={mockSettings} />);

    expect(screen.queryByTestId('datetime-picker')).toBeNull();
  });

  describe('iOS specific', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('should show Done button on iOS', () => {
      const mockSettings = createMockReminderSettings({ showTimePicker: true });
      render(<DailyReminderCard reminderSettings={mockSettings} />);

      expect(screen.getByText('Done')).toBeTruthy();
    });

    it('should call handleConfirmTime when Done is pressed', () => {
      const handleConfirmTime = jest.fn();
      const mockSettings = createMockReminderSettings({
        showTimePicker: true,
        handleConfirmTime,
      });
      render(<DailyReminderCard reminderSettings={mockSettings} />);

      fireEvent.press(screen.getByText('Done'));

      expect(handleConfirmTime).toHaveBeenCalled();
    });
  });

  describe('Android specific', () => {
    beforeEach(() => {
      (Platform as any).OS = 'android';
    });

    afterEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('should not show Done button on Android', () => {
      const mockSettings = createMockReminderSettings({ showTimePicker: true });
      render(<DailyReminderCard reminderSettings={mockSettings} />);

      expect(screen.queryByText('Done')).toBeNull();
    });
  });

  it('should have correct switch value based on reminderEnabled', () => {
    const mockSettingsEnabled = createMockReminderSettings({ reminderEnabled: true });
    const { UNSAFE_getByType, rerender } = render(
      <DailyReminderCard reminderSettings={mockSettingsEnabled} />
    );

    let switchComponent = UNSAFE_getByType(Switch);
    expect(switchComponent.props.value).toBe(true);

    const mockSettingsDisabled = createMockReminderSettings({ reminderEnabled: false });
    rerender(<DailyReminderCard reminderSettings={mockSettingsDisabled} />);

    switchComponent = UNSAFE_getByType(Switch);
    expect(switchComponent.props.value).toBe(false);
  });
});
