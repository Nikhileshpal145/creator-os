/**
 * Universal Web Page Scraper
 * Scrapes ANY website the user visits with the extension active.
 * Auto-detects page type and extracts relevant metrics.
 */

console.log("Creator OS: Universal Scraper Loaded 🌐");

// Domains to exclude from scraping (privacy/security sensitive)
const EXCLUDED_DOMAINS = [
    'localhost',
    'chrome://',
    'chrome-extension://',
    'bank',
    'paypal.com',
    'stripe.com',
    'mail.google.com',
    'outlook.live.com',
    'accounts.google.com',
];

// Check if we should scrape this page
function shouldScrape(): boolean {
    const url = window.location.href;
    const hostname = window.location.hostname;

    // Skip excluded domains
    for (const excluded of EXCLUDED_DOMAINS) {
        if (url.includes(excluded) || hostname.includes(excluded)) {
            console.log("Creator OS: Skipping excluded domain", hostname);
            return false;
        }
    }

    return true;
}

// Detect page type based on URL and content
function detectPageType(): string {
    const url = window.location.href.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();

    // Social platforms
    if (hostname.includes('linkedin.com')) {
        if (url.includes('/in/')) return 'profile';
        if (url.includes('/company/')) return 'company';
        if (url.includes('/posts/')) return 'post';
        return 'social';
    }
    if (hostname.includes('youtube.com') || hostname.includes('studio.youtube.com')) {
        if (url.includes('/watch')) return 'video';
        if (url.includes('/channel') || url.includes('/@')) return 'channel';
        return 'video_platform';
    }
    if (hostname.includes('instagram.com')) {
        if (url.includes('/p/')) return 'post';
        if (url.includes('/reel/')) return 'reel';
        return 'profile';
    }
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
        if (url.includes('/status/')) return 'post';
        return 'profile';
    }
    if (hostname.includes('tiktok.com')) {
        return 'video';
    }

    // E-commerce
    if (hostname.includes('amazon.') || hostname.includes('ebay.') ||
        hostname.includes('shopify') || hostname.includes('etsy.com')) {
        if (url.includes('/dp/') || url.includes('/product')) return 'product';
        return 'ecommerce';
    }

    // News/Blog
    if (hostname.includes('medium.com') || hostname.includes('substack.com') ||
        hostname.includes('wordpress.') || hostname.includes('blog')) {
        return 'blog';
    }

    // Check content indicators
    const hasArticle = document.querySelector('article') !== null;
    const hasProduct = document.querySelector('[itemtype*="Product"]') !== null;

    if (hasProduct) return 'product';
    if (hasArticle) return 'article';

    return 'webpage';
}

// Detect platform from hostname
function detectPlatform(): string | null {
    const hostname = window.location.hostname.toLowerCase();

    const platforms: { [key: string]: string } = {
        'linkedin.com': 'linkedin',
        'youtube.com': 'youtube',
        'studio.youtube.com': 'youtube',
        'instagram.com': 'instagram',
        'twitter.com': 'twitter',
        'x.com': 'twitter',
        'facebook.com': 'facebook',
        'tiktok.com': 'tiktok',
        'reddit.com': 'reddit',
        'medium.com': 'medium',
        'github.com': 'github',
    };

    for (const [domain, platform] of Object.entries(platforms)) {
        if (hostname.includes(domain)) {
            return platform;
        }
    }

    return null;
}

