
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { BrandLogo } from './BrandLogo';
import { ArrowRight, Check, Bell, MapPin, AlertCircle, ScanFace, Lock, LogIn, Globe, KeyRound, Mail, ArrowLeft } from 'lucide-react';
import { signup as apiSignup, login as apiLogin, forgotPassword as apiForgot, resetPassword as apiReset, AuthUser } from '../services/userAuth';

// Convertit l'utilisateur renvoyé par l'API en UserProfile attendu par le reste de l'app
const toUserProfile = (u: AuthUser, extra?: Partial<UserProfile>): UserProfile => ({
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    nickname: u.nickname,
    avatarId: u.avatarId,
    permissions: { notifications: true, location: true },
    language: u.language,
    isAdmin: u.isAdmin,
    history: [],
    ...extra,
});

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

type Mode = 'register' | 'login' | 'forgot' | 'reset';

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onSkip }) => {
    const [mode, setMode] = useState<Mode>('register');
    const [step, setStep] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

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

    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [forgotData, setForgotData] = useState({ email: '', code: '', newPassword: '' });

    const handleLogin = async () => {
        setError(null);
        if (!loginData.email || !loginData.password) {
            setError("Email et mot de passe sont requis.");
            return;
        }
        setSubmitting(true);
        const r = await apiLogin(loginData.email.trim(), loginData.password);
        setSubmitting(false);
        if (!r.ok) { setError(r.message); return; }
        onComplete(toUserProfile(r.user));
    };

    const handleForgotSendCode = async () => {
        setError(null); setInfo(null);
        if (!forgotData.email) { setError("Email requis."); return; }
        setSubmitting(true);
        const r = await apiForgot(forgotData.email.trim());
        setSubmitting(false);
        if (!r.ok) { setError(r.message); return; }
        setInfo(r.message);
        setMode('reset');
    };

    const handleResetPassword = async () => {
        setError(null); setInfo(null);
        if (!/^\d{6}$/.test(forgotData.code)) { setError("Le code doit faire 6 chiffres."); return; }
        if (forgotData.newPassword.length < 6) { setError("Nouveau mot de passe trop court (6 min)."); return; }
        setSubmitting(true);
        const r = await apiReset(forgotData.email.trim(), forgotData.code, forgotData.newPassword);
        setSubmitting(false);
        if (!r.ok) { setError(r.message); return; }
        onComplete(toUserProfile(r.user));
    };

    const handleRegistrationNext = async () => {
        setError(null);
        if (step < 4) {
            setStep(step + 1);
            return;
        }

        const fullPhone = `${formData.phonePrefix} ${formData.phoneNumber}`;
        setSubmitting(true);
        const r = await apiSignup({
            email: formData.email.trim(),
            password: formData.password,
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: fullPhone,
            nickname: formData.nickname.trim(),
            language: formData.language,
            avatarId: selectedAvatar,
        });
        setSubmitting(false);
        if (!r.ok) {
            setError(r.message);
            // Si email déjà utilisé, bascule en login pour éviter la frustration
            if (/email est déjà utilisée/i.test(r.message)) {
                setLoginData({ email: formData.email.trim(), password: '' });
                setMode('login');
            } else {
                setStep(2); // retour sur le formulaire infos
            }
            return;
        }
        onComplete(toUserProfile(r.user, { permissions }));
    };

    const isValidStep2 = formData.firstName && formData.lastName && formData.email && formData.phoneNumber && formData.nickname && formData.password;

    // ---- Mode LOGIN (email + mot de passe) ----
    if (mode === 'login') {
        return (
            <Container>
                <div className="w-full animate-slide-up">
                    <div className="flex justify-center mb-8">
                        <BrandLogo size="lg" />
                    </div>
                    <h2 className="text-2xl font-display text-brand-text text-center mb-6">LëtzTrack : Connexion</h2>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
                            <AlertCircle size={18} className="flex-shrink-0" />{error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="relative">
                            <input type="email" placeholder="Email" autoComplete="email"
                                className="w-full p-3 pl-10 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none"
                                value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
                            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        <div className="relative">
                            <input type="password" placeholder="Mot de passe" autoComplete="current-password"
                                className="w-full p-3 pl-10 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none"
                                value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        <button onClick={handleLogin} disabled={submitting}
                            className="w-full bg-brand-text text-white py-3 rounded-xl font-bold shadow-lg hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-60">
                            <LogIn size={18} /> {submitting ? 'Connexion...' : 'Se connecter'}
                        </button>

                        <div className="text-center">
                            <button onClick={() => { setMode('forgot'); setError(null); setInfo(null); setForgotData({ email: loginData.email, code: '', newPassword: '' }); }}
                                className="text-sm text-brand-pink font-bold hover:underline inline-flex items-center gap-1">
                                <KeyRound size={14} /> Mot de passe oublié ?
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500">Pas encore de compte ?</p>
                        <button onClick={() => { setMode('register'); setError(null); setStep(1); }} className="text-brand-pink font-bold hover:underline">
                            Créer un compte
                        </button>
                    </div>
                </div>
            </Container>
        );
    }

    // ---- Mode FORGOT (saisie email -> envoi code) ----
    if (mode === 'forgot') {
        return (
            <Container>
                <div className="w-full animate-slide-up">
                    <div className="flex justify-center mb-8"><BrandLogo size="lg" /></div>
                    <h2 className="text-2xl font-display text-brand-text text-center mb-2">Mot de passe oublié</h2>
                    <p className="text-sm text-gray-500 text-center mb-6">Nous vous envoyons un code à 6 chiffres pour réinitialiser votre mot de passe.</p>

                    {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2"><AlertCircle size={18} />{error}</div>}
                    {info && <div className="mb-4 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-xl text-sm">{info}</div>}

                    <div className="space-y-4">
                        <div className="relative">
                            <input type="email" placeholder="Votre email"
                                className="w-full p-3 pl-10 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none"
                                value={forgotData.email} onChange={e => setForgotData({...forgotData, email: e.target.value})} />
                            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        <button onClick={handleForgotSendCode} disabled={submitting}
                            className="w-full bg-brand-gradient text-white py-3 rounded-xl font-bold shadow-glow disabled:opacity-60">
                            {submitting ? 'Envoi...' : 'Envoyer le code'}
                        </button>

                        <button onClick={() => { setMode('reset'); setError(null); setInfo(null); }} className="w-full text-sm text-gray-600 py-2">
                            J'ai déjà un code →
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <button onClick={() => { setMode('login'); setError(null); setInfo(null); }} className="text-sm text-brand-pink font-bold hover:underline inline-flex items-center gap-1">
                            <ArrowLeft size={14} /> Retour à la connexion
                        </button>
                    </div>
                </div>
            </Container>
        );
    }

    // ---- Mode RESET (code + nouveau mdp) ----
    if (mode === 'reset') {
        return (
            <Container>
                <div className="w-full animate-slide-up">
                    <div className="flex justify-center mb-8"><BrandLogo size="lg" /></div>
                    <h2 className="text-2xl font-display text-brand-text text-center mb-2">Nouveau mot de passe</h2>
                    <p className="text-sm text-gray-500 text-center mb-6">Saisissez le code à 6 chiffres reçu et votre nouveau mot de passe.</p>

                    {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2"><AlertCircle size={18} />{error}</div>}
                    {info && <div className="mb-4 bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-xl text-sm">{info}</div>}

                    <div className="space-y-4">
                        <div className="relative">
                            <input type="email" placeholder="Votre email"
                                className="w-full p-3 pl-10 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none"
                                value={forgotData.email} onChange={e => setForgotData({...forgotData, email: e.target.value})} />
                            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        <input type="text" inputMode="numeric" maxLength={6} placeholder="Code à 6 chiffres"
                            className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none tracking-[0.5em] text-center text-xl font-bold"
                            value={forgotData.code} onChange={e => setForgotData({...forgotData, code: e.target.value.replace(/\D/g, '').slice(0, 6)})} />
                        <div className="relative">
                            <input type="password" placeholder="Nouveau mot de passe (6 car. min)"
                                className="w-full p-3 pl-10 bg-gray-50 border border-gray-100 rounded-xl focus:border-brand-pink outline-none"
                                value={forgotData.newPassword} onChange={e => setForgotData({...forgotData, newPassword: e.target.value})} />
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        <button onClick={handleResetPassword} disabled={submitting}
                            className="w-full bg-brand-gradient text-white py-3 rounded-xl font-bold shadow-glow disabled:opacity-60">
                            {submitting ? 'Validation...' : 'Réinitialiser'}
                        </button>
                    </div>

                    <div className="mt-6 text-center space-y-2">
                        <button onClick={() => { setMode('forgot'); setError(null); setInfo(null); }} className="text-sm text-gray-600 hover:underline block w-full">
                            Je n'ai pas reçu le code
                        </button>
                        <button onClick={() => { setMode('login'); setError(null); setInfo(null); }} className="text-sm text-brand-pink font-bold hover:underline inline-flex items-center gap-1">
                            <ArrowLeft size={14} /> Retour à la connexion
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
                        <h2 className="text-2xl font-display text-brand-text text-center mb-2">Rejoignez LëtzTrack</h2>
                        
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
                        <h2 className="text-2xl font-display text-brand-text mb-2">Avatar LëtzTrack</h2>
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
                        Déjà inscrit ? <button onClick={() => { setMode('login'); setError(null); }} className="text-brand-pink font-bold hover:underline">Se connecter</button>
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
