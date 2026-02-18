import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

// Floating particles component
const FloatingParticles = () => {
    const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        size: Math.random() * 4 + 2,
        left: Math.random() * 100,
        delay: Math.random() * 20,
        duration: Math.random() * 20 + 30
    }));

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute rounded-full bg-white/10"
                    style={{
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        left: `${p.left}%`,
                        bottom: '-20px',
                        animation: `float-up ${p.duration}s linear infinite`,
                        animationDelay: `${p.delay}s`,
                    }}
                />
            ))}
        </div>
    );
};

// Stats counter component with emoji
const StatCounter = ({ end, label, suffix = '', emoji }: { end: number; label: string; suffix?: string; emoji: string }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const duration = 2000;
        const increment = end / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(current));
            }
        }, 16);

        return () => clearInterval(timer);
    }, [end]);

    return (
        <div className="text-center group hover:scale-105 transition-transform duration-300">
            <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{emoji}</div>
            <div className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                {count.toLocaleString()}{suffix}
            </div>
            <div className="text-sm text-gray-400 mt-2 font-medium tracking-wide">{label}</div>
        </div>
    );
};

// Floating social media icons
const FloatingSocialIcons = () => {
    const socialIcons = [
        { id: 'instagram', icon: '📷', color: 'from-pink-500 to-purple-500', delay: 0, x: 15, duration: 25 },
        { id: 'facebook', icon: '👍', color: 'from-blue-600 to-blue-400', delay: 3, x: 25, duration: 28 },
        { id: 'linkedin', icon: '💼', color: 'from-blue-500 to-cyan-500', delay: 6, x: 75, duration: 30 },
        { id: 'whatsapp', icon: '💬', color: 'from-green-500 to-emerald-400', delay: 9, x: 85, duration: 26 },
        { id: 'twitter', icon: '🐦', color: 'from-sky-500 to-blue-400', delay: 12, x: 45, duration: 27 },
        { id: 'youtube', icon: '▶️', color: 'from-red-500 to-pink-500', delay: 15, x: 60, duration: 29 },
    ];

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[2]">
            {socialIcons.map((social) => (
                <div
                    key={social.id}
                    className="absolute text-3xl opacity-60 hover:opacity-80 transition-opacity"
                    style={{
                        left: `${social.x}%`,
                        bottom: '-50px',
                        animation: `float-up ${social.duration}s ease-in-out infinite`,
                        animationDelay: `${social.delay}s`,
                        filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))',
                    }}
                >
                    {social.icon}
                </div>
            ))}
        </div>
    );
};

// Floating glowing orbs behind the card
const FloatingOrbs = () => {
    const orbs = [
        { id: 1, color: 'bg-purple-500', size: 120, x: 20, y: 30, delay: 0, duration: 8 },
        { id: 2, color: 'bg-blue-500', size: 150, x: 70, y: 60, delay: 2, duration: 10 },
        { id: 3, color: 'bg-pink-500', size: 100, x: 50, y: 20, delay: 4, duration: 9 },
        { id: 4, color: 'bg-cyan-500', size: 130, x: 80, y: 40, delay: 1, duration: 7 },
    ];

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
            {orbs.map((orb) => (
                <div
                    key={orb.id}
                    className={`absolute rounded-full ${orb.color} opacity-20 blur-3xl`}
                    style={{
                        width: `${orb.size}px`,
                        height: `${orb.size}px`,
                        left: `${orb.x}%`,
                        top: `${orb.y}%`,
                        animation: `float-orb ${orb.duration}s ease-in-out infinite`,
                        animationDelay: `${orb.delay}s`,
                    }}
                />
            ))}
        </div>
    );
};

