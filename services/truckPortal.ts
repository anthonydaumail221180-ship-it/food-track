// Client API du portail food truck.
// Le token est passé en query string (capability URL).

export interface TruckProfile {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  photo_url?: string | null;
  phone: string;
  instagram: string;
  facebook: string;
  website: string;
  created_at: string;
  updated_at: string;
}

export interface TruckLocation {
  id: string;
  truck_id: string;
  lat: number;
  lng: number;
  address: string;
  open_from: string;
  open_until: string | null;
  status: 'open' | 'closed';
  created_at: string;
}

export interface LiveTruck extends TruckProfile {
  menu?: string;
  price_range?: string;
  opening_hours?: string;
  schedule?: string;
  known_locations?: string;
  default_lat?: number | null;
  default_lng?: number | null;
  default_address?: string | null;
  // Detection IA auto (cron toutes les 4h)
  today_lat?: number | null;
  today_lng?: number | null;
  today_address?: string | null;
  today_source?: string | null;
  today_detected_at?: string | null;
  today_confidence?: number | null;
  today_raw_note?: string | null;
  today_is_live?: boolean | null;
  live_location: (Omit<TruckLocation, 'id' | 'truck_id' | 'status' | 'created_at'> & { last_pinged_at?: string }) | null;
}

export const sendHeartbeat = async (token: string, lat?: number, lng?: number): Promise<boolean> => {
  try {
    const body: any = {};
    if (lat !== undefined && lng !== undefined) { body.lat = lat; body.lng = lng; }
    const r = await fetch(`/api/truck-heartbeat?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return r.ok;
  } catch { return false; }
};

export type Result<T> = { ok: true; data: T } | { ok: false; message: string };

// --- Côté owner (avec token) ---

export const fetchMyTruck = async (token: string): Promise<Result<{ truck: TruckProfile; recent_locations: TruckLocation[] }>> => {
  try {
    const r = await fetch(`/api/truck?token=${encodeURIComponent(token)}`);
    if (r.status === 401) return { ok: false, message: "Lien invalide ou expiré. Demandez un nouveau lien à votre contact LëtzTrack." };
    if (!r.ok) return { ok: false, message: "Service momentanément indisponible." };
    return { ok: true, data: await r.json() };
  } catch {
    return { ok: false, message: "Pas de connexion." };
  }
};

export const updateMyTruck = async (token: string, patch: Partial<TruckProfile>): Promise<Result<{ truck: TruckProfile }>> => {
  try {
    const r = await fetch(`/api/truck?token=${encodeURIComponent(token)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (r.status === 400) {
      const e = await r.json().catch(() => ({ error: 'bad_request' }));
      const msg = e.error === 'name_too_short' ? "Le nom doit faire au moins 2 caractères." : "Vérifiez les informations saisies.";
      return { ok: false, message: msg };
    }
    if (r.status === 401) return { ok: false, message: "Lien invalide ou expiré." };
    if (!r.ok) return { ok: false, message: "Enregistrement impossible pour le moment." };
    return { ok: true, data: await r.json() };
  } catch {
    return { ok: false, message: "Pas de connexion." };
  }
};

export const setMyLocation = async (
  token: string,
  payload: { lat: number; lng: number; address: string; open_until?: string }
): Promise<Result<{ location: TruckLocation }>> => {
  try {
    const r = await fetch(`/api/truck-location?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (r.status === 400) {
      const e = await r.json().catch(() => ({ error: 'bad_request' }));
      const msg =
        e.error === 'outside_luxembourg' ? "Votre position n'est pas au Luxembourg." :
        e.error === 'address_required' ? "L'adresse est obligatoire." :
        e.error === 'open_until_too_soon' ? "Choisissez un horaire de fermeture au moins 5 minutes plus tard." :
        e.error === 'open_until_too_late' ? "Vous ne pouvez pas rester ouvert plus de 12 heures." :
        "Impossible d'enregistrer cet emplacement.";
      return { ok: false, message: msg };
    }
    if (r.status === 401) return { ok: false, message: "Lien invalide ou expiré." };
    if (!r.ok) return { ok: false, message: "Service indisponible." };
    return { ok: true, data: await r.json() };
  } catch {
    return { ok: false, message: "Pas de connexion." };
  }
};

export const closeMyLocation = async (token: string): Promise<Result<true>> => {
  try {
    const r = await fetch(`/api/truck-location?token=${encodeURIComponent(token)}`, { method: 'DELETE' });
    if (!r.ok) return { ok: false, message: "Impossible de fermer pour le moment." };
    return { ok: true, data: true };
  } catch {
    return { ok: false, message: "Pas de connexion." };
  }
};

// --- Côté public ---

export const fetchLiveTrucks = async (): Promise<LiveTruck[]> => {
  try {
    const r = await fetch('/api/trucks-live');
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
};

// --- Côté admin ---

export interface AdminTruckRow extends TruckProfile {
  owners: Array<{ id: string; truck_id: string; email: string | null; secret_token: string; portal_url: string; last_login_at: string | null; created_at: string }>;
}

export const adminListTrucks = async (token: string): Promise<AdminTruckRow[] | 'unauthorized' | 'error'> => {
  try {
    const r = await fetch('/api/admin-truck', { headers: { 'x-admin-token': token } });
    if (r.status === 401) return 'unauthorized';
    return r.ok ? await r.json() : 'error';
  } catch { return 'error'; }
};

export interface AdminStats {
  trucks_total: number;
  trucks_geocoded: number;
  trucks_live: number;
  owners_total: number;
  owners_connected_ever: number;
  users_total: number;
  users_admin: number;
  users_active_now: number;
  reports_pending: number;
  reports_approved: number;
  posts_total: number;
}
export interface AdminUserRow {
  id: string; email: string; first_name: string; nickname: string;
  is_admin: boolean; created_at: string; last_login_at: string | null;
  active_now: boolean;
}
export const adminFetchDashboard = async (token: string): Promise<{ stats: AdminStats; users: AdminUserRow[] } | 'unauthorized' | 'error'> => {
  try {
    const r = await fetch('/api/admin-truck?stats=1', { headers: { 'x-admin-token': token } });
    if (r.status === 401) return 'unauthorized';
    return r.ok ? await r.json() : 'error';
  } catch { return 'error'; }
};
export const adminSetUserRole = async (token: string, userId: string, makeAdmin: boolean): Promise<boolean> => {
  try {
    const r = await fetch(`/api/admin-truck?action=${makeAdmin ? 'promote' : 'demote'}&user_id=${encodeURIComponent(userId)}`, {
      headers: { 'x-admin-token': token },
    });
    return r.ok;
  } catch { return false; }
};

export const adminCreateTruck = async (
  token: string,
  payload: { name: string; cuisine?: string; email?: string }
): Promise<{ truck: TruckProfile; portal_url: string } | 'unauthorized' | 'error'> => {
  try {
    const r = await fetch('/api/admin-truck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(payload),
    });
    if (r.status === 401) return 'unauthorized';
    if (!r.ok) return 'error';
    return await r.json();
  } catch { return 'error'; }
};

export interface DiscoveredTruck {
  name: string;
  cuisine?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  website?: string | null;
  phone?: string | null;
  areas?: string | null;
  notes?: string | null;
  confidence?: 'high' | 'medium' | 'low';
}

export const adminDiscoverTrucks = async (
  token: string,
  query?: string
): Promise<{ trucks: DiscoveredTruck[] } | 'unauthorized' | 'error'> => {
  try {
    const r = await fetch('/api/discover-trucks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ query: query || '' }),
    });
    if (r.status === 401) return 'unauthorized';
    if (!r.ok) return 'error';
    return await r.json();
  } catch { return 'error'; }
};
