# Running MyHumidor on a mobile device

MyHumidor ships as a **Capacitor shell around the hosted Next.js app** — the native
app loads `https://www.myhumidor.shop` (set in `capacitor.config.ts`) and layers native
splash, status bar, camera, Face ID, location, push, and the in-app browser on top.
So "building for device" is mostly: generate the native projects, apply permissions,
add assets, and run. You do **not** rebuild the web app into the binary.

> Run these locally — they need the native toolchains (Xcode for iOS, Android Studio
> for Android). They can't run in CI-without-toolchains or in this environment.

## 0. Prerequisites
- Node 18+ and the repo installed (`npm install`).
- **iOS**: macOS + Xcode + CocoaPods (`sudo gem install cocoapods`), an Apple Developer account for device builds/push.
- **Android**: Android Studio + a JDK; for push, a Firebase project (`google-services.json`).

## 1. Create the native projects (one time)
```bash
npm run cap:add:ios       # → ios/   (macOS only)
npm run cap:add:android   # → android/
```

## 2. Apply all required permissions (one time, re-runnable)
```bash
npm run cap:permissions
```
This patches the generated projects with everything the app uses:

**iOS — `ios/App/App/Info.plist`**
- `NSCameraUsageDescription` — scanning cigar bands (camera / getUserMedia)
- `NSPhotoLibraryUsageDescription` — the "choose a photo" scan/share fallback
- `NSPhotoLibraryAddUsageDescription` — saving a generated story image
- `NSFaceIDUsageDescription` — Face ID sign-in
- `NSLocationWhenInUseUsageDescription` — "lounges near me"

**Android — `android/app/src/main/AndroidManifest.xml`**
- `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `POST_NOTIFICATIONS`,
  `READ_MEDIA_IMAGES`, `USE_BIOMETRIC`, and an optional camera feature flag.

> Without the iOS camera string, **both** the in-app camera and the webview camera are
> blocked by iOS with no prompt — this is the #1 cause of "scan does nothing" on device.
> (Note: the iOS **Simulator has no camera at all** — test the live scanner on a real
> device; on the Simulator use "or choose a photo".)

## 3. App icon & splash (one time / when art changes)
```bash
npm run cap:assets
```
Expects a 1024×1024 icon and 2732×2732 splash. Easiest: put `icon.png` and
`splash.png` (dark `#14110d` background, logo centered — start from
`public/myhumidor-logo.png`) in an `assets/` folder, then run the command.

## 4. Push notifications (optional, when you want them live)
- **iOS**: in Xcode → Signing & Capabilities, add **Push Notifications** and
  **Background Modes › Remote notifications**. Create an APNs key in the Apple
  Developer portal and register it with your push provider.
- **Android**: add the app to a Firebase project and drop `google-services.json` into
  `android/app/`. `@capacitor/push-notifications` handles the rest.
- The app already requests permission and registers device tokens (see `phase*`
  notification migrations + `src/lib/notifications.ts`).

## 5. Sync, build, run
```bash
npm run cap:sync          # copy config + plugins into the native projects
npm run cap:ios           # sync iOS + open Xcode  → pick a device → Run
npm run cap:android       # sync Android + open Android Studio → Run
```
Re-run `cap:sync` only when native config, plugins, icons, or permissions change —
day-to-day web changes go live via the hosted URL with no rebuild.

## Plugins bundled (all Capacitor 8)
`@capacitor/app`, `@capacitor/core`, `@capacitor/keyboard`, `@capacitor/splash-screen`,
`@capacitor/status-bar`, `@capacitor/geolocation`, `@capacitor/push-notifications`,
`@capacitor/browser` (in-app menu PDFs), `@aparajita/capacitor-biometric-auth` +
`@aparajita/capacitor-secure-storage` (Face ID). `@capacitor/camera` and
`@capacitor-community/camera-preview` are installed but the scanner now uses inline
getUserMedia + the photo picker, so they're optional and can be removed if you want a
leaner native build.

## Environment / hosting
The native app talks to the **hosted** site, so the production deployment must have all
server env vars set (`SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_*`,
`NEXT_PUBLIC_MAPBOX_TOKEN`, reCAPTCHA, Google CSE). To point the app at a local dev
server instead: `CAP_SERVER_URL=http://<your-ip>:3000 npm run cap:ios`.

## Quick reference
| Step | Command |
|---|---|
| Add platforms | `npm run cap:add:ios` / `npm run cap:add:android` |
| Apply permissions | `npm run cap:permissions` |
| Icons + splash | `npm run cap:assets` |
| Sync + open iOS | `npm run cap:ios` |
| Sync + open Android | `npm run cap:android` |
| Permissions + sync in one | `npm run cap:setup` |
