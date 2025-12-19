import { useState, useRef, useEffect, useCallback } from 'react';
import { voiceService, SUPPORTED_LANGUAGES } from '../services/VoiceService';
import type { VoiceEvent, LanguageCode } from '../services/VoiceService';
import { authService } from '../services/AuthService';
import './AgentChat.css';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
}

interface PageContext {
    url: string;
    title: string;
    platform?: string;
    visible_metrics?: Record<string, any>;
}

const API_BASE = 'http://localhost:8000/api/v1/agent';

export default function AgentChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [pageContext, setPageContext] = useState<PageContext | null>(null);

    // Voice state
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en-US');
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load suggested questions on mount
    useEffect(() => {
        fetchSuggestedQuestions();
        injectPageContext();

        // Configure voice service
        voiceService.setConfig({
            language: currentLanguage,
            continuous: true,
            wakeWord: 'hey creator'
        });
    }, []);

    // Update voice language when changed
    useEffect(() => {
        voiceService.setConfig({ language: currentLanguage });
    }, [currentLanguage]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const injectPageContext = async () => {
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                const tab = tabs[0];
                if (tab?.url) {
                    const platform = detectPlatform(tab.url);
                    setPageContext({
                        url: tab.url,
                        title: tab.title || '',
                        platform
                    });
                    if (platform) {
                        fetchSuggestedQuestions(platform);
                    }
                }
            });
        } catch (e) {
            console.log('Could not get page context:', e);
        }
    };

    const detectPlatform = (url: string): string | undefined => {
        if (url.includes('youtube.com') || url.includes('studio.youtube.com')) return 'youtube';
        if (url.includes('instagram.com')) return 'instagram';
        if (url.includes('linkedin.com')) return 'linkedin';
        if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
        return undefined;
    };

    const fetchSuggestedQuestions = async (platform?: string) => {
        try {
            const url = platform
                ? `${API_BASE}/suggested-questions?platform=${platform}`
                : `${API_BASE}/suggested-questions`;
            const res = await fetch(url);
            const data = await res.json();
            setSuggestedQuestions(data.suggested_questions || []);
        } catch (e) {
            setSuggestedQuestions([
                "How am I performing overall?",
                "What content works best?",
                "When should I post?"
            ]);
        }
    };

    const sendMessage = async (content: string, speakResponse: boolean = false) => {
        if (!content.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: content.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setInterimTranscript('');
        setIsLoading(true);

        const placeholderId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, {
            id: placeholderId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true
        }]);

        try {
            const token = await authService.getToken();
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: content.trim(),
                    conversation_id: conversationId,
                    page_context: pageContext
                })
            });

            if (!response.ok) throw new Error('Failed to get response');

            const data = await response.json();

            if (data.conversation_id) {
                setConversationId(data.conversation_id);
            }

            setMessages(prev => prev.map(msg =>
                msg.id === placeholderId
                    ? { ...msg, content: data.content, isStreaming: false }
                    : msg
            ));

            // Speak response if in voice mode
            if (speakResponse || isVoiceMode) {
                speakText(data.content);
            }

        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = 'Sorry, I encountered an error. Please try again.';
            setMessages(prev => prev.map(msg =>
                msg.id === placeholderId
                    ? { ...msg, content: errorMessage, isStreaming: false }
                    : msg
            ));
            if (speakResponse || isVoiceMode) {
                speakText(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Voice functions
    const handleVoiceEvent = useCallback((event: VoiceEvent) => {
        switch (event.type) {
            case 'start':
                setIsListening(true);
                break;
            case 'end':
                setIsListening(false);
                break;
            case 'result':
                if (event.isFinal && event.transcript) {
                    setInterimTranscript('');
                    sendMessage(event.transcript, true);
                } else if (event.transcript) {
                    setInterimTranscript(event.transcript);
                }
                break;
            case 'wake':
                // Wake word detected
                setIsListening(true);
                break;
            case 'error':
                console.error('Voice error:', event.error);
                setIsListening(false);
                break;
        }
    }, []);

    const toggleVoiceMode = () => {
        if (isVoiceMode) {
            voiceService.stopListening();
            voiceService.stopSpeaking();
            setIsVoiceMode(false);
            setIsListening(false);
        } else {
            setIsVoiceMode(true);
            voiceService.startListening(handleVoiceEvent);
        }
    };

    const startVoiceInput = () => {
        if (isListening) {
            voiceService.stopListening();
        } else {
            voiceService.startListening(handleVoiceEvent);
        }
    };

    const speakText = async (text: string) => {
        setIsSpeaking(true);
        try {
            // Clean up markdown for speech
            const cleanText = text
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/^- /gm, '')
                .replace(/\n/g, '. ');

            await voiceService.speak(cleanText, currentLanguage);
        } catch (e) {
            console.error('Speech error:', e);
        } finally {
            setIsSpeaking(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const handleQuestionClick = (question: string) => {
        sendMessage(question);
    };

    const startNewConversation = () => {
        setMessages([]);
        setConversationId(null);
    };

    return (
        <div className="agent-container">
            {/* Header */}
            <header className="agent-header">
                <div className="header-left">
                    <div className="agent-avatar">
                        <span className="avatar-icon">🤖</span>
                        <span className={`status-dot ${isListening ? 'listening' : 'online'}`}></span>
                    </div>
                    <div className="header-text">
                        <h1>Creator OS</h1>
                        <span className="header-subtitle">
                            {isListening ? '🎤 Listening...' :
                                isSpeaking ? '🔊 Speaking...' :
                                    pageContext?.platform
                                        ? `Analyzing ${pageContext.platform.charAt(0).toUpperCase() + pageContext.platform.slice(1)}`
                                        : 'Your AI Growth Strategist'
                            }
                        </span>
                    </div>
                </div>
                <div className="header-actions">
                    {/* Language Selector */}
                    <div className="language-selector-container">
                        <button
                            className={`icon-btn ${showLanguageSelector ? 'active' : ''}`}
                            onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                            title="Language"
                        >
                            {SUPPORTED_LANGUAGES[currentLanguage]?.flag || '🌐'}
                        </button>
                        {showLanguageSelector && (
                            <div className="language-dropdown">
                                {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                                    <button
                                        key={code}
                                        className={`language-option ${code === currentLanguage ? 'active' : ''}`}
                                        onClick={() => {
                                            setCurrentLanguage(code as LanguageCode);
                                            setShowLanguageSelector(false);
                                        }}
                                    >
                                        <span>{lang.flag}</span>
                                        <span>{lang.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Voice Mode Toggle */}
                    <button
                        className={`icon-btn ${isVoiceMode ? 'voice-active' : ''}`}
                        onClick={toggleVoiceMode}
                        title={isVoiceMode ? 'Exit voice mode' : 'Enter voice mode'}
                    >
                        {isVoiceMode ? '🎙️' : '🔇'}
                    </button>

                    <button
                        className="icon-btn"
                        onClick={startNewConversation}
                        title="New conversation"
                    >
                        ✨
                    </button>
                </div>
            </header>

            {/* Voice Mode Indicator */}
            {isVoiceMode && (
                <div className={`voice-indicator ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
                    <div className="voice-waves">
                        <span></span><span></span><span></span><span></span><span></span>
                    </div>
                    <span className="voice-status">
                        {isListening ? 'Listening... Say "Hey Creator" or speak' :
                            isSpeaking ? 'Speaking...' : 'Voice mode active'}
                    </span>
                </div>
            )}

            {/* Interim transcript */}
            {interimTranscript && (
                <div className="interim-transcript">
                    <span className="interim-icon">🎤</span>
                    <span>{interimTranscript}</span>
                </div>
            )}

            {/* Messages */}
            <div className="messages-container">
                {messages.length === 0 ? (
                    <div className="welcome-state">
                        <div className="welcome-icon">🚀</div>
                        <h2>Welcome to Creator OS</h2>
                        <p>
                            {isVoiceMode
                                ? 'Voice mode is active! Just speak to chat with me.'
                                : 'I\'m your AI-powered growth strategist. Ask me anything about your content performance.'}
                        </p>

                        <div className="suggested-questions">
                            {suggestedQuestions.slice(0, 4).map((q, i) => (
                                <button
                                    key={i}
                                    className="suggestion-btn"
                                    onClick={() => handleQuestionClick(q)}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`message ${msg.role}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="message-avatar">🤖</div>
                                )}
                                <div className="message-content">
                                    {msg.isStreaming ? (
                                        <div className="typing-indicator">
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                            <span className="typing-dot"></span>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                className="message-text"
                                                dangerouslySetInnerHTML={{
                                                    __html: formatMessage(msg.content)
                                                }}
                                            />
                                            {msg.role === 'assistant' && !isSpeaking && (
                                                <button
                                                    className="speak-btn"
                                                    onClick={() => speakText(msg.content)}
                                                    title="Read aloud"
                                                >
                                                    🔊
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {messages.length > 0 &&
                            messages[messages.length - 1].role === 'assistant' &&
                            !messages[messages.length - 1].isStreaming && (
                                <div className="quick-actions">
                                    <button onClick={() => sendMessage("Tell me more")}>
                                        🔍 More details
                                    </button>
                                    <button onClick={() => sendMessage("What should I do about this?")}>
                                        ✅ Actions
                                    </button>
                                    <button onClick={() => sendMessage("Show me the data")}>
                                        📊 Data
                                    </button>
                                </div>
                            )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="input-container">
                <div className="input-wrapper">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isVoiceMode ? "Or type here..." : "Ask anything about your content..."}
                        rows={1}
                        disabled={isLoading}
                    />
                    <div className="input-actions">
                        <button
                            className={`icon-btn voice-btn ${isListening ? 'recording' : ''}`}
                            onClick={startVoiceInput}
                            title={isListening ? 'Stop listening' : 'Voice input'}
                        >
                            {isListening ? '⏹️' : '🎤'}
                        </button>
                        <button
                            className="send-btn"
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || isLoading}
                        >
                            {isLoading ? (
                                <span className="loading-spinner"></span>
                            ) : (
                                '→'
                            )}
                        </button>
                    </div>
                </div>
                <div className="input-hint">
                    {isVoiceMode
                        ? `Speaking in ${SUPPORTED_LANGUAGES[currentLanguage]?.name || 'English'} • Say "Hey Creator" to activate`
                        : 'Press Enter to send • Shift+Enter for new line'}
                </div>
            </div>
        </div>
    );
}

// Format markdown-like content
function formatMessage(content: string): string {
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
        .replace(/\n/g, '<br>');
}
