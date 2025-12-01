// Browser API compatibility for Chrome and Edge
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const state = {
  baseTrackers: [],
  userTrackers: [],
  trackers: [],
  trackerCategories: {},
  fingerprintPatterns: [],
  suspiciousParams: [],
  tabFindings: new Map(), // tabId -> {scriptSources: [], thirdPartyScripts: [], fingerprintEvents: [], ruleMatches: [], storageAccess: [], webrtcLeaks: []}
  // Auto-blocking settings
  autoBlockEnabled: true,
  autoBlockFingerprinting: true,
  whitelistedSites: [],
  blockedCount: 0,
  sessionBlockedCount: 0
};

// Initialize settings and trackers
initializeSettings();

async function initializeSettings() {
  try {
    const stored = await chrome.storage.local.get({
      autoBlockEnabled: true,
      autoBlockFingerprinting: true,
      whitelistedSites: [],
      blockedCount: 0
    });
    state.autoBlockEnabled = stored.autoBlockEnabled;
    state.autoBlockFingerprinting = stored.autoBlockFingerprinting;
    state.whitelistedSites = stored.whitelistedSites || [];
    state.blockedCount = stored.blockedCount || 0;
    
    // Apply auto-blocking rules based on settings
    await updateAutoBlockRules();
  } catch (err) {
    console.error('Failed to load settings', err);
  }
  await loadTrackers();
}

async function updateAutoBlockRules() {
  try {
    if (state.autoBlockEnabled) {
      // Enable the static ruleset
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ['tracker_blocking_rules'],
        disableRulesetIds: []
      });
    } else {
      // Disable the static ruleset
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: [],
        disableRulesetIds: ['tracker_blocking_rules']
      });
    }
  } catch (err) {
    console.error('Failed to update auto-block rules', err);
  }
}

async function setAutoBlockEnabled(enabled) {
  state.autoBlockEnabled = enabled;
  await chrome.storage.local.set({ autoBlockEnabled: enabled });
  await updateAutoBlockRules();
  return { autoBlockEnabled: state.autoBlockEnabled };
}

async function setAutoBlockFingerprinting(enabled) {
  state.autoBlockFingerprinting = enabled;
  await chrome.storage.local.set({ autoBlockFingerprinting: enabled });
  return { autoBlockFingerprinting: state.autoBlockFingerprinting };
}

async function addWhitelistedSite(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized) return state.whitelistedSites;
  
  const set = new Set([...state.whitelistedSites, normalized]);
  state.whitelistedSites = Array.from(set);
  await chrome.storage.local.set({ whitelistedSites: state.whitelistedSites });
  
  // Add allow rules for whitelisted site
  await updateWhitelistRules();
  return state.whitelistedSites;
}

async function removeWhitelistedSite(domain) {
  const normalized = normalizeDomain(domain);
  state.whitelistedSites = state.whitelistedSites.filter(d => d !== normalized);
  await chrome.storage.local.set({ whitelistedSites: state.whitelistedSites });
  
  // Update allow rules
  await updateWhitelistRules();
  return state.whitelistedSites;
}

async function updateWhitelistRules() {
  try {
    // Get existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    
    // Remove old whitelist rules (IDs 100000+)
    const whitelistRuleIds = existingRules
      .filter(r => r.id >= 100000 && r.id < 200000)
      .map(r => r.id);
    
    // Create new whitelist rules
    const newRules = state.whitelistedSites.map((domain, index) => ({
      id: 100000 + index,
      priority: 2, // Higher priority than block rules
      action: { type: 'allow' },
      condition: {
        initiatorDomains: [domain],
        resourceTypes: ['script', 'xmlhttprequest', 'image', 'sub_frame', 'ping', 'stylesheet', 'font', 'media']
      }
    }));
    
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: whitelistRuleIds,
      addRules: newRules
    });
  } catch (err) {
    console.error('Failed to update whitelist rules', err);
  }
}

