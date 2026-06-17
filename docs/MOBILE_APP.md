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

> Run these one line at a time — and do **not** paste the `#` comments, because
> zsh (the macOS default shell) does not treat `#` as a comment when typed
> interactively and will pass it to the command.

```bash
npm install
```
```bash
npx cap --version
```
(should print `8.4.0`; if not, `npm install` didn't finish)

```bash
npm run cap:add:ios
```
```bash
npm run cap:add:android
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

## Troubleshooting

**`npm error could not determine executable to run`** — this means the Capacitor
CLI (`cap`) isn't installed yet. The `cap` binary only exists after dependencies
are installed. Run `npm install` **first**, then the `cap` commands:

```bash
cd myhumidor
npm install          # installs @capacitor/cli → node_modules/.bin/cap
npm run cap:add:ios  # now works (macOS only)
```
Don't run a bare `npx cap …` before `npm install` — with no local CLI, npx can't
resolve a package called `cap` and prints exactly that error.

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

## Native UI (app shell vs website)

The app must not look like a website, so inside the Capacitor shell we swap the
web chrome for native chrome — **only** when running in the app (`<html>` gets a
`.native-app` class from `NativeShell`); the browser site is unchanged.

- The website **top nav and footer are hidden** in the app (`.web-chrome`).
- A slim **native top bar** (`MobileTopBar`) shows the wordmark, a contextual
  back chevron on detail pages, and the notification bell.
- A **bottom tab bar** (`MobileTabBar`) is the primary navigation: Home, Search,
  Humidor (or Inventory for lounges), Lounges, Profile — with active states.
- Safe-area insets (notch / home indicator), no tap-highlight flash, no
  rubber-band overscroll — see the `.native-app` rules in `globals.css`.

**Because the app loads the hosted site, this UI ships by deploying to Vercel —
no native rebuild needed.** Deploy, and the already-installed apps pick up the
new chrome on next launch. Only re-run `cap sync` / rebuild when native config,
icons, or plugins change.

## Native home screen (app launcher layout)

Inside the app, the home tab now uses an app-style launcher instead of the
marketing site (`NativeHome`, shown only under `.native-app`; the web home is
untouched and hidden on native via `.web-home`). Layout, in MyHumidor branding
(dark ink + gold ember, Fraunces display):
- a tappable **search bar** → /search,
- a **2×4 quick-action tile grid** (Top Rated, For You, Lounges, Map, Add Cigar,
  Concierge, Aficionados, My Humidor),
- a dismissible **promo banner** (gold gradient) → /submit,
- **Trending now** with quick filter chips + a featured-cigar rail.

Ships via Vercel deploy (the apps load the hosted site); no native rebuild.

## Tab bar + top bar + startup login

- **Bottom tab bar** rebuilt as 5 evenly-spaced columns (CSS grid): Home · Search
  · **Cigars** (→ Top) · Humidor (Inventory for retailers) · Lounges. Labels no
  longer run together.
- **Profile moved to the top-left** of the native top bar (avatar button → /profile);
  the notification bell stays top-right, back chevron on detail pages.
- **Startup login gate** (`NativeAuthGate`, native-only): inside the app, users
  must sign in or create an account before using it — a full-screen welcome over
  everything until a session resolves. The /register + legal pages stay reachable
  so they can actually authenticate. The website remains open (no gate).

## Website — image copy deterrent
Cigar and lounge pages mount `ProtectMedia`, which blocks right-click/save,
"copy image address", and drag-to-save on images (and disables image selection).
Best-effort only — it stops casual copying, not a determined user with dev tools.
