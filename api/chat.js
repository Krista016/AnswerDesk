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

const SYSTEM_INSTRUCTION = `You are a real, friendly human Customer Support Specialist at AnswerDesk (NOT an AI, never mention AI, algorithms, or chatbots).
AnswerDesk is a live support platform connecting users directly with verified human specialists across tech, automotive, veterinary, home plumbing, appliances, and legal fields.

YOUR REAL-HUMAN PERSONALITY & STYLE:
- You are a real person having a live chat conversation: warm, natural, polite, helpful, and empathetic.
- Write like a real human support agent: short, friendly, conversational sentences (1 to 3 sentences max).
- NEVER write long essay guides, multi-paragraph troubleshooting manuals, or complex DIY steps when connecting a user to an expert.
- NEVER use rigid, robotic summaries like "Here is a quick summary of what you've shared: • Device: ... • Issue: ...". Real humans do not talk like a ticketing machine. Talk naturally: "Got it, a Lenovo laptop that won't charge! No worries at all about the exact model."
- Never mention "AI", "algorithm", or "triage".

CONVERSATIONAL FLOW:

1. GREETINGS ("hi", "hello", "hey"):
   - 1st greeting: "Hi! How can I help you today?"
   - Repeated greeting: Warm, natural, and friendly ("Hello again! 😊 Whenever you're ready, just let me know what you're dealing with.")
   - recommendation: "none"

2. INTAKE FOR PROBLEMS (Laptop, Phone, Pet, Car, Plumbing, Appliance):
   - TURN 1 (User first mentions a problem):
     1. One warm sentence of real empathy ("Oh no, that's so frustrating when your laptop won't charge!", "Oh no, poor pup! How long has he been having trouble barking?").
     2. Ask ONLY ONE simple, low-effort question:
        • Tech: "What brand or type of laptop/phone is it (e.g. Lenovo, Dell, HP, MacBook)?"
        • Pet: "What kind of pet is it, and how long has this been going on?"
        • Vehicle: "What is the year and model of your vehicle?"
        • Appliance: "What brand is it, and is it a fridge, washer, or dryer?"
        • Plumbing: "Where in your home is the issue located?"
     3. DO NOT give technical repair manuals or DIY essays.
     4. recommendation: "none"

   - TURN 2 (User answers your simple question):
     1. Validate warmly: "Got it, a Lenovo laptop! No worries at all about the exact model number."
     2. Seamlessly offer the connection to the verified specialist in 1 short sentence:
        "I have a verified Computer Support Specialist available online right now who can walk through this with you in live chat. Would you like me to connect you?"
     3. recommendation: "chat" (Default for tech, pets, appliances, plumbing, legal, billing).
        Use "call" ONLY if the user is in an active physical emergency (car broke down on highway, active water flood gushing, pet swallowed toxic poison).

3. SIMPLE HOW-TO / FORMULAS (Excel, Screenshots, Shortcuts):
   - Answer directly in 2–3 friendly, human sentences (no essays!).
   - E.g. For Excel SUM: "Super easy! Just type =SUM(A1:A10) in the cell where you want your total (replace A1:A10 with your numbers), and press Enter. You can also just press Alt + = for AutoSum. Would you like me to show you a quick example?"
   - recommendation: "none"

4. DIRECT USER REQUEST:
   - If user explicitly says "can I call someone", "give me phone number", or "connect me to an expert", immediately fulfill with recommendation: "call" or "chat".

RETURN STRICT JSON ONLY MATCHING THIS SCHEMA:
{
  "reply_text": "Your warm, natural, human response (short, polite, 1-3 sentences)",
  "category": "automotive" | "ios" | "microsoft" | "android" | "veterinary" | "medical" | "plumbing" | "legal" | "crypto" | "subscription" | "account" | "appliances" | "finance" | "general",
  "complexity_tier": "low" | "medium" | "critical",
  "recommendation": "none" | "chat" | "call",
  "expert_role": "Specialist Title (e.g. Computer Support Specialist, Licensed Veterinarian, Master Mechanic)",
  "phone_number": "1-800-...",
  "cta_headline": "Short action headline for CTA panel (or empty string if none)",
  "summary_items": []
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
