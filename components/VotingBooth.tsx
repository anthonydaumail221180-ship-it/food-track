
import React, { useState, useEffect } from 'react';
import { getVoteEncouragement } from '../services/geminiService';
import { Trophy, Gift } from 'lucide-react';

export const VotingBooth: React.FC = () => {
  const [message, setMessage] = useState("Chargement de la hype...");
  const [votedId, setVotedId] = useState<string | null>(null);
  
  // Mock Candidates
  const candidates = [
    { id: '1', name: 'Gromper King', percent: 45, color: 'from-orange-400 to-red-500' },
    { id: '2', name: 'Thai Express', percent: 30, color: 'from-purple-400 to-pink-500' },
    { id: '3', name: 'Burger Bros', percent: 25, color: 'from-blue-400 to-cyan-500' },
  ];

  useEffect(() => {
    getVoteEncouragement('Gromper King').then(setMessage);
  }, []);

  const handleVote = (id: string) => {
    if (votedId) return;
    setVotedId(id);
    // In a real app, POST to backend here
    alert("Like enregistré !");
  };

  return (
    <div className="space-y-6 pb-20">
        {/* Hero Banner */}
        <div className="bg-brand-gradient-vertical rounded-3xl p-6 text-white shadow-lg shadow-brand-pink/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
            <div className="relative z-10 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-300 drop-shadow-sm" />
                <h2 className="text-3xl font-display mb-1">Le Like de la Semaine</h2>
                <p className="text-white/90 text-sm font-medium">Soutenez votre food truck préféré !</p>
            </div>
        </div>

        {/* Agent Hype Message */}
        <div className="bg-white border-l-4 border-brand-orange p-4 rounded-r-xl shadow-sm">
            <p className="text-sm text-gray-600 font-medium italic">
                "Agent: {message}"
            </p>
        </div>

        {/* Voting List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-800">Classement Actuel</h3>
            </div>
            <div className="divide-y divide-gray-100">
                {candidates.map(c => (
                    <div key={c.id} className="p-4 hover:bg-gray-50 transition cursor-pointer" onClick={() => handleVote(c.id)}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-brand-text">{c.name}</span>
                            {votedId === c.id ? (
                                <span className="text-xs bg-brand-green text-white px-2 py-1 rounded-full font-bold">Liké</span>
                            ) : (
                                <span className="text-xs text-gray-400">{c.percent}%</span>
                            )}
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div className={`bg-gradient-to-r ${c.color} h-2.5 rounded-full transition-all duration-1000 shadow-sm`} style={{ width: `${c.percent}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
            <Gift size={14} />
            <span>Remise à zéro chaque dimanche à 20h00</span>
        </div>
    </div>
  );
};
