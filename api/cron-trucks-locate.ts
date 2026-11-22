// Cron Vercel : détecte automatiquement l'emplacement du jour des food trucks
// en scrappant Instagram/Facebook via Gemini (Google Search grounding + URL context).
// Déclenché par vercel.json toutes les 4h, ou manuellement avec Authorization: Bearer ${CRON_SECRET}.
//
// Flow :
//   1. récupère tous les trucks avec instagram OU facebook renseigné
//   2. pour chacun, prompt Gemini avec le nom + handles IG/FB + date du jour
//   3. Gemini utilise Google Search pour trouver le post du jour et extraire l'adresse
//   4. on parse la réponse JSON { address, lat, lng, confidence, raw_note, is_live }
//   5. UPDATE trucks SET today_lat/lng/address/source/detected_at/confidence/raw_note/is_live

import { GoogleGenAI } from '@google/genai';

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const sb = async (path: string, init: any = {}) => {
  const url = `${URL_}/rest/v1/${path}`;
  const r = await fetch(url, {
    ...init,
    headers: { apikey: KEY as string, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`sb ${r.status} ${await r.text().catch(() => '')}`);
  if (r.status === 204) return [];
  const text = await r.text();
  if (!text) return [];
  return JSON.parse(text);
};

const todayISODate = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

const todayFrLong = () => {
  const d = new Date();
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const detectOneTruck = async (ai: GoogleGenAI, truck: any): Promise<any> => {
  const name = truck.name;
  const ig = truck.instagram ? `Instagram: ${truck.instagram}` : '';
  const fb = truck.facebook ? `Facebook: ${truck.facebook}` : '';
  const date = todayFrLong();
  const prompt = `Tu es un agent qui determine l'emplacement du jour d'un food truck au Luxembourg.

Food truck : ${name} (cuisine : ${truck.cuisine || 'inconnu'})
${ig}
${fb}
Lieux habituels : ${truck.known_locations || '(inconnus)'}
Planning hebdo : ${truck.schedule || '(inconnu)'}

Date du jour : ${date}

TACHE : cherche sur Google les derniers posts Instagram / Facebook de ce food truck. Si un post recent (aujourd'hui ou hier) annonce leur emplacement du jour (ville, rue, place, parking, evenement), extrais l'adresse la plus precise possible au Luxembourg.

REPONDS UNIQUEMENT EN JSON (pas de markdown, pas de texte autour), avec cette forme exacte :
{
  "is_live": true | false,
  "address": "adresse complete ou lieu précis, ou null",
  "city": "ville au Luxembourg ou null",
  "confidence": 0-100,
  "source_url": "URL du post trouve ou null",
  "raw_note": "resume court de ce que tu as trouve (max 200 chars, en francais)"
}

Regles :
- is_live=true SEULEMENT si tu as trouve une annonce explicite pour aujourd'hui (${date}) ou hier soir pour aujourd'hui
- confidence <40 = pas sur, 40-70 = probable, 70+ = quasi certain
- address : sois precis (nom de la rue + ville, ou nom d'une place/parking connu)
- si rien trouve : is_live=false, address=null, confidence=0, raw_note="pas de post recent"`;

  try {
    const r = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });
    const text = r.text || '';
    // On extrait le JSON (parfois Gemini renvoie du texte autour malgré l'instruction)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('no_json_in_response');
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (e: any) {
    console.error(`[detect] ${name} : ${e?.message || e}`);
    return null;
  }
};

// Geocoding simple : utilise Nominatim (OpenStreetMap) pour l'adresse texte -> lat/lng.
// Nominatim est gratuit mais rate-limite a 1 req/s. On espace les appels dans la boucle.
const geocode = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', Luxembourg')}&format=json&limit=1`;
    const r = await fetch(url, { headers: { 'User-Agent': 'LetzTrack/1.0' } });
    if (!r.ok) return null;
    const j = await r.json();
    if (!Array.isArray(j) || j.length === 0) return null;
    const lat = parseFloat(j[0].lat);
    const lng = parseFloat(j[0].lon);
    if (isNaN(lat) || isNaN(lng)) return null;
    // Sanity : lat Luxembourg entre 49.4 et 50.2, lng entre 5.7 et 6.5
    if (lat < 49.3 || lat > 50.3 || lng < 5.5 || lng > 6.6) return null;
    return { lat, lng };
  } catch { return null; }
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY || !GEMINI_KEY) {
    return res.status(503).json({ error: 'not_configured', missing: { url: !URL_, key: !KEY, gemini: !GEMINI_KEY } });
  }
  // Auth : soit le header vercel-cron (automatique), soit Authorization: Bearer <CRON_SECRET>
  const isCron = req.headers['x-vercel-cron'] === '1';
  const auth = String(req.headers['authorization'] || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!isCron && (!CRON_SECRET || token !== CRON_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Un seul truck a la fois via query ?truck_id=xxx (pour test manuel ou admin UI)
  const singleTruckId = String((req.query && req.query.truck_id) || '').trim();
  // Limite par batch (Vercel Hobby 60s cap -> on tourne 3x/jour, batch de ~12 trucks suffit)
  const batchLimit = Math.max(1, Math.min(50, parseInt(String((req.query && req.query.limit) || '12'), 10) || 12));
  // Concurrence Gemini (5 en parallele tient dans 60s)
  const concurrency = 5;

  const runId = `run_${Date.now()}`;
  const startedAt = new Date().toISOString();
  console.log(`[cron-locate] ${runId} starting at ${startedAt} (single=${singleTruckId || 'no'})`);

  let runRow: any = null;
  try {
    const [r] = await sb('truck_detection_runs', {
      method: 'POST',
      body: JSON.stringify({ started_at: startedAt, triggered_by: isCron ? 'vercel-cron' : (singleTruckId ? 'admin-manual' : 'manual') }),
    });
    runRow = r;
  } catch (e: any) {
    console.error('[cron-locate] cannot create run row:', e?.message);
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

  // Trucks ciblés : soit un seul, soit les plus anciens d'abord (oldest today_detected_at first) avec IG ou FB
  let trucksQuery: string;
  if (singleTruckId) {
    trucksQuery = `trucks?id=eq.${encodeURIComponent(singleTruckId)}&select=id,name,cuisine,instagram,facebook,schedule,known_locations,default_lat,default_lng,today_detected_at`;
  } else {
    trucksQuery = `trucks?or=(instagram.not.is.null,facebook.not.is.null)&order=today_detected_at.asc.nullsfirst&limit=${batchLimit}&select=id,name,cuisine,instagram,facebook,schedule,known_locations,default_lat,default_lng,today_detected_at`;
  }

  let trucks: any[] = [];
  try {
    trucks = await sb(trucksQuery);
  } catch (e: any) {
    console.error('[cron-locate] cannot list trucks:', e?.message);
    return res.status(500).json({ error: 'cannot_list_trucks' });
  }

  console.log(`[cron-locate] ${trucks.length} trucks to process (batch=${batchLimit}, concurrency=${concurrency})`);

  let detected = 0;
  let failed = 0;
  const results: any[] = [];

  const processTruck = async (t: any) => {
    try {
      const d = await detectOneTruck(ai, t);
      if (!d) { failed++; return; }

      let lat: number | null = null;
      let lng: number | null = null;
      if (d.is_live && d.address) {
        const geo = await geocode(d.address);
        if (geo) { lat = geo.lat; lng = geo.lng; }
      }

      const update: any = {
        today_is_live: !!d.is_live,
        today_address: d.address || null,
        today_lat: lat,
        today_lng: lng,
        today_source: d.source_url || null,
        today_confidence: typeof d.confidence === 'number' ? Math.max(0, Math.min(100, d.confidence)) : null,
        today_raw_note: d.raw_note ? String(d.raw_note).slice(0, 400) : null,
        today_detected_at: new Date().toISOString(),
      };
      await sb(`trucks?id=eq.${t.id}`, { method: 'PATCH', body: JSON.stringify(update) });
      detected++;
      results.push({ id: t.id, name: t.name, is_live: update.today_is_live, address: update.today_address, confidence: update.today_confidence });
    } catch (e: any) {
      failed++;
      console.error(`[cron-locate] truck ${t.name} failed:`, e?.message);
    }
  };

  // Traitement par vagues de `concurrency` trucks en parallele (Gemini ~3-5s/truck, Nominatim 1req/s global ok si <60/min)
  for (let i = 0; i < trucks.length; i += concurrency) {
    const slice = trucks.slice(i, i + concurrency);
    await Promise.all(slice.map(processTruck));
    if (i + concurrency < trucks.length) await sleep(300);
  }

  const finishedAt = new Date().toISOString();
  if (runRow) {
    try {
      await sb(`truck_detection_runs?id=eq.${runRow.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ finished_at: finishedAt, trucks_total: trucks.length, trucks_detected: detected, trucks_failed: failed }),
      });
    } catch { /* ignore */ }
  }

  console.log(`[cron-locate] done: ${detected} detected, ${failed} failed, ${trucks.length} total`);
  return res.status(200).json({
    ok: true,
    run_id: runRow?.id || null,
    started_at: startedAt,
    finished_at: finishedAt,
    total: trucks.length,
    detected,
    failed,
    results: singleTruckId ? results : results.slice(0, 20),
  });
}
