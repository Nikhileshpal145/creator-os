/**
 * Instagram Insights Scraper
 * Extracts analytics from Instagram Professional Dashboard
 * Target: instagram.com/accounts/insights/ or professional_dashboard
 */

const isInstagram = window.location.hostname.includes('instagram.com');

if (isInstagram) {
    console.log("📸 Creator OS: Instagram scraper active");

    let scrapeAttempts = 0;
    const maxAttempts = 10;

    const scrapeInstagramAnalytics = () => {
        try {
            // Scrape Instagram analytics from page

            const metrics: { [key: string]: number | string } = {};

            // ===== PROFESSIONAL DASHBOARD METRICS =====

            // Accounts Reached
            const reachSelectors = [
                '[aria-label*="accounts reached"]',
                '[data-testid*="reach"]',
                'span:contains("Accounts reached") + span',
                '.insights-metric[data-type="reach"] .value'
            ];

            // Accounts Engaged
            const engagementSelectors = [
                '[aria-label*="accounts engaged"]',
                '[data-testid*="engagement"]',
                '.insights-metric[data-type="engagement"] .value'
            ];

            // Followers
            const followersSelectors = [
                '[aria-label*="followers"]',
                '[data-testid*="follower"]',
                'span:contains("Followers") + span',
                '.follower-count'
            ];

            // Profile Visits
            const profileVisitsSelectors = [
                '[aria-label*="profile visits"]',
                '[data-testid*="profile_visits"]',
                '.insights-metric[data-type="profile_visits"] .value'
            ];

            // Try each metric with fallback selectors
            metrics.accounts_reached = trySelectors(reachSelectors);
            metrics.accounts_engaged = trySelectors(engagementSelectors);
            metrics.followers = trySelectors(followersSelectors);
            metrics.profile_visits = trySelectors(profileVisitsSelectors);

            // ===== FALLBACK: Generic metric card scraping =====
            if (Object.values(metrics).every(v => v === 0 || v === '')) {
                // Using fallback pattern matching

                // Look for any visible metric patterns
                const allText = document.body.innerText;

                // Pattern matching for common Instagram metric formats
                const patterns = {
                    followers: /(\d+[,.]?\d*[KMkm]?)\s*(?:followers|Followers)/i,
                    following: /(\d+[,.]?\d*[KMkm]?)\s*(?:following|Following)/i,
                    posts: /(\d+[,.]?\d*[KMkm]?)\s*(?:posts|Posts)/i,
                    reached: /(\d+[,.]?\d*[KMkm]?)\s*(?:accounts?\s*reached|Reached)/i,
                    engaged: /(\d+[,.]?\d*[KMkm]?)\s*(?:accounts?\s*engaged|Engaged)/i
                };

                for (const [key, pattern] of Object.entries(patterns)) {
                    const match = allText.match(pattern);
                    if (match) {
                        metrics[key] = parseMetricValue(match[1]);
                    }
                }

                // Also try to scrape from visible elements
                const metricElements = document.querySelectorAll('[class*="metric"], [class*="stat"], [class*="insight"]');
                metricElements.forEach(el => {
                    const text = el.textContent?.toLowerCase() || '';
                    const value = el.querySelector('[class*="value"], [class*="count"]')?.textContent;

                    if (value) {
                        if (text.includes('reach')) metrics.accounts_reached = parseMetricValue(value);
                        else if (text.includes('engage')) metrics.accounts_engaged = parseMetricValue(value);
                        else if (text.includes('follow')) metrics.followers = parseMetricValue(value);
                        else if (text.includes('visit')) metrics.profile_visits = parseMetricValue(value);
                    }
                });
            }

            // ===== SCRAPE PROFILE HEADER STATS =====
            // When on any Instagram profile, get the basic stats
            const profileHeader = document.querySelector('header section');
            if (profileHeader) {
                const statsList = profileHeader.querySelectorAll('li');
                statsList.forEach(li => {
                    const text = li.textContent?.toLowerCase() || '';
                    const numMatch = text.match(/^([\d,\.]+[KMkm]?)/);

                    if (numMatch) {
                        const value = parseMetricValue(numMatch[1]);
                        if (text.includes('post')) metrics.posts = value;
                        else if (text.includes('follower') && !text.includes('following')) metrics.followers = value;
                        else if (text.includes('following')) metrics.following = value;
                    }
                });
            }

            // ===== NETWORK INTERCEPTED DATA =====
            if ((window as any).__creatorOS_instagramData) {
                Object.assign(metrics, (window as any).__creatorOS_instagramData);
            }

            // Filter out empty/zero values
            const validMetrics = Object.fromEntries(
                Object.entries(metrics).filter(([_, v]) => v !== 0 && v !== '')
            );

            if (Object.keys(validMetrics).length > 0) {
                // Check extension context before sending
                if (!chrome.runtime?.id) return true;

                chrome.runtime.sendMessage({
                    action: "SYNC_SCRAPED_ANALYTICS",
                    payload: {
                        platform: "instagram",
                        url: window.location.href,
                        metrics: validMetrics,
                        scraped_at: new Date().toISOString()
                    }
                }, (response) => {
                    if (chrome.runtime.lastError) return;
                    if (response?.success) {
                        console.log("✅ Creator OS: Instagram data synced");
                    }
                });

                return true;
            } else {
                return false;
            }

        } catch (e: any) {
            // Handle context invalidation gracefully
            if (!e.message?.includes('Extension context invalidated')) {
                console.error("Creator OS: Instagram scraping error", e);
            }
            return false;
        }
    };

    // Retry logic
    const attemptScrape = () => {
        scrapeAttempts++;
        const success = scrapeInstagramAnalytics();

        if (!success && scrapeAttempts < maxAttempts) {
            setTimeout(attemptScrape, 2000);
        } else if (success) {
            console.log("Creator OS: Instagram scraping complete ✅");
        }
    };

    // Initial delay
    setTimeout(attemptScrape, 3000);

    // SPA navigation detection
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
(function interceptInstagramFetch() {
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);

        try {
            const url = args[0]?.toString() || '';

            // Look for Instagram API calls with insights data
            if (url.includes('/api/v1/insights') ||
                url.includes('/graphql') ||
                url.includes('professional_account')) {

                const clone = response.clone();
                const data = await clone.json();

                const extracted = extractInstagramApiData(data);
                if (Object.keys(extracted).length > 0) {
                    (window as any).__creatorOS_instagramData = extracted;
                    console.log("Creator OS: Intercepted Instagram API data");
                }
            }
        } catch (e) {
            // Ignore errors
        }

        return response;
    };
})();

