'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// In-memory LRU-style cache for common Turn-1 / greeting queries (cuts repeat API cost to $0)
const RESPONSE_CACHE = new Map();
const RESPONSE_CACHE_MAX = 500;
const RESPONSE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getCachedReply(key) {
    const entry = RESPONSE_CACHE.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > RESPONSE_CACHE_TTL_MS) {
        RESPONSE_CACHE.delete(key);
        return null;
    }
    return entry.data;
}

function setCachedReply(key, data) {
    if (RESPONSE_CACHE.size >= RESPONSE_CACHE_MAX) {
        const oldestKey = RESPONSE_CACHE.keys().next().value;
        RESPONSE_CACHE.delete(oldestKey);
    }
    RESPONSE_CACHE.set(key, { ts: Date.now(), data });
}

// Hot-load .env.local ONLY in local dev so production relies strictly on host env vars
function refreshLocalEnv() {
    if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') return;
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        if (!fs.existsSync(envPath)) return;
        const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
        for (const line of lines) {
            const m = line.match(/^\s*([\w_]+)\s*=\s*(.*?)\s*$/);
            if (m && m[2]) {
                process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
            }
        }
    } catch (_) {}
}

// Strict Origin allowlist, payload bounds, input sanitization & per-IP rate limiting
const ALLOWED_ORIGINS = new Set([
    'https://answerdesk-zeta.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
]);
if (process.env.VERCEL_URL) {
    ALLOWED_ORIGINS.add(`https://${process.env.VERCEL_URL}`);
}

const MAX_BODY_BYTES = 32768;
const MAX_MESSAGE_CHARS = 1500;
const MAX_HISTORY_ITEMS = 16;
const MAX_HISTORY_ITEM_CHARS = 1200;

const RATE_LIMIT_MAP = new Map();
const RATE_LIMIT_MAX_KEYS = 2000;
const RATE_WINDOW_MIN_MS = 60 * 1000;
const RATE_MAX_PER_MIN = 25;
const RATE_WINDOW_HOUR_MS = 60 * 60 * 1000;
const RATE_MAX_PER_HOUR = 120;

function getTrustedClientIp(req) {
    const vercelFwd = req.headers['x-vercel-forwarded-for'];
    if (typeof vercelFwd === 'string' && vercelFwd.trim()) {
        return vercelFwd.split(',')[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
        return realIp.trim();
    }
    return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function checkRateLimit(ip) {
    const now = Date.now();
    if (RATE_LIMIT_MAP.size > RATE_LIMIT_MAX_KEYS) {
        for (const [k, entry] of RATE_LIMIT_MAP) {
            if (!entry.hourHits.length || now - entry.hourHits[entry.hourHits.length - 1] > RATE_WINDOW_HOUR_MS) {
                RATE_LIMIT_MAP.delete(k);
            }
        }
        if (RATE_LIMIT_MAP.size > RATE_LIMIT_MAX_KEYS) RATE_LIMIT_MAP.clear();
    }
    let entry = RATE_LIMIT_MAP.get(ip);
    if (!entry) {
        entry = { minHits: [], hourHits: [] };
        RATE_LIMIT_MAP.set(ip, entry);
    }
    entry.minHits = entry.minHits.filter(t => now - t < RATE_WINDOW_MIN_MS);
    entry.hourHits = entry.hourHits.filter(t => now - t < RATE_WINDOW_HOUR_MS);
    if (entry.minHits.length >= RATE_MAX_PER_MIN || entry.hourHits.length >= RATE_MAX_PER_HOUR) {
        return false;
    }
    entry.minHits.push(now);
    entry.hourHits.push(now);
    return true;
}

function sanitizeControlField(val, maxLen = 80) {
    if (typeof val !== 'string') return '';
    return val.replace(/[\r\n\t\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

// ==========================================================================
// AnswerDesk Conversational Engine — Replicating AskTech (Pearl AI) Logic
// Uses dedicated rules in ./pearl-rules.js with 100% static prefix caching,
// DeepSeek-V4.1-Flash (thinking disabled for fast JSON turns), zero-token
// greetings/handoffs, and domain-aware offline fallback.
// ==========================================================================

const { CATEGORY_DIRECTORY, PEARL_PLAYBOOK_PROMPT } = require('./pearl-rules.js');

function sanitizeReplyText(text) {
    if (!text) return '';
    return String(text)
        .replace(/[\u2014\u2013]/g, ', ')
        .replace(/\s+,\s+/g, ', ')
        .replace(/,\s*\./g, '.')
        .replace(/\bQuantum\b/gi, 'AnswerDesk')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

// ===== HTTP JSON Helper =====
function postJson(urlStr, headers, bodyObj, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        const payload = JSON.stringify(bodyObj);
        const mod = u.protocol === 'https:' ? https : http;
        const req = mod.request({
            hostname: u.hostname,
            port: u.port || (u.protocol === 'https:' ? 443 : 80),
            path: u.pathname + u.search,
            method: 'POST',
            timeout: timeoutMs,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                ...headers
            }
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                resolve({ status: res.statusCode, raw: data });
            });
        });
        req.on('timeout', () => req.destroy(new Error('LLM request timeout')));
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function parseJsonLoose(text) {
    if (!text) return null;
    const trimmed = String(text).trim();
    try { return JSON.parse(trimmed); } catch (_) {}
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
        try { return JSON.parse(fenced[1].trim()); } catch (_) {}
    }
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        try { return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)); } catch (_) {}
    }
    return null;
}

