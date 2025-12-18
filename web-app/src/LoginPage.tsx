import { useState } from 'react';
import { useAuth } from './AuthContext';
import { Sparkles, ArrowRight, Lock, Mail, User } from 'lucide-react';
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
                // Auto login after register
                const formData = new FormData();
                formData.append('username', email);
                formData.append('password', password);
                const loginRes = await axios.post(`${API_BASE}/auth/login`, formData);
                await login(loginRes.data.access_token);
                onLoginSuccess();
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
            {/* Background Ambience */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20">
                        <Sparkles className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Initialize Agent'}
                    </h1>
                    <p className="text-gray-400">
                        {isLogin ? 'Access your personal command center' : 'Create your secure AI identity'}
                    </p>
                </div>

                <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-400 ml-1">Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-3 text-gray-500 group-focus-within:text-indigo-400 transition" size={18} />
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-gray-950/50 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Enter your name"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 text-gray-500 group-focus-within:text-indigo-400 transition" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-950/50 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-400 ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-indigo-400 transition" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-gray-950/50 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Access System' : 'Create Account'}
                                    <ArrowRight size={18} className="group-hover:translate-x-0.5 transition" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="text-gray-400 hover:text-white text-sm transition-colors"
                        >
                            {isLogin ? "Don't have an identity? Initialize" : "Already have an identity? Access"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
