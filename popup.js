// Browser API compatibility for Chrome and Edge
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Theme management
async function loadTheme() {
  const stored = await chrome.storage.local.get({ theme: 'dark' });
  const theme = stored.theme || 'dark';
  applyTheme(theme);
}

function applyTheme(theme) {
  const body = document.body;
  const html = document.documentElement;
  const themeBtn = document.getElementById('themeToggle');
  
  if (theme === 'light') {
    body.classList.add('light-theme');
    html.classList.add('light-theme');
    body.classList.remove('dark-theme');
    if (themeBtn) themeBtn.textContent = '☀️';
  } else {
    body.classList.remove('light-theme');
    html.classList.remove('light-theme');
    body.classList.add('dark-theme');
    if (themeBtn) themeBtn.textContent = '🌙';
  }
  
  chrome.storage.local.set({ theme });
  localStorage.setItem('theme', theme);
}

async function toggleTheme() {
  const stored = await chrome.storage.local.get({ theme: 'dark' });
  const currentTheme = stored.theme || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

// State
let overlayVisible = false;
let autoRefreshInterval = null;
let protectionEnabled = false;
let autoBlockEnabled = true;
let currentTabUrl = '';

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabUrl = tab?.url || '';
  return tab?.id;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setSeverity(el, level) {
  const normalized = level || 'low';
  el.textContent = normalized.toUpperCase();
  el.className = `pill ${normalized}`;
}

function severityFromCount(count) {
  if (count === 0) return 'low';
  if (count <= 2) return 'med';
  return 'high';
}

function setOverallRisk(risk) {
  const badge = document.getElementById('overallRisk');
  if (risk < 25) {
    badge.textContent = 'LOW RISK';
    badge.className = 'risk-badge risk-low';
  } else if (risk < 50) {
    badge.textContent = 'MEDIUM RISK';
    badge.className = 'risk-badge risk-medium';
  } else if (risk < 75) {
    badge.textContent = 'HIGH RISK';
    badge.className = 'risk-badge risk-high';
  } else {
    badge.textContent = 'CRITICAL';
    badge.className = 'risk-badge risk-critical';
  }
}

function renderCategoryChart(breakdown) {
  const chart = document.getElementById('categoryChart');
  const total = (breakdown.advertising || 0) + (breakdown.analytics || 0) + (breakdown.social || 0) + (breakdown.fingerprinting || 0) + (breakdown.other || 0);
  
  if (total === 0) {
    chart.innerHTML = '<div style="flex:1; display:flex; align-items:center; justify-content:center; color: var(--safe); font-size: 11px;">✓ No trackers detected</div>';
    return;
  }
  
  const bars = [
    { class: 'bar-ads', count: breakdown.advertising || 0, label: 'Ads' },
    { class: 'bar-analytics', count: breakdown.analytics || 0, label: 'Analytics' },
    { class: 'bar-social', count: breakdown.social || 0, label: 'Social' },
    { class: 'bar-fp', count: breakdown.fingerprinting || 0, label: 'FP' },
    { class: 'bar-other', count: breakdown.other || 0, label: 'Other' }
  ].filter(b => b.count > 0);
  
  chart.innerHTML = bars.map(b => 
    `<div class="category-bar ${b.class}" style="flex: ${b.count}" title="${b.label}: ${b.count}">${b.count}</div>`
  ).join('');
}

function renderScripts(scripts) {
  const list = document.getElementById('scriptList');
  list.innerHTML = '';
  if (!scripts?.length) {
    list.innerHTML = '<li>No tracker scripts detected yet.</li>';
    return;
  }
  
  const trackers = scripts.filter((s) => s.isTracker);
  if (!trackers.length) {
    list.innerHTML = '<li style="color: var(--safe);">✓ No known tracker domains found.</li>';
    return;
  }
  
  // Group by category
  const grouped = {};
  trackers.forEach(s => {
    const cat = s.category || 'unknown';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });
  
  Object.entries(grouped).slice(0, 4).forEach(([category, items]) => {
    const li = document.createElement('li');
    const hosts = items.slice(0, 2).map(s => s.host).join(', ');
    const more = items.length > 2 ? ` +${items.length - 2} more` : '';
    li.innerHTML = `<strong style="text-transform: capitalize;">${category}:</strong> ${hosts}${more}`;
    list.appendChild(li);
  });
}

function renderFingerprintBreakdown(breakdown) {
  document.getElementById('fpCanvas').textContent = breakdown.canvas || 0;
  document.getElementById('fpWebgl').textContent = breakdown.webgl || 0;
  document.getElementById('fpAudio').textContent = breakdown.audio || 0;
  document.getElementById('fpNavigator').textContent = breakdown.navigator || 0;
  document.getElementById('fpScreen').textContent = breakdown.screen || 0;
  document.getElementById('fpFonts').textContent = breakdown.fonts || 0;
}

function renderRecommendations(recommendations) {
  const container = document.getElementById('recList');
  if (!recommendations?.length) {
    container.innerHTML = '<div class="rec-item"><span style="color: var(--safe);">✓ No major privacy concerns detected.</span></div>';
    return;
  }
  
  container.innerHTML = recommendations.map(rec => `
    <div class="rec-item">
      <div class="rec-priority ${rec.priority}"></div>
      <span>${rec.action}</span>
    </div>
  `).join('');
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Get domain from URL
function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return '';
  }
}

