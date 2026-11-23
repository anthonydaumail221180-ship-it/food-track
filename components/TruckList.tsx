
import React, { useState, useMemo, useEffect } from 'react';
import { truckImage } from '../services/truckImage';
import { FoodTruck, CheckIn } from '../types';
import { MapPin, Star, Navigation, Heart, Filter, ArrowDownUp, ExternalLink, Clock, Search, X, Share2 } from 'lucide-react';
import { AdBanner } from './AdBanner';

interface TruckListProps {
  trucks: FoodTruck[];
  onNavigate: (truck: FoodTruck) => void;
  onTruckClick: (truck: FoodTruck) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  onShare?: (truck: FoodTruck) => void;
  loading: boolean;
  userLocation: { lat: number; lng: number } | null;
  sources: string[];
  history: CheckIn[];
}

// Récupère les truck_ids récemment consultés (depuis localStorage, mis à jour par App.tsx au clic)
const loadRecentViews = (): string[] => {
  try {
    const raw = localStorage.getItem('foodtrack_recent_views');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x: any) => typeof x === 'string');
  } catch { return []; }
};

// Helper: Calculate distance in km using Haversine
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c;
}

export const TruckList: React.FC<TruckListProps> = ({ trucks, onNavigate, onTruckClick, favorites, toggleFavorite, onShare, loading, userLocation, sources, history }) => {
  const [sortBy, setSortBy] = useState<'default' | 'distance'>('default');
  const [search, setSearch] = useState('');
  const [recentViews, setRecentViews] = useState<string[]>(() => loadRecentViews());

  // Rafraîchit recentViews quand la liste des trucks change (après un clic qui a bougé l'ordre)
  useEffect(() => {
      setRecentViews(loadRecentViews());
  }, [trucks]);

  // Derived Data: Filtered & Sorted Trucks
  const displayTrucks = useMemo(() => {
      // 1) Filtre texte (nom, cuisine, adresse)
      const q = search.trim().toLowerCase();
      let result = q
        ? trucks.filter(t =>
            t.name.toLowerCase().includes(q) ||
            (t.cuisine || '').toLowerCase().includes(q) ||
            (t.locationName || '').toLowerCase().includes(q))
        : [...trucks];

      // 2) Tri
      if (sortBy === 'distance' && userLocation) {
          result.sort((a, b) => {
              const distA = a.coordinates ? getDistance(userLocation.lat, userLocation.lng, a.coordinates.lat, a.coordinates.lng) : 99999;
              const distB = b.coordinates ? getDistance(userLocation.lat, userLocation.lng, b.coordinates.lat, b.coordinates.lng) : 99999;
              return distA - distB;
          });
      } else {
          // Tri par défaut : priorité aux favoris + derniers consultés (ordre : recentViews desc, favoris)
          // Puis derniere visite via history, puis ordre original (LIVE restent au top grâce à App.tsx)
          const recentIdx: Record<string, number> = {};
          recentViews.forEach((id, i) => { recentIdx[id] = i; });
          const historyIdx: Record<string, string> = {};
          history.forEach(h => { if (!historyIdx[h.truckId] || h.date > historyIdx[h.truckId]) historyIdx[h.truckId] = h.date; });

          const scoreOf = (t: FoodTruck): number => {
              let s = 0;
              if (recentIdx[t.id] !== undefined) s += 1000 - recentIdx[t.id]; // plus récent = plus haut
              if (favorites.includes(t.id)) s += 500;
              if (historyIdx[t.id]) s += 100;
              return s;
          };
          // Tri stable (les LIVE ont déjà la pole position dans l'ordre d'entrée)
          const withScore = result.map((t, i) => ({ t, i, s: scoreOf(t) }));
          withScore.sort((a, b) => b.s - a.s || a.i - b.i);
          result = withScore.map(x => x.t);
      }

      return result;
  }, [trucks, sortBy, userLocation, history, recentViews, favorites, search]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
        <p className="text-brand-muted text-sm font-bold">Mise en place en cuisine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 w-full max-w-6xl mx-auto">
      {/* Ad Banner */}
      <div className="mb-6">
          <AdBanner />
      </div>

      <div className="px-1">
        <h1 className="font-display text-4xl text-brand-text leading-none">Ce midi</h1>
        <p className="text-sm text-brand-muted mt-1 capitalize">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {trucks.length} food truck{trucks.length > 1 ? 's' : ''}</p>
      </div>

      {/* Filter Bar : Tous / Distance + champ de recherche */}
      <div className="sticky top-16 z-30 bg-brand-bg/85 backdrop-blur-md py-3 border-b border-brand-border/60 space-y-2">
          <div className="flex flex-wrap items-center gap-2 justify-start">
            <button
                onClick={() => setSortBy('default')}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 border transition ${sortBy === 'default' ? 'bg-brand-text text-white border-brand-text shadow-card' : 'bg-white text-gray-500 border-brand-border'}`}
                title="Favoris et récents en priorité"
            >
                <Filter size={12} /> Pour moi
            </button>
            <button
                onClick={() => setSortBy('distance')}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 border transition ${sortBy === 'distance' ? 'bg-brand-gradient text-white border-transparent shadow-glow' : 'bg-white text-gray-500 border-brand-border'}`}
            >
                <ArrowDownUp size={12} /> Distance
            </button>

            {/* Champ de recherche (remplace l'ancien bouton Récents) */}
            <div className="relative flex-1 min-w-[180px]">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un nom, une cuisine..."
                className="w-full pl-9 pr-9 py-2 rounded-full border border-brand-border bg-white text-sm text-brand-text focus:outline-none focus:border-brand-orange"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-brand-bg flex items-center justify-center text-brand-muted" aria-label="Effacer">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          {search && (
            <p className="text-[11px] text-brand-muted px-1">{displayTrucks.length} résultat{displayTrucks.length > 1 ? 's' : ''} pour « {search} »</p>
          )}
      </div>

      {displayTrucks.length === 0 && (
          <div className="text-center py-10 text-gray-400">
              <p>Le garde-manger est vide.</p>
          </div>
      )}

      {/* GRID LAYOUT: 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayTrucks.map((truck) => {
            const isFav = favorites.includes(truck.id);
            const distance = (userLocation && truck.coordinates) 
                ? getDistance(userLocation.lat, userLocation.lng, truck.coordinates.lat, truck.coordinates.lng).toFixed(1)
                : null;
            const lastVisit = history.find(h => h.truckId === truck.id);

            return (
                <div key={truck.id} className="bg-white rounded-[28px] p-4 shadow-card border border-brand-border/70 flex gap-3 relative animate-slide-up group hover:-translate-y-0.5 hover:shadow-glow/30 transition-all overflow-hidden">
                    <img
                        src={truckImage(truck)}
                        alt={truck.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover flex-shrink-0 cursor-pointer shadow-card ring-2 ring-white"
                        onClick={() => onTruckClick(truck)}
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div onClick={() => onTruckClick(truck)} className="cursor-pointer min-w-0">
                            <div className="flex justify-between items-start pr-10 min-w-0">
                                <h3 className="font-bold text-lg text-brand-text leading-tight truncate min-w-0 flex-1">{truck.name}</h3>
                            </div>
                            <div className="flex gap-2 items-center mt-1.5 min-w-0 overflow-hidden">
                                {truck.status ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-50 text-amber-700 flex-shrink-0">
                                        {truck.status === 'pending' ? 'En attente' : 'Non retenu'}
                                    </span>
                                ) : truck.aiDetected ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 bg-gradient-to-r from-brand-orange to-brand-pink text-white flex items-center gap-1" title={truck.aiNote || 'Détecté automatiquement par IA via Instagram/Facebook'}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>LIVE · IA
                                    </span>
                                ) : (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${truck.isOpen ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        {truck.isOpen ? 'Service' : 'Fermé'}
                                    </span>
                                )}
                                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide truncate min-w-0 flex-1">{truck.cuisine}</span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2 mt-2 leading-relaxed break-words">{truck.description}</p>

                            {lastVisit && (
                                <p className="text-[10px] text-brand-pink font-bold mt-2 flex items-center gap-1 truncate">
                                    <Clock size={10} className="flex-shrink-0" /> <span className="truncate">Visité le {new Date(lastVisit.date).toLocaleDateString()}</span>
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-3 gap-2 min-w-0">
                            <div className="flex items-center text-xs text-gray-500 min-w-0 flex-1">
                                <MapPin size={14} className="mr-1 text-brand-pink flex-shrink-0" />
                                <span className="truncate min-w-0">{truck.locationName}</span>
                                {distance && <span className="ml-1 font-bold text-brand-orange flex-shrink-0">({distance}km)</span>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {truck.rating > 0 && (<div className="flex items-center text-yellow-400 bg-yellow-50 px-1.5 py-0.5 rounded-md">
                                    <Star size={12} fill="currentColor" />
                                    <span className="text-xs font-bold ml-0.5 text-yellow-700">{truck.rating}</span>
                                </div>)}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onNavigate(truck);
                                    }}
                                    className="bg-brand-bg text-brand-pink p-2 rounded-xl hover:bg-brand-gradient hover:text-white transition"
                                    title="Itinéraire"
                                >
                                    <Navigation size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(truck.id);
                            }}
                            className="p-2 rounded-full bg-white hover:bg-gray-50 transition shadow-sm border border-gray-100"
                            aria-label="Favori"
                        >
                            <Heart
                                size={18}
                                className={isFav ? "text-brand-red fill-brand-red" : "text-gray-300"}
                            />
                        </button>
                        {onShare && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onShare(truck); }}
                                className="p-2 rounded-full bg-white hover:bg-gray-50 transition shadow-sm border border-gray-100"
                                aria-label="Partager"
                            >
                                <Share2 size={16} className="text-brand-blue" />
                            </button>
                        )}
                    </div>
                </div>
            );
        })}
      </div>

      {/* Sources Footer */}
      {sources.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-xl p-4 text-xs text-gray-500 border border-gray-100">
            <p className="font-bold uppercase tracking-wider mb-2 flex items-center gap-1 text-brand-text">
                <ExternalLink size={12} /> Ingrédients de la recherche (IA)
            </p>
            <div className="flex flex-wrap gap-2">
                {sources.map((source, idx) => {
                    let hostname = source;
                    try { hostname = new URL(source).hostname; } catch (e) {}
                    return (
                         <a key={idx} href={source} target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-200 px-2 py-1 rounded text-[10px] hover:text-brand-pink hover:border-brand-pink transition">
                            {hostname}
                        </a>
                    );
                })}
            </div>
        </div>
      )}
    </div>
  );
};