export default function LoginPage({ onLoginSuccess }: { onLoginSuccess: () => void }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeFeature, setActiveFeature] = useState(0);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [nameFocused, setNameFocused] = useState(false);
    const { login } = useAuth();

    const features = [
        {
            title: "AI-Powered Strategy",
            desc: "Generate viral content ideas tailored to your niche in seconds.",
            icon: "✨",
            gradient: "from-purple-500 to-pink-500"
        },
        {
            title: "Multi-Platform Analytics",
            desc: "Track meaningful growth across all your social channels in one place.",
            icon: "📊",
            gradient: "from-blue-500 to-cyan-500"
        },
        {
            title: "Smart Scheduling",
            desc: "Automate your posting schedule for maximum engagement impact.",
            icon: "📅",
            gradient: "from-orange-500 to-red-500"
        }
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveFeature((prev) => (prev + 1) % features.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [features.length]);

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
        <div className="min-h-screen bg-[#030712] flex overflow-hidden relative selection:bg-purple-500/30">
            {/* Animated Mesh Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/10 to-cyan-900/20" style={{
                    backgroundImage: `
                        radial-gradient(at 20% 30%, hsla(280, 80%, 60%, 0.15) 0px, transparent 50%),
                        radial-gradient(at 80% 0%, hsla(240, 80%, 60%, 0.12) 0px, transparent 50%),
                        radial-gradient(at 40% 80%, hsla(200, 80%, 60%, 0.1) 0px, transparent 50%),
                        radial-gradient(at 90% 70%, hsla(320, 80%, 60%, 0.12) 0px, transparent 50%)
                    `,
                    animation: 'mesh-shift 15s ease-in-out infinite'
                }}></div>
                <div className="noise-overlay opacity-[0.03]"></div>
            </div>

            <FloatingParticles />
            <FloatingSocialIcons />

            {/* Left Panel - Feature Showcase */}
            <div className="hidden lg:flex lg:w-1/2 relative z-10 flex-col p-12 justify-between border-r border-white/5 bg-black/20 backdrop-blur-md">
                <div>
                    <div className="inline-flex items-center gap-4 px-7 py-3.5 rounded-full bg-gradient-to-r from-white/10 to-white/5 border border-white/20 mb-12 hover:bg-white/15 hover:border-purple-500/30 transition-all duration-300 shadow-lg">
                        <img src="/influencer-os-logo.png" alt="Influencer-OS" className="w-12 h-12" />
                        <span className="text-lg font-bold tracking-wider text-white/90 uppercase">Influencer-OS v1.0</span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-8 mb-14">
                        <StatCounter end={10000} label="Active Creators" suffix="+" emoji="👥" />
                        <StatCounter end={95} label="Success Rate" suffix="%" emoji="⭐" />
                        <StatCounter end={50} label="Countries" suffix="+" emoji="🌍" />
                    </div>

                    {/* Supported Platforms */}
                    <div className="mb-12">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 text-center">Supported Platforms</h3>
                        <div className="flex items-center justify-center gap-4 flex-wrap">
                            {/* Instagram */}
                            <div className="group relative">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-300 cursor-pointer">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </div>
                            </div>
                            {/* Facebook */}
                            <div className="group relative">
                                <div className="w-12 h-12 rounded-xl bg-[#1877F2] flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-300 cursor-pointer">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                </div>
                            </div>
                            {/* LinkedIn */}
                            <div className="group relative">
                                <div className="w-12 h-12 rounded-xl bg-[#0A66C2] flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-300 cursor-pointer">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                </div>
                            </div>
                            {/* WhatsApp */}
                            <div className="group relative">
                                <div className="w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-300 cursor-pointer">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                </div>
                            </div>
                            {/* Twitter/X */}
                            <div className="group relative">
                                <div className="w-12 h-12 rounded-xl bg-[#1DA1F2] flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-300 cursor-pointer">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
                                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                    </svg>
                                </div>
                            </div>
                            {/* YouTube */}
                            <div className="group relative">
                                <div className="w-12 h-12 rounded-xl bg-[#FF0000] flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-300 cursor-pointer">
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative max-w-lg">
                    {features.map((feature, idx) => (
                        <div
                            key={idx}
                            className={`transition-all duration-1000 absolute bottom-0 left-0 w-full ${idx === activeFeature ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-8 blur-sm pointer-events-none'
                                }`}
                        >
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} bg-opacity-20 border border-white/10 flex items-center justify-center text-3xl mb-6 shadow-2xl backdrop-blur`}>
                                {feature.icon}
                            </div>
                            <h2 className="text-5xl font-extrabold text-white mb-5 leading-tight tracking-tight" style={{ textShadow: '0 0 30px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.2)' }}>
                                {feature.title}
                            </h2>
                            <p className="text-xl text-gray-300 leading-relaxed font-light">
                                {feature.desc}
                            </p>
                        </div>
                    ))}
                    <div className="opacity-0 pointer-events-none">
                        <div className="w-16 h-16 mb-6"></div>
                        <h2 className="text-5xl font-bold mb-4">Placeholder</h2>
                        <p className="text-lg">Placeholder text for height.</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {features.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveFeature(idx)}
                            className={`h-1.5 rounded-full transition-all duration-500 ${idx === activeFeature
                                ? 'w-12 bg-gradient-to-r from-purple-500 to-blue-500'
                                : 'w-2 bg-white/20 hover:bg-white/40'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Right Panel - Auth Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-[440px]">

                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center mb-8 gap-5">
                        <img src="/influencer-os-logo.png" alt="Influencer-OS" className="w-20 h-20" />
                        <h1 className="text-5xl font-bold text-white">Influencer-OS</h1>
                    </div>

                    {/* Main Card with Enhanced Glassmorphism */}
                    <div className="relative">
                        {/* Floating orbs behind the card */}
                        <FloatingOrbs />

                        <div
                            className="relative bg-black/20 border border-white/10 rounded-3xl p-10 shadow-2xl overflow-hidden group backdrop-blur-2xl hover:border-purple-500/30 transition-all duration-500 hover:shadow-purple-500/30 hover:shadow-2xl"
                            style={{
                                transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
                                transition: 'transform 0.3s ease',
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
                            }}
                        >
                            {/* Animated gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            {/* Shimmer Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"></div>

                            <div className="relative z-10">
                                <div className="text-center mb-10">
                                    <h2 className="text-4xl font-extrabold text-white mb-3 tracking-tight" style={{ textShadow: '0 0 40px rgba(168, 85, 247, 0.5), 0 0 80px rgba(59, 130, 246, 0.3)' }}>
                                        {isLogin ? '👋 Welcome back' : '🚀 Start creating'}
                                    </h2>
                                    <p className="text-sm text-gray-400">
                                        {isLogin ? 'Enter your details to access your command center' : 'Join thousands of successful creators today'}
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {!isLogin && (
                                        <div className="relative">
                                            <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${nameFocused || fullName ? 'top-2 text-xs text-purple-400' : 'top-4 text-sm text-gray-500'
                                                }`}>
                                                <span className="flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    Full Name
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                onFocus={() => setNameFocused(true)}
                                                onBlur={() => setNameFocused(false)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pt-8 pb-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-gray-600"
                                                autoComplete="name"
                                            />
                                        </div>
                                    )}

                                    <div className="relative">
                                        <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${emailFocused || email ? 'top-2 text-xs text-purple-400' : 'top-4 text-sm text-gray-500'
                                            }`}>
                                            <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                                </svg>
                                                Email Address
                                            </span>
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onFocus={() => setEmailFocused(true)}
                                            onBlur={() => setEmailFocused(false)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pt-8 pb-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-gray-600"
                                            autoComplete="email"
                                        />
                                    </div>

                                    <div className="relative">
                                        <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${passwordFocused || password ? 'top-2 text-xs text-purple-400' : 'top-4 text-sm text-gray-500'
                                            }`}>
                                            <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                                Password
                                            </span>
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setPasswordFocused(true)}
                                            onBlur={() => setPasswordFocused(false)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pt-8 pb-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-gray-600"
                                            autoComplete={isLogin ? "current-password" : "new-password"}
                                        />
                                    </div>

                                    {error && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="text-sm text-red-400 font-medium">{error}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full relative group/btn bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-4 rounded-xl transition-all transform active:scale-[0.98] shadow-lg shadow-purple-900/30 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700"></div>
                                        <span className="relative flex items-center justify-center gap-2">
                                            {loading ? (
                                                <>
                                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <span>Processing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                                                    <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                </>
                                            )}
                                        </span>
                                    </button>
                                </form>

                                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                                    <p className="text-sm text-gray-400">
                                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                                        <button
                                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                                            className="ml-2 text-white hover:text-purple-400 font-semibold transition-colors focus:outline-none underline decoration-purple-500/50 hover:decoration-purple-400"
                                        >
                                            {isLogin ? 'Sign up free' : 'Sign in'}
                                        </button>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trust Badges */}
                    <div className="mt-10 flex justify-center items-center gap-8 opacity-40 hover:opacity-70 transition-all duration-500">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs text-gray-500">Secure</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                            </svg>
                            <span className="text-xs text-gray-500">GDPR Compliant</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs text-gray-500">SOC 2 Certified</span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 text-center mt-6">
                        &copy; 2024 Influencer-OS. Empowering influencers worldwide.
                    </p>
                </div>
            </div>
        </div>
    );
}
