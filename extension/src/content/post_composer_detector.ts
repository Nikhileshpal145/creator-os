/**
 * Post Composer Detector
 * Detects when user opens post composer on social platforms
 * and extracts images for real-time analysis.
 */

console.log("Influencer OS: Post Composer Detector Loaded 📝");

// Platform-specific selectors for post composers
const PLATFORM_SELECTORS = {
    instagram: {
        composer: '[role="dialog"][aria-label*="Create"], [role="dialog"]:has(textarea)',
        imageContainer: '[role="dialog"] img[src*="blob:"], [role="dialog"] img[src*="instagram"]',
        textarea: '[role="dialog"] textarea, [contenteditable="true"]',
        detectUrl: /instagram\.com/i
    },
    twitter: {
        composer: '[data-testid="tweetTextarea_0"], [data-testid="toolBar"]',
        imageContainer: '[data-testid="attachments"] img, [data-testid="tweetPhoto"] img',
        textarea: '[data-testid="tweetTextarea_0"]',
        detectUrl: /twitter\.com|x\.com/i
    },
    linkedin: {
        composer: '.share-box-feed-entry__trigger, .share-creation-state, .share-box',
        imageContainer: '.share-creation-state img, .share-box img[src*="blob:"]',
        textarea: '.share-creation-state [contenteditable], .ql-editor',
        detectUrl: /linkedin\.com/i
    }
};

// State
let currentPlatform: string | null = null;
let analysisOverlay: HTMLElement | null = null;
let lastAnalyzedImageSrc: string | null = null;
let isAnalyzing = false;

// Detect current platform
function detectPlatform(): string | null {
    const url = window.location.href;
    for (const [platform, config] of Object.entries(PLATFORM_SELECTORS)) {
        if (config.detectUrl.test(url)) {
            return platform;
        }
    }
    return null;
}

// Extract image from composer as base64
async function extractImageAsBase64(imgElement: HTMLImageElement): Promise<string | null> {
    try {
        // If it's a blob URL or regular image, draw to canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        // Wait for image to load
        if (!imgElement.complete) {
            await new Promise((resolve) => {
                imgElement.onload = resolve;
                imgElement.onerror = resolve;
            });
        }

        canvas.width = imgElement.naturalWidth || imgElement.width;
        canvas.height = imgElement.naturalHeight || imgElement.height;

        ctx.drawImage(imgElement, 0, 0);

        // Convert to base64 (JPEG for smaller size)
        return canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
        console.error("Creator OS: Failed to extract image", e);
        return null;
    }
}

// Extract caption text from composer
function extractCaption(platform: string): string {
    const config = PLATFORM_SELECTORS[platform as keyof typeof PLATFORM_SELECTORS];
    if (!config) return '';

    const textarea = document.querySelector(config.textarea);
    return textarea?.textContent || textarea?.getAttribute('value') || '';
}

