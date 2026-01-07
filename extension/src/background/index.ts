/**
 * Creator OS Background Service Worker
 * Handles analytics sync with proper authentication
 */

console.log("Creator OS Background Service Started v2.2");

// API Configuration - Change this for production
const API_BASE = "http://localhost:8000/api/v1";
// Must match AuthService key version
const TOKEN_KEY = "creator_os_token_v2";

// Connection state management
let isBackendOnline = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const RETRY_QUEUE: Array<() => Promise<void>> = [];

/**
 * Check if backend is online
 */
async function checkBackendHealth(): Promise<boolean> {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL && isBackendOnline) {
    return isBackendOnline;
  }

  try {
    const res = await fetch(`${API_BASE.replace("/api/v1", "")}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    isBackendOnline = res.ok;
    lastHealthCheck = now;
    if (isBackendOnline) {
      console.log("✅ Backend online");
      // Process retry queue
      processRetryQueue();
    }
  } catch {
    isBackendOnline = false;
    lastHealthCheck = now;
  }
  return isBackendOnline;
}

/**
 * Process queued operations when backend comes online
 */
async function processRetryQueue() {
  while (RETRY_QUEUE.length > 0 && isBackendOnline) {
    const operation = RETRY_QUEUE.shift();
    try {
      await operation?.();
    } catch {
      // Silently continue
    }
  }
}

/**
 * Get auth token from storage
 */
async function getAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([TOKEN_KEY], (result) => {
      const token = result[TOKEN_KEY];
      resolve(typeof token === "string" ? token : null);
    });
  });
}

/**
 * Get auth headers
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Periodic health check
setInterval(checkBackendHealth, HEALTH_CHECK_INTERVAL);
checkBackendHealth(); // Initial check

chrome.runtime.onMessage.addListener(
  (
    msg: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ) => {
    // Narrow the incoming message safely
    const incoming = msg as {
      action?: string;
      payload?: Record<string, unknown>;
    };
    // Legacy sync (backwards compatibility)
    if (incoming.action === "SYNC_ANALYTICS") {
      console.log("Syncing analytics...", incoming.payload);

      (async () => {
        try {
          const headers = await getAuthHeaders();
          const res = await fetch(`${API_BASE}/analytics/sync`, {
            method: "POST",
            headers,
            body: JSON.stringify(incoming.payload),
          });
          const data = await res.json();
          console.log("Sync result:", data);
          sendResponse({ success: true, data });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("Sync failed:", errMsg);
          sendResponse({ success: false, error: errMsg });
        }
      })();

      return true;
    }

    // Authenticated scraped analytics sync
    if (incoming.action === "SYNC_SCRAPED_ANALYTICS") {
      const scrapedPayload =
        (incoming.payload as Record<string, unknown>) || {};
      console.log(
        `Syncing scraped ${(scrapedPayload["platform"] as string) || "unknown"} analytics...`,
        scrapedPayload,
      );

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
            method: "POST",
            headers,
            body: JSON.stringify(incoming.payload),
          });

          if (res.status === 401) {
            console.error("Auth expired - need to login again");
            sendResponse({ success: false, error: "Session expired" });
            return;
          }

          const data = await res.json();
          console.log(
            `${((incoming.payload as Record<string, unknown>).platform as string) || "unknown"} sync result:`,
            data,
          );
          sendResponse({ success: true, data });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const platform =
            ((incoming.payload as Record<string, unknown>)[
              "platform"
            ] as string) || "unknown";
          console.error(`${platform} sync failed:`, errMsg);
          sendResponse({ success: false, error: errMsg });
        }
      })();

      return true;
    }

    // Universal page scraping
    if (incoming.action === "SYNC_SCRAPED_PAGE") {
      const pagePayload = (incoming.payload as Record<string, unknown>) || {};
      console.log(
        `Syncing scraped page: ${(pagePayload["title"] as string) || "Untitled"}...`,
      );

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
          const payload = (incoming.payload as Record<string, unknown>) || {};
          const backendPayload = {
            url: (payload["url"] as string) || "",
            title: (payload["title"] as string) || "Untitled",
            page_type: (payload["page_type"] as string) || "general",
            platform: (payload["platform"] as string) || null,
            scraped_content: {
              visible_text: (payload["visible_text"] as string) || "",
            },
            detected_metrics:
              (payload["metrics"] as Record<string, unknown>) || {},
            scraped_at:
              (payload["timestamp"] as string) || new Date().toISOString(),
          };

          const res = await fetch(`${API_BASE}/scrape/page`, {
            method: "POST",
            headers,
            body: JSON.stringify(backendPayload),
          });

          if (res.status === 401) {
            console.error("Auth expired - need to login again");
            sendResponse({ success: false, error: "Session expired" });
            return;
          }

          const data = await res.json();
          console.log(`Page sync result:`, data);
          sendResponse({ success: true, data });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`Page sync failed:`, errMsg);
          sendResponse({ success: false, error: errMsg });
        }
      })();

      return true;
    }

    // Screen capture
    if (incoming.action === "CAPTURE_SCREEN") {
      console.log("Capturing screen...");
      const windowId = sender.tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
      chrome.tabs.captureVisibleTab(
        windowId,
        { format: "jpeg", quality: 50 },
        (dataUrl) => {
          console.log("Screen captured!");
          sendResponse({ image: dataUrl });
        },
      );
      return true;
    }

    // Profile analysis
    if (incoming.action === "ANALYZE_PROFILE") {
      console.log("Bg: Analyzing Profile...");

      (async () => {
        try {
          // Find the active tab
          const [activeTab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (!activeTab?.id) {
            sendResponse({ error: "No active tab found" });
            return;
          }

          // Ask Content Script to extract data
          chrome.tabs.sendMessage(
            activeTab.id,
            { action: "EXTRACT_PROFILE_DATA" },
            async (extractionRes) => {
              if (!extractionRes || !extractionRes.success) {
                sendResponse({
                  error: "Failed to read profile. Refresh page.",
                });
                return;
              }

              // Send to backend with auth
              try {
                const headers = await getAuthHeaders();
                const res = await fetch(`${API_BASE}/stream/profile`, {
                  method: "POST",
                  headers,
                  body: JSON.stringify({
                    profile_data: extractionRes.payload,
                  }),
                });
                const data = await res.json();
                sendResponse({ result: data });
              } catch (e: unknown) {
                const errMsg = e instanceof Error ? e.message : String(e);
                console.error("Bg: API Error", errMsg);
                sendResponse({ error: "Backend error: " + errMsg });
              }
            },
          );
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          sendResponse({ error: errMsg });
        }
      })();

      return true;
    }

    // Get auth status
    if (incoming.action === "GET_AUTH_STATUS") {
      (async () => {
        const token = await getAuthToken();
        sendResponse({ authenticated: !!token });
      })();
      return true;
    }

    // Logout
    if (incoming.action === "LOGOUT") {
      chrome.storage.local.remove([TOKEN_KEY, "creator_os_user"], () => {
        console.log("Logged out - cleared auth data");
        sendResponse({ success: true });
      });
      return true;
    }

    // Real-time post analysis
    if (incoming.action === "ANALYZE_POST_IMAGE") {
      console.log("Analyzing post image...");

      (async () => {
        try {
          const token = await getAuthToken();
          const headers: HeadersInit = {
            "Content-Type": "application/json",
          };
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const res = await fetch(`${API_BASE}/analyze/post`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              image_base64: (incoming.payload as Record<string, unknown>)
                ?.image_base64 as string | undefined,
              caption:
                ((incoming.payload as Record<string, unknown>)
                  ?.caption as string) || "",
              platform:
                ((incoming.payload as Record<string, unknown>)
                  ?.platform as string) || "instagram",
            }),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            sendResponse({
              success: false,
              error: errorData.detail || `Analysis failed: ${res.status}`,
            });
            return;
          }

          const data = await res.json();
          console.log("Post analysis result:", data);
          sendResponse({ success: true, data });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("Post analysis failed:", errMsg);
          sendResponse({ success: false, error: errMsg });
        }
      })();

      return true;
    }
  },
);

// On install, open onboarding
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Creator OS installed!");
    // Could open welcome page here
  }
});
