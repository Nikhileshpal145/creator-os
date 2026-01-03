import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans text-white">
                    <div className="max-w-md w-full bg-gray-900/50 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 shadow-2xl">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-4 bg-red-500/10 rounded-full">
                                <AlertTriangle size={48} className="text-red-500" />
                            </div>

                            <h1 className="text-2xl font-bold text-white">Something went wrong</h1>

                            <p className="text-gray-400 text-sm">
                                The application encountered an unexpected error. We've logged this issue and are working to fix it.
                            </p>

                            {this.state.error && (
                                <div className="w-full p-4 bg-black/30 rounded-xl text-left overflow-auto max-h-48 border border-gray-800">
                                    <p className="text-red-400 font-mono text-xs break-all">
                                        {this.state.error.toString()}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => window.location.reload()}
                                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-600/20 mt-4"
                            >
                                <RefreshCw size={18} />
                                <span>Reload Application</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
