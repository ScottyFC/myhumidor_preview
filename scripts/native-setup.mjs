#!/usr/bin/env node
/**
 * native-setup.mjs — inject every iOS/Android permission MyHumidor needs into the
 * generated native projects. Capacitor does NOT add usage strings for you, so run
 * this once after `npx cap add ios` / `npx cap add android` (and it's safe to re-run).
 *
 *   node scripts/native-setup.mjs      (or: npm run cap:permissions)
 *
 * Permissions cover: cigar-band scanning (camera), the photo-library fallback,
 * Face ID sign-in, "lounges near me" location, and push notifications.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const IOS_PLIST = 'ios/App/App/Info.plist';
const ANDROID_MANIFEST = 'android/app/src/main/AndroidManifest.xml';

const IOS_KEYS = {
  NSCameraUsageDescription: 'MyHumidor uses the camera to scan cigar bands and identify cigars.',
  NSPhotoLibraryUsageDescription: 'MyHumidor lets you pick a cigar photo from your library to scan or share.',
  NSPhotoLibraryAddUsageDescription: 'MyHumidor can save the story image you create to your photos.',
  NSFaceIDUsageDescription: 'MyHumidor uses Face ID to sign you in securely.',
  NSLocationWhenInUseUsageDescription: 'MyHumidor uses your location to find cigar lounges near you.',
};

const ANDROID_PERMS = [
  'android.permission.CAMERA',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.USE_BIOMETRIC',
];
const ANDROID_FEATURES = [
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
];

function patchIOS() {
  if (!existsSync(IOS_PLIST)) { console.log(`• iOS: ${IOS_PLIST} not found — run \`npx cap add ios\` first. Skipping.`); return; }
  let plist = readFileSync(IOS_PLIST, 'utf8');
  let added = 0;
  for (const [key, desc] of Object.entries(IOS_KEYS)) {
    if (plist.includes(`<key>${key}</key>`)) continue;
    const entry = `\t<key>${key}</key>\n\t<string>${desc}</string>\n`;
    // insert before the final </dict>
    const idx = plist.lastIndexOf('</dict>');
    plist = plist.slice(0, idx) + entry + plist.slice(idx);
    added++;
  }
  if (added) { writeFileSync(IOS_PLIST, plist); console.log(`✓ iOS: added ${added} usage string(s) to Info.plist.`); }
  else console.log('• iOS: all usage strings already present.');
  console.log('  ↳ Push notifications: enable the "Push Notifications" + "Background Modes › Remote notifications" capabilities in Xcode (Signing & Capabilities).');
}

function patchAndroid() {
  if (!existsSync(ANDROID_MANIFEST)) { console.log(`• Android: ${ANDROID_MANIFEST} not found — run \`npx cap add android\` first. Skipping.`); return; }
  let xml = readFileSync(ANDROID_MANIFEST, 'utf8');
  const lines = [];
  for (const p of ANDROID_PERMS) if (!xml.includes(`android:name="${p}"`)) lines.push(`    <uses-permission android:name="${p}" />`);
  for (const f of ANDROID_FEATURES) if (!xml.includes(f)) lines.push(`    ${f}`);
  if (!lines.length) { console.log('• Android: all permissions already present.'); return; }
  // insert right after the opening <manifest ...> tag
  const m = xml.match(/<manifest[^>]*>/);
  if (!m) { console.log('• Android: could not locate <manifest> tag. Skipping.'); return; }
  const at = m.index + m[0].length;
  xml = xml.slice(0, at) + '\n' + lines.join('\n') + xml.slice(at);
  writeFileSync(ANDROID_MANIFEST, xml);
  console.log(`✓ Android: added ${lines.length} permission/feature line(s) to AndroidManifest.xml.`);
}

console.log('MyHumidor native setup — patching permissions…');
patchIOS();
patchAndroid();
console.log('Done. Next: `npx cap sync`, then build/run from Xcode / Android Studio.');
