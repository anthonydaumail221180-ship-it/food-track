// POST /api/discover-trucks (admin) { query? }
// Utilise Gemini + Google Search grounding pour trouver des food trucks actifs au Luxembourg
// et leurs comptes Instagram / Facebook / sites. Retourne du JSON structuré pour que l'admin
// puisse ensuite créer rapidement un compte food truck avec pré-remplissage.
import { GoogleGenAI } from '@google/genai';

const ADMIN = process.env.ADMIN_TOKEN;

const isAdmin = (req: any) => {
  const t = String(req.headers['x-admin-token'] || '');
  if (!ADMIN) return false;
  const len = Math.max(t.length, ADMIN.length);
  let d = t.length ^ ADMIN.length;
  for (let i = 0; i < len; i++) d |= (t.charCodeAt(i) || 0) ^ (ADMIN.charCodeAt(i) || 0);
  return d === 0;
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'gemini_not_configured' });

  try {
    const q = String((req.body || {}).query || '').trim().slice(0, 200) || 'tous les food trucks actifs';
    const prompt = `Tu es un agent de prospection pour l'application LëtzTrack au Luxembourg.
Recherche sur le web les food trucks correspondant à "${q}" opérant actuellement au Grand-Duché de Luxembourg.
Pour chacun, extrait ses infos publiques les plus récentes (compte Instagram officiel, page Facebook, site web, numéro de téléphone s'il est public, type de cuisine, zones habituelles).

Réponds UNIQUEMENT en JSON, sans phrase avant ni après, avec ce schéma exact :
{
  "trucks": [
    {
      "name": "Nom du food truck",
      "cuisine": "Type (burger, mexicain, asiatique, etc.)",
      "instagram": "@handle ou URL (null si inconnu)",
      "facebook": "URL ou nom de page (null si inconnu)",
      "website": "URL (null si inconnu)",
      "phone": "+352 ... (null si inconnu)",
      "areas": "Quartiers habituels au Luxembourg (ex: Kirchberg, Gare)",
      "notes": "Une phrase courte de pitch",
      "confidence": "high | medium | low"
    }
  ]
}

Maximum 8 trucks. Ne hallucine pas : si tu n'es pas sûr qu'un food truck existe VRAIMENT au Luxembourg, ne le mets pas.`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const r = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        // Active Google Search comme outil de grounding
        tools: [{ googleSearch: {} } as any],
      },
    });

    const text = r.text || '';
    // Extrait le JSON (modèle peut entourer de ```json ... ```)
    let jsonText = text.trim();
    const codeMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeMatch) jsonText = codeMatch[1].trim();
    // Fallback : premier `{` jusqu'au dernier `}`
    const start = jsonText.indexOf('{');
    const end = jsonText.lastIndexOf('}');
    if (start >= 0 && end > start) jsonText = jsonText.slice(start, end + 1);

    let parsed: any;
    try { parsed = JSON.parse(jsonText); }
    catch (e: any) {
      console.error(`[discover-trucks] parse fail: ${e?.message}. Raw: ${text.slice(0, 500)}`);
      return res.status(502).json({ error: 'parse_failed', raw: text.slice(0, 1000) });
    }

    const trucks = Array.isArray(parsed.trucks) ? parsed.trucks.slice(0, 20) : [];
    return res.status(200).json({ query: q, count: trucks.length, trucks });
  } catch (e: any) {
    console.error(`[discover-trucks] crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
