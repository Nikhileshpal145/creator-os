import { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, Sparkles, TrendingUp, Lightbulb, Target } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

interface Pattern {
    id: string;
    pattern_type: string;
    explanation: string;
}

interface Recommendation {
    title: string;
    description: string;
}

interface IntelligenceInsightsProps {
    userId: string;
}

export default function IntelligenceInsights({ userId }: IntelligenceInsightsProps) {
    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIntelligence = async () => {
            try {
                const [patternsRes, recommendationsRes] = await Promise.all([
                    axios.get(`${API_BASE}/intelligence/patterns/${userId}`),
                    axios.get(`${API_BASE}/intelligence/recommendations/${userId}`),
                ]);

                setPatterns(patternsRes.data.patterns || []);
                setRecommendations(recommendationsRes.data.recommendations || []);
            } catch (error) {
                console.error('Failed to fetch intelligence data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchIntelligence();
    }, [userId]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gray-700 rounded-xl animate-pulse" />
                    <div className="flex-1">
                        <div className="h-5 bg-gray-700 rounded w-48 mb-2 animate-pulse" />
                        <div className="h-3 bg-gray-800 rounded w-72 animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700/50 animate-pulse">
                            <div className="h-4 bg-gray-700 rounded w-3/4 mb-3" />
                            <div className="h-3 bg-gray-800 rounded w-full mb-2" />
                            <div className="h-3 bg-gray-800 rounded w-5/6" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const hasInsights = patterns.length > 0 || recommendations.length > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shadow-purple-500/30">
                    <Brain size={22} className="text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Intelligence Insights</h2>
                    <p className="text-sm text-gray-400">Patterns and recommendations from our AI</p>
                </div>
            </div>

            {!hasInsights ? (
                /* Empty State */
                <div className="relative bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 border border-purple-500/20 rounded-3xl p-12 text-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 opacity-50" />
                    <div className="relative">
                        <div className="inline-flex p-4 bg-purple-500/10 rounded-2xl mb-4">
                            <Sparkles size={32} className="text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">AI Learning in Progress</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            Our AI is analyzing your content patterns. Connect your social media accounts and post more content to unlock personalized insights and recommendations.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Patterns */}
                    {patterns.map((pattern, idx) => {
                        const icons = [TrendingUp, Target, Lightbulb, Sparkles];
                        const colors = [
                            { gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', border: 'border-emerald-500/20' },
                            { gradient: 'from-blue-500 to-cyan-600', shadow: 'shadow-blue-500/20', border: 'border-blue-500/20' },
                            { gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', border: 'border-amber-500/20' },
                            { gradient: 'from-purple-500 to-pink-600', shadow: 'shadow-purple-500/20', border: 'border-purple-500/20' },
                        ];
                        const Icon = icons[idx % icons.length];
                        const color = colors[idx % colors.length];

                        return (
                            <div
                                key={pattern.id}
                                className={`relative group bg-gray-900/60 backdrop-blur-xl border ${color.border} rounded-2xl p-6 hover:border-opacity-50 transition-all shadow-lg ${color.shadow} hover:shadow-2xl hover:-translate-y-1 duration-300 overflow-hidden`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${color.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                                <div className="relative">
                                    <div className={`inline-flex p-2.5 bg-gradient-to-br ${color.gradient} rounded-xl shadow-lg mb-3`}>
                                        <Icon size={18} className="text-white" />
                                    </div>
                                    <h3 className="font-bold text-white mb-2 capitalize">{pattern.pattern_type.replace(/_/g, ' ')}</h3>
                                    <p className="text-sm text-gray-400">{pattern.explanation}</p>
                                </div>
                            </div>
                        );
                    })}

                    {/* Recommendations */}
                    {recommendations.map((rec, idx) => {
                        const colors = [
                            { gradient: 'from-indigo-500 to-purple-600', shadow: 'shadow-indigo-500/20', border: 'border-indigo-500/20' },
                            { gradient: 'from-rose-500 to-pink-600', shadow: 'shadow-rose-500/20', border: 'border-rose-500/20' },
                        ];
                        const color = colors[idx % colors.length];

                        return (
                            <div
                                key={idx}
                                className={`relative group bg-gray-900/60 backdrop-blur-xl border ${color.border} rounded-2xl p-6 hover:border-opacity-50 transition-all shadow-lg ${color.shadow} hover:shadow-2xl hover:-translate-y-1 duration-300 overflow-hidden`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${color.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                                <div className="relative">
                                    <div className={`inline-flex p-2.5 bg-gradient-to-br ${color.gradient} rounded-xl shadow-lg mb-3`}>
                                        <Lightbulb size={18} className="text-white" />
                                    </div>
                                    <h4 className="font-bold text-white mb-2">{rec.title}</h4>
                                    <p className="text-sm text-gray-400">{rec.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
