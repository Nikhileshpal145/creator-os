import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    TrendingUp, Users, Eye, Heart, MessageCircle, Share2,
    ArrowUpRight, ArrowDownRight, ArrowLeft, Sparkles, RefreshCw,
    Twitter, Linkedin, Youtube, Instagram, Facebook, Activity,
    type LucideIcon
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

// Platform configurations
const PLATFORM_CONFIG: Record<string, {
    name: string;
    color: string;
    gradient: string;
    icon: LucideIcon;
    metrics: string[];
}> = {
    youtube: {
        name: 'YouTube',
        color: '#FF0000',
        gradient: 'from-red-500 to-red-700',
        icon: Youtube,
        metrics: ['subscribers', 'views', 'watch_time', 'engagement']
    },
    instagram: {
        name: 'Instagram',
        color: '#E4405F',
        gradient: 'from-pink-500 to-purple-600',
        icon: Instagram,
        metrics: ['followers', 'reach', 'impressions', 'engagement']
    },
    facebook: {
        name: 'Facebook',
        color: '#1877F2',
        gradient: 'from-blue-500 to-blue-700',
        icon: Facebook,
        metrics: ['followers', 'reach', 'engagement', 'shares']
    },
    linkedin: {
        name: 'LinkedIn',
        color: '#0A66C2',
        gradient: 'from-blue-600 to-cyan-600',
        icon: Linkedin,
        metrics: ['connections', 'impressions', 'engagement', 'profile_views']
    },
    twitter: {
        name: 'X (Twitter)',
        color: '#1DA1F2',
        gradient: 'from-sky-400 to-blue-500',
        icon: Twitter,
        metrics: ['followers', 'impressions', 'engagement', 'retweets']
    }
};

interface PlatformDashboardProps {
    platform: string;
    userId: string;
    onBack: () => void;
}

interface PlatformData {
    views: number;
    followers: number;
    subscribers: number;
    engagement_rate: number;
    growth_percent: number;
    top_posts: Array<{
        id: string;
        title: string;
        views: number;
        likes: number;
        comments: number;
        date: string;
    }>;
    trend: Array<{
        date: string;
        day: string;
        views: number;
        engagement: number;
    }>;
    engagement_breakdown: {
        likes: number;
        comments: number;
        shares: number;
    };
    insights: Array<{
        type: string;
        title: string;
        message: string;
    }>;
}

