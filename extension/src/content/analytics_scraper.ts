// Detect if we are on LinkedIn Analytics Page
if (window.location.href.includes("linkedin.com/dashboard")) {
    console.log("Creator OS: LinkedIn Analytics Detected");

    // Periodically scrape the numbers (LinkedIn DOM changes, so use robust selectors)
    setInterval(() => {
        try {
            // Robust selector references (Update these based on actual LinkedIn DOM)
            // Strategy: Look for specific aria-labels or data-attributes if classes are obfuscated
            const viewsElement = document.querySelector('.analytics-value-views') || document.querySelector('[aria-label="Views"]');
            const likesElement = document.querySelector('.analytics-value-likes') || document.querySelector('[aria-label="Likes"]');
            const commentsElement = document.querySelector('.analytics-value-comments') || document.querySelector('[aria-label="Comments"]');
            const sharesElement = document.querySelector('.analytics-value-shares') || document.querySelector('[aria-label="Shares"]');

            const parseMetric = (el: Element | null) => {
                if (!el || !el.textContent) return 0;
                return parseInt(el.textContent.replace(/[^0-9]/g, '') || '0');
            };

            const views = parseMetric(viewsElement);
            const likes = parseMetric(likesElement);
            const comments = parseMetric(commentsElement);
            const shares = parseMetric(sharesElement);

            if (views > 0) {
                console.log("Creator OS: Scraped metrics", { views, likes, comments, shares });
                chrome.runtime.sendMessage({
                    action: "SYNC_ANALYTICS",
                    payload: {
                        posted_url: window.location.href,
                        views: views,
                        likes: likes,
                        comments: comments,
                        shares: shares,
                        platform: "linkedin"
                    }
                });
            }
        } catch (e) {
            console.error("Creator OS: Scraping error", e);
        }
    }, 10000); // Check every 10 seconds
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
