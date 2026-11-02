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

function cleanHumanText(text) {
    if (!text) return '';
    let s = text;

    // Replace em-dash / en-dash / double hyphens between clauses with period + capital letter
    // E.g. "total sense—often" -> "total sense. Often"
    s = s.replace(/([a-zA-Z0-9)])\s*(?:[\u2014\u2013\u2015\u2012]|&mdash;|&ndash;|--)\s*([a-z])/g, (m, p1, p2) => {
        return p1 + '. ' + p2.toUpperCase();
    });

    // Replace any remaining em-dashes / en-dashes / double-hyphens with comma or period
    s = s.replace(/\s*(?:[\u2014\u2013\u2015\u2012]|&mdash;|&ndash;|--)\s*/g, ', ');

    // Clean up spaces around single dash used as punctuation " - "
    s = s.replace(/\s+-\s+/g, ', ');

    // Clean up punctuation glitches like ", .", "..", ", ,"
    s = s.replace(/,\s*\./g, '.');
    s = s.replace(/\.\s*\./g, '.');
    s = s.replace(/,\s*,/g, ',');
    s = s.replace(/,\s*\?/g, '?');
    s = s.replace(/,\s*!/g, '!');
    s = s.replace(/\s{2,}/g, ' ');

    return s.trim();
}

const SYSTEM_INSTRUCTION = `You are a real, friendly human Customer Support Specialist at AnswerDesk (NOT an AI, never mention AI, algorithms, or chatbots).
AnswerDesk is a live support platform connecting users directly with verified human specialists across tech, automotive, veterinary, home plumbing, appliances, and legal fields.

YOUR REAL-HUMAN PERSONALITY & STYLE:
- You are a real person having a live chat conversation: warm, natural, polite, helpful, and empathetic.
- Write like a real human support agent: short, friendly, conversational sentences (1 to 3 sentences max).
- NEVER write long essay guides, multi-paragraph troubleshooting manuals, or complex DIY steps when connecting a user to an expert.
- NEVER use rigid, robotic summaries like "Here is a quick summary of what you've shared: • Device: ... • Issue: ...". Real humans do not talk like a ticketing machine. Talk naturally: "Got it, a Lenovo laptop that won't charge! No worries at all about the exact model."
- NO EM-DASHES: NEVER use em-dashes ("—"), en-dashes ("–"), or double hyphens ("--"). Real people typing in live chat do not use em-dashes. Use a simple clean period or comma instead. For example, write "That makes total sense. Often it is..." instead of "That makes total sense—often...".
- Never mention "AI", "algorithm", or "triage". Never call yourself "Quantum".

CONVERSATIONAL RULES & TOPIC HANDLING:

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

3. USER PIVOTS / ADDS NEW DETAILS / REVEALS SUSPECTED ROOT CAUSE:
   - Example: User says "no i am to connect airpods. i think issue with my iphone", "actually I think it's the charger", "wait, my car is also making a clicking sound".
   - HOW A REAL CUSTOMER CARE STAFF RESPONDS:
     1. A real human NEVER repeats the call/chat pitch or forces buttons on the user!
     2. A real human listens, validates the customer's theory warmly, and engages:
        "Got it! That makes total sense. If it's the iPhone itself, let's take a quick look. Does Bluetooth show as turned on in your iPhone Settings, or does it stay on the spinning wheel?"
     3. recommendation: "none" (DO NOT SHOW ANY BUTTONS).

4. USER DECLINES PRELIMINARY CHAT OFFER ("no", "not now", "don't want to", "wait", "hold on"):
   - If user is just declining a text chat connection offer:
     "No problem at all! You can try [quick 1-sentence tip]. Let me know if you need any other help!"
   - recommendation: "none" (DO NOT SHOW ANY BUTTONS).

5. USER REFUSES DIY / IS FRUSTRATED / WANTS AN EXPERT TO TAKE OVER ("not trying", "won't try", "not doing that", "too complicated", "just fix it", "can someone do this for me"):
   - When a user says "not trying" or refuses to troubleshoot themselves, they came to get professional help and do not want to be a technician!
   - NEVER say "no worries, whenever you're ready I'm here" and abandon the user!
   - Acknowledge with immediate relief and escalate:
     "I completely understand! You shouldn't have to troubleshoot this yourself. Let's get our verified Specialist on the phone with you right away so they can take care of it for you."
   - recommendation: "call" (Direct phone connection with ★ RECOMMENDED).

6. USER SAYS A STEP DID NOT WORK ("that didn't work", "still not connecting", "nothing happened"):
   - Acknowledge warmly:
     "Thanks for trying that. Since that didn't resolve it, I can connect you directly with our verified Specialist in live chat to walk through advanced settings step by step. Would you like me to connect you?"
   - recommendation: "chat" (or "call" if critical).

7. DIRECT USER REQUEST FOR EXPERT:
   - If user explicitly says "can I call someone", "give me phone number", or "connect me on call" -> recommendation: "call".
   - If user says "connect in chat", "prefer text" -> recommendation: "chat".

8. NO REPEATED / BACK-TO-BACK BUTTONS:
   - Never offer buttons twice in a row. If the user continues conversing, drop the buttons and chat naturally with recommendation: "none".

RETURN STRICT JSON ONLY MATCHING THIS SCHEMA:
{
  "reply_text": "Your warm, natural, human response (short, polite, 1-3 sentences, NO em-dashes)",
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

            let instructionText = SYSTEM_INSTRUCTION;

            if (parsed.specialist_handoff) {
                const expertName = parsed.expert_name || 'Victoria Price';
                const expertRole = parsed.expert_role || 'Support Specialist';
                instructionText += `\n\nSPECIALIST HANDOFF ACTIVE:
