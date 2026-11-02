const https = require('https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

const CATEGORY_DIRECTORY = {
    crypto: { label: 'Digital Payments & Fintech', expert: 'Crypto Finance Specialist', phone: '1-800-555-0188' },
    microsoft: { label: 'Microsoft & Windows', expert: 'Windows & Microsoft Systems Engineer', phone: '1-800-936-5700' },
    ios: { label: 'iPhone & Apple Devices', expert: 'Apple & iOS Specialist', phone: '1-800-275-2273' },
    xbox: { label: 'Xbox & Gaming Systems', expert: 'Gaming Support Specialist', phone: '1-800-469-9269' },
    android: { label: 'Android & Mobile', expert: 'Android Tech Expert', phone: '1-800-726-7864' },
    plumbing: { label: 'Plumbing & Home Systems', expert: 'Licensed Plumber', phone: '1-800-555-0199' },
    legal: { label: 'Legal & Consumer Rights', expert: 'Licensed Attorney', phone: '1-800-555-0177' },
    veterinary: { label: 'Veterinary & Pet Care', expert: 'Licensed Veterinarian', phone: '1-800-555-0145' },
    medical: { label: 'Health & Medical Guidance', expert: 'Board Certified Physician', phone: '1-800-555-0134' },
    automotive: { label: 'Automotive & Mechanical', expert: 'ASE Certified Mechanic', phone: '1-800-555-0156' },
    subscription: { label: 'Billing & Subscriptions', expert: 'Billing Specialist', phone: '1-800-555-0122' },
    account: { label: 'Account & Security', expert: 'Account Security Specialist', phone: '1-800-555-0111' },
    appliances: { label: 'Appliances & Electronics', expert: 'Appliance Specialist', phone: '1-800-555-0210' },
    finance: { label: 'Taxes & Financial Planning', expert: 'Certified Public Accountant', phone: '1-800-555-0220' }
};

const SYSTEM_INSTRUCTION = `You are the AnswerDesk AI Triage Specialist ("Quantum Chatbot").
AnswerDesk connects users with 35,000+ verified professionals across tech, automotive, veterinary, medical, plumbing, and legal fields.

YOUR CORE OBJECTIVES:
1. Be exceptionally polite, empathetic, concise, and solution-focused.
2. Accurately triage the user's issue into one of 3 distinct complexity tiers:

TIER 1 - "low" (Basic DIY / How-To / Quick Instructions / Excel Formulas / Screenshots):
- Criteria: Simple informational queries where an expert call is unnecessary.
- Examples: "How to do a SUM formula in Excel", "How to take a screenshot on Android or iPhone", "How to clear cookies in Chrome", basic definitions, keyboard shortcuts.
- Response Guideline: Provide the direct, step-by-step solution immediately in 2–3 concise bullet points.
- Recommendation: "none". DO NOT push or recommend an expert call or chat. Keep it friendly, clear, and helpful.

TIER 2 - "medium" (Moderate Troubleshooting / Settings / Configurations):
- Criteria: Multi-step software or device issues where self-troubleshooting might work, but live guidance is helpful.
- Examples: Printer printing blank pages, Outlook repeating password prompt, Wi-Fi dropping, Bluetooth sync failure, app crashes.
- Response Guideline: Provide 1-2 quick preliminary checks. Then suggest connecting with a Live Specialist via Chat to review the settings step-by-step.
- Recommendation: "chat".

TIER 3 - "critical" (Hardware Failure / Physical Diagnostic / Urgent / Emergency):
- Criteria: Situations where text chat is inadequate, dangerous, or too slow.
- Examples: iPhone won't turn on (black screen / completely dead), car won't start / clicking sound / engine stall, dog/cat high fever / lethargic / vomiting, water pipe burst / active flooding, severe symptoms.
- Response Guideline: Express genuine empathy. Clearly explain that because physical hardware / urgent diagnostics are involved, text typing is too slow. STRONGLY PRIORITIZE AND RECOMMEND CONNECTING OVER A DIRECT PHONE CALL NOW.
- Recommendation: "call".

TIER FAQ - AnswerDesk Inquiries:
- If asked about AnswerDesk pricing, costs, or refund policies: Clearly explain our transparent Pay-Only-After-Solution standard (Free chat intake, 7-day trial starts at $1–$5, full consult billed only after resolution, 100% money-back guarantee).
- If an active problem was already being discussed, gently ask if they'd like to connect with that specialist now.

TOPIC SHIFTS & PAST CONTEXT:
- If the user changes topics (e.g. from dog to car), acknowledge the resolution warmly ("Glad to hear your dog is doing better! Let's get your car taken care of.") and focus 100% on the new issue. Never carry over old entities.

RETURN STRICT JSON ONLY MATCHING THIS SCHEMA:
{
  "reply_text": "Your warm, natural, and helpful response",
  "category": "automotive" | "ios" | "microsoft" | "android" | "veterinary" | "medical" | "plumbing" | "legal" | "crypto" | "subscription" | "account" | "appliances" | "finance" | "general",
  "complexity_tier": "low" | "medium" | "critical",
  "recommendation": "none" | "chat" | "call",
  "expert_role": "Specialist Title (e.g. ASE Certified Mechanic, Apple Specialist)",
  "phone_number": "1-800-...",
  "cta_headline": "Short action headline for CTA panel (or empty string if none)",
  "summary_items": [
    "Item 1 (e.g. • Vehicle: car)",
    "Item 2 (e.g. • Issue: won't start with clicking sound)"
  ]
}`;

module.exports = async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
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

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const parsed = body ? JSON.parse(body) : {};
            const message = (parsed.message || '').trim();
            const history = Array.isArray(parsed.history) ? parsed.history : [];

            if (!message) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Message is required' }));
                return;
            }

            if (!GEMINI_API_KEY) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not set in environment variables' }));
                return;
            }

            // Construct contents array with conversation history
            const contents = [];
            for (const item of history.slice(-6)) {
                if (item.user) {
                    contents.push({ role: 'user', parts: [{ text: item.user }] });
                }
                if (item.model) {
                    contents.push({ role: 'model', parts: [{ text: item.model }] });
                }
            }
            contents.push({ role: 'user', parts: [{ text: message }] });

            const payload = JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                contents,
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.2
                }
            });

            const geminiReq = https.request({
                hostname: 'generativelanguage.googleapis.com',
                path: `/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                }
            }, (geminiRes) => {
                let geminiData = '';
                geminiRes.on('data', chunk => geminiData += chunk);
                geminiRes.on('end', () => {
                    try {
                        const parsedGemini = JSON.parse(geminiData);
                        if (parsedGemini.error) {
                            console.error('Gemini API Error:', parsedGemini.error);
                            res.statusCode = geminiRes.statusCode || 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: parsedGemini.error.message || 'Gemini error' }));
                            return;
                        }

                        const rawText = parsedGemini.candidates?.[0]?.content?.parts?.[0]?.text;
                        const parsedResult = rawText ? JSON.parse(rawText) : null;

                        if (!parsedResult) {
                            throw new Error('Invalid JSON from Gemini');
                        }

                        // Attach directory phone number if category matched
                        const catInfo = CATEGORY_DIRECTORY[parsedResult.category];
                        if (catInfo) {
                            parsedResult.phone_number = catInfo.phone;
                            if (!parsedResult.expert_role) parsedResult.expert_role = catInfo.expert;
                        }

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true, data: parsedResult }));
                    } catch (e) {
                        console.error('Parsing Error:', e, geminiData);
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ error: 'Failed to process AI response' }));
                    }
                });
            });

            geminiReq.on('error', (err) => {
                console.error('Request Error:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
            });

            geminiReq.write(payload);
            geminiReq.end();
        } catch (e) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid JSON request' }));
        }
    });
};
