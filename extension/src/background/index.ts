/**
 * Creator OS Background Service Worker
 * Handles analytics sync with proper authentication
 */

console.log("Creator OS Background Service Started v2.0");

const API_BASE = 'http://localhost:8000/api/v1';
const TOKEN_KEY = 'creator_os_token';

/**
 * Get auth token from storage
 */
async function getAuthToken(): Promise<string | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get([TOKEN_KEY], (result) => {
            const token = result[TOKEN_KEY];
            resolve(typeof token === 'string' ? token : null);
        });
    });
}

/**
 * Get auth headers
 */
async function getAuthHeaders(): Promise<HeadersInit> {
    const token = await getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

chrome.runtime.onMessage.addListener((msg: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    // Legacy sync (backwards compatibility)
    if (msg.action === "SYNC_ANALYTICS") {
        console.log("Syncing analytics...", msg.payload);

        (async () => {
            try {
                const headers = await getAuthHeaders();
                const res = await fetch(`${API_BASE}/analytics/sync`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(msg.payload)
                });
                const data = await res.json();
                console.log("Sync result:", data);
                sendResponse({ success: true, data });
            } catch (err: any) {
                console.error("Sync failed:", err);
                sendResponse({ success: false, error: err.message });
            }
        })();

        return true;
    }

    // Authenticated scraped analytics sync
    if (msg.action === "SYNC_SCRAPED_ANALYTICS") {
        console.log(`Syncing scraped ${msg.payload.platform} analytics...`, msg.payload);

        (async () => {
            try {
                const token = await getAuthToken();

                if (!token) {
                    console.warn("No auth token - user needs to login");
                    sendResponse({ success: false, error: "Not authenticated" });
                    return;
                }

                const headers = await getAuthHeaders();

                // No need to send user_id - backend extracts from token
                const res = await fetch(`${API_BASE}/analytics/sync/scraped`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(msg.payload)
                });

                if (res.status === 401) {
                    console.error("Auth expired - need to login again");
                    sendResponse({ success: false, error: "Session expired" });
                    return;
                }

                const data = await res.json();
                console.log(`${msg.payload.platform} sync result:`, data);
                sendResponse({ success: true, data });
            } catch (err: any) {
                console.error(`${msg.payload.platform} sync failed:`, err);
                sendResponse({ success: false, error: err.message });
            }
        })();

        return true;
    }

    // Universal page scraping
    if (msg.action === "SYNC_SCRAPED_PAGE") {
        console.log(`Syncing scraped page: ${msg.payload.title}...`);

        (async () => {
            try {
                const token = await getAuthToken();

                if (!token) {
                    console.warn("No auth token - user needs to login");
                    sendResponse({ success: false, error: "Not authenticated" });
                    return;
                }

                const headers = await getAuthHeaders();

                // Transform payload to match backend schema
                const backendPayload = {
                    url: msg.payload.url,
                    title: msg.payload.title || 'Untitled',
                    page_type: msg.payload.page_type || 'general',
                    platform: msg.payload.platform || null,
                    scraped_content: { visible_text: msg.payload.visible_text || '' },
                    detected_metrics: msg.payload.metrics || {},
                    scraped_at: msg.payload.timestamp || new Date().toISOString()
                };

                const res = await fetch(`${API_BASE}/scrape/page`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(backendPayload)
                });

                if (res.status === 401) {
                    console.error("Auth expired - need to login again");
                    sendResponse({ success: false, error: "Session expired" });
                    return;
                }

                const data = await res.json();
                console.log(`Page sync result:`, data);
                sendResponse({ success: true, data });
            } catch (err: any) {
                console.error(`Page sync failed:`, err);
                sendResponse({ success: false, error: err.message });
            }
        })();

        return true;
    }

    // Screen capture
    if (msg.action === "CAPTURE_SCREEN") {
        console.log("Capturing screen...");
        const windowId = sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
        chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 50 }, (dataUrl) => {
            console.log("Screen captured!");
            sendResponse({ image: dataUrl });
        });
        return true;
    }

    // Profile analysis
    if (msg.action === "ANALYZE_PROFILE") {
        console.log("Bg: Analyzing Profile...");

        (async () => {
            try {
                // Find the active tab
                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!activeTab?.id) {
                    sendResponse({ error: "No active tab found" });
                    return;
                }

                // Ask Content Script to extract data
                chrome.tabs.sendMessage(activeTab.id, { action: "EXTRACT_PROFILE_DATA" }, async (extractionRes) => {
                    if (!extractionRes || !extractionRes.success) {
                        sendResponse({ error: "Failed to read profile. Refresh page." });
                        return;
                    }

                    // Send to backend with auth
                    try {
                        const headers = await getAuthHeaders();
                        const res = await fetch(`${API_BASE}/analyze/profile`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                profile_data: extractionRes.payload
                            })
                        });
                        const data = await res.json();
                        sendResponse({ result: data });
                    } catch (e: any) {
                        console.error("Bg: API Error", e);
                        sendResponse({ error: "Backend error: " + e.message });
                    }
                });
            } catch (err: any) {
                sendResponse({ error: err.message });
            }
        })();

        return true;
    }

    // Get auth status
    if (msg.action === "GET_AUTH_STATUS") {
        (async () => {
            const token = await getAuthToken();
            sendResponse({ authenticated: !!token });
        })();
        return true;
    }

    // Logout
    if (msg.action === "LOGOUT") {
        chrome.storage.local.remove([TOKEN_KEY, 'creator_os_user'], () => {
            console.log("Logged out - cleared auth data");
            sendResponse({ success: true });
        });
        return true;
    }
});

// On install, open onboarding
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Creator OS installed!');
        // Could open welcome page here
    }
});
