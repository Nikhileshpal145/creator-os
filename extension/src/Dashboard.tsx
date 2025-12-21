import { useEffect, useState } from 'react';
import axios from 'axios';
import { DashboardHeader } from './components/DashboardHeader';
import { KPIGrid } from './components/KPIGrid';
import { PlatformChart } from './components/PlatformChart';
import { PlatformTable } from './components/PlatformTable';

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
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading-text mt-4">Syncing Creator Stream...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="loading-container">
                <div className="glass-card p-8 text-center max-w-md">
                    <p className="text-xl mb-4">⚠️ {error}</p>
                    <button onClick={loadData} className="btn btn-primary w-full justify-center">
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

    return (
        <div className="dashboard-container">
            <div className="dashboard-inner pb-12">

                <DashboardHeader
                    user={user}
                    status={status}
                    onRefresh={loadData}
                    onVoice={startListening}
                />

                {/* AI Insight Card */}
                {aiResponse && (
                    <div className="glass-card mb-8 animate-enter border-accent-primary/50 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-brand"></div>
                        <div className="flex items-start gap-4">
                            <div className="text-3xl">🤖</div>
                            <div>
                                <p className="text-sm text-text-secondary mb-1">You asked: "{aiResponse.query}"</p>
                                <p className="text-lg font-medium text-white leading-relaxed">{aiResponse.response}</p>
                            </div>
                        </div>
                    </div>
                )}

                {!data.has_data && (
                    <div className="status-banner warning mb-8 animate-enter">
                        <p>📊 No analytics data yet. Visit YouTube Studio or Instagram with the extension to start scraping!</p>
                    </div>
                )}

                <KPIGrid data={data.summary} bestPlatform={data.best_platform} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Platform Performance Chart */}
                    {platformChartData.length > 0 && (
                        <PlatformChart
                            type="bar"
                            title="Platform Performance"
                            data={platformChartData}
                            dataKey="views"
                            xAxisKey="name"
                            color="#8b5cf6"
                        />
                    )}

                    {/* 7-Day Trend Chart */}
                    {chartData.length > 0 && (
                        <PlatformChart
                            type="line"
                            title="7-Day Views Trend"
                            data={chartData}
                            dataKey="views"
                            xAxisKey="date"
                            color="#ec4899"
                        />
                    )}
                </div>

                <PlatformTable platforms={data.platforms} />

            </div>
        </div>
    );
}