async function getBlockingStats() {
  try {
    const rules = await chrome.declarativeNetRequest.getMatchedRules();
    return {
      totalBlocked: state.blockedCount + state.sessionBlockedCount,
      sessionBlocked: state.sessionBlockedCount,
      autoBlockEnabled: state.autoBlockEnabled,
      autoBlockFingerprinting: state.autoBlockFingerprinting,
      whitelistedSites: state.whitelistedSites,
      recentMatches: rules.rulesMatchedInfo?.slice(-10) || []
    };
  } catch (err) {
    return {
      totalBlocked: state.blockedCount + state.sessionBlockedCount,
      sessionBlocked: state.sessionBlockedCount,
      autoBlockEnabled: state.autoBlockEnabled,
      autoBlockFingerprinting: state.autoBlockFingerprinting,
      whitelistedSites: state.whitelistedSites,
      recentMatches: []
    };
  }
}

function getTabFindings(tabId) {
  return (
    state.tabFindings.get(tabId) || {
      scriptSources: [],
      thirdPartyScripts: [],
      fingerprintEvents: [],
      ruleMatches: [],
      storageAccess: [],
      webrtcLeaks: [],
      suspiciousRequests: [],
      canvasFingerprints: 0,
      audioFingerprints: 0,
      webglFingerprints: 0,
      fontProbes: 0
    }
  );
}

async function loadTrackers() {
  try {
    const res = await fetch(chrome.runtime.getURL('trackers.json'));
    const json = await res.json();
    state.baseTrackers = json.domains || [];
    state.trackerCategories = json.trackers || {};
    state.fingerprintPatterns = json.fingerprintPatterns || [];
    state.suspiciousParams = json.suspiciousParams || [];
  } catch (err) {
    console.error('Failed to load trackers.json', err);
    state.baseTrackers = [];
    state.trackerCategories = {};
  }
  const stored = await chrome.storage.local.get({ userTrackers: [] });
  state.userTrackers = stored.userTrackers || [];
  state.trackers = Array.from(new Set([...state.baseTrackers, ...state.userTrackers]));
  reclassifyAllScripts();
}

function getTrackerCategory(domain) {
  for (const [category, domains] of Object.entries(state.trackerCategories)) {
    if (domains.some(d => domain.endsWith(d))) {
      return category;
    }
  }
  return 'unknown';
}

function detectSuspiciousParams(url) {
  try {
    const urlObj = new URL(url);
    const found = [];
    for (const param of state.suspiciousParams) {
      if (urlObj.searchParams.has(param)) {
        found.push(param);
      }
    }
    return found;
  } catch (e) {
    return [];
  }
}

function detectFingerprintingScript(src) {
  if (!src) return false;
  const lowerSrc = src.toLowerCase();
  return state.fingerprintPatterns.some(pattern => lowerSrc.includes(pattern));
}

function normalizeDomain(domain) {
  if (!domain) return '';
  try {
    const cleaned = domain.trim().toLowerCase();
    const stripped = cleaned.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return stripped;
  } catch (e) {
    return '';
  }
}

async function addUserTracker(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized) return state.trackers;
  const set = new Set([...state.userTrackers, normalized]);
  state.userTrackers = Array.from(set);
  state.trackers = Array.from(new Set([...state.baseTrackers, ...state.userTrackers]));
  await chrome.storage.local.set({ userTrackers: state.userTrackers });
  reclassifyAllScripts();
  return state.trackers;
}

async function removeUserTracker(domain) {
  const normalized = normalizeDomain(domain);
  state.userTrackers = state.userTrackers.filter((d) => d !== normalized);
  state.trackers = Array.from(new Set([...state.baseTrackers, ...state.userTrackers]));
  await chrome.storage.local.set({ userTrackers: state.userTrackers });
  reclassifyAllScripts();
  return state.trackers;
}

function reclassifyAllScripts() {
  state.tabFindings.forEach((value, tabId) => {
    const current = getTabFindings(tabId);
    if (!current.scriptSources?.length) return;
    const classified = classifyScripts(current.scriptSources);
    state.tabFindings.set(tabId, {
      ...current,
      thirdPartyScripts: classified
    });
  });
}
function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return '';
  }
}

