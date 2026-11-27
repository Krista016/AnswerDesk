#!/usr/bin/env node
// ==========================================================================
// AnswerDesk Static SEO & AI-Search (GEO/AEO) Pre-Renderer
// Generates:
//   - 704 standalone static HTML pages in /guides/<slug>.html
//   - 16 static Category Hub pages in /guides/category/<cat>.html
//   - Updated sitemap.xml (730 clean URLs), robots.txt, llms.txt, llms-full.txt
//   - IndexNow verification key file + submission script for Bing & ChatGPT Search
//
// Usage:
//   node build-seo-pages.js
//   SITE_ORIGIN=https://yourdomain.com node build-seo-pages.js
// ==========================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://answerdesk.online').replace(/\/+$/, '');
const LAST_MOD = '2026-11-21';
const DISPLAY_DATE = 'November 2026';
const INDEXNOW_KEY = 'a7d94f2b8e1c4a6d9b3f5e2c8a1d7f4e';
const CSS_VER = '20261121_v8';
const JS_VER = '20261127_v5';

const CATEGORIES = [
    {
        id: 'windows',
        label: 'Microsoft & Windows',
        icon: '💻',
        shortDesc: 'Windows 11/10 updates, BSOD stop codes, BitLocker, Microsoft 365, Outlook, Teams, OneDrive, and Surface/Xbox troubleshooting.'
    },
    {
        id: 'apple',
        label: 'Apple, Mac, iPhone & Watch',
        icon: '🍎',
        shortDesc: 'iPhone & iOS restore errors, macOS boot & kernel fixes, MacBook battery/display, Apple Watch pairing, iCloud, AirPods, and Apple ID recovery.'
    },
    {
        id: 'paypal',
        label: 'PayPal & Digital Payments',
        icon: '💳',
        shortDesc: 'PayPal 21-day & 180-day holds, account limitations, Pay in 4 declines, unauthorized dispute protection, linked card/bank errors, and scam prevention.'
    },
    {
        id: 'amazon',
        label: 'Amazon, Prime & Devices',
        icon: '📦',
        shortDesc: 'Amazon order & refund issues, locked accounts, Prime Video error codes, Fire TV Stick, Kindle, Echo/Alexa Wi-Fi, and Ring/Blink troubleshooting.'
    },
    {
        id: 'antivirus',
        label: 'Antivirus & Security Suites',
        icon: '🛡️',
        shortDesc: 'Norton 360, McAfee, Bitdefender, Malwarebytes, Avast, AVG, Kaspersky, and ESET install errors, removal tools, VPN fixes, and billing cancellation.'
    },
    {
        id: 'defender',
        label: 'Windows Defender',
        icon: '🔐',
        shortDesc: 'Microsoft Defender Antivirus error codes, WinDefend service repair, Firewall rules, SmartScreen, Core Isolation, MsMpEng.exe high CPU, and Offline Scan.'
    },
    {
        id: 'appliances',
        label: 'Home Appliances',
        icon: '🧺',
        shortDesc: 'Washer, dryer, refrigerator, dishwasher, HVAC, and oven error codes and diagnostic repair protocols.'
    },
    {
        id: 'auto',
        label: 'Automotive & OBD-II',
        icon: '🚗',
        shortDesc: 'Check Engine Light OBD-II trouble codes (P0xxx/P0420/P0300), battery/alternator diagnostics, and vehicle sensor fixes.'
    },
    {
        id: 'printers',
        label: 'Printers & Hardware',
        icon: '🖨️',
        shortDesc: 'HP, Canon, Epson, and Brother offline printer errors, spooler crashes, cartridge recognition, and Wi-Fi scanning fixes.'
    },
    {
        id: 'networking',
        label: 'Smart Home & WiFi',
        icon: '📶',
        shortDesc: 'Router drops, DNS/DHCP failures, mesh Wi-Fi dead zones, Ethernet link faults, and smart home device connectivity.'
    },
    {
        id: 'tvaudio',
        label: 'Smart TVs & Audio',
        icon: '📺',
        shortDesc: 'Samsung, LG, Sony, Roku TV HDMI ARC/eARC, black screen, soundbar sync, and streaming app crash fixes.'
    },
    {
        id: 'gaming',
        label: 'Gaming Consoles',
        icon: '🎮',
        shortDesc: 'PS5, Xbox Series X|S, and Nintendo Switch NAT type, controller drift, storage corruption, and display errors.'
    },
    {
        id: 'mobile',
        label: 'Mobile & Android',
        icon: '📱',
        shortDesc: 'Samsung Galaxy & Android boot loops, charging port moisture warnings, SIM/eSIM activation, and app crash recovery.'
    },
    {
        id: 'veterinary',
        label: 'Veterinary & Pet Care',
        icon: '🐾',
        shortDesc: 'Urgent dog and cat triage signs, toxin awareness, digestive/skin symptoms, and guidance on when to visit an emergency vet.'
    },
    {
        id: 'security',
        label: 'Accounts & Security',
        icon: '🔒',
        shortDesc: 'Account recovery, 2FA/authenticator lockouts, phishing cleanup, password manager access, and compromised email hardening.'
    },
    {
        id: 'legal',
        label: 'Legal & Consumer Rights',
        icon: '⚖️',
        shortDesc: 'Consumer chargeback rights, warranty disputes, landlord-tenant notices, debt collection rules, and small claims preparation.'
    }
];

const CAT_MAP = new Map(CATEGORIES.map(c => [c.id, c]));

