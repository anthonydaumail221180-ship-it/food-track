// Client API de l'auth utilisateur (vraie auth en BDD Supabase)
// Le token de session est stocké en localStorage sous 'foodtrack_session_token'.

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  nickname: string;
  avatarId: string;
  language: string;
  isAdmin: boolean;
}

const TOKEN_KEY = 'foodtrack_session_token';

export const getSessionToken = (): string | null => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

export const setSessionToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
};

const hdr = (): HeadersInit => {
  const t = getSessionToken();
  return t ? { 'Content-Type': 'application/json', 'x-session-token': t } : { 'Content-Type': 'application/json' };
};

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string };

const errorFromCode = (status: number, code?: string): string => {
  if (status === 409 && code === 'email_exists') return "Cette adresse email est déjà utilisée. Essayez de vous connecter à la place.";
  if (code === 'email_invalid') return "Adresse email invalide.";
  if (code === 'password_short') return "Le mot de passe doit faire au moins 6 caractères.";
  if (code === 'name_required') return "Prénom et nom sont obligatoires.";
  if (code === 'invalid_credentials') return "Email ou mot de passe incorrect.";
  if (code === 'invalid_code') return "Code invalide ou expiré. Demandez-en un nouveau.";
  if (code === 'bad_request') return "Formulaire incomplet.";
  return "Service momentanément indisponible. Réessayez plus tard.";
};

export const signup = async (payload: {
  email: string; password: string;
  firstName: string; lastName: string;
  phone: string; nickname?: string;
  language?: string; avatarId?: string;
}): Promise<AuthResult> => {
  try {
    const r = await fetch('/api/user-signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r.ok) {
      const e = await r.json().catch(() => ({} as any));
      return { ok: false, message: errorFromCode(r.status, e.error) };
    }
    const data = await r.json();
    setSessionToken(data.token);
    return { ok: true, user: data.user };
  } catch { return { ok: false, message: "Pas de connexion." }; }
};

export const login = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const r = await fetch('/api/user-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!r.ok) {
      const e = await r.json().catch(() => ({} as any));
      return { ok: false, message: errorFromCode(r.status, e.error) };
    }
    const data = await r.json();
    setSessionToken(data.token);
    return { ok: true, user: data.user };
  } catch { return { ok: false, message: "Pas de connexion." }; }
};

export const fetchMe = async (): Promise<AuthUser | null> => {
  const t = getSessionToken();
  if (!t) return null;
  try {
    const r = await fetch('/api/user-me', { headers: hdr() });
    if (!r.ok) {
      if (r.status === 401) setSessionToken(null);
      return null;
    }
    const data = await r.json();
    return data.user;
  } catch { return null; }
};

export const updateMe = async (patch: Partial<AuthUser>): Promise<AuthUser | null> => {
  try {
    const r = await fetch('/api/user-me', { method: 'POST', headers: hdr(), body: JSON.stringify(patch) });
    if (!r.ok) return null;
    const data = await r.json();
    return data.user;
  } catch { return null; }
};

export const logout = async (): Promise<void> => {
  try {
    await fetch('/api/user-me', { method: 'DELETE', headers: hdr() });
  } catch { /* ignore */ }
  setSessionToken(null);
};

export const forgotPassword = async (email: string): Promise<{ ok: boolean; message: string }> => {
  try {
    const r = await fetch('/api/user-forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    if (!r.ok) return { ok: false, message: "Service indisponible." };
    const data = await r.json();
    return { ok: true, message: data.hint || "Si l'email existe, un code a été envoyé." };
  } catch { return { ok: false, message: "Pas de connexion." }; }
};

export const resetPassword = async (email: string, code: string, newPassword: string): Promise<AuthResult> => {
  try {
    const r = await fetch('/api/user-reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code, newPassword }) });
    if (!r.ok) {
      const e = await r.json().catch(() => ({} as any));
      return { ok: false, message: errorFromCode(r.status, e.error) };
    }
    const data = await r.json();
    setSessionToken(data.token);
    return { ok: true, user: data.user };
  } catch { return { ok: false, message: "Pas de connexion." }; }
};