// Format timestamp
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

// Update current site display
function updateCurrentSite() {
  const siteEl = document.getElementById('currentSite');
  if (siteEl && currentTabUrl) {
    const domain = getDomainFromUrl(currentTabUrl);
    siteEl.textContent = domain || 'Unknown';
    siteEl.title = currentTabUrl;
  }
}

async function refresh() {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  
  // Update current site
  updateCurrentSite();
  
  const res = await chrome.runtime.sendMessage({ type: 'getData', tabId });
  const data = res?.data;
  if (!data) return;

  // Update overall risk
  setOverallRisk(data.privacyRisk || 0);
  
  // Update last scan time
  const lastScanEl = document.getElementById('lastScan');
  if (lastScanEl) {
    lastScanEl.textContent = `Last scan: ${formatTime(Date.now())}`;
  }

  // Cookies section
  document.getElementById('cookieCount').textContent = `${data.cookiesSummary.total} total`;
  document.getElementById('thirdPartyCookieLine').textContent = `Third-party cookies: ${data.cookiesSummary.thirdParty}`;
  document.getElementById('trackingCookieLine').textContent = `Tracking cookies: ${data.cookiesSummary.tracking || 0}`;
  document.getElementById('insecureCookieLine').textContent = `Insecure cookies: ${data.cookiesSummary.insecure}`;
  document.getElementById('sessionCookieLine').textContent = `Session cookies: ${data.cookiesSummary.session}`;
  document.getElementById('sameSiteNoneLine').textContent = `SameSite=None w/o Secure: ${data.cookiesSummary.sameSiteNoneInsecure}`;
  document.getElementById('longLivedCookieLine').textContent = `Long-lived cookies: ${data.cookiesSummary.longLived || 0}`;
  
  const cookieRisk = data.cookiesSummary.thirdParty + data.cookiesSummary.sameSiteNoneInsecure + (data.cookiesSummary.tracking || 0);
  setSeverity(document.getElementById('cookieSeverity'), severityFromCount(Math.floor(cookieRisk / 2)));

  // Scripts section
  const trackerScripts = data.scripts.filter((s) => s.isTracker);
  document.getElementById('scriptCount').textContent = `${trackerScripts.length} trackers`;
  setSeverity(document.getElementById('scriptSeverity'), severityFromCount(trackerScripts.length));
  renderScripts(data.scripts);
  renderCategoryChart(data.scriptBreakdown || {});

  // Fingerprinting section
  const fpAttempts = data.fingerprinting || [];
  document.getElementById('fingerprintCount').textContent = `${fpAttempts.length} signals`;
  setSeverity(document.getElementById('fingerprintSeverity'), severityFromCount(Math.floor(fpAttempts.length / 3)));
  renderFingerprintBreakdown(data.fingerprintBreakdown || {});
  
  // WebRTC warning
  const webrtcWarning = document.getElementById('webrtcWarning');
  if (data.webrtcLeaks?.length > 0) {
    webrtcWarning.style.display = 'block';
    webrtcWarning.innerHTML = `⚠️ WebRTC IP Leak Detected! IPs exposed: ${data.webrtcLeaks.map(l => l.ip).join(', ')}`;
  } else {
    webrtcWarning.style.display = 'none';
  }
  
  // Storage access
  const storageAccess = data.storageAccess || [];
  const storageCountEl = document.getElementById('storageAccessCount');
  if (storageCountEl) {
    storageCountEl.textContent = `${storageAccess.length} operations`;
  }

  // Rule matches
  const ruleMatches = data.ruleMatches || [];
  document.getElementById('ruleMatchCount').textContent = `${ruleMatches.length} blocked`;

  // Get recommendations
  const reportRes = await chrome.runtime.sendMessage({ type: 'getPrivacyReport', tabId });
  if (reportRes?.ok && reportRes.report) {
    renderRecommendations(reportRes.report.summary?.recommendations || []);
  }

  // Update overlay if visible
  if (overlayVisible) {
    chrome.tabs.sendMessage(tabId, { type: 'updateOverlay', data });
  }
  
  // Update protection status
  await loadProtectionStatus();
}

