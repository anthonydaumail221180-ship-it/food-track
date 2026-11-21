import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, Navigation, CheckCircle2, LogOut, User, Clock, Edit3, Camera, Loader2, ChevronRight, Instagram, Facebook, Phone, Globe, Utensils, History, PowerOff } from 'lucide-react';
import { fetchMyTruck, updateMyTruck, setMyLocation, closeMyLocation, sendHeartbeat, TruckProfile, TruckLocation } from '../services/truckPortal';
import { getUserPosition } from '../services/location';
import { reverseGeocodeAgent } from '../services/geocode';
import { BrandLogo } from './BrandLogo';

interface TruckPortalProps {
  token: string;
}

type Tab = 'home' | 'profile' | 'history';

export const TruckPortal: React.FC<TruckPortalProps> = ({ token }) => {
  const [truck, setTruck] = useState<TruckProfile | null>(null);
  const [recentLocations, setRecentLocations] = useState<TruckLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<string>('');
  const [tab, setTab] = useState<Tab>('home');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3000);
  };

  const refresh = useCallback(async () => {
    const r = await fetchMyTruck(token);
    if (r.ok) {
      setTruck(r.data.truck);
      setRecentLocations(r.data.recent_locations);
      setError('');
    } else {
      setError(r.message);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <Loader2 className="animate-spin text-brand-orange" size={32} />
      </div>
    );
  }

  if (error || !truck) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <LogOut className="text-red-500" size={28} />
        </div>
        <h2 className="font-display text-2xl text-brand-text mb-2">Accès refusé</h2>
        <p className="text-sm text-brand-muted max-w-xs">{error || "Lien invalide."}</p>
        <p className="text-xs text-brand-muted mt-4">Contactez votre interlocuteur LëtzTrack pour obtenir un nouveau lien.</p>
      </div>
    );
  }

  const activeLocation = recentLocations.find(l => l.status === 'open' && (!l.open_until || new Date(l.open_until) > new Date()));

  return (
    <div className="min-h-screen bg-brand-bg pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-brand-border">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" showText={false} />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">Portail pro</p>
              <h1 className="text-sm font-display text-brand-text leading-tight">{truck.name}</h1>
            </div>
          </div>
          {activeLocation && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-green/10 border border-brand-green/30 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
              </span>
              <span className="text-[10px] font-bold text-brand-green uppercase">En service</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-5">
        {tab === 'home' && <HomeTab truck={truck} activeLocation={activeLocation} token={token} onChange={refresh} showToast={showToast} />}
        {tab === 'profile' && <ProfileTab truck={truck} token={token} onChange={refresh} showToast={showToast} />}
        {tab === 'history' && <HistoryTab locations={recentLocations} />}
      </main>

      {/* Tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-brand-border z-30">
        <div className="max-w-md mx-auto grid grid-cols-3">
          <TabBtn active={tab === 'home'} onClick={() => setTab('home')} icon={<MapPin size={20} />} label="Emplacement" />
          <TabBtn active={tab === 'profile'} onClick={() => setTab('profile')} icon={<User size={20} />} label="Ma fiche" />
          <TabBtn active={tab === 'history'} onClick={() => setTab('history')} icon={<History size={20} />} label="Historique" />
        </div>
      </nav>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] bg-brand-text text-white px-5 py-3 rounded-full shadow-2xl text-sm font-bold max-w-[90vw] text-center animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
};

// --- Tab button ---
const TabBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`py-3 flex flex-col items-center gap-1 transition ${active ? 'text-brand-orange' : 'text-brand-muted'}`}>
    {icon}
    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

// --- Home tab: "Je suis ici maintenant" ---
const HomeTab: React.FC<{
  truck: TruckProfile;
  activeLocation: TruckLocation | undefined;
  token: string;
  onChange: () => void;
  showToast: (m: string) => void;
}> = ({ truck, activeLocation, token, onChange, showToast }) => {
  const [locating, setLocating] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [openUntil, setOpenUntil] = useState<string>(() => {
    const d = new Date(Date.now() + 3 * 3600 * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const locate = async () => {
    setErr('');
    setLocating(true);
    const r = await getUserPosition();
    if (!r.ok) { setLocating(false); setErr(r.message); return; }
    const rev = await reverseGeocodeAgent(r.lat, r.lng);
    setLocating(false);
    const address = rev?.address || `Position GPS (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)})`;
    if (rev && !rev.inLuxembourg) {
      setErr("Attention : position hors Luxembourg. Le broadcast ne sera visible que si vous êtes bien dans la zone couverte par LëtzTrack.");
    }
    setPos({ lat: r.lat, lng: r.lng, address });
  };

  const broadcast = async () => {
    if (!pos) return;
    setErr('');
    setSubmitting(true);
    const [hh, mm] = openUntil.split(':').map(Number);
    const until = new Date();
    until.setHours(hh, mm, 0, 0);
    if (+until < Date.now() + 5 * 60 * 1000) until.setDate(until.getDate() + 1);
    const r = await setMyLocation(token, {
      lat: pos.lat, lng: pos.lng, address: pos.address,
      open_until: until.toISOString(),
    });
    setSubmitting(false);
    if (!r.ok) { setErr(r.message); return; }
    setPos(null);
    showToast("Vous êtes en ligne ! Vos clients vous voient.");
    onChange();
  };

  const close = async () => {
    if (!window.confirm("Fermer maintenant ? Votre fiche repassera en 'fermé'.")) return;
    const r = await closeMyLocation(token);
    if (!r.ok) { setErr(r.message); return; }
    showToast("Service fermé. Bonne journée !");
    onChange();
  };

  // Auto-heartbeat live tracking : toutes les 2 min, ping le serveur pour prouver que la présence est active.
  // L'app publique affiche alors "maj il y a X min" (fraîcheur).
  React.useEffect(() => {
    if (!activeLocation) return;
    const tick = () => { sendHeartbeat(token).catch(() => {}); };
    const id = window.setInterval(tick, 120_000);
    return () => window.clearInterval(id);
  }, [activeLocation, token]);

  const pingNow = async () => {
    const ok = await sendHeartbeat(token);
    if (ok) showToast("Position confirmée (Live tracking mis à jour).");
    else setErr("Impossible d'envoyer la mise à jour. Réessayez.");
    onChange();
  };

  const pingWithGps = async () => {
    const r = await getUserPosition();
    if (!r.ok) { setErr(r.message); return; }
    const ok = await sendHeartbeat(token, r.lat, r.lng);
    if (ok) showToast("Nouvelle position envoyée en LIVE.");
    else setErr("Impossible d'envoyer la nouvelle position.");
    onChange();
  };

  if (activeLocation) {
    const until = activeLocation.open_until ? new Date(activeLocation.open_until) : null;
    const untilStr = until ? until.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;
    return (
      <div className="space-y-4 animate-slide-up">
        <div className="bg-brand-gradient text-white rounded-3xl p-6 shadow-glow">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <p className="text-xs font-bold uppercase tracking-widest">En service</p>
          </div>
          <h2 className="font-display text-2xl leading-tight">{activeLocation.address}</h2>
          {untilStr && <p className="text-white/85 text-sm mt-2">Jusqu'à {untilStr}</p>}
        </div>

        {/* Boutons live tracking */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={pingNow} className="bg-white border-2 border-brand-border text-brand-text rounded-2xl p-3 font-bold text-sm hover:border-brand-orange transition">
            🫡 Je suis toujours là
          </button>
          <button onClick={pingWithGps} className="bg-white border-2 border-brand-border text-brand-text rounded-2xl p-3 font-bold text-sm hover:border-brand-orange transition">
            📍 J'ai bougé
          </button>
        </div>

        <button onClick={close} className="w-full bg-white border-2 border-red-200 text-red-600 rounded-2xl p-4 font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition">
          <PowerOff size={20} />
          Fermer maintenant
        </button>

        <div className="bg-white rounded-2xl p-4 border border-brand-border">
          <p className="text-xs text-brand-muted font-bold uppercase tracking-wider mb-2">Live tracking</p>
          <p className="text-sm text-brand-text leading-relaxed">
            Votre présence est pingée automatiquement toutes les 2 minutes tant que vous êtes dans l'app. Vos clients voient <span className="font-bold">« maj il y a X min »</span> sur votre fiche. Si vous bougez, cliquez <span className="font-bold">« J'ai bougé »</span> pour actualiser le point sur la carte sans recréer une session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div>
        <h2 className="font-display text-3xl text-brand-text">Où êtes-vous ?</h2>
        <p className="text-sm text-brand-muted mt-1">Un clic pour signaler votre emplacement et apparaître en LIVE pour vos clients.</p>
      </div>

      {!pos ? (
        <button
          onClick={locate}
          disabled={locating}
          className="w-full bg-brand-gradient text-white rounded-3xl p-6 shadow-glow flex items-center gap-4 transition-transform active:scale-95 hover:scale-[1.01] disabled:opacity-60"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
            {locating ? <Loader2 className="animate-spin" size={26} /> : <Navigation size={26} />}
          </div>
          <div className="text-left flex-1">
            <h3 className="font-bold text-xl leading-tight">{locating ? 'Localisation…' : 'Je suis ici maintenant'}</h3>
            <p className="text-sm text-white/85">Utilise votre GPS pour relever l'adresse</p>
          </div>
        </button>
      ) : (
        <div className="bg-white rounded-3xl p-5 shadow-card border border-brand-border space-y-4 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="text-brand-green" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-brand-muted font-bold uppercase tracking-wider">Position relevée</p>
              <p className="font-bold text-brand-text leading-tight">{pos.address}</p>
            </div>
          </div>

          <div>
            <label className="text-xs text-brand-muted font-bold uppercase tracking-wider block mb-2">Vous restez jusqu'à</label>
            <input
              type="time"
              value={openUntil}
              onChange={e => setOpenUntil(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-lg font-bold text-brand-text focus:outline-none focus:border-brand-orange"
            />
            <p className="text-[11px] text-brand-muted mt-1">Maximum 12h depuis maintenant. Fermez à la main si vous repartez plus tôt.</p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setPos(null)} className="flex-1 py-3 rounded-xl bg-brand-bg text-brand-text font-bold text-sm border border-brand-border">
              Annuler
            </button>
            <button
              onClick={broadcast}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-brand-gradient text-white font-bold text-sm shadow-glow disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
              Passer en LIVE
            </button>
          </div>
        </div>
      )}

      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{err}</p>}

      <div className="bg-white rounded-2xl p-4 border border-brand-border">
        <p className="text-xs text-brand-muted font-bold uppercase tracking-wider mb-2">Nouveau sur LëtzTrack ?</p>
        <p className="text-sm text-brand-text leading-relaxed">
          Commencez par compléter votre <span className="font-bold text-brand-orange">fiche</span> (nom, photo, cuisine, contacts). Ensuite, chaque jour quand vous arrivez quelque part, un clic suffit pour prévenir vos clients.
        </p>
      </div>
    </div>
  );
};

// --- Profile tab: éditer la fiche ---
const ProfileTab: React.FC<{
  truck: TruckProfile;
  token: string;
  onChange: () => void;
  showToast: (m: string) => void;
}> = ({ truck, token, onChange, showToast }) => {
  const [form, setForm] = useState({
    name: truck.name,
    cuisine: truck.cuisine,
    description: truck.description,
    phone: truck.phone,
    instagram: truck.instagram,
    facebook: truck.facebook,
    website: truck.website,
    photo_url: truck.photo_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setErr('');
    setSaving(true);
    const r = await updateMyTruck(token, form);
    setSaving(false);
    if (!r.ok) { setErr(r.message); return; }
    showToast("Fiche mise à jour ✓");
    onChange();
  };

  const onPhoto = async (f: File | null) => {
    if (!f) { setForm(prev => ({ ...prev, photo_url: '' })); return; }
    if (f.size > 8 * 1024 * 1024) { setErr("Photo trop lourde (max 8 Mo)."); return; }
    const data = await compress(f);
    if (!data) { setErr("Impossible de lire cette photo."); return; }
    setForm(prev => ({ ...prev, photo_url: data }));
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <h2 className="font-display text-3xl text-brand-text">Ma fiche</h2>

      {/* Photo */}
      <div className="bg-white rounded-2xl p-4 border border-brand-border">
        <label className="text-xs text-brand-muted font-bold uppercase tracking-wider block mb-3">Photo de profil</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-brand-bg overflow-hidden flex items-center justify-center flex-shrink-0 border border-brand-border">
            {form.photo_url ? <img src={form.photo_url} alt="" className="w-full h-full object-cover" /> : <Camera className="text-brand-muted" size={28} />}
          </div>
          <label className="flex-1 py-3 px-4 rounded-xl bg-brand-bg border border-brand-border text-sm font-bold text-brand-text cursor-pointer text-center hover:border-brand-orange">
            {form.photo_url ? 'Changer la photo' : 'Choisir une photo'}
            <input type="file" accept="image/*" className="hidden" onChange={e => onPhoto(e.target.files?.[0] || null)} />
          </label>
        </div>
      </div>

      <Field label="Nom du food truck" icon={<Utensils size={16} />}>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Ex: Tabor Food" />
      </Field>
      <Field label="Type de cuisine" icon={<Utensils size={16} />}>
        <input value={form.cuisine} onChange={e => setForm(p => ({ ...p, cuisine: e.target.value }))} className={inputCls} placeholder="Ex: Mexicain, Burgers, Éthiopien..." />
      </Field>
      <Field label="Description" icon={<Edit3 size={16} />}>
        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputCls + ' min-h-[90px] resize-y'} placeholder="Présentez votre cuisine en quelques phrases." />
      </Field>

      <h3 className="text-xs text-brand-muted font-bold uppercase tracking-widest pt-2">Contacts & réseaux</h3>

      <Field label="Téléphone" icon={<Phone size={16} />}>
        <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputCls} placeholder="+352 ..." inputMode="tel" />
      </Field>
      <Field label="Instagram" icon={<Instagram size={16} />}>
        <input value={form.instagram} onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))} className={inputCls} placeholder="@votre_compte" />
      </Field>
      <Field label="Facebook" icon={<Facebook size={16} />}>
        <input value={form.facebook} onChange={e => setForm(p => ({ ...p, facebook: e.target.value }))} className={inputCls} placeholder="lien ou nom de page" />
      </Field>
      <Field label="Site web" icon={<Globe size={16} />}>
        <input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} className={inputCls} placeholder="https://..." inputMode="url" />
      </Field>

      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{err}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-4 rounded-2xl bg-brand-gradient text-white font-bold shadow-glow disabled:opacity-60 flex items-center justify-center gap-2 sticky bottom-20"
      >
        {saving ? <Loader2 className="animate-spin" size={18} /> : null}
        Enregistrer
      </button>
    </div>
  );
};

