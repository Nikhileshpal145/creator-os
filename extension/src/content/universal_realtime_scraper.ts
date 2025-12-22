/**
 * Universal Real-Time Scraper
 * Works on ALL pages - extracts visible content and metrics
 */

console.log("🔍 Creator OS: Universal Scraper Active");

let lastScrapedData: string | null = null;
let scrapeCount = 0;

/**
 * Scrape current page data
 */
function scrapeCurrentPage() {
    try {
        scrapeCount++;
        console.log(`Creator OS: Scraping attempt #${scrapeCount}...`);

        const data = {
            url: window.location.href,
            title: document.title,
            platform: detectPlatform(),
            visible_text: extractVisibleText(),
            metrics: scrapeVisibleMetrics(),
            timestamp: new Date().toISOString(),
            page_type: detectPageType()
        };

        // Only sync if data changed significantly
        const dataHash = JSON.stringify(data);
        if (dataHash !== lastScrapedData) {
            lastScrapedData = dataHash;

            console.log("Creator OS: Data changed, syncing...", {
                platform: data.platform,
                metricsFound: Object.keys(data.metrics).length,
                textLength: data.visible_text.length
            });

            // Check if extension context is still valid
            if (!chrome.runtime?.id) {
                console.warn("Creator OS: Extension context invalid, page needs refresh");
                return;
            }

            chrome.runtime.sendMessage({
                action: "SYNC_SCRAPED_PAGE",
                payload: data
            }, (response) => {
                // Handle extension context invalidation gracefully
                if (chrome.runtime.lastError) {
                    console.warn("Creator OS: Extension disconnected, refresh page to reconnect");
                    return;
                }
                if (response?.success) {
                    console.log("✅ Creator OS: Page data synced");
                } else {
                    console.warn("⚠️ Creator OS: Sync failed", response?.error);
                }
            });
        } else {
            console.log("Creator OS: No changes detected, skipping sync");
        }

    } catch (e: any) {
        // Suppress "Extension context invalidated" errors as they're expected during reload
        if (e.message?.includes('Extension context invalidated')) {
            console.log("Creator OS: Extension reloaded, refresh page to reconnect");
        } else {
            console.error("Creator OS: Scraping error", e);
        }
    }
}

/**
 * Extract visible text from page (first 3000 chars)
 */
function extractVisibleText(): string {
    // Get main content, excluding nav/footer/ads
    const mainContent = document.querySelector('main, article, .content, #content') as HTMLElement;
    const text = mainContent ? mainContent.innerText : (document.body as HTMLElement).innerText;
    return text.slice(0, 3000).trim();
}

/**
 * Scrape visible metrics using pattern matching
 */
function scrapeVisibleMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    const text = document.body.innerText;

    // Pattern: "12,345 views" or "5.2K subscribers"
    const patterns = [
        { regex: /([\d,.]+[KMB]?)\s*(views?|impressions?)/gi, key: 'views' },
        { regex: /([\d,.]+[KMB]?)\s*(subscribers?|followers?)/gi, key: 'followers' },
        { regex: /([\d,.]+[KMB]?)\s*(likes?)/gi, key: 'likes' },
        { regex: /([\d,.]+[KMB]?)\s*(comments?)/gi, key: 'comments' },
        { regex: /([\d,.]+[KMB]?)\s*(shares?)/gi, key: 'shares' }
    ];

    for (const pattern of patterns) {
        const matches = [...text.matchAll(pattern.regex)];
        for (const match of matches.slice(0, 3)) { // First 3 matches per metric
            const value = parseMetricValue(match[1]);
            if (!isNaN(value) && value > 0) {
                metrics[pattern.key] = Math.max(metrics[pattern.key] || 0, value);
            }
        }
    }

    return metrics;
}

/**
 * Parse metric value (handles K, M, B suffixes)
 */
function parseMetricValue(text: string): number {
    if (!text) return 0;
    const cleaned = text.replace(/[^0-9.KMBkmb,]/g, '').toUpperCase();
    let value = parseFloat(cleaned.replace(/,/g, '')) || 0;

    if (cleaned.includes('K')) value *= 1000;
    else if (cleaned.includes('M')) value *= 1000000;
    else if (cleaned.includes('B')) value *= 1000000000;

    return Math.round(value);
}

/**
 * Detect platform from URL
 */
function detectPlatform(): string {
    const url = window.location.href.toLowerCase();
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('facebook.com')) return 'facebook';
    return 'other';
}

/**
 * Detect page type
 */
function detectPageType(): string {
    const url = window.location.href;
    const pathname = window.location.pathname;

    // YouTube specific
    if (url.includes('studio.youtube.com')) {
        if (pathname.includes('/analytics')) return 'youtube_analytics';
        if (pathname.includes('/videos')) return 'youtube_content';
        return 'youtube_studio';
    }
    if (url.includes('youtube.com/watch')) return 'youtube_video';
    if (url.includes('youtube.com/channel') || url.includes('youtube.com/@')) return 'youtube_channel';

    // Instagram
    if (pathname.includes('/p/')) return 'instagram_post';
    if (pathname.match(/^\/[^/]+\/?$/)) return 'instagram_profile';

    // LinkedIn
    if (pathname.includes('/in/')) return 'linkedin_profile  ';
    if (pathname.includes('/posts/')) return 'linkedin_post';
    if (pathname.includes('/analytics')) return 'linkedin_analytics';

    return 'general';
}

// === AUTO-SCRAPING ===

// Initial scrape after page load
setTimeout(scrapeCurrentPage, 3000);

// Re-scrape every 30 seconds (less aggressive)
setInterval(scrapeCurrentPage, 30000);

// SPA navigation detection
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log("Creator OS: Navigation detected, re-scraping...");
        setTimeout(scrapeCurrentPage, 2000);
    }
});

urlObserver.observe(document.body, {
    childList: true,
    subtree: true
});

console.log("✅ Creator OS: Universal scraper initialized");
