
import React, { useEffect, useState } from 'react';
import { Notification } from '../types';
import { fetchNotificationsAgent } from '../services/geminiService';
import { Bell, Tag, Info, AlertCircle, Check, Brain } from 'lucide-react';

interface NotificationCenterProps {
    onClose: () => void;
    onRead: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose, onRead }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await fetchNotificationsAgent();
            setNotifications(data);
            setLoading(false);
            // Mark as read after loading (simulated)
            setTimeout(onRead, 2000);
        };
        load();
    }, []);

    const getIcon = (type: string) => {
        switch(type) {
            case 'offer': return <Tag className="text-green-500" size={20} />;
            case 'alert': return <AlertCircle className="text-brand-red" size={20} />;
            case 'quiz': return <Brain className="text-brand-pink" size={20} />;
            default: return <Info className="text-brand-blue" size={20} />;
        }
    };

    return (
        <div className="bg-brand-bg min-h-screen pb-20">
             <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10 flex items-center justify-between">
                <h2 className="font-bold text-lg flex items-center gap-2">
                    <Bell className="text-brand-pink" size={20} /> Notifications
                </h2>
                <button onClick={onClose} className="text-sm text-gray-500 hover:text-black">Fermer</button>
            </div>

            <div className="p-4 space-y-3">
                {loading ? (
                    <p className="text-center text-gray-400 py-10">Recherche de mises à jour...</p>
                ) : notifications.map(n => (
                    <div key={n.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 flex gap-3 ${n.type === 'quiz' ? 'border-brand-pink bg-pink-50/30' : 'border-brand-gradient-start'}`}>
                        <div className="mt-1 flex-shrink-0">
                            {getIcon(n.type)}
                        </div>
                        <div>
                            <h3 className="font-bold text-brand-text text-sm">{n.title}</h3>
                            <p className="text-gray-600 text-xs mt-1">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold">{n.timestamp}</p>
                        </div>
                    </div>
                ))}

                {!loading && (
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-xs mt-8">
                        <Check size={14} /> Tout est lu
                    </div>
                )}
            </div>
        </div>
    );
};
