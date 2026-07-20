import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.strange.safety',
  appName: 'Smart Safety',
  webDir: 'dist',
  android: {
    // Development devices connect to HTTP services on the same private network.
    // Remove this once every API and media endpoint is served over HTTPS/WSS.
    allowMixedContent: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['alert', 'sound'],
    },
  },
};

export default config;
