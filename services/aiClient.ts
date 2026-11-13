// Le client n'a plus la clé Gemini : il appelle la fonction serveur /api/gemini
export const ai = {
  models: {
    generateContent: async (params: any) => {
      const r = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!r.ok) throw new Error('Erreur API');
      return r.json();
    },
  },
};
