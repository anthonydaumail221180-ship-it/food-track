import React, { useEffect, useState } from 'react';
import { fetchFeed, FeedPost } from '../services/reportsService';

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  if (m < 1440) return `il y a ${Math.round(m / 60)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
};

export const NewsFeed: React.FC = () => {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  useEffect(() => { fetchFeed().then(setPosts); }, []);

  return (
    <div className="max-w-md mx-auto pb-24 animate-slide-up">
      <h1 className="font-display text-3xl text-brand-text mb-1">Actu</h1>
      <p className="text-sm text-gray-500 mb-5">Ce qui se passe sur LëtzTrack : chaque nouveau camion et les nouveautés de la plateforme.</p>

      {posts === null && <p className="text-center text-gray-400 text-sm animate-pulse py-10">Chargement…</p>}
      {posts && posts.length === 0 && <p className="text-center text-gray-400 text-sm py-10">Pas encore d'actualité. Revenez vite !</p>}

      <div className="space-y-4">
        {posts?.map(p => (
          <article key={p.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-brand-gradient flex items-center justify-center text-white font-display text-lg">L</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-brand-text">LëtzTrack</p>
                <p className="text-[11px] text-gray-400">{ago(p.ts)}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${p.kind === 'truck' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-brand-orange'}`}>{p.kind === 'truck' ? 'Nouveau camion' : 'Actu'}</span>
            </div>
            <h2 className="font-bold text-brand-text leading-snug">{p.title}</h2>
            {p.body && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{p.body}</p>}
          </article>
        ))}
      </div>
    </div>
  );
};
