# Privacy Super Guard

Advanced browser privacy protection with automatic tracker blocking, fingerprinting detection, and detailed privacy insights.

[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)
[![Version](https://img.shields.io/github/v/release/jomardyan/Privacy-Super-Guard-Extension)](https://github.com/jomardyan/Privacy-Super-Guard-Extension/releases)

## Why Privacy Super Guard?

Privacy Super Guard provides comprehensive, real-time protection against tracking, fingerprinting, and privacy invasions. Monitor exactly what's being blocked and understand your privacy exposure across all websites you visit.

## Key Features

- **Automatic tracker blocking** — blocks known tracking domains and scripts using declarativeNetRequest rules
- **Fingerprinting detection** — identifies and reports attempts to fingerprint your browser
- **Cookie management** — view, filter, and delete cookies with granular control
- **Privacy score** — real-time assessment of website privacy practices
- **Detailed statistics** — track blocked requests by type (trackers, ads, analytics, fingerprinting)
- **Per-site controls** — allowlist trusted sites or enable strict mode for high-risk domains
- **Dark mode support** — interface adapts to system theme preferences
- **Zero external dependencies** — all protection runs locally in your browser

## Installation

### From Source

```bash
git clone https://github.com/jomardyan/Privacy-Super-Guard-Extension.git
cd Privacy-Super-Guard-Extension
```

1. Open Chrome or Edge and navigate to `chrome://extensions/` or `edge://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the repository folder
4. The Privacy Super Guard icon appears in your toolbar

## Quick Start

1. Click the Privacy Super Guard icon to open the popup
2. View the current page's privacy score and blocked request statistics
3. Browse the **Trackers** tab to see detected tracking attempts
4. Check **Fingerprinting** tab for canvas/WebGL/audio fingerprinting detections
5. Use **Cookies** tab to manage site cookies
6. Configure global settings in the **Settings** tab

## Usage

### Privacy Dashboard

The popup interface provides real-time insights:

- **Privacy Score** — composite rating based on trackers, fingerprinting, and cookies
- **Blocked Requests** — categorized by type (ads, analytics, social trackers)
- **Active Protection** — toggle protection on/off for current site

### Tracker Blocking

Privacy Super Guard blocks requests to known tracking domains automatically:

- Advertising trackers (Google Ads, DoubleClick, Criteo)
- Analytics platforms (Google Analytics, Facebook Pixel, Hotjar)
- Social media trackers (Facebook, Twitter, LinkedIn widgets)
- Third-party data aggregators

View blocked requests in the **Trackers** tab with domain, type, and timestamp.

### Fingerprinting Detection

The extension detects common fingerprinting techniques:

- **Canvas fingerprinting** — monitors canvas API calls that extract unique device signatures
- **WebGL fingerprinting** — detects graphics card identification attempts
- **Audio fingerprinting** — identifies audio context API abuse
- **Font fingerprinting** — tracks font enumeration attempts

### Cookie Management

Inspect and control cookies for any domain:

```javascript
// Cookies are displayed with:
// - Name, value, domain, path
// - Expiration date and security flags
// - Delete individual or bulk delete options
```

### Per-Site Controls

Customize protection levels:

- **Allowlist** — disable blocking for trusted sites
- **Strict mode** — enhanced protection for sensitive browsing
- **Custom rules** — add domain-specific blocking patterns

## Configuration

Access settings via the **Settings** tab in the popup:

- **Global protection** — enable/disable all blocking (default: enabled)
- **Block third-party cookies** — prevent cross-site cookie tracking
- **Auto-delete cookies** — clear cookies when closing sites
- **Strict fingerprinting protection** — more aggressive detection (may break some sites)
- **Show notifications** — alert when high-risk tracking is detected
- **Theme** — auto, light, or dark mode

### Advanced Settings

Edit `rules.json` to customize blocking rules:

```json
{
  "id": 1,
  "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "urlFilter": "||tracking-domain.com^",
    "resourceTypes": ["script", "xmlhttprequest"]
  }
}
```

## Permissions

- `cookies` — read and manage cookies for privacy analysis
- `scripting` — inject fingerprinting detection scripts
- `declarativeNetRequest` — block tracker requests at the network level
- `declarativeNetRequestFeedback` — report on blocked requests
- `declarativeNetRequestWithHostAccess` — apply rules to all domains
- `storage` — persist settings and statistics
- `activeTab` — analyze privacy for the current tab
- `tabs` — monitor protection across all tabs
- `<all_urls>` — enable comprehensive protection across all websites

## Privacy

Privacy Super Guard operates entirely locally. No browsing data, statistics, or settings are transmitted to external servers. All tracker lists and fingerprinting detection logic run in your browser. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for complete details.

## Development

### File Structure

- `background.js` — service worker managing tracker blocking and statistics
- `content.js` — content script for fingerprinting detection
- `fingerprint-probe.js` — injected script monitoring fingerprinting APIs
- `popup.html/js` — main interface and dashboard
- `rules.json` — declarativeNetRequest blocking rules
- `trackers.json` — known tracker domain database
- `manifest.json` — extension configuration

### Testing

Test tracker blocking:

1. Visit a news site or social media platform
2. Open Privacy Super Guard popup
3. Verify blocked requests in the Trackers tab

Test fingerprinting detection:

1. Visit a fingerprinting test site (e.g., browserleaks.com)
2. Check the Fingerprinting tab for detected attempts

## Known Limitations

- Some legitimate services may be blocked if they share domains with trackers
- Strict fingerprinting protection may cause visual glitches on canvas-heavy sites
- Third-party cookie blocking can interfere with some login flows

Use per-site allowlists to resolve compatibility issues.

## Contributing

This is a proprietary project. The source code is provided for transparency and personal use only. Modifications, redistribution, and commercial use are prohibited. See [LICENSE](LICENSE) for details.

## License

Proprietary License with Usage Rights — Free to use, prohibited from modification and redistribution. See [LICENSE](LICENSE) file.

## Author

© 2025 Hayk Jomardyan. All rights reserved.
