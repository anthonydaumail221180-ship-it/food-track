
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
import { ReportTruck } from './components/ReportTruck';
import { NewsFeed } from './components/NewsFeed';
import { ModerationPanel } from './components/ModerationPanel';
import { TruckPortal } from './components/TruckPortal';
import { fetchCommunityTrucks } from './services/reportsService';
import { fetchLiveTrucks, LiveTruck } from './services/truckPortal';
import { AppView, FoodTruck, UserProfile as UserProfileType, TrendItem, CheckIn } from './types';
import { fetchFoodTrucksAgent } from './services/trucksService';
import { geocodeAddressAgent } from './services/geocode';
import { getUserPosition } from './services/location';
import { Home, Users, Trophy, Menu, MapPin, Utensils, Search, X, Navigation, User, Brain, Flame, Heart, Megaphone, Newspaper, ArrowRight, Coins } from 'lucide-react';
import { TasteHistory } from './components/TasteHistory';
import { NavChoiceModal } from './components/NavChoiceModal';
import { NavTarget } from './services/mapsNavigation';

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

    // Menu refondu : Grub (liste trucks), Feed (actu + widget tips), Taste (historique gouts),
    // Tips (quiz, icone piece), Spot (anciennement Signaler)
    const menuItems = [
        { view: AppView.HOME, icon: Utensils, label: "Grub" },
        { view: AppView.FEED, icon: Flame, label: "Feed" },
        { view: AppView.TASTE_HISTORY, icon: Heart, label: "Taste" },
        { view: AppView.QUIZ, icon: Coins, label: "Tips" },
        { view: AppView.REPORT, icon: Megaphone, label: "Spot" },
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 md:hidden">
            {isOpen && (
                <div className="flex flex-col gap-3 animate-slide-up">
                    {menuItems.map((item) => (
                        <button 
                            key={item.label}
                            onClick={() => { onViewChange(item.view); setIsOpen(false); }}
                            className={`flex items-center gap-3 pl-5 pr-4 py-3 rounded-full shadow-card font-bold text-sm transition-all backdrop-blur ${currentView === item.view ? 'bg-brand-gradient text-white shadow-glow' : 'bg-white/95 text-brand-text border border-brand-border'}`}
                        >
                            {item.label}
                            <item.icon size={18} />
                        </button>
                    ))}
                </div>
            )}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 ${isOpen ? 'bg-brand-text text-white rotate-90' : 'bg-brand-gradient text-white shadow-glow'}`}
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
  const [reportTrucks, setReportTrucks] = useState<FoodTruck[]>([]);
  const [liveTrucks, setLiveTrucks] = useState<FoodTruck[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<FoodTruck | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
      try {
          const saved = localStorage.getItem('foodtrack_favs');
          const parsed = saved ? JSON.parse(saved) : [];
          return Array.isArray(parsed) ? parsed : [];
      } catch {
          return [];
      }
  });
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
      setToast(msg);
      window.setTimeout(() => setToast(null), 3000);
  };
  // Routage hash : #/admin → modération, #/truck/<token> → portail food truck
  const parseHash = (hash: string): { route: 'admin' | 'truck' | 'app'; token?: string } => {
      if (hash === '#/admin') return { route: 'admin' };
      const m = hash.match(/^#\/truck\/([A-Za-z0-9_-]{24,64})$/);
      if (m) return { route: 'truck', token: m[1] };
      return { route: 'app' };
  };
  const [route, setRoute] = useState<{ route: 'admin' | 'truck' | 'app'; token?: string }>(() =>
      typeof window !== 'undefined' ? parseHash(window.location.hash) : { route: 'app' }
  );
  useEffect(() => {
      const onHash = () => setRoute(parseHash(window.location.hash));
      window.addEventListener('hashchange', onHash);
      return () => window.removeEventListener('hashchange', onHash);
  }, []);
  
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
          try {
              const savedUser = localStorage.getItem('foodtrack_user');
              if (savedUser) {
                  const u = JSON.parse(savedUser);
                  // Ensure history array exists for legacy data
                  if (!u.history) u.history = [];
                  setUser(u);
              }
          } catch {
              // Donnée corrompue : on nettoie pour éviter un crash au prochain démarrage
              try { localStorage.removeItem('foodtrack_user'); } catch { /* ignore */ }
          }
      }, 1500);
      return () => clearTimeout(timer);
  }, []);

  // Convertit un truck LIVE (BDD + emplacement actif) en FoodTruck affichable
  const liveTruckToFoodTruck = (t: LiveTruck): FoodTruck | null => {
      if (!t.live_location) return null;
      const until = t.live_location.open_until ? new Date(t.live_location.open_until) : null;
      const untilStr = until ? until.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
      return {
          id: `live-${t.id}`,
          name: t.name,
          cuisine: t.cuisine || 'Cuisine',
          description: t.description || '',
          locationName: t.live_location.address,
          coordinates: { lat: t.live_location.lat, lng: t.live_location.lng },
          rating: 0,
          imageUrl: t.photo_url || undefined,
          isOpen: true,
          hours: untilStr ? `En service · jusqu'à ${untilStr}` : 'En service',
          phone: t.phone || undefined,
          website: t.website || undefined,
      };
  };

  // Initial Data Load - charge trucks + signalements + LIVE en parallèle, un seul rendu, finally garanti
  useEffect(() => {
    const loadData = async () => {
        try {
            const [truckResult, community, live] = await Promise.all([
                fetchFoodTrucksAgent(),
                fetchCommunityTrucks(),
                fetchLiveTrucks(),
            ]);
            const { trucks: newTrucks, sources: newSources } = truckResult;
            const liveAsFoodTrucks = live.map(liveTruckToFoodTruck).filter((x): x is FoodTruck => x !== null);
            setAllTrucks(newTrucks);
            setSources(newSources);
            setReportTrucks(community);
            setLiveTrucks(liveAsFoodTrucks);
            // Ordre : LIVE d'abord (premium), puis signalements communautaires, puis statiques
            setDisplayedTrucks([...liveAsFoodTrucks, ...community, ...newTrucks]);
        } catch (err) {
            console.error('Erreur chargement initial:', err);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  useEffect(() => {
      localStorage.setItem('foodtrack_favs', JSON.stringify(favorites));
  }, [favorites]);

  // --- Onboarding Logic ---
  const handleRegistrationComplete = (newUser: UserProfileType) => {
      const userWithHistory = { ...newUser, history: [] };
      setUser(userWithHistory);
      try { localStorage.setItem('foodtrack_user', JSON.stringify(userWithHistory)); } catch { /* ignore */ }
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
      try { localStorage.setItem('foodtrack_user', JSON.stringify(updatedUser)); } catch { /* ignore */ }
      showToast("Grub validé ! Ajouté à votre historique.");
  };

  // --- Admin Logic ---
  const handlePublishTrend = (trend: TrendItem) => {
      setPublishedTrends(prev => [trend, ...prev]);
      showToast("Tendance publiée sur Taste !");
  };

  // --- Filtering Logic for Landing Screen ---
  // Les LIVE (BDD + emplacement actif) sont toujours en tête : ils représentent les partenaires actifs.
  const handleShowAll = () => {
      setDisplayedTrucks([...liveTrucks, ...reportTrucks, ...allTrucks]);
      setCurrentView(AppView.HOME);
  };

  const executeProximitySearch = (location: {lat: number, lng: number}) => {
      // Les LIVE restent en tête (partenaires = priorité), puis les 5 plus proches parmi le reste
      const rest = [...reportTrucks, ...allTrucks].sort((a, b) => {
          const distA = a.coordinates ? getDistance(location.lat, location.lng, a.coordinates.lat, a.coordinates.lng) : 99999;
          const distB = b.coordinates ? getDistance(location.lat, location.lng, b.coordinates.lat, b.coordinates.lng) : 99999;
          return distA - distB;
      });
      setDisplayedTrucks([...liveTrucks, ...rest.slice(0, 5)]);
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
  // "Y aller" : ouvre un bottom sheet qui laisse l'utilisateur choisir son appli (Plan / Google / mobiliteit.lu)
  // ou basculer sur la vue interne (carte + conseil IA) via NavigationHelper.
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null);
  const handleNavigateToTruck = (truck: FoodTruck) => {
    if (!truck.coordinates) {
      // Pas de coordonnées : fallback sur la vue interne qui gère l'absence
      setSelectedTruck(truck);
      setCurrentView(AppView.MAP_TRANSPORT);
      return;
    }
    setSelectedTruck(truck);
    setNavTarget({
      lat: truck.coordinates.lat,
      lng: truck.coordinates.lng,
      address: truck.locationName,
      name: truck.name,
    });
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
      case AppView.LANDING: {
        const openNow = allTrucks.filter(t => t.isOpen).length + liveTrucks.length;
        return (
            <div className="flex flex-col min-h-screen items-center justify-between p-6 relative overflow-hidden w-full">
                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-brand-orange/25 blur-3xl animate-float"></div>
                <div className="absolute top-1/3 -left-28 w-72 h-72 rounded-full bg-brand-pink/20 blur-3xl animate-float" style={{animationDelay: '3s'}}></div>
                <div className="absolute -bottom-24 right-0 w-72 h-72 rounded-full bg-brand-gold/25 blur-3xl animate-float" style={{animationDelay: '6s'}}></div>

                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm z-10 pt-10">
                    <div className="animate-pop">
                        <BrandLogo size="xl" textClassName="text-6xl mt-4 leading-tight" />
                    </div>
                    <p className="font-display text-2xl text-brand-text mt-3 animate-slide-up" style={{animationDelay: '0.15s'}}>Ta pause midi, sur roues</p>
                    <p className="text-brand-muted mt-1 font-semibold tracking-[0.25em] text-[10px] uppercase animate-slide-up" style={{animationDelay: '0.2s'}}>Luxembourg · Gudden Appetit</p>
                    {openNow > 0 && (
                        <div className="mt-5 inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-brand-border rounded-full px-4 py-1.5 shadow-card animate-slide-up" style={{animationDelay: '0.3s'}}>
                            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-60"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-green"></span></span>
                            <span className="text-xs font-bold text-brand-text">{openNow} food truck{openNow > 1 ? 's' : ''} en service maintenant</span>
                        </div>
                    )}
                </div>

                <div className="w-full max-w-sm space-y-3 mb-8 z-10 stagger">
                    <button 
                        onClick={handleShowAll}
                        className="w-full bg-brand-gradient text-white rounded-3xl p-4 shadow-glow flex items-center gap-4 transition-transform active:scale-95 hover:scale-[1.01]"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                            <Utensils size={22} />
                        </div>
                        <div className="text-left flex-1">
                            <h3 className="font-bold text-lg leading-tight">Où déjeuner ce midi ?</h3>
                            <p className="text-xs text-white/85">Voir tous les food trucks</p>
                        </div>
                        <ArrowRight size={20} className="opacity-80" />
                    </button>

                    <button 
                        onClick={() => setShowLocationModal(true)}
                        className="w-full bg-white/90 backdrop-blur border border-brand-border rounded-3xl p-4 shadow-card flex items-center gap-4 transition-transform active:scale-95 hover:border-brand-orange"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-brand-text flex items-center justify-center text-white">
                            <MapPin size={22} />
                        </div>
                        <div className="text-left flex-1">
                            <h3 className="font-bold text-lg text-brand-text leading-tight">Autour de moi</h3>
                            <p className="text-xs text-brand-muted">Les 5 camions les plus proches</p>
                        </div>
                        <ArrowRight size={20} className="text-brand-muted" />
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setCurrentView(AppView.REPORT)}
                            className="bg-white/90 backdrop-blur border border-brand-border rounded-3xl p-4 shadow-card flex flex-col items-start gap-3 transition-transform active:scale-95 hover:border-brand-green"
                        >
                            <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center"><Megaphone size={20} className="text-brand-green" /></div>
                            <h3 className="font-bold text-sm text-brand-text text-left leading-tight">Spot un food truck</h3>
                        </button>
                        <button 
                            onClick={() => setCurrentView(AppView.FEED)}
                            className="bg-white/90 backdrop-blur border border-brand-border rounded-3xl p-4 shadow-card flex flex-col items-start gap-3 transition-transform active:scale-95 hover:border-brand-pink"
                        >
                            <div className="w-10 h-10 rounded-xl bg-brand-pink/10 flex items-center justify-center"><Newspaper size={20} className="text-brand-pink" /></div>
                            <h3 className="font-bold text-sm text-brand-text text-left leading-tight">Fil d'actu</h3>
                        </button>
                    </div>
                </div>
            </div>
        );
      }

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
      case AppView.REPORT:
        return <ReportTruck
                  onBack={() => setCurrentView(AppView.LANDING)}
                  onDone={async () => { const c = await fetchCommunityTrucks(); setReportTrucks(c); setDisplayedTrucks([...c, ...allTrucks]); setCurrentView(AppView.HOME); }}
               />;
      case AppView.FEED:
        return <NewsFeed onPlayQuiz={() => setCurrentView(AppView.QUIZ)} />;
      case AppView.TASTE_HISTORY:
        return <TasteHistory user={user} onPlayQuiz={() => setCurrentView(AppView.QUIZ)} />;
      case AppView.SOCIAL:
        return <SocialWall
                publishedTrends={publishedTrends}
                onPlayQuiz={() => setCurrentView(AppView.QUIZ)}
            />;
      case AppView.VOTE:
        return <VotingBooth />;
      case AppView.QUIZ:
        return <QuizGame onComplete={(s) => {
            try { localStorage.setItem('ft_last_tips_score', JSON.stringify({ score: s, ts: Date.now() })); } catch { /* ignore */ }
            showToast(`Vous avez marqué ${s} points !`);
            setCurrentView(AppView.FEED);
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
                onNavigate={handleNavigateToTruck}
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

  const isFullScreen = [AppView.MAP_TRANSPORT, AppView.PROFILE, AppView.NOTIFICATIONS, AppView.ONBOARDING, AppView.USER_PROFILE, AppView.ADMIN_DASHBOARD, AppView.LANDING, AppView.REPORT].includes(currentView);

  if (route.route === 'admin') return <ModerationPanel />;
  if (route.route === 'truck' && route.token) return <TruckPortal token={route.token} />;

  if (showSplash) {
      return (
          <div className="fixed inset-0 bg-brand-bg z-[100] flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand-orange/20 blur-3xl animate-float"></div>
              <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-brand-pink/20 blur-3xl animate-float" style={{animationDelay:"3s"}}></div>
              <div className="relative animate-zoom-in">
                <BrandLogo size="xl" textClassName="text-5xl" />
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen font-sans text-brand-text relative">
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

      {/* Modal "Y aller" : choix d'appli de nav externe (Plan / Google Maps / mobiliteit.lu) */}
      <NavChoiceModal
          target={navTarget}
          onClose={() => setNavTarget(null)}
          onOpenInternalMap={() => { setNavTarget(null); setCurrentView(AppView.MAP_TRANSPORT); }}
      />

      {/* Toast (remplace alert() bloquant) */}
      {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] bg-brand-text text-white px-5 py-3 rounded-full shadow-2xl text-sm font-bold animate-slide-up max-w-[90vw] text-center">
              {toast}
          </div>
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