// Category-tailored diagnostic verification & escalation guidance
const CATEGORY_PLAYBOOKS = {
    windows: {
        prepChecks: [
            'Sign in with a Windows Administrator account so elevated Command Prompt, PowerShell, and Settings changes apply cleanly.',
            'Save open documents and create a quick System Restore point before editing services, drivers, or registry keys.',
            'Note the exact hexadecimal error code (e.g., 0x800xxxxx) or Event Viewer timestamp if the error repeats.'
        ],
        verifySteps: [
            'Restart Windows fully (Start > Power > Restart — not Shut Down, which uses Fast Startup caching) and confirm the error no longer appears.',
            'Open Windows Update or Event Viewer (Windows Logs > System / Application) and verify there are no fresh red critical errors for the affected component.',
            'Confirm dependent apps, drivers, or Microsoft 365 services sign in and sync normally without prompts.'
        ],
        escalation: 'If the same stop code or error persists after DISM/SFC repair and a full reboot, boot into Safe Mode with Networking or test under a new local Windows user profile to isolate profile corruption vs. failing storage/RAM hardware.',
        safety: 'Always download Windows updates, ISOs, and Visual C++ redistributables strictly from official Microsoft portals (microsoft.com). Back up personal files and verify your 48-digit BitLocker Recovery Key at account.microsoft.com/devices/recoverykey before BIOS or partition changes.',
        dataSafeAnswer: 'Standard Windows diagnostic fixes (DISM, SFC, cache resets, and service restarts) repair operating system files without deleting personal Documents, Desktop files, or photos. Only avoid selecting "Remove everything" during a Windows Reset unless you have an external backup.',
        timeframeAnswer: 'Most Windows service, network, and Microsoft 365 cache repairs take 5–15 minutes. Full DISM/SFC image scans or an in-place Windows repair upgrade typically take 20–45 minutes depending on SSD speed and download bandwidth.'
    },
    apple: {
        prepChecks: [
            'Ensure your iPhone, iPad, Mac, or Apple Watch has at least 50% battery or is connected to an Apple-certified charger.',
            'Verify your Apple Account (Apple ID) password and confirm an up-to-date iCloud or Finder/Time Machine backup exists before any restore.',
            'Use a direct USB-C or Lightning cable connected straight to the computer (avoid unpowered USB hubs during Recovery/DFU mode).'
        ],
        verifySteps: [
            'Restart the Apple device normally and confirm it boots past the Apple logo, connects to Wi-Fi, and displays your expected storage and Apple Account status.',
            'Check Settings > General > Software Update (or System Settings > General > Software Update on Mac) to confirm the system reports up-to-date status with no pending verification banners.',
            'Test the originally failing feature (iCloud sync, Face ID/Touch ID, AirDrop, charging, or app launch) across one full lock/unlock cycle.'
        ],
        escalation: 'If Recovery Mode update fails repeatedly with the same error code (such as 4013, 9, or 53) across two known-good cables and ports, run Apple Diagnostics (hold D on Intel Mac or press-and-hold Power on Apple Silicon) to rule out NAND storage, battery, or logic board faults.',
        safety: 'Never enter your Apple Account password or 6-digit two-factor code on links received via SMS or email. Always verify Apple Account status directly at appleid.apple.com or iforgot.apple.com, and back up via iCloud or Finder before choosing "Restore" over "Update".',
        dataSafeAnswer: 'Choosing "Update" in Recovery Mode, resetting network settings, or reinstalling macOS over an existing APFS volume preserves personal photos and data. Choosing "Restore" or "Erase All Content and Settings" erases the device, so verify your iCloud or Time Machine backup first.',
        timeframeAnswer: 'Settings resets, iCloud sign-out/sign-in, and Apple Watch re-pairing take 5–15 minutes. Full iOS firmware downloads or macOS Recovery reinstalls usually take 20–60 minutes depending on internet speed.'
    },
    paypal: {
        prepChecks: [
            'Access PayPal directly by typing paypal.com into a standard browser (disable VPNs, proxies, and ad-blockers that trigger security flags).',
            'Gather transaction IDs, carrier tracking numbers, bank statement descriptors, or unexpired government ID if requested in Resolution Center.',
            'Check your verified email inbox and PayPal Message Center for exact notice dates and compliance ticket numbers.'
        ],
        verifySteps: [
            'Open PayPal > Activity and Resolution Center to confirm no remaining "Action Required" tasks or open document requests remain.',
            'Verify that your funding source (bank account or debit/credit card) shows as Confirmed in Wallet with an exact billing address match.',
            'For holds or refunds, check the expected release date displayed inside the transaction detail screen and confirm email confirmation arrived from service@paypal.com.'
        ],
        escalation: 'If automated review stalls past the stated SLA (3–5 business days for limitation reviews or 24 hours post-delivered tracking for 21-day holds), message PayPal Support inside the official PayPal Message Center with your case ID and keep screenshots of all submitted proof.',
        safety: 'Anti-Scam Warning: Never call phone numbers pasted inside PayPal invoice notes, "money request" descriptions, or urgent emails claiming an unauthorized charge. Never install remote desktop apps (AnyDesk/TeamViewer) for anyone claiming to be PayPal support, and never share 2FA SMS codes.',
        dataSafeAnswer: 'Following official Resolution Center steps, confirming cards in Wallet, or updating carrier tracking will not close your account or lose funds. Even on a permanent limitation, legitimate cleared balances are subject to PayPal\'s statutory 180-day reserve release window.',
        timeframeAnswer: 'Card confirmation and billing updates take effect immediately. PayPal 21-day holds typically release 1 day after confirmed carrier delivery; KYC limitation document reviews usually take 2–5 business days; card refunds take 3–5 business days to post to your bank.'
    },
    amazon: {
        prepChecks: [
            'Sign in directly at amazon.com (avoid links in text messages or emails) and verify you are logged into the exact account associated with the order or Prime membership.',
            'Have your 17-digit Order ID (e.g., 112-xxxxxxx-xxxxxxx), device serial number (DSN), or Prime Video error code ready.',
            'For Fire TV, Echo, Kindle, or Ring devices, confirm your Wi-Fi router is online and temporarily disable VPNs or custom DNS blockers.'
        ],
        verifySteps: [
            'Check Your Orders, Manage Your Content and Devices, or Prime Membership settings to confirm the status change or device registration shows accurately.',
            'Power-cycle the Amazon device (unplug for 30 seconds) and test streaming, Wi-Fi connectivity, or Alexa voice response.',
            'Save any refund confirmation email, return drop-off receipt, or A-to-z Guarantee claim reference number until funds post to your original payment method.'
        ],
        escalation: 'If an order claim, locked account appeal, or unauthorized charge is not resolved through automated self-service, open Amazon Customer Service directly from the official Help & Customer Service menu inside your account to request expert review with your Order ID.',
        safety: 'Anti-Scam Warning: Amazon will never call asking you to buy gift cards, install remote-access software, or read out a one-time passcode (OTP) to "cancel an unauthorized order." Always verify orders and messages solely inside Your Account > Message Center at amazon.com.',
        dataSafeAnswer: 'Deregistering and re-registering a Fire TV, Kindle, or Echo device does not delete your purchased digital books, Prime Video library, or account history—everything tied to your Amazon account syncs back once you sign in again.',
        timeframeAnswer: 'Device deregistration, DNS changes, and app cache clears fix playback/Wi-Fi issues within 5–10 minutes. Amazon account lock appeals typically receive a response within 24–48 hours, and card refunds normally appear in 3–5 business days.'
    },
    antivirus: {
        prepChecks: [
            'Confirm only ONE real-time antivirus product is installed on the computer (running two real-time engines simultaneously causes crashes, update errors, and 100% disk/CPU spikes).',
            'Locate your active subscription email or 25-character license key inside your official vendor account portal before running a removal/reinstall tool.',
            'Close open browsers and save work, as official antivirus cleanup utilities require a full system reboot.'
        ],
        verifySteps: [
            'Reboot your PC or Mac and confirm the security suite launches cleanly in the system tray / menu bar with a green "Protected" status.',
            'Run a manual Virus Definition Update and a Quick Scan to verify the real-time protection engine, firewall, and cloud lookup services connect without errors.',
            'Open Windows Security > Virus & Threat Protection > Manage Providers (or macOS System Settings > Privacy & Security) to confirm no conflicting legacy AV driver remains.'
        ],
        escalation: 'If installation or uninstall loops persist after running the vendor\'s official removal utility (e.g., NRnR, MCPR, Avast Clear), boot into Windows Safe Mode to run the cleanup tool offline, then reinstall a fresh installer downloaded directly from the vendor\'s primary domain.',
        safety: 'Anti-Scam Warning: Ignore fake browser pop-ups claiming "Your PC is infected!" and fraudulent PDF renewal emails claiming "$399.99 was auto-charged for Geek/Norton/McAfee." Never call phone numbers in unsolicited emails—manage subscriptions only by logging directly into your official vendor account.',
        dataSafeAnswer: 'Uninstalling, repairing, or switching antivirus software does not delete your personal files, photos, or documents. Before removing a suite, restore any mistakenly quarantined safe files from Quarantine if needed.',
        timeframeAnswer: 'Running an official removal utility, rebooting, and installing a fresh antivirus build typically takes 10–20 minutes. Subscription auto-renewal cancellations take effect immediately in your vendor account portal.'
    },
    defender: {
        prepChecks: [
            'Verify whether a third-party antivirus (Norton, McAfee, Avast, Bitdefender, etc.) is installed, because Windows automatically puts Microsoft Defender into passive/off mode when another AV registers.',
            'Open PowerShell or Command Prompt using "Run as Administrator" before executing Defender service or MpCmdRun commands.',
            'Check Windows Settings > Accounts > Access work or school to verify whether a school/company Intune or Group Policy profile is managing security settings.'
        ],
        verifySteps: [
            'Open PowerShell as Administrator and run Get-MpComputerStatus to verify AMServiceEnabled, AntivirusEnabled, RealTimeProtectionEnabled, and BehaviorMonitorEnabled all return True.',
            'Open Windows Security (windowsdefender:) and confirm Virus & Threat Protection, Firewall & Network Protection, and Device Security all show green checkmarks with current definition dates.',
            'Run a Quick Scan or verify Protection History to confirm the prior error code or repeated alert has cleared.'
        ],
        escalation: 'If WinDefend or SecurityHealthService still fails to start with error 577, 0x80070422, or blank UI screens after removing legacy AV drivers and running DISM/SFC, perform an in-place Windows 11/10 Repair Upgrade (keeping all files and apps) to restore signed Defender binaries.',
        safety: 'Never permanently disable Real-Time Protection, Tamper Protection, or exclude the entire C:\\ drive to silence alerts—doing so leaves your PC exposed to ransomware and infostealers. Verify your BitLocker Recovery Key is backed up before changing TPM or Core Isolation settings.',
        dataSafeAnswer: 'Resetting Windows Security, updating Defender signatures, running Microsoft Defender Offline Scan, or re-enabling WinDefend/MpsSvc services will not delete your personal files. Legitimate files flagged as false positives can be restored safely from Protection History.',
        timeframeAnswer: 'Service restarts, signature updates, and PowerShell resets take 2–5 minutes. A Microsoft Defender Offline Scan takes 10–15 minutes during reboot, while a full disk scan takes 30–90 minutes depending on drive size.'
    }
};

