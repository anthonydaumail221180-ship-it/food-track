
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TruckList } from './components/TruckList';
import { SocialWall } from './components/SocialWall';
import { VotingBooth } from './components/VotingBooth';
import { NavigationHelper } from './components/NavigationHelper';
import { TruckProfile } from './components/TruckProfile';
import { NotificationCenter } from './components/NotificationCenter';
import { QuizGame } from './components/QuizGame';
import { BrandLogo } from './components/BrandLogo';
import { Onboarding } from './components/Onboarding';
import { UserProfile } from './components/UserProfile';
import { AdminDashboard } from './components/AdminDashboard';
import { AppView, FoodTruck, UserProfile as UserProfileType, TrendItem, CheckIn } from './types';
import { fetchFoodTrucksAgent } from './services/trucksService';
import { geocodeAddressAgent } from './services/geocode';
import { getUserPosition } from './services/location';
import { Home, Users, Trophy, Menu, MapPin, Utensils, Search, X, Navigation, User, Brain, Flame, Heart } from 'lucide-react';

// Helper: Calculate distance in km
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c;
}

const QUARTIERS = [
    { name: 'Kirchberg', lat: 49.6250, lng: 6.1600 },
    { name: 'Gare', lat: 49.6000, lng: 6.1333 },
    { name: 'Centre-ville', lat: 49.6103, lng: 6.1296 },
    { name: 'Gasperich', lat: 49.5800, lng: 6.1200 },
    { name: 'Hamm', lat: 49.6050, lng: 6.1780 },
];

