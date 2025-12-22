import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Sparkles, ArrowRight, Lock, Mail, User, Zap, TrendingUp, BarChart3 } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

export default function LoginPage({ onLoginSuccess }: { onLoginSuccess: () => void }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                const formData = new FormData();
                formData.append('username', email);
                formData.append('password', password);

                const res = await axios.post(`${API_BASE}/auth/login`, formData);
                await login(res.data.access_token);
                onLoginSuccess();
            } else {
                await axios.post(`${API_BASE}/auth/register`, {
                    email,
                    password,
                    full_name: fullName
                });
                const formData = new FormData();
                formData.append('username', email);
                formData.append('password', password);
                const loginRes = await axios.post(`${API_BASE}/auth/login`, formData);
                await login(loginRes.data.access_token);
                onLoginSuccess();
            }
        } catch (err: unknown) {
            console.error(err);
            let errorMessage = 'Authentication failed. Please try again.';
            if (axios.isAxiosError(err) && err.response?.data?.detail) {
                errorMessage = err.response.data.detail;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-20 -left-20 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-indigo-400/10 rounded-full" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-purple-400/5 rounded-full animate-pulse"></div>

                {/* Grid pattern overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-6xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                {/* Left: Branding & Features */}
                <div className="flex-1 space-y-8 text-center lg:text-left">
                    {/* Logo */}
                    <div className="flex items-center gap-3 justify-center lg:justify-start">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-lg opacity-60"></div>
                            <div className="relative w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
                                <Sparkles className="text-white" size={28} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Creator OS</h1>
                            <p className="text-xs text-indigo-300 font-medium">by AI-Powered Intelligence</p>
                        </div>
                    </div>

                    {/* Hero Text */}
                    <div className="space-y-4">
                        <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                            Where{' '}
                            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                AI Meets
                            </span>
                            <br />
                            Creator Success
                        </h2>
                        <p className="text-lg text-slate-300 max-w-md mx-auto lg:mx-0">
                            Real-time analytics, intelligent insights, and automated strategies for content creators who demand excellence.
                        </p>
                    </div>

                    {/* Feature Pills */}
                    <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                        <div className="group px-4 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full flex items-center gap-2 hover:bg-white/10 transition-all duration-300">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                            <Zap size={16} className="text-emerald-400" />
                            <span className="text-sm text-slate-200 font-medium">Real-time Analytics</span>
                        </div>
                        <div className="group px-4 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full flex items-center gap-2 hover:bg-white/10 transition-all duration-300" style={{ animationDelay: '0.1s' }}>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                            <TrendingUp size={16} className="text-purple-400" />
                            <span className="text-sm text-slate-200 font-medium">AI Insights</span>
                        </div>
                        <div className="group px-4 py-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full flex items-center gap-2 hover:bg-white/10 transition-all duration-300" style={{ animationDelay: '0.2s' }}>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                            <BarChart3 size={16} className="text-blue-400" />
                            <span className="text-sm text-slate-200 font-medium">Multi-Platform</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden lg:grid grid-cols-3 gap-6 pt-6">
                        <div className="space-y-1">
                            <p className="text-3xl font-bold text-white">99.9%</p>
                            <p className="text-sm text-slate-400">Uptime</p>
                        </div>
                    </div>
                </div>

                {/* Right: Login Form */}
                <div className="w-full lg:w-auto lg:min-w-[440px]">
                    <div className="relative">
                        {/* Glow effect behind card */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-20"></div>

                        {/* Card */}
                        <div className="relative bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    {isLogin ? 'Welcome Back' : 'Create Account'}
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    {isLogin ? 'Access your command center' : 'Join thousands of successful creators'}
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {!isLogin && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-300 ml-1">Full Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                                            <input
                                                type="text"
                                                required
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300 ml-1">Email</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-300 ml-1">Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-500/10 backdrop-blur border border-red-500/20 rounded-xl text-red-400 text-sm font-medium flex items-start gap-2">
                                        <div className="mt-0.5">⚠️</div>
                                        <span>{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="relative w-full group overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl transition-transform group-hover:scale-105"></div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                                    <div className="relative flex items-center justify-center gap-2 py-3.5 text-white font-bold">
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </div>
                                </button>
                            </form>

                            {/* Toggle */}
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                                    className="text-slate-400 hover:text-white text-sm transition-colors font-medium"
                                >
                                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                                    <span className="text-indigo-400 hover:text-indigo-300">
                                        {isLogin ? 'Sign up' : 'Sign in'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 left-0 right-0 text-center">
                <p className="text-xs text-slate-500">
                    © 2024 Creator OS. Built with 💜 for creators worldwide.
                </p>
            </div>
        </div>
    );
}
