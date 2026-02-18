import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, PieChart, Pie, Cell, AreaChart, Area,
    RadialBarChart, RadialBar, Legend
} from 'recharts';
import {
    LayoutDashboard, TrendingUp, Users, Activity, RefreshCw,
    Eye, Heart, MessageCircle, Share2, ArrowUpRight, ArrowDownRight,
    Twitter, Linkedin, Youtube, Instagram, Facebook, Calendar, Zap, Sparkles, BarChart3, type LucideIcon
} from 'lucide-react';
import { useAuth } from './AuthContext';
import IntelligenceInsights from './components/IntelligenceInsights';
import QueryChat from './components/QueryChat';
import StrategyOptimizer from './components/StrategyOptimizer';
import PlatformDashboard from './components/PlatformDashboard';
import TrendsTab from './components/TrendsTab';
import EmptyState from './components/EmptyState';

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



export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [growth, setGrowth] = useState<GrowthData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [showTrends, setShowTrends] = useState(false);

    const fetchAllData = useCallback(async (userId: string) => {
        try {
            const [dashboardRes, summaryRes, growthRes] = await Promise.all([
                axios.get(`${API_BASE}/analytics/dashboard/${userId}`),
                axios.get(`${API_BASE}/analytics/summary/${userId}`),
                axios.get(`${API_BASE}/analytics/growth/${userId}`)
            ]);

            setDashboard(dashboardRes.data);
            setSummary(summaryRes.data);
            setGrowth(growthRes.data.trend || []);
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

    // Transform for pie chart
    const pieData = Object.keys(dashboard?.platforms || {}).map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: dashboard.platforms![key],
        color: PLATFORM_COLORS[key] || COLORS.primary
    }));

    // Transform for bar chart
    const platformData = Object.keys(dashboard?.platforms || {}).map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        views: dashboard.platforms![key],
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
        <div className="min-h-screen text-white font-sans selection:bg-purple-500 selection:text-white flex flex-col relative">
            {/* Aurora Background is handled by CSS ::before */}
            <div className="noise-overlay" />

            {/* Header */}
            <nav className="border-b border-white/5 bg-black/20 backdrop-blur-2xl sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-2xl shadow-lg shadow-purple-500/30">
                            <LayoutDashboard size={22} />
                        </div>
                        <div>
                            <h1 className="font-bold text-xl tracking-tight heading-aurora">Command Center</h1>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <div className="ai-orb" />
                                <span className="shimmer-text">AI Agent Active</span>
                                <span className="opacity-50">•</span>
                                <span>{user?.business_name || 'Personal'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50">
                            <Calendar size={12} />
                            <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <button
                            onClick={() => navigate('/settings')}
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
            <main className="max-w-7xl mx-auto px-6 py-8 relative z-10 flex-1 zoom-out-entrance">
                {/* KPI Grid - Bento Layout */}
                <div className="bento-grid mb-8 stagger-children">
                    <div className="bento-sm">
                        <KpiCard
                            icon={Eye}
                            title="Total Views"
                            value={dashboard?.total_views?.toLocaleString() || '0'}
                            trend={undefined}
                            color="from-emerald-500 to-teal-600"
                        />
                    </div>
                    <div className="bento-sm">
                        <KpiCard
                            icon={Users}
                            title="Est. Followers"
                            value={summary?.estimated_followers?.toLocaleString() || '0'}
                            trend={undefined}
                            color="from-blue-500 to-cyan-600"
                        />
                    </div>
                    <div className="bento-sm">
                        <KpiCard
                            icon={Activity}
                            title="Engagement Rate"
                            value={`${summary?.engagement_rate || 0}%`}
                            trend={undefined}
                            color="from-amber-500 to-orange-600"
                        />
                    </div>
                    <div className="bento-sm">
                        <KpiCard
                            icon={Share2}
                            title="Total Posts"
                            value={summary?.post_count?.toString() || '0'}
                            trend={undefined}
                            color="from-indigo-500 to-purple-600"
                        />
                    </div>
                </div>

                {/* Platform Navigation */}
                <div className="mb-8 stagger-children" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2 heading-gradient">
                            <Activity size={24} className="text-indigo-400" />
                            Platform Analytics
                        </h2>
                        <button onClick={handleRefresh} disabled={refreshing} className="p-2 hover:bg-white/5 rounded-lg transition-colors group">
                            <RefreshCw size={18} className={`text-gray-400 group-hover:text-white transition-colors ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                            { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', gradient: 'from-red-500 to-red-700', shadow: 'group-hover:shadow-red-500/30' },
                            { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', gradient: 'from-pink-500 to-purple-600', shadow: 'group-hover:shadow-pink-500/30' },
                            { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', gradient: 'from-blue-500 to-blue-700', shadow: 'group-hover:shadow-blue-500/30' },
                            { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0A66C2', gradient: 'from-blue-600 to-cyan-600', shadow: 'group-hover:shadow-cyan-500/30' },
                            { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: '#1DA1F2', gradient: 'from-sky-400 to-blue-500', shadow: 'group-hover:shadow-sky-400/30' },
                            { id: 'trends', name: 'Market Trends', icon: TrendingUp, color: '#EC4899', gradient: 'from-pink-500 to-rose-500', shadow: 'group-hover:shadow-pink-500/30' }
                        ].map((platform, idx) => {
                            const Icon = platform.icon;
                            return (
                                <button
                                    key={platform.id}
                                    onClick={() => platform.id === 'trends' ? setShowTrends(true) : setSelectedPlatform(platform.id)}
                                    className={`group relative p-5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl hover:border-white/20 transition-all shadow-lg ${platform.shadow} text-left overflow-hidden hover-lift hover:shadow-2xl`}
                                    style={{ animationDelay: `${idx * 0.1}s` }}
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${platform.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                                    <div className={`p-3 bg-gradient-to-br ${platform.gradient} rounded-2xl shadow-lg mb-4 w-fit group-hover:scale-110 transition-transform duration-300`}>
                                        <Icon size={24} className="text-white" />
                                    </div>
                                    <p className="font-bold text-lg text-white mb-1">{platform.name}</p>
                                    <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors flex items-center gap-1">
                                        View analytics <ArrowUpRight size={10} />
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Intelligence Insights Section */}
                <div className="mb-8">
                    <IntelligenceInsights userId={user?.email || 'test-user'} />
                </div>

                {/* Strategy Optimizer Section */}
                <div className="mb-8">
                    <StrategyOptimizer userId={user?.email || 'test-user'} />
                </div>

                {/* BENTO GRID CHARTS LAYOUT */}
                <div className="bento-grid stagger-children" style={{ animationDelay: '0.4s' }}>

                    {/* Views Trend - Area Chart (Large) */}
                    {/* Views Trend - Area Chart (Large) */}
                    <div className="bento-xl glass-card hover-glow p-6">
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <TrendingUp className="text-purple-400" size={20} />
                                </div>
                                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x">Views Trend</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                                <p className="text-sm text-gray-400">Last 7 days performance</p>
                            </div>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={growth}>
                                    <defs>
                                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
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
                                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                                        }}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="views"
                                        stroke="#8B5CF6"
                                        strokeWidth={3}
                                        fill="url(#viewsGradient)"
                                        dot={{ r: 4, fill: '#8B5CF6', strokeWidth: 2, stroke: '#1F2937' }}
                                        activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Sidebar - Quick Stats */}
                    {/* Sidebar - Quick Stats */}
                    <div className="bento-md glass-card p-6">
                        <div className="mb-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <Zap className="text-amber-400" size={18} />
                                </div>
                                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">Quick Stats</h2>
                            </div>
                            <div className="h-0.5 w-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mb-2"></div>
                        </div>
                        <div className="space-y-4">
                            <StatRow icon={Heart} label="Total Likes" value={summary?.total_likes?.toLocaleString() || '0'} color="text-red-400" />
                            <StatRow icon={MessageCircle} label="Total Comments" value={summary?.total_comments?.toLocaleString() || '0'} color="text-amber-400" />
                            <StatRow icon={Share2} label="Total Shares" value={summary?.total_shares?.toLocaleString() || '0'} color="text-emerald-400" />
                        </div>
                    </div>

                    {/* Platform Breakdown - Bar Chart */}
                    {/* Platform Breakdown - Bar Chart */}
                    <div className="bento-lg glass-card hover-glow p-6">
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-cyan-500/10 rounded-lg">
                                    <Activity className="text-cyan-400" size={18} />
                                </div>
                                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">Platform Breakdown</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-0.5 w-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                                <p className="text-sm text-gray-400">Views by platform</p>
                            </div>
                        </div>
                        <div className="h-64">
                            {platformData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={platformData} layout="vertical" barSize={20}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                        <XAxis type="number" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis type="category" dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} width={80} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
                                            cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                                        />
                                        <Bar dataKey="views" radius={[0, 8, 8, 0]}>
                                            {platformData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <EmptyState
                                        icon={Activity}
                                        title="No Platform Data"
                                        message="Connect your social media accounts to see platform-specific analytics"
                                        variant="chart"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Platform Distribution - Pie Chart */}
                    <div className="bento-lg glass-card hover-glow">
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-pink-500/10 rounded-lg">
                                    <Share2 className="text-pink-400" size={18} />
                                </div>
                                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-400">Platform Distribution</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-0.5 w-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"></div>
                                <p className="text-sm text-gray-400">Share of total views</p>
                            </div>
                        </div>
                        <div className="h-64 flex items-center justify-center">
                            {pieData.length > 0 ? (
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
                                            contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
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
                            ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                    <EmptyState
                                        icon={Share2}
                                        title="No Distribution Data"
                                        message="Start posting content to see how your views are distributed across platforms"
                                        variant="chart"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Engagement Breakdown - Area Chart */}
                    <div className="bento-md glass-card hover-glow p-6">
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <BarChart3 className="text-blue-400" size={18} />
                                </div>
                                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">Engagement Breakdown</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-0.5 w-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
                                <p className="text-sm text-gray-400">Activity metrics</p>
                            </div>
                        </div>
                        <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={engagementData} barSize={40}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="name" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
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
                    <div className="bento-sm glass-card hover-glow flex flex-col items-center justify-center text-center p-6">
                        <div className="mb-4">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Sparkles className="text-emerald-400" size={16} />
                                </div>
                                <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-400">Engagement Score</h2>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <div className="h-0.5 w-6 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"></div>
                                <p className="text-xs text-gray-400">Overall rating</p>
                            </div>
                        </div>
                        <div className="relative w-full h-40 flex items-center justify-center">
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
                                        background={{ fill: 'rgba(255,255,255,0.05)' }}
                                        dataKey="value"
                                        cornerRadius={10}
                                    />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 text-center">
                                <p className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                    {engagementScore.toFixed(0)}
                                </p>
                                <p className="text-xs text-gray-500">out of 100</p>
                            </div>
                        </div>
                    </div>

                    {/* Recent Posts */}
                    <div className="bento-md glass-card p-6">
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                    <Calendar className="text-indigo-400" size={18} />
                                </div>
                                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">Recent Posts</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-0.5 w-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                                <p className="text-sm text-gray-400">Latest published content</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {(dashboard?.recent_posts?.length || 0) > 0 ? (
                                dashboard.recent_posts!.slice(0, 3).map((post: Post) => (
                                    <div
                                        key={post.id}
                                        className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`p-1 rounded-md`} style={{ backgroundColor: `${PLATFORM_COLORS[post.platform] || COLORS.primary}20` }}>
                                                {getPlatformIcon(post.platform)}
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {new Date(post.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                                            {post.text_content}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
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
                                <div className="text-center py-6 text-gray-500">
                                    <p>No recent posts found</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>

            {/* Chat Overlay */}
            <div className="fixed bottom-6 right-6 z-50">
                <QueryChat />
            </div>
        </div>
    );
}

function KpiCard({ icon: Icon, title, value, trend, color }: { icon: LucideIcon; title: string; value: string; trend?: number; color: string }) {
    const isPositive = (trend || 0) >= 0;
    return (
        <div className="relative bg-gray-900/60 backdrop-blur-xl border border-gray-800/80 rounded-2xl p-5 hover:border-purple-500/30 transition-all group shadow-2xl shadow-black/50 hover:shadow-purple-500/20 hover:-translate-y-1 duration-300 overflow-hidden">
            {/* Gradient border glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon size={20} className="text-white" />
                    </div>
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'} border border-white/5`}>
                            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            <span>{Math.abs(trend)}%</span>
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
                    <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
                </div>
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
