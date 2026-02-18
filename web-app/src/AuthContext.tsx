import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

interface User {
    id: number;
    email: string;
    full_name: string;
    business_name?: string;
    niche?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    connectionError?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = 'http://localhost:8000/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    const [connectionError, setConnectionError] = useState(false);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    }, []);

    const login = useCallback(async (newToken: string) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        try {
            const res = await axios.get(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${newToken}` }
            });
            setUser(res.data);
            setConnectionError(false);
        } catch (error) {
            console.error("Login failed during user fetch", error);
            if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
                setConnectionError(true);
            }
            logout();
        }
    }, [logout]);

    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                try {
                    // Verify token and get user info
                    const res = await axios.get(`${API_BASE}/auth/me`, {
                        headers: { Authorization: `Bearer ${storedToken}` }
                    });
                    setUser(res.data);
                    setToken(storedToken);
                    setConnectionError(false);
                } catch (error) {
                    console.error("Token invalid or expired", error);
                    if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
                        setConnectionError(true);
                    } else {
                        logout();
                    }
                }
            } else {
                // Check if backend is alive even without token
                try {
                    await axios.get('http://localhost:8000/health', { timeout: 2000 });
                    setConnectionError(false);
                } catch (error) {
                    // Start of health check failure
                    // We might not have a /health endpoint exposed publicly without auth or it fails
                    // Just ignoring this for now to rely on login actions or explicit checks
                    // But if initial load implies no backend, we should show it.
                    // Let's assume connection error if we can't hit root
                    if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
                        setConnectionError(true);
                    }
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, [logout]);

    const value = useMemo(() => ({
        user, token, login, logout, isLoading, connectionError
    }), [user, token, login, logout, isLoading, connectionError]);

    return (
        <AuthContext.Provider value={value}>
            {connectionError && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-red-600/90 text-white p-2 text-center text-sm font-medium backdrop-blur-sm animate-pulse flex items-center justify-center gap-2">
                    <span>⚠️ Backend connection unavailable. Some features may not work.</span>
                    <button onClick={() => window.location.reload()} className="underline hover:text-red-100">Retry</button>
                </div>
            )}
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
