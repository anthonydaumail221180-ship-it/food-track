// Helpers d'authentification partagés : hash PBKDF2, génération de token, lecture de session.
// Pas de dépendance externe : on utilise le module crypto natif de Node.
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

export const URL_ = process.env.SUPABASE_URL;
export const KEY = process.env.SUPABASE_SERVICE_KEY;

export const sb = async (path: string, init: any = {}) => {
  const url = `${URL_}/rest/v1/${path}`;
  const r = await fetch(url, {
    ...init,
    headers: { apikey: KEY as string, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '<no body>');
    console.error(`[supabase] ${r.status} ${r.statusText} on ${url} :: ${body.slice(0, 500)}`);
    throw new Error('db');
  }
  return r.json();
};

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha256';

// Format : pbkdf2$<iterations>$<salt_base64>$<hash_base64>
export const hashPassword = (password: string): string => {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
};

export const verifyPassword = (password: string, stored: string): boolean => {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'pbkdf2') return false;
    const iter = parseInt(iterStr, 10);
    if (!iter || iter < 10_000 || iter > 10_000_000) return false;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const actual = pbkdf2Sync(password, salt, iter, expected.length, PBKDF2_DIGEST);
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
};

export const genSessionToken = (): string => {
  // 32 octets -> ~43 char base64url
  return randomBytes(32).toString('base64url');
};

export const gen6DigitCode = (): string => {
  // 000000 - 999999, zero-padded
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, '0');
};

// Récupère l'utilisateur à partir du header x-session-token.
export const authenticateUser = async (req: any): Promise<any | null> => {
  const token = String(req.headers['x-session-token'] || '').trim();
  if (!token || token.length < 32 || token.length > 128) return null;
  try {
    const nowIso = new Date().toISOString();
    const rows = await sb(`user_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${nowIso}&select=user_id`);
    if (!rows.length) return null;
    const users = await sb(`app_users?id=eq.${rows[0].user_id}&select=id,email,first_name,last_name,phone,nickname,avatar_id,language,is_admin,created_at,last_login_at`);
    return users[0] || null;
  } catch {
    return null;
  }
};

export const normalizeEmail = (e: any) => String(e || '').trim().toLowerCase();

export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length < 150;
