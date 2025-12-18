/**
 * AutomationService - Browser automation controller
 * Handles clicking, scrolling, typing, and navigation
 */

export interface AutomationAction {
    id: string;
    type: 'click' | 'type' | 'scroll' | 'navigate' | 'wait' | 'screenshot';
    target?: string;
    value?: string;
    direction?: 'up' | 'down' | 'left' | 'right';
    amount?: number;
    url?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    error?: string;
}

export interface AutomationProgress {
    currentAction: number;
    totalActions: number;
    currentActionDescription: string;
    status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
    actions: AutomationAction[];
}

export type ProgressCallback = (progress: AutomationProgress) => void;

// Allowed domains for automation (security whitelist)
const ALLOWED_DOMAINS = [
    'studio.youtube.com',
    'youtube.com',
    'www.youtube.com',
    'instagram.com',
    'www.instagram.com',
    'linkedin.com',
    'www.linkedin.com',
    'twitter.com',
    'x.com',
];

// Sensitive actions that require confirmation
const SENSITIVE_PATTERNS = [
    'login', 'sign in', 'password', 'payment', 'pay', 'checkout',
    'delete', 'remove', 'unsubscribe', 'submit', 'confirm'
];

class AutomationService {
    private isRunning: boolean = false;
    private isPaused: boolean = false;
    private currentProgress: AutomationProgress;
    private onProgress: ProgressCallback | null = null;
    private abortController: AbortController | null = null;

    constructor() {
        this.currentProgress = {
            currentAction: 0,
            totalActions: 0,
            currentActionDescription: '',
            status: 'idle',
            actions: []
        };
    }

    /**
     * Check if current domain is allowed
     */
    private isAllowedDomain(): boolean {
        const hostname = window.location.hostname;
        return ALLOWED_DOMAINS.some(domain =>
            hostname === domain || hostname.endsWith('.' + domain)
        );
    }

    /**
     * Check if action is sensitive
     */
    private isSensitiveAction(action: AutomationAction): boolean {
        const text = `${action.target || ''} ${action.value || ''}`.toLowerCase();
        return SENSITIVE_PATTERNS.some(pattern => text.includes(pattern));
    }

    /**
     * Find element by text description using AI-powered matching
     */
    async findElement(description: string): Promise<Element | null> {
        const lowerDesc = description.toLowerCase();

        // Strategy 1: Exact text match
        const allElements = document.querySelectorAll('button, a, input, [role="button"], [onclick]');

        for (const el of allElements) {
            const text = (el.textContent || '').toLowerCase().trim();
            const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
            const title = (el.getAttribute('title') || '').toLowerCase();
            const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();

            if (text.includes(lowerDesc) ||
                ariaLabel.includes(lowerDesc) ||
                title.includes(lowerDesc) ||
                placeholder.includes(lowerDesc)) {
                return el;
            }
        }

        // Strategy 2: Class/ID matching
        const byClass = document.querySelector(`[class*="${lowerDesc}"]`);
        if (byClass) return byClass;

        // Strategy 3: Data attributes
        const byData = document.querySelector(`[data-testid*="${lowerDesc}"], [data-action*="${lowerDesc}"]`);
        if (byData) return byData;

        // Strategy 4: Fuzzy text match
        for (const el of allElements) {
            const text = (el.textContent || '').toLowerCase();
            const words = lowerDesc.split(' ');
            if (words.every(word => text.includes(word))) {
                return el;
            }
        }

        return null;
    }

    /**
     * Click an element
     */
    async click(element: Element): Promise<void> {
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await this.wait(300);

        // Highlight element briefly
        this.highlightElement(element);

        // Perform click
        (element as HTMLElement).click();
        await this.wait(500);
    }

    /**
     * Type text into an element
     */
    async type(element: Element, text: string): Promise<void> {
        const input = element as HTMLInputElement | HTMLTextAreaElement;

        // Focus the element
        input.focus();
        await this.wait(100);

        // Clear existing content
        input.value = '';

        // Type character by character for realistic effect
        for (const char of text) {
            input.value += char;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await this.wait(50 + Math.random() * 50);
        }

        // Trigger change event
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * Scroll the page
     */
    async scroll(direction: 'up' | 'down' | 'left' | 'right', amount: number = 500): Promise<void> {
        const options: ScrollToOptions = { behavior: 'smooth' };

        switch (direction) {
            case 'up':
                window.scrollBy({ top: -amount, ...options });
                break;
            case 'down':
                window.scrollBy({ top: amount, ...options });
                break;
            case 'left':
                window.scrollBy({ left: -amount, ...options });
                break;
            case 'right':
                window.scrollBy({ left: amount, ...options });
                break;
        }

        await this.wait(500);
    }

    /**
     * Navigate to a URL
     */
    async navigate(url: string): Promise<void> {
        // Validate URL
        try {
            const parsed = new URL(url, window.location.origin);

            // Check if domain is allowed
            if (!ALLOWED_DOMAINS.some(d => parsed.hostname.includes(d))) {
                throw new Error(`Navigation to ${parsed.hostname} is not allowed`);
            }

            window.location.href = parsed.href;
        } catch (e) {
            throw new Error(`Invalid URL: ${url}`);
        }
    }

    /**
     * Wait for specified milliseconds
     */
    async wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Highlight an element temporarily
     */
    private highlightElement(element: Element): void {
        const el = element as HTMLElement;
        const originalOutline = el.style.outline;
        const originalBoxShadow = el.style.boxShadow;

        el.style.outline = '3px solid #8b5cf6';
        el.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.5)';

        setTimeout(() => {
            el.style.outline = originalOutline;
            el.style.boxShadow = originalBoxShadow;
        }, 1000);
    }

