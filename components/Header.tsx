
import React from 'react';
import { Bell, User } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { UserProfile } from '../types';

interface HeaderProps {
    onNotificationsClick: () => void;
    onLogoClick: () => void;
    onProfileClick: () => void;
    unreadCount: number;
    user?: UserProfile;
}

export const Header: React.FC<HeaderProps> = ({ onNotificationsClick, onLogoClick, onProfileClick, unreadCount, user }) => {
  const isEmoji = (str?: string) => str && /\p{Emoji}/u.test(str);

  return (
    // CHANGED: Removed 'hidden md:flex' and added 'fixed w-full' to make it visible on mobile and sticky
    <header className="flex bg-white/95 backdrop-blur-sm px-4 md:px-6 py-3 shadow-[0_1px_10px_rgba(0,0,0,0.03)] fixed top-0 left-0 right-0 z-50 border-b border-gray-50 justify-between items-center h-16 transition-all">
      <div className="flex justify-between items-center w-full">
        <button 
            onClick={onLogoClick}
            className="flex items-center hover:opacity-80 transition-opacity"
            aria-label="Accueil"
        >
          <BrandLogo 
            size="sm" 
            layout="horizontal" 
            textClassName="text-lg md:text-xl" 
          />
        </button>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={onNotificationsClick}
                className="p-2 hover:bg-gray-50 rounded-full transition relative text-brand-text group"
            >
                <Bell className="w-6 h-6 stroke-[1.5] group-hover:text-brand-pink transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand-red border-2 border-white rounded-full animate-pulse"></span>
                )}
            </button>
            <button 
                onClick={onProfileClick}
                className="p-1 hover:opacity-80 transition"
            >
                <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-sm overflow-hidden">
                    {user ? (
                        isEmoji(user.avatarId) ? (
                            <span className="text-xl">{user.avatarId}</span>
                        ) : (
                            <img src={user.avatarId} alt="Avatar" className="w-full h-full object-cover" />
                        )
                    ) : <User size={18} />}
                </div>
            </button>
        </div>
      </div>
    </header>
  );
};
