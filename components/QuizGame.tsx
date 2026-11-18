
import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { fetchWeeklyQuizAgent } from '../services/geminiService';
import { Brain, Timer, Trophy, ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react';

interface QuizGameProps {
    onComplete: (score: number) => void;
}

export const QuizGame: React.FC<QuizGameProps> = ({ onComplete }) => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [started, setStarted] = useState(false);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showFact, setShowFact] = useState(false);
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        const load = async () => {
            const q = await fetchWeeklyQuizAgent();
            setQuestions(q);
            setLoading(false);
        };
        load();
    }, []);

    const handleOptionClick = (idx: number) => {
        if (selectedOption !== null) return; // Prevent double click
        setSelectedOption(idx);
        
        if (idx === questions[currentIdx].correctIndex) {
            setScore(s => s + 1);
        }
        
        setShowFact(true);
    };

    const handleNext = () => {
        setShowFact(false);
        setSelectedOption(null);
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(c => c + 1);
        } else {
            setFinished(true);
            // In a real app, submit score to server here
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <Brain size={48} className="text-brand-pink animate-pulse" />
                <h2 className="text-xl font-display text-brand-text">Le Chef IA prépare les Tips...</h2>
            </div>
        );
    }

    if (finished) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 animate-slide-up">
                <div className="w-24 h-24 bg-brand-gradient rounded-full flex items-center justify-center mb-6 shadow-xl">
                    <Trophy size={48} className="text-white" />
                </div>
                <h2 className="text-3xl font-display text-brand-text mb-2">Tips Terminés !</h2>
                <p className="text-gray-500 mb-6">Votre score : <span className="text-brand-orange font-bold text-xl">{score} / {questions.length}</span></p>
                
                {score === questions.length ? (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-8">
                        <p className="text-sm text-yellow-800 font-bold">🌟 Score Parfait !</p>
                        <p className="text-xs text-yellow-700 mt-1">Vous êtes en lice pour le "Mur des Champions" sur Taste !</p>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400 mb-8">Bien joué ! Revenez Vendredi prochain.</p>
                )}

                <button 
                    onClick={() => onComplete(score)}
                    className="w-full bg-brand-text text-white py-3 rounded-xl font-bold hover:opacity-90 transition"
                >
                    Retour sur Taste
                </button>
            </div>
        );
    }

    if (!started) {
        return (
            <div className="p-6 flex flex-col items-center text-center h-full animate-slide-up">
                <div className="w-full h-48 bg-brand-gradient rounded-3xl mb-8 flex items-center justify-center relative overflow-hidden shadow-lg shadow-brand-pink/30">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/food.png')] opacity-10"></div>
                    <Brain className="text-white w-20 h-20 drop-shadow-md" />
                </div>
                
                <h1 className="text-3xl font-display text-brand-text mb-2">Food Tips & Quiz</h1>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 w-full text-left">
                    <p className="text-xs text-orange-900 leading-relaxed"><span className="font-bold">Tips, le concept :</span> chaque semaine, un quiz gourmand et des astuces pour déjeuner malin au Luxembourg (où venir, quand éviter la queue, quoi goûter en premier).</p>
                    <p className="text-xs font-bold text-brand-pink mt-1">👩‍🍳 La recette est en cours de préparation.</p>
                </div>
                <p className="text-gray-500 text-sm mb-6 px-4 leading-relaxed">
                    Testez vos connaissances culinaires ! 
                    <br/>
                    <span className="font-bold text-brand-pink">5 Questions. Faits Insolites.</span>
                </p>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-8 text-left w-full">
                    <div className="flex items-center gap-2 mb-2 text-blue-900 font-bold text-sm">
                        <Clock size={16} /> Horaires
                    </div>
                    <ul className="text-xs text-blue-800 space-y-1">
                        <li>• Ouverture : <span className="font-bold">Vendredi 15h30</span></li>
                        <li>• Fermeture : <span className="font-bold">Vendredi 10h00 (Semaine suivante)</span></li>
                        <li>• Les 3 plus rapides sont affichés sur Taste !</li>
                    </ul>
                </div>

                <button 
                    onClick={() => setStarted(true)}
                    className="w-full bg-brand-gradient text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                    Lancer les Tips <ArrowRight size={20} />
                </button>
            </div>
        );
    }

    const question = questions[currentIdx];

    return (
        <div className="p-6 min-h-screen pb-20 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tip {currentIdx + 1} / {questions.length}</span>
                <div className="flex items-center gap-1 text-brand-orange text-xs font-bold">
                    <Timer size={14} /> En direct
                </div>
            </div>

            <div className="flex-1">
                <h2 className="text-xl font-bold text-brand-text mb-8 leading-normal">
                    {question.question}
                </h2>

                <div className="space-y-3">
                    {question.options.map((opt, idx) => {
                        let stateStyles = "bg-white border-gray-200 text-gray-600 hover:border-brand-pink";
                        if (selectedOption !== null) {
                            if (idx === question.correctIndex) stateStyles = "bg-green-50 border-green-500 text-green-700";
                            else if (idx === selectedOption) stateStyles = "bg-red-50 border-red-500 text-red-700";
                            else stateStyles = "bg-gray-50 border-gray-100 text-gray-300";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleOptionClick(idx)}
                                disabled={selectedOption !== null}
                                className={`w-full text-left p-4 rounded-xl border-2 font-medium transition-all duration-200 ${stateStyles} flex justify-between items-center`}
                            >
                                {opt}
                                {selectedOption !== null && idx === question.correctIndex && <CheckCircle size={20} />}
                                {selectedOption === idx && idx !== question.correctIndex && <XCircle size={20} />}
                            </button>
                        )
                    })}
                </div>

                {showFact && (
                    <div className="mt-6 animate-slide-up">
                        <div className="bg-brand-bg border border-brand-border p-4 rounded-xl mb-4 shadow-sm">
                            <p className="text-xs font-bold text-brand-muted uppercase mb-1">Le saviez-vous ?</p>
                            <p className="text-sm text-brand-text italic">"{question.fact}"</p>
                        </div>
                        <button 
                            onClick={handleNext}
                            className="w-full bg-brand-text text-white py-3 rounded-xl font-bold"
                        >
                            {currentIdx < questions.length - 1 ? "Tip Suivant" : "Voir Résultats"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
