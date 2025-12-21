import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';

interface ChartProps {
    type: 'bar' | 'line';
    data: any[];
    title: string;
    dataKey: string;
    xAxisKey: string;
    color?: string;
}

export const PlatformChart: React.FC<ChartProps> = ({
    type, data, title, dataKey, xAxisKey, color = '#6366f1'
}) => {

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return (
        <div className="glass-card animate-enter" style={{ animationDelay: '300ms' }}>
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                {type === 'bar' ? '📊' : '📈'} {title}
            </h3>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {type === 'bar' ? (
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey={xAxisKey}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={formatNumber}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 15, 26, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                }}
                                formatter={(value: any) => [formatNumber(Number(value) || 0), 'Views']}
                            />
                            <Bar
                                dataKey={dataKey}
                                fill="url(#barGradient)"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={60}
                            />
                        </BarChart>
                    ) : (
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey={xAxisKey}
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'short' })}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={formatNumber}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 15, 26, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: '#fff'
                                }}
                                formatter={(value: any) => [formatNumber(Number(value) || 0), 'Views']}
                            />
                            <Area
                                type="monotone"
                                dataKey={dataKey}
                                stroke={color}
                                fillOpacity={1}
                                fill="url(#areaGradient)"
                                strokeWidth={3}
                            />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};
