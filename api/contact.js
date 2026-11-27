'use strict';

const {
    loadSubmissions,
    saveSubmissions,
    normalizeEmail,
    readJsonBody,
    sendJson,
    cleanStr
} = require('./_store.js');

const CONTACT_RATE_MAP = new Map();
const CONTACT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_MAX_PER_WINDOW = 10;

function getClientIp(req) {
    const fwd = req.headers['x-vercel-forwarded-for'];
    if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
    const real = req.headers['x-real-ip'];
    if (typeof real === 'string' && real.trim()) return real.trim();
    return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function checkRate(ip) {
    const now = Date.now();
    const hits = (CONTACT_RATE_MAP.get(ip) || []).filter(t => now - t < CONTACT_WINDOW_MS);
    if (hits.length >= CONTACT_MAX_PER_WINDOW) return false;
    hits.push(now);
    CONTACT_RATE_MAP.set(ip, hits);
    return true;
}

module.exports = async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
        return sendJson(res, 405, { success: false, error: 'Method not allowed' });
    }

    if (!checkRate(getClientIp(req))) {
        return sendJson(res, 429, { success: false, error: 'Too many submissions. Please wait a few minutes before trying again.' });
    }

    let body;
    try {
        body = await readJsonBody(req, 32768);
    } catch (err) {
        return sendJson(res, 400, { success: false, error: err.message });
    }

    const type = body.type === 'escalation' ? 'escalation' : 'general';
    const name = cleanStr(body.name || '', 120);
    const emailInfo = normalizeEmail(body.email || '');

    if (!name || !emailInfo.valid) {
        return sendJson(res, 400, { success: false, error: 'Please provide your name and a valid email address.' });
    }

    const prefix = type === 'escalation' ? 'ESC' : 'INQ';
    const ticketId = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    const createdAt = new Date().toISOString();

    let record;
    if (type === 'escalation') {
        const expertName = cleanStr(body.expertName || '', 120);
        const category = cleanStr(body.category || '', 80);
        const sessionId = cleanStr(body.sessionId || '', 80);
        const details = cleanStr(body.details || '', 2500);
        if (!expertName || !details) {
            return sendJson(res, 400, { success: false, error: 'Please provide the expert name/department and details of what happened.' });
        }
        record = {
            id: ticketId,
            type: 'escalation',
            status: 'open',
            createdAt,
            name,
            email: emailInfo.email,
            sessionId,
            expertName,
            category,
            details
        };
    } else {
        const category = cleanStr(body.category || '', 80);
        const subject = cleanStr(body.subject || '', 180);
        const message = cleanStr(body.message || '', 2500);
        if (!subject || !message) {
            return sendJson(res, 400, { success: false, error: 'Please fill out both the subject and message.' });
        }
        record = {
            id: ticketId,
            type: 'general',
            status: 'open',
            createdAt,
            name,
            email: emailInfo.email,
            category,
            subject,
            details: message
        };
    }

    try {
        const list = await loadSubmissions();
        list.unshift(record);
        await saveSubmissions(list);

        if (process.env.CONTACT_WEBHOOK_URL) {
            try {
                await fetch(process.env.CONTACT_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(record)
                });
            } catch (hookErr) {
                console.warn('[AnswerDesk Contact] Webhook notification failed:', hookErr.message);
            }
        }

        return sendJson(res, 200, {
            success: true,
            ticketId,
            createdAt,
            type
        });
    } catch (err) {
        return sendJson(res, 500, { success: false, error: 'Unable to save submission right now. Please try again.' });
    }
};
