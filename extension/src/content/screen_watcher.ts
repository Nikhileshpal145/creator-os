/**
 * Screen Watcher - Real-time perception for agentic AI
 * Captures screen and post content, sends to /agents/perceive
 */

console.log("Creator OS: Screen Watcher Active 👁️");

const API_BASE = 'http://localhost:8000/api/v1';
const PERCEPTION_INTERVAL = 3000; // 3 seconds
const TOKEN_KEY = 'creator_os_token_v2';

// State
let isWatching = false;
let lastCapturedHash = '';
let perceptionInterval: number | null = null;

// Detect current platform
function detectPlatform(): string | null {
    const url = window.location.href;
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('youtube.com')) return 'youtube';
    if (url.includes('tiktok.com')) return 'tiktok';
    return null;
}

// Detect if user is composing a post
function isComposerOpen(): boolean {
    const platform = detectPlatform();

    const composerSelectors: Record<string, string[]> = {
        instagram: [
            '[role="dialog"][aria-label*="Create"]',
            '[role="dialog"]:has(textarea)'
        ],
        twitter: [
            '[data-testid="tweetTextarea_0"]',
            '[role="dialog"][aria-labelledby*="modal"]'
        ],
        linkedin: [
            '.share-box-feed-entry__trigger--active',
            '.share-creation-state',
            '.share-box--open'
        ],
        youtube: [
            '#upload-dialog',
            '#dialog[aria-label*="Upload"]'
        ]
    };

    const selectors = platform ? composerSelectors[platform] || [] : [];

    for (const selector of selectors) {
        if (document.querySelector(selector)) {
            return true;
        }
    }

    return false;
}

// Extract visible post text from composer
function extractPostText(): string {
    const platform = detectPlatform();

    const textSelectors: Record<string, string[]> = {
        instagram: [
            '[role="dialog"] textarea',
            '[contenteditable="true"]'
        ],
        twitter: [
            '[data-testid="tweetTextarea_0"]',
            '.public-DraftEditor-content'
        ],
        linkedin: [
            '.ql-editor',
            '[contenteditable="true"]'
        ],
        youtube: [
            '#description-textarea textarea',
            '#title-textarea input'
        ]
    };

    const selectors = platform ? textSelectors[platform] || [] : [];

    for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
            const text = (el as HTMLElement).innerText ||
                (el as HTMLInputElement).value ||
                el.textContent || '';
            if (text.trim()) return text.trim();
        }
    }

    return '';
}

// Capture image from composer (if present)
async function captureComposerImage(): Promise<string | null> {
    const platform = detectPlatform();

    const imageSelectors: Record<string, string[]> = {
        instagram: [
            '[role="dialog"] img[src*="blob:"]',
            '[role="dialog"] img[src*="instagram"]'
        ],
        twitter: [
            '[data-testid="attachments"] img',
            '[data-testid="tweetPhoto"] img'
        ],
        linkedin: [
            '.share-creation-state img',
            '.feed-shared-update-v2__content img'
        ]
    };

    const selectors = platform ? imageSelectors[platform] || [] : [];

    for (const selector of selectors) {
        const img = document.querySelector(selector) as HTMLImageElement;
        if (img && img.src) {
            try {
                // Convert to base64
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (ctx && img.complete && img.naturalWidth > 50) {
                    canvas.width = Math.min(img.naturalWidth, 800);
                    canvas.height = Math.min(img.naturalHeight, 800);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    return canvas.toDataURL('image/jpeg', 0.7);
                }
            } catch (e) {
                console.log('Could not capture image:', e);
            }
        }
    }

    return null;
}

// Get auth token
async function getToken(): Promise<string | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get([TOKEN_KEY], (result: { [key: string]: string | undefined }) => {
            const token = result[TOKEN_KEY];
            resolve(typeof token === 'string' ? token : null);
        });
    });
}

