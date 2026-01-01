import { useState, useEffect } from 'react';
import './AgentStatus.css';

interface AgentStatusProps {
    onAnalyzeClick: () => void;
}

export default function AgentStatus({ onAnalyzeClick }: AgentStatusProps) {
    const [platform, setPlatform] = useState<string | null>(null);
    const [lastAnalysis, setLastAnalysis] = useState<any>(null);

    useEffect(() => {
        // Check current tab's platform
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (tab?.url) {
                const url = tab.url;
                if (url.includes('instagram.com')) setPlatform('instagram');
                else if (url.includes('twitter.com') || url.includes('x.com')) setPlatform('twitter');
                else if (url.includes('linkedin.com')) setPlatform('linkedin');
                else if (url.includes('youtube.com')) setPlatform('youtube');
                else setPlatform(null);
            }
        });

        // Listen for analysis results
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.action === 'ANALYSIS_RESULT') {
                setLastAnalysis(msg.payload);
            }
        });
    }, [platform]);

    const platformIcons: Record<string, string> = {
        instagram: '📷',
        twitter: '🐦',
        linkedin: '💼',
        youtube: '▶️'
    };

    const platformNames: Record<string, string> = {
        instagram: 'Instagram',
        twitter: 'Twitter/X',
        linkedin: 'LinkedIn',
        youtube: 'YouTube'
    };

    return (
        <div className="agent-status">
            <div className="agent-status-header">
                <span className={`status-indicator ${platform ? 'active' : ''}`}></span>
                <span className="status-text">
                    {platform ? (
                        <>
                            {platformIcons[platform]} JARVIS Active on {platformNames[platform]}
                        </>
                    ) : (
                        '⏸️ Visit a social platform to activate'
                    )}
                </span>
            </div>

            {platform && (
                <div className="agent-actions">
                    <button
                        className="analyze-btn"
                        onClick={onAnalyzeClick}
                    >
                        🎯 Analyze Current Post
                    </button>
                    <p className="agent-hint">
                        Open a post composer to see real-time analysis
                    </p>
                </div>
            )}

            {lastAnalysis && (
                <div className="last-analysis">
                    <div className="analysis-score">
                        Score: <strong>{lastAnalysis.score}/100</strong>
                    </div>
                    <div className="analysis-verdict">
                        {lastAnalysis.verdict}
                    </div>
                </div>
            )}
        </div>
    );
}
