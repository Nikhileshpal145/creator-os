/**
 * VoiceAssistant - Siri-like floating voice assistant
 * 
 * Features:
 * - Floating orb that expands when activated
 * - Wake word detection ("Hey Creator")
 * - Real-time speech transcription
 * - AI responses with text-to-speech
 * - Glassmorphic design with animations
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { voiceService } from '../services/VoiceService';
import type { VoiceEvent } from '../services/VoiceService';
import { authService } from '../services/AuthService';
import './VoiceAssistant.css';

// Assistant states
type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface VoiceAssistantProps {
    onClose?: () => void;
    apiBase?: string;
}

export default function VoiceAssistant({
    onClose: _onClose,
    apiBase = 'http://localhost:8000/api/v1'
}: VoiceAssistantProps) {
    // State
    const [state, setState] = useState<AssistantState>('idle');
    const [isExpanded, setIsExpanded] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [_messages, setMessages] = useState<Message[]>([]);;
    const [error, setError] = useState<string | null>(null);
    const [audioLevels, setAudioLevels] = useState<number[]>(new Array(12).fill(0.1));
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const animationRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);

    // Initialize voice service
    useEffect(() => {
        voiceService.setConfig({
            wakeWord: 'hey creator',
            continuous: false,
            language: 'en-US'
        });

        // Load saved position
        const savedPos = localStorage.getItem('voiceAssistantPosition');
        if (savedPos) {
            try {
                setPosition(JSON.parse(savedPos));
            } catch { }
        }

        return () => {
            voiceService.stopListening();
            voiceService.stopSpeaking();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Audio visualization
    const updateAudioLevels = useCallback(() => {
        if (analyserRef.current && state === 'listening') {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);

            // Sample 12 frequency bands
            const bands = 12;
            const bandSize = Math.floor(dataArray.length / bands);
            const levels = [];

            for (let i = 0; i < bands; i++) {
                let sum = 0;
                for (let j = 0; j < bandSize; j++) {
                    sum += dataArray[i * bandSize + j];
                }
                levels.push(Math.min(1, (sum / bandSize) / 128));
            }

            setAudioLevels(levels);
        } else if (state === 'speaking') {
            // Animate while speaking
            setAudioLevels(prev =>
                prev.map(() => 0.2 + Math.random() * 0.6)
            );
        } else {
            // Idle pulse
            setAudioLevels(prev =>
                prev.map((_, i) => 0.1 + Math.sin(Date.now() / 500 + i) * 0.05)
            );
        }

        animationRef.current = requestAnimationFrame(updateAudioLevels);
    }, [state]);

    useEffect(() => {
        animationRef.current = requestAnimationFrame(updateAudioLevels);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [updateAudioLevels]);

    // Handle voice events
    const handleVoiceEvent = useCallback((event: VoiceEvent) => {
        switch (event.type) {
            case 'wake':
                // Wake word detected
                setIsExpanded(true);
                setState('listening');
                setTranscript('');
                setError(null);
                break;

            case 'start':
                setState('listening');
                break;

            case 'result':
                setTranscript(event.transcript || '');
                if (event.isFinal && event.transcript) {
                    processQuery(event.transcript);
                }
                break;

            case 'end':
                if (state === 'listening' && transcript) {
                    processQuery(transcript);
                }
                break;

            case 'error':
                setError(event.error || 'Voice recognition error');
                setState('error');
                break;
        }
    }, [state, transcript]);

    // Process user query
    const processQuery = async (query: string) => {
        if (!query.trim()) return;

        setState('processing');
        setMessages(prev => [...prev, { role: 'user', content: query }]);

        try {
            const token = await authService.getToken();

            const res = await fetch(`${apiBase}/voice/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: query,
                    voice_mode: true
                })
            });

            if (!res.ok) {
                // Fallback to regular chat endpoint
                const fallbackRes = await fetch(`${apiBase}/agent/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    body: JSON.stringify({ message: query })
                });

                if (!fallbackRes.ok) throw new Error('Failed to get response');

                const data = await fallbackRes.json();
                handleResponse(data.content);
                return;
            }

            const data = await res.json();
            handleResponse(data.content || data.message);

        } catch (err: any) {
            console.error('Voice query error:', err);
            setError(err.message || 'Failed to process query');
            setState('error');
        }
    };

    // Handle AI response
    const handleResponse = async (content: string) => {
        setResponse(content);
        setMessages(prev => [...prev, { role: 'assistant', content }]);
        setState('speaking');

        try {
            await voiceService.speak(content);
        } catch (err) {
            console.error('TTS error:', err);
        }

        setState('idle');
        setTranscript('');
    };

    // Activate assistant
    const activate = () => {
        setIsExpanded(true);
        setState('listening');
        setTranscript('');
        setError(null);
        voiceService.startListening(handleVoiceEvent);
    };

    // Deactivate assistant
    const deactivate = () => {
        voiceService.stopListening();
        voiceService.stopSpeaking();
        setIsExpanded(false);
        setState('idle');
        setTranscript('');
        setResponse('');
    };

    // Handle orb click
    const handleOrbClick = () => {
        if (state === 'idle' && !isExpanded) {
            activate();
        } else if (state === 'speaking') {
            voiceService.stopSpeaking();
            setState('idle');
        } else if (state === 'listening') {
            // Stop and process current transcript
            voiceService.stopListening();
            if (transcript) {
                processQuery(transcript);
            }
        }
    };

    // Drag handling
    const handleDragStart = (e: React.MouseEvent) => {
        if (isExpanded) return;
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    const handleDrag = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        const newPos = {
            x: Math.max(0, Math.min(window.innerWidth - 60, e.clientX - dragOffset.current.x)),
            y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y))
        };
        setPosition(newPos);
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            localStorage.setItem('voiceAssistantPosition', JSON.stringify(position));
        }
    }, [isDragging, position]);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('mouseup', handleDragEnd);
        }
        return () => {
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging, handleDrag, handleDragEnd]);

    // Keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + Shift + V
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
                e.preventDefault();
                if (isExpanded) {
                    deactivate();
                } else {
                    activate();
                }
            }
            // Escape to close
            if (e.key === 'Escape' && isExpanded) {
                deactivate();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isExpanded]);

    // Get state-specific styling
    const getStateClass = () => {
        return `voice-assistant ${state} ${isExpanded ? 'expanded' : 'collapsed'}`;
    };

    const getOrbGradient = () => {
        switch (state) {
            case 'listening': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            case 'processing': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
            case 'speaking': return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
            case 'error': return 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)';
            default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    };

    return (
        <>
            {/* Backdrop when expanded */}
            {isExpanded && (
                <div className="voice-backdrop" onClick={deactivate} />
            )}

            {/* Main container */}
            <div
                ref={containerRef}
                className={getStateClass()}
                style={{
                    right: isExpanded ? '50%' : `${position.x}px`,
                    bottom: isExpanded ? '50%' : `${position.y}px`,
                    transform: isExpanded ? 'translate(50%, 50%)' : 'none'
                }}
            >
                {/* Collapsed Orb */}
                {!isExpanded && (
                    <div
                        className="voice-orb"
                        onClick={handleOrbClick}
                        onMouseDown={handleDragStart}
                        style={{ background: getOrbGradient() }}
                    >
                        <div className="orb-icon">
                            {state === 'idle' && '🎤'}
                            {state === 'listening' && '🔊'}
                            {state === 'processing' && '⏳'}
                            {state === 'speaking' && '💬'}
                            {state === 'error' && '⚠️'}
                        </div>
                        <div className="orb-pulse" />
                    </div>
                )}

                {/* Expanded Interface */}
                {isExpanded && (
                    <div className="voice-panel">
                        {/* Header */}
                        <div className="voice-header">
                            <span className="voice-title">Creator Assistant</span>
                            <button className="voice-close" onClick={deactivate}>✕</button>
                        </div>

                        {/* Waveform Visualizer */}
                        <div className="voice-visualizer">
                            <div
                                className="voice-orb-large"
                                onClick={handleOrbClick}
                                style={{ background: getOrbGradient() }}
                            >
                                <div className="waveform">
                                    {audioLevels.map((level, i) => (
                                        <div
                                            key={i}
                                            className="wave-bar"
                                            style={{
                                                height: `${20 + level * 60}%`,
                                                opacity: 0.5 + level * 0.5
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* State indicator */}
                            <div className="state-indicator">
                                {state === 'listening' && 'Listening...'}
                                {state === 'processing' && 'Thinking...'}
                                {state === 'speaking' && 'Speaking...'}
                                {state === 'idle' && 'Tap to speak'}
                                {state === 'error' && error}
                            </div>
                        </div>

                        {/* Transcript */}
                        {transcript && (
                            <div className="voice-transcript">
                                <span className="transcript-label">You:</span>
                                <span className="transcript-text">{transcript}</span>
                            </div>
                        )}

                        {/* Response */}
                        {response && (
                            <div className="voice-response">
                                <span className="response-label">Assistant:</span>
                                <span className="response-text">{response}</span>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="voice-actions">
                            {state === 'idle' && (
                                <button
                                    className="action-btn primary"
                                    onClick={activate}
                                >
                                    🎤 Start Listening
                                </button>
                            )}
                            {state === 'listening' && (
                                <button
                                    className="action-btn"
                                    onClick={() => {
                                        voiceService.stopListening();
                                        if (transcript) processQuery(transcript);
                                    }}
                                >
                                    ✓ Done Speaking
                                </button>
                            )}
                            {state === 'speaking' && (
                                <button
                                    className="action-btn"
                                    onClick={() => {
                                        voiceService.stopSpeaking();
                                        setState('idle');
                                    }}
                                >
                                    ⏹ Stop
                                </button>
                            )}
                            {state === 'error' && (
                                <button
                                    className="action-btn"
                                    onClick={activate}
                                >
                                    🔄 Try Again
                                </button>
                            )}
                        </div>

                        {/* Hint */}
                        <div className="voice-hint">
                            Press <kbd>Esc</kbd> to close • Say "Hey Creator" anytime
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
