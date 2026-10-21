// ===== FLUID STATS COUNTER ANIMATION (Global: Home, Index, Support) =====
(function initStatsCounter() {
    function start() {
        const statNumbers = document.querySelectorAll('.stat-number[data-target]');
        if (statNumbers.length) {
            let statsAnimated = false;

            // Ease-out cubic: silky smooth, gradual, visually satisfying deceleration
            function easeOutCubic(t) {
                return 1 - Math.pow(1 - t, 3);
            }

            function runFluidCounters() {
                if (statsAnimated) return;
                statsAnimated = true;
                const duration = 2800; // 2.8s: fluid, slow, readable progression
                const startTime = performance.now();

                function updateCounter(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easedProgress = easeOutCubic(progress);

                    statNumbers.forEach(el => {
                        const target = parseFloat(el.getAttribute('data-target'));
                        const suffix = el.getAttribute('data-suffix') || '';
                        const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
                        const formatComma = el.getAttribute('data-format') === 'comma';

                        const currentVal = easedProgress * target;

                        let displayVal = currentVal.toFixed(decimals);
                        if (formatComma) {
                            displayVal = Math.round(currentVal).toLocaleString();
                        }

                        el.textContent = displayVal + suffix;
                    });

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    } else {
                        statNumbers.forEach(el => {
                            const target = parseFloat(el.getAttribute('data-target'));
                            const suffix = el.getAttribute('data-suffix') || '';
                            const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
                            const formatComma = el.getAttribute('data-format') === 'comma';
                            let finalVal = target.toFixed(decimals);
                            if (formatComma) {
                                finalVal = Math.round(target).toLocaleString();
                            }
                            el.textContent = finalVal + suffix;
                            el.classList.add('counter-completed');
                        });
                    }
                }

                requestAnimationFrame(updateCounter);
            }

            const statsTarget = document.querySelector('.stats-rounded-card, .stats-section-wrap, .stats-bar, #statsBar');
            if (statsTarget && 'IntersectionObserver' in window) {
                const statsObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            runFluidCounters();
                            statsObserver.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.15 });
                statsObserver.observe(statsTarget);
            } else {
                runFluidCounters();
            }
        }

        // Two-way CTA glide scroll animation (Left text glide in + Right curvy image glide in)
        const ctaSection = document.querySelector('.cta-section');
        if (ctaSection && 'IntersectionObserver' in window) {
            const ctaObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const ctaContent = entry.target.querySelector('.cta-content');
                        const ctaImageWrap = entry.target.querySelector('.cta-image-wrap');
                        if (ctaContent) ctaContent.classList.add('animated');
                        if (ctaImageWrap) ctaImageWrap.classList.add('animated', 'visible');
                        ctaObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.15 });
            ctaObserver.observe(ctaSection);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();

