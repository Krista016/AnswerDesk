'use strict';

const fs = require('fs');
const path = require('path');
const {
    loadConfig,
    collectConfigWarnings,
    getStorageMode,
    loadHealthLog,
    saveHealthLog,
    isAuthenticated,
    sendJson
} = require('./_store.js');

const ROOT_DIR = path.join(__dirname, '..');

module.exports = async function handler(req, res) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    if (req.method !== 'GET') {
        return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
    }

    const auth = await isAuthenticated(req);
    if (!auth.configured || !auth.ok) {
        return sendJson(res, 200, {
            ok: true,
            status: 'operational',
            ts: new Date().toISOString()
        });
    }

    const startedAt = Date.now();
    const checks = [];

    // 1. Storage & Config Read Check
    let config = null;
    let storageOk = false;
    const storeStart = Date.now();
    try {
        config = await loadConfig();
        storageOk = Boolean(config && config.phone && config.email);
        checks.push({
            name: 'Configuration Store',
            ok: storageOk,
            latencyMs: Date.now() - storeStart,
            detail: `Mode: ${getStorageMode()}`
        });
    } catch (err) {
        checks.push({
            name: 'Configuration Store',
            ok: false,
            latencyMs: Date.now() - storeStart,
            detail: err.message
        });
    }

    // 2. Core Public Pages & SEO Files Check
    if (process.env.VERCEL === '1') {
        const probeRoutes = ['/', '/support', '/articles', '/contact', '/faq', '/sitemap.xml', '/robots.txt', '/.well-known/security.txt'];
        const host = req.headers.host || process.env.VERCEL_URL || 'answerdesk.online';
        const origin = `https://${host}`;
        const probeStart = Date.now();
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3500);
        try {
            const results = await Promise.all(probeRoutes.map(async (route) => {
                try {
                    const r = await fetch(`${origin}${route}`, { method: 'HEAD', signal: ctrl.signal });
                    return { route, ok: r.ok };
                } catch (_) {
                    return { route, ok: false };
                }
            }));
            const failed = results.filter(r => !r.ok).map(r => r.route);
            checks.push({
                name: 'Core Pages & SEO Assets',
                ok: failed.length === 0,
                latencyMs: Date.now() - probeStart,
                detail: failed.length === 0 ? `${probeRoutes.length}/${probeRoutes.length} live (HTTP 200)` : `Unreachable: ${failed.join(', ')}`
            });
        } finally {
            clearTimeout(timer);
        }
    } else {
        const requiredFiles = [
            'home.html', 'index.html', 'support.html', 'contact.html',
            'articles.html', 'faq.html', 'about.html', 'privacy.html',
            'terms.html', '404.html', 'sitemap.xml', 'robots.txt', '.well-known/security.txt'
        ];
        const missing = requiredFiles.filter(f => !fs.existsSync(path.join(ROOT_DIR, f)));
        checks.push({
            name: 'Core Pages & SEO Assets',
            ok: missing.length === 0,
            latencyMs: 1,
            detail: missing.length === 0 ? `${requiredFiles.length}/${requiredFiles.length} present` : `Missing: ${missing.join(', ')}`
        });
    }

    // 3. AI Support Engine Key Readiness (Boolean only, zero secrets)
    const hasAiKey = Boolean(
        process.env.DEEPSEEK_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.OPENROUTER_API_KEY
    );
    checks.push({
        name: 'Live AI Chat Engine',
        ok: hasAiKey,
        latencyMs: 0,
        detail: hasAiKey ? 'API provider configured' : 'Running offline fallback playbook'
    });

    // 4. Google & Meta Ads Compliance Check
    const warnings = config ? collectConfigWarnings(config) : [];
    const phoneConfigured = Boolean(config && config.phone && config.phone.masterNumber);
    checks.push({
        name: 'Google & Meta Ads Policy Guard',
        ok: warnings.length === 0,
        latencyMs: 0,
        detail: warnings.length === 0
            ? (phoneConfigured ? 'Real business number & consent guard active' : 'Zero fake 555 numbers; Chat-Only Safe Mode active')
            : warnings.join('; ')
    });

    const allOk = checks.every(c => c.ok);
    const totalMs = Math.max(1, Date.now() - startedAt);
    const sample = {
        ts: new Date().toISOString(),
        ok: allOk,
        responseMs: totalMs
    };

    let history = await loadHealthLog();
    history.unshift(sample);
    history = await saveHealthLog(history);

    const okCount = history.filter(h => h.ok).length;
    const uptimePct = history.length > 0 ? Number(((okCount / history.length) * 100).toFixed(1)) : 100;
    const avgResponseMs = history.length > 0
        ? Math.round(history.reduce((s, h) => s + (h.responseMs || 1), 0) / history.length)
        : totalMs;

    return sendJson(res, 200, {
        ok: allOk,
        status: allOk ? 'operational' : 'attention',
        uptimePct,
        avgResponseMs,
        checks,
        warnings,
        recentChecks: history.slice(0, 12)
    });
};
