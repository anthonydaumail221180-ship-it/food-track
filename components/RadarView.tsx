
import React, { useEffect, useState } from 'react';
import { TrendItem } from '../types';
import { fetchRadarTrendsAgent } from '../services/geminiService';
import { Radar, Calendar, MapPin, ExternalLink, Flame, Sparkles, Facebook, Instagram, Globe } from 'lucide-react';
import { AdBanner } from './AdBanner';

export const RadarView: React.FC = () => {
    const [trends, setTrends] = useState<TrendItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const data = await fetchRadarTrendsAgent();
            setTrends(data);
            setLoading(false);
        };
        load();
    }, []);

    const getIcon = (source: string) => {
        switch(source) {
            case 'facebook': return <Facebook size={14} />;
            case 'instagram': return <Instagram size={14} />;
            case 'tiktok': return <span className="font-bold text-[10px]">TikTok</span>;
            default: return <Globe size={14} />;
        }
    };

    const getTypeStyles = (type: string) => {
        switch(type) {
            case 'event': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'buzz': return 'bg-brand-gradient text-white border-transparent shadow-md';
            default: return 'bg-purple-50 text-purple-600 border-purple-100';
        }
    };

    return (
        <div className="space-y-6 pb-24 w-full">
            {/* Header Agent Section */}
            <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-pink/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                            <Radar className="text-brand-orange animate-pulse" size={20} />
                        </div>
                        <h2 className="font-display text-2xl">L'Éclaireur IA</h2>
                    </div>
                    <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
                        Notre agent scanne en permanence <span className="text-white font-bold">Facebook, Instagram et TikTok</span> pour dénicher les événements street food et les plats qui font le buzz au Luxembourg.
                    </p>
                </div>
            </div>

            {/* Ad Banner placement for visibility */}
            <AdBanner />

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-3xl p-6 h-64 flex flex-col justify-between animate-pulse border border-gray-100">
                            <div className="h-6 bg-gray-100 rounded w-3/4 mb-4"></div>
                            <div className="space-y-2">
                                <div className="h-3 bg-gray-100 rounded"></div>
                                <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                            </div>
                            <div className="h-8 bg-gray-100 rounded-full w-1/2 mt-4"></div>
                        </div>
                    ))
                ) : (
                    trends.map((item) => (
                        <div key={item.id} className="bg-white rounded-3xl p-0 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100 hover:shadow-xl transition-all group overflow-hidden flex flex-col">
                            <div className="h-40 relative overflow-hidden">
                                <img 
                                    src={item.imageUrl || `https://picsum.photos/seed/${item.id}/600/300`} 
                                    alt={item.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute top-4 left-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${getTypeStyles(item.type)}`}>
                                        {item.type === 'event' && <Calendar size={10} />}
                                        {item.type === 'buzz' && <Flame size={10} fill="white" />}
                                        {item.type === 'hidden_gem' && <Sparkles size={10} />}
                                        {item.type === 'event' ? 'Événement' : item.type === 'buzz' ? 'Viral' : 'Pépite'}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="font-bold text-xl text-brand-text mb-2 leading-tight">{item.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1">
                                    {item.description}
                                </p>

                                <div className="space-y-3 border-t border-gray-50 pt-4">
                                    {item.date && (
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                            <Calendar size={14} className="text-brand-pink" />
                                            {item.date}
                                        </div>
                                    )}
                                    {item.location && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <MapPin size={14} className="text-gray-400" />
                                            {item.location}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg text-gray-500 text-xs">
                                        <span className="text-[10px] uppercase font-bold text-gray-400">Vu sur</span>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${item.source === 'facebook' ? 'bg-blue-600' : item.source === 'instagram' ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' : item.source === 'tiktok' ? 'bg-black' : 'bg-gray-400'}`}>
                                            {getIcon(item.source)}
                                        </div>
                                    </div>
                                    <button className="text-brand-blue hover:text-blue-700 transition">
                                        <ExternalLink size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
