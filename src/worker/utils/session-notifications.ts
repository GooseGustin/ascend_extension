/**
 * Session Notifications Utility
 * Handles browser/system notifications and sound for session and break end
 */

// Sound file paths (place WAV files in public/sounds/)
const SESSION_END_SOUND_PATH = '/sounds/session-end.wav';
const BREAK_END_SOUND_PATH = '/sounds/break-end.wav';

/**
 * Request notification permission from the browser
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Check if notifications are permitted
 */
export function isNotificationPermitted(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Show a browser/system notification
 */
export function showNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
  }
): Notification | null {
  if (!isNotificationPermitted()) {
    console.warn('Notification permission not granted');
    return null;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: options?.icon || '/icon-128.png',
      tag: options?.tag || 'ascend-session',
      requireInteraction: options?.requireInteraction || false,
      silent: false, // Let the system play its default sound too
    });

    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);

    return notification;
  } catch (error) {
    console.error('Failed to show notification:', error);
    return null;
  }
}

/**
 * Play notification sound from WAV files
 */
export async function playNotificationSound(type: 'session_end' | 'break_end'): Promise<void> {
  try {
    // Select sound file based on type
    const soundPath = type === 'session_end' ? SESSION_END_SOUND_PATH : BREAK_END_SOUND_PATH;

    // Use Audio element for simplicity and reliability
    const audio = new Audio(soundPath);
    audio.volume = 0.7;
    await audio.play();
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}

/**
 * Notify session end with popup and sound
 */
export async function notifySessionEnd(
  questTitle: string,
  options: { popup: boolean; sound: boolean }
): Promise<void> {
  if (options.sound) {
    await playNotificationSound('session_end');
  }

  if (options.popup) {
    showNotification(
      'Focus Session Complete!',
      `Great work on "${questTitle}"! Time for a break.`,
      { tag: 'session-end', requireInteraction: true }
    );
  }
}

/**
 * Notify break end with popup and sound
 */
export async function notifyBreakEnd(
  questTitle: string,
  options: { popup: boolean; sound: boolean }
): Promise<void> {
  if (options.sound) {
    await playNotificationSound('break_end');
  }

  if (options.popup) {
    showNotification(
      'Break Over!',
      `Ready to continue working on "${questTitle}"?`,
      { tag: 'break-end', requireInteraction: true }
    );
  }
}
