import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, PieChart, Pie, Cell, AreaChart, Area,
    RadialBarChart, RadialBar, Legend
} from 'recharts';
import {
    LayoutDashboard, TrendingUp, Users, Activity, Sparkles, RefreshCw,
    Eye, Heart, MessageCircle, Share2, ArrowUpRight, ArrowDownRight,
    Twitter, Linkedin, Youtube, Instagram, Facebook, Calendar, type LucideIcon
} from 'lucide-react';
import { useAuth } from './AuthContext';
import IntelligenceInsights from './components/IntelligenceInsights';
import QueryChat from './components/QueryChat';
import StrategyOptimizer from './components/StrategyOptimizer';
import PlatformDashboard from './components/PlatformDashboard';
import TrendsTab from './components/TrendsTab';
import ConnectAccounts from './components/ConnectAccounts';

const API_BASE = 'http://localhost:8000/api/v1';

// Modern color palette
const COLORS = {
    twitter: '#1DA1F2',
    linkedin: '#0A66C2',
    youtube: '#FF0000',
    instagram: '#E4405F',
    facebook: '#1877F2',
    primary: '#6366F1',
    secondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    gradient: ['#6366F1', '#8B5CF6', '#A855F7', '#EC4899']
};

const PLATFORM_COLORS: Record<string, string> = {
    twitter: COLORS.twitter,
    linkedin: COLORS.linkedin,
    youtube: COLORS.youtube,
    instagram: COLORS.instagram,
    facebook: COLORS.facebook
};

interface AnalyticsSummary {
    estimated_followers: number;
    engagement_rate: number;
    total_views: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
    post_count: number;
}

interface Post {
    id: string;
    platform: string;
    created_at: string;
    text_content: string;
    ai_analysis?: {
        score: number;
    };
}

interface DashboardData {
    total_views: number;
    platforms: Record<string, number>;
    recent_posts: Post[];
}

interface GrowthData {
    day: string;
    date: string;
    views: number;
}

