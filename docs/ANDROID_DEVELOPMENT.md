# Android development

This repository packages the existing Vite application in a Capacitor Android
container. The initial target is a debug APK installed directly on an Android
phone connected over USB.

## One-time setup

1. Install Android Studio and Android SDK Platform 36.
2. Enable Developer options and USB debugging on the phone.
3. Copy `.env.android.example` to `.env.android.local`.
4. Keep the USB-development endpoints on `127.0.0.1`.
5. Forward the API and camera-specific MJPEG ports after every USB reconnect.

```powershell
adb reverse tcp:8080 tcp:8080
8010..8020 | ForEach-Object { adb reverse "tcp:$_" "tcp:$_" }
```

The `127.0.0.1` endpoints work here because `adb reverse` forwards them from the
Android phone to the development PC. Without that forwarding they point only to
the phone and the API or MJPEG streams will be unavailable.

## Build and install

```powershell
npm.cmd run android:sync
cd android
.\gradlew.bat installDebug
```

Alternatively, run `npm.cmd run android:open` after synchronization and select a
connected device in Android Studio.

Every web-code or Android environment change must be followed by
`npm.cmd run android:sync` before reinstalling the debug APK.

## Network security

Debug builds permit cleartext HTTP traffic so that services on the private
development network can be tested. Release builds do not inherit the debug
manifest override. Before any external distribution, expose the API, WebSocket,
and media endpoints through HTTPS/WSS and remove `allowMixedContent` from
`capacitor.config.ts`.

## Push notifications

The Capacitor push plugin is installed, but FCM remains inactive until
`android/app/google-services.json` is supplied and the frontend and backend
device-token flows are implemented. The Firebase file is intentionally ignored
by Git.
