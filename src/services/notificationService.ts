import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0f172a',
    });
  }
}

export interface MedicineReminder {
  id: string;
  medName: string;
  dosage: string;
  time: string; // "HH:MM" e.g. "08:00"
  active: boolean;
  notificationId?: string;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

// Trigger an instant push notification locally (used for ASHA broadcasts or radar updates)
export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
  if (Platform.OS === 'web') {
    console.log('[Notification Service (Web Mock)] Title:', title, 'Body:', body);
    return;
  }
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.warn('[Notification Service] Notification permission not granted.');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: {
      channelId: 'default',
    } as any,
  });
}

// Schedule repeating medicine reminders
export async function scheduleMedicineReminder(reminder: MedicineReminder): Promise<string | undefined> {
  if (Platform.OS === 'web') {
    console.log('[Notification Service (Web Mock)] Scheduled medicine reminder:', reminder.medName);
    return 'web_reminder_' + Date.now();
  }
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.warn('[Notification Service] No permission to schedule medicine reminders.');
    return undefined;
  }

  // Parse time "HH:MM"
  const [hourStr, minuteStr] = reminder.time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isNaN(hour) || isNaN(minute)) {
    console.error('[Notification Service] Invalid time format for reminder:', reminder.time);
    return undefined;
  }

  // Schedule notification repeating daily at designated time
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `💊 Medication Reminder: ${reminder.medName}`,
      body: `Time to take your dosage of ${reminder.dosage}. Stay healthy!`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'default',
    } as any,
  });

  return notificationId;
}

// Cancel a scheduled medicine reminder notification
export async function cancelMedicineReminder(notificationId: string) {
  if (Platform.OS === 'web') {
    console.log('[Notification Service (Web Mock)] Cancelled notification ID:', notificationId);
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn('[Notification Service] Cancel notification failed:', err);
  }
}
