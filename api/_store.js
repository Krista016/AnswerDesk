'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_CONFIG_PATH = path.join(DATA_DIR, 'site-config.json');
const LOCAL_SUBMISSIONS_PATH = path.join(DATA_DIR, 'submissions.json');
const LOCAL_AUTH_VAULT_PATH = path.join(DATA_DIR, 'auth-vault.enc.json');
const LOCAL_ANALYTICS_PATH = path.join(DATA_DIR, 'analytics.json');
const LOCAL_HEALTH_PATH = path.join(DATA_DIR, 'health-log.json');
const TMP_CONFIG_PATH = '/tmp/answerdesk-site-config.json';
const TMP_SUBMISSIONS_PATH = '/tmp/answerdesk-submissions.json';
const TMP_AUTH_VAULT_PATH = '/tmp/answerdesk-auth-vault.enc.json';
const TMP_ANALYTICS_PATH = '/tmp/answerdesk-analytics.json';
const TMP_HEALTH_PATH = '/tmp/answerdesk-health-log.json';

const KV_CONFIG_KEY = 'answerdesk:site_config';
const KV_SUBMISSIONS_KEY = 'answerdesk:submissions';
const KV_AUTH_VAULT_KEY = 'answerdesk:auth_vault';
const KV_ANALYTICS_KEY = 'answerdesk:analytics';
const KV_HEALTH_KEY = 'answerdesk:health_log';
const SESSION_COOKIE_NAME = 'ad_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

function loadLocalEnvOnce() {
    if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') return;
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        if (!fs.existsSync(envPath)) return;
        const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
        for (const line of lines) {
            const m = line.match(/^\s*([\w_]+)\s*=\s*(.*?)\s*$/);
            if (m && m[2] && !process.env[m[1]]) {
                process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
            }
        }
    } catch (_) {}
}

