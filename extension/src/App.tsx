import { useState, useEffect } from 'react'
import AgentChat from './components/AgentChat'
import LoginScreen from './components/LoginScreen'
import { authService } from './services/AuthService'
import type { User } from './services/AuthService'
import './App.css'

type View = 'chat' | 'dashboard' | 'settings';

function App() {
  const [view, setView] = useState<View>('chat');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const authenticated = await authService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const openDashboard = () => {
    chrome.tabs.create({ url: "http://localhost:5173/dashboard" });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="app-container loading-state">
        <div className="loading-spinner-large"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Authenticated - show main app
  return (
    <div className="app-container">
      {view === 'chat' && <AgentChat />}

      {view === 'settings' && (
        <div className="settings-panel">
          {/* User Card */}
          <div className="user-card">
            <div className="user-avatar">
              {user?.full_name?.charAt(0) || '👤'}
            </div>
            <div className="user-info">
              <h3>{user?.full_name}</h3>
              <p>{user?.email}</p>
            </div>
          </div>

          {/* Account Section */}
          <div className="settings-section">
            <h3>Account</h3>
            <div className="settings-item">
              <span className="settings-item-label">Plan</span>
              <span className="settings-item-value">{user?.tier?.toUpperCase() || 'FREE'}</span>
            </div>
            <div className="settings-item">
              <span className="settings-item-label">Email</span>
              <span className="settings-item-value">{user?.email}</span>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="settings-section">
            <h3>Preferences</h3>
            <div className="settings-item">
              <span className="settings-item-label">Auto-sync Analytics</span>
              <div className="toggle-switch active"></div>
            </div>
            <div className="settings-item">
              <span className="settings-item-label">Voice Mode</span>
              <div className="toggle-switch active"></div>
            </div>
          </div>

          {/* Logout */}
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Sign Out
          </button>

          <div className="version-info">
            Creator OS <span>v2.0</span> • Enterprise Edition
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button
          className={`nav-btn ${view === 'chat' ? 'active' : ''}`}
          onClick={() => setView('chat')}
        >
          <span className="nav-icon">💬</span>
          <span className="nav-label">Agent</span>
        </button>
        <button
          className="nav-btn"
          onClick={openDashboard}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Dashboard</span>
        </button>
        <button
          className={`nav-btn ${view === 'settings' ? 'active' : ''}`}
          onClick={() => setView('settings')}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">Settings</span>
        </button>
      </nav>
    </div>
  )
}

export default App
