import { useEffect, useRef } from 'react';
import { initializePushNotifications, type PushNotificationCleanup } from './pushNotificationService';
import type { PushNotificationHandlers } from './pushNotificationTypes';

export function usePushNotifications(enabled: boolean, handlers: PushNotificationHandlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let cancelled = false;
    let cleanup: PushNotificationCleanup | undefined;

    void initializePushNotifications({
      onReceived: (notification) => handlersRef.current.onReceived?.(notification),
      onAction: (notification) => handlersRef.current.onAction?.(notification),
    })
      .then((registeredCleanup) => {
        if (cancelled) {
          void registeredCleanup();
          return;
        }
        cleanup = registeredCleanup;
      })
      .catch((error) => {
        console.error('[FCM] Initialization failed.', error);
      });

    return () => {
      cancelled = true;
      if (cleanup) {
        void cleanup();
      }
    };
  }, [enabled]);
}