// ===== Multi-Provider Live LLM Router (DeepSeek / Z.ai / OpenAI / Groq / OpenRouter / Gemini / Ollama) =====
async function callLiveLLM(staticSystemPrompt, trailingHint, history, currentMessage) {
    refreshLocalEnv();
    const errors = [];

    // Build messages with a 100% STATIC system prefix at messages[0] and valid JSON assistant history
    // (Prevents DeepSeek json_object mode from mimicking plain-text assistant turns and returning spaces)
    function buildOpenAIMessages(appendJsonReminder = false) {
        const messages = [{ role: 'system', content: staticSystemPrompt }];
        for (const h of history.slice(-14)) {
            if (h.user) messages.push({ role: 'user', content: h.user });
            if (h.model) {
                const asstJson = JSON.stringify({
                    stage: h.stage || 'intake',
                    reply_text: h.model,
                    category: h.category || 'general'
                });
                messages.push({ role: 'assistant', content: asstJson });
            }
        }
        let userContent = trailingHint ? `[${trailingHint}]\n${currentMessage}` : currentMessage;
        if (appendJsonReminder) {
            userContent += '\n(Respond with one valid JSON object matching the required schema.)';
        }
        messages.push({ role: 'user', content: userContent });
        return messages;
    }

    // Helper for OpenAI-compatible chat completions (DeepSeek, Z.ai, OpenAI, Groq, OpenRouter)
    async function tryOpenAICompat(name, url, apiKey, model, extraHeaders = {}, extraBody = {}) {
        for (let attempt = 0; attempt < 2; attempt++) {
            const messages = buildOpenAIMessages(attempt === 1);
            const resp = await postJson(url, {
                Authorization: `Bearer ${apiKey}`,
                ...extraHeaders
            }, {
                model,
                messages,
                temperature: attempt === 0 ? 0.55 : 0.35,
                max_tokens: 450,
                response_format: { type: 'json_object' },
                ...extraBody
            });

            const parsed = parseJsonLoose(resp.raw);
            if (resp.status >= 400 || !parsed || parsed.error) {
                throw new Error(`${name} HTTP ${resp.status}: ${parsed?.error?.message || resp.raw.slice(0, 140)}`);
            }
            const content = parsed.choices?.[0]?.message?.content;
            const json = parseJsonLoose(content);
            if (json && json.reply_text) {
                const u = parsed.usage || {};
                const cacheHit = u.prompt_cache_hit_tokens ?? u.prompt_tokens_details?.cached_tokens ?? 0;
                const tokenUsage = {
                    prompt_tokens: u.prompt_tokens || 0,
                    prompt_cache_hit_tokens: cacheHit,
                    completion_tokens: u.completion_tokens || 0
                };
                return { provider: `${name}:${model}`, data: json, tokenUsage };
            }
            if (attempt === 1) {
                throw new Error(`${name} returned invalid JSON`);
            }
        }
    }

    // 1. DeepSeek (Primary — supports deepseek-flash / deepseek-v4-pro with thinking disabled for fast JSON turns)
    const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
    if (deepseekKey) {
        try {
            const dsBase = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
            const dsModel = (process.env.DEEPSEEK_MODEL || 'deepseek-flash').trim();
            return await tryOpenAICompat(
                'deepseek',
                `${dsBase}/chat/completions`,
                deepseekKey,
                dsModel,
                {},
                { thinking: { type: 'disabled' } }
            );
        } catch (e) { errors.push(e.message); }
    }

    // 2. Z.ai / Zhipu GLM (if configured — supports glm-5.3-flash, glm-5.3, glm-4.7-flash, etc.)
    const zaiKey = (process.env.ZAI_API_KEY || process.env.GLM_API_KEY || '').trim();
    if (zaiKey) {
        try {
            const zaiBase = (process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4').replace(/\/+$/, '');
            const zaiModel = (process.env.ZAI_MODEL || process.env.GLM_MODEL || 'glm-5.3-flash').trim();
            return await tryOpenAICompat(
                'zai',
                `${zaiBase}/chat/completions`,
                zaiKey,
                zaiModel
            );
        } catch (e) { errors.push(e.message); }
    }

    // 2. OpenAI (if configured)
    if (process.env.OPENAI_API_KEY) {
        try {
            return await tryOpenAICompat(
                'openai',
                'https://api.openai.com/v1/chat/completions',
                process.env.OPENAI_API_KEY.trim(),
                process.env.OPENAI_MODEL || 'gpt-4o-mini'
            );
        } catch (e) { errors.push(e.message); }
    }

    // 2. Groq (if configured — ultra-fast free tier available)
    if (process.env.GROQ_API_KEY) {
        try {
            return await tryOpenAICompat(
                'groq',
                'https://api.groq.com/openai/v1/chat/completions',
                process.env.GROQ_API_KEY.trim(),
                process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
            );
        } catch (e) { errors.push(e.message); }
    }

    // 3. OpenRouter (if configured)
    if (process.env.OPENROUTER_API_KEY) {
        try {
            return await tryOpenAICompat(
                'openrouter',
                'https://openrouter.ai/api/v1/chat/completions',
                process.env.OPENROUTER_API_KEY.trim(),
                process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
                { 'HTTP-Referer': 'https://answerdesk-zeta.vercel.app', 'X-Title': 'AnswerDesk' }
            );
        } catch (e) { errors.push(e.message); }
    }

    // 4. Google Gemini (if configured)
    if (process.env.GEMINI_API_KEY) {
        const key = process.env.GEMINI_API_KEY.trim();
        const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        try {
            const contents = [];
            for (const h of history.slice(-14)) {
                if (h.user) contents.push({ role: 'user', parts: [{ text: h.user }] });
                if (h.model) contents.push({ role: 'model', parts: [{ text: h.model }] });
            }
            contents.push({ role: 'user', parts: [{ text: currentMessage }] });

            const combinedGeminiPrompt = trailingHint ? `${staticSystemPrompt}\n\n${trailingHint}` : staticSystemPrompt;
            const resp = await postJson(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
                {},
                {
                    systemInstruction: { parts: [{ text: combinedGeminiPrompt }] },
                    contents,
                    generationConfig: {
                        responseMimeType: 'application/json',
                        temperature: 0.6
                    }
                },
                10000
            );
            const parsed = parseJsonLoose(resp.raw);
            if (resp.status >= 400 || !parsed || parsed.error) {
                throw new Error(`gemini HTTP ${resp.status}: ${parsed?.error?.message || resp.raw.slice(0, 140)}`);
            }
            const rawText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            const json = parseJsonLoose(rawText);
            if (!json || !json.reply_text) throw new Error('gemini returned invalid JSON');
            return { provider: `gemini:${model}`, data: json };
        } catch (e) { errors.push(e.message); }
    }

    // 5. Local Ollama (if explicitly configured)
    if (process.env.OLLAMA_MODEL) {
        try {
            const baseUrl = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
            const messages = buildOpenAIMessages();
            const resp = await postJson(`${baseUrl}/api/chat`, {}, {
                model: process.env.OLLAMA_MODEL,
                messages,
                format: 'json',
                stream: false
            }, 25000);
            const parsed = parseJsonLoose(resp.raw);
            const json = parseJsonLoose(parsed?.message?.content);
            if (json && json.reply_text) {
                return { provider: `ollama:${process.env.OLLAMA_MODEL}`, data: json };
            }
            throw new Error(`ollama HTTP ${resp.status}`);
        } catch (e) { errors.push(e.message); }
    }

    const err = new Error(errors.length ? errors.join(' | ') : 'No LLM API key configured');
    err.providerErrors = errors;
    throw err;
}

// ==========================================================================
// Domain-Aware Pearl-Style Multi-Turn Offline Fallback
// (Only used if upstream LLM API returns 402/429/error so chat stays human-like)
// ==========================================================================
function isPureGreeting(msg) {
    const s = (msg || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return true;
    if (/^(hi+|hello+|hey+|heyy+|yo|hola|namaste|greetings|good morning|good afternoon|good evening|hi there|hello there|hey there|how are you|anyone there|are you there|need help|i need help|help me|can you help)$/.test(s)) {
        return true;
    }
    // Catch repeated greeting spam like "hi hi hi hi" or "hello hello hello"
    const words = s.split(' ');
    const greetWords = new Set(['hi', 'hii', 'hiii', 'hello', 'helloo', 'hey', 'heyy', 'yo', 'hola', 'there', 'again']);
    return words.length > 0 && words.every(w => greetWords.has(w) || /^h+i+$/.test(w));
}

function isSummaryConfirmYesOrDone(msg) {
    const t = (msg || '').trim().toLowerCase();
    return /^(no|nope|nah|nothing|nothing else|that'?s all|that'?s everything|all good|looks good|yes|ready|connect me|yes please|please connect|yes please connect urgently|connect urgently|go ahead)[.!?\s]*$/i.test(t)
        || /\b(nothing else|that'?s everything|please connect|connect urgently|connect me now|ready to connect)\b/i.test(t);
}

function isPhoneChoice(msg) {
    return /\b(phone|call|voice|speak|ring)\b/i.test(msg || '');
}

function isChatChoice(msg) {
    return /\b(chat|text|online|message)\b/i.test(msg || '');
}

function detectCategoryBroad(text, prevCat) {
    let s = (text || '').toLowerCase();
    // If user explicitly pivots ("never mind X, ..."), prefer matching the post-pivot clause first
    const pivotMatch = s.match(/(?:actually\s+)?(?:never\s*mind|forget(?:\s+about)?|instead\s+of|switch(?:\s+over)?\s+to)[^.!?\n]*[.,!?;:-]\s*(.+)$/i);
    if (pivotMatch && pivotMatch[1]) {
        const afterPivot = detectCategoryBroad(pivotMatch[1], null);
        if (afterPivot && afterPivot !== 'general') return afterPivot;
    }
    if (/\b(pain|ache|aching|leg|legs|arm|arms|back|neck|knee|knees|foot|feet|ankle|swelling|swollen|redness|numbness|tingling|fever|headache|migraine|cough|cold|flu|throat|stomach|chest|breathing|rash|itch|bleeding|dizzy|nausea|vomit|hurt|hurts|hurting|sore|cramp|cramps|injury|doctor|physician|medical|health|medicine|medication|blood pressure|heart|kidney|liver|pregnant|symptom)\b/i.test(s)) {
        if (/\b(dog|cat|puppy|kitten|pet|vet)\b/i.test(s)) return 'veterinary';
        return 'medical';
    }
    if (/\b(dog|cat|puppy|kitten|pet|vet|veterinary|paw|barking|meowing|ate chocolate)\b/i.test(s)) return 'veterinary';
    if (/\b(paypal|pay in 4|venmo|zelle|cash app|bitcoin|crypto|coinbase|binance|metamask|trust wallet|kraken|phantom|ledger|trezor|robinhood|chase|bank of america|wells fargo|citibank|capital one|fidelity|schwab|chime|sofi|wire transfer|ach|ethereum|solana|usdt|usdc|blockchain|seed phrase|wallet|exchange|fintech|bank login|bank account|21-?day|180-?day|apple pay|google pay)\b/i.test(s)) return 'crypto';
    if (/\b(windows|windows 10|windows 11|microsoft|microsoft account|bitlocker|defender|0x800|outlook|onedrive|surface|office|excel|word|teams|bsod|blue screen|dell|hp|lenovo|asus|mcafee|norton|bitdefender|malwarebytes|avast|antivirus|printer|epson|laptop|pc|computer)\b/i.test(s)) return 'microsoft';
    if (/\b(iphone|ipad|macbook|imac|mac|macos|apple|apple id|icloud|airpods|airdrop|activation lock|facetime|apple watch|ios|4013)\b/i.test(s)) return 'ios';
    if (/\b(amazon|amazon account|prime|prime video|fire tv|firestick|kindle|alexa|echo|ring|aws|audible|gmail|facebook|instagram|hacked|account locked|2fa)\b/i.test(s)) return 'account';
    if (/\b(subscription|refund|cancel|auto-?renew|charged|billing)\b/i.test(s)) return 'subscription';
    if (/\b(car|truck|engine|brake|toyota|honda|ford|chevy|nissan|mechanic|obd|check engine|won'?t start)\b/i.test(s)) return 'automotive';
    if (/\b(pipe|leak|toilet|sink|plumb|water heater|drain|faucet|flooding)\b/i.test(s)) return 'plumbing';
    if (/\b(fridge|refrigerator|washer|dryer|dishwasher|oven|microwave|tv|soundbar|appliance)\b/i.test(s)) return 'appliances';
    if (/\b(xbox|playstation|ps5|nintendo|switch|gaming|controller)\b/i.test(s)) return 'xbox';
    if (/\b(android|samsung|galaxy|pixel|oneplus|chromebook)\b/i.test(s)) return 'android';
    if (/\b(lawyer|attorney|legal|fired|evict|landlord|divorce|custody|contract|lawsuit)\b/i.test(s)) return 'legal';
    if (/\b(tax|irs|cpa|401k|audit|credit score|loan|mortgage)\b/i.test(s)) return 'finance';
    return prevCat || 'general';
}

const DOMAIN_PLAYBOOK_QUESTIONS = {
    medical: [
        (ctx) => `I'm sorry to hear you're experiencing ${ctx.topic}. How long have you been experiencing this?`,
        (ctx) => `Thanks for sharing that. Can you tell me more specifically where you're feeling it (for example, one side or both sides, and whether it feels sharp, dull, or throbbing)?`,
        (ctx) => `Got it, thank you for letting me know. Are you experiencing any other symptoms along with it, such as swelling, redness, numbness, tingling, or fever?`,
        (ctx) => `Thank you for sharing those symptoms. Have you had any recent injuries, changes in medication, or underlying medical conditions like heart, kidney, or liver issues?`,
        (ctx) => `Thank you for sharing that information. Have you noticed if the symptoms get worse at certain times of day or with activity, or do they stay the same throughout?`
    ],
    microsoft: [
        (ctx) => `I'm sorry you're running into trouble with ${ctx.topic}. Which device, model, and version of Windows or Microsoft app is this happening on?`,
        (ctx) => `Got it, thank you. When did you first start noticing this issue, and did anything change right before (such as a Windows update or installing/uninstalling a program)?`,
        (ctx) => `Thanks for sharing that. Are you seeing any specific error code or exact message on your screen?`,
        (ctx) => `Thank you for letting me know. Have you tried any troubleshooting steps so far, such as restarting, resetting, or reinstalling anything?`
    ],
    ios: [
        (ctx) => `I'm sorry you're dealing with ${ctx.topic}. Which exact Apple device and model is this happening on (for example, iPhone, MacBook, iPad, or Apple Watch)?`,
        (ctx) => `Got it. When did this first start, and did it happen right after an iOS/macOS update, a drop, or a password change?`,
        (ctx) => `Thanks for sharing that. Are you seeing any specific alert or error code on the screen, and is your data backed up to iCloud?`,
        (ctx) => `Thank you for letting me know. What steps have you already tried so far?`
    ],
    crypto: [
        (ctx) => `I understand how stressful ${ctx.topic} can be. Which exact payment platform is this on, and what specific message or notice are you seeing in your account?`,
        (ctx) => `Got it. When did this hold, decline, or restriction first start?`,
        (ctx) => `Thank you for sharing that. Have you already submitted any tracking numbers, ID verification documents, or spoken with your bank about it?`
    ],
    account: [
        (ctx) => `I understand how stressful ${ctx.topic} can be. Which account or service is affected, and what exact message shows up when you try to sign in?`,
        (ctx) => `Got it. When did this start, and do you still have access to the recovery email or phone number on file?`,
        (ctx) => `Thank you for letting me know. Have you already tried resetting your password or contacting their automated recovery page?`
    ],
    veterinary: [
        (ctx) => `I'm so sorry to hear your pet is dealing with ${ctx.topic}. What kind of pet is it (dog/cat, breed, and approximate age), and how long has this been going on?`,
        (ctx) => `Thanks for letting me know. Are they still eating, drinking water, and acting alert, or are they lethargic?`,
        (ctx) => `Got it. Are there any other symptoms like vomiting, diarrhea, limping, or anything unusual they may have eaten recently?`
    ],
    automotive: [
        (ctx) => `I understand how frustrating ${ctx.topic} can be. What is the year, make, and model of your vehicle?`,
        (ctx) => `Got it. When did you first notice this, and are any dashboard warning lights on (like Check Engine or Battery)?`,
        (ctx) => `Thanks for sharing that. Have you noticed any unusual sounds, smells, or had any recent repairs done?`
    ],
    general: [
        (ctx) => `I understand, I want to make sure we get you to the exact right expert for ${ctx.topic}. Could you tell me a little more about what's happening and when it started?`,
        (ctx) => `Thanks for sharing that. Have you noticed any other details, symptoms, or specific messages related to this?`,
        (ctx) => `Thank you for letting me know. Have you already tried anything to fix or address this so far?`
    ]
};

function extractPlainTopic(msg, category) {
    const clean = (msg || '').trim().replace(/[.!?]+$/, '');
    if (/\bleg/i.test(clean) && /\bpain/i.test(clean)) return 'leg pain';
    if (/\bback/i.test(clean) && /\bpain/i.test(clean)) return 'back pain';
    if (/\bheadache|migraine/i.test(clean)) return 'headaches';
    if (/\bchest/i.test(clean) && /\bpain/i.test(clean)) return 'chest pain';
    if (/\bstomach/i.test(clean) && /\bpain/i.test(clean)) return 'stomach pain';
    if (/\bswell/i.test(clean)) return 'pain and swelling';
    if (clean.length <= 45) return clean.replace(/^my\s+/i, 'your ');
    return (CATEGORY_DIRECTORY[category] || CATEGORY_DIRECTORY.general).label.toLowerCase();
}

function runFallbackPearlFlow({ message, history, prevIntake, specialistHandoff, connectedToExpert, expertName, expertRole }) {
    const state = prevIntake && typeof prevIntake === 'object'
        ? {
            stage: prevIntake.stage || 'greeting',
            category: prevIntake.category || 'general',
            stepIndex: Number(prevIntake.stepIndex || 0),
            topic: prevIntake.topic || '',
            facts: Array.isArray(prevIntake.facts) ? [...prevIntake.facts] : []
        }
        : { stage: 'greeting', category: 'general', stepIndex: 0, topic: '', facts: [] };

    const catInfo = () => CATEGORY_DIRECTORY[state.category] || CATEGORY_DIRECTORY.general;

    if (specialistHandoff) {
        state.stage = 'connected';
        const ci = catInfo();
        const name = expertName || 'Dr. Sarah Thompson';
        const role = expertRole || ci.expert;
        const summaryLine = state.facts.length ? state.facts.slice(0, 3).join('; ') : state.topic || 'your issue';
        return {
            stage: 'connected',
            reply_text: `Hi! I'm **${name}**, your verified **${role}**. I just reviewed everything you shared with our Care Assistant (${summaryLine}). I'm here to walk through this with you right now — what is your biggest concern or first question you'd like me to address?`,
            category: state.category,
            expert_role: role,
            phone_number: ci.phone,
            cta_headline: `Get help with ${state.topic || ci.label}`,
            summary_bullets: state.facts.map(f => `You shared: ${f}`),
            show_channel_cards: false,
            intake_state: state
        };
    }

    if (connectedToExpert) {
        state.stage = 'connected';
        const ci = catInfo();
        if (isPhoneChoice(message)) {
            return {
                stage: 'handoff_call',
                reply_text: `Of course, let's switch to a direct phone call right now so I can help you faster.`,
                category: state.category,
                expert_role: expertRole || ci.expert,
                phone_number: ci.phone,
                cta_headline: `Get help with ${state.topic || ci.label}`,
                show_channel_cards: false,
                auto_open_call: true,
                intake_state: state
            };
        }
        return {
            stage: 'connected',
            reply_text: `Thank you for that update. I'm taking that into account right now. To make sure I give you the most accurate guidance, could you tell me if anything has changed in the last hour, or would you prefer to switch to a quick phone call?`,
            category: state.category,
            expert_role: expertRole || ci.expert,
            phone_number: ci.phone,
            cta_headline: `Get help with ${state.topic || ci.label}`,
            show_channel_cards: false,
            intake_state: state
        };
    }

    // Stage 0: Pure Greeting (0 API tokens even if user repeats "hi" / "hello hello hello")
    if (isPureGreeting(message) && state.facts.length === 0) {
        state.stage = 'greeting';
        const replies = [
            "Hi there! What's going on today? Tell me a little about the issue you're running into in your own words.",
            "I'm right here! Whenever you're ready, just tell me what you need help with today.",
            "Still here and ready whenever you are. Just type your question or issue below and we'll get started!"
        ];
        const idx = Math.min(history.length, replies.length - 1);
        return {
            stage: 'greeting',
            reply_text: replies[idx],
            category: 'general',
            expert_role: 'Support Expert',
            phone_number: CATEGORY_DIRECTORY.general.phone,
            cta_headline: '',
            summary_bullets: [],
            show_channel_cards: false,
            intake_state: state
        };
    }

    // Stage 4: Channel Choice -> Handoff
    if (state.stage === 'channel_choice') {
        const ci = catInfo();
        if (isPhoneChoice(message)) {
            state.stage = 'handoff_call';
            return {
                stage: 'handoff_call',
                reply_text: `OK, got it. I'm opening the direct phone connection for the **${ci.expert}** now and passing along your full summary so you don't have to repeat yourself.`,
                category: state.category,
                expert_role: ci.expert,
                phone_number: ci.phone,
                cta_headline: `Get help with ${state.topic || ci.label}`,
                summary_bullets: state.facts,
                show_channel_cards: false,
                auto_open_call: true,
                intake_state: state
            };
        }
        if (isChatChoice(message)) {
            state.stage = 'handoff_chat';
            return {
                stage: 'handoff_chat',
                reply_text: `OK, got it. I'm passing your summary to the **${ci.expert}** and connecting you right here in live chat now.`,
                category: state.category,
                expert_role: ci.expert,
                phone_number: ci.phone,
                cta_headline: `Get help with ${state.topic || ci.label}`,
                summary_bullets: state.facts,
                show_channel_cards: false,
                auto_open_chat: true,
                intake_state: state
            };
        }
    }

    // Stage 3: Summary Confirm -> Channel Choice (or update summary)
    if (state.stage === 'summary_confirm') {
        const ci = catInfo();
        if (isSummaryConfirmYesOrDone(message) || isPhoneChoice(message) || isChatChoice(message)) {
            state.stage = 'channel_choice';
            return {
                stage: 'channel_choice',
                reply_text: `Thank you for providing the details. And, how would you like to connect with the **${ci.expert}** - phone call or online chat? Under the circumstances, I recommend a phone call.`,
                category: state.category,
                expert_role: ci.expert,
                phone_number: ci.phone,
                cta_headline: `Get help with ${state.topic || ci.label}`,
                summary_bullets: state.facts,
                show_channel_cards: true,
                intake_state: state
            };
        }
        state.facts.push(message.trim());
        const bullets = state.facts.map(f => `• You noted: ${f}`);
        return {
            stage: 'summary_confirm',
            reply_text: `Thank you for adding that. Here is the updated summary I'll share with the **${ci.expert}**:\n\n${bullets.join('\n')}\n\nIs there anything else the ${ci.expert} should know before I connect you?`,
            category: state.category,
            expert_role: ci.expert,
            phone_number: ci.phone,
            cta_headline: `Get help with ${state.topic || ci.label}`,
            summary_bullets: state.facts,
            show_channel_cards: false,
            quick_replies: ["No, that's everything", 'I want to add a detail'],
            intake_state: state
        };
    }

    // Stage 2: Multi-Turn Intake
    const detected = detectCategoryBroad(message, state.category);
    if (detected !== 'general') state.category = detected;
    if (!state.topic) state.topic = extractPlainTopic(message, state.category);
    state.facts.push(message.trim());

    const ci = catInfo();
    const questions = DOMAIN_PLAYBOOK_QUESTIONS[state.category] || DOMAIN_PLAYBOOK_QUESTIONS.general;

    // Ask the domain-specific sequence of clarifying questions (3-5 turns) before summarizing!
    if (state.stepIndex < questions.length) {
        const q = questions[state.stepIndex](state);
        state.stepIndex += 1;
        state.stage = 'intake';
        return {
            stage: 'intake',
            reply_text: q,
            category: state.category,
            expert_role: ci.expert,
            phone_number: ci.phone,
            cta_headline: '',
            summary_bullets: [],
            show_channel_cards: false,
            intake_state: state
        };
    }

    // Transition to Pearl-style Summary & Confirmation
    state.stage = 'summary_confirm';
    const naturalBullets = state.facts.slice(0, 4).map(f => `• You shared: ${f}`);
    return {
        stage: 'summary_confirm',
        reply_text: `Thank you for sharing the details. The **${ci.expert}** will help with your ${state.topic || ci.label.toLowerCase()}. Here's what I'll tell them:\n\n${naturalBullets.join('\n')}\n\nIs there anything else the ${ci.expert} should know before I connect you?`,
        category: state.category,
        expert_role: ci.expert,
        phone_number: ci.phone,
        cta_headline: `Get help with ${state.topic || ci.label}`,
        summary_bullets: state.facts,
        show_channel_cards: false,
        quick_replies: ["No, that's everything", 'I want to add a detail'],
        intake_state: state
    };
}

// ===== HTTP Endpoint =====
module.exports = async function handler(req, res) {
    const requestOrigin = req.headers.origin;
    res.setHeader('Vary', 'Origin');
    if (requestOrigin) {
        if (!ALLOWED_ORIGINS.has(requestOrigin)) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Origin not allowed' }));
            return;
        }
        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
    }

    const clientIp = getTrustedClientIp(req);
    if (!checkRateLimit(clientIp)) {
        res.statusCode = 429;
        res.setHeader('Retry-After', '60');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Too many requests. Please wait a moment and try again.' }));
        return;
    }

    const chunks = [];
    let bytesReceived = 0;
    let payloadTooLarge = false;
    req.on('data', chunk => {
        if (payloadTooLarge) return;
        bytesReceived += chunk.length;
        if (bytesReceived > MAX_BODY_BYTES) {
            payloadTooLarge = true;
            res.statusCode = 413;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Request payload too large' }));
            return;
        }
        chunks.push(chunk);
    });
    req.on('end', async () => {
        if (payloadTooLarge || res.writableEnded) return;
        try {
            const body = Buffer.concat(chunks).toString('utf8');
            const parsed = body ? JSON.parse(body) : {};
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid request payload' }));
                return;
            }
            if (typeof parsed.message !== 'string') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Message is required' }));
                return;
            }
            const message = parsed.message.trim().slice(0, MAX_MESSAGE_CHARS);
            const rawHistory = Array.isArray(parsed.history) ? parsed.history.slice(-MAX_HISTORY_ITEMS) : [];
            const history = rawHistory
                .filter(h => h && typeof h === 'object')
                .map(h => ({
                    user: typeof h.user === 'string' ? h.user.slice(0, MAX_HISTORY_ITEM_CHARS) : '',
                    model: typeof h.model === 'string' ? h.model.slice(0, MAX_HISTORY_ITEM_CHARS) : '',
                    stage: sanitizeControlField(h.stage, 40),
                    category: sanitizeControlField(h.category, 40)
                }));
            const rawPrev = (parsed.intake_state && typeof parsed.intake_state === 'object' && !Array.isArray(parsed.intake_state))
                ? parsed.intake_state
                : null;
            const prevIntake = rawPrev ? {
                stage: sanitizeControlField(rawPrev.stage, 40),
                category: sanitizeControlField(rawPrev.category, 40) || 'general',
                expert_role: sanitizeControlField(rawPrev.expert_role, 80),
                cta_headline: sanitizeControlField(rawPrev.cta_headline, 120)
            } : null;

            if (!message) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Message is required' }));
                return;
            }

            let trailingHint = '';
            const safeExpertName = sanitizeControlField(parsed.expert_name, 80) || 'Sarah Thompson';
            const safeExpertRole = sanitizeControlField(parsed.expert_role, 80) || 'Verified Expert';
            if (parsed.specialist_handoff) {
                trailingHint = `SPECIALIST_CONNECTED (FIRST OPENING TURN): You are now ${safeExpertName}, a verified human ${safeExpertRole}. Introduce yourself warmly, prove you read the ENTIRE conversation history above (never re-ask details already given), and give clear, empathetic first expert guidance or the first diagnostic question. Output stage: "connected", show_channel_cards: false.`;
            } else if (parsed.connected_to_expert) {
                trailingHint = `SPECIALIST_CONNECTED (ONGOING CHAT): You are ${safeExpertName}, verified ${safeExpertRole}. Continue guiding the user warmly based on history. Output stage: "connected", show_channel_cards: false (unless user explicitly requests switching to a phone call, in which case set stage: "handoff_call", auto_open_call: true).`;
            } else if (prevIntake && prevIntake.stage) {
                trailingHint = `SESSION_STATE: Prior stage was "${prevIntake.stage}", prior category was "${prevIntake.category || 'general'}", locked expert_role was "${prevIntake.expert_role || ''}". Follow PEARL_PLAYBOOK_PROMPT strictly. Keep that EXACT expert_role string in both JSON and reply_text UNLESS the user switches to a different topic/issue (if they pivot, set topic_switched: true, switch category and expert_role to the new topic, and start fresh intake without carrying old topic details into the new summary).`;
            }

            let finalData;
            let engineUsed = 'offline-fallback';
            let llmErrorReason = null;
            let tokenUsage = null;

            const nonGreetingCount = history.filter(h => h && h.user && !isPureGreeting(h.user)).length;
            const isFirstTurnIntake = nonGreetingCount === 0 && !parsed.specialist_handoff && !parsed.connected_to_expert;
            const cacheKey = isFirstTurnIntake ? `t1:${message.toLowerCase().replace(/\s+/g, ' ')}` : null;

            // 1. Zero-Token Fast Path: Pure greetings & direct channel picks cost $0 API tokens
            if (isPureGreeting(message) && (!prevIntake || prevIntake.stage === 'greeting')) {
                const fb = runFallbackPearlFlow({ message, history, prevIntake });
                finalData = {
                    ...fb,
                    reply: sanitizeReplyText(fb.reply_text),
                    reply_text: sanitizeReplyText(fb.reply_text),
                    expertRole: fb.expert_role,
                    summary_items: [],
                    recommendation: 'none'
                };
                engineUsed = 'zero-token-greeting';
            } else if (prevIntake && prevIntake.stage === 'channel_choice' && (isPhoneChoice(message) || isChatChoice(message))) {
                const fb = runFallbackPearlFlow({ message, history, prevIntake });
                const preservedCta = prevIntake.cta_headline || fb.cta_headline;
                const preservedRole = prevIntake.expert_role || fb.expert_role;
                const isCall = isPhoneChoice(message);
                const handoffMsg = isCall
                    ? `OK, got it. I'm opening your direct phone connection details for the ${preservedRole} now, and I'm passing along your full summary so you won't have to repeat yourself.`
                    : `OK, got it. I'm sharing your full summary with our ${preservedRole} and connecting you right here in live chat now.`;
                finalData = {
                    ...fb,
                    stage: isCall ? 'handoff_call' : 'handoff_chat',
                    reply: sanitizeReplyText(handoffMsg),
                    reply_text: sanitizeReplyText(handoffMsg),
                    expert_role: preservedRole,
                    expertRole: preservedRole,
                    cta_headline: preservedCta,
                    auto_open_call: isCall,
                    auto_open_chat: !isCall,
                    show_channel_cards: false,
                    summary_items: fb.summary_bullets || [],
                    recommendation: isCall ? 'call' : 'chat',
                    intake_state: {
                        ...fb.intake_state,
                        stage: isCall ? 'handoff_call' : 'handoff_chat',
                        expert_role: preservedRole,
                        cta_headline: preservedCta
                    }
                };
                engineUsed = 'zero-token-handoff';
            } else if (cacheKey && getCachedReply(cacheKey)) {
                // 2. Zero-Token Cache Hit for identical Turn-1 questions (deep-cloned to avoid cross-session mutation)
                finalData = JSON.parse(JSON.stringify(getCachedReply(cacheKey)));
                engineUsed = `${finalData.engine || 'llm'}:cached`;
            } else {
                // 3. Live LLM Call (100% static prefix prompt -> DeepSeek/OpenAI context cache hit)
                try {
                    const llmResult = await callLiveLLM(PEARL_PLAYBOOK_PROMPT, trailingHint, history, message);
                    engineUsed = llmResult.provider;
                    tokenUsage = llmResult.tokenUsage || null;
                    if (tokenUsage) {
                        console.log(`[AnswerDesk Chat] ${engineUsed} | prompt=${tokenUsage.prompt_tokens} (cacheHit=${tokenUsage.prompt_cache_hit_tokens}) completion=${tokenUsage.completion_tokens}`);
                    }
                    const d = llmResult.data;
                    const catKey = CATEGORY_DIRECTORY[d.category] ? d.category : detectCategoryBroad(message, prevIntake?.category);
                    const catInfo = CATEGORY_DIRECTORY[catKey] || CATEGORY_DIRECTORY.general;
                    let stage = d.stage || (parsed.connected_to_expert || parsed.specialist_handoff ? 'connected' : 'intake');

                    // Normalize stage values safely
                    if (!['greeting', 'intake', 'summary_confirm', 'channel_choice', 'handoff_call', 'handoff_chat', 'connected'].includes(stage)) {
                        stage = 'intake';
                    }

                    // Server-side guardrail: NEVER allow channel cards or auto-handoff during intake or summary_confirm
                    const isPreChoiceStage = stage === 'greeting' || stage === 'intake' || stage === 'summary_confirm';
                    const showChannelCards = isPreChoiceStage ? false : (stage === 'channel_choice' ? true : Boolean(d.show_channel_cards));
                    const autoOpenCall = isPreChoiceStage ? false : (stage === 'handoff_call' || Boolean(d.auto_open_call));
                    const autoOpenChat = isPreChoiceStage ? false : (stage === 'handoff_chat' || Boolean(d.auto_open_chat));
                    const cleanReply = sanitizeReplyText(d.reply_text);
                    const categoryChanged = Boolean(prevIntake?.category && prevIntake.category !== 'general' && catKey !== prevIntake.category);
                    const topicSwitched = Boolean(d.topic_switched) || categoryChanged;
                    const hasSpecificPrevRole = Boolean(
                        prevIntake?.expert_role &&
                        prevIntake.expert_role !== 'Support Expert' &&
                        prevIntake.expert_role !== 'Verified Expert' &&
                        prevIntake.expert_role !== 'Support Specialist' &&
                        prevIntake.expert_role !== 'Verified Specialist'
                    );
                    const resolvedRole = (topicSwitched || !hasSpecificPrevRole || prevIntake?.stage === 'greeting' || prevIntake?.category === 'general')
                        ? (d.expert_role || catInfo.expert)
                        : prevIntake.expert_role;
                    const resolvedCta = (stage === 'greeting' || stage === 'intake')
                        ? ''
                        : sanitizeReplyText(d.cta_headline || (!topicSwitched ? prevIntake?.cta_headline : '') || '');

                    finalData = {
                        stage,
                        reply_text: cleanReply,
                        reply: cleanReply,
                        category: catKey,
                        expert_role: resolvedRole,
                        expertRole: resolvedRole,
                        phone_number: catInfo.phone,
                        cta_headline: isPreChoiceStage ? '' : resolvedCta,
                        summary_items: Array.isArray(d.summary_bullets) ? d.summary_bullets : [],
                        show_channel_cards: showChannelCards,
                        auto_open_call: autoOpenCall,
                        auto_open_chat: autoOpenChat,
                        quick_replies: stage === 'summary_confirm' ? ["No, that's everything", 'I want to add a detail'] : [],
                        recommendation: (showChannelCards || autoOpenCall) ? 'call' : (autoOpenChat ? 'chat' : 'none'),
                        intake_state: {
                            stage,
                            category: catKey,
                            expert_role: resolvedRole,
                            cta_headline: resolvedCta
                        }
                    };

                    if (cacheKey && stage === 'intake') {
                        setCachedReply(cacheKey, { ...finalData, engine: engineUsed });
                    }
                } catch (llmErr) {
                    llmErrorReason = llmErr.message;
                    console.warn(`[AnswerDesk Chat] Live LLM unavailable (${llmErr.message}). Using Pearl-style domain fallback.`);
                    const fb = runFallbackPearlFlow({
                        message,
                        history,
                        prevIntake,
                        specialistHandoff: Boolean(parsed.specialist_handoff),
                        connectedToExpert: Boolean(parsed.connected_to_expert),
                        expertName: safeExpertName,
                        expertRole: safeExpertRole
                    });
                    finalData = {
                        ...fb,
                        reply: sanitizeReplyText(fb.reply_text),
                        reply_text: sanitizeReplyText(fb.reply_text),
                        expertRole: fb.expert_role,
                        summary_items: fb.summary_bullets || [],
                        recommendation: fb.show_channel_cards || fb.auto_open_call ? 'call' : (fb.auto_open_chat ? 'chat' : 'none')
                    };
                }
            }

            finalData.engine = engineUsed;

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, data: finalData }));
        } catch (e) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON request' }));
        }
    });
};
