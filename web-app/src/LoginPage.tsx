import { useState } from 'react';
import { useAuth } from './AuthContext';
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
        <div className="container">
            <div className="login-form">
                <div className="text-center mb-8">
                    <h3>{isLogin ? 'Welcome Back' : 'Create Account'}</h3>
                    <p>{isLogin ? 'Access your command center' : 'Join thousands of successful creators'}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="button"
                    >
                        {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div className="toggle-form">
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    >
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <span>
                            {isLogin ? 'Sign up' : 'Sign in'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
