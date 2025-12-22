import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Youtube, Instagram, Linkedin, Link2, Unlink,
    CheckCircle2, AlertCircle, RefreshCw, ExternalLink,
    Loader2
} from 'lucide-react';
import { useAuth } from '../AuthContext';

const API_BASE = 'http://localhost:8000';

interface ConnectedAccount {
    id: string;
    platform: string;
    account_name: string | null;
    account_email: string | null;
    profile_picture: string | null;
    is_active: boolean;
    connected_at: string;
    last_synced: string | null;
    expires_soon: boolean;
}

const PLATFORM_CONFIG: Record<string, {
    name: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    description: string;
}> = {
    youtube: {
        name: 'YouTube',
        icon: Youtube,
        color: 'text-red-500',
        bgColor: 'bg-red-500/20',
        description: 'Access channel analytics, video performance, and subscriber data'
    },
    instagram: {
        name: 'Instagram',
        icon: Instagram,
        color: 'text-pink-500',
        bgColor: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
        description: 'Track followers, engagement, and content insights'
    },
    linkedin: {
        name: 'LinkedIn',
        icon: Linkedin,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/20',
        description: 'Monitor profile views, post analytics, and network growth'
    }
};

interface ConnectAccountsProps {
    userId: string;
}

export default function ConnectAccounts({ userId }: ConnectAccountsProps) {
    const { token } = useAuth();
    const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchConnectedAccounts();
    }, [userId]);

    const fetchConnectedAccounts = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/auth/accounts/${userId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setAccounts(res.data.accounts || []);
        } catch (err) {
            console.error('Failed to fetch accounts:', err);
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = (platform: string) => {
        setConnecting(platform);
        // Redirect to OAuth flow
        window.location.href = `${API_BASE}/auth/${platform}/connect?user_id=${userId}`;
    };

    const handleDisconnect = async (accountId: string) => {
        try {
            await axios.delete(`${API_BASE}/auth/accounts/${accountId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            await fetchConnectedAccounts();
        } catch (err) {
            console.error('Failed to disconnect:', err);
            setError('Failed to disconnect account');
        }
    };

    const handleRefresh = async (accountId: string) => {
        try {
            await axios.post(`${API_BASE}/auth/accounts/${accountId}/refresh`, {}, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            await fetchConnectedAccounts();
        } catch (err) {
            console.error('Failed to refresh token:', err);
            setError('Failed to refresh token');
        }
    };

    const getAccountForPlatform = (platform: string) => {
        return accounts.find(a => a.platform === platform && a.is_active);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Link2 className="text-indigo-400" />
                        Connected Accounts
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Connect your social media accounts for direct API access and deeper insights
                    </p>
                </div>
                <button
                    onClick={fetchConnectedAccounts}
                    className="p-2 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white"
                    title="Refresh"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="text-red-400" size={20} />
                    <span className="text-red-300">{error}</span>
                    <button
                        onClick={() => setError(null)}
                        className="ml-auto text-red-400 hover:text-red-300"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Platform Cards */}
            <div className="grid gap-4">
                {Object.entries(PLATFORM_CONFIG).map(([platform, config]) => {
                    const account = getAccountForPlatform(platform);
                    const Icon = config.icon;

                    return (
                        <div
                            key={platform}
                            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 hover:border-gray-600/50 transition"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {/* Platform Icon */}
                                    <div className={`p-3 rounded-xl ${config.bgColor}`}>
                                        <Icon className={config.color} size={24} />
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-white">{config.name}</h3>
                                            {account && (
                                                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 size={12} />
                                                    Connected
                                                </span>
                                            )}
                                        </div>
                                        {account ? (
                                            <div className="text-sm text-gray-400 mt-1">
                                                {account.account_name || account.account_email || 'Account connected'}
                                                {account.expires_soon && (
                                                    <span className="ml-2 text-yellow-400">• Token expires soon</span>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500">{config.description}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {account ? (
                                        <>
                                            {account.expires_soon && (
                                                <button
                                                    onClick={() => handleRefresh(account.id)}
                                                    className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition"
                                                    title="Refresh token"
                                                >
                                                    <RefreshCw size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDisconnect(account.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-red-500/20 text-gray-300 hover:text-red-400 rounded-lg transition"
                                            >
                                                <Unlink size={16} />
                                                Disconnect
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => handleConnect(platform)}
                                            disabled={connecting === platform}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition disabled:opacity-50"
                                        >
                                            {connecting === platform ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <ExternalLink size={16} />
                                            )}
                                            Connect
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Info Box */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
                <h4 className="font-medium text-indigo-300 mb-2">🔐 Secure OAuth Connection</h4>
                <p className="text-sm text-gray-400">
                    When you click Connect, you'll be redirected to the platform's official login page.
                    Creator OS only stores access tokens - we never see your password.
                    You can disconnect at any time.
                </p>
            </div>
        </div>
    );
}
