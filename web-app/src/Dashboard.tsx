import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useAuth } from './AuthContext';
import IntelligenceInsights from './components/IntelligenceInsights';
import QueryChat from './components/QueryChat';
import StrategyOptimizer from './components/StrategyOptimizer';
import PlatformDashboard from './components/PlatformDashboard';
import TrendsTab from './components/TrendsTab';
import ConnectAccounts from './components/ConnectAccounts';
import './Dashboard.css';

const API_BASE = 'http://localhost:8000/api/v1';

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
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [growth, setGrowth] = useState<GrowthData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [showTrends, setShowTrends] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const fetchAllData = useCallback(async (userId: string) => {
        try {
            const [dashboardRes, summaryRes, growthRes] = await Promise.all([
                axios.get(`${API_BASE}/analytics/dashboard/${userId}`),
                axios.get(`${API_BASE}/analytics/summary/${userId}`),
                axios.get(`${API_BASE}/analytics/growth/${userId}`),
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
        if (user?.email) {
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
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    if (selectedPlatform) {
        return (
            <PlatformDashboard
                platform={selectedPlatform}
                userId={user?.email || ''}
                onBack={() => setSelectedPlatform(null)}
            />
        );
    }

    if (showTrends) {
        return <TrendsTab onBack={() => setShowTrends(false)} />;
    }

    if (showSettings) {
        return (
            <div className="container">
                <nav className="dashboard-header">
                    <button onClick={() => setShowSettings(false)} className="button">Back</button>
                    <h1>Settings</h1>
                </nav>
                <main>
                    <ConnectAccounts userId={user?.email || ''} />
                </main>
            </div>
        );
    }

    const pieData = Object.keys(dashboard.platforms).map(key => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: dashboard.platforms[key],
    }));

    return (
        <div className="dashboard-container">
            <nav className="dashboard-header">
                <h1>Command Center</h1>
                <div>
                    <button onClick={() => setShowSettings(true)} className="button">Settings</button>
                    <button onClick={handleRefresh} disabled={refreshing} className="button">
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button onClick={logout} className="button">Logout</button>
                </div>
            </nav>

            <main className="main-content">
                <div className="charts-section">
                    <div className="card">
                        <div className="card-header">Views Trend</div>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={growth}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="views" stroke="var(--primary-color)" fill="var(--primary-color)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="card">
                        <div className="card-header">Platform Distribution</div>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="var(--primary-color)" label>
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`var(--secondary-color)`} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="sidebar-section">
                    <div className="card">
                        <IntelligenceInsights userId={user?.email || ''} />
                    </div>
                    <div className="card">
                        <StrategyOptimizer userId={user?.email || ''} />
                    </div>
                    <div className="card">
                        <QueryChat />
                    </div>
                </div>
            </main>
        </div>
    );
}
