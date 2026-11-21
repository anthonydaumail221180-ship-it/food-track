// Endpoint utilisateur unifié (auth, profil, mot de passe oublié).
// Routage via query `action` pour tenir dans la limite de fonctions Vercel Hobby (12).
//   POST /api/user?action=signup          { email, password, firstName, lastName, phone, nickname, language?, avatarId? }
//   POST /api/user?action=login           { email, password }
//   GET  /api/user?action=me              x-session-token header
//   POST /api/user?action=update          x-session-token header, { nickname?, avatarId?, language?, phone?, firstName?, lastName? }
//   DELETE /api/user                      x-session-token header (= logout)
//   POST /api/user?action=forgot          { email }
//   POST /api/user?action=reset           { email, code, newPassword }
// Inline des helpers (Vercel ne bundle pas toujours /lib dans les functions)
import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

const sb = async (path: string, init: any = {}) => {
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

const hashPassword = (password: string): string => {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
};

const verifyPassword = (password: string, stored: string): boolean => {
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
  } catch { return false; }
};

const genSessionToken = (): string => randomBytes(32).toString('base64url');
const gen6DigitCode = (): string => String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');

const authenticateUser = async (req: any): Promise<any | null> => {
  const token = String(req.headers['x-session-token'] || '').trim();
  if (!token || token.length < 32 || token.length > 128) return null;
  try {
    const nowIso = new Date().toISOString();
    const rows = await sb(`user_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${nowIso}&select=user_id`);
    if (!rows.length) return null;
    const users = await sb(`app_users?id=eq.${rows[0].user_id}&select=id,email,first_name,last_name,phone,nickname,avatar_id,language,is_admin,created_at,last_login_at`);
    return users[0] || null;
  } catch { return null; }
};

const normalizeEmail = (e: any) => String(e || '').trim().toLowerCase();
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length < 150;

