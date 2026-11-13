
import React, { useState } from 'react';
import { UserProfile as UserProfileType } from '../types';
import { Edit2, MapPin, Bell, LogOut, ArrowLeft, Save, X, Camera, ShieldCheck, Globe, Check, UserPlus } from 'lucide-react';
import { COUNTRY_CODES, FOOD_AVATARS, LANGUAGES } from './Onboarding';

interface UserProfileProps {
    user: UserProfileType;
    onBack: () => void;
    onLogout: () => void;
    onAdminClick?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onBack, onLogout, onAdminClick }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
    
    // Edit State
    const [editData, setEditData] = useState({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phonePrefix: user.phone.split(' ')[0] || '+352',
        phoneNumber: user.phone.split(' ').slice(1).join(' ') || '',
        nickname: user.nickname,
        avatarId: user.avatarId,
        language: user.language || 'fr'
    });
    const [showAvatarSelector, setShowAvatarSelector] = useState(false);

    const isImage = (str: string) => str.startsWith('data:image') || str.startsWith('http');

    // Display logic
    const renderAvatar = (avatarString: string, className: string) => {
        if (isImage(avatarString)) {
            return <img src={avatarString} alt="Avatar" className={`object-cover w-full h-full rounded-full ${className}`} />;
        }
        return <span className={className}>{avatarString}</span>;
    };

    const handleSave = () => {
        const fullPhone = `${editData.phonePrefix} ${editData.phoneNumber}`;
        
        const allUsersRaw = localStorage.getItem('foodtrack_all_users');
        if (allUsersRaw) {
            const allUsers: UserProfileType[] = JSON.parse(allUsersRaw);
            const updatedList = allUsers.map(u => {
                if (u.email === user.email) { 
                    return {
                        ...u,
                        firstName: editData.firstName,
                        lastName: editData.lastName,
                        email: editData.email,
                        phone: fullPhone,
                        nickname: editData.nickname,
                        avatarId: editData.avatarId,
                        language: editData.language
                    };
                }
                return u;
            });
            localStorage.setItem('foodtrack_all_users', JSON.stringify(updatedList));
            
            const updatedUser = updatedList.find(u => u.email === editData.email);
            if (updatedUser) {
                localStorage.setItem('foodtrack_user', JSON.stringify(updatedUser));
                window.location.reload(); 
            }
        }
        setIsEditing(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header Area */}
            <div className="bg-brand-gradient-vertical pb-24 pt-6 px-6 rounded-b-[40px] shadow-lg relative z-0">
                <div className="flex justify-between items-start text-white">
                    <button onClick={onBack} className="hover:bg-white/20 p-2 rounded-full transition">
                        <ArrowLeft size={24} />
                    </button>
                    <button 
                        onClick={isEditing ? handleSave : () => setIsEditing(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition ${isEditing ? 'bg-white text-brand-pink' : 'bg-white/20 text-white hover:bg-white/30'}`}
                    >
                        {isEditing ? <><Save size={16} /> Enregistrer</> : <><Edit2 size={16} /> Modifier</>}
                    </button>
                </div>
                
                <div className="flex flex-col items-center mt-2">
                    <div className="w-28 h-28 bg-white rounded-full p-1.5 shadow-xl mb-4 relative group cursor-pointer" onClick={() => isEditing && setShowAvatarSelector(!showAvatarSelector)}>
                        <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-6xl select-none overflow-hidden">
                            {renderAvatar(editData.avatarId, "")}
                        </div>
                        {isEditing && (
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={24} />
                            </div>
                        )}
                    </div>
                    
                    {/* Avatar Selector Modal - SIMPLIFIED (No AI) */}
                    {showAvatarSelector && isEditing && (
                        <div className="absolute top-full left-0 right-0 bg-white rounded-xl shadow-2xl p-4 z-50 mx-4 mt-2 border border-gray-100 animate-slide-up">
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 text-center">Choisir un avatar</h3>
                            <div className="grid grid-cols-5 gap-3 h-48 overflow-y-auto custom-scrollbar">
                                {FOOD_AVATARS.map((emoji, idx) => (
                                    <button 
                                        key={idx} 
                                        onClick={() => { setEditData({...editData, avatarId: emoji}); setShowAvatarSelector(false); }}
                                        className="text-3xl hover:scale-125 transition-transform p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isEditing ? (
                        <input 
                            type="text" 
                            value={editData.nickname} 
                            onChange={e => setEditData({...editData, nickname: e.target.value})}
                            className="bg-white/20 text-white text-center font-display text-2xl border-b border-white/50 focus:outline-none focus:border-white w-full max-w-xs"
                        />
                    ) : (
                        <h1 className="text-white font-display text-3xl drop-shadow-sm">{editData.nickname}</h1>
                    )}
                    <p className="text-white/80 text-sm mt-1">{user.email}</p>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-6 -mt-12 relative z-10 space-y-6">
                
                {/* Stats / Tabs Card */}
                <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden flex">
                    <button 
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-4 text-center transition ${activeTab === 'profile' ? 'bg-gray-50 text-brand-text' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                    >
                         <p className="font-bold text-lg">Profil</p>
                    </button>
                    <div className="w-px bg-gray-100"></div>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-4 text-center transition ${activeTab === 'history' ? 'bg-gray-50 text-brand-text' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                    >
                         <p className="font-bold text-lg">Historique</p>
                    </button>
                </div>

                {/* --- PROFILE TAB --- */}
                {activeTab === 'profile' && (
                    <div className="space-y-6 animate-slide-up">
                        {/* Admin Button */}
                        {onAdminClick && (
                            <button 
                                onClick={onAdminClick}
                                className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between group hover:bg-black transition"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                        <ShieldCheck className="text-brand-pink group-hover:scale-110 transition-transform" size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-sm">Espace Propriétaire / Admin</p>
                                        <p className="text-xs text-gray-400">Gérer les camions & validations</p>
                                    </div>
                                </div>
                                <ArrowLeft size={20} className="rotate-180 text-gray-500 group-hover:text-white transition-colors" />
                            </button>
                        )}

                        {/* Personal Info */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-brand-text text-lg">Mes Infos</h3>
                                {isEditing && <span className="text-xs text-brand-pink animate-pulse">Mode Édition</span>}
                            </div>

                            <div className="space-y-4 text-sm">
                                {/* Name Edit */}
                                <div className="flex flex-col border-b border-gray-50 pb-3">
                                    <span className="text-gray-400 text-xs mb-1">Nom complet</span>
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <input 
                                                className="w-full bg-gray-50 p-2 rounded border border-gray-200" 
                                                value={editData.firstName} 
                                                onChange={e => setEditData({...editData, firstName: e.target.value})}
                                                placeholder="Prénom"
                                            />
                                            <input 
                                                className="w-full bg-gray-50 p-2 rounded border border-gray-200" 
                                                value={editData.lastName} 
                                                onChange={e => setEditData({...editData, lastName: e.target.value})}
                                                placeholder="Nom"
                                            />
                                        </div>
                                    ) : (
                                        <span className="font-medium text-gray-800 text-base">{editData.firstName} {editData.lastName}</span>
                                    )}
                                </div>

                                {/* Phone Edit */}
                                <div className="flex flex-col border-b border-gray-50 pb-3">
                                    <span className="text-gray-400 text-xs mb-1">Téléphone</span>
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <select 
                                                className="bg-gray-50 p-2 rounded border border-gray-200 text-xs"
                                                value={editData.phonePrefix}
                                                onChange={e => setEditData({...editData, phonePrefix: e.target.value})}
                                            >
                                                {COUNTRY_CODES.map(c => (
                                                    <option key={c.code} value={c.code}>{c.country} {c.code}</option>
                                                ))}
                                            </select>
                                            <input 
                                                type="tel"
                                                className="flex-1 bg-gray-50 p-2 rounded border border-gray-200" 
                                                value={editData.phoneNumber} 
                                                onChange={e => setEditData({...editData, phoneNumber: e.target.value})}
                                            />
                                        </div>
                                    ) : (
                                        <span className="font-medium text-gray-800 text-base flex items-center gap-2">
                                            <span className="text-gray-400 text-sm">({editData.phonePrefix})</span>
                                            {editData.phoneNumber}
                                        </span>
                                    )}
                                </div>

                                {/* Email Edit */}
                                <div className="flex flex-col pb-1">
                                    <span className="text-gray-400 text-xs mb-1">Email</span>
                                    {isEditing ? (
                                        <input 
                                            className="w-full bg-gray-50 p-2 rounded border border-gray-200" 
                                            value={editData.email} 
                                            onChange={e => setEditData({...editData, email: e.target.value})}
                                        />
                                    ) : (
                                        <span className="font-medium text-gray-800 text-base">{editData.email}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Language Selection */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-brand-text text-lg flex items-center gap-2">
                                    <Globe size={20} className="text-brand-orange" />
                                    Langue / Sprooch
                                </h3>
                            </div>
                            
                            {isEditing ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {LANGUAGES.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => setEditData({...editData, language: lang.code})}
                                            className={`flex items-center gap-2 p-2 rounded-xl border transition ${editData.language === lang.code ? 'border-brand-pink bg-pink-50' : 'border-gray-100 hover:bg-gray-50'}`}
                                        >
                                            <span className="text-lg">{lang.flag}</span>
                                            <span className={`text-sm ${editData.language === lang.code ? 'font-bold text-brand-text' : 'text-gray-600'}`}>{lang.label}</span>
                                            {editData.language === lang.code && <Check size={14} className="ml-auto text-brand-pink" />}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{LANGUAGES.find(l => l.code === editData.language)?.flag}</span>
                                    <span className="font-medium text-gray-800">{LANGUAGES.find(l => l.code === editData.language)?.label || 'Français'}</span>
                                </div>
                            )}
                        </div>

                        {isEditing && (
                            <button 
                                onClick={() => setIsEditing(false)} 
                                className="w-full py-3 text-gray-500 font-bold text-sm bg-white border border-gray-200 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50"
                            >
                                <X size={16} /> Annuler les modifications
                            </button>
                        )}

                        {!isEditing && (
                            <button 
                                onClick={onLogout}
                                className="w-full py-4 text-red-500 font-bold text-sm flex items-center justify-center gap-2 bg-red-50 rounded-xl hover:bg-red-100 transition"
                            >
                                <LogOut size={18} /> Se déconnecter
                            </button>
                        )}
                    </div>
                )}

                {/* --- HISTORY TAB --- */}
                {activeTab === 'history' && (
                    <div className="space-y-4 animate-slide-up">
                        <h3 className="font-display text-xl text-brand-text">Mon Carnet de Miam</h3>
                        {user.history.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-gray-400 mb-2">Vous n'avez encore rien mangé !</p>
                                <p className="text-sm text-brand-blue">Allez valider un plat sur la fiche d'un camion.</p>
                            </div>
                        ) : (
                            user.history.map((item, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-brand-orange flex flex-col gap-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-brand-text">{item.itemName}</h4>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                Chez <span className="font-bold">{item.truckName}</span>
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                                            {new Date(item.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {item.taggedFriend && (
                                        <div className="flex items-center gap-2 mt-2 bg-blue-50 p-2 rounded-lg text-xs text-blue-800">
                                            <UserPlus size={14} />
                                            Avec <span className="font-bold">{item.taggedFriend.name}</span>
                                            {item.taggedFriend.status === 'unknown' && <span className="text-[10px] opacity-60">(Invité)</span>}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
