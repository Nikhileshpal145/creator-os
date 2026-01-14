/**
 * Voice Overlay Content Script
 * 
 * Injects the Voice Assistant into all web pages as a floating overlay.
 * Uses Shadow DOM for style isolation.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import VoiceAssistant from './components/VoiceAssistant';

// Styles to inject into shadow DOM
import voiceStyles from './components/VoiceAssistant.css?inline';

class VoiceOverlay {
    private container: HTMLDivElement | null = null;
    private shadowRoot: ShadowRoot | null = null;
    private root: ReturnType<typeof createRoot> | null = null;
    private isInjected: boolean = false;

    constructor() {
        this.init();
    }

    private init() {
        // Wait for DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.inject());
        } else {
            this.inject();
        }

        // Listen for keyboard shortcut even before injection
        this.setupKeyboardShortcut();
    }

    private inject() {
        if (this.isInjected) return;

        // Create container
        this.container = document.createElement('div');
        this.container.id = 'influencer-os-voice-assistant';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0;
            height: 0;
            z-index: 2147483647;
            pointer-events: none;
        `;

        // Create shadow DOM for style isolation
        this.shadowRoot = this.container.attachShadow({ mode: 'open' });

        // Inject styles
        const styleElement = document.createElement('style');
        styleElement.textContent = voiceStyles;
        this.shadowRoot.appendChild(styleElement);

        // Create React mount point
        const mountPoint = document.createElement('div');
        mountPoint.id = 'voice-assistant-root';
        mountPoint.style.pointerEvents = 'auto';
        this.shadowRoot.appendChild(mountPoint);

        // Append to body
        document.body.appendChild(this.container);

        // Mount React component
        this.root = createRoot(mountPoint);
        this.root.render(
            React.createElement(VoiceAssistant, {
                onClose: () => this.minimize(),
                apiBase: 'http://localhost:8000/api/v1'
            })
        );

        this.isInjected = true;
        console.log('🎤 Influencer OS Voice Assistant injected');
    }

    private setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + Shift + V to toggle
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    private toggle() {
        if (!this.isInjected) {
            this.inject();
        }
        // The VoiceAssistant component handles its own toggle state
        // This just ensures it's injected
    }

    private minimize() {
        // Component handles its own minimization
    }

    public destroy() {
        if (this.root) {
            this.root.unmount();
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.isInjected = false;
    }
}

// Initialize the overlay
const voiceOverlay = new VoiceOverlay();

// Expose for debugging
(window as any).__creatorOSVoice = voiceOverlay;

export default voiceOverlay;
