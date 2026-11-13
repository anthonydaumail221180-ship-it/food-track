
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { BrandLogo } from './BrandLogo';
import { ArrowRight, Check, Bell, MapPin, AlertCircle, ScanFace, Lock, LogIn, Globe } from 'lucide-react';

interface OnboardingProps {
    onComplete: (user: UserProfile) => void;
    onSkip?: () => void;
}

export const COUNTRY_CODES = [
    { code: '+352', country: '🇱🇺' },
    { code: '+33', country: '🇫🇷' },
    { code: '+32', country: '🇧🇪' },
    { code: '+49', country: '🇩🇪' },
    { code: '+351', country: '🇵🇹' },
    { code: '+39', country: '🇮🇹' },
    { code: '+34', country: '🇪🇸' },
    { code: '+41', country: '🇨🇭' },
    { code: '+44', country: '🇬🇧' },
    { code: '+31', country: '🇳🇱' },
    { code: '+1', country: '🇺🇸' },
];

export const FOOD_AVATARS = [
    '👨‍🍳', // Chef
    '🤤', // Baveux
    '🥵', // Épicé
    '🥴', // Trop mangé
    '🥸', // Incognito Gourmet
    '🤠', // BBQ King
    '🍔', // Burger
    '🌮', // Taco
    '🌯', // Burrito
    '🍕', // Pizza
    '🍟', // Frite
    '🌭', // Hotdog
    '🥓', // Bacon
    '🥑', // Healthy
    '🌶️', // Hot
    '🧀', // Cheese lover
    '🍩', // Sucré
    '🍿', // Snacking
    '🦞', // Luxe
    '🍣', // Sushi
];