// Floating Menu Component (Mobile Only Replacement for Bars)
const FloatingMenu: React.FC<{ currentView: AppView, onViewChange: (v: AppView) => void }> = ({ currentView, onViewChange }) => {
    const [isOpen, setIsOpen] = useState(false);

    // MENU ITEMS UPDATED - Profil removed, names updated
    const menuItems = [
        { view: AppView.HOME, icon: Utensils, label: "Miam" }, 
        { view: AppView.SOCIAL, icon: Flame, label: "Taste" }, 
        { view: AppView.VOTE, icon: Heart, label: "Like" }, 
        { view: AppView.QUIZ, icon: Brain, label: "Tips" }, 
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 md:hidden">
            {isOpen && (
                <div className="flex flex-col gap-3 animate-slide-up">
                    {menuItems.map((item) => (
                        <button 
                            key={item.label}
                            onClick={() => { onViewChange(item.view); setIsOpen(false); }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-full shadow-lg font-bold text-sm transition-all ${currentView === item.view ? 'bg-brand-pink text-white' : 'bg-white text-brand-text'}`}
                        >
                            {item.label}
                            <item.icon size={18} />
                        </button>
                    ))}
                </div>
            )}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 ${isOpen ? 'bg-gray-900 text-white rotate-90' : 'bg-brand-gradient text-white'}`}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>
    );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  
  // Data State
  const [user, setUser] = useState<UserProfileType | undefined>(undefined);
  const [allTrucks, setAllTrucks] = useState<FoodTruck[]>([]);
  const [displayedTrucks, setDisplayedTrucks] = useState<FoodTruck[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<FoodTruck | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
      const saved = localStorage.getItem('foodtrack_favs');
      return saved ? JSON.parse(saved) : [];
  });
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  
  // Social / Admin State
  const [publishedTrends, setPublishedTrends] = useState<TrendItem[]>([]);

  // Location Modal State
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Splash Screen Timer & User Check
  useEffect(() => {
      const timer = setTimeout(() => {
          setShowSplash(false);
          const savedUser = localStorage.getItem('foodtrack_user');
          if (savedUser) {
              const u = JSON.parse(savedUser);
              // Ensure history array exists for legacy data
              if (!u.history) u.history = [];
              setUser(u);
          }
      }, 1500);
      return () => clearTimeout(timer);
  }, []);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
        const { trucks: newTrucks, sources: newSources } = await fetchFoodTrucksAgent();
        setAllTrucks(newTrucks);
        setDisplayedTrucks(newTrucks); 
        setSources(newSources);
        setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
      localStorage.setItem('foodtrack_favs', JSON.stringify(favorites));
  }, [favorites]);

  // --- Onboarding Logic ---
  const handleRegistrationComplete = (newUser: UserProfileType) => {
      setUser({...newUser, history: []});
      localStorage.setItem('foodtrack_user', JSON.stringify({...newUser, history: []}));
      setCurrentView(AppView.LANDING);
  };

  const handleLogout = () => {
      localStorage.removeItem('foodtrack_user');
      setUser(undefined);
      setCurrentView(AppView.ONBOARDING);
  };

  // --- Check-In Logic ---
  const handleAddCheckIn = (checkIn: CheckIn) => {
      if (!user) return;
      const updatedUser = { ...user, history: [checkIn, ...user.history] };
      setUser(updatedUser);
      localStorage.setItem('foodtrack_user', JSON.stringify(updatedUser));
      alert("Miam validé ! Ajouté à votre historique.");
  };

  // --- Admin Logic ---
  const handlePublishTrend = (trend: TrendItem) => {
      setPublishedTrends(prev => [trend, ...prev]);
      alert("Tendance publiée sur Taste !");
  };

  // --- Filtering Logic for Landing Screen ---
  const handleShowAll = () => {
      setDisplayedTrucks(allTrucks);
      setCurrentView(AppView.HOME);
  };

  const executeProximitySearch = (location: {lat: number, lng: number}) => {
      const sorted = [...allTrucks].sort((a, b) => {
          const distA = a.coordinates ? getDistance(location.lat, location.lng, a.coordinates.lat, a.coordinates.lng) : 99999;
          const distB = b.coordinates ? getDistance(location.lat, location.lng, b.coordinates.lat, b.coordinates.lng) : 99999;
          return distA - distB;
      });
      setDisplayedTrucks(sorted.slice(0, 5));
      setCurrentView(AppView.HOME);
  };

  const handleGeolocationClick = async () => {
      setLocationError("");
      setIsLocating(true);
      const r = await getUserPosition();
      setIsLocating(false);
      if (r.ok) {
          const loc = { lat: r.lat, lng: r.lng };
          setUserLocation(loc);
          setShowLocationModal(false);
          executeProximitySearch(loc);
      } else {
          setLocationError(r.message);
      }
  };

  const handleAddressSubmit = async () => {
      if (!manualAddress) return;
      setIsGeocoding(true);
      const coords = await geocodeAddressAgent(manualAddress);
      setIsGeocoding(false);

      if (coords) {
          setUserLocation(coords);
          setShowLocationModal(false);
          executeProximitySearch(coords);
      } else {
          setLocationError("Adresse introuvable. Essayez d'être plus précis (ex : Gare de Luxembourg).");
      }
  };

  // --- Navigation Handlers ---
  const handleNavigateToTruck = (truck: FoodTruck) => {
    setSelectedTruck(truck);
    setCurrentView(AppView.MAP_TRANSPORT);
  };

  const handleOpenProfile = (truck: FoodTruck) => {
      setSelectedTruck(truck);
      setCurrentView(AppView.PROFILE);
  }

  const toggleFavorite = (id: string) => {
      setFavorites(prev => 
        prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
      );
  };

  // --- Render Views ---
  const renderView = () => {
    switch (currentView) {
      case AppView.ONBOARDING:
          return <Onboarding onComplete={handleRegistrationComplete} onSkip={() => setCurrentView(AppView.LANDING)} />;
      case AppView.LANDING:
        return (
            <div className="flex flex-col min-h-screen bg-white items-center justify-center p-6 relative overflow-hidden w-full">
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-brand-pink/5 rounded-full blur-3xl"></div>

                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm z-10">
                    <div className="animate-slide-up">
                        <BrandLogo size="xl" textClassName="text-5xl mt-6" />
                    </div>
                    <p className="text-brand-muted mt-4 font-medium tracking-widest text-xs uppercase animate-slide-up" style={{animationDelay: '0.1s'}}>
                        Luxembourg Street Food
                    </p>
                </div>

                <div className="w-full max-w-sm space-y-4 mb-12 z-10 animate-slide-up" style={{animationDelay: '0.2s'}}>
                    <p className="text-center font-display text-2xl text-brand-text mb-6">Où déjeuner ce midi ?</p>

                    <button 
                        onClick={handleShowAll}
                        className="w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-lg flex items-center gap-4 transition-transform active:scale-95 hover:border-brand-pink group"
                    >
                        <div className="w-12 h-12 rounded-full bg-brand-gradient flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                            <Utensils size={20} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg text-brand-text">Voir tout</h3>
                            <p className="text-xs text-gray-400">Explorer la liste complète</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => setShowLocationModal(true)}
                        className="w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-lg flex items-center gap-4 transition-transform active:scale-95 hover:border-brand-orange group"
                    >
                        <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                            <MapPin size={20} />
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-lg text-brand-text">Autour de moi</h3>
                            <p className="text-xs text-gray-400">Les 5 camions les plus proches</p>
                        </div>
                    </button>
                </div>
            </div>
        );

      case AppView.HOME:
        return <TruckList 
                  trucks={displayedTrucks} 
                  onNavigate={handleNavigateToTruck} 
                  onTruckClick={handleOpenProfile}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  loading={loading}
                  userLocation={userLocation}
                  sources={sources}
                  history={user?.history || []}
               />;
      case AppView.SOCIAL:
        return <SocialWall 
                publishedTrends={publishedTrends} 
                onPlayQuiz={() => setCurrentView(AppView.QUIZ)}
            />;
      case AppView.VOTE:
        return <VotingBooth />;
      case AppView.QUIZ:
        return <QuizGame onComplete={(s) => {
            alert(`Vous avez marqué ${s} points !`);
            setCurrentView(AppView.SOCIAL);
        }} />;
      case AppView.MAP_TRANSPORT:
        return <NavigationHelper targetTruck={selectedTruck} onBack={() => setCurrentView(AppView.HOME)} />;
      case AppView.PROFILE:
        return selectedTruck ? (
            <TruckProfile 
                truck={selectedTruck} 
                onBack={() => setCurrentView(AppView.HOME)} 
                toggleFavorite={toggleFavorite}
                isFavorite={favorites.includes(selectedTruck.id)}
                onCheckIn={handleAddCheckIn}
            />
        ) : <div />;
      case AppView.USER_PROFILE:
          return user ? (
              <UserProfile 
                user={user} 
                onBack={() => setCurrentView(AppView.HOME)} 
                onLogout={handleLogout}
                onAdminClick={() => setCurrentView(AppView.ADMIN_DASHBOARD)}
              />
          ) : <div />;
      case AppView.NOTIFICATIONS:
          return <NotificationCenter onClose={() => setCurrentView(AppView.HOME)} onRead={() => setHasUnreadNotifications(false)} />;
      case AppView.ADMIN_DASHBOARD:
          return <AdminDashboard onBack={() => setCurrentView(AppView.USER_PROFILE)} onPublishTrend={handlePublishTrend} />;
      default:
        return <div />;
    }
  };

  const isFullScreen = [AppView.MAP_TRANSPORT, AppView.PROFILE, AppView.NOTIFICATIONS, AppView.ONBOARDING, AppView.USER_PROFILE, AppView.ADMIN_DASHBOARD, AppView.LANDING].includes(currentView);

  if (showSplash) {
      return (
          <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center overflow-hidden">
              <div className="relative animate-zoom-in">
                <BrandLogo size="xl" textClassName="text-5xl" />
              </div>
          </div>
      );
  }

  return (
    <div className="bg-white min-h-screen font-sans text-brand-text relative">
      {/* Header: Fixed on all devices when not in fullscreen mode */}
      {!isFullScreen && (
        <Header 
            onNotificationsClick={() => setCurrentView(AppView.NOTIFICATIONS)} 
            onLogoClick={() => setCurrentView(AppView.LANDING)}
            onProfileClick={() => setCurrentView(user ? AppView.USER_PROFILE : AppView.ONBOARDING)}
            unreadCount={hasUnreadNotifications ? 1 : 0} 
            user={user}
        />
      )}
      
      {/* Main Content - Added pt-20 to account for the fixed header */}
      <main className={`${isFullScreen || currentView === AppView.ONBOARDING ? "" : "w-full p-4 md:px-8 lg:px-12 mx-auto pt-20"} pb-24 md:pb-0`}>
        {renderView()}
      </main>

      {/* Mobile Floating Navigation (Replaces Bottom Bar) */}
      {!isFullScreen && currentView !== AppView.LANDING && (
          <FloatingMenu currentView={currentView} onViewChange={setCurrentView} />
      )}

      {/* Location Choice Modal */}
      {showLocationModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slide-up">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-display text-xl text-brand-text">Où êtes-vous ?</h3>
                      <button onClick={() => setShowLocationModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                          <X size={20} className="text-gray-500" />
                      </button>
                  </div>

                  <button 
                      onClick={handleGeolocationClick}
                      className="w-full flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100 mb-4 hover:bg-blue-100 transition group"
                  >
                      <div className="w-10 h-10 rounded-full bg-brand-blue flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                          <Navigation size={20} />
                      </div>
                      <div className="text-left">
                          <p className="font-bold text-brand-text">{isLocating ? "Localisation en cours…" : "Me géolocaliser"}</p>
                          <p className="text-xs text-gray-500">Utiliser mon GPS actuel</p>
                      </div>
                  </button>
                  {locationError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 mb-2">{locationError}</p>}
                  <p className="text-xs text-gray-400 uppercase mb-2">Ou choisissez votre quartier</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                      {QUARTIERS.map(q => (
                          <button key={q.name}
                              onClick={() => { const loc = { lat: q.lat, lng: q.lng }; setUserLocation(loc); setShowLocationModal(false); executeProximitySearch(loc); }}
                              className="px-4 py-2 rounded-full bg-gray-50 border border-gray-200 text-sm font-bold hover:border-brand-pink">
                              {q.name}
                          </button>
                      ))}
                  </div>

                  <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                      <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-gray-400 uppercase">ou</span></div>
                  </div>

                  <div>
                      <div className="flex gap-2 mb-2">
                          <div className="relative flex-1">
                              <input 
                                  type="text" 
                                  placeholder="Ex: Gare de Luxembourg" 
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-orange transition"
                                  value={manualAddress}
                                  onChange={e => setManualAddress(e.target.value)}
                              />
                              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          </div>
                      </div>
                      <button 
                          onClick={handleAddressSubmit}
                          disabled={isGeocoding || !manualAddress}
                          className="w-full py-3 bg-brand-text text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                          {isGeocoding ? (
                              <span className="animate-pulse">Recherche...</span>
                          ) : (
                              "Rechercher cette adresse"
                          )}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
