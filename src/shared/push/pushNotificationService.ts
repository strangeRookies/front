import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type PushNotificationSchema,
} from '@capacitor/push-notifications';
import { registerPushDevice, unregisterPushDevice } from './pushNotificationApi';
import {
  PUSH_STORAGE_KEYS,
  type PushNotificationHandlers,
  type PushNotificationInteraction,
} from './pushNotificationTypes';

const SAFETY_ALERT_CHANNEL_ID = 'safety-alerts';

export type PushNotificationCleanup = () => Promise<void>;

export function isAndroidNativeApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function initializePushNotifications(
  handlers: PushNotificationHandlers = {},
): Promise<PushNotificationCleanup> {
  if (!isAndroidNativeApp()) {
    return async () => undefined;
  }

  await PushNotifications.createChannel({
    id: SAFETY_ALERT_CHANNEL_ID,
    name: '안전 위험 알림',
    description: 'AI 위험 이벤트 알림',
    importance: 5,
    visibility: 1,
    vibration: true,
    sound: 'default',
  });

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
    permission = await PushNotifications.requestPermissions();
  }

  if (permission.receive !== 'granted') {
    console.warn('[FCM] Notification permission was not granted.');
    return async () => undefined;
  }

  const registrationHandle = await PushNotifications.addListener('registration', ({ value }) => {
    void registerCurrentPushToken(value);
  });
  const registrationErrorHandle = await PushNotifications.addListener('registrationError', ({ error }) => {
    console.error('[FCM] Registration failed.', error);
  });
  const receivedHandle = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    handlers.onReceived?.(toPushNotificationInteraction(notification));
  });
  const actionHandle = await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    handlers.onAction?.(toPushNotificationInteraction(notification));
  });

  await PushNotifications.register();

  return async () => {
    await Promise.all([
      registrationHandle.remove(),
      registrationErrorHandle.remove(),
      receivedHandle.remove(),
      actionHandle.remove(),
    ]);
  };
}

export async function releasePushDeviceBeforeLogout() {
  if (!isAndroidNativeApp()) {
    return;
  }

  const token = localStorage.getItem(PUSH_STORAGE_KEYS.fcmToken);
  if (!token) {
    return;
  }

  try {
    await unregisterPushDevice(token);
  } catch (error) {
    console.error('[FCM] Device unlink failed; invalidating the local Firebase token.', error);
    try {
      await PushNotifications.unregister();
    } catch (unregisterError) {
      console.error('[FCM] Firebase token invalidation failed.', unregisterError);
    }
  } finally {
    localStorage.removeItem(PUSH_STORAGE_KEYS.fcmToken);
  }
}

async function registerCurrentPushToken(token: string) {
  localStorage.setItem(PUSH_STORAGE_KEYS.fcmToken, token);

  try {
    const [{ version }, deviceId] = await Promise.all([
      CapacitorApp.getInfo(),
      Promise.resolve(getOrCreateAndroidInstallationId()),
    ]);

    await registerPushDevice({
      token,
      deviceId,
      platform: 'ANDROID',
      appVersion: version,
    });
  } catch (error) {
    console.error('[FCM] Device registration API failed.', error);
  }
}

function getOrCreateAndroidInstallationId() {
  const stored = localStorage.getItem(PUSH_STORAGE_KEYS.androidInstallationId);
  if (stored) {
    return stored;
  }

  const created = createUuid();
  localStorage.setItem(PUSH_STORAGE_KEYS.androidInstallationId, created);
  return created;
}

function createUuid() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

function toPushNotificationInteraction(
  notification: PushNotificationSchema,
): PushNotificationInteraction {
  const rawData = notification.data && typeof notification.data === 'object'
    ? notification.data as Record<string, unknown>
    : {};
  const data = Object.fromEntries(
    Object.entries(rawData)
      .filter(([, value]) => value != null)
      .map(([key, value]) => [key, String(value)]),
  );

  return {
    title: notification.title,
    body: notification.body,
    data,
  };
}
