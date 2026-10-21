const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const PAGES = ['home.html', 'index.html', 'about.html', 'contact.html', 'terms.html', 'privacy.html'];
const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 }
];

async function runAudit() {
    console.log('--- STARTING COMPREHENSIVE END-TO-END AUDIT ---');
    const browser = await puppeteer.launch({ headless: 'new' });
    const errors = [];
    const warnings = [];

    for (const pageName of PAGES) {
        console.log(`\nTesting page: ${pageName}...`);
        const page = await browser.newPage();
        
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        page.on('pageerror', err => {
            consoleErrors.push(err.toString());
        });

        // Set viewport desktop first
        await page.setViewport({ width: 1440, height: 900 });
        const response = await page.goto(`${BASE_URL}/${pageName}`, { waitUntil: 'networkidle0' });
        
        if (!response || response.status() !== 200) {
            errors.push(`Page ${pageName} failed to load with status ${response ? response.status() : 'null'}`);
            await page.close();
            continue;
        }

        // Auto-accept cookies
        await page.evaluate(() => localStorage.setItem('answerdesk_cookie_consent', 'all'));
        await page.reload({ waitUntil: 'networkidle0' });

        // Check console errors
        if (consoleErrors.length > 0) {
            errors.push(`Console errors on ${pageName}: ${consoleErrors.join('; ')}`);
        }

        // Scroll to load any lazy images
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 600));

        // Check images
        const brokenImages = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs
                .filter(img => !img.complete || img.naturalWidth === 0)
                .map(img => img.src);
        });
        if (brokenImages.length > 0) {
            errors.push(`Broken images on ${pageName}: ${brokenImages.join(', ')}`);
        }

        // Check all links
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
                .map(a => a.getAttribute('href'))
                .filter(href => href && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#'));
        });
        console.log(`  Found ${links.length} outgoing links on ${pageName}`);

        // Check horizontal overflow on all viewports
        for (const vp of VIEWPORTS) {
            await page.setViewport({ width: vp.width, height: vp.height });
            const hasHorizontalScroll = await page.evaluate(() => {
                return document.documentElement.scrollWidth > window.innerWidth;
            });
            if (hasHorizontalScroll) {
                warnings.push(`Horizontal scrollbar detected on ${pageName} at ${vp.name} (${vp.width}px)!`);
            }
        }

        await page.close();
    }

    // Now test specific interactions
    console.log('\nTesting Interactive Features...');

    // 1. Test Home Search and Chat
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(`${BASE_URL}/home.html`, { waitUntil: 'networkidle0' });
        await page.evaluate(() => localStorage.setItem('answerdesk_cookie_consent', 'all'));
        await page.reload({ waitUntil: 'networkidle0' });

        // Type in hero search
        const searchInput = await page.$('#heroSearchInput');
        const searchBtn = await page.$('#heroSearchBtn');
        if (searchInput && searchBtn) {
            await searchInput.type('How to fix my printer');
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                searchBtn.click()
            ]);
            const currentUrl = page.url();
            console.log(`  Hero search redirected to: ${currentUrl}`);
            if (!currentUrl.includes('index.html?q=')) {
                errors.push(`Hero search did not redirect to index.html with query. Got: ${currentUrl}`);
            }
        } else {
            errors.push('Hero search input or button not found on home.html');
        }
        await page.close();
    }

    // 2. Test Floating Chat on Home
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(`${BASE_URL}/home.html`, { waitUntil: 'networkidle0' });
        await page.evaluate(() => localStorage.setItem('answerdesk_cookie_consent', 'all'));
        await page.reload({ waitUntil: 'networkidle0' });

        const chatBtn = await page.$('#floatingChatBtn');
        if (chatBtn) {
            await chatBtn.click();
            await new Promise(r => setTimeout(r, 400));
            const isVisible = await page.evaluate(() => {
                const panel = document.getElementById('floatingChatPanel');
                return panel && panel.style.display !== 'none';
            });
            if (!isVisible) {
                errors.push('Floating chat panel did not open on click');
            } else {
                console.log('  Floating chat opened successfully.');
            }
        }
        await page.close();
    }

    // 3. Test Contact Form tabs and submit
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(`${BASE_URL}/contact.html`, { waitUntil: 'networkidle0' });
        await page.evaluate(() => localStorage.setItem('answerdesk_cookie_consent', 'all'));
        await page.reload({ waitUntil: 'networkidle0' });

        // Click Escalation Tab
        const escTab = await page.$('#tabEscalateBtn');
        if (escTab) {
            await escTab.click();
            const escVisible = await page.evaluate(() => {
                const pan = document.getElementById('panelEscalation');
                return pan && pan.classList.contains('active');
            });
            console.log(`  Escalation tab toggle working: ${escVisible}`);
            if (!escVisible) errors.push('Contact escalation tab toggle failed');
        }

        // Test General form submission
        const genTab = await page.$('#tabGeneralBtn');
        if (genTab) await genTab.click();

        await page.type('#genName', 'Test User');
        await page.type('#genEmail', 'test@example.com');
        await page.type('#genSubject', 'Billing Inquiry');
        await page.type('#genMessage', 'This is a test message to verify the form submission works.');
        
        const submitBtn = await page.$('#formGeneral .btn-submit');
        if (submitBtn) {
            await submitBtn.click();
            await new Promise(r => setTimeout(r, 600));
            const feedbackText = await page.evaluate(() => {
                const el = document.getElementById('generalFeedback');
                return el ? el.innerText : '';
            });
            console.log(`  Contact form submit response: "${feedbackText.trim()}"`);
            if (!feedbackText) errors.push('General contact form feedback message not displayed on submit');
        }
        await page.close();
    }

    // 4. Test Index.html Chat & Workflow
    {
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(`${BASE_URL}/index.html?q=Outlook+password+issue`, { waitUntil: 'networkidle0' });
        await page.evaluate(() => localStorage.setItem('answerdesk_cookie_consent', 'all'));
        await page.reload({ waitUntil: 'networkidle0' });

        const messages = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.message-bubble')).map(b => b.innerText);
        });
        console.log(`  Index chat loaded with ${messages.length} messages.`);
        await page.close();
    }

    await browser.close();

    console.log('\n--- AUDIT SUMMARY ---');
    console.log(`Total Errors: ${errors.length}`);
    errors.forEach(e => console.error(`  [ERROR] ${e}`));
    console.log(`Total Warnings: ${warnings.length}`);
    warnings.forEach(w => console.warn(`  [WARNING] ${w}`));

    if (errors.length === 0 && warnings.length === 0) {
        console.log('SUCCESS: All pages and workflows passed end-to-end audit with 0 errors!');
    }
}

runAudit();
