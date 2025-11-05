let Haptics;
try {
  Haptics = require('expo-haptics');
} catch {
  Haptics = null;
}

export function ok() {
  if (!Haptics) return;
  Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
}

export function capture() {
  if (!Haptics) return;
  Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
}

export function error() {
  if (!Haptics) return;
  Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Error);
}

export function select() {
  if (!Haptics) return;
  Haptics.selectionAsync?.();
}

