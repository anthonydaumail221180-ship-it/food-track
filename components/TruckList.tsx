
import React, { useState, useMemo } from 'react';
import { truckImage } from '../services/truckImage';
import { FoodTruck, CheckIn } from '../types';
import { MapPin, Star, Navigation, Heart, Filter, ArrowDownUp, ExternalLink, Clock } from 'lucide-react';
import { AdBanner } from './AdBanner';

interface TruckListProps {
  trucks: FoodTruck[];
  onNavigate: (truck: FoodTruck) => void;
  onTruckClick: (truck: FoodTruck) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  loading: boolean;
  userLocation: { lat: number; lng: number } | null;
  sources: string[];
  history: CheckIn[];
}

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

export const TruckList: React.FC<TruckListProps> = ({ trucks, onNavigate, onTruckClick, favorites, toggleFavorite, loading, userLocation, sources, history }) => {
  const [sortBy, setSortBy] = useState<'default' | 'distance' | 'visited'>('default');

  // Derived Data: Filtered & Sorted Trucks
  const displayTrucks = useMemo(() => {
      let result = [...trucks];

      // Sort
      if (sortBy === 'distance' && userLocation) {
          result.sort((a, b) => {
              const distA = a.coordinates ? getDistance(userLocation.lat, userLocation.lng, a.coordinates.lat, a.coordinates.lng) : 99999;
              const distB = b.coordinates ? getDistance(userLocation.lat, userLocation.lng, b.coordinates.lat, b.coordinates.lng) : 99999;
              return distA - distB;
          });
      } else if (sortBy === 'visited') {
          // Sort by most recently visited in history
          result.sort((a, b) => {
              const lastVisitA = history.find(h => h.truckId === a.id)?.date || '';
              const lastVisitB = history.find(h => h.truckId === b.id)?.date || '';
              // If neither visited, keep original order (or sort by id)
              if (!lastVisitA && !lastVisitB) return 0;
              if (!lastVisitA) return 1;
              if (!lastVisitB) return -1;
              return lastVisitB.localeCompare(lastVisitA); // Descending date
          });
      }

      return result;
  }, [trucks, sortBy, userLocation, history]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
        <p className="text-brand-muted text-sm font-bold">Mise en place en cuisine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 w-full">
      {/* Ad Banner */}
      <div className="mb-6">
          <AdBanner />
      </div>

      {/* Filter Bar - Simplified: No Cuisines */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-sm py-3 border-b border-gray-50">
          <div className="flex flex-wrap items-center gap-2 justify-start">
            {/* Sort Controls */}
            <button 
                onClick={() => setSortBy('default')}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 border transition ${sortBy === 'default' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
            >
                <Filter size={12} /> Tous
            </button>
            <button 
                onClick={() => setSortBy('distance')}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 border transition ${sortBy === 'distance' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
            >
                <ArrowDownUp size={12} /> Distance
            </button>
            <button 
                onClick={() => setSortBy('visited')}
                className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 border transition ${sortBy === 'visited' ? 'bg-brand-pink text-white border-brand-pink' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
            >
                <Clock size={12} /> Récents
            </button>
          </div>
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
                <div key={truck.id} className="bg-white rounded-3xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 flex gap-4 relative animate-slide-up group hover:border-brand-pink/30 hover:shadow-xl transition-all">
                    <img 
                        src={truckImage(truck)} 
                        alt={truck.name} 
                        className="w-28 h-28 rounded-2xl object-cover flex-shrink-0 cursor-pointer shadow-sm group-hover:scale-105 transition-transform duration-500"
                        onClick={() => onTruckClick(truck)}
                    />
                    <div className="flex-1 flex flex-col justify-between">
                        <div onClick={() => onTruckClick(truck)} className="cursor-pointer">
                            <div className="flex justify-between items-start pr-8">
                                <h3 className="font-bold text-xl text-brand-text leading-tight line-clamp-1">{truck.name}</h3>
                            </div>
                            <div className="flex gap-2 items-center mt-1.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${truck.isOpen ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {truck.isOpen ? 'Service' : 'Fermé'}
                                </span>
                                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide truncate">{truck.cuisine}</span>
                            </div>
                            <p className="text-xs text-gray-400 line-clamp-2 mt-2 leading-relaxed">{truck.description}</p>
                            
                            {lastVisit && (
                                <p className="text-[10px] text-brand-pink font-bold mt-2 flex items-center gap-1">
                                    <Clock size={10} /> Visité le {new Date(lastVisit.date).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center text-xs text-gray-500">
                                <MapPin size={14} className="mr-1 text-brand-pink" />
                                <span className="truncate max-w-[80px]">{truck.locationName}</span>
                                {distance && <span className="ml-1 font-bold text-brand-orange">({distance}km)</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                {truck.rating > 0 && (<div className="flex items-center text-yellow-400 bg-yellow-50 px-1.5 py-0.5 rounded-md">
                                    <Star size={12} fill="currentColor" />
                                    <span className="text-xs font-bold ml-0.5 text-yellow-700">{truck.rating}</span>
                                </div>)}
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onNavigate(truck);
                                    }}
                                    className="bg-gray-50 text-gray-400 p-2 rounded-xl hover:bg-brand-gradient hover:text-white transition"
                                    title="Itinéraire"
                                >
                                    <Navigation size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(truck.id);
                        }}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white hover:bg-gray-50 transition shadow-sm border border-gray-100"
                    >
                        <Heart 
                            size={18} 
                            className={isFav ? "text-brand-red fill-brand-red" : "text-gray-300"} 
                        />
                    </button>
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
