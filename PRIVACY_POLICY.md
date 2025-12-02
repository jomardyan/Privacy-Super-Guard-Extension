# Privacy Policy for Privacy Super Guard

**Effective date:** December 2, 2025  

This Privacy Policy describes how the browser extension **Privacy Super Guard** (the "Extension") provided by **Hayk Jomardyan** ("we", "us", or "our") handles information when used in supported browsers, including Google Chrome and Microsoft Edge.

By installing or using the Extension, you acknowledge that you have read and understood this Privacy Policy.

## 1. Scope

This Privacy Policy applies solely to the Extension as distributed through:
- The Chrome Web Store for Google Chrome and other Chromium-based browsers.
- The Microsoft Edge Add-ons store for Microsoft Edge.

It does not apply to any websites, services, or applications that may be linked from the Extension but are operated by third parties under their own privacy policies.

## 2. What This Extension Does

Privacy Super Guard is a privacy protection tool that:
- Analyzes cookies, tracking scripts, and fingerprinting attempts on websites you visit
- Blocks known tracking domains and scripts (when auto-blocking is enabled)
- Detects and prevents browser fingerprinting techniques
- Provides privacy insights and recommendations
- Allows you to manage cookies and trackers

## 3. Data Collection and Processing

The Extension is designed with privacy as a core principle:

### What We DO NOT Collect:
- **No Personal Information**: The Extension does **not** collect, store, or process any personally identifiable information (PII) such as your name, email address, or contact information
- **No Browsing History**: The Extension does **not** collect or store your complete browsing history
- **No External Data Transmission**: The Extension does **not** transmit any of your data to external servers, third-party services, or our servers
- **No User Tracking**: The Extension does **not** track your behavior across websites or perform profiling
- **No Analytics**: The Extension does **not** use analytics services to monitor your usage
- **No IP Address Collection**: The Extension does **not** collect your IP address or device identifiers

### What the Extension Analyzes Locally:
To provide privacy protection, the Extension temporarily analyzes:
- **Cookie Information**: Names, domains, security attributes, and third-party status of cookies on websites you visit
- **Script Sources**: URLs and domains of JavaScript files loaded by websites
- **Fingerprinting Attempts**: Detection of canvas, WebGL, audio, navigator, and other fingerprinting APIs being accessed
- **Tracker Domains**: Identification of known tracking domains from built-in databases
- **Privacy Risk Scores**: Calculated locally based on detected privacy threats

**Important**: All this analysis happens **locally in your browser**. The Extension examines this information only to provide you with privacy insights and protection features. No data is sent to external servers.

## 4. Local Data Storage

The Extension stores certain data locally in your browser to function properly:

### What is Stored Locally:
- **User Settings**: Your preferences for auto-blocking, fingerprinting protection, and theme
- **Custom Tracker List**: Domains you manually add to block
- **Whitelisted Sites**: Domains you've chosen to exclude from protection
- **Blocking Statistics**: Total count of blocked requests (stored as a number only)
- **Temporary Tab Data**: Privacy findings for currently open tabs (cleared when tabs close)

### How Local Storage Works:
- All data is stored exclusively using the Chrome/Edge storage API
- Data is stored only on your device within your browser
- No data leaves your device or browser
- You maintain complete control over this data
- Temporary tab data is automatically cleared after 15 minutes of inactivity
- Uninstalling the Extension removes all locally stored data

### Data Retention:
- **Settings and preferences**: Retained until manually changed or Extension is uninstalled
- **Temporary findings**: Automatically cleared when tabs are closed
- **Old tab data**: Automatically deleted after 15 minutes of inactivity
- **Blocking statistics**: Persist until Extension is uninstalled

## 5. Browser Permissions Explained

The Extension requests specific browser permissions to function. Here's what each permission is used for:

### Required Permissions:

