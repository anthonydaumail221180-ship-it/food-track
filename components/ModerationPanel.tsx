import React, { useState } from 'react';
import { adminFetchPending, adminDecide, adminPostNews, PendingReport } from '../services/reportsService';
import { adminCreateTruck, adminListTrucks, adminDiscoverTrucks, adminFetchDashboard, adminSetUserRole, AdminTruckRow, DiscoveredTruck, AdminStats, AdminUserRow } from '../services/truckPortal';

// Page privée : ouvrez  votre-site/#/admin  puis saisissez votre code. Le serveur vérifie le code à chaque action.
export const ModerationPanel: React.FC = () => {
  const [token, setToken] = useState(() => sessionStorage.getItem('lt_admin') || '');
  const [list, setList] = useState<PendingReport[] | null>(null);
  const [msg, setMsg] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Création d'un food truck + lien portail
  const [newTruckName, setNewTruckName] = useState('');
  const [newTruckCuisine, setNewTruckCuisine] = useState('');
  const [newTruckEmail, setNewTruckEmail] = useState('');
  const [trucks, setTrucks] = useState<AdminTruckRow[]>([]);
  const [trucksLoaded, setTrucksLoaded] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadTrucks = async () => {
    const r = await adminListTrucks(token);
    if (r === 'unauthorized') { setMsg('Code incorrect.'); return; }
    if (r === 'error') { setMsg('Impossible de charger les food trucks.'); return; }
    setTrucks(r);
    setTrucksLoaded(true);
  };

  const createTruck = async () => {
    if (newTruckName.trim().length < 2) { setMsg('Nom trop court.'); return; }
    setCreating(true);
    const r = await adminCreateTruck(token, { name: newTruckName.trim(), cuisine: newTruckCuisine.trim(), email: newTruckEmail.trim() || undefined });
    setCreating(false);
    if (r === 'unauthorized') { setMsg('Code incorrect.'); return; }
    if (r === 'error') { setMsg('Création impossible.'); return; }
    setMsg(`✓ ${r.truck.name} créé. Lien portail copié dans la liste.`);
    setNewTruckName(''); setNewTruckCuisine(''); setNewTruckEmail('');
    await loadTrucks();
  };

  const copyPortalUrl = async (portalUrl: string) => {
    const full = `${window.location.origin}${portalUrl}`;
    try {
      await navigator.clipboard.writeText(full);
      setMsg('Lien copié dans le presse-papier.');
    } catch {
      setMsg(full);
    }
  };

  // Découverte de food trucks via Gemini + Google Search grounding
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discovered, setDiscovered] = useState<DiscoveredTruck[]>([]);
  const [discovering, setDiscovering] = useState(false);

  const launchDiscover = async () => {
    setMsg('');
    setDiscovering(true);
    const r = await adminDiscoverTrucks(token, discoverQuery.trim());
    setDiscovering(false);
    if (r === 'unauthorized') { setMsg('Code admin refusé.'); return; }
    if (r === 'error') { setMsg('La recherche a échoué. Essayez une autre requête.'); return; }
    setDiscovered(r.trucks);
    if (r.trucks.length === 0) setMsg('Aucun food truck trouvé pour cette requête.');
  };

  const createFromSuggestion = async (s: DiscoveredTruck) => {
    const r = await adminCreateTruck(token, { name: s.name, cuisine: s.cuisine || '' });
    if (r === 'unauthorized' || r === 'error') { setMsg('Création impossible.'); return; }
    setMsg(`✓ ${r.truck.name} créé avec son lien portail.`);
    setDiscovered(prev => prev.filter(x => x.name !== s.name));
    await loadTrucks();
  };

  // Dashboard (stats + users)
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);

  const loadDashboard = async (t = token) => {
    const r = await adminFetchDashboard(t);
    if (r === 'unauthorized' || r === 'error') return;
    setStats(r.stats);
    setUsers(r.users);
  };

  const load = async (t = token) => {
    setMsg('');
    const r = await adminFetchPending(t);
    if (r === 'unauthorized') { setList(null); sessionStorage.removeItem('lt_admin'); setMsg('Code incorrect.'); return; }
    if (r === 'error') { setMsg('Erreur de connexion au serveur.'); return; }
    sessionStorage.setItem('lt_admin', t);
    setList(r);
    loadDashboard(t); // charge en parallèle
  };

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (!window.confirm(currentlyAdmin ? 'Retirer les droits admin ?' : 'Promouvoir en admin ?')) return;
    const ok = await adminSetUserRole(token, userId, !currentlyAdmin);
    if (ok) { setMsg('Rôle mis à jour.'); loadDashboard(); }
    else setMsg('Échec de la mise à jour.');
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
          {/* === Dashboard stats === */}
          {stats && (
            <div className="mb-5">
              <div className="grid grid-cols-3 gap-2">
                <StatCard label="Food trucks" value={stats.trucks_total} sub={`${stats.trucks_live} en LIVE`} accent="bg-brand-orange/10 text-brand-orange" />
                <StatCard label="Utilisateurs" value={stats.users_total} sub={`${stats.users_active_now} actifs`} accent="bg-brand-pink/10 text-brand-pink" />
                <StatCard label="Signalements" value={stats.reports_pending} sub="en attente" accent="bg-brand-blue/10 text-brand-blue" />
                <StatCard label="Partenaires" value={stats.owners_total} sub={`${stats.owners_connected_ever} connectés`} accent="bg-green-50 text-green-700" />
                <StatCard label="Admins" value={stats.users_admin} sub="dans l'équipe" accent="bg-amber-50 text-amber-700" />
                <StatCard label="Actus" value={stats.posts_total} sub="publiées" accent="bg-brand-text/10 text-brand-text" />
              </div>
            </div>
          )}

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

          {/* === PILIER 1 : créer un food truck partenaire === */}
          <h2 className="font-bold mt-8 mb-2">Partenaires food trucks</h2>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
            <p className="text-xs text-gray-500">Crée un compte food truck et génère son lien portail (capability URL). Le food truck ouvre le lien → il édite sa fiche et broadcast ses emplacements du jour.</p>
            <input value={newTruckName} onChange={e => setNewTruckName(e.target.value)} maxLength={80} placeholder="Nom du food truck (obligatoire)" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" />
            <input value={newTruckCuisine} onChange={e => setNewTruckCuisine(e.target.value)} maxLength={60} placeholder="Type de cuisine (ex: burgers)" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" />
            <input value={newTruckEmail} onChange={e => setNewTruckEmail(e.target.value)} maxLength={120} type="email" placeholder="Email de contact (facultatif)" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" />
            <button onClick={createTruck} disabled={creating} className="w-full bg-brand-gradient text-white py-3 rounded-xl font-bold disabled:opacity-60">
              {creating ? 'Création…' : 'Créer + obtenir le lien portail'}
            </button>
          </div>

          <div className="mt-3 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-700">Food trucks créés ({trucks.length})</h3>
            <button onClick={loadTrucks} className="text-xs text-brand-blue font-semibold">{trucksLoaded ? 'Actualiser' : 'Charger la liste'}</button>
          </div>
          {trucksLoaded && trucks.length === 0 && <p className="text-sm text-gray-400 bg-white rounded-2xl p-5 border border-gray-100 mt-2">Aucun food truck créé pour l'instant.</p>}
          <div className="space-y-2 mt-2">
            {trucks.map(t => (
              <div key={t.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="font-bold">{t.name} <span className="text-xs text-gray-400 font-normal">· {t.cuisine || 'cuisine non précisée'}</span></p>
                {t.owners.map(o => (
                  <div key={o.id} className="mt-2 text-xs text-gray-600 space-y-1">
                    {o.email && <p>✉ {o.email}</p>}
                    <p className="truncate font-mono bg-gray-50 rounded-lg px-2 py-1 text-[10px]">{window.location.origin}{o.portal_url}</p>
                    <div className="flex gap-2">
                      <button onClick={() => copyPortalUrl(o.portal_url)} className="flex-1 bg-brand-text text-white py-2 rounded-lg font-bold">Copier le lien</button>
                      <a href={o.portal_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-center bg-gray-100 text-gray-700 py-2 rounded-lg font-bold">Ouvrir</a>
                    </div>
                    {o.last_login_at && <p className="text-[10px] text-gray-400">Dernière connexion : {new Date(o.last_login_at).toLocaleString('fr-FR')}</p>}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* === Découverte web via Gemini + Google Search === */}
          <h2 className="font-bold mt-8 mb-2">🕵️ Découvrir des food trucks (web)</h2>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
            <p className="text-xs text-gray-500">Lance une recherche web pilotée par IA pour identifier des food trucks actifs au Luxembourg et récupérer leurs réseaux sociaux. Utilise le résultat pour créer rapidement un compte partenaire.</p>
            <input value={discoverQuery} onChange={e => setDiscoverQuery(e.target.value)} placeholder="Ex: burger, asiatique, Kirchberg, dessert… (vide = tous)" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm" />
            <button onClick={launchDiscover} disabled={discovering} className="w-full bg-brand-text text-white py-3 rounded-xl font-bold disabled:opacity-60">
              {discovering ? 'Recherche en cours… (10-20s)' : '🔍 Lancer la recherche'}
            </button>
          </div>

          {/* === Utilisateurs === */}
          <h2 className="font-bold mt-8 mb-2">👤 Utilisateurs ({users.length})</h2>
          <div className="space-y-2">
            {users.length === 0 && <p className="text-sm text-gray-400 bg-white rounded-2xl p-5 border border-gray-100">Aucun utilisateur.</p>}
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-2xl p-3 border border-gray-100 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-brand-text flex items-center gap-2">
                    {u.first_name || u.nickname || '—'}
                    {u.is_admin && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase">admin</span>}
                    {u.active_now && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 uppercase">en ligne</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  <p className="text-[10px] text-gray-400">Inscrit : {new Date(u.created_at).toLocaleDateString('fr-FR')}{u.last_login_at ? ' · dernier login : ' + new Date(u.last_login_at).toLocaleDateString('fr-FR') : ''}</p>
                </div>
                <button
                  onClick={() => toggleAdmin(u.id, u.is_admin)}
                  className={`text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap ${u.is_admin ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}
                >
                  {u.is_admin ? 'Retirer admin' : 'Promouvoir'}
                </button>
              </div>
            ))}
          </div>

          {discovered.length > 0 && (
            <div className="mt-3 space-y-3">
              {discovered.map((s, i) => (
                <div key={`${s.name}-${i}`} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold">{s.name} {s.confidence && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ml-1 ${s.confidence === 'high' ? 'bg-green-100 text-green-700' : s.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{s.confidence}</span>}</p>
                      <p className="text-xs text-gray-500">{s.cuisine || '—'}{s.areas ? ` · ${s.areas}` : ''}</p>
                    </div>
                    <button onClick={() => createFromSuggestion(s)} className="bg-brand-gradient text-white text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap">+ Créer</button>
                  </div>
                  {s.notes && <p className="text-xs text-gray-700 italic">« {s.notes} »</p>}
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {s.instagram && <a href={s.instagram.startsWith('http') ? s.instagram : `https://instagram.com/${s.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-brand-pink font-semibold underline">📷 Insta</a>}
                    {s.facebook && <a href={s.facebook.startsWith('http') ? s.facebook : `https://www.facebook.com/${s.facebook}`} target="_blank" rel="noopener noreferrer" className="text-brand-blue font-semibold underline">📘 FB</a>}
                    {s.website && <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-brand-text font-semibold underline">🌐 Site</a>}
                    {s.phone && <span className="text-gray-500">📞 {s.phone}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {msg && <p className="text-sm mt-4 bg-white border border-gray-100 rounded-xl p-3">{msg}</p>}
    </div>
  );
};

// Petit pavé stat pour le dashboard admin
const StatCard: React.FC<{ label: string; value: number | string; sub?: string; accent: string }> = ({ label, value, sub, accent }) => (
  <div className="bg-white rounded-2xl p-3 border border-gray-100">
    <p className={`text-[9px] uppercase tracking-widest font-bold ${accent.split(' ')[1]} mb-1`}>{label}</p>
    <p className="text-2xl font-display text-brand-text leading-none">{value}</p>
    {sub && <p className="text-[10px] text-gray-500 mt-1">{sub}</p>}
  </div>
);