function isThirdPartyCookie(cookie, pageHost) {
  if (!cookie.domain || !pageHost) return false;
  const cookieHost = cookie.domain.replace(/^\./, '');
  return !pageHost.endsWith(cookieHost);
}

function classifyScripts(sources) {
  if (!sources?.length) return [];
  return sources
    .filter((src) => !!src)
    .map((src) => {
      let host = '';
      try {
        host = new URL(src, 'https://example.com').hostname;
      } catch (e) {
        host = '';
      }
      const matchedTracker = state.trackers.find((domain) => host.endsWith(domain));
      const category = matchedTracker ? getTrackerCategory(matchedTracker) : null;
      const suspiciousParams = detectSuspiciousParams(src);
      const isFingerprintScript = detectFingerprintingScript(src);
      
      return {
        src,
        host,
        isTracker: Boolean(matchedTracker),
        matchedDomain: matchedTracker || null,
        category,
        suspiciousParams,
        isFingerprintScript,
        riskScore: calculateScriptRisk(matchedTracker, category, suspiciousParams, isFingerprintScript)
      };
    });
}

function calculateScriptRisk(isTracker, category, suspiciousParams, isFingerprintScript) {
  let score = 0;
  if (isTracker) score += 30;
  if (category === 'fingerprinting') score += 40;
  else if (category === 'advertising') score += 25;
  else if (category === 'analytics') score += 15;
  else if (category === 'social') score += 10;
  if (suspiciousParams.length > 0) score += suspiciousParams.length * 5;
  if (isFingerprintScript) score += 35;
  return Math.min(score, 100);
}

async function collectCookiesForTab(tab) {
  const tabUrl = tab?.url;
  if (!tabUrl) return [];
  const cookies = await chrome.cookies.getAll({ url: tabUrl });
  const host = getDomainFromUrl(tabUrl);
  return cookies.map((cookie) => ({
    name: cookie.name,
    domain: cookie.domain,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    session: cookie.session,
    sameParty: cookie.sameParty,
    path: cookie.path,
    thirdParty: isThirdPartyCookie(cookie, host)
  }));
}

async function handleRequestData(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const cookies = await collectCookiesForTab(tab);
  const existing = getTabFindings(tabId);
  const thirdPartyCookies = cookies.filter((c) => c.thirdParty);
  const insecureCookies = cookies.filter((c) => !c.secure);
  const sessionCookies = cookies.filter((c) => c.session);
  const sameSiteNoneInsecure = cookies.filter((c) => c.sameSite === 'no_restriction' && !c.secure);
  const trackingCookies = cookies.filter((c) => isTrackingCookie(c));
  const longLivedCookies = cookies.filter((c) => isLongLivedCookie(c));
  
  // Calculate fingerprint breakdown
  const fpEvents = existing.fingerprintEvents || [];
  const fpBreakdown = {
    canvas: fpEvents.filter(e => e.api?.includes('canvas')).length,
    webgl: fpEvents.filter(e => e.api?.includes('webgl')).length,
    audio: fpEvents.filter(e => e.api?.includes('Audio')).length,
    navigator: fpEvents.filter(e => e.api?.includes('navigator')).length,
    fonts: fpEvents.filter(e => e.api?.includes('font')).length,
    screen: fpEvents.filter(e => e.api?.includes('screen')).length
  };
  
  // Script category breakdown
  const scripts = existing.thirdPartyScripts || [];
  const scriptBreakdown = {
    advertising: scripts.filter(s => s.category === 'advertising').length,
    analytics: scripts.filter(s => s.category === 'analytics').length,
    social: scripts.filter(s => s.category === 'social').length,
    fingerprinting: scripts.filter(s => s.category === 'fingerprinting').length,
    other: scripts.filter(s => s.isTracker && !['advertising', 'analytics', 'social', 'fingerprinting'].includes(s.category)).length
  };
  
  // Calculate overall privacy score (0-100, higher is worse)
  const privacyRisk = calculatePrivacyRisk(cookies, scripts, fpEvents, existing);
  
  return {
    cookiesSummary: {
      total: cookies.length,
      thirdParty: thirdPartyCookies.length,
      insecure: insecureCookies.length,
      session: sessionCookies.length,
      sameSiteNoneInsecure: sameSiteNoneInsecure.length,
      tracking: trackingCookies.length,
      longLived: longLivedCookies.length
    },
    scripts: existing.thirdPartyScripts || [],
    scriptBreakdown,
    fingerprinting: existing.fingerprintEvents || [],
    fingerprintBreakdown: fpBreakdown,
    ruleMatches: existing.ruleMatches || [],
    storageAccess: existing.storageAccess || [],
    webrtcLeaks: existing.webrtcLeaks || [],
    suspiciousRequests: existing.suspiciousRequests || [],
    privacyRisk
  };
}

