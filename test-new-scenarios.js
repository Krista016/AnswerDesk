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

async function runNewScenariosTest() {
    console.log("▶ Starting Full E2E Headed Verification for Newly Added Categories and Expanded Scenarios...\n");
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 60,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
    });

    // ============================================
    // SCENARIO 1: Testing Refrigerator Cooling (Appliances Category)
    // ============================================
    console.log("--- SCENARIO 1: Appliances & Electronics (Refrigerator not cooling) ---");
    const page1 = await browser.newPage();
    await page1.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(3000);

    // Turn 1: Send initial issue
    console.log("👤 User (Turn 1): my refrigerator is warm and not cooling at all");
    await page1.click('#chatInput');
    await page1.type('#chatInput', "my refrigerator is warm and not cooling at all", { delay: 20 });
    await page1.click('#startChatBtn');
    await waitForBot(page1);

    // Turn 2: Answer clarifying question
    console.log("👤 User (Turn 2): it is completely warm");
    await page1.click('#chatInput');
    await page1.type('#chatInput', "it is completely warm", { delay: 20 });
    await page1.click('#startChatBtn');
    await waitForBot(page1);

    // Turn 3: "no" to additional info (triggering expert connect card)
    console.log("👤 User (Turn 3): no");
    await page1.click('#chatInput');
    await page1.type('#chatInput', "no", { delay: 20 });
    await page1.click('#startChatBtn');
    await waitForBot(page1);

    // Turn 4: Click "Continue with chat" to enter AI Chat phase and get the diagnostic guide!
    console.log("👤 User (Turn 4): [Clicks Continue with chat]");
    await page1.click('#continueChatBtn');
    await waitForBot(page1);

    // Capture bot's triage response
    let msgs1 = await page1.$$eval('.chat-message', els => els.map(el => {
        const isUser = el.classList.contains('user-message');
        const bubble = el.querySelector('.message-bubble');
        return { role: isUser ? 'USER' : 'BOT', text: bubble ? bubble.textContent.trim() : '' };
    }));
    
    console.log("\n🤖 Final Chat Transcript Scenario 1:");
    msgs1.forEach(m => console.log(`   [${m.role}] ${m.text}`));

    // Verify it detected Appliances & Electronics and routed to Appliance Specialist
    const isAppliance1 = msgs1.some(m => m.role === 'BOT' && m.text.includes('Appliance & Electronics Specialist'));
    const isRefrigerator1 = msgs1.some(m => m.role === 'BOT' && m.text.toLowerCase().includes('condenser coils'));

    console.log("\n🔍 Verification Results:");
    console.log("   -> Category Detected: Appliances & Electronics:", isAppliance1 ? "✅ PASS" : "❌ FAIL");
    console.log("   -> Diagnostic Guide: Refrigerator Cooling steps present:", isRefrigerator1 ? "✅ PASS" : "❌ FAIL");

    console.log("⏳ Pausing 4 seconds for user visual review...");
    await sleep(4000);
    await page1.close();

    // ============================================
    // SCENARIO 2: Testing Taxes & Finance (IRS tax audit letter CP2000)
    // ============================================
    console.log("\n--- SCENARIO 2: Taxes & Finance (IRS tax audit CP2000) ---");
    const page2 = await browser.newPage();
    await page2.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(3000);

    // Turn 1: Send initial issue
    console.log("👤 User (Turn 1): I received an IRS tax audit letter CP2000");
    await page2.click('#chatInput');
    await page2.type('#chatInput', "I received an IRS tax audit letter CP2000", { delay: 20 });
    await page2.click('#startChatBtn');
    await waitForBot(page2);

    // Turn 2: Answer clarifying question
    console.log("👤 User (Turn 2): yes it is letter CP2000");
    await page2.click('#chatInput');
    await page2.type('#chatInput', "yes it is letter CP2000", { delay: 20 });
    await page2.click('#startChatBtn');
    await waitForBot(page2);

    // Turn 3: "no" to additional info (triggering expert connect card)
    console.log("👤 User (Turn 3): no");
    await page2.click('#chatInput');
    await page2.type('#chatInput', "no", { delay: 20 });
    await page2.click('#startChatBtn');
    await waitForBot(page2);

    // Turn 4: Click "Continue with chat" to enter AI Chat phase and get the diagnostic guide!
    console.log("👤 User (Turn 4): [Clicks Continue with chat]");
    await page2.click('#continueChatBtn');
    await waitForBot(page2);

    // Capture responses
    let msgs2 = await page2.$$eval('.chat-message', els => els.map(el => {
        const isUser = el.classList.contains('user-message');
        const bubble = el.querySelector('.message-bubble');
        return { role: isUser ? 'USER' : 'BOT', text: bubble ? bubble.textContent.trim() : '' };
    }));

    console.log("\n🤖 Final Chat Transcript Scenario 2:");
    msgs2.forEach(m => console.log(`   [${m.role}] ${m.text}`));

    // Verify it detected Taxes & Finance and routed to CPA
    const isFinance2 = msgs2.some(m => m.role === 'BOT' && m.text.includes('Certified Public Accountant'));
    const isCP2000_2 = msgs2.some(m => m.role === 'BOT' && m.text.toLowerCase().includes('cp2000'));

    console.log("\n🔍 Verification Results:");
    console.log("   -> Category Detected: Taxes & Finance:", isFinance2 ? "✅ PASS" : "❌ FAIL");
    console.log("   -> Diagnostic Guide: CP2000 Audit steps present:", isCP2000_2 ? "✅ PASS" : "❌ FAIL");

    console.log("⏳ Pausing 4 seconds for user visual review...");
    await sleep(4000);
    await page2.close();

    // ============================================
    // SCENARIO 3: Testing newly expanded issues in Crypto (Token migration / claim token)
    // ============================================
    console.log("\n--- SCENARIO 3: Expanded Issue in Crypto (Token migrations & claims) ---");
    const page3 = await browser.newPage();
    await page3.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(3000);

    // Turn 1: Send initial issue
    console.log("👤 User (Turn 1): how do I claim an airdrop or perform a token migration");
    await page3.click('#chatInput');
    await page3.type('#chatInput', "how do I claim an airdrop or perform a token migration", { delay: 20 });
    await page3.click('#startChatBtn');
    await waitForBot(page3);

    // Turn 2: Answer clarifying question
    console.log("👤 User (Turn 2): MetaMask wallet");
    await page3.click('#chatInput');
    await page3.type('#chatInput', "MetaMask wallet", { delay: 20 });
    await page3.click('#startChatBtn');
    await waitForBot(page3);

    // Turn 3: "no" to additional info (triggering expert connect card)
    console.log("👤 User (Turn 3): no");
    await page3.click('#chatInput');
    await page3.type('#chatInput', "no", { delay: 20 });
    await page3.click('#startChatBtn');
    await waitForBot(page3);

    // Turn 4: Click "Continue with chat" to enter AI Chat phase and get the diagnostic guide!
    console.log("👤 User (Turn 4): [Clicks Continue with chat]");
    await page3.click('#continueChatBtn');
    await waitForBot(page3);

    // Capture responses
    let msgs3 = await page3.$$eval('.chat-message', els => els.map(el => {
        const isUser = el.classList.contains('user-message');
        const bubble = el.querySelector('.message-bubble');
        return { role: isUser ? 'USER' : 'BOT', text: bubble ? bubble.textContent.trim() : '' };
    }));

    console.log("\n🤖 Final Chat Transcript Scenario 3:");
    msgs3.forEach(m => console.log(`   [${m.role}] ${m.text}`));

    // Verify it detected Crypto and routed to Crypto Finance Specialist with the new claim guide
    const isCrypto3 = msgs3.some(m => m.role === 'BOT' && m.text.includes('Crypto Finance Specialist'));
    const isMigration3 = msgs3.some(m => m.role === 'BOT' && m.text.toLowerCase().includes('airdrop'));

    console.log("\n🔍 Verification Results:");
    console.log("   -> Category Detected: Crypto & Finance:", isCrypto3 ? "✅ PASS" : "❌ FAIL");
    console.log("   -> Diagnostic Guide: Token claim/migration steps present:", isMigration3 ? "✅ PASS" : "❌ FAIL");

    console.log("⏳ Pausing 4 seconds for user visual review...");
    await sleep(4000);
    await page3.close();

    await browser.close();

    console.log("\n--- E2E VERIFICATION COMPLETE ---");
    const passed = isAppliance1 && isRefrigerator1 && isFinance2 && isCP2000_2 && isCrypto3 && isMigration3;
    if (passed) {
        console.log("🎉 ALL NEW SCENARIO E2E VERIFICATIONS PASSED SUCCESSFULLY!");
        process.exit(0);
    } else {
        console.log("❌ SOME NEW SCENARIO E2E VERIFICATIONS FAILED!");
        process.exit(1);
    }
}

runNewScenariosTest().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
