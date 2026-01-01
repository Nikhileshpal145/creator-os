import { useState, useEffect } from 'react';
import axios from 'axios';
import './IntelligenceInsights.css';

const API_BASE = 'http://localhost:8000/api/v1';

interface Pattern {
    id: string;
    pattern_type: string;
    explanation: string;
}

interface Recommendation {
    title: string;
    description: string;
}

interface IntelligenceInsightsProps {
    userId: string;
}

export default function IntelligenceInsights({ userId }: IntelligenceInsightsProps) {
    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchIntelligence = async () => {
            try {
                const [patternsRes, recommendationsRes] = await Promise.all([
                    axios.get(`${API_BASE}/intelligence/patterns/${userId}`),
                    axios.get(`${API_BASE}/intelligence/recommendations/${userId}`),
                ]);

                setPatterns(patternsRes.data.patterns || []);
                setRecommendations(recommendationsRes.data.recommendations || []);
            } catch (error) {
                console.error('Failed to fetch intelligence data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchIntelligence();
    }, [userId]);

    if (loading) {
        return <div className="loading-container">Loading insights...</div>;
    }

    return (
        <div className="intelligence-insights-container">
            <div className="header">
                <h2>Intelligence Insights</h2>
                <p>Patterns and recommendations from our AI.</p>
            </div>

            <div className="patterns-grid">
                {patterns.map((pattern) => (
                    <div key={pattern.id} className="pattern-card">
                        <h3>{pattern.pattern_type}</h3>
                        <p>{pattern.explanation}</p>
                    </div>
                ))}
            </div>

            <div className="recommendations-list">
                {recommendations.map((rec, index) => (
                    <div key={index} className="recommendation-card">
                        <h4>{rec.title}</h4>
                        <p>{rec.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