    /**
     * Execute a single action
     */
    async executeAction(action: AutomationAction): Promise<void> {
        action.status = 'running';
        this.updateProgress(`Executing: ${action.type} ${action.target || action.url || ''}`);

        try {
            switch (action.type) {
                case 'click':
                    if (!action.target) throw new Error('Click target required');
                    const clickEl = await this.findElement(action.target);
                    if (!clickEl) throw new Error(`Could not find: ${action.target}`);
                    await this.click(clickEl);
                    break;

                case 'type':
                    if (!action.target || !action.value) throw new Error('Type target and value required');
                    const typeEl = await this.findElement(action.target);
                    if (!typeEl) throw new Error(`Could not find: ${action.target}`);
                    await this.type(typeEl, action.value);
                    break;

                case 'scroll':
                    await this.scroll(action.direction || 'down', action.amount || 500);
                    break;

                case 'navigate':
                    if (!action.url) throw new Error('Navigate URL required');
                    await this.navigate(action.url);
                    break;

                case 'wait':
                    await this.wait(action.amount || 1000);
                    break;

                case 'screenshot':
                    // Request screenshot from background script
                    chrome.runtime.sendMessage({ action: 'CAPTURE_SCREEN' });
                    await this.wait(500);
                    break;
            }

            action.status = 'completed';
        } catch (error: any) {
            action.status = 'failed';
            action.error = error.message;
            throw error;
        }
    }

    /**
     * Execute a sequence of actions
     */
    async executeActions(
        actions: AutomationAction[],
        onProgress?: ProgressCallback,
        requireConfirmation?: (action: AutomationAction) => Promise<boolean>
    ): Promise<void> {
        if (!this.isAllowedDomain()) {
            throw new Error('Automation is not allowed on this domain');
        }

        this.isRunning = true;
        this.isPaused = false;
        this.abortController = new AbortController();
        this.onProgress = onProgress || null;

        this.currentProgress = {
            currentAction: 0,
            totalActions: actions.length,
            currentActionDescription: 'Starting automation...',
            status: 'running',
            actions: actions
        };

        this.notifyProgress();

        try {
            for (let i = 0; i < actions.length; i++) {
                // Check if aborted
                if (this.abortController.signal.aborted) {
                    throw new Error('Automation stopped by user');
                }

                // Check if paused
                while (this.isPaused) {
                    await this.wait(100);
                }

                const action = actions[i];
                this.currentProgress.currentAction = i + 1;

                // Check for sensitive action
                if (this.isSensitiveAction(action) && requireConfirmation) {
                    const confirmed = await requireConfirmation(action);
                    if (!confirmed) {
                        action.status = 'failed';
                        action.error = 'User cancelled';
                        continue;
                    }
                }

                await this.executeAction(action);
                this.notifyProgress();
            }

            this.currentProgress.status = 'completed';
            this.currentProgress.currentActionDescription = 'All actions completed!';
        } catch (error: any) {
            this.currentProgress.status = 'error';
            this.currentProgress.currentActionDescription = `Error: ${error.message}`;
        } finally {
            this.isRunning = false;
            this.notifyProgress();
        }
    }

    /**
     * Stop automation
     */
    stop(): void {
        this.abortController?.abort();
        this.isRunning = false;
        this.currentProgress.status = 'idle';
        this.updateProgress('Automation stopped');
    }

    /**
     * Pause automation
     */
    pause(): void {
        this.isPaused = true;
        this.currentProgress.status = 'paused';
        this.notifyProgress();
    }

    /**
     * Resume automation
     */
    resume(): void {
        this.isPaused = false;
        this.currentProgress.status = 'running';
        this.notifyProgress();
    }

    /**
     * Update progress description
     */
    private updateProgress(description: string): void {
        this.currentProgress.currentActionDescription = description;
        this.notifyProgress();
    }

    /**
     * Notify progress callback
     */
    private notifyProgress(): void {
        this.onProgress?.({ ...this.currentProgress });
    }

    /**
     * Get current progress
     */
    getProgress(): AutomationProgress {
        return { ...this.currentProgress };
    }

    /**
     * Check if running
     */
    getIsRunning(): boolean {
        return this.isRunning;
    }
}

// Export singleton instance
export const automationService = new AutomationService();
export default AutomationService;
