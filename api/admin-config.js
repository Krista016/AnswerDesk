'use strict';

const {
    loadConfig,
    saveConfig,
    loadSubmissions,
    saveSubmissions,
    collectConfigWarnings,
    getStorageMode,
    hasAdminConfigured,
    hasSuperAdminConfigured,
    verifyAdminLogin,
    resetAdminPasswordWithSuperAdmin,
    getAuthMetadata,
    signSessionToken,
    isAuthenticated,
    buildSessionCookieHeader,
    readJsonBody,
    sendJson,
    cleanStr
} = require('./_store.js');

const LOGIN_RATE_MAP = new Map();
const RESET_RATE_MAP = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const RESET_MAX_ATTEMPTS = 5;

function getClientIp(req) {
    const fwd = req.headers['x-vercel-forwarded-for'];
    if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
    const real = req.headers['x-real-ip'];
    if (typeof real === 'string' && real.trim()) return real.trim();
    return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function checkAttempt(map, ip, maxAttempts) {
    const now = Date.now();
    const hits = (map.get(ip) || []).filter(t => now - t < WINDOW_MS);
    if (hits.length >= maxAttempts) return false;
    hits.push(now);
    map.set(ip, hits);
    return true;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = async function handler(req, res) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Frame-Options', 'DENY');

    if (req.method === 'POST') {
        let body;
        try {
            body = await readJsonBody(req, 16384);
        } catch (err) {
            return sendJson(res, 400, { success: false, error: err.message });
        }

        if (body.action === 'logout') {
            res.setHeader('Set-Cookie', buildSessionCookieHeader(req, '', 0));
            return sendJson(res, 200, { success: true, authenticated: false });
        }

        const ip = getClientIp(req);

        if (body.action === 'reset_password') {
            if (!checkAttempt(RESET_RATE_MAP, ip, RESET_MAX_ATTEMPTS)) {
                return sendJson(res, 429, { success: false, error: 'Too many reset attempts. Please wait 15 minutes.' });
            }
            const result = await resetAdminPasswordWithSuperAdmin(body.superAdminPassword || '', body.newPassword || '');
            if (!result.ok) {
                await sleep(350);
                return sendJson(res, result.status || 400, { success: false, error: result.error });
            }
            // Revoke current session cookie too so all active team sessions must sign in with the new password
            res.setHeader('Set-Cookie', buildSessionCookieHeader(req, '', 0));
            return sendJson(res, 200, {
                success: true,
                authenticated: false,
                passwordUpdatedAt: result.passwordUpdatedAt
            });
        }

        const authMeta = await getAuthMetadata();
        if (!hasAdminConfigured() && !authMeta.hasVaultOverride) {
            return sendJson(res, 503, {
                success: false,
                configured: false,
                error: 'Admin credential is not configured on this deployment.'
            });
        }

        if (!checkAttempt(LOGIN_RATE_MAP, ip, LOGIN_MAX_ATTEMPTS)) {
            return sendJson(res, 429, { success: false, error: 'Too many login attempts. Try again in 15 minutes.' });
        }

        const validLogin = await verifyAdminLogin(body.password || '');
        if (!validLogin) {
            await sleep(350);
            return sendJson(res, 401, { success: false, error: 'Invalid admin password.' });
        }

        const token = signSessionToken(authMeta.sessionVersion);
        res.setHeader('Set-Cookie', buildSessionCookieHeader(req, token, 12 * 60 * 60));
        return sendJson(res, 200, { success: true, authenticated: true });
    }

    const auth = await isAuthenticated(req);
    if (!auth.configured) {
        return sendJson(res, 503, {
            success: false,
            configured: false,
            authenticated: false,
            superAdminConfigured: hasSuperAdminConfigured(),
            error: 'Admin credential is not configured.'
        });
    }
    if (!auth.ok) {
        return sendJson(res, 401, {
            success: false,
            configured: true,
            authenticated: false,
            superAdminConfigured: hasSuperAdminConfigured(),
            error: 'Authentication required'
        });
    }

    if (req.method === 'GET') {
        const [config, submissions, authMeta] = await Promise.all([
            loadConfig(),
            loadSubmissions(),
            getAuthMetadata()
        ]);
        return sendJson(res, 200, {
            success: true,
            authenticated: true,
            storageMode: getStorageMode(),
            superAdminConfigured: hasSuperAdminConfigured(),
            passwordUpdatedAt: authMeta.passwordUpdatedAt,
            warnings: collectConfigWarnings(config),
            config,
            submissions
        });
    }

    if (req.method === 'PUT') {
        let body;
        try {
            body = await readJsonBody(req, 65536);
        } catch (err) {
            return sendJson(res, 400, { success: false, error: err.message });
        }

        try {
            const payload = (body && body.config && typeof body.config === 'object') ? body.config : body;
            const { config, storageMode } = await saveConfig(payload);
            return sendJson(res, 200, {
                success: true,
                storageMode,
                warnings: collectConfigWarnings(config),
                config
            });
        } catch (err) {
            return sendJson(res, 500, { success: false, error: 'Failed to save configuration: ' + err.message });
        }
    }

    if (req.method === 'PATCH') {
        let body;
        try {
            body = await readJsonBody(req, 16384);
        } catch (err) {
            return sendJson(res, 400, { success: false, error: err.message });
        }
        const id = cleanStr(body.id || '', 40);
        const status = cleanStr(body.status || '', 20).toLowerCase();
        if (!id || !['open', 'resolved', 'archived'].includes(status)) {
            return sendJson(res, 400, { success: false, error: 'Valid id and status (open/resolved/archived) required.' });
        }
        const list = await loadSubmissions();
        const idx = list.findIndex(item => item.id === id);
        if (idx === -1) return sendJson(res, 404, { success: false, error: 'Submission not found' });
        list[idx].status = status;
        list[idx].updatedAt = new Date().toISOString();
        await saveSubmissions(list);
        return sendJson(res, 200, { success: true, submissions: list });
    }

    if (req.method === 'DELETE') {
        let body;
        try {
            body = await readJsonBody(req, 8192);
        } catch (err) {
            return sendJson(res, 400, { success: false, error: err.message });
        }
        const id = cleanStr(body.id || '', 40);
        if (!id) return sendJson(res, 400, { success: false, error: 'Submission id required' });
        const list = await loadSubmissions();
        const filtered = list.filter(item => item.id !== id);
        await saveSubmissions(filtered);
        return sendJson(res, 200, { success: true, submissions: filtered });
    }

    return sendJson(res, 405, { success: false, error: 'Method not allowed' });
};
