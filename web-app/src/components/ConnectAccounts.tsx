import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import './ConnectAccounts.css';

const API_BASE = 'http://localhost:8000';

interface ConnectedAccount {
    id: string;
    platform: string;
    account_name: string | null;
    is_active: boolean;
}

interface ConnectAccountsProps {
    userId: string;
}

export default function ConnectAccounts({ userId }: ConnectAccountsProps) {
    const { token } = useAuth();
    const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConnectedAccounts = useCallback(async () => {
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
    }, [userId, token]);

    useEffect(() => {
        fetchConnectedAccounts();
    }, [fetchConnectedAccounts]);

    const handleConnect = (platform: string) => {
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

    if (loading) {
        return <div className="loading-container">Loading...</div>;
    }

    return (
        <div className="connect-accounts-container">
            <div className="header">
                <h2>Connected Accounts</h2>
                <p>Connect your social media accounts for deeper insights.</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="platform-list">
                {['youtube', 'instagram', 'linkedin'].map((platform) => {
                    const account = accounts.find(a => a.platform === platform && a.is_active);
                    return (
                        <div key={platform} className="platform-card">
                            <div className="platform-info">
                                <h3>{platform.charAt(0).toUpperCase() + platform.slice(1)}</h3>
                                {account ? (
                                    <p>Connected as {account.account_name}</p>
                                ) : (
                                    <p>Not connected</p>
                                )}
                            </div>
                            <div>
                                {account ? (
                                    <button onClick={() => handleDisconnect(account.id)} className="button">Disconnect</button>
                                ) : (
                                    <button onClick={() => handleConnect(platform)} className="button">Connect</button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="info-box">
                <h4>Secure OAuth Connection</h4>
                <p>
                    When you connect, you'll be redirected to the platform's official login page. We never see your password.
                </p>
            </div>
        </div>
    );
}