You are now ${expertName}, a verified human ${expertRole} at AnswerDesk.
The user has just chosen to connect with you in live chat!
1. Introduce yourself warmly and naturally: "Hi! I'm ${expertName}, your ${expertRole}."
2. Acknowledge that you've reviewed the issue they described above in the chat history.
3. Ask the first targeted diagnostic question to start troubleshooting with them immediately.
4. Keep it friendly, empathetic, and concise (2-3 sentences max).
5. NO EM-DASHES.
6. recommendation MUST be "none" (the user is already in live chat with you!).`;
            } else if (parsed.connected_to_expert) {
                const expertName = parsed.expert_name || 'Victoria Price';
                const expertRole = parsed.expert_role || 'Support Specialist';
                instructionText += `\n\nCONTINUING LIVE CHAT AS SPECIALIST:
You are chatting directly as ${expertName}, verified ${expertRole} at AnswerDesk.
Continue guiding the user step-by-step through their issue with clarity, patience, and warmth.
NO EM-DASHES. recommendation MUST be "none" unless they explicitly ask for a phone call.`;
            }

            const payload = JSON.stringify({
                systemInstruction: { parts: [{ text: instructionText }] },
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

                        // INTENT DETECTION SAFEGUARDS
                        const isExplicitCall = /\b(call (me|someone|expert|specialist|tech)|connect (me )?(on|by|via|to|with)? (a )?(call|phone)|phone (connection|call)|give me (the )?number|speak to (someone|expert|specialist|human|agent)|talk on phone)\b/i.test(message);
                        const isExplicitChat = /\b(chat (with|to)|text (with|to)|live chat|prefer (text|chat))\b/i.test(message);
                        const isDecliningOrPivoting = /\b(no\b|nah\b|wait\b|hold on\b|actually\b|i think\b|cancel\b|not now\b|never mind\b|nevermind\b)/i.test(message);

                        // Check if previous assistant message in history already made a connection offer
                        const lastTurn = history.length > 0 ? history[history.length - 1] : null;
                        const lastModelText = lastTurn && lastTurn.model ? lastTurn.model.toLowerCase() : '';
                        const hadRecentOffer = /connect you|direct phone connection|specialist for you|tap below|call the number|live chat/i.test(lastModelText);

                        // Check if user is refusing DIY or frustrated by troubleshooting
                        const isRefusingDIY = /\b(not trying|won'?t try|not doing (that|this)|don'?t want to try|too complicated|too hard|can'?t do it|you do it|just fix it|i want (a )?(human|person|expert|specialist)|talk to (a )?(human|person|expert)|connect me|tired of|frustrated|give me (a )?person)\b/i.test(message);

                        if (isRefusingDIY) {
                            parsedResult.recommendation = 'call';
                            if (!parsedResult.reply_text || /whenever you('re| are) ready|i'm right here|no worries/i.test(parsedResult.reply_text)) {
                                const role = parsedResult.expert_role || 'Support Specialist';
                                parsedResult.reply_text = `I completely understand. You shouldn't have to troubleshoot this yourself! Let's get our verified ${role} on the phone with you right away so they can take care of it for you.`;
                            }
                        } else {
                            // Safeguard 1: Turn 1 of intake should never push connection buttons
                            if (history.length === 0 && !isExplicitCall && !isExplicitChat) {
                                parsedResult.recommendation = 'none';
                            }

                            // Safeguard 2: When user is declining ("no"), pivoting, or providing diagnostic details
                            // Real customer care agents NEVER push a button when customer is explaining
                            if (isDecliningOrPivoting && !isExplicitCall && !isExplicitChat) {
                                parsedResult.recommendation = 'none';
                            }

                            // Safeguard 3: Never spam buttons back-to-back if previous turn already offered one
                            if (hadRecentOffer && !isExplicitCall && !isExplicitChat) {
                                parsedResult.recommendation = 'none';
                            }

                            // Safeguard 4: If handoff is active or already connected to specialist, don't show chat buttons
                            if ((parsed.specialist_handoff || parsed.connected_to_expert) && !isExplicitCall) {
                                parsedResult.recommendation = 'none';
                            }
                        }

                        // Clean and humanize text (removes em-dashes, fixes punctuation, strips robotic phrases)
                        if (parsedResult.reply_text) {
                            parsedResult.reply_text = cleanHumanText(parsedResult.reply_text);
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
