import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  getReminderSettings,
  requestNotificationPermissions,
} from '@/src/utils/notifications';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('useReminderSettings');

export interface UseReminderSettingsResult {
  reminderEnabled: boolean;
  reminderTime: Date;
  showTimePicker: boolean;
  setShowTimePicker: (show: boolean) => void;
  handleReminderToggle: (value: boolean) => Promise<void>;
  handleTimeChange: (event: any, selectedDate?: Date) => void;
  handleConfirmTime: (timeToSet?: Date) => Promise<void>;
}

/**
 * Hook to manage daily training reminder settings
 */
export function useReminderSettings(): UseReminderSettingsResult {
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load reminder settings on mount
  useEffect(() => {
    loadReminderSettings();
  }, []);

  const loadReminderSettings = async () => {
    try {
      const settings = await getReminderSettings();
      if (settings) {
        setReminderEnabled(settings.enabled);
        const time = new Date();
        time.setHours(settings.hour);
        time.setMinutes(settings.minute);
        setReminderTime(time);
      }
    } catch (error) {
      log.error('Error loading reminder settings', error);
    }
  };

  const handleReminderToggle = useCallback(async (value: boolean) => {
    try {
      if (value) {
        // Enabling reminder - request permissions
        const hasPermission = await requestNotificationPermissions();

        if (!hasPermission) {
          Alert.alert(
            'Notification Permission Required',
            'ChessMaxx needs permission to send you training reminders. Please enable notifications in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
          return;
        }

        // Show time picker
        setShowTimePicker(true);
      } else {
        // Disabling reminder
        await cancelDailyReminder();
        setReminderEnabled(false);
        Alert.alert('Success', 'Daily reminder has been turned off.');
      }
    } catch (error: any) {
      log.error('Error toggling reminder', error);
      Alert.alert('Error', error.message || 'Failed to update reminder settings.');
    }
  }, []);

  const handleTimeChange = useCallback((event: any, selectedDate?: Date) => {
    // On Android, the picker closes after selection and we schedule immediately
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event.type === 'dismissed') return;
      if (selectedDate) handleConfirmTime(selectedDate);
      return;
    }

    // On iOS, just update the time state while scrolling
    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }

    if (selectedDate) {
      setReminderTime(selectedDate);
    }
  }, []);

  const handleConfirmTime = useCallback(async (timeToSet?: Date) => {
    const selectedDate = timeToSet || reminderTime;

    try {
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();

      await scheduleDailyReminder(hour, minute);
      setReminderEnabled(true);
      setShowTimePicker(false);

      const timeString = selectedDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      Alert.alert(
        'Success',
        `Daily training reminder set for ${timeString}. You'll receive a notification every day at this time.`
      );
    } catch (error: any) {
      log.error('Error scheduling reminder', error);
      Alert.alert('Error', error.message || 'Failed to set reminder.');
    }
  }, [reminderTime]);

  return {
    reminderEnabled,
    reminderTime,
    showTimePicker,
    setShowTimePicker,
    handleReminderToggle,
    handleTimeChange,
    handleConfirmTime,
  };
}