function isTrackingCookie(cookie) {
  const trackingNames = ['_ga', '_gid', '_fbp', '_fbc', 'fr', 'xs', 'c_user', 'datr', 'sb', '_gcl_', 'IDE', 'NID', 'DSID', '_uetsid', '_uetvid', 'muc_ads', 'personalization_id'];
  return trackingNames.some(name => cookie.name.startsWith(name) || cookie.name.includes(name));
}

function isLongLivedCookie(cookie) {
  if (cookie.session) return false;
  const now = Date.now() / 1000;
  const expiresIn = cookie.expirationDate - now;
  const oneYear = 365 * 24 * 60 * 60;
  return expiresIn > oneYear;
}

function calculatePrivacyRisk(cookies, scripts, fpEvents, findings) {
  let risk = 0;
  
  // Cookie risks
  const thirdPartyCookies = cookies.filter(c => c.thirdParty).length;
  risk += Math.min(thirdPartyCookies * 3, 20);
  risk += cookies.filter(c => isTrackingCookie(c)).length * 2;
  risk += cookies.filter(c => !c.secure).length;
  
  // Script risks
  const trackerScripts = scripts.filter(s => s.isTracker).length;
  risk += Math.min(trackerScripts * 4, 25);
  risk += scripts.filter(s => s.category === 'fingerprinting').length * 5;
  risk += scripts.filter(s => s.isFingerprintScript).length * 5;
  
  // Fingerprinting risks
  risk += Math.min(fpEvents.length * 2, 20);
  
  // WebRTC leaks
  risk += (findings.webrtcLeaks?.length || 0) * 10;
  
  // Storage access
  risk += Math.min((findings.storageAccess?.length || 0) * 2, 10);
  
  return Math.min(risk, 100);
}

async function blockTrackerDomains(tabId) {
  const findings = state.tabFindings.get(tabId);
  if (!findings || !findings.thirdPartyScripts?.length) return { addedRules: 0 };

  const trackers = findings.thirdPartyScripts
    .filter((s) => s.isTracker && s.matchedDomain)
    .map((s) => s.matchedDomain);

  const uniqueDomains = Array.from(new Set(trackers));
  if (!uniqueDomains.length) return { addedRules: 0 };

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const rulesToAdd = [];
  let nextId = existingRules.reduce((max, r) => Math.max(max, r.id), 0) + 1;

  uniqueDomains.forEach((domain) => {
    rulesToAdd.push({
      id: nextId++,
      priority: 1,
      action: {
        type: 'block'
      },
      condition: {
        urlFilter: `||${domain}^`,
        resourceTypes: ['script', 'xmlhttprequest', 'image', 'sub_frame', 'object']
      }
    });
  });

  if (!rulesToAdd.length) return { addedRules: 0 };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rulesToAdd,
    removeRuleIds: []
  });

  return { addedRules: rulesToAdd.length };
}

async function clearSiteCookies(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const tabUrl = tab?.url;
  if (!tabUrl) return { cleared: 0 };
  const cookies = await chrome.cookies.getAll({ url: tabUrl });
  let cleared = 0;
  await Promise.all(
    cookies.map(async (cookie) => {
      try {
        const cookieUrl = `${cookie.secure ? 'https' : 'http'}://${cookie.domain.replace(/^\./, '')}${cookie.path || '/'}`;
        await chrome.cookies.remove({ url: cookieUrl, name: cookie.name, storeId: cookie.storeId });
        cleared += 1;
      } catch (e) {
        console.warn('Failed to remove cookie', cookie.name, e);
      }
    })
  );
  return { cleared };
}

