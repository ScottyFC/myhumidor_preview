'use client';

import { signInEmail, type AuthResult } from '@/lib/auth';

/**
 * Face ID / Touch ID / fingerprint login for the native app.
 *
 * Uses @aparajita/capacitor-biometric-auth for the biometric prompt and
 * @aparajita/capacitor-secure-storage to keep the login in the device
 * Keychain/Keystore — never in our database or in plain text. Everything
 * dynamic-imports the plugins and is wrapped in try/catch, so the web build
 * works with or without them; on web (or without the hardware) these resolve to
 * "unavailable" and the UI hides.
 *
 * IMPORTANT: the plugin versions must match the app's Capacitor major version,
 * and the native projects need `npx cap sync` + an iOS NSFaceIDUsageDescription
 * for any of this to work on device.
 */
const K_EMAIL = 'mh_bio_email';
const K_PW = 'mh_bio_pw';

async function isNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch { return false; }
}

async function bioPlugin() {
  try {
    if (!(await isNative())) return null;
    return (await import('@aparajita/capacitor-biometric-auth')).BiometricAuth;
  } catch { return null; }
}

async function store() {
  try {
    if (!(await isNative())) return null;
    return (await import('@aparajita/capacitor-secure-storage')).SecureStorage;
  } catch { return null; }
}

export type BiometryInfo = { available: boolean; type: 'face' | 'fingerprint' | 'other' | null };

/** biometryType enum (aparajita): 1 touchId, 2 faceId, 3 fingerprint, 4 faceAuth, 5 iris. */
function mapType(t: number | undefined): BiometryInfo['type'] {
  if (t === 2 || t === 4) return 'face';
  if (t === 1 || t === 3) return 'fingerprint';
  return 'other';
}

export async function biometricAvailable(): Promise<BiometryInfo> {
  const BA = await bioPlugin();
  if (!BA) return { available: false, type: null };
  try {
    const info = await BA.checkBiometry();
    return { available: !!info.isAvailable, type: mapType(info.biometryType as unknown as number) };
  } catch { return { available: false, type: null }; }
}

export async function hasBiometricCredentials(): Promise<boolean> {
  const S = await store();
  if (!S) return false;
  try { return (await S.get(K_EMAIL)) != null; } catch { return false; }
}

export async function saveBiometricCredentials(email: string, password: string): Promise<boolean> {
  const S = await store();
  if (!S) return false;
  try { await S.set(K_EMAIL, email); await S.set(K_PW, password); return true; } catch { return false; }
}

export async function clearBiometricCredentials(): Promise<void> {
  const S = await store();
  if (!S) return;
  try { await S.remove(K_EMAIL); await S.remove(K_PW); } catch { /* ignore */ }
}

export async function biometricSignIn(): Promise<AuthResult> {
  const BA = await bioPlugin();
  const S = await store();
  if (!BA || !S) return { error: 'Biometric login isn’t available on this device.' };
  try {
    await BA.authenticate({
      reason: 'Sign in to MyHumidor',
      iosFallbackTitle: 'Use passcode',
      androidTitle: 'MyHumidor',
      androidSubtitle: 'Confirm it’s you',
    });
  } catch {
    return { error: 'Face ID was cancelled or failed.' };
  }
  try {
    const email = (await S.get(K_EMAIL)) as string | null;
    const password = (await S.get(K_PW)) as string | null;
    if (!email || !password) return { error: 'No saved login found. Sign in once to enable Face ID.' };
    return await signInEmail(email, password, true);
  } catch {
    return { error: 'Could not read your saved login.' };
  }
}
