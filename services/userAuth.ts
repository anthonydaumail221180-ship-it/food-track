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

// Toutes les actions user passent par l'endpoint unifié /api/user?action=XXX
const callUser = async (action: string, payload: any, method: 'POST' | 'GET' | 'DELETE' = 'POST') => {
  const url = `/api/user?action=${encodeURIComponent(action)}`;
  const init: RequestInit = { method, headers: hdr() };
  if (method !== 'GET' && method !== 'DELETE') init.body = JSON.stringify(payload);
  return fetch(url, init);
};

export const signup = async (payload: {
  email: string; password: string;
  firstName: string; lastName: string;
  phone: string; nickname?: string;
  language?: string; avatarId?: string;
}): Promise<AuthResult> => {
  try {
    const r = await callUser('signup', payload);
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
    const r = await callUser('login', { email, password });
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
    const r = await fetch('/api/user?action=me', { headers: hdr() });
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
    const r = await callUser('update', patch);
    if (!r.ok) return null;
    const data = await r.json();
    return data.user;
  } catch { return null; }
};

export const logout = async (): Promise<void> => {
  try {
    await fetch('/api/user', { method: 'DELETE', headers: hdr() });
  } catch { /* ignore */ }
  setSessionToken(null);
};

export const forgotPassword = async (email: string): Promise<{ ok: boolean; message: string }> => {
  try {
    const r = await callUser('forgot', { email });
    if (!r.ok) return { ok: false, message: "Service indisponible." };
    const data = await r.json();
    return { ok: true, message: data.hint || "Si l'email existe, un code a été envoyé." };
  } catch { return { ok: false, message: "Pas de connexion." }; }
};

// --- Check-ins (Grub) synchronisés en BDD ---
export interface RemoteCheckin {
  id: string;
  truck_id: string;
  truck_name: string;
  item_name: string;
  tagged_friend_name?: string | null;
  tagged_friend_phone?: string | null;
  created_at: string;
}
export const fetchCheckins = async (): Promise<RemoteCheckin[]> => {
  if (!getSessionToken()) return [];
  try {
    const r = await fetch('/api/user?action=checkin_list', { headers: hdr() });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d.checkins) ? d.checkins : [];
  } catch { return []; }
};
export const addCheckinRemote = async (payload: {
  truck_id: string; truck_name: string; item_name: string;
  tagged_friend_name?: string; tagged_friend_phone?: string;
}): Promise<RemoteCheckin | null> => {
  if (!getSessionToken()) return null;
  try {
    const r = await callUser('checkin_add', payload);
    if (!r.ok) return null;
    const d = await r.json();
    return d.checkin || null;
  } catch { return null; }
};

// --- Favoris synchronisés en BDD (sync entre appareils) ---
export const fetchFavorites = async (): Promise<string[]> => {
  if (!getSessionToken()) return [];
  try {
    const r = await fetch('/api/user?action=fav_list', { headers: hdr() });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d.favorites) ? d.favorites : [];
  } catch { return []; }
};
export const addFavoriteRemote = async (truckId: string): Promise<void> => {
  if (!getSessionToken()) return;
  try { await callUser('fav_add', { truck_id: truckId }); } catch { /* ignore */ }
};
export const removeFavoriteRemote = async (truckId: string): Promise<void> => {
  if (!getSessionToken()) return;
  try { await callUser('fav_remove', { truck_id: truckId }); } catch { /* ignore */ }
};

export const resetPassword = async (email: string, code: string, newPassword: string): Promise<AuthResult> => {
  try {
    const r = await callUser('reset', { email, code, newPassword });
    if (!r.ok) {
      const e = await r.json().catch(() => ({} as any));
      return { ok: false, message: errorFromCode(r.status, e.error) };
    }
    const data = await r.json();
    setSessionToken(data.token);
    return { ok: true, user: data.user };
  } catch { return { ok: false, message: "Pas de connexion." }; }
};
