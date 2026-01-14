import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface OnboardingProps {
    userId: string;
    onComplete: () => void;
}

export default function Onboarding({ userId, onComplete }: OnboardingProps) {
    const [step, setStep] = useState(1);
    const navigate = useNavigate();

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            onComplete();
            navigate('/', { replace: true });
        }
    };

    return (
        <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6">
            <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                        Welcome, Creator!
                    </h1>
                    <p className="text-gray-400">Let's set up your workspace for {userId}</p>
                </div>

                <div className="space-y-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">1. Connect your accounts</h2>
                            <p className="text-sm text-gray-400">
                                This allows AI to analyze your content performance.
                            </p>
                            {/* Placeholder for connection buttons */}
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center text-sm text-gray-500">
                                Connection steps will be available in Settings.
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">2. Define your niche</h2>
                            <p className="text-sm text-gray-400">
                                This helps AI suggest relevant content ideas.
                            </p>
                            <input
                                type="text"
                                placeholder="e.g. Tech, Lifestyle, Gaming..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">3. Ready to launch?</h2>
                            <p className="text-sm text-gray-400">
                                Your dashboard is ready. Let's start creating!
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleNext}
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all active:scale-[0.98]"
                    >
                        {step === 3 ? "Get Started" : "Next"}
                    </button>

                    <div className="flex justify-center gap-2 mt-6">
                        {[1, 2, 3].map(i => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-indigo-500' : 'bg-white/20'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
