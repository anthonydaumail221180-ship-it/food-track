// Gere l'inscription aux notifications push cote client.
// Utilise le Web Push API + notre service worker (/sw.js).
// Le token VAPID public est injecte via /api/push?action=config.

import { getSessionToken } from './userAuth';

const urlB64ToUint8Array = (b64: string): Uint8Array => {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

export const pushSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
};

export const pushPermission = (): NotificationPermission => {
  if (!pushSupported()) return 'denied';
  return Notification.permission;
};

const callPush = async (action: string, payload?: any): Promise<any> => {
  const token = getSessionToken();
  const r = await fetch(`/api/push?action=${encodeURIComponent(action)}`, {
    method: payload ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'x-session-token': token } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!r.ok) throw new Error(`push_${action}_${r.status}`);
  return r.json();
};

export const subscribeToPush = async (): Promise<{ ok: boolean; reason?: string }> => {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };

  // Demande la permission si pas encore accordee
  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return { ok: false, reason: 'denied' };
  } else if (Notification.permission === 'denied') {
    return { ok: false, reason: 'denied' };
  }

  // Enregistre le SW
  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;

  // Recupere la cle VAPID publique
  const { publicKey } = await callPush('config');
  if (!publicKey) return { ok: false, reason: 'no_vapid_key' };

  // S'abonne au push manager
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(publicKey),
    });
  }

  // Envoie au backend (authentifie)
  const raw = sub.toJSON() as any;
  await callPush('subscribe', {
    endpoint: sub.endpoint,
    p256dh: raw.keys?.p256dh,
    auth: raw.keys?.auth,
    userAgent: navigator.userAgent.slice(0, 200),
  });

  try { localStorage.setItem('letztrack_push_enabled', '1'); } catch {}
  return { ok: true };
};

export const unsubscribeFromPush = async (): Promise<void> => {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    try { await callPush('unsubscribe', { endpoint: sub.endpoint }); } catch {}
    await sub.unsubscribe();
  }
  try { localStorage.removeItem('letztrack_push_enabled'); } catch {}
};

export const isPushEnabled = (): boolean => {
  try { return localStorage.getItem('letztrack_push_enabled') === '1' && Notification.permission === 'granted'; } catch { return false; }
};

export const sendTestPush = async (): Promise<boolean> => {
  try { await callPush('test', {}); return true; } catch { return false; }
};
