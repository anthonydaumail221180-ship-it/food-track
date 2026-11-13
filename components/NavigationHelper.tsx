
import React, { useEffect, useState } from 'react';
import { FoodTruck } from '../types';
import { getTransportAdvice } from '../services/geminiService';
import { Bus, Map, ExternalLink } from 'lucide-react';

interface NavigationHelperProps {
  targetTruck: FoodTruck | null;
  onBack: () => void;
}

export const NavigationHelper: React.FC<NavigationHelperProps> = ({ targetTruck, onBack }) => {
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [advice, setAdvice] = useState<string>("");
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  }, []);

  useEffect(() => {
    if (location && targetTruck) {
        setLoadingAdvice(true);
        getTransportAdvice(location.lat, location.lng, targetTruck.locationName)
            .then(setAdvice)
            .finally(() => setLoadingAdvice(false));
    }
  }, [location, targetTruck]);

  if (!targetTruck) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500">
            <Map size={48} className="mb-4 opacity-20" />
            <p>Sélectionnez un camion sur l'accueil pour planifier votre trajet.</p>
            <button onClick={onBack} className="mt-4 text-brand-blue font-bold">Retour Accueil</button>
        </div>
    )
  }

  const mobiliteitLink = `https://www.mobiliteit.lu/en/plan-a-trip/?from=${location?.lat},${location?.lng}&to=${targetTruck.locationName}`;

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10 flex items-center gap-2 shadow-sm">
        <button onClick={onBack} className="text-gray-500 font-bold text-sm hover:text-black">
            &larr; Retour
        </button>
        <h2 className="font-bold text-lg flex-1 text-center">Trajet vers {targetTruck.name}</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Carte OpenStreetMap */}
        {targetTruck.coordinates && (() => {
          const { lat, lng } = targetTruck.coordinates;
          const d = 0.004;
          return (
            <div className="space-y-2">
              <iframe title="Carte" className="w-full h-56 rounded-xl border border-gray-200"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`} />
              <a href={`https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`} target="_blank" rel="noreferrer"
                className="block w-full text-center py-3 rounded-xl bg-brand-gradient text-white font-bold text-sm">
                Itinéraire à pied
              </a>
            </div>
          );
        })()}

        {/* AI Agent Advice */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-brand-blue rounded-full flex items-center justify-center text-white">
                    <Bus size={14} />
                </div>
                <h3 className="font-bold text-blue-900 text-sm">Conseil Transport IA</h3>
            </div>
            {loadingAdvice ? (
                <p className="text-sm text-blue-700 italic">Analyse des options Mobiliteit...</p>
            ) : (
                <p className="text-sm text-blue-800 leading-relaxed">
                    {advice}
                </p>
            )}
        </div>

        {/* Mobiliteit CTA */}
        <div className="space-y-3">
             <a 
                href={mobiliteitLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-brand-gradient text-white text-center py-3 rounded-xl font-bold shadow-lg shadow-brand-pink/30 hover:opacity-90 transition flex items-center justify-center gap-2"
            >
                Ouvrir l'app Mobiliteit <ExternalLink size={18} />
            </a>
            <p className="text-xs text-center text-gray-400">
                Redirige vers le service externe Mobiliteit.lu
            </p>
        </div>
      </div>
    </div>
  );
};
