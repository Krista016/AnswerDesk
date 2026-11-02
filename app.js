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
    const callDetailsPanel = document.getElementById('callDetailsPanel');

    // ===== Session State =====
    let chatStarted = false;
    let messageCount = 0;
    let detectedCategory = null;
    let unreadCount = 0;
    let pageTitle = document.title;
    let isPageVisible = true;
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
        crypto: { label: 'Digital Payments & Fintech', expertType: 'Finance', phone: '1-800-555-0188', expertRole: 'Crypto Finance Specialist' },
        microsoft: { label: 'Microsoft & Windows', expertType: 'Tech', phone: '1-800-936-5700', expertRole: 'Windows & Microsoft Systems Engineer' },
        ios: { label: 'iPhone & Apple Devices', expertType: 'Apple', phone: '1-800-275-2273', expertRole: 'Apple & iOS Specialist' },
        xbox: { label: 'Xbox & Gaming Systems', expertType: 'Tech', phone: '1-800-469-9269', expertRole: 'Gaming Support Specialist' },
        android: { label: 'Android & Mobile', expertType: 'Tech', phone: '1-800-726-7864', expertRole: 'Android Tech Expert' },
        plumbing: { label: 'Plumbing & Home Systems', expertType: 'Home', phone: '1-800-555-0199', expertRole: 'Licensed Plumber' },
        legal: { label: 'Legal & Consumer Rights', expertType: 'Legal', phone: '1-800-555-0177', expertRole: 'Licensed Attorney' },
        veterinary: { label: 'Veterinary & Pet Care', expertType: 'Vet', phone: '1-800-555-0145', expertRole: 'Licensed Veterinarian' },
        medical: { label: 'Health & Medical Guidance', expertType: 'Health', phone: '1-800-555-0134', expertRole: 'Board Certified Physician' },
        automotive: { label: 'Automotive & Mechanical', expertType: 'Auto', phone: '1-800-555-0156', expertRole: 'ASE Certified Mechanic' },
        subscription: { label: 'Billing & Subscriptions', expertType: 'Billing', phone: '1-800-555-0122', expertRole: 'Billing Specialist' },
        account: { label: 'Account & Security', expertType: 'Tech', phone: '1-800-555-0111', expertRole: 'Account Security Specialist' },
        appliances: { label: 'Appliances & Electronics', expertType: 'Appliance', phone: '1-800-555-0210', expertRole: 'Appliance Specialist' },
        finance: { label: 'Taxes & Financial Planning', expertType: 'Finance', phone: '1-800-555-0220', expertRole: 'Certified Public Accountant' }
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
            heroHeadline.innerHTML = `Facing <span class="highlight-word">${cat.label}</span> issues? Get help from Business ${cat.expertType} Experts`;
            heroHeadline.classList.add('category-detected');
            heroSubtext.textContent = `Unlimited chats with verified, top-rated ${cat.expertType} Experts.`;

            const specialistCount = Math.floor(Math.random() * 8) + 2;
            onlineCount.textContent = `${specialistCount} ${cat.expertType} Support Specialists are online now`;

            suggestionPills.style.opacity = '0';
            setTimeout(() => { suggestionPills.classList.add('hidden'); }, 300);

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

    // ===== Show Call Details Panel =====
    function showCallDetailsPanel(customTitle) {
        const cat = detectedCategory ? categories[detectedCategory] : null;
        const phone = cat ? cat.phone : '1-800-555-0100';
        const label = cat ? cat.label : 'General';
        const expert = selectedExpert;
        const expertRole = cat ? cat.expertRole : 'Tech Support Expert';

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
        if (backdrop && window.innerWidth <= 1100) {
            backdrop.style.display = 'block';
            setTimeout(() => { backdrop.classList.add('visible'); }, 10);
            backdrop.onclick = closeCallPanel;
        }

        panel.style.display = 'block';
        setTimeout(() => { panel.classList.add('visible'); }, 10);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
            showExpertPopup(label, phone);
        }, 60000);
    }

    // ===== Close Call Details Panel =====
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
    if (callPanelCloseBtn) callPanelCloseBtn.addEventListener('click', closeCallPanel);

    // ===== 1-Minute Expert Popup =====
    function showExpertPopup(label, phone) {
        if (document.getElementById('expertPopupOverlay')) return;

        const expert = selectedExpert;
        const cat = detectedCategory ? categories[detectedCategory] : null;
        const expertRole = cat ? cat.expertRole : 'Tech Support Expert';
        const onlineExperts = Math.floor(Math.random() * 8) + 10;
        const telNumber = phone.replace(/[^0-9]/g, '');

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

    // ===== Typing Delay & Message Helpers =====
    function calculateTypingDelay(text) {
        const charCount = (text || '').length;
        const baseDelay = 500;
        const typingTime = (charCount / 8) * 100;
        return Math.min(baseDelay + typingTime, 2400);
    }

    let labelShownForCurrentGroup = false;
    let lastMessageType = null;

    function addChatLabel() {
        const label = document.createElement('div');
        label.className = 'chat-label';
        const expertName = selectedExpert ? selectedExpert.name : 'Verified Specialist';
        label.innerHTML = `<span style="display:inline-block;width:7px;height:7px;background-color:#10b981;border-radius:50%;margin-right:5px;"></span>${expertName}, Support Specialist`;
        chatBody.appendChild(label);
    }

    function addMessage(text, type, options = {}) {
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
            avatar.src = selectedExpert ? selectedExpert.avatar : 'assets/expert-1.png';
            avatar.alt = selectedExpert ? selectedExpert.name : 'Specialist';
            avatar.className = 'pearl-avatar';
            msgDiv.appendChild(avatar);
        }

        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${type}-bubble`;

        // Strip em-dashes / en-dashes to maintain real-human conversation style
        let cleanText = (text || '')
            .replace(/\s*[\u2014\u2013]\s*/g, ', ')
            .replace(/,\s*\./g, '.')
            .replace(/\s*,\s*,\s*/g, ', ')
            .replace(/,\s*\?/g, '?');

        // Format basic markdown bold and linebreaks
        if (cleanText.includes('\n') || cleanText.includes('**')) {
            bubble.innerHTML = cleanText
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        } else {
            bubble.textContent = cleanText;
        }
        msgDiv.appendChild(bubble);
        chatBody.appendChild(msgDiv);

        if (type === 'bot') {
            playNotificationSound();
            if (!isPageVisible || document.hidden) {
                unreadCount++;
                updateTabTitle();
            }
        }

        if (options.showConnectOptions) {
            addConnectOptions(options);
        }

        scrollChatToBottom();
    }

    // ===== Connect Options (Call vs Chat Cards) =====
    function addConnectOptions(options = {}) {
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'connect-options-pro';

        const expertTitle = options.expertRole ? options.expertRole : 'Specialist';

        // When recommendation is CHAT: Show ONLY Live Chat (NEVER show a call button!)
        if (options.recommendation === 'chat') {
            optionsDiv.innerHTML = `
                <button class="connect-option-pro chat-option-pro" id="inChatContinue">
                    <div class="option-pro-icon chat-icon-pro">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                            <path d="M8 10h.01M12 10h.01M16 10h.01"/>
                        </svg>
                    </div>
                    <div class="option-pro-content">
                        <span class="option-pro-title">Connect with ${expertTitle} via Live Chat</span>
                        <span class="option-pro-desc">Chat step-by-step with a verified specialist now</span>
                    </div>
                    <div class="option-pro-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                </button>
            `;

            chatBody.appendChild(optionsDiv);
            scrollChatToBottom();

            document.getElementById('inChatContinue').addEventListener('click', () => {
                optionsDiv.remove();
                lastMessageType = 'user';
                addMessage('Connect via live chat', 'user');
                setTimeout(() => {
                    labelShownForCurrentGroup = false;
                    showTypingThenMessage(`Great! Connecting you with ${expertTitle} in chat. Please describe any additional symptoms or details to begin.`);
                }, 300);
            });
            return;
        }

        // When recommendation is CALL: Show Direct Phone Call with ★ RECOMMENDED
        if (options.recommendation === 'call') {
            optionsDiv.innerHTML = `
                <button class="connect-option-pro call-option-pro call-option-priority" id="inChatCall">
                    <div class="option-pro-icon call-icon-pro">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                        </svg>
                    </div>
                    <div class="option-pro-content">
                        <span class="option-pro-title">Call ${expertTitle} <span class="badge-recommended">★ RECOMMENDED</span></span>
                        <span class="option-pro-desc">Direct phone connection with a verified specialist</span>
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
                        <span class="option-pro-title">Prefer text? Chat with ${expertTitle}</span>
                        <span class="option-pro-desc">Continue troubleshooting in text chat</span>
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

                setTimeout(() => {
                    labelShownForCurrentGroup = false;
                    showTypingThenMessage("Great choice! Connecting you with a specialist over the phone now.").then(() => {
                        showCallDetailsPanel(options.ctaHeadline);
                    });
                }, 300);
            });

            document.getElementById('inChatContinue').addEventListener('click', () => {
                optionsDiv.remove();
                lastMessageType = 'user';
                addMessage('I prefer live chat', 'user');
                setTimeout(() => {
                    labelShownForCurrentGroup = false;
                    showTypingThenMessage("Understood! Let's continue in chat. What other details can you share?");
                }, 300);
            });
        }
    }

    // ===== Typing Indicator =====
    function showTypingIndicator() {
        if (document.getElementById('typingIndicator')) return;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        const avatarSrc = selectedExpert ? selectedExpert.avatar : 'assets/expert-1.png';
        const expertName = selectedExpert ? selectedExpert.name : 'Specialist';
        typingDiv.innerHTML = `
            <img src="${avatarSrc}" alt="${expertName}" class="pearl-avatar">
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

    // ===== Handle Send Message (3-Tier Gemini AI Engine) =====
    async function handleSendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        if (!chatStarted) {
            chatStarted = true;
            startChatBtn.textContent = 'SEND';
            const tooltip = document.querySelector('.input-tooltip');
            if (tooltip) tooltip.style.display = 'none';
        }

        // Render user bubble
        lastMessageType = 'user';
        addMessage(text, 'user');
        chatInput.value = '';
        messageCount++;

        // Show typing indicator immediately while Gemini processes
        showTypingIndicator();

        try {
            const apiRes = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: geminiHistory
                })
            });

            if (!apiRes.ok) throw new Error('API returned status ' + apiRes.status);
            const json = await apiRes.json();
            if (!json.success || !json.data) throw new Error('Invalid API response');

            const aiData = json.data;
            removeTypingIndicator();

            // Store in conversational history
            geminiHistory.push({ user: text, model: aiData.reply_text });

            // Dynamically update category and left hero
            if (aiData.category && categories[aiData.category]) {
                updateHeroForCategory({ key: aiData.category, ...categories[aiData.category] });
                renderLeftSuggestions(aiData.category);
            }

            // 3-TIER TRIAGE EXECUTION:
            // Tier 1 ("low" / basic DIY): recommendation === "none" -> NO buttons shown
            // Tier 2 ("medium" / software config): recommendation === "chat" -> Live Chat button ONLY (NO CALL BUTTON)
            // Tier 3 ("critical" / hardware & urgent): recommendation === "call" -> Direct Phone Call with ★ RECOMMENDED
            const isExplicitDirect = /\b(call|phone|speak to|talk to (an? )?(expert|specialist|human|agent|person)|operator|give me (the )?number)\b/i.test(text);
            const allowConnect = (geminiHistory.length > 1) || isExplicitDirect;
            const recommendation = allowConnect ? aiData.recommendation : 'none';
            const showConnectOptions = recommendation === 'call' || recommendation === 'chat';

            lastMessageType = null;
            addMessage(aiData.reply_text, 'bot', {
                showConnectOptions,
                recommendation,
                expertRole: aiData.expert_role,
                expertPhone: aiData.phone_number,
                ctaHeadline: aiData.cta_headline
            });

            // Update phone dialer if available
            if (aiData.phone_number) {
                const callNowBtn = document.getElementById('callNowBtn');
                if (callNowBtn) callNowBtn.href = 'tel:' + aiData.phone_number.replace(/[^0-9+]/g, '');
                const phoneDisplay = document.getElementById('callPanelPhoneNumberVisible');
                if (phoneDisplay) phoneDisplay.textContent = aiData.phone_number;
            }

        } catch (err) {
            console.error('Chat error:', err);
            removeTypingIndicator();
            lastMessageType = null;
            addMessage("I'm having a slight trouble connecting to our live triage network. You can also reach our 24/7 support line directly at 1-800-555-0100.", 'bot', {
                showConnectOptions: true,
                highlightCall: true,
                expertRole: 'Support Specialist',
                expertPhone: '1-800-555-0100'
            });
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
        card.addEventListener('click', () => {
            const catKey = card.getAttribute('data-cat');
            if (categories[catKey]) {
                updateHeroForCategory({ key: catKey, ...categories[catKey] });
                renderLeftSuggestions(catKey);

                if (!chatStarted) {
                    chatBody.innerHTML = '';
                    addChatLabel();
                    const cat = categories[catKey];
                    const avatarSrc = selectedExpert ? selectedExpert.avatar : 'assets/expert-1.png';
                    const expertName = selectedExpert ? selectedExpert.name : 'Specialist';
                    const greetingDiv = document.createElement('div');
                    greetingDiv.className = 'chat-message';
                    greetingDiv.innerHTML = `
                        <img src="${avatarSrc}" alt="${expertName}" class="pearl-avatar">
                        <div class="message-bubble bot-bubble">
                            Hi! I see you are looking for help with <strong>${cat.label}</strong>. How can I help you with this today?
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
            }, 400);
        }
    }
    setInterval(rotateHeadline, 3000);

    // Initial Welcome
    setTimeout(() => {
        showTypingThenMessage("Hi! How can I help you today?");
        renderLeftSuggestions('overall');
    }, 800);

    setTimeout(() => {
        chatInput.focus();
    }, 3000);

    // Handle URL Query Parameter (?q=...) from Homepage
    const urlParams = new URLSearchParams(window.location.search);
    const queryFromHome = urlParams.get('q');
    if (queryFromHome) {
        setTimeout(() => {
            chatInput.value = queryFromHome;
            handleSendMessage();
        }, 3500);
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

    // Scrollspy for Support Page Nav
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
        link.addEventListener('click', function() {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    window.addEventListener('scroll', updateSupportActiveNav);

    // CTA Image Reveal on Scroll
    const ctaImage = document.querySelector('.cta-image-wrap');
    if (ctaImage) {
        const ctaObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.15 });
        ctaObserver.observe(ctaImage);
    }

})();