const DEFAULT_PLAYBOOK = {
    prepChecks: [
        'Write down the exact error message, flashing LED pattern, or fault code displayed before restarting the device.',
        'Check physical power cables, network connections, and recent software or firmware updates that coincided with the issue.',
        'Back up any important user settings or data before performing a factory reset or driver reinstall.'
    ],
    verifySteps: [
        'Restart the affected system or device completely and confirm normal startup without returning warnings.',
        'Test the specific function that previously failed under normal everyday operating conditions.',
        'Monitor for 24 hours to verify the fault code or symptom does not recur.'
    ],
    escalation: 'If the same fault code or hardware symptom returns immediately after completing these steps, stop repeated reset attempts to prevent component damage and connect with a category expert for targeted diagnostics.',
    safety: 'Disconnect mains power before inspecting internal appliance or hardware components, follow manufacturer safety instructions, and never share account passwords or 2FA codes with unverified callers.',
    dataSafeAnswer: 'Basic diagnostic checks, power cycles, cache clears, and connection resets preserve your saved settings and personal data. Only full factory resets erase device configuration.',
    timeframeAnswer: 'Most diagnostic checks and software/connection resets take 5–20 minutes. Deeper firmware updates or hardware inspections may take 30–60 minutes.'
};

// Helper: Escape HTML
function esc(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function stripHtml(html) {
    return String(html || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&bull;/g, '•')
        .replace(/&#9889;/g, '')
        .replace(/&#9888;&#65039;/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function truncateText(text, maxLen) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    const cut = clean.slice(0, maxLen - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > maxLen * 0.65 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\-]+$/, '') + '…';
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

// Load combined 704 articles
function loadArticles() {
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'articles-data.js'), 'utf8'), ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'articles-data-530.js'), 'utf8'), ctx);
    const all = vm.runInContext('ARTICLES_DATA', ctx);
    if (!Array.isArray(all) || all.length === 0) {
        throw new Error('Failed to load ARTICLES_DATA');
    }
    return all;
}

// Extract clean commands from inline code tags or code boxes for copyable command block
function extractCommands(html) {
    const cmds = [];
    const codeBoxRe = /<div class="kb-code-box">([\s\S]*?)<\/div>/gi;
    let m;
    while ((m = codeBoxRe.exec(html)) !== null) {
        const parts = m[1].split(/<br\s*\/?>/i).map(s => stripHtml(s).trim()).filter(Boolean);
        cmds.push(...parts);
    }
    if (cmds.length > 0) return [...new Set(cmds)];

    const inlineRe = /<code class="kb-inline-code">([^<]+)<\/code>/gi;
    while ((m = inlineRe.exec(html)) !== null) {
        const c = stripHtml(m[1]).trim();
        if (
            c.length >= 6 &&
            /\s|\/|\\|\.exe|\.msc|sfc |dism |netsh |ipconfig |Set-|Get-|Add-|Remove-|MpCmdRun|bootrec|diskpart|wsreset|chkdsk|bcdedit|sc |reg |defaults |tmutil|csrutil/i.test(c) &&
            !/^https?:\/\//i.test(c)
        ) {
            cmds.push(c);
        }
    }
    return [...new Set(cmds)];
}

// Extract steps cleanly from HTML for HowTo JSON-LD & structured rendering
function extractStepsFromContent(article) {
    const steps = [];
    const boxRe = /<div class="kb-step-box">[\s\S]*?<div class="kb-step-title">([\s\S]*?)<\/div>([\s\S]*?)<\/div>\s*(?=<div class="kb-step-box">|<div class="kb-warning-box">|$)/gi;
    let m;
    while ((m = boxRe.exec(article.content || '')) !== null) {
        const title = stripHtml(m[1]);
        const bodyHtml = m[2].trim();
        const bodyText = stripHtml(bodyHtml);
        if (bodyText) {
            steps.push({ title, bodyHtml, bodyText });
        }
    }
    return steps;
}

// Cleanly split comma/clause-dense action sentences into scannable bulleted/numbered actions without verbatim duplication
function splitActionClauses(htmlText) {
    // Preserve inline HTML while splitting on "; " or ", then " or ". " for readable step lists
    const normalized = String(htmlText || '').trim();
    if (!normalized) return [];
    // If multiple sentences exist, split on sentence boundaries first
    const bySentence = normalized.split(/(?<=[.!?])\s+(?=[A-Z<])/).map(s => s.trim()).filter(Boolean);
    if (bySentence.length >= 2) return bySentence;

    // Otherwise split a long multi-step imperative sentence cleanly on ", then " or "; "
    const byClause = normalized
        .split(/(?:;\s+|,\s+then\s+|,\s+and\s+(?=(?:run|open|click|select|sign|check|reboot|restart|verify|upload|disable|enable|reset|update|download|install|clear|call|contact|navigate|go\s+to|toggle|turn|confirm|switch|use|delete|remove|disconnect|plug|unplug)))/i)
        .map(s => s.trim().replace(/^[,\s]+|[,\s]+$/g, ''))
        .filter(s => stripHtml(s).length > 10);

    if (byClause.length >= 2) {
        return byClause.map(c => {
            const cleaned = c.replace(/^([a-z])/, ch => ch.toUpperCase());
            return /[.!?]$/.test(stripHtml(cleaned)) ? cleaned : cleaned + '.';
        });
    }
    return [normalized];
}

