import { apiRequest } from '../api/client';
import type {
  PushDeviceRegistration,
  PushDeviceRegistrationResponse,
} from './pushNotificationTypes';

export function registerPushDevice(payload: PushDeviceRegistration) {
  return apiRequest<PushDeviceRegistrationResponse>('/api/push/devices', {
    method: 'POST',
    body: payload,
  });
}

export function unregisterPushDevice(token: string) {
  return apiRequest<unknown>('/api/push/devices', {
    method: 'DELETE',
    body: { token },
  });
}
