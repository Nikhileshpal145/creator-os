import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Brain, X } from 'lucide-react';
import './QueryChat.css';

const API_BASE = 'http://localhost:8000/api/v1';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function QueryChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const sendMessage = async (query: string) => {
        if (!query.trim() || loading) return;

        const userMessage: Message = { id: Date.now().toString(), role: 'user', content: query };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // New endpoint requires 'message' instead of 'query'
            const res = await axios.post(`${API_BASE}/agent/chat`, {
                message: query,
                // Include empty context if needed by backend model
                page_context: {},
                conversation_id: "user_chat_" + Date.now()
            });

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                // New response uses 'content' instead of 'response'
                content: res.data.content,
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I couldn't process that query.",
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-5 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl shadow-2xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300 z-50 group"
                title="Ask AI Agent"
            >
                <Brain size={28} className="relative z-10" />
                <span className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl animate-ping opacity-30" />
                <span className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 bg-emerald-500 rounded-full text-[10px] font-bold shadow-lg shadow-emerald-500/30">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    AI
                </span>
            </button>
        );
    }

    return (
        <div className="query-chat-container open">
            <div className="chat-header">
                <h3>Ask AI</h3>
                <button onClick={() => setIsOpen(false)} className="close-button">
                    <X size={20} />
                </button>
            </div>
            <div className="messages-container">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.role}-message`}>
                        {msg.content}
                    </div>
                ))}
                {loading && <div className="message assistant-message">...</div>}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="input-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    disabled={loading}
                />
                <button type="submit" disabled={loading} className="button">Send</button>
            </form>
        </div>
    );
}
