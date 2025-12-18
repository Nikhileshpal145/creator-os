import { useState } from 'react';
import axios from 'axios';
import { Target, ArrowRight, CheckCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1';

import { useAuth } from './AuthContext';

export default function Onboarding({ onComplete }: { userId: string; onComplete: () => void }) {
    const [step, setStep] = useState(1);
    const [niche, setNiche] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [loading, setLoading] = useState(false);
    const { token, login } = useAuth();

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Update user profile via API
            await axios.put(`${API_BASE}/user/profile`, {
                business_name: businessName,
                niche: niche
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Refresh user context to get updated fields
            if (token) await login(token);

            onComplete();
        } catch (error) {
            console.error("Failed to update profile", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 md:p-12 relative overflow-hidden">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>

                    <div className="mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                            {step === 1 ? "Let's calibrate your Agent" :
                                step === 2 ? "Define your Strategy" :
                                    "System Optimized"}
                        </h1>
                        <p className="text-gray-400">
                            {step === 1 ? "I need to understand your business to provide relevant insights." :
                                step === 2 ? "What content niche are you dominating?" :
                                    "Your personal command center is ready."}
                        </p>
                    </div>

                    <div className="space-y-6">
                        {step === 1 && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-300">Business / Creator Name</label>
                                    <div className="flex items-center gap-3 bg-gray-800/50 border border-gray-700 p-4 rounded-xl focus-within:border-indigo-500 transition">
                                        <Target className="text-gray-500" size={20} />
                                        <input
                                            type="text"
                                            value={businessName}
                                            onChange={(e) => setBusinessName(e.target.value)}
                                            placeholder="e.g. Apex Tech Reviews"
                                            className="bg-transparent border-none outline-none text-white w-full placeholder-gray-600"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={!businessName}
                                    className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    Continue <ArrowRight size={18} />
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="grid grid-cols-2 gap-3">
                                    {['Tech & Coding', 'Lifestyle', 'Education', 'Entertainment', 'Business', 'Gaming'].map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setNiche(opt)}
                                            className={`p-4 rounded-xl border text-left transition ${niche === opt
                                                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                                : 'bg-gray-800/30 border-gray-700 text-gray-400 hover:border-gray-600'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={!niche}
                                    className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    Finalize Setup <ArrowRight size={18} />
                                </button>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="text-center py-8 animate-fade-in">
                                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="text-green-500" size={40} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Configuration Complete</h3>
                                <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                                    I have calibrated the analytics engine for <strong>{businessName}</strong> in the <strong>{niche}</strong> sector.
                                </p>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
                                >
                                    {loading ? 'Initializing...' : 'Enter Command Center'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