// Create analysis overlay UI
function createAnalysisOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.id = 'influencer-os-analysis-overlay';
    overlay.innerHTML = `
        <style>
            #influencer-os-analysis-overlay {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 320px;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: white;
                animation: slideIn 0.3s ease-out;
            }
            @keyframes slideIn {
                from { transform: translateX(100px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .cos-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 16px;
            }
            .cos-logo {
                width: 32px;
                height: 32px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
            }
            .cos-title {
                font-weight: 600;
                font-size: 14px;
            }
            .cos-close {
                margin-left: auto;
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
                font-size: 18px;
            }
            .cos-score-container {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-bottom: 16px;
            }
            .cos-score-circle {
                width: 70px;
                height: 70px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                font-weight: bold;
            }
            .cos-score-high { background: linear-gradient(135deg, #00b894, #00cec9); }
            .cos-score-medium { background: linear-gradient(135deg, #fdcb6e, #e17055); }
            .cos-score-low { background: linear-gradient(135deg, #d63031, #e74c3c); }
            .cos-prediction {
                font-size: 13px;
            }
            .cos-prediction-label {
                font-weight: 600;
                margin-bottom: 4px;
            }
            .cos-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
            }
            .cos-badge-high { background: #00b894; }
            .cos-badge-medium { background: #fdcb6e; color: #222; }
            .cos-badge-low { background: #d63031; }
            .cos-feedback {
                margin-bottom: 12px;
            }
            .cos-feedback-title {
                font-size: 12px;
                color: #888;
                margin-bottom: 8px;
            }
            .cos-feedback-item {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                font-size: 12px;
                margin-bottom: 6px;
                color: #ddd;
            }
            .cos-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 20px;
            }
            .cos-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255,255,255,0.2);
                border-top-color: #667eea;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .cos-loading-text {
                margin-top: 12px;
                font-size: 13px;
                color: #888;
            }
        </style>
        <div class="cos-header">
            <div class="cos-logo">🎯</div>
            <div class="cos-title">Post Analysis</div>
            <button class="cos-close" onclick="this.closest('#influencer-os-analysis-overlay').remove()">×</button>
        </div>
        <div class="cos-content">
            <div class="cos-loading">
                <div class="cos-spinner"></div>
                <div class="cos-loading-text">Analyzing your post...</div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
}

// Update overlay with analysis results
function updateOverlayWithResults(overlay: HTMLElement, result: any) {
    const scoreClass = result.overall_score >= 70 ? 'high' : result.overall_score >= 50 ? 'medium' : 'low';

    const content = overlay.querySelector('.cos-content');
    if (content) {
        content.innerHTML = `
            <div class="cos-score-container">
                <div class="cos-score-circle cos-score-${scoreClass}">
                    ${result.overall_score}
                </div>
                <div class="cos-prediction">
                    <div class="cos-prediction-label">Performance Prediction</div>
                    <span class="cos-badge cos-badge-${scoreClass}">${result.prediction}</span>
                </div>
            </div>
            <div class="cos-feedback">
                <div class="cos-feedback-title">💡 Tips to Improve</div>
                ${result.feedback.slice(0, 3).map((tip: string) => `
                    <div class="cos-feedback-item">
                        <span>•</span>
                        <span>${tip}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Show error in overlay
function showOverlayError(overlay: HTMLElement, error: string) {
    const content = overlay.querySelector('.cos-content');
    if (content) {
        content.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #e74c3c;">
                <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                <div style="font-size: 13px;">${error}</div>
            </div>
        `;
    }
}

// Send image for analysis
async function analyzeImage(imageBase64: string, caption: string, platform: string) {
    if (isAnalyzing) return;
    isAnalyzing = true;

    // Create or show overlay
    if (analysisOverlay) {
        analysisOverlay.remove();
    }
    analysisOverlay = createAnalysisOverlay();

    try {
        // Send to background script which will call the API
        chrome.runtime.sendMessage({
            action: "ANALYZE_POST_IMAGE",
            payload: {
                image_base64: imageBase64,
                caption: caption,
                platform: platform
            }
        }, (response) => {
            if (chrome.runtime.lastError) {
                showOverlayError(analysisOverlay!, "Extension error. Please reload.");
                isAnalyzing = false;
                return;
            }

            if (response?.success && response.data) {
                updateOverlayWithResults(analysisOverlay!, response.data);
            } else {
                showOverlayError(analysisOverlay!, response?.error || "Analysis failed");
            }
            isAnalyzing = false;
        });
    } catch (e) {
        console.error("Creator OS: Analysis error", e);
        showOverlayError(analysisOverlay!, "Failed to analyze image");
        isAnalyzing = false;
    }
}

// Watch for images in composer
function watchForImages() {
    currentPlatform = detectPlatform();
    if (!currentPlatform) return;

    const config = PLATFORM_SELECTORS[currentPlatform as keyof typeof PLATFORM_SELECTORS];

    // Use MutationObserver to detect new images
    const observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                // Check for composer
                const composer = document.querySelector(config.composer);
                if (!composer) continue;

                // Check for images in composer
                const images = document.querySelectorAll(config.imageContainer);

                for (const img of images) {
                    const imgEl = img as HTMLImageElement;
                    const src = imgEl.src;

                    // Skip if already analyzed this image
                    if (src === lastAnalyzedImageSrc) continue;

                    // Skip tiny images (likely icons)
                    if (imgEl.width < 100 || imgEl.height < 100) continue;

                    lastAnalyzedImageSrc = src;

                    console.log("Creator OS: Image detected in composer, analyzing...");

                    const base64 = await extractImageAsBase64(imgEl);
                    if (base64) {
                        const caption = extractCaption(currentPlatform!);
                        analyzeImage(base64, caption, currentPlatform!);
                    }
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log(`Creator OS: Watching for ${currentPlatform} post composer`);
}

// Initialize
if (document.readyState === 'complete') {
    watchForImages();
} else {
    window.addEventListener('load', watchForImages);
}

export { };
