const puppeteer = require('puppeteer');
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const PAGES = [
    { url: '/home.html', name: 'Home (home.html)', expectedSubtext: null },
    { url: '/index.html', name: 'Home Alternate (index.html)', expectedSubtext: null },
    { url: '/support.html', name: 'Support Hub (support.html)', expectedSubtext: 'SUPPORT' },
    { url: '/articles.html', name: 'Articles Hub (articles.html)', expectedSubtext: 'Troubleshooting Articles' },
    { url: '/about.html', name: 'About Us (about.html)', expectedSubtext: null },
    { url: '/faq.html', name: 'FAQ (faq.html)', expectedSubtext: null },
    { url: '/contact.html', name: 'Contact & Escalations (contact.html)', expectedSubtext: null },
    { url: '/privacy.html', name: 'Privacy Policy (privacy.html)', expectedSubtext: null },
    { url: '/terms.html', name: 'Terms of Service (terms.html)', expectedSubtext: null },
    { url: '/expert-verification.html', name: 'Expert Verification (expert-verification.html)', expectedSubtext: null }
];

async function runAudit() {
    console.log('====================================================');
    console.log('   ANSWERDESK COMPREHENSIVE COMPLIANCE & AUDIT SUITE');
    console.log('====================================================\n');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    function assert(condition, testName, details = '') {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`  ✅ PASS: ${testName}`);
        } else {
            failedTests++;
            console.log(`  ❌ FAIL: ${testName} ${details ? '--> ' + details : ''}`);
        }
    }

    try {
        const page = await browser.newPage();

        // 1. HTTP STATUS & ZERO CONSOLE ERRORS ON ALL PAGES
        console.log('--- 1. HTTP STATUS & CONSOLE ERROR AUDIT ---');
        for (const p of PAGES) {
            const consoleErrors = [];
            const pageErrors = [];

            page.on('console', msg => {
                if (msg.type() === 'error') consoleErrors.push(msg.text());
            });
            page.on('pageerror', err => pageErrors.push(err.message));

            const res = await page.goto(`${BASE_URL}${p.url}`, { waitUntil: 'domcontentloaded' });
            assert(res.status() === 200, `${p.name} returns HTTP 200 (Got ${res.status()})`);
            assert(consoleErrors.length === 0, `${p.name} has 0 console errors`, consoleErrors.join('; '));
            assert(pageErrors.length === 0, `${p.name} has 0 unhandled page exceptions`, pageErrors.join('; '));

            page.removeAllListeners('console');
            page.removeAllListeners('pageerror');
        }

        // 2. HEADER BRAND LOGO & SUBTEXT COMPLIANCE
        console.log('\n--- 2. HEADER BRAND LOGO & SUBTEXT COMPLIANCE ---');
        for (const p of PAGES) {
            await page.goto(`${BASE_URL}${p.url}`, { waitUntil: 'domcontentloaded' });
            const headerInfo = await page.evaluate(() => {
                const logo = document.querySelector('.logo, .site-logo');
                if (!logo) return { exists: false };
                const text = logo.innerText || '';
                const subtextEl = logo.querySelector('.logo-subtext, .logo-badge, small, span.subtext');
                const subtext = subtextEl ? subtextEl.innerText.trim() : '';
                return {
                    exists: true,
                    fullText: text.replace(/\s+/g, ' ').trim(),
                    subtext: subtext
                };
            });

            assert(headerInfo.exists, `${p.name} has logo element present`);
            assert(headerInfo.fullText.includes('AnswerDesk'), `${p.name} contains primary brand "AnswerDesk"`);

            if (p.expectedSubtext) {
                const matches = headerInfo.fullText.toLowerCase().includes(p.expectedSubtext.toLowerCase());
                assert(matches, `${p.name} correctly displays subtext "${p.expectedSubtext}"`, `Found: "${headerInfo.fullText}"`);
            } else {
                // Should NOT have support or troubleshooting articles subtext
                const hasSupportSub = headerInfo.fullText.toLowerCase().includes('support') && !headerInfo.fullText.toLowerCase().includes('knowledge & support');
                const hasArticleSub = headerInfo.fullText.toLowerCase().includes('troubleshooting');
                assert(!hasSupportSub && !hasArticleSub, `${p.name} correctly has clean "AnswerDesk" without subtext badge`, `Found: "${headerInfo.fullText}"`);
            }
        }

        // 3. ABOUT PAGE SPECIFIC FIX VERIFICATION
        console.log('\n--- 3. ABOUT US BRIDGE LINK & 4-IN-A-ROW AUDIT ---');
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(`${BASE_URL}/about.html`, { waitUntil: 'networkidle0' });

        const aboutData = await page.evaluate(() => {
            const link = document.querySelector('.expert-full-manual-link');
            if (!link) return { linkExists: false };

            const text = link.innerText.trim();
            const href = link.getAttribute('href');

            // Check Phase 1, Phase 2, Phase 3 cards
            const phaseCards = document.querySelectorAll('.vetting-phases .phase-card');
            function checkPhase(index) {
                const phaseCard = phaseCards[index];
                if (!phaseCard) return { count: 0, sameRow: false };
                const features = phaseCard.querySelectorAll('.phase-grid .phase-feature');
                if (features.length < 4) return { count: features.length, sameRow: false };
                const top0 = Math.round(features[0].getBoundingClientRect().top);
                const allSameRow = Array.from(features).every(c => Math.abs(Math.round(c.getBoundingClientRect().top) - top0) <= 2);
                return { count: features.length, sameRow: allSameRow };
            }

            // Check Pictoids grid
            const pictoids = document.querySelectorAll('.doc-pictoid-grid .doc-pictoid-card');
            let pictoidsSameRow = false;
            if (pictoids.length >= 4) {
                const topP0 = Math.round(pictoids[0].getBoundingClientRect().top);
                pictoidsSameRow = Array.from(pictoids).every(p => Math.abs(Math.round(p.getBoundingClientRect().top) - topP0) <= 2);
            }

            return {
                linkExists: true,
                linkText: text,
                linkHref: href,
                hasEmoji: text.includes('📖'),
                hasOldPrefix: text.toLowerCase().includes('read the complete, unabridged protocol'),
                hasProtocolStandards: text.toLowerCase().includes('protocol standards'),
                phase1: checkPhase(0),
                phase2: checkPhase(1),
                phase3: checkPhase(2),
                pictoids: { count: pictoids.length, sameRow: pictoidsSameRow }
            };
        });

        assert(aboutData.linkExists, 'About Us bridge link exists');
        assert(!aboutData.hasEmoji, 'About Us link has removed emoji "📖"');
        assert(!aboutData.hasOldPrefix, 'About Us link has removed "Read the complete, unabridged protocol:"');
        assert(aboutData.hasProtocolStandards, 'About Us link ends with "protocol standards"', `Text is: "${aboutData.linkText}"`);
        assert(aboutData.linkHref === 'expert-verification.html', `About Us link href points to "expert-verification.html" (Got: ${aboutData.linkHref})`);

        assert(aboutData.phase1.count === 4 && aboutData.phase1.sameRow, `About Us Phase 1 has 4 features in a single row on desktop`);
        assert(aboutData.phase2.count === 4 && aboutData.phase2.sameRow, `About Us Phase 2 has 4 features in a single row on desktop`);
        assert(aboutData.phase3.count === 4 && aboutData.phase3.sameRow, `About Us Phase 3 has 4 features in a single row on desktop`);
        assert(aboutData.pictoids.count === 4 && aboutData.pictoids.sameRow, `About Us Pictoids has 4 cards in a single row on desktop`);

        // 4. ARTICLES PAGE BUTTON THEME & ZERO RESULTS AUDIT
        console.log('\n--- 4. ARTICLES HUB THEME & LAYOUT AUDIT ---');
        await page.goto(`${BASE_URL}/articles.html`, { waitUntil: 'networkidle0' });

        const articlesData = await page.evaluate(() => {
            // Check category pills nowrap and dimensions
            const catButtons = document.querySelectorAll('.category-btn');
            const catStyles = Array.from(catButtons).map(b => {
                const s = window.getComputedStyle(b);
                const rect = b.getBoundingClientRect();
                return {
                    whiteSpace: s.whiteSpace,
                    width: rect.width,
                    height: rect.height
                };
            });
            const allNoWrap = catStyles.every(c => c.whiteSpace === 'nowrap');
            const allAdequateWidth = catStyles.every(c => c.width >= 330);
            const allAdequateHeight = catStyles.every(c => Math.abs(c.height - 42) <= 2);

            return {
                catCount: catButtons.length,
                allNoWrap,
                allAdequateWidth,
                allAdequateHeight
            };
        });

        assert(articlesData.allNoWrap, 'All Article category menu buttons enforce white-space: nowrap');
        assert(articlesData.allAdequateWidth, 'All Article category menu buttons are >= 330px wide to fit text on 1 line');
        assert(articlesData.allAdequateHeight, 'All Article category menu buttons have height 42px');

        // Test search and verify zero-results theme button and footer centering
        await page.waitForSelector('#articleSearchInput', { visible: true });
        await page.type('#articleSearchInput', 'xyznonexistentterm123');
        await new Promise(r => setTimeout(r, 600));

        const searchResultData = await page.evaluate(() => {
            const zeroBtn = document.querySelector('#zeroResultsCtaBtn') || document.querySelector('.kb-zero-cta');
            const footerContainer = document.querySelector('footer .section-container') || document.querySelector('footer');
            const footerStyle = window.getComputedStyle(footerContainer);

            let btnBg = '';
            let btnColor = '';
            if (zeroBtn) {
                const s = window.getComputedStyle(zeroBtn);
                btnBg = s.backgroundImage || s.backgroundColor;
                btnColor = s.color;
            }

            return {
                btnExists: !!zeroBtn,
                btnBg: btnBg,
                btnColor: btnColor,
                footerPaddingRight: footerStyle.paddingRight,
                footerPaddingLeft: footerStyle.paddingLeft
            };
        });

        assert(searchResultData.btnExists, 'Articles zero-results CTA button exists');
        // Check green theme (teal 39, 139, 125 or 278b7d)
        const isTeal = searchResultData.btnBg.includes('39, 139, 125') || searchResultData.btnBg.includes('278b7d') || searchResultData.btnBg.includes('18, 62, 53');
        assert(isTeal, 'Articles zero-results CTA button uses brand green/teal theme', `Background: ${searchResultData.btnBg}`);
        assert(searchResultData.footerPaddingRight === searchResultData.footerPaddingLeft, `Articles footer remains 50/50 centered during search (L: ${searchResultData.footerPaddingLeft}, R: ${searchResultData.footerPaddingRight})`);

        // 5. FOOTER SITE-WIDE UNIFORMITY & COLOR READABILITY AUDIT
        console.log('\n--- 5. SITE-WIDE FOOTER UNIFORMITY & READABILITY AUDIT ---');
        for (const p of PAGES) {
            await page.goto(`${BASE_URL}${p.url}`, { waitUntil: 'domcontentloaded' });
            const footerAudit = await page.evaluate((isSupportPage) => {
                const footer = document.querySelector('footer');
                if (!footer) return { exists: false };
                const grid = footer.querySelector('.footer-grid');
                const guarantees = footer.querySelector('.footer-guarantees');
                const bottom = footer.querySelector('.footer-bottom');
                const container = footer.querySelector('.section-container') || footer;
                const containerStyle = window.getComputedStyle(container);

                // Check column headings
                const colHeadings = Array.from(footer.querySelectorAll('.footer-col h4')).map(h => h.innerText.trim());
                const hasKnowledgeSupport = colHeadings.some(h => h.toLowerCase().includes('knowledge & support'));
                const hasOldSpecialties = colHeadings.some(h => h.toLowerCase().includes('specialties'));

                // Check text readability
                const link = footer.querySelector('.footer-col a');
                const linkColor = link ? window.getComputedStyle(link).color : '';

                return {
                    exists: true,
                    hasGrid: !!grid,
                    hasGuarantees: !!guarantees,
                    hasBottom: !!bottom,
                    hasKnowledgeSupport,
                    hasOldSpecialties,
                    paddingRight: containerStyle.paddingRight,
                    paddingLeft: containerStyle.paddingLeft,
                    linkColor: linkColor
                };
            }, p.url === '/support.html');

            assert(footerAudit.exists, `${p.name} footer exists`);
            assert(footerAudit.hasGrid && footerAudit.hasGuarantees && footerAudit.hasBottom, `${p.name} footer contains grid + guarantees + bottom`);
            assert(footerAudit.hasKnowledgeSupport && !footerAudit.hasOldSpecialties, `${p.name} footer has standardized "Knowledge & Support" column (no legacy "Specialties")`);

            if (p.url === '/support.html') {
                assert(footerAudit.paddingRight === '440px', `Support footer container correctly has 440px right padding for chatbox`);
            } else {
                assert(footerAudit.paddingRight === footerAudit.paddingLeft, `${p.name} footer is balanced 50/50 without right bias`);
            }
        }

        // 6. RESPONSIVE VIEWPORT & HORIZONTAL OVERFLOW (ALL BREAKPOINTS)
        console.log('\n--- 6. RESPONSIVE BREAKPOINT & OVERFLOW AUDIT ---');
        const viewports = [
            { name: 'Desktop (1440px)', width: 1440, height: 900 },
            { name: 'Laptop (1200px)', width: 1200, height: 800 },
            { name: 'Tablet (768px)', width: 768, height: 1024 },
            { name: 'Mobile (375px)', width: 375, height: 667 }
        ];

        for (const vp of viewports) {
            await page.setViewport({ width: vp.width, height: vp.height });
            let allVpPassed = true;
            for (const p of PAGES) {
                await page.goto(`${BASE_URL}${p.url}`, { waitUntil: 'domcontentloaded' });
                const hasOverflow = await page.evaluate((vpWidth) => {
                    return document.documentElement.scrollWidth > vpWidth + 2;
                }, vp.width);
                if (hasOverflow) {
                    allVpPassed = false;
                    console.log(`    ⚠️ Overflow detected on ${p.name} at ${vp.name}`);
                }
            }
            assert(allVpPassed, `Zero horizontal scroll across all 10 pages at ${vp.name}`);
        }

        // 7. EXPERT VERIFICATION FULL DOCUMENTATION PAGE AUDIT
        console.log('\n--- 7. EXPERT VERIFICATION 18-STEP MANUAL AUDIT ---');
        await page.goto(`${BASE_URL}/expert-verification.html`, { waitUntil: 'domcontentloaded' });
        const expertDocData = await page.evaluate(() => {
            const title = document.querySelector('h1') ? document.querySelector('h1').innerText : '';
            const stepCards = document.querySelectorAll('.step-card, .ev-step, .doc-step-card');
            const totalText = document.body.innerText.toLowerCase();

            return {
                title,
                stepCardCount: stepCards.length,
                has18Steps: totalText.includes('18-step') || totalText.includes('18 steps') || stepCards.length >= 18,
                hasLevel4: totalText.includes('level 4') && (totalText.includes('specialist') || totalText.includes('board-certified')),
                hasDepaneling: totalText.includes('depaneling') || totalText.includes('zero-tolerance')
            };
        });

        assert(expertDocData.has18Steps, 'Expert Verification page contains the complete 18-step manual');
        assert(expertDocData.hasLevel4, 'Expert Verification page contains 4-tier Credential Hierarchy');
        assert(expertDocData.hasDepaneling, 'Expert Verification page contains strict Depaneling and audit protocols');

    } catch (err) {
        console.error('Fatal audit execution error:', err);
        failedTests++;
    } finally {
        await browser.close();
    }

    console.log('\n====================================================');
    console.log(`   FINAL AUDIT RESULT: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILED)`);
    console.log(`   STATUS: ${failedTests === 0 ? '🟢 100% PASS - FULLY COMPLIANT' : '🔴 TESTS FAILED'}`);
    console.log('====================================================');
}

runAudit();
