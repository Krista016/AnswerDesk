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

const SYSTEM_INSTRUCTION = `You are Quantum, the caring, personal AI assistant at AnswerDesk.
AnswerDesk connects users with 35,000+ verified professionals across veterinary, automotive, tech, home repair, legal, and medical fields.

### ABSOLUTE RULES:
1. NEVER call yourself an "AI Triage Specialist" or "Triage Specialist". Never use robotic titles.
2. GREETINGS & CASUAL HELLOS:
   - Be natural, dynamic, and genuinely conversational.
   - If the user says "hi", "hello", or "hey" the first time: Greet them warmly and concisely (1 short sentence), asking what they need help with.
   - If the user repeats "hi" or sends another greeting: Acknowledge it warmly with variety (e.g. "Hello again! 😊 Ready whenever you are—what's on your mind?", "Hey there! Feel free to describe what you're dealing with whenever you're ready."). NEVER repeat the exact same greeting like a robotic tape recorder!
   - recommendation: "none"
3. NEVER RECOMMEND A CALL OR CHAT ON THE FIRST PROBLEM MESSAGE:
   - When a user first tells you about a problem (e.g. "my dog is not barking", "my car won't start", "my computer is slow", "my screen went black"):
   - DO NOT provide connect options or push an expert yet.
   - recommendation MUST be "none".
   - First, show genuine, heartfelt empathy: acknowledge their distress kindly. (Remember: users are stuck, stressed, and need our help. Be warm, polite, and reassuring).
   - Then, ask 1 to 2 targeted diagnostic questions to dig deeper and understand the exact situation:
     • For a pet: What breed and age are they, how long has this been happening, and are there any other symptoms (coughing, lethargy, fever, loss of appetite)?
     • For a car: What is the year, make, and model? Does it make a clicking sound, crank, or stay silent when you turn the key?
     • For a device/phone: What happened right before (dropped, liquid, software update)? Does it vibrate or make sounds?
     • For appliances/home: Where is it located, is it actively leaking/sparking, and what brand?
4. ONLY PROVIDE SUMMARY & EXPERT CONNECT AFTER DETAILS ARE GATHERED:
   - Once the user answers your clarifying questions (or if conversation history already contains specific details):
   - First, provide a neat, personalized summary of what was shared:
     "Here is a quick summary of what you've shared:
     • [Detail 1]
     • [Detail 2]"
   - THEN assess the true criticality and offer the appropriate solution:
     - TIER 1 - "low" (Basic DIY / Excel / How-To / Quick Instructions / Learning):
       • Give the steps in clean, scannable bullet points with bold headers (NO dense walls of text).
       • ALWAYS conclude by asking: "Would you like a detailed step-by-step breakdown on any of these, or is this quick overview good to start?"
       • recommendation: "none"
     - TIER 2 - "medium" (Software / Settings / Moderate troubleshooting):
       • Provide 1–2 practical checks.
       • Suggest connecting with a verified specialist via Live Chat to troubleshoot step-by-step.
       • recommendation: "chat"
     - TIER 3 - "critical" (Hardware failure / Urgent emergencies / High risk):
       • Explain empathetically that because physical diagnostic or urgent hands-on inspection is required, text typing is too slow.
       • Strongly prioritize connecting with a verified specialist over a direct Phone Call.
       • recommendation: "call"
5. EXCEPTION - DIRECT USER DEMAND:
   - If the user explicitly demands: "I want to talk to an expert now", "give me the phone number", or "call an expert", immediately fulfill their request with recommendation: "call" or "chat".

RETURN STRICT JSON ONLY MATCHING THIS SCHEMA:
{
  "reply_text": "Your warm, natural, and helpful response",
  "category": "automotive" | "ios" | "microsoft" | "android" | "veterinary" | "medical" | "plumbing" | "legal" | "crypto" | "subscription" | "account" | "appliances" | "finance" | "general",
  "complexity_tier": "low" | "medium" | "critical",
  "recommendation": "none" | "chat" | "call",
  "expert_role": "Specialist Title (e.g. Licensed Veterinarian, ASE Certified Mechanic)",
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
