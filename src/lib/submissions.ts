'use client';

/**
 * User-submitted cigars. Persisted locally for the demo; in production each
 * submission is a row in `cigar_submissions` (status pending → approved/rejected)
 * and the photo is uploaded to Supabase Storage with only the URL stored.
 */

export interface Submission {
  id: string;
  brand: string;
  name: string;
  country: string;
  size: string;
  price: number | null;
  photoDataUrl?: string; // demo: data URL preview. Production: Storage URL.
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const KEY = 'myhumidor:submissions';

function read(): Submission[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function getSubmissions(): Submission[] {
  return read();
}

export function addSubmission(s: Omit<Submission, 'id' | 'status' | 'createdAt'>): Submission {
  const sub: Submission = {
    ...s,
    id: `sub_${Date.now()}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify([sub, ...read()]));
  } catch {
    /* ignore */
  }
  return sub;
}

const EVENT = 'myhumidor:submissions-change';

export function setSubmissionStatus(id: string, status: 'approved' | 'rejected') {
  try {
    const next = read().map((s) => (s.id === id ? { ...s, status } : s));
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function onSubmissionsChange(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
