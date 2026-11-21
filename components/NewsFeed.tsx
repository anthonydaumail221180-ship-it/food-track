import React, { useEffect, useState } from 'react';
import { fetchFeed, FeedPost } from '../services/reportsService';
import { Coins, Play, RotateCcw, Trophy } from 'lucide-react';

interface NewsFeedProps {
  onPlayQuiz: () => void;
}

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  if (m < 1440) return `il y a ${Math.round(m / 60)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

// Le widget "Tips du jour" en haut du Feed :
// - Si l'utilisateur a joué aujourd'hui : son score + bouton Rejouer
// - Sinon : CTA pour jouer
const TipsWidget: React.FC<{ onPlayQuiz: () => void }> = ({ onPlayQuiz }) => {
  const [last, setLast] = useState<{ score: number; ts: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ft_last_tips_score');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.score === 'number' && typeof parsed.ts === 'number') {
        setLast(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const playedToday = last && new Date(last.ts).toDateString() === new Date().toDateString();

  if (playedToday && last) {
    return (
      <section className="bg-brand-gradient text-white rounded-3xl p-5 shadow-glow mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Trophy size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/85">Vos Tips d'aujourd'hui</p>
            <p className="font-display text-3xl leading-none">{last.score}</p>
          </div>
        </div>
        <p className="text-xs text-white/90 mb-3">{last.score >= 5 ? "Excellent score 🎉" : last.score >= 3 ? "Pas mal, revenez pour mieux faire !" : "Ne lâchez rien, les Tips reviennent chaque jour."}</p>
        <button onClick={onPlayQuiz} className="w-full py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold flex items-center justify-center gap-2 transition">
          <RotateCcw size={16} /> Rejouer
        </button>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-3xl p-5 border border-brand-border mb-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-brand-orange/10 flex items-center justify-center flex-shrink-0">
          <Coins className="text-brand-orange" size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-bold text-brand-muted">Tips du jour</p>
          <p className="font-display text-xl text-brand-text leading-tight">Testez vos connaissances food truck</p>
        </div>
      </div>
      <button onClick={onPlayQuiz} className="mt-3 w-full py-3 rounded-xl bg-brand-gradient text-white font-bold shadow-glow flex items-center justify-center gap-2">
        <Play size={16} /> Jouer
      </button>
    </section>
  );
};

export const NewsFeed: React.FC<NewsFeedProps> = ({ onPlayQuiz }) => {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  useEffect(() => { fetchFeed().then(setPosts); }, []);

  return (
    <div className="max-w-md mx-auto pb-24 animate-slide-up">
      <h1 className="font-display text-3xl text-brand-text mb-1">Feed</h1>
      <p className="text-sm text-brand-muted mb-5">Vos Tips, les publications de la communauté et les nouveautés de LëtzTrack.</p>

      {/* Widget Tips (score ou CTA Jouer) */}
      <TipsWidget onPlayQuiz={onPlayQuiz} />

      {/* Publications */}
      {posts === null && <p className="text-center text-brand-muted text-sm animate-pulse py-10">Chargement…</p>}
      {posts && posts.length === 0 && <p className="text-center text-brand-muted text-sm py-10">Pas encore de publication. Revenez vite !</p>}

      <div className="space-y-4">
        {posts?.map(p => (
          <article key={p.id} className="bg-white rounded-3xl border border-brand-border shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-white font-display text-lg">L</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-brand-text">LëtzTrack</p>
                <p className="text-[11px] text-brand-muted">{ago(p.ts)}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${p.kind === 'truck' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-brand-orange'}`}>{p.kind === 'truck' ? 'Nouveau camion' : 'Actu'}</span>
            </div>
            <h2 className="font-bold text-brand-text leading-snug">{p.title}</h2>
            {p.body && <p className="text-sm text-brand-muted mt-1 leading-relaxed">{p.body}</p>}
          </article>
        ))}
      </div>
    </div>
  );
};
