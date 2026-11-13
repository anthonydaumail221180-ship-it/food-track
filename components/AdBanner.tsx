
import React, { useState, useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';

const ADS = [
    {
        id: 1,
        title: "Coca-Cola Zero",
        subtitle: "Le compagnon idéal de votre burger.",
        color: "bg-red-600",
        textColor: "text-white",
        link: "https://coca-cola.com",
        image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80"
    },
    {
        id: 2,
        title: "Bofferding",
        subtitle: "Le savoir-faire luxembourgeois.",
        color: "bg-green-700",
        textColor: "text-white",
        link: "https://bofferding.lu",
        image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=800&q=80"
    },
    {
        id: 3,
        title: "Spuerkeess",
        subtitle: "Payez sans contact, mangez sans attendre.",
        color: "bg-blue-800",
        textColor: "text-white",
        link: "https://spuerkeess.lu",
        image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=800&q=80"
    }
];

export const AdBanner: React.FC = () => {
    const [currentAdIndex, setCurrentAdIndex] = useState(0);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentAdIndex((prev) => (prev + 1) % ADS.length);
        }, 8000); // Rotate every 8s
        return () => clearInterval(interval);
    }, []);

    if (!visible) return null;

    const ad = ADS[currentAdIndex];

    return (
        <div className="relative w-full rounded-2xl overflow-hidden shadow-lg animate-slide-up group h-32 md:h-40">
            {/* Background Image */}
            <img 
                src={ad.image} 
                alt={ad.title} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[8000ms] ease-linear scale-100 group-hover:scale-110"
            />
            
            {/* Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent`}></div>

            {/* Content */}
            <div className="absolute inset-0 p-6 flex flex-col justify-center max-w-lg">
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1 border border-white/20 self-start px-2 rounded">Sponsor</span>
                <h3 className={`text-2xl md:text-3xl font-display text-white mb-1 drop-shadow-md`}>{ad.title}</h3>
                <p className="text-white/90 text-xs md:text-sm font-medium mb-3 max-w-xs">{ad.subtitle}</p>
                
                <a 
                    href={ad.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white text-black text-xs font-bold px-4 py-2 rounded-full self-start flex items-center gap-1 hover:bg-gray-100 transition"
                >
                    Découvrir <ExternalLink size={12} />
                </a>
            </div>

            {/* Close Button */}
            <button 
                onClick={(e) => { e.preventDefault(); setVisible(false); }}
                className="absolute top-2 right-2 p-1 bg-black/20 hover:bg-black/40 rounded-full text-white/80 transition"
            >
                <X size={14} />
            </button>
        </div>
    );
};
