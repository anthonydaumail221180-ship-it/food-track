import { GoogleGenAI } from '@google/genai';

const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-image'];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  const { model, contents, config } = req.body || {};
  if (!ALLOWED_MODELS.includes(model)) return res.status(400).json({ error: 'model' });
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const r = await ai.models.generateContent({ model, contents, config });
    res.status(200).json({ text: r.text, candidates: r.candidates });
  } catch (e) {
    res.status(500).json({ error: 'gemini_failed' });
  }
}
