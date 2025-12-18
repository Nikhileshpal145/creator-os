import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Target, Zap, Clock, TrendingUp, CheckCircle2,
    ChevronRight, Sparkles, BarChart3, Brain,
    ArrowRight, RefreshCw, Play, Check, X
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

interface StrategyAction {
    id: string;
    action_type: string;
    title: string;
    description: string;
    priority: number;
    category: string;
    predicted_impact: string;
    status: string;
    recommended_time?: string;
}

interface WeeklyPlan {
    week_of: string;
    actions: StrategyAction[];
    goals: {
        target_posts: number;
        target_engagement: number;
        focus_platform: string;
        key_objective: string;
    };
    total_actions: number;
    high_priority: number;
    prediction_confidence: number;
}

interface LearningProgress {
    total_predictions: number;
    outcomes_recorded: number;
    average_accuracy: number;
    accuracy_trend: string;
    accuracy_history?: number[];
    best_predicted_category: string;
    insight: string;
}

interface StrategyOptimizerProps {
    userId: string;
}

export default function StrategyOptimizer({ userId }: StrategyOptimizerProps) {
    const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
    const [learning, setLearning] = useState<LearningProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionStates, setActionStates] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchData();
    }, [userId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [planRes, learningRes] = await Promise.all([
                axios.get(`${API_BASE}/strategy/weekly-plan/${userId}`),
                axios.get(`${API_BASE}/strategy/learning/${userId}`)
            ]);
            setWeeklyPlan(planRes.data);
            setLearning(learningRes.data);
        } catch (error) {
            console.error('Failed to fetch strategy data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleActionTaken = async (actionId: string) => {
        setActionStates(prev => ({ ...prev, [actionId]: 'taken' }));
        try {
            await axios.post(`${API_BASE}/strategy/actions/${actionId}/taken`);
        } catch (error) {
            console.error('Failed to record action:', error);
        }
    };

    const handleActionSkipped = (actionId: string) => {
        setActionStates(prev => ({ ...prev, [actionId]: 'skipped' }));
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'timing': return <Clock size={16} />;
            case 'content': return <Sparkles size={16} />;
            case 'platform': return <TrendingUp size={16} />;
            case 'engagement': return <Zap size={16} />;
            default: return <Target size={16} />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'timing': return 'from-blue-500 to-cyan-500';
            case 'content': return 'from-purple-500 to-pink-500';
            case 'platform': return 'from-green-500 to-emerald-500';
            case 'engagement': return 'from-orange-500 to-yellow-500';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const getPriorityBadge = (priority: number) => {
        if (priority === 1) return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">High Priority</span>;
        if (priority === 2) return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">Medium</span>;
        return <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full">Low</span>;
    };

    if (loading) {
        return (
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-700 rounded-xl"></div>
                    <div className="h-6 bg-gray-700 rounded w-48"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
                        <Target size={22} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Strategy Optimizer</h2>
                        <p className="text-sm text-gray-400">Week of {weeklyPlan?.week_of}</p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition text-gray-400 hover:text-white"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Weekly Goal Card */}
            {weeklyPlan?.goals && (
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-xl">
                            <Brain size={24} className="text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-emerald-300 mb-1">This Week's Objective</h3>
                            <p className="text-gray-300">{weeklyPlan.goals.key_objective}</p>
                            <div className="flex items-center gap-4 mt-3 text-sm">
                                <span className="text-gray-400">
                                    🎯 <strong className="text-white">{weeklyPlan.goals.target_posts}</strong> posts
                                </span>
                                <span className="text-gray-400">
                                    📈 <strong className="text-white">{weeklyPlan.goals.target_engagement}</strong> engagement goal
                                </span>
                                <span className="text-gray-400">
                                    🏆 Focus: <strong className="text-white capitalize">{weeklyPlan.goals.focus_platform}</strong>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Cards */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">Action Plan</h3>
                    <span className="text-sm text-gray-400">
                        {weeklyPlan?.high_priority} high priority
                    </span>
                </div>

                {weeklyPlan?.actions.map((action) => {
                    const state = actionStates[action.id];
                    const isCompleted = state === 'taken';
                    const isSkipped = state === 'skipped';

                    return (
                        <div
                            key={action.id}
                            className={`bg-gray-900/40 backdrop-blur-xl border rounded-xl p-4 transition-all ${isCompleted
                                    ? 'border-emerald-500/30 bg-emerald-500/5'
                                    : isSkipped
                                        ? 'border-gray-700/30 opacity-50'
                                        : 'border-gray-800/50 hover:border-gray-700/50'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${getCategoryColor(action.category)}`}>
                                    {getCategoryIcon(action.category)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className={`font-semibold ${isSkipped ? 'text-gray-500' : 'text-white'}`}>
                                            {action.title}
                                        </h4>
                                        {getPriorityBadge(action.priority)}
                                        {isCompleted && (
                                            <CheckCircle2 size={16} className="text-emerald-400" />
                                        )}
                                    </div>
                                    <p className={`text-sm ${isSkipped ? 'text-gray-600' : 'text-gray-400'} mb-2`}>
                                        {action.description}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                                            <TrendingUp size={14} />
                                            {action.predicted_impact}
                                        </span>
                                        {action.recommended_time && (
                                            <span className="text-gray-500 flex items-center gap-1">
                                                <Clock size={14} />
                                                {action.recommended_time}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {!isCompleted && !isSkipped && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleActionTaken(action.id)}
                                            className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition"
                                            title="Mark as done"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleActionSkipped(action.id)}
                                            className="p-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-400 rounded-lg transition"
                                            title="Skip"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Learning Progress */}
            {learning && (
                <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <BarChart3 size={18} className="text-purple-400" />
                        </div>
                        <h3 className="font-semibold text-white">Learning Progress</h3>
                        <span className="ml-auto text-sm text-emerald-400">{learning.accuracy_trend}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-800/50 rounded-xl">
                            <div className="text-2xl font-bold text-white">{learning.total_predictions}</div>
                            <div className="text-xs text-gray-400">Predictions</div>
                        </div>
                        <div className="text-center p-3 bg-gray-800/50 rounded-xl">
                            <div className="text-2xl font-bold text-white">{learning.outcomes_recorded}</div>
                            <div className="text-xs text-gray-400">Outcomes</div>
                        </div>
                        <div className="text-center p-3 bg-gray-800/50 rounded-xl">
                            <div className="text-2xl font-bold text-emerald-400">{Math.round(learning.average_accuracy * 100)}%</div>
                            <div className="text-xs text-gray-400">Accuracy</div>
                        </div>
                    </div>

                    <p className="text-sm text-gray-400">{learning.insight}</p>
                </div>
            )}
        </div>
    );
}
