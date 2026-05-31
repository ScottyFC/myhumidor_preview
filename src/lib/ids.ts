/**
 * Account identifiers.
 *
 * Requirement: "the first 4 characters identify if they are a regular user or a
 * lounge, and lounge IDs must correspond with the TV-stick app."
 *
 * A raw RFC-4122 UUID is random hex — you can't make its first 4 characters
 * mean something while keeping it a valid random UUID, and in production the
 * UUID is assigned by Supabase Auth (auth.users.id), so we don't control it.
 *
 * So we keep TWO identifiers:
 *   - `uuid`      — the real account UUID (Supabase auth.users.id). Everything
 *                   in the database joins on this.
 *   - `publicId`  — a typed, human-readable ID derived from the UUID, whose
 *                   first 4 chars are the type tag. This is what shows in the UI,
 *                   provisions the TV stick, and lets the telemetry endpoint
 *                   validate "is this a lounge?" without a DB lookup.
 *
 * Format:  USER-<32 hex>   (consumer)
 *          LNGE-<32 hex>   (lounge)
 *
 * This is the Stripe model (cus_… / acct_…): a typed string key, not a bare UUID.
 */

export type AccountType = 'consumer' | 'lounge';

export const TYPE_TAG: Record<AccountType, string> = {
  consumer: 'USER',
  lounge: 'LNGE',
};

export function tagFor(type: AccountType): string {
  return TYPE_TAG[type];
}

/** Build a typed public ID from an existing UUID (e.g. Supabase auth.users.id). */
export function publicIdFromUuid(uuid: string, type: AccountType): string {
  return `${tagFor(type)}-${uuid.replace(/-/g, '')}`;
}

/** Generate a fresh uuid + typed public ID (demo / client-side use). */
export function generateAccountId(type: AccountType): { uuid: string; publicId: string } {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-xxxx-4xxx-yxxx-${Math.random().toString(16).slice(2, 14)}`;
  return { uuid, publicId: publicIdFromUuid(uuid, type) };
}

/** Read the account type back out of a public ID's first 4 characters. */
export function accountTypeFromPublicId(publicId: string): AccountType | null {
  const tag = publicId.slice(0, 4);
  if (tag === TYPE_TAG.lounge) return 'lounge';
  if (tag === TYPE_TAG.consumer) return 'consumer';
  return null;
}

export function isLoungeId(publicId: string): boolean {
  return publicId.slice(0, 4) === TYPE_TAG.lounge;
}
