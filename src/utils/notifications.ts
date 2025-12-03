import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_STORAGE_KEY = '@chessmax_training_reminder';

// Configure how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return false;
    }

    // For Android, set up notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    console.log('[Notifications] Permission granted');
    return true;
  } catch (error) {
    console.error('[Notifications] Error requesting permissions:', error);
    return false;
  }
}

/**
 * Schedule a daily reminder notification
 * @param hour - Hour in 24-hour format (0-23)
 * @param minute - Minute (0-59)
 */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<string | null> {
  try {
    // Cancel any existing reminders first
    await cancelDailyReminder();

    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      throw new Error('Notification permission not granted');
    }

    // Schedule the notification
    const trigger: Notifications.DailyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '♟️ Time to train!',
        body: 'Practice your chess openings and improve your skills.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'training_reminder' },
      },
      trigger,
    });

    // Save the notification ID and settings
    await AsyncStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({ notificationId, hour, minute, enabled: true })
    );

    console.log('[Notifications] Daily reminder scheduled:', { hour, minute, notificationId });
    return notificationId;
  } catch (error) {
    console.error('[Notifications] Error scheduling daily reminder:', error);
    throw error;
  }
}

/**
 * Cancel the daily reminder
 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    const reminderData = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);

    if (reminderData) {
      const { notificationId } = JSON.parse(reminderData);
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log('[Notifications] Cancelled notification:', notificationId);
      }
    }

    // Clear storage
    await AsyncStorage.removeItem(REMINDER_STORAGE_KEY);
    console.log('[Notifications] Daily reminder cancelled');
  } catch (error) {
    console.error('[Notifications] Error cancelling daily reminder:', error);
  }
}

/**
 * Get the current reminder settings
 */
export async function getReminderSettings(): Promise<{
  enabled: boolean;
  hour: number;
  minute: number;
} | null> {
  try {
    const reminderData = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);

    if (reminderData) {
      const { enabled, hour, minute } = JSON.parse(reminderData);
      return { enabled, hour, minute };
    }

    return null;
  } catch (error) {
    console.error('[Notifications] Error getting reminder settings:', error);
    return null;
  }
}

/**
 * Check if notifications are enabled in system settings
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('[Notifications] Error checking permissions:', error);
    return false;
  }
}

/**
 * Get all scheduled notifications (useful for debugging)
 */
export async function getAllScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('[Notifications] Scheduled notifications:', notifications);
    return notifications;
  } catch (error) {
    console.error('[Notifications] Error getting scheduled notifications:', error);
    return [];
  }
}
