import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';

function AppContent() {
  const { user } = useAuth();

  return user ? <Dashboard /> : <LoginPage onLoginSuccess={() => {}} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
