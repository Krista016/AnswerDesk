// ===== FLUID STATS COUNTER ANIMATION (Global: Home, Index, Support) =====
(function initStatsCounter() {
    function start() {
        const statNumbers = document.querySelectorAll('.stat-number[data-target]');
        if (statNumbers.length) {
            let statsAnimated = false;
            const statsCard = document.getElementById('statsBar') || document.querySelector('.stats-rounded-card, .stats-bar');
            const statsTarget = statsCard || document.querySelector('.stats-section-wrap');

            // Ease-out cubic: silky smooth, gradual, visually satisfying deceleration
            function easeOutCubic(t) {
                return 1 - Math.pow(1 - t, 3);
            }

            function runFluidCounters() {
                if (statsAnimated) return;
                statsAnimated = true;
                requestAnimationFrame(() => {
                    if (statsCard) statsCard.classList.add('stats-revealed');
                    if (statsTarget) statsTarget.classList.add('stats-revealed');
                });
                const duration = 1350; // 1.35s: smooth, crisp progression
                const startTime = performance.now();

                function updateCounter(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easedProgress = easeOutCubic(progress);

                    statNumbers.forEach(el => {
                        const target = parseFloat(el.getAttribute('data-target'));
                        const prefix = el.getAttribute('data-prefix') || '';
                        const suffix = el.getAttribute('data-suffix') || '';
                        const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
                        const formatComma = el.getAttribute('data-format') === 'comma';

                        const currentVal = easedProgress * target;

                        let displayVal = currentVal.toFixed(decimals);
                        if (formatComma) {
                            displayVal = Math.round(currentVal).toLocaleString();
                        }

                        el.textContent = prefix + displayVal + suffix;
                    });

                    if (progress < 1) {
                        requestAnimationFrame(updateCounter);
                    } else {
                        statNumbers.forEach(el => {
                            const target = parseFloat(el.getAttribute('data-target'));
                            const prefix = el.getAttribute('data-prefix') || '';
                            const suffix = el.getAttribute('data-suffix') || '';
                            const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
                            const formatComma = el.getAttribute('data-format') === 'comma';
                            let finalVal = target.toFixed(decimals);
                            if (formatComma) {
                                finalVal = Math.round(target).toLocaleString();
                            }
                            el.textContent = prefix + finalVal + suffix;
                            el.classList.add('counter-completed');
                        });
                    }
                }

                requestAnimationFrame(updateCounter);
            }

            if (statsTarget && 'IntersectionObserver' in window) {
                const statsRect = statsTarget.getBoundingClientRect();
                if (statsRect.top < window.innerHeight + 60) {
                    runFluidCounters();
                } else {
                    const statsObserver = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                runFluidCounters();
                                statsObserver.unobserve(entry.target);
                            }
                        });
                    }, { threshold: 0.01, rootMargin: '0px 0px 80px 0px' });
                    statsObserver.observe(statsTarget);
                }
            } else {
                runFluidCounters();
            }
        }

        // Two-way CTA glide scroll animation (Left text glide in + Right curvy image glide in)
        const ctaSection = document.querySelector('.cta-section');
        if (ctaSection && 'IntersectionObserver' in window) {
            const revealCta = () => {
                const ctaContent = ctaSection.querySelector('.cta-content');
                const ctaImageWrap = ctaSection.querySelector('.cta-image-wrap');
                if (ctaContent) ctaContent.classList.add('animated');
                if (ctaImageWrap) ctaImageWrap.classList.add('animated', 'visible');
            };
            if (ctaSection.getBoundingClientRect().top < window.innerHeight) {
                revealCta();
            } else {
                const ctaObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            revealCta();
                            ctaObserver.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.01, rootMargin: '0px 0px 80px 0px' });
                ctaObserver.observe(ctaSection);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();

