import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    message: string;
    actionText?: string;
    onAction?: () => void;
    variant?: 'chart' | 'list' | 'content';
}

export default function EmptyState({
    icon: Icon,
    title,
    message,
    actionText,
    onAction,
    variant = 'content'
}: EmptyStateProps) {
    const gradients = {
        chart: 'from-blue-500/10 via-transparent to-cyan-500/10',
        list: 'from-purple-500/10 via-transparent to-pink-500/10',
        content: 'from-emerald-500/10 via-transparent to-teal-500/10'
    };

    const iconColors = {
        chart: 'text-blue-400',
        list: 'text-purple-400',
        content: 'text-emerald-400'
    };

    const borderColors = {
        chart: 'border-blue-500/20',
        list: 'border-purple-500/20',
        content: 'border-emerald-500/20'
    };

    return (
        <div className={`relative bg-gradient-to-br ${gradients[variant]} border ${borderColors[variant]} rounded-2xl p-12 text-center overflow-hidden`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${gradients[variant]} opacity-50`} />
            <div className="relative">
                <div className={`inline-flex p-4 bg-gray-800/50 rounded-2xl mb-4 ${iconColors[variant]}`}>
                    <Icon size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 max-w-md mx-auto mb-4">{message}</p>
                {actionText && onAction && (
                    <button
                        onClick={onAction}
                        className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all hover:-translate-y-0.5"
                    >
                        {actionText}
                    </button>
                )}
            </div>
        </div>
    );
}