const userToJson = (u: any) => ({
  id: u.id,
  email: u.email,
  firstName: u.first_name,
  lastName: u.last_name,
  phone: u.phone,
  nickname: u.nickname,
  avatarId: u.avatar_id,
  language: u.language,
  isAdmin: u.is_admin,
});

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) return res.status(503).json({ error: 'not_configured' });
  const action = String((req.query || {}).action || '').trim().toLowerCase();

  try {
    // --- DELETE : logout (pas d'action requise) ---
    if (req.method === 'DELETE') {
      const token = String(req.headers['x-session-token'] || '').trim();
      if (token) await sb(`user_sessions?token=eq.${encodeURIComponent(token)}`, { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    // --- GET me ---
    if (req.method === 'GET' && (action === 'me' || action === '')) {
      const user = await authenticateUser(req);
      if (!user) return res.status(401).json({ error: 'not_authenticated' });
      return res.status(200).json({ user: userToJson(user) });
    }

    if (req.method !== 'POST') return res.status(405).end();
    const b = req.body || {};

    // --- POST signup ---
    if (action === 'signup') {
      const email = normalizeEmail(b.email);
      const password = String(b.password || '');
      const firstName = String(b.firstName || '').trim().slice(0, 60);
      const lastName = String(b.lastName || '').trim().slice(0, 60);
      const phone = String(b.phone || '').trim().slice(0, 25);
      const nickname = String(b.nickname || '').trim().slice(0, 40);
      const language = ['fr','en','de','lb','pt','it','es'].includes(String(b.language)) ? String(b.language) : 'fr';
      const avatarId = String(b.avatarId || '😋').slice(0, 8);

      if (!isValidEmail(email)) return res.status(400).json({ error: 'email_invalid' });
      if (password.length < 6 || password.length > 200) return res.status(400).json({ error: 'password_short' });
      if (firstName.length < 1 || lastName.length < 1) return res.status(400).json({ error: 'name_required' });

      const existing = await sb(`app_users?email=eq.${encodeURIComponent(email)}&select=id`);
      if (existing.length) return res.status(409).json({ error: 'email_exists' });

      const [user] = await sb('app_users', {
        method: 'POST',
        body: JSON.stringify({
          email, password_hash: hashPassword(password),
          first_name: firstName, last_name: lastName, phone,
          nickname: nickname || firstName, avatar_id: avatarId, language,
          last_login_at: new Date().toISOString(),
        }),
      });
      const token = genSessionToken();
      await sb('user_sessions', { method: 'POST', body: JSON.stringify({ user_id: user.id, token }) });
      return res.status(201).json({ token, user: userToJson(user) });
    }

    // --- POST login ---
    if (action === 'login') {
      const email = normalizeEmail(b.email);
      const password = String(b.password || '');
      if (!email || !password) return res.status(400).json({ error: 'missing_fields' });
      const rows = await sb(`app_users?email=eq.${encodeURIComponent(email)}&select=id,email,password_hash,first_name,last_name,phone,nickname,avatar_id,language,is_admin`);
      if (!rows.length) return res.status(401).json({ error: 'invalid_credentials' });
      const user = rows[0];
      if (!verifyPassword(password, user.password_hash)) return res.status(401).json({ error: 'invalid_credentials' });
      const token = genSessionToken();
      await sb('user_sessions', { method: 'POST', body: JSON.stringify({ user_id: user.id, token }) });
      sb(`app_users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ last_login_at: new Date().toISOString() }) }).catch(() => {});
      return res.status(200).json({ token, user: userToJson(user) });
    }

    // --- POST update (profil) ---
    if (action === 'update') {
      const user = await authenticateUser(req);
      if (!user) return res.status(401).json({ error: 'not_authenticated' });
      const patch: Record<string, any> = {};
      if (b.nickname !== undefined) patch.nickname = String(b.nickname || '').trim().slice(0, 40);
      if (b.avatarId !== undefined) patch.avatar_id = String(b.avatarId || '').slice(0, 8);
      if (b.language !== undefined && ['fr','en','de','lb','pt','it','es'].includes(String(b.language))) patch.language = String(b.language);
      if (b.phone !== undefined) patch.phone = String(b.phone || '').trim().slice(0, 25);
      if (b.firstName !== undefined) patch.first_name = String(b.firstName || '').trim().slice(0, 60);
      if (b.lastName !== undefined) patch.last_name = String(b.lastName || '').trim().slice(0, 60);
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'empty' });
      const [updated] = await sb(`app_users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      return res.status(200).json({ user: userToJson(updated) });
    }

    // --- POST forgot ---
    if (action === 'forgot') {
      const email = normalizeEmail(b.email);
      if (!email) return res.status(400).json({ error: 'email_required' });
      const rows = await sb(`app_users?email=eq.${encodeURIComponent(email)}&select=id,email,first_name`);
      if (!rows.length) {
        console.log(`[forgot-password] inexistant : ${email}`);
        return res.status(200).json({ ok: true, hint: 'Si l\'email existe, un code sera envoyé.' });
      }
      const u = rows[0];
      const code = gen6DigitCode();
      await sb(`password_resets?user_id=eq.${u.id}&used=eq.false`, { method: 'PATCH', body: JSON.stringify({ used: true }) });
      await sb('password_resets', { method: 'POST', body: JSON.stringify({ user_id: u.id, code }) });
      console.log(`[FORGOT-PASSWORD] ${u.email} (${u.first_name}) - Code: ${code} - expires in 15 min`);
      return res.status(200).json({ ok: true, hint: 'Si l\'email existe, un code a été envoyé (consultez vos emails, et si rien dans 1 min, contactez l\'admin).' });
    }

    // --- POST reset ---
    if (action === 'reset') {
      const email = normalizeEmail(b.email);
      const code = String(b.code || '').trim();
      const newPassword = String(b.newPassword || '');
      if (!email || !/^\d{6}$/.test(code) || newPassword.length < 6) return res.status(400).json({ error: 'bad_request' });
      const users = await sb(`app_users?email=eq.${encodeURIComponent(email)}&select=id,email,first_name,last_name,phone,nickname,avatar_id,language,is_admin`);
      if (!users.length) return res.status(400).json({ error: 'invalid_code' });
      const u = users[0];
      const nowIso = new Date().toISOString();
      const resets = await sb(`password_resets?user_id=eq.${u.id}&code=eq.${code}&used=eq.false&expires_at=gt.${nowIso}&select=id&order=created_at.desc&limit=1`);
      if (!resets.length) return res.status(400).json({ error: 'invalid_code' });
      await sb(`password_resets?id=eq.${resets[0].id}`, { method: 'PATCH', body: JSON.stringify({ used: true }) });
      await sb(`app_users?id=eq.${u.id}`, { method: 'PATCH', body: JSON.stringify({ password_hash: hashPassword(newPassword) }) });
      await sb(`user_sessions?user_id=eq.${u.id}`, { method: 'DELETE' });
      const token = genSessionToken();
      await sb('user_sessions', { method: 'POST', body: JSON.stringify({ user_id: u.id, token }) });
      return res.status(200).json({ token, user: userToJson(u) });
    }

    return res.status(400).json({ error: 'unknown_action' });
  } catch (e: any) {
    console.error(`[user ${action}] crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