// Build rich, non-repetitive guide HTML body + HowTo steps + Issue-specific FAQs
function buildGuideBodyAndSchemaData(article) {
    const playbook = CATEGORY_PLAYBOOKS[article.category] || DEFAULT_PLAYBOOK;
    const isNew530 = Boolean(article.directAnswer);
    const directAnswerText = (article.directAnswer || article.snippet || '').trim();
    const subLabel = article.subCategory || article.categoryLabel || 'Technical Diagnostics';
    const rawSteps = extractStepsFromContent(article);
    const extractedCmds = extractCommands(article.content || '');

    // Build clean checklist items (no ugly truncated "..." snippets)
    const checklistItems = [];
    if (Array.isArray(article.checklist)) {
        for (const item of article.checklist) {
            const clean = String(item || '').trim();
            if (clean && !clean.endsWith('...') && !/escalate to a verified expert/i.test(clean) && !/apply official diagnostic/i.test(clean)) {
                checklistItems.push(clean);
            }
        }
    }
    for (const prep of playbook.prepChecks) {
        if (checklistItems.length >= 4) break;
        if (!checklistItems.some(existing => existing.toLowerCase() === prep.toLowerCase())) {
            checklistItems.push(prep);
        }
    }

    let mainBodyHtml = '';
    const howToSteps = [];

    if (!isNew530) {
        // Original 174 guides already have distinct multi-step HTML protocols; add an AI Quick Answer header above them
        mainBodyHtml = `
            <div class="ai-direct-answer" itemscope itemtype="https://schema.org/Answer">
                <div class="ai-answer-badge">&#9889; Quick Expert Answer &bull; ${esc(article.categoryLabel || article.category)}</div>
                <p itemprop="text">${esc(directAnswerText)}</p>
            </div>

            <section class="guide-checklist-card" aria-label="Pre-fix diagnostic checklist">
                <h2>Pre-Fix Diagnostic Checklist</h2>
                <ul class="guide-checklist-list">
                    ${checklistItems.map(item => `<li><span class="chk-icon" aria-hidden="true">&#10003;</span><span>${esc(item)}</span></li>`).join('\n                    ')}
                </ul>
            </section>

            <section class="guide-protocol-section">
                ${article.content}
            </section>

            <section class="guide-verify-card">
                <h2>How to Verify the Fix Worked</h2>
                <ol class="guide-verify-list">
                    ${playbook.verifySteps.map(s => `<li>${esc(s)}</li>`).join('\n                    ')}
                </ol>
                <p class="guide-escalation-note"><strong>Still seeing the issue?</strong> ${esc(playbook.escalation)}</p>
            </section>
        `;

        rawSteps.forEach((s, idx) => {
            howToSteps.push({
                '@type': 'HowToStep',
                'position': idx + 1,
                'name': s.title || `Step ${idx + 1}`,
                'text': s.bodyText
            });
        });
    } else {
        // 530 new guides: extract the formatted HTML paragraph from .ai-direct-answer and build non-repetitive, deep structured sections
        const answerP = (article.content.match(/<p itemprop="text">([\s\S]*?)<\/p>/i) || [null, esc(directAnswerText)])[1];

        // Extract cause vs action steps cleanly from rawSteps
        const causeHtml = rawSteps[0] ? rawSteps[0].bodyHtml.replace(/^<p>|<\/p>$/gi, '').trim() : '';
        const actionHtmlParts = [];
        for (let i = 1; i < rawSteps.length; i++) {
            const strippedStepHtml = rawSteps[i].bodyHtml
                .replace(/<div class="kb-code-box">[\s\S]*?<\/div>/gi, '')
                .replace(/^<p>|<\/p>$/gi, '')
                .trim();
            if (strippedStepHtml) {
                actionHtmlParts.push(...splitActionClauses(strippedStepHtml));
            }
        }
        // Fallback if single-step answer
        if (actionHtmlParts.length === 0 && causeHtml) {
            actionHtmlParts.push(...splitActionClauses(causeHtml));
        }

        const cmdBlockHtml = extractedCmds.length > 0
            ? `<div class="kb-code-box" aria-label="Diagnostic commands">${extractedCmds.map(c => esc(c)).join('<br>')}</div>`
            : '';

        const stepCardsHtml = actionHtmlParts.map((clauseHtml, idx) => {
            const stepNum = idx + 1;
            const stepLabel = idx === 0
                ? 'Primary Resolution Step'
                : (idx === actionHtmlParts.length - 1 && actionHtmlParts.length > 1
                    ? 'Secondary Recovery & Fallback'
                    : `Action Step ${stepNum}`);
            const attachCmds = idx === 0 && cmdBlockHtml ? cmdBlockHtml : '';
            howToSteps.push({
                '@type': 'HowToStep',
                'position': stepNum,
                'name': stepLabel,
                'text': stripHtml(clauseHtml)
            });
            return `
                <div class="kb-step-box">
                    <div class="kb-step-num">Step ${stepNum}</div>
                    <div class="kb-step-title">${esc(stepLabel)}</div>
                    <p>${clauseHtml}</p>
                    ${attachCmds}
                </div>`;
        }).join('\n');

        // Add final verification step to HowTo schema
        howToSteps.push({
            '@type': 'HowToStep',
            'position': howToSteps.length + 1,
            'name': 'Verify Complete Resolution',
            'text': playbook.verifySteps.join(' ')
        });

        mainBodyHtml = `
            <div class="ai-direct-answer" itemscope itemtype="https://schema.org/Answer">
                <div class="ai-answer-badge">&#9889; Quick Expert Answer &bull; ${esc(subLabel)}</div>
                <p itemprop="text">${answerP}</p>
            </div>

            <section class="guide-checklist-card" aria-label="Before you begin checklist">
                <h2>Before You Start: Quick Pre-Check</h2>
                <ul class="guide-checklist-list">
                    ${checklistItems.map(item => `<li><span class="chk-icon" aria-hidden="true">&#10003;</span><span>${esc(item)}</span></li>`).join('\n                    ')}
                </ul>
            </section>

            <section class="guide-diagnosis-section">
                <h2>Why This Issue Happens</h2>
                <p>${causeHtml || answerP}</p>
                <p class="diagnosis-context">This issue falls under <strong>${esc(subLabel)}</strong> (${esc(article.categoryLabel || article.category)}). Confirming the exact trigger before making changes prevents unnecessary resets and helps preserve your data and account standing.</p>
            </section>

            <section class="guide-protocol-section">
                <h2>Step-by-Step Resolution Protocol</h2>
                ${stepCardsHtml}
            </section>

            <section class="guide-verify-card">
                <h2>How to Verify the Fix Worked</h2>
                <ol class="guide-verify-list">
                    ${playbook.verifySteps.map(s => `<li>${esc(s)}</li>`).join('\n                    ')}
                </ol>
                <p class="guide-escalation-note"><strong>What if the issue still persists?</strong> ${esc(playbook.escalation)}</p>
            </section>

            <div class="kb-warning-box">
                <strong>&#9888;&#65039; Expert Safety &amp; Verification Advisory:</strong> ${esc(playbook.safety)}
            </div>
        `;
    }

    // Build 3 visible, issue-tailored FAQs (mirrored 1:1 in FAQPage JSON-LD)
    const shortTopic = article.title
        .replace(/^(How do I fix |How do I |Why is |Why does |Why are |Why can't I |Why did |What causes |What should I do if |Can I )/i, '')
        .replace(/\?$/, '')
        .trim();

    const faqs = [
        {
            q: `Will fixing "${truncateText(shortTopic, 90)}" delete my personal files, data, or account history?`,
            a: playbook.dataSafeAnswer
        },
        {
            q: `How long does it normally take to resolve this ${article.categoryLabel || 'technical'} issue?`,
            a: playbook.timeframeAnswer
        },
        {
            q: `What should I do if the problem returns after following these steps?`,
            a: `${playbook.escalation} You can also connect directly with a certified ${article.categoryLabel || 'technical'} expert 24/7 on AnswerDesk for guided 1-on-1 troubleshooting.`
        }
    ];

    // Primary question + direct answer goes first in FAQPage JSON-LD so exact-match queries surface cleanly
    const faqSchemaEntities = [
        {
            '@type': 'Question',
            'name': article.question || article.title,
            'acceptedAnswer': {
                '@type': 'Answer',
                'text': directAnswerText
            }
        },
        ...faqs.map(f => ({
            '@type': 'Question',
            'name': f.q,
            'acceptedAnswer': {
                '@type': 'Answer',
                'text': f.a
            }
        }))
    ];

    return { mainBodyHtml, howToSteps, faqs, faqSchemaEntities, directAnswerText };
}

// Select 6 related guides (prioritizing same subCategory, then same category)
function getRelatedGuides(article, byCategory, bySubCategory) {
    const picked = [];
    const seen = new Set([article.id]);

    const subKey = article.subCategory ? `${article.category}::${article.subCategory}` : null;
    const sameSub = subKey ? (bySubCategory.get(subKey) || []) : [];
    const sameCat = byCategory.get(article.category) || [];

    // Pick deterministic neighbor slice so internal link graph is evenly distributed across all 704 pages
    function pickFromPool(pool, needed) {
        if (pool.length <= 1) return;
        const idx = pool.findIndex(a => a.id === article.id);
        const start = idx >= 0 ? idx + 1 : 0;
        for (let offset = 0; offset < pool.length && picked.length < needed; offset++) {
            const candidate = pool[(start + offset) % pool.length];
            if (!seen.has(candidate.id)) {
                seen.add(candidate.id);
                picked.push(candidate);
            }
        }
    }

    pickFromPool(sameSub, 4);
    pickFromPool(sameCat, 6);
    return picked;
}

// Shared Site Header HTML (root-relative clean URLs)
function renderHeader(subText) {
    return `
    <header class="site-header" id="siteHeader">
        <div class="header-inner">
            <a href="/" class="logo" id="logo">
                <svg class="logo-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 6C8 4.89543 8.89543 4 10 4H30C31.1046 4 32 4.89543 32 6V28C32 29.1046 31.1046 30 30 30H22L16 36V30H10C8.89543 30 8 29.1046 8 28V6Z" fill="#278b7d"/>
                    <path d="M14 14L19 19L26 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="logo-text">
                    <span class="logo-name">Answer<span class="logo-name-accent">Desk</span></span>
                    <span class="logo-sub">${esc(subText)}</span>
                </div>
            </a>
            <nav class="header-nav">
                <a href="/" class="nav-link">Home</a>
                <a href="/support" class="nav-link">Support</a>
                <a href="/articles" class="nav-link">All 704 Guides</a>
                <a href="/about" class="nav-link">About Us</a>
                <a href="/contact" class="nav-link">Contact</a>
            </nav>
            <a href="/support" class="header-cta">Get Expert Help</a>
        </div>
    </header>`;
}

// Shared Site Footer HTML (root-relative clean URLs + static links to major Category Hubs)
function renderFooter() {
    return `
    <footer class="site-footer">
        <div class="section-container">
            <div class="footer-grid">
                <div class="footer-col">
                    <a href="/" class="logo footer-logo">
                        <svg class="logo-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 6C8 4.89543 8.89543 4 10 4H30C31.1046 4 32 4.89543 32 6V28C32 29.1046 31.1046 30 30 30H22L16 36V30H10C8.89543 30 8 29.1046 8 28V6Z" fill="#278b7d"/>
                            <path d="M14 14L19 19L26 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <div class="logo-text">
                            <span class="logo-name" style="color: #ffffff;">Answer<span class="logo-name-accent" style="color: #5eead4;">Desk</span></span>
                        </div>
                    </a>
                    <p class="footer-desc">Real help from verified experts, 24/7. Browse 704+ step-by-step troubleshooting guides or chat live with an expert.</p>
                </div>
                <div class="footer-col">
                    <h4>Top Guide Hubs</h4>
                    <ul>
                        <li><a href="/guides/category/windows">Microsoft &amp; Windows (128)</a></li>
                        <li><a href="/guides/category/apple">Apple, Mac &amp; iPhone (128)</a></li>
                        <li><a href="/guides/category/paypal">PayPal &amp; Payments (80)</a></li>
                        <li><a href="/guides/category/amazon">Amazon &amp; Devices (80)</a></li>
                        <li><a href="/guides/category/antivirus">Antivirus Suites (75)</a></li>
                        <li><a href="/guides/category/defender">Windows Defender (75)</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Knowledge &amp; Support</h4>
                    <ul>
                        <li><a href="/articles">All 704 Troubleshooting Guides</a></li>
                        <li><a href="/support">Live 24/7 Expert Support</a></li>
                        <li><a href="/faq">Frequently Asked Questions</a></li>
                        <li><a href="/expert-verification">Expert Verification Process</a></li>
                        <li><a href="/llms.txt">AI Knowledge Index (llms.txt)</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Company &amp; Legal</h4>
                    <ul>
                        <li><a href="/about">About Us</a></li>
                        <li><a href="/contact">Contact &amp; Escalations</a></li>
                        <li><a href="/terms">Terms of Service</a></li>
                        <li><a href="/privacy">Privacy Policy</a></li>
                    </ul>
                </div>
            </div>

            <div class="footer-guarantees">
                <div class="footer-guarantee-item">
                    <div class="guarantee-icon-wrap">
                        <img decoding="async" loading="lazy" src="/assets/guarantees/vetting.png" alt="Multi-Stage Vetting" width="40" height="40">
                    </div>
                    <div class="guarantee-text">
                        <strong>Multi-Stage Vetting</strong>
                        <p>Identity, credentials &amp; practical assessments audited</p>
                    </div>
                </div>
                <div class="footer-guarantee-item">
                    <div class="guarantee-icon-wrap">
                        <img decoding="async" loading="lazy" src="/assets/guarantees/pay_solution.png" alt="Pay After Solution" width="40" height="40">
                    </div>
                    <div class="guarantee-text">
                        <strong>Pay After Solution</strong>
                        <p>No upfront retainers: billed only upon resolution</p>
                    </div>
                </div>
                <div class="footer-guarantee-item">
                    <div class="guarantee-icon-wrap">
                        <img decoding="async" loading="lazy" src="/assets/guarantees/rapid_connect.png" alt="24/7 Rapid Connect" width="40" height="40">
                    </div>
                    <div class="guarantee-text">
                        <strong>24/7 Rapid Connect</strong>
                        <p>Average expert connection under 2 minutes</p>
                    </div>
                </div>
                <div class="footer-guarantee-item">
                    <div class="guarantee-icon-wrap">
                        <img decoding="async" loading="lazy" src="/assets/guarantees/zero_data.png" alt="Zero Data Sharing" width="40" height="40">
                    </div>
                    <div class="guarantee-text">
                        <strong>Zero Data Sharing</strong>
                        <p>Strict privacy standard: issue-focused data only</p>
                    </div>
                </div>
            </div>

            <div class="footer-bottom">
                <div class="brand-disclaimer">
                    <p><strong>Disclaimer:</strong> AnswerDesk is an independent online consultation and support platform and is not affiliated with, authorized by, endorsed by, sponsored by, or otherwise associated with Amazon, Apple, Microsoft, Google, Gmail, Facebook (Meta), PayPal, Zelle, Venmo, Cash App, Coinbase, Norton, McAfee, Bitdefender, HP, AT&amp;T, Verizon, Geek Squad, or any bank, financial institution, or cryptocurrency exchange or platform. All product names, logos, brands, trademarks, and service marks referenced on this site are the sole property of their respective owners and do not sponsor, endorse, or maintain any association with AnswerDesk. Any use of third-party names or trademarks is strictly for informational and identification purposes only and does not imply any affiliation, authorization, or endorsement. Official brand support may also be available directly from the respective product manufacturers or service providers. For physical emergencies, please immediately call 911 or your local emergency services.</p>
                </div>
                <p>&copy; 2026 AnswerDesk. All rights reserved.</p>
            </div>
        </div>
    </footer>`;
}

// Render one standalone static HTML guide page: /guides/<slug>.html
function renderGuidePage(article, relatedGuides) {
    const catObj = CAT_MAP.get(article.category) || { id: article.category, label: article.categoryLabel || article.category, icon: '📑' };
    const canonicalUrl = `${SITE_ORIGIN}/guides/${article.id}`;
    const catHubUrl = `${SITE_ORIGIN}/guides/category/${catObj.id}`;
    const catHubPath = `/guides/category/${catObj.id}`;
    const { mainBodyHtml, howToSteps, faqs, faqSchemaEntities, directAnswerText } = buildGuideBodyAndSchemaData(article);

    const metaDesc = truncateText(directAnswerText, 158);
    const pageTitle = `${truncateText(article.title, 96)} | AnswerDesk`;
    const authorName = (article.author && article.author.name) || 'Verified Technical Expert';
    const authorRole = (article.author && article.author.role) || 'Senior Diagnostics & Support Engineer';
    const authorImg = '/' + String((article.author && article.author.img) || 'assets/expert-1.png').replace(/^\/+/, '');
    const ogImage = `${SITE_ORIGIN}/assets/cta-expert-pro.png`;

    const graph = [
        {
            '@type': 'TechArticle',
            '@id': `${canonicalUrl}#article`,
            'headline': article.title,
            'description': directAnswerText,
            'articleSection': article.subCategory ? `${catObj.label} — ${article.subCategory}` : catObj.label,
            'inLanguage': 'en-US',
            'datePublished': LAST_MOD,
            'dateModified': LAST_MOD,
            'url': canonicalUrl,
            'mainEntityOfPage': {
                '@type': 'WebPage',
                '@id': canonicalUrl
            },
            'image': ogImage,
            'author': {
                '@type': 'Person',
                'name': authorName,
                'jobTitle': authorRole,
                'url': `${SITE_ORIGIN}/expert-verification`
            },
            'publisher': {
                '@type': 'Organization',
                'name': 'AnswerDesk',
                'url': `${SITE_ORIGIN}/`,
                'logo': {
                    '@type': 'ImageObject',
                    'url': `${SITE_ORIGIN}/assets/guarantees/vetting.png`
                }
            }
        },
        {
            '@type': 'BreadcrumbList',
            '@id': `${canonicalUrl}#breadcrumb`,
            'itemListElement': [
                { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_ORIGIN}/` },
                { '@type': 'ListItem', 'position': 2, 'name': 'Troubleshooting Guides', 'item': `${SITE_ORIGIN}/articles` },
                { '@type': 'ListItem', 'position': 3, 'name': catObj.label, 'item': catHubUrl },
                { '@type': 'ListItem', 'position': 4, 'name': article.title, 'item': canonicalUrl }
            ]
        },
        {
            '@type': 'FAQPage',
            '@id': `${canonicalUrl}#faq`,
            'mainEntity': faqSchemaEntities
        }
    ];

    if (howToSteps.length >= 2) {
        graph.push({
            '@type': 'HowTo',
            '@id': `${canonicalUrl}#howto`,
            'name': article.title,
            'description': directAnswerText,
            'totalTime': 'PT10M',
            'step': howToSteps
        });
    }

    const schemaJson = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2).replace(/<\/script/gi, '<\\/script');

    const subPillHtml = article.subCategory
        ? `<span class="reader-subcat-pill">${esc(article.subCategory)}</span>`
        : '';

    const faqsHtml = faqs.map((f, i) => `
                <details class="guide-faq-item"${i === 0 ? ' open' : ''}>
                    <summary>${esc(f.q)}</summary>
                    <p>${esc(f.a)}</p>
                </details>`).join('\n');

    const relatedHtml = relatedGuides.map(rel => `
                <a class="related-guide-card" href="/guides/${esc(rel.id)}">
                    <span class="related-guide-cat">${esc(rel.subCategory || rel.categoryLabel || rel.category)}</span>
                    <h3 class="related-guide-title">${esc(rel.title)}</h3>
                    <p class="related-guide-snippet">${esc(truncateText(rel.snippet || rel.directAnswer || '', 120))}</p>
                    <span class="article-read-link">Read Guide &rarr;</span>
                </a>`).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(pageTitle)}</title>
    <meta name="description" content="${esc(metaDesc)}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <link rel="canonical" href="${esc(canonicalUrl)}">
    <link rel="alternate" type="text/markdown" href="/llms.txt" title="AnswerDesk AI Knowledge Base Index">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><path d='M8 6C8 4.9 8.9 4 10 4H30C31.1 4 32 4.9 32 6V28C32 29.1 31.1 30 30 30H22L16 36V30H10C8.9 30 8 29.1 8 28V6Z' fill='%23278b7d'/><path d='M14 14L19 19L26 12' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/></svg>" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/index.css?v=20261121_v14">
    <link rel="stylesheet" href="/articles.css?v=${CSS_VER}">
    <link rel="stylesheet" href="/mobile-nav.css?v=20261121_v3">
    <meta name="theme-color" content="#123e35">

    <meta property="og:type" content="article">
    <meta property="og:site_name" content="AnswerDesk">
    <meta property="og:url" content="${esc(canonicalUrl)}">
    <meta property="og:title" content="${esc(article.title)}">
    <meta property="og:description" content="${esc(metaDesc)}">
    <meta property="og:image" content="${esc(ogImage)}">
    <meta property="article:section" content="${esc(catObj.label)}">
    <meta property="article:published_time" content="${LAST_MOD}">
    <meta property="article:modified_time" content="${LAST_MOD}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(article.title)}">
    <meta name="twitter:description" content="${esc(metaDesc)}">
    <meta name="twitter:image" content="${esc(ogImage)}">

    <script type="application/ld+json">
