'use client';

/**
 * Crowd-sourced corrections to cigar/lounge data. Stored locally for the demo;
 * in production each is a row in `change_requests` (target_type, target_id,
 * message, status) for an admin to review.
 */

export interface ChangeRequest {
  id: string;
  targetType: 'cigar' | 'lounge';
  targetId: string;
  targetName: string;
  message: string;
  createdAt: string;
}

const KEY = 'myhumidor:change-requests';

export function addChangeRequest(cr: Omit<ChangeRequest, 'id' | 'createdAt'>): ChangeRequest {
  const rec: ChangeRequest = { ...cr, id: `cr_${Date.now()}`, createdAt: new Date().toISOString() };
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    localStorage.setItem(KEY, JSON.stringify([rec, ...all]));
  } catch {
    /* ignore */
  }
  return rec;
}

export function getChangeRequests(): ChangeRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
