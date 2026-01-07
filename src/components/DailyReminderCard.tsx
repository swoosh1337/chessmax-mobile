import React from 'react';
import { View, Text, Switch, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/src/theme/colors';
import { UseReminderSettingsResult } from '@/src/hooks/useReminderSettings';

export interface DailyReminderCardProps {
  reminderSettings: UseReminderSettingsResult;
}

/**
 * Daily training reminder settings card
 */
export default function DailyReminderCard({ reminderSettings }: DailyReminderCardProps) {
  const {
    reminderEnabled,
    reminderTime,
    showTimePicker,
    setShowTimePicker,
    handleReminderToggle,
    handleTimeChange,
    handleConfirmTime,
  } = reminderSettings;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Daily Training Reminder</Text>
          <Text style={styles.subtitle}>
            {reminderEnabled
              ? `Set for ${reminderTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
              : 'Stay consistent with daily practice'}
          </Text>
        </View>
        <Switch
          value={reminderEnabled}
          onValueChange={handleReminderToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={reminderEnabled ? colors.background : colors.textSubtle}
          ios_backgroundColor={colors.border}
        />
      </View>

      {reminderEnabled && (
        <TouchableOpacity
          style={styles.changeTimeButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.changeTimeText}>Change Time</Text>
        </TouchableOpacity>
      )}

      {showTimePicker && (
        <View style={styles.timePickerContainer}>
          <DateTimePicker
            value={reminderTime}
            mode="time"
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => handleConfirmTime()}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: '500',
  },
  changeTimeButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  changeTimeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  timePickerContainer: {
    marginTop: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  doneButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});
