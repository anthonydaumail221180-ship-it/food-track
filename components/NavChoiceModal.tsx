import React, { useEffect } from 'react';
import { MapPin, Navigation2, Map as MapIcon, Bus, X, ExternalLink } from 'lucide-react';
import { getNavProviders, NavTarget } from '../services/mapsNavigation';

interface NavChoiceModalProps {
  target: NavTarget | null;
  onClose: () => void;
  // Optionnel : si fourni, un 4e bouton "Voir sur la carte" ouvre l'ancienne vue interne (NavigationHelper)
  onOpenInternalMap?: () => void;
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

export const NavChoiceModal: React.FC<NavChoiceModalProps> = ({ target, onClose, onOpenInternalMap }) => {
  // Ferme à l'Escape
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!target) return null;

  const providers = getNavProviders();

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

        {/* 3 providers */}
        <div className="space-y-2">
          {providers.map(p => (
            <button
              key={p.id}
              onClick={() => { p.action(target); onClose(); }}
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
