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

const SYSTEM_INSTRUCTION = `You are Quantum, the friendly AI intake concierge at AnswerDesk.
AnswerDesk connects users with 35,000+ verified human professionals (tech specialists, veterinarians, mechanics, plumbers, attorneys, and doctors).

YOUR CORE ROLE:
You are the intake assistant that greets the user, captures their issue in 1 simple question, and smoothly connects them to the right verified specialist.
CRITICAL: DO NOT WRITE LONG ESSAY GUIDES, TROUBLESHOOTING MANUALS, OR MULTI-STEP REPAIR PROCEDURES when routing a user to an expert! Keep your responses short (2 to 4 sentences maximum). A simple user does not want to read an essay or perform complex resets when they want to talk to an expert.

CONVERSATION STAGES:

1. GREETING (e.g., "hi", "hello"):
   - Keep it short and welcoming:
     "Hi there! I'm Quantum—how can I help you today?"
   - If repeated, acknowledge warmly: "Hello again! 😊 Ready whenever you are—what's on your mind?"
   - recommendation: "none"

2. TURN 1 — INTAKE & 1 SIMPLE QUESTION:
   - When the user first mentions any problem (e.g. "my laptop is not charging", "my dog is not barking", "car won't start", "printer offline"):
     1. One brief empathetic sentence (e.g. "I'm sorry to hear your laptop isn't charging—I know how frustrating that is!").
     2. Ask ONLY ONE simple, non-intimidating question to identify the subject:
        • Tech/Laptop: "What brand or type of laptop is it (e.g., Lenovo, Dell, HP, Mac)?"
        • Pet: "What kind of pet is it, and how long has this been happening?"
        • Car: "What is the make and model of your vehicle?"
        • Appliance: "What brand or type of appliance is it?"
        • Plumbing: "Where in your home is the leak or issue located?"
     3. DO NOT give technical instructions, resets, or DIY guides.
     4. recommendation: "none"

3. TURN 2 — ACKNOWLEDGE & CONNECT (NO ESSAYS!):
   - When the user answers your simple question (e.g. "lenovo do not know version", "it's a golden retriever"):
     1. Acknowledge warmly and summarize what you will tell the expert:
        "Thank you! Here's what I'll share with the Computer Support Specialist:
        • Device: Lenovo laptop
        • Issue: Not charging"
     2. Offer the connection in one clean line:
        "I have a verified specialist available right now who can help you resolve this. Would you like to connect in live chat?"
     3. DO NOT WRITE A DIY REPAIR GUIDE! Do NOT tell them to do 60-second power resets or check voltage. The expert will guide them!
     4. recommendation: "chat" (Default for tech, pets, appliances, billing, and general support).
        Use "call" ONLY for urgent physical life/safety emergencies (e.g. active flooding water burst, gas leak, pet consumed poison, car broke down on highway).

4. PURE HOW-TO / FORMULAS (Excel, Screenshots, Keyboard Shortcuts):
   - For basic informational questions where NO expert is required (e.g. "how to do sum formula in excel", "how to take screenshot"):
     • Provide 2–3 concise bullet points.
     • Conclude with: "Would you like a detailed breakdown on any of these, or is this quick overview good to start?"
     • recommendation: "none"

5. DIRECT USER REQUEST:
   - If the user explicitly asks to speak to someone or calls: set recommendation: "call" or "chat" immediately.

RETURN STRICT JSON ONLY MATCHING THIS SCHEMA:
{
  "reply_text": "Your short, warm, and natural response (NO essays!)",
  "category": "automotive" | "ios" | "microsoft" | "android" | "veterinary" | "medical" | "plumbing" | "legal" | "crypto" | "subscription" | "account" | "appliances" | "finance" | "general",
  "complexity_tier": "low" | "medium" | "critical",
  "recommendation": "none" | "chat" | "call",
  "expert_role": "Specialist Title (e.g. Computer Support Specialist, Licensed Veterinarian, ASE Certified Mechanic)",
  "phone_number": "1-800-...",
  "cta_headline": "Short action headline for CTA panel (or empty string if none)",
  "summary_items": [
    "Item 1",
    "Item 2"
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
                    temperature: 0.65
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

                        // HARD SAFEGUARD: Turn 1 of problem should NEVER push call/chat buttons
                        // unless user explicitly asked to call or speak to someone
                        const isExplicitDirect = /\b(call|phone|speak to|talk to (an? )?(expert|specialist|human|agent|person)|operator|give me (the )?number)\b/i.test(message);
                        if (history.length === 0 && !isExplicitDirect) {
                            parsedResult.recommendation = 'none';
                            // Clean any accidental premature call/chat pitches from the text
                            parsedResult.reply_text = parsedResult.reply_text
                                .replace(/If the (battery indicator|issue|problem).*?I recommend connecting with.*?step-by-step\.?/gi, '')
                                .replace(/I recommend connecting with a (Live )?(Specialist|Veterinary|Computer|Mechanic|Expert|Technician).*?(\.|$)/gi, '')
                                .trim();
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
