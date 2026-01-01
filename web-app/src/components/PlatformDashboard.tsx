import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import './PlatformDashboard.css';

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
    top_posts: Array<{ id: string; title: string; views: number; likes: number; comments: number; date: string; }>;
    trend: Array<{ date: string; day: string; views: number; }>;
}

export default function PlatformDashboard({ platform, userId, onBack }: PlatformDashboardProps) {
    const [data, setData] = useState<PlatformData | null>(null);
    const [loading, setLoading] = useState(true);

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

    if (loading) {
        return <div className="loading-container">Loading {platform} data...</div>;
    }

    if (!data) {
        return <div>No data available.</div>;
    }

    return (
        <div className="platform-dashboard-container">
            <div className="header">
                <button onClick={onBack} className="button">Back</button>
                <h2>{platform.charAt(0).toUpperCase() + platform.slice(1)} Analytics</h2>
            </div>

            <div className="kpi-grid">
                <div className="card">Views: {data.views}</div>
                <div className="card">Followers: {data.followers}</div>
                <div className="card">Engagement Rate: {data.engagement_rate}%</div>
            </div>

            <div className="main-content">
                <div className="charts-section">
                    <div className="card">
                        <h3>Views Trend</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={data.trend}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="views" stroke="#8884d8" fill="#8884d8" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="sidebar-section">
                    <div className="card">
                        <h3>Top Posts</h3>
                        {data.top_posts.map(post => (
                            <div key={post.id}>
                                <p>{post.title}</p>
                                <p>Views: {post.views}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
