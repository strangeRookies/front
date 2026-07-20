export const PUSH_STORAGE_KEYS = {
  androidInstallationId: 'smartSafety.androidInstallationId',
  fcmToken: 'smartSafety.fcmToken',
} as const;

export interface PushDeviceRegistration {
  token: string;
  deviceId: string;
  platform: 'ANDROID';
  appVersion: string;
}

export interface PushDeviceRegistrationResponse {
  registered: boolean;
}

export interface PushNotificationData {
  type?: string;
  eventId?: string;
  cameraId?: string;
  cameraLoginId?: string;
  targetType?: string;
  targetId?: string;
  facilityId?: string;
  companyProfileId?: string;
  scenarioType?: string;
  severity?: string;
  occurredAt?: string;
  [key: string]: string | undefined;
}

export interface PushNotificationInteraction {
  title?: string;
  body?: string;
  data: PushNotificationData;
}

export interface PushNotificationHandlers {
  onReceived?: (notification: PushNotificationInteraction) => void;
  onAction?: (notification: PushNotificationInteraction) => void;
}
