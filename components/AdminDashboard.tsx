
import React, { useState, useEffect } from 'react';
import { AgentUpdate, TrendItem } from '../types';
import { generateAdminUpdatesAgent, fetchRadarTrendsAgent } from '../services/geminiService';
import { CheckCircle, XCircle, MessageSquare, RefreshCw, AlertTriangle, MapPin, Camera, FileText, ArrowLeft, Radar, Send } from 'lucide-react';

interface AdminDashboardProps {
    onBack: () => void;
    onPublishTrend?: (trend: TrendItem) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onPublishTrend }) => {
    const [updates, setUpdates] = useState<AgentUpdate[]>([]);
    const [trends, setTrends] = useState<TrendItem[]>([]);
    const [loadingUpdates, setLoadingUpdates] = useState(true);
    const [loadingTrends, setLoadingTrends] = useState(true);
    const [activeTab, setActiveTab] = useState<'radar' | 'updates' | 'logs'>('radar');

    useEffect(() => {
        const loadUpdates = async () => {
            setLoadingUpdates(true);
            const data = await generateAdminUpdatesAgent();
            setUpdates(data);
            setLoadingUpdates(false);
        };

        const loadRadar = async () => {
            setLoadingTrends(true);
            const data = await fetchRadarTrendsAgent();
            setTrends(data);
            setLoadingTrends(false);
        }

        loadUpdates();
        loadRadar();
    }, []);

    const handleAction = (id: string, action: 'approved' | 'rejected') => {
        setUpdates(prev => prev.map(u => 
            u.id === id ? { ...u, status: action } : u
        ));
    };

    const handlePublish = (trendId: string) => {
        const trend = trends.find(t => t.id === trendId);
        if (trend && onPublishTrend) {
            onPublishTrend({ ...trend, description: `${trend.description}` });
            setTrends(prev => prev.filter(t => t.id !== trendId));
            alert("Tendance publiée sur Taste !");
        }
    };

    const getIcon = (type: string) => {
        switch(type) {
            case 'menu': return <FileText size={18} className="text-blue-500" />;
            case 'photo': return <Camera size={18} className="text-purple-500" />;
            case 'location': return <MapPin size={18} className="text-brand-orange" />;
            default: return <AlertTriangle size={18} className="text-red-500" />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-gray-900 text-white p-6 pb-10 rounded-b-[40px] shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-display text-2xl">Admin Center</h1>
                </div>
                
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">Agent Éclaireur</p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="font-bold text-green-400 text-sm">En chasse de tendances...</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs - GRID LAYOUT (No Horizontal Scroll) */}
            <div className="grid grid-cols-3 px-6 -mt-6 relative z-10 gap-2">
                <button 
                    onClick={() => setActiveTab('radar')}
                    className={`py-3 px-2 rounded-xl shadow-md font-bold text-xs md:text-sm flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 transition ${activeTab === 'radar' ? 'bg-brand-gradient text-white' : 'bg-gray-800 text-gray-400'}`}
                >
                    <Radar size={16} /> Radar IA
                </button>
                <button 
                    onClick={() => setActiveTab('updates')}
                    className={`py-3 px-2 rounded-xl shadow-md font-bold text-xs md:text-sm flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 transition ${activeTab === 'updates' ? 'bg-white text-brand-text' : 'bg-gray-800 text-gray-400'}`}
                >
                    <RefreshCw size={16} /> Updates
                </button>
                <button 
                    onClick={() => setActiveTab('logs')}
                    className={`py-3 px-2 rounded-xl shadow-md font-bold text-xs md:text-sm flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 transition ${activeTab === 'logs' ? 'bg-white text-brand-text' : 'bg-gray-800 text-gray-400'}`}
                >
                    <MessageSquare size={16} /> Comms
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 mt-4">
                
                {/* --- RADAR TAB --- */}
                {activeTab === 'radar' && (
                    <div className="space-y-4">
                        <p className="text-xs text-gray-400 text-center uppercase tracking-wide mb-4">Tendances détectées sur le web</p>
                        {loadingTrends ? (
                            <div className="text-center py-10">
                                <Radar className="animate-pulse mx-auto text-brand-pink mb-2" size={48} />
                                <p className="text-gray-400 text-sm">Scan des réseaux sociaux en cours...</p>
                            </div>
                        ) : trends.length === 0 ? (
                            <p className="text-center text-gray-400 py-10">Aucune nouvelle tendance à valider.</p>
                        ) : (
                            trends.map(item => (
                                <div key={item.id} className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 flex flex-col gap-3 animate-slide-up">
                                    <div className="flex justify-between items-start">
                                        <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-1 rounded-full font-bold uppercase">{item.source}</span>
                                        <span className="text-xs text-gray-400">{item.type}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <img src={item.imageUrl || `https://picsum.photos/seed/${item.id}/100/100`} alt="" className="w-16 h-16 rounded-lg object-cover" />
                                        <div>
                                            <h3 className="font-bold text-brand-text leading-tight">{item.title}</h3>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handlePublish(item.id)}
                                        className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition"
                                    >
                                        <Send size={16} /> Valider & Publier
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* --- UPDATES TAB --- */}
                {activeTab === 'updates' && (
                    loadingUpdates ? (
                        <div className="text-center py-10">
                            <RefreshCw className="animate-spin mx-auto text-brand-pink mb-2" size={32} />
                            <p className="text-gray-400 text-sm">Vérification des camions...</p>
                        </div>
                    ) : (
                        updates.filter(u => u.status === 'pending').map(u => (
                            <div key={u.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-slide-up">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-gray-50 rounded-lg">{getIcon(u.type)}</div>
                                        <div>
                                            <h3 className="font-bold text-brand-text text-sm">{u.truckName}</h3>
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                Via {u.source} • {u.timestamp}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${u.confidence > 80 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                        {u.confidence}%
                                    </span>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                                    <div className="flex items-center gap-2 font-bold text-brand-text mt-1">
                                        {u.newValue}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleAction(u.id, 'rejected')}
                                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 font-bold text-xs flex items-center justify-center gap-1"
                                    >
                                        <XCircle size={16} /> Rejeter
                                    </button>
                                    <button 
                                        onClick={() => handleAction(u.id, 'approved')}
                                        className="flex-1 py-2 bg-brand-gradient text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-md hover:opacity-90"
                                    >
                                        <CheckCircle size={16} /> Approuver
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}

                {/* --- LOGS TAB --- */}
                {activeTab === 'logs' && (
                    <div className="space-y-6">
                        <div className="border-l-2 border-gray-200 pl-4 ml-2 space-y-6">
                            {updates.map((u, idx) => (
                                <div key={idx} className="relative">
                                    <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-gray-300 border-2 border-white"></div>
                                    <p className="text-[10px] text-gray-400 mb-1">{u.timestamp}</p>
                                    <div className="bg-white p-3 rounded-lg shadow-sm text-xs">
                                        <span className="font-bold text-brand-pink">Agent IA</span> a contacté <span className="font-bold">{u.truckName}</span>.
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
