/**
 * YouTube Studio Analytics Scraper
 * Extracts analytics from studio.youtube.com when user visits the dashboard
 */

// Detect YouTube Studio Analytics pages
const isYouTubeStudio = window.location.hostname === 'studio.youtube.com';

if (isYouTubeStudio) {
    console.log("Creator OS: YouTube Studio Detected 🎬");

    // Wait for page to fully load before scraping
    let scrapeAttempts = 0;
    const maxAttempts = 10;

    const scrapeYouTubeAnalytics = () => {
        try {
            console.log("Creator OS: Attempting to scrape YouTube analytics...");

            // Strategy: Multiple selector approaches for resilience
            const metrics: { [key: string]: number | string } = {};

            // ===== CHANNEL OVERVIEW METRICS =====

            // Views - Try multiple selectors
            const viewsSelectors = [
                '[data-metric-type="VIEWS"] .metric-value',
                '.analytics-value[aria-label*="views"]',
                'ytcp-analytics-data[data-entity="VIEWS"] .value',
                '.analytics-period-summary span[aria-label*="views"]'
            ];

            for (const selector of viewsSelectors) {
                const el = document.querySelector(selector);
                if (el?.textContent) {
                    metrics.views = parseMetricValue(el.textContent);
                    break;
                }
            }

            // Watch Time
            const watchTimeSelectors = [
                '[data-metric-type="WATCH_TIME"] .metric-value',
                '.analytics-value[aria-label*="watch time"]',
                'ytcp-analytics-data[data-entity="WATCH_TIME"] .value'
            ];

            for (const selector of watchTimeSelectors) {
                const el = document.querySelector(selector);
                if (el?.textContent) {
                    metrics.watch_time = el.textContent.trim();
                    break;
                }
            }

            // Subscribers
            const subscriberSelectors = [
                '[data-metric-type="SUBSCRIBERS_NET_CHANGE"] .metric-value',
                '.analytics-value[aria-label*="subscribers"]',
                'ytcp-analytics-data[data-entity="SUBSCRIBERS"] .value',
                '.subscriber-count-text'
            ];

            for (const selector of subscriberSelectors) {
                const el = document.querySelector(selector);
                if (el?.textContent) {
                    metrics.subscribers_change = parseMetricValue(el.textContent);
                    break;
                }
            }

            // Revenue (if creator is monetized)
            const revenueSelectors = [
                '[data-metric-type="ESTIMATED_REVENUE"] .metric-value',
                '.analytics-value[aria-label*="revenue"]',
                'ytcp-analytics-data[data-entity="ESTIMATED_REVENUE"] .value'
            ];

            for (const selector of revenueSelectors) {
                const el = document.querySelector(selector);
                if (el?.textContent) {
                    metrics.estimated_revenue = el.textContent.trim();
                    break;
                }
            }

            // ===== FALLBACK: Scrape visible metric cards =====
            if (Object.keys(metrics).length === 0) {
                console.log("Creator OS: Using fallback scraping method...");

                // Look for metric card patterns
                const metricCards = document.querySelectorAll('.ytcp-overview-metric, .analytics-metric-card, [class*="metric-card"]');

                metricCards.forEach((card) => {
                    const label = card.querySelector('.metric-label, .header, [class*="label"]')?.textContent?.toLowerCase() || '';
                    const value = card.querySelector('.metric-value, .value, [class*="value"]')?.textContent || '';

                    if (label && value) {
                        if (label.includes('view')) metrics.views = parseMetricValue(value);
                        else if (label.includes('watch')) metrics.watch_time = value.trim();
                        else if (label.includes('subscrib')) metrics.subscribers_change = parseMetricValue(value);
                        else if (label.includes('revenue')) metrics.estimated_revenue = value.trim();
                    }
                });
            }

            // ===== NETWORK INTERCEPTION: Capture API responses =====
            // This is stored from the interceptor below
            if ((window as any).__creatorOS_youtubeData) {
                Object.assign(metrics, (window as any).__creatorOS_youtubeData);
            }

            // Only sync if we got useful data
            if (Object.keys(metrics).length > 0) {
                console.log("Creator OS: Scraped YouTube metrics", metrics);

                chrome.runtime.sendMessage({
                    action: "SYNC_SCRAPED_ANALYTICS",
                    payload: {
                        platform: "youtube",
                        url: window.location.href,
                        metrics: metrics,
                        scraped_at: new Date().toISOString()
                    }
                });

                return true; // Success
            } else {
                console.log("Creator OS: No metrics found yet, will retry...");
                return false;
            }

        } catch (e) {
            console.error("Creator OS: YouTube scraping error", e);
            return false;
        }
    };

    // Retry logic - YouTube Studio loads data dynamically
    const attemptScrape = () => {
        scrapeAttempts++;
        const success = scrapeYouTubeAnalytics();

        if (!success && scrapeAttempts < maxAttempts) {
            setTimeout(attemptScrape, 2000); // Retry every 2 seconds
        } else if (success) {
            console.log("Creator OS: YouTube scraping complete ✅");
        } else {
            console.log("Creator OS: Could not scrape YouTube after max attempts");
        }
    };

    // Initial delay to let page load
    setTimeout(attemptScrape, 3000);

    // Also scrape on navigation (SPA)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            scrapeAttempts = 0;
            setTimeout(attemptScrape, 3000);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// ===== NETWORK INTERCEPTION =====
// Capture YouTube API responses for more reliable data
(function interceptFetch() {
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);

        try {
            const url = args[0]?.toString() || '';

            // Look for analytics API calls
            if (url.includes('/youtubei/v1/analytics_data') ||
                url.includes('/youtube/analytics/') ||
                url.includes('get_creator_analytics')) {

                const clone = response.clone();
                const data = await clone.json();

                // Store for the scraper to pick up
                (window as any).__creatorOS_youtubeData = extractFromApiResponse(data);
                console.log("Creator OS: Intercepted YouTube API data");
            }
        } catch (e) {
            // Ignore parsing errors
        }

        return response;
    };
})();

function extractFromApiResponse(data: any): { [key: string]: any } {
    const extracted: { [key: string]: any } = {};

    try {
        // Navigate common YouTube API response structures
        if (data?.rows) {
            data.rows.forEach((row: any) => {
                if (row.metrics) {
                    extracted.api_views = row.metrics.views;
                    extracted.api_watch_time = row.metrics.estimatedMinutesWatched;
                    extracted.api_subscribers = row.metrics.subscribersGained - (row.metrics.subscribersLost || 0);
                }
            });
        }

        // Alternative structure
        if (data?.data?.rows) {
            data.data.rows.forEach((row: any) => {
                if (row[0]) extracted.api_views = row[0];
                if (row[1]) extracted.api_watch_time = row[1];
            });
        }
    } catch (e) {
        console.log("Creator OS: Could not extract from API response");
    }

    return extracted;
}

function parseMetricValue(text: string): number {
    if (!text) return 0;

    // Remove non-numeric except K, M, B
    const cleaned = text.replace(/[^0-9.KMBkmb]/g, '').toUpperCase();

    let value = parseFloat(cleaned) || 0;

    if (cleaned.includes('K')) value *= 1000;
    else if (cleaned.includes('M')) value *= 1000000;
    else if (cleaned.includes('B')) value *= 1000000000;

    return Math.round(value);
}

export { };