(function () {
    'use strict';

    // ===== Page Detection =====
    const isHomePage = !document.getElementById('chatBody');
    if (isHomePage) return; // Homepage has its own inline script

    // ===== DOM References =====
    const heroHeadline = document.getElementById('heroHeadline');
    const heroSubtext = document.getElementById('heroSubtext');
    const dynamicCategory = document.getElementById('dynamicCategory');
    const suggestionPills = document.getElementById('suggestionPills');
    const chatSuggestionPills = document.getElementById('chatSuggestionPills');
    const chatBody = document.getElementById('chatBody');
    const chatInput = document.getElementById('chatInput');
    const startChatBtn = document.getElementById('startChatBtn');
    const expertModal = document.getElementById('expertModal');
    const modalClose = document.getElementById('modalClose');
    const callExpertBtn = document.getElementById('callExpertBtn');
    const continueChatBtn = document.getElementById('continueChatBtn');
    const phoneReveal = document.getElementById('phoneReveal');
    const onlineCount = document.getElementById('onlineCount');
    const callDetailsPanel = document.getElementById('callDetailsPanel');

    // ===== State =====
    let chatStarted = false;
    let messageCount = 0;
    let detectedCategory = null;
    let pendingDisambiguation = null;
    let escalationOffered = false;
    let unreadCount = 0;
    let pageTitle = document.title;
    let isPageVisible = true;

    // ===== Chat Flow State Machine =====
    // Phases: greeting -> understanding -> summary -> recommendation -> ai_chat -> re_escalate
    let chatPhase = 'greeting';
    let userMessages = []; // Store user messages for context
    let issueSummary = '';
    let questionCount = 0; // How many clarifying questions asked
    let aiChatCount = 0; // Messages in AI chat phase
    let askedQuestions = []; // Track questions already asked to prevent repetition

    // ===== Captured Details (echo-back personalization) =====
    let capturedDetails = {
        device: null,       // "iPhone 14 Pro Max", "Dell Inspiron"
        issue: null,        // "not turning on", "blue screen"
        duration: null,     // "since this morning", "2 days"
        cause: null,        // "after update", "dropped it"
        triedFix: null,     // "restarted twice", "cleared cache"
        model: null,        // specific model info
        platform: null,     // "Binance", "Microsoft 365"
        symptoms: null,     // "won't charge", "error 0x..."
        petType: null,      // "dog", "cat"
        petBreed: null,     // "Golden Retriever"
        bodyPart: null,     // "chest", "head", "stomach"
        productName: null,  // "Office 365", "Game Pass"
        vehicleInfo: null,  // "2019 Toyota Camry"
        location: null,     // "kitchen", "bathroom"
        rawIssuePhrase: null // exact user words for the issue, e.g. "is dull today"
    };

    // ===== Edge Case Tracking =====
    let greetingCount = 0;       // Track repeated greetings
    let gibberishCount = 0;      // Track gibberish/random messages
    let offTopicCount = 0;       // Track off-topic messages
    let lastUserIntent = null;   // Track what user seems to want
    let consecutiveShortMsgs = 0; // Track one-word responses

    // ===== 35 Expert Profiles (each with unique photo) =====
    const expertProfiles = [
        { id: 1, name: 'David Miller', avatar: 'assets/expert-1.png', customers: 12437 },
        { id: 2, name: 'James Wilson', avatar: 'assets/expert-2.png', customers: 9812 },
        { id: 3, name: 'Robert Anderson', avatar: 'assets/expert-3.png', customers: 8245 },
        { id: 4, name: 'Ryan Mitchell', avatar: 'assets/expert-4.png', customers: 6534 },
        { id: 5, name: 'Matthew Brooks', avatar: 'assets/expert-5.png', customers: 11290 },
        { id: 6, name: 'Jennifer Hayes', avatar: 'assets/expert-6.png', customers: 14563 },
        { id: 7, name: 'Thomas Bennett', avatar: 'assets/expert-7.png', customers: 10877 },
        { id: 8, name: 'Amanda Foster', avatar: 'assets/expert-8.png', customers: 7691 },
        { id: 9, name: 'Richard Clark', avatar: 'assets/expert-9.png', customers: 15234 },
        { id: 10, name: 'Katherine Moore', avatar: 'assets/expert-10.png', customers: 9456 },
        { id: 11, name: 'Christopher Taylor', avatar: 'assets/expert-11.png', customers: 8123 },
        { id: 12, name: 'Stephanie Ross', avatar: 'assets/expert-12.png', customers: 13891 },
        { id: 13, name: 'Daniel Cooper', avatar: 'assets/expert-13.png', customers: 11045 },
        { id: 14, name: 'Sarah Thompson', avatar: 'assets/expert-14.png', customers: 16722 },
        { id: 15, name: 'Andrew Parker', avatar: 'assets/expert-15.png', customers: 7389 },
        { id: 16, name: 'Emily Watson', avatar: 'assets/expert-16.png', customers: 12158 },
        { id: 17, name: 'Michael Reed', avatar: 'assets/expert-17.png', customers: 9634 },
        { id: 18, name: 'Rachel Adams', avatar: 'assets/expert-18.png', customers: 14207 },
        { id: 19, name: 'William Barnes', avatar: 'assets/expert-19.png', customers: 8756 },
        { id: 20, name: 'Laura Mitchell', avatar: 'assets/expert-20.png', customers: 11432 },
        { id: 21, name: 'Gregory Harris', avatar: 'assets/expert-21.png', customers: 10198 },
        { id: 22, name: 'Patricia Coleman', avatar: 'assets/expert-22.png', customers: 15876 },
        { id: 23, name: 'Tyler Evans', avatar: 'assets/expert-23.png', customers: 6891 },
        { id: 24, name: 'Megan Sullivan', avatar: 'assets/expert-24.png', customers: 11567 },
        { id: 25, name: 'Brian Crawford', avatar: 'assets/expert-25.png', customers: 13245 },
        { id: 26, name: 'Nicole Peterson', avatar: 'assets/expert-26.png', customers: 10432 },
        { id: 27, name: 'Charles Henderson', avatar: 'assets/expert-27.png', customers: 16109 },
        { id: 28, name: 'Ashley Morgan', avatar: 'assets/expert-28.png', customers: 7823 },
        { id: 29, name: 'Kevin Stewart', avatar: 'assets/expert-29.png', customers: 9278 },
        { id: 30, name: 'Rebecca Turner', avatar: 'assets/expert-30.png', customers: 12654 },
        { id: 31, name: 'Douglas Hamilton', avatar: 'assets/expert-31.png', customers: 14891 },
        { id: 32, name: 'Jessica Reynolds', avatar: 'assets/expert-32.png', customers: 8567 },
        { id: 33, name: 'Nathan Collins', avatar: 'assets/expert-33.png', customers: 11789 },
        { id: 34, name: 'Victoria Price', avatar: 'assets/expert-34.png', customers: 13412 },
        { id: 35, name: 'Scott Donovan', avatar: 'assets/expert-35.png', customers: 10056 }
    ];

    // ===== Expert Profile Roles per Category =====
    const categoryRoles = {
        crypto: 'Crypto Finance Specialist',
        microsoft: 'Windows & Microsoft Systems Engineer',
        ios: 'Apple & iOS Specialist',
        xbox: 'Gaming Support Specialist',
        android: 'Android Tech Expert',
        plumbing: 'Licensed Plumber',
        legal: 'Licensed Attorney',
        medical: 'Board Certified Physician',
        veterinary: 'Licensed Veterinarian',
        automotive: 'ASE Certified Mechanic',
        subscription: 'Billing Specialist',
        account: 'Account Security Specialist',
        appliances: 'Appliance & Electronics Specialist',
        finance: 'Certified Public Accountant'
    };

    // ===== Grammar Helper for A/An before Expert Labels =====
    function getAOrAn(word) {
        if (!word) return 'a';
        const firstLetter = word.trim().charAt(0).toLowerCase();
        if (['a', 'e', 'i', 'o', 'u'].includes(firstLetter)) {
            return 'an';
        }
        return 'a';
    }

    // ===== Non-Repeating Expert Selection (localStorage) =====
    let selectedExpert = null;

    function selectExpertProfile() {
        const storageKey = 'answerdesk_shown_experts';
        let shownIds = [];

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                shownIds = JSON.parse(stored);
            }
        } catch (e) { shownIds = []; }

        // If all 35 have been shown, reset
        if (shownIds.length >= expertProfiles.length) {
            shownIds = [];
        }

        // Filter available profiles
        const available = expertProfiles.filter(p => !shownIds.includes(p.id));

        // Random selection from available pool
        const randomIndex = Math.floor(Math.random() * available.length);
        const chosen = available[randomIndex];

        // Save to localStorage
        shownIds.push(chosen.id);
        try {
            localStorage.setItem(storageKey, JSON.stringify(shownIds));
        } catch (e) { }

        selectedExpert = chosen;
        return chosen;
    }

    // Select an expert for this session immediately
    selectExpertProfile();

    // ===== Notification Sound (generated via Web Audio API) =====
    let audioCtx = null;

    function playNotificationSound() {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            const now = audioCtx.currentTime;
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, now);
            gain1.gain.setValueAtTime(0.15, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc1.start(now);
            osc1.stop(now + 0.3);

            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1175, now + 0.15);
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.setValueAtTime(0.12, now + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start(now + 0.15);
            osc2.stop(now + 0.5);
        } catch (e) { }
    }

    // ===== Tab Message Count =====
    function updateTabTitle() {
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) ${pageTitle}`;
        } else {
            document.title = pageTitle;
        }
    }

    document.addEventListener('visibilitychange', () => {
        isPageVisible = !document.hidden;
        if (isPageVisible) { unreadCount = 0; updateTabTitle(); }
    });
    window.addEventListener('focus', () => { isPageVisible = true; unreadCount = 0; updateTabTitle(); });
    window.addEventListener('blur', () => { isPageVisible = false; });

    // ===== Category Detection =====
    const categories = {
        crypto: {
            keywords: ['binance', 'coinbase', 'crypto', 'bitcoin', 'ethereum', 'wallet', 'blockchain', 'trading', 'token', 'nft', 'defi', 'metamask', 'ledger', 'exchange', 'paypal', 'gpay', 'google pay', 'apple pay', 'venmo', 'cash app', 'amazon pay', 'zelle', 'digital wallet'],
            label: 'Digital Payments & Fintech', expertType: 'Finance', phone: '1-800-555-0188',
            expertName: 'Alex Rivera', expertRole: 'Crypto Finance Specialist'
        },
        microsoft: {
            keywords: ['microsoft', 'windows', 'office', 'outlook', 'excel', 'word', 'powerpoint', 'teams', 'onedrive', 'sharepoint', 'azure', 'surface', '.net', 'visual studio', 'edge', 'bing', 'activat', 'license', 'product key'],
            label: 'Microsoft', expertType: 'Tech', phone: '1-800-936-5700',
            expertName: 'David Miller', expertRole: 'Windows & Microsoft Systems Engineer'
        },
        ios: {
            keywords: ['ios', 'iphone', 'ipad', 'apple', 'mac', 'macbook', 'imac', 'airpods', 'safari', 'itunes', 'icloud', 'siri', 'facetime', 'app store'],
            label: 'iPhone & Apple', expertType: 'Apple', phone: '1-800-275-2273',
            expertName: 'James Wilson', expertRole: 'Apple & iOS Specialist'
        },
        xbox: {
            keywords: ['xbox', 'game pass', 'controller', 'halo', 'forza', 'console', 'kinect', 'xbox live'],
            label: 'Xbox', expertType: 'Tech', phone: '1-800-469-9269',
            expertName: 'Robert Chen', expertRole: 'Gaming Support Specialist'
        },
        android: {
            keywords: ['android', 'samsung', 'pixel', 'google phone', 'galaxy', 'play store'],
            label: 'Android', expertType: 'Tech', phone: '1-800-726-7864',
            expertName: 'Arun Patel', expertRole: 'Android Tech Expert'
        },
        plumbing: {
            keywords: ['plumb', 'pipe', 'leak', 'drain', 'faucet', 'toilet', 'water heater', 'sewer', 'clog'],
            label: 'Plumbing', expertType: 'Home', phone: '1-800-555-0199',
            expertName: 'Mike Johnson', expertRole: 'Licensed Plumber'
        },
        legal: {
            keywords: ['lawyer', 'legal', 'attorney', 'lawsuit', 'court', 'contract', 'divorce', 'custody', 'bankruptcy', 'immigration', 'fired', 'wrongful', 'termination', 'employer', 'sue', 'suing', 'eviction', 'tenant', 'landlord', 'settlement', 'compensation', 'harassment', 'discrimination'],
            label: 'Legal', expertType: 'Legal', phone: '1-800-555-0177',
            expertName: 'Sarah Williams', expertRole: 'Licensed Attorney'
        },
        veterinary: {
            keywords: ['dog', 'cat', 'puppy', 'kitten', 'pet', 'vet', 'veterinary', 'animal', 'bird', 'hamster', 'rabbit', 'guinea pig', 'parrot', 'turtle', 'horse', 'fish tank', 'aquarium'],
            label: 'Veterinary', expertType: 'Vet', phone: '1-800-555-0145',
            expertName: 'Dr. Sarah Mitchell', expertRole: 'Licensed Veterinarian'
        },
        medical: {
            keywords: ['doctor', 'medical', 'health', 'symptom', 'pain', 'hurt', 'hurts', 'injured', 'injury', 'fall', 'fell', 'accident', 'diagnosis', 'prescription', 'medicine', 'hospital', 'clinic', 'nurse', 'chest', 'breathing', 'fever', 'nausea', 'headache', 'dizzy', 'rash', 'cough', 'vomit', 'stomach', 'anxiety', 'depression', 'insomnia', 'allergy', 'pregnant', 'pregnancy'],
            label: 'Medical', expertType: 'Health', phone: '1-800-555-0134',
            expertName: 'Dr. Emily Parks', expertRole: 'Board Certified Physician'
        },
        automotive: {
            keywords: ['car', 'vehicle', 'engine', 'brake', 'transmission', 'mechanic', 'auto', 'tire', 'battery', 'oil change'],
            label: 'Automotive', expertType: 'Auto', phone: '1-800-555-0156',
            expertName: 'Tom Garcia', expertRole: 'ASE Certified Mechanic'
        },
        subscription: {
            keywords: ['subscription', 'cancel', 'cancellation', 'refund', 'billing', 'charge', 'payment', 'renew', 'renewal', 'unsubscribe', 'membership', 'plan', 'upgrade', 'downgrade', 'free trial', 'charged me'],
            label: 'Billing & Subscriptions', expertType: 'Billing', phone: '1-800-555-0122',
            expertName: 'Lisa Morgan', expertRole: 'Billing Specialist'
        },
        account: {
            keywords: ['account', 'login', 'password', 'forgot password', 'locked out', 'two factor', '2fa', 'verification', 'sign in', 'register', 'username'],
            label: 'Account & Security', expertType: 'Tech', phone: '1-800-555-0111',
            expertName: 'David Miller', expertRole: 'Security Specialist'
        },
        appliances: {
            keywords: ['appliance', 'appliances', 'fridge', 'refrigerator', 'washer', 'washing machine', 'dryer', 'dishwasher', 'tv', 'television', 'printer', 'microwave', 'oven', 'stove'],
            label: 'Appliances & Electronics', expertType: 'Appliance', phone: '1-800-555-0210',
            expertName: 'Robert Miller', expertRole: 'Appliance & Electronics Specialist'
        },
        finance: {
            keywords: ['tax', 'taxes', 'cpa', 'irs', 'audit', '401k', 'ira', 'retirement', 'mortgage', 'debt', 'invest', 'accounting', 'schedule c', 'budget'],
            label: 'Taxes & Finance', expertType: 'Finance', phone: '1-800-555-0220',
            expertName: 'Rebecca Hall', expertRole: 'Certified Public Accountant'
        }
    };

    // ===== AI Knowledge Base =====
    const knowledgeBase = {
        crypto: [
            { q: ['login', 'password', 'forgot', 'locked', 'access'], a: "I understand you're having trouble accessing your crypto account. Here are the steps to recover it:\n\n1) Go to the platform's password reset page\n2) Enter your registered email address\n3) Check your email (including spam folder) for the reset link\n4) If you don't have access to your registered email or phone number, you'll need to submit an identity verification request\n5) Prepare a government-issued ID and a selfie for verification\n\nWould you like me to guide you through the identity verification process?" },
            { q: ['verify', 'verification', 'kyc', 'identity'], a: "For identity verification:\n\n1) Go to your account settings and find the verification/KYC section\n2) Upload a clear photo of your government-issued ID (passport or driver's license)\n3) Take a selfie following the on-screen instructions\n4) Submit your application - processing typically takes 1-3 business days\n5) You'll receive an email notification once verified\n\nIs there a specific step you're having trouble with?" },
            { q: ['withdraw', 'transfer', 'send', 'deposit'], a: "For withdrawal/transfer issues:\n\n1) Make sure your account is fully verified\n2) Check that you have sufficient balance (account for network fees)\n3) Double-check the wallet address before confirming\n4) Ensure you're using the correct network (e.g., ERC-20, BEP-20, TRC-20)\n5) Some withdrawals may be on hold for security - check your email for confirmation\n\nWhat specific issue are you facing with your transaction?" },
            { q: ['trade', 'trading', 'buy', 'sell', 'order'], a: "For trading issues:\n\n1) Check if the trading pair is available in your region\n2) Ensure your account has sufficient funds\n3) For limit orders, verify your price is within the current range\n4) Check for any platform maintenance announcements\n5) Clear your browser cache and try again\n\nWould you like help with a specific trading operation?" },
            { q: ['seed phrase', 'recovery phrase', 'private key', 'seed', 'mnemonic'], a: "If you lost your wallet seed phrase or private key:\n\n1) Check any offline locations where you might have written it down (notebook, safe, paper slips)\n2) Note: Non-custodial wallets (like MetaMask, Trust Wallet, Ledger) do NOT store seed phrases on servers. If lost, they cannot recover it for you\n3) If your wallet is still currently unlocked on a device, go to Settings > Security and choose 'Reveal Seed Phrase' immediately\n4) Write it down physically - never store it as a screenshot or in emails\n\nShall I guide you on how to extract the phrase from an active session?" },
            { q: ['ledger', 'trezor', 'hardware wallet', 'nano'], a: "For hardware wallet connection or update issues:\n\n1) Disconnect and reconnect your device using a different USB cable or port\n2) Close all other background applications that might compete for USB access (e.g. other wallets)\n3) Ensure your hardware wallet manager (e.g., Ledger Live, Trezor Suite) is fully updated to the latest version\n4) Unlock your hardware device and open the correct blockchain app (e.g., Ethereum app) before starting a transaction\n\nWould you like help with updating your device firmware?" },
            { q: ['tax', 'taxes', 'reporting', 'capital gains', '1099'], a: "For cryptocurrency tax questions:\n\n1) Remember that in most jurisdictions, swaps, sales, and spendings of crypto are taxable events\n2) Gather your full CSV transaction history from every exchange and wallet you used\n3) Use specialized crypto tax software (like CoinTracker or Koinly) to aggregate your transactions and calculate capital gains/losses\n4) Generate your Form 8949 and Schedule D for tax filing\n\nWould you like me to connect you with a financial expert who specializes in crypto taxes?" },
            { q: ['hacked', 'phishing', 'scam', 'stolen', 'unauthorized'], a: "If you believe your crypto wallet has been hacked or compromised:\n\n1) **Act Fast**: Disconnect your wallet from any connected DApps immediately\n2) Transfer any remaining assets to a brand new, clean software or hardware wallet\n3) If it's a centralized exchange account, change your password immediately, revoke active sessions, and freeze your account via security settings\n4) Gather wallet addresses, transaction IDs (hashes), and timestamps for any unauthorized withdrawals\n\nWould you like help preparing a security brief for investigation?" },
            { q: ['migration', 'airdrop', 'claim token'], a: "For token migrations or claiming an airdrop:\n\n1) Double-check the contract address on an official explorer (like Etherscan) to avoid scam/phishing contracts\n2) Ensure your wallet has enough native gas tokens (like ETH or BNB) to pay for transaction gas fees\n3) Connect your wallet via WalletConnect or browser extensions on the verified official claiming site\n4) Initiate and sign the claiming transaction after verifying gas cost limits\n\nAre you getting an 'insufficient gas' error?" },
            { q: ['regional', 'restrict', 'ban', 'vpn'], a: "For regional account access restrictions:\n\n1) Check the exchange's terms to confirm if your geographic region is officially geo-blocked\n2) Avoid accessing financial platforms over unsecure free VPNs, which often trigger suspicious security blocks\n3) If you are traveling or relocated, prepare to upload updated regional address proofs (utility bills or local bank statements)\n4) Export your full transaction history immediately via API or CSV before the account is restricted to read-only mode\n\nDo you need to export your transaction logs?" },
            { q: ['paypal', 'gpay', 'google pay', 'apple pay', 'venmo', 'cash app', 'declined', 'wallet error', 'amazon pay', 'zelle'], a: "For digital wallet & payment app issues (PayPal, Google Pay, Apple Pay, Venmo, Cash App):\n\n1) Check if your linked debit/credit card has expired or requires zip code re-verification\n2) Clear payment app cache or restart your device to resolve checkout handoff glitches\n3) For online transactions: Ensure your bank has not placed a temporary fraud protection block on rapid online charges\n4) Never share one-time SMS verification pins or account passwords with anyone\n\n⚠️ Disclaimer: We provide informational technical assistance only. AnswerDesk does not process payments, access user credentials, or initiate monetary transfers.\n\nWhich payment app or checkout service are you using?" }
        ],
        microsoft: [
            { q: ['won\'t start', 'not booting', 'boot', 'startup', 'black screen', 'loading screen'], a: 'Try these steps:\n\n1) Hold the power button for 10 seconds to force shutdown, then restart\n2) If you see a black screen, try Ctrl+Alt+Delete\n3) Boot into Safe Mode by holding Shift while clicking Restart\n4) Run Startup Repair from Advanced Options\n\nWould you like more detailed steps for any of these?' },
            { q: ['slow', 'performance', 'lag', 'freeze', 'hanging', 'lagging'], a: 'To improve Windows performance:\n\n1) Open Task Manager (Ctrl+Shift+Esc) and end unnecessary processes\n2) Run Disk Cleanup to free space\n3) Disable startup programs via Task Manager > Startup tab\n4) Check for Windows updates\n5) Run a malware scan with Windows Defender\n\nWant me to walk you through any step?' },
            { q: ['update', 'upgrade', 'install', 'update error'], a: 'For Windows Update issues:\n\n1) Go to Settings > Windows Update and click "Check for updates"\n2) If stuck, try the Windows Update Troubleshooter\n3) Clear the update cache: stop the Windows Update service, delete SoftwareDistribution contents, then restart the service\n\nNeed more help?' },
            { q: ['activation', 'license', 'product key', 'activate'], a: 'For Windows activation:\n\n1) Go to Settings > System > Activation\n2) Click "Change product key" and enter your key\n3) If you don\'t have a key, select "Get a new license in the Microsoft Store"\n4) For digital license issues, use the Activation Troubleshooter\n\nShall I guide you further?' },
            { q: ['blue screen', 'bsod', 'crash', 'stop code'], a: 'For Blue Screen errors:\n\n1) Note the error code shown\n2) Restart in Safe Mode and uninstall recent software/drivers\n3) Run "sfc /scannow" in Command Prompt as admin\n4) Check for driver updates\n5) Run Windows Memory Diagnostic\n\nWhat error code do you see?' },
            { q: ['outlook', 'email', 'emails'], a: 'For Outlook issues:\n\n1) Try restarting Outlook\n2) Check your internet connection\n3) Go to File > Account Settings and verify your email config\n4) Try running Outlook in Safe Mode (hold Ctrl while opening)\n5) Repair Office via Settings > Apps > Microsoft Office > Modify\n\nWhat specific issue are you facing?' },
            { q: ['office', 'excel', 'word', 'powerpoint'], a: 'For Microsoft Office issues:\n\n1) Go to Settings > Apps > Microsoft 365 and select Modify > Quick Repair\n2) If that doesn\'t work, try Online Repair\n3) Check your subscription status at account.microsoft.com\n4) Make sure Office is fully updated\n\nWhat specific Office problem are you seeing?' },
            { q: ['onedrive', 'sync', 'missing files', 'backup'], a: 'For OneDrive sync issues:\n\n1) Check if the OneDrive icon is present in the taskbar; if not, search for OneDrive and open it\n2) Right-click the icon and verify that sync isn\'t paused\n3) Ensure you have enough storage space left in your OneDrive account (5GB free default)\n4) Reset OneDrive: Press Win+R, type "onedrive.exe /reset", and hit Enter\n\nAre you getting a specific sync error message?' },
            { q: ['teams', 'screenshare', 'share screen', 'screen share'], a: "For Microsoft Teams screen sharing issues:\n\n1) Check Teams permissions in Windows Settings > Privacy > Screen Recording (ensure Teams is enabled)\n2) Toggle hardware graphics acceleration: Settings > General > uncheck 'Disable GPU hardware acceleration'\n3) Update your display graphics drivers and restart Teams\n4) If audio isn't sharing during screen share, ensure you check 'Include computer sound' when starting the share\n\nAre you seeing a black screen or experiencing lag?" },
            { q: ['win11', 'windows 11', 'tpm', 'secure boot'], a: "For Windows 11 installation or compatibility blocks:\n\n1) Run the official PC Health Check tool to identify specific compatibility blockers\n2) If blocked by TPM 2.0: Enter BIOS settings (F2/F12/Del key on boot), locate Security, and enable Intel PTT or AMD fTPM\n3) If blocked by Secure Boot: In BIOS settings under Boot tab, enable Secure Boot and set system mode to UEFI (not Legacy/CSM)\n4) Save settings and reboot to run Windows 11 installation helper again\n\nWhich blocker did the PC Health Check tool list?" }
        ],
        ios: [
            { q: ['won\'t turn on', 'not turning on', 'dead', 'black screen', 'restart', 'unable to restart', 'not restarting', 'frozen', 'stuck', 'unable to start', 'wont start', 'won\'t start', 'not starting', 'apple logo', 'keeps restarting', 'boot loop'], a: 'Here are the steps to fix your iPhone:\n\n1) Force Restart: Quickly press Volume Up, then Volume Down, then hold the Side button until the Apple logo appears\n2) If it shows the Apple logo and goes black, charge it for at least 30 minutes using the original cable\n3) Try connecting to a computer and open iTunes/Finder to check for updates\n4) If still stuck, put it in Recovery Mode: connect to computer, press Volume Up then Down, then hold Side button until recovery screen appears\n5) From recovery mode, try "Update" first (this keeps your data), only use "Restore" as last resort\n\nWhich step would you like more help with?' },
            { q: ['slow', 'lag', 'performance', 'freeze', 'freezing'], a: 'To speed up your iPhone:\n\n1) Restart the device\n2) Go to Settings > General > iPhone Storage and delete unused apps\n3) Clear Safari cache\n4) Turn off Background App Refresh\n5) Check for iOS updates\n\nWant more details?' },
            { q: ['update', 'ios update', 'upgrade', 'software update'], a: 'For iOS/iPhone update issues:\n\n1) Go to Settings > General > Software Update\n2) Make sure you have at least 50% battery\n3) Need at least 2GB free space\n4) If stuck, delete the update file and retry\n5) Try updating via iTunes/Finder on a computer' },
            { q: ['battery', 'charging', 'drain', 'overheating'], a: 'For iPhone battery issues:\n\n1) Check Settings > Battery for power drain sources\n2) Enable Low Power Mode\n3) Turn off unnecessary Location Services\n4) Check Battery Health  -  below 80% means replacement needed\n5) Update to latest iOS' },
            { q: ['passcode', 'icloud lock', 'apple id', 'disabled', 'lockout'], a: "If you forgot your Apple ID passcode or your device is disabled:\n\n1) Go to iforgot.apple.com to reset your Apple ID password\n2) If your iPhone is disabled, you must erase the device using recovery mode connected to a computer\n3) Connect to a computer, open Finder/iTunes, hold the power and volume down buttons (or Home button) until the recovery screen appears\n4) Choose 'Restore' to reset the device to factory settings\n5) You can restore your data from an iCloud or computer backup during setup\n\nWould you like me to walk you through recovery mode?" },
            { q: ['mac', 'boot', 'apple logo', 'spinning wheel', 'macbook'], a: "For Mac startup or freezing issues:\n\n1) Shut down the Mac by holding the power button for 10 seconds\n2) Press power and immediately hold Option+Command+P+R for 20 seconds to reset NVRAM\n3) For Apple Silicon Macs, hold the power button down during startup to access Startup Options\n4) Run Disk Utility in Recovery Mode to scan for disk errors\n\nAre you seeing a folder with a question mark or a progress bar?" },
            { q: ['ipad', 'won\'t charge', 'no power'], a: "For iPad charging or power issues:\n\n1) Inspect the lightning or USB-C port for any lint or dirt using a wooden toothpick\n2) Ensure you are using a high-wattage wall adapter (12W or higher) - computer USB ports are often too weak\n3) Perform a hard restart: hold power and Home button (or volume keys on iPad Pro) for 15 seconds\n4) Try a different charging cable and adapter\n\nHow long has the iPad been plugged in?" },
            { q: ['airpods', 'pairing', 'no sound', 'connection'], a: "For AirPods connection or charging issues:\n\n1) Put both AirPods in the case, close the lid, wait 15 seconds, then open the lid\n2) Hold the setup button on the back of the case for 10 seconds until the status light flashes white\n3) Bring AirPods close to your iPhone and follow the on-screen pairing instructions\n4) If one side has no sound, clean the microphone and speaker meshes gently with a dry cotton swab\n\nIs only one AirPod failing to work?" },
            { q: ['safari', 'crashing', 'not loading', 'cache'], a: "For Safari issues on iOS or Mac:\n\n1) Go to Settings > Safari and tap 'Clear History and Website Data'\n2) Restart the device to clear temporary RAM blocks\n3) Check that JavaScript is enabled under Safari > Advanced\n4) Ensure your iOS is fully updated as Safari is built into system updates\n\nIs this happening on specific websites or all of them?" },
            { q: ['time machine', 'backup loop', 'migration assistant'], a: "For macOS Time Machine backup or restore loops:\n\n1) Disconnect and reconnect your external hard drive and inspect disk health under Disk Utility\n2) Erase and re-format the drive using APFS (or HFS+ for older macOS versions)\n3) If Migration Assistant is stuck, force close it, restart both Macs, and connect them directly via a Thunderbolt/Ethernet cable rather than Wi-Fi\n4) Exclude large system caches or game downloads from your backup settings to speed up processing\n\nIs your external drive SSD or HDD?" },
            { q: ['watch', 'fitness', 'workout', 'sync'], a: "For Apple Watch fitness, activity, or sync failures:\n\n1) Go to Settings > Privacy > Motion & Fitness on your iPhone and ensure 'Fitness Tracking' is turned ON\n2) Open the Watch App on iPhone, select General > Reset > and tap 'Reset Fitness Calibration Data'\n3) Unpair and re-pair the Apple Watch using the Watch app to rebuild cached Bluetooth profiles\n4) Toggle Bluetooth off and on for both devices and restart both watch and phone\n\nAre you missing specific heart rate logs or workout routes?" }
        ],
        xbox: [
            { q: ['controller', 'connect', 'pair', 'bluetooth', 'drift'], a: 'To fix Xbox controller pairing:\n\n1) Hold the Xbox button on the controller\n2) Press the pair button on both console and controller\n3) If using Bluetooth, forget and re-pair\n4) Try a USB cable connection\n5) Update controller firmware via Xbox Accessories app' },
            { q: ['won\'t turn on', 'not starting', 'power'], a: 'For Xbox power issues:\n\n1) Unplug power cord, wait 30 seconds, plug back in\n2) Try a different outlet\n3) Hold power button for 10 seconds to reset\n4) Check power supply light\n5) Try offline system update via USB' },
            { q: ['game pass', 'subscription', 'gamepass'], a: 'For Game Pass issues:\n\n1) Check subscription at account.microsoft.com\n2) Ensure Xbox is set as Home Xbox\n3) Sign out and back in\n4) Clear local saved games cache' },
            { q: ['live connection', 'multiplayer', 'lag', 'nat type', 'nat'], a: "For Xbox multiplayer or network lag:\n\n1) Check Xbox status online to ensure services are fully operational\n2) Go to Settings > General > Network Settings and run a network test\n3) If NAT type is Strict, enable UPnP on your home router or set a static IP for the Xbox\n4) Connect using a wired ethernet cable instead of Wi-Fi for stable gaming\n\nWhat is your current NAT type?" },
            { q: ['crashing', 'game crash', 'freezing'], a: "If your Xbox games keep crashing:\n\n1) Press the Xbox button, select the game, press Menu (three lines), and choose 'Quit'\n2) Force-restart the console: hold the power button for 10 seconds until it shuts down completely\n3) Check for available game and console updates\n4) Uninstall and reinstall the crashing game\n\nDoes this happen with a specific game or all games?" },
            { q: ['storage', 'full disk', 'install error'], a: "For Xbox storage issues:\n\n1) Go to Settings > System > Storage to view free space\n2) Uninstall games you no longer play, or move them to an external storage drive\n3) Clear local saved game data (this will resync from cloud on next startup)\n4) For Xbox Series X/S, ensure optimized games are installed on internal SSD or expansion card\n\nWould you like help choosing a compatible storage expansion?" },
            { q: ['disc', 'not reading', 'disk error'], a: "If your Xbox console isn't reading discs:\n\n1) Clean the disc with a soft, clean, slightly damp microfiber cloth, wiping from center to edge\n2) Inspect the disc for deep scratches or cracks\n3) Lay the console flat horizontally rather than standing vertically\n4) Try inserting a different disc to verify if it's a drive hardware failure\n\nDoes the drive make a grinding sound when inserting the disc?" },
            { q: ['cloud gaming', 'xcloud', 'input lag'], a: "For Xbox Cloud Gaming (xCloud) connection or input lag:\n\n1) Connect your device to a 5GHz Wi-Fi band or use a high-speed wired Ethernet cable (minimum 20Mbps required)\n2) Ensure your Xbox controller is connected via a direct USB cable to eliminate Bluetooth input lag\n3) Disable any active VPNs or background downloads on your device\n4) Clear your browser cache and cookies, or try playing on the official Xbox App rather than a browser\n\nWhat device are you using to stream games?" },
            { q: ['parent', 'child', 'family safety', 'screen time'], a: "For Xbox parental controls and child screen time limits:\n\n1) Download the official Microsoft Family Safety app on your mobile device\n2) Log in with your parent account and link your child's Microsoft Xbox account\n3) Go to Screen Time settings to set daily usage hours and screen limits for the console\n4) Under Content Restrictions, choose age ratings for games and web filtering configurations\n\nDo you need to set boundaries for purchase approvals or screen limits?" }
        ],
        android: [
            { q: ['won\'t turn on', 'boot loop', 'stuck', 'not booting', 'black screen'], a: "If your Android phone won't start or is stuck in a boot loop:\n\n1) Force restart: Hold the Power and Volume Down buttons simultaneously for 10-15 seconds\n2) Plug the device into an official wall charger and let it charge for at least 20 minutes before retrying\n3) Boot into Safe Mode: Hold power button until logo appears, then hold Volume Down until boot finishes\n4) Clear cache partition: Hold Power and Volume Up during boot to enter Recovery Mode, then select 'Wipe Cache Partition'\n\nWhat brand is your device (Samsung, Pixel, etc.)?" },
            { q: ['crashing', 'play store', 'apps', 'error'], a: "For Android apps crashing or Google Play Store errors:\n\n1) Go to Settings > Apps > Google Play Store\n2) Tap 'Storage' and choose 'Clear Cache' and 'Clear Data'\n3) Restart the phone and check for app updates in the Play Store\n4) Make sure your system storage is not completely full\n\nAre you getting a specific error code like DF-DFERH-01?" },
            { q: ['battery drain', 'slow charging', 'charging'], a: "For Android battery or charging issues:\n\n1) Inspect the charging port for any pocket lint or dust\n2) Turn on 'Battery Saver' or 'Limit background apps' in Settings > Battery\n3) Ensure you are using the original cable and a fast-charging power block\n4) Check 'Battery Health' using diagnostic tools; replace battery if capacity is below 80%\n\nHow long does it take to charge from 0% to 50%?" },
            { q: ['pattern lock', 'pin', 'bypass', 'frp'], a: "If you are locked out of your Android phone:\n\n1) Try using Google's 'Find My Device' website to lock/unlock or factory reset the device remotely\n2) For Samsung devices, use 'SmartThings Find' to bypass lock screen if enabled\n3) If all else fails, perform a factory reset: hold Power + Volume Up to enter recovery mode, and select 'Wipe data/factory reset'\n4) Note: You will need to log back into the original Google account (FRP lock) after the reset\n\nDo you know your Google account login details?" },
            { q: ['wifi', 'bluetooth', 'connection', 'network'], a: "For Wi-Fi or Bluetooth pairing issues on Android:\n\n1) Toggle Airplane Mode on for 10 seconds, then off\n2) Go to Settings > General Management > Reset > 'Reset Network Settings'\n3) Delete the paired Bluetooth device or forgotten Wi-Fi network and attempt connection from scratch\n4) Restart your home router or modem\n\nIs the Bluetooth device pairing with other phones successfully?" },
            { q: ['samsung', 'black screen', 'frozen'], a: "For Samsung Galaxy devices experiencing freezing or a black screen:\n\n1) Hold the Power and Volume Down keys for exactly 7-10 seconds to simulate a battery pull\n2) Connect to a charger and wait for the charging circle to appear\n3) Boot into Safe Mode to see if a third-party app is causing the system freeze\n4) Use Samsung Smart Switch on a PC to run an emergency software recovery\n\nDoes the phone vibrate or make sounds when you receive a call?" },
            { q: ['low storage', 'cache', 'clean'], a: "To free up space on your Android device:\n\n1) Go to Settings > Device Care > Storage and tap 'Clean Now'\n2) Delete large downloaded videos and voice notes from messaging apps (e.g. WhatsApp)\n3) Move photos and media to Google Photos backup and select 'Free up space'\n4) Clear individual app caches for high-usage apps like Chrome and YouTube\n\nHow much free storage space do you currently have?" },
            { q: ['touch screen', 'unresponsive'], a: "If your Android touch screen is laggy or unresponsive:\n\n1) Clean the screen with a clean microfiber cloth; water or sweat droplets can cause ghost touches\n2) Remove any thick plastic screen protectors or cases that block sensors\n3) Force restart using the Power + Volume Down combination\n4) Enable 'Touch Sensitivity' in Settings > Display if you are using a tempered glass protector\n\nIs the screen cracked or physically damaged?" },
            { q: ['cast', 'screen share tv', 'miracast'], a: "For casting or screen-sharing your Android screen to a Smart TV:\n\n1) Ensure both your phone and Smart TV are connected to the exact same Wi-Fi network name\n2) Swipe down from the top of your screen to open Quick Settings, and tap 'Smart View', 'Cast', or 'Screen Sharing'\n3) Select your TV name from the detected device list\n4) For Google TV/Chromecast, download the Google Home app, select your TV, and tap 'Cast my screen'\n\nWhat brand is your Smart TV?" },
            { q: ['android auto', 'car connection', 'usb port'], a: "For Android Auto connection drops or lag in vehicles:\n\n1) Use a high-quality, short (3ft or less) USB 3.0 certified data cable - cheap charging cables cause instant drops\n2) Clean out the USB ports on both the vehicle dashboard and phone with a toothpick\n3) Go to Settings > Apps > Android Auto, choose Storage, and tap 'Clear Cache' and 'Clear Data'\n4) Turn off battery optimization for the Android Auto app\n\nIs this wired or wireless Android Auto?" }
        ],
        account: [
            { q: ['login', 'password', 'forgot', 'locked', 'access', 'account', 'sign in'], a: "I understand you're having trouble with your account. Here's what you can try:\n\n1) Use the 'Forgot Password' option on the login page\n2) Check your registered email for reset instructions\n3) If you don't have access to your email/phone, look for an identity verification option\n4) Clear your browser cookies and try again\n5) Try from a different browser or device\n\nCould you tell me which platform or service this is for so I can provide more specific steps?" },
            { q: ['mobile', 'phone', 'number', 'verification', '2fa'], a: "If you don't have access to your registered phone number:\n\n1) Check if there's an alternative verification method (email, authenticator app)\n2) Look for an 'I can't access my verification device' option\n3) You may need to submit an identity verification request\n4) Contact the platform's support team with proof of identity\n5) If you have a backup recovery code, use that\n\nWould you like me to connect you with a specialist for more personalized help?" },
            { q: ['facebook', 'instagram', 'hacked', 'unauthorized'], a: "If your Facebook or Instagram account was hacked:\n\n1) Go immediately to facebook.com/hacked or instagram.com/hacked to start the secure recovery process\n2) If your password was changed, check your email for a message from Meta with a special security link to undo the change\n3) Review your linked phone number, primary email, and trusted contacts to ensure they haven't been altered\n4) Enable Two-Factor Authentication (2FA) once you regain access to prevent future breaches\n\nDo you still have access to the primary registration email?" },
            { q: ['gmail', 'yahoo', 'google recovery'], a: "For Google/Gmail recovery issues:\n\n1) Go to the Google Account Recovery page (g.co/recover)\n2) Input the last password you remember using\n3) Answer security questions, and provide the date you created the account if prompted\n4) Try recovering from a device and location (IP address) you have commonly signed in from before\n5) Enter your recovery email or phone number to receive a temporary verification code\n\nAre you getting an 'Unable to verify this account belongs to you' message?" },
            { q: ['amazon', 'paypal', 'verification lock'], a: "If your Amazon or PayPal account is locked or restricted:\n\n1) Check your email inbox (and spam) for a security notice detailing the reason for restriction\n2) Clear your browser cookies and log in from your main home device\n3) Be prepared to upload a photo of a utility bill or government-issued ID matching the billing address on record\n4) Avoid using VPNs when attempting to log into financial accounts as they trigger automatic fraud locks\n\nDid this lock happen after a recent transaction or location change?" },
            { q: ['2fa recovery', 'authenticator code', 'lost phone'], a: "If you lost your 2FA Google Authenticator device:\n\n1) Look for the 'Backup Codes' or 'Recovery Codes' that were generated when you first set up 2FA\n2) Choose 'Try another way to sign in' on the verification prompt\n3) If backup codes are lost, you must submit a manual identity verification request to the platform's support team\n4) This process usually requires holding your photo ID and a handwritten note with the current date\n\nDo you have recovery codes saved elsewhere?" },
            { q: ['phishing', 'spam email', 'malware scan'], a: "If you clicked a suspicious phishing link or downloaded an untrusted attachment:\n\n1) Immediately change the passwords for your primary email and any affected bank or social accounts\n2) Disconnect your device from the internet (turn off Wi-Fi) to stop active data transmission\n3) Run a full malware scan using Windows Defender or Malwarebytes\n4) Turn on 2FA on all major accounts to block external logins\n\nDid you enter any passwords or credit card details on the suspicious website?" },
            { q: ['delete account', 'permanently remove'], a: "To permanently delete your online account:\n\n1) Go to your Account Settings and navigate to 'Privacy', 'Security', or 'Account Management'\n2) Look for a 'Deactivate or Delete Account' option\n3) Meta, Google, and Amazon typically offer a 14 to 30-day grace period where logging back in cancels the deletion request\n4) Ensure you download all personal invoices, transaction history, and photos before confirming as deletion is irreversible\n\nWhich service are you attempting to close?" },
            { q: ['spotify', 'netflix', 'profile transfer'], a: "For Spotify or Netflix profile transfer and recovery:\n\n1) For Netflix profile transfers: Go to Account Settings > click 'Transfer Profile' in the dropdown and input a new email address\n2) For Spotify family/duo plan invites: Ensure all users have the exact same billing address street name input in their profile settings\n3) If locked out, search your email for active password reset pins or billing receipt ID references to prove ownership\n4) Exclude third-party social integrations (like Facebook Login) and link a native password instead\n\nWhich service profile is failing?" },
            { q: ['google drive', 'storage full', 'trash bin'], a: "If Google Drive reports storage full but you deleted files:\n\n1) Go to Google Drive Trash (drive.google.com/drive/trash) and click 'Empty Trash' - files stay in trash counting toward space\n2) Go to Google Photos Trash and Gmail Bin and empty them both as they share the same storage space\n3) Check Drive Backups (Settings > Manage Backups) and delete obsolete mobile phone device backups\n4) Search by size (`has:attachment larger:10M`) in Gmail to delete heavy emails\n\nDo you have Google One subscription active?" }
        ],
        plumbing: [
            { q: ['leak', 'drip', 'leaking'], a: "For a leak issue, here's what to do right away:\n\n1) Turn off the water supply valve nearest to the leak\n2) If you can't find the local valve, turn off the main water supply\n3) Place towels or a bucket to contain the water\n4) Check if the leak is coming from a pipe joint, valve, or fixture\n5) For minor drips, you may be able to tighten the fitting or replace a washer\n\nIs the leak active right now, or is it a slow drip?" },
            { q: ['clog', 'block', 'backed up', 'slow drain', 'overflow'], a: "For a clog or drainage issue:\n\n1) Try a plunger first \u2013 use firm, consistent pressure\n2) For sinks, remove the stopper and clean out any debris\n3) Try a mixture of baking soda and vinegar, followed by hot water after 15 minutes\n4) For stubborn clogs, a drain snake can help\n5) Avoid chemical drain cleaners as they can damage pipes\n\nWhich fixture is having the issue?" },
            { q: ['toilet', 'running', 'flush'], a: "For toilet issues:\n\n1) If it won't flush: check the water supply valve is open and the tank has water\n2) If it's running constantly: lift the tank lid and check the flapper \u2013 it may need replacing\n3) If it's clogged: use a flange plunger (not a cup plunger) for best results\n4) If it's leaking at the base: the wax ring seal may need replacing\n\nWhat specific toilet issue are you dealing with?" },
            { q: ['water heater', 'no hot water', 'hot water'], a: "For water heater problems:\n\n1) Check that the pilot light is lit (gas) or the breaker hasn't tripped (electric)\n2) Check the thermostat setting \u2013 it should be around 120\u00B0F\n3) If you hear rumbling, sediment buildup may need flushing\n4) If you see rust-colored water, the anode rod may need replacing\n5) If the unit is over 10 years old, replacement may be more cost-effective\n\nWould you like more specific guidance?" },
            { q: ['faucet', 'sink', 'pipe'], a: "For faucet and pipe issues:\n\n1) For a dripping faucet: the cartridge or washer likely needs replacing\n2) For low water pressure: check the aerator for mineral buildup and clean it\n3) For a burst pipe: shut off the main water supply immediately\n4) For frozen pipes: use a hair dryer to thaw slowly \u2013 never use an open flame\n\nWhat's the specific issue you're seeing?" },
            { q: ['low water pressure', 'water pressure'], a: "For sudden low water pressure:\n\n1) Check if the pressure is low at all faucets or just one (cleaning individual aerators resolves single faucet drops)\n2) Ensure your main water shutoff valve is fully open\n3) Verify with neighbors if there is a municipal water main repair nearby\n4) If hot water pressure is low but cold is normal, the issue lies in your water heater's intake valves\n\nIs this affecting the entire house?" },
            { q: ['burst pipe', 'flooding', 'main shutoff'], a: "⚠️ Urgent: If a pipe has burst and water is actively flooding your home:\n\n1) **Shut Off Main Water**: Locate your main shutoff valve (usually in the basement, garage, or utility closet) and turn it clockwise fully\n2) Turn off electrical breakers in any rooms with standing water or leaking ceilings to prevent shock hazards\n3) Open all your lowest hot and cold faucets to drain the remaining water out of the house pipelines\n4) Document any damage with photos for your insurance carrier\n\nDo you know where your main shutoff valve is?" },
            { q: ['garbage disposal', 'jammed', 'humming'], a: "If your garbage disposal is humming but not spinning:\n\n1) **Turn off power**: Switch off the disposal unit and unplug it under the sink\n2) Insert a 1/4-inch hex wrench (Allen wrench) into the center hole in the bottom of the disposal unit\n3) Rotate the wrench back and forth to manually free the motor shaft\n4) Restore power and press the red reset button on the bottom of the unit\n\nDoes the unit make a humming sound when switched on?" },
            { q: ['sewage backup', 'drain backup', 'smell'], a: "For sewage backups or foul drain smells:\n\n1) Immediately stop using all sinks, toilets, and showers in the house to avoid worsening the backup\n2) Foul odors are often caused by dried-out P-traps; run warm water down unused drains for 30 seconds to restore the water barrier\n3) For actual backups, check your main cleanout pipe in your yard or basement to see if there is a main sewer line blockage\n4) Use baking soda, vinegar, and hot water flushing for grease buildup odors\n\nIs sewage backing up into your lowest bathtub or shower?" },
            { q: ['sump pump', 'basement flood'], a: "For sump pump failures or basement standing water:\n\n1) Unplug the pump and inspect the float switch to ensure it moves freely and isn't jammed against the pit wall\n2) Pour a bucket of water into the sump pit to see if the rising water naturally triggers the pump motor\n3) Listen for a humming motor sound; if it hums but does not pump water, check the check valve flow direction\n4) Clear any dirt or gravel blocks from the bottom screen intake filter\n\nIs the sump pump motor running actively right now?" },
            { q: ['softener', 'salt bridge'], a: "For water softener salt bridge blocks:\n\n1) Open the brine tank lid and check if a hard crust of salt (salt bridge) has formed, leaving empty space underneath\n2) Use a broom handle to gently press and break up the hard salt crust (avoid hitting the tank walls)\n3) Scoop out any loose crust debris and restart manual regeneration settings on your softener head\n4) Use high-purity salt pellets instead of fine block salt to prevent future bridging\n\nHow high is the salt level in the tank?" }
        ],
        legal: [
            { q: ['fired', 'wrongful', 'termination', 'terminated'], a: "For a potential wrongful termination case:\n\n1) Document everything \u2013 save emails, texts, performance reviews, and any written communications\n2) Write down the timeline of events while it's fresh in your memory\n3) Check if you have an employment contract or employee handbook\n4) File a complaint with the EEOC if you believe discrimination was involved (you have 180 days)\n5) Consult with an employment attorney \u2013 many offer free initial consultations\n\nWould you like me to connect you with an employment law specialist?" },
            { q: ['divorce', 'custody', 'child support', 'separation'], a: "For family law matters:\n\n1) Gather important financial documents (tax returns, bank statements, property records)\n\n2) Make copies of shared account information\n3) If children are involved, document your parenting involvement\n4) Consider mediation as a first step \u2013 it's often faster and less expensive\n5) Consult with a family law attorney to understand your rights\n\nWould you like guidance on a specific aspect?" },
            { q: ['contract', 'breach', 'agreement'], a: "For contract disputes:\n\n1) Review the contract carefully, paying attention to breach clauses and remedies\n2) Document how the other party breached the agreement\n3) Check for any dispute resolution clauses (mediation, arbitration)\n4) Send a formal written notice of breach via certified mail\n5) Consult with a contract attorney to evaluate your options\n\nDo you have a copy of the contract available?" },
            { q: ['landlord', 'tenant', 'eviction', 'lease', 'rent'], a: "For landlord/tenant issues:\n\n1) Review your lease agreement for relevant terms\n2) Document all communications with your landlord/tenant in writing\n3) Familiarize yourself with your state's tenant/landlord rights\n4) For habitability issues, report to your local housing authority\n5) For eviction notices, you typically have a right to respond within a specific timeframe\n\nWhat specific situation are you dealing with?" },
            { q: ['sue', 'lawsuit', 'court', 'lawyer', 'attorney'], a: "For general legal guidance:\n\n1) Gather and organize all relevant documents and evidence\n2) Write a clear timeline of events\n3) Research the statute of limitations for your type of case\n4) Many attorneys offer free initial consultations \u2013 take advantage of these\n5) Consider whether small claims court might be appropriate for smaller disputes\n\nWould you like me to connect you with a licensed attorney for your specific situation?" },
            { q: ['personal injury', 'car accident', 'slip and fall', 'injury compensation'], a: "For personal injury claims:\n\n1) Seek medical treatment immediately for any injuries; medical records are key evidence\n2) Document the accident scene with photos, and collect contact details of any witnesses\n3) Obtain a copy of the police report or incident report\n4) Avoid speaking to insurance adjusters or signing any settlement offers until you speak with an attorney\n5) The statute of limitations varies by state - act quickly to protect your rights\n\nWere you injured in a car crash or a slip and fall?" },
            { q: ['immigration', 'visa', 'green card', 'citizenship'], a: "For immigration inquiries:\n\n1) Note that immigration filings require extreme precision; any errors can cause years of delay\n2) Organize all personal documents, including passports, birth certificates, and current status documents\n3) If applying for adjustment of status, check the current visa bulletin for priority dates\n4) Gather evidence of your qualifications, employment, or family relationships supporting the petition\n\nWhat visa or status are you currently holding or applying for?" },
            { q: ['bankruptcy', 'debt', 'chapter 7', 'chapter 13'], a: "For bankruptcy or debt liquidation guidance:\n\n1) Review your total outstanding debts, including credit cards, medical bills, and mortgages\n2) Chapter 7 bankruptcy liquidates non-exempt assets to wipe out unsecured debt, while Chapter 13 restructures debt into a 3-5 year repayment plan\n3) Gather tax returns from the past 2-4 years, bank statements, and pay stubs\n4) Note that filing immediately triggers an 'automatic stay' which stops collector harassment and foreclosure actions\n\nAre you looking to stop a foreclosure or wipe out credit card debt?" },
            { q: ['discrimination', 'harassment', 'workplace discrimination'], a: "For workplace discrimination or harassment claims:\n\n1) Report the behavior to your company's HR department in writing, referencing employee handbook policies\n2) Maintain a private, detailed log of all incidents, including dates, times, statements, and witness names\n3) Save copies of relevant emails or performance reviews to a personal device (not your work computer)\n4) Keep in mind that filing a formal complaint protects you under retaliation laws\n\nIs this discrimination based on gender, race, age, disability, or another protected class?" },
            { q: ['wills', 'trusts', 'estate planning', 'power of attorney'], a: "For estate planning and will preparation:\n\n1) Create a detailed list of your assets (real estate, accounts, heirlooms) and your intended beneficiaries\n2) Assign a trusted Executor to manage the distribution of your estate\n3) Set up a medical and financial Power of Attorney (POA) to specify who can make decisions if you become incapacitated\n4) Consider a Revocable Living Trust if you wish to help your family bypass the costly probate court process\n\nDo you already have a draft will, or are you starting from scratch?" },
            { q: ['patent', 'trademark', 'intellectual property'], a: "For intellectual property, patent, or trademark registration:\n\n1) Conduct a comprehensive search on the USPTO TESS database to verify if similar trademarks already exist\n2) For inventions: Document your design schematics and draft a Provisional Patent Application to secure a 'Patent Pending' priority date\n3) Avoid public disclosures or sales of your invention prior to filing, as this can invalidate patent rights\n4) Prepare clear, non-overlapping claims defining the boundary of your IP\n\nAre you seeking to register a product design, brand name, or logo?" },
            { q: ['dui', 'dwi', 'breathalyzer'], a: "For DUI/DWI offense assistance:\n\n1) Document the timeline of your traffic stop, including what statements were made and whether you were read your rights\n2) Note that you typically have an extremely short deadline (often 10 days) to request an administrative DMV hearing to prevent automatic license suspension\n3) Gather any citation tickets, chemical breathalyzer test results, or blood test receipts\n4) Do not discuss the incident on social media or with insurance adjusters before consulting counsel\n\nWas this a first-time traffic offense?" }
        ],
        medical: [
            { q: ['chest', 'breathing', 'breath'], a: "⚠️ Important: If you are experiencing severe chest pain, difficulty breathing, or believe you may be having a heart attack, please call 911 or your local emergency number immediately.\n\nFor non-emergency chest/breathing concerns:\n\n1) Note when the symptoms started and what triggers them\n2) Track whether they worsen with activity or at rest\n3) Monitor for additional symptoms (dizziness, sweating, arm pain)\n4) Avoid strenuous activity until evaluated\n5) Schedule an appointment with your doctor as soon as possible\n\nWould you like me to connect you with a medical professional?" },
            { q: ['pain', 'hurt', 'ache', 'sore'], a: "For pain management while seeking proper care:\n\n1) Note the location, intensity (1-10), and type of pain (sharp, dull, throbbing)\n2) Track what makes it better or worse\n3) Over-the-counter options: acetaminophen for general pain, ibuprofen for inflammation\n4) Apply ice for acute injuries (first 48 hours) or heat for chronic/muscle pain\n5) Rest the affected area but avoid complete immobility\n\nHave you seen a doctor about this pain before?" },
            { q: ['fever', 'temperature', 'chills'], a: "For fever management:\n\n1) Stay hydrated \u2013 drink plenty of water, clear broths, or electrolyte solutions\n2) Rest as much as possible\n3) Over-the-counter fever reducers (acetaminophen or ibuprofen) can help\n4) Use light clothing and blankets\n5) Seek emergency care if fever exceeds 103\u00B0F, or is accompanied by severe headache, rash, or confusion\n\nHow high has your temperature been?" },
            { q: ['rash', 'itch', 'skin', 'bump', 'hives'], a: "For skin concerns:\n\n1) Avoid scratching \u2013 it can worsen the condition and cause infection\n2) Apply a cool compress to soothe irritation\n3) Over-the-counter hydrocortisone cream or antihistamines may help with itching\n4) Note if you've been exposed to new products, foods, or environments\n5) Take photos to track changes over time\n\nHas the rash spread or changed since you first noticed it?" },
            { q: ['stomach', 'nausea', 'vomit', 'diarrhea', 'digestive'], a: "For digestive issues:\n\n1) Stay hydrated with small sips of water or clear fluids\n2) Follow the BRAT diet: bananas, rice, applesauce, toast\n3) Avoid dairy, caffeine, alcohol, and fatty foods\n4) Over-the-counter remedies like Pepto-Bismol or Imodium may help\n5) Seek medical attention if symptoms persist beyond 48 hours or include blood\n\nWhen did these symptoms start?" },
            { q: ['headache', 'migraine', 'blurry vision'], a: "For headaches or migraines:\n\n1) Rest in a dark, quiet room with a cool compress on your forehead or neck\n2) Hydrate immediately with water or electrolyte drinks\n3) OTC pain relievers (ibuprofen, aspirin, or acetaminophen) can help, particularly when taken at onset\n4) Keep a headache diary tracking triggers (stress, foods, sleep patterns)\n5) ⚠️ Seek immediate emergency care if the headache is sudden, severe ('thunderclap'), or accompanied by stiff neck, fever, or confusion\n\nIs this a pulsing, one-sided pain typical of a migraine?" },
            { q: ['covid', 'flu', 'sore throat', 'cough'], a: "For flu-like or respiratory symptoms:\n\n1) Rest and isolate to protect others from potential viral transmission\n2) Drink hot herbal teas, clear soups, and maintain fluid intake to ease throat irritation\n3) Use throat lozenges or salt water gargles to relieve throat soreness\n4) Monitor your oxygen levels with a pulse oximeter if available\n5) Take an at-home COVID test to verify the viral strain\n\nHow long have you had the cough and throat soreness?" },
            { q: ['nausea', 'food poisoning', 'poisoning'], a: "For suspected food poisoning:\n\n1) Avoid eating solid food for a few hours to allow your stomach to settle\n2) Take small, frequent sips of water, diluted sports drinks, or oral rehydration salts\n3) Avoid dairy, caffeine, and greasy foods for 24-48 hours\n4) Do not take anti-diarrhea medications right away as they can prevent the toxin from leaving your system\n\nHave you had a fever or noticed any blood in your vomit or stool?" },
            { q: ['medication', 'side effect', 'prescription'], a: "For prescription or medication side effect concerns:\n\n1) Review the packaging leaflet for listed common side effects\n2) Do not abruptly stop taking your medication unless advised by a doctor, particularly for blood pressure, thyroid, or psychiatric prescriptions\n3) Document the specific timing of the side effect relative to when you take the dose\n4) If you experience any signs of an allergic reaction (hives, swelling of lips/face, difficulty swallowing), seek immediate emergency care\n\nWhat is the name of the medication you are asking about?" },
            { q: ['anxiety', 'depression', 'mental health'], a: "For mental health support, anxiety, or depression symptoms:\n\n1) Note that your feelings are highly valid and guidance is available. If in crisis, call or text 988 for immediate help\n\n2) Keep a daily log of mood patterns, tracking physical signs like racing heartbeat, exhaustion, or loss of appetite\n3) Focus on simple grounding techniques: deep box breathing (inhale 4s, hold 4s, exhale 4s, hold 4s)\n4) Limit caffeine and screen time before sleeping\n\nWould you like me to connect you with a mental health counseling specialist?" },
            { q: ['insomnia', 'sleep disorder'], a: "For severe insomnia or sleeping disorders:\n\n1) Establish strict sleep hygiene: keep the bedroom quiet, completely dark, and at a cool 65-68°F temperature\n2) Wake up at the exact same time every morning (including weekends) to stabilize your circadian rhythm\n3) Avoid screens and heavy meals for at least 2 hours before your target sleep time\n4) If you lie awake for over 20 minutes, get out of bed, do a relaxing activity elsewhere, and return only when sleepy\n\nHow long has this sleep issue been occurring?" }
        ],
        automotive: [
            { q: ['engine', 'won\'t start', 'stall', 'overheat'], a: "For engine issues:\n\n1) If it won't start: check the battery connections, try jump-starting, and listen for clicking sounds\n2) If it's overheating: pull over safely, turn off A/C, turn on the heater to dissipate heat, and let it cool down\n3) If it's stalling: this could be fuel system, ignition, or sensor related\n4) Check your oil level \u2013 low oil can cause serious engine damage\n5) Don't ignore warning lights \u2013 they indicate problems that can worsen\n\nWhat specific engine symptom are you experiencing?" },
            { q: ['brake', 'stopping', 'squeak', 'grind', 'pedal'], a: "For brake concerns:\n\n1) Squealing usually means brake pads are worn and need replacing\n2) Grinding means pads are completely worn \u2013 drive minimally and get them replaced ASAP\n3) A soft or spongy pedal could indicate air in the brake lines or low brake fluid\n4) Pulling to one side may indicate a stuck caliper\n5) \u26A0\uFE0F Brake issues are safety-critical \u2013 don't delay getting them checked\n\nAre you safe to drive to a mechanic?" },
            { q: ['check engine', 'warning', 'light', 'dashboard'], a: "For warning lights:\n\n1) A steady check engine light usually means a non-emergency issue \u2013 schedule a diagnostic\n2) A flashing check engine light means a serious issue \u2013 reduce speed and get it checked immediately\n3) Common causes: loose gas cap, O2 sensor, catalytic converter, or spark plugs\n4) An auto parts store can often read the code for free\n5) Don't ignore it \u2013 small issues can become expensive repairs\n\nIs the light steady or flashing?" },
            { q: ['tire', 'flat', 'pressure', 'alignment'], a: "For tire issues:\n\n1) For a flat: use your spare tire or call roadside assistance\n2) For low pressure: inflate to the PSI listed on the driver's door jamb sticker\n3) If the car pulls to one side, you likely need an alignment\n4) Uneven tire wear indicates alignment or suspension issues\n5) Rotate tires every 5,000-7,000 miles for even wear\n\nWhat's the specific tire issue?" },
            { q: ['battery', 'dead battery', 'car battery'], a: "For battery issues:\n\n1) If the car won't start \u2013 try a jump start with cables or a portable jump starter\n2) Check for corroded terminals \u2013 clean with baking soda and water\n3) Most batteries last 3-5 years \u2013 consider replacing if older\n4) If the battery keeps dying, the alternator may not be charging it\n5) Auto parts stores can test your battery and alternator for free\n\nHow old is your current battery?" },
            { q: ['oil', 'oil change', 'transmission', 'fluid'], a: "For fluid/maintenance issues:\n\n1) Oil changes are typically needed every 5,000-7,500 miles (check your manual)\n2) Check oil level with the dipstick \u2013 it should be between the two marks\n3) Dark or gritty oil means it's overdue for a change\n4) Transmission fluid should be reddish \u2013 brown or burnt-smelling fluid needs attention\n5) Keep coolant at the proper level to prevent overheating\n\nWhen was your last oil change?" },
            { q: ['clicking engine', 'ticking noise', 'noise'], a: "For clicking or ticking engine noises:\n\n1) Check your engine oil level immediately; a low oil level causes lifters and valves to tap loudly\n2) Ticking can also be caused by an exhaust manifold leak (which often goes away once the engine warms up)\n3) If the noise is a deep knock rather than a light tick, it could indicate engine bearing failure (stop driving immediately)\n4) Check spark plugs to ensure they are seated tightly\n\nDoes the ticking speed up as you rev the engine?" },
            { q: ['overheating', 'coolant leak', 'steam'], a: "If your engine is overheating or steam is rising from the hood:\n\n1) **Safety First**: Pull over to a safe area, turn off the engine immediately, and do NOT open the radiator cap while the engine is hot\n2) Turn your car heater on high with the fan at maximum to draw heat away from the engine compartment\n3) Check the coolant recovery tank once cooled; look for any green or pink fluid pooling under the front bumper\n4) Never add cold water to a hot radiator as it can crack the engine block\n\nHow high did the temperature gauge rise?" },
            { q: ['transmission slipping', 'shifting', 'gears'], a: "For transmission slipping or rough shifting:\n\n1) Check your transmission fluid level using the dipstick while the engine is idling warm (if applicable)\n2) Fluid should be clean pink/red; if it is dark brown or smells burnt, it requires flushing or service\n3) Check that your vehicle is fully stopped before switching between Drive and Reverse\n4) Slipping can be triggered by low fluid or worn clutches/solenoids\n\nDoes the engine rev high when shifting gears?" },
            { q: ['ev', 'battery degradation', 'electric vehicle'], a: "For EV battery capacity loss or slow charging rates:\n\n1) Note that battery temperature spikes during extreme cold or heat trigger automatic safety limits lowering charging speed\n2) For daily use, limit DC Fast Charging to protect battery chemistry; slow Level 2 charging is preferred\n3) Charge the battery to a maximum target of 80% for daily commuting to extend battery cell life\n4) Review your dashboard State of Health (SOH) percentage metrics\n\nWhat brand is your EV (Tesla, Nissan, Hyundai, etc.)?" },
            { q: ['aftermarket', 'harness', 'backup camera'], a: "For aftermarket backup camera or stereo installation:\n\n1) Obtain a vehicle-specific wiring harness and dash trim kit to avoid splicing factory wiring assemblies\n2) Disconnect the vehicle's negative battery terminal before touching any stereo wire configurations\n3) Tap the backup camera's positive trigger wire into the vehicle's reverse light positive circuit\n4) Route the video RCA cable securely along the floor threshold trim panels, avoiding steering mechanics\n\nDo you have the correct wiring diagrams for your vehicle?" }
        ],
        veterinary: [
            { q: ['vomit', 'throwing up', 'sick', 'ill', 'unwell'], a: "For a pet that's vomiting:\n\n1) Remove food for 12-24 hours but keep water available\n2) Watch for signs of dehydration (dry gums, lethargy)\n3) Check for any foreign objects they might have eaten\n4) Note the frequency and content of vomiting\n5) If vomiting persists beyond 24 hours or contains blood, seek emergency vet care\n\nHow long has your pet been vomiting?" },
            { q: ['not eating', 'won\'t eat', 'appetite', 'food'], a: "For a pet that's not eating:\n\n1) Try warming their food slightly to release aromas\n2) Check for dental issues — look for red gums or broken teeth\n3) Try a different protein or flavor\n4) Monitor water intake\n5) If they haven't eaten for 24+ hours, contact your vet\n\nHas your pet been drinking water normally?" },
            { q: ['limp', 'leg', 'walk', 'paw', 'injury'], a: "For a limping pet:\n\n1) Examine the paw for cuts, thorns, or swelling\n2) Check between the toes for foreign objects\n3) Gently feel along the leg for heat or swelling\n4) Restrict activity and keep them rested\n5) If the limping is severe or they won't bear weight, see a vet promptly\n\nDid your pet have any recent trauma or fall?" },
            { q: ['itch', 'scratch', 'skin', 'fur', 'hair loss', 'flea'], a: "For skin/itching issues:\n\n1) Check for fleas — look for small black dots in the fur\n2) Look for redness, hot spots, or hair loss patterns\n3) Consider recent diet or environment changes\n4) An oatmeal bath can soothe irritated skin\n5) Persistent itching may indicate allergies or infections\n\nIs the itching in a specific area or all over?" },
            { q: ['diarrhea', 'loose stool', 'poop'], a: "For pet diarrhea:\n\n1) Feed a bland diet (plain boiled chicken and rice)\n2) Ensure they stay hydrated\n3) Avoid treats and table scraps\n4) Monitor for blood in stool\n5) If it lasts more than 48 hours or your pet seems weak, see a vet\n\nWhen did the diarrhea start?" },
            { q: ['tired', 'letharg', 'energy', 'sleeping'], a: "For a lethargic pet:\n\n1) Check their gum color — pink is normal, pale or white is concerning\n2) Take their temperature if possible (normal: 101-102.5°F for dogs/cats)\n3) Note any other symptoms (vomiting, diarrhea, coughing)\n4) Ensure they're drinking water\n5) Sudden lethargy can indicate infection or pain — consult your vet\n\nHas anything changed in their environment recently?" },
            { q: ['chocolate', 'poison', 'grape', 'onion'], a: "⚠️ Urgent: If your pet ate a toxic substance (like chocolate, grapes, raisins, onions, or household chemicals):\n\n1) Identify **what** they ate, **how much** they ate, and their **weight**\n2) Dark chocolate and baking chocolate are highly toxic to dogs, even in tiny amounts\n3) Grapes and raisins can cause acute kidney failure in dogs\n4) Contact the Pet Poison Helpline immediately, or proceed to the nearest emergency veterinary clinic\n\nDo you know approximately how long ago they consumed it?" },
            { q: ['urinary', 'blood in urine', 'peeing'], a: "For urinary distress or blood in urine:\n\n1) Keep in mind that straining to urinate can indicate a life-threatening blockage, especially in male cats\n2) Monitor how often they are going to the litter box or requesting to go outside\n3) Look for small droplets of urine or pinkish/bloody stains where they sleep or pee\n4) Ensure they have access to fresh water; switching to wet food can help hydrate their bladder\n\nIs your pet actively vocalizing or straining without producing urine?" },
            { q: ['coughing', 'sneezing', 'breathing hard'], a: "For respiratory issues in pets:\n\n1) Look at their chest movements: breathing hard or with open mouth is a veterinary emergency\n2) Keep them in a calm, cool room; stress worsens respiratory distress\n3) A dry 'honking' cough in dogs can indicate kennel cough (highly contagious but rarely fatal)\n4) Avoid using any air fresheners, vaporizers, or incense nearby\n\nIs your pet's tongue or gums showing a pale, blue, or purple tint?" },
            { q: ['seizures', 'shaking', 'fit'], a: "If your pet is having a seizure or severe shaking fit:\n\n1) **Stay Calm**: Seizures look frightening, but most stop within 2-3 minutes\n2) Move any sharp objects or furniture away to prevent them from hurting themselves; do NOT place your hands near their mouth\n3) Record the exact start and end time of the seizure\n4) Turn off bright lights and quiet the room during post-seizure recovery\n\nDoes the pet lose consciousness or foam at the mouth?" },
            { q: ['arthritis', 'joint stiffness', 'glucosamine'], a: "For pet arthritis or joint stiffness:\n\n1) Look for mobility warning signs: struggle rising in the morning, hesitation before jumping, or slow pace on walks\n2) Exclude rigorous high-impact running; choose moderate, low-impact swimming or slow leashed walks\n3) Supplement their daily diet with high-quality Glucosamine, Chondroitin, and Omega-3 fatty acids\n4) Provide warm, orthopedic support memory-foam bedding to protect pressure joints\n\nHow old is your pet?" },
            { q: ['ear infection', 'head shaking', 'otitis'], a: "For pet ear infections or active head shaking:\n\n1) Inspect inside the ear flaps for signs of redness, dark brown discharge, or a strong yeast-like odor\n2) Avoid inserting cotton swabs (Q-tips) down the pet's ear canal - this can rupture the ear drum\n3) Clean loose dirt from the outer ear flap using a dry cotton ball dampened with vet-approved ear cleaner\n4) Seek veterinary diagnostic care (cytology scan) to verify if the cause is bacterial, yeast, or ear mites\n\nAre both ears showing redness or just one?" }
        ],
        subscription: [
            { q: ['cancel', 'cancellation', 'end', 'stop'], a: "For subscription cancellation:\n\n1) Log into your account and go to Account Settings\n2) Look for 'Subscription' or 'Membership' section\n3) Select 'Cancel Subscription' or 'End Membership'\n4) Follow the confirmation prompts\n5) Save/screenshot the cancellation confirmation for your records\n\nWhich service's subscription do you want to cancel?" },
            { q: ['refund', 'money back', 'charged', 'overcharged'], a: "For refund requests:\n\n1) Check your billing history in the account settings\n2) Contact customer support through the platform's official channels\n3) Have your transaction ID and billing details ready\n4) Most services have a 30-day refund policy\n5) If the charge was unauthorized, also contact your bank/card issuer\n\nWhen was the charge made?" },
            { q: ['renew', 'renewal', 'auto-renew'], a: "For renewal issues:\n\n1) Go to your account's subscription settings\n2) Toggle off 'Auto-Renewal' or 'Automatic Payment'\n3) Check when your current billing period ends\n4) You'll typically retain access until the end of the paid period\n5) Set a reminder before the renewal date if you want to reconsider\n\nWould you like to stop auto-renewal or change your plan?" },
            { q: ['upgrade', 'downgrade', 'change plan'], a: "For plan changes:\n\n1) Go to your account settings > Subscription\n2) Compare available plans and pricing\n3) Select the plan you want to switch to\n4) Changes usually take effect at the next billing cycle\n5) You may receive a prorated credit for downgrades\n\nWhich plan are you currently on, and which would you like to switch to?" },
            { q: ['payment method', 'card error', 'credit card'], a: "For credit card or billing payment updates:\n\n1) Log into the platform and go to 'Payment Methods' or 'Billing Settings'\n2) Select 'Add New Payment Method' and input card details (verify card number, CVV, and zip code)\n3) Delete the expired card after the new one is confirmed as the primary billing option\n4) Contact your bank if payments fail due to 'unusual activity' blocks\n\nAre you getting a specific card authorization error?" },
            { q: ['price increase', 'increase', 'charge change'], a: "For subscription pricing increase questions:\n\n1) Look for official email communications from the platform describing the price shift schedule\n2) Check if you are currently on an introductory promotional discount plan that has expired\n3) You can choose to downgrade to a lower tier or ad-supported plan to maintain a lower monthly fee\n4) Cancellation remains open at any time if you do not agree to new rates\n\nWhich subscription service has increased its rate?" },
            { q: ['free trial', 'trial charge'], a: "If you were charged after a free trial period:\n\n1) Remember that most free trials auto-renew into paid plans unless cancelled 24 hours before expiration\n2) Check the specific terms of the trial to verify its duration (e.g. 7-day or 30-day)\n3) Contact support immediately and state that you intended to cancel before auto-renewal\n4) Many platforms will issue a full refund if you have not used the service since the charge\n\nHave you used the platform services since the renewal charge occurred?" },
            { q: ['prorated', 'credit'], a: "For prorated credit questions:\n\n1) A prorated credit is applied when you change your subscription plan mid-cycle\n2) If you upgrade, you pay a partial fee representing the remaining days of your billing cycle\n3) If you downgrade, the difference is typically issued as an account credit rather than a cash refund\n4) The credit is automatically deducted from your next billing statement\n\nDid you recently upgrade or downgrade your active plan?" },
            { q: ['gym', 'membership cancel', 'exit clause'], a: "For physical club or gym membership cancellations:\n\n1) Review the original printed contract for specific early-termination cancellation clauses or relocation options\n2) Mail a formal cancellation letter via Certified Mail with Return Receipt Requested - verbal cancel requests are frequently ignored\n3) Note if there is a mandatory '30-day billing notice period' requiring one final monthly payment\n4) If relocated, gather utility bills or lease agreements in your new city as many gyms wave cancellation fees for distance\n\nWhat gym or health club is this for?" },
            { q: ['password sharing', 'household block'], a: "For subscription household sharing limits (e.g., Netflix household bans):\n\n1) Verify if your device is linked to the primary account's 'Home Wi-Fi' network by logging into the primary home connection\n2) Go to account options, choose 'Manage Household', and send a verification pin link to update the main location\n3) If sharing outside a household, select 'Transfer Profile' to export personal bookmarks/history to a separate sub-account\n4) Avoid using public VPNs, which make mobile devices appear as if they are in completely separate regional locations\n\nWhich streaming service is blocking your access?" }
        ],
        appliances: [
            { q: ['refrigerator', 'fridge', 'cooling', 'ice maker', 'freezer'], a: "For refrigerator cooling or ice maker issues:\n\n1) Clean the black condenser coils located underneath or behind the fridge; dust buildup stops heat transfer\n2) Check if the freezer fan motor is running - if it hums but does not circulate air, the evaporator coils may be frosted over\n3) For a broken ice maker: Check if the water supply line is frozen or blocked; ensure the freezer temperature is between 0-5°F\n4) Keep the door seals clean of debris to prevent cold air leaks\n\nIs the freezer working correctly but the fresh food section is warm?" },
            { q: ['washer', 'washing machine', 'drain', 'spin'], a: "For washing machine draining or spinning failures:\n\n1) Check the drain hose at the back for any kinks, twists, or blockages; clear the coin trap/filter located behind the bottom cover panel\n2) If it won't spin: Inspect the lid switch assembly (lid must click closed to trigger the motor safety mechanism)\n3) If it hums but doesn't spin, the drive belt may have slipped or snapped\n4) Ensure the load is evenly balanced - off-balance loads automatically trigger emergency spin shutoffs\n\nWhat brand is your washing machine?" },
            { q: ['dryer', 'heating', 'thermal fuse'], a: "For clothes dryer heating failures:\n\n1) Clean the exhaust vent hose from the back of the dryer all the way to the outside wall exit; airflow clogs stop heat\n2) Test the thermal fuse using a multimeter - if it has no continuity, it has blown to prevent fire and must be replaced\n3) Inspect the heating element coil for visible breaks or burned spots\n4) For gas dryers, ensure the gas supply valve is fully open and the igniter glows\n\nDoes the dryer drum spin but there is zero heat?" },
            { q: ['dishwasher', 'leaking', 'not draining'], a: "For dishwasher leaking or draining issues:\n\n1) Clear any food particles from the pump filter/mesh assembly located in the bottom basin\n2) Inspect the spray arms to ensure the water spray holes are not clogged with mineral debris\n3) For a leak: Check the rubber door gasket seal for splits or food deposits; ensure you are using correct soap types to avoid suds overflowing\n4) Clean the air gap faucet connection under the sink to resolve drainage backflows\n\nIs standing water left in the bottom basin after a cycle?" },
            { q: ['tv', 'television', 'black screen', 'no picture'], a: "For Smart TV black screen issues (sound but no picture):\n\n1) Perform a soft reset: Unplug the TV power cable, hold the TV power button down for 30 seconds, plug back in\n2) Inspect the screen closely using a flashlight while the TV is on - if you see faint images, the LED backlight assembly has failed\n3) Disconnect and reconnect all HDMI cables, or swap ports to rule out video receiver errors\n4) Set the HDMI Input using your TV remote control to match the active media box\n\nWhat brand is your Smart TV?" },
            { q: ['printer', 'offline', 'not printing'], a: "For printer offline or printhead failures:\n\n1) Clear print queues: Go to Windows Settings > Devices > Printers > double click your printer > cancel all active printing jobs\n2) Restart the print spooler service in Windows (`services.msc` > Print Spooler > right-click Restart)\n3) If on Wi-Fi, assign a static IP address to the printer via your home router to avoid IP address lease disconnects\n4) Run a printhead cleaning cycle from the printer's onboard utility screen to clear dried ink blocks\n\nAre you connecting via USB or Wi-Fi?" },
            { q: ['microwave', 'heating', 'sparking'], a: "For microwave heating or sparking issues:\n\n1) **Caution**: Do not attempt to repair a microwave's internal high-voltage capacitor yourself, as it stores lethal charge even when unplugged\n2) If it sparks: Inspect the grey mica waveguide cover sheet inside the microwave wall for grease burns or cracks; replace if damaged\n3) Ensure you are not utilizing any metal bowls, foil, or plates with metallic trim rims\n4) If the motor spins but it doesn't heat at all, the magnetron tube has failed and requires professional swap\n\nIs the sparking occurring in a specific spot inside?" },
            { q: ['audio', 'soundbar', 'home theater', 'no audio'], a: "For home theater or soundbar audio failures:\n\n1) Ensure you are utilizing an HDMI-eARC/ARC port on both the Smart TV and the soundbar for digital audio transfer\n2) Open your Smart TV Audio Settings, set Digital Audio Output format to 'PCM' or 'Pass-Through' instead of Auto\n3) Check that the optical audio cable ends are clicked securely into place and the protective plastic caps are removed\n4) Verify the soundbar source input selection (e.g. HDMI, Optical, Bluetooth) matches the physical cable hookup\n\nIs the soundbar connected via HDMI or Optical cable?" }
        ],
        finance: [
            { q: ['audit', 'refund', 'irs', 'cp2000'], a: "For IRS tax audit notices (like CP2000) or missing refunds:\n\n1) Locate your IRS Letter Number (usually printed in the top right corner) and read the exact adjustments suggested\n2) Access your official tax account transcript via the secure IRS 'Get Transcript' website to audit adjustments\n3) Track refund status using the IRS 'Where's My Refund?' online tool - have your exact refund amount and SSN ready\n4) Draft a formal, structured response addressing each adjustment with supporting receipts; submit before the 30-day deadline\n\nDid you receive a specific CP2000 adjustment letter?" },
            { q: ['401k', 'ira', 'retirement', 'rollover'], a: "For retirement planning, 401k rollovers, or IRA conversions:\n\n1) To perform a 401k rollover: Initiate a 'Direct Rollover' to your new custodian to avoid automatic 20% withholding taxes\n2) Ensure the check is made payable to the new custodian 'For the Benefit of [Your Name]' rather than to you personally\n3) Compare Traditional IRA (pre-tax contributions, tax on withdrawal) vs. Roth IRA (after-tax contributions, tax-free growth)\n4) Adhere to current annual contribution limits set by the IRS\n\nAre you looking to roll over an old company 401k or open a new IRA?" },
            { q: ['debt', 'credit score', 'consolidation'], a: "For debt consolidation or credit score improvement:\n\n1) Pull your free credit reports from annualcreditreport.com to check for errors or obsolete collections\n2) Utilize the 'Debt Avalanche' (paying highest interest debt first) or 'Debt Snowball' (paying smallest balance first) methods\n3) Keep your Credit Utilization Ratio below 30% on each credit card to instantly boost your FICO score\n4) Draft formal validation letters to collection agencies disputing inaccurate records\n\nWhat is your current total credit utilization percentage?" },
            { q: ['budget', 'savings', 'emergency fund'], a: "For personal budgeting and emergency fund allocations:\n\n1) Establish a secure emergency fund covering 3 to 6 months of absolute living expenses (rent, utilities, food)\n2) Keep emergency savings in a high-yield savings account (HYSA) to earn interest rather than a standard low-yield checking account\n3) Implement the 50/30/20 rule: Allocate 50% to Needs (bills), 30% to Wants (entertainment), and 20% to Savings/Debt payoff\n4) Use financial trackers or spreadsheet models to map weekly transaction outlays\n\nDo you currently have an emergency savings account?" },
            { q: ['back taxes', 'installment plan', 'oic'], a: "For IRS back taxes or repayment installment agreements:\n\n1) Apply for an Online Payment Agreement via irs.gov if you owe less than $50,000 in total back taxes\n2) Choose a short-term plan (up to 180 days, lower setup fees) or long-term plan (up to 72 months, monthly debit)\n3) If in severe financial hardship, investigate an 'Offer in Compromise' (OIC) to settle your tax liability for less than owed\n4) Continue filing your annual tax returns on time even if you cannot pay, as failure-to-file penalties are 10x higher than failure-to-pay\n\nApproximately how much back tax is currently owed?" },
            { q: ['mortgage', 'refinance', 'dti'], a: "For mortgage pre-approvals or refinancing questions:\n\n1) Keep your Debt-to-Income (DTI) ratio below 36% (front-end housing costs below 28%) to qualify for top-tier interest rates\n2) Gather 2 years of W-2 statements, 2 months of bank statements, and your two most recent pay stubs for underwriting\n3) When refinancing, calculate the 'breakeven point' by dividing total closing costs by your monthly payment savings\n4) Maintain a credit score of 740+ to secure premium conventional loan terms\n\nAre you buying a new home or looking to refinance your current loan?" },
            { q: ['invest', 'stock', 'etf', 'index fund'], a: "For stock market investing and portfolio allocation basics:\n\n1) Utilize low-cost Index Funds or ETFs that track broad markets (like the S&P 500) to ensure high diversification\n2) Check the 'Expense Ratio' fee of any mutual fund; seek ratios below 0.15% to avoid losing returns to management fees\n3) Implement 'Dollar-Cost Averaging' (DCA) by investing a fixed dollar amount on a regular schedule (e.g. monthly) regardless of market swings\n4) Prioritize tax-advantaged accounts (like 401ks and IRAs) before investing in standard taxable brokerage accounts\n\nAre you looking to build a long-term retirement portfolio?" },
            { q: ['schedule c', 'mileage', 'self-employed', 'quarterly'], a: "For self-employed tax deduction or Schedule C filings:\n\n1) Make mandatory quarterly estimated tax payments (using Form 1040-ES) to avoid underpayment penalties if you expect to owe $1,000+\n2) Maintain an accurate mileage log including dates, odometer start/end, and business purpose to claim the standard mileage rate\n3) Deduct a home office space by measuring the exact square footage utilized exclusively and regularly for your business operations\n4) Save digital receipts for all business expenditures (software, gear, internet) for a minimum of 3 years\n\nDo you run a sole proprietorship or single-member LLC?" }
        ]
    };

    // ===== Dynamic Chat Suggestions Database (Top 100 JustAnswer Issues) =====
    const categorySuggestions = {
        overall: [
            { text: "iPhone won't turn on", query: "my iphone 14 pro max won't turn on", icon: "📱" },
            { text: "Dog is dull / lethargic", query: "my dog is dull today", icon: "🐶" },
            { text: "Bathroom pipe leaking", query: "there is a leak in my bathroom pipe", icon: "🔧" },
            { text: "Wrongful termination", query: "I got fired from my job unfairly", icon: "💼" },
            { text: "Fell in washroom & hurts", query: "I fell in the washroom and my elbow hurts bad", icon: "🏥" }
        ],
        medical: [
            { text: "Fell in washroom & hurts", query: "I fell in the washroom and my elbow hurts bad", icon: "🏥" },
            { text: "Chest pain & breathing", query: "I have been having chest pain since this morning", icon: "🫁" },
            { text: "High fever & chills", query: "I have a high fever of 102 degrees and chills", icon: "🌡️" },
            { text: "Stomach pain & nausea", query: "I have severe stomach pain and nausea", icon: "🤢" }
        ],
        legal: [
            { text: "Wrongful termination", query: "I got fired from my job unfairly", icon: "💼" },
            { text: "Divorce & custody", query: "I need legal help with filing for divorce and child custody", icon: "💔" },
            { text: "Breach of contract", query: "The other party breached our service agreement contract", icon: "📜" },
            { text: "Landlord eviction dispute", query: "My landlord is trying to evict me unfairly", icon: "🏠" }
        ],
        veterinary: [
            { text: "Dog is dull / lethargic", query: "my dog is dull today", icon: "🐶" },
            { text: "Cat vomiting food", query: "my persian cat has been throwing up since yesterday", icon: "🐱" },
            { text: "Dog ate chocolate", query: "My dog just ate dark chocolate, is it toxic?", icon: "🍫" },
            { text: "Cat straining to pee", query: "My male cat is straining in the litter box and crying", icon: "😿" }
        ],
        plumbing: [
            { text: "Active plumbing leak", query: "there is a leak in my bathroom pipe", icon: "💧" },
            { text: "Clogged toilet", query: "My toilet is clogged and overflowing", icon: "🚽" },
            { text: "No hot water", query: "My water heater is not producing any hot water", icon: "♨️" },
            { text: "Burst pipe flooding", query: "A water pipe burst in the basement and it is flooding", icon: "💥" }
        ],
        automotive: [
            { text: "Car won't start", query: "my 2019 toyota camry won't start", icon: "🚗" },
            { text: "Overheating engine", query: "My car engine is overheating and steam is coming out", icon: "💨" },
            { text: "Grinding brakes", query: "My brakes make a loud grinding sound when stopping", icon: "🛑" },
            { text: "Check engine light", query: "My check engine light is flashing and the engine ticks", icon: "⚠️" }
        ],
        microsoft: [
            { text: "Windows won't start", query: "My Windows laptop keeps crashing and won't boot", icon: "🖥️" },
            { text: "Blue Screen (BSOD)", query: "My computer keeps crashing with a blue screen error", icon: "🌀" },
            { text: "Computer slow & lagging", query: "My Windows PC is running extremely slow and freezing", icon: "📈" },
            { text: "Outlook email error", query: "My Outlook email is stuck and won't connect to server", icon: "📧" }
        ],
        ios: [
            { text: "iPhone won't turn on", query: "my iphone 14 pro max won't turn on", icon: "📱" },
            { text: "Forgot Apple ID passcode", query: "I forgot my iPhone screen passcode and iCloud password", icon: "🔑" },
            { text: "Mac stuck on Apple logo", query: "My MacBook is frozen on the Apple logo spinning wheel", icon: "💻" },
            { text: "iPad not charging", query: "My iPad Pro won't charge or turn on at all", icon: "🔌" }
        ],
        android: [
            { text: "Android won't start", query: "My Android phone is stuck in a boot loop and won't turn on", icon: "📲" },
            { text: "Chromebook won't boot", query: "My Chromebook is showing Chrome OS is missing or damaged", icon: "💻" },
            { text: "Play Store error", query: "Google Play Store is crashing and won't download apps", icon: "🛍️" },
            { text: "Samsung screen black", query: "My Samsung Galaxy has a completely black screen but vibrates", icon: "🌌" }
        ],
        xbox: [
            { text: "Controller drift", query: "My Xbox controller has severe thumbstick drift and won't connect", icon: "🎮" },
            { text: "Xbox won't turn on", query: "My Xbox console won't turn on or has power issues", icon: "🔌" },
            { text: "NAT type Strict lag", query: "My Xbox has Strict NAT and lags in online multiplayer", icon: "🌐" },
            { text: "Games keep crashing", query: "My games keep freezing and crashing on my Xbox console", icon: "💥" }
        ],
        crypto: [
            { text: "PayPal account restricted", query: "My PayPal account was temporarily restricted", icon: "💳" },
            { text: "Google Pay declining", query: "Google Pay transaction keeps getting declined at checkout", icon: "📱" },
            { text: "Apple Pay card verification", query: "Apple Pay card verification failing on my device", icon: "📲" },
            { text: "Venmo transfer pending", query: "My Venmo transfer is delayed and pending review", icon: "⏳" }
        ],
        account: [
            { text: "Social media hacked", query: "My Facebook and Instagram accounts were hacked and password changed", icon: "👥" },
            { text: "Gmail password recovery", query: "I cannot access my Gmail account and recovery email is old", icon: "📧" },
            { text: "Amazon account locked", query: "My Amazon account was temporarily locked for suspicious activity", icon: "🛒" },
            { text: "Lost 2FA authenticator", query: "I lost my phone and cannot log in because of Google 2FA", icon: "📲" }
        ],
        subscription: [
            { text: "Cancel subscription", query: "How do I cancel my monthly subscription membership?", icon: "❌" },
            { text: "Request a refund", query: "I want to request a full refund for an auto-renew charge", icon: "💰" },
            { text: "Stop auto-renewal", query: "I need to turn off automatic renewal for my active plan", icon: "🛑" },
            { text: "Card billing error", query: "My payment failed and I am getting a credit card billing error", icon: "💳" }
        ],
        appliances: [
            { text: "Fridge not cooling", query: "My refrigerator is warm and not cooling", icon: "❄️" },
            { text: "Washer not spinning", query: "My washing machine won't spin or drain", icon: "🧺" },
            { text: "Dryer not heating", query: "My clothes dryer spins but doesn't produce heat", icon: "🔥" },
            { text: "TV black screen", query: "My Smart TV screen is black but has sound", icon: "📺" }
        ],
        finance: [
            { text: "IRS tax audit CP2000", query: "I received an IRS tax audit letter CP2000", icon: "📜" },
            { text: "401k direct rollover", query: "How do I do a direct rollover of my old 401k?", icon: "💰" },
            { text: "Boost credit score", query: "How do I lower my credit utilization to boost my credit score?", icon: "📈" },
            { text: "Self-employed Schedule C", query: "How do I claim home office and mileage on Schedule C?", icon: "💼" }
        ]
    };

    // ===== Render Dynamic Left Pane Suggestion Pills =====
    function renderLeftSuggestions(catKey = 'overall') {
        if (!suggestionPills) return;

        // Clear existing pills
        suggestionPills.innerHTML = '';
        suggestionPills.classList.remove('hidden');
        suggestionPills.style.opacity = '1';

        const suggestions = categorySuggestions[catKey] || categorySuggestions.overall;
        suggestions.forEach(item => {
            const button = document.createElement('button');
            button.className = 'pill';
            button.setAttribute('data-query', item.query);
            button.innerHTML = `
                <svg class="pill-icon" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                ${item.text}
            `;
            button.addEventListener('click', () => {
                chatInput.value = item.query;
                handleSendMessage();
            });
            suggestionPills.appendChild(button);
        });

        // Add "Ask anything..." pill
        const askBtn = document.createElement('button');
        askBtn.className = 'pill';
        askBtn.setAttribute('data-query', 'Ask anything...');
        askBtn.innerHTML = `
            <svg class="pill-icon" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2"/><line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            Ask anything...
        `;
        askBtn.addEventListener('click', () => {
            chatInput.focus();
        });
        suggestionPills.appendChild(askBtn);
    }

    // ===== Precise Keyword Matching Helper =====
    function keywordMatches(text, kw) {
        const lowerText = text.toLowerCase();
        const lowerKw = kw.toLowerCase();
        
        if (!lowerText.includes(lowerKw)) return false;

        // Custom boundary rules for specific short or ambiguous keywords to avoid false matches
        if (lowerKw === 'sue') {
            // Match "sue", "sued", "sues", "suing", but NOT "issue", "tissue", "pursue", "reissue"
            return /\b(sue|sued|sues|suing)\b/i.test(lowerText);
        }
        if (lowerKw === 'defi') {
            // Match "defi", "de-fi" but NOT "deficiency", "definition", "define"
            return /\b(defi|de-fi)\b/i.test(lowerText);
        }
        if (lowerKw === 'mac') {
            // Match "mac", "macs", "macbook", "macbooks", "imac" but NOT "machine", "macaroni"
            return /\b(mac|macs|macbook|macbooks|imac|imacs)\b/i.test(lowerText);
        }
        if (lowerKw === 'car') {
            // Match "car", "cars" but NOT "card", "care", "carpet", "cartoon", "career", "scared"
            return /\b(car|cars)\b/i.test(lowerText);
        }
        if (lowerKw === 'pet') {
            // Match "pet", "pets" but NOT "carpet", "compete", "competent", "competition"
            return /\b(pet|pets)\b/i.test(lowerText);
        }
        if (lowerKw === 'vet') {
            // Match "vet", "vets", "veterinary", "veterinarian", "veterinarians" but NOT "active", "device", "prevent", "velvet"
            return /\b(vet|vets|veterinary|veterinarian|veterinarians)\b/i.test(lowerText);
        }
        if (lowerKw === '.net') {
            return /\b\.net\b/i.test(lowerText);
        }
        if (lowerKw === 'app') {
            // Match "app", "apps", "apple" but NOT "disappear", "application"
            return /\b(app|apps|apple)\b/i.test(lowerText);
        }

        // List of prefix keywords that should match words starting with them
        const prefixKeywords = ['activat', 'plumb', 'subscrib', 'unsubscrib'];
        if (prefixKeywords.includes(lowerKw)) {
            const regex = new RegExp('\\b' + lowerKw, 'i');
            return regex.test(lowerText);
        }

        // For standard alphanumeric keywords, require a word boundary match on both sides
        // e.g., '\bkeyword\b' allowing common english plurals like 's' or 'es'
        if (/^[a-z0-9\s]+$/i.test(lowerKw)) {
            const regex = new RegExp('\\b' + lowerKw + '(s|es)?\\b', 'i');
            return regex.test(lowerText);
        }

        // Fallback for special characters or compound strings (like "game pass" or "product key")
        return lowerText.includes(lowerKw);
    }

    // ===== Detect Category from Text =====
    function detectCategory(text) {
        const lower = text.toLowerCase();
        // Priority order: check vet BEFORE medical (so "my dog is sick" → vet), subscription BEFORE account
        const priorityOrder = ['veterinary', 'subscription'];
        const orderedKeys = [...priorityOrder, ...Object.keys(categories).filter(k => !priorityOrder.includes(k) && k !== 'account')];
        orderedKeys.push('account');
        for (const key of orderedKeys) {
            const cat = categories[key];
            for (const kw of cat.keywords) {
                if (keywordMatches(lower, kw)) {
                    return { key, ...cat };
                }
            }
        }
        return null;
    }

    // ===== Update Hero (Left Pane) =====
    function updateHeroForCategory(cat) {
        if (detectedCategory === cat.key) return;
        detectedCategory = cat.key;

        heroHeadline.style.opacity = '0';
        heroSubtext.style.opacity = '0';

        setTimeout(() => {
            heroHeadline.innerHTML = `Facing <span class="highlight-word">${cat.label}</span> issues? Get help from Business ${cat.expertType} Experts`;
            heroHeadline.classList.add('category-detected');
            heroSubtext.textContent = `Unlimited chats with verified, top-rated ${cat.expertType} Experts.`;

            const specialistCount = Math.floor(Math.random() * 8) + 2;
            onlineCount.textContent = `${specialistCount} ${cat.expertType} Support Specialists are online now`;

            suggestionPills.style.opacity = '0';
            setTimeout(() => { suggestionPills.classList.add('hidden'); }, 300);

            heroHeadline.style.opacity = '1';
            heroSubtext.style.opacity = '1';

            // Update Regulatory Advisory Notice if Medical or Legal
            const advisoryBanner = document.getElementById('chatAdvisoryBanner');
            if (advisoryBanner) {
                if (cat.key === 'medical') {
                    advisoryBanner.className = 'chat-advisory-banner medical';
                    advisoryBanner.innerHTML = '<span>🚨</span> <div><strong>Emergency Notice:</strong> If you are experiencing a life-threatening medical emergency, call 911 immediately. AnswerDesk provides informational triage only.</div>';
                    advisoryBanner.style.display = 'flex';
                } else if (cat.key === 'legal') {
                    advisoryBanner.className = 'chat-advisory-banner legal';
                    advisoryBanner.innerHTML = '<span>⚖️</span> <div><strong>Legal Disclaimer:</strong> Consultations provide general informational guidance and do not constitute formal legal representation or an attorney-client relationship.</div>';
                    advisoryBanner.style.display = 'flex';
                } else {
                    advisoryBanner.style.display = 'none';
                }
            }
        }, 400);
    }

    // ===== Show Call Details Panel (LEFT PANE) =====
    function showCallDetailsPanel() {
        const cat = detectedCategory ? categories[detectedCategory] : null;
        const phone = cat ? cat.phone : '1-800-555-0100';
        const label = cat ? cat.label : 'General';
        const expert = selectedExpert;
        const expertRole = detectedCategory && categoryRoles[detectedCategory] ? categoryRoles[detectedCategory] : 'Tech Support Expert';

        // Update panel content
        const panel = callDetailsPanel;
        if (!panel) return;

        const titleEl = document.getElementById('callPanelTitle');
        const nameEl = document.getElementById('callPanelExpertName');
        const roleEl = document.getElementById('callPanelExpertRole');
        const customersEl = document.getElementById('callPanelCustomers');
        const phoneEl = document.getElementById('callPanelPhoneDisplay');
        const phoneVisibleEl = document.getElementById('callPanelPhoneNumberVisible');
        const avatarEl = document.getElementById('callPanelAvatar');
        const callNowBtn = document.getElementById('callNowBtn');

        if (titleEl) titleEl.textContent = window._dynamicCTATitle || `Get your ${label} issue fixed now`;
        if (nameEl) nameEl.textContent = expert.name;
        if (roleEl) roleEl.textContent = expertRole;
        if (customersEl) customersEl.textContent = `${expert.customers.toLocaleString()} satisfied customers`;
        if (phoneVisibleEl) {
            phoneVisibleEl.textContent = phone;
        } else if (phoneEl) {
            phoneEl.textContent = phone;
        }

        // Format clean phone number for native telephone dialer
        const cleanDigits = phone.replace(/[^0-9]/g, '');
        const formattedTel = cleanDigits.startsWith('1') ? `+${cleanDigits}` : `+1${cleanDigits}`;
        const telUri = `tel:${formattedTel}`;

        // Update Call Now button href for dialer
        if (callNowBtn) {
            callNowBtn.setAttribute("href", telUri);
            callNowBtn.onclick = (e) => {
                window.location.href = telUri;
            };
        }

        // Update phone number display link for dialer
        if (phoneEl) {
            phoneEl.setAttribute("href", telUri);
            phoneEl.onclick = (e) => {
                window.location.href = telUri;
            };
        }

        // Update avatar from expert profile
        if (avatarEl) {
            avatarEl.src = expert.avatar;
        }

        // Show backdrop on mobile screens
        const backdrop = document.getElementById('callPanelBackdrop');
        if (backdrop && window.innerWidth <= 1100) {
            backdrop.style.display = 'block';
            setTimeout(() => { backdrop.classList.add('visible'); }, 10);
            backdrop.onclick = closeCallPanel;
        }

        // Show with animation
        panel.style.display = 'block';
        setTimeout(() => { panel.classList.add('visible'); }, 10);

        // Scroll to make it visible
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Show expert popup after 60 seconds
        setTimeout(() => {
            showExpertPopup(label, phone);
        }, 60000);
    }

    // ===== Expert Popup (appears after 1 minute) =====
    function showExpertPopup(label, phone) {
        // Don't show if already dismissed or already showing
        if (document.getElementById('expertPopupOverlay')) return;

        const expert = selectedExpert;
        const expertRole = detectedCategory && categoryRoles[detectedCategory] ? categoryRoles[detectedCategory] : 'Tech Support Expert';
        const onlineExperts = Math.floor(Math.random() * 8) + 10;
        const telNumber = phone.replace(/[^0-9]/g, '');

        // Pick 4 random background avatars (different from the selected expert)
        const allAvatars = [];
        for (let i = 1; i <= 35; i++) { allAvatars.push('assets/expert-' + i + '.png'); }
        const bgAvatars = allAvatars
            .filter(a => a !== expert.avatar)
            .sort(() => Math.random() - 0.5)
            .slice(0, 4);

        const overlay = document.createElement('div');
        overlay.id = 'expertPopupOverlay';
        overlay.className = 'expert-popup-overlay';
        overlay.innerHTML = `
            <div class="expert-popup-card">
                <button class="expert-popup-close" id="expertPopupClose">&times;</button>
                <div class="expert-popup-badge">${onlineExperts} ${label} Experts are online now</div>
                <div class="expert-popup-avatars">
                    <img src="${bgAvatars[0]}" alt="" class="popup-avatar-bg">
                    <img src="${bgAvatars[1]}" alt="" class="popup-avatar-bg">
                    <img src="${expert.avatar}" alt="${expert.name}" class="popup-avatar-main">
                    <img src="${bgAvatars[2]}" alt="" class="popup-avatar-bg">
                    <img src="${bgAvatars[3]}" alt="" class="popup-avatar-bg">
                </div>
                <h3 class="expert-popup-name">${expert.name}</h3>
                <p class="expert-popup-role">${expertRole}</p>
                <p class="expert-popup-customers">${expert.customers.toLocaleString()} satisfied customers</p>
                <div class="expert-popup-divider"></div>
                <p class="expert-popup-msg">Hi, we're online right now and<br>ready to answer your question</p>
                <p class="expert-popup-sub">Get the answer you need in minutes.<br>Cancel anytime if not satisfied</p>
                <a href="tel:+${telNumber}" class="expert-popup-cta">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    Call Now
                </a>
            </div>
        `;

        document.body.appendChild(overlay);

        // Close handlers
        document.getElementById('expertPopupClose').addEventListener('click', () => {
            overlay.classList.add('closing');
            setTimeout(() => overlay.remove(), 300);
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('closing');
                setTimeout(() => overlay.remove(), 300);
            }
        });
    }

    // ===== AI Response Generator (for AI Chat phase only) =====
    function generateAIResponse(userMessage) {
        const lower = userMessage.toLowerCase();

        // Check detected category knowledge base first
        if (detectedCategory && knowledgeBase[detectedCategory]) {
            const entries = knowledgeBase[detectedCategory];
            for (const entry of entries) {
                for (const keyword of entry.q) {
                    if (lower.includes(keyword)) {
                        return entry.a;
                    }
                }
            }
        }

        // Check ALL knowledge bases (but do NOT update hero from here -
        // hero category is already handled by detectCategory in getChatFlowResponse)
        for (const [catKey, entries] of Object.entries(knowledgeBase)) {
            for (const entry of entries) {
                for (const keyword of entry.q) {
                    if (lower.includes(keyword)) {
                        return entry.a;
                    }
                }
            }
        }

        // Generic contextual
        if (lower.includes('thank') || lower.includes('thanks')) {
            return "You're welcome! Is there anything else I can help you with?";
        }
        if (lower.includes('yes') || lower.includes('more detail') || lower.includes('tell me more')) {
            return "I'd be happy to provide more details. Could you tell me which specific step you'd like me to elaborate on?";
        }
        if (lower.includes('no') || lower.includes('that\'s all') || lower.includes('resolved')) {
            return "Glad I could help! If you need further assistance in the future, don't hesitate to reach out. Have a great day! \uD83D\uDE0A";
        }

        return "I understand your concern. Could you provide more details about the specific issue you're experiencing? For example, any error messages, when it started, and what you've already tried?";
    }

    // ===== Detail Extraction from User Message =====
    function extractDetails(text) {
        const t = text.toLowerCase();
        // Device extraction
        const devicePatterns = [
            { re: /\b(iphone\s*\d*\s*(?:pro\s*max|pro|plus|mini|se)?)\b/i, key: 'device' },
            { re: /\b(ipad\s*(?:pro|air|mini)?(?:\s*\d*(?:th|rd|nd|st)?\s*(?:gen|generation)?)?)\b/i, key: 'device' },
            { re: /\b(macbook\s*(?:pro|air)?(?:\s*\d+(?:\.\d+)?(?:[\s-]*inch)?)?)\b/i, key: 'device' },
            { re: /\b(imac|mac\s*mini|mac\s*pro|mac\s*studio)\b/i, key: 'device' },
            { re: /\b(airpods?\s*(?:pro|max)?(?:\s*\d*)?)\b/i, key: 'device' },
            { re: /\b(xbox\s*(?:series\s*[xs]|one\s*[xs]?|360)?)\b/i, key: 'device' },
            { re: /\b(samsung\s*(?:galaxy)?\s*(?:s\d+|a\d+|note\s*\d+|z\s*(?:fold|flip)\s*\d*|tab\s*\w*)?)\b/i, key: 'device' },
            { re: /\b(pixel\s*\d*\s*(?:pro|a)?)\b/i, key: 'device' },
            { re: /\b(surface\s*(?:pro|laptop|go|book|studio)?(?:\s*\d*)?)\b/i, key: 'device' },
            { re: /\b(dell\s+\w+|hp\s+\w+|lenovo\s+\w+|asus\s+\w+|acer\s+\w+)\b/i, key: 'device' },
        ];
        for (const p of devicePatterns) {
            const m = text.match(p.re);
            if (m) capturedDetails.device = m[1].trim();
        }

        // Pet extraction — MUST happen before issue extraction
        // When a NEW pet type is detected, clear the old breed to prevent carryover ("bulldog cat" bug)
        const petMatch = text.match(/\b(?:my\s+)?(dog|cat|puppy|kitten|bird|hamster|rabbit|guinea pig|fish|parrot|turtle|horse|pup)\b/i);
        if (petMatch) {
            const newPetType = petMatch[1].toLowerCase() === 'pup' ? 'dog' : petMatch[1].toLowerCase();
            if (capturedDetails.petType && capturedDetails.petType !== newPetType) {
                // User switched pets — clear old breed and issue
                capturedDetails.petBreed = null;
                capturedDetails.issue = null;
                capturedDetails.rawIssuePhrase = null;
                capturedDetails.symptoms = null;
                capturedDetails.duration = null;
                capturedDetails.cause = null;
            }
            capturedDetails.petType = newPetType;
        }
        // Breed extraction
        const breedMatch = text.match(/\b(golden retriever|labrador|lab|german shepherd|bulldog|french bulldog|poodle|beagle|husky|chihuahua|rottweiler|boxer|dachshund|pug|corgi|shih tzu|yorkshire terrier|yorkie|maltese|doberman|great dane|pitbull|pit bull|persian|siamese|maine coon|bengal|ragdoll|british shorthair|sphynx|scottish fold|russian blue|abyssinian|burmese|himalayan|tabby)\b/i);
        if (breedMatch) {
            let breed = breedMatch[1].trim();
            // Normalize shorthand breeds
            if (breed.toLowerCase() === 'lab') breed = 'Labrador';
            if (breed.toLowerCase() === 'yorkie') breed = 'Yorkshire Terrier';
            capturedDetails.petBreed = breed;
        }

        // Issue extraction — expanded with natural language patterns
        const issuePatterns = [
            { re: /(?:won'?t|not|isn'?t|can'?t|cannot|doesn'?t|unable to)\s+(turn on|start|boot|power|charge|connect|pair|update|install|open|load|work|respond|sync|send|receive)/i, val: m => m[0] },
            { re: /\b(blue screen|bsod|black screen|white screen|frozen|freezing|stuck|crash|crashing|overheating|slow|lagging|flickering|glitching|error|beeping)\b/i, val: m => m[1] },
            { re: /\b(cracked|shattered|broken|damaged|scratched|dented|bent)\s*(?:screen|display|glass)?/i, val: m => m[0] },
            { re: /\b(battery drain|draining fast|dies quickly|won'?t hold charge)\b/i, val: m => m[0] },
            // Pet/medical symptoms — expanded with natural language
            { re: /\b(throwing up|vomiting|not eating|won'?t eat|limping|lethargic|diarrhea|scratching|itching|coughing|sneezing|wheezing|shaking|trembling|bleeding|swollen|swelling|panting|drooling|not drinking|won'?t drink|acting weird|acting strange|acting funny|acting different|not moving|not playing|not active|hiding|aggressive|restless|losing weight|lost weight|losing hair|losing fur|bald spot|not barking|stopped barking|won'?t bark|barking|not meowing|stopped meowing|won'?t meow|meowing)\b/i, val: m => m[1] },
            { re: /\b(throwing up|vomiting)\s+(?:and|,)\s*(not eating|won'?t eat|lethargic|has diarrhea)/i, val: m => `${m[1]} and ${m[2]}` },
            // Natural adjective-based symptom descriptions: "is dull", "is sleepy", "seems tired"
            { re: /(?:is|seems?|looks?|acting|been|feels?)\s+(?:also\s+|very\s+|really\s+|extremely\s+|so\s+|a\s+bit\s+|quite\s+)?(dull|sleepy|tired|lazy|weak|quiet|sad|depressed|lethargic|sluggish|drowsy|listless|inactive|feverish|hot|cold|stiff|wobbly|confused|disoriented|unwell|sick|ill|not well|not good|not right|off|weird|strange|different)(?:\s+today|\s+lately|\s+recently|\s+now|\s+all day)?/i, val: m => m[0].trim() },
            // "has been" patterns: "has been dull", "has been sleeping a lot"
            { re: /(?:has been|have been|was)\s+(?:also\s+|very\s+|really\s+|extremely\s+|so\s+|a\s+bit\s+|quite\s+)?(dull|sleepy|tired|lazy|weak|quiet|lethargic|sluggish|sick|ill|vomiting|throwing up|not eating|limping|coughing|scratching|sleeping a lot|sleeping all day|inactive|not moving much)(?:\s+(?:today|lately|recently|since|for))?/i, val: m => m[1].trim() },
            // Medical symptoms
            { re: /\b(chest pain|headache|migraine|back pain|sore throat|stomach ache|nausea|shortness of breath|dizziness|blurry vision)\b/i, val: m => m[1] },
            // Plumbing/household issues
            { re: /\b(?:has\s+a\s+|is\s+a\s+|there\s+is\s+a\s+)?(leak|leaking|clog|clogged|blocked drain|running toilet|burst pipe|drip|dripping|flooding)\b/i, val: m => m[1] },
            // Subscription issues
            { re: /\b(want to cancel|need to cancel|cancel my|get a refund|overcharged|double charged|unauthorized charge|want my money back)\b/i, val: m => m[1] },
        ];
        for (const p of issuePatterns) {
            const m = text.match(p.re);
            if (m) {
                const extracted = p.val(m).trim();
                if (!capturedDetails.issue) {
                    capturedDetails.issue = extracted;
                    capturedDetails.rawIssuePhrase = extracted;
                } else if (capturedDetails.issue && text.length > 5) {
                    const existing = capturedDetails.issue.toLowerCase();
                    const newExt = extracted.toLowerCase();
                    if (!existing.includes(newExt) && !newExt.includes(existing)) {
                        capturedDetails.issue = `${capturedDetails.issue} and ${extracted}`;
                        capturedDetails.rawIssuePhrase = capturedDetails.issue;
                    }
                }
            }
        }

        // Duration extraction — expanded patterns
        const durationMatch = text.match(/(?:since|for|about|started|happening|from)\s+(yesterday|today|this morning|this afternoon|this evening|tonight|last (?:week|night|month|year)|\d+\s*(?:day|hour|minute|week|month)s?\s*(?:ago)?|a (?:few|couple)\s*(?:day|hour|week|month)s?\s*(?:ago)?|the past (?:few|couple)\s*(?:day|hour|week|month)s?)/i);
        if (durationMatch) capturedDetails.duration = durationMatch[1].trim();
        // Also catch standalone time references like "today" or "yesterday" at end of sentence
        if (!capturedDetails.duration) {
            const standaloneTime = text.match(/\b(today|yesterday|all day|all night|this morning|since morning|since last night|since yesterday)$/i);
            if (standaloneTime) capturedDetails.duration = standaloneTime[1].trim();
        }
        // Only match if the cause phrase is substantial and action-oriented
        const causeMatch = text.match(/(?:after i|because i|since i|after the|because the|after my|because my)\s+(.{5,60}?)(?:\.|,|$)/i);
        if (causeMatch && !capturedDetails.cause) capturedDetails.cause = causeMatch[1].trim();
        // Also catch "after [event]" patterns like "after an update", "after dropping it"
        const causeMatch2 = text.match(/(?:after)\s+((?:an?|the)\s+(?:update|drop|fall|spill|crash|reset|install|upgrade|accident).{0,30}?)(?:\.|,|$)/i);
        if (causeMatch2 && !capturedDetails.cause) capturedDetails.cause = causeMatch2[1].trim();
        // Direct context matching for drop/spill/update/fall causes (e.g. "I fell in the washroom")
        if (!capturedDetails.cause) {
            const fallMatch = text.match(/\b(?:i\s+)?(fell|slipped|tripped)\s+(?:in|on|at|off|from|down)\s+(?:the\s+)?(washroom|bathroom|restroom|toilet|kitchen|floor|stairs|steps|stairs)\b/i);
            if (fallMatch) {
                capturedDetails.cause = fallMatch[0].trim();
            } else {
                const causeMatch3 = text.match(/\b(?:i\s+)?(dropped|spilled|wet|updated|upgraded|reset|fell)\s+(?:it|the\s+\w+|my\s+\w+)?\b/i);
                if (causeMatch3) capturedDetails.cause = causeMatch3[0].trim();
            }
        }
        // Tried fix extraction
        const fixMatch = text.match(/(?:tried|already|attempted)\s+(.{5,60}?)(?:\.|,|$)/i);
        if (fixMatch && !capturedDetails.triedFix) capturedDetails.triedFix = fixMatch[1].trim();
        // Symptom extraction (general fallback) — avoid capturing full sentences
        const symptomMatch = text.match(/(?:it\s+(?:keeps?|is|just))\s+(.{5,40}?)(?:\.|,|$)/i);
        if (symptomMatch && !capturedDetails.symptoms) capturedDetails.symptoms = symptomMatch[1].trim();
 
        // Body part extraction (medical)
        const bodyMatch = text.match(/\b(my\s+)?(head|chest|stomach|back|knee|shoulder|throat|neck|arm|leg|foot|hand|eye|ear|tooth|teeth|heart|lung|liver|kidney|ankle|wrist|hip|elbow)\b/i);
        if (bodyMatch) capturedDetails.bodyPart = bodyMatch[2].toLowerCase();
        // Product name extraction
        const productPatterns = [
            { re: /\b(microsoft\s*365|office\s*365|microsoft\s*office|game\s*pass|xbox\s*live|onedrive|sharepoint|teams|outlook|defender)\b/i, key: 'productName' },
            { re: /\b(netflix|spotify|adobe|photoshop|dropbox|zoom|slack|discord)\b/i, key: 'productName' },
        ];
        for (const p of productPatterns) {
            const m = text.match(p.re);
            if (m) capturedDetails.productName = m[1].trim();
        }
        // Vehicle extraction
        const vehicleMatch = text.match(/\b(\d{4})?\s*(toyota|honda|ford|chevy|chevrolet|bmw|mercedes|audi|nissan|hyundai|kia|subaru|volkswagen|jeep|dodge|tesla|lexus|mazda|volvo)\s*(\w+)?\b/i);
        if (vehicleMatch) {
            capturedDetails.vehicleInfo = [vehicleMatch[1], vehicleMatch[2], vehicleMatch[3]].filter(Boolean).join(' ').trim();
        }
        // Location extraction (plumbing/medical)
        const locMatch = text.match(/\b(kitchen|bathroom|washroom|restroom|toilet|basement|garage|attic|laundry\s*room|living\s*room|bedroom|upstairs|downstairs)\b/i);
        if (locMatch) capturedDetails.location = locMatch[1].toLowerCase();
    }

    // ===== Check if message is gibberish =====
    function isGibberish(text) {
        const clean = text.replace(/\s+/g, '').toLowerCase();
        if (clean.length < 2) return true;
        // Check consonant ratio (gibberish has high consonant density)
        const vowels = (clean.match(/[aeiou]/g) || []).length;
        const ratio = vowels / clean.length;
        if (clean.length > 4 && ratio < 0.1) return true;
        // Check repeating characters
        if (/(.)\1{3,}/.test(clean)) return true;
        // Check keyboard mash patterns
        if (/^[asdfghjklqwertyuiopzxcvbnm]{5,}$/.test(clean) && ratio < 0.2) return true;
        return false;
    }

    // ===== Check if message is just a greeting =====
    function isGreetingMessage(text) {
        const t = text.trim().toLowerCase().replace(/[!.,?]+$/, '');
        const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'yo', 'hola', 'howdy', 'greetings', 'hii', 'hiii', 'hiiii', 'helo', 'heya', 'heyo', 'whats up', "what's up", 'wassup'];
        return greetings.includes(t);
    }

    // ===== Check if message has actual content/issue info =====
    function hasSubstantiveContent(text) {
        const t = text.trim().toLowerCase();
        if (t.length < 4) return false;
        if (isGreetingMessage(t)) return false;
        if (isGibberish(t)) return false;
        const filler = ['ok', 'okay', 'sure', 'yes', 'no', 'yeah', 'yep', 'nope', 'nah', 'hmm', 'hm', 'um', 'uh', 'idk', 'lol', 'lmao', 'haha', 'nice', 'cool', 'great', 'fine', 'alright', 'k', 'kk'];
        if (filler.includes(t)) return false;
        return true;
    }

    // ===== Build Pet Description (safe — prevents breed/type mismatch) =====
    function getPetDescription() {
        if (!capturedDetails.petType) return 'pet';
        const dogBreeds = ['golden retriever', 'labrador', 'german shepherd', 'bulldog', 'french bulldog', 'poodle', 'beagle', 'husky', 'chihuahua', 'rottweiler', 'boxer', 'dachshund', 'pug', 'corgi', 'shih tzu', 'yorkshire terrier', 'maltese', 'doberman', 'great dane', 'pitbull', 'pit bull'];
        const catBreeds = ['persian', 'siamese', 'maine coon', 'bengal', 'ragdoll', 'british shorthair', 'sphynx', 'scottish fold', 'russian blue', 'abyssinian', 'burmese', 'himalayan', 'tabby'];
        if (capturedDetails.petBreed) {
            const breedLower = capturedDetails.petBreed.toLowerCase();
            const petType = capturedDetails.petType;
            // Capitalize breed nicely
            const breedCapitalized = capturedDetails.petBreed.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            // Validate breed matches pet type
            if ((petType === 'dog' || petType === 'puppy') && dogBreeds.includes(breedLower)) {
                return breedCapitalized; // "Bulldog" not "bulldog dog"
            } else if ((petType === 'cat' || petType === 'kitten') && catBreeds.includes(breedLower)) {
                return breedCapitalized; // "Persian" not "persian cat"
            } else if (!dogBreeds.includes(breedLower) && !catBreeds.includes(breedLower)) {
                return `${breedCapitalized} (${petType})`;
            }
            // Breed doesn't match pet type — drop it
            return petType;
        }
        return capturedDetails.petType;
    }

    // ===== Build Echo-Back Acknowledgment =====
    function buildEchoBack() {
        const parts = [];
        if (capturedDetails.device) parts.push(`your ${capturedDetails.device}`);
        if (capturedDetails.petType) {
            parts.push(`your ${getPetDescription()}`);
        }
        if (capturedDetails.vehicleInfo) parts.push(`your ${capturedDetails.vehicleInfo}`);
        if (capturedDetails.productName) parts.push(capturedDetails.productName);
        // Only add bodyPart if the issue doesn't already contain it (prevents "your chest is experiencing chest pain")
        if (capturedDetails.bodyPart && !(capturedDetails.issue && capturedDetails.issue.toLowerCase().includes(capturedDetails.bodyPart))) {
            parts.push(`your ${capturedDetails.bodyPart}`);
        }
        // Only add location as a subject if we have no other subject — don't lead with "in your bathroom"
        if (capturedDetails.location && parts.length === 0) {
            parts.push(`your ${capturedDetails.location}`);
        }

        let issueDesc = '';
        if (capturedDetails.issue) {
            let issue = capturedDetails.issue.toLowerCase();
            // Strip trailing time references that duplicate the duration field
            // e.g. "is dull today" → "is dull" (because duration already has "today")
            if (capturedDetails.duration) {
                const durLower = capturedDetails.duration.toLowerCase();
                issue = issue.replace(new RegExp('\\s*' + durLower.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '\\s*$', 'i'), '').trim();
            }
            // Handle negation patterns: "won't turn on", "not working", "can't connect" etc.
            if (/^(won'?t|can'?t|cannot|not |isn'?t|doesn'?t|unable)/.test(issue)) {
                issueDesc = ` ${issue}`;
            }
            // Already contains "is" or "seems": "is dull", "seems tired", "is sleepy"
            else if (/^(is |seems? |looks? |has been |was )/.test(issue)) {
                issueDesc = ` ${issue}`;
            }
            // Pet/medical symptoms: "throwing up", "vomiting", "limping" etc.
            else if (/^(throwing|vomiting|limping|coughing|sneezing|scratching|shaking|bleeding|swelling|not eating|itching|wheezing|trembling|panting|drooling|hiding|acting)/.test(issue)) {
                issueDesc = ` is ${issue}`;
            }
            // Simple adjectives: "dull", "sleepy", "tired", "lazy", "weak" etc.
            else if (/^(dull|sleepy|tired|lazy|weak|quiet|sad|depressed|lethargic|sluggish|drowsy|listless|inactive|feverish|sick|ill|unwell|restless|aggressive|confused|stiff|wobbly)$/.test(issue)) {
                issueDesc = ` is ${issue}`;
            }
            // Named issues: "chest pain", "blue screen", etc.
            else if (/^(chest pain|headache|back pain|stomach ache|sore throat|blue screen|battery drain)/.test(issue)) {
                issueDesc = ` is experiencing ${issue}`;
            }
            // Plumbing/household issues: "leak", "clog", etc.
            else if (/^(leak|leaking|clog|clogged|drip|dripping|flood|flooding|burst|blocked)/.test(issue)) {
                issueDesc = ` has a ${issue.replace(/ing$/, '')}`;
            }
            // Subscription/billing: "want to cancel", "need a refund"
            else if (/^(want|need|cancel|get a|overcharged|double|unauthorized)/.test(issue)) {
                issueDesc = ''; // Don't append — it reads awkwardly
            }
            else {
                issueDesc = ` is experiencing ${issue}`;
            }
        }
        else if (capturedDetails.symptoms) issueDesc = ` has ${capturedDetails.symptoms.toLowerCase()}`;

        let timeDesc = '';
        if (capturedDetails.duration) {
            // Don't duplicate time if it's already in the issue
            const durInIssue = capturedDetails.issue && capturedDetails.issue.toLowerCase().includes(capturedDetails.duration.toLowerCase());
            if (!durInIssue) timeDesc = ` since ${capturedDetails.duration.toLowerCase().replace(/^since\s*/i, '')}`;
        }

        let causeDesc = '';
        if (capturedDetails.cause) causeDesc = ` after ${capturedDetails.cause.toLowerCase().replace(/^(after|because|when i|since i)\s*/i, '')}`;

        if (parts.length === 0 && !issueDesc) return null;

        let subject = parts.length > 0 ? parts[0] : 'your device';

        // Medical/body part subject handling: if parts is empty but it's medical/bodyPart, make subject "you"
        if (parts.length === 0 && (detectedCategory === 'medical' || capturedDetails.bodyPart)) {
            subject = 'you';
            issueDesc = issueDesc.replace(/^ is /, ' are ').replace(/^ has /, ' have ');
        }

        // Add location as additional context if we have another subject and cause doesn't already contain it
        let locationSuffix = '';
        if (capturedDetails.location && parts.length > 0 && !parts[0].includes(capturedDetails.location)) {
            const causeContainsLocation = capturedDetails.cause && capturedDetails.cause.toLowerCase().includes(capturedDetails.location.toLowerCase());
            if (!causeContainsLocation) {
                locationSuffix = ` in your ${capturedDetails.location}`;
            }
        }

        // Context-appropriate closing
        let closing;
        if (capturedDetails.petType) {
            closing = "I can see how concerning that must be \u2014 let me connect you with a veterinarian right away.";
        } else if (capturedDetails.bodyPart || subject === 'you') {
            closing = "I understand your concern \u2014 let me make sure you get proper guidance.";
        } else if (capturedDetails.location) {
            closing = "Let me connect you with the right specialist right away.";
        } else {
            closing = "That must be frustrating \u2014 let me make sure we get this resolved for you.";
        }

        return `I understand ${subject}${issueDesc}${locationSuffix}${causeDesc}${timeDesc}. ${closing}`;
    }

    // ===== Get Dynamic Expert Type Label =====
    function getExpertTypeLabel() {
        const cat = detectedCategory;
        if (!cat) return 'Support Specialist';
        const labels = {
            ios: capturedDetails.device ? (capturedDetails.device.toLowerCase().includes('iphone') ? 'Smartphone Technician' : capturedDetails.device.toLowerCase().includes('mac') ? 'Computer Technician' : 'Apple Technician') : 'Apple Technician',
            microsoft: capturedDetails.productName ? (capturedDetails.productName.toLowerCase().includes('office') || capturedDetails.productName.toLowerCase().includes('365') ? 'Software Technician' : 'Computer Technician') : (capturedDetails.issue && capturedDetails.issue.toLowerCase().includes('blue screen') ? 'Computer Technician' : 'Software Technician'),
            xbox: 'Gaming Support Specialist',
            android: 'Smartphone Technician',
            plumbing: 'Licensed Plumber',
            legal: 'Licensed Attorney',
            medical: capturedDetails.petType ? 'Veterinarian' : 'Board Certified Physician',
            automotive: 'ASE Certified Mechanic',
            crypto: 'Crypto Finance Specialist',
            account: 'Account Security Specialist',
            veterinary: 'Licensed Veterinarian',
            appliances: 'Appliance & Electronics Specialist',
            finance: 'Certified Public Accountant'
        };
        return labels[cat] || 'Support Specialist';
    }

    // ===== Chatbot Flow  -  Determine Response Based on Phase =====
    function getChatFlowResponse(userMessage) {
        const lower = userMessage.toLowerCase().trim();

        // ===== PRONOUN DISAMBIGUATION FLOW =====
        // If we are currently waiting for disambiguation, process the user's response!
        if (pendingDisambiguation) {
            const isForPet = /\b(dog|cat|puppy|kitten|pet|veterinary|vet|animal|puppies|kittens|she is a dog|she is a cat|referring to my dog|referring to my cat|dog is pregnant|dog has a fever|dog has fever|dog is vomiting)\b/i.test(lower) || 
                            (/\b(yes|yep|yeah|correct|right)\b/i.test(lower) && lower.length < 10);
            const isForHuman = /\b(wife|girlfriend|gf|mother|mom|daughter|sister|girlfriend|woman|wife|person|human|spouse|husband|boyfriend|bf|father|dad|son|brother|child|kids|kid|my wife|wife is pregnant|wife has fever|wife is vomiting)\b/i.test(lower);
            
            const term = pendingDisambiguation.term;
            const pronoun = pendingDisambiguation.pronoun;
            
            if (isForPet || (lower.includes('dog') || lower.includes('cat') || lower.includes('pet'))) {
                // User confirmed it's for their pet!
                pendingDisambiguation = null;
                
                // Keep category locked as Veterinary
                detectedCategory = 'veterinary';
                capturedDetails.petType = capturedDetails.petType || 'dog';
                
                // Add the symptom to the issue!
                if (!capturedDetails.issue) {
                    capturedDetails.issue = term;
                    capturedDetails.rawIssuePhrase = term;
                } else if (!capturedDetails.issue.toLowerCase().includes(term)) {
                    capturedDetails.issue = `${capturedDetails.issue} and ${term}`;
                    capturedDetails.rawIssuePhrase = capturedDetails.issue;
                }
                
                // Rebuild the summary
                chatPhase = 'summary';
                issueSummary = buildSummary();
                
                // Update dynamic left-pane elements to Veterinary
                updateHeroForCategory({ key: 'veterinary', ...categories.veterinary });
                renderLeftSuggestions('veterinary');
                
                return {
                    messages: [
                        `Thank you for confirming! I will make sure the veterinarian has all this information.`,
                        `Here's what I'll tell the Licensed Veterinarian:\n${issueSummary}`,
                        `Is there anything else the Licensed Veterinarian should know before I connect you?`
                    ]
                };
            } else if (isForHuman || (lower.includes('wife') || lower.includes('girlfriend') || lower.includes('person') || lower.includes('human') || lower.includes('wife is') || lower.includes('she is my'))) {
                // User confirmed it's for a person (wife/girlfriend/etc.)!
                pendingDisambiguation = null;
                
                // Transition category to Medical
                detectedCategory = 'medical';
                
                // Clear pet specific fields from details to prevent bleed-over
                capturedDetails.petType = null;
                capturedDetails.petBreed = null;
                
                // Extract the medical details
                capturedDetails.issue = term;
                capturedDetails.rawIssuePhrase = term;
                capturedDetails.bodyPart = null;
                
                // Rebuild the summary
                chatPhase = 'summary';
                issueSummary = buildSummary();
                const personType = lower.includes('wife') ? 'wife' : (lower.includes('girlfriend') ? 'girlfriend' : 'spouse');
                
                // Update dynamic left-pane elements to Medical
                updateHeroForCategory({ key: 'medical', ...categories.medical });
                renderLeftSuggestions('medical');
                
                return {
                    messages: [
                        `I understand! Since your first concern was about your dog (Veterinary) and this concern is for your ${personType} (Medical), we will need to connect you with a Board Certified Physician first to address this urgent medical concern, or we can handle one at a time. Let's proceed with the medical connection for your ${personType}.`,
                        `Here's what I'll tell the Board Certified Physician:\n${issueSummary}`,
                        `Is there anything else the Board Certified Physician should know before I connect you?`
                    ]
                };
            } else {
                // Unclear response, prompt again politely
                return {
                    messages: [
                        `To make sure I route your request to the correct specialist, could you please clarify? Are you referring to your dog (Veterinary) or is this about a person, like your wife or girlfriend (Medical)?`
                    ]
                };
            }
        }

        // Intercept and check for gendered pronoun or ambiguous subject when already in a category (especially Veterinary)
        const hasAmbiguousPronoun = /\b(she|he|her|him|his|hers|they)\b/i.test(lower);
        
        // Detect if the user is bringing up a symptom from another category (like Medical) using a pronoun
        // e.g. "she is pregnant", "she has a fever", "he is vomiting", "he is limping"
        const mentionsPregnant = /\b(pregnant|pregnancy)\b/i.test(lower);
        const mentionsFever = /\b(fever|temperature|chills)\b/i.test(lower);
        const mentionsVomit = /\b(vomiting|throwing up|sick|nausea)\b/i.test(lower);
        const mentionsLimp = /\b(limping|limp|leg|paw|foot)\b/i.test(lower);
        
        const hasAmbiguousSymptom = mentionsPregnant || mentionsFever || mentionsVomit || mentionsLimp;
        
        const mentionsPetClarifier = /\b(dog|cat|puppy|kitten|pet|animal|pup|canine|feline)\b/i.test(lower);
        const mentionsHumanClarifier = /\b(wife|girlfriend|gf|mother|mom|daughter|sister|woman|person|human|spouse|husband|boyfriend|bf|father|dad|son|brother|child|kids|kid)\b/i.test(lower);

        if (detectedCategory === 'veterinary' && hasAmbiguousSymptom && hasAmbiguousPronoun && !mentionsPetClarifier && !mentionsHumanClarifier) {
            // Find which symptom was mentioned to keep as the "term"
            let term = 'unwell';
            if (mentionsPregnant) term = 'pregnant';
            else if (mentionsFever) term = 'fever';
            else if (mentionsVomit) term = 'vomiting';
            else if (mentionsLimp) term = 'limping';

            let pronoun = 'she';
            const sheMatch = lower.match(/\b(she|he|they)\b/i);
            if (sheMatch) pronoun = sheMatch[1];

            // Set disambiguation state!
            pendingDisambiguation = {
                originalCategory: 'veterinary',
                potentialCategory: 'medical',
                originalMessage: userMessage,
                term: term,
                pronoun: pronoun
            };

            return {
                messages: [
                    `Just to make sure we connect you with the right specialist, who are you referring to by '${pronoun}'? Are you referring to your dog (which would require a Licensed Veterinarian), or is this regarding a person, like your wife or girlfriend (which would require a Board Certified Physician)?`
                ]
            };
        }

        // Extract details from EVERY message
        extractDetails(userMessage);

        // ===== CATEGORY DETECTION =====
        // Detect category. Allow re-detection if user clearly switches topics
        // (e.g. talks about dog first, then switches to cat — both are veterinary)
        // But do not let noise override an established category
        const newCat = detectCategory(userMessage);
        if (!detectedCategory) {
            if (newCat) {
                updateHeroForCategory(newCat);
                renderLeftSuggestions(newCat.key);
            }
        } else if (newCat && newCat.key !== detectedCategory) {
            // User switched to a genuinely different category — allow it
            updateHeroForCategory(newCat);
            renderLeftSuggestions(newCat.key);
        }

        // ===== EDGE CASE: Gibberish Detection =====
        if (isGibberish(lower) && !isGreetingMessage(lower)) {
            gibberishCount++;
            userMessages.push(userMessage);
            if (gibberishCount === 1) {
                return { messages: ["I didn't quite catch that. Could you describe the issue you need help with? For example, a tech problem, billing issue, legal question, or anything else you need assistance with."] };
            } else if (gibberishCount === 2) {
                return { messages: ["It seems like there may be a typo. No worries — just type your question or describe the problem you're facing, and I'll connect you with the right expert."] };
            } else {
                return { messages: ["I'm here whenever you're ready to get help! Just describe your issue — whether it's about a device, software, account, medical concern, legal matter, or anything else — and I'll make sure you get expert assistance right away."] };
            }
        }
        gibberishCount = 0; // Reset on valid message

        // ===== EDGE CASE: Repeated Greetings =====
        if (isGreetingMessage(lower)) {
            greetingCount++;
            userMessages.push(userMessage);

            if (greetingCount === 1 && chatPhase === 'greeting') {
                chatPhase = 'understanding';
                return {
                    messages: [
                        "Hello! Welcome to AnswerDesk. \uD83D\uDE0A I'm here to help you get connected with the right expert.",
                        "Could you tell me what issue you're experiencing today? For example, is this about a device, software, account, or something else?"
                    ]
                };
            } else if (greetingCount === 2) {
                return { messages: ["I understand you're saying hello! \uD83D\uDE0A To get you the best help, could you please tell me which product or service you need help with? For instance, is it about a phone, computer, subscription, or something else?"] };
            } else if (greetingCount === 3) {
                return { messages: ["I appreciate you reaching out! I'm ready to help whenever you are. Just type a brief description of what you need — whether it's a tech issue, billing question, medical concern, or anything else — and I'll get you connected with the right specialist."] };
            } else {
                // 4+ repeated greetings — gently persistent, varies response
                const responses = [
                    "Still here and ready to help! Whenever you'd like to describe what's going on, I'll make sure you get expert assistance.",
                    "No rush at all — take your time. When you're ready, just tell me what you need help with and I'll connect you with a specialist.",
                    "I'm standing by! Whether it's a tech issue, account problem, or anything else — just let me know and we'll get it sorted."
                ];
                return { messages: [responses[(greetingCount - 4) % responses.length]] };
            }
        }

        // ===== EDGE CASE: One-word / minimal responses =====
        if (lower.length <= 5 && !isGreetingMessage(lower) && chatPhase !== 'summary') {
            consecutiveShortMsgs++;
            const shortWords = ['yes', 'no', 'ok', 'okay', 'sure', 'yeah', 'yep', 'nope', 'nah', 'fine', 'k', 'kk'];
            if (shortWords.includes(lower.replace(/[!.,?]/g, ''))) {
                userMessages.push(userMessage);
                // Contextual handling based on phase
                if (chatPhase === 'greeting' || chatPhase === 'understanding') {
                    if (lower.includes('yes') || lower.includes('yeah') || lower.includes('yep') || lower.includes('sure') || lower.includes('ok')) {
                        chatPhase = 'understanding';
                        return { messages: ["Great! Could you tell me which product or service you need help with? For example — Microsoft, Apple, a subscription, an account issue, or something else?"] };
                    } else if (lower.includes('no') || lower.includes('nope') || lower.includes('nah')) {
                        return { messages: ["No problem! If you have a different issue — whether it's about a device, software, account, or any other topic — just describe it and I'll help you find the right expert."] };
                    }
                }
                if (consecutiveShortMsgs >= 3) {
                    return { messages: ["I want to make sure I help you effectively. Could you give me a brief description of the issue? Even a few words about what's wrong would help me connect you with the right specialist."] };
                }
                return { messages: ["Could you tell me a bit more about what you need help with? The more details you share, the better I can assist you."] };
            }
        } else {
            consecutiveShortMsgs = 0;
        }

        // Reset greeting count on substantive message
        if (hasSubstantiveContent(lower)) {
            greetingCount = 0;
        }

        // Store user messages for context
        userMessages.push(userMessage);

        switch (chatPhase) {
            case 'greeting':
                chatPhase = 'understanding';
                questionCount = 1;
                return getUnderstandingResponse(lower);

            case 'understanding':
                questionCount++;
                return getUnderstandingResponse(lower);

            case 'summary': {
                const addMore = ['yes', 'yeah', 'yep', 'actually', 'also', 'and', 'one more'];
                const noMore = ['no', 'nope', 'that\'s it', 'that\'s all', 'nothing else', 'no that', 'correct', 'right', 'exactly'];

                // Check if the user is mentioning a completely new issue/pet/topic
                const mentionsNewPet = /\b(my\s+)?(dog|cat|puppy|kitten|bird|hamster|rabbit|fish|parrot|turtle|horse)\b/i.test(lower);
                const mentionsNewDevice = /\b(iphone|ipad|macbook|samsung|pixel|xbox|surface|laptop|computer|phone)\b/i.test(lower);
                if (mentionsNewPet || mentionsNewDevice || (lower.length > 15 && hasSubstantiveContent(lower))) {
                    // User added more context — re-extract and rebuild summary
                    chatPhase = 'summary';
                    issueSummary = buildSummary();
                    const expertLabel = getExpertTypeLabel();
                    const pet = capturedDetails.petType ? getPetDescription() : null;
                    let ackMsg;
                    if (pet) {
                        ackMsg = `Thank you for those details about your ${pet}. I want to make sure our veterinarian has all the right information.`;
                    } else {
                        ackMsg = "Thank you for the additional information.";
                    }
                    return {
                        messages: [
                            ackMsg,
                            `Here's what I'll tell the ${expertLabel}:\n${issueSummary}`,
                            `Is there anything else the ${expertLabel} should know before I connect you?`
                        ]
                    };
                }

                if (addMore.some(w => lower.includes(w)) && !noMore.some(w => lower.includes(w))) {
                    chatPhase = 'understanding';
                    return { messages: ["Sure, go ahead! What else would you like to add?"] };
                }
                chatPhase = 'recommendation';
                return getRecommendationResponse();
            }

            case 'recommendation':
                chatPhase = 'ai_chat';
                aiChatCount = 0;
                return { messages: [generateAIResponse(userMessage)] };

            case 'ai_chat':
                aiChatCount++;
                const aiResponse = generateAIResponse(userMessage);
                if (aiChatCount >= 3 && !escalationOffered) {
                    escalationOffered = true;
                    chatPhase = 're_escalate';
                    const expertLabel = getExpertTypeLabel();
                    return {
                        messages: [
                            aiResponse,
                            `I've provided several suggestions, but for your specific situation, I'd recommend speaking directly with ${getAOrAn(expertLabel)} ${expertLabel} who can provide hands-on, personalized assistance.`
                        ],
                        showConnectOptions: true
                    };
                }
                const unsatisfied = ['not working', 'still', 'didn\'t work', 'doesnt work', 'doesn\'t work', 'not helpful', 'frustrated', 'useless', 'wrong'];
                if (unsatisfied.some(w => lower.includes(w))) {
                    chatPhase = 're_escalate';
                    const expertLabel2 = getExpertTypeLabel();
                    const article = getAOrAn(expertLabel2);
                    const capitalizedArticle = article.charAt(0).toUpperCase() + article.slice(1);
                    return {
                        messages: [`I understand this hasn't fully resolved your issue yet. ${capitalizedArticle} ${expertLabel2} can provide hands-on assistance tailored to your specific setup — would you like to connect with one now?`],
                        showConnectOptions: true
                    };
                }
                return { messages: [aiResponse] };

            case 're_escalate':
                chatPhase = 'ai_chat';
                aiChatCount = 0;
                escalationOffered = false;
                return { messages: [generateAIResponse(userMessage)] };

            default:
                return { messages: ["How can I help you?"] };
        }
    }

    // ===== Smart Context Analysis =====
    function analyzeUserContext() {
        const t = userMessages.join(' ').toLowerCase();
        return {
            // Devices
            iphone: /\biphone\b/.test(t), ipad: /\bipad\b/.test(t),
            mac: /\b(mac|macbook|imac)\b/.test(t), airpods: /\bairpods?\b/.test(t),
            xbox: /\bxbox\b/.test(t), samsung: /\bsamsung\b/.test(t), pixel: /\bpixel\b/.test(t),
            // Issue types
            broken: /\b(broken|broke|damaged)\b/.test(t),
            cracked: /\b(crack|shatter|smash)\b/.test(t),
            wontTurnOn: /won'?t (turn on|start|power)|not (turning on|starting)|dead|black screen/.test(t),
            slow: /\b(slow|lag|sluggish)\b/.test(t),
            frozen: /\b(froze|frozen|freezing|stuck|unresponsive|hang)\b/.test(t),
            water: /\b(water|wet|liquid|spill)\b/.test(t),
            dropped: /\b(drop|dropped|fell|fall)\b/.test(t),
            battery: /\b(battery|drain|dying|won'?t charge|not charging|charger)\b/.test(t),
            screen: /\b(screen|display|flicker|touch)\b/.test(t),
            updateIssue: /\b(update|upgrad|install)\b/.test(t),
            error: /\b(error|crash|bug|glitch|blue screen|bsod)\b/.test(t),
            locked: /\b(lock|locked|password|passcode|forgot|can'?t (access|log|sign|get in))\b/.test(t),
            connectivity: /\b(wifi|wi-fi|internet|bluetooth|connect|signal|network)\b/.test(t),
            audio: /\b(sound|audio|speaker|mic|volume|hear)\b/.test(t),
            camera: /\b(camera|photo|picture)\b/.test(t),
            storage: /\b(storage|space|full|memory)\b/.test(t),
            // Timing & cause
            hasTiming: /\b(yesterday|today|last (week|night|month)|this (morning|afternoon)|ago|recently|just|suddenly|started|since)\b/.test(t),
            hasCause: /\b(after|because|when i|dropped|fell|spill|update|install)\b/.test(t),
            hasTriedFix: /\b(tried|attempt|already|reset|restart|reboot|reinstall)\b/.test(t),
            isUrgent: /\b(urgent|emergency|asap|immediately|deadline)\b/.test(t),
            // Legal
            legalContract: /\b(contract|agreement|terms|breach|violation)\b/.test(t),
            legalFamily: /\b(divorce|custody|child support|alimony|separation)\b/.test(t),
            legalEmployment: /\b(employ|fired|laid off|wrongful|termination|discrimination|harassment|workplace)\b/.test(t),
            legalImmigration: /\b(immigration|visa|citizenship|green card|deportation)\b/.test(t),
            legalBankruptcy: /\b(bankrupt|debt|creditor|foreclosure)\b/.test(t),
            legalLandlord: /\b(landlord|tenant|lease|rent|eviction)\b/.test(t),
            legalInjury: /\b(injur|accident|malpractice|negligence|sue|lawsuit)\b/.test(t),
            // Medical
            pain: /\b(pain|hurt|ache|sore)\b/.test(t),
            fever: /\b(fever|temperature|chills)\b/.test(t),
            rash: /\b(rash|itch|hives|skin|bump|swell)\b/.test(t),
            breathing: /\b(breath|cough|wheez|chest)\b/.test(t),
            digestive: /\b(stomach|nausea|vomit|diarrhea)\b/.test(t),
            mentionsMeds: /\b(medic|pill|drug|prescription|taking)\b/.test(t),
            // Automotive
            vehicle: /\b(car|truck|suv|van|vehicle)\b/.test(t),
            vehicleMake: /\b(toyota|honda|ford|chevy|chevrolet|bmw|mercedes|audi|nissan|hyundai|kia|subaru|volkswagen|jeep|dodge|tesla|lexus)\b/.test(t),
            engine: /\b(engine|motor|won'?t start|stall|overheat)\b/.test(t),
            brakes: /\b(brake|stopping|squeak|grind|pedal)\b/.test(t),
            transmission: /\b(transmission|gear|shift|clutch)\b/.test(t),
            warningLight: /\b(warning|check engine|light|dashboard)\b/.test(t),
            tire: /\b(tire|flat|pressure|alignment)\b/.test(t),
            // Plumbing
            leak: /\b(leak|drip|flooding|flood)\b/.test(t),
            clog: /\b(clog|block|backed up|slow drain|overflow)\b/.test(t),
            plumbLocation: /\b(kitchen|bathroom|basement|toilet|sink|shower|faucet|pipe|water heater)\b/.test(t),
            // Crypto
            cryptoPlatform: /\b(binance|coinbase|kraken|metamask|ledger|crypto\.com|robinhood|trust wallet)\b/.test(t),
            cryptoAccess: /\b(locked|access|login|password|2fa|verification|verify)\b/.test(t),
            cryptoTransaction: /\b(withdraw|transfer|send|deposit|transaction|pending|missing|lost)\b/.test(t),
            cryptoTrading: /\b(trade|trading|buy|sell|order)\b/.test(t),
            // Microsoft
            windows: /\b(windows|win10|win11)\b/.test(t),
            office: /\b(office|365|word|excel|powerpoint|outlook|teams)\b/.test(t),
            activation: /\b(activat|license|product key)\b/.test(t),
            bsod: /\b(blue screen|bsod|stop code)\b/.test(t),
            // Xbox
            controller: /\b(controller|joystick|thumbstick|drift)\b/.test(t),
            gamepass: /\b(game pass|subscription|gamepass)\b/.test(t),
            // Account
            accountPlatform: /\b(gmail|facebook|instagram|twitter|tiktok|snapchat|amazon|paypal|netflix|spotify)\b/.test(t),
            // Appliances & Electronics
            applianceType: /\b(refrigerator|fridge|washer|washing machine|dryer|dishwasher|tv|television|printer|microwave|soundbar)\b/.test(t),
            refrigerator: /\b(refrigerator|fridge|freezer|ice maker)\b/.test(t),
            washer: /\b(washer|washing machine|spin|drain)\b/.test(t),
            television: /\b(tv|television|backlight|hdmi)\b/.test(t),
            printer: /\b(printer|printing|spooler)\b/.test(t),
            // Taxes & Finance
            financeType: /\b(tax|taxes|cpa|irs|audit|401k|ira|retirement|mortgage|debt|budget)\b/.test(t),
            taxAudit: /\b(audit|irs|cp2000|refund)\b/.test(t),
            retirement: /\b(401k|ira|retirement|rollover)\b/.test(t),
            credit: /\b(credit|score|debt|consolidation)\b/.test(t),
            // Helpers
            hasAnyIssue: false, // set below
            deviceName: '', // set below
            issueName: '', // set below
            t: t
        };
    }

    // ===== Get device name from context =====
    function getDeviceName(ctx) {
        if (ctx.iphone) return 'iPhone';
        if (ctx.ipad) return 'iPad';
        if (ctx.mac) return 'Mac';
        if (ctx.airpods) return 'AirPods';
        if (ctx.xbox) return 'Xbox';
        if (ctx.samsung) return 'Samsung device';
        if (ctx.pixel) return 'Pixel';
        return null;
    }

    // ===== Get issue description from context =====
    function getIssueLabel(ctx) {
        if (ctx.cracked) return 'cracked screen';
        if (ctx.wontTurnOn) return "won't power on";
        if (ctx.frozen) return 'freezing';
        if (ctx.slow) return 'performance';
        if (ctx.water) return 'water damage';
        if (ctx.battery) return 'battery';
        if (ctx.screen) return 'screen';
        if (ctx.connectivity) return 'connectivity';
        if (ctx.audio) return 'audio';
        if (ctx.camera) return 'camera issue';
        if (ctx.storage) return 'storage issue';
        if (ctx.updateIssue) return 'update issue';
        if (ctx.error) return 'error/crash';
        if (ctx.locked) return 'access/login issue';
        if (ctx.broken) return 'not working properly';
        if (ctx.dropped) return 'damage from a drop';
        return null;
    }

    // ===== Smart Personalized Acknowledgment =====
    function getSmartAck(catKey, ctx) {
        const device = getDeviceName(ctx);
        const issue = getIssueLabel(ctx);

        switch (catKey) {
            case 'ios': {
                if (device && ctx.broken) return `I'm sorry to hear your ${device} isn't working properly. Let me help you get this resolved.`;
                if (device && issue) return `I'm sorry to hear your ${device} has a ${issue} problem. Let me help you get this resolved.`;
                if (device) return `I'm sorry to hear your ${device} is having issues. Let me help you with this.`;
                if (issue) return `I understand you're dealing with ${issue} on your Apple device. Let me help.`;
                return "I understand you need help with your Apple device. Let me make sure we get this resolved for you.";
            }
            case 'microsoft': {
                if (ctx.bsod) return "I understand you're getting blue screen errors  -  that can be very disruptive. Let me help.";
                if (ctx.activation) return "I see you're dealing with an activation or licensing issue. Let me help get this sorted.";
                if (ctx.office) return "I understand you're having trouble with Microsoft Office. Let me help.";
                if (issue) return `I understand you're experiencing ${issue} with Windows. Let me help you out.`;
                return "I understand you're experiencing a Microsoft/Windows issue. Let me help you get it sorted.";
            }
            case 'xbox': {
                if (ctx.controller) return "I understand you're having trouble with your Xbox controller. Let's get this figured out.";
                if (ctx.gamepass) return "I see you're having an issue with Game Pass. Let me help.";
                if (issue) return `I understand your Xbox is experiencing ${issue}. Let's get this sorted.`;
                return "I understand you're having trouble with your Xbox. Let's get this figured out.";
            }
            case 'android': {
                const dev = ctx.samsung ? 'Samsung' : ctx.pixel ? 'Pixel' : 'Android device';
                if (issue) return `I understand your ${dev} is experiencing ${issue}. Let me help you out.`;
                return `I understand you're having trouble with your ${dev}. Let me help.`;
            }
            case 'legal': {
                if (ctx.legalContract) return "I understand you're dealing with a contract or breach of terms situation. That's something our legal specialists handle regularly.";
                if (ctx.legalFamily) return "I understand you're dealing with a family law matter. I want to make sure I connect you with the right attorney.";
                if (ctx.legalEmployment) return "I understand you're facing a workplace or employment issue. Let me connect you with a specialist.";
                if (ctx.legalImmigration) return "I understand you need help with an immigration matter. Let me connect you with the right attorney.";
                if (ctx.legalBankruptcy) return "I understand you're dealing with a financial/debt situation. Let me help you find the right specialist.";
                if (ctx.legalLandlord) return "I understand you're dealing with a landlord/tenant issue. Let me connect you with a property law specialist.";
                if (ctx.legalInjury) return "I'm sorry to hear about your situation. Let me connect you with a personal injury specialist.";
                return "I understand you're looking for legal assistance. I want to make sure I connect you with the right attorney.";
            }
            case 'medical': {
                if (ctx.pain) return "I'm sorry to hear you're in pain. Let me help you get proper guidance.";
                if (ctx.breathing) return "Breathing difficulties can be concerning. Let me connect you with the right medical professional.";
                if (ctx.digestive) return "I understand you're experiencing digestive issues. Let me help you get the right guidance.";
                if (ctx.rash) return "I understand you're dealing with a skin concern. Let me connect you with the right specialist.";
                return "I understand you're looking for medical guidance. I want to make sure you get the right help.";
            }
            case 'automotive': {
                const v = capturedDetails.vehicleInfo || 'vehicle';
                if (ctx.engine) return `I understand your ${v} is having engine trouble. Let me help you figure this out.`;
                if (ctx.brakes) return `Brake issues on your ${v} are important to address quickly. Let me connect you with the right mechanic.`;
                if (ctx.warningLight) return `I see your ${v} has a warning light. Let me help you understand what it means.`;
                if (ctx.tire) return `I understand your ${v} has a tire issue. Let me help.`;
                if (capturedDetails.issue) return `I understand your ${v} ${capturedDetails.issue}. Let me help you out.`;
                return `I understand you're dealing with a ${v} issue. Let me help you get connected with the right mechanic.`;
            }
            case 'plumbing': {
                if (ctx.leak) return "A leak can cause serious damage if not addressed. Let me help you right away.";
                if (ctx.clog) return "I understand you're dealing with a clog or drainage issue. Let me connect you with the right specialist.";
                return "I understand you're dealing with a plumbing issue. Let me connect you with the right specialist.";
            }
            case 'crypto': {
                const platform = ctx.cryptoPlatform ? userMessages.join(' ').match(/\b(binance|coinbase|kraken|metamask|ledger)\b/i)?.[0] : null;
                if (platform && ctx.cryptoAccess) return `I understand you're having trouble accessing your ${platform} account. Let me help.`;
                if (platform && ctx.cryptoTransaction) return `I see you're dealing with a transaction issue on ${platform}. Let me help.`;
                if (platform) return `I understand you're having an issue with ${platform}. Let me get you the right help.`;
                if (ctx.cryptoAccess) return "I understand you're having trouble accessing your crypto account. Let me help.";
                if (ctx.cryptoTransaction) return "I see you're dealing with a crypto transaction issue. Let me help.";
                return "I understand you need help with a crypto or finance related matter. Let me get you the right assistance.";
            }
            case 'account': {
                if (ctx.locked) return "Being locked out of your account is frustrating. Let me help you regain access.";
                return "I understand you're having trouble with an account. Let me help you get access.";
            }
            case 'veterinary': {
                const pet = getPetDescription();
                if (capturedDetails.petType && capturedDetails.issue) {
                    const issue = capturedDetails.issue.toLowerCase();
                    // Build natural sentence with the issue
                    if (/^(is |seems? |looks? |has been |was )/.test(issue)) {
                        return `I understand your ${pet} ${issue}. I can see how concerning that must be \u2014 let me connect you with a veterinarian right away.`;
                    } else if (/^(dull|sleepy|tired|lazy|weak|quiet|sad|lethargic|sluggish|drowsy|sick|ill|unwell|restless|inactive)$/.test(issue)) {
                        return `I understand your ${pet} is ${issue}. I can see how concerning that must be \u2014 let me connect you with a veterinarian right away.`;
                    }
                    return `I understand your ${pet} is ${issue}. I can see how concerning that must be \u2014 let me connect you with a veterinarian right away.`;
                }
                if (capturedDetails.petType) return `I'm sorry to hear your ${pet} isn't feeling well. Let me connect you with a licensed veterinarian right away.`;
                return "I understand you need help with a pet health concern. Let me connect you with a veterinarian.";
            }
            case 'subscription': {
                const product = capturedDetails.productName || '';
                if (/cancel/i.test(userMessages.join(' '))) return `I understand you want to cancel ${product ? 'your ' + product + ' subscription' : 'a subscription'}. Let me connect you with a billing specialist.`;
                if (/refund/i.test(userMessages.join(' '))) return `I understand you're looking for a refund ${product ? 'for ' + product : ''}. Let me connect you with the right billing specialist.`;
                return `I understand you have a billing or subscription concern${product ? ' regarding ' + product : ''}. Let me get you connected with a specialist.`;
            }
            case 'appliances': {
                if (ctx.refrigerator) return "I understand your refrigerator is having cooling or ice maker issues. Let me help you troubleshoot.";
                if (ctx.washer) return "I understand you're experiencing draining or spinning issues with your washing machine. Let's get this sorted.";
                if (ctx.television) return "I see your Smart TV screen is blank or has video connection issues. Let me help.";
                if (ctx.printer) return "I understand your printer is offline or failing to print. Let's troubleshoot the print spooler.";
                return "I understand you're dealing with an appliance or home electronics concern. Let me help you get it sorted.";
            }
            case 'finance': {
                if (ctx.taxAudit) return "I understand you're dealing with an IRS tax audit CP2000 notice or missing refund. Let me help you get proper guidance.";
                if (ctx.retirement) return "I see you're looking for guidance on a 401k rollover or retirement accounts. Let me help.";
                if (ctx.credit) return "I understand you're working on debt consolidation or improving your credit score. Let's get you connected with a specialist.";
                return "I understand you have a personal finance or tax-related concern. Let's get you connected with a financial specialist.";
            }
            default:
                return "Thank you for reaching out. I want to make sure I fully understand your situation.";
        }
    }

    // ===== Smart Follow-Up Question Selection =====
    function getSmartQuestion(catKey, ctx, round) {
        // Build pool of possible questions, each with a 'skip' condition
        // Only ask questions where the skip condition is FALSE
        let pool = [];

        switch (catKey) {
            case 'ios':
                pool = [
                    { skip: ctx.iphone || ctx.ipad || ctx.mac || ctx.airpods, q: "Which Apple device is this about - iPhone, iPad, Mac, or another?" },
                    { skip: ctx.broken || ctx.cracked || ctx.wontTurnOn || ctx.slow || ctx.frozen || ctx.water || ctx.battery || ctx.screen || ctx.connectivity || ctx.audio || ctx.camera || ctx.storage || ctx.updateIssue || ctx.error || ctx.locked || ctx.dropped, q: "Could you describe what's going on with it? For instance, is it a screen issue, not turning on, or something else?" },
                    { skip: ctx.hasCause || ctx.dropped || ctx.water || ctx.updateIssue, q: "Do you remember if anything specific happened before this started - like a drop, water exposure, or a software update?" },
                    { skip: ctx.hasTiming, q: "When did this issue first start?" },
                    { skip: false, q: ctx.broken || ctx.cracked || ctx.dropped ? "Can you still use the device at all, or is it completely non-functional?" : null },
                    { skip: false, q: ctx.wontTurnOn ? "When you try to charge it, do you see any lights or indicators?" : null },
                    { skip: false, q: ctx.slow ? "Does it happen all the time or only when using certain apps?" : null },
                    { skip: false, q: ctx.battery ? "How quickly does the battery drain, and does the device get warm?" : null },
                    { skip: false, q: ctx.screen ? "Is it a visual issue (flickering, lines) or a touch responsiveness issue?" : null },
                    { skip: ctx.hasTriedFix, q: "Have you tried anything so far to fix it, like restarting or resetting?" },
                ];
                break;
            case 'microsoft':
                pool = [
                    { skip: ctx.windows || ctx.office || ctx.bsod || ctx.activation, q: "Is this related to Windows itself, Microsoft Office, or another Microsoft product?" },
                    { skip: ctx.broken || ctx.slow || ctx.frozen || ctx.error || ctx.bsod || ctx.wontTurnOn || ctx.locked || ctx.activation || ctx.updateIssue || ctx.connectivity, q: "Could you describe what's happening  -  any error messages, freezing, slowness, or crashes?" },
                    { skip: ctx.hasTiming, q: "When did this issue first start?" },
                    { skip: ctx.hasCause, q: "Did anything change before this started  -  like a Windows update, new software install, or hardware change?" },
                    { skip: false, q: ctx.bsod ? "Do you remember the error code or stop code shown on the blue screen?" : null },
                    { skip: false, q: ctx.slow ? "Does it happen at startup or throughout the day?" : null },
                    { skip: false, q: ctx.activation ? "Are you activating a new installation or is a previously activated system now showing it's not activated?" : null },
                    { skip: ctx.hasTriedFix, q: "Have you tried any steps so far, like restarting or running troubleshooters?" },
                ];
                break;
            case 'xbox':
                pool = [
                    { skip: ctx.controller || ctx.gamepass || ctx.wontTurnOn || ctx.connectivity, q: "Is this a controller issue, console issue, or something related to your account/Game Pass?" },
                    { skip: ctx.hasTiming, q: "When did this start happening?" },
                    { skip: false, q: ctx.controller ? "Is the controller not connecting at all, or is it connected but behaving oddly (drift, buttons not working)?" : null },
                    { skip: false, q: ctx.wontTurnOn ? "When you press the power button, does anything happen at all  -  any lights or sounds?" : null },
                    { skip: false, q: ctx.gamepass ? "Are specific games not loading, or is it a subscription/billing issue?" : null },
                    { skip: ctx.hasTriedFix, q: "Have you tried basic steps like restarting the console or re-pairing the controller?" },
                ];
                break;
            case 'android':
                pool = [
                    { skip: ctx.samsung || ctx.pixel, q: "What brand/model is your device  -  Samsung Galaxy, Google Pixel, or another?" },
                    { skip: ctx.broken || ctx.slow || ctx.frozen || ctx.error || ctx.battery || ctx.screen || ctx.connectivity || ctx.locked || ctx.updateIssue, q: "Could you describe what's going on  -  performance issues, app problems, connectivity, or something else?" },
                    { skip: ctx.hasTiming, q: "When did this issue start?" },
                    { skip: ctx.hasCause, q: "Did anything trigger this  -  like an update, new app install, or drop?" },
                    { skip: false, q: ctx.slow ? "Does it happen system-wide or only with certain apps?" : null },
                    { skip: ctx.hasTriedFix, q: "Have you tried restarting the device or clearing the app cache?" },
                ];
                break;
            case 'legal':
                pool = [
                    { skip: ctx.legalContract || ctx.legalFamily || ctx.legalEmployment || ctx.legalImmigration || ctx.legalBankruptcy || ctx.legalLandlord || ctx.legalInjury, q: "Could you tell me what type of legal matter this is  -  contract, family law, employment, immigration, or something else?" },
                    { skip: false, q: ctx.legalContract ? "Is this a business contract, service agreement, employment contract, or lease? And are you the party that was breached against or the one being accused?" : null },
                    { skip: false, q: ctx.legalFamily ? "Could you share a bit more about your situation  -  is it an ongoing case or are you just starting the process?" : null },
                    { skip: false, q: ctx.legalEmployment ? "Were you recently terminated, or is this about an ongoing workplace situation?" : null },
                    { skip: false, q: ctx.legalLandlord ? "Are you the tenant or the landlord in this situation?" : null },
                    { skip: false, q: ctx.legalInjury ? "Could you briefly describe what happened and approximately when the incident occurred?" : null },
                    { skip: ctx.hasTiming, q: "How long has this situation been going on?" },
                    { skip: false, q: "Have you consulted with any attorney or taken any legal action so far?" },
                    { skip: ctx.isUrgent || ctx.hasTiming, q: "Is there any urgency  -  like an upcoming court date or filing deadline?" },
                ];
                break;
            case 'medical':
                pool = [
                    { skip: ctx.pain || ctx.fever || ctx.rash || ctx.breathing || ctx.digestive, q: "Could you describe what symptoms you're experiencing?" },
                    { skip: false, q: ctx.pain ? "Where exactly is the pain, and would you describe it as sharp, dull, throbbing, or burning?" : null },
                    { skip: false, q: ctx.breathing ? "Is this constant or does it come and go? And how severe would you rate it on a scale of 1-10?" : null },
                    { skip: false, q: ctx.rash ? "Where on your body is it, and has it spread or changed since you first noticed it?" : null },
                    { skip: ctx.hasTiming, q: "When did these symptoms first start?" },
                    { skip: ctx.mentionsMeds, q: "Are you currently taking any medications or supplements?" },
                    { skip: false, q: "Have you seen a doctor about this before, or is this the first time you're seeking advice?" },
                ];
                break;
            case 'automotive':
                pool = [
                    { skip: ctx.vehicleMake, q: "What's the make, model, and approximate year of your vehicle?" },
                    { skip: ctx.engine || ctx.brakes || ctx.transmission || ctx.warningLight || ctx.tire || ctx.battery || ctx.broken || ctx.slow, q: "Could you describe what's happening  -  unusual sounds, warning lights, or performance problems?" },
                    { skip: false, q: ctx.engine ? "When you try to start it, do you hear clicking, grinding, or nothing at all?" : null },
                    { skip: false, q: ctx.warningLight ? "Which warning light is on  -  check engine, oil, temperature, or another?" : null },
                    { skip: false, q: ctx.brakes ? "Do you hear any noise when braking, like squealing or grinding?" : null },
                    { skip: ctx.hasTiming, q: "When did this first start, and does it happen every time or intermittently?" },
                    { skip: ctx.hasCause, q: "Did anything change before this started  -  like extreme weather, a long trip, or recent maintenance?" },
                ];
                break;
            case 'plumbing':
                pool = [
                    { skip: ctx.leak || ctx.clog, q: "Is this a leak, clog, water heater issue, or something else?" },
                    { skip: ctx.plumbLocation, q: "Where in your home is the problem  -  kitchen, bathroom, basement, or elsewhere?" },
                    { skip: false, q: ctx.leak ? "How bad is the leak  -  a slow drip or active flowing water? Is there water damage?" : null },
                    { skip: false, q: ctx.clog ? "Is the drain completely blocked or just draining slowly?" : null },
                    { skip: ctx.hasTiming, q: "When did you first notice this?" },
                    { skip: ctx.isUrgent, q: "Is this causing active damage or is it something you can manage for now?" },
                ];
                break;
            case 'crypto':
                pool = [
                    { skip: ctx.cryptoPlatform, q: "Which platform or wallet is this related to  -  Binance, Coinbase, MetaMask, or another?" },
                    { skip: ctx.cryptoAccess || ctx.cryptoTransaction || ctx.cryptoTrading, q: "Is this about account access, a transaction issue, or a trading problem?" },
                    { skip: false, q: ctx.cryptoAccess ? "Do you still have access to the email and phone number linked to your account?" : null },
                    { skip: false, q: ctx.cryptoTransaction ? "How long has the transaction been pending, and do you have the transaction hash/ID?" : null },
                    { skip: false, q: ctx.cryptoTrading ? "Are you getting a specific error when trying to trade, or is the feature unavailable?" : null },
                    { skip: ctx.hasTiming, q: "When did this issue start?" },
                    { skip: false, q: "Have you already contacted the platform's official support?" },
                ];
                break;
            case 'account':
                pool = [
                    { skip: ctx.accountPlatform || ctx.cryptoPlatform, q: "Which service or platform is this account for?" },
                    { skip: ctx.locked || ctx.error || ctx.updateIssue, q: "What's happening  -  are you locked out, getting an error, or having trouble with verification?" },
                    { skip: false, q: ctx.locked ? "Do you still have access to the email or phone number associated with this account?" : null },
                    { skip: ctx.hasTiming, q: "When did this issue first start?" },
                    { skip: false, q: "Have you tried the platform's password reset or account recovery option?" },
                ];
                break;
            case 'veterinary':
                pool = [
                    { skip: capturedDetails.petType, q: "What type of pet is this about \u2014 dog, cat, bird, or another?" },
                    { skip: capturedDetails.petBreed, q: capturedDetails.petType === 'dog' || capturedDetails.petType === 'puppy' ? "What breed is your dog?" : capturedDetails.petType === 'cat' || capturedDetails.petType === 'kitten' ? "What breed is your cat?" : null },
                    { skip: capturedDetails.issue || ctx.pain || ctx.fever || ctx.rash || ctx.digestive, q: "Could you describe what's going on \u2014 any changes in behavior, appetite, energy level, or visible symptoms?" },
                    { skip: ctx.hasTiming, q: "When did you first notice this?" },
                    { skip: false, q: "Has your pet been eating and drinking normally?" },
                    { skip: false, q: "Has your pet gotten into anything unusual recently \u2014 plants, chemicals, human food, or foreign objects?" },
                    { skip: false, q: "How old is your pet, and are they up to date on vaccinations?" },
                ];
                break;
            case 'subscription':
                pool = [
                    { skip: capturedDetails.productName, q: "Which service or subscription is this about — Microsoft 365, Netflix, Spotify, or another?" },
                    { skip: false, q: /cancel/i.test(userMessages.join(' ')) ? "What's the reason for cancellation? This helps us process your request more effectively." : null },
                    { skip: false, q: /refund/i.test(userMessages.join(' ')) ? "When was the charge made, and approximately how much was it?" : null },
                    { skip: false, q: /renew/i.test(userMessages.join(' ')) ? "When is your next renewal date?" : null },
                    { skip: false, q: "Do you have access to the account where the subscription is managed?" },
                ];
                break;
            case 'appliances':
                pool = [
                    { skip: ctx.refrigerator || ctx.washer || ctx.television || ctx.printer, q: "Which appliance or electronic device is this about - refrigerator, washer, smart TV, printer, or another?" },
                    { skip: ctx.hasTiming, q: "When did this issue first start?" },
                    { skip: false, q: ctx.refrigerator ? "Is the refrigerator completely warm, or is only the ice maker failing to work?" : null },
                    { skip: false, q: ctx.washer ? "Does the machine hum but refuse to spin, or is it failing to drain water completely?" : null },
                    { skip: false, q: ctx.television ? "Do you hear sound coming from the TV even though the screen is completely black?" : null },
                    { skip: false, q: ctx.printer ? "Is the printer connected via Wi-Fi or directly with a USB cable?" : null },
                    { skip: ctx.hasTriedFix, q: "Have you tried basic steps like unplugging the appliance or restarting it?" }
                ];
                break;
            case 'finance':
                pool = [
                    { skip: ctx.taxAudit || ctx.retirement || ctx.credit, q: "Is this regarding an IRS tax audit, retirement planning, debt management, or another financial concern?" },
                    { skip: ctx.hasTiming, q: "How long has this financial or tax situation been going on?" },
                    { skip: false, q: ctx.taxAudit ? "Did you receive a specific CP2000 adjustment letter or another IRS notice number?" : null },
                    { skip: false, q: ctx.retirement ? "Are you rolling over an old employer 401k or opening a new Traditional/Roth IRA?" : null },
                    { skip: false, q: ctx.credit ? "Are you trying to lower your credit card utilization or dispute errors on your credit report?" : null },
                    { skip: false, q: "Have you already filed your tax returns for this year?" }
                ];
                break;
            default:
                pool = [
                    { skip: false, q: "Could you tell me a bit more about what you need help with? What's the specific issue or question you have?" },
                    { skip: false, q: "Could you give me some more context? For instance, what's the main outcome you're hoping to achieve?" },
                    { skip: ctx.hasTiming, q: "How long has this been going on?" },
                    { skip: ctx.isUrgent, q: "How urgently do you need this resolved?" },
                    { skip: ctx.hasTriedFix, q: "Have you already tried anything to resolve this, or is this your first step?" },
                ];
        }

        // Filter: remove skipped questions, null questions, and already-asked questions
        const available = pool.filter(p => !p.skip && p.q != null && !askedQuestions.includes(p.q));

        if (available.length === 0) {
            // All questions answered  -  use a generic deepening question
            return "Is there anything else about this situation that you think would be helpful for the specialist to know?";
        }

        // Pick the first available (they're ordered by priority)
        const chosen = available[0].q;
        askedQuestions.push(chosen);
        return chosen;
    }

    // ===== Understanding Phase - Smart Personalized Questions (2 questions then CTA) =====
    function getUnderstandingResponse(lower) {
        const catKey = detectedCategory || null;
        const ctx = analyzeUserContext();

        if (questionCount === 1) {
            // Use echo-back if we have captured details, otherwise fall back to smart ack
            const echoBack = buildEchoBack();
            const ack = echoBack || getSmartAck(catKey, ctx);
            const question = getSmartQuestion(catKey, ctx, 1);
            return { messages: [ack, question] };
        }

        // After 2nd question - move to summary + recommendation (was 3, now 2)
        chatPhase = 'summary';
        // Build a concise acknowledgment that references context without repeating echo-back
        let ackMsg = "Thank you for those details, that's very helpful.";
        if (capturedDetails.device && capturedDetails.issue) {
            ackMsg = `Thank you for those details about your ${capturedDetails.device}. I have a clear picture of what's going on.`;
        } else if (capturedDetails.petType) {
            const pet = getPetDescription();
            ackMsg = `Thank you for those details about your ${pet}. I want to make sure our veterinarian has all the right information.`;
        } else if (capturedDetails.bodyPart) {
            ackMsg = `Thank you for sharing those details. I want to make sure the doctor has the full picture.`;
        } else if (capturedDetails.vehicleInfo) {
            ackMsg = `Thank you for those details about your ${capturedDetails.vehicleInfo}. Let me get this to the right mechanic.`;
        } else if (capturedDetails.productName) {
            ackMsg = `Thank you for those details about ${capturedDetails.productName}. I have everything I need.`;
        }

        issueSummary = buildSummary();
        const expertLabel = getExpertTypeLabel();

        return {
            messages: [
                ackMsg,
                `Here's what I'll tell the ${expertLabel}:\n${issueSummary}`,
                `Is there anything else the ${expertLabel} should know before I connect you?`
            ]
        };
    }

    // ===== Build Summary from Captured Details =====
    function buildSummary() {
        const cat = detectedCategory ? categories[detectedCategory] : null;
        const categoryLabel = cat ? cat.label : 'General Support';
        let lines = [];

        // Device/Subject
        if (capturedDetails.device) lines.push(`\u2022 Device: ${capturedDetails.device}`);
        if (capturedDetails.petType) {
            lines.push(`\u2022 Pet: ${getPetDescription()}`);
        }
        if (capturedDetails.vehicleInfo) lines.push(`\u2022 Vehicle: ${capturedDetails.vehicleInfo}`);
        if (capturedDetails.productName) lines.push(`\u2022 Product: ${capturedDetails.productName}`);
        if (capturedDetails.bodyPart) lines.push(`\u2022 Area of concern: ${capturedDetails.bodyPart}`);
        if (capturedDetails.location) lines.push(`\u2022 Location: ${capturedDetails.location}`);

        // Issue
        if (capturedDetails.issue) lines.push(`\u2022 Issue: ${capturedDetails.issue}`);
        else if (capturedDetails.symptoms) lines.push(`\u2022 Symptoms: ${capturedDetails.symptoms}`);

        // Duration
        if (capturedDetails.duration) lines.push(`\u2022 Duration: ${capturedDetails.duration}`);

        // Cause
        if (capturedDetails.cause) lines.push(`\u2022 Trigger: ${capturedDetails.cause}`);

        // What they tried
        if (capturedDetails.triedFix) lines.push(`\u2022 Already tried: ${capturedDetails.triedFix}`);

        // If no structured details captured, fall back to user messages
        if (lines.length === 0) {
            const mainIssue = userMessages.find(m => m.length > 10) || userMessages[0];
            if (mainIssue) lines.push(`\u2022 Issue: ${mainIssue}`);
            const additional = userMessages.filter(m => m !== mainIssue && m.length > 5);
            if (additional.length > 0) lines.push(`\u2022 Additional details: ${additional.join('; ')}`);
        }

        lines.unshift(`\u2022 Category: ${categoryLabel}`);
        return lines.join('\n');
    }

    // ===== Recommendation Phase  -  Suggest Phone Call with Dynamic Expert Label =====
    function getRecommendationResponse() {
        const expertLabel = getExpertTypeLabel();

        // Build dynamic CTA title based on captured issue
        let ctaTitle = 'Get your issue resolved now';
        if (capturedDetails.device && capturedDetails.issue) {
            ctaTitle = `Get your ${capturedDetails.device} ${capturedDetails.issue} issue resolved now`;
        } else if (capturedDetails.petType) {
            ctaTitle = `Get help for your ${getPetDescription()} now`;
        } else if (capturedDetails.vehicleInfo) {
            ctaTitle = `Get your ${capturedDetails.vehicleInfo} issue resolved now`;
        } else if (capturedDetails.productName) {
            ctaTitle = `Get your ${capturedDetails.productName} issue resolved now`;
        } else if (capturedDetails.bodyPart) {
            ctaTitle = `Get expert guidance for your ${capturedDetails.bodyPart} concern now`;
        } else if (detectedCategory && categories[detectedCategory]) {
            ctaTitle = `Get your ${categories[detectedCategory].label} issue resolved now`;
        }

        // Store for CTA panel
        window._dynamicCTATitle = ctaTitle;

        const article = getAOrAn(expertLabel);

        return {
            messages: [
                `Thank you for confirming. I'll connect you with ${article} ${expertLabel} who specializes in exactly this type of issue.`,
                `I'd recommend a phone call — it's the fastest way to get step-by-step guidance from ${article} ${expertLabel} for your specific situation.`
            ],
            showConnectOptions: true
        };
    }

    // ===== Calculate Typing Delay (human-like) =====
    function calculateTypingDelay(text) {
        const charCount = text.length;
        const baseDelay = 1200;
        const typingTime = (charCount / 5) * 200;
        const maxDelay = 6000;
        return Math.min(baseDelay + typingTime, maxDelay);
    }

    // ===== Add Chat Label =====
    let labelShownForCurrentGroup = false;
    function addChatLabel() {
        const label = document.createElement('div');
        label.className = 'chat-label';
        label.innerHTML = '&#9883;&#65039; Quantum Chatbot, Expert\'s Assistant';
        chatBody.appendChild(label);
    }

    // ===== Track last message type for label logic =====
    let lastMessageType = null;

    // ===== Add Message to Chat =====
    function addMessage(text, type, options = {}) {
        // Add label before first bot message in a new group (not between consecutive bot messages)
        if (type === 'bot' && lastMessageType !== 'bot') {
            labelShownForCurrentGroup = false;
        }
        if (type === 'bot' && !labelShownForCurrentGroup) {
            addChatLabel();
            labelShownForCurrentGroup = true;
        }
        if (type === 'user') {
            labelShownForCurrentGroup = false;
        }
        lastMessageType = type;

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${type}-message`;

        if (type === 'bot') {
            const avatar = document.createElement('img');
            avatar.src = 'assets/chat-avatar-btn.png';
            avatar.alt = 'Quantum';
            avatar.className = 'pearl-avatar';
            msgDiv.appendChild(avatar);
        }

        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${type}-bubble`;

        // Handle newlines in text
        if (text.includes('\n')) {
            bubble.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        } else {
            bubble.textContent = text;
        }
        msgDiv.appendChild(bubble);

        chatBody.appendChild(msgDiv);

        // Notification sound & tab count for bot messages
        if (type === 'bot') {
            playNotificationSound();
            if (!isPageVisible || document.hidden) {
                unreadCount++;
                updateTabTitle();
            }
        }

        if (options.showConnectOptions) {
            addConnectOptions();
        }

        scrollChatToBottom();
    }

    // ===== Add User Action Label (for "yes phone call" etc) =====
    function addUserActionLabel(text) {
        const label = document.createElement('div');
        label.className = 'chat-action-label';
        label.textContent = text;
        chatBody.appendChild(label);
    }

    // ===== Connect Options (in-chat)  -  Professional Design =====
    function addConnectOptions() {
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'connect-options-pro';
        optionsDiv.innerHTML = `
            <button class="connect-option-pro call-option-pro" id="inChatCall">
                <div class="option-pro-icon call-icon-pro">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                </div>
                <div class="option-pro-content">
                    <span class="option-pro-title">Talk to an Expert</span>
                    <span class="option-pro-desc">Get connected via phone call now</span>
                </div>
                <div class="option-pro-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 18l6-6-6-6"/></svg>
                </div>
            </button>
            <button class="connect-option-pro chat-option-pro" id="inChatContinue">
                <div class="option-pro-icon chat-icon-pro">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        <path d="M8 10h.01M12 10h.01M16 10h.01"/>
                    </svg>
                </div>
                <div class="option-pro-content">
                    <span class="option-pro-title">Continue with AI Chat</span>
                    <span class="option-pro-desc">Keep troubleshooting with me</span>
                </div>
                <div class="option-pro-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 18l6-6-6-6"/></svg>
                </div>
            </button>
        `;

        chatBody.appendChild(optionsDiv);
        scrollChatToBottom();

        document.getElementById('inChatCall').addEventListener('click', () => {
            optionsDiv.remove();
            lastMessageType = 'user';
            addMessage('Yes, phone call please', 'user');

            // Show the call details panel RIGHT NEXT to chat
            setTimeout(() => {
                labelShownForCurrentGroup = false;
                showTypingThenMessage("Great choice! I'm connecting you with a specialist now.").then(() => {
                    showCallDetailsPanel();
                });
            }, 300);
        });

        document.getElementById('inChatContinue').addEventListener('click', () => {
            optionsDiv.remove();
            chatPhase = 'ai_chat';
            aiChatCount = 0;
            escalationOffered = false;
            lastMessageType = 'user';
            addMessage('Continue with chat', 'user');
            setTimeout(() => {
                labelShownForCurrentGroup = false;
                showTypingThenMessage("Alright, let me help you with that. Could you describe the issue in more detail so I can provide specific solutions?");
            }, 300);
        });
    }

    // ===== Show Typing Indicator =====
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <img src="assets/chat-avatar-btn.png" alt="Quantum" class="pearl-avatar">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        `;
        chatBody.appendChild(typingDiv);
        scrollChatToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    // ===== Show Typing then Message (human-like delay) =====
    function showTypingThenMessage(text, options = {}) {
        showTypingIndicator();
        const delay = calculateTypingDelay(text);

        return new Promise((resolve) => {
            setTimeout(() => {
                removeTypingIndicator();
                addMessage(text, 'bot', options);
                resolve();
            }, delay);
        });
    }

    // ===== Send Multiple Bot Messages in Sequence =====
    async function sendBotMessages(messages, options = {}) {
        for (let i = 0; i < messages.length; i++) {
            const isLast = i === messages.length - 1;
            const msgOptions = isLast ? options : {};
            await showTypingThenMessage(messages[i], msgOptions);
        }
    }

    // ===== Scroll Chat =====
    function scrollChatToBottom() {
        setTimeout(() => {
            chatBody.scrollTop = chatBody.scrollHeight;
        }, 50);
    }

    // ===== Handle Send Message =====
    function handleSendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        if (!chatStarted) {
            chatStarted = true;
            startChatBtn.textContent = 'SEND';
            const tooltip = document.querySelector('.input-tooltip');
            if (tooltip) tooltip.style.display = 'none';
        }

        // Add user message
        lastMessageType = 'user';
        addMessage(text, 'user');
        chatInput.value = '';
        messageCount++;

        // Get response from chat flow state machine
        const response = getChatFlowResponse(text);

        // Reset last message type for bot label
        lastMessageType = null;

        // Send bot messages
        sendBotMessages(response.messages, {
            showConnectOptions: response.showConnectOptions || false
        });

        // Dynamic Suggestions: Refresh or hide suggestion pills depending on new chat phase
        renderLeftSuggestions(detectedCategory || 'overall');
    }

    // ===== Event Listeners =====
    startChatBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Suggestion pills
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const query = pill.getAttribute('data-query');
            if (query === 'Ask anything...') {
                chatInput.focus();
                return;
            }
            chatInput.value = query;
            handleSendMessage();
        });
    });

    // Category cards (below hero)
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const catKey = card.getAttribute('data-cat');
            if (categories[catKey]) {
                updateHeroForCategory({ key: catKey, ...categories[catKey] });
                
                // NEW: Utmost chatbot personalization on category card click!
                renderLeftSuggestions(catKey);
                if (!chatStarted) {
                    chatBody.innerHTML = ''; // Clear initial default welcome
                    addChatLabel(); // Show professional chat label
                    const cat = categories[catKey];
                    const expertRole = categoryRoles[catKey] || 'Specialist';
                    
                    // Inject dynamic, highly professional welcome bubble
                    const greetingDiv = document.createElement('div');
                    greetingDiv.className = 'chat-message';
                    greetingDiv.innerHTML = `
                        <img src="assets/chat-avatar-btn.png" alt="Quantum" class="pearl-avatar">
                        <div class="message-bubble bot-bubble">
                            Hello! I see you are looking for assistance with a <strong>${cat.label}</strong> issue. 
                            I want to make sure you get the most accurate help and get connected directly with a verified <strong>${expertRole}</strong>. 
                            <br><br>
                            Are you experiencing one of these highly common concerns? (Click below or type your question)
                        </div>
                    `;
                    chatBody.appendChild(greetingDiv);
                    scrollChatToBottom();
                }
                
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => { chatInput.focus(); }, 800);
            }
        });
    });

    // Modal controls
    if (modalClose) {
        modalClose.addEventListener('click', () => { expertModal.style.display = 'none'; });
    }
    if (callExpertBtn) {
        callExpertBtn.addEventListener('click', () => {
            const cat = detectedCategory ? categories[detectedCategory] : null;
            if (cat) document.getElementById('expertPhoneNumber').textContent = cat.phone;
            document.querySelector('.modal-options').style.display = 'none';
            phoneReveal.style.display = 'block';
        });
    }
    if (continueChatBtn) {
        continueChatBtn.addEventListener('click', () => {
            expertModal.style.display = 'none';
            showTypingThenMessage("Great! Let's continue. Please tell me more about your issue.");
        });
    }
    if (expertModal) {
        expertModal.addEventListener('click', (e) => {
            if (e.target === expertModal) expertModal.style.display = 'none';
        });
    }

    // Call panel close helper
    function closeCallPanel() {
        if (callDetailsPanel) {
            callDetailsPanel.classList.remove('visible');
            setTimeout(() => { callDetailsPanel.style.display = 'none'; }, 400);
        }
        const backdrop = document.getElementById('callPanelBackdrop');
        if (backdrop) {
            backdrop.classList.remove('visible');
            setTimeout(() => { backdrop.style.display = 'none'; }, 400);
        }
    }

    const callPanelCloseBtn = document.getElementById('callPanelClose');
    if (callPanelCloseBtn) {
        callPanelCloseBtn.addEventListener('click', closeCallPanel);
    }

    // Call Now button click handler (for analytics/tracking purposes)
    const callNowBtnEl = document.getElementById('callNowBtn');
    if (callNowBtnEl) {
        callNowBtnEl.addEventListener('click', () => {
            // Track call initiation if needed
            console.log('Call initiated to:', callNowBtnEl.href);
        });
    }

    // ===== Dynamic Headline Rotation =====
    const rotatingWords = ['Experts', 'Doctors', 'Tech Pros', 'Lawyers', 'Mechanics'];
    let rotateIndex = 0;

    function rotateHeadline() {
        if (detectedCategory) return;
        if (dynamicCategory) {
            dynamicCategory.style.opacity = '0';
            dynamicCategory.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                rotateIndex = (rotateIndex + 1) % rotatingWords.length;
                dynamicCategory.textContent = rotatingWords[rotateIndex];
                dynamicCategory.style.opacity = '1';
                dynamicCategory.style.transform = 'translateY(0)';
            }, 400);
        }
    }

    setInterval(rotateHeadline, 3000);

    // ===== Initial Welcome  -  Typing then Message =====
    setTimeout(() => {
        showTypingThenMessage("Welcome! How can I help you today?");
        renderLeftSuggestions('overall');
    }, 800);

    // ===== Focus chat input after greeting =====
    setTimeout(() => {
        chatInput.focus();
    }, 3000);

    // ===== Handle URL Query Parameter from Homepage =====
    const urlParams = new URLSearchParams(window.location.search);
    const queryFromHome = urlParams.get('q');
    if (queryFromHome) {
        setTimeout(() => {
            chatInput.value = queryFromHome;
            handleSendMessage();
        }, 3500);
    }

    // ===== Sticky Header Scroll Effect =====
    const siteHeader = document.getElementById('siteHeader');
    if (siteHeader) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 60) {
                siteHeader.classList.add('scrolled');
            } else {
                siteHeader.classList.remove('scrolled');
            }
        });
    }

    // ===== Scroll Spy for Support Page Nav =====
    const navLinks = document.querySelectorAll('.header-nav .nav-link');
    const scrollSections = [
        { id: 'hero', linkIndex: 1 },
        { id: 'categories', linkIndex: 2 },
        { id: 'meetExperts', linkIndex: 3 }
    ];

    function updateSupportActiveNav() {
        const scrollY = window.scrollY + 150;
        let activeIndex = 1;
        scrollSections.forEach(({ id, linkIndex }) => {
            const el = document.getElementById(id);
            if (el && scrollY >= el.offsetTop) {
                activeIndex = linkIndex;
            }
        });
        navLinks.forEach((l, i) => {
            if (i === activeIndex) l.classList.add('active');
            else l.classList.remove('active');
        });
    }

    navLinks.forEach((link, i) => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    window.addEventListener('scroll', updateSupportActiveNav);

    // ===== CTA Image Reveal on Scroll =====
    const ctaImage = document.querySelector('.cta-image-wrap');
    if (ctaImage) {
        const ctaObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.15 });
    }

})();
