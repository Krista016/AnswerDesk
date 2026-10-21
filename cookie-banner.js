// ===== AnswerDesk GDPR / CCPA Cookie Consent Handler =====
(function () {
    'use strict';

    const STORAGE_KEY = 'answerdesk_cookie_consent';

    function initCookieBanner() {
        const consent = localStorage.getItem(STORAGE_KEY);
        if (consent) return; // User already made a choice

        let banner = document.getElementById('cookieConsentBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'cookieConsentBanner';
            banner.className = 'cookie-banner';
            banner.innerHTML = `
                <div class="cookie-text">
                    <strong>🍪 We respect your privacy:</strong> We only use essential cookies strictly necessary for chat operation and anonymous analytics to improve resolution time. We never sell, track, or share your personal data with third-party advertisers. Learn more in our <a href="privacy.html">Privacy Policy</a>.
                </div>
                <div class="cookie-actions">
                    <button type="button" class="btn-cookie-essential" id="cookieEssentialBtn">Essential Only</button>
                    <button type="button" class="btn-cookie-accept" id="cookieAcceptBtn">Accept All</button>
                </div>
            `;
            document.body.appendChild(banner);
        }

        banner.style.display = 'flex';

        const acceptBtn = document.getElementById('cookieAcceptBtn');
        const essentialBtn = document.getElementById('cookieEssentialBtn');

        if (acceptBtn) {
            acceptBtn.addEventListener('click', function () {
                localStorage.setItem(STORAGE_KEY, 'all');
                banner.style.display = 'none';
            });
        }

        if (essentialBtn) {
            essentialBtn.addEventListener('click', function () {
                localStorage.setItem(STORAGE_KEY, 'essential');
                banner.style.display = 'none';
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCookieBanner);
    } else {
        initCookieBanner();
    }
})();
