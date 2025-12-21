import React from 'react';

interface DashboardHeaderProps {
    user: {
        full_name: string;
        tier: string;
    } | null;
    status: string;
    onRefresh: () => void;
    onVoice: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    user, status, onRefresh, onVoice
}) => {
    return (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-enter">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <span className="text-4xl filter drop-shadow-md animate-bounce-slow">🚀</span>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0a0a14]"></div>
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        {user ? `${user.full_name}'s Hub` : 'Creator Command Center'}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        {user && (
                            <span className={`badge badge-pro`}>
                                {user.tier} MEMBER
                            </span>
                        )}
                        <span className="text-xs text-text-secondary flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${status === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {status}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={onRefresh} className="btn btn-ghost">
                    🔄 Refresh
                </button>
                <button onClick={onVoice} className="btn btn-primary">
                    🎙️ Voice Mode
                </button>
            </div>
        </header>
    );
};