// Extract visible metrics/numbers from the page
function extractMetrics(): { [key: string]: any } {
    const metrics: { [key: string]: any } = {};

    // Look for common metric patterns
    const metricPatterns = [
        { selector: '[aria-label*="followers"]', key: 'followers' },
        { selector: '[aria-label*="following"]', key: 'following' },
        { selector: '[aria-label*="subscribers"]', key: 'subscribers' },
        { selector: '[aria-label*="views"]', key: 'views' },
        { selector: '[aria-label*="likes"]', key: 'likes' },
        { selector: '[aria-label*="comments"]', key: 'comments' },
        { selector: '[aria-label*="connections"]', key: 'connections' },
        { selector: '.follower-count, .subscribers-count', key: 'followers' },
        { selector: '[class*="view-count"], [class*="views"]', key: 'views' },
    ];

    for (const pattern of metricPatterns) {
        const el = document.querySelector(pattern.selector);
        if (el?.textContent) {
            const value = parseNumber(el.textContent);
            if (value > 0) {
                metrics[pattern.key] = value;
            }
        }
    }

    // Extract any visible large numbers (likely metrics)
    const textNodes = document.body.innerText;
    const numberMatches = textNodes.match(/\d{1,3}(,\d{3})*(\.\d+)?[KMB]?/g);

    if (numberMatches) {
        const significantNumbers = numberMatches
            .map(n => parseNumber(n))
            .filter(n => n >= 100)  // Only significant numbers
            .slice(0, 5);  // Limit to 5

        if (significantNumbers.length > 0) {
            metrics.detected_numbers = significantNumbers;
        }
    }

    return metrics;
}

// Parse number from text (handles K, M, B suffixes)
function parseNumber(text: string): number {
    if (!text) return 0;

    const cleaned = text.replace(/[^0-9.KMBkmb,]/g, '').toUpperCase();
    let value = parseFloat(cleaned.replace(/,/g, '')) || 0;

    if (cleaned.includes('K')) value *= 1000;
    else if (cleaned.includes('M')) value *= 1000000;
    else if (cleaned.includes('B')) value *= 1000000000;

    return Math.round(value);
}

// Extract page content summary
function extractContent(): { [key: string]: any } {
    const content: { [key: string]: any } = {};

    // Meta description
    const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    if (metaDesc?.content) {
        content.meta_description = metaDesc.content.slice(0, 500);
    }

    // Open Graph data
    const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement;
    const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement;
    const ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;

    if (ogTitle?.content) content.og_title = ogTitle.content;
    if (ogDesc?.content) content.og_description = ogDesc.content;
    if (ogImage?.content) content.og_image = ogImage.content;

    // Main heading
    const h1 = document.querySelector('h1');
    if (h1?.textContent) {
        content.main_heading = h1.textContent.trim().slice(0, 200);
    }

    // Text content summary (first 1000 chars of visible text)
    const mainContent = document.querySelector('main, article, .content, #content');
    if (mainContent?.textContent) {
        content.text_summary = mainContent.textContent.trim().slice(0, 1000);
    }

    return content;
}

// Main scraping function
async function scrapePage() {
    if (!shouldScrape()) return;

    try {
        console.log("Creator OS: Scraping page...", window.location.href);

        const pageType = detectPageType();
        const platform = detectPlatform();
        const metrics = extractMetrics();
        const content = extractContent();

        const payload = {
            url: window.location.href,
            title: document.title,
            description: content.meta_description || content.og_description || null,
            page_type: pageType,
            platform: platform,
            scraped_content: content,
            detected_metrics: metrics,
            scraped_at: new Date().toISOString()
        };

        console.log("Creator OS: Scraped data", payload);

        // Send to background script
        chrome.runtime.sendMessage({
            action: "SYNC_SCRAPED_PAGE",
            payload: payload
        }, (response) => {
            if (response?.success) {
                console.log("Creator OS: Page synced ✅", response.data);
            } else {
                console.log("Creator OS: Sync failed", response?.error);
            }
        });

    } catch (e) {
        console.error("Creator OS: Scraping error", e);
    }
}

// Wait for page to load, then scrape
if (document.readyState === 'complete') {
    setTimeout(scrapePage, 2000);
} else {
    window.addEventListener('load', () => {
        setTimeout(scrapePage, 2000);
    });
}

// Handle SPA navigation
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log("Creator OS: URL changed, re-scraping...");
        setTimeout(scrapePage, 2000);
    }
});

observer.observe(document.body, { childList: true, subtree: true });

export { };
