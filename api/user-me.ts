// GET /api/user/me : header x-session-token -> { user }
// POST /api/user/me : header x-session-token, body { nickname?, avatarId?, language?, phone? } -> { user }
// DELETE /api/user/me : header x-session-token (= logout)
import { URL_, KEY, sb, authenticateUser } from '../lib/authHelpers';

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) return res.status(503).json({ error: 'not_configured' });

  try {
    const user = await authenticateUser(req);
    if (!user) return res.status(401).json({ error: 'not_authenticated' });

    if (req.method === 'GET') {
      return res.status(200).json({
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
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      const patch: Record<string, any> = {};
      if (b.nickname !== undefined) patch.nickname = String(b.nickname || '').trim().slice(0, 40);
      if (b.avatarId !== undefined) patch.avatar_id = String(b.avatarId || '').slice(0, 8);
      if (b.language !== undefined && ['fr','en','de','lb','pt','it','es'].includes(String(b.language))) patch.language = String(b.language);
      if (b.phone !== undefined) patch.phone = String(b.phone || '').trim().slice(0, 25);
      if (b.firstName !== undefined) patch.first_name = String(b.firstName || '').trim().slice(0, 60);
      if (b.lastName !== undefined) patch.last_name = String(b.lastName || '').trim().slice(0, 60);
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'empty' });
      const [updated] = await sb(`app_users?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      return res.status(200).json({
        user: {
          id: updated.id,
          email: updated.email,
          firstName: updated.first_name,
          lastName: updated.last_name,
          phone: updated.phone,
          nickname: updated.nickname,
          avatarId: updated.avatar_id,
          language: updated.language,
          isAdmin: updated.is_admin,
        },
      });
    }

    if (req.method === 'DELETE') {
      // Logout : supprime la session courante
      const token = String(req.headers['x-session-token'] || '').trim();
      if (token) await sb(`user_sessions?token=eq.${encodeURIComponent(token)}`, { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (e: any) {
    console.error(`[user-me] crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