${schemaJson}
    </script>
</head>
<body class="static-guide-page">
    ${renderHeader('Troubleshooting Guide')}

    <main class="standalone-guide-wrap">
        <div class="standalone-guide-container">
            <nav class="guide-breadcrumb" aria-label="Breadcrumb">
                <a href="/">Home</a>
                <span aria-hidden="true">&rsaquo;</span>
                <a href="/articles">All 704 Guides</a>
                <span aria-hidden="true">&rsaquo;</span>
                <a href="${esc(catHubPath)}">${esc(catObj.label)}</a>
                ${article.subCategory ? `<span aria-hidden="true">&rsaquo;</span><span class="crumb-current">${esc(article.subCategory)}</span>` : ''}
            </nav>

            <div class="guide-top-actions">
                <a href="/articles" class="back-to-articles-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
                    Browse All 704 Guides
                </a>
                <a href="${esc(catHubPath)}" class="back-to-category-link">
                    More in ${esc(catObj.label)} &rarr;
                </a>
            </div>

            <article class="full-article-card" itemscope itemtype="https://schema.org/TechArticle">
                <div class="reader-meta-bar">
                    <a href="${esc(catHubPath)}" class="article-card-tag article-tag-link">${esc(catObj.label)}</a>
                    ${subPillHtml}
                    <span class="article-card-time">&bull; ${esc(article.readTime || '5 min read')}</span>
                    <span class="guide-verified-pill">&#10003; Verified ${DISPLAY_DATE}</span>
                </div>

                <h1 class="reader-title" itemprop="headline">${esc(article.title)}</h1>

                <div class="reader-author-bar">
                    <img src="${esc(authorImg)}" alt="${esc(authorName)}" width="48" height="48">
                    <div class="reader-author-text">
                        <strong>Written &amp; Audited by <span itemprop="author">${esc(authorName)}</span></strong>
                        <span>${esc(authorRole)} &bull; <a href="/expert-verification" class="author-verify-link">AnswerDesk Vetted Expert</a> &bull; Updated <time datetime="${LAST_MOD}">${DISPLAY_DATE}</time></span>
                    </div>
                </div>

                <div class="reader-content" itemprop="articleBody">
                    ${mainBodyHtml}
                </div>

                <section class="guide-faq-section" aria-label="Frequently Asked Questions">
                    <h2>Frequently Asked Questions</h2>
                    <div class="guide-faq-list">
                        ${faqsHtml}
                    </div>
                </section>

                <div class="article-resolver-widget" id="articleResolverWidget">
                    <div class="resolver-question">
                        <h4>Did this diagnostic guide solve your issue?</h4>
                        <p>Let us know if your issue is resolved, or get connected to an active ${esc(catObj.label)} expert in seconds.</p>
                    </div>
                    <div class="resolver-action-btns" id="resolverActionBtns">
                        <button type="button" class="btn-solved" id="btnSolvedIssue">&#10003; Yes, Solved!</button>
                        <a href="/support?q=${encodeURIComponent(article.title)}" class="btn-not-solved" id="btnNotSolvedIssue">
                            No, Connect with Support Team &rarr;
                        </a>
                    </div>
                    <div class="resolver-feedback-message" id="resolverFeedbackMessage">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>Thank you for your feedback! We're glad this resolved your issue.</span>
                    </div>
                </div>
            </article>

            <section class="related-guides-section" aria-label="Related Troubleshooting Guides">
                <div class="related-guides-header">
                    <h2>Related ${esc(catObj.label)} Troubleshooting Guides</h2>
                    <a href="${esc(catHubPath)}" class="related-view-all">View all ${esc(catObj.label)} guides &rarr;</a>
                </div>
                <div class="related-guides-grid">
                    ${relatedHtml}
                </div>
            </section>
        </div>
    </main>

    ${renderFooter()}

    <script>
    (function(){
        var btn = document.getElementById('btnSolvedIssue');
        var actions = document.getElementById('resolverActionBtns');
        var msg = document.getElementById('resolverFeedbackMessage');
        if (btn && actions && msg) {
            btn.addEventListener('click', function(){
                actions.style.display = 'none';
                msg.style.display = 'inline-flex';
            });
        }
    })();
    </script>
    <script src="/cookie-banner.js?v=${JS_VER}"></script>
    <script src="/mobile-nav.js?v=${JS_VER}"></script>