async function runAction(action) {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  const status = document.getElementById('status');
  status.textContent = 'Working…';
  const res = await chrome.runtime.sendMessage({ type: action, tabId });
  if (res?.ok) {
    status.textContent = 'Done. Refreshing…';
    setTimeout(refresh, 400);
  } else {
    status.textContent = 'Something went wrong.';
  }
}

document.getElementById('blockTrackers').addEventListener('click', () => runAction('blockTrackers'));
document.getElementById('clearCookies').addEventListener('click', () => runAction('clearCookies'));
document.getElementById('blockHighRiskCookies').addEventListener('click', () => runActionWithDetails('blockHighRiskCookies'));
document.getElementById('clearStorage').addEventListener('click', () => runAction('clearStorage'));
document.getElementById('blockFingerprinting').addEventListener('click', () => runAction('blockFingerprinting'));

async function runActionWithDetails(action) {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  const status = document.getElementById('status');
  status.textContent = 'Working…';
  const res = await chrome.runtime.sendMessage({ type: action, tabId });
  if (res?.ok) {
    const result = res.result || {};
    if (action === 'blockHighRiskCookies') {
      status.textContent = `Blocked ${result.blocked || 0} high-risk cookies. Refreshing…`;
    } else {
      status.textContent = 'Done. Refreshing…';
    }
    setTimeout(refresh, 400);
  } else {
    status.textContent = 'Something went wrong.';
  }
}

// Collapsible sections
document.querySelectorAll('.section-header').forEach(header => {
  header.addEventListener('click', () => {
    const targetId = header.dataset.target;
    if (!targetId) return;
    const content = document.getElementById(targetId);
    const icon = header.querySelector('.expand-icon');
    if (content) {
      content.classList.toggle('expanded');
      if (icon) icon.classList.toggle('rotated');
    }
  });
});

async function toggleOverlay() {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  overlayVisible = !overlayVisible;
  const button = document.getElementById('overlayToggle');
  if (overlayVisible) {
    const res = await chrome.runtime.sendMessage({ type: 'getData', tabId });
    button.textContent = 'Hide in-page overlay';
    await chrome.tabs.sendMessage(tabId, { type: 'toggleOverlay', visible: true, data: res?.data });
  } else {
    button.textContent = 'Show in-page overlay';
    await chrome.tabs.sendMessage(tabId, { type: 'toggleOverlay', visible: false });
  }
}

document.getElementById('overlayToggle').addEventListener('click', toggleOverlay);

function renderUserTrackers(list) {
  const container = document.getElementById('userTrackerList');
  container.innerHTML = '';
  if (!list?.length) {
    const empty = document.createElement('span');
    empty.className = 'label';
    empty.textContent = 'None added yet.';
    container.appendChild(empty);
    return;
  }
  list.slice(0, 8).forEach((domain) => {
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = domain;
    pill.style.cursor = 'pointer';
    pill.title = 'Click to remove';
    pill.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'removeTracker', domain });
      const updated = await chrome.runtime.sendMessage({ type: 'getTrackers' });
      renderUserTrackers(updated?.userTrackers || []);
      await refresh();
    });
    container.appendChild(pill);
  });
}

async function loadTrackers() {
  const res = await chrome.runtime.sendMessage({ type: 'getTrackers' });
  renderUserTrackers(res?.userTrackers || []);
}

async function handleAddTracker() {
  const input = document.getElementById('trackerInput');
  const value = input.value.trim();
  if (!value) return;
  await chrome.runtime.sendMessage({ type: 'addTracker', domain: value });
  input.value = '';
  await loadTrackers();
  await refresh();
}

