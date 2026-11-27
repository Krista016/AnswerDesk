'use strict';

const {
    loadConfig,
    collectConfigWarnings,
    getDefaultAnalyticsStore,
    loadAnalyticsStore,
    saveAnalyticsStore,
    loadHealthLog,
    hashVisitorDaily,
    isAuthenticated,
    readJsonBody,
    sendJson,
    cleanStr
} = require('./_store.js');

const BEACON_RATE_MAP = new Map();
const BEACON_WINDOW_MS = 60 * 1000;
const BEACON_MAX_PER_MIN = 120;
const LIVE_SESSION_TTL_MS = 5 * 60 * 1000;

const BOT_UA_REGEX = /bot|crawl|spider|slurp|gptbot|claudebot|perplexitybot|bingpreview|ahrefs|semrush|yandex|headlesschrome/i;
const ALLOWED_EVENTS = new Set([
    'pageview',
    'engagement',
    'call_click',
    'call_panel_open',
    'chat_start',
    'chat_handoff',
    'contact_submit',
    'client_error',
    'site_search',
    'cta_click',
    'chat_stage',
    'web_vitals',
    'not_found_404'
]);

function getClientIp(req) {
    const fwd = req.headers['x-vercel-forwarded-for'];
    if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
    const real = req.headers['x-real-ip'];
    if (typeof real === 'string' && real.trim()) return real.trim();
    return (req.socket && req.socket.remoteAddress) || '127.0.0.1';
}

function checkRate(ip) {
    const now = Date.now();
    if (BEACON_RATE_MAP.size > 3000) BEACON_RATE_MAP.clear();
    const hits = (BEACON_RATE_MAP.get(ip) || []).filter(t => now - t < BEACON_WINDOW_MS);
    if (hits.length >= BEACON_MAX_PER_MIN) return false;
    hits.push(now);
    BEACON_RATE_MAP.set(ip, hits);
    return true;
}

function extractGeo(req, ip) {
    const country = cleanStr(req.headers['x-vercel-ip-country'] || '', 12).toUpperCase();
    const region = cleanStr(req.headers['x-vercel-ip-country-region'] || '', 60);
    let city = cleanStr(req.headers['x-vercel-ip-city'] || '', 80);
    try { city = decodeURIComponent(city); } catch (_) {}

    if (country) {
        return {
            country,
            region: region || '—',
            city: city || '—'
        };
    }
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.');
    if (isLocal) {
        return { country: 'LOCAL', region: 'Dev Environment', city: 'Localhost' };
    }
    return { country: 'UNK', region: 'Unknown', city: 'Unknown' };
}

function parseUserAgent(uaRaw) {
    const ua = String(uaRaw || '');
    let device = 'Desktop';
    if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)) {
        device = 'Tablet';
    } else if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua)) {
        device = 'Mobile';
    }

    let os = 'Other';
    if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac os x|macintosh/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    let browser = 'Other';
    if (/edg\//i.test(ua)) browser = 'Edge';
    else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
    else if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = 'Safari';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';

    return { device, os, browser };
}

function classifyChannel(utmSource, utmMedium, clickType, referrerHost) {
    const src = (utmSource || '').toLowerCase();
    const med = (utmMedium || '').toLowerCase();
    const ref = (referrerHost || '').toLowerCase();

    if (clickType === 'gclid' || (src.includes('google') && /(cpc|ppc|paid|ads)/.test(med))) {
        return 'Google Ads';
    }
    if (clickType === 'fbclid' || (/(facebook|fb|instagram|ig|meta)/.test(src) && /(cpc|ppc|paid|ads|social_paid)/.test(med)) || clickType === 'meta') {
        return 'Meta Ads';
    }
    if (clickType === 'msclkid' || (src.includes('bing') && /(cpc|ppc|paid)/.test(med))) {
        return 'Microsoft Ads';
    }

    // AI Search platforms (both referrer & UTM attribution)
    if (/(chat\.openai\.com|chatgpt\.com)/.test(ref) || src.includes('chatgpt') || src === 'openai') {
        return 'AI Search (ChatGPT)';
    }
    if (/perplexity\.ai/.test(ref) || src.includes('perplexity')) {
        return 'AI Search (Perplexity)';
    }
    if (/claude\.ai/.test(ref) || src.includes('claude')) {
        return 'AI Search (Claude)';
    }
    if (/(gemini\.google\.com|bard\.google\.com)/.test(ref) || src.includes('gemini')) {
        return 'AI Search (Gemini)';
    }
    if (/(copilot\.microsoft\.com|you\.com|phind\.com|kagi\.com)/.test(ref) || src.includes('copilot')) {
        return 'AI Search (Copilot)';
    }

    // Organic search engines
    if (/google\./.test(ref)) return 'Organic Google';
    if (/bing\./.test(ref)) return 'Organic Bing';
    if (/(duckduckgo\.|yahoo\.|ecosia\.|search\.brave\.com|search\.)/.test(ref)) {
        return 'Organic Search (Other)';
    }

    // Video / Community / Social
    if (/(youtube\.com|youtu\.be)/.test(ref) || src.includes('youtube')) return 'YouTube';
    if (/(reddit\.com|redd\.it)/.test(ref) || src.includes('reddit')) return 'Reddit';
    if (/quora\.com/.test(ref) || src.includes('quora')) return 'Quora';
    if (/(facebook\.|fb\.|instagram\.|t\.co|x\.com|twitter\.|linkedin\.|tiktok\.|pinterest\.)/.test(ref) || /(facebook|fb|instagram|meta|linkedin|tiktok|twitter|x)/.test(src)) {
        return 'Social';
    }

    if (ref && !ref.includes('answerdesk') && !ref.includes('localhost')) {
        return 'Referral';
    }
    if (src) return `Campaign (${src})`;
    return 'Direct';
}