</body>
</html>
`;
}

// Render one static Category Hub page: /guides/category/<cat>.html
function renderCategoryHubPage(catObj, catArticles, allCounts) {
    const canonicalUrl = `${SITE_ORIGIN}/guides/category/${catObj.id}`;
    const pageTitle = `${catObj.label} Troubleshooting Guides (${catArticles.length} Fixes) | AnswerDesk`;
    const metaDesc = truncateText(`Browse ${catArticles.length} verified, step-by-step ${catObj.label} troubleshooting guides: ${catObj.shortDesc}`, 158);
    const ogImage = `${SITE_ORIGIN}/assets/cta-expert-pro.png`;

    // Group articles by subCategory
    const groups = new Map();
    for (const a of catArticles) {
        const gName = a.subCategory || `Core ${catObj.label} Diagnostics`;
        if (!groups.has(gName)) groups.set(gName, []);
        groups.get(gName).push(a);
    }

    const schemaJson = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'CollectionPage',
                'name': `${catObj.label} Troubleshooting Guides`,
                'description': metaDesc,
                'url': canonicalUrl,
                'publisher': {
                    '@type': 'Organization',
                    'name': 'AnswerDesk',
                    'url': `${SITE_ORIGIN}/`
                },
                'mainEntity': {
                    '@type': 'ItemList',
                    'numberOfItems': catArticles.length,
                    'itemListElement': catArticles.slice(0, 50).map((a, idx) => ({
                        '@type': 'ListItem',
                        'position': idx + 1,
                        'name': a.title,
                        'url': `${SITE_ORIGIN}/guides/${a.id}`
                    }))
                }
            },
            {
                '@type': 'BreadcrumbList',
                'itemListElement': [
                    { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': `${SITE_ORIGIN}/` },
                    { '@type': 'ListItem', 'position': 2, 'name': 'Troubleshooting Guides', 'item': `${SITE_ORIGIN}/articles` },
                    { '@type': 'ListItem', 'position': 3, 'name': catObj.label, 'item': canonicalUrl }
                ]
            }
        ]
    }, null, 2).replace(/<\/script/gi, '<\\/script');

    const catPillsHtml = CATEGORIES.map(c => `
        <a href="/guides/category/${esc(c.id)}" class="hub-cat-pill${c.id === catObj.id ? ' active' : ''}">
            <span>${c.icon} ${esc(c.label)}</span>
            <span class="hub-cat-count">${allCounts[c.id] || 0}</span>
        </a>`).join('\n');

    const sectionsHtml = [...groups.entries()].map(([groupName, items]) => `
        <section class="hub-subgroup-section">
            <div class="hub-subgroup-header">
                <h2>${esc(groupName)}</h2>
                <span class="hub-subgroup-count">${items.length} guide${items.length === 1 ? '' : 's'}</span>
            </div>
            <div class="hub-guide-grid">
                ${items.map(a => `
                <a class="hub-guide-link-card" href="/guides/${esc(a.id)}">
                    <h3>${esc(a.title)}</h3>
                    <p>${esc(truncateText(a.snippet || a.directAnswer || '', 135))}</p>
                    <span class="article-read-link">Read Step-by-Step Guide &rarr;</span>
                </a>`).join('\n')}
            </div>
        </section>`).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(pageTitle)}</title>
    <meta name="description" content="${esc(metaDesc)}">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
    <link rel="canonical" href="${esc(canonicalUrl)}">
    <link rel="alternate" type="text/markdown" href="/llms.txt" title="AnswerDesk AI Knowledge Base Index">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><path d='M8 6C8 4.9 8.9 4 10 4H30C31.1 4 32 4.9 32 6V28C32 29.1 31.1 30 30 30H22L16 36V30H10C8.9 30 8 29.1 8 28V6Z' fill='%23278b7d'/><path d='M14 14L19 19L26 12' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/></svg>" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/index.css?v=20261121_v14">
    <link rel="stylesheet" href="/articles.css?v=${CSS_VER}">
    <link rel="stylesheet" href="/mobile-nav.css?v=20261121_v3">
    <meta name="theme-color" content="#123e35">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="AnswerDesk">
    <meta property="og:url" content="${esc(canonicalUrl)}">
    <meta property="og:title" content="${esc(pageTitle)}">
    <meta property="og:description" content="${esc(metaDesc)}">
    <meta property="og:image" content="${esc(ogImage)}">

    <script type="application/ld+json">
${schemaJson}
    </script>
</head>
<body class="static-category-hub-page">
    ${renderHeader('Category Hub')}

    <section class="articles-hero">
        <div class="articles-hero-inner">
            <div class="kb-badge">${catObj.icon} ${esc(catObj.label)} &bull; ${catArticles.length} Verified Guides</div>
            <h1 class="articles-hero-title">${esc(catObj.label)} Troubleshooting Guides</h1>
            <p class="articles-hero-subtitle">${esc(catObj.shortDesc)}</p>
            <div class="hub-hero-actions">
                <a href="/articles?category=${esc(catObj.id)}" class="btn-load-more">Search Inside ${esc(catObj.label)}</a>
                <a href="/support?q=${encodeURIComponent(catObj.label + ' support')}" class="hub-hero-secondary">Ask a Live Expert &rarr;</a>
            </div>
        </div>
    </section>

    <main class="standalone-guide-wrap">
        <div class="standalone-guide-container hub-wide-container">
            <nav class="guide-breadcrumb" aria-label="Breadcrumb">
                <a href="/">Home</a>
                <span aria-hidden="true">&rsaquo;</span>
                <a href="/articles">All 704 Guides</a>
                <span aria-hidden="true">&rsaquo;</span>
                <span class="crumb-current">${esc(catObj.label)}</span>
            </nav>

            <nav class="hub-category-strip" aria-label="All Troubleshooting Categories">
                ${catPillsHtml}
            </nav>

            ${sectionsHtml}
        </div>
    </main>

    ${renderFooter()}

    <script src="/cookie-banner.js?v=${JS_VER}"></script>
    <script src="/mobile-nav.js?v=${JS_VER}"></script>
</body>
</html>
`;
}

