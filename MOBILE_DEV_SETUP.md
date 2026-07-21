# Running the iOS & Android apps in development

If the native apps show **"missing package dependencies"** and won't build, it's
almost always one thing: **`node_modules` hasn't been installed yet.**

This repo does not ship `node_modules` (it's ~900MB). Both native projects
reference their Capacitor plugins *through* `node_modules`:

- **iOS** uses Swift Package Manager. `ios/App/CapApp-SPM/Package.swift` points at
  `../../../node_modules/@capacitor/*` (and the community/aparajita plugins).
- **Android** uses Gradle. `android/capacitor.settings.gradle` points at
  `../node_modules/@capacitor/*`.

Until you install dependencies, Xcode's SPM resolver and Gradle can't find those
packages — hence "missing package dependencies."

## One-time setup

```bash
# 1. Install JS deps (this repo needs the legacy peer-deps flag)
npm install --legacy-peer-deps
```

That's the whole fix for the "missing dependencies" error. Then:

### iOS

```bash
open ios/App/App.xcodeproj
```

- Xcode resolves the local Swift packages automatically. If it doesn't, use
  **File → Packages → Resolve Package Versions**.
- Select a simulator/device and Run. No CocoaPods / `pod install` — this project
  is SPM-based (there is no Podfile by design).

### Android

```bash
npx cap open android      # or open the android/ folder in Android Studio
```

- Let Gradle sync on first open (Android Studio writes `android/local.properties`
  with your SDK path — it's intentionally not committed).
- Select a device and Run.

## Important: do NOT run `npx cap sync` on iOS

The iOS app uses a **custom AVFoundation barcode scanner**
(`ios/App/CapApp-SPM/Sources/CapApp-SPM/BarcodeScannerPlugin.swift`) instead of
`@capacitor-mlkit/barcode-scanning`, because mlkit depends on GoogleMLKit, which
is CocoaPods-only and does not work under Swift Package Manager. mlkit is therefore
deliberately **absent** from `Package.swift` on iOS (it's still used on Android via
Gradle).

`npx cap sync` (or `npx cap sync ios`) will "helpfully" re-add mlkit to
`Package.swift`, which reintroduces the GoogleMLKit/SPM conflict and breaks the iOS
build. If you only need to refresh the bundled web assets, use the safe copy step
instead:

```bash
npx cap copy        # copies web assets + config; does NOT touch plugin wiring
```

`npx cap sync android` is safe (Android has no such workaround), but it isn't
required — the Gradle plugin files are already generated and current.

## The app loads the hosted site

`capacitor.config.ts` sets `server.url = https://www.myhumidor.shop`, so the native
shell loads the live site rather than a local bundle. The Vercel deployment must be
reachable for the app to load. To point at a local dev server instead, set
`CAP_SERVER_URL` (see the comment in `capacitor.config.ts`) and `npx cap copy`.
