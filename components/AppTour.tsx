import React, { useState } from 'react';
import { Utensils, Flame, Heart, Coins, Megaphone, MapPin, User as UserIcon, Navigation2, X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface AppTourProps {
  onClose: () => void;
}

interface Slide {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  cta?: string;
}

const SLIDES: Slide[] = [
  {
    title: 'Bienvenue sur LëtzTrack 🎉',
    description: 'Votre pause midi, sur roues. Trouvez les meilleurs food trucks du Luxembourg en temps réel. Voici ce qui vous attend en 5 étapes.',
    icon: <Sparkles size={36} />,
    accent: 'bg-brand-gradient text-white',
  },
  {
    title: '🍴 Grub — Tous les food trucks du jour',
    description: 'Le bouton principal. Vous y trouvez la liste des food trucks actifs aujourd\'hui, triés pour vous : d\'abord les favoris et récents, puis les autres. Une barre de recherche vous laisse trouver un nom ou une cuisine.',
    icon: <Utensils size={32} />,
    accent: 'bg-orange-50 text-brand-orange',
  },
  {
    title: '🔥 Feed — Actu + vos Tips',
    description: 'Le fil des nouveautés : nouveaux camions, publications LëtzTrack, et en haut votre score du jour aux Tips (quiz) avec un bouton Jouer si pas encore fait.',
    icon: <Flame size={32} />,
    accent: 'bg-pink-50 text-brand-pink',
  },
  {
    title: '❤️ Taste — Votre histoire gustative',
    description: 'Votre carnet personnel : top cuisines, jours préférés, dernières visites, stats fun. Plus vous validez de « Grub » dans l\'app, plus vos goûts se dessinent.',
    icon: <Heart size={32} />,
    accent: 'bg-pink-50 text-brand-pink',
  },
  {
    title: '🪙 Tips — Testez vos connaissances',
    description: 'Un mini-quiz par jour pour gagner des Tips. Le quiz change chaque jour, et votre meilleur score s\'affiche dans Feed.',
    icon: <Coins size={32} />,
    accent: 'bg-amber-50 text-amber-700',
  },
  {
    title: '📣 Spot — Signalez un food truck',
    description: 'Vous croisez un camion absent de LëtzTrack ? En 30 secondes vous le signalez avec sa position, une photo et un avis. L\'équipe valide puis il apparaît pour tous.',
    icon: <Megaphone size={32} />,
    accent: 'bg-green-50 text-green-700',
  },
  {
    title: '🗺️ « Y aller » — Trajet le plus rapide',
    description: 'Sur chaque fiche truck, un gros bouton « Y aller » ouvre un comparatif 4 modes (voiture, vélo, pied, bus) avec le temps estimé. Le trajet le plus rapide est mis en avant et s\'ouvre dans Google Maps, Apple Plan ou en mode transit CFL en 1 clic.',
    icon: <Navigation2 size={32} />,
    accent: 'bg-blue-50 text-brand-blue',
  },
  {
    title: '📍 Votre profil — Vous retrouver partout',
    description: 'Votre compte est synchronisé dans le cloud : connectez-vous depuis n\'importe quel appareil, vos favoris, votre historique et vos Tips vous suivent. Vous pouvez éditer votre profil à tout moment.',
    icon: <UserIcon size={32} />,
    accent: 'bg-brand-text/10 text-brand-text',
  },
  {
    title: 'C\'est parti ! 🚀',
    description: 'Vous savez tout. Le bouton ? en bas à droite vous ramène ici si besoin. Bon appétit et bonne découverte sur LëtzTrack !',
    icon: <Sparkles size={36} />,
    accent: 'bg-brand-gradient text-white',
    cta: 'Commencer à explorer',
  },
];

export const AppTour: React.FC<AppTourProps> = ({ onClose }) => {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;
  const isFirst = idx === 0;

  const finish = () => {
    try { localStorage.setItem('foodtrack_tour_seen', '1'); } catch { /* ignore */ }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-slide-up">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Close en haut à droite */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-brand-border">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === idx ? 'w-6 bg-brand-gradient' : i < idx ? 'w-2 bg-brand-orange/50' : 'w-2 bg-gray-200'}`} />
            ))}
          </div>
          <button onClick={finish} className="text-xs font-bold text-brand-muted hover:text-brand-text">
            Passer
          </button>
        </div>

        {/* Contenu du slide */}
        <div className="p-6 flex-1 min-h-[300px] flex flex-col">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-glow ${slide.accent}`}>
            {slide.icon}
          </div>

          <h2 className="font-display text-2xl text-brand-text text-center leading-tight mb-3">{slide.title}</h2>
          <p className="text-sm text-brand-muted text-center leading-relaxed">{slide.description}</p>

          <div className="flex-1" />

          {/* Progression texte */}
          <p className="text-[10px] text-brand-muted text-center font-bold uppercase tracking-widest mt-6">
            {idx + 1} / {SLIDES.length}
          </p>
        </div>

        {/* Boutons de navigation */}
        <div className="p-4 border-t border-brand-border flex gap-2">
          {!isFirst && (
            <button
              onClick={() => setIdx(i => Math.max(0, i - 1))}
              className="flex-1 py-3 rounded-xl bg-brand-bg border border-brand-border font-bold text-sm text-brand-text flex items-center justify-center gap-1 hover:border-brand-orange"
            >
              <ChevronLeft size={16} /> Précédent
            </button>
          )}
          {isLast ? (
            <button
              onClick={finish}
              className="flex-1 py-3 rounded-xl bg-brand-gradient text-white font-bold shadow-glow flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> {slide.cta || 'C\'est parti !'}
            </button>
          ) : (
            <button
              onClick={() => setIdx(i => Math.min(SLIDES.length - 1, i + 1))}
              className="flex-1 py-3 rounded-xl bg-brand-gradient text-white font-bold shadow-glow flex items-center justify-center gap-1"
            >
              Suivant <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
