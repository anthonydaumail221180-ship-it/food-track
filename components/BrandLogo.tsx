
import React from 'react';

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  textClassName?: string;
  layout?: 'vertical' | 'horizontal'; // New prop for layout control
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = "", 
  showText = true, 
  size = 'md',
  textClassName = "",
  layout = 'vertical'
}) => {
  // Size mapping
  const dim = {
    sm: 24,
    md: 40,
    lg: 80,
    xl: 120
  }[size];

  return (
    <div className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row'} items-center justify-center ${className}`}>
      <div className={`relative flex items-center justify-center flex-shrink-0`}>
        {/* The Icon: A Fusion of a Location Pin and a Food Truck */}
        <svg 
          width={dim} 
          height={dim} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-xl"
        >
          <defs>
            <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF512F" /> {/* Orange */}
              <stop offset="100%" stopColor="#DD2476" /> {/* Pink */}
            </linearGradient>
          </defs>
          
          {/* The Pin Body (Truck Body) */}
          <path 
            d="M50 5C27.9086 5 10 22.9086 10 45C10 67.0914 27.9086 85 50 85C72.0914 85 90 67.0914 90 45C90 22.9086 72.0914 5 50 5Z" 
            fill="url(#brandGradient)" 
          />
          
          {/* The Window / Inner Pin Hole */}
          <path 
            d="M50 25C38.9543 25 30 33.9543 30 45H70C70 33.9543 61.0457 25 50 25Z" 
            fill="white" 
            fillOpacity="0.9"
          />
          
          {/* Wheels (Turning the Pin into a Truck) */}
          <circle cx="30" cy="85" r="12" fill="#1a1a1a" stroke="white" strokeWidth="4" />
          <circle cx="70" cy="85" r="12" fill="#1a1a1a" stroke="white" strokeWidth="4" />
          
          {/* Speed Lines (Motion) */}
          <path d="M95 35H105" stroke="url(#brandGradient)" strokeWidth="4" strokeLinecap="round" />
          <path d="M95 45H110" stroke="url(#brandGradient)" strokeWidth="4" strokeLinecap="round" />
          <path d="M95 55H102" stroke="url(#brandGradient)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>

      {/* The Text Logo */}
      {showText && (
        <h1 className={`font-display bg-brand-gradient bg-clip-text text-transparent drop-shadow-sm tracking-wide ${layout === 'vertical' ? 'mt-2' : 'ml-3'} ${textClassName}`}>
            LëtzTrack
        </h1>
      )}
    </div>
  );
};
