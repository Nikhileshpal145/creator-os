import React, { createContext, useContext, useState, useEffect } from 'react';
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
    }, []);

    const login = async (newToken: string) => {
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
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