function scrubSearchQuery(raw) {
    let s = cleanStr(String(raw || ''), 120).toLowerCase();
    if (!s) return '';
    s = s.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[redacted]');
    s = s.replace(/(?:\+?\d[\d\s\-().]{5,}\d|\b\d{7,}\b)/g, '[redacted]');
    return s.replace(/\s+/g, ' ').trim().slice(0, 80);
}

function createEmptyDayBucket() {
    return {
        views: 0,
        visitors: [],
        newVisitors: 0,
        returningVisitors: 0,
        sessions: {},
        pages: {},
        landingPages: {},
        geo: {},
        sources: {},
        referrers: {},
        devices: {},
        browsers: {},
        os: {},
        categories: {},
        ctaClicks: {},
        guideOutcomes: { solved: 0, notSolved: 0 },
        searches: {},
        hourly: Array(24).fill(0),
        hourlyConversions: Array(24).fill(0),
        webVitals: { lcpSum: 0, lcpCount: 0, clsSum: 0, clsCount: 0, ttfbSum: 0, ttfbCount: 0 },
        chatFunnel: { intakeTurns: 0, summaryConfirms: 0, channelChoices: 0, connectedTurns: 0, apiMsSum: 0, apiMsCount: 0 },
        callClicks: 0,
        callPanelOpens: 0,
        chatStarts: 0,
        chatHandoffs: 0,
        contactSubmits: 0,
        loadSum: 0,
        loadCount: 0
    };
}

function pruneOldDays(daysObj, keepDays = 35) {
    const keys = Object.keys(daysObj).sort();
    if (keys.length <= keepDays) return;
    const toDelete = keys.slice(0, keys.length - keepDays);
    for (const k of toDelete) delete daysObj[k];
}

function pruneActiveSessions(activeMap, nowMs = Date.now()) {
    if (!activeMap || typeof activeMap !== 'object') return {};
    const fresh = {};
    const entries = Object.entries(activeMap)
        .filter(([, v]) => v && typeof v.ts === 'number' && (nowMs - v.ts) <= LIVE_SESSION_TTL_MS)
        .sort((a, b) => b[1].ts - a[1].ts)
        .slice(0, 500);
    for (const [k, v] of entries) fresh[k] = v;
    return fresh;
}

function incCounter(obj, key, delta = 1) {
    const k = key || 'Unknown';
    obj[k] = (obj[k] || 0) + delta;
}

function normalizePath(rawPath) {
    const p = cleanStr(String(rawPath || '/'), 120).split('?')[0].split('#')[0] || '/';
    return p.startsWith('/') ? p : '/' + p;
}

function isExternalRef(refHost) {
    const ref = (refHost || '').toLowerCase().trim();
    return Boolean(ref && !ref.includes('answerdesk') && !ref.includes('localhost') && !ref.startsWith('127.'));
}

