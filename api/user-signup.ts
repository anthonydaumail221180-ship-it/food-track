// POST /api/user/signup { email, password, firstName, lastName, phone, nickname, language?, avatarId? }
// -> { token, user }
import { URL_, KEY, sb, hashPassword, genSessionToken, normalizeEmail, isValidEmail } from '../lib/authHelpers';

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) return res.status(503).json({ error: 'not_configured' });
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const b = req.body || {};
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

    // Vérifie l'unicité
    const existing = await sb(`app_users?email=eq.${encodeURIComponent(email)}&select=id`);
    if (existing.length) return res.status(409).json({ error: 'email_exists' });

    const [user] = await sb('app_users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password_hash: hashPassword(password),
        first_name: firstName,
        last_name: lastName,
        phone,
        nickname: nickname || firstName,
        avatar_id: avatarId,
        language,
        last_login_at: new Date().toISOString(),
      }),
    });

    // Crée une session
    const token = genSessionToken();
    await sb('user_sessions', {
      method: 'POST',
      body: JSON.stringify({ user_id: user.id, token }),
    });

    return res.status(201).json({
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
    console.error(`[user-signup] crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
