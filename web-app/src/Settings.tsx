import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { ArrowLeft, Youtube, Instagram, Linkedin, Check, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

// API Base URL
const API_URL = 'http://localhost:8000'; // Should be env var in prod

interface SocialAccount {
    id: string;
    platform: string;
    account_name: string;
    is_active: boolean;
    created_at: string;
}

export default function Settings() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [accounts, setAccounts] = useState<SocialAccount[]>([]);
    // const [loading, setLoading] = useState(true); // Unused currently
    const [connecting, setConnecting] = useState<string | null>(null);

    // Check for success param from redirect
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const connected = params.get('connected');
        if (connected) {
            // Show success toast or just refresh data
            window.history.replaceState({}, '', '/settings'); // Clean URL
        }
    }, [location]);

    // Fetch accounts
    useEffect(() => {
        if (user?.email) {
            fetchAccounts();
        }
    }, [user]);

    const fetchAccounts = async () => {
        try {
            // setLoading(true);
            // user.email is used as user_id mostly in this simple auth setup
            const res = await axios.get(`${API_URL}/auth/accounts/${user?.email}`);
            setAccounts(res.data.accounts || []);
        } catch (err) {
            console.error("Failed to fetch accounts", err);
        } finally {
            // setLoading(false);
        }
    };

    const handleConnect = (platform: string) => {
        setConnecting(platform);
        // Redirect to backend OAuth start
        window.location.href = `${API_URL}/auth/${platform}/connect?user_id=${user?.email}`;
    };

    const handleDisconnect = async (accountId: string) => {
        if (!confirm("Are you sure you want to disconnect? Automation will stop.")) return;
        try {
            await axios.delete(`${API_URL}/auth/accounts/${accountId}`);
            fetchAccounts();
        } catch (err) {
            console.error("Disconnect failed", err);
        }
    };

    const isConnected = (platform: string) => {
        return accounts.find(a => a.platform === platform && a.is_active);
    };

    return (
        <div className="min-h-screen bg-[#030712] text-white font-sans p-8">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8 flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                    Settings & Integrations
                </h1>
            </div>

            <div className="max-w-4xl mx-auto space-y-8">

                {/* Integrations Section */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-300">Connected Platforms</h2>
                    <p className="text-gray-400">Connect your social accounts to enable AI content automation and auto-posting.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* YouTube Card */}
                        <div className={`
              relative overflow-hidden rounded-2xl border p-6 transition-all duration-300
              ${isConnected('youtube')
                                ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]'
                                : 'bg-white/5 border-white/10 hover:border-white/20'}
            `}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-red-600 rounded-xl shadow-lg">
                                    <Youtube className="w-8 h-8 text-white" />
                                </div>
                                {isConnected('youtube') ? (
                                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                                        <Check className="w-3 h-3" /> CONNECTED
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold px-2 py-1 bg-white/10 text-gray-400 rounded-full">
                                        DISCONNECTED
                                    </span>
                                )}
                            </div>

                            <h3 className="text-lg font-bold mb-1">YouTube</h3>
                            <p className="text-sm text-gray-400 mb-6 min-h-[40px]">
                                {isConnected('youtube')
                                    ? `Connected as ${isConnected('youtube')?.account_name}`
                                    : 'Connect to sync analytics and publish videos/shorts.'}
                            </p>

                            {isConnected('youtube') ? (
                                <button
                                    onClick={() => handleDisconnect(isConnected('youtube')!.id)}
                                    className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    Disconnect
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleConnect('youtube')}
                                    disabled={!!connecting}
                                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white text-sm font-bold shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {connecting === 'youtube' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect YouTube'}
                                </button>
                            )}
                        </div>

                        {/* Instagram Card */}
                        <div className={`
              relative overflow-hidden rounded-2xl border p-6 transition-all duration-300
              ${isConnected('instagram')
                                ? 'bg-fuchsia-500/10 border-fuchsia-500/30 shadow-[0_0_30px_-10px_rgba(217,70,239,0.3)]'
                                : 'bg-white/5 border-white/10 hover:border-white/20'}
            `}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
                                    <Instagram className="w-8 h-8 text-white" />
                                </div>
                                {isConnected('instagram') ? (
                                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                                        <Check className="w-3 h-3" /> CONNECTED
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold px-2 py-1 bg-white/10 text-gray-400 rounded-full">
                                        DISCONNECTED
                                    </span>
                                )}
                            </div>

                            <h3 className="text-lg font-bold mb-1">Instagram</h3>
                            <p className="text-sm text-gray-400 mb-6 min-h-[40px]">
                                {isConnected('instagram')
                                    ? `Connected as ${isConnected('instagram')?.account_name}`
                                    : 'Connect to publish posts and analyze engagement.'}
                            </p>

                            {isConnected('instagram') ? (
                                <button
                                    onClick={() => handleDisconnect(isConnected('instagram')!.id)}
                                    className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    Disconnect
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleConnect('instagram')}
                                    disabled={!!connecting}
                                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-sm font-bold shadow-lg shadow-fuchsia-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {connecting === 'instagram' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect Instagram'}
                                </button>
                            )}
                        </div>

                        {/* LinkedIn Card (Coming Soon) */}
                        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 opacity-60">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-700 rounded-xl shadow-lg">
                                    <Linkedin className="w-8 h-8 text-white" />
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-white/10 text-gray-400 rounded-full">
                                    COMING SOON
                                </span>
                            </div>
                            <h3 className="text-lg font-bold mb-1">LinkedIn</h3>
                            <p className="text-sm text-gray-400 mb-6">
                                Professional network integration coming in the next update.
                            </p>
                            <button disabled className="w-full py-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-500 text-sm font-medium cursor-not-allowed">
                                Unavailable
                            </button>
                        </div>

                    </div>
                </section>

                {/* Account Details */}
                <section className="space-y-4 pt-8 border-t border-white/10">
                    <h2 className="text-xl font-semibold text-gray-300">Account Details</h2>
                    <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl font-bold">
                                {user?.email?.[0].toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">{user?.business_name || 'Creator'}</h3>
                                <p className="text-gray-400">{user?.email}</p>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
