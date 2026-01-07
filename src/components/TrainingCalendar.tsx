import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';

/**
 * Daily training statistics data
 */
export interface DailyStatsData {
  training_date: string;
  sessions_count: number;
  total_duration_seconds: number;
  total_mistakes: number;
  completed_count: number;
  openings_practiced: string[];
}

/**
 * Props for TrainingCalendar component
 */
export interface TrainingCalendarProps {
  /**
   * Array of daily training statistics
   */
  dailyStats: DailyStatsData[];
  /**
   * Callback when a day is pressed
   */
  onDayPress?: (date: string) => void;
}

/**
 * TrainingCalendar - Displays a calendar with training activity
 *
 * This component shows:
 * - Calendar with color-coded training days
 * - Color intensity based on training duration
 * - Legend explaining the color coding
 *
 * @example
 * ```tsx
 * <TrainingCalendar
 *   dailyStats={dailyStats}
 *   onDayPress={(date) => console.log('Selected:', date)}
 * />
 * ```
 */
export default function TrainingCalendar({ dailyStats, onDayPress }: TrainingCalendarProps) {
  // Convert daily stats to calendar marked dates
  const markedDates = useMemo(() => {
    const marked: Record<string, {
      marked?: boolean;
      dotColor?: string;
      selected?: boolean;
      selectedColor?: string;
      customStyles?: {
        container?: { backgroundColor: string; borderRadius: number };
        text?: { color: string; fontWeight: string };
      };
    }> = {};

    dailyStats.forEach(day => {
      const duration = Math.floor((day.total_duration_seconds || 0) / 60); // minutes

      // Color intensity based on duration
      let color = '#1e3a8a'; // dark blue
      if (duration >= 30) {
        color = '#16a34a'; // green - great session
      } else if (duration >= 15) {
        color = '#2563eb'; // blue - good session
      } else if (duration >= 5) {
        color = '#60a5fa'; // light blue - short session
      }

      marked[day.training_date] = {
        marked: true,
        dotColor: color,
        customStyles: {
          container: {
            backgroundColor: color + '20', // 20% opacity
            borderRadius: 4,
          },
          text: {
            color: '#ffffff',
            fontWeight: 'bold',
          },
        },
      };
    });

    // Mark today with different style
    const today = new Date().toISOString().split('T')[0];
    if (!marked[today]) {
      marked[today] = {
        selected: true,
        selectedColor: '#4b5563',
      };
    } else {
      marked[today] = {
        ...marked[today],
        selected: true,
        selectedColor: marked[today].dotColor,
      };
    }

    return marked;
  }, [dailyStats]);

  return (
    <View style={styles.container}>
      <Calendar
        markedDates={markedDates}
        onDayPress={(day) => onDayPress?.(day.dateString)}
        theme={{
          backgroundColor: '#000000',
          calendarBackground: '#1a1a1a',
          textSectionTitleColor: '#9ca3af',
          selectedDayBackgroundColor: '#2563eb',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#f59e0b',
          dayTextColor: '#ffffff',
          textDisabledColor: '#4b5563',
          monthTextColor: '#ffffff',
          arrowColor: '#ffffff',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
        }}
        style={styles.calendar}
      />

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Training Duration</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#60a5fa' }]} />
            <Text style={styles.legendText}>5-15 min</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
            <Text style={styles.legendText}>15-30 min</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
            <Text style={styles.legendText}>30+ min</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
  },
  calendar: {
    borderRadius: 12,
  },
  legend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  legendTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    color: '#d1d5db',
    fontSize: 11,
  },
});
