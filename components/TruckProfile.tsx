
import React, { useEffect, useState } from 'react';
import { truckImage } from '../services/truckImage';
import { FoodTruck, MenuItem, CheckIn } from '../types';
import { fetchTruckMenuAgent } from '../services/geminiService';
import { MapPin, Star, Phone, Globe, Clock, ArrowLeft, Heart, Edit3, Utensils, Send, UserPlus, Navigation2 } from 'lucide-react';

interface TruckProfileProps {
  truck: FoodTruck;
  onBack: () => void;
  toggleFavorite: (id: string) => void;
  isFavorite: boolean;
  onCheckIn: (checkIn: CheckIn) => void;
  onNavigate?: (truck: FoodTruck) => void;
}

export const TruckProfile: React.FC<TruckProfileProps> = ({ truck, onBack, toggleFavorite, isFavorite, onCheckIn, onNavigate }) => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  
  // Check-In Modal State
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [friendName, setFriendName] = useState("");
  const [friendPhone, setFriendPhone] = useState("");

  useEffect(() => {
    const loadMenu = async () => {
        setLoadingMenu(true);
        const items = await fetchTruckMenuAgent(truck.name, truck.cuisine);
        setMenu(items);
        setLoadingMenu(false);
    };
    loadMenu();
  }, [truck]);

  const handleCheckInSubmit = () => {
      if (!selectedItem) return;
      
      const newCheckIn: CheckIn = {
          id: Date.now().toString(),
          truckId: truck.id,
          truckName: truck.name,
          itemName: selectedItem.name,
          date: new Date().toISOString(),
          taggedFriend: friendName ? {
              name: friendName,
              phone: friendPhone,
              status: 'unknown' // Default to unknown for simulation
          } : undefined
      };

      onCheckIn(newCheckIn);

      if (friendPhone) {
          alert(`SMS simulé envoyé à ${friendPhone} : "Salut ${friendName} ! Je viens de manger ${selectedItem.name} chez ${truck.name}. Télécharge LëtzTrack pour voir !"`);
      }

      setSelectedItem(null);
      setFriendName("");
      setFriendPhone("");
  };

  return (
    <div className="bg-white min-h-screen pb-24 relative">
        {/* Check-In Modal */}
        {selectedItem && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-slide-up">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                    <h3 className="font-display text-2xl text-brand-text mb-1">Grub ! 😋</h3>
                    <p className="text-gray-500 text-sm mb-4">Vous avez dégusté : <span className="font-bold text-brand-orange">{selectedItem.name}</span></p>
                    
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                             <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Avec qui ? (Optionnel)</label>
                             <div className="flex gap-2 mb-2">
                                <UserPlus size={18} className="text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Nom de l'ami"
                                    className="bg-transparent w-full text-sm outline-none"
                                    value={friendName}
                                    onChange={(e) => setFriendName(e.target.value)}
                                />
                             </div>
                             {friendName && (
                                 <div className="flex gap-2 border-t border-gray-200 pt-2">
                                     <Phone size={18} className="text-gray-400" />
                                     <input 
                                         type="tel" 
                                         placeholder="Son n° de téléphone"
                                         className="bg-transparent w-full text-sm outline-none"
                                         value={friendPhone}
                                         onChange={(e) => setFriendPhone(e.target.value)}
                                     />
                                 </div>
                             )}
                        </div>
                        {friendPhone && (
                            <p className="text-[10px] text-brand-blue flex items-center gap-1">
                                <Send size={10} /> Un SMS d'invitation sera envoyé.
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2 mt-6">
                        <button 
                            onClick={() => setSelectedItem(null)}
                            className="flex-1 py-3 text-gray-500 font-bold text-sm bg-gray-100 rounded-xl hover:bg-gray-200"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={handleCheckInSubmit}
                            className="flex-1 py-3 text-white font-bold text-sm bg-brand-gradient rounded-xl shadow-lg hover:opacity-90"
                        >
                            Valider
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Hero Image */}
        <div className="relative h-72">
            <img 
                src={truckImage(truck)} 
                alt={truck.name} 
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30"></div>
            <button onClick={onBack} className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition">
                <ArrowLeft size={24} />
            </button>
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex justify-between items-end">
                    <div>
                        <span className="bg-brand-gradient text-[10px] font-bold px-2 py-1 rounded-md text-white uppercase tracking-wide mb-2 inline-block shadow-sm">{truck.cuisine}</span>
                        <h1 className="text-4xl font-display drop-shadow-md">{truck.name}</h1>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-200 font-medium">
                            <MapPin size={16} className="text-brand-orange" /> {truck.locationName}
                        </div>
                    </div>
                    <button 
                        onClick={() => toggleFavorite(truck.id)}
                        className="bg-white p-3 rounded-full shadow-lg text-brand-red hover:scale-105 transition"
                    >
                        <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>
        </div>

        <div className="p-6 space-y-8">
            {/* Bouton "Y aller" principal : ouvre le choix d'appli de nav externe */}
            {onNavigate && truck.coordinates && (
                <button
                    onClick={() => onNavigate(truck)}
                    className="w-full -mt-12 relative z-10 bg-brand-gradient text-white rounded-2xl p-4 shadow-glow flex items-center justify-center gap-3 font-bold active:scale-[0.98] transition-transform"
                >
                    <Navigation2 size={20} />
                    Y aller
                    <span className="text-xs font-normal opacity-85 hidden sm:inline">· Plan / Google / mobiliteit.lu</span>
                </button>
            )}

            {/* Info Section */}
            <div className="flex justify-between items-center py-2 rounded-2xl border-b border-gray-100 pb-6">
                <div className="text-center flex-1 border-r border-gray-100">
                    <div className="flex items-center justify-center gap-1 font-bold text-xl text-brand-text">
                        {truck.rating > 0 ? truck.rating : '–'} <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Avis</div>
                </div>
                 <div className="text-center flex-1 border-r border-gray-100">
                    <div className="font-bold text-lg text-green-600">Ouvert</div>
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Jusqu'à 22:00</div>
                </div>
                 <div className="text-center flex-1">
                    <div className="font-bold text-lg text-brand-text">15m</div>
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Attente</div>
                </div>
            </div>

            {/* Description */}
            <div>
                <h3 className="font-bold text-brand-text mb-2 text-lg">À propos</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{truck.description} Nous sommes fiers d'utiliser des ingrédients frais et locaux du Luxembourg.</p>
            </div>

            {/* Menu Section */}
            <div>
                <h3 className="font-bold text-brand-text mb-4 flex items-center justify-between text-lg">
                    La Carte
                    {loadingMenu && <span className="text-xs font-normal text-brand-pink animate-pulse">Le Chef IA écrit...</span>}
                </h3>
                <p className="text-xs text-brand-blue mb-4 flex items-center gap-1"><Utensils size={12}/> Cliquez sur un plat pour l'ajouter à votre historique !</p>
                
                <div className="space-y-4">
                    {menu.map((item, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => setSelectedItem(item)}
                            className="flex justify-between items-start pb-4 border-b border-gray-50 last:border-0 group cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition"
                        >
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm group-hover:text-brand-pink transition-colors">{item.name}</h4>
                                <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                            </div>
                            <span className="font-bold text-brand-text text-sm whitespace-nowrap ml-4">{item.price}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact / Edit */}
            <div className="pt-4 space-y-3">
                <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider mb-2">Contact & Localisation</h3>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone size={16} className="text-brand-text" /> +352 691 123 456
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Globe size={16} className="text-brand-text" /> www.{truck.name.toLowerCase().replace(/\s/g, '')}.lu
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Clock size={16} className="text-brand-text" /> Lun-Ven: 11:00 - 22:00
                </div>
                
                <div className="pt-8 mt-4">
                    <button className="w-full flex items-center justify-center gap-2 text-xs font-bold text-brand-blue hover:text-blue-700 uppercase tracking-widest">
                        <Edit3 size={14} /> Propriétaire ? Modifier
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
