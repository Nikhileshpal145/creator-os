/**
 * AuthService - Handles authentication for the extension
 * Manages tokens, login/logout, and user state
 */

const API_BASE = 'http://localhost:8000/api/v1/auth';

export interface User {
    id: number;
    email: string;
    full_name: string;
    business_name?: string;
    niche?: string;
    avatar_url?: string;
    tier: string;
    is_active: boolean;
    onboarding_completed: boolean;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    full_name: string;
    business_name?: string;
    niche?: string;
}

interface AuthTokens {
    access_token: string;
    token_type: string;
}

class AuthService {
    // Changed key name to force re-login after SECRET_KEY change
    private tokenKey = 'creator_os_token_v2';
    private userKey = 'creator_os_user_v2';

    /**
     * Login with email and password
     */
    async login(credentials: LoginCredentials): Promise<boolean> {
        try {
            // OAuth2 password flow expects form data
            const formData = new URLSearchParams();
            formData.append('username', credentials.email);
            formData.append('password', credentials.password);

            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login failed');
            }

            const tokens: AuthTokens = await response.json();

            // Store token
            await this.setToken(tokens.access_token);

            // Fetch and store user info
            await this.fetchCurrentUser();

            return true;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Register a new user
     */
    async register(data: RegisterData): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Registration failed');
            }

            // Auto-login after registration
            return await this.login({
                email: data.email,
                password: data.password,
            });
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    }

    /**
     * Logout and clear stored data
     */
    async logout(): Promise<void> {
        await chrome.storage.local.remove([this.tokenKey, this.userKey]);
    }

    /**
     * Get stored token
     */
    async getToken(): Promise<string | null> {
        const result = await chrome.storage.local.get(this.tokenKey);
        const token = result[this.tokenKey];
        return typeof token === 'string' ? token : null;
    }

    /**
     * Store token
     */
    private async setToken(token: string): Promise<void> {
        await chrome.storage.local.set({ [this.tokenKey]: token });
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        const token = await this.getToken();
        return !!token;
    }

    /**
     * Get current user from storage
     */
    async getCurrentUser(): Promise<User | null> {
        const result = await chrome.storage.local.get(this.userKey);
        const user = result[this.userKey];
        if (user && typeof user === 'object' && 'id' in user && 'email' in user) {
            return user as User;
        }
        return null;
    }

    /**
     * Fetch current user from API and store
     */
    async fetchCurrentUser(): Promise<User | null> {
        try {
            const token = await this.getToken();
            if (!token) return null;

            const response = await fetch(`${API_BASE}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Token expired or invalid (signature changed), logout
                    console.warn('⚠️ Invalid token: Clearing and requiring re-login');
                    await this.logout();
                    return null;
                }
                throw new Error('Failed to fetch user');
            }

            const user: User = await response.json();
            await chrome.storage.local.set({ [this.userKey]: user });

            return user;
        } catch (error) {
            console.error('Fetch user error:', error);
            // On any auth error, clear the token
            if (String(error).includes('401') || String(error).includes('Invalid') || String(error).includes('Signature')) {
                await this.logout();
            }
            return null;
        }
    }

    /**
     * Get auth headers for API requests
     */
    async getAuthHeaders(): Promise<HeadersInit> {
        const token = await this.getToken();
        if (!token) {
            return {};
        }
        return {
            'Authorization': `Bearer ${token}`,
        };
    }

    /**
     * Make authenticated API request
     */
    async authFetch(url: string, options: RequestInit = {}): Promise<Response> {
        const token = await this.getToken();

        const headers = {
            ...options.headers,
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Handle 401 - token expired
        if (response.status === 401) {
            await this.logout();
            throw new Error('Session expired. Please login again.');
        }

        return response;
    }
}

// Export singleton instance
export const authService = new AuthService();
export default AuthService;
