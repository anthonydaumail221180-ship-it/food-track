
import React, { useEffect, useState } from 'react';
import { SocialPost, TrendItem } from '../types';
import { fetchInfluencerPostsAgent } from '../services/geminiService';
import { Heart, MessageCircle, Share2, BadgeCheck, Play, ExternalLink, Trophy, Calendar, MapPin, Flame } from 'lucide-react';

interface SocialWallProps {
    publishedTrends?: TrendItem[]; // Props received from App state (published by Admin)
    onPlayQuiz: () => void;
}

export const SocialWall: React.FC<SocialWallProps> = ({ publishedTrends = [], onPlayQuiz }) => {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInfluencers = async () => {
    setLoading(true);
    const newPosts = await fetchInfluencerPostsAgent();
    setPosts(prev => {
        const manual = prev.filter(p => p.id === 'init-1');
        return [...newPosts, ...manual]; 
    }); 
    setLoading(false);
  };

  useEffect(() => {
    setPosts([
      {
        id: 'init-1',
        author: 'FoodTrack Team',
        isInfluencer: false,
        content: 'Bienvenue sur Taste ! Découvrez les tendances et partagez vos plats.',
        likes: 10,
        timestamp: 'À l\'instant'
      }
    ]);
    loadInfluencers();
  }, []);

  return (
    <div className="space-y-8 pb-20 w-full px-2">
        
        {/* Section 1: Gagnants (Vertical Layout) */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl text-brand-text flex items-center gap-2">
                    <Trophy className="text-brand-orange" size={24} />
                    Champions Tips
                </h3>
                <button 
                    onClick={onPlayQuiz}
                    className="bg-brand-text text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-sm hover:bg-black transition flex items-center gap-1"
                >
                    <Play size={10} fill="currentColor" /> Jouer
                </button>
            </div>
            
            {/* Simple list for mobile verticality */}
            <div className="space-y-3">
                <div className="flex items-center gap-3 bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                    <span className="font-display text-2xl text-yellow-500 w-6 text-center">1</span>
                    <img src="https://picsum.photos/seed/user1/100/100" alt="1st" className="w-10 h-10 rounded-full border-2 border-white" />
                    <span className="font-bold text-brand-text text-sm">Marc D.</span>
                    <Trophy size={16} className="ml-auto text-yellow-400 fill-yellow-400" />
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="font-display text-xl text-gray-400 w-6 text-center">2</span>
                    <img src="https://picsum.photos/seed/user2/100/100" alt="2nd" className="w-8 h-8 rounded-full" />
                    <span className="font-bold text-gray-600 text-sm">Sarah L.</span>
                </div>
                 <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="font-display text-xl text-orange-300 w-6 text-center">3</span>
                    <img src="https://picsum.photos/seed/user3/100/100" alt="3rd" className="w-8 h-8 rounded-full" />
                    <span className="font-bold text-gray-600 text-sm">Julie K.</span>
                </div>
            </div>
        </div>

        {/* Section 2: Trends from Admin (Radar Published) */}
        {publishedTrends.length > 0 && (
             <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Flame className="text-brand-pink" /> Tendances Validées
                </h2>
                {publishedTrends.map(trend => (
                    <div key={trend.id} className="bg-white rounded-3xl overflow-hidden shadow-lg border border-brand-pink/20">
                         <img src={trend.imageUrl || `https://picsum.photos/seed/${trend.id}/600/300`} alt="" className="w-full h-48 object-cover" />
                         <div className="p-5">
                             <div className="flex justify-between items-start mb-2">
                                 <h3 className="font-bold text-xl">{trend.title}</h3>
                                 <span className="bg-black text-white text-[10px] px-2 py-1 rounded font-bold uppercase">Officiel</span>
                             </div>
                             <p className="text-gray-600 text-sm mb-4">{trend.description}</p>
                             <div className="flex gap-3 text-xs text-gray-500 font-medium">
                                {trend.date && <span className="flex items-center gap-1"><Calendar size={12}/> {trend.date}</span>}
                                {trend.location && <span className="flex items-center gap-1"><MapPin size={12}/> {trend.location}</span>}
                             </div>
                         </div>
                    </div>
                ))}
             </div>
        )}

        {/* Section 3: Feed Social */}
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">Taste : Les Potins du Chef</h2>
                <button onClick={loadInfluencers} className="text-xs text-brand-blue font-semibold">Actualiser</button>
            </div>

            {loading && <p className="text-center text-gray-400 text-sm animate-pulse py-10">Recherche des potins...</p>}
            
            {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
                    <div className="p-4 flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${post.isInfluencer ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' : 'bg-gray-300'}`}>
                            {post.author[0]}
                        </div>
                        <div>
                            <p className="text-sm font-bold flex items-center gap-1 text-brand-text">
                                {post.author}
                                {post.isInfluencer && <BadgeCheck className="w-4 h-4 text-brand-blue fill-white" />}
                            </p>
                            <span className="text-[10px] text-gray-400">{post.timestamp}</span>
                        </div>
                    </div>
                    
                    <div className="relative bg-gray-100">
                            {post.videoUrl ? (
                                <div className="aspect-[4/5] relative group cursor-pointer">
                                    <img src={post.imageUrl} alt="Video Thumbnail" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                        <div className="w-14 h-14 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center pl-1 shadow-xl">
                                            <Play fill="white" className="text-white w-6 h-6" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                post.imageUrl && (
                                    <div className="aspect-square">
                                        <img src={post.imageUrl} alt="Post Content" className="w-full h-full object-cover" />
                                    </div>
                                )
                            )}
                    </div>

                    <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex gap-4">
                                <Heart size={24} className="text-gray-700 hover:text-red-500 cursor-pointer" />
                                <MessageCircle size={24} className="text-gray-700" />
                                <Share2 size={24} className="text-gray-700" />
                            </div>
                        </div>
                        <p className="text-gray-800 text-sm leading-relaxed">
                            <span className="font-bold mr-1">{post.author}</span>
                            {post.content} 
                        </p>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
