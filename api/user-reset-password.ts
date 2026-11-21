// POST /api/user/reset-password { email, code, newPassword } -> { token, user }
// Si tout OK : marque le code comme utilisé, change le mdp, crée une nouvelle session.
import { URL_, KEY, sb, hashPassword, genSessionToken, normalizeEmail } from '../lib/authHelpers';

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) return res.status(503).json({ error: 'not_configured' });
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const b = req.body || {};
    const email = normalizeEmail(b.email);
    const code = String(b.code || '').trim();
    const newPassword = String(b.newPassword || '');
    if (!email || !/^\d{6}$/.test(code) || newPassword.length < 6) return res.status(400).json({ error: 'bad_request' });

    const users = await sb(`app_users?email=eq.${encodeURIComponent(email)}&select=id,email,first_name,last_name,phone,nickname,avatar_id,language,is_admin`);
    if (!users.length) return res.status(400).json({ error: 'invalid_code' });
    const user = users[0];

    const nowIso = new Date().toISOString();
    const resets = await sb(`password_resets?user_id=eq.${user.id}&code=eq.${code}&used=eq.false&expires_at=gt.${nowIso}&select=id&order=created_at.desc&limit=1`);
    if (!resets.length) return res.status(400).json({ error: 'invalid_code' });

    // Marque comme utilisé
    await sb(`password_resets?id=eq.${resets[0].id}`, {
      method: 'PATCH',
      body: JSON.stringify({ used: true }),
    });

    // Change le mot de passe
    await sb(`app_users?id=eq.${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ password_hash: hashPassword(newPassword) }),
    });

    // Invalide toutes les sessions existantes (par sécurité)
    await sb(`user_sessions?user_id=eq.${user.id}`, { method: 'DELETE' });

    // Crée une nouvelle session
    const token = genSessionToken();
    await sb('user_sessions', { method: 'POST', body: JSON.stringify({ user_id: user.id, token }) });

    return res.status(200).json({
      token,
      user: {
        id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name,
        phone: user.phone, nickname: user.nickname, avatarId: user.avatar_id,
        language: user.language, isAdmin: user.is_admin,
      },
    });
  } catch (e: any) {
    console.error(`[reset-password] crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
