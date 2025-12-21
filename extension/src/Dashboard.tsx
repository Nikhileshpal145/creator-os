import { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const API_BASE = 'http://localhost:8000/api/v1';
const TOKEN_KEY = 'creator_os_token';

interface PlatformData {
    views: number;
    followers: number;
    subscribers: number;
    watch_time_minutes: number | null;
    last_updated: string;
    source_url: string;
}

interface UnifiedAnalytics {
    has_data: boolean;
    summary: {
        total_views: number;
        total_followers: number;
        total_subscribers: number;
        total_likes: number;
        total_comments: number;
        total_shares: number;
        total_engagement: number;
        engagement_rate: number;
        growth_percent: number;
        posts_tracked: number;
    };
    best_platform: {
        name: string | null;
        views: number;
    };
    platforms: Record<string, PlatformData>;
    recent_posts: Array<{
        id: string;
        platform: string;
        text_preview: string;
        views: number;
        likes: number;
        comments: number;
        shares: number;
        engagement: number;
        created_at: string;
    }>;
    data_freshness: {
        scraped_platforms: number;
        last_scrape: string | null;
    };
}

interface User {
    full_name: string;
    email: string;
    tier: string;
}

export default function Dashboard() {
    const [data, setData] = useState<UnifiedAnalytics | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState('Connected');
    const [user, setUser] = useState<User | null>(null);

    // Get auth token from storage
    const getAuthToken = async (): Promise<string | null> => {
        return new Promise((resolve) => {
            chrome.storage.local.get([TOKEN_KEY], (result) => {
                const token = result[TOKEN_KEY];
                resolve(typeof token === 'string' ? token : null);
            });
        });
    };

    // Get auth headers
    const getAuthHeaders = async () => {
        const token = await getAuthToken();
        if (!token) return {};
        return { Authorization: `Bearer ${token}` };
    };

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            const headers = await getAuthHeaders();

            if (!headers.Authorization) {
                setError('Please login to view your dashboard');
                setLoading(false);
                return;
            }

            // Fetch from new authenticated dashboard API
            const [dashboardRes, userRes] = await Promise.all([
                axios.get(`${API_BASE}/dashboard/overview`, { headers }),
                axios.get(`${API_BASE}/auth/me`, { headers })
            ]);

            // Transform dashboard data to match existing UI
            const dashData = dashboardRes.data.data;
            setUser(userRes.data);

            // Convert to UnifiedAnalytics format for backwards compatibility
            const unifiedData: UnifiedAnalytics = {
                has_data: dashData.platforms?.length > 0,
                summary: {
                    total_views: dashData.summary?.total_views || 0,
                    total_followers: dashData.summary?.total_followers || 0,
                    total_subscribers: 0,
                    total_likes: 0,
                    total_comments: 0,
                    total_shares: 0,
                    total_engagement: dashData.summary?.total_engagement || 0,
                    engagement_rate: dashData.summary?.engagement_rate || 0,
                    growth_percent: dashData.summary?.growth_percent || 0,
                    posts_tracked: dashData.summary?.posts_tracked || 0
                },
                best_platform: {
                    name: dashData.platforms?.[0]?.platform || null,
                    views: dashData.platforms?.[0]?.views || 0
                },
                platforms: {},
                recent_posts: dashData.recent_posts || [],
                data_freshness: {
                    scraped_platforms: dashData.summary?.platforms_connected || 0,
                    last_scrape: null
                }
            };

            // Convert platforms array to object
            dashData.platforms?.forEach((p: any) => {
                unifiedData.platforms[p.platform] = {
                    views: p.views,
                    followers: p.followers,
                    subscribers: p.subscribers,
                    watch_time_minutes: p.watch_time_hours * 60,
                    last_updated: p.last_updated,
                    source_url: ''
                };
            });

            setData(unifiedData);
            setChartData(dashData.chart_data || []);
            setStatus('Live Data');
        } catch (err: any) {
            console.error('Failed to load dashboard data:', err);
            if (err.response?.status === 401) {
                setError('Session expired. Please login again.');
            } else {
                setError(err.message || 'Failed to connect to backend');
            }
            setStatus('Offline');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Auto-refresh every 5 minutes
        const interval = setInterval(loadData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const [aiResponse, setAiResponse] = useState<{ query: string; response: string } | null>(null);

    // Voice Control
    const startListening = () => {
        setStatus('Listening...');
        setAiResponse(null);

        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setStatus('Voice not supported');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            const command = event.results[0][0].transcript;
            setStatus(`Heard: "${command}"`);

            if (command.toLowerCase().includes('refresh')) {
                loadData();
            } else {
                handleVoiceQuery(command);
            }
        };

        recognition.onerror = (e: any) => setStatus('Voice error: ' + e.error);
        recognition.start();
    };

    const handleVoiceQuery = async (query: string) => {
        setStatus('Asking AI...');
        try {
            const headers = await getAuthHeaders();
            const res = await axios.post(`${API_BASE}/query/ask`, {
                query: query
            }, { headers });

            setAiResponse({
                query: res.data.query,
                response: res.data.response
            });
            setStatus('Insight Ready');
        } catch (err) {
            console.error('AI Query failed:', err);
            setStatus('AI Error');
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Loading Real-Time Analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <div className="loading-container">
                    <p className="loading-text">⚠️ {error}</p>
                    <button onClick={loadData} className="btn btn-primary" style={{ marginTop: 16 }}>
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    // Transform platforms for chart
    const platformChartData = Object.entries(data.platforms).map(([name, pdata]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        views: pdata.views,
        followers: pdata.followers
    }));

    // Format numbers
    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    // Format time ago
    const formatTimeAgo = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-inner">
                {/* Header */}
                <header className="dashboard-header">
                    <div className="header-title-section">
                        <h1 className="dashboard-title">
                            <span className="dashboard-title-emoji">🚀</span>
                            {user ? `${user.full_name}'s Command Center` : 'Creator Command Center'}
                        </h1>
                        {user && (
                            <span className="user-tier-badge" style={{
                                background: user.tier === 'pro' ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' :
                                    user.tier === 'enterprise' ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                                        'rgba(99, 102, 241, 0.2)'
                            }}>
                                {user.tier.toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="header-controls">
                        <span className="status-badge">
                            <span className="status-dot" style={{
                                background: data.has_data ? '#22c55e' : '#ef4444'
                            }}></span>
                            {status}
                        </span>
                        <button onClick={loadData} className="btn btn-primary">
                            🔄 Refresh
                        </button>
                        <button onClick={startListening} className="btn btn-secondary">
                            🎙️ Voice
                        </button>
                    </div>
                </header>

                {/* Data Status Banner */}
                {!data.has_data && (
                    <div className="status-banner warning">
                        <p>📊 No analytics data yet. Visit YouTube Studio or Instagram with the extension to start scraping!</p>
                    </div>
                )}



                {/* AI Insight Card */}
                {aiResponse && (
                    <div className="status-banner info" style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', border: '1px solid #6366f1' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ fontSize: '24px' }}>🤖</div>
                            <div>
                                <p style={{ fontSize: '14px', color: '#a5b4fc', marginBottom: '4px' }}>You asked: "{aiResponse.query}"</p>
                                <p style={{ fontSize: '16px', fontWeight: '500', color: '#fff' }}>{aiResponse.response}</p>
                            </div>
                        </div>
                    </div>
                )}

                {data.data_freshness.last_scrape && (
                    <div className="status-banner info">
                        <p>
                            📡 Tracking {data.data_freshness.scraped_platforms} platforms •
                            Last update: {formatTimeAgo(data.data_freshness.last_scrape)}
                        </p>
                    </div>
                )}

                {/* KPI Cards */}
                <section className="kpi-grid">
                    <div className="kpi-card">
                        <p className="kpi-label">Total Views</p>
                        <p className="kpi-value">{formatNumber(data.summary.total_views)}</p>
                        <span className={`kpi-trend ${data.summary.growth_percent >= 0 ? 'positive' : 'negative'}`}>
                            {data.summary.growth_percent >= 0 ? '↑' : '↓'} {Math.abs(data.summary.growth_percent)}% vs last week
                        </span>
                    </div>
                    <div className="kpi-card">
                        <p className="kpi-label">Total Followers</p>
                        <p className="kpi-value">{formatNumber(data.summary.total_followers)}</p>
                        <span className="kpi-trend positive">
                            📈 Across all platforms
                        </span>
                    </div>
                    <div className="kpi-card">
                        <p className="kpi-label">Engagement</p>
                        <p className="kpi-value">{formatNumber(data.summary.total_engagement)}</p>
                        <span className={`kpi-trend ${data.summary.engagement_rate >= 2 ? 'positive' : 'negative'}`}>
                            {data.summary.engagement_rate}% rate
                        </span>
                    </div>
                    <div className="kpi-card">
                        <p className="kpi-label">Best Platform</p>
                        <p className="kpi-value">
                            {data.best_platform.name
                                ? getPlatformIcon(data.best_platform.name) + ' ' + data.best_platform.name.charAt(0).toUpperCase() + data.best_platform.name.slice(1)
                                : 'N/A'
                            }
                        </p>
                        <span className="kpi-trend positive">
                            🏆 {formatNumber(data.best_platform.views)} views
                        </span>
                    </div>
                </section>

                {/* Platform Performance Chart */}
                {platformChartData.length > 0 && (
                    <section className="chart-card">
                        <h3 className="chart-title">📊 Platform Performance</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={platformChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        axisLine={{ stroke: 'rgba(99, 102, 241, 0.2)' }}
                                        tickLine={{ stroke: 'rgba(99, 102, 241, 0.2)' }}
                                    />
                                    <YAxis
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        axisLine={{ stroke: 'rgba(99, 102, 241, 0.2)' }}
                                        tickLine={{ stroke: 'rgba(99, 102, 241, 0.2)' }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#252542',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            borderRadius: '12px',
                                            color: '#f8fafc'
                                        }}
                                        cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                                        formatter={(value) => formatNumber(value as number)}
                                    />
                                    <Bar dataKey="views" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} maxBarSize={80} />
                                    <defs>
                                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" />
                                            <stop offset="100%" stopColor="#6366f1" />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                )}

                {/* 7-Day Trend Chart */}
                {chartData.length > 0 && (
                    <section className="chart-card">
                        <h3 className="chart-title">📈 7-Day Views Trend</h3>
                        <div className="chart-container">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                                    />
                                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{
                                            background: '#252542',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            borderRadius: '12px',
                                            color: '#f8fafc'
                                        }}
                                        formatter={(value) => formatNumber(value as number)}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="views"
                                        stroke="#8b5cf6"
                                        strokeWidth={3}
                                        dot={{ fill: '#8b5cf6', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                )}

                {/* Platform Details */}
                <section className="table-card">
                    <h3 className="table-title">🌐 Platform Details</h3>
                    {Object.keys(data.platforms).length === 0 ? (
                        <div className="empty-state">
                            <p>No platforms connected yet. Visit YouTube Studio or Instagram with the extension active!</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Platform</th>
                                    <th>Views</th>
                                    <th>Followers</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(data.platforms).map(([platform, pdata]) => (
                                    <tr key={platform}>
                                        <td>
                                            <span className={`platform-badge ${platform}`}>
                                                {getPlatformIcon(platform)} {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                            </span>
                                        </td>
                                        <td>{formatNumber(pdata.views)}</td>
                                        <td>{formatNumber(pdata.followers || pdata.subscribers)}</td>
                                        <td className="status-text">{formatTimeAgo(pdata.last_updated)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>

                {/* Recent Posts */}
                {data.recent_posts.length > 0 && (
                    <section className="table-card">
                        <h3 className="table-title">📝 Recent Content Performance</h3>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Content</th>
                                    <th>Platform</th>
                                    <th>Engagement</th>
                                    <th>Views</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recent_posts.map((post) => (
                                    <tr key={post.id}>
                                        <td className="content-cell">{post.text_preview || 'No preview'}</td>
                                        <td>
                                            <span className={`platform-badge ${post.platform}`}>
                                                {getPlatformIcon(post.platform)} {post.platform}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="score-badge">
                                                {formatNumber(post.engagement)}
                                            </span>
                                        </td>
                                        <td>{formatNumber(post.views)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}
            </div>
        </div>
    );
}

function getPlatformIcon(platform: string): string {
    const icons: { [key: string]: string } = {
        youtube: '▶️',
        linkedin: '💼',
        twitter: '🐦',
        instagram: '📸',
        tiktok: '🎵',
    };
    return icons[platform] || '🌐';
}
