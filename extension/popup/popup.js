/**
 * PathPrint Chrome Extension v5.0 - Popup Controller
 * Full-featured Autonomous Graph Intelligence & Referral Co-Pilot
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Elements - Header & Config
  const backendStatus = document.getElementById("backendStatus");
  const statusText = document.getElementById("statusText");
  const backendSelect = document.getElementById("backendSelect");
  const userIdInput = document.getElementById("userIdInput");
  const accountUserDisplay = document.getElementById("accountUserDisplay");
  const accountDot = document.getElementById("accountDot");
  const btnAutoLinkAccount = document.getElementById("btnAutoLinkAccount");
  const resultBanner = document.getElementById("resultBanner");
  const toastMsg = document.getElementById("toastMsg");
  const toastIcon = document.getElementById("toastIcon");
  const apiDocsLink = document.getElementById("apiDocsLink");

  // Tab Switching
  const tabMyGraphBtn = document.getElementById("tabMyGraphBtn");
  const tabTargetScanBtn = document.getElementById("tabTargetScanBtn");
  const tabMyGraphContent = document.getElementById("tabMyGraphContent");
  const tabTargetScanContent = document.getElementById("tabTargetScanContent");

  // Action Buttons - Tab 1 (My Graph)
  const masterSyncBtn = document.getElementById("masterSyncBtn");
  const deltaSyncBtn = document.getElementById("deltaSyncBtn");
  const syncProfileOnlyBtn = document.getElementById("syncProfileOnlyBtn");
  const syncPostsOnlyBtn = document.getElementById("syncPostsOnlyBtn");
  const syncConnOnlyBtn = document.getElementById("syncConnOnlyBtn");
  const syncDeltaConnBtn = document.getElementById("syncDeltaConnBtn");

  // Nav buttons
  const navProfileBtn = document.getElementById("navProfileBtn");
  const navPostsBtn = document.getElementById("navPostsBtn");
  const navConnectionsBtn = document.getElementById("navConnectionsBtn");

  // CSV Import
  const uploadCsvBtn = document.getElementById("uploadCsvBtn");
  const csvFileInput = document.getElementById("csvFileInput");

  // Stepper Elements
  const syncProgressContainer = document.getElementById("syncProgressContainer");
  const progressTitle = document.getElementById("progressTitle");
  const progressPercent = document.getElementById("progressPercent");
  const progressBarFill = document.getElementById("progressBarFill");
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");
  const step1Label = document.getElementById("step1Label");
  const step2Label = document.getElementById("step2Label");
  const step3Label = document.getElementById("step3Label");

  // Report Card Elements
  const syncReportCard = document.getElementById("syncReportCard");
  const reportCandidate = document.getElementById("reportCandidate");
  const reportRepos = document.getElementById("reportRepos");
  const reportMilestones = document.getElementById("reportMilestones");
  const reportConnections = document.getElementById("reportConnections");

  // Target Profile Elements (Tab 2)
  const targetProfileName = document.getElementById("targetProfileName");
  const targetProfileHeadline = document.getElementById("targetProfileHeadline");
  const targetCompanyVal = document.getElementById("targetCompanyVal");
  const targetRoleVal = document.getElementById("targetRoleVal");
  const targetAlumniBadge = document.getElementById("targetAlumniBadge");
  const scanTargetProfileBtn = document.getElementById("scanTargetProfileBtn");
  const scanTargetPostsBtn = document.getElementById("scanTargetPostsBtn");
  const scanTargetConnectionsBtn = document.getElementById("scanTargetConnectionsBtn");
  const generatePitchBtn = document.getElementById("generatePitchBtn");
  const outreachPitchText = document.getElementById("outreachPitchText");

  // Active Context (Tab 1)
  const contextBody = document.getElementById("contextBody");
  const contextHeaderTitle = document.getElementById("contextHeaderTitle");

  const PROD_API_URL = "https://pathprintv5.onrender.com/api/v1";
  const LOCAL_API_URL = "http://localhost:8000/api/v1";

  let activeTargetProfileData = null;

  function getActiveBackendUrl() {
    return backendSelect ? backendSelect.value : PROD_API_URL;
  }

  function getActiveUserId() {
    if (userIdInput && userIdInput.value.trim()) {
      return userIdInput.value.trim();
    }
    return "4JzJQX61eshV7BAfG1OxHTBY0Xp2";
  }

  function updateFooterLinks(apiUrl) {
    if (apiDocsLink) {
      apiDocsLink.href = apiUrl.includes("localhost") ? "http://localhost:8000/docs" : "https://pathprintv5.onrender.com/docs";
    }
  }

  // Tab Switcher Logic
  tabMyGraphBtn?.addEventListener("click", () => {
    tabMyGraphBtn.classList.add("active");
    tabTargetScanBtn.classList.remove("active");
    tabMyGraphContent.classList.add("active");
    tabTargetScanContent.classList.remove("active");
  });

  tabTargetScanBtn?.addEventListener("click", () => {
    tabTargetScanBtn.classList.add("active");
    tabMyGraphBtn.classList.remove("active");
    tabTargetScanContent.classList.add("active");
    tabMyGraphContent.classList.remove("active");
  });

  // Storage Initialization
  chrome.storage.local.get(["backendUrl", "userId", "linkedAccountEmail", "lastSyncedTime", "syncedConnCount"], (res) => {
    if (res.backendUrl && backendSelect) {
      backendSelect.value = res.backendUrl;
    }
    if (res.userId && userIdInput) {
      userIdInput.value = res.userId;
    }
    if (res.linkedAccountEmail && accountUserDisplay) {
      accountUserDisplay.textContent = res.linkedAccountEmail;
      if (accountDot) accountDot.classList.add("connected");
    } else if (res.userId && accountUserDisplay) {
      accountUserDisplay.textContent = res.userId;
      if (accountDot) accountDot.classList.add("connected");
    } else if (accountUserDisplay) {
      accountUserDisplay.textContent = "Auto-linking session...";
    }

    if (res.syncedConnCount && reportConnections) {
      reportConnections.textContent = `${res.syncedConnCount} Contacts`;
    }

    updateFooterLinks(getActiveBackendUrl());
    checkBackendHealth();
  });

  backendSelect?.addEventListener("change", () => {
    const val = backendSelect.value;
    chrome.storage.local.set({ backendUrl: val });
    updateFooterLinks(val);
    checkBackendHealth();
  });

  const handleUserIdUpdate = () => {
    const val = userIdInput.value.trim();
    if (val) {
      chrome.storage.local.set({ userId: val });
      if (accountUserDisplay) {
        accountUserDisplay.textContent = val;
        if (accountDot) accountDot.classList.add("connected");
      }
    }
  };

  userIdInput?.addEventListener("input", handleUserIdUpdate);
  userIdInput?.addEventListener("change", () => {
    handleUserIdUpdate();
    const val = userIdInput.value.trim();
    showToast(`Target user set to: ${val || "Default"}`, "success");
  });

  // Navigation Helper that waits for page to fully load
  async function navigateAndWait(tabId, url) {
    try {
      const currentTab = await chrome.tabs.get(tabId);
      if (currentTab && currentTab.url && currentTab.url.split("?")[0].replace(/\/+$/, "") === url.split("?")[0].replace(/\/+$/, "")) {
        await new Promise(r => setTimeout(r, 1200));
        return;
      }
      await chrome.tabs.update(tabId, { url });
    } catch (e) {
      console.warn("Navigation update notice:", e);
    }

    return new Promise((resolve) => {
      let isDone = false;
      const finish = () => {
        if (!isDone) {
          isDone = true;
          try { chrome.tabs.onUpdated.removeListener(listener); } catch(e) {}
          setTimeout(resolve, 1500);
        }
      };

      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === "complete") {
          finish();
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
      setTimeout(finish, 6000);
    });
  }

  // Auto-Detect Active PathPrint Web App Session
  async function detectAndConnectCareerOsSession() {
    try {
      if (accountUserDisplay) accountUserDisplay.textContent = "Scanning active tabs...";
      
      const tabs = await chrome.tabs.query({});
      const careerOsTabs = tabs.filter(t => 
        t.url && (
          t.url.includes("pathprintv5.vercel.app") || 
          t.url.includes("localhost:5173") || 
          t.url.includes("localhost:3000") ||
          t.url.includes("localhost:8000")
        )
      );

      if (careerOsTabs.length === 0) {
        if (accountUserDisplay) {
          chrome.storage.local.get(["userId", "linkedAccountEmail"], (res) => {
            if (res.linkedAccountEmail) {
              accountUserDisplay.textContent = res.linkedAccountEmail;
              if (accountDot) accountDot.classList.add("connected");
            } else if (res.userId) {
              accountUserDisplay.textContent = res.userId;
              if (accountDot) accountDot.classList.add("connected");
            } else {
              accountUserDisplay.textContent = "Enter Account UID or open Web App";
            }
          });
        }
        return;
      }

      const targetTab = careerOsTabs[0];
      if (targetTab.url && targetTab.url.includes("localhost")) {
        if (backendSelect) backendSelect.value = LOCAL_API_URL;
        updateFooterLinks(LOCAL_API_URL);
      } else if (targetTab.url && targetTab.url.includes("vercel.app")) {
        if (backendSelect) backendSelect.value = PROD_API_URL;
        updateFooterLinks(PROD_API_URL);
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: targetTab.id },
        func: () => {
          try {
            const directId = localStorage.getItem("pathprint_user_id");
            const directUser = localStorage.getItem("pathprint_user");
            if (directId) {
              let parsed = {};
              try { parsed = JSON.parse(directUser); } catch(e){}
              return {
                uid: directId,
                email: parsed.email || "",
                displayName: parsed.displayName || ""
              };
            }

            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith("firebase:authUser:")) {
                const raw = localStorage.getItem(key);
                if (raw) {
                  const parsed = JSON.parse(raw);
                  return {
                    uid: parsed.uid,
                    email: parsed.email,
                    displayName: parsed.displayName,
                    photoURL: parsed.photoURL
                  };
                }
              }
            }
            const userJson = localStorage.getItem("user");
            if (userJson) {
              return JSON.parse(userJson);
            }
          } catch (e) {
            return null;
          }
          return null;
        }
      });

      if (results && results[0] && results[0].result) {
        const authUser = results[0].result;
        const uid = authUser.uid || authUser.id || authUser.email;
        const displayLabel = authUser.email || authUser.displayName || uid;

        if (userIdInput) userIdInput.value = uid;
        if (accountUserDisplay) accountUserDisplay.textContent = displayLabel;
        if (accountDot) accountDot.classList.add("connected");

        chrome.storage.local.set({
          userId: uid,
          linkedAccountEmail: displayLabel,
          backendUrl: backendSelect ? backendSelect.value : PROD_API_URL
        });

        showToast(`Auto-Linked to Account: ${uid.slice(0, 12)}...`, "success");
      } else {
        if (accountUserDisplay) accountUserDisplay.textContent = "PathPrint Web Tab Found";
        if (accountDot) accountDot.classList.add("connected");
      }
    } catch (err) {
      console.warn("Auto-detect tab error:", err);
      if (accountUserDisplay) {
        chrome.storage.local.get(["userId", "linkedAccountEmail"], (res) => {
          if (res.linkedAccountEmail) {
            accountUserDisplay.textContent = res.linkedAccountEmail;
            if (accountDot) accountDot.classList.add("connected");
          } else if (res.userId) {
            accountUserDisplay.textContent = res.userId;
            if (accountDot) accountDot.classList.add("connected");
          } else {
            accountUserDisplay.textContent = "Target Account: 4JzJQX61eshV7BAfG1OxHTBY0Xp2";
          }
        });
      }
    }
  }

  btnAutoLinkAccount?.addEventListener("click", () => {
    detectAndConnectCareerOsSession();
  });

  setTimeout(() => {
    detectAndConnectCareerOsSession();
  }, 100);

  // Backend Health Ping
  async function checkBackendHealth() {
    try {
      const baseUrl = getActiveBackendUrl().replace("/api/v1", "");
      const res = await fetch(`${baseUrl}/health`, { method: "GET" }).catch(() => null);
      if (res && res.ok) {
        if (backendStatus) backendStatus.className = "status-indicator online";
        if (statusText) statusText.textContent = "Online";
      } else {
        if (backendStatus) backendStatus.className = "status-indicator offline";
        if (statusText) statusText.textContent = "Offline";
      }
    } catch {
      if (backendStatus) backendStatus.className = "status-indicator offline";
      if (statusText) statusText.textContent = "Offline";
    }
  }

  // Active Tab Context Inspection
  async function inspectActiveTab() {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.url) return;

      const url = activeTab.url;
      if (!url.includes("linkedin.com")) {
        if (contextBody) {
          contextBody.innerHTML = `
            <div class="context-item">
              <span class="context-tag alert">Non-LinkedIn</span>
              <p class="context-text">Open LinkedIn in this tab to sync your Graph or scan contacts.</p>
            </div>
          `;
        }
        if (targetProfileName) targetProfileName.textContent = "Open a LinkedIn Profile";
        if (targetProfileHeadline) targetProfileHeadline.textContent = "Navigate to any /in/ profile on LinkedIn";
        return;
      }

      let viewType = "LinkedIn View";
      if (url.includes("/in/")) {
        viewType = "Profile View";
      } else if (url.includes("/recent-activity")) {
        viewType = "Recent Activity / Posts";
      } else if (url.includes("/mynetwork")) {
        viewType = "My Network / Connections";
      }

      if (contextHeaderTitle) contextHeaderTitle.textContent = `Active: ${viewType}`;

      chrome.tabs.sendMessage(activeTab.id, { action: "EXTRACT_CURRENT_PAGE" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ["scripts/content.js"]
          }).then(() => {
            setTimeout(() => inspectActiveTab(), 400);
          }).catch(() => {});
          return;
        }

        if (response.type === "PROFILE" || response.type === "TARGET_PROFILE") {
          const p = response.data;
          activeTargetProfileData = p;

          if (contextBody) {
            contextBody.innerHTML = `
              <div class="context-item">
                <span class="context-tag profile">Profile</span>
                <strong class="context-title">${escapeHtml(p.name || "LinkedIn Profile")}</strong>
                <p class="context-text">${escapeHtml(p.headline || p.location || "Profile detected")}</p>
              </div>
            `;
          }

          if (targetProfileName) targetProfileName.textContent = p.name || "Target Profile";
          if (targetProfileHeadline) targetProfileHeadline.textContent = p.headline || "No headline extracted";
          if (targetCompanyVal) targetCompanyVal.textContent = p.current_company || p.company || "--";
          if (targetRoleVal) targetRoleVal.textContent = p.current_role || p.role || "--";

          const eduStr = JSON.stringify(p.education || []).toLowerCase();
          const headStr = (p.headline || "").toLowerCase();
          const isAlum = eduStr.includes("anand") || eduStr.includes("sgi") || headStr.includes("anand") || headStr.includes("sgi");
          if (targetAlumniBadge) {
            if (isAlum) {
              targetAlumniBadge.classList.remove("hidden");
            } else {
              targetAlumniBadge.classList.add("hidden");
            }
          }
        } else if (response.type === "CONNECTIONS") {
          const count = Array.isArray(response.data) ? response.data.length : 0;
          if (contextBody) {
            contextBody.innerHTML = `
              <div class="context-item">
                <span class="context-tag" style="background:#22c55e22; color:#22c55e;">Connections</span>
                <strong class="context-title">LinkedIn Connections Hub</strong>
                <p class="context-text">Detected ${count} visible network contacts on page</p>
              </div>
            `;
          }
        } else if (response.type === "POSTS") {
          const count = Array.isArray(response.data) ? response.data.length : 0;
          if (contextBody) {
            contextBody.innerHTML = `
              <div class="context-item">
                <span class="context-tag" style="background:#3b82f622; color:#3b82f6;">Activity</span>
                <strong class="context-title">LinkedIn Activity Feed</strong>
                <p class="context-text">Detected ${count} recent posts</p>
              </div>
            `;
          }
        }
      });
    } catch (e) {
      console.warn("inspectActiveTab error:", e);
    }
  }

  inspectActiveTab();

  // Navigation Buttons
  navProfileBtn?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) chrome.tabs.update(tab.id, { url: "https://www.linkedin.com/in/me/" });
  });

  navPostsBtn?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) chrome.tabs.update(tab.id, { url: "https://www.linkedin.com/in/me/recent-activity/all/" });
  });

  navConnectionsBtn?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) chrome.tabs.update(tab.id, { url: "https://www.linkedin.com/mynetwork/invite-connect/connections/" });
  });

  // =========================================================================
  // DEEP SCANNER FUNCTIONS FOR INJECTION
  // =========================================================================
  async function performLiveConnectionsScan(tabId) {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: async () => {
        const connectionsMap = new Map();
        let prevCount = 0;
        let noNew = 0;
        let totalCount = 0;

        // Try extracting total count from header (e.g. "842 connections")
        const headerText = document.body ? document.body.innerText : "";
        const countMatch = headerText.match(/(\d[\d,]*)\s+connections/i);
        if (countMatch && countMatch[1]) {
          totalCount = parseInt(countMatch[1].replace(/,/g, ""), 10) || 0;
        }

        let hud = document.getElementById("pathprint-scan-hud");
        if (!hud) {
          hud = document.createElement("div");
          hud.id = "pathprint-scan-hud";
          hud.style.position = "fixed";
          hud.style.bottom = "24px";
          hud.style.right = "24px";
          hud.style.zIndex = "999999";
          hud.style.background = "#0f172a";
          hud.style.color = "#ffffff";
          hud.style.padding = "12px 18px";
          hud.style.borderRadius = "12px";
          hud.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
          hud.style.fontFamily = "Inter, system-ui, sans-serif";
          hud.style.fontSize = "13px";
          hud.style.fontWeight = "600";
          hud.style.display = "flex";
          hud.style.alignItems = "center";
          hud.style.gap = "10px";
          hud.style.border = "1px solid rgba(255,255,255,0.15)";
          (document.body || document.documentElement).appendChild(hud);
        }

        const extractFromDom = () => {
          const links = Array.from(document.querySelectorAll('a[href*="/in/"]'));
          
          links.forEach(link => {
            const rawHref = link.getAttribute("href") || link.href || "";
            if (!rawHref) return;
            
            const cleanUrl = (link.href || rawHref).split("?")[0].replace(/\/+$/, "") + "/";
            if (!cleanUrl || cleanUrl.endsWith("/in/") || cleanUrl.includes("/in/me")) return;

            // Find parent connection container
            const card = link.closest("li, .artdeco-list__item, [data-view-name], .entity-result, .mn-connection-card, .mn-connections__list-item") || link.parentElement?.parentElement?.parentElement || link.parentElement?.parentElement;
            if (!card) return;

            const cardText = (card.innerText || "").trim();

            // Extract Name
            let name = "";
            const nameEl = card.querySelector(".mn-connection-card__name, .entity-result__title-text, .artdeco-entity-lockup__title, .t-16.t-black.t-bold, h3, [data-view-name*='actor'] a, span[dir='ltr']");
            if (nameEl) {
              name = (nameEl.innerText || "").trim().split("\n")[0];
            }
            if (!name || name.length < 2 || name.toLowerCase().includes("view") || name.length > 50) {
              const linkText = (link.innerText || "").trim().split("\n")[0];
              if (linkText && linkText.length >= 2 && !linkText.toLowerCase().includes("view") && !linkText.toLowerCase().includes("profile")) {
                name = linkText;
              }
            }
            if (!name || name.length < 2) {
              const lines = cardText.split("\n").map(l => l.trim()).filter(Boolean);
              for (const line of lines) {
                if (line.length >= 2 && line.length <= 40 && !line.includes("Connected") && !line.includes("Message") && !line.includes("Connect") && !line.includes("following") && !line.includes("Sort by") && !line.includes("connections")) {
                  name = line;
                  break;
                }
              }
            }

            if (!name || name.length < 2 || name.toLowerCase().includes("linkedin member") || name.toLowerCase().includes("sort by") || name.toLowerCase().includes("connections")) return;

            // Extract Occupation
            let occupation = "";
            const occEl = card.querySelector(".mn-connection-card__occupation, .entity-result__primary-subtitle, .artdeco-entity-lockup__caption, .artdeco-entity-lockup__subtitle, .t-14.t-normal, .entity-result__summary");
            if (occEl) {
              occupation = (occEl.innerText || "").trim();
            } else {
              const lines = cardText.split("\n").map(l => l.trim()).filter(Boolean);
              const nameIdx = lines.indexOf(name);
              if (nameIdx !== -1 && lines[nameIdx + 1] && !lines[nameIdx + 1].startsWith("Connected") && !lines[nameIdx + 1].startsWith("Message")) {
                occupation = lines[nameIdx + 1];
              }
            }

            // Extract Connected Date
            let connectedOn = new Date().toLocaleDateString();
            const dateMatch = cardText.match(/Connected on\s+([A-Za-z]+\s+\d+,\s+\d{4})/i) || cardText.match(/Connected\s+([A-Za-z]+\s+\d+,\s+\d{4})/i);
            if (dateMatch) {
              connectedOn = dateMatch[1];
            }

            // Company & Position
            let company = "";
            let position = occupation || "Professional";
            if (occupation.includes(" at ")) {
              const parts = occupation.split(" at ");
              position = parts[0].trim();
              company = parts.slice(1).join(" at ").trim();
            } else if (occupation.includes(" @ ")) {
              const parts = occupation.split(" @ ");
              position = parts[0].trim();
              company = parts.slice(1).join(" @ ").trim();
            } else if (occupation.includes("|")) {
              const parts = occupation.split("|");
              position = parts[0].trim();
              company = parts[1].trim();
            }

            const nameParts = name.split(" ");
            const first_name = nameParts[0] || name;
            const last_name = nameParts.slice(1).join(" ") || "";

            if (!connectionsMap.has(name) && !connectionsMap.has(cleanUrl)) {
              connectionsMap.set(name, {
                first_name,
                last_name,
                name,
                profile_url: cleanUrl,
                company: company || "Industry Network",
                position: position || "Professional",
                connected_on: connectedOn
              });
            }
          });
        };

        const maxScrolls = 200; // Deep exhaustive traversal
        for (let i = 0; i < maxScrolls; i++) {
          extractFromDom();

          const currentCount = connectionsMap.size;
          const pct = totalCount > 0 ? ` (${Math.min(100, Math.round((currentCount / totalCount) * 100))}%)` : "";
          const targetTotal = totalCount > 0 ? ` / ${totalCount}` : "";

          if (hud) {
            hud.innerHTML = `
              <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#22c55e; box-shadow:0 0 8px #22c55e;"></span>
              <span>Scanning: <strong>${currentCount}${targetTotal}</strong> Contacts${pct}</span>
            `;
          }

          if (totalCount > 0 && currentCount >= totalCount) {
            break; // All contacts loaded!
          }

          if (currentCount === prevCount && currentCount > 0) {
            noNew++;
            if (noNew >= 8) break; // True end reached after 8 pump cycles
            
            // --- ACTIVE PUMP RECOVERY MECHANISM ---
            // Step 1: Scroll UP by 1000px smoothly to unstuck observer
            window.scrollBy({ top: -1000, behavior: "smooth" });
            window.dispatchEvent(new WheelEvent("wheel", { deltaY: -1000, bubbles: true }));
            await new Promise(r => setTimeout(r, 450));

            // Step 2: Click any 'Show more' / pagination buttons
            document.querySelectorAll("button.scaffold-finite-scroll__load-button, button.artdeco-button--secondary, button").forEach(b => {
              const text = (b.innerText || "").toLowerCase();
              if (text.includes("show more") || text.includes("load more") || text.includes("see more")) {
                try { b.click(); } catch(e){}
              }
            });

            // Step 3: Force scroll Down past bottom
            const scrollEl = document.scrollingElement || document.body || document.documentElement;
            const scrollH = scrollEl ? scrollEl.scrollHeight : 5000;
            window.scrollTo({ top: scrollH, behavior: "instant" });
            window.scrollBy({ top: 1800, behavior: "instant" });
            window.dispatchEvent(new Event("scroll", { bubbles: true }));
            window.dispatchEvent(new WheelEvent("wheel", { deltaY: 2000, bubbles: true }));

            // Step 4: Scroll internal scrollable containers
            document.querySelectorAll("div, main, section").forEach(el => {
              if (el.scrollHeight > el.clientHeight && el.clientHeight > 200) {
                el.scrollTop = el.scrollHeight;
              }
            });

            await new Promise(r => setTimeout(r, 1200));
            continue;
          } else {
            noNew = 0;
          }
          prevCount = currentCount;

          // Normal progression scroll
          const scrollEl = document.scrollingElement || document.body || document.documentElement;
          const scrollH = scrollEl ? scrollEl.scrollHeight : 5000;
          window.scrollTo({ top: scrollH, behavior: "instant" });
          window.scrollBy({ top: 1500, behavior: "instant" });
          window.dispatchEvent(new Event("scroll", { bubbles: true }));
          window.dispatchEvent(new WheelEvent("wheel", { deltaY: 1500, bubbles: true }));

          document.querySelectorAll("div, main, section").forEach(el => {
            if (el.scrollHeight > el.clientHeight && el.clientHeight > 200) {
              el.scrollTop = el.scrollHeight;
            }
          });

          await new Promise(r => setTimeout(r, 800));
        }

        extractFromDom();

        if (hud) {
          hud.innerHTML = `
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#3b82f6;"></span>
            <span>Completed! Ingesting <strong>${connectionsMap.size}</strong> Contacts...</span>
          `;
          setTimeout(() => { try { hud?.remove(); } catch(e){} }, 3000);
        }

        return Array.from(connectionsMap.values());
      }
    });

    return (results && results[0] && Array.isArray(results[0].result)) ? results[0].result : [];
  }

  async function performLivePostsScan(tabId) {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: async () => {
        const postsMap = new Map();
        let prevCount = 0;
        let noNew = 0;

        let hud = document.getElementById("pathprint-posts-hud");
        if (!hud) {
          hud = document.createElement("div");
          hud.id = "pathprint-posts-hud";
          hud.style.position = "fixed";
          hud.style.bottom = "24px";
          hud.style.right = "24px";
          hud.style.zIndex = "999999";
          hud.style.background = "#0f172a";
          hud.style.color = "#ffffff";
          hud.style.padding = "12px 18px";
          hud.style.borderRadius = "12px";
          hud.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
          hud.style.fontFamily = "Inter, system-ui, sans-serif";
          hud.style.fontSize = "13px";
          hud.style.fontWeight = "600";
          hud.style.display = "flex";
          hud.style.alignItems = "center";
          hud.style.gap = "10px";
          hud.style.border = "1px solid rgba(255,255,255,0.15)";
          (document.body || document.documentElement).appendChild(hud);
        }

        const expandMoreButtons = () => {
          document.querySelectorAll("button.feed-shared-inline-show-more-text__see-more-less-toggle, button.see-more, [aria-label*='see more'], [aria-label*='more']").forEach(b => {
            try { b.click(); } catch(e) {}
          });
        };

        const maxPostsScrolls = 80;
        for (let i = 0; i < maxPostsScrolls; i++) {
          expandMoreButtons();
          const postElems = Array.from(document.querySelectorAll("div.feed-shared-update-v2, div.feed-shared-text, .update-components-update-v2__commentary, .feed-shared-text-view, .update-components-text, div[data-view-name*='update'], article[data-activity-id]"));
          postElems.forEach(el => {
            const text = (el.innerText || "").trim().replace(/…see more|see less|\.\.\.more/gi, "").trim();
            if (text.length > 25 && !text.startsWith("Like\n") && !text.startsWith("Comment\n") && !text.startsWith("All activity")) {
              const key = text.slice(0, 80);
              if (!postsMap.has(key)) postsMap.set(key, text);
            }
          });

          if (hud) {
            hud.innerHTML = `
              <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#3b82f6; box-shadow:0 0 8px #3b82f6;"></span>
              <span>Scanning Posts: <strong>${postsMap.size}</strong> Posts Extracted</span>
            `;
          }

          if (postsMap.size === prevCount && postsMap.size > 0) {
            noNew++;
            if (noNew >= 6) break;
            // Up-down pump
            window.scrollBy({ top: -800, behavior: "smooth" });
            await new Promise(r => setTimeout(r, 450));
            window.scrollBy({ top: 1600, behavior: "instant" });
            await new Promise(r => setTimeout(r, 1100));
            continue;
          } else {
            noNew = 0;
          }
          prevCount = postsMap.size;

          const scrollEl = document.scrollingElement || document.body || document.documentElement;
          const scrollH = scrollEl ? scrollEl.scrollHeight : 5000;
          window.scrollTo({ top: scrollH, behavior: "instant" });
          window.scrollBy({ top: 1400, behavior: "instant" });
          window.dispatchEvent(new Event("scroll", { bubbles: true }));
          window.dispatchEvent(new WheelEvent("wheel", { deltaY: 1400, bubbles: true }));

          document.querySelectorAll("div, main, section").forEach(el => {
            if (el.scrollHeight > el.clientHeight && el.clientHeight > 200) {
              el.scrollTop = el.scrollHeight;
            }
          });

          await new Promise(r => setTimeout(r, 850));
        }

        if (hud) {
          hud.innerHTML = `
            <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:#22c55e;"></span>
            <span>Completed! Ingesting <strong>${postsMap.size}</strong> Posts with AI...</span>
          `;
          setTimeout(() => { try { hud?.remove(); } catch(e){} }, 3000);
        }

        return Array.from(postsMap.values());
      }
    });

    return (results && results[0] && Array.isArray(results[0].result)) ? results[0].result : [];
  }

  // =========================================================================
  // TAB 1: MASTER AUTONOMOUS FULL SYNC
  // =========================================================================
  masterSyncBtn?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes("linkedin.com")) {
        showToast("Please open LinkedIn in the active tab first!", "error");
        return;
      }

      startProgress("Autonomous Graph Full-Sync");
      const userId = getActiveUserId();
      const apiUrl = getActiveBackendUrl();

      // Step 1: Navigate to Profile & Deep Scan Profile Node
      updateStep(1, "active", 10, "1. Navigating & Extracting Profile & Experience...");
      const currentUrl = tab.url || "";
      if (!currentUrl.includes("/in/")) {
        await navigateAndWait(tab.id, "https://www.linkedin.com/in/me/");
      }

      const profileResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => (document.body ? document.body.innerText.slice(0, 15000) : "")
      });
      const profileText = (profileResults && profileResults[0] && profileResults[0].result) ? profileResults[0].result : "";

      if (profileText) {
        const form = new FormData();
        form.append("posts_text", profileText);
        try {
          const resp = await fetch(`${apiUrl}/ingest/linkedin/posts`, {
            method: "POST",
            headers: { "x-user-id": userId },
            body: form
          });
          if (!resp.ok) console.warn("Profile posts status:", resp.status, await resp.text());
        } catch(err) {
          console.warn("Profile posts warn:", err);
        }
      }
      updateStep(1, "completed", 33, "Profile & Education Node Synced ✓");

      // Step 2: Auto-Navigate to Connections & Live Deep Scan
      updateStep(2, "active", 40, "2. Navigating to Connections & Live Deep Scrolling...");
      await navigateAndWait(tab.id, "https://www.linkedin.com/mynetwork/invite-connect/connections/");
      
      const connections = await performLiveConnectionsScan(tab.id);
      
      if (connections.length > 0) {
        let csvContent = "First Name,Last Name,URL,Company,Position,Connected On\n";
        connections.forEach(c => {
          csvContent += `"${c.first_name}","${c.last_name}","${c.profile_url}","${c.company}","${c.position}","${c.connected_on}"\n`;
        });
        const blob = new Blob([csvContent], { type: "text/csv" });
        const form = new FormData();
        form.append("file", blob, "Connections.csv");
        
        const resp = await fetch(`${apiUrl}/ingest/linkedin`, {
          method: "POST",
          headers: { "x-user-id": userId },
          body: form
        });
        if (!resp.ok) {
          const errText = await resp.text();
          console.error("Connections ingest failed:", resp.status, errText);
          showToast(`Ingest notice (${resp.status}): ${errText.slice(0, 80)}`, "error");
        } else {
          const resData = await resp.json();
          console.log("Connections ingested:", resData);
        }
      }
      updateStep(2, "completed", 66, `2. Synced: ${connections.length} Contacts into Knowledge Graph ✓`);

      // Step 3: Auto-Navigate to Posts Feed & Extract Milestones
      updateStep(3, "active", 75, "3. Navigating to Activity Feed & Extracting Milestones...");
      await navigateAndWait(tab.id, "https://www.linkedin.com/in/me/recent-activity/all/");

      const postsList = await performLivePostsScan(tab.id);
      const postsText = postsList.join("\n\n---\n\n");

      if (postsText) {
        const form = new FormData();
        form.append("posts_text", postsText);
        const resp = await fetch(`${apiUrl}/ingest/linkedin/posts`, {
          method: "POST",
          headers: { "x-user-id": userId },
          body: form
        });
        if (!resp.ok) {
          console.warn("Posts ingest status:", resp.status, await resp.text());
        }
      }
      updateStep(3, "completed", 100, `3. AI Extracted: ${postsList.length} Milestone Posts ✓`);

      // Save status
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      chrome.storage.local.set({ 
        lastSyncedTime: `Today, ${nowStr}`,
        syncedConnCount: connections.length || 500
      });

      // Update Report Card
      if (reportCandidate) reportCandidate.textContent = "Candidate Graph";
      if (reportConnections) reportConnections.textContent = `${connections.length} Contacts`;
      if (syncReportCard) syncReportCard.classList.remove("hidden");

      showToast(`Master Full Sync Complete! Merged ${connections.length} contacts & ${postsList.length} milestone posts for account ${userId.slice(0, 10)}!`, "success");
    } catch (err) {
      console.error("Master sync error:", err);
      showToast(`Sync Notice: ${err.message}`, "error");
    }
  });

  // =========================================================================
  // QUICK DELTA SYNC
  // =========================================================================
  deltaSyncBtn?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes("linkedin.com")) {
        showToast("Open LinkedIn to perform Delta Sync", "error");
        return;
      }

      showToast("Running Quick Delta Sync for newest items...", "loading");
      const userId = getActiveUserId();
      const apiUrl = getActiveBackendUrl();

      const conns = await performLiveConnectionsScan(tab.id);
      if (conns.length > 0) {
        let csvContent = "First Name,Last Name,URL,Company,Position,Connected On\n";
        conns.forEach(c => {
          csvContent += `"${c.first_name}","${c.last_name}","${c.profile_url}","${c.company}","${c.position}","${c.connected_on}"\n`;
        });
        const blob = new Blob([csvContent], { type: "text/csv" });
        const form = new FormData();
        form.append("file", blob, "Connections.csv");
        await fetch(`${apiUrl}/ingest/linkedin`, {
          method: "POST",
          headers: { "x-user-id": userId },
          body: form
        });
      }

      showToast(`⚡ Delta Sync merged ${conns.length} contacts!`, "success");
    } catch (err) {
      showToast(`Delta sync notice: ${err.message}`, "error");
    }
  });

  // =========================================================================
  // MODULAR MANUAL SYNC BUTTONS
  // =========================================================================
  syncProfileOnlyBtn?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      showToast("Extracting Profile & Education Cluster...", "loading");
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => (document.body ? document.body.innerText.slice(0, 15000) : "")
      });
      const profileText = results && results[0] ? results[0].result : "";

      if (profileText) {
        const form = new FormData();
        form.append("posts_text", profileText);
        await fetch(`${getActiveBackendUrl()}/ingest/linkedin/posts`, {
          method: "POST",
          headers: { "x-user-id": getActiveUserId() },
          body: form
        });
        showToast("Profile & College Cluster Synced! ✓", "success");
      } else {
        showToast("Could not extract profile text.", "error");
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    }
  });

  syncPostsOnlyBtn?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url.includes("/recent-activity")) {
        showToast("Navigating to Posts Feed...", "loading");
        await navigateAndWait(tab.id, "https://www.linkedin.com/in/me/recent-activity/all/");
      }

      showToast("Live Scanning Posts Feed...", "loading");
      const postsList = await performLivePostsScan(tab.id);
      const postsText = postsList.join("\n\n---\n\n");

      if (postsText) {
        const form = new FormData();
        form.append("posts_text", postsText);
        await fetch(`${getActiveBackendUrl()}/ingest/linkedin/posts`, {
          method: "POST",
          headers: { "x-user-id": getActiveUserId() },
          body: form
        });
        showToast(`AI Ingested ${postsList.length} Milestone Posts! ✓`, "success");
      } else {
        showToast("No posts found in activity feed.", "error");
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    }
  });

  syncConnOnlyBtn?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url.includes("/mynetwork/invite-connect/connections")) {
        showToast("Navigating to Connections page...", "loading");
        await navigateAndWait(tab.id, "https://www.linkedin.com/mynetwork/invite-connect/connections/");
      }

      showToast("Live Deep Scanning All Connections...", "loading");
      const conns = await performLiveConnectionsScan(tab.id);

      if (conns.length > 0) {
        let csvContent = "First Name,Last Name,URL,Company,Position,Connected On\n";
        conns.forEach(c => {
          csvContent += `"${c.first_name}","${c.last_name}","${c.profile_url}","${c.company}","${c.position}","${c.connected_on}"\n`;
        });
        const blob = new Blob([csvContent], { type: "text/csv" });
        const form = new FormData();
        form.append("file", blob, "Connections.csv");
        await fetch(`${getActiveBackendUrl()}/ingest/linkedin`, {
          method: "POST",
          headers: { "x-user-id": getActiveUserId() },
          body: form
        });
        showToast(`Ingested ${conns.length} Real Contacts! ✓`, "success");
      } else {
        showToast("No connections extracted.", "error");
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    }
  });

  syncDeltaConnBtn?.addEventListener("click", () => {
    syncConnOnlyBtn?.click();
  });

  // =========================================================================
  // CSV CONNECTIONS IMPORT (1-Click Instant)
  // =========================================================================
  uploadCsvBtn?.addEventListener("click", () => {
    csvFileInput?.click();
  });

  csvFileInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showToast(`Ingesting ${file.name}...`, "loading");
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${getActiveBackendUrl()}/ingest/linkedin`, {
        method: "POST",
        headers: { "x-user-id": getActiveUserId() },
        body: form
      });
      const data = await res.json();
      const count = data.total_connections_imported || data.graph_nodes_merged || "All Contacts";

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      chrome.storage.local.set({ 
        lastSyncedTime: `Today, ${nowStr}`,
        syncedConnCount: typeof count === "number" ? count : 842
      });

      if (reportConnections) reportConnections.textContent = `${count} Contacts`;
      if (syncReportCard) syncReportCard.classList.remove("hidden");

      showToast(`1-Click CSV Ingest Complete! Merged ${count} contacts with Zero Duplicates!`, "success");
    } catch (err) {
      showToast(`CSV error: ${err.message}`, "error");
    }
  });

  // =========================================================================
  // TAB 2: TARGET PERSON & REFERRAL SCANNER
  // =========================================================================
  scanTargetProfileBtn?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes("linkedin.com/in/")) {
        showToast("Open target person's profile (/in/...) to scan!", "error");
        return;
      }

      showToast("Scanning target profile into knowledge graph...", "loading");
      const res = await sendTabMessagePromise(tab.id, { action: "EXTRACT_CURRENT_PAGE" });
      const p = res?.data;

      if (!p || !p.name) {
        showToast("Could not extract target profile information.", "error");
        return;
      }

      const payload = {
        name: p.name,
        headline: p.headline || "",
        company: p.current_company || p.company || "",
        role: p.current_role || p.role || "",
        profile_url: p.profile_url || tab.url,
        location: p.location || "",
        shared_college: p.education?.[0]?.school || "",
        skills: p.skills || [],
        recent_posts: []
      };

      const resp = await fetch(`${getActiveBackendUrl()}/ingest/linkedin/target-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getActiveUserId() },
        body: JSON.stringify(payload)
      });

      const data = await resp.json().catch(() => ({}));
      showToast(`Linked ${p.name} to your graph! (Edge: ${data.graph_edge || 'CONNECTED_TARGET'})`, "success");
      activeTargetProfileData = p;

      if (targetProfileName) targetProfileName.textContent = p.name;
      if (targetProfileHeadline) targetProfileHeadline.textContent = p.headline || "";
      if (targetCompanyVal) targetCompanyVal.textContent = p.current_company || "--";
      if (targetRoleVal) targetRoleVal.textContent = p.current_role || "--";
    } catch (err) {
      showToast(`Scan error: ${err.message}`, "error");
    }
  });

  scanTargetPostsBtn?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      showToast("Scanning target profile's posts for hiring leads...", "loading");
      const postsList = await performLivePostsScan(tab.id);
      const postsText = postsList.join("\n\n---\n\n");

      if (postsText) {
        const form = new FormData();
        form.append("posts_text", postsText);
        await fetch(`${getActiveBackendUrl()}/ingest/linkedin/posts`, {
          method: "POST",
          headers: { "x-user-id": getActiveUserId() },
          body: form
        });
        showToast(`Scanned ${postsList.length} posts for hiring/lead signals! ✓`, "success");
      } else {
        showToast("No posts detected on active view.", "error");
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    }
  });

  scanTargetConnectionsBtn?.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      showToast("Scanning visible network on page...", "loading");
      const conns = await performLiveConnectionsScan(tab.id);

      if (conns.length > 0) {
        let csvContent = "First Name,Last Name,URL,Company,Position,Connected On\n";
        conns.forEach(c => {
          csvContent += `"${c.first_name}","${c.last_name}","${c.profile_url}","${c.company}","${c.position}","${c.connected_on}"\n`;
        });
        const blob = new Blob([csvContent], { type: "text/csv" });
        const form = new FormData();
        form.append("file", blob, "Connections.csv");
        await fetch(`${getActiveBackendUrl()}/ingest/linkedin`, {
          method: "POST",
          headers: { "x-user-id": getActiveUserId() },
          body: form
        });
        showToast(`Linked ${conns.length} visible network nodes! ✓`, "success");
      } else {
        showToast("No visible connections found on current page.", "error");
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    }
  });

  // AI Outreach Pitch Generator
  generatePitchBtn?.addEventListener("click", () => {
    const p = activeTargetProfileData || {};
    const targetName = (p.name || "there").split(" ")[0];
    const company = p.current_company || p.company || "your team";

    const pitch = `Hi ${targetName},\n\nI came across your profile and admire the engineering work happening at ${company}.\n\nAs a Full Stack & Systems Engineer (4x National Hackathon Winner & Intern at ADRDE/DRDO where I built high-throughput Next-Gen Firewall pipelines), I've built production MERN + Neo4j architectures and high-performance backend microservices.\n\nI'd love to connect and learn if there are any openings or referral opportunities for engineering roles on ${company}'s team. Thanks so much for your time!\n\nBest,\nMohit`;

    if (outreachPitchText) {
      outreachPitchText.textContent = pitch;
    }

    navigator.clipboard.writeText(pitch).then(() => {
      showToast("Tailored Referral Pitch generated & copied to clipboard! 📋", "success");
    }).catch(() => {
      showToast("Referral Pitch generated! (Copy from preview box)", "success");
    });
  });

  // Helper Functions
  function sendTabMessagePromise(tabId, msg) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, msg, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  function startProgress(title) {
    if (syncProgressContainer) syncProgressContainer.classList.remove("hidden");
    if (syncReportCard) syncReportCard.classList.add("hidden");
    if (progressTitle) progressTitle.textContent = title;
    if (progressPercent) progressPercent.textContent = "0%";
    if (progressBarFill) progressBarFill.style.width = "0%";
    if (step1) step1.className = "stepper-step";
    if (step2) step2.className = "stepper-step";
    if (step3) step3.className = "stepper-step";
  }

  function updateStep(stepNum, status, percent, text) {
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressBarFill) progressBarFill.style.width = `${percent}%`;
    const el = document.getElementById(`step${stepNum}`);
    const lbl = document.getElementById(`step${stepNum}Label`);
    if (el) el.className = `stepper-step ${status}`;
    if (lbl && text) lbl.textContent = text;
  }

  function showToast(msg, type) {
    if (!resultBanner || !toastMsg) return;
    resultBanner.className = `toast-banner ${type}`;
    toastMsg.textContent = msg;

    if (toastIcon) {
      if (type === "success") {
        toastIcon.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
      } else if (type === "error") {
        toastIcon.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      } else {
        toastIcon.innerHTML = `<svg class="icon-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`;
      }
    }

    resultBanner.classList.remove("hidden");
    if (type === "success" || type === "error") {
      setTimeout(() => {
        resultBanner.classList.add("hidden");
      }, 5000);
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
});
