import type { MemberVerification } from './types';

export const VERIFICATION_TTL_MS = 15 * 60 * 1000;

const KEY_VERIFICATION = 'member_verification';
const KEY_VERIFIED_NAME = 'verified_name';
const KEY_VERIFIED_AT = 'member_verified_at';

export function saveMemberVerification(verification: MemberVerification, name?: string) {
  localStorage.setItem(KEY_VERIFICATION, JSON.stringify(verification));
  if (name) localStorage.setItem(KEY_VERIFIED_NAME, name);
  localStorage.setItem(KEY_VERIFIED_AT, String(Date.now()));
}

export function clearMemberVerification() {
  localStorage.removeItem(KEY_VERIFICATION);
  localStorage.removeItem(KEY_VERIFIED_NAME);
  localStorage.removeItem(KEY_VERIFIED_AT);
}

export function loadMemberVerification():
  | { verification: MemberVerification; name?: string }
  | null {
  const saved = localStorage.getItem(KEY_VERIFICATION);
  if (!saved) return null;

  const at = Number(localStorage.getItem(KEY_VERIFIED_AT));
  if (!at || Date.now() - at > VERIFICATION_TTL_MS) {
    clearMemberVerification();
    return null;
  }

  try {
    const verification = JSON.parse(saved) as MemberVerification;
    const name = localStorage.getItem(KEY_VERIFIED_NAME) || undefined;
    return { verification, name };
  } catch {
    clearMemberVerification();
    return null;
  }
}
