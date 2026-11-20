import React, { useState } from 'react';
import { ArrowLeft, MapPin, Star, Camera, CheckCircle2, Loader2 } from 'lucide-react';
import { getUserPosition } from '../services/location';
import { reverseGeocodeAgent } from '../services/geocode';
import { submitReport } from '../services/reportsService';

interface ReportTruckProps {
  onBack: () => void;
  onDone: () => void;
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

// Taille max avant décodage : 12 Mo (iPhone HEIC moyen passe, les monstres sont refusés tôt)
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

// Réduit la photo pour qu'elle tienne dans la mémoire de l'appareil
const compress = (file: File): Promise<string> =>
  new Promise((resolve) => {
    if (!file || file.size > MAX_PHOTO_BYTES) return resolve('');
    const url = URL.createObjectURL(file);
    const img = new Image();
    const cleanup = () => { try { URL.revokeObjectURL(url); } catch { /* ignore */ } };
    // Garde-fou : si le décodage prend >15s on abandonne (ex. HEIC qui ne décode pas)
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
        resolve(c.toDataURL('image/jpeg', 0.7));
      } catch {
        cleanup();
        resolve('');
      }
    };
    img.onerror = () => { window.clearTimeout(timeoutId); cleanup(); resolve(''); };
    img.src = url;
  });

export const ReportTruck: React.FC<ReportTruckProps> = ({ onBack, onDone }) => {
  const [locating, setLocating] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lng: number; address: string; ts: number } | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [stars, setStars] = useState(0);
  const [photo, setPhoto] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  const locate = async () => {
    setError('');
    setLocating(true);
    const r = await getUserPosition();
    if (r.ok === false) { setLocating(false); setPos(null); setError(r.message); return; }
    const rev = await reverseGeocodeAgent(r.lat, r.lng);
    setLocating(false);
    if (!rev) { setPos(null); setError("Adresse introuvable pour le moment. Vérifiez votre connexion et réessayez."); return; }
    if (!rev.inLuxembourg) { setPos(null); setError("Votre position n'est pas au Luxembourg : le signalement n'est pas possible."); return; }
    setPos({ lat: r.lat, lng: r.lng, address: rev.address || 'Position GPS', ts: Date.now() });
  };

  const submit = async () => {
    setError('');
    const digits = phone.replace(/\D/g, '');
    if (!pos) return setError("Commencez par vous géolocaliser.");
    if (name.trim().length < 2) return setError("Le nom du food truck est obligatoire.");
    if (digits.length < 8 || !/^\+?[\d\s().-]+$/.test(phone.trim())) return setError("Le numéro de téléphone est obligatoire (8 chiffres minimum).");
    setSending(true);
    const r = await submitReport({
      name: name.trim().slice(0, 60),
      phone: phone.trim().slice(0, 25),
      lat: pos.lat, lng: pos.lng, address: pos.address,
      stars,
      photo: photo || undefined,
    });
    setSending(false);
    if (r.ok === false) return setError(r.message);
    setDone(true);
  };

  const when = pos ? `${DAYS[new Date(pos.ts).getDay()]} ${new Date(pos.ts).toLocaleDateString('fr-FR')} à ${new Date(pos.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : '';

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-slide-up">
        <CheckCircle2 className="text-brand-green w-16 h-16 mb-4" />
        <h2 className="font-display text-3xl text-brand-text mb-2">Merci !</h2>
        <p className="text-sm text-gray-500 mb-8">Votre signalement est <b>en attente de validation</b>. Vous le voyez dans la liste, mais il n'apparaîtra pour les autres qu'une fois validé par l'équipe LëtzTrack.</p>
        <button onClick={onDone} className="w-full max-w-xs bg-brand-gradient text-white py-4 rounded-2xl font-bold shadow-lg">Voir la liste</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-5 pb-16 max-w-md mx-auto animate-slide-up">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-brand-muted mb-4"><ArrowLeft size={18} /> Retour</button>
      <h1 className="font-display text-3xl text-brand-text mb-1">Un food truck repéré ?</h1>
      <p className="text-sm text-gray-500 mb-5">Aidez la communauté en 30 secondes. Votre position, le jour et l'heure sont enregistrés automatiquement.</p>

      <button onClick={locate} disabled={locating} className="w-full flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition disabled:opacity-60">
        <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center text-white">{locating ? <Loader2 className="animate-spin" size={20} /> : <MapPin size={20} />}</div>
        <div className="text-left">
          <p className="font-bold text-brand-text">{locating ? 'Localisation en cours…' : pos ? 'Me géolocaliser à nouveau' : 'Me géolocaliser'}</p>
          <p className="text-xs text-gray-500">Utiliser mon GPS actuel</p>
        </div>
      </button>

      {pos && (
        <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-900">
          <p className="font-bold flex items-center gap-1"><CheckCircle2 size={16} /> Adresse validée</p>
          <p>{pos.address}</p>
          <p className="text-xs mt-1 text-green-800">{when} (automatique)</p>
        </div>
      )}

      <label className="block text-sm font-bold mt-5 mb-1" htmlFor="rt-name">Nom du food truck *</label>
      <input id="rt-name" value={name} onChange={e => setName(e.target.value)} maxLength={60} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange" />

      <label className="block text-sm font-bold mt-4 mb-1" htmlFor="rt-phone">Numéro de téléphone *</label>
      <input id="rt-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+352 …" maxLength={25} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-brand-orange" />
      <p className="text-xs text-gray-400 mt-1">Sert à valider le signalement. Il n'est pas affiché dans l'application.</p>

      <p className="text-sm font-bold mt-5 mb-1">Note (facultatif)</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} type="button" onClick={() => setStars(stars === i ? 0 : i)} aria-label={`${i} étoile${i > 1 ? 's' : ''}`}>
            <Star size={30} className={i <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
          </button>
        ))}
      </div>

      <p className="text-sm font-bold mt-5 mb-1">Photo (facultatif)</p>
      <label className="flex items-center gap-3 p-3 border border-dashed border-gray-300 rounded-xl cursor-pointer text-sm text-gray-500">
        <Camera size={20} /> {photo ? 'Photo ajoutée ✓ (toucher pour changer)' : 'Ajouter une photo'}
        <input type="file" accept="image/*" className="hidden" onChange={async e => {
          const f = e.target.files?.[0];
          if (!f) { setPhoto(''); return; }
          const data = await compress(f);
          if (!data) { setError("Impossible de lire cette photo (format non pris en charge ou trop lourde). Essayez une autre image."); setPhoto(''); }
          else { setError(''); setPhoto(data); }
        }} />
      </label>
      {photo && <img src={photo} alt="" className="mt-2 w-24 h-24 object-cover rounded-xl" />}

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mt-4">{error}</p>}

      <button onClick={submit} disabled={sending} className="w-full mt-5 bg-brand-gradient text-white py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-60">{sending ? 'Envoi…' : 'Signaler ce food truck'}</button>
    </div>
  );
};
