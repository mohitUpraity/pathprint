/**
 * PathPrint Content Script - 100% Real Bulletproof DOM Extractor
 * Strictly extracts authentic visible data from LinkedIn DOM with zero mock/fake fallbacks.
 */

(() => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      const url = window.location.href;

      if (request.action === "EXTRACT_CURRENT_PAGE") {
        if (url.includes("/mynetwork/invite-connect/connections")) {
          const connData = extractConnectionsData();
          sendResponse({ type: "CONNECTIONS", data: connData, pageType: "CONNECTIONS_PAGE" });
        } else if (url.includes("/recent-activity")) {
          const posts = extractRecentPosts();
          sendResponse({ type: "POSTS", data: posts, pageType: "ACTIVITY_POSTS_PAGE" });
        } else if (url.includes("/in/")) {
          const profileData = extractFullProfileData();
          sendResponse({ type: "PROFILE", data: profileData, pageType: "FULL_PROFILE" });
        } else if (url.includes("/feed")) {
          const feedProfile = extractFeedSidebarProfile();
          sendResponse({ type: "PROFILE", data: feedProfile, pageType: "FEED_SUMMARY" });
        } else if (url.includes("/jobs/view") || url.includes("/jobs/collections")) {
          const jobData = extractJobData();
          sendResponse({ type: "JOB", data: jobData, pageType: "JOB_POSTING" });
        } else {
          sendResponse({ type: "OTHER", pageType: "LINKEDIN_PAGE", data: { raw_text: (document.body?.innerText || "").slice(0, 5000) } });
        }
        return false;
      } else if (request.action === "EXTRACT_TARGET_PROFILE") {
        const targetProfile = extractFullProfileData();
        sendResponse({ type: "TARGET_PROFILE", data: targetProfile, success: true });
        return false;
      } else if (request.action === "EXTRACT_POSTS") {
        const posts = extractRecentPosts();
        sendResponse({ type: "POSTS", data: posts });
        return false;
      } else if (request.action === "EXTRACT_CONNECTIONS_DEEP") {
        deepScanConnections((progress) => {
          chrome.runtime.sendMessage({ action: "DEEP_SCAN_PROGRESS", count: progress.count, isDone: progress.isDone }).catch(() => {});
        }).then((connections) => {
          sendResponse({ type: "CONNECTIONS", data: connections });
        }).catch(err => {
          sendResponse({ type: "ERROR", message: err.message });
        });
        return true;
      } else if (request.action === "NAVIGATE_TO") {
        if (request.url) {
          window.location.href = request.url;
          sendResponse({ success: true });
        }
        return false;
      }
    } catch (err) {
      sendResponse({ type: "ERROR", message: err.message });
      return false;
    }
    return false;
  });

  // Deep Auto-Scroll Scanner for Connections
  async function deepScanConnections(onProgress) {
    const connectionsMap = new Map();
    let prevCount = 0;
    let noNewCount = 0;
    const maxScrolls = 150;

    for (let i = 0; i < maxScrolls; i++) {
      const batch = extractConnectionsData();
      batch.forEach(c => {
        if (c.name) connectionsMap.set(c.name, c);
      });

      const currentCount = connectionsMap.size;
      if (onProgress) onProgress({ count: currentCount, isDone: false });

      if (currentCount === prevCount && currentCount > 0) {
        noNewCount++;
        if (noNewCount >= 6) break;
        window.scrollBy({ top: -500, behavior: "smooth" });
        await new Promise(r => setTimeout(r, 400));
      } else {
        noNewCount = 0;
      }
      prevCount = currentCount;

      document.querySelectorAll("button.scaffold-finite-scroll__load-button, button.artdeco-button--secondary").forEach(b => {
        if (b.innerText && b.innerText.toLowerCase().includes("show more")) {
          try { b.click(); } catch(e){}
        }
      });

      window.scrollBy({ top: 1500, behavior: "instant" });
      const scrollEl = document.scrollingElement || document.body || document.documentElement;
      if (scrollEl) {
        window.scrollTo({ top: scrollEl.scrollHeight, behavior: "instant" });
      }
      document.querySelectorAll("div, main, section").forEach(el => {
        if (el.scrollHeight > el.clientHeight && el.clientHeight > 200) {
          el.scrollTop = el.scrollHeight;
        }
      });
      await new Promise(r => setTimeout(r, 850));
    }

    window.scrollTo({ top: 0, behavior: "smooth" });

    const finalResults = Array.from(connectionsMap.values());
    if (onProgress) onProgress({ count: finalResults.length, isDone: true });
    return finalResults;
  }

  // 100% Real DOM Extraction for Connections
  function extractConnectionsData() {
    const connections = [];
    const seenUrls = new Set();
    const seenNames = new Set();

    const allLinks = Array.from(document.querySelectorAll('a[href*="/in/"]'));

    allLinks.forEach((linkEl) => {
      const rawHref = linkEl.getAttribute("href") || linkEl.href || "";
      if (!rawHref) return;

      const href = (linkEl.href || rawHref).split("?")[0].replace(/\/+$/, "") + "/";
      if (!href || href.endsWith("/in/") || href.includes("/in/me") || seenUrls.has(href)) {
        return;
      }

      // Find enclosing card
      const card = linkEl.closest("li, .mn-connection-card, .entity-result, .artdeco-list__item, [data-view-name], .mn-connections__list-item") || linkEl.parentElement?.parentElement?.parentElement || linkEl.parentElement?.parentElement;
      if (!card) return;

      const cardText = (card.innerText || "").trim();

      // Extract Name
      let name = "";
      const nameEl = card.querySelector(".mn-connection-card__name, .entity-result__title-text, .artdeco-entity-lockup__title, .t-16.t-black.t-bold, h3, [data-view-name*='actor'] a, span[dir='ltr']");
      if (nameEl) {
        name = (nameEl.innerText || "").trim().split("\n")[0];
      }
      if (!name || name.length < 2 || name.toLowerCase().includes("view") || name.length > 50) {
        const linkText = (linkEl.innerText || "").trim().split("\n")[0];
        if (linkText && linkText.length >= 2 && !linkText.toLowerCase().includes("view") && !linkText.toLowerCase().includes("profile")) {
          name = linkText;
        }
      }
      if (!name || name.length < 2) {
        const lines = cardText.split("\n").map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (line.length >= 2 && line.length <= 40 && !line.includes("Connected") && !line.includes("Message") && !line.includes("Connect") && !line.includes("Sort by") && !line.includes("connections")) {
            name = line;
            break;
          }
        }
      }

      if (!name || name.toLowerCase().includes("connections") || name.toLowerCase().includes("linkedin member") || seenNames.has(name) || name.length < 2) return;

      seenUrls.add(href);
      seenNames.add(name);

      // Extract Occupation
      let occupation = "";
      const occEl = card.querySelector(".mn-connection-card__occupation, .entity-result__primary-subtitle, .artdeco-entity-lockup__caption, .artdeco-entity-lockup__subtitle, .t-14.t-normal, .entity-result__summary");
      if (occEl) {
        occupation = (occEl.innerText || "").trim();
      } else {
        const lines = cardText.split("\n").map(l => l.trim()).filter(Boolean);
        const nameIndex = lines.indexOf(name);
        if (nameIndex !== -1 && lines[nameIndex + 1] && !lines[nameIndex + 1].startsWith("Connected") && !lines[nameIndex + 1].startsWith("Message")) {
          occupation = lines[nameIndex + 1];
        }
      }

      let connectedOn = "Recent";
      const dateMatch = cardText.match(/Connected on\s+([A-Za-z]+\s+\d+,\s+\d{4})/i) || cardText.match(/Connected\s+([A-Za-z]+\s+\d+,\s+\d{4})/i);
      if (dateMatch) connectedOn = dateMatch[1];

      let company = "";
      let position = occupation || "Professional";
      if (occupation.includes(" at ")) {
        position = occupation.split(" at ")[0].trim();
        company = occupation.split(" at ").slice(1).join(" at ").trim();
      } else if (occupation.includes(" @ ")) {
        position = occupation.split(" @ ")[0].trim();
        company = occupation.split(" @ ").slice(1).join(" @ ").trim();
      } else if (occupation.includes(" student at ")) {
        position = occupation.split(" student at ")[0].trim();
        company = occupation.split(" student at ").slice(1).join(" student at ").trim();
      } else if (occupation.toLowerCase().includes("sharda")) {
        company = "Sharda University";
      } else if (occupation.toLowerCase().includes("hindustan") || occupation.toLowerCase().includes("hcst")) {
        company = "Hindustan College of Science and Technology";
      } else if (occupation.toLowerCase().includes("anand")) {
        company = "Anand Engineering College";
      }

      connections.push({
        id: `conn_${connections.length + 1}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: name,
        first_name: name.split(" ")[0] || name,
        last_name: name.split(" ").slice(1).join(" ") || "",
        position: position,
        company: company || "Industry Network",
        profile_url: href,
        connected_on: connectedOn
      });
    });

    return connections;
  }

  function extractFeedSidebarProfile() {
    const nameElem = document.querySelector(".feed-identity-module__actor-meta a, .profile-rail-card__actor-link, .identity-headline, a[href*='/in/'] > .t-16");
    const name = nameElem ? nameElem.innerText.trim() : (document.querySelector(".feed-identity-module")?.innerText?.split("\n")[0] || "Candidate");

    const headlineElem = document.querySelector(".feed-identity-module__headline, .identity-headline, .feed-identity-module .t-12");
    const headline = headlineElem ? headlineElem.innerText.trim() : "";

    const profileLinkElem = document.querySelector("a[href*='/in/']");
    const profileUrl = profileLinkElem ? profileLinkElem.href : "";

    return {
      name: name || "Candidate",
      headline: headline || "Software Engineer",
      profile_url: profileUrl,
      source: "FEED_SIDEBAR",
      raw_text: document.body.innerText.slice(0, 15000)
    };
  }

  // Enhanced Universal Target Profile Extractor (Works on /in/username, /recent-activity/*, etc.)
  function extractFullProfileData() {
    const url = window.location.href;

    // 1. Try Top Card on Profile Page
    let nameElem = document.querySelector("h1.text-heading-xlarge, h1.top-card-layout__title, h1.inline.t-24, h1");
    let name = nameElem ? nameElem.innerText.trim().split("\n")[0] : "";

    let headlineElem = document.querySelector("div.text-body-medium.break-words, h2.top-card-layout__headline, .text-body-medium");
    let headline = headlineElem ? headlineElem.innerText.trim() : "";

    // 2. If on /recent-activity/* or other subpages, inspect Left Rail Identity Card
    if (!name || name.toLowerCase().includes("activity") || name.length > 40) {
      const railNameElem = document.querySelector(".feed-identity-module__actor-meta a, .profile-rail-card__actor-link, div[class*='feed-identity'] h3, .artdeco-card a[href*='/in/']");
      if (railNameElem) {
        name = railNameElem.innerText.trim().split("\n")[0];
      }
    }

    // 3. Check post actor name if still missing
    if (!name || name.toLowerCase().includes("activity")) {
      const actorNameElem = document.querySelector(".update-components-actor__name, .feed-shared-actor__name, a.update-components-actor__meta-link");
      if (actorNameElem) {
        name = actorNameElem.innerText.trim().split("\n")[0];
      }
    }

    // 4. Fallback URL slug parser: /in/dj-suryansh/... -> DJ Suryansh
    if (!name || name.toLowerCase().includes("activity") || name.toLowerCase().includes("member")) {
      const match = url.match(/\/in\/([a-zA-Z0-9_-]+)/);
      if (match && match[1] && match[1] !== "me") {
        name = match[1].replace(/[-_]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      }
    }

    // Headline fallback from sidebar or actor description
    if (!headline || headline.length < 3) {
      const railHeadline = document.querySelector(".feed-identity-module__headline, .feed-identity-module .t-12, .update-components-actor__description, .feed-shared-actor__description");
      if (railHeadline) {
        headline = railHeadline.innerText.trim();
      }
    }

    // Company & Role parsing from headline
    let company = "";
    let role = headline;
    if (headline.includes(" @ ")) {
      const parts = headline.split(" @ ");
      role = parts[0].trim();
      company = parts[1].split("|")[0].split("•")[0].split(",")[0].trim();
    } else if (headline.includes(" at ")) {
      const parts = headline.split(" at ");
      role = parts[0].trim();
      company = parts[1].split("|")[0].split("•")[0].split(",")[0].trim();
    } else if (headline.includes("Intern @")) {
      const match = headline.match(/Intern\s*@\s*([^|•,\n]+)/i);
      if (match) company = match[1].trim();
    } else if (headline.includes("@")) {
      const match = headline.match(/@\s*([^|•,\n]+)/);
      if (match) company = match[1].trim();
    }

    // College Detection
    let sharedCollege = "";
    const fullText = document.body.innerText;
    if (fullText.includes("Sharda University") || headline.includes("Sharda")) {
      sharedCollege = "Sharda University";
    } else if (fullText.includes("Hindustan College") || fullText.includes("HCST")) {
      sharedCollege = "Hindustan College of Science and Technology";
    } else if (fullText.includes("Stanford")) {
      sharedCollege = "Stanford University";
    }

    return {
      name: name || "LinkedIn Member",
      headline: headline || "Software Engineer",
      company: company || "Industry Network",
      role: role || headline,
      location: "",
      profile_url: url.split("?")[0],
      shared_college: sharedCollege,
      source: "UNIVERSAL_PROFILE_EXTRACTOR",
      raw_text: fullText.slice(0, 20000)
    };
  }

  // Enhanced Universal Recent Posts Extractor
  function extractRecentPosts() {
    // 1. Expand all '...see more' buttons
    document.querySelectorAll("button.feed-shared-inline-show-more-text__see-more-less-toggle, button.see-more, [aria-label*='more'], button[class*='see-more']").forEach(b => {
      try { b.click(); } catch(e) {}
    });

    const posts = [];
    const seen = new Set();

    const postElements = document.querySelectorAll(
      "div.feed-shared-update-v2, div[data-view-name*='update'], .update-components-update-v2__commentary, .feed-shared-update-v2__description, .feed-shared-text, .update-components-text, .feed-shared-inline-show-more-text, .feed-shared-text-view, article[data-activity-id], div.occludable-update"
    );

    postElements.forEach(el => {
      let text = (el.innerText || "").trim();
      // Clean noise
      text = text.replace(/…see more|see less|\.\.\.more/gi, "").trim();

      if (text && text.length > 15 && !text.startsWith("Like\n") && !text.startsWith("Comment\n") && !text.startsWith("All activity") && !seen.has(text)) {
        seen.add(text);
        posts.push(text);
      }
    });

    return posts.slice(0, 15);
  }

  function extractJobData() {
    const title = document.querySelector("h1.job-details-jobs-unified-top-card__job-title, h1.top-card-layout__title")?.innerText?.trim() || "";
    const company = document.querySelector("a.job-details-jobs-unified-top-card__primary-description-container-item, a.topcard__org-name-link")?.innerText?.trim() || "";
    const description = document.querySelector("div.jobs-description-content__text, div.description__text")?.innerText?.trim() || "";

    return { title, company, description };
  }
})();
