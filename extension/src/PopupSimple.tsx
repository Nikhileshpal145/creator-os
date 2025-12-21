import { useState } from 'react';
import './PopupSimple.css';

interface ServerResponse {
    message: string;
    timestamp?: string;
    phase?: string;
}

function PopupSimple() {
    const [status, setStatus] = useState<string>('Not connected');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [response, setResponse] = useState<ServerResponse | null>(null);

    const testConnection = async () => {
        setIsLoading(true);
        setError('');
        setStatus('Connecting...');

        console.log('🔌 Attempting to connect to server...');

        try {
            const res = await fetch('http://localhost:8000/ping', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`);
            }

            const data: ServerResponse = await res.json();
            console.log('✅ Server response:', data);

            setResponse(data);
            setStatus('Connected ✅');
            setError('');
        } catch (err) {
            console.error('❌ Connection failed:', err);
            setStatus('Connection failed');
            setError(err instanceof Error ? err.message : 'Unknown error');
            setResponse(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="popup-simple">
            <header className="popup-header">
                <h1>Creator OS</h1>
                <p className="subtitle">Phase 1: Foundation Test</p>
            </header>

            <main className="popup-main">
                <div className="status-display">
                    <span className="status-label">Status:</span>
                    <span className={`status-value ${status.includes('✅') ? 'connected' : ''}`}>
                        {status}
                    </span>
                </div>

                <button
                    onClick={testConnection}
                    disabled={isLoading}
                    className="test-button"
                >
                    {isLoading ? 'Testing...' : 'Test Connection'}
                </button>

                {error && (
                    <div className="error-box">
                        <strong>Error:</strong> {error}
                        <div className="error-help">
                            Make sure the backend is running:
                            <code>cd backend && python -m app.simple_server</code>
                        </div>
                    </div>
                )}

                {response && (
                    <div className="response-box">
                        <h3>Server Response:</h3>
                        <div className="response-content">
                            <p><strong>Message:</strong> {response.message}</p>
                            {response.phase && <p><strong>Phase:</strong> {response.phase}</p>}
                            {response.timestamp && (
                                <p className="timestamp">
                                    <strong>Time:</strong> {new Date(response.timestamp).toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <footer className="popup-footer">
                <p>🎯 Goal: Prove extension ↔ server communication works</p>
            </footer>
        </div>
    );
}

export default PopupSimple;
