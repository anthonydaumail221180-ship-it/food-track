import React, { useEffect, useState } from 'react';
import { MapPin, Navigation2, Map as MapIcon, Bus, X, ExternalLink, Car, Bike, Footprints, Zap, Loader2 } from 'lucide-react';
import { getNavProviders, NavTarget } from '../services/mapsNavigation';
import { previewRoute, RoutePreview, NavMode, formatDuration, formatDistance } from '../services/routePreview';
import { saveLastDest } from '../services/lastDestination';
import { getUserPosition } from '../services/location';

interface NavChoiceModalProps {
  target: NavTarget | null;
  // Position de départ connue (depuis App.tsx userLocation si déjà dispo)
  from?: { lat: number; lng: number } | null;
  // Optionnel : si fourni, un 4e bouton "Voir sur la carte" ouvre l'ancienne vue interne (NavigationHelper)
  onClose: () => void;
  onOpenInternalMap?: () => void;
  // Pour mémoriser la destination
  truckId?: string;
}

// Petit icône par provider
const providerIcon: Record<string, React.ReactNode> = {
  apple: <MapIcon size={22} />,
  google: <Navigation2 size={22} />,
  mobiliteit: <Bus size={22} />,
};

// Petites couleurs d'avatar par provider
const providerAccent: Record<string, string> = {
  apple: 'bg-blue-50 text-blue-700 border-blue-100',
  google: 'bg-green-50 text-green-700 border-green-100',
  mobiliteit: 'bg-amber-50 text-amber-800 border-amber-100',
};

