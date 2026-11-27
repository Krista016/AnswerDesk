'use strict';

const { loadConfig, sendJson } = require('./_store.js');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    if (req.method !== 'GET') {
        return sendJson(res, 405, { success: false, error: 'Method not allowed' });
    }

    try {
        const config = await loadConfig();
        return sendJson(res, 200, {
            success: true,
            data: {
                updatedAt: config.updatedAt,
                phone: config.phone,
                email: config.email,
                business: config.business,
                analytics: config.analytics,
                categories: config.categories.filter(c => c.enabled !== false)
            }
        });
    } catch (err) {
        return sendJson(res, 500, { success: false, error: 'Failed to load site configuration' });
    }
};