async function blockHighRiskCookies(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const tabUrl = tab?.url;
  if (!tabUrl) return { blocked: 0, details: [] };
  
  const cookies = await chrome.cookies.getAll({ url: tabUrl });
  const host = getDomainFromUrl(tabUrl);
  let blocked = 0;
  const details = [];
  
  // Tracking cookie name patterns
  const trackingPatterns = [
    '_ga', '_gid', '_gat', '_fbp', '_fbc', 'fr', 'xs', 'c_user', 'datr', 'sb',
    '_gcl_', 'IDE', 'NID', 'DSID', '_uetsid', '_uetvid', 'muc_ads', 'personalization_id',
    '__utma', '__utmb', '__utmc', '__utmz', '__utmv', 'MUID', '_clck', '_clsk',
    'hubspotutk', '_hjid', '_hjSessionUser', 'ajs_user_id', 'ajs_anonymous_id',
    'mp_', 'amplitude_id', '_pin_unauth', '_pinterest_sess', 'li_sugr', 'bcookie',
    'bscookie', 'lidc', 'UserMatchHistory', 'AnalyticsSyncHistory', '_tt_enable_cookie',
    '_ttp', 'tt_webid', 'tt_webid_v2'
  ];
  
  const isHighRisk = (cookie) => {
    // Third-party cookie
    const cookieHost = cookie.domain.replace(/^\./, '');
    const isThirdParty = !host.endsWith(cookieHost) && !cookieHost.endsWith(host);
    
    // Tracking cookie
    const isTracking = trackingPatterns.some(pattern => 
      cookie.name.startsWith(pattern) || cookie.name.includes(pattern)
    );
    
    // Insecure cookie with SameSite=None
    const isInsecureSameSiteNone = cookie.sameSite === 'no_restriction' && !cookie.secure;
    
    // Long-lived cookie (more than 1 year)
    const now = Date.now() / 1000;
    const oneYear = 365 * 24 * 60 * 60;
    const isLongLived = !cookie.session && cookie.expirationDate && (cookie.expirationDate - now > oneYear);
    
    return {
      isHighRisk: isThirdParty || isTracking || isInsecureSameSiteNone,
      reasons: [
        isThirdParty && 'third-party',
        isTracking && 'tracking',
        isInsecureSameSiteNone && 'insecure-samesite-none',
        isLongLived && 'long-lived'
      ].filter(Boolean)
    };
  };
  
  await Promise.all(
    cookies.map(async (cookie) => {
      const risk = isHighRisk(cookie);
      if (risk.isHighRisk) {
        try {
          const cookieUrl = `${cookie.secure ? 'https' : 'http'}://${cookie.domain.replace(/^\./, '')}${cookie.path || '/'}`;
          await chrome.cookies.remove({ url: cookieUrl, name: cookie.name, storeId: cookie.storeId });
          blocked += 1;
          details.push({
            name: cookie.name,
            domain: cookie.domain,
            reasons: risk.reasons
          });
        } catch (e) {
          console.warn('Failed to block cookie', cookie.name, e);
        }
      }
    })
  );
  
  return { blocked, details };
}