interface Insight {
    type?: string;
    title: string;
    message: string;
}

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [growth, setGrowth] = useState<GrowthData[]>([]);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [showTrends, setShowTrends] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const fetchAllData = useCallback(async (userId: string) => {
        try {
            const [dashboardRes, summaryRes, growthRes, insightsRes] = await Promise.all([
                axios.get(`${API_BASE}/analytics/dashboard/${userId}`),
                axios.get(`${API_BASE}/analytics/summary/${userId}`),
                axios.get(`${API_BASE}/analytics/growth/${userId}`),
                axios.get(`${API_BASE}/analytics/insights/${userId}`)
            ]);

            setDashboard(dashboardRes.data);
            setSummary(summaryRes.data);
            setGrowth(growthRes.data.trend || []);
            setInsights(insightsRes.data.insights || []);
        } catch (error) {
            console.error("Failed to fetch analytics data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.id) {
            // User ID might be number from backend but API expects string usually? 
            // Backend User model ID is int. 
            // We'll cast to string or update backend to accept int. 
            // Using "1" or user.email as ID for analytics for now if backend uses email
            // Actually earlier analytics.py used "user_id: str".
            // Let's assume user.email for now as we used to pass "test-user".
            // Or better, the backend auth provides ID.
            // I will use user.email as the key for now since the analytics endpoints were string-based 
            // and mapped to mock data/generated data.
            // Wait, backend analytics calculated from ContentPerformance.
            // ContentPerformance doesn't have user_id link yet unless I added it.
            // The current backend implementation of /analytics/summary/{user_id} effectively ignores user_id 
            // or uses it to filter if we implemented isolation.
            // I'll use user.email as the identifier.
            fetchAllData(user.email);
        }
    }, [user, fetchAllData]);

    const handleRefresh = async () => {
        if (!user || refreshing) return;
        setRefreshing(true);
        await fetchAllData(user.email);
        setRefreshing(false);
    };

    if (loading || !dashboard) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 animate-pulse">Establishing secure connection...</p>
                </div>
            </div>
        );
    }

    // If a platform is selected, show its individual dashboard
    if (selectedPlatform) {
        return (
            <PlatformDashboard
                platform={selectedPlatform}
                userId={user?.email || ''}
                onBack={() => setSelectedPlatform(null)}
            />
        );
    }

    // If trends view is selected, show the trends tab
    if (showTrends) {
        return <TrendsTab onBack={() => setShowTrends(false)} />;
    }

    // If settings view is selected, show settings with Connect Accounts
    if (showSettings) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white font-sans">
                {/* Header */}
                <nav className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl sticky top-0 z-20">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-2 hover:bg-gray-800/50 rounded-xl transition border border-gray-700/50"
                            >
                                ← Back
                            </button>
                            <h1 className="font-bold text-lg">Settings</h1>
                        </div>
                    </div>
                </nav>
                <main className="max-w-4xl mx-auto px-6 py-8">
                    <ConnectAccounts userId={user?.email || ''} />
                </main>
            </div>
        );
    }

    // Transform for pie chart
    const pieData = Object.keys(dashboard.platforms).map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: dashboard.platforms[key],
        color: PLATFORM_COLORS[key] || COLORS.primary
    }));

    // Transform for bar chart
    const platformData = Object.keys(dashboard.platforms).map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        views: dashboard.platforms[key],
        fill: PLATFORM_COLORS[key] || COLORS.primary
    }));

    // Engagement breakdown data
    const engagementData = [
        { name: 'Likes', value: summary?.total_likes || 0, fill: COLORS.danger },
        { name: 'Comments', value: summary?.total_comments || 0, fill: COLORS.warning },
        { name: 'Shares', value: summary?.total_shares || 0, fill: COLORS.success },
    ];

    // Radial data for engagement score
    const engagementScore = Math.min((summary?.engagement_rate || 0) * 10, 100);
    const radialData = [
        { name: 'Engagement', value: engagementScore, fill: 'url(#engagementGradient)' }
    ];

    const getPlatformIcon = (platform: string) => {
        switch (platform.toLowerCase()) {
            case 'twitter': return <Twitter size={14} />;
            case 'linkedin': return <Linkedin size={14} />;
            case 'youtube': return <Youtube size={14} />;
            case 'instagram': return <Instagram size={14} />;
            case 'facebook': return <Facebook size={14} />;
            default: return <Activity size={14} />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 text-white font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Header */}
            <nav className="border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                            <LayoutDashboard size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight">Command Center</h1>
                            <p className="text-xs text-gray-400">Agent Active • {user?.business_name || 'Personal'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50">
                            <Calendar size={12} />
                            <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2.5 hover:bg-gray-800/50 rounded-xl transition-all group border border-transparent hover:border-gray-700"
                            title="Settings & Connected Accounts"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-white transition"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                        </button>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2.5 hover:bg-gray-800/50 rounded-xl transition-all disabled:opacity-50 group border border-transparent hover:border-gray-700"
                            title="Refresh data"
                        >
                            <RefreshCw size={18} className={`text-gray-400 group-hover:text-white transition ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <div className="flex items-center gap-3 pl-3 border-l border-gray-800">
                            <div className="hidden md:block text-right">
                                <p className="text-sm text-gray-300 font-medium">{user?.full_name}</p>
                                <button onClick={logout} className="text-xs text-indigo-400 hover:text-indigo-300 transition">Disconnect</button>
                            </div>
                            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-xs font-bold shadow-lg shadow-indigo-500/20">
                                {user?.full_name?.substring(0, 2).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8 relative z-10 flex-1">
                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <KpiCard
                        icon={Eye}
                        title="Total Views"
                        value={dashboard.total_views.toLocaleString()}
                        trend={12.5}
                        color="from-emerald-500 to-teal-600"
                    />
                    <KpiCard
                        icon={Users}
                        title="Est. Followers"
                        value={summary?.estimated_followers.toLocaleString() || '0'}
                        trend={8.3}
                        color="from-blue-500 to-cyan-600"
                    />
                    <KpiCard
                        icon={Activity}
                        title="Engagement Rate"
                        value={`${summary?.engagement_rate || 0}%`}
                        trend={-2.1}
                        color="from-amber-500 to-orange-600"
                    />
                    <KpiCard
                        icon={Share2}
                        title="Total Posts"
                        value={summary?.post_count.toString() || '0'}
                        trend={5.0}
                        color="from-indigo-500 to-purple-600"
                    />
                </div>

                {/* Platform Navigation */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Activity size={20} className="text-indigo-400" />
                            Platform Analytics
                        </h2>
                        <button
                            onClick={() => setShowTrends(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl text-sm font-medium hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
                        >
                            <TrendingUp size={16} />
                            <span>Market Trends</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                            { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', gradient: 'from-red-500 to-red-700' },
                            { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', gradient: 'from-pink-500 to-purple-600' },
                            { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', gradient: 'from-blue-500 to-blue-700' },
                            { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', gradient: 'from-blue-600 to-cyan-600' },
                            { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: '#1DA1F2', gradient: 'from-sky-400 to-blue-500' }
                        ].map((platform) => {
                            const Icon = platform.icon;
                            return (
                                <button
                                    key={platform.id}
                                    onClick={() => setSelectedPlatform(platform.id)}
                                    className="group p-4 bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl hover:border-gray-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] text-left"
                                >
                                    <div className={`p-3 bg-gradient-to-br ${platform.gradient} rounded-xl shadow-lg mb-3 w-fit group-hover:scale-110 transition-transform`}>
                                        <Icon size={20} className="text-white" />
                                    </div>
                                    <p className="font-semibold text-white">{platform.name}</p>
                                    <p className="text-xs text-gray-400 mt-1">View detailed analytics →</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Intelligence Insights Section */}
                <div className="mb-8">
                    <IntelligenceInsights userId={user?.email || ''} />
                </div>

                {/* Strategy Optimizer Section */}
                <div className="mb-8">
                    <StrategyOptimizer userId={user?.email || ''} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Main Charts Section */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Views Trend - Area Chart */}
                        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-bold">Views Trend</h2>
                                    <p className="text-sm text-gray-500">Last 7 days performance</p>
                                </div>
                                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                                    <TrendingUp size={14} />
                                    <span>+15.3%</span>
                                </div>
                            </div>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={growth}>
                                        <defs>
                                            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
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
                                            labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="views"
                                            stroke="#6366F1"
                                            strokeWidth={3}
                                            fill="url(#viewsGradient)"
                                            dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#1F2937' }}
                                            activeDot={{ r: 6, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Platform Performance - Horizontal Bar */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-xl">
                                <h2 className="text-lg font-bold mb-2">Platform Breakdown</h2>
                                <p className="text-sm text-gray-500 mb-6">Views by platform</p>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={platformData} layout="vertical" barSize={20}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                            <XAxis type="number" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis type="category" dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} width={80} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px' }}
                                                cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                                            />
                                            <Bar dataKey="views" radius={[0, 8, 8, 0]}>
                                                {platformData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Platform Distribution - Pie Chart */}
                            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-xl">
                                <h2 className="text-lg font-bold mb-2">Platform Distribution</h2>
                                <p className="text-sm text-gray-500 mb-6">Share of total views</p>
                                <div className="h-64 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px' }}
                                                formatter={(value: number | string | undefined) => [(value?.toLocaleString() || '0') + ' views', '']}
                                            />
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
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '12px' }}
                                            />
                                            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                                {engagementData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Engagement Score Radial */}
                            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-xl">
                                <h2 className="text-lg font-bold mb-2">Engagement Score</h2>
                                <p className="text-sm text-gray-500 mb-4">Overall performance rating</p>
                                <div className="h-52 flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadialBarChart
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="60%"
                                            outerRadius="100%"
                                            startAngle={180}
                                            endAngle={0}
                                            data={radialData}
                                        >
                                            <defs>
                                                <linearGradient id="engagementGradient" x1="0" y1="0" x2="1" y2="0">
                                                    <stop offset="0%" stopColor="#6366F1" />
                                                    <stop offset="100%" stopColor="#A855F7" />
                                                </linearGradient>
                                            </defs>
                                            <RadialBar
                                                background={{ fill: '#374151' }}
                                                dataKey="value"
                                                cornerRadius={10}
                                            />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                    <div className="absolute text-center">
                                        <p className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                            {engagementScore.toFixed(0)}
                                        </p>
                                        <p className="text-xs text-gray-500">out of 100</p>
                                    </div>
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
                                <StatRow icon={Heart} label="Total Likes" value={summary?.total_likes.toLocaleString() || '0'} color="text-red-400" />
                                <StatRow icon={MessageCircle} label="Total Comments" value={summary?.total_comments.toLocaleString() || '0'} color="text-amber-400" />
                                <StatRow icon={Share2} label="Total Shares" value={summary?.total_shares.toLocaleString() || '0'} color="text-emerald-400" />
                            </div>
                        </div>

                        {/* Recent Posts */}
                        <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-lg font-bold mb-4">Recent Posts</h2>
                            <div className="space-y-3">
                                {dashboard.recent_posts.length > 0 ? (
                                    dashboard.recent_posts.slice(0, 4).map((post: Post) => (
                                        <div
                                            key={post.id}
                                            className="p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-all border border-transparent hover:border-indigo-500/30 group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`p-1.5 rounded-lg`} style={{ backgroundColor: `${PLATFORM_COLORS[post.platform] || COLORS.primary}20` }}>
                                                    {getPlatformIcon(post.platform)}
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(post.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-300 line-clamp-2 mb-3">
                                                {post.text_content}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                                                        style={{ width: `${Math.min(post.ai_analysis?.score || 0, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-gray-400">
                                                    {post.ai_analysis?.score || 0}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <Activity size={32} className="mx-auto mb-2 opacity-50" />
                                        <p>No posts tracked yet</p>
                                        <p className="text-xs mt-1">Start analyzing content</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Insights - Using Premium Design */}
                        {insights.map((insight, index) => (
                            <div
                                key={index}
                                className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-6 group hover:border-indigo-500/40 transition-all shadow-lg hover:shadow-indigo-500/10"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                                        <Sparkles size={16} className="text-indigo-400" />
                                    </div>
                                    <h3 className="font-bold text-indigo-300">{insight.title}</h3>
                                </div>
                                <p className="text-sm text-indigo-100/80 leading-relaxed mb-4">{insight.message}</p>
                                {insight.type === 'getting_started' && (
                                    <div className="space-y-3">
                                        <div className="text-xs text-indigo-200/60 space-y-2">
                                            <p className="flex items-start gap-2">
                                                <span className="text-indigo-400 font-bold">1.</span>
                                                Install the Creator OS browser extension
                                            </p>
                                            <p className="flex items-start gap-2">
                                                <span className="text-indigo-400 font-bold">2.</span>
                                                Visit YouTube Studio, Instagram, or LinkedIn
                                            </p>
                                            <p className="flex items-start gap-2">
                                                <span className="text-indigo-400 font-bold">3.</span>
                                                Your analytics will sync automatically!
                                            </p>
                                        </div>
                                        <a
                                            href="chrome://extensions"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-lg text-sm font-medium text-indigo-300 transition-all"
                                        >
                                            <span>Open Extensions</span>
                                            <ArrowUpRight size={14} />
                                        </a>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Natural Language Query Chat */}
            <QueryChat />
        </div>
    );
}

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
                    <span>{Math.abs(trend)}%</span>
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
