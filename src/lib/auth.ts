import { createHmac } from 'crypto';

const SECRET = process.env.ADMIN_JWT_SECRET || 'hanpyo-2026-default-secret';

function sign(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verify(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createAdminToken(): string {
  return sign({ role: 'admin', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 8 * 3600 });
}

export function verifyAdminToken(token: string): boolean {
  const payload = verify(token);
  return payload?.role === 'admin';
}