export const NavChoiceModal: React.FC<NavChoiceModalProps> = ({ target, from, onClose, onOpenInternalMap, truckId }) => {
  const [preview, setPreview] = useState<RoutePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  // Escape pour fermer
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  // Calcule le trajet dès l'ouverture : si on a déjà `from`, immédiat, sinon demande la géoloc une fois
  useEffect(() => {
    if (!target) { setPreview(null); setPreviewErr(null); return; }
    let cancelled = false;
    const run = async () => {
      setPreviewing(true);
      setPreviewErr(null);
      let origin = from || null;
      if (!origin) {
        const r = await getUserPosition();
        if (!cancelled && r.ok) origin = { lat: r.lat, lng: r.lng };
        else if (!cancelled) { setPreviewing(false); setPreviewErr("Activez la localisation pour voir la durée du trajet."); return; }
      }
      if (!origin) return;
      try {
        const p = await previewRoute(origin, { lat: target.lat, lng: target.lng });
        if (!cancelled) setPreview(p);
      } catch {
        if (!cancelled) setPreviewErr("Calcul du trajet impossible.");
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [target, from]);

  if (!target) return null;

  const providers = getNavProviders();

  // Lance le provider adapté au mode "le plus rapide"
  const openBestRoute = () => {
    if (!preview) return;
    const providerId = preview.fastest === 'transit' ? 'mobiliteit' : 'google';
    const p = providers.find(x => x.id === providerId) || providers.find(x => x.id === 'google') || providers[0];
    if (truckId) saveLastDest({ truckId, name: target.name || target.address || 'Food truck', address: target.address || '', lat: target.lat, lng: target.lng, provider: p.id });
    p.action(target);
    onClose();
  };

  const onProviderClick = (p: typeof providers[number]) => {
    if (truckId) saveLastDest({ truckId, name: target.name || target.address || 'Food truck', address: target.address || '', lat: target.lat, lng: target.lng, provider: p.id });
    p.action(target);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-slide-up"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle mobile */}
        <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

        {/* En-tête */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-brand-gradient flex items-center justify-center text-white flex-shrink-0 shadow-glow">
            <MapPin size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">Y aller</p>
            <h3 className="font-display text-xl text-brand-text leading-tight truncate">
              {target.name || target.address || 'Food truck'}
            </h3>
            {target.address && target.name && (
              <p className="text-xs text-brand-muted truncate">{target.address}</p>
            )}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center flex-shrink-0 text-brand-muted">
            <X size={20} />
          </button>
        </div>

        {/* Preview du trajet */}
        <div className="mb-4">
          {previewing && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-brand-muted bg-brand-bg rounded-2xl">
              <Loader2 className="animate-spin" size={16} /> Calcul du trajet…
            </div>
          )}
          {previewErr && !preview && (
            <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl p-3 text-xs">{previewErr}</div>
          )}
          {preview && (
            <>
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                <RouteChip label="Voiture" icon={<Car size={14} />} est={preview.car} fastest={preview.fastest === 'car'} />
                <RouteChip label="Vélo" icon={<Bike size={14} />} est={preview.bike} fastest={preview.fastest === 'bike'} />
                <RouteChip label="À pied" icon={<Footprints size={14} />} est={preview.walk} fastest={preview.fastest === 'walk'} />
                <RouteChip label="Bus" icon={<Bus size={14} />} est={preview.transit} fastest={preview.fastest === 'transit'} />
              </div>
              <button
                onClick={openBestRoute}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-gradient text-white font-bold text-sm shadow-glow active:scale-[0.98] transition mb-3"
              >
                <Zap size={16} /> Trajet le plus rapide : {labelOfMode(preview.fastest)} · {formatDuration((preview as any)[preview.fastest].durationSec)}
              </button>
              <p className="text-[10px] text-brand-muted text-center mb-3">
                Distances estimées{preview.car.realistic ? ' (voiture : trajet réel)' : ''}. Vélo/pied/bus en estimation.
              </p>
            </>
          )}
        </div>

        {/* 3 providers */}
        <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-2 px-1">Ouvrir dans une appli</p>
        <div className="space-y-2">
          {providers.map(p => (
            <button
              key={p.id}
              onClick={() => onProviderClick(p)}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl border ${providerAccent[p.id]} transition active:scale-[0.98] hover:brightness-95 relative`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center flex-shrink-0">
                {providerIcon[p.id]}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-bold text-sm text-brand-text flex items-center gap-2">
                  {p.label}
                  {p.recommended && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-orange/15 text-brand-orange uppercase tracking-wider">Recommandé</span>}
                </p>
                <p className="text-xs text-brand-muted truncate">{p.sublabel}</p>
              </div>
              <ExternalLink size={16} className="text-brand-muted flex-shrink-0" />
            </button>
          ))}
        </div>

        {/* Option secondaire : vue interne (map + conseil IA) */}
        {onOpenInternalMap && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brand-border"></div></div>
              <div className="relative flex justify-center text-[10px]"><span className="px-2 bg-white text-brand-muted uppercase tracking-wider">ou</span></div>
            </div>
            <button
              onClick={() => { onOpenInternalMap(); onClose(); }}
              className="w-full py-3 rounded-xl bg-brand-bg border border-brand-border text-sm font-bold text-brand-text hover:border-brand-orange transition flex items-center justify-center gap-2"
            >
              <MapIcon size={16} /> Voir sur la carte interne (conseil IA)
            </button>
          </>
        )}

        <p className="text-[11px] text-brand-muted text-center mt-4 leading-relaxed">
          Les apps externes s'ouvrent avec votre position actuelle comme point de départ.
        </p>
      </div>
    </div>
  );
};

// Petit pavé par mode de transport
const RouteChip: React.FC<{ label: string; icon: React.ReactNode; est: import('../services/routePreview').RouteEstimate; fastest: boolean }> = ({ label, icon, est, fastest }) => (
  <div className={`rounded-2xl p-2 text-center border ${fastest ? 'bg-brand-gradient text-white border-transparent shadow-glow' : 'bg-brand-bg border-brand-border'}`}>
    <div className={`flex items-center justify-center gap-1 mb-0.5 ${fastest ? 'text-white' : 'text-brand-muted'}`}>
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-xs font-bold ${fastest ? 'text-white' : 'text-brand-text'}`}>{formatDuration(est.durationSec)}</p>
    {fastest && <p className="text-[8px] text-white/85 font-bold uppercase mt-0.5">Le + rapide</p>}
  </div>
);

const labelOfMode = (m: NavMode): string => {
  switch (m) {
    case 'car': return 'en voiture';
    case 'bike': return 'à vélo';
    case 'walk': return 'à pied';
    case 'transit': return 'en bus';
  }
};
