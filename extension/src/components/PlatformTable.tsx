import React from 'react';

interface PlatformData {
    views: number;
    followers: number;
    subscribers: number;
    watch_time_minutes: number | null;
    last_updated: string;
    source_url: string;
}

interface PlatformTableProps {
    platforms: Record<string, PlatformData>;
}

export const PlatformTable: React.FC<PlatformTableProps> = ({ platforms }) => {

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

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

    const getPlatformIcon = (platform: string): string => {
        const icons: { [key: string]: string } = {
            youtube: '▶️',
            linkedin: '💼',
            twitter: '🐦',
            instagram: '📸',
            tiktok: '🎵',
        };
        return icons[platform] || '🌐';
    };

    return (
        <div className="glass-card animate-enter" style={{ animationDelay: '400ms' }}>
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                🌐 Platform Details
            </h3>

            {Object.keys(platforms).length === 0 ? (
                <div className="text-center py-12 text-text-tertiary">
                    <p>No platforms connected yet. Visit YouTube Studio or Instagram with the extension active!</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[rgba(255,255,255,0.05)] text-xs uppercase tracking-wider text-text-tertiary">
                                <th className="p-4 font-semibold">Platform</th>
                                <th className="p-4 font-semibold">Views</th>
                                <th className="p-4 font-semibold">Followers</th>
                                <th className="p-4 font-semibold">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {Object.entries(platforms).map(([platform, pdata]) => (
                                <tr key={platform} className="border-b border-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                                    <td className="p-4">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize
                                            ${platform === 'youtube' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                platform === 'linkedin' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                    platform === 'instagram' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' :
                                                        'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                                            <span>{getPlatformIcon(platform)}</span>
                                            {platform}
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium">{formatNumber(pdata.views)}</td>
                                    <td className="p-4 font-medium">{formatNumber(pdata.followers || pdata.subscribers)}</td>
                                    <td className="p-4 text-text-tertiary">{formatTimeAgo(pdata.last_updated)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
