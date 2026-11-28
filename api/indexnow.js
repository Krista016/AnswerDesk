'use strict';

const { isAuthenticated, sendJson } = require('./_store.js');

const INDEXNOW_KEY = 'ad7f4c9e2b8140f6a3c5d8e9f1b2c3d4';
const SITE_HOST = 'answerdesk.online';

module.exports = async function handler(req, res) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
        return sendJson(res, 405, { success: false, error: 'Method not allowed' });
    }

    const auth = await isAuthenticated(req);
    if (!auth.configured || !auth.ok) {
        return sendJson(res, 401, { success: false, error: 'Authentication required' });
    }

    try {
        const smRes = await fetch(`https://${SITE_HOST}/sitemap.xml`);
        if (!smRes.ok) {
            return sendJson(res, 502, { success: false, error: `Could not fetch sitemap.xml (${smRes.status})` });
        }
        const xml = await smRes.text();
        const urlList = [];
        const locRegex = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
        let match;
        while ((match = locRegex.exec(xml)) !== null) {
            if (match[1].startsWith(`https://${SITE_HOST}`)) {
                urlList.push(match[1]);
            }
        }
        if (!urlList.length) {
            return sendJson(res, 400, { success: false, error: 'No URLs found in sitemap.xml' });
        }

        // IndexNow accepts up to 10,000 URLs per POST
        const payload = {
            host: SITE_HOST,
            key: INDEXNOW_KEY,
            keyLocation: `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`,
            urlList: urlList.slice(0, 10000)
        };

        const idxRes = await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(payload)
        });
        const respText = await idxRes.text().catch(() => '');

        if (!idxRes.ok && idxRes.status !== 202) {
            return sendJson(res, 502, {
                success: false,
                status: idxRes.status,
                error: `IndexNow returned HTTP ${idxRes.status}: ${respText.slice(0, 200)}`
            });
        }

        return sendJson(res, 200, {
            success: true,
            submittedCount: payload.urlList.length,
            status: idxRes.status,
            engine: 'IndexNow (Bing, Copilot, ChatGPT Search, Yandex, Seznam)'
        });
    } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
    }
};