// Generate sitemap.xml with all 730 clean HTML URLs
function writeSitemap(articles) {
    const corePages = [
        { loc: `${SITE_ORIGIN}/`, priority: '1.0', freq: 'daily' },
        { loc: `${SITE_ORIGIN}/articles`, priority: '0.95', freq: 'daily' },
        { loc: `${SITE_ORIGIN}/support`, priority: '0.9', freq: 'weekly' },
        { loc: `${SITE_ORIGIN}/faq`, priority: '0.8', freq: 'weekly' },
        { loc: `${SITE_ORIGIN}/about`, priority: '0.7', freq: 'monthly' },
        { loc: `${SITE_ORIGIN}/expert-verification`, priority: '0.7', freq: 'monthly' },
        { loc: `${SITE_ORIGIN}/contact`, priority: '0.6', freq: 'monthly' },
        { loc: `${SITE_ORIGIN}/privacy`, priority: '0.4', freq: 'yearly' },
        { loc: `${SITE_ORIGIN}/terms`, priority: '0.4', freq: 'yearly' }
    ];

    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ];

    for (const p of corePages) {
        lines.push(`  <url>\n    <loc>${p.loc}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`);
    }
    for (const c of CATEGORIES) {
        lines.push(`  <url>\n    <loc>${SITE_ORIGIN}/guides/category/${c.id}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>`);
    }
    for (const a of articles) {
        lines.push(`  <url>\n    <loc>${SITE_ORIGIN}/guides/${a.id}</loc>\n    <lastmod>${LAST_MOD}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
    }

    lines.push('</urlset>\n');
    fs.writeFileSync(path.join(__dirname, 'sitemap.xml'), lines.join('\n'), 'utf8');
    return corePages.length + CATEGORIES.length + articles.length;
}

// Generate llms.txt & llms-full.txt using clean standalone /guides/<slug> URLs
function writeLlmsFiles(articles, counts) {
    const llmsLines = [
        '# AnswerDesk — Technical Troubleshooting & Expert Q&A Knowledge Base',
        '',
        '> AnswerDesk is an independent 24/7 technical troubleshooting knowledge base and expert consultation platform offering 704 verified, step-by-step problem resolution guides across Microsoft Windows, Apple (iPhone, Mac, iPad, Watch, iCloud), PayPal, Amazon, Antivirus suites, Windows Defender, appliances, automotive OBD-II, printers, Wi-Fi networking, and more.',
        '',
        '## Core Pages',
        `- [Home](${SITE_ORIGIN}/)`,
        `- [All 704 Troubleshooting Guides Hub](${SITE_ORIGIN}/articles)`,
        `- [Live 24/7 Expert Support Chat](${SITE_ORIGIN}/support)`,
        `- [Frequently Asked Questions](${SITE_ORIGIN}/faq)`,
        `- [Expert Vetting & Verification Standards](${SITE_ORIGIN}/expert-verification)`,
        `- [Full Plain-Markdown Q&A Corpus (704 Guides)](${SITE_ORIGIN}/llms-full.txt)`,
        `- [XML Sitemap (729 URLs)](${SITE_ORIGIN}/sitemap.xml)`,
        '',
        '## Static Category Hubs (All Guides Crawlable in Plain HTML)',
        ...CATEGORIES.map(c => `- [${c.label} (${counts[c.id] || 0} guides)](${SITE_ORIGIN}/guides/category/${c.id}): ${c.shortDesc}`),
        ''
    ];
    fs.writeFileSync(path.join(__dirname, 'llms.txt'), llmsLines.join('\n'), 'utf8');

    const fullLines = [
        '# AnswerDesk Complete Troubleshooting Corpus (704 Verified Guides)',
        '',
        `Source: ${SITE_ORIGIN}/articles`,
        `Last Updated: ${LAST_MOD}`,
        ''
    ];

    for (const c of CATEGORIES) {
        const list = articles.filter(a => a.category === c.id);
        fullLines.push(`## ${c.label} (${list.length} Guides)`);
        fullLines.push(`Category Hub: ${SITE_ORIGIN}/guides/category/${c.id}`);
        fullLines.push('');
        for (const a of list) {
            const ans = (a.directAnswer || a.snippet || stripHtml(a.content).slice(0, 400)).trim();
            fullLines.push(`### ${a.title}`);
            fullLines.push(`- URL: ${SITE_ORIGIN}/guides/${a.id}`);
            if (a.subCategory) fullLines.push(`- Sub-Topic: ${a.subCategory}`);
            fullLines.push(`- Answer: ${ans}`);
            fullLines.push('');
        }
    }
    fs.writeFileSync(path.join(__dirname, 'llms-full.txt'), fullLines.join('\n'), 'utf8');
}

