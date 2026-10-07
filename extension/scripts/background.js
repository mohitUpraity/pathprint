const PROD_API_URL = "https://pathprintv5.onrender.com/api/v1";
const LOCAL_API_URL = "http://localhost:8000/api/v1";

async function getApiBase() {
  try {
    const stored = await chrome.storage.local.get(["apiUrl"]);
    if (stored.apiUrl) return stored.apiUrl;
    
    // Auto-probe localhost with 800ms timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${LOCAL_API_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) return LOCAL_API_URL;
  } catch (e) {
    // Fall back to production
  }
  return PROD_API_URL;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("PathPrint Extension Installed & Ready.");
  chrome.storage.local.set({
    apiUrl: PROD_API_URL
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      const apiBase = await getApiBase();
      
      const storedUser = await chrome.storage.local.get(["userId"]);
      const effectiveUserId = request.userId || storedUser.userId || "4JzJQX61eshV7BAfG1OxHTBY0Xp2";

      if (request.action === "HEALTH_CHECK") {
        try {
          const res = await fetch(`${apiBase}/health`);
          const data = await res.json();
          sendResponse({ success: true, data, apiBase });
        } catch (err) {
          sendResponse({ success: false, error: err.message, apiBase });
        }
      } else if (request.action === "INGEST_POSTS_TEXT") {
        const formData = new FormData();
        formData.append("posts_text", request.postsText);

        const res = await fetch(`${apiBase}/ingest/linkedin/posts`, {
          method: "POST",
          headers: {
            "x-user-id": effectiveUserId
          },
          body: formData
        });
        const data = await res.json();
        sendResponse({ success: true, data });
      } else if (request.action === "ANALYZE_JOB") {
        const res = await fetch(`${apiBase}/matches/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": effectiveUserId
          },
          body: JSON.stringify({
            job_description: request.jobDescription,
            company_override: request.company,
            role_override: request.title
          })
        });
        const data = await res.json();
        sendResponse({ success: true, data });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true;
});
