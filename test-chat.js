const puppeteer = require('puppeteer');
const fs = require('fs');

const SCENARIOS = [
    {
        name: "🐶 Dog is dull → breed → then switch to cat",
        messages: ["my dog is dull today", "bulldog", "he is not barking at all my cat is also sleepy today", "yes"]
    },
    {
        name: "📱 iPhone won't turn on",
        messages: ["my iphone 14 pro max won't turn on", "I dropped it yesterday and now it's completely dead", "no"]
    },
    {
        name: "💼 Wrongful termination",
        messages: ["I got fired from my job unfairly", "It was wrongful termination, my boss discriminated against me", "no"]
    },
    {
        name: "🐱 Cat vomiting",
        messages: ["my persian cat has been throwing up since yesterday", "she is not eating and seems very weak", "no"]
    },
    {
        name: "🔧 Plumbing leak",
        messages: ["there is a leak in my bathroom pipe", "it started this morning and water is dripping fast", "no"]
    },
    {
        name: "👋 Repeated hi + then real issue",
        messages: ["hi", "hi", "hi", "my windows laptop keeps crashing with blue screen"]
    },
    {
        name: "💊 Medical chest pain",
        messages: ["I have been having chest pain since this morning", "it gets worse when I breathe deeply", "no"]
    },
    {
        name: "🚗 Car won't start",
        messages: ["my 2019 toyota camry won't start", "the engine just clicks but doesn't turn over, battery might be dead", "no"]
    }
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTest() {
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 40,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
    });
    const results = [];

    for (const scenario of SCENARIOS) {
        console.log(`\n▶ Testing: ${scenario.name}`);
        const page = await browser.newPage();
        await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2', timeout: 15000 });

        // Wait for initial welcome message
        await sleep(3000);

        const transcript = [];

        // Capture initial bot messages
        let botMsgs = await page.$$eval('.bot-bubble', els => els.map(e => e.textContent.trim()));
        for (const msg of botMsgs) {
            transcript.push({ role: 'BOT', text: msg });
        }

        for (const userMsg of scenario.messages) {
            // Type and send
            await page.click('#chatInput');
            await page.type('#chatInput', userMsg, { delay: 20 });
            await page.click('#startChatBtn');

            // Wait for bot responses (wait for typing indicator to appear and disappear)
            await sleep(1500);
            // Wait until no typing indicator is present (bot finished responding)
            let waitAttempts = 0;
            while (waitAttempts < 20) {
                const hasTyping = await page.$('#typingIndicator');
                if (!hasTyping) break;
                await sleep(500);
                waitAttempts++;
            }
            // Extra wait for multi-message sequences
            await sleep(2000);
            waitAttempts = 0;
            while (waitAttempts < 10) {
                const hasTyping = await page.$('#typingIndicator');
                if (!hasTyping) break;
                await sleep(500);
                waitAttempts++;
            }
            await sleep(500);

            // Capture all messages so far
            const allMessages = await page.$$eval('.chat-message', els => els.map(el => {
                const isUser = el.classList.contains('user-message');
                const bubble = el.querySelector('.message-bubble');
                return { role: isUser ? 'USER' : 'BOT', text: bubble ? bubble.textContent.trim() : '' };
            }));

            // Only add new messages
            const newMessages = allMessages.slice(transcript.length);
            transcript.push(...newMessages);
        }

        results.push({ scenario: scenario.name, transcript });
        console.log(`  ✅ Captured ${transcript.length} messages`);
        console.log("⏳ Pausing 3 seconds for user visual review...");
        await sleep(3000);
        await page.close();
    }

    await browser.close();

    // Format results
    let report = '# AnswerDesk Chat Test Results\n\n';
    report += `**Date:** ${new Date().toLocaleString()}\n\n---\n\n`;

    for (const result of results) {
        report += `## ${result.scenario}\n\n`;
        for (const msg of result.transcript) {
            if (msg.role === 'USER') {
                report += `**👤 User:** ${msg.text}\n\n`;
            } else {
                report += `**🤖 Bot:** ${msg.text}\n\n`;
            }
        }
        report += '---\n\n';
    }

    fs.writeFileSync('test-results.md', report, 'utf8');
    console.log('\n✅ Results saved to test-results.md');
}

runTest().catch(err => { console.error('Test failed:', err); process.exit(1); });