// ===== ANSWERDESK QUANTUM CHATBOT & SUPPORT CONTROLLER =====
// 100% Powered by Google Gemini AI with 3-Tier Intelligent Triage
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
    const chatBody = document.getElementById('chatBody');
    const chatInput = document.getElementById('chatInput');
    const startChatBtn = document.getElementById('startChatBtn');
    const expertModal = document.getElementById('expertModal');
    const modalClose = document.getElementById('modalClose');
    const callExpertBtn = document.getElementById('callExpertBtn');
    const continueChatBtn = document.getElementById('continueChatBtn');
    const phoneReveal = document.getElementById('phoneReveal');
    const onlineCount = document.getElementById('onlineCount');
    const headerExpertsStatus = document.getElementById('headerExpertsStatus');
    const headerExpertsCount = document.getElementById('headerExpertsCount');
    const callDetailsPanel = document.getElementById('callDetailsPanel');

    function getSessionExpertCount() {
        const storageKey = 'answerdesk_session_experts';
        try {
            const saved = parseInt(sessionStorage.getItem(storageKey) || '', 10);
            if (!isNaN(saved) && saved >= 28 && saved <= 58) return saved;
        } catch (e) {}
        const generated = Math.floor(Math.random() * 31) + 28; // 28..58 (always <= 60)
        try { sessionStorage.setItem(storageKey, String(generated)); } catch (e) {}
        return generated;
    }

    const sessionExpertCount = getSessionExpertCount();
    if (headerExpertsCount) {
        headerExpertsCount.textContent = `${sessionExpertCount}+ Experts`;
    }

    // ===== Session State =====
    let chatStarted = false;
    let welcomeTimer = null;
    let expertPopupTimer = null;
    let isSendingMessage = false;
    let messageCount = 0;
    let detectedCategory = null;
    let unreadCount = 0;
    let pageTitle = document.title;
    let isPageVisible = true;
    let intakeState = null;
    const geminiHistory = [];

    // ===== 35 Verified Expert Profiles =====
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

    // ===== Category Directory & Roles =====
    const categories = {
        crypto: { label: 'Digital Payments & Fintech', expertType: 'Finance', specialistGroup: 'Payments & Finance Experts', phone: '1-800-555-0188', expertRole: 'Digital Payments & Crypto Expert' },
        microsoft: { label: 'Microsoft & Windows', expertType: 'Tech', specialistGroup: 'Tech Support Experts', phone: '1-800-936-5700', expertRole: 'Windows & Microsoft Systems Engineer' },
        ios: { label: 'iPhone & Apple Devices', expertType: 'Apple', specialistGroup: 'Apple Support Experts', phone: '1-800-275-2273', expertRole: 'Apple & iOS Expert' },
        xbox: { label: 'Xbox & Gaming Systems', expertType: 'Tech', specialistGroup: 'Gaming Support Experts', phone: '1-800-469-9269', expertRole: 'Gaming Support Expert' },
        android: { label: 'Android & Mobile', expertType: 'Tech', specialistGroup: 'Android Support Experts', phone: '1-800-726-7864', expertRole: 'Android Tech Expert' },
        plumbing: { label: 'Plumbing & Home Systems', expertType: 'Home', specialistGroup: 'Plumbing Experts', phone: '1-800-555-0199', expertRole: 'Licensed Plumber' },
        legal: { label: 'Legal & Consumer Rights', expertType: 'Legal', specialistGroup: 'Legal Experts', phone: '1-800-555-0177', expertRole: 'Licensed Attorney' },
        veterinary: { label: 'Veterinary & Pet Care', expertType: 'Vet', specialistGroup: 'Veterinary Experts', phone: '1-800-555-0145', expertRole: 'Licensed Veterinarian' },
        medical: { label: 'Health & Medical Guidance', expertType: 'Health', specialistGroup: 'Medical Experts', phone: '1-800-555-0134', expertRole: 'Board Certified Physician' },
        automotive: { label: 'Automotive & Mechanical', expertType: 'Auto', specialistGroup: 'Automotive Experts', phone: '1-800-555-0156', expertRole: 'ASE Certified Mechanic' },
        subscription: { label: 'Billing & Subscriptions', expertType: 'Billing', specialistGroup: 'Billing Support Experts', phone: '1-800-555-0122', expertRole: 'Billing Expert' },
        account: { label: 'Account & Security', expertType: 'Tech', specialistGroup: 'Account & Security Experts', phone: '1-800-555-0111', expertRole: 'Account Security Expert' },
        appliances: { label: 'Appliances & Electronics', expertType: 'Appliance', specialistGroup: 'Appliance Experts', phone: '1-800-555-0210', expertRole: 'Appliance Expert' },
        finance: { label: 'Taxes & Financial Planning', expertType: 'Finance', specialistGroup: 'Tax & Finance Experts', phone: '1-800-555-0220', expertRole: 'Certified Public Accountant' }
    };

    // ===== Dynamic Suggestion Chips for Left Pane =====
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
            { text: "Zelle transfer pending", query: "My Zelle transfer through Chase has been pending for days", icon: "💸" },
            { text: "Coinbase / 2FA locked", query: "My Coinbase account is locked out of 2FA authenticator and withdrawal frozen", icon: "🔐" },
            { text: "PayPal account restricted", query: "My PayPal account has a 180-day limitation and 21-day hold", icon: "💳" },
            { text: "Bank app login locked", query: "My Bank of America app login is locked and 2FA code never arrives", icon: "🏦" }
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

    // ===== Select Non-Repeating Expert Profile =====
    let selectedExpert = null;
    function selectExpertProfile() {
        const storageKey = 'answerdesk_shown_experts';
        let shownIds = [];
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) shownIds = JSON.parse(stored);
        } catch (e) { shownIds = []; }

        if (shownIds.length >= expertProfiles.length) shownIds = [];
        const available = expertProfiles.filter(p => !shownIds.includes(p.id));
        const randomIndex = Math.floor(Math.random() * (available.length || 1));
        const chosen = available[randomIndex] || expertProfiles[0];

        shownIds.push(chosen.id);
        try {
            localStorage.setItem(storageKey, JSON.stringify(shownIds));
        } catch (e) {}

        selectedExpert = chosen;
        return chosen;
    }
    selectExpertProfile();

    // ===== Web Audio API Sound Chime =====
    let audioCtx = null;
    function playNotificationSound() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
        } catch (e) {}
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

    // ===== Dynamic Left Suggestions Pills =====
    function renderLeftSuggestions(catKey = 'overall') {
        if (!suggestionPills) return;
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

    // ===== Update Hero on Category Detection =====
    function updateHeroForCategory(cat) {
        if (detectedCategory === cat.key) return;
        detectedCategory = cat.key;

        heroHeadline.style.opacity = '0';
        heroSubtext.style.opacity = '0';

        setTimeout(() => {
            heroHeadline.innerHTML = `Facing <span class="highlight-word">${cat.label}</span> issues? Get help from Verified ${cat.expertType} Experts`;
            heroHeadline.classList.add('category-detected');
            heroSubtext.textContent = `Unlimited chats with verified, top-rated ${cat.expertType} Experts.`;

            const groupName = cat.specialistGroup || `${cat.expertType} Experts`;
            if (headerExpertsStatus) {
                headerExpertsStatus.innerHTML = `<strong>${escapeHtmlSafe(groupName)}</strong> online now ready to help!`;
            }
            if (onlineCount) {
                onlineCount.textContent = `${groupName} are online now`;
            }

            heroHeadline.style.opacity = '1';
            heroSubtext.style.opacity = '1';

            // Advisory banner for Medical or Legal
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

    // ===== Position Call Details Panel Cleanly Across Desktop, Tablet & Mobile =====
    function positionCallDetailsPanel() {
        const panel = callDetailsPanel;
        if (!panel || panel.style.display === 'none') return;

        if (window.innerWidth > 1100) {
            const chatPanelEl = document.getElementById('chatPanel');
            const panelWidth = Math.min(360, window.innerWidth - 48);
            panel.style.width = panelWidth + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';

            if (chatPanelEl) {
                const chatRect = chatPanelEl.getBoundingClientRect();
                const gap = 20;
                const desiredLeft = Math.max(16, chatRect.left - panelWidth - gap);
                panel.style.left = desiredLeft + 'px';

                // Vertically align smoothly with chatPanel while staying completely inside viewport
                const panelHeight = panel.offsetHeight || 520;
                const idealTop = Math.max(16, Math.min(chatRect.top, window.innerHeight - panelHeight - 16));
                panel.style.top = idealTop + 'px';
            } else {
                panel.style.left = Math.max(16, (window.innerWidth - panelWidth) / 2) + 'px';
                panel.style.top = '96px';
            }
        } else {
            // Let @media (max-width: 1100px) center the modal cleanly
            panel.style.left = '';
            panel.style.right = '';
            panel.style.top = '';
            panel.style.bottom = '';
            panel.style.width = '';
        }
    }

    window.addEventListener('resize', positionCallDetailsPanel);

    // ===== Show Call Details Panel =====
    function showCallDetailsPanel(customTitle) {
        const cat = detectedCategory ? categories[detectedCategory] : null;
        const phone = cat ? cat.phone : '1-800-555-0100';
        const label = cat ? cat.label : 'General';
        const hasSpecificActiveRole = activeExpertTitle && activeExpertTitle !== 'Support Expert' && activeExpertTitle !== 'Verified Expert' && activeExpertTitle !== 'Support Specialist' && activeExpertTitle !== 'Verified Specialist';
        const expertRole = hasSpecificActiveRole ? activeExpertTitle : (cat ? cat.expertRole : 'Verified Expert');
        const expert = selectedExpert || {
            name: 'Victoria Price',
            avatar: 'assets/expert-1.png',
            customers: 4820
        };

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

        if (titleEl) titleEl.textContent = customTitle || `Get your ${label} issue fixed now`;
        if (nameEl) nameEl.textContent = expert.name;
        if (roleEl) roleEl.textContent = expertRole;
        if (customersEl) customersEl.textContent = `${expert.customers.toLocaleString()} satisfied customers`;
        if (phoneVisibleEl) {
            phoneVisibleEl.textContent = phone;
        } else if (phoneEl) {
            phoneEl.textContent = phone;
        }

        const cleanDigits = phone.replace(/[^0-9]/g, '');
        const formattedTel = cleanDigits.startsWith('1') ? `+${cleanDigits}` : `+1${cleanDigits}`;
        const telUri = `tel:${formattedTel}`;

        if (callNowBtn) {
            callNowBtn.setAttribute("href", telUri);
            callNowBtn.onclick = () => { window.location.href = telUri; };
        }
        if (phoneEl) {
            phoneEl.setAttribute("href", telUri);
            phoneEl.onclick = () => { window.location.href = telUri; };
        }
        if (avatarEl) avatarEl.src = expert.avatar;

        const backdrop = document.getElementById('callPanelBackdrop');
        if (backdrop) {
            backdrop.style.display = 'block';
            setTimeout(() => { backdrop.classList.add('visible'); }, 10);
            backdrop.onclick = closeCallPanel;
        }

        document.body.classList.add('call-panel-open');
        document.body.style.overflow = 'hidden';

        panel.style.display = 'block';
        positionCallDetailsPanel();
        requestAnimationFrame(() => {
            positionCallDetailsPanel();
            panel.classList.add('visible');
        });

        if (expertPopupTimer) {
            clearTimeout(expertPopupTimer);
            expertPopupTimer = null;
        }
        expertPopupTimer = setTimeout(() => {
            showExpertPopup(label, phone);
        }, 60000);
    }

    // ===== Close Call Details Panel =====
    function closeCallPanel() {
        if (expertPopupTimer) {
            clearTimeout(expertPopupTimer);
            expertPopupTimer = null;
        }
        if (callDetailsPanel) {
            callDetailsPanel.classList.remove('visible');
            setTimeout(() => {
                if (!callDetailsPanel.classList.contains('visible')) {
                    callDetailsPanel.style.display = 'none';
                }
            }, 320);
        }
        const backdrop = document.getElementById('callPanelBackdrop');
        if (backdrop) {
            backdrop.classList.remove('visible');
            setTimeout(() => {
                if (!backdrop.classList.contains('visible')) {
                    backdrop.style.display = 'none';
                }
            }, 320);
        }
        document.body.classList.remove('call-panel-open');
        if (!document.getElementById('expertPopupOverlay')) {
            document.body.style.overflow = '';
        }
    }

    const callPanelCloseBtn = document.getElementById('callPanelClose');
    if (callPanelCloseBtn) callPanelCloseBtn.addEventListener('click', closeCallPanel);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const expertOverlay = document.getElementById('expertPopupOverlay');
            if (expertOverlay) {
                expertOverlay.classList.add('closing');
                setTimeout(() => {
                    expertOverlay.remove();
                    if (!document.body.classList.contains('call-panel-open')) {
                        document.body.style.overflow = '';
                    }
                }, 280);
                return;
            }
            if (callDetailsPanel && callDetailsPanel.classList.contains('visible')) {
                closeCallPanel();
            }
        }
    });

    // ===== 1-Minute Expert Popup =====
    function showExpertPopup(label, phone) {
        if (document.getElementById('expertPopupOverlay')) return;

        const expert = selectedExpert || {
            name: 'Victoria Price',
            avatar: 'assets/expert-1.png',
            customers: 4820
        };
        const cat = detectedCategory ? categories[detectedCategory] : null;
        const effectiveLabel = (cat && cat.label) || label || 'Support';
        const hasSpecificActiveRole = activeExpertTitle && activeExpertTitle !== 'Support Expert' && activeExpertTitle !== 'Verified Expert' && activeExpertTitle !== 'Support Specialist' && activeExpertTitle !== 'Verified Specialist';
        const expertRole = hasSpecificActiveRole ? activeExpertTitle : (cat ? cat.expertRole : 'Verified Expert');
        const onlineExperts = Math.floor(Math.random() * 8) + 10;
        const telNumber = (phone || (cat ? cat.phone : '1-800-555-0100')).replace(/[^0-9]/g, '');

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
                <button class="expert-popup-close" id="expertPopupClose" aria-label="Close popup">&times;</button>
                <div class="expert-popup-badge">${onlineExperts} ${effectiveLabel} Experts are online now</div>
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
                <p class="expert-popup-msg">Hi, we're online right now and <br>ready to answer your question</p>
                <p class="expert-popup-sub">Get the answer you need in minutes. <br>Cancel anytime if not satisfied</p>
                <a href="tel:+${telNumber}" class="expert-popup-cta">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                    Call Now
                </a>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        function closePopup() {
            overlay.classList.add('closing');
            setTimeout(() => {
                overlay.remove();
                if (!document.body.classList.contains('call-panel-open')) {
                    document.body.style.overflow = '';
                }
            }, 280);
        }

        document.getElementById('expertPopupClose').addEventListener('click', closePopup);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closePopup();
        });
    }

    // ===== Typing Delay & Message Helpers =====
    function calculateTypingDelay(text) {
        const charCount = (text || '').length;
        const baseDelay = 500;
        const typingTime = (charCount / 8) * 100;
        return Math.min(baseDelay + typingTime, 2400);
    }

    function cleanHumanText(text) {
        if (!text) return '';
        let s = text;

        // Clean internal AI jargon while preserving Quantum Chatbot persona
        s = s.replace(/\bAI triage (?:specialist|expert)\b/gi, "support expert");
        s = s.replace(/\bAI\b/g, "");

        // Replace em-dash / en-dash / double hyphens between clauses with period + capital letter
        // E.g. "total sense\u2014often" -> "total sense. Often"
        s = s.replace(/([a-zA-Z0-9)])\s*(?:[\u2014\u2013\u2015\u2012\u2212\uFE58]|&mdash;|&ndash;|--)\s*([a-zA-Z])/g, (m, p1, p2) => {
            return p1 + '. ' + p2.toUpperCase();
        });

        // Replace any remaining em-dashes / en-dashes / double-hyphens with comma
        s = s.replace(/\s*(?:[\u2014\u2013\u2015\u2012\u2212\uFE58]|&mdash;|&ndash;|--)\s*/g, ', ');
        s = s.replace(/\s+-\s+/g, ', ');

        // Strict terminal catch-all ensuring no em-dash or en-dash character escapes
        s = s.replace(/[\u2014\u2013\u2015\u2012\u2212\uFE58]|&mdash;|&ndash;|--/g, ', ');

        s = s.replace(/,\s*\./g, '.');
        s = s.replace(/\.\s*\./g, '.');
        s = s.replace(/,\s*,+/g, ',');
        s = s.replace(/,\s*\?/g, '?');
        s = s.replace(/,\s*!/g, '!');
        s = s.replace(/\s{2,}/g, ' ');

        return s.trim();
    }

    let connectedToExpert = false;
    let activeExpertTitle = 'Support Expert';
    let chatLabelAdded = false;
    let lastLabelWasExpert = false;
    let lastMessageType = null;

    function escapeHtmlSafe(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function addChatLabel(forceExpert = false) {
        const label = document.createElement('div');
        label.className = 'chat-label';
        const isExpert = Boolean(connectedToExpert || forceExpert);
        if (isExpert) {
            const expertName = selectedExpert ? selectedExpert.name : 'Victoria Price';
            const role = activeExpertTitle || 'Support Expert';
            label.innerHTML = `<span style="display:inline-block;width:7px;height:7px;background-color:#10b981;border-radius:50%;margin-right:5px;"></span>${escapeHtmlSafe(expertName)}, ${escapeHtmlSafe(role)}`;
        } else {
            label.innerHTML = `⚛️ Quantum Chatbot, Expert's Assistant`;
        }
        chatBody.appendChild(label);
        chatLabelAdded = true;
        lastLabelWasExpert = isExpert;
    }

    function clearTransientChatActions() {
        chatBody.querySelectorAll('.chat-quick-replies, .connect-options-pro').forEach(el => el.remove());
    }

    function addQuickReplies(replies) {
        if (!Array.isArray(replies) || replies.length === 0) return;
        chatBody.querySelectorAll('.chat-quick-replies').forEach(el => el.remove());

        const wrap = document.createElement('div');
        wrap.className = 'chat-quick-replies';

        replies.forEach(label => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'quick-reply-chip';
            btn.textContent = label;
            btn.addEventListener('click', () => {
                wrap.remove();
                if (/add a detail|another detail/i.test(label)) {
                    chatInput.placeholder = 'Type the extra detail you want to add...';
                    chatInput.focus();
                } else {
                    chatInput.value = label;
                    handleSendMessage();
                }
            });
            wrap.appendChild(btn);
        });

        chatBody.appendChild(wrap);
        scrollChatToBottom();
    }

    function addMessage(text, type, options = {}) {
        if (type === 'user') {
            chatLabelAdded = false;
            lastLabelWasExpert = false;
        } else if (type === 'bot') {
            if (!chatLabelAdded || (options.forceExpertLabel && !lastLabelWasExpert)) {
                addChatLabel(options.forceExpertLabel);
            }
        }
        lastMessageType = type;

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${type}-message`;

        if (type === 'bot') {
            if (connectedToExpert && selectedExpert) {
                const wrap = document.createElement('div');
                wrap.className = 'avatar-container';
                const avatar = document.createElement('img');
                avatar.src = selectedExpert.avatar;
                avatar.alt = selectedExpert.name;
                avatar.className = 'expert-avatar-face';
                wrap.appendChild(avatar);
                msgDiv.appendChild(wrap);
            } else {
                const avatarWrap = document.createElement('div');
                avatarWrap.className = 'pearl-avatar-wrap';
                const avatar = document.createElement('img');
                avatar.src = 'assets/chat-avatar-btn.png';
                avatar.alt = "Quantum Chatbot, Expert's Assistant";
                avatar.className = 'pearl-avatar';
                const beacon = document.createElement('span');
                beacon.className = 'pearl-online-beacon';
                beacon.setAttribute('aria-hidden', 'true');
                avatarWrap.appendChild(avatar);
                avatarWrap.appendChild(beacon);
                msgDiv.appendChild(avatarWrap);
            }
        }

        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${type}-bubble`;

        // Clean em-dashes and robotic phrases (preserve newlines for bulleted summaries)
        const cleanText = type === 'bot' ? cleanHumanTextPreserveLines(text || '') : (text || '');

        if (cleanText.includes('\n') || cleanText.includes('**')) {
            bubble.innerHTML = escapeHtmlSafe(cleanText)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
        } else {
            bubble.textContent = cleanText;
        }
        msgDiv.appendChild(bubble);
        chatBody.appendChild(msgDiv);

        if (type === 'bot' && !options.silent) {
            playNotificationSound();
            if (!isPageVisible || document.hidden) {
                unreadCount++;
                updateTabTitle();
            }
        }

        if (Array.isArray(options.quickReplies) && options.quickReplies.length > 0) {
            addQuickReplies(options.quickReplies);
        }

        if (options.showConnectOptions) {
            addConnectOptions(options);
        }

        scrollChatToBottom();
    }

    function cleanHumanTextPreserveLines(text) {
        if (!text) return '';
        return String(text)
            .split('\n')
            .map(line => cleanHumanText(line))
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    // ===== Connect Options (Call vs Chat Cards) =====
    async function triggerSpecialistHandoff(userMessageText, expertRoleTitle, skipUserBubble = false) {
        if (expertPopupTimer) {
            clearTimeout(expertPopupTimer);
            expertPopupTimer = null;
        }
        connectedToExpert = true;
        activeExpertTitle = expertRoleTitle || activeExpertTitle || 'Support Expert';
        const expertName = selectedExpert ? selectedExpert.name : 'Victoria Price';

        if (!skipUserBubble) {
            lastMessageType = 'user';
            addMessage(userMessageText || 'Online chat, please.', 'user');
        }

        // Visual handoff notice in chat
        const joinedNotice = document.createElement('div');
        joinedNotice.className = 'chat-system-notice chat-system-joined';
        joinedNotice.innerHTML = `<span class="online-dot-mini"></span> <strong>${escapeHtmlSafe(expertName)}</strong> joined the chat`;
        chatBody.appendChild(joinedNotice);
        scrollChatToBottom();

        // Show typing indicator as the specialist
        showTypingIndicator();
        const startedAt = Date.now();

        try {
            const apiRes = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessageText || 'Online chat, please.',
                    history: geminiHistory,
                    intake_state: intakeState,
                    specialist_handoff: true,
                    expert_name: expertName,
                    expert_role: activeExpertTitle
                })
            });

            if (!apiRes.ok) throw new Error('API returned status ' + apiRes.status);
            const json = await apiRes.json();
            if (!json.success || !json.data) throw new Error('Invalid API response');

            const aiData = json.data;
            const targetHandoffDelay = Math.min(2400, Math.max(1600, 1500 + (aiData.reply_text || '').length * 5));
            const elapsed = Date.now() - startedAt;
            if (elapsed < targetHandoffDelay) {
                await new Promise(r => setTimeout(r, targetHandoffDelay - elapsed));
            }
            removeTypingIndicator();

            if (aiData.intake_state) intakeState = aiData.intake_state;

            geminiHistory.push({
                user: userMessageText || 'Online chat, please.',
                model: aiData.reply_text,
                stage: aiData.stage || 'connected',
                category: aiData.category || detectedCategory || 'general'
            });
            addMessage(aiData.reply_text, 'bot', { forceExpertLabel: true });

        } catch (err) {
            console.error('Handoff error:', err);
            removeTypingIndicator();
            const fallbackGreeting = `Hi! I'm **${expertName}**, your verified **${activeExpertTitle}**. I've reviewed your summary and I'm ready to help resolve this step by step. Are you in front of your device right now?`;
            geminiHistory.push({ user: userMessageText || 'Online chat, please.', model: fallbackGreeting });
            addMessage(fallbackGreeting, 'bot', { forceExpertLabel: true });
        }
    }

    function addConnectOptions(options = {}) {
        // Prevent duplicate #inChatCall / #inChatContinue IDs in DOM
        chatBody.querySelectorAll('.connect-options-pro').forEach(el => el.remove());

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'connect-options-pro';

        const expertTitle = options.expertRole ? options.expertRole : 'Expert';

        optionsDiv.innerHTML = `
            <button type="button" class="connect-option-pro call-option-pro call-option-priority" id="inChatCall">
                <div class="option-pro-icon call-icon-pro">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                </div>
                <div class="option-pro-content">
                    <span class="option-pro-title">Call ${escapeHtmlSafe(expertTitle)}</span>
                    <span class="option-pro-desc">Direct phone connection with a verified expert</span>
                </div>
                <div class="option-pro-right">
                    <span class="badge-recommended">★ RECOMMENDED</span>
                    <div class="option-pro-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                </div>
            </button>
            <button type="button" class="connect-option-pro chat-option-pro" id="inChatContinue">
                <div class="option-pro-icon chat-icon-pro">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        <path d="M8 10h.01M12 10h.01M16 10h.01"/>
                    </svg>
                </div>
                <div class="option-pro-content">
                    <span class="option-pro-title">Prefer text? Chat with ${escapeHtmlSafe(expertTitle)}</span>
                    <span class="option-pro-desc">Continue troubleshooting live right here</span>
                </div>
                <div class="option-pro-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 18l6-6-6-6"/></svg>
                </div>
            </button>
        `;

        chatBody.appendChild(optionsDiv);
        scrollChatToBottom();

        const callBtn = optionsDiv.querySelector('.call-option-pro');
        const chatBtn = optionsDiv.querySelector('.chat-option-pro');

        if (callBtn) {
            callBtn.addEventListener('click', async () => {
                optionsDiv.remove();
                lastMessageType = 'user';
                addMessage('Yes, phone call please', 'user');
                showTypingIndicator();
                await new Promise(r => setTimeout(r, 1200));
                removeTypingIndicator();
                addMessage("Great choice! Connecting you with an expert over the phone now, and I've attached your full summary.", 'bot');
                showCallDetailsPanel(options.ctaHeadline);
            });
        }

        if (chatBtn) {
            chatBtn.addEventListener('click', () => {
                optionsDiv.remove();
                triggerSpecialistHandoff('Online chat, please.', expertTitle, false);
            });
        }
    }

    // ===== Typing Indicator =====
    function showTypingIndicator() {
        if (document.getElementById('typingIndicator')) return;
        if (!chatLabelAdded) {
            addChatLabel(connectedToExpert);
        }
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';

        let avatarHtml = `<div class="pearl-avatar-wrap"><img src="assets/chat-avatar-btn.png" alt="Quantum Chatbot, Expert's Assistant" class="pearl-avatar"><span class="pearl-online-beacon" aria-hidden="true"></span></div>`;
        if (connectedToExpert && selectedExpert) {
            avatarHtml = `<div class="avatar-container"><img src="${selectedExpert.avatar}" alt="${escapeHtmlSafe(selectedExpert.name)}" class="expert-avatar-face"></div>`;
        }

        typingDiv.innerHTML = `
            ${avatarHtml}
            <div class="typing-dots" aria-label="Assistant is typing">
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

    function scrollChatToBottom() {
        setTimeout(() => {
            chatBody.scrollTop = chatBody.scrollHeight;
        }, 50);
    }

    function clampMs(val, min, max) {
        return Math.min(max, Math.max(min, val));
    }

    // ===== Handle Send Message (AskTech / Pearl Paced Consultative AI Engine) =====
    async function handleSendMessage() {
        const text = chatInput.value.trim();
        if (!text || isSendingMessage) return;
        isSendingMessage = true;

        if (!chatStarted) {
            chatStarted = true;
            if (welcomeTimer) {
                clearTimeout(welcomeTimer);
                welcomeTimer = null;
            }
            removeTypingIndicator();
            startChatBtn.textContent = 'SEND';
            chatInput.placeholder = 'Type your message...';
            const tooltip = document.querySelector('.input-tooltip');
            if (tooltip) tooltip.style.display = 'none';
        }

        // Clear any previous quick replies or stale channel cards
        clearTransientChatActions();

        // Render user bubble
        lastMessageType = 'user';
        addMessage(text, 'user');
        chatInput.value = '';
        messageCount++;

        const requestStartedAt = Date.now();
        const READING_PAUSE_MS = 400;
        // Brief human reading pause before typing indicator appears, matching Pearl UX
        const readingTimer = setTimeout(() => {
            showTypingIndicator();
        }, READING_PAUSE_MS);

        try {
            const apiRes = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: geminiHistory,
                    intake_state: intakeState,
                    connected_to_expert: connectedToExpert,
                    expert_name: selectedExpert ? selectedExpert.name : 'Victoria Price',
                    expert_role: activeExpertTitle
                })
            });

            if (!apiRes.ok) throw new Error('API returned status ' + apiRes.status);
            const json = await apiRes.json();
            if (!json.success || !json.data) throw new Error('Invalid API response');

            const aiData = json.data;
            const replyLen = (aiData.reply_text || '').length;

            // Balanced AskTech-style human typing pacing (never instant/robotic, never sluggish)
            let targetTotalMs;
            if (aiData.stage === 'greeting') {
                targetTotalMs = clampMs(2100 + replyLen * 7, 2200, 2600);
            } else if (aiData.stage === 'summary_confirm') {
                targetTotalMs = clampMs(3400 + replyLen * 8, 3800, 4800);
            } else {
                targetTotalMs = clampMs(2400 + replyLen * 11, 2800, 4200);
            }

            // Ensure typing indicator renders visibly before delivering reply
            const elapsedSoFar = Date.now() - requestStartedAt;
            if (elapsedSoFar < READING_PAUSE_MS) {
                await new Promise(r => setTimeout(r, READING_PAUSE_MS - elapsedSoFar));
            }
            clearTimeout(readingTimer);
            showTypingIndicator();

            const remainingMs = targetTotalMs - (Date.now() - requestStartedAt);
            if (remainingMs > 0) {
                await new Promise(r => setTimeout(r, remainingMs));
            }
            removeTypingIndicator();

            // Persist server-tracked consultative state & history
            if (aiData.intake_state) {
                intakeState = aiData.intake_state;
            }
            if (aiData.expert_role) {
                activeExpertTitle = aiData.expert_role;
            }
            geminiHistory.push({
                user: text,
                model: aiData.reply_text,
                stage: aiData.stage || 'intake',
                category: aiData.category || detectedCategory || 'general'
            });

            // Dynamically update category hero & left suggestions
            if (aiData.category && categories[aiData.category]) {
                updateHeroForCategory({ key: aiData.category, ...categories[aiData.category] });
                renderLeftSuggestions(aiData.category);
            }

            // Update phone dialer if available
            if (aiData.phone_number) {
                const callNowBtn = document.getElementById('callNowBtn');
                if (callNowBtn) callNowBtn.href = 'tel:' + aiData.phone_number.replace(/[^0-9+]/g, '');
                const phoneDisplay = document.getElementById('callPanelPhoneNumberVisible');
                if (phoneDisplay) phoneDisplay.textContent = aiData.phone_number;
            }

            // Strictly respect server FSM stage for Call/Chat cards and quick replies
            const showConnectOptions = Boolean(aiData.show_channel_cards);
            lastMessageType = null;
            addMessage(aiData.reply_text || '', 'bot', {
                showConnectOptions,
                recommendation: aiData.recommendation || 'none',
                expertRole: aiData.expert_role || activeExpertTitle,
                expertPhone: aiData.phone_number,
                ctaHeadline: aiData.cta_headline,
                quickReplies: Array.isArray(aiData.quick_replies) ? aiData.quick_replies : []
            });

            // Handle direct typed channel choices ("Phone call please" / "Online chat please")
            if (aiData.auto_open_call) {
                setTimeout(() => {
                    showCallDetailsPanel(aiData.cta_headline);
                }, 450);
            } else if (aiData.auto_open_chat) {
                setTimeout(() => {
                    triggerSpecialistHandoff(text, aiData.expert_role || activeExpertTitle, true);
                }, 450);
            }

        } catch (err) {
            console.error('Chat network error:', err);
            clearTimeout(readingTimer);
            removeTypingIndicator();
            lastMessageType = null;

            // Resilient client-side greeting-aware fallback if server itself is unreachable
            if (isPureGreetingText(text) && geminiHistory.length === 0) {
                const greetReply = "Hi there! What's going on today? Tell me a little about the issue you're running into in your own words.";
                geminiHistory.push({ user: text, model: greetReply });
                addMessage(greetReply, 'bot');
            } else {
                const safeReply = "Thanks for sharing that. Could you tell me a bit more about what's happening and when it started so I can put together a complete summary for our expert?";
                geminiHistory.push({ user: text, model: safeReply });
                addMessage(safeReply, 'bot');
            }
        } finally {
            isSendingMessage = false;
        }
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
        card.addEventListener('click', (e) => {
            const rawCat = card.getAttribute('data-cat');
            const catKey = rawCat === 'payments' ? 'crypto' : rawCat;
            if (categories[catKey]) {
                e.preventDefault();
                updateHeroForCategory({ key: catKey, ...categories[catKey] });
                renderLeftSuggestions(catKey);

                if (!chatStarted) {
                    if (welcomeTimer) { clearTimeout(welcomeTimer); welcomeTimer = null; }
                    chatBody.innerHTML = '';
                    chatLabelAdded = false;
                    addChatLabel();
                    const cat = categories[catKey];
                    addMessage(`Hi! I see you're looking for help with **${cat.label}**. Tell me what's going on and I'll make sure we connect you with the right expert.`, 'bot', { silent: true });
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => { chatInput.focus(); }, 600);
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
            showTypingThenMessage("Great! Let's continue. Please tell me more about what you are seeing.");
        });
    }
    if (expertModal) {
        expertModal.addEventListener('click', (e) => {
            if (e.target === expertModal) expertModal.style.display = 'none';
        });
    }

    // Dynamic Headline Rotation
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
            }, 220);
        }
    }
    setInterval(rotateHeadline, 3000);

    function isPureGreetingText(str) {
        const s = (str || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
        if (!s) return true;
        if (/^(hi+|hello+|hey+|heyy+|yo|hola|namaste|greetings|good morning|good afternoon|good evening|hi there|hello there|hey there|how are you|anyone there|are you there|need help|i need help|help me|can you help)$/.test(s)) {
            return true;
        }
        const words = s.split(' ');
        const greetWords = new Set(['hi', 'hii', 'hiii', 'hello', 'helloo', 'hey', 'heyy', 'yo', 'hola', 'there', 'again']);
        return words.length > 0 && words.every(w => greetWords.has(w) || /^h+i+$/.test(w));
    }

    // Parse & immediately strip ?q= from URL so reload/back never auto-sends stale messages
    const urlParams = new URLSearchParams(window.location.search);
    const rawQueryFromUrl = (urlParams.get('q') || '').trim();
    if (urlParams.has('q')) {
        urlParams.delete('q');
        const cleanQueryStr = urlParams.toString();
        const cleanUrl = window.location.pathname + (cleanQueryStr ? '?' + cleanQueryStr : '') + window.location.hash;
        window.history.replaceState(null, '', cleanUrl);
    }
    const hasSubstantiveQuery = Boolean(rawQueryFromUrl) && !isPureGreetingText(rawQueryFromUrl);

    // One-time handoff from the homepage floating chat (any message, including "hi").
    // Consumed and deleted immediately so reload/back can never re-send it.
    let fcHandoffText = '';
    try {
        const rawHandoff = sessionStorage.getItem('answerdesk_fc_handoff');
        if (rawHandoff) {
            sessionStorage.removeItem('answerdesk_fc_handoff');
            const parsed = JSON.parse(rawHandoff);
            if (parsed && typeof parsed.text === 'string' && Date.now() - Number(parsed.ts || 0) < 60000) {
                fcHandoffText = parsed.text.trim().slice(0, 1000);
            }
        }
    } catch (e) {}

    // Initial Welcome or Substantive Query Handoff (chat NEVER auto-sends "hi" or initiates unprompted)
    renderLeftSuggestions('overall');
    if (fcHandoffText) {
        addChatLabel();
        addMessage("Welcome! How can I help you today?", 'bot', { silent: true });
        setTimeout(() => {
            if (!chatStarted && !isSendingMessage && !chatInput.value.trim()) {
                chatInput.value = fcHandoffText;
                handleSendMessage();
            }
        }, 150);
    } else if (hasSubstantiveQuery) {
        addChatLabel();
        setTimeout(() => {
            if (!chatStarted && !isSendingMessage && !chatInput.value.trim()) {
                chatInput.value = rawQueryFromUrl;
                handleSendMessage();
            }
        }, 350);
    } else if (!chatStarted) {
        addChatLabel();
        showTypingIndicator();
        welcomeTimer = setTimeout(() => {
            if (!chatStarted) {
                removeTypingIndicator();
                addMessage("Welcome! How can I help you today?", 'bot', { silent: true });
            }
        }, 1600);
    }

    // Sticky Header Scroll Effect
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

    // Scrollspy for Support Page Nav (only activate when legacy section anchors exist)
    const navLinks = document.querySelectorAll('.header-nav .nav-link');
    const hasLegacySections = Boolean(document.getElementById('categories') || document.getElementById('meetExperts'));
    const scrollSections = [
        { id: 'hero', linkIndex: 1 },
        { id: 'categories', linkIndex: 2 },
        { id: 'meetExperts', linkIndex: 3 }
    ];

    function updateSupportActiveNav() {
        if (!hasLegacySections || navLinks.length < 4) return;
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

    if (hasLegacySections && navLinks.length >= 4) {
        navLinks.forEach((link) => {
            link.addEventListener('click', function() {
                const href = this.getAttribute('href');
                if (href && href.startsWith('#')) {
                    navLinks.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });
        window.addEventListener('scroll', updateSupportActiveNav);
    }

    // CTA Image Reveal on Scroll
    const ctaImage = document.querySelector('.cta-image-wrap');
    if (ctaImage) {
        const ctaObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.01, rootMargin: '0px 0px 80px 0px' });
        ctaObserver.observe(ctaImage);
    }

})();
