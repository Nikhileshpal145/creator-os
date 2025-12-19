import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    TrendingUp, RefreshCw, ArrowLeft, Sparkles, Clock,
    Youtube, Instagram, Facebook, Twitter, Linkedin,
    Zap, Filter, ExternalLink
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

interface Trend {
    id: string;
    title: string;
    description: string;
    category: string;
    relevance: string;
    platforms: string[];
    engagement_potential: string;
    timestamp: string;
}

interface TrendsTabProps {
    onBack: () => void;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
    youtube: <Youtube size={14} />,
    instagram: <Instagram size={14} />,
    facebook: <Facebook size={14} />,
    twitter: <Twitter size={14} />,
    linkedin: <Linkedin size={14} />,
    tiktok: <Zap size={14} />,
    discord: <Zap size={14} />,
    patreon: <Zap size={14} />
};

const CATEGORY_COLORS: Record<string, string> = {
    'Technology': 'from-blue-500 to-cyan-500',
    'Business': 'from-emerald-500 to-teal-500',
    'Entertainment': 'from-pink-500 to-rose-500',
    'Social Media': 'from-purple-500 to-indigo-500',
    'AI & Tech': 'from-violet-500 to-purple-600',
    'Lifestyle': 'from-amber-500 to-orange-500',
    'General': 'from-gray-500 to-gray-600'
};

const ENGAGEMENT_BADGES: Record<string, { bg: string; text: string }> = {
    'High': { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    'Medium': { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    'Low': { bg: 'bg-gray-500/20', text: 'text-gray-400' }
};

export default function TrendsTab({ onBack }: TrendsTabProps) {
    const [trends, setTrends] = useState<Trend[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [categories] = useState([
        'All', 'Technology', 'Business', 'Entertainment', 'Social Media', 'AI & Tech', 'Lifestyle'
    ]);

    useEffect(() => {
        fetchTrends();
    }, []);

    const fetchTrends = async (category?: string) => {
        try {
            setLoading(true);
            const url = category && category !== 'All'
                ? `${API_BASE}/trends/latest?category=${encodeURIComponent(category)}`
                : `${API_BASE}/trends/latest`;
            const response = await axios.get(url);
            setTrends(response.data.trends);
        } catch (error) {
            console.error('Failed to fetch trends:', error);
            // Set fallback trends on error
            setTrends([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchTrends(selectedCategory || undefined);
        setRefreshing(false);
    };

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category === 'All' ? null : category);
        fetchTrends(category === 'All' ? undefined : category);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 animate-pulse">Analyzing market trends...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Header */}
            <nav className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-800/50 rounded-xl transition-all border border-transparent hover:border-gray-700"
                        >
                            <ArrowLeft size={20} className="text-gray-400" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shadow-purple-500/20">
                                <TrendingUp size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg tracking-tight">Market Trends</h1>
                                <p className="text-xs text-gray-400">AI-powered real-time insights</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50">
                            <Clock size={12} />
                            <span>Updated just now</span>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2.5 hover:bg-gray-800/50 rounded-xl transition-all disabled:opacity-50 group border border-transparent hover:border-gray-700"
                        >
                            <RefreshCw size={18} className={`text-gray-400 group-hover:text-white transition ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                {/* Category Filter */}
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-400">Filter by category</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => handleCategoryChange(cat)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${(cat === 'All' && !selectedCategory) || cat === selectedCategory
                                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-700/50'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Trends Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trends.map((trend) => {
                        const gradientClass = CATEGORY_COLORS[trend.category] || CATEGORY_COLORS['General'];
                        const engagementStyle = ENGAGEMENT_BADGES[trend.engagement_potential] || ENGAGEMENT_BADGES['Medium'];

                        return (
                            <div
                                key={trend.id}
                                className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700 transition-all group shadow-lg hover:shadow-xl"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${gradientClass} text-white`}>
                                        {trend.category}
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${engagementStyle.bg} ${engagementStyle.text}`}>
                                        {trend.engagement_potential} Potential
                                    </div>
                                </div>

                                {/* Title & Description */}
                                <h3 className="text-lg font-bold mb-2 group-hover:text-indigo-300 transition-colors">
                                    {trend.title}
                                </h3>
                                <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                                    {trend.description}
                                </p>

                                {/* Platforms */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {trend.platforms.map((platform) => (
                                        <div
                                            key={platform}
                                            className="flex items-center gap-1.5 px-2 py-1 bg-gray-800/50 rounded-lg text-xs text-gray-300"
                                        >
                                            {PLATFORM_ICONS[platform.toLowerCase()] || <ExternalLink size={12} />}
                                            <span>{platform}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Creator Relevance */}
                                <div className="p-4 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-xl border border-indigo-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={14} className="text-indigo-400" />
                                        <span className="text-xs font-semibold text-indigo-300">Why it matters for you</span>
                                    </div>
                                    <p className="text-sm text-indigo-100/80 leading-relaxed">
                                        {trend.relevance}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Empty State */}
                {trends.length === 0 && (
                    <div className="text-center py-16">
                        <TrendingUp size={48} className="mx-auto mb-4 text-gray-600" />
                        <h3 className="text-xl font-bold text-gray-400 mb-2">No trends found</h3>
                        <p className="text-gray-500">Try selecting a different category or refresh.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