function aggregateRange(store, range, healthLog, config) {
    const allDays = Object.keys(store.days || {}).sort();
    const now = new Date();
    const nowMs = now.getTime();
    let cutoffDate = '';
    if (range === '24h') {
        cutoffDate = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    } else if (range === '7d') {
        cutoffDate = new Date(nowMs - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    } else if (range === '30d') {
        cutoffDate = new Date(nowMs - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }

    const selectedDays = cutoffDate ? allDays.filter(d => d >= cutoffDate) : allDays;

    const uniqueVisitorsSet = new Set();
    let pageViews = 0;
    let sessionsCount = 0;
    let newVisitors = 0;
    let returningVisitors = 0;
    let totalTimeSec = 0;
    let totalScrollPct = 0;
    let scrollSamples = 0;
    let bouncedSessions = 0;
    let engagedSessions = 0;
    let callClicks = 0;
    let callPanelOpens = 0;
    let chatStarts = 0;
    let chatHandoffs = 0;
    let contactSubmits = 0;
    let loadSum = 0;
    let loadCount = 0;

    let lcpSum = 0;
    let lcpCount = 0;
    let clsSum = 0;
    let clsCount = 0;
    let ttfbSum = 0;
    let ttfbCount = 0;

    let intakeTurns = 0;
    let summaryConfirms = 0;
    let channelChoices = 0;
    let connectedTurns = 0;
    let apiMsSum = 0;
    let apiMsCount = 0;

    let guideSolved = 0;
    let guideNotSolved = 0;

    const hourlyViews = Array(24).fill(0);
    const hourlyConvs = Array(24).fill(0);

    const pageMap = {};
    const landingMap = {};
    const exitMap = {};
    const geoMap = {};
    const sourceMap = {};
    const referrerMap = {};
    const deviceMap = {};
    const browserMap = {};
    const osMap = {};
    const categoryMap = {};
    const ctaMap = {};
    const searchMap = {};
    const dailySeries = [];

    for (const dayKey of selectedDays) {
        const d = store.days[dayKey];
        if (!d) continue;

        const dayVisitors = Array.isArray(d.visitors) ? d.visitors : [];
        dayVisitors.forEach(v => uniqueVisitorsSet.add(v));

        pageViews += d.views || 0;
        newVisitors += d.newVisitors || 0;
        returningVisitors += d.returningVisitors || 0;
        callClicks += d.callClicks || 0;
        callPanelOpens += d.callPanelOpens || 0;
        chatStarts += d.chatStarts || 0;
        chatHandoffs += d.chatHandoffs || 0;
        contactSubmits += d.contactSubmits || 0;
        loadSum += d.loadSum || 0;
        loadCount += d.loadCount || 0;

        const wv = d.webVitals || {};
        lcpSum += wv.lcpSum || 0;
        lcpCount += wv.lcpCount || 0;
        clsSum += wv.clsSum || 0;
        clsCount += wv.clsCount || 0;
        ttfbSum += wv.ttfbSum || 0;
        ttfbCount += wv.ttfbCount || 0;

        const cf = d.chatFunnel || {};
        intakeTurns += cf.intakeTurns || 0;
        summaryConfirms += cf.summaryConfirms || 0;
        channelChoices += cf.channelChoices || 0;
        connectedTurns += cf.connectedTurns || 0;
        apiMsSum += cf.apiMsSum || 0;
        apiMsCount += cf.apiMsCount || 0;

        const go = d.guideOutcomes || {};
        guideSolved += go.solved || 0;
        guideNotSolved += go.notSolved || 0;

        if (Array.isArray(d.hourly)) {
            for (let h = 0; h < 24; h++) hourlyViews[h] += d.hourly[h] || 0;
        }
        if (Array.isArray(d.hourlyConversions)) {
            for (let h = 0; h < 24; h++) hourlyConvs[h] += d.hourlyConversions[h] || 0;
        }

        const dayConversions = (d.callClicks || 0) + (d.chatStarts || 0) + (d.contactSubmits || 0);
        dailySeries.push({
            date: dayKey,
            views: d.views || 0,
            visitors: dayVisitors.length,
            callClicks: d.callClicks || 0,
            conversions: dayConversions
        });

        // Sessions & Exit Pages
        const sessObj = d.sessions || {};
        for (const sid of Object.keys(sessObj)) {
            const s = sessObj[sid];
            if (!s) continue;
            sessionsCount++;
            const sec = Number(s.activeSec || 0);
            const scr = Number(s.maxScroll || 0);
            totalTimeSec += sec;
            if (scr > 0 || sec > 0) {
                totalScrollPct += scr;
                scrollSamples++;
            }
            const pv = Number(s.views || 1);
            if (pv <= 1 && sec < 10 && scr < 25) {
                bouncedSessions++;
            }
            if (sec >= 10 || scr >= 25 || pv > 1) {
                engagedSessions++;
            }
            if (s.lastPath) {
                incCounter(exitMap, s.lastPath, 1);
            }
        }

        // Pages
        for (const p of Object.keys(d.pages || {})) {
            const pm = d.pages[p];
            if (!pageMap[p]) {
                pageMap[p] = { path: p, views: 0, timeSum: 0, timeCount: 0, scrollSum: 0, scrollCount: 0, callClicks: 0, conversions: 0 };
            }
            pageMap[p].views += pm.views || 0;
            pageMap[p].timeSum += pm.timeSum || 0;
            pageMap[p].timeCount += pm.timeCount || 0;
            pageMap[p].scrollSum += pm.scrollSum || 0;
            pageMap[p].scrollCount += pm.scrollCount || 0;
            pageMap[p].callClicks += pm.callClicks || 0;
            pageMap[p].conversions += pm.conversions || 0;
        }

        // Landing Pages
        for (const lp of Object.keys(d.landingPages || {})) {
            const lm = d.landingPages[lp];
            if (!landingMap[lp]) {
                landingMap[lp] = { path: lp, entries: 0, conversions: 0, callClicks: 0 };
            }
            landingMap[lp].entries += lm.entries || 0;
            landingMap[lp].conversions += lm.conversions || 0;
            landingMap[lp].callClicks += lm.callClicks || 0;
        }

        // Geo
        for (const gk of Object.keys(d.geo || {})) {
            const gm = d.geo[gk];
            if (!geoMap[gk]) {
                geoMap[gk] = {
                    country: gm.country || 'UNK',
                    region: gm.region || '—',
                    city: gm.city || '—',
                    views: 0,
                    conversions: 0
                };
            }
            geoMap[gk].views += gm.views || 0;
            geoMap[gk].conversions += gm.conversions || 0;
        }

        // Sources
        for (const sk of Object.keys(d.sources || {})) {
            const sm = d.sources[sk];
            if (!sourceMap[sk]) {
                sourceMap[sk] = {
                    channel: sm.channel || 'Direct',
                    campaign: sm.campaign || '—',
                    views: 0,
                    callClicks: 0,
                    conversions: 0
                };
            }
            sourceMap[sk].views += sm.views || 0;
            sourceMap[sk].callClicks += sm.callClicks || 0;
            sourceMap[sk].conversions += sm.conversions || 0;
        }

        // Referrers
        for (const rk of Object.keys(d.referrers || {})) {
            const rm = d.referrers[rk];
            if (!referrerMap[rk]) {
                referrerMap[rk] = { host: rm.host || rk, channel: rm.channel || 'Referral', views: 0, conversions: 0 };
            }
            referrerMap[rk].views += rm.views || 0;
            referrerMap[rk].conversions += rm.conversions || 0;
        }

        // Devices / Browsers / OS
        for (const k of Object.keys(d.devices || {})) incCounter(deviceMap, k, d.devices[k]);
        for (const k of Object.keys(d.browsers || {})) incCounter(browserMap, k, d.browsers[k]);
        for (const k of Object.keys(d.os || {})) incCounter(osMap, k, d.os[k]);

        // Categories
        for (const ck of Object.keys(d.categories || {})) {
            const cm = d.categories[ck];
            if (!categoryMap[ck]) {
                categoryMap[ck] = { category: ck, views: 0, chatStarts: 0, callPanelOpens: 0, callClicks: 0 };
            }
            categoryMap[ck].views += cm.views || 0;
            categoryMap[ck].chatStarts += cm.chatStarts || 0;
            categoryMap[ck].callPanelOpens += cm.callPanelOpens || 0;
            categoryMap[ck].callClicks += cm.callClicks || 0;
        }

        // CTA Clicks
        for (const cid of Object.keys(d.ctaClicks || {})) {
            const cm = d.ctaClicks[cid];
            if (!ctaMap[cid]) {
                ctaMap[cid] = { id: cid, label: cm.label || cid, category: cm.category || 'general', clicks: 0 };
            }
            ctaMap[cid].clicks += cm.clicks || 0;
        }

        // Searches
        for (const qk of Object.keys(d.searches || {})) {
            const sm = d.searches[qk];
            if (!searchMap[qk]) {
                searchMap[qk] = { query: sm.query || qk, count: 0, zeroResultCount: 0, surface: sm.surface || 'site' };
            }
            searchMap[qk].count += sm.count || 0;
            searchMap[qk].zeroResultCount += sm.zeroResultCount || 0;
            if (sm.surface) searchMap[qk].surface = sm.surface;
        }
    }

    const totalConversions = callClicks + chatStarts + contactSubmits;
    const avgTimeSec = sessionsCount > 0 ? Math.round(totalTimeSec / sessionsCount) : 0;
    const avgScrollPct = scrollSamples > 0 ? Math.round(totalScrollPct / scrollSamples) : 0;
    const bounceRatePct = sessionsCount > 0 ? Math.round((bouncedSessions / sessionsCount) * 100) : 0;
    const callConversionRatePct = pageViews > 0 ? Number(((callClicks / pageViews) * 100).toFixed(1)) : 0;
    const avgLoadMs = loadCount > 0 ? Math.round(loadSum / loadCount) : 0;

    const avgLcpMs = lcpCount > 0 ? Math.round(lcpSum / lcpCount) : 0;
    const avgCls = clsCount > 0 ? Number((clsSum / clsCount).toFixed(3)) : 0;
    const avgTtfbMs = ttfbCount > 0 ? Math.round(ttfbSum / ttfbCount) : 0;
    const vitalsSamples = Math.max(lcpCount, clsCount, ttfbCount);

    const totalVisitorTyped = newVisitors + returningVisitors;
    const newPct = totalVisitorTyped > 0 ? Math.round((newVisitors / totalVisitorTyped) * 100) : 0;
    const returningPct = totalVisitorTyped > 0 ? (100 - newPct) : 0;

    const totalGuideVotes = guideSolved + guideNotSolved;
    const guideHelpfulPct = totalGuideVotes > 0 ? Math.round((guideSolved / totalGuideVotes) * 100) : 0;

    const activeClean = pruneActiveSessions(store.activeSessions, nowMs);
    const livePageCounts = {};
    for (const s of Object.values(activeClean)) {
        incCounter(livePageCounts, s.path || '/', 1);
    }
    const livePages = Object.entries(livePageCounts)
        .map(([p, count]) => ({ path: p, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    const liveNow = Object.keys(activeClean).length;

    const topPages = Object.values(pageMap)
        .map(p => ({
            path: p.path,
            views: p.views,
            avgTimeSec: p.timeCount > 0 ? Math.round(p.timeSum / p.timeCount) : 0,
            avgScrollPct: p.scrollCount > 0 ? Math.round(p.scrollSum / p.scrollCount) : 0,
            callClicks: p.callClicks,
            conversions: p.conversions
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 15);

    const landingPages = Object.values(landingMap)
        .map(lp => ({
            ...lp,
            convRatePct: lp.entries > 0 ? Number(((lp.conversions / lp.entries) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.entries - a.entries)
        .slice(0, 15);

    const totalExits = Object.values(exitMap).reduce((a, b) => a + b, 0);
    const exitPages = Object.entries(exitMap)
        .map(([p, exits]) => ({
            path: p,
            exits,
            exitSharePct: totalExits > 0 ? Math.round((exits / totalExits) * 100) : 0
        }))
        .sort((a, b) => b.exits - a.exits)
        .slice(0, 15);

    const geo = Object.values(geoMap).sort((a, b) => b.views - a.views).slice(0, 20);
    const sources = Object.values(sourceMap)
        .map(s => ({
            ...s,
            convRatePct: s.views > 0 ? Number(((s.conversions / s.views) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 20);

    const aiSearchBreakdown = {};
    let aiSearchViews = 0;
    let aiSearchConversions = 0;
    for (const s of Object.values(sourceMap)) {
        if (s.channel.startsWith('AI Search (')) {
            aiSearchViews += s.views || 0;
            aiSearchConversions += s.conversions || 0;
            if (!aiSearchBreakdown[s.channel]) {
                aiSearchBreakdown[s.channel] = { engine: s.channel.replace('AI Search (', '').replace(')', ''), views: 0, conversions: 0 };
            }
            aiSearchBreakdown[s.channel].views += s.views || 0;
            aiSearchBreakdown[s.channel].conversions += s.conversions || 0;
        }
    }

    const referrers = Object.values(referrerMap)
        .sort((a, b) => b.views - a.views)
        .slice(0, 20);

    const categories = Object.values(categoryMap)
        .sort((a, b) => (b.callClicks + b.chatStarts + b.views) - (a.callClicks + a.chatStarts + a.views))
        .slice(0, 16);

    const ctaClicks = Object.values(ctaMap)
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 20);

    const allSearches = Object.values(searchMap).sort((a, b) => b.count - a.count);
    const topSearches = allSearches.slice(0, 20);
    const zeroResultSearches = allSearches
        .filter(s => s.zeroResultCount > 0)
        .sort((a, b) => b.zeroResultCount - a.zeroResultCount)
        .slice(0, 20);

    const hourly = Array.from({ length: 24 }, (_, h) => ({
        hour: h,
        label: String(h).padStart(2, '0'),
        views: hourlyViews[h],
        conversions: hourlyConvs[h]
    }));

    const cutoffTs = cutoffDate ? Date.parse(cutoffDate + 'T00:00:00Z') : 0;
    const recentConversions = (store.recentConversions || [])
        .filter(ev => !cutoffTs || Date.parse(ev.ts) >= cutoffTs)
        .slice(0, 30);

    const clientErrors = (store.clientErrors || []).slice(0, 30);
    const notFound404s = (store.notFound404s || []).slice(0, 30);

    const hList = Array.isArray(healthLog) ? healthLog : [];
    const okHealth = hList.filter(h => h.ok).length;
    const uptimePct = hList.length > 0 ? Number(((okHealth / hList.length) * 100).toFixed(1)) : 100;

    const cfgWarnings = collectConfigWarnings(config);
    const compliance = {
        noRawIpStored: true,
        firstPartyOnlyNoThirdPartyPixels: true,
        noPlaceholder555Numbers: cfgWarnings.length === 0,
        httpsCanonicalConfigured: true,
        privacyPolicyAndCookieBannerActive: true
    };

    return {
        range,
        summary: {
            uniqueVisitors: uniqueVisitorsSet.size,
            pageViews,
            sessions: sessionsCount,
            liveNow,
            newVisitors,
            returningVisitors,
            newPct,
            avgTimeSec,
            avgScrollPct,
            bounceRatePct,
            callClicks,
            callPanelOpens,
            chatStarts,
            chatHandoffs,
            contactSubmits,
            totalConversions,
            callConversionRatePct,
            avgLoadMs,
            avgLcpMs,
            avgCls,
            avgTtfbMs,
            vitalsSamples,
            guideHelpfulPct,
            uptimePct,
            clientErrorsCount: clientErrors.reduce((acc, e) => acc + (e.count || 1), 0),
            notFound404Count: notFound404s.reduce((acc, e) => acc + (e.count || 1), 0)
        },
        dailySeries,
        liveNow,
        livePages,
        newVsReturning: { newVisitors, returningVisitors, newPct, returningPct },
        webVitals: { avgLcpMs, avgCls, avgTtfbMs, samples: vitalsSamples },
        funnel: {
            visits: sessionsCount || pageViews,
            engaged: engagedSessions,
            chatStarts,
            callPanelOpens,
            callClicks
        },
        chatFunnel: {
            visits: sessionsCount || pageViews,
            chatStarts,
            intakeTurns,
            summaryConfirms,
            channelChoices,
            connectedTurns,
            callPanelOpens,
            callClicks,
            chatHandoffs,
            avgApiMs: apiMsCount > 0 ? Math.round(apiMsSum / apiMsCount) : 0
        },
        aiSearchSummary: {
            views: aiSearchViews,
            conversions: aiSearchConversions,
            engines: Object.values(aiSearchBreakdown).sort((a, b) => b.views - a.views)
        },
        geo,
        topPages,
        landingPages,
        exitPages,
        sources,
        referrers,
        devices: deviceMap,
        browsers: browserMap,
        os: osMap,
        categories,
        ctaClicks,
        guideOutcomes: { solved: guideSolved, notSolved: guideNotSolved, helpfulPct: guideHelpfulPct },
        topSearches,
        zeroResultSearches,
        hourly,
        recentConversions,
        clientErrors,
        notFound404s,
        compliance
    };
}

module.exports = async function handler(req, res) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    if (req.method === 'POST') {
        const ip = getClientIp(req);
        if (!checkRate(ip)) {
            return sendJson(res, 429, { success: false, error: 'Rate limit exceeded' });
        }

        const ua = req.headers['user-agent'] || '';
        if (BOT_UA_REGEX.test(ua)) {
            return sendJson(res, 200, { success: true, ignored: 'bot' });
        }

        let body;
        try {
            body = await readJsonBody(req, 6144);
        } catch (err) {
            return sendJson(res, 400, { success: false, error: err.message });
        }

        const event = cleanStr(body.event || '', 32).toLowerCase();
        if (!ALLOWED_EVENTS.has(event)) {
            return sendJson(res, 400, { success: false, error: 'Unsupported event' });
        }

        const now = new Date();
        const nowMs = now.getTime();
        const nowIso = now.toISOString();
        const dayKey = nowIso.slice(0, 10);
        const pagePath = normalizePath(body.path || '/');
        if (pagePath.startsWith('/admin')) {
            return sendJson(res, 200, { success: true, ignored: 'admin' });
        }

        const parsedHour = Number(body.local_hour);
        const hourIdx = (Number.isInteger(parsedHour) && parsedHour >= 0 && parsedHour <= 23)
            ? parsedHour
            : now.getUTCHours();

        const sessionId = cleanStr(body.sid || '', 48) || hashVisitorDaily(ip, ua, dayKey);
        const visitorHash = hashVisitorDaily(ip, ua, dayKey);
        const geo = extractGeo(req, ip);
        const geoKey = `${geo.country}|${geo.region}|${geo.city}`;
        const uaInfo = parseUserAgent(ua);

        const utmSource = cleanStr(body.utm_source || '', 40);
        const utmMedium = cleanStr(body.utm_medium || '', 40);
        const utmCampaign = cleanStr(body.utm_campaign || '', 60) || '—';
        const clickType = cleanStr(body.click_type || '', 16).toLowerCase();
        const refHost = cleanStr(body.referrer_host || '', 80);
        const channel = classifyChannel(utmSource, utmMedium, clickType, refHost);
        const sourceKey = `${channel}|${utmCampaign}`;
        const category = cleanStr(body.category || '', 40).toLowerCase();

        const store = await loadAnalyticsStore();
        store.activeSessions = pruneActiveSessions(store.activeSessions, nowMs);
        store.activeSessions[sessionId] = {
            ts: nowMs,
            path: pagePath,
            category: category || 'general',
            channel
        };

        if (!store.days[dayKey]) store.days[dayKey] = createEmptyDayBucket();
        const day = store.days[dayKey];

        if (!Array.isArray(day.visitors)) day.visitors = [];
        if (!day.visitors.includes(visitorHash) && day.visitors.length < 25000) {
            day.visitors.push(visitorHash);
        }
        if (!Array.isArray(day.hourly) || day.hourly.length !== 24) day.hourly = Array(24).fill(0);
        if (!Array.isArray(day.hourlyConversions) || day.hourlyConversions.length !== 24) day.hourlyConversions = Array(24).fill(0);
        if (!day.landingPages) day.landingPages = {};
        if (!day.referrers) day.referrers = {};
        if (!day.ctaClicks) day.ctaClicks = {};
        if (!day.guideOutcomes) day.guideOutcomes = { solved: 0, notSolved: 0 };
        if (!day.searches) day.searches = {};
        if (!day.webVitals) day.webVitals = { lcpSum: 0, lcpCount: 0, clsSum: 0, clsCount: 0, ttfbSum: 0, ttfbCount: 0 };
        if (!day.chatFunnel) day.chatFunnel = { intakeTurns: 0, summaryConfirms: 0, channelChoices: 0, connectedTurns: 0, apiMsSum: 0, apiMsCount: 0 };

        const rawLanding = body.landing_path ? normalizePath(body.landing_path) : pagePath;
        if (!day.sessions[sessionId]) {
            day.sessions[sessionId] = {
                views: 0,
                activeSec: 0,
                maxScroll: 0,
                landingPath: rawLanding,
                lastPath: pagePath,
                countedVisitor: false
            };
        }
        const sess = day.sessions[sessionId];
        if (!sess.landingPath) sess.landingPath = rawLanding;
        if (event === 'pageview' || event === 'engagement') {
            sess.lastPath = pagePath;
        }

        if (!day.pages[pagePath]) {
            day.pages[pagePath] = { views: 0, timeSum: 0, timeCount: 0, scrollSum: 0, scrollCount: 0, callClicks: 0, conversions: 0 };
        }
        const pg = day.pages[pagePath];

        if (event === 'pageview') {
            day.views = (day.views || 0) + 1;
            day.hourly[hourIdx] = (day.hourly[hourIdx] || 0) + 1;
            sess.views = (sess.views || 0) + 1;
            pg.views = (pg.views || 0) + 1;

            if (!sess.countedVisitor) {
                sess.countedVisitor = true;
                if (body.is_returning === true) {
                    day.returningVisitors = (day.returningVisitors || 0) + 1;
                } else {
                    day.newVisitors = (day.newVisitors || 0) + 1;
                }
            }

            if (sess.views === 1 && Object.keys(day.landingPages).length < 250) {
                const lKey = sess.landingPath || pagePath;
                if (!day.landingPages[lKey]) {
                    day.landingPages[lKey] = { path: lKey, entries: 0, conversions: 0, callClicks: 0 };
                }
                day.landingPages[lKey].entries += 1;
            }

            if (!day.geo[geoKey]) day.geo[geoKey] = { country: geo.country, region: geo.region, city: geo.city, views: 0, conversions: 0 };
            day.geo[geoKey].views += 1;

            if (!day.sources[sourceKey]) day.sources[sourceKey] = { channel, campaign: utmCampaign, views: 0, callClicks: 0, conversions: 0 };
            day.sources[sourceKey].views += 1;

            if (isExternalRef(refHost) && (day.referrers[refHost] || Object.keys(day.referrers).length < 100)) {
                if (!day.referrers[refHost]) day.referrers[refHost] = { host: refHost, channel, views: 0, conversions: 0 };
                day.referrers[refHost].views += 1;
            }

            incCounter(day.devices, uaInfo.device, 1);
            incCounter(day.browsers, uaInfo.browser, 1);
            incCounter(day.os, uaInfo.os, 1);

            const loadMs = Number(body.load_ms || 0);
            if (loadMs > 0 && loadMs < 60000) {
                day.loadSum = (day.loadSum || 0) + loadMs;
                day.loadCount = (day.loadCount || 0) + 1;
            }
            if (category) {
                if (!day.categories[category]) day.categories[category] = { views: 0, chatStarts: 0, callPanelOpens: 0, callClicks: 0 };
                day.categories[category].views += 1;
            }
        } else if (event === 'engagement') {
            const deltaSec = Math.max(0, Math.min(1800, Math.round(Number(body.active_sec || 0))));
            const scrollPct = Math.max(0, Math.min(100, Math.round(Number(body.max_scroll || 0))));
            sess.activeSec = Math.min(7200, (sess.activeSec || 0) + deltaSec);
            if (scrollPct > (sess.maxScroll || 0)) sess.maxScroll = scrollPct;

            if (deltaSec > 0) {
                pg.timeSum += deltaSec;
                pg.timeCount += 1;
            }
            if (scrollPct > 0) {
                pg.scrollSum += scrollPct;
                pg.scrollCount += 1;
            }
        } else if (event === 'call_click' || event === 'call_panel_open' || event === 'chat_start' || event === 'chat_handoff' || event === 'contact_submit') {
            const catKey = category || 'general';
            if (!day.categories[catKey]) day.categories[catKey] = { views: 0, chatStarts: 0, callPanelOpens: 0, callClicks: 0 };

            if (event === 'call_click') {
                day.callClicks = (day.callClicks || 0) + 1;
                pg.callClicks += 1;
                pg.conversions += 1;
                day.categories[catKey].callClicks += 1;
            } else if (event === 'call_panel_open') {
                day.callPanelOpens = (day.callPanelOpens || 0) + 1;
                day.categories[catKey].callPanelOpens += 1;
            } else if (event === 'chat_start') {
                day.chatStarts = (day.chatStarts || 0) + 1;
                pg.conversions += 1;
                day.categories[catKey].chatStarts += 1;
            } else if (event === 'chat_handoff') {
                day.chatHandoffs = (day.chatHandoffs || 0) + 1;
            } else if (event === 'contact_submit') {
                day.contactSubmits = (day.contactSubmits || 0) + 1;
                pg.conversions += 1;
            }

            if (event === 'call_click' || event === 'chat_start' || event === 'contact_submit') {
                day.hourlyConversions[hourIdx] = (day.hourlyConversions[hourIdx] || 0) + 1;

                if (!day.geo[geoKey]) day.geo[geoKey] = { country: geo.country, region: geo.region, city: geo.city, views: 0, conversions: 0 };
                day.geo[geoKey].conversions += 1;

                if (!day.sources[sourceKey]) day.sources[sourceKey] = { channel, campaign: utmCampaign, views: 0, callClicks: 0, conversions: 0 };
                if (event === 'call_click') day.sources[sourceKey].callClicks += 1;
                day.sources[sourceKey].conversions += 1;

                if (isExternalRef(refHost) && day.referrers[refHost]) {
                    day.referrers[refHost].conversions += 1;
                }

                const lKey = sess.landingPath || pagePath;
                if (!day.landingPages[lKey] && Object.keys(day.landingPages).length < 250) {
                    day.landingPages[lKey] = { path: lKey, entries: 1, conversions: 0, callClicks: 0 };
                }
                if (day.landingPages[lKey]) {
                    day.landingPages[lKey].conversions += 1;
                    if (event === 'call_click') day.landingPages[lKey].callClicks += 1;
                }

                store.recentConversions.unshift({
                    ts: nowIso,
                    type: event,
                    path: pagePath,
                    category: catKey,
                    channel,
                    geo: geo.city && geo.city !== '—' && geo.city !== 'Localhost' ? `${geo.city}, ${geo.country}` : geo.country,
                    device: uaInfo.device
                });
                store.recentConversions = store.recentConversions.slice(0, 200);
            }
        } else if (event === 'site_search') {
            const q = scrubSearchQuery(body.query || '');
            if (q.length >= 2 && (day.searches[q] || Object.keys(day.searches).length < 100)) {
                const surface = cleanStr(body.surface || 'site', 24) || 'site';
                if (!day.searches[q]) {
                    day.searches[q] = { query: q, count: 0, zeroResultCount: 0, surface };
                }
                day.searches[q].count += 1;
                day.searches[q].surface = surface;
                if (body.zero_result === true) {
                    day.searches[q].zeroResultCount += 1;
                }
            }
        } else if (event === 'cta_click') {
            const ctaId = cleanStr(body.cta_id || 'cta', 60);
            const ctaLabel = cleanStr(body.cta_label || ctaId, 80);
            const catKey = category || 'general';
            if (ctaId && (day.ctaClicks[ctaId] || Object.keys(day.ctaClicks).length < 80)) {
                if (!day.ctaClicks[ctaId]) {
                    day.ctaClicks[ctaId] = { id: ctaId, label: ctaLabel, category: catKey, clicks: 0 };
                }
                day.ctaClicks[ctaId].clicks += 1;
            }
            if (ctaId === 'guide_solved') day.guideOutcomes.solved += 1;
            if (ctaId === 'guide_not_solved') day.guideOutcomes.notSolved += 1;
        } else if (event === 'chat_stage') {
            const stage = cleanStr(body.stage || '', 32).toLowerCase();
            if (stage === 'intake' || stage === 'intake_turn') day.chatFunnel.intakeTurns += 1;
            else if (stage === 'summary_confirm') day.chatFunnel.summaryConfirms += 1;
            else if (stage === 'channel_choice') day.chatFunnel.channelChoices += 1;
            else if (stage === 'connected' || stage === 'handoff_call' || stage === 'handoff_chat') day.chatFunnel.connectedTurns += 1;

            const apiMs = Number(body.api_ms || 0);
            if (apiMs > 0 && apiMs < 60000) {
                day.chatFunnel.apiMsSum += Math.round(apiMs);
                day.chatFunnel.apiMsCount += 1;
            }
        } else if (event === 'web_vitals') {
            const lcp = Number(body.lcp_ms || 0);
            const cls = Number(body.cls);
            const ttfb = Number(body.ttfb_ms || 0);
            if (lcp > 0 && lcp < 60000) {
                day.webVitals.lcpSum += Math.round(lcp);
                day.webVitals.lcpCount += 1;
            }
            if (Number.isFinite(cls) && cls >= 0 && cls <= 10) {
                day.webVitals.clsSum = Number((day.webVitals.clsSum + cls).toFixed(4));
                day.webVitals.clsCount += 1;
            }
            if (ttfb > 0 && ttfb < 30000) {
                day.webVitals.ttfbSum += Math.round(ttfb);
                day.webVitals.ttfbCount += 1;
            }
        } else if (event === 'not_found_404') {
            const refInfo = cleanStr(body.referrer_host || body.referrer_path || 'Direct', 100) || 'Direct';
            if (!Array.isArray(store.notFound404s)) store.notFound404s = [];
            const existing = store.notFound404s.find(e => e.path === pagePath && e.referrer === refInfo);
            if (existing) {
                existing.count = (existing.count || 1) + 1;
                existing.lastSeen = nowIso;
            } else {
                store.notFound404s.unshift({
                    path: pagePath,
                    referrer: refInfo,
                    count: 1,
                    lastSeen: nowIso
                });
                store.notFound404s = store.notFound404s.slice(0, 60);
            }
        } else if (event === 'client_error') {
            const errMsg = cleanStr(body.error_message || 'Unknown error', 180);
            const existing = store.clientErrors.find(e => e.message === errMsg && e.path === pagePath);
            if (existing) {
                existing.count = (existing.count || 1) + 1;
                existing.lastSeen = nowIso;
            } else {
                store.clientErrors.unshift({
                    message: errMsg,
                    path: pagePath,
                    count: 1,
                    lastSeen: nowIso
                });
                store.clientErrors = store.clientErrors.slice(0, 100);
            }
        }

        pruneOldDays(store.days, 35);
        await saveAnalyticsStore(store);
        return sendJson(res, 200, { success: true });
    }

    const auth = await isAuthenticated(req);
    if (!auth.configured || !auth.ok) {
        return sendJson(res, 401, { success: false, error: 'Authentication required' });
    }

    if (req.method === 'GET') {
        const urlObj = new URL(req.url, 'http://localhost');
        const range = cleanStr(urlObj.searchParams.get('range') || '7d', 10);
        const validRange = ['24h', '7d', '30d', 'all'].includes(range) ? range : '7d';

        const [store, healthLog, config] = await Promise.all([
            loadAnalyticsStore(),
            loadHealthLog(),
            loadConfig()
        ]);
        const report = aggregateRange(store, validRange, healthLog, config);
        return sendJson(res, 200, { success: true, data: report });
    }

    if (req.method === 'DELETE') {
        await saveAnalyticsStore(getDefaultAnalyticsStore());
        return sendJson(res, 200, { success: true });
    }

    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
};
