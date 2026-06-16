# MyHumidor — iOS & Android app (Capacitor)

MyHumidor ships to the App Store and Google Play as a **Capacitor** app: a thin
native shell that loads the hosted Next.js site (`https://www.myhumidor.shop`).
Because the app is server-rendered (server components, `/api` routes, cookie
Supabase auth), loading the production URL means **everything works unchanged** —
no static-export rewrite, no second copy of the app to maintain. The native
layer adds the launch splash, status-bar theming, Android hardware-back, and
deep links (see `src/components/NativeShell.tsx`).

## What's already set up in the repo
- `@capacitor/core` + plugins (`app`, `status-bar`, `splash-screen`, `keyboard`) and
  the dev CLI (`@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`).
- `capacitor.config.ts` — appId `shop.myhumidor.app`, name **MyHumidor**, dark
  brand background `#14110d`, `server.url` → production with `allowNavigation`
  scoped to our domains + Supabase + the CloudFront CDN.
- `mobile/www/index.html` — minimal loading screen (the real UI loads from the URL).
- `NativeShell` mounted in the root layout (no-ops on web).
- npm scripts: `cap:add:ios`, `cap:add:android`, `cap:sync`, `cap:ios`, `cap:android`.

## One-time platform setup (run locally — needs the native toolchains)
> These **cannot** be done in the build sandbox: iOS requires macOS + Xcode, and
> Android requires Android Studio + the Android SDK. Run them on your Mac.

```bash
npm install                 # pulls Capacitor + plugins
npm run cap:add:ios         # creates ./ios   (macOS only)
npm run cap:add:android     # creates ./android
```

### App icons & splash
The asset generator (`@capacitor/assets`) needs `sharp`, which the sandbox
couldn't download — install and run it locally:
```bash
npm i -D @capacitor/assets
mkdir -p assets
# Provide a 1024×1024 icon and a 2732×2732 splash (dark bg). You can start from
# public/myhumidor-logo.png centered on #14110d.
cp public/myhumidor-logo.png assets/logo.png
npx @capacitor/assets generate --iconBackgroundColor '#14110d' --splashBackgroundColor '#14110d'
```

## Day-to-day
The app loads the live site, so most changes ship by deploying to Vercel — no
rebuild needed. Rebuild the native app only when you change native config,
icons, or plugins:
```bash
npm run cap:sync            # copy config/plugins into ios + android
npm run cap:ios             # open Xcode
npm run cap:android         # open Android Studio
```
To test against a local dev server on a device:
```bash
CAP_SERVER_URL=http://<your-LAN-ip>:3000 npm run cap:sync && npm run cap:ios
```

## Submission
- **iOS:** in Xcode set the team/signing, bump version + build, Product → Archive
  → distribute to App Store Connect. Fill in privacy nutrition labels (account,
  location if you keep check-ins, usage data).
- **Android:** in Android Studio, Build → Generate Signed Bundle (`.aab`), upload
  to the Play Console. Complete the Data Safety form.
- Deep links: register `applinks:www.myhumidor.shop` (iOS Associated Domains +
  `apple-app-site-association`) and an Android App Links `assetlinks.json` so
  `https://www.myhumidor.shop/...` opens the app.

## Honest risks / recommended before iOS submission
- **Apple Guideline 4.2 ("minimum functionality").** A pure URL wrapper can be
  rejected. We already add native splash/status-bar/back/deep-links; the strongest
  mitigation is **native push notifications** (`@capacitor/push-notifications` +
  APNs/FCM) — worth adding before you submit, and a natural fit for lounge deals,
  new follows, and check-in replies. Haptics and native share are easy adds too.
- **Offline.** The app needs a connection (it loads the hosted site). Acceptable
  for v1; a later step could bundle an offline shell.
- The native projects (`ios/`, `android/`) are **not** in this zip — generate them
  with the `cap:add:*` commands above.
