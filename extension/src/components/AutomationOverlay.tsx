import { useState } from 'react';
import type { AutomationProgress } from '../services/AutomationService';
import './AutomationOverlay.css';

interface AutomationOverlayProps {
    progress: AutomationProgress | null;
    onStop: () => void;
    onPause: () => void;
    onResume: () => void;
}

export default function AutomationOverlay({
    progress,
    onStop,
    onPause,
    onResume
}: AutomationOverlayProps) {
    const [isMinimized, setIsMinimized] = useState(false);

    if (!progress || progress.status === 'idle') {
        return null;
    }

    const percentage = progress.totalActions > 0
        ? Math.round((progress.currentAction / progress.totalActions) * 100)
        : 0;

    const getStatusIcon = () => {
        switch (progress.status) {
            case 'running': return '🔄';
            case 'paused': return '⏸️';
            case 'completed': return '✅';
            case 'error': return '❌';
            default: return '⏳';
        }
    };

    const getStatusColor = () => {
        switch (progress.status) {
            case 'running': return '#8b5cf6';
            case 'paused': return '#f59e0b';
            case 'completed': return '#22c55e';
            case 'error': return '#ef4444';
            default: return '#64748b';
        }
    };

    if (isMinimized) {
        return (
            <div className="automation-overlay minimized" onClick={() => setIsMinimized(false)}>
                <div className="mini-indicator" style={{ background: getStatusColor() }}>
                    <span>{getStatusIcon()}</span>
                    <span className="mini-progress">{percentage}%</span>
                </div>
            </div>
        );
    }

    return (
        <div className="automation-overlay">
            <div className="overlay-content">
                {/* Header */}
                <div className="overlay-header">
                    <div className="overlay-title">
                        <span className="overlay-icon">{getStatusIcon()}</span>
                        <span>Influencer OS Automation</span>
                    </div>
                    <div className="overlay-actions">
                        <button
                            className="overlay-btn minimize"
                            onClick={() => setIsMinimized(true)}
                            title="Minimize"
                        >
                            ─
                        </button>
                        <button
                            className="overlay-btn close"
                            onClick={onStop}
                            title="Stop"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-section">
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar-fill"
                            style={{
                                width: `${percentage}%`,
                                background: getStatusColor()
                            }}
                        />
                    </div>
                    <div className="progress-text">
                        <span>{progress.currentAction} of {progress.totalActions}</span>
                        <span>{percentage}%</span>
                    </div>
                </div>

                {/* Current Action */}
                <div className="current-action">
                    <p>{progress.currentActionDescription}</p>
                </div>

                {/* Action Log */}
                <div className="action-log">
                    {progress.actions.slice(-5).map((action, i) => (
                        <div
                            key={action.id || i}
                            className={`action-item ${action.status}`}
                        >
                            <span className="action-status">
                                {action.status === 'completed' && '✓'}
                                {action.status === 'running' && '→'}
                                {action.status === 'failed' && '✗'}
                                {action.status === 'pending' && '○'}
                            </span>
                            <span className="action-text">
                                {action.type}: {action.target || action.url || action.value || ''}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <div className="overlay-controls">
                    {progress.status === 'running' && (
                        <button className="control-btn pause" onClick={onPause}>
                            ⏸️ Pause
                        </button>
                    )}
                    {progress.status === 'paused' && (
                        <button className="control-btn resume" onClick={onResume}>
                            ▶️ Resume
                        </button>
                    )}
                    <button className="control-btn stop" onClick={onStop}>
                        ⏹️ Stop
                    </button>
                </div>
            </div>
        </div>
    );
}
