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

async function runDisambiguationTest() {
    console.log("▶ Starting E2E verification for Pronoun Disambiguation flow...");
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 50,
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
    });
    
    // ============================================
    // SCENARIO 1: Clarifying the symptom is for the DOG
    // ============================================
    console.log("\n--- SCENARIO 1: User clarifies 'she' is the dog ---");
    const page1 = await browser.newPage();
    await page1.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(3000);

    // 1. Send first message: "my dog is not barking at all"
    console.log("👤 User: my dog is not barking at all");
    await page1.click('#chatInput');
    await page1.type('#chatInput', "my dog is not barking at all", { delay: 20 });
    await page1.click('#startChatBtn');
    await waitForBot(page1);

    // 2. Send second message: "i do not know"
    console.log("👤 User: i do not know");
    await page1.click('#chatInput');
    await page1.type('#chatInput', "i do not know", { delay: 20 });
    await page1.click('#startChatBtn');
    await waitForBot(page1);

    // 3. Send ambiguous message: "yes i have another issue she is pregnant"
    console.log("👤 User: yes i have another issue she is pregnant");
    await page1.click('#chatInput');
    await page1.type('#chatInput', "yes i have another issue she is pregnant", { delay: 20 });
    await page1.click('#startChatBtn');
    await waitForBot(page1);

    // Capture bot's disambiguation query
    let msgs1 = await page1.$$eval('.chat-message', els => els.map(el => {
        const isUser = el.classList.contains('user-message');
        const bubble = el.querySelector('.message-bubble');
        return { role: isUser ? 'USER' : 'BOT', text: bubble ? bubble.textContent.trim() : '' };
    }));
    let lastBotMsg1 = msgs1[msgs1.length - 1].text;
    console.log("🤖 Bot:", lastBotMsg1);

    // Verify it asked for clarification
    const askedClarification1 = lastBotMsg1.includes("who are you referring to by 'she'") || lastBotMsg1.includes("referring to your dog");
    console.log("   -> Asked for clarification:", askedClarification1 ? "✅ PASS" : "❌ FAIL");

    // 4. Send pet clarification: "the dog is pregnant"
    console.log("👤 User: referring to my dog");
    await page1.click('#chatInput');
    await page1.type('#chatInput', "referring to my dog", { delay: 20 });
    await page1.click('#startChatBtn');
    await waitForBot(page1);

    // Capture final summary responses
    msgs1 = await page1.$$eval('.chat-message', els => els.map(el => {
        const isUser = el.classList.contains('user-message');
        const bubble = el.querySelector('.message-bubble');
        return { role: isUser ? 'USER' : 'BOT', text: bubble ? bubble.textContent.trim() : '' };
    }));
    console.log("\n🤖 Final Chat Transcript Scenario 1:");
    msgs1.forEach(m => console.log(`   [${m.role}] ${m.text}`));

    // Verify Veterinary category remains and contains updated symptoms
    const isVet1 = msgs1.some(m => m.role === 'BOT' && m.text.includes('Category: Veterinary'));
    const isDog1 = msgs1.some(m => m.role === 'BOT' && m.text.includes('Pet: dog'));
    const containsPregnant1 = msgs1.some(m => m.role === 'BOT' && m.text.toLowerCase().includes('pregnant'));
    const remainsVet1 = msgs1.some(m => m.role === 'BOT' && m.text.includes('Licensed Veterinarian'));

    console.log("   -> Summary has 'Category: Veterinary':", isVet1 ? "✅ PASS" : "❌ FAIL");
    console.log("   -> Summary has 'Pet: dog':", isDog1 ? "✅ PASS" : "❌ FAIL");
    console.log("   -> Summary has 'pregnant' symptom:", containsPregnant1 ? "✅ PASS" : "❌ FAIL");
    console.log("   -> Connection is to Veterinarian:", remainsVet1 ? "✅ PASS" : "❌ FAIL");

    console.log("⏳ Pausing 4 seconds for user visual review...");
    await sleep(4000);
    await page1.close();

    // ============================================
    // SCENARIO 2: Clarifying the symptom is for a PERSON (Wife)
    // ============================================
    console.log("\n--- SCENARIO 2: User clarifies 'she' is their wife ---");
    const page2 = await browser.newPage();
    await page2.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(3000);

    // 1. Send first message: "my dog is not barking at all"
    console.log("👤 User: my dog is not barking at all");
    await page2.click('#chatInput');
    await page2.type('#chatInput', "my dog is not barking at all", { delay: 20 });
    await page2.click('#startChatBtn');
    await waitForBot(page2);

    // 2. Send second message: "i do not know"
    console.log("👤 User: i do not know");
    await page2.click('#chatInput');
    await page2.type('#chatInput', "i do not know", { delay: 20 });
    await page2.click('#startChatBtn');
    await waitForBot(page2);

    // 3. Send ambiguous message: "yes i have another issue she is pregnant"
    console.log("👤 User: yes i have another issue she is pregnant");
    await page2.click('#chatInput');
    await page2.type('#chatInput', "yes i have another issue she is pregnant", { delay: 20 });
    await page2.click('#startChatBtn');
    await waitForBot(page2);

    // 4. Send human clarification: "my wife"
    console.log("👤 User: my wife");
    await page2.click('#chatInput');
    await page2.type('#chatInput', "my wife", { delay: 20 });
    await page2.click('#startChatBtn');
    await waitForBot(page2);

    // Capture final summary responses
    msgs2 = await page2.$$eval('.chat-message', els => els.map(el => {
        const isUser = el.classList.contains('user-message');
        const bubble = el.querySelector('.message-bubble');
        return { role: isUser ? 'USER' : 'BOT', text: bubble ? bubble.textContent.trim() : '' };
    }));
    console.log("\n🤖 Final Chat Transcript Scenario 2:");
    msgs2.forEach(m => console.log(`   [${m.role}] ${m.text}`));

    // Verify transition to Medical Physician category
    const isMed2 = msgs2.some(m => m.role === 'BOT' && m.text.includes('Category: Medical'));
    const containsPregnant2 = msgs2.some(m => m.role === 'BOT' && m.text.toLowerCase().includes('pregnant'));
    const remainsMed2 = msgs2.some(m => m.role === 'BOT' && m.text.includes('Board Certified Physician'));
    const transitionsPolitely = msgs2.some(m => m.role === 'BOT' && m.text.includes('connect you with a Board Certified Physician first'));

    console.log("   -> Summary has 'Category: Medical':", isMed2 ? "✅ PASS" : "❌ FAIL");
    console.log("   -> Summary has 'pregnant' symptom:", containsPregnant2 ? "✅ PASS" : "❌ FAIL");
    console.log("   -> Connection is to Physician:", remainsMed2 ? "✅ PASS" : "❌ FAIL");
    console.log("   -> Polite transition message generated:", transitionsPolitely ? "✅ PASS" : "❌ FAIL");

    console.log("⏳ Pausing 4 seconds for user visual review...");
    await sleep(4000);
    await page2.close();
    await browser.close();

    console.log("\n--- OVERALL DISAMBIGUATION RESULTS ---");
    const s1_passed = askedClarification1 && isVet1 && isDog1 && containsPregnant1 && remainsVet1;
    const s2_passed = isMed2 && containsPregnant2 && remainsMed2 && transitionsPolitely;

    console.log("Scenario 1 (Dog):", s1_passed ? "✅ PASS" : "❌ FAIL");
    console.log("Scenario 2 (Wife):", s2_passed ? "✅ PASS" : "❌ FAIL");

    if (s1_passed && s2_passed) {
        console.log("\n🎉 ALL DISAMBIGUATION TESTS PASSED SUCCESSFULLY!");
        process.exit(0);
    } else {
        console.log("\n❌ SOME DISAMBIGUATION TESTS FAILED!");
        process.exit(1);
    }
}

runDisambiguationTest().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
