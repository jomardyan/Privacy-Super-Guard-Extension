(() => {
  // Browser API compatibility for Chrome and Edge
  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
  
  const EXTENSION_SOURCE = 'privacy-super-guard';
  let overlayRoot = null;
  let overlayVisible = false;
  
  // Debounce message queue to reduce spam
  const messageQueue = [];
  let flushTimeout = null;
  
  const flushMessages = () => {
    messageQueue.forEach(msg => {
      try {
        chrome.runtime.sendMessage(msg).catch(() => {});
      } catch (e) {}
    });
    messageQueue.length = 0;
    flushTimeout = null;
  };
  
  function queueMessage(payload) {
    messageQueue.push(payload);
    if (!flushTimeout) {
      flushTimeout = setTimeout(flushMessages, 1000);
    }
  }

  function createOverlayElements() {
    if (overlayRoot) return overlayRoot;
    const host = document.createElement('div');
    host.id = 'privacy-insight-overlay-host';
    host.style.position = 'fixed';
    host.style.top = '12px';
    host.style.right = '12px';
    host.style.zIndex = '2147483647';
    host.style.all = 'initial';
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; font-family: "Segoe UI", system-ui, sans-serif; }
      .card {
        background: #0b1220;
        color: #f7f9fd;
        min-width: 280px;
        max-width: 360px;
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 12px 30px rgba(0,0,0,0.35);
      }
      .row { display: flex; justify-content: space-between; margin: 5px 0; }
      .label { color: #7c8bac; font-size: 12px; }
      .value { font-weight: 700; }
      .title { display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-bottom: 8px; }
      .risk-badge {
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .risk-low { background: rgba(52,211,153,0.2); color: #34d399; }
      .risk-medium { background: rgba(251,191,36,0.2); color: #fbbf24; }
      .risk-high { background: rgba(248,113,113,0.2); color: #f87171; }
      .risk-critical { background: rgba(239,68,68,0.3); color: #ef4444; }
      .section-title { font-size: 11px; color: #4ac1c5; margin-top: 8px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
      button {
        background: transparent;
        border: none;
        color: #7c8bac;
        cursor: pointer;
        font-size: 12px;
      }
      .mini-chart { display: flex; gap: 2px; height: 16px; margin: 4px 0; }
      .mini-bar { flex: 1; border-radius: 2px; min-width: 8px; }
      .bar-ads { background: #f87171; }
      .bar-analytics { background: #fbbf24; }
      .bar-social { background: #60a5fa; }
      .bar-fp { background: #a78bfa; }
    `;
    shadow.appendChild(style);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="title">
        <span>Privacy Super Guard</span>
        <span class="risk-badge risk-low" id="ov-risk">LOW RISK</span>
        <button id="overlay-close" title="Hide overlay">✕</button>
      </div>
      <div class="row"><span class="label">Cookies</span><span class="value" id="ov-cookies">—</span></div>
      <div class="row"><span class="label">3rd-party cookies</span><span class="value" id="ov-thirdparty">—</span></div>
      <div class="row"><span class="label">Tracking cookies</span><span class="value" id="ov-tracking">—</span></div>
      <div class="section-title">Tracker Scripts</div>
      <div class="row"><span class="label">Total trackers</span><span class="value" id="ov-trackers">—</span></div>
      <div class="mini-chart" id="ov-chart"></div>
      <div class="section-title">Fingerprinting</div>
      <div class="row"><span class="label">Attempts detected</span><span class="value" id="ov-fp">—</span></div>
      <div class="row"><span class="label">Canvas/WebGL/Audio</span><span class="value" id="ov-fp-breakdown">—</span></div>
      <div class="label" style="margin-top:8px; font-size: 10px;">Open popup for full controls and mitigations.</div>
    `;
    shadow.appendChild(card);
    card.querySelector('#overlay-close').addEventListener('click', () => {
      overlayVisible = false;
      host.remove();
      overlayRoot = null;
    });
    document.documentElement.appendChild(host);
    overlayRoot = { host, shadow };
    return overlayRoot;
  }

  function renderOverlay(data) {
    const root = createOverlayElements();
    const shadow = root.shadow;
    const cookies = data?.cookiesSummary || {};
    const trackers = (data?.scripts || []).filter((s) => s.isTracker);
    const breakdown = data?.scriptBreakdown || {};
    const fpBreakdown = data?.fingerprintBreakdown || {};
    
    shadow.getElementById('ov-cookies').textContent = cookies.total ?? '—';
    shadow.getElementById('ov-thirdparty').textContent = cookies.thirdParty ?? '—';
    shadow.getElementById('ov-tracking').textContent = cookies.tracking ?? '—';
    shadow.getElementById('ov-trackers').textContent = trackers.length ?? '—';
    shadow.getElementById('ov-fp').textContent = (data?.fingerprinting || []).length ?? '—';
    shadow.getElementById('ov-fp-breakdown').textContent = `${fpBreakdown.canvas || 0}/${fpBreakdown.webgl || 0}/${fpBreakdown.audio || 0}`;
    
    // Update risk badge
    const riskBadge = shadow.getElementById('ov-risk');
    const risk = data?.privacyRisk || 0;
    if (risk < 25) {
      riskBadge.textContent = 'LOW RISK';
      riskBadge.className = 'risk-badge risk-low';
    } else if (risk < 50) {
      riskBadge.textContent = 'MEDIUM';
      riskBadge.className = 'risk-badge risk-medium';
    } else if (risk < 75) {
      riskBadge.textContent = 'HIGH';
      riskBadge.className = 'risk-badge risk-high';
    } else {
      riskBadge.textContent = 'CRITICAL';
      riskBadge.className = 'risk-badge risk-critical';
    }
    
    // Render mini chart
    const chart = shadow.getElementById('ov-chart');
    const total = (breakdown.advertising || 0) + (breakdown.analytics || 0) + (breakdown.social || 0) + (breakdown.fingerprinting || 0);
    if (total > 0) {
      chart.innerHTML = `
        <div class="mini-bar bar-ads" style="flex: ${breakdown.advertising || 0}" title="Advertising: ${breakdown.advertising || 0}"></div>
        <div class="mini-bar bar-analytics" style="flex: ${breakdown.analytics || 0}" title="Analytics: ${breakdown.analytics || 0}"></div>
        <div class="mini-bar bar-social" style="flex: ${breakdown.social || 0}" title="Social: ${breakdown.social || 0}"></div>
        <div class="mini-bar bar-fp" style="flex: ${breakdown.fingerprinting || 0}" title="Fingerprinting: ${breakdown.fingerprinting || 0}"></div>
      `;
    } else {
      chart.innerHTML = '<span style="color: #34d399; font-size: 10px;">No trackers detected</span>';
    }
  }

  function collectScriptSources() {
    const sources = Array.from(document.scripts || []).map((s) => s.src || 'inline').filter(Boolean);
    if (sources.length > 0) {
      queueMessage({ type: 'scriptSources', sources });
    }
  }

  function injectFingerprintProbe() {
    try {
      chrome.runtime.sendMessage({ type: 'injectFingerprintProbe' }).catch(() => {});
    } catch (e) {}
  }

  function injectCosmeticFilters() {
    const style = document.createElement('style');
    style.id = 'privacy-super-guard-cosmetic';
    style.textContent = `
      .adsbygoogle,
      .google-auto-placed,
      div[id^="google_ads_"],
      div[id*="ad-container"],
      iframe[src*="doubleclick.net"],
      iframe[src*="googlesyndication.com"],
      [aria-label="Advertisement"],
      [class*="ad-banner"],
      [id*="ad-banner"],
      .ad-slot,
      .ad-wrapper {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        width: 0 !important;
        pointer-events: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // Batch message events with debouncing
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data || {};
    if (data.source === EXTENSION_SOURCE) {
      switch (data.type) {
        case 'fingerprint-event':
          queueMessage({ type: 'fingerprintEvent', api: data.api, details: data.details });
          break;
        case 'storage-access':
          // Only queue if it's truly suspicious
          if (!data.key?.startsWith('__')) {
            queueMessage({ type: 'storageAccess', storageType: data.storageType, operation: data.operation, key: data.key });
          }
          break;
        case 'webrtc-leak':
          queueMessage({ type: 'webrtcLeak', leakType: data.leakType, ip: data.ip });
          break;
      }
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'toggleOverlay') {
      overlayVisible = Boolean(msg.visible);
      if (overlayVisible) {
        renderOverlay(msg.data);
      } else if (overlayRoot?.host) {
        overlayRoot.host.remove();
        overlayRoot = null;
      }
    } else if (msg.type === 'updateOverlay' && overlayVisible) {
      renderOverlay(msg.data);
    }
    sendResponse?.({ ok: true });
  });

  // Run ASAP but defer non-critical
  injectFingerprintProbe();
  injectCosmeticFilters();

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    collectScriptSources();
  } else {
    window.addEventListener('DOMContentLoaded', collectScriptSources, { once: true });
  }
})();
