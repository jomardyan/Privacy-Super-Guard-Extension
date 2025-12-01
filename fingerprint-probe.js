// This script is injected into the page context (MAIN world) to detect fingerprinting
// Compatible with Chrome and Edge browsers
(function(extensionSource) {
  // Guard against multiple injections
  if (window.__privacyInsightInjected) return;
  window.__privacyInsightInjected = true;
  
  // Debounce event reporting to prevent message spam
  const reportQueue = new Map();
  const flushReports = () => {
    reportQueue.forEach((details, api) => {
      window.postMessage({ source: extensionSource, type: 'fingerprint-event', api, details }, '*');
    });
    reportQueue.clear();
  };
  
  // Flush reports every 2 seconds instead of immediately
  setInterval(flushReports, 2000);
  
  const report = (api, details) => {
    // Batch reports to reduce message spam
    if (!reportQueue.has(api)) {
      reportQueue.set(api, details || {});
    }
  };

  // Only wrap methods once without aggressive reporting
  const wrapMethodOnce = (obj, key, label) => {
    if (!obj || !obj[key] || obj[key].__wrapped) return;
    const original = obj[key];
    try {
      const wrapped = function() {
        report(label);
        return original.apply(this, arguments);
      };
      wrapped.__wrapped = true;
      obj[key] = wrapped;
    } catch (e) {
      // Some properties might be read-only
    }
  };

  const wrapGetterOnce = (obj, prop, label) => {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
      if (descriptor && descriptor.get && !descriptor.get.__wrapped) {
        const originalGetter = descriptor.get;
        const newGetter = function() {
          report(label);
          return originalGetter.call(this);
        };
        newGetter.__wrapped = true;
        Object.defineProperty(obj, prop, {
          get: newGetter,
          configurable: true
        });
      }
    } catch (e) {}
  };

  // Canvas fingerprinting - only critical methods
  wrapMethodOnce(HTMLCanvasElement.prototype, 'toDataURL', 'canvas.toDataURL');
  wrapMethodOnce(HTMLCanvasElement.prototype, 'toBlob', 'canvas.toBlob');
  wrapMethodOnce(CanvasRenderingContext2D.prototype, 'getImageData', 'canvas.getImageData');

  // WebGL fingerprinting - only critical methods
  wrapMethodOnce(WebGLRenderingContext.prototype, 'getExtension', 'webgl.getExtension');
  wrapMethodOnce(WebGLRenderingContext.prototype, 'getParameter', 'webgl.getParameter');
  wrapMethodOnce(WebGLRenderingContext.prototype, 'readPixels', 'webgl.readPixels');
  
  if (window.WebGL2RenderingContext) {
    wrapMethodOnce(WebGL2RenderingContext.prototype, 'readPixels', 'webgl2.readPixels');
    wrapMethodOnce(WebGL2RenderingContext.prototype, 'getParameter', 'webgl2.getParameter');
  }

  // Audio fingerprinting - only on construction
  const OriginalAudioContext = window.AudioContext;
  if (OriginalAudioContext && !window.AudioContext.__wrapped) {
    window.AudioContext = new Proxy(OriginalAudioContext, {
      construct(target, args) {
        report('AudioContext.constructor');
        return Reflect.construct(target, args);
      }
    });
    window.AudioContext.__wrapped = true;
  }

  const OriginalOfflineAudioContext = window.OfflineAudioContext;
  if (OriginalOfflineAudioContext && !window.OfflineAudioContext.__wrapped) {
    window.OfflineAudioContext = new Proxy(OriginalOfflineAudioContext, {
      construct(target, args) {
        report('OfflineAudioContext.constructor');
        return Reflect.construct(target, args);
      }
    });
    window.OfflineAudioContext.__wrapped = true;
  }

  // Navigator properties - only critical ones
  const navProps = ['hardwareConcurrency', 'deviceMemory', 'userAgent'];
  navProps.forEach((prop) => {
    try {
      wrapGetterOnce(Navigator.prototype, prop, 'navigator.' + prop);
    } catch (e) {}
  });

  // Screen properties - debounced
  const screenProps = ['width', 'height', 'colorDepth', 'pixelDepth'];
  screenProps.forEach((prop) => {
    try {
      wrapGetterOnce(Screen.prototype, prop, 'screen.' + prop);
    } catch (e) {}
  });

  // WebRTC leak detection - minimal overhead
  const OrigRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
  if (OrigRTCPeerConnection && !window.RTCPeerConnection.__wrapped) {
    window.RTCPeerConnection = new Proxy(OrigRTCPeerConnection, {
      construct(target, args) {
        report('webrtc.RTCPeerConnection');
        const pc = Reflect.construct(target, args);
        try {
          const origAddEventListener = pc.addEventListener.bind(pc);
          pc.addEventListener = function(type, listener, options) {
            if (type === 'icecandidate') {
              const wrappedListener = function(event) {
                if (event.candidate?.candidate) {
                  const ipMatch = event.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
                  if (ipMatch) {
                    window.postMessage({
                      source: extensionSource,
                      type: 'webrtc-leak',
                      ip: ipMatch[1]
                    }, '*');
                  }
                }
                return listener.call(this, event);
              };
              return origAddEventListener(type, wrappedListener, options);
            }
            return origAddEventListener(type, listener, options);
          };
        } catch (e) {}
        return pc;
      }
    });
    window.RTCPeerConnection.__wrapped = true;
    if (window.webkitRTCPeerConnection) window.webkitRTCPeerConnection = window.RTCPeerConnection;
  }

  // IndexedDB access - minimal
  if (window.indexedDB && !window.indexedDB.__wrapped) {
    const origOpen = indexedDB.open.bind(indexedDB);
    indexedDB.open = function(name, version) {
      report('indexedDB.open');
      return origOpen(name, version);
    };
    window.indexedDB.__wrapped = true;
  }
})('privacy-super-guard');
