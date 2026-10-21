const puppeteer = require('puppeteer');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForBot(page) {
    // Wait for typing indicator to appear and then disappear
    await sleep(1500);
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
}

async function runMedicalTest() {
    console.log("▶ Starting custom verification for Medical Fall & Category Locking...");
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 50,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
    });
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2', timeout: 15000 });

    // Wait for initial welcome message
    await sleep(3000);

    // Capture initial bot welcome
    let botWelcome = await page.$$eval('.bot-bubble', els => els.map(e => e.textContent.trim()));
    console.log("🤖 Welcome:", botWelcome.join(" | "));

    // 1. Send first message: "I fell in the washroom and my elbow hurts bad"
    console.log("👤 User: I fell in the washroom and my elbow hurts bad");
    await page.click('#chatInput');
    await page.type('#chatInput', "I fell in the washroom and my elbow hurts bad", { delay: 20 });
    await page.click('#startChatBtn');

    await waitForBot(page);

    // Capture response
    let msgs = await page.$$eval('.chat-message', els => els.map(el => {
        const isUser = el.classList.contains('user-message');
        const bubble = el.querySelector('.message-bubble');
        return { role: isUser ? 'USER' : 'BOT', text: bubble ? bubble.textContent.trim() : '' };
    }));
    console.log("🤖 Bot responses so far:");
    msgs.forEach(m => console.log(`   [${m.role}] ${m.text}`));

    // 2. Send second message: "feeling pain when stretching arm"
    console.log("👤 User: feeling pain when stretching arm");
    await page.click('#chatInput');
    await page.type('#chatInput', "feeling pain when stretching arm", { delay: 20 });
    await page.click('#startChatBtn');

    await waitForBot(page);

    // Capture responses
    msgs = await page.$$eval('.chat-message', els => els.map(el => {
        const isUser = el.classList.contains('user-message');
        const bubble = el.querySelector('.message-bubble');
        return { role: isUser ? 'USER' : 'BOT', text: bubble ? bubble.textContent.trim() : '' };
    }));
    console.log("🤖 Bot responses so far:");
    msgs.forEach(m => console.log(`   [${m.role}] ${m.text}`));

    // 3. Send third message: "i also have sugar issue and have vitamin d deficiency"
    console.log("👤 User: i also have sugar issue and have vitamin d deficiency");
    await page.click('#chatInput');
    await page.type('#chatInput', "i also have sugar issue and have vitamin d deficiency", { delay: 20 });
    await page.click('#startChatBtn');

    await waitForBot(page);

    // Capture final responses
    msgs = await page.$$eval('.chat-message', els => els.map(el => {
        const isUser = el.classList.contains('user-message');
        const bubble = el.querySelector('.message-bubble');
        return { role: isUser ? 'USER' : 'BOT', text: bubble ? bubble.textContent.trim() : '' };
    }));
    console.log("\n🤖 Final Chat Transcript:");
    msgs.forEach(m => console.log(`   [${m.role}] ${m.text}`));

    // Verify category remains medical and does not switch to legal
    const hasAttorney = msgs.some(m => m.role === 'BOT' && m.text.includes('Licensed Attorney'));
    const hasPhysician = msgs.some(m => m.role === 'BOT' && (m.text.includes('Board Certified Physician') || m.text.includes('Physician')));

    console.log("\n--- VERIFICATION RESULTS ---");
    console.log("Has 'Licensed Attorney' (Erroneous Switch):", hasAttorney ? "❌ FAIL" : "✅ PASS");
    console.log("Has 'Board Certified Physician' (Preserved Category):", hasPhysician ? "✅ PASS" : "❌ FAIL");

    console.log("⏳ Pausing 4 seconds for user visual review...");
    await sleep(4000);
    await browser.close();
    
    if (hasAttorney || !hasPhysician) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runMedicalTest().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
