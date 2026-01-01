/**
 * YouTube Studio Analytics Scraper
 * Extracts analytics from studio.youtube.com when user visits the dashboard
 * Updated for 2024 YouTube Studio layout
 */

// Detect YouTube Studio Analytics pages
const isYouTubeStudio = window.location.hostname === 'studio.youtube.com';

if (isYouTubeStudio) {
    console.log("Creator OS: YouTube Studio Detected 🎬");

    // Wait for page to fully load before scraping
    let scrapeAttempts = 0;
    const maxAttempts = 15; // Increased attempts for slow-loading pages

    const scrapeYouTubeAnalytics = () => {
        try {
            console.log("Creator OS: Attempting to scrape YouTube analytics...");

            const metrics: { [key: string]: number | string } = {};

            // ===== STRATEGY 1: Text-based extraction (most resilient) =====
            const pageText = document.body.innerText;

            // Look for "X views" pattern
            const viewsMatch = pageText.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*views?/i);
            if (viewsMatch) {
                metrics.views = parseMetricValue(viewsMatch[1]);
            }

            // Look for "X subscribers" pattern
            const subsMatch = pageText.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*subscribers?/i);
            if (subsMatch) {
                metrics.subscribers = parseMetricValue(subsMatch[1]);
            }

            // Look for watch time patterns (e.g., "1.2K hours" or "45.2 hours")
            const watchTimeMatch = pageText.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMB]?)\s*hours?/i);
            if (watchTimeMatch) {
                metrics.watch_time_hours = parseMetricValue(watchTimeMatch[1]);
            }

            // ===== STRATEGY 2: Card-based extraction =====
            // YouTube Studio uses metric cards with specific structures
            const metricCards = document.querySelectorAll('[class*="metric"], [class*="analytics"], [class*="overview"]');

            metricCards.forEach((card) => {
                const cardText = card.textContent?.toLowerCase() || '';
                const numbers = card.textContent?.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMB]?)/g);

                if (numbers && numbers.length > 0) {
                    const value = parseMetricValue(numbers[0]);
                    if (cardText.includes('view') && !metrics.views) {
                        metrics.views = value;
                    } else if (cardText.includes('subscriber') && !metrics.subscribers) {
                        metrics.subscribers = value;
                    } else if (cardText.includes('watch time') && !metrics.watch_time_hours) {
                        metrics.watch_time_hours = value;
                    } else if (cardText.includes('revenue') && !metrics.estimated_revenue) {
                        metrics.estimated_revenue = numbers[0];
                    }
                }
            });

            // ===== STRATEGY 3: ARIA label extraction =====
            const ariaElements = document.querySelectorAll('[aria-label]');
            ariaElements.forEach((el) => {
                const label = el.getAttribute('aria-label')?.toLowerCase() || '';
                const numbers = label.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMB]?)/g);

                if (numbers) {
                    const value = parseMetricValue(numbers[0]);
                    if (label.includes('view') && !metrics.views) {
                        metrics.views = value;
                    } else if (label.includes('subscriber') && !metrics.subscribers) {
                        metrics.subscribers = value;
                    }
                }
            });

            // ===== STRATEGY 4: Specific YT Studio selectors (legacy) =====
            const viewsSelectors = [
                '[data-metric-type="VIEWS"] .metric-value',
                'ytcp-overview-metric-card[metric="VIEWS"] .metric-value',
                '.analytics-value[aria-label*="views"]'
            ];

            for (const selector of viewsSelectors) {
                if (metrics.views) break;
                try {
                    const el = document.querySelector(selector);
                    if (el?.textContent) {
                        metrics.views = parseMetricValue(el.textContent);
                    }
                } catch (e) { /* Skip invalid selectors */ }
            }

            // ===== NETWORK INTERCEPTED DATA (most accurate) =====
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
