/**
 * AnswerDesk Privacy-Safe First-Party Analytics Tracker
 * Strictly first-party, cookie-less, zero third-party ad trackers/pixels.
 * Tracks pageviews, Web Vitals (LCP/CLS/TTFB), engagement, site searches (PII-scrubbed),
 * CTA & guide outcomes, 404 hits, Call Now & conversion events, and JS issues.
 */
(function () {
    'use strict';

    if (window.location.pathname.indexOf('/admin') === 0) return;

    const SID_KEY = 'answerdesk_analytics_sid';
    const ATTR_KEY = 'answerdesk_analytics_attr';
    const SEEN_KEY = 'answerdesk_seen';
    const RET_SESS_KEY = 'answerdesk_is_returning';
    const LANDING_KEY = 'answerdesk_landing_path';
    const ENDPOINT = '/api/analytics';

    function safeSessionGet(k) {
        try { return sessionStorage.getItem(k); } catch (_) { return null; }
    }
    function safeSessionSet(k, v) {
        try { sessionStorage.setItem(k, v); } catch (_) {}
    }
    function safeLocalGet(k) {
        try { return localStorage.getItem(k); } catch (_) { return null; }
    }
    function safeLocalSet(k, v) {
        try { localStorage.setItem(k, v); } catch (_) {}
    }

    function getSessionId() {
        let sid = safeSessionGet(SID_KEY);
        if (!sid) {
            sid = 's_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
            safeSessionSet(SID_KEY, sid);
        }
        return sid;
    }

    function getIsReturning() {
        const sessFlag = safeSessionGet(RET_SESS_KEY);
        if (sessFlag === '1' || sessFlag === '0') return sessFlag === '1';
        const seenBefore = Boolean(safeLocalGet(SEEN_KEY));
        safeLocalSet(SEEN_KEY, '1');
        safeSessionSet(RET_SESS_KEY, seenBefore ? '1' : '0');
        return seenBefore;
    }

    function getLandingPath() {
        let lp = safeSessionGet(LANDING_KEY);
        if (!lp) {
            lp = (window.location.pathname || '/').slice(0, 120);
            safeSessionSet(LANDING_KEY, lp);
        }
        return lp;
    }

    function getAttribution() {
        const params = new URLSearchParams(window.location.search || '');
        const utm_source = params.get('utm_source') || '';
        const utm_medium = params.get('utm_medium') || '';
        const utm_campaign = params.get('utm_campaign') || '';
        let click_type = '';
        if (params.get('gclid') || params.get('gbraid') || params.get('wbraid')) click_type = 'gclid';
        else if (params.get('fbclid')) click_type = 'fbclid';
        else if (params.get('msclkid')) click_type = 'msclkid';

        let refHost = '';
        try {
            if (document.referrer) refHost = new URL(document.referrer).hostname || '';
        } catch (_) {}

        let stored = {};
        try { stored = JSON.parse(safeSessionGet(ATTR_KEY) || '{}') || {}; } catch (_) {}

        const merged = {
            utm_source: utm_source || stored.utm_source || '',
            utm_medium: utm_medium || stored.utm_medium || '',
            utm_campaign: utm_campaign || stored.utm_campaign || '',
            click_type: click_type || stored.click_type || '',
            referrer_host: (refHost && refHost !== window.location.hostname) ? refHost : (stored.referrer_host || '')
        };
        try { safeSessionSet(ATTR_KEY, JSON.stringify(merged)); } catch (_) {}
        return merged;
    }

    function inferCategoryFromContext() {
        const params = new URLSearchParams(window.location.search || '');
        const urlCat = params.get('cat');
        if (urlCat) return urlCat;
        if (window.__answerdeskActiveCategory) return window.__answerdeskActiveCategory;
        return '';
    }

    function scrubSearchText(raw) {
        let s = String(raw || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
        if (!s) return '';
        s = s.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[redacted]');
        s = s.replace(/(?:\+?\d[\d\s\-().]{5,}\d|\b\d{7,}\b)/g, '[redacted]');
        return s.slice(0, 80);
    }

    const sid = getSessionId();
    const isReturning = getIsReturning();
    const landingPath = getLandingPath();
    const attr = getAttribution();

    function sendBeaconEvent(payload) {
        const body = JSON.stringify({
            ...payload,
            sid,
            path: window.location.pathname || '/',
            landing_path: landingPath,
            is_returning: isReturning,
            local_hour: new Date().getHours(),
            utm_source: attr.utm_source,
            utm_medium: attr.utm_medium,
            utm_campaign: attr.utm_campaign,
            click_type: attr.click_type,
            referrer_host: attr.referrer_host
        });
        try {
            if (navigator.sendBeacon) {
                const blob = new Blob([body], { type: 'application/json' });
                navigator.sendBeacon(ENDPOINT, blob);
                return;
            }
        } catch (_) {}
        fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true
        }).catch(() => {});
    }

    // Track active visible time & scroll depth
    let activeStart = document.visibilityState === 'visible' ? Date.now() : 0;
    let activeMs = 0;
    let maxScroll = 0;
    let flushedOnce = false;

    function updateScroll() {
        const docEl = document.documentElement;
        const scrollTop = window.scrollY || docEl.scrollTop || 0;
        const winH = window.innerHeight || 0;
        const docH = Math.max(docEl.scrollHeight || 1, document.body ? document.body.scrollHeight : 1);
        const pct = docH <= winH ? 100 : Math.min(100, Math.round(((scrollTop + winH) / docH) * 100));
        if (pct > maxScroll) maxScroll = pct;
    }

    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    // Core Web Vitals (LCP, CLS, TTFB)
    let latestLcpMs = 0;
    let totalCls = 0;
    let vitalsSent = false;

    function initWebVitals() {
        try {
            if (typeof PerformanceObserver !== 'function') return;
            const supported = PerformanceObserver.supportedEntryTypes || [];
            if (supported.indexOf('largest-contentful-paint') !== -1) {
                const lcpObs = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const last = entries[entries.length - 1];
                    if (last && last.startTime > 0) latestLcpMs = Math.round(last.startTime);
                });
                lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
            }
            if (supported.indexOf('layout-shift') !== -1) {
                const clsObs = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            totalCls += entry.value || 0;
                        }
                    }
                });
                clsObs.observe({ type: 'layout-shift', buffered: true });
            }
        } catch (_) {}
    }
    initWebVitals();

    function flushWebVitals() {
        if (vitalsSent) return;
        vitalsSent = true;
        let ttfbMs = 0;
        try {
            const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
            if (nav && nav.responseStart > 0 && nav.responseStart < 30000) {
                ttfbMs = Math.round(nav.responseStart);
            }
        } catch (_) {}
        if (latestLcpMs > 0 || ttfbMs > 0 || totalCls >= 0) {
            sendBeaconEvent({
                event: 'web_vitals',
                lcp_ms: latestLcpMs,
                cls: Number(totalCls.toFixed(4)),
                ttfb_ms: ttfbMs
            });
        }
    }

    function sendPageView() {
        let loadMs = 0;
        try {
            const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
            if (nav && nav.loadEventEnd > 0) loadMs = Math.round(nav.loadEventEnd);
        } catch (_) {}
        sendBeaconEvent({
            event: 'pageview',
            load_ms: loadMs,
            category: inferCategoryFromContext()
        });

        if (document.body && document.body.getAttribute('data-page-type') === '404') {
            sendBeaconEvent({
                event: 'not_found_404',
                referrer_path: (document.referrer || '').slice(0, 120)
            });
        }
    }

    function flushEngagement() {
        if (activeStart) {
            activeMs += Date.now() - activeStart;
            activeStart = document.visibilityState === 'visible' ? Date.now() : 0;
        }
        const sec = Math.round(activeMs / 1000);
        if (sec > 0 || maxScroll > 0 || !flushedOnce) {
            flushedOnce = true;
            activeMs = 0;
            sendBeaconEvent({
                event: 'engagement',
                active_sec: sec,
                max_scroll: maxScroll
            });
        }
        flushWebVitals();
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushEngagement();
        } else {
            activeStart = Date.now();
        }
    });
    window.addEventListener('pagehide', flushEngagement);
    setTimeout(() => {
        flushEngagement();
    }, 10000);

    // Delegated listener for Call clicks, Guide Outcomes, Category Cards & Core CTAs
    document.addEventListener('click', (ev) => {
        const callTarget = ev.target.closest('a[href^="tel:"], #callNowBtn, #callPanelPhoneDisplay, .expert-popup-cta, #inChatCall');
        if (callTarget) {
            const href = callTarget.getAttribute('href') || '';
            if (callTarget.matches('#callNowBtn, #callPanelPhoneDisplay') || href.startsWith('tel:')) {
                sendBeaconEvent({
                    event: 'call_click',
                    category: inferCategoryFromContext()
                });
                return;
            }
        }

        const solvedBtn = ev.target.closest('#btnSolvedIssue');
        if (solvedBtn) {
            sendBeaconEvent({
                event: 'cta_click',
                cta_id: 'guide_solved',
                cta_label: 'Guide Solved Issue',
                category: inferCategoryFromContext()
            });
            return;
        }

        const notSolvedBtn = ev.target.closest('#btnNotSolvedIssue, a.btn-not-solved');
        if (notSolvedBtn) {
            sendBeaconEvent({
                event: 'cta_click',
                cta_id: 'guide_not_solved',
                cta_label: 'Guide Asked Expert',
                category: inferCategoryFromContext()
            });
            return;
        }

        const catCard = ev.target.closest('.category-card[data-cat]');
        if (catCard) {
            const cat = (catCard.getAttribute('data-cat') || '').trim().toLowerCase();
            if (cat) {
                sendBeaconEvent({
                    event: 'cta_click',
                    cta_id: 'category_card_' + cat,
                    cta_label: 'Category Card: ' + cat,
                    category: cat
                });
            }
            return;
        }

        const ctaBtn = ev.target.closest('#floatingChatBtn, .header-cta, .cta-btn, .drawer-cta-btn');
        if (ctaBtn) {
            let ctaId = 'primary_cta';
            let ctaLabel = 'Primary CTA';
            if (ctaBtn.id === 'floatingChatBtn') {
                ctaId = 'floating_ask_expert';
                ctaLabel = 'Floating Ask an Expert';
            } else if (ctaBtn.classList.contains('header-cta')) {
                ctaId = 'header_get_help';
                ctaLabel = 'Header Get Expert Help';
            } else if (ctaBtn.classList.contains('drawer-cta-btn')) {
                ctaId = 'mobile_drawer_cta';
                ctaLabel = 'Mobile Drawer Get Expert Help';
            } else if (ctaBtn.classList.contains('cta-btn')) {
                ctaId = 'page_cta_btn';
                ctaLabel = 'Page CTA Button';
            }
            sendBeaconEvent({
                event: 'cta_click',
                cta_id: ctaId,
                cta_label: ctaLabel,
                category: inferCategoryFromContext()
            });
        }
    }, true);

    // On-site search tracking (Home Hero, Articles, FAQ)
    function attachSearchTracking() {
        const lastSentBySurface = {};

        function reportSearch(surface, rawVal, zeroResult) {
            const cleaned = scrubSearchText(rawVal);
            if (cleaned.length < 2) return;
            const key = cleaned + '|' + (zeroResult ? '0' : '1');
            if (lastSentBySurface[surface] === key) return;
            lastSentBySurface[surface] = key;
            sendBeaconEvent({
                event: 'site_search',
                query: cleaned,
                zero_result: Boolean(zeroResult),
                surface
            });
        }

        // Home hero search
        const heroBtn = document.getElementById('heroSearchBtn');
        const heroInput = document.getElementById('heroSearchInput');
        if (heroBtn && heroInput) {
            heroBtn.addEventListener('click', () => {
                reportSearch('home_hero', heroInput.value, false);
            });
            heroInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') reportSearch('home_hero', heroInput.value, false);
            });
        }

        // Articles search (debounced)
        const artInput = document.getElementById('articleSearchInput');
        if (artInput) {
            let artTimer = null;
            artInput.addEventListener('input', () => {
                clearTimeout(artTimer);
                artTimer = setTimeout(() => {
                    const zeroBox = document.getElementById('articlesZeroResults');
                    const countLbl = document.getElementById('matchCountLabel');
                    const isZero = Boolean(
                        (zeroBox && window.getComputedStyle(zeroBox).display !== 'none') ||
                        (countLbl && /^0\b/.test((countLbl.textContent || '').trim()))
                    );
                    reportSearch('articles', artInput.value, isZero);
                }, 750);
            });
        }

        // FAQ search (debounced)
        const faqInput = document.getElementById('faqSearchInput');
        if (faqInput) {
            let faqTimer = null;
            faqInput.addEventListener('input', () => {
                clearTimeout(faqTimer);
                faqTimer = setTimeout(() => {
                    const items = Array.from(document.querySelectorAll('.faq-item'));
                    const visibleCount = items.filter(el => el.style.display !== 'none' && el.offsetParent !== null).length;
                    reportSearch('faq', faqInput.value, items.length > 0 && visibleCount === 0);
                }, 750);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachSearchTracking, { once: true });
    } else {
        attachSearchTracking();
    }

    // Track client-side JS runtime errors for Site Health monitor
    window.addEventListener('error', (ev) => {
        if (!ev || !ev.message) return;
        sendBeaconEvent({
            event: 'client_error',
            error_message: String(ev.message).slice(0, 180)
        });
    });
    window.addEventListener('unhandledrejection', (ev) => {
        const msg = ev && ev.reason ? (ev.reason.message || String(ev.reason)) : 'Unhandled promise rejection';
        sendBeaconEvent({
            event: 'client_error',
            error_message: String(msg).slice(0, 180)
        });
    });

    function trackEvent(eventType, meta) {
        if (!eventType) return;
        const m = (meta && typeof meta === 'object') ? meta : {};
        sendBeaconEvent({
            event: String(eventType),
            category: m.category || inferCategoryFromContext(),
            ...m
        });
    }

    window.AnswerDeskAnalytics = {
        track: trackEvent,
        flush: flushEngagement
    };

    window.addEventListener('load', () => {
        setTimeout(sendPageView, 120);
    }, { once: true });
})();
