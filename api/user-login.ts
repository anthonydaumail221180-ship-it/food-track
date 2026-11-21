// POST /api/user/login { email, password } -> { token, user }
import { URL_, KEY, sb, verifyPassword, genSessionToken, normalizeEmail } from '../lib/authHelpers';

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) return res.status(503).json({ error: 'not_configured' });
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const b = req.body || {};
    const email = normalizeEmail(b.email);
    const password = String(b.password || '');
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' });

    const rows = await sb(`app_users?email=eq.${encodeURIComponent(email)}&select=id,email,password_hash,first_name,last_name,phone,nickname,avatar_id,language,is_admin`);
    if (!rows.length) return res.status(401).json({ error: 'invalid_credentials' });
    const user = rows[0];
    if (!verifyPassword(password, user.password_hash)) return res.status(401).json({ error: 'invalid_credentials' });

    const token = genSessionToken();
    await sb('user_sessions', {
      method: 'POST',
      body: JSON.stringify({ user_id: user.id, token }),
    });
    // Met à jour last_login_at (fire and forget)
    sb(`app_users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ last_login_at: new Date().toISOString() }) }).catch(() => {});

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        nickname: user.nickname,
        avatarId: user.avatar_id,
        language: user.language,
        isAdmin: user.is_admin,
      },
    });
  } catch (e: any) {
    console.error(`[user-login] crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
