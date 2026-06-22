'use client';

import { signInEmail, type AuthResult } from '@/lib/auth';

/**
 * Face ID / Touch ID / fingerprint login for the native app, via the
 * `capacitor-native-biometric` plugin. Credentials are stored in the device
 * Keychain/Keystore by the plugin — never in our database or in plain text.
 *
 * Everything dynamically imports the plugin and is wrapped in try/catch, so the
 * web build works whether or not the native plugin is installed. On web (or if
 * the plugin/hardware is absent) these resolve to "unavailable" and the UI hides.
 */
const SERVER = 'myhumidor.shop';

async function isNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch { return false; }
}

async function plugin(): Promise<typeof import('capacitor-native-biometric').NativeBiometric | null> {
  try {
    if (!(await isNative())) return null;
    const mod = await import('capacitor-native-biometric');
    return mod.NativeBiometric;
  } catch { return null; }
}

export type BiometryInfo = { available: boolean; type: 'face' | 'fingerprint' | 'other' | null };

/** Is biometric hardware available on this device? */
export async function biometricAvailable(): Promise<BiometryInfo> {
  const NB = await plugin();
  if (!NB) return { available: false, type: null };
  try {
    const res = await NB.isAvailable();
    // biometryType: 1 = TouchID, 2 = FaceID (iOS); Android reports fingerprint/face.
    const t = res.biometryType;
    const type = t === 2 ? 'face' : t === 1 ? 'fingerprint' : 'other';
    return { available: !!res.isAvailable, type };
  } catch { return { available: false, type: null }; }
}

/** Have we already stored credentials for biometric sign-in? */
export async function hasBiometricCredentials(): Promise<boolean> {
  const NB = await plugin();
  if (!NB) return false;
  try {
    const c = await NB.getCredentials({ server: SERVER });
    return !!c?.username;
  } catch { return false; }
}

/** Store credentials in the Keychain after a successful password login. */
export async function saveBiometricCredentials(email: string, password: string): Promise<boolean> {
  const NB = await plugin();
  if (!NB) return false;
  try {
    await NB.setCredentials({ username: email, password, server: SERVER });
    return true;
  } catch { return false; }
}

export async function clearBiometricCredentials(): Promise<void> {
  const NB = await plugin();
  if (!NB) return;
  try { await NB.deleteCredentials({ server: SERVER }); } catch { /* ignore */ }
}

/** Verify identity with Face ID, then sign in with the stored credentials. */
export async function biometricSignIn(): Promise<AuthResult & { ok?: boolean }> {
  const NB = await plugin();
  if (!NB) return { error: 'Biometric login isn’t available on this device.' } as AuthResult;
  try {
    await NB.verifyIdentity({ reason: 'Sign in to MyHumidor', title: 'MyHumidor', subtitle: 'Confirm it’s you' });
    const c = await NB.getCredentials({ server: SERVER });
    if (!c?.username || !c?.password) return { error: 'No saved login found. Sign in once to enable Face ID.' } as AuthResult;
    return await signInEmail(c.username, c.password, true);
  } catch {
    return { error: 'Face ID was cancelled or failed.' } as AuthResult;
  }
}
