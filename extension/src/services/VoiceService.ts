/**
 * VoiceService - Multi-language voice input/output
 * Handles speech recognition and text-to-speech
 */

export interface VoiceConfig {
    language: string;
    continuous: boolean;
    wakeWord: string;
    voiceSpeed: number;
    voicePitch: number;
}

export interface VoiceEvent {
    type: 'start' | 'end' | 'result' | 'error' | 'wake';
    transcript?: string;
    isFinal?: boolean;
    error?: string;
}

// Supported languages with their codes
export const SUPPORTED_LANGUAGES = {
    'en-US': { name: 'English (US)', flag: '🇺🇸' },
    'en-GB': { name: 'English (UK)', flag: '🇬🇧' },
    'hi-IN': { name: 'Hindi', flag: '🇮🇳' },
    'es-ES': { name: 'Spanish', flag: '🇪🇸' },
    'fr-FR': { name: 'French', flag: '🇫🇷' },
    'de-DE': { name: 'German', flag: '🇩🇪' },
    'ja-JP': { name: 'Japanese', flag: '🇯🇵' },
    'ko-KR': { name: 'Korean', flag: '🇰🇷' },
    'zh-CN': { name: 'Chinese', flag: '🇨🇳' },
    'pt-BR': { name: 'Portuguese', flag: '🇧🇷' },
    'ar-SA': { name: 'Arabic', flag: '🇸🇦' },
    'ru-RU': { name: 'Russian', flag: '🇷🇺' },
    'it-IT': { name: 'Italian', flag: '🇮🇹' },
    'nl-NL': { name: 'Dutch', flag: '🇳🇱' },
    'ta-IN': { name: 'Tamil', flag: '🇮🇳' },
    'te-IN': { name: 'Telugu', flag: '🇮🇳' },
    'bn-IN': { name: 'Bengali', flag: '🇮🇳' },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

class VoiceService {
    private recognition: any = null;
    private synthesis: SpeechSynthesis;
    private isListening: boolean = false;
    private config: VoiceConfig;
    private onEvent: ((event: VoiceEvent) => void) | null = null;
    private wakeWordActive: boolean = false;

    constructor() {
        this.synthesis = window.speechSynthesis;
        this.config = {
            language: 'en-US',
            continuous: false,
            wakeWord: 'hey creator',
            voiceSpeed: 1.0,
            voicePitch: 1.0,
        };
    }

    /**
     * Initialize speech recognition
     */
    private initRecognition(): boolean {
        // @ts-ignore - Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.error('Speech recognition not supported');
            return false;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = this.config.language;
        this.recognition.continuous = this.config.continuous;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.onEvent?.({ type: 'start' });
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.onEvent?.({ type: 'end' });

            // Restart if continuous mode
            if (this.config.continuous && this.wakeWordActive) {
                setTimeout(() => this.startListening(), 100);
            }
        };

        this.recognition.onresult = (event: any) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript.toLowerCase().trim();
            const isFinal = result.isFinal;

            // Check for wake word
            if (this.config.wakeWord && transcript.includes(this.config.wakeWord)) {
                this.onEvent?.({ type: 'wake' });
                this.wakeWordActive = true;

                // Remove wake word from transcript
                const cleanTranscript = transcript.replace(this.config.wakeWord, '').trim();
                if (cleanTranscript) {
                    this.onEvent?.({
                        type: 'result',
                        transcript: cleanTranscript,
                        isFinal
                    });
                }
                return;
            }

            this.onEvent?.({ type: 'result', transcript, isFinal });
        };

        this.recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            this.onEvent?.({ type: 'error', error: event.error });
        };

        return true;
    }

    /**
     * Start listening for voice input
     */
    startListening(onEvent?: (event: VoiceEvent) => void): boolean {
        if (onEvent) {
            this.onEvent = onEvent;
        }

        if (!this.recognition) {
            if (!this.initRecognition()) {
                return false;
            }
        }

        try {
            this.recognition?.start();
            return true;
        } catch (e) {
            console.error('Failed to start recognition:', e);
            return false;
        }
    }

    /**
     * Stop listening
     */
    stopListening(): void {
        this.wakeWordActive = false;
        this.recognition?.stop();
        this.isListening = false;
    }

    /**
     * Speak text using text-to-speech
     */
    speak(text: string, language?: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Cancel any ongoing speech
            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = language || this.config.language;
            utterance.rate = this.config.voiceSpeed;
            utterance.pitch = this.config.voicePitch;

            // Try to find a good voice for the language
            const voices = this.synthesis.getVoices();
            const langCode = (language || this.config.language).split('-')[0];
            const voice = voices.find(v => v.lang.startsWith(langCode)) || voices[0];

            if (voice) {
                utterance.voice = voice;
            }

            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(e);

            this.synthesis.speak(utterance);
        });
    }

    /**
     * Stop speaking
     */
    stopSpeaking(): void {
        this.synthesis.cancel();
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<VoiceConfig>): void {
        this.config = { ...this.config, ...config };

        if (this.recognition && config.language) {
            this.recognition.lang = config.language;
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): VoiceConfig {
        return { ...this.config };
    }

    /**
     * Check if currently listening
     */
    getIsListening(): boolean {
        return this.isListening;
    }

    /**
     * Get available voices for a language
     */
    getVoicesForLanguage(language: string): SpeechSynthesisVoice[] {
        const voices = this.synthesis.getVoices();
        const langCode = language.split('-')[0];
        return voices.filter(v => v.lang.startsWith(langCode));
    }

    /**
     * Check if speech recognition is supported
     */
    static isSupported(): boolean {
        // @ts-ignore
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    /**
     * Check if speech synthesis is supported
     */
    static isSynthesisSupported(): boolean {
        return 'speechSynthesis' in window;
    }
}

// Export singleton instance
export const voiceService = new VoiceService();
export default VoiceService;