function extractInstagramApiData(data: any): { [key: string]: any } {
    const extracted: { [key: string]: any } = {};

    try {
        // Instagram GraphQL response structure
        if (data?.data?.user) {
            const user = data.data.user;
            extracted.api_followers = user.edge_followed_by?.count;
            extracted.api_following = user.edge_follow?.count;
            extracted.api_posts = user.edge_owner_to_timeline_media?.count;
        }

        // Insights API structure
        if (data?.organic_metrics) {
            extracted.api_reach = data.organic_metrics.reach;
            extracted.api_impressions = data.organic_metrics.impressions;
            extracted.api_engagement = data.organic_metrics.engagement;
        }

        // Alternative structure
        if (data?.insights) {
            extracted.api_reach = data.insights.accounts_reached;
            extracted.api_engagement = data.insights.accounts_engaged;
        }
    } catch (e) {
        // Ignore
    }

    return extracted;
}

function trySelectors(selectors: string[]): number | string {
    for (const selector of selectors) {
        try {
            // Handle :contains pseudo-selector manually
            if (selector.includes(':contains')) {
                const match = selector.match(/(.+):contains\("(.+)"\)\s*\+\s*(.+)/);
                if (match) {
                    const elements = document.querySelectorAll(match[1]);
                    for (const el of elements) {
                        if (el.textContent?.includes(match[2])) {
                            const sibling = el.nextElementSibling;
                            if (sibling?.matches(match[3])) {
                                return parseMetricValue(sibling.textContent || '');
                            }
                        }
                    }
                }
            } else {
                const el = document.querySelector(selector);
                if (el?.textContent) {
                    return parseMetricValue(el.textContent);
                }
            }
        } catch (e) {
            // Invalid selector, skip
        }
    }
    return 0;
}

function parseMetricValue(text: string): number {
    if (!text) return 0;

    const cleaned = text.replace(/[^0-9.KMBkmb,]/g, '').replace(',', '.').toUpperCase();

    let value = parseFloat(cleaned) || 0;

    if (cleaned.includes('K')) value *= 1000;
    else if (cleaned.includes('M')) value *= 1000000;
    else if (cleaned.includes('B')) value *= 1000000000;

    return Math.round(value);
}

export { };