async function injectFingerprintBlockers(tabId) {
  const code = `
    (function() {
      const noop = () => '';
      const warn = (name) => () => { console.warn('Blocked fingerprint API:', name); return ''; };
      try {
        const patchMethod = (obj, key) => {
          if (!obj || !obj[key]) return;
          const original = obj[key];
          obj[key] = function() { return noop(); };
          obj[key].toString = () => original.toString();
        };
        
        // Canvas fingerprinting
        patchMethod(HTMLCanvasElement.prototype, 'toDataURL');
        patchMethod(HTMLCanvasElement.prototype, 'toBlob');
        patchMethod(CanvasRenderingContext2D.prototype, 'getImageData');
        
        // WebGL fingerprinting
        patchMethod(WebGLRenderingContext.prototype, 'readPixels');
        patchMethod(WebGL2RenderingContext?.prototype || {}, 'readPixels');
        patchMethod(WebGLRenderingContext.prototype, 'getParameter');
        patchMethod(WebGLRenderingContext.prototype, 'getExtension');
        patchMethod(WebGLRenderingContext.prototype, 'getSupportedExtensions');
        
        // Navigator properties
        const NavigatorProto = Navigator.prototype;
        ['userAgent','hardwareConcurrency','deviceMemory','language','languages','platform','vendor','maxTouchPoints','cpuClass'].forEach((prop) => {
          try {
            Object.defineProperty(NavigatorProto, prop, { get: () => 'blocked', configurable: true });
          } catch (e) {}
        });
        
        // Screen properties
        const screenProps = ['width', 'height', 'availWidth', 'availHeight', 'colorDepth', 'pixelDepth'];
        screenProps.forEach((prop) => {
          try {
            Object.defineProperty(Screen.prototype, prop, { get: () => 0, configurable: true });
          } catch (e) {}
        });
        
        // Audio fingerprinting
        const OrigAudioContext = window.AudioContext;
        if (OrigAudioContext) {
          window.AudioContext = new Proxy(OrigAudioContext, {
            construct(target, args) {
              console.warn('Blocked AudioContext fingerprinting');
              throw new Error('AudioContext blocked by Privacy Super Guard');
            }
          });
        }
        const OrigOfflineAudioContext = window.OfflineAudioContext;
        if (OrigOfflineAudioContext) {
          window.OfflineAudioContext = new Proxy(OrigOfflineAudioContext, {
            construct(target, args) {
              console.warn('Blocked OfflineAudioContext fingerprinting');
              throw new Error('OfflineAudioContext blocked by Privacy Super Guard');
            }
          });
        }
        
        // WebRTC leak prevention
        const OrigRTCPeerConnection = window.RTCPeerConnection;
        if (OrigRTCPeerConnection) {
          window.RTCPeerConnection = new Proxy(OrigRTCPeerConnection, {
            construct(target, args) {
              console.warn('Blocked RTCPeerConnection (WebRTC leak prevention)');
              throw new Error('RTCPeerConnection blocked by Privacy Super Guard');
            }
          });
        }
        
        // Font detection prevention
        const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
        const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
        
        // Battery API
        if (navigator.getBattery) {
          navigator.getBattery = () => Promise.reject(new Error('Battery API blocked'));
        }
        
        // Connection API
        if (navigator.connection) {
          Object.defineProperty(navigator, 'connection', { get: () => undefined });
        }
        
        // Device orientation
        window.addEventListener = new Proxy(window.addEventListener, {
          apply(target, thisArg, args) {
            if (['deviceorientation', 'devicemotion'].includes(args[0])) {
              console.warn('Blocked device orientation/motion events');
              return;
            }
            return Reflect.apply(target, thisArg, args);
          }
        });
        
      } catch (e) {
        console.error('Failed to inject fingerprint blockers', e);
      }
    })();
  `;
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    world: 'MAIN',
    func: (snippet) => {
      // eslint-disable-next-line no-new-func
      const fn = new Function(snippet);
      fn();
    },
    args: [code]
  });
  return { injected: true };
}

