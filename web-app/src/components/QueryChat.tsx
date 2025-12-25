import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer
} from 'recharts';
import {
    Send, X, Sparkles, Loader2,
    ChevronRight, Brain, Zap
} from 'lucide-react';
import { useAuth } from '../AuthContext';

const API_BASE = 'http://localhost:8000/api/v1';

interface GraphData {
    title: string;
    type: string;
    data: unknown[];
}

interface ActionData {
    id: string;
    title: string;
    description: string;
    impact: string;
    priority: number;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    intent?: string;
    source?: string;
    graphs?: GraphData[];
    actions?: ActionData[];
    confidence?: number;
}

export default function QueryChat() {
    const { token } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchSuggestions();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchSuggestions = async () => {
        try {
            const res = await axios.get(`${API_BASE}/query/suggestions`);
            setSuggestions(res.data.suggestions || []);
        } catch {
            setSuggestions([
                "Why is my engagement low?",
                "Which posts should I repeat?",
                "What content works best?"
            ]);
        }
    };

    const sendMessage = async (query: string) => {
        if (!query.trim() || loading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: query
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post(`${API_BASE}/query/ask`, {
                query: query
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: res.data.response,
                intent: res.data.intent,
                source: res.data.source,
                graphs: res.data.graphs,
                actions: res.data.actions,
                confidence: res.data.confidence
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Query failed:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I couldn't process that query. Please try again."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleSuggestion = (suggestion: string) => {
        sendMessage(suggestion);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-indigo-500/30 hover:scale-110 transition-all z-50 group"
                title="Ask Jarvis"
            >
                <Brain size={24} />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-[420px] h-[600px] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800/50 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                        <Brain size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">Jarvis AI Brain</h3>
                        <p className="text-xs text-gray-400">Trend • Cluster • Predict • Explain</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col justify-center">
                        <div className="text-center mb-6">
                            <Brain size={40} className="mx-auto text-indigo-500 mb-3" />
                            <p className="text-white font-medium">Ask me anything</p>
                            <p className="text-gray-500 text-sm">I'll analyze your data and explain</p>
                        </div>
                        <div className="space-y-2">
                            {suggestions.slice(0, 4).map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSuggestion(suggestion)}
                                    className="w-full text-left p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl text-sm text-gray-300 hover:text-white transition group flex items-center justify-between"
                                >
                                    <span>{suggestion}</span>
                                    <ChevronRight size={16} className="text-gray-600 group-hover:text-indigo-400 transition" />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[90%] rounded-2xl text-sm ${message.role === 'user'
                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm p-3'
                                    : 'bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700/50'
                                    }`}
                            >
                                {message.role === 'assistant' ? (
                                    <div className="space-y-3">
                                        {/* Explanation */}
                                        <div className="p-3"
                                            dangerouslySetInnerHTML={{
                                                __html: formatMarkdown(message.content)
                                            }}
                                        />

                                        {/* Inline Graph */}
                                        {message.graphs && message.graphs.length > 0 && (
                                            <div className="px-3 pb-2">
                                                <div className="bg-gray-900/50 rounded-xl p-3">
                                                    <p className="text-xs text-gray-500 mb-2">{message.graphs[0].title}</p>
                                                    <div className="h-24">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            {message.graphs[0].type === 'line' ? (
                                                                <LineChart data={message.graphs[0].data}>
                                                                    <XAxis dataKey="date" tick={false} axisLine={false} />
                                                                    <YAxis hide />
                                                                    <Tooltip
                                                                        contentStyle={{
                                                                            background: '#1f2937',
                                                                            border: 'none',
                                                                            borderRadius: '8px',
                                                                            fontSize: '12px'
                                                                        }}
                                                                    />
                                                                    <Line
                                                                        type="monotone"
                                                                        dataKey="engagement"
                                                                        stroke="#8b5cf6"
                                                                        strokeWidth={2}
                                                                        dot={false}
                                                                    />
                                                                </LineChart>
                                                            ) : (
                                                                <BarChart data={message.graphs[0].data}>
                                                                    <XAxis dataKey="cluster" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} />
                                                                    <YAxis hide />
                                                                    <Tooltip
                                                                        contentStyle={{
                                                                            background: '#1f2937',
                                                                            border: 'none',
                                                                            borderRadius: '8px',
                                                                            fontSize: '12px'
                                                                        }}
                                                                    />
                                                                    <Bar dataKey="avgEngagement" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                                                </BarChart>
                                                            )}
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Cards */}
                                        {message.actions && message.actions.length > 0 && (
                                            <div className="px-3 pb-3 space-y-2">
                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Zap size={10} /> Actions
                                                </p>
                                                {message.actions.slice(0, 3).map((action, idx) => (
                                                    <div
                                                        key={action.id || idx}
                                                        className="bg-gray-900/50 rounded-lg p-2 flex items-center gap-2"
                                                    >
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${action.priority === 1 ? 'bg-red-500/20 text-red-400' :
                                                            action.priority === 2 ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-gray-500/20 text-gray-400'
                                                            }`}>
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-white truncate">{action.title}</p>
                                                            <p className="text-xs text-emerald-400">{action.impact}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Source */}
                                        {message.source && (
                                            <div className="px-3 pb-2 flex items-center gap-2 text-xs text-gray-500">
                                                <Sparkles size={10} />
                                                <span>{message.source === 'openai' ? 'Jarvis + GPT' : 'Jarvis Analysis'}</span>
                                                {message.confidence && (
                                                    <span className="ml-auto text-indigo-400">{Math.round(message.confidence * 100)}% confident</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span>{message.content}</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-800 rounded-2xl rounded-bl-sm p-3 border border-gray-700/50">
                            <div className="flex items-center gap-2 text-gray-400">
                                <Loader2 size={14} className="animate-spin" />
                                <span className="text-sm">Running analysis...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800/50">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Why is my engagement low?"
                        className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
    );
}

// Simple markdown formatter
function formatMarkdown(text: string): string {
    return text
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>')
        .replace(/^### (.+)$/gm, '<h4 class="font-bold text-white mt-2">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 class="font-bold text-white mt-2">$1</h3>')
        .replace(/^[-•] (.+)$/gm, '<li class="ml-4">$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4"><span class="text-indigo-400">$1.</span> $2</li>')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n/g, '<br/>');
}
