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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = 'http://localhost:8000/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

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
        } catch (error) {
            console.error("Login failed during user fetch", error);
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
                } catch (error) {
                    console.error("Token invalid or expired", error);
                    logout();
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, [logout]);

    const value = useMemo(() => ({
        user, token, login, logout, isLoading
    }), [user, token, login, logout, isLoading]);

    return (
        <AuthContext.Provider value={value}>
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
