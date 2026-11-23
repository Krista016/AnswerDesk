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
                    <strong>🍪 We respect your privacy:</strong> We only use essential cookies strictly necessary for chat operation and anonymous analytics to improve resolution time. We never sell, track, or share your personal data with third-party advertisers. Learn more in our <a href="/privacy">Privacy Policy</a>.
                </div>
                <div class="cookie-actions">
                    <button type="button" class="btn-cookie-essential" id="cookieEssentialBtn">Essential Only</button>
                    <button type="button" class="btn-cookie-accept" id="cookieAcceptBtn">Accept All</button>
                </div>
            `;
            document.body.appendChild(banner);
        }

        banner.style.display = 'flex';
        document.body.classList.add('has-cookie-banner');

        function updateBannerOffset() {
            if (banner.style.display === 'none') return;
            const h = banner.offsetHeight || 120;
            document.documentElement.style.setProperty('--cookie-banner-offset', (h + 24) + 'px');
        }

        requestAnimationFrame(updateBannerOffset);
        window.addEventListener('resize', updateBannerOffset);

        function dismissBanner(choice) {
            localStorage.setItem(STORAGE_KEY, choice);
            banner.style.display = 'none';
            document.body.classList.remove('has-cookie-banner');
            document.documentElement.style.removeProperty('--cookie-banner-offset');
            window.removeEventListener('resize', updateBannerOffset);
        }

        const acceptBtn = document.getElementById('cookieAcceptBtn');
        const essentialBtn = document.getElementById('cookieEssentialBtn');

        if (acceptBtn) {
            acceptBtn.addEventListener('click', function () {
                dismissBanner('all');
            });
        }

        if (essentialBtn) {
            essentialBtn.addEventListener('click', function () {
                dismissBanner('essential');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCookieBanner);
    } else {
        initCookieBanner();
    }
})();
