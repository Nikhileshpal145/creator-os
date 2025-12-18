import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Brain, TrendingUp, Clock, Hash, Zap, Target,
    ArrowUpRight, Sparkles, ChevronRight, Lightbulb
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

interface Pattern {
    id: string;
    pattern_type: string;
    platform: string;
    pattern_data: Record<string, unknown>;
    confidence_score: number;
    sample_size: number;
    performance_multiplier: number;
    explanation: string;
    analysis_window_days: number;
}

interface Recommendation {
    title: string;
    description: string;
    priority: number;
    category: string;
    expected_impact: string;
}

interface IntelligenceSummary {
    headline: string;
    top_multiplier: number;
    total_patterns: number;
    total_recommendations: number;
    top_recommendation: Recommendation | null;
}

interface IntelligenceInsightsProps {
    userId: string;
}

// Pattern type icon mapping
const getPatternIcon = (patternType: string) => {
    switch (patternType) {
        case 'content_type': return <Zap size={18} />;
        case 'posting_time': return <Clock size={18} />;
        case 'posting_day': return <Clock size={18} />;
        case 'caption_structure': return <Hash size={18} />;
        case 'engagement_velocity': return <TrendingUp size={18} />;
        case 'platform_performance': return <Target size={18} />;
        default: return <Brain size={18} />;
    }
};

// Pattern type color mapping
const getPatternColor = (patternType: string): string => {
    switch (patternType) {
        case 'content_type': return 'from-purple-500 to-pink-500';
        case 'posting_time': return 'from-blue-500 to-cyan-500';
        case 'posting_day': return 'from-indigo-500 to-blue-500';
        case 'caption_structure': return 'from-green-500 to-emerald-500';
        case 'engagement_velocity': return 'from-orange-500 to-yellow-500';
        case 'platform_performance': return 'from-rose-500 to-red-500';
        default: return 'from-gray-500 to-gray-600';
    }
};

// Format multiplier for display
const formatMultiplier = (multiplier: number): string => {
    if (multiplier >= 1) {
        return `${multiplier.toFixed(1)}×`;
    }
    return `${(multiplier * 100).toFixed(0)}%`;
};

// Confidence indicator component
function ConfidenceIndicator({ score }: { score: number }) {
    const percentage = Math.round(score * 100);
    const barWidth = Math.min(percentage, 100);

    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                />
            </div>
            <span className="text-xs text-gray-400">{percentage}%</span>
        </div>
    );
}

// Individual pattern card
function PatternCard({ pattern }: { pattern: Pattern }) {
    const isPositive = pattern.performance_multiplier >= 1;

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/50 transition-all group">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${getPatternColor(pattern.pattern_type)} text-white`}>
                    {getPatternIcon(pattern.pattern_type)}
                </div>
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold ${isPositive
                    ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                    : 'bg-red-400/10 text-red-400 border border-red-400/20'
                    }`}>
                    {isPositive && <ArrowUpRight size={14} />}
                    <span>{formatMultiplier(pattern.performance_multiplier)}</span>
                </div>
            </div>

            <p className="text-sm text-gray-200 mb-3 leading-relaxed">
                {pattern.explanation}
            </p>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-700/50 rounded-full capitalize">
                        {pattern.platform}
                    </span>
                    <span>{pattern.sample_size} posts</span>
                </div>
                <ConfidenceIndicator score={pattern.confidence_score} />
            </div>
        </div>
    );
}

// Recommendation card
function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
    const priorityColors = {
        1: 'border-l-emerald-500 bg-emerald-500/5',
        2: 'border-l-blue-500 bg-blue-500/5',
        3: 'border-l-gray-500 bg-gray-500/5'
    };

    return (
        <div className={`border-l-4 ${priorityColors[recommendation.priority as keyof typeof priorityColors] || priorityColors[3]} rounded-r-xl p-4 backdrop-blur-sm`}>
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Lightbulb size={16} className="text-yellow-400" />
                    <h4 className="font-semibold text-white text-sm">{recommendation.title}</h4>
                </div>
                {recommendation.expected_impact && (
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        {recommendation.expected_impact}
                    </span>
                )}
            </div>
            <p className="text-sm text-gray-400">{recommendation.description}</p>
        </div>
    );
}

// Main Intelligence Insights component
export default function IntelligenceInsights({ userId }: IntelligenceInsightsProps) {
    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const fetchIntelligence = async () => {
            try {
                const [patternsRes, recommendationsRes, summaryRes] = await Promise.all([
                    axios.get(`${API_BASE}/intelligence/patterns/${userId}`),
                    axios.get(`${API_BASE}/intelligence/recommendations/${userId}`),
                    axios.get(`${API_BASE}/intelligence/summary/${userId}`)
                ]);

                setPatterns(patternsRes.data.patterns || []);
                setRecommendations(recommendationsRes.data.recommendations || []);
                setSummary(summaryRes.data);
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
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-700 rounded-xl" />
                    <div className="h-5 bg-gray-700 rounded w-48" />
                </div>
            </div>
        );
    }

    // Get top 3 patterns sorted by multiplier
    const topPatterns = [...patterns]
        .sort((a, b) => b.performance_multiplier - a.performance_multiplier)
        .slice(0, expanded ? patterns.length : 3);

    return (
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl overflow-hidden">
            {/* Header with headline insight */}
            <div className="p-6 border-b border-gray-800/50">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                            <Brain size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                Intelligence Insights
                                <Sparkles size={16} className="text-yellow-400" />
                            </h2>
                            <p className="text-sm text-gray-400">
                                Patterns detected from {summary?.total_patterns || 0} analyses
                            </p>
                        </div>
                    </div>
                    {summary?.top_multiplier && summary.top_multiplier > 1 && (
                        <div className="text-right">
                            <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                {formatMultiplier(summary.top_multiplier)}
                            </p>
                            <p className="text-xs text-gray-500">Top pattern boost</p>
                        </div>
                    )}
                </div>

                {/* Headline insight */}
                {summary?.headline && (
                    <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-4">
                        <p className="text-sm text-gray-200 leading-relaxed">
                            💡 <span className="font-medium">{summary.headline}</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Patterns Grid */}
            <div className="p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    Performance Patterns
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topPatterns.map((pattern, index) => (
                        <PatternCard key={pattern.id || index} pattern={pattern} />
                    ))}
                </div>

                {patterns.length > 3 && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
                    >
                        {expanded ? 'Show Less' : `Show ${patterns.length - 3} More Patterns`}
                        <ChevronRight size={16} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
                    </button>
                )}
            </div>

            {/* Recommendations Section */}
            {recommendations.length > 0 && (
                <div className="p-6 pt-0">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        Recommended Actions
                    </h3>
                    <div className="space-y-3">
                        {recommendations.slice(0, 3).map((rec, index) => (
                            <RecommendationCard key={index} recommendation={rec} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