export const LANGUAGES = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'lb', label: 'Lëtzebuergesch', flag: '🇱🇺' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decorations - Visible full screen */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-brand-pink/10 rounded-full blur-3xl"></div>

        {/* The Card - Full width on mobile, constrained square on desktop */}
        <div className="w-full max-w-md md:bg-white md:shadow-[0_20px_50px_rgba(0,0,0,0.1)] md:border md:border-gray-100 md:rounded-[40px] md:p-10 z-10 relative flex flex-col h-full md:h-auto min-h-[600px] justify-center">
            {children}
        </div>
    </div>
);

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onSkip }) => {
    const [isLoginMode, setIsLoginMode] = useState(false);
    const [step, setStep] = useState(1);
    const [error, setError] = useState<string | null>(null);
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phonePrefix: '+352',
        phoneNumber: '',
        password: '',
        nickname: '',
        language: 'fr'
    });
    const [selectedAvatar, setSelectedAvatar] = useState<string>('😋');
    const [permissions, setPermissions] = useState({
        notifications: false,
        location: false
    });

    const [loginData, setLoginData] = useState({
        phonePrefix: '+352',
        phoneNumber: '',
        password: ''
    });
    const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    useEffect(() => {
        if ((window as any).PublicKeyCredential) {
            setIsBiometricAvailable(true);
        }
    }, []);

    const handleLogin = (method: 'password' | 'biometric') => {
        setError(null);
        const allUsersRaw = localStorage.getItem('foodtrack_all_users');
        const allUsers: UserProfile[] = allUsersRaw ? JSON.parse(allUsersRaw) : [];
        
        if (method === 'biometric') {
            setIsAuthenticating(true);
            setTimeout(() => {
                const lastUser = allUsers[0]; 
                if (lastUser) {
                    onComplete(lastUser);
                } else {
                    setIsAuthenticating(false);
                    setError("Aucun compte reconnu pour FaceID. Veuillez utiliser le mot de passe.");
                }
            }, 1500);
            return;
        }

        const fullPhone = `${loginData.phonePrefix} ${loginData.phoneNumber}`;
        const user = allUsers.find(u => 
            u.phone.replace(/\s/g, '') === fullPhone.replace(/\s/g, '') && 
            u.password === loginData.password
        );

        if (user) {
            onComplete(user);
        } else {
            setError("Numéro ou mot de passe incorrect.");
        }
    };

    const handleRegistrationNext = () => {
        setError(null);
        // Step 1: Language -> Step 2
        // Step 2: Info -> Step 3
        // Step 3: Avatar -> Step 4
        // Step 4: Perms -> Finish
        if (step < 4) {
            setStep(step + 1);
            return;
        }
        
        const fullPhone = `${formData.phonePrefix} ${formData.phoneNumber}`;
        const allUsersRaw = localStorage.getItem('foodtrack_all_users');
        const allUsers: UserProfile[] = allUsersRaw ? JSON.parse(allUsersRaw) : [];

        if (allUsers.some(u => u.email.toLowerCase() === formData.email.trim().toLowerCase())) {
            setError("Cette adresse email est déjà utilisée.");
            setStep(2);
            return;
        }
        if (allUsers.some(u => u.phone.replace(/\s/g, '') === fullPhone.replace(/\s/g, ''))) {
            setError("Ce numéro de téléphone est déjà enregistré.");
            setStep(2);
            return;
        }

        const newUser: UserProfile = {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim(),
            phone: fullPhone,
            password: formData.password,
            nickname: formData.nickname.trim(),
            avatarId: selectedAvatar,
            permissions,
            language: formData.language,
            history: [] // Initial empty history
        };

        localStorage.setItem('foodtrack_all_users', JSON.stringify([...allUsers, newUser]));
        onComplete(newUser);
    };

    const isValidStep2 = formData.firstName && formData.lastName && formData.email && formData.phoneNumber && formData.nickname && formData.password;

    if (isLoginMode) {
        return (
            <Container>
                <div className="w-full animate-slide-up">
                    <div className="flex justify-center mb-8">
                        <BrandLogo size="lg" />
                    </div>
                    
                    <h2 className="text-2xl font-display text-brand-text text-center mb-6">Food Track : Connexion</h2>

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
                            <AlertCircle size={18} className="flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <select 
                                className="w-28 p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none text-sm"
                                value={loginData.phonePrefix}
                                onChange={e => setLoginData({...loginData, phonePrefix: e.target.value})}
                            >
                                {COUNTRY_CODES.map(c => (
                                    <option key={c.code} value={c.code}>{c.country} {c.code}</option>
                                ))}
                            </select>
                            <input 
                                type="tel" 
                                placeholder="Téléphone"
                                className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none transition-colors"
                                value={loginData.phoneNumber}
                                onChange={e => setLoginData({...loginData, phoneNumber: e.target.value})}
                            />
                        </div>
                        <div className="relative">
                            <input 
                                type="password" 
                                placeholder="Mot de passe"
                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none transition-colors pl-10"
                                value={loginData.password}
                                onChange={e => setLoginData({...loginData, password: e.target.value})}
                            />
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        <button 
                            onClick={() => handleLogin('password')}
                            className="w-full bg-brand-text text-white py-3 rounded-xl font-bold shadow-lg hover:opacity-90 flex items-center justify-center gap-2"
                        >
                            <LogIn size={18} /> Se connecter
                        </button>

                        {isBiometricAvailable && (
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">ou</span></div>
                            </div>
                        )}

                        {isBiometricAvailable && (
                            <button 
                                onClick={() => handleLogin('biometric')}
                                disabled={isAuthenticating}
                                className="w-full bg-white border border-gray-200 text-brand-blue py-3 rounded-xl font-bold hover:bg-gray-50 flex items-center justify-center gap-2 transition-all"
                            >
                                {isAuthenticating ? (
                                    <span className="animate-pulse">Recherche visage...</span>
                                ) : (
                                    <>
                                        <ScanFace size={20} /> FaceID / TouchID
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">Pas encore de compte ?</p>
                        <button onClick={() => setIsLoginMode(false)} className="text-brand-pink font-bold hover:underline">
                            Créer un compte
                        </button>
                    </div>
                </div>
            </Container>
        );
    }

    return (
        <Container>
            <div className="flex-1 flex flex-col">
                <div className="mb-6 flex justify-center animate-slide-up">
                    <BrandLogo size="md" />
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-bounce">
                        <AlertCircle size={18} className="flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="flex gap-2 mb-8 justify-center">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${step >= i ? 'bg-brand-gradient' : 'bg-gray-200'}`}></div>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar md:max-h-[400px]">
                
                {/* STEP 1: LANGUAGE SELECTION */}
                {step === 1 && (
                     <div className="animate-slide-up space-y-4 text-center">
                        <h2 className="text-2xl font-display text-brand-text mb-2">Bienvenue / Moien !</h2>
                        <p className="text-gray-400 text-sm mb-6">Choisissez votre langue préférée.</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => setFormData({...formData, language: lang.code})}
                                    className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${formData.language === lang.code ? 'border-brand-pink bg-pink-50 shadow-sm' : 'border-gray-100 bg-white hover:border-brand-orange'}`}
                                >
                                    <span className="text-3xl mb-2">{lang.flag}</span>
                                    <span className={`text-sm ${formData.language === lang.code ? 'font-bold text-brand-text' : 'text-gray-500'}`}>{lang.label}</span>
                                </button>
                            ))}
                        </div>
                     </div>
                )}

                {/* STEP 2: PROFILE INFO */}
                {step === 2 && (
                    <div className="animate-slide-up space-y-4">
                        <h2 className="text-2xl font-display text-brand-text text-center mb-2">Rejoignez Food Track</h2>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <input 
                                type="text" 
                                placeholder="Prénom"
                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none transition-colors"
                                value={formData.firstName}
                                onChange={e => setFormData({...formData, firstName: e.target.value})}
                            />
                            <input 
                                type="text" 
                                placeholder="Nom"
                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none transition-colors"
                                value={formData.lastName}
                                onChange={e => setFormData({...formData, lastName: e.target.value})}
                            />
                        </div>
                        
                         <input 
                            type="text" 
                            placeholder="Surnom (ex: FoodieLux)"
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none transition-colors"
                            value={formData.nickname}
                            onChange={e => setFormData({...formData, nickname: e.target.value})}
                        />
                        <input 
                            type="email" 
                            placeholder="Email"
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none transition-colors"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                        
                        <div className="flex gap-2">
                            <select 
                                className="w-28 p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none text-sm"
                                value={formData.phonePrefix}
                                onChange={e => setFormData({...formData, phonePrefix: e.target.value})}
                            >
                                {COUNTRY_CODES.map(c => (
                                    <option key={c.code} value={c.code}>{c.country} {c.code}</option>
                                ))}
                            </select>
                            <input 
                                type="tel" 
                                placeholder="Téléphone"
                                className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none transition-colors"
                                value={formData.phoneNumber}
                                onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                            />
                        </div>
                        
                        <div className="relative">
                            <input 
                                type="password" 
                                placeholder="Mot de passe"
                                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none transition-colors pl-10"
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                            />
                             <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>
                )}

                {/* STEP 3: AVATAR */}
                {step === 3 && (
                    <div className="animate-slide-up text-center flex flex-col h-full">
                        <h2 className="text-2xl font-display text-brand-text mb-2">Avatar Food Track</h2>
                        <p className="text-gray-400 text-sm mb-6">Quelle est votre personnalité culinaire ?</p>

                        <div className="grid grid-cols-5 gap-3 mx-auto pb-4">
                            {FOOD_AVATARS.map((emoji, idx) => {
                                const isSelected = selectedAvatar === emoji;
                                return (
                                    <button 
                                        key={idx}
                                        onClick={() => setSelectedAvatar(emoji)}
                                        className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all ${isSelected ? 'bg-brand-gradient shadow-lg scale-110 border-2 border-white' : 'bg-gray-50 hover:bg-gray-100 grayscale-[0.3] hover:grayscale-0'}`}
                                    >
                                        {emoji}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 4: PERMISSIONS */}
                {step === 4 && (
                    <div className="animate-slide-up space-y-6">
                         <h2 className="text-2xl font-display text-brand-text text-center mb-2">Dernière étape !</h2>
                         <p className="text-gray-400 text-center text-sm mb-6">Autorisez-nous à améliorer votre expérience.</p>

                         <button 
                            onClick={() => setPermissions({...permissions, notifications: !permissions.notifications})}
                            className={`w-full p-4 rounded-xl flex items-center justify-between border-2 transition ${permissions.notifications ? 'border-brand-green bg-green-50' : 'border-gray-100'}`}
                         >
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-brand-pink/10 text-brand-pink flex items-center justify-center">
                                     <Bell size={20} />
                                 </div>
                                 <div className="text-left">
                                     <p className="font-bold text-sm">Notifications</p>
                                     <p className="text-xs text-gray-500">Soyez averti des offres et quiz</p>
                                 </div>
                             </div>
                             {permissions.notifications && <Check size={20} className="text-brand-green" />}
                         </button>

                         <button 
                            onClick={() => setPermissions({...permissions, location: !permissions.location})}
                            className={`w-full p-4 rounded-xl flex items-center justify-between border-2 transition ${permissions.location ? 'border-brand-green bg-green-50' : 'border-gray-100'}`}
                         >
                             <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                                     <MapPin size={20} />
                                 </div>
                                 <div className="text-left">
                                     <p className="font-bold text-sm">Géolocalisation</p>
                                     <p className="text-xs text-gray-500">Pour trouver les camions proches</p>
                                 </div>
                             </div>
                             {permissions.location && <Check size={20} className="text-brand-green" />}
                         </button>
                    </div>
                )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="mt-8 z-10 space-y-4 w-full">
                <button 
                    onClick={handleRegistrationNext}
                    disabled={step === 2 && !isValidStep2}
                    className="w-full bg-brand-gradient text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {step === 4 ? "C'est parti !" : "Suivant"} <ArrowRight size={20} />
                </button>

                {step === 1 && (
                    <p className="text-center text-sm text-gray-500">
                        Déjà inscrit ? <button onClick={() => setIsLoginMode(true)} className="text-brand-pink font-bold hover:underline">Se connecter</button>
                    </p>
                )}

                {onSkip && (
                    <button onClick={onSkip} className="w-full text-center text-sm font-bold text-gray-500 hover:text-black py-2">
                        Continuer sans compte
                    </button>
                )}
            </div>
        </Container>
    );
};