// Generate robots.txt + IndexNow key + IndexNow submission helper
function writeCrawlAndIndexNowFiles(articles) {
    const robots = [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /api/',
        '',
        '# Search Engines',
        'User-agent: Googlebot',
        'Allow: /',
        '',
        'User-agent: Bingbot',
        'Allow: /',
        '',
        '# AI Search & LLM Indexing Bots',
        'User-agent: GPTBot',
        'Allow: /',
        '',
        'User-agent: OAI-SearchBot',
        'Allow: /',
        '',
        'User-agent: ChatGPT-User',
        'Allow: /',
        '',
        'User-agent: PerplexityBot',
        'Allow: /',
        '',
        'User-agent: ClaudeBot',
        'Allow: /',
        '',
        'User-agent: anthropic-ai',
        'Allow: /',
        '',
        'User-agent: Google-Extended',
        'Allow: /',
        '',
        'User-agent: Applebot-Extended',
        'Allow: /',
        '',
        `# LLM Knowledge Base Indexes`,
        `# ${SITE_ORIGIN}/llms.txt`,
        `# ${SITE_ORIGIN}/llms-full.txt`,
        '',
        `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
        ''
    ].join('\n');
    fs.writeFileSync(path.join(__dirname, 'robots.txt'), robots, 'utf8');

    // IndexNow verification key file in site root
    fs.writeFileSync(path.join(__dirname, `${INDEXNOW_KEY}.txt`), `${INDEXNOW_KEY}\n`, 'utf8');

    // IndexNow submission script for Bing + ChatGPT Search instant indexing after deployment
    ensureDir(path.join(__dirname, 'scripts'));
    const submitScript = `#!/usr/bin/env node
// Submit all AnswerDesk URLs to IndexNow (Bing, ChatGPT Search, Yandex, Seznam, Naver)
// Run AFTER deploying your latest build to Vercel or your custom domain:
//   node scripts/submit-indexnow.js
//   SITE_ORIGIN=https://yourdomain.com node scripts/submit-indexnow.js

'use strict';

const fs = require('fs');
const path = require('path');

const SITE_ORIGIN = (process.env.SITE_ORIGIN || '${SITE_ORIGIN}').replace(/\\/+$/, '');
const HOST = new URL(SITE_ORIGIN).host;
const KEY = '${INDEXNOW_KEY}';
const KEY_LOCATION = SITE_ORIGIN + '/' + KEY + '.txt';

const sitemap = fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\\/loc>/g)].map(m => m[1].replace(/^https?:\\/\\/[^/]+/, SITE_ORIGIN));

(async () => {
    console.log(\`Submitting \${urls.length} URLs for host \${HOST} via IndexNow...\`);
    const payload = {
        host: HOST,
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList: urls
    };
    const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log('IndexNow HTTP status:', res.status, text || 'OK');
    if (!res.ok) process.exit(1);
})();
`;
    fs.writeFileSync(path.join(__dirname, 'scripts', 'submit-indexnow.js'), submitScript, 'utf8');
}

function main() {
    const startTime = Date.now();
    const articles = loadArticles();
    const guidesDir = path.join(__dirname, 'guides');
    const catDir = path.join(guidesDir, 'category');
    ensureDir(guidesDir);
    ensureDir(catDir);

    // Group indexes
    const counts = {};
    const byCategory = new Map();
    const bySubCategory = new Map();

    for (const a of articles) {
        counts[a.category] = (counts[a.category] || 0) + 1;
        if (!byCategory.has(a.category)) byCategory.set(a.category, []);
        byCategory.get(a.category).push(a);
        if (a.subCategory) {
            const key = `${a.category}::${a.subCategory}`;
            if (!bySubCategory.has(key)) bySubCategory.set(key, []);
            bySubCategory.get(key).push(a);
        }
    }

    // 1. Write 704 standalone static guide HTML pages
    let totalWordCount = 0;
    let minWords = Infinity;
    let maxWords = 0;
    for (const a of articles) {
        const related = getRelatedGuides(a, byCategory, bySubCategory);
        const html = renderGuidePage(a, related);
        fs.writeFileSync(path.join(guidesDir, `${a.id}.html`), html, 'utf8');

        // Measure visible article word count
        const articleMatch = html.match(/<article class="full-article-card"[\s\S]*?<\/article>/);
        const words = stripHtml(articleMatch ? articleMatch[0] : '').split(/\s+/).filter(Boolean).length;
        totalWordCount += words;
        if (words < minWords) minWords = words;
        if (words > maxWords) maxWords = words;
    }

    // 2. Write 16 static Category Hub pages
    for (const catObj of CATEGORIES) {
        const catArticles = byCategory.get(catObj.id) || [];
        const html = renderCategoryHubPage(catObj, catArticles, counts);
        fs.writeFileSync(path.join(catDir, `${catObj.id}.html`), html, 'utf8');
    }

    // 3. Write sitemap.xml, llms.txt, llms-full.txt, robots.txt, and IndexNow files
    const sitemapCount = writeSitemap(articles);
    writeLlmsFiles(articles, counts);
    writeCrawlAndIndexNowFiles(articles);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Generated ${articles.length} standalone static guide pages in /guides/<slug>.html`);
    console.log(`Generated ${CATEGORIES.length} static category hub pages in /guides/category/<cat>.html`);
    console.log(`Visible guide article words: avg=${Math.round(totalWordCount / articles.length)}, min=${minWords}, max=${maxWords}`);
    console.log(`Updated sitemap.xml (${sitemapCount} clean HTML URLs), llms.txt, llms-full.txt, robots.txt, and IndexNow key.`);
    console.log(`Done in ${elapsed}s.`);
}

main();
