// POST /api/user/forgot-password { email } -> { ok: true }
// Génère un code à 6 chiffres valable 15 min, enregistré en BDD.
// Sans provider email configuré : le code est LOGGÉ dans Vercel logs (visible par l'admin).
// L'admin le transmet manuellement à l'utilisateur (SMS/WhatsApp) pour cette version MVP.
// Future : brancher Resend ou autre pour envoyer par email automatiquement.
import { URL_, KEY, sb, gen6DigitCode, normalizeEmail } from '../lib/authHelpers';

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) return res.status(503).json({ error: 'not_configured' });
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const email = normalizeEmail((req.body || {}).email);
    if (!email) return res.status(400).json({ error: 'email_required' });

    // On renvoie TOUJOURS ok (anti-enumeration), même si l'email n'existe pas
    const rows = await sb(`app_users?email=eq.${encodeURIComponent(email)}&select=id,email,first_name`);
    if (!rows.length) {
      console.log(`[forgot-password] inexistant : ${email}`);
      return res.status(200).json({ ok: true, hint: 'Si l\'email existe, un code sera envoyé.' });
    }

    const user = rows[0];
    const code = gen6DigitCode();

    // Invalide les anciens codes non utilisés
    await sb(`password_resets?user_id=eq.${user.id}&used=eq.false`, {
      method: 'PATCH',
      body: JSON.stringify({ used: true }),
    });

    await sb('password_resets', {
      method: 'POST',
      body: JSON.stringify({ user_id: user.id, code }),
    });

    // IMPORTANT : code visible dans les logs Vercel (en l'absence de provider email)
    console.log(`[FORGOT-PASSWORD] User ${user.email} (${user.first_name}) - Code: ${code} - expires in 15 min`);

    return res.status(200).json({ ok: true, hint: 'Si l\'email existe, un code a été envoyé (consultez vos emails, et si rien dans 1 min, contactez l\'admin).' });
  } catch (e: any) {
    console.error(`[forgot-password] crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