document.getElementById('addTrackerBtn').addEventListener('click', handleAddTracker);
document.getElementById('trackerInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleAddTracker();
  }
});

// Theme toggle listener
document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

// Load initial theme
loadTheme();

refresh();
loadTrackers();

// Auto-refresh functionality
function startAutoRefresh() {
  if (autoRefreshInterval) return;
  autoRefreshInterval = setInterval(refresh, 5000);
  const btn = document.getElementById('autoRefreshBtn');
  if (btn) {
    btn.textContent = '⏸ Stop Auto';
    btn.classList.add('active');
  }
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
  const btn = document.getElementById('autoRefreshBtn');
  if (btn) {
    btn.textContent = '▶ Auto Refresh';
    btn.classList.remove('active');
  }
}

function toggleAutoRefresh() {
  if (autoRefreshInterval) {
    stopAutoRefresh();
  } else {
    startAutoRefresh();
  }
}

// Export privacy report
async function exportReport() {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  
  const status = document.getElementById('status');
  status.textContent = 'Generating report...';
  
  const dataRes = await chrome.runtime.sendMessage({ type: 'getData', tabId });
  const reportRes = await chrome.runtime.sendMessage({ type: 'getPrivacyReport', tabId });
  
  const report = {
    generatedAt: new Date().toISOString(),
    url: currentTabUrl,
    domain: getDomainFromUrl(currentTabUrl),
    riskLevel: reportRes?.report?.riskLevel || 'Unknown',
    riskScore: dataRes?.data?.privacyRisk || 0,
    cookies: dataRes?.data?.cookiesSummary || {},
    trackers: (dataRes?.data?.scripts || []).filter(s => s.isTracker).map(s => ({
      domain: s.host,
      category: s.category,
      riskScore: s.riskScore
    })),
    fingerprinting: {
      total: (dataRes?.data?.fingerprinting || []).length,
      breakdown: dataRes?.data?.fingerprintBreakdown || {}
    },
    webrtcLeaks: dataRes?.data?.webrtcLeaks || [],
    recommendations: reportRes?.report?.summary?.recommendations || []
  };
  
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `privacy-report-${getDomainFromUrl(currentTabUrl)}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  status.textContent = 'Report exported!';
  setTimeout(() => { status.textContent = ''; }, 2000);
}

// Quick protect - run all protections at once
async function quickProtect() {
  const tabId = await getActiveTabId();
  if (!tabId) return;
  
  const status = document.getElementById('status');
  status.textContent = 'Applying full protection...';
  
  try {
    // Block trackers
    await chrome.runtime.sendMessage({ type: 'blockTrackers', tabId });
    // Block high-risk cookies
    await chrome.runtime.sendMessage({ type: 'blockHighRiskCookies', tabId });
    // Block fingerprinting
    await chrome.runtime.sendMessage({ type: 'blockFingerprinting', tabId });
    
    status.textContent = '✓ Full protection applied!';
    setTimeout(refresh, 500);
  } catch (e) {
    status.textContent = 'Some protections failed.';
  }
}

// Protection status management
async function loadProtectionStatus() {
  const stored = await chrome.storage.local.get({ protectionEnabled: false, whitelist: [] });
  protectionEnabled = stored.protectionEnabled;
  
  const toggle = document.getElementById('protectionToggle');
  if (toggle) {
    toggle.checked = protectionEnabled;
  }
  
  const domain = getDomainFromUrl(currentTabUrl);
  const isWhitelisted = stored.whitelist.includes(domain);
  const whitelistBtn = document.getElementById('whitelistBtn');
  if (whitelistBtn) {
    whitelistBtn.textContent = isWhitelisted ? '✓ Whitelisted' : 'Whitelist Site';
    whitelistBtn.classList.toggle('active', isWhitelisted);
  }
  
  // Load auto-block settings
  await loadAutoBlockSettings();
}

async function loadAutoBlockSettings() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'getAutoBlockSettings' });
    if (res?.ok) {
      autoBlockEnabled = res.autoBlockEnabled;
      const autoBlockToggle = document.getElementById('autoBlockToggle');
      if (autoBlockToggle) {
        autoBlockToggle.checked = autoBlockEnabled;
      }
      
      const protectionToggle = document.getElementById('protectionToggle');
      if (protectionToggle) {
        protectionToggle.checked = res.autoBlockFingerprinting;
      }
    }
    
    // Load blocking stats
    const statsRes = await chrome.runtime.sendMessage({ type: 'getBlockingStats' });
    if (statsRes?.ok) {
      const sessionEl = document.getElementById('blockedThisSession');
      const totalEl = document.getElementById('blockedTotal');
      if (sessionEl) sessionEl.textContent = statsRes.stats.sessionBlocked || 0;
      if (totalEl) totalEl.textContent = statsRes.stats.totalBlocked || 0;
    }
  } catch (e) {
    console.error('Failed to load auto-block settings', e);
  }
}

async function toggleAutoBlock() {
  const toggle = document.getElementById('autoBlockToggle');
  const enabled = toggle?.checked ?? !autoBlockEnabled;
  
  const status = document.getElementById('status');
  status.textContent = enabled ? 'Enabling auto-block...' : 'Disabling auto-block...';
  
  try {
    const res = await chrome.runtime.sendMessage({ type: 'setAutoBlock', enabled });
    if (res?.ok) {
      autoBlockEnabled = res.autoBlockEnabled;
      status.textContent = autoBlockEnabled ? '✓ Auto-blocking enabled' : 'Auto-blocking disabled';
    } else {
      status.textContent = 'Failed to update settings';
    }
  } catch (e) {
    status.textContent = 'Error updating settings';
  }
  
  setTimeout(() => { status.textContent = ''; }, 2000);
}

async function toggleProtection() {
  const toggle = document.getElementById('protectionToggle');
  const enabled = toggle?.checked ?? !protectionEnabled;
  
  const status = document.getElementById('status');
  status.textContent = enabled ? 'Enabling fingerprint blocking...' : 'Disabling fingerprint blocking...';
  
  try {
    const res = await chrome.runtime.sendMessage({ type: 'setAutoBlockFingerprinting', enabled });
    if (res?.ok) {
      protectionEnabled = res.autoBlockFingerprinting;
      status.textContent = protectionEnabled ? '✓ Fingerprint blocking enabled' : 'Fingerprint blocking disabled';
      
      // Also inject blockers on current tab if enabled
      if (protectionEnabled) {
        const tabId = await getActiveTabId();
        if (tabId) {
          await chrome.runtime.sendMessage({ type: 'blockFingerprinting', tabId });
        }
      }
    } else {
      status.textContent = 'Failed to update settings';
    }
  } catch (e) {
    status.textContent = 'Error updating settings';
  }
  
  setTimeout(() => { status.textContent = ''; }, 2000);
}

async function toggleWhitelist() {
  const domain = getDomainFromUrl(currentTabUrl);
  if (!domain) return;
  
  const stored = await chrome.storage.local.get({ whitelist: [] });
  let whitelist = stored.whitelist || [];
  
  if (whitelist.includes(domain)) {
    whitelist = whitelist.filter(d => d !== domain);
  } else {
    whitelist.push(domain);
  }
  
  await chrome.storage.local.set({ whitelist });
  await loadProtectionStatus();
  
  const status = document.getElementById('status');
  status.textContent = whitelist.includes(domain) ? `${domain} whitelisted` : `${domain} removed from whitelist`;
  setTimeout(() => { status.textContent = ''; }, 2000);
}

// Manual refresh button
async function manualRefresh() {
  const status = document.getElementById('status');
  status.textContent = 'Refreshing...';
  await refresh();
  status.textContent = 'Refreshed!';
  setTimeout(() => { status.textContent = ''; }, 1500);
}

// Event listeners for new features
document.getElementById('autoRefreshBtn')?.addEventListener('click', toggleAutoRefresh);
document.getElementById('exportBtn')?.addEventListener('click', exportReport);
document.getElementById('quickProtectBtn')?.addEventListener('click', quickProtect);
document.getElementById('protectionToggle')?.addEventListener('change', toggleProtection);
document.getElementById('autoBlockToggle')?.addEventListener('change', toggleAutoBlock);
document.getElementById('whitelistBtn')?.addEventListener('click', toggleWhitelist);
document.getElementById('refreshBtn')?.addEventListener('click', manualRefresh);

// Cleanup on popup close
window.addEventListener('unload', () => {
  stopAutoRefresh();
});