if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const tabId = info.request?.tabId;
    
    // Increment blocked count
    state.sessionBlockedCount++;
    
    // Update badge to show blocking is active
    if (tabId && tabId > 0) {
      const existing = getTabFindings(tabId);
      const count = (existing.ruleMatches || []).length;
      chrome.action.setBadgeBackgroundColor({ color: '#4ac1c5' });
      chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '', tabId });
    }
    
    if (typeof tabId !== 'number' || tabId < 0) return;
    const existing = getTabFindings(tabId);
    const matches = existing.ruleMatches || [];
    matches.push({
      ruleId: info.rule?.ruleId,
      url: info.request?.url,
      initiator: info.request?.initiator,
      time: Date.now(),
      blocked: true
    });
    if (matches.length > 50) {
      matches.shift();
    }
    state.tabFindings.set(tabId, {
      ...existing,
      ruleMatches: matches
    });
  });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  await initializeSettings();
  // Set default badge
  chrome.action.setBadgeBackgroundColor({ color: '#4ac1c5' });
  
  // Open welcome page on install
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'welcome.html' });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeSettings();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const tabId = sender.tab?.id || message.tabId;
    switch (message.type) {
      case 'scriptSources': {
        if (!state.trackers.length) {
          await loadTrackers();
        }
        const findings = classifyScripts(message.sources || []);
        const existing = getTabFindings(tabId);
        state.tabFindings.set(tabId, {
          ...existing,
          scriptSources: message.sources || [],
          thirdPartyScripts: findings
        });
        sendResponse({ ok: true });
        break;
      }
      case 'fingerprintEvent': {
        const existing = getTabFindings(tabId);
        const events = existing.fingerprintEvents || [];
        // Limit events to prevent memory bloat
        if (events.length >= 100) events.shift();
        events.push({
          api: message.api,
          timestamp: Date.now()
        });
        state.tabFindings.set(tabId, {
          ...existing,
          fingerprintEvents: events
        });
        sendResponse({ ok: true });
        break;
      }
      case 'storageAccess': {
        // Skip storage access tracking for performance - enable only if needed
        sendResponse({ ok: true });
        break;
      }
      case 'webrtcLeak': {
        const existing = getTabFindings(tabId);
        const leaks = existing.webrtcLeaks || [];
        if (leaks.length >= 20) leaks.shift();
        leaks.push({
          type: message.leakType,
          ip: message.ip,
          timestamp: Date.now()
        });
        state.tabFindings.set(tabId, {
          ...existing,
          webrtcLeaks: leaks
        });
        sendResponse({ ok: true });
        break;
      }
      case 'getData': {
        if (!state.trackers.length) {
          await loadTrackers();
        }
        const data = await handleRequestData(tabId);
        sendResponse({ ok: true, data });
        break;
      }
      case 'blockTrackers': {
        const result = await blockTrackerDomains(tabId);
        sendResponse({ ok: true, result });
        break;
      }
      case 'clearCookies': {
        const result = await clearSiteCookies(tabId);
        sendResponse({ ok: true, result });
        break;
      }
      case 'blockHighRiskCookies': {
        const result = await blockHighRiskCookies(tabId);
        sendResponse({ ok: true, result });
        break;
      }
      case 'clearStorage': {
        const result = await clearSiteStorage(tabId);
        sendResponse({ ok: true, result });
        break;
      }
      case 'blockFingerprinting': {
        const result = await injectFingerprintBlockers(tabId);
        sendResponse({ ok: true, result });
        break;
      }
      case 'getTrackers': {
        sendResponse({
          ok: true,
          trackers: state.trackers,
          userTrackers: state.userTrackers,
          categories: state.trackerCategories
        });
        break;
      }
      case 'addTracker': {
        const trackers = await addUserTracker(message.domain);
        sendResponse({ ok: true, trackers, userTrackers: state.userTrackers });
        break;
      }
      case 'removeTracker': {
        const trackers = await removeUserTracker(message.domain);
        sendResponse({ ok: true, trackers, userTrackers: state.userTrackers });
        break;
      }
      case 'getPrivacyReport': {
        const data = await handleRequestData(tabId);
        const report = generatePrivacyReport(data);
        sendResponse({ ok: true, report });
        break;
      }
      case 'injectFingerprintProbe': {
        try {
          await chrome.scripting.executeScript({
            target: { tabId, allFrames: true },
            files: ['fingerprint-probe.js'],
            world: 'MAIN'
          });
          sendResponse({ ok: true });
        } catch (err) {
          console.debug('Could not inject fingerprint probe:', err);
          sendResponse({ ok: false, error: err.message });
        }
        break;
      }
      case 'getAutoBlockSettings': {
        sendResponse({
          ok: true,
          autoBlockEnabled: state.autoBlockEnabled,
          autoBlockFingerprinting: state.autoBlockFingerprinting,
          whitelistedSites: state.whitelistedSites
        });
        break;
      }
      case 'setAutoBlock': {
        const result = await setAutoBlockEnabled(message.enabled);
        sendResponse({ ok: true, ...result });
        break;
      }
      case 'setAutoBlockFingerprinting': {
        const result = await setAutoBlockFingerprinting(message.enabled);
        sendResponse({ ok: true, ...result });
        break;
      }
      case 'addWhitelistedSite': {
        const sites = await addWhitelistedSite(message.domain);
        sendResponse({ ok: true, whitelistedSites: sites });
        break;
      }
      case 'removeWhitelistedSite': {
        const sites = await removeWhitelistedSite(message.domain);
        sendResponse({ ok: true, whitelistedSites: sites });
        break;
      }
      case 'getBlockingStats': {
        const stats = await getBlockingStats();
        sendResponse({ ok: true, stats });
        break;
      }
      default:
        sendResponse({ ok: false, error: 'Unknown message type' });
    }
  })();
  return true; // keep channel open for async
});

