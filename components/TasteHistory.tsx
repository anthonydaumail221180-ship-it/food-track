import React, { useMemo } from 'react';
import { Heart, Utensils, TrendingUp, Clock, Award, User as UserIcon, Coins } from 'lucide-react';
import { UserProfile, CheckIn } from '../types';

interface TasteHistoryProps {
  user: UserProfile | undefined;
  onPlayQuiz: () => void;
}

// Petites phrases automatiques selon les stats (gamification douce)
const compliment = (count: number, topCuisine?: string) => {
  if (count === 0) return "Pas encore de Grub validé — commencez par un food truck depuis la liste !";
  if (count === 1) return "Votre toute première fois sur LëtzTrack 🎉 Revenez souvent, vos goûts se dessinent au fil des visites.";
  if (count < 5) return topCuisine ? `Vous aimez clairement ${topCuisine} 👀` : "Vous commencez à construire vos habitudes.";
  if (count < 15) return topCuisine ? `Fidèle au ${topCuisine} !` : "Vous explorez bien la scène food truck de Luxembourg.";
  return topCuisine ? `Expert ${topCuisine} de Luxembourg 🏆` : "Vous êtes un vrai explorateur de la scène.";
};

export const TasteHistory: React.FC<TasteHistoryProps> = ({ user, onPlayQuiz }) => {
  const history: CheckIn[] = user?.history || [];

  // Agrège les goûts : cuisines et plats par fréquence
  const stats = useMemo(() => {
    const items: Record<string, number> = {};
    const days: Record<string, number> = {}; // par jour de semaine
    for (const h of history) {
      const key = (h.itemName || '').trim().toLowerCase();
      if (key) items[key] = (items[key] || 0) + 1;
      try {
        const d = new Date(h.date).toLocaleDateString('fr-FR', { weekday: 'long' });
        days[d] = (days[d] || 0) + 1;
      } catch { /* ignore */ }
    }
    const topItems = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topDays = Object.entries(days).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { topItems, topDays, total: history.length };
  }, [history]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto pb-24 animate-slide-up text-center p-6">
        <div className="w-16 h-16 rounded-full bg-brand-pink/15 mx-auto flex items-center justify-center mb-3">
          <Heart className="text-brand-pink" size={28} />
        </div>
        <h1 className="font-display text-3xl text-brand-text mb-2">Taste</h1>
        <p className="text-sm text-brand-muted leading-relaxed">
          Connectez-vous pour construire votre historique gustatif et débloquer les statistiques fun sur vos goûts.
        </p>
      </div>
    );
  }

  const topCuisine = stats.topItems[0]?.[0];

  return (
    <div className="max-w-md mx-auto pb-24 animate-slide-up">
      {/* En-tête */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-brand-pink/15 flex items-center justify-center flex-shrink-0">
          <Heart className="text-brand-pink" size={24} />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-3xl text-brand-text leading-tight">Taste</h1>
          <p className="text-xs text-brand-muted">Votre histoire gustative sur LëtzTrack</p>
        </div>
      </div>

      {/* Hero stat */}
      <section className="bg-brand-gradient text-white rounded-3xl p-5 shadow-glow mb-5">
        <p className="text-xs uppercase tracking-widest text-white/85 font-bold mb-1">Au total</p>
        <p className="font-display text-5xl leading-none">{stats.total}</p>
        <p className="text-sm font-bold mt-1">Grub{stats.total > 1 ? 's' : ''} validé{stats.total > 1 ? 's' : ''}</p>
        <p className="text-xs text-white/90 mt-3 leading-relaxed">{compliment(stats.total, topCuisine)}</p>
      </section>

      {/* Top plats / cuisines */}
      {stats.topItems.length > 0 && (
        <section className="bg-white rounded-3xl p-5 border border-brand-border mb-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand-text mb-3">
            <TrendingUp size={16} className="text-brand-orange" /> Vos goûts du moment
          </h2>
          <div className="space-y-2">
            {stats.topItems.map(([name, count], i) => {
              const pct = Math.round((count / stats.total) * 100);
              return (
                <div key={name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-bold text-brand-text capitalize truncate pr-2">{i === 0 && '🥇 '}{i === 1 && '🥈 '}{i === 2 && '🥉 '}{name}</span>
                    <span className="text-xs text-brand-muted flex-shrink-0">{count} fois · {pct}%</span>
                  </div>
                  <div className="h-2 bg-brand-bg rounded-full overflow-hidden">
                    <div className="h-full bg-brand-gradient" style={{ width: `${Math.max(8, pct)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Jours préférés */}
      {stats.topDays.length > 0 && (
        <section className="bg-white rounded-3xl p-5 border border-brand-border mb-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand-text mb-3">
            <Clock size={16} className="text-brand-blue" /> Vos jours préférés
          </h2>
          <div className="flex flex-wrap gap-2">
            {stats.topDays.map(([d, n]) => (
              <span key={d} className="px-3 py-1.5 rounded-full bg-brand-bg border border-brand-border text-xs font-bold text-brand-text capitalize">
                {d} <span className="text-brand-muted ml-1">· {n}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Dernières visites */}
      {history.length > 0 && (
        <section className="bg-white rounded-3xl p-5 border border-brand-border mb-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-brand-text mb-3">
            <Award size={16} className="text-brand-pink" /> Vos dernières visites
          </h2>
          <ul className="space-y-3">
            {history.slice(0, 8).map(h => (
              <li key={h.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-bg flex items-center justify-center flex-shrink-0">
                  <Utensils size={16} className="text-brand-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-brand-text truncate">{h.itemName}</p>
                  <p className="text-xs text-brand-muted truncate">{h.truckName}</p>
                </div>
                <p className="text-[11px] text-brand-muted flex-shrink-0">{new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* État vide : nudge vers le quiz */}
      {history.length === 0 && (
        <section className="bg-white rounded-3xl p-5 border border-brand-border mb-4 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-orange/10 mx-auto flex items-center justify-center mb-3">
            <Coins className="text-brand-orange" size={24} />
          </div>
          <h2 className="font-display text-xl text-brand-text mb-2">En attendant votre premier Grub…</h2>
          <p className="text-sm text-brand-muted mb-4">Testez vos connaissances food truck et gagnez des Tips.</p>
          <button onClick={onPlayQuiz} className="w-full bg-brand-gradient text-white py-3 rounded-xl font-bold shadow-glow">Jouer aux Tips</button>
        </section>
      )}

      {/* Signature identité */}
      <section className="flex items-center justify-center gap-2 text-xs text-brand-muted pt-3">
        <UserIcon size={12} /> {user.nickname || user.firstName}
      </section>
    </div>
  );
};
