import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { ArrowLeft, Eye, Users, TrendingUp, Heart, MessageCircle, Share2, Clock, Zap, Target, Lightbulb, TrendingDown } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

interface PlatformDashboardProps {
    platform: string;
    userId: string;
    onBack: () => void;
}

interface PlatformData {
    views: number;
    followers: number;
    engagement_rate: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
    top_posts: Array<{ id: string; title: string; views: number; likes: number; comments: number; shares: number; date: string; }>;
    trend: Array<{ date: string; day: string; views: number; }>;
}

const PLATFORM_COLORS: Record<string, string> = {
    youtube: '#FF0000',
    instagram: '#E4405F',
    facebook: '#1877F2',
    linkedin: '#0A66C2',
    twitter: '#1DA1F2',
};

const PLATFORM_ICONS: Record<string, string> = {
    youtube: '▶️',
    instagram: '📷',
    facebook: '👥',
    linkedin: '💼',
    twitter: '🐦',
};

export default function PlatformDashboard({ platform, userId, onBack }: PlatformDashboardProps) {
    const [data, setData] = useState<PlatformData | null>(null);
    const [loading, setLoading] = useState(true);

    const platformColor = PLATFORM_COLORS[platform.toLowerCase()] || '#6366F1';
    const platformIcon = PLATFORM_ICONS[platform.toLowerCase()] || '📊';

    const fetchPlatformData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE}/analytics/platform/${userId}/${platform}`);
            setData(response.data);
        } catch (error) {
            console.error(`Failed to fetch ${platform} data:`, error);
        } finally {
            setLoading(false);
        }
    }, [userId, platform]);

    useEffect(() => {
        fetchPlatformData();
    }, [fetchPlatformData]);

    // Engagement breakdown data
    const engagementData = data ? [
        { name: 'Likes', value: data.total_likes || 0, color: '#ef4444' },
        { name: 'Comments', value: data.total_comments || 0, color: '#f59e0b' },
        { name: 'Shares', value: data.total_shares || 0, color: '#10b981' }
    ] : [];

    const totalEngagement = engagementData.reduce((sum, item) => sum + item.value, 0);

    // Post performance data (top 5 posts)
    const postPerformanceData = data?.top_posts.slice(0, 5).map(post => ({
        name: post.title.length > 30 ? post.title.substring(0, 30) + '...' : post.title,
        engagement: (post.likes + post.comments + post.shares),
    })) || [];

    // Calculate insights
    const calculateInsights = () => {
        if (!data) return [];

        const insights = [];
        const avgEngagement = data.engagement_rate;
        const totalInteractions = (data.total_likes || 0) + (data.total_comments || 0) + (data.total_shares || 0);

        // Growth trend analysis
        if (data.trend && data.trend.length > 1) {
            const recentViews = data.trend.slice(-3).reduce((sum, day) => sum + day.views, 0);
            const olderViews = data.trend.slice(0, 3).reduce((sum, day) => sum + day.views, 0);

            if (recentViews > olderViews * 1.2) {
                insights.push({
                    type: 'success',
                    icon: TrendingUp,
                    title: 'Strong Growth Detected',
                    message: 'Your content is gaining momentum! Recent views are 20% higher than earlier this week.',
                    color: 'emerald'
                });
            } else if (recentViews < olderViews * 0.8) {
                insights.push({
                    type: 'warning',
                    icon: TrendingDown,
                    title: 'Declining Engagement',
                    message: 'Recent performance is down. Consider refreshing your content strategy.',
                    color: 'amber'
                });
            }
        }

        // Engagement quality
        if (avgEngagement > 5) {
            insights.push({
                type: 'success',
                icon: Zap,
                title: 'Excellent Engagement',
                message: 'Your audience is highly engaged! Keep creating content that resonates.',
                color: 'purple'
            });
        } else if (data.views > 100 && avgEngagement < 2) {
            insights.push({
                type: 'opportunity',
                icon: Target,
                title: 'Opportunity: Boost Interaction',
                message: 'You have good reach but low engagement. Add clear calls-to-action to your content.',
                color: 'blue'
            });
        }

        // Content consistency
        if (data.top_posts.length >= 3) {
            insights.push({
                type: 'tip',
                icon: Lightbulb,
                title: 'Consistency Pays Off',
                message: `You've posted ${data.top_posts.length} pieces of content. Regular posting helps build audience trust.`,
                color: 'cyan'
            });
        }

        return insights;
    };

    const insights = calculateInsights();

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 animate-pulse">Loading {platform} analytics...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400 mb-4">No data available for {platform}</p>
                    <button
                        onClick={onBack}
                        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Enhanced Header */}
            <header className="border-b border-gray-800/50 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 backdrop-blur-xl sticky top-0 z-50 shadow-2xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-xl transition-all hover:scale-105"
                        >
                            <ArrowLeft size={18} />
                            <span>Back to Dashboard</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Platform Icon with Glow */}
                        <div
                            className="text-6xl p-4 rounded-2xl bg-gray-800/50 backdrop-blur-xl shadow-2xl"
                            style={{
                                boxShadow: `0 0 40px ${platformColor}40, 0 0 80px ${platformColor}20`
                            }}
                        >
                            {platformIcon}
                        </div>

                        {/* Platform Name with Gradient */}
                        <div className="flex-1">
                            <h1
                                className="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r"
                                style={{
                                    backgroundImage: `linear-gradient(135deg, white 0%, ${platformColor} 50%, white 100%)`
                                }}
                            >
                                {platform.charAt(0).toUpperCase() + platform.slice(1)} Analytics
                            </h1>
                            <p className="text-gray-400 text-lg">Comprehensive performance insights & AI-powered recommendations</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-purple-500/30 transition-all hover:scale-105">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                <Eye size={24} className="text-emerald-400" />
                            </div>
                            <span className="text-gray-400">Total Views</span>
                        </div>
                        <p className="text-4xl font-bold">{data.views.toLocaleString()}</p>
                    </div>

                    <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-purple-500/30 transition-all hover:scale-105">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <Users size={24} className="text-blue-400" />
                            </div>
                            <span className="text-gray-400">Followers</span>
                        </div>
                        <p className="text-4xl font-bold">{data.followers.toLocaleString()}</p>
                    </div>

                    <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-purple-500/30 transition-all hover:scale-105">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-amber-500/10 rounded-xl">
                                <TrendingUp size={24} className="text-amber-400" />
                            </div>
                            <span className="text-gray-400">Engagement Rate</span>
                        </div>
                        <p className="text-4xl font-bold">{data.engagement_rate}%</p>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Views Trend Chart - 2 columns */}
                    <div className="lg:col-span-2 bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <TrendingUp className="text-purple-400" size={20} />
                            Views Trend
                        </h3>
                        <div className="h-80">
                            {data.trend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.trend}>
                                        <defs>
                                            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={platformColor} stopOpacity={0.4} />
                                                <stop offset="100%" stopColor={platformColor} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="day" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                                borderRadius: '12px',
                                                backdropFilter: 'blur(10px)',
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="views"
                                            stroke={platformColor}
                                            strokeWidth={3}
                                            fill="url(#viewsGradient)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-500">
                                    No trend data available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Engagement Breakdown Pie Chart - 1 column */}
                    <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Heart className="text-red-400" size={20} />
                            Engagement Mix
                        </h3>
                        <div className="h-80">
                            {totalEngagement > 0 ? (
                                <>
                                    <ResponsiveContainer width="100%" height="70%">
                                        <PieChart>
                                            <Pie
                                                data={engagementData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {engagementData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                                                    borderColor: 'rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '12px',
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-2 mt-4">
                                        {engagementData.map((item) => (
                                            <div key={item.name} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                                    <span className="text-gray-400">{item.name}</span>
                                                </div>
                                                <span className="font-semibold">{item.value.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex items-center justify-center text-center text-gray-500">
                                    <div>
                                        <p>No engagement data yet</p>
                                        <p className="text-xs mt-2">Start creating content!</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Post Performance Bar Chart */}
                {postPerformanceData.length > 0 && (
                    <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 mb-8">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Target className="text-cyan-400" size={20} />
                            Top Post Performance
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={postPerformanceData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis type="category" dataKey="name" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} width={150} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                                            borderColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                        }}
                                    />
                                    <Bar dataKey="engagement" fill={platformColor} radius={[0, 8, 8, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Data Analysis Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Zap className="text-purple-400" size={20} />
                            </div>
                            <h4 className="font-semibold text-gray-300">Avg Engagement</h4>
                        </div>
                        <p className="text-3xl font-bold mb-2">{data.engagement_rate.toFixed(1)}%</p>
                        <p className="text-sm text-gray-400">
                            {data.engagement_rate > 5 ? 'Excellent' : data.engagement_rate > 2 ? 'Good' : 'Needs improvement'}
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-cyan-500/20 rounded-lg">
                                <Clock className="text-cyan-400" size={20} />
                            </div>
                            <h4 className="font-semibold text-gray-300">Content Output</h4>
                        </div>
                        <p className="text-3xl font-bold mb-2">{data.top_posts.length}</p>
                        <p className="text-sm text-gray-400">Total posts tracked</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-emerald-500/20 rounded-lg">
                                <TrendingUp className="text-emerald-400" size={20} />
                            </div>
                            <h4 className="font-semibold text-gray-300">Total Reach</h4>
                        </div>
                        <p className="text-3xl font-bold mb-2">{data.views.toLocaleString()}</p>
                        <p className="text-sm text-gray-400">Views across all content</p>
                    </div>
                </div>

                {/* AI Insights Panel */}
                {insights.length > 0 && (
                    <div className="bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-6 mb-8">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Lightbulb className="text-yellow-400" size={20} />
                            AI-Powered Insights
                        </h3>
                        <div className="space-y-4">
                            {insights.map((insight, idx) => {
                                const Icon = insight.icon;
                                const colorClasses = {
                                    emerald: 'from-emerald-900/30 to-emerald-800/10 border-emerald-500/30 text-emerald-400',
                                    amber: 'from-amber-900/30 to-amber-800/10 border-amber-500/30 text-amber-400',
                                    purple: 'from-purple-900/30 to-purple-800/10 border-purple-500/30 text-purple-400',
                                    blue: 'from-blue-900/30 to-blue-800/10 border-blue-500/30 text-blue-400',
                                    cyan: 'from-cyan-900/30 to-cyan-800/10 border-cyan-500/30 text-cyan-400',
                                };

                                return (
                                    <div
                                        key={idx}
                                        className={`bg-gradient-to-r ${colorClasses[insight.color as keyof typeof colorClasses]} border rounded-xl p-4`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-black/20 rounded-lg">
                                                <Icon size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                                                <p className="text-sm text-gray-300">{insight.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Top Posts List */}
                <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-6">Top Posts</h3>
                    <div className="space-y-4">
                        {data.top_posts.length > 0 ? (
                            data.top_posts.map(post => (
                                <div key={post.id} className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/50 hover:border-purple-500/30 transition">
                                    <p className="text-sm font-medium text-white mb-3 line-clamp-2">{post.title}</p>
                                    <div className="grid grid-cols-4 gap-4 text-xs">
                                        <div className="flex items-center gap-1 text-gray-400">
                                            <Eye size={14} />
                                            <span>{post.views.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-red-400">
                                            <Heart size={14} />
                                            <span>{post.likes.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-amber-400">
                                            <MessageCircle size={14} />
                                            <span>{post.comments.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-emerald-400">
                                            <Share2 size={14} />
                                            <span>{post.shares.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500">
                                        {new Date(post.date).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-400">
                                <p className="mb-2">No posts yet</p>
                                <p className="text-sm">Start creating content to see analytics here</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
