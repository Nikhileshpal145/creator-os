/**
 * LinkedIn Analytics Scraper
 * Works on: Profiles, Posts, Analytics Dashboard
 */

const isLinkedIn = window.location.hostname.includes('linkedin.com');

if (isLinkedIn) {
    console.log("Creator OS: LinkedIn Detected 💼");

    let scrapeAttempts = 0;
    const maxAttempts = 10;

    const scrapeLinkedInData = () => {
        try {
            console.log("Creator OS: Attempting to scrape LinkedIn data...");

            const metrics: { [key: string]: any } = {};
            const pageUrl = window.location.href;

            // === DETECT PAGE TYPE ===
            const isProfilePage = pageUrl.includes('/in/');
            const isAnalyticsDashboard = pageUrl.includes('/dashboard') || pageUrl.includes('/analytics');

            // === PROFILE PAGE SCRAPING ===
            if (isProfilePage) {
                // Follower count
                const followerSelectors = [
                    '[href*="followers"] span',
                    '.pv-top-card--entity-list li:nth-child(2) span',
                    'span[class*="follower"]'
                ];
                for (const selector of followerSelectors) {
                    const el = document.querySelector(selector);
                    if (el?.textContent) {
                        const match = el.textContent.match(/[\d,]+/);
                        if (match) {
                            metrics.followers = parseMetricValue(match[0]);
                            break;
                        }
                    }
                }

                // Connections count
                const connectionEl = document.querySelector('[href*="connections"] span, .pv-top-card--connections span');
                if (connectionEl?.textContent) {
                    const match = connectionEl.textContent.match(/[\d,]+/);
                    if (match) {
                        metrics.connections = parseMetricValue(match[0]);
                    }
                }

                // Profile name (for identification)
                const nameEl = document.querySelector('h1.text-heading-xlarge, h1.inline');
                if (nameEl?.textContent) {
                    metrics.profile_name = nameEl.textContent.trim();
                }
            }

            // === ANALYTICS DASHBOARD SCRAPING ===
            if (isAnalyticsDashboard) {
                const viewsEl = document.querySelector('[aria-label*="Views"], .analytics-value-views');
                const impressionsEl = document.querySelector('[aria-label*="Impressions"], .analytics-value-impressions');

                if (viewsEl?.textContent) {
                    metrics.views = parseMetricValue(viewsEl.textContent);
                }
                if (impressionsEl?.textContent) {
                    metrics.impressions = parseMetricValue(impressionsEl.textContent);
                }
            }

            // === FEED/POST STATS ===
            // Try to get post engagement from visible posts
            const postElements = document.querySelectorAll('.feed-shared-update-v2, [data-urn*="activity"]');
            if (postElements.length > 0) {
                let totalLikes = 0;
                let totalComments = 0;
                let postCount = 0;

                postElements.forEach((post, index) => {
                    if (index >= 5) return; // Limit to first 5 posts

                    const likesEl = post.querySelector('[aria-label*="reaction"], .social-details-social-counts__reactions-count');
                    const commentsEl = post.querySelector('[aria-label*="comment"], .social-details-social-counts__comments');

                    if (likesEl?.textContent) {
                        totalLikes += parseMetricValue(likesEl.textContent);
                        postCount++;
                    }
                    if (commentsEl?.textContent) {
                        totalComments += parseMetricValue(commentsEl.textContent);
                    }
                });

                if (postCount > 0) {
                    metrics.post_engagement = {
                        total_likes: totalLikes,
                        total_comments: totalComments,
                        posts_analyzed: postCount,
                        avg_likes: Math.round(totalLikes / postCount)
                    };
                }
            }

            // === SYNC IF WE GOT DATA ===
            if (Object.keys(metrics).length > 0) {
                console.log("Creator OS: Scraped LinkedIn metrics", metrics);

                chrome.runtime.sendMessage({
                    action: "SYNC_SCRAPED_ANALYTICS",
                    payload: {
                        platform: "linkedin",
                        url: pageUrl,
                        metrics: metrics,
                        scraped_at: new Date().toISOString()
                    }
                });

                return true;
            } else {
                console.log("Creator OS: No LinkedIn metrics found yet, will retry...");
                return false;
            }

        } catch (e) {
            console.error("Creator OS: LinkedIn scraping error", e);
            return false;
        }
    };

    // Retry logic - LinkedIn loads data dynamically
    const attemptScrape = () => {
        scrapeAttempts++;
        const success = scrapeLinkedInData();

        if (!success && scrapeAttempts < maxAttempts) {
            setTimeout(attemptScrape, 2000);
        } else if (success) {
            console.log("Creator OS: LinkedIn scraping complete ✅");
        } else {
            console.log("Creator OS: Could not scrape LinkedIn after max attempts");
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

function parseMetricValue(text: string): number {
    if (!text) return 0;
    const cleaned = text.replace(/[^0-9.KMBkmb,]/g, '').toUpperCase();
    let value = parseFloat(cleaned.replace(',', '')) || 0;
    if (cleaned.includes('K')) value *= 1000;
    else if (cleaned.includes('M')) value *= 1000000;
    else if (cleaned.includes('B')) value *= 1000000000;
    return Math.round(value);
}

// === NEW: Profile Analysis (DOM Listener) ===
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "EXTRACT_PROFILE_DATA") {
        console.log("Creator OS: Extracting profile data...");
        try {
            const data = extractProfileData();
            sendResponse({ success: true, payload: data });
        } catch (e: any) {
            console.error("Creator OS: Extraction failed", e);
            sendResponse({ success: false, error: e.message });
        }
        return true; // Keep channel open
    }
});

function extractProfileData() {
    // 1. Basic Info
    const h1 = document.querySelector("h1") as HTMLElement;
    const name = h1?.innerText || "Unknown Creator";

    // Try multiple selectors for headline/bio
    const headlineEl = (document.querySelector(".text-body-medium") || document.querySelector("[data-generated-suggestion-target]")) as HTMLElement;
    const headline = headlineEl?.innerText || "";

    // 2. Extract Recent Posts (Limit to top 5)
    // Selector for feed updates: .feed-shared-update-v2
    const posts = Array.from(document.querySelectorAll(".feed-shared-update-v2"))
        .slice(0, 5)
        .map((post: any) => {
            // Text content
            const textElement = (post.querySelector(".feed-shared-update-v2__description")
                || post.querySelector(".update-components-text span[dir='ltr']")) as HTMLElement;
            const text = textElement?.innerText?.slice(0, 500) || "";

            // Engagement metrics (Likes)
            const likesElement = (post.querySelector("[aria-label*='reaction']")
                || post.querySelector(".social-details-social-counts__reactions-count")) as HTMLElement;
            const likes = likesElement?.innerText?.replace(/[^0-9]/g, '') || "0";

            return {
                text: text,
                likes: parseInt(likes),
                date: "Recently" // Timestamp is hard to parse reliably without moment.js
            };
        })
        .filter(p => p.text.length > 10); // Filter empty posts

    console.log("Creator OS: Extracted", { name, headline, postCount: posts.length });

    return {
        name,
        headline,
        posts,
        platform: "linkedin",
        url: window.location.href
    };
}