async function clearSiteStorage(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: () => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        const deleteAllDatabases = async () => {
          const dbs = await indexedDB.databases();
          dbs.forEach(db => indexedDB.deleteDatabase(db.name));
        };
        deleteAllDatabases();
        return true;
      } catch (e) {
        return false;
      }
    }
  });
  return { cleared: true };
}

function generatePrivacyReport(data) {
  const riskLevel = data.privacyRisk < 25 ? 'Low' : data.privacyRisk < 50 ? 'Medium' : data.privacyRisk < 75 ? 'High' : 'Critical';
  
  return {
    riskLevel,
    riskScore: data.privacyRisk,
    summary: {
      cookies: {
        total: data.cookiesSummary.total,
        concerns: [
          data.cookiesSummary.thirdParty > 0 && `${data.cookiesSummary.thirdParty} third-party cookies`,
          data.cookiesSummary.tracking > 0 && `${data.cookiesSummary.tracking} tracking cookies`,
          data.cookiesSummary.insecure > 0 && `${data.cookiesSummary.insecure} insecure cookies`
        ].filter(Boolean)
      },
      scripts: {
        trackers: data.scripts.filter(s => s.isTracker).length,
        byCategory: data.scriptBreakdown
      },
      fingerprinting: {
        total: data.fingerprinting.length,
        byType: data.fingerprintBreakdown
      },
      recommendations: generateRecommendations(data)
    }
  };
}

function generateRecommendations(data) {
  const recs = [];
  
  if (data.cookiesSummary.thirdParty > 3) {
    recs.push({ priority: 'high', action: 'Clear third-party cookies to reduce tracking' });
  }
  if (data.scripts.filter(s => s.category === 'advertising').length > 0) {
    recs.push({ priority: 'medium', action: 'Block advertising trackers to improve privacy' });
  }
  if (data.fingerprinting.length > 2) {
    recs.push({ priority: 'high', action: 'Enable fingerprinting protection to prevent device identification' });
  }
  if (data.webrtcLeaks?.length > 0) {
    recs.push({ priority: 'critical', action: 'WebRTC is leaking your real IP address - enable protection' });
  }
  if (data.cookiesSummary.sameSiteNoneInsecure > 0) {
    recs.push({ priority: 'medium', action: 'Some cookies have weak security settings' });
  }
  
  return recs;
}

// Clean up findings when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  state.tabFindings.delete(tabId);
});

// Periodic cleanup - keep only recent tab data
setInterval(() => {
  const now = Date.now();
  const maxAge = 15 * 60 * 1000; // 15 minutes
  
  state.tabFindings.forEach((findings, tabId) => {
    if (findings.lastUpdate && (now - findings.lastUpdate) > maxAge) {
      state.tabFindings.delete(tabId);
    }
  });
}, 60000); // Run every minute
