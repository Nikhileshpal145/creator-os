import React from 'react';

interface Metric {
    label: string;
    value: string | number;
    trend?: number;
    trendLabel?: string;
    isPositive?: boolean;
    subtext?: string;
}

interface KPIGridProps {
    data: {
        total_views: number;
        total_followers: number;
        total_engagement: number;
        engagement_rate: number;
        growth_percent: number;
    };
    bestPlatform: {
        name: string | null;
        views: number;
    };
}

export const KPIGrid: React.FC<KPIGridProps> = ({ data, bestPlatform }) => {
    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const metrics: Metric[] = [
        {
            label: 'Total Views',
            value: formatNumber(data.total_views),
            trend: data.growth_percent,
            trendLabel: 'vs last week',
            isPositive: data.growth_percent >= 0
        },
        {
            label: 'Total Followers',
            value: formatNumber(data.total_followers),
            subtext: 'Across all platforms'
        },
        {
            label: 'Engagement',
            value: formatNumber(data.total_engagement),
            trend: data.engagement_rate,
            trendLabel: 'rate',
            isPositive: data.engagement_rate >= 2
        },
        {
            label: 'Top Platform',
            value: bestPlatform.name ? bestPlatform.name.charAt(0).toUpperCase() + bestPlatform.name.slice(1) : 'N/A',
            subtext: `${formatNumber(bestPlatform.views)} views`
        }
    ];

    return (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric, index) => (
                <div
                    key={index}
                    className="glass-card animate-enter"
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <p className="text-sm font-medium text-text-tertiary mb-2 uppercase tracking-wider">
                        {metric.label}
                    </p>
                    <p className="text-3xl font-bold text-gradient mb-2">
                        {metric.value}
                    </p>

                    {metric.trend !== undefined && (
                        <div className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full w-fit ${metric.isPositive
                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            <span>{metric.isPositive ? '↑' : '↓'}</span>
                            <span>
                                {Math.abs(metric.trend)}% {metric.trendLabel}
                            </span>
                        </div>
                    )}

                    {metric.subtext && (
                        <div className="flex items-center gap-1 text-xs text-text-tertiary mt-2">
                            {metric.label === 'Top Platform' && '🏆'} {metric.subtext}
                        </div>
                    )}
                </div>
            ))}
        </section>
    );
};
