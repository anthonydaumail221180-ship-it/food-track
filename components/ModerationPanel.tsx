import React, { useState } from 'react';
import { adminFetchPending, adminDecide, adminPostNews, PendingReport } from '../services/reportsService';

// Page privée : ouvrez  votre-site/#/admin  puis saisissez votre code. Le serveur vérifie le code à chaque action.
export const ModerationPanel: React.FC = () => {
  const [token, setToken] = useState(() => sessionStorage.getItem('lt_admin') || '');
  const [list, setList] = useState<PendingReport[] | null>(null);
  const [msg, setMsg] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = async (t = token) => {
    setMsg('');
    const r = await adminFetchPending(t);
    if (r === 'unauthorized') { setList(null); sessionStorage.removeItem('lt_admin'); setMsg('Code incorrect.'); return; }
    if (r === 'error') { setMsg('Erreur de connexion au serveur.'); return; }
    sessionStorage.setItem('lt_admin', t);
    setList(r);
  };
  const decide = async (id: string, s: 'approved' | 'rejected') => {
    if (await adminDecide(token, id, s)) { setList(l => (l || []).filter(x => x.id !== id)); setMsg(s === 'approved' ? 'Validé : le camion est visible et annoncé dans le fil d\'actu.' : 'Refusé.'); }
    else setMsg("L'action a échoué.");
  };
  const publish = async () => {
    if (!title.trim()) return;
    if (await adminPostNews(token, title, body)) { setTitle(''); setBody(''); setMsg('Actu publiée.'); } else setMsg('Publication impossible.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-5 pb-16 max-w-xl mx-auto">
      <h1 className="font-display text-3xl text-brand-text mb-4">Modération LëtzTrack</h1>
      {!list ? (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <label className="text-sm font-bold" htmlFor="adm">Code administrateur</label>
          <input id="adm" type="password" value={token} onChange={e => setToken(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" />
          <button onClick={() => load()} className="w-full mt-3 bg-brand-text text-white py-3 rounded-xl font-bold">Entrer</button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold">En attente de validation ({list.length})</h2>
            <button onClick={() => load()} className="text-xs text-brand-blue font-semibold">Actualiser</button>
          </div>
          {list.length === 0 && <p className="text-sm text-gray-400 bg-white rounded-2xl p-5 border border-gray-100">Aucun signalement en attente.</p>}
          <div className="space-y-3">
            {list.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex gap-3">
                  {r.photo && <img src={r.photo} alt="" className="w-20 h-20 rounded-xl object-cover" />}
                  <div className="text-sm min-w-0">
                    <p className="font-bold">{r.name} {r.stars > 0 && <span className="text-yellow-500">{'★'.repeat(r.stars)}</span>}</p>
                    <p className="text-gray-600">{r.address}</p>
                    <p className="text-gray-500 text-xs">Tél. {r.phone} · {new Date(r.ts).toLocaleString('fr-FR')}</p>
                    <a className="text-xs text-brand-blue" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`}>Voir sur la carte</a>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => decide(r.id, 'approved')} className="flex-1 bg-brand-green text-white py-2 rounded-xl font-bold text-sm">Valider</button>
                  <button onClick={() => decide(r.id, 'rejected')} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl font-bold text-sm">Refuser</button>
                </div>
              </div>
            ))}
          </div>

          <h2 className="font-bold mt-8 mb-2">Publier une actu</h2>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Titre" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" />
            <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={1000} rows={3} placeholder="Texte (facultatif)" className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" />
            <button onClick={publish} className="w-full mt-2 bg-brand-gradient text-white py-3 rounded-xl font-bold">Publier</button>
          </div>
        </>
      )}
      {msg && <p className="text-sm mt-4 bg-white border border-gray-100 rounded-xl p-3">{msg}</p>}
    </div>
  );
};
