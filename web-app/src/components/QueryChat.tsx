import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (query: string) => {
        if (!query.trim() || loading) return;

        const userMessage: Message = { id: Date.now().toString(), role: 'user', content: query };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post(`${API_BASE}/query/ask`, { query });
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: res.data.response,
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

    return (
        <div className="query-chat-container">
            <div className="messages-container">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.role}-message`}>
                        {msg.content}
                    </div>
                ))}
                {loading && <div className="message assistant-message">...</div>}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="input-form">
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