export default function PlatformDashboard({ platform, userId, onBack }: PlatformDashboardProps) {
    const [data, setData] = useState<PlatformData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.twitter;
    const PlatformIcon = config.icon;

    useEffect(() => {
        fetchPlatformData();
    }, [platform, userId]);

    const fetchPlatformData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE}/analytics/platform/${userId}/${platform}`);
            setData(response.data);
        } catch (error) {
            console.error(`Failed to fetch ${platform} data:`, error);
            // Set mock data for demo
            setData(generateMockData());
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchPlatformData();
        setRefreshing(false);
    };

    // Generate mock data for platforms without real data
    const generateMockData = (): PlatformData => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return {
            views: Math.floor(Math.random() * 50000) + 10000,
            followers: Math.floor(Math.random() * 10000) + 1000,
            subscribers: Math.floor(Math.random() * 5000) + 500,
            engagement_rate: Math.random() * 5 + 1,
            growth_percent: Math.random() * 20 - 5,
            top_posts: Array.from({ length: 5 }, (_, i) => ({
                id: `post-${i}`,
                title: `Top performing post #${i + 1}`,
                views: Math.floor(Math.random() * 10000) + 1000,
                likes: Math.floor(Math.random() * 500) + 50,
                comments: Math.floor(Math.random() * 100) + 10,
                date: new Date(Date.now() - i * 86400000).toISOString()
            })),
            trend: days.map((day, i) => ({
                date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
                day,
                views: Math.floor(Math.random() * 5000) + 1000,
                engagement: Math.floor(Math.random() * 500) + 100
            })),
            engagement_breakdown: {
                likes: Math.floor(Math.random() * 5000) + 1000,
                comments: Math.floor(Math.random() * 1000) + 200,
                shares: Math.floor(Math.random() * 500) + 50
            },
            insights: [
                {
                    type: 'growth_tip',
                    title: 'Posting Consistency',
                    message: `Your ${config.name} engagement peaks on weekends. Consider scheduling more content for Saturday and Sunday.`
                },
                {
                    type: 'content_tip',
                    title: 'Content Format',
                    message: `Video content on ${config.name} gets 2.5x more engagement than images. Try incorporating more video.`
                }
            ]
        };
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 animate-pulse">Loading {config.name} analytics...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const engagementData = [
        { name: 'Likes', value: data.engagement_breakdown.likes, fill: '#EF4444' },
        { name: 'Comments', value: data.engagement_breakdown.comments, fill: '#F59E0B' },
        { name: 'Shares', value: data.engagement_breakdown.shares, fill: '#10B981' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: `${config.color}15` }}></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: `${config.color}10`, animationDelay: '1s' }}></div>
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
                            <div className={`p-2 bg-gradient-to-br ${config.gradient} rounded-xl shadow-lg`}>
                                <PlatformIcon size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-lg tracking-tight">{config.name} Analytics</h1>
                                <p className="text-xs text-gray-400">Detailed performance insights</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2.5 hover:bg-gray-800/50 rounded-xl transition-all disabled:opacity-50 group border border-transparent hover:border-gray-700"
                    >
                        <RefreshCw size={18} className={`text-gray-400 group-hover:text-white transition ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <KpiCard
                        icon={Eye}
                        title="Total Views"
                        value={data.views.toLocaleString()}
                        trend={data.growth_percent}
                        color={config.gradient}
                    />
                    <KpiCard
                        icon={Users}
                        title={platform === 'youtube' ? 'Subscribers' : 'Followers'}
                        value={(platform === 'youtube' ? data.subscribers : data.followers).toLocaleString()}
                        trend={8.3}
                        color="from-blue-500 to-cyan-600"
                    />
                    <KpiCard
                        icon={Activity}
                        title="Engagement Rate"
                        value={`${data.engagement_rate.toFixed(2)}%`}
                        trend={data.growth_percent > 0 ? 2.1 : -2.1}
                        color="from-amber-500 to-orange-600"
                    />
                    <KpiCard
                        icon={TrendingUp}
                        title="Growth"
                        value={`${data.growth_percent > 0 ? '+' : ''}${data.growth_percent.toFixed(1)}%`}
                        trend={data.growth_percent}
                        color="from-emerald-500 to-teal-600"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Main Charts */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Growth Trend Chart */}
                        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-bold">Performance Trend</h2>
                                    <p className="text-sm text-gray-500">Last 7 days</p>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }}></div>
                                        <span className="text-gray-400">Views</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                        <span className="text-gray-400">Engagement</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.trend}>
                                        <defs>
                                            <linearGradient id={`gradient-${platform}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={config.color} stopOpacity={0.4} />
                                                <stop offset="100%" stopColor={config.color} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                                                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                        <XAxis dataKey="day" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1F2937',
                                                borderColor: '#374151',
                                                borderRadius: '12px',
                                                boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="views"
                                            stroke={config.color}
                                            strokeWidth={3}
                                            fill={`url(#gradient-${platform})`}
                                            dot={{ r: 4, fill: config.color, strokeWidth: 2, stroke: '#1F2937' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="engagement"
                                            stroke="#10B981"
                                            strokeWidth={2}
                                            fill="url(#engagementGradient)"
                                            dot={{ r: 3, fill: '#10B981', strokeWidth: 2, stroke: '#1F2937' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Engagement Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-xl">
                                <h2 className="text-lg font-bold mb-2">Engagement Breakdown</h2>
                                <p className="text-sm text-gray-500 mb-6">Likes, comments & shares</p>
                                <div className="h-52">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={engagementData} barSize={40}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                            <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px' }} />
                                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                                {engagementData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-xl">
                                <h2 className="text-lg font-bold mb-2">Engagement Distribution</h2>
                                <p className="text-sm text-gray-500 mb-6">Share of interactions</p>
                                <div className="h-52 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={engagementData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {engagementData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px' }} />
                                            <Legend
                                                verticalAlign="bottom"
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Quick Stats */}
                        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-lg font-bold mb-4">Quick Stats</h2>
                            <div className="space-y-4">
                                <StatRow icon={Heart} label="Total Likes" value={data.engagement_breakdown.likes.toLocaleString()} color="text-red-400" />
                                <StatRow icon={MessageCircle} label="Total Comments" value={data.engagement_breakdown.comments.toLocaleString()} color="text-amber-400" />
                                <StatRow icon={Share2} label="Total Shares" value={data.engagement_breakdown.shares.toLocaleString()} color="text-emerald-400" />
                            </div>
                        </div>

                        {/* Top Posts */}
                        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-lg font-bold mb-4">Top Performing Posts</h2>
                            <div className="space-y-3">
                                {data.top_posts.slice(0, 4).map((post, index) => (
                                    <div
                                        key={post.id}
                                        className="p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-all border border-transparent hover:border-indigo-500/30"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
                                                #{index + 1}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(post.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-300 line-clamp-2 mb-2">{post.title}</p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Eye size={12} /> {post.views.toLocaleString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Heart size={12} /> {post.likes}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MessageCircle size={12} /> {post.comments}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI Insights */}
                        {data.insights.map((insight, index) => (
                            <div
                                key={index}
                                className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6 hover:border-indigo-500/40 transition-all shadow-lg"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                                        <Sparkles size={16} className="text-indigo-400" />
                                    </div>
                                    <h3 className="font-bold text-indigo-300">{insight.title}</h3>
                                </div>
                                <p className="text-sm text-indigo-100/80 leading-relaxed">{insight.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

// Helper Components
function KpiCard({ icon: Icon, title, value, trend, color }: { icon: LucideIcon; title: string; value: string; trend: number; color: string }) {
    const isPositive = trend >= 0;
    return (
        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5 hover:border-gray-700/50 transition-all group shadow-lg">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
                    <Icon size={20} className="text-white" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'} border border-white/5`}>
                    {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
            </div>
            <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
                <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
            </div>
        </div>
    );
}

function StatRow({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
    return (
        <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition">
            <div className="flex items-center gap-3">
                <div className={`p-2 bg-gray-800 rounded-lg ${color}`}>
                    <Icon size={16} />
                </div>
                <span className="text-gray-400 text-sm">{label}</span>
            </div>
            <span className="font-bold">{value}</span>
        </div>
    );
}