const inputCls = "w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-brand-orange";

const Field: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
  <div className="bg-white rounded-2xl p-4 border border-brand-border">
    <label className="flex items-center gap-2 text-xs text-brand-muted font-bold uppercase tracking-wider mb-2">
      {icon} {label}
    </label>
    {children}
  </div>
);

// --- History tab ---
const HistoryTab: React.FC<{ locations: TruckLocation[] }> = ({ locations }) => {
  if (!locations.length) {
    return (
      <div className="text-center py-16 animate-slide-up">
        <div className="w-16 h-16 rounded-full bg-brand-bg mx-auto flex items-center justify-center mb-3">
          <Clock className="text-brand-muted" size={28} />
        </div>
        <h2 className="font-display text-2xl text-brand-text mb-2">Aucun emplacement</h2>
        <p className="text-sm text-brand-muted max-w-xs mx-auto">Vos 5 derniers points de vente apparaîtront ici dès votre premier passage en LIVE.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3 animate-slide-up">
      <h2 className="font-display text-3xl text-brand-text">Vos 5 dernières positions</h2>
      {locations.map(loc => {
        const from = new Date(loc.open_from);
        const until = loc.open_until ? new Date(loc.open_until) : null;
        const isLive = loc.status === 'open' && until && until > new Date();
        return (
          <div key={loc.id} className="bg-white rounded-2xl p-4 border border-brand-border">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isLive ? 'bg-brand-green/15 text-brand-green' : 'bg-brand-bg text-brand-muted'}`}>
                <MapPin size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isLive && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-green/15 text-brand-green">Live</span>}
                  <span className="text-xs text-brand-muted">{from.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                </div>
                <p className="font-bold text-brand-text leading-tight truncate">{loc.address}</p>
                <p className="text-xs text-brand-muted mt-1">
                  {from.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} {until ? `– ${until.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Compression image embarquée (copie de ReportTruck.tsx, suffisante ici)
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const compress = (file: File): Promise<string> =>
  new Promise((resolve) => {
    if (!file || file.size > MAX_PHOTO_BYTES) return resolve('');
    const url = URL.createObjectURL(file);
    const img = new Image();
    const cleanup = () => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } };
    const timeoutId = window.setTimeout(() => { cleanup(); resolve(''); }, 15000);
    img.onload = () => {
      window.clearTimeout(timeoutId);
      try {
        const k = Math.min(1, 640 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        const ctx = c.getContext('2d');
        if (!ctx) { cleanup(); return resolve(''); }
        ctx.drawImage(img, 0, 0, c.width, c.height);
        cleanup();
        resolve(c.toDataURL('image/jpeg', 0.75));
      } catch { cleanup(); resolve(''); }
    };
    img.onerror = () => { window.clearTimeout(timeoutId); cleanup(); resolve(''); };
    img.src = url;
  });