- **cookies**: Required to analyze cookie properties (name, domain, security attributes) for privacy assessment and to remove high-risk cookies when you choose to do so
- **scripting**: Required to inject privacy protection scripts and fingerprinting blockers into web pages
- **declarativeNetRequest**: Required to block tracking domains and scripts at the network level before they load
- **declarativeNetRequestFeedback**: Required to provide statistics on blocked requests
- **declarativeNetRequestWithHostAccess**: Required to apply blocking rules to websites you visit
- **storage**: Required to save your settings, custom tracker lists, and preferences locally
- **activeTab**: Required to analyze privacy threats on the currently active tab
- **tabs**: Required to access tab URLs for domain analysis and to update the Extension badge with blocking counts
- **host_permissions (<all_urls>)**: Required to analyze and protect your privacy on any website you visit

**Important**: These permissions enable functionality but do NOT mean we collect or transmit your data. All processing happens locally on your device.

## 6. Auto-Blocking Feature

The Extension includes an optional auto-blocking feature:

### How Auto-Blocking Works:
- Uses Chrome's declarativeNetRequest API to block known tracker domains
- Blocking happens at the network layer **before** resources load
- Blocks 40+ major tracking domains including Google Analytics, Facebook trackers, advertising networks, and fingerprinting services
- Rules are applied locally by your browser
- You can toggle auto-blocking on/off at any time
- You can whitelist specific sites to exclude them from blocking

### What Gets Blocked:
- Scripts from known tracking domains
- XMLHttpRequests to tracker domains
- Images from tracker domains
- Iframes from tracker domains
- Ping/beacon requests to trackers

### Blocking Statistics:
- The Extension counts blocked requests locally
- Only the total count is stored (no URLs or details)
- Statistics are displayed in the popup interface
- No blocking data is transmitted externally

## 7. Fingerprinting Protection

When fingerprinting protection is enabled, the Extension:

### Detection:
- Monitors access to canvas, WebGL, Audio, navigator, screen, battery, and other fingerprinting APIs
- Records the API name and timestamp locally for display in the popup
- Limits stored events to 100 per tab to prevent memory issues

### Prevention:
- Injects protective code into web pages to block or modify fingerprinting APIs
- Prevents canvas data extraction
- Blocks WebGL parameter access
- Randomizes or blocks navigator properties
- Prevents audio context fingerprinting
- Blocks WebRTC IP leak attempts
- Prevents device orientation/motion tracking

**Note**: Fingerprinting protection may cause some websites to malfunction. You can disable it or whitelist affected sites.

## 8. Cookie Management Features

The Extension provides tools to manage cookies:

### Cookie Analysis:
- Reads cookie properties (name, domain, security settings) for assessment
- Identifies third-party cookies, tracking cookies, insecure cookies, and long-lived cookies
- Displays findings in the popup interface

### Cookie Actions (User-Initiated):
- **Clear All Cookies**: Removes all cookies for the current site when you click the button
- **Block High-Risk Cookies**: Removes cookies identified as high-risk based on tracking patterns

These actions only execute when you explicitly choose them. The Extension does not automatically delete cookies without your consent.

## 9. Privacy Report Export

The Extension allows you to export a privacy report:
- Report is generated locally from current tab data
- Contains privacy risk score, cookie summary, tracker details, and recommendations
- Exported as JSON format
- You control when and where to save the export
- No data is transmitted to external servers during export

## 10. Content Scripts and Injection

The Extension injects content scripts into web pages:

### Purpose:
- Detect script sources loaded by the page
- Monitor fingerprinting API usage
- Apply fingerprinting protection when enabled
- Display in-page privacy statistics (when show overlay is enabled)

### What Content Scripts DO:
- Analyze script tags and their sources
- Wrap fingerprinting APIs to detect or prevent access
- Communicate findings back to the Extension

### What Content Scripts DO NOT Do:
- Read page content (text, forms, passwords)
- Modify website functionality (except when applying protections)
- Track user interactions
- Transmit data externally

## 11. Third-Party Services

- The Extension does **not** use third-party analytics tools, advertising networks, or tracking services
- The Extension does **not** embed third-party SDKs or scripts for data collection
- The Extension does **not** share any information with third parties
- The Extension operates entirely offline after installation
- Tracker databases and blocking rules are bundled with the Extension

## 12. WebRTC Leak Detection

The Extension can detect WebRTC IP leaks:
- Monitors RTCPeerConnection creation attempts
- Records detected leak attempts locally
- Limits stored leak data to 20 entries per tab
- Can block WebRTC connections when fingerprinting protection is enabled