function getDefaultCategories() {
    return [
        {
            key: 'medical',
            label: 'Health & Medical Guidance',
            expertRole: 'Independent Medical Consultant',
            keywords: ['doctor', 'medical', 'health', 'symptom', 'pain', 'fever', 'rash', 'medication'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'microsoft',
            label: 'Microsoft & Windows',
            expertRole: 'Independent Windows & Office Specialist',
            keywords: ['windows', 'microsoft', 'outlook', 'office', '365', 'excel', 'word', 'teams', 'bitlocker', 'printer'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'ios',
            label: 'Apple, Mac & iOS',
            expertRole: 'Independent Apple & iOS Specialist',
            keywords: ['apple', 'iphone', 'ipad', 'mac', 'macbook', 'imac', 'macos', 'icloud', 'airpods', 'ios'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'crypto',
            label: 'Payments, Banking & Crypto',
            expertRole: 'Independent Payments & Fintech Specialist',
            keywords: ['paypal', 'zelle', 'venmo', 'cashapp', 'bank', 'crypto', 'coinbase', 'wallet', 'transfer'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'account',
            label: 'Accounts & Security',
            expertRole: 'Independent Account & Security Specialist',
            keywords: ['account', 'login', '2fa', 'password', 'locked', 'amazon', 'facebook', 'instagram', 'gmail'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'subscription',
            label: 'Billing & Subscriptions',
            expertRole: 'Independent Billing & Subscription Specialist',
            keywords: ['billing', 'charge', 'refund', 'subscription', 'cancel', 'invoice', 'renewal'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'android',
            label: 'Android & Mobile',
            expertRole: 'Independent Android & Mobile Specialist',
            keywords: ['android', 'samsung', 'pixel', 'galaxy', 'chromebook', 'play store', 'mobile'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'xbox',
            label: 'Xbox & Gaming Systems',
            expertRole: 'Independent Gaming Systems Specialist',
            keywords: ['xbox', 'playstation', 'ps5', 'nintendo', 'switch', 'gaming', 'console', 'controller'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'appliances',
            label: 'Home Appliances',
            expertRole: 'Independent Appliance Specialist',
            keywords: ['appliance', 'washer', 'dryer', 'fridge', 'refrigerator', 'dishwasher', 'oven', 'hvac', 'tv'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'automotive',
            label: 'Automotive & Mechanical',
            expertRole: 'Independent Automotive Specialist',
            keywords: ['car', 'auto', 'vehicle', 'engine', 'brake', 'check engine', 'transmission', 'battery'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'plumbing',
            label: 'Plumbing & Home Systems',
            expertRole: 'Independent Plumbing & Home Specialist',
            keywords: ['plumbing', 'pipe', 'leak', 'water heater', 'drain', 'toilet', 'faucet', 'sink'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'veterinary',
            label: 'Veterinary & Pet Care',
            expertRole: 'Independent Veterinary Consultant',
            keywords: ['pet', 'dog', 'cat', 'vet', 'veterinary', 'puppy', 'kitten', 'animal'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'legal',
            label: 'Legal & Consumer Rights',
            expertRole: 'Independent Legal Consultant',
            keywords: ['legal', 'lawyer', 'contract', 'landlord', 'tenant', 'lease', 'employment', 'dispute'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'finance',
            label: 'Taxes & Financial Planning',
            expertRole: 'Independent Tax & Finance Consultant',
            keywords: ['tax', 'irs', 'accounting', 'cpa', 'deduction', 'filing', 'audit', 'finance'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        },
        {
            key: 'general',
            label: 'Customer Support',
            expertRole: 'Independent Support Specialist',
            keywords: ['general', 'support', 'help', 'other', 'question'],
            phone: '',
            email: '',
            enabled: true,
            builtIn: true
        }
    ];
}

function getDefaultConfig() {
    return {
        version: 1,
        updatedAt: null,
        phone: {
            enabled: true,
            masterNumber: '',
            masterDisplay: '',
            masterOverrideAll: true
        },
        email: {
            masterEmail: '',
            masterOverrideAll: false,
            sections: {
                general: '',
                support: '',
                billing: '',
                privacy: '',
                security: '',
                escalations: ''
            }
        },
        business: {
            officeAddress: 'Barakhamba Road, Connaught Place, New Delhi, Delhi 110001, India',
            hoursLabel: 'Available 24/7'
        },
        analytics: {
            enabled: true
        },
        categories: getDefaultCategories()
    };
}

function cleanStr(val, maxLen = 200) {
    if (typeof val !== 'string') return '';
    return val.replace(/[\r\n\t\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function normalizePhone(raw) {
    const str = cleanStr(raw, 40);
    if (!str) {
        return { valid: false, digits: '', e164: '', telUri: '', display: '', isPlaceholder: false };
    }
    const hasPlus = str.startsWith('+');
    const digits = str.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
        return { valid: false, digits, e164: '', telUri: '', display: str, isPlaceholder: false };
    }

    let e164;
    let display;
    if (hasPlus) {
        e164 = `+${digits}`;
        if (digits.length === 11 && digits.startsWith('1')) {
            display = `1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
        } else {
            display = str;
        }
    } else if (digits.length === 10) {
        e164 = `+1${digits}`;
        display = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
        e164 = `+${digits}`;
        display = `1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else {
        e164 = `+${digits}`;
        display = str;
    }

    const isPlaceholder = /^1?[2-9]\d{2}55501\d{2}$/.test(digits);
    return {
        valid: true,
        digits,
        e164,
        telUri: `tel:${e164}`,
        display,
        isPlaceholder
    };
}

function normalizeEmail(raw) {
    const str = cleanStr(raw, 160).toLowerCase();
    if (!str) return { valid: false, email: '' };
    return {
        valid: EMAIL_REGEX.test(str),
        email: str
    };
}

function sanitizeCategoryKey(raw) {
    return cleanStr(raw, 48).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function sanitizeConfig(input) {
    const def = getDefaultConfig();
    const src = (input && typeof input === 'object') ? input : {};

    const rawPhone = (src.phone && typeof src.phone === 'object') ? src.phone : {};
    const masterPhoneInfo = normalizePhone(rawPhone.masterNumber || '');

    const rawEmail = (src.email && typeof src.email === 'object') ? src.email : {};
    const rawSections = (rawEmail.sections && typeof rawEmail.sections === 'object') ? rawEmail.sections : {};
    const masterEmailInfo = normalizeEmail(rawEmail.masterEmail || '');

    const sections = {};
    for (const k of Object.keys(def.email.sections)) {
        const info = normalizeEmail(rawSections[k] || '');
        sections[k] = info.valid ? info.email : '';
    }

    const rawBiz = (src.business && typeof src.business === 'object') ? src.business : {};

    const builtInMap = new Map(def.categories.map(c => [c.key, c]));
    const incomingCats = Array.isArray(src.categories) ? src.categories : def.categories;
    const seenKeys = new Set();
    const categories = [];

    for (const item of incomingCats) {
        if (!item || typeof item !== 'object') continue;
        const key = sanitizeCategoryKey(item.key || item.label || '');
        if (!key || seenKeys.has(key)) continue;
        seenKeys.add(key);

        const base = builtInMap.get(key);
        const label = cleanStr(item.label, 80) || (base ? base.label : key);
        const expertRole = cleanStr(item.expertRole, 80) || (base ? base.expertRole : 'Independent Support Specialist');
        const keywords = Array.isArray(item.keywords)
            ? item.keywords.map(k => cleanStr(String(k), 40).toLowerCase()).filter(Boolean).slice(0, 24)
            : (typeof item.keywords === 'string'
                ? item.keywords.split(',').map(k => cleanStr(k, 40).toLowerCase()).filter(Boolean).slice(0, 24)
                : (base ? [...base.keywords] : []));
        const phoneStr = cleanStr(item.phone || '', 40);
        const phoneNorm = normalizePhone(phoneStr);
        const emailNorm = normalizeEmail(item.email || '');

        categories.push({
            key,
            label,
            expertRole,
            keywords,
            phone: phoneNorm.valid ? phoneStr : '',
            email: emailNorm.valid ? emailNorm.email : '',
            enabled: item.enabled !== false,
            builtIn: Boolean(base)
        });
    }

    for (const base of def.categories) {
        if (!seenKeys.has(base.key)) {
            categories.push({ ...base, keywords: [...base.keywords] });
        }
    }

    return {
        version: 1,
        updatedAt: src.updatedAt || new Date().toISOString(),
        phone: {
            enabled: rawPhone.enabled !== false,
            masterNumber: masterPhoneInfo.valid ? cleanStr(rawPhone.masterNumber, 40) : '',
            masterDisplay: cleanStr(rawPhone.masterDisplay || '', 40),
            masterOverrideAll: rawPhone.masterOverrideAll !== false
        },
        email: {
            masterEmail: masterEmailInfo.valid ? masterEmailInfo.email : '',
            masterOverrideAll: Boolean(rawEmail.masterOverrideAll),
            sections
        },
        business: {
            officeAddress: cleanStr(rawBiz.officeAddress, 220) || def.business.officeAddress,
            hoursLabel: cleanStr(rawBiz.hoursLabel, 60) || def.business.hoursLabel
        },
        analytics: (() => {
            const rawAn = (src.analytics && typeof src.analytics === 'object') ? src.analytics : {};
            return {
                enabled: rawAn.enabled !== false
            };
        })(),
        categories
    };
}

function collectConfigWarnings(config) {
    const warnings = [];
    const masterNorm = normalizePhone(config.phone?.masterNumber || '');
    if (config.phone?.masterNumber && !masterNorm.valid) {
        warnings.push('Master phone number is invalid and will not dial.');
    } else if (masterNorm.isPlaceholder) {
        warnings.push('Master phone number uses a 555-01XX fictional test range — replace with a real business number before running Google/Meta Ads.');
    }
    for (const cat of (config.categories || [])) {
        if (!cat.phone) continue;
        const p = normalizePhone(cat.phone);
        if (!p.valid) {
            warnings.push(`Category "${cat.label}" has an invalid phone number.`);
        } else if (p.isPlaceholder) {
            warnings.push(`Category "${cat.label}" uses a 555-01XX placeholder number.`);
        }
    }
    return warnings;
}

function matchCategory(config, categoryKeyOrQuery) {
    const cats = Array.isArray(config?.categories) ? config.categories : [];
    const q = cleanStr(String(categoryKeyOrQuery || ''), 120).toLowerCase();
    if (!q || q === 'master' || q === 'unidentified') return null;

    const exact = cats.find(c => c.enabled !== false && c.key.toLowerCase() === q);
    if (exact) return exact;

    for (const cat of cats) {
        if (cat.enabled === false) continue;
        const kws = Array.isArray(cat.keywords) ? cat.keywords : [];
        if (kws.some(kw => kw && (q === kw || q.includes(kw)))) {
            return cat;
        }
    }
    return null;
}

function resolvePhone(config, categoryKeyOrQuery) {
    const cfg = config || getDefaultConfig();
    if (!cfg.phone || cfg.phone.enabled === false) {
        return { dialable: false, source: 'disabled', display: '', telUri: '', e164: '', categoryKey: null, categoryLabel: '' };
    }

    const master = normalizePhone(cfg.phone.masterNumber || '');
    const masterDisplay = cleanStr(cfg.phone.masterDisplay || '', 40) || master.display;

    if (master.valid && cfg.phone.masterOverrideAll) {
        return {
            dialable: true,
            source: 'master_override',
            display: masterDisplay,
            telUri: master.telUri,
            e164: master.e164,
            categoryKey: null,
            categoryLabel: ''
        };
    }

    const cat = matchCategory(cfg, categoryKeyOrQuery);
    if (cat && cat.phone) {
        const catPhone = normalizePhone(cat.phone);
        if (catPhone.valid) {
            return {
                dialable: true,
                source: 'category',
                display: catPhone.display,
                telUri: catPhone.telUri,
                e164: catPhone.e164,
                categoryKey: cat.key,
                categoryLabel: cat.label
            };
        }
    }

    if (master.valid) {
        return {
            dialable: true,
            source: 'master_fallback',
            display: masterDisplay,
            telUri: master.telUri,
            e164: master.e164,
            categoryKey: cat ? cat.key : null,
            categoryLabel: cat ? cat.label : ''
        };
    }

    return {
        dialable: false,
        source: 'none',
        display: '',
        telUri: '',
        e164: '',
        categoryKey: cat ? cat.key : null,
        categoryLabel: cat ? cat.label : ''
    };
}

function resolveEmail(config, sectionKey) {
    const cfg = config || getDefaultConfig();
    const key = cleanStr(String(sectionKey || ''), 60).toLowerCase();
    const master = normalizeEmail(cfg.email?.masterEmail || '');

    if (master.valid && cfg.email?.masterOverrideAll) {
        return {
            available: true,
            email: master.email,
            mailtoUri: `mailto:${master.email}`,
            source: 'master_override'
        };
    }

    const secRaw = cfg.email?.sections?.[key] || '';
    const secNorm = normalizeEmail(secRaw);
    if (secNorm.valid) {
        return {
            available: true,
            email: secNorm.email,
            mailtoUri: `mailto:${secNorm.email}`,
            source: 'section'
        };
    }

    const cat = matchCategory(cfg, key);
    if (cat && cat.email) {
        const catEmail = normalizeEmail(cat.email);
        if (catEmail.valid) {
            return {
                available: true,
                email: catEmail.email,
                mailtoUri: `mailto:${catEmail.email}`,
                source: 'category'
            };
        }
    }

    if (master.valid) {
        return {
            available: true,
            email: master.email,
            mailtoUri: `mailto:${master.email}`,
            source: 'master_fallback'
        };
    }

    return {
        available: false,
        email: '',
        mailtoUri: '',
        source: 'none'
    };
}

function getKvEnv() {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
    if (url && token) {
        return { url: url.replace(/\/+$/, ''), token };
    }
    return null;
}

function getStorageMode() {
    loadLocalEnvOnce();
    if (getKvEnv()) return 'kv_rest';
    if (process.env.VERCEL !== '1') return 'local_file';
    return 'ephemeral_tmp';
}

async function kvGet(key) {
    const kv = getKvEnv();
    if (!kv) return null;
    const res = await fetch(kv.url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${kv.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(['GET', key])
    });
    if (!res.ok) throw new Error(`KV GET failed (${res.status})`);
    const data = await res.json();
    if (data.error) throw new Error(`KV GET error: ${data.error}`);
    if (data.result == null) return null;
    let parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch (_) {}
    }
    return parsed;
}

async function kvSet(key, value) {
    const kv = getKvEnv();
    if (!kv) throw new Error('KV not configured');
    const res = await fetch(kv.url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${kv.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(['SET', key, JSON.stringify(value)])
    });
    if (!res.ok) throw new Error(`KV SET failed (${res.status})`);
    const data = await res.json().catch(() => ({}));
    if (data && data.error) throw new Error(`KV SET error: ${data.error}`);
    return true;
}

function readJsonFileSafe(filePath) {
    try {
        if (!fs.existsSync(filePath)) return null;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (_) {
        return null;
    }
}

function writeJsonFileAtomic(filePath, obj) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
}

async function loadConfig() {
    loadLocalEnvOnce();
    const mode = getStorageMode();

    if (mode === 'kv_rest') {
        try {
            const stored = await kvGet(KV_CONFIG_KEY);
            if (stored && typeof stored === 'object') {
                return sanitizeConfig(stored);
            }
        } catch (err) {
            console.warn('[AnswerDesk Store] KV read fallback:', err.message);
        }
    }

    if (mode === 'local_file') {
        const local = readJsonFileSafe(LOCAL_CONFIG_PATH);
        if (local) return sanitizeConfig(local);
        return getDefaultConfig();
    }

    // ephemeral_tmp on Vercel when KV is not yet provisioned
    const tmpStored = readJsonFileSafe(TMP_CONFIG_PATH);
    if (tmpStored) return sanitizeConfig(tmpStored);

    if (process.env.SITE_CONFIG_JSON) {
        try {
            const parsedEnv = JSON.parse(process.env.SITE_CONFIG_JSON);
            return sanitizeConfig(parsedEnv);
        } catch (_) {}
    }

    return getDefaultConfig();
}

async function saveConfig(nextConfig) {
    loadLocalEnvOnce();
    const sanitized = sanitizeConfig({
        ...nextConfig,
        updatedAt: new Date().toISOString()
    });
    const mode = getStorageMode();

    if (mode === 'kv_rest') {
        await kvSet(KV_CONFIG_KEY, sanitized);
        return { config: sanitized, storageMode: mode };
    }

    if (mode === 'local_file') {
        writeJsonFileAtomic(LOCAL_CONFIG_PATH, sanitized);
        return { config: sanitized, storageMode: mode };
    }

    writeJsonFileAtomic(TMP_CONFIG_PATH, sanitized);
    return { config: sanitized, storageMode: mode };
}

async function loadSubmissions() {
    loadLocalEnvOnce();
    const mode = getStorageMode();

    if (mode === 'kv_rest') {
        try {
            const stored = await kvGet(KV_SUBMISSIONS_KEY);
            if (Array.isArray(stored)) return stored;
        } catch (err) {
            console.warn('[AnswerDesk Store] KV submissions read fallback:', err.message);
        }
        return [];
    }

    if (mode === 'local_file') {
        const local = readJsonFileSafe(LOCAL_SUBMISSIONS_PATH);
        return Array.isArray(local) ? local : [];
    }

    const tmp = readJsonFileSafe(TMP_SUBMISSIONS_PATH);
    return Array.isArray(tmp) ? tmp : [];
}

async function saveSubmissions(list) {
    loadLocalEnvOnce();
    const cleanList = Array.isArray(list) ? list.slice(0, 500) : [];
    const mode = getStorageMode();

    if (mode === 'kv_rest') {
        await kvSet(KV_SUBMISSIONS_KEY, cleanList);
        return cleanList;
    }

    if (mode === 'local_file') {
        writeJsonFileAtomic(LOCAL_SUBMISSIONS_PATH, cleanList);
        return cleanList;
    }

    writeJsonFileAtomic(TMP_SUBMISSIONS_PATH, cleanList);
    return cleanList;
}

function hashPasswordScrypt(plain) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(plain, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
    return `scrypt$${salt}$${derived}`;
}

function verifyPasswordHash(candidate, storedHash) {
    if (typeof candidate !== 'string' || typeof storedHash !== 'string') return false;
    const parts = storedHash.trim().split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const [, salt, expectedHex] = parts;
    if (!salt || !expectedHex) return false;
    try {
        const derived = crypto.scryptSync(candidate, salt, 64, { N: 16384, r: 8, p: 1 });
        const expected = Buffer.from(expectedHex, 'hex');
        if (derived.length !== expected.length) return false;
        return crypto.timingSafeEqual(derived, expected);
    } catch (_) {
        return false;
    }
}

function constantTimeCompare(aStr, bStr) {
    if (typeof aStr !== 'string' || typeof bStr !== 'string' || !bStr) return false;
    const a = Buffer.from(aStr, 'utf8');
    const b = Buffer.from(bStr, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

function getSessionSecret() {
    loadLocalEnvOnce();
    const customSecret = typeof process.env.ADMIN_SESSION_SECRET === 'string' ? process.env.ADMIN_SESSION_SECRET.trim() : '';
    if (customSecret) return customSecret;
    const seed = (process.env.SUPER_ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || '').trim();
    return seed ? crypto.createHash('sha256').update(`answerdesk-session:${seed}`).digest('hex') : '';
}

function getVaultEncryptionKey() {
    const secret = getSessionSecret();
    if (!secret) throw new Error('Encryption secret not configured');
    return crypto.createHash('sha256').update(`answerdesk-vault-aes256:${secret}`).digest();
}

function encryptVault(obj) {
    const key = getVaultEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        v: 1,
        alg: 'aes-256-gcm',
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        data: encrypted.toString('base64')
    };
}

function decryptVault(blob) {
    if (!blob || typeof blob !== 'object' || !blob.iv || !blob.tag || !blob.data) return null;
    try {
        const key = getVaultEncryptionKey();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(blob.iv, 'base64'));
        decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(blob.data, 'base64')),
            decipher.final()
        ]);
        const parsed = JSON.parse(decrypted.toString('utf8'));
        return (parsed && typeof parsed === 'object') ? parsed : null;
    } catch (_) {
        return null;
    }
}

async function loadAuthVault() {
    loadLocalEnvOnce();
    const mode = getStorageMode();
    let rawBlob = null;

    if (mode === 'kv_rest') {
        try {
            rawBlob = await kvGet(KV_AUTH_VAULT_KEY);
        } catch (err) {
            console.warn('[AnswerDesk Store] KV auth vault read fallback:', err.message);
        }
    } else if (mode === 'local_file') {
        rawBlob = readJsonFileSafe(LOCAL_AUTH_VAULT_PATH);
    } else {
        rawBlob = readJsonFileSafe(TMP_AUTH_VAULT_PATH);
    }

    return decryptVault(rawBlob);
}

async function saveAuthVault(vaultObj) {
    loadLocalEnvOnce();
    const encrypted = encryptVault(vaultObj);
    const mode = getStorageMode();

    if (mode === 'kv_rest') {
        await kvSet(KV_AUTH_VAULT_KEY, encrypted);
        return true;
    }
    if (mode === 'local_file') {
        writeJsonFileAtomic(LOCAL_AUTH_VAULT_PATH, encrypted);
        return true;
    }
    writeJsonFileAtomic(TMP_AUTH_VAULT_PATH, encrypted);
    return true;
}

function hasAdminConfigured() {
    loadLocalEnvOnce();
    return Boolean(
        (process.env.ADMIN_PASSWORD_HASH || '').trim() ||
        (process.env.ADMIN_PASSWORD || '').trim()
    );
}

function hasSuperAdminConfigured() {
    loadLocalEnvOnce();
    return Boolean(
        (process.env.SUPER_ADMIN_PASSWORD_HASH || '').trim() ||
        (process.env.SUPER_ADMIN_PASSWORD || '').trim()
    );
}

function verifySuperAdmin(candidate) {
    loadLocalEnvOnce();
    const hash = (process.env.SUPER_ADMIN_PASSWORD_HASH || '').trim();
    if (hash) return verifyPasswordHash(candidate, hash);
    const legacy = (process.env.SUPER_ADMIN_PASSWORD || '').trim();
    if (legacy) return constantTimeCompare(candidate, legacy);
    return false;
}

async function verifyAdminLogin(candidate) {
    loadLocalEnvOnce();
    if (typeof candidate !== 'string' || !candidate) return false;
    const vault = await loadAuthVault();
    if (vault && typeof vault.adminPasswordHash === 'string' && vault.adminPasswordHash) {
        return verifyPasswordHash(candidate, vault.adminPasswordHash);
    }
    const envHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
    if (envHash) return verifyPasswordHash(candidate, envHash);
    const legacy = (process.env.ADMIN_PASSWORD || '').trim();
    if (legacy) return constantTimeCompare(candidate, legacy);
    return false;
}

function validatePasswordPolicy(pw) {
    if (typeof pw !== 'string') return 'Password must be a string.';
    if (pw.length < 8 || pw.length > 128) return 'New password must be between 8 and 128 characters.';
    if (!/[A-Z]/.test(pw)) return 'New password must contain at least 1 uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'New password must contain at least 1 lowercase letter.';
    if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pw)) {
        return 'New password must contain at least 1 number or special character.';
    }
    return '';
}

async function resetAdminPasswordWithSuperAdmin(superAdminCandidate, newPassword) {
    if (!hasSuperAdminConfigured()) {
        return { ok: false, status: 503, error: 'Super Admin credential is not configured on this server.' };
    }
    if (!verifySuperAdmin(superAdminCandidate)) {
        return { ok: false, status: 401, error: 'Invalid Super Admin password.' };
    }
    const policyErr = validatePasswordPolicy(newPassword);
    if (policyErr) {
        return { ok: false, status: 400, error: policyErr };
    }

    const adminPasswordHash = hashPasswordScrypt(newPassword);
    const sessionVersion = crypto.randomBytes(16).toString('hex');
    const passwordUpdatedAt = new Date().toISOString();

    await saveAuthVault({
        adminPasswordHash,
        sessionVersion,
        passwordUpdatedAt
    });

    return { ok: true, passwordUpdatedAt };
}

async function getAuthMetadata() {
    const vault = await loadAuthVault();
    return {
        sessionVersion: (vault && vault.sessionVersion) ? vault.sessionVersion : 'v1',
        passwordUpdatedAt: (vault && vault.passwordUpdatedAt) ? vault.passwordUpdatedAt : null,
        hasVaultOverride: Boolean(vault && vault.adminPasswordHash)
    };
}

function signSessionToken(sessionVersion) {
    const secret = getSessionSecret();
    if (!secret) throw new Error('Session secret not configured');
    const exp = Date.now() + SESSION_TTL_MS;
    const payload = Buffer.from(JSON.stringify({ exp, sv: sessionVersion || 'v1', v: 2 })).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
}

function verifySessionToken(token, expectedSessionVersion) {
    const secret = getSessionSecret();
    if (!token || !secret || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payload, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (typeof data.exp !== 'number' || data.exp <= Date.now()) return false;
        return data.sv === (expectedSessionVersion || 'v1');
    } catch (_) {
        return false;
    }
}

function parseCookies(req) {
    const header = req.headers?.cookie || '';
    const out = {};
    for (const part of header.split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        const k = part.slice(0, idx).trim();
        const v = part.slice(idx + 1).trim();
        if (k) out[k] = decodeURIComponent(v);
    }
    return out;
}

async function isAuthenticated(req) {
    const vault = await loadAuthVault();
    const configured = hasAdminConfigured() || Boolean(vault && vault.adminPasswordHash);
    if (!configured) return { configured: false, ok: false };
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE_NAME];
    const sv = (vault && vault.sessionVersion) ? vault.sessionVersion : 'v1';
    return { configured: true, ok: verifySessionToken(token, sv) };
}

function buildSessionCookieHeader(req, token, maxAgeSec) {
    const isHttps = req.headers['x-forwarded-proto'] === 'https' || process.env.VERCEL === '1';
    const parts = [
        `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Strict',
        `Max-Age=${maxAgeSec}`
    ];
    if (isHttps) parts.push('Secure');
    return parts.join('; ');
}

function readJsonBody(req, maxBytes = 65536) {
    if (req.body !== undefined) {
        try {
            if (Buffer.isBuffer(req.body)) {
                if (req.body.length > maxBytes) return Promise.reject(new Error('Payload too large'));
                const txt = req.body.toString('utf8').trim();
                return Promise.resolve(txt ? JSON.parse(txt) : {});
            }
            if (typeof req.body === 'string') {
                if (Buffer.byteLength(req.body, 'utf8') > maxBytes) return Promise.reject(new Error('Payload too large'));
                const txt = req.body.trim();
                return Promise.resolve(txt ? JSON.parse(txt) : {});
            }
            if (typeof req.body === 'object' && req.body !== null) {
                if (Buffer.byteLength(JSON.stringify(req.body), 'utf8') > maxBytes) {
                    return Promise.reject(new Error('Payload too large'));
                }
                return Promise.resolve(req.body);
            }
        } catch (_) {
            return Promise.reject(new Error('Invalid JSON'));
        }
    }

    return new Promise((resolve, reject) => {
        let size = 0;
        let body = '';
        req.on('data', chunk => {
            size += chunk.length;
            if (size > maxBytes) {
                reject(new Error('Payload too large'));
                req.destroy();
                return;
            }
            body += chunk.toString('utf8');
        });
        req.on('end', () => {
            if (!body.trim()) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (_) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', err => reject(err));
    });
}

function getDefaultAnalyticsStore() {
    return {
        version: 1,
        days: {},
        recentConversions: [],
        clientErrors: [],
        activeSessions: {},
        notFound404s: [],
        recentEvents: []
    };
}

async function loadAnalyticsStore() {
    loadLocalEnvOnce();
    const mode = getStorageMode();
    let stored = null;
    if (mode === 'kv_rest') {
        try { stored = await kvGet(KV_ANALYTICS_KEY); } catch (_) {}
    } else if (mode === 'local_file') {
        stored = readJsonFileSafe(LOCAL_ANALYTICS_PATH);
    } else {
        stored = readJsonFileSafe(TMP_ANALYTICS_PATH);
    }
    if (!stored || typeof stored !== 'object' || typeof stored.days !== 'object') {
        return getDefaultAnalyticsStore();
    }
    return {
        version: 1,
        days: stored.days || {},
        recentConversions: Array.isArray(stored.recentConversions) ? stored.recentConversions : [],
        clientErrors: Array.isArray(stored.clientErrors) ? stored.clientErrors : [],
        activeSessions: (stored.activeSessions && typeof stored.activeSessions === 'object') ? stored.activeSessions : {},
        notFound404s: Array.isArray(stored.notFound404s) ? stored.notFound404s : [],
        recentEvents: Array.isArray(stored.recentEvents) ? stored.recentEvents : []
    };
}

async function saveAnalyticsStore(store) {
    loadLocalEnvOnce();
    const mode = getStorageMode();
    if (mode === 'kv_rest') {
        await kvSet(KV_ANALYTICS_KEY, store);
        return store;
    }
    if (mode === 'local_file') {
        writeJsonFileAtomic(LOCAL_ANALYTICS_PATH, store);
        return store;
    }
    writeJsonFileAtomic(TMP_ANALYTICS_PATH, store);
    return store;
}

async function loadHealthLog() {
    loadLocalEnvOnce();
    const mode = getStorageMode();
    let stored = null;
    if (mode === 'kv_rest') {
        try { stored = await kvGet(KV_HEALTH_KEY); } catch (_) {}
    } else if (mode === 'local_file') {
        stored = readJsonFileSafe(LOCAL_HEALTH_PATH);
    } else {
        stored = readJsonFileSafe(TMP_HEALTH_PATH);
    }
    return Array.isArray(stored) ? stored : [];
}

async function saveHealthLog(list) {
    loadLocalEnvOnce();
    const trimmed = Array.isArray(list) ? list.slice(0, 100) : [];
    const mode = getStorageMode();
    if (mode === 'kv_rest') {
        await kvSet(KV_HEALTH_KEY, trimmed);
        return trimmed;
    }
    if (mode === 'local_file') {
        writeJsonFileAtomic(LOCAL_HEALTH_PATH, trimmed);
        return trimmed;
    }
    writeJsonFileAtomic(TMP_HEALTH_PATH, trimmed);
    return trimmed;
}

function hashVisitorDaily(ip, ua, utcDay) {
    const secret = getSessionSecret() || 'answerdesk-anon-daily';
    const day = utcDay || new Date().toISOString().slice(0, 10);
    return crypto.createHash('sha256').update(`${day}:${secret}:${ip || ''}:${ua || ''}`).digest('hex').slice(0, 16);
}

function sendJson(res, statusCode, obj) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.end(JSON.stringify(obj));
}

module.exports = {
    getDefaultConfig,
    getDefaultCategories,
    sanitizeConfig,
    collectConfigWarnings,
    normalizePhone,
    normalizeEmail,
    resolvePhone,
    resolveEmail,
    getStorageMode,
    loadConfig,
    saveConfig,
    loadSubmissions,
    saveSubmissions,
    getDefaultAnalyticsStore,
    loadAnalyticsStore,
    saveAnalyticsStore,
    loadHealthLog,
    saveHealthLog,
    hashVisitorDaily,
    hasAdminConfigured,
    hasSuperAdminConfigured,
    verifyAdminLogin,
    verifySuperAdmin,
    resetAdminPasswordWithSuperAdmin,
    getAuthMetadata,
    signSessionToken,
    isAuthenticated,
    buildSessionCookieHeader,
    readJsonBody,
    sendJson,
    cleanStr
};