// Send perception to backend
async function sendPerception(data: {
    image_base64?: string | null;
    text?: string;
    platform?: string | null;
    url: string;
}) {
    try {
        const token = await getToken();
        if (!token) {
            console.log('Screen Watcher: Not authenticated');
            return;
        }

        // Create hash to avoid duplicate sends
        const hash = btoa(JSON.stringify({
            text: data.text?.slice(0, 100),
            hasImage: !!data.image_base64,
            platform: data.platform
        }));

        if (hash === lastCapturedHash) {
            return; // No change, skip
        }
        lastCapturedHash = hash;

        const response = await fetch(`${API_BASE}/agents/perceive`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                image_base64: data.image_base64,
                text: data.text,
                platform: data.platform,
                url: data.url
            })
        });

        if (response.ok) {
            const result = await response.json();

            // Show HUD if there's advice
            if (result.decision?.advice?.length > 0) {
                showAgentHUD(result);
            }
        }
    } catch (e) {
        // Silently fail - backend might be offline
        console.log('Screen Watcher: Backend unavailable');
    }
}

// Show floating HUD with agent advice
function showAgentHUD(result: any) {
    // Remove existing HUD
    const existing = document.getElementById('creator-os-agent-hud');
    if (existing) existing.remove();

    const decision = result.decision || {};
    const score = decision.score || 0;
    const advice = decision.advice || [];
    const verdict = decision.verdict || 'Analyzing...';

    const scoreColor = score >= 70 ? '#00b894' : score >= 50 ? '#fdcb6e' : '#e17055';

    const hud = document.createElement('div');
    hud.id = 'creator-os-agent-hud';
    hud.innerHTML = `
        <style>
            #creator-os-agent-hud {
                position: fixed;
                top: 80px;
                right: 20px;
                width: 280px;
                background: linear-gradient(135deg, rgba(26,26,46,0.95), rgba(22,33,62,0.95));
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                color: white;
                animation: hudSlideIn 0.3s ease-out;
                border: 1px solid rgba(255,255,255,0.1);
            }
            @keyframes hudSlideIn {
                from { transform: translateX(100px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .hud-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
            }
            .hud-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                font-size: 13px;
            }
            .hud-close {
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
                font-size: 16px;
            }
            .hud-score {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            .score-circle {
                width: 50px;
                height: 50px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 18px;
            }
            .score-text {
                font-size: 12px;
                color: #aaa;
            }
            .verdict-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
                margin-top: 4px;
            }
            .hud-advice {
                margin-top: 12px;
                font-size: 11px;
                color: #ddd;
            }
            .hud-advice li {
                margin-bottom: 6px;
                padding-left: 8px;
                list-style: none;
            }
            .hud-advice li::before {
                content: "→";
                margin-right: 6px;
                color: #667eea;
            }
        </style>
        <div class="hud-header">
            <div class="hud-title">
                <span>🤖</span>
                <span>JARVIS Analysis</span>
            </div>
            <button class="hud-close" onclick="this.closest('#creator-os-agent-hud').remove()">×</button>
        </div>
        <div class="hud-score">
            <div class="score-circle" style="background: ${scoreColor}">${score}</div>
            <div>
                <div class="score-text">Post Score</div>
                <div class="verdict-badge" style="background: ${scoreColor}">${verdict}</div>
            </div>
        </div>
        <ul class="hud-advice">
            ${advice.slice(0, 3).map((tip: string) => `<li>${tip}</li>`).join('')}
        </ul>
    `;

    document.body.appendChild(hud);

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
        hud.remove();
    }, 15000);
}

// Main perception loop
async function perceive() {
    if (!isComposerOpen()) {
        return; // Only perceive when composing
    }

    const platform = detectPlatform();
    const text = extractPostText();
    const image = await captureComposerImage();

    // Only send if there's content to analyze
    if (text || image) {
        await sendPerception({
            image_base64: image,
            text: text,
            platform: platform,
            url: window.location.href
        });
    }
}

// Start watching
function startWatching() {
    if (isWatching) return;

    isWatching = true;
    perceptionInterval = window.setInterval(perceive, PERCEPTION_INTERVAL);
    console.log('Creator OS: Screen watching started');
}

// Stop watching
function stopWatching() {
    if (perceptionInterval) {
        clearInterval(perceptionInterval);
        perceptionInterval = null;
    }
    isWatching = false;
    console.log('Creator OS: Screen watching stopped');
}

// Initialize if on supported platform
const platform = detectPlatform();
if (platform) {
    startWatching();
}

// Listen for visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopWatching();
    } else if (detectPlatform()) {
        startWatching();
    }
});

export { startWatching, stopWatching, perceive };