## 13. Children's Privacy

Because the Extension does not collect, store, or process any personal information on external servers, it does not knowingly collect information from children under the age of 13 (or applicable age in your jurisdiction). All data processing remains local to the user's device.

If this changes in a future version, this Privacy Policy will be updated to reflect applicable requirements for children's data protection.

## 14. User Rights and Controls

You have complete control over the Extension and your data:

### Access and Modification:
- View all privacy findings through the popup interface
- Modify settings, custom trackers, and whitelisted sites at any time
- Export privacy reports for your records

### Data Deletion:
- Tab findings are automatically cleared when you close tabs
- Uninstall the Extension to remove all locally stored data
- Use browser's extension storage management to clear data
- Manual cookie clearing through the Extension interface

### Disable Protection:
- Toggle auto-blocking on/off
- Toggle fingerprinting protection on/off
- Whitelist specific sites to exclude them from protection
- Disable or uninstall the Extension at any time

Since no data is collected on our servers, there is no personal data for us to access, modify, or delete on your behalf.

## 15. International Data Transfers

Because the Extension does not collect or transmit personal data to external servers, there are no international transfers of personal data. All data processing occurs locally on your device, regardless of your geographic location.

## 16. Security

While we do not collect your data, we take security seriously:

- All data remains on your device, protected by your browser's security measures
- The Extension follows Chrome and Edge security best practices
- Uses Manifest V3, the latest and most secure extension framework
- No external network requests are made for data collection
- Regular updates address security vulnerabilities
- Content scripts run in isolated contexts
- Fingerprinting protection code is carefully designed to avoid conflicts

## 17. Performance and Memory Management

The Extension implements performance optimizations:
- Limits stored fingerprinting events to 100 per tab
- Limits WebRTC leak records to 20 per tab
- Limits rule match records to 50 per tab
- Automatically cleans up tab data after 15 minutes
- Removes all data when tabs are closed
- Batches messages to prevent excessive processing

## 18. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect:
- Changes in Extension functionality or behavior
- Updates to applicable laws, regulations, or browser store policies
- Improvements in privacy practices

When changes are made:
- The "Effective date" at the top will be updated
- Material changes will be reflected in the Chrome Web Store and Microsoft Edge Add-ons listings
- If we begin collecting data in ways not described here, we will provide clear notice and obtain consent where required

## 19. Legal Compliance

This Extension complies with:
- Chrome Web Store Developer Program Policies
- Microsoft Edge Add-ons Store Policies
- General Data Protection Regulation (GDPR) principles
- California Consumer Privacy Act (CCPA) requirements
- Other applicable data protection laws

The Extension's privacy-by-design approach ensures compliance through data minimization and local-only processing.

## 20. Transparency About Extension Behavior

For complete transparency, here's what happens when you visit a website:

1. **Content script loads**: Analyzes script sources on the page
2. **Fingerprinting probe runs**: Detects API access attempts (if enabled)
3. **Protection applied**: Blocks trackers and fingerprinting (if enabled)
4. **Findings stored**: Temporarily saves findings in browser memory
5. **Popup displays data**: Shows findings when you open the Extension
6. **Data cleanup**: Clears findings when you close the tab

**At no point is any data sent to external servers.**

## 21. Contact Information

If you have any questions, concerns, or feedback about this Privacy Policy or the Extension:

**Developer:** Hayk Jomardyan  
**GitHub Repository:** https://github.com/jomardyan/Privacy-Super-Guard-Extension  
**Issues/Support:** https://github.com/jomardyan/Privacy-Super-Guard-Extension/issues

## 22. Summary

In plain language:
- **Your data stays on your device** - nothing is sent to external servers
- **We don't collect anything** - no browsing history, no personal information, no tracking
- **You control everything** - toggle features on/off, whitelist sites, manage settings
- **Uninstall = complete data removal** - all local data is cleared
- **No ads, no analytics, no third parties** - the Extension is completely self-contained
- **Transparency** - all code is available in the GitHub repository for inspection

Privacy Super Guard is designed to **protect your privacy**, not compromise it.