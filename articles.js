// ==========================================================================
// AnswerDesk Dedicated Articles Hub Controller
// Powers sidebar category filtering, live multi-token search, paginated grid,
// article reader with dynamic AI/SEO JSON-LD schema, and resolver bridge
// ==========================================================================

(function() {
    'use strict';

    // Verify ARTICLES_DATA is loaded
    if (typeof ARTICLES_DATA === 'undefined' || !Array.isArray(ARTICLES_DATA)) {
        console.error('AnswerDesk Articles: ARTICLES_DATA dataset not found.');
        return;
    }

    const CATEGORIES = [
        { id: 'all', label: 'All Troubleshooting Guides', icon: '📑' },
        { id: 'windows', label: 'Microsoft & Windows', icon: '💻' },
        { id: 'apple', label: 'Apple, Mac, iPhone & Watch', icon: '🍎' },
        { id: 'paypal', label: 'PayPal & Digital Payments', icon: '💳' },
        { id: 'amazon', label: 'Amazon, Prime & Devices', icon: '📦' },
        { id: 'antivirus', label: 'Antivirus & Security Suites', icon: '🛡️' },
        { id: 'defender', label: 'Windows Defender', icon: '🔐' },
        { id: 'appliances', label: 'Home Appliances', icon: '🧺' },
        { id: 'auto', label: 'Automotive & OBD-II', icon: '🚗' },
        { id: 'printers', label: 'Printers & Hardware', icon: '🖨️' },
        { id: 'networking', label: 'Smart Home & WiFi', icon: '📶' },
        { id: 'tvaudio', label: 'Smart TVs & Audio', icon: '📺' },
        { id: 'gaming', label: 'Gaming Consoles', icon: '🎮' },
        { id: 'mobile', label: 'Mobile & Android', icon: '📱' },
        { id: 'veterinary', label: 'Veterinary & Pet Care', icon: '🐾' },
        { id: 'security', label: 'Accounts & Security', icon: '🔒' },
        { id: 'legal', label: 'Legal & Consumer Rights', icon: '⚖️' }
    ];

    const PAGE_SIZE = 24;
    const DEFAULT_TITLE = '700+ Troubleshooting Articles & Diagnostic Guides | AnswerDesk Knowledge Base';
    const DEFAULT_DESC = 'Explore over 700+ verified, AI-readable step-by-step troubleshooting guides covering Microsoft Windows, Apple iPhone/Mac/Watch, PayPal, Amazon, Antivirus, Windows Defender, appliances, OBD-II auto codes, and more.';

    // Precompute lowercase search index once for instant filtering across 700+ articles
    const SEARCH_INDEX = new Map();
    ARTICLES_DATA.forEach(article => {
        const plainContent = (article.content || '').replace(/<[^>]+>/g, ' ');
        const checklistStr = Array.isArray(article.checklist) ? article.checklist.join(' ') : '';
        const combined = [
            article.id || '',
            article.title || '',
            article.question || '',
            article.snippet || '',
            article.directAnswer || '',
            article.categoryLabel || '',
            article.subCategory || '',
            article.category || '',
            checklistStr,
            plainContent
        ].join(' ').toLowerCase();
        SEARCH_INDEX.set(article.id, combined);
    });

    // State
    let currentCategory = 'all';
    let searchQuery = '';
    let visibleCount = PAGE_SIZE;
    let debounceTimer = null;

    // DOM Elements
    const categoryMenu = document.getElementById('categoryMenu');
    const totalCountBadge = document.getElementById('totalCountBadge');
    const articlesGrid = document.getElementById('articlesGrid');
    const articlesLoadMoreWrap = document.getElementById('articlesLoadMoreWrap');
    const articlesGridView = document.getElementById('articlesGridView');
    const articleReaderView = document.getElementById('articleReaderView');
    const fullArticleContainer = document.getElementById('fullArticleContainer');
    const currentCategoryHeading = document.getElementById('currentCategoryHeading');
    const matchCountLabel = document.getElementById('matchCountLabel');
    const articlesZeroResults = document.getElementById('articlesZeroResults');
    const articleSearchInput = document.getElementById('articleSearchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const backToArticlesBtn = document.getElementById('backToArticlesBtn');
    const zeroResultsCtaBtn = document.getElementById('zeroResultsCtaBtn');

    // Category Counts calculation
    function getCategoryCounts() {
        const counts = { all: ARTICLES_DATA.length };
        ARTICLES_DATA.forEach(article => {
            const cat = article.category;
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }

    // Render Sidebar Menu
    function renderSidebar() {
        if (!categoryMenu) return;
        const counts = getCategoryCounts();

        if (totalCountBadge) {
            totalCountBadge.textContent = `${ARTICLES_DATA.length} Guides`;
        }

        const frag = document.createDocumentFragment();
        CATEGORIES.forEach(cat => {
            const count = counts[cat.id] || 0;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `category-menu-item ${currentCategory === cat.id ? 'active' : ''}`;
            btn.setAttribute('data-category', cat.id);
            btn.innerHTML = `
                <span class="cat-label-wrap">
                    <span class="cat-icon">${cat.icon}</span>
                    <span class="cat-name">${escapeHtml(cat.label)}</span>
                </span>
                <span class="category-item-count">${count}</span>
            `;

            btn.addEventListener('click', () => {
                selectCategory(cat.id);
            });

            frag.appendChild(btn);
        });

        categoryMenu.innerHTML = '';
        categoryMenu.appendChild(frag);
    }

    // Update sidebar active state without rebuilding DOM
    function syncSidebarActiveState() {
        if (!categoryMenu) return;
        const buttons = categoryMenu.querySelectorAll('.category-menu-item');
        buttons.forEach(b => {
            if (b.getAttribute('data-category') === currentCategory) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
    }

    // Select category
    function selectCategory(catId) {
        currentCategory = catId;
        visibleCount = PAGE_SIZE;

        syncSidebarActiveState();
        showGridView(false);
        updateUrl(null, true);
        filterAndRenderArticles();
    }

    // Filter articles based on active category & multi-token search query
    function getFilteredArticles() {
        const rawQuery = searchQuery.trim().toLowerCase();
        const tokens = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];

        return ARTICLES_DATA.filter(article => {
            if (currentCategory !== 'all' && article.category !== currentCategory) {
                return false;
            }
            if (tokens.length === 0) return true;

            const haystack = SEARCH_INDEX.get(article.id) || '';
            for (let i = 0; i < tokens.length; i++) {
                if (!haystack.includes(tokens[i])) return false;
            }
            return true;
        });
    }

    // Build a single article card as a real crawlable <a href="/guides/<slug>"> link
    function createArticleCard(article, checkSvg) {
        const card = document.createElement('a');
        card.className = 'article-card';
        card.href = `/guides/${encodeURIComponent(article.id)}`;
        card.setAttribute('data-id', article.id);

        let checklistHtml = '';
        if (Array.isArray(article.checklist) && article.checklist.length > 0) {
            checklistHtml = `
                <div class="article-card-checklist">
                    ${article.checklist.slice(0, 3).map(item => `
                        <div class="checklist-item">
                            ${checkSvg}
                            <span>${escapeHtml(item)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        const tagText = article.categoryLabel || article.category;
        const authorImg = (article.author && article.author.img) ? article.author.img : 'assets/expert-1.png';
        const authorName = (article.author && article.author.name) ? article.author.name : 'Verified Expert';

        card.innerHTML = `
            <div>
                <div class="article-card-header">
                    <span class="article-card-tag">${escapeHtml(tagText)}</span>
                    <span class="article-card-time">${escapeHtml(article.readTime || '5 min read')}</span>
                </div>
                <h3 class="article-card-title">${escapeHtml(article.title)}</h3>
                <p class="article-card-snippet">${escapeHtml(article.snippet || '')}</p>
                ${checklistHtml}
            </div>
            <div class="article-card-footer">
                <div class="article-author-box">
                    <img class="article-author-img" src="${authorImg}" alt="${escapeHtml(authorName)}" loading="lazy" width="30" height="30">
                    <span class="article-author-name">${escapeHtml(authorName)}</span>
                </div>
                <span class="article-read-link">Read Guide &rarr;</span>
            </div>
        `;

        return card;
    }

    // Render pagination / Load More controls below the grid
    function renderLoadMoreBar(filteredTotal, shownCount) {
        if (!articlesLoadMoreWrap) return;

        if (filteredTotal <= shownCount) {
            articlesLoadMoreWrap.style.display = 'none';
            articlesLoadMoreWrap.innerHTML = '';
            return;
        }

        const remaining = filteredTotal - shownCount;
        const nextBatch = Math.min(PAGE_SIZE, remaining);

        articlesLoadMoreWrap.style.display = 'flex';
        articlesLoadMoreWrap.innerHTML = `
            <p class="load-more-meta">Viewing <strong>${shownCount}</strong> of <strong>${filteredTotal}</strong> troubleshooting guides</p>
            <div class="load-more-actions">
                <button type="button" class="btn-load-more" id="btnLoadMoreGuides">
                    Load ${nextBatch} More Guides
                </button>
                ${remaining > PAGE_SIZE ? `<button type="button" class="btn-show-all-guides" id="btnShowAllGuides">Show All (${filteredTotal})</button>` : ''}
            </div>
        `;

        const btnMore = articlesLoadMoreWrap.querySelector('#btnLoadMoreGuides');
        if (btnMore) {
            btnMore.addEventListener('click', () => {
                visibleCount += PAGE_SIZE;
                filterAndRenderArticles();
            });
        }

        const btnAll = articlesLoadMoreWrap.querySelector('#btnShowAllGuides');
        if (btnAll) {
            btnAll.addEventListener('click', () => {
                visibleCount = filteredTotal;
                filterAndRenderArticles();
            });
        }
    }

    // Render articles in Grid (paginated for instant load & smooth mobile scrolling)
    function filterAndRenderArticles() {
        const filtered = getFilteredArticles();
        const activeCatObj = CATEGORIES.find(c => c.id === currentCategory) || CATEGORIES[0];

        // Update Heading
        if (currentCategoryHeading) {
            currentCategoryHeading.textContent = searchQuery.trim()
                ? `Search results for "${searchQuery.trim()}"`
                : activeCatObj.label;
        }

        // Update Count
        if (matchCountLabel) {
            matchCountLabel.textContent = `Showing ${filtered.length} guide${filtered.length === 1 ? '' : 's'}`;
        }

        // Toggle Zero Results
        if (filtered.length === 0) {
            articlesGrid.style.display = 'none';
            if (articlesLoadMoreWrap) {
                articlesLoadMoreWrap.style.display = 'none';
                articlesLoadMoreWrap.innerHTML = '';
            }
            if (articlesZeroResults) {
                articlesZeroResults.style.display = 'block';
                if (zeroResultsCtaBtn) {
                    const fallbackQuery = searchQuery.trim() || activeCatObj.label;
                    zeroResultsCtaBtn.href = `support.html?q=${encodeURIComponent(fallbackQuery)}`;
                }
            }
            return;
        }

        if (articlesZeroResults) articlesZeroResults.style.display = 'none';
        articlesGrid.style.display = 'grid';

        const checkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
        const slice = filtered.slice(0, visibleCount);
        const frag = document.createDocumentFragment();

        for (let i = 0; i < slice.length; i++) {
            frag.appendChild(createArticleCard(slice[i], checkSvg));
        }

        articlesGrid.innerHTML = '';
        articlesGrid.appendChild(frag);

        renderLoadMoreBar(filtered.length, slice.length);
    }

    // Inject/update dynamic JSON-LD structured data (FAQPage + TechArticle) for SEO & AI crawlers
    function updateDynamicArticleSchema(article) {
        const existing = document.getElementById('dynamicArticleSchema');
        if (existing) existing.remove();

        if (!article) return;

        const canonicalUrl = `https://answerdesk-zeta.vercel.app/articles.html?article=${encodeURIComponent(article.id)}`;
        const answerText = (article.directAnswer || article.snippet || '').trim();
        const questionText = (article.question || article.title || '').trim();

        const schemaPayload = {
            '@context': 'https://schema.org',
            '@graph': [
                {
                    '@type': 'TechArticle',
                    'headline': article.title,
                    'description': answerText,
                    'articleSection': article.subCategory
                        ? `${article.categoryLabel || article.category} — ${article.subCategory}`
                        : (article.categoryLabel || article.category),
                    'url': canonicalUrl,
                    'mainEntityOfPage': canonicalUrl,
                    'author': {
                        '@type': 'Person',
                        'name': (article.author && article.author.name) || 'AnswerDesk Technical Expert',
                        'jobTitle': (article.author && article.author.role) || 'Senior Diagnostics & Support Engineer'
                    },
                    'publisher': {
                        '@type': 'Organization',
                        'name': 'AnswerDesk',
                        'url': 'https://answerdesk-zeta.vercel.app/'
                    }
                },
                {
                    '@type': 'FAQPage',
                    'mainEntity': [
                        {
                            '@type': 'Question',
                            'name': questionText,
                            'acceptedAnswer': {
                                '@type': 'Answer',
                                'text': answerText
                            }
                        }
                    ]
                }
            ]
        };

        const script = document.createElement('script');
        script.id = 'dynamicArticleSchema';
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schemaPayload);
        document.head.appendChild(script);
    }

    function setMetaDescription(content) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && content) {
            metaDesc.setAttribute('content', content);
        }
    }

    // Open Single Article Reader View
    function openArticle(articleId, pushHistory = true) {
        const article = ARTICLES_DATA.find(a => a.id === articleId);
        if (!article) return;

        // Highlight matching category in sidebar
        if (article.category && CATEGORIES.some(c => c.id === article.category)) {
            currentCategory = article.category;
            syncSidebarActiveState();
        }

        const subCategoryBadge = article.subCategory
            ? `<span class="reader-subcat-pill">${escapeHtml(article.subCategory)}</span>`
            : '';

        // Populate Article Reader
        fullArticleContainer.innerHTML = `
            <div class="reader-meta-bar">
                <span class="article-card-tag">${escapeHtml(article.categoryLabel || article.category)}</span>
                ${subCategoryBadge}
                <span class="article-card-time">&bull; ${escapeHtml(article.readTime || '5 min read')}</span>
                <span class="article-card-time">&bull; Step-by-Step Diagnostic Protocol</span>
            </div>

            <h1 class="reader-title">${escapeHtml(article.title)}</h1>

            <div class="reader-author-bar">
                <img src="${article.author && article.author.img ? article.author.img : 'assets/expert-1.png'}" alt="${escapeHtml(article.author ? article.author.name : 'Expert')}">
                <div class="reader-author-text">
                    <strong>Written &amp; Audited by ${escapeHtml(article.author ? article.author.name : 'Verified Technical Expert')}</strong>
                    <span>${escapeHtml(article.author ? article.author.role : 'Senior Diagnostics & Support Engineer')} &bull; AnswerDesk Certified Expert</span>
                </div>
            </div>

            <div class="reader-content">
                ${article.content}
            </div>

            <div class="article-resolver-widget" id="articleResolverWidget">
                <div class="resolver-question">
                    <h4>Did this diagnostic guide solve your issue?</h4>
                    <p>Let us know if your issue is resolved, or get connected to an active expert in seconds.</p>
                </div>
                <div class="resolver-action-btns" id="resolverActionBtns">
                    <button type="button" class="btn-solved" id="btnSolvedIssue">&#10003; Yes, Solved!</button>
                    <a href="support.html?q=${encodeURIComponent(article.title)}" class="btn-not-solved" id="btnNotSolvedIssue">
                        No, Connect with Support Team &rarr;
                    </a>
                </div>
                <div class="resolver-feedback-message" id="resolverFeedbackMessage">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Thank you for your feedback! We're glad this resolved your issue.</span>
                </div>
            </div>
        `;

        // Bind Solved button
        const btnSolved = fullArticleContainer.querySelector('#btnSolvedIssue');
        const resolverActionBtns = fullArticleContainer.querySelector('#resolverActionBtns');
        const resolverFeedbackMessage = fullArticleContainer.querySelector('#resolverFeedbackMessage');
        if (btnSolved && resolverActionBtns && resolverFeedbackMessage) {
            btnSolved.addEventListener('click', () => {
                resolverActionBtns.style.display = 'none';
                resolverFeedbackMessage.style.display = 'inline-flex';
            });
        }

        // Toggle Views
        articlesGridView.style.display = 'none';
        articleReaderView.style.display = 'block';

        // Update SEO metadata & dynamic JSON-LD
        document.title = `${article.title} | AnswerDesk Troubleshooting Guides`;
        setMetaDescription((article.directAnswer || article.snippet || DEFAULT_DESC).slice(0, 160));
        updateDynamicArticleSchema(article);

        // Update URL
        updateUrl(article.id, pushHistory);

        // Scroll to top of reader smoothly
        window.scrollTo({
            top: Math.max(0, articleReaderView.getBoundingClientRect().top + window.pageYOffset - 80),
            behavior: 'smooth'
        });
    }

    // Return to Grid View
    function showGridView(updateHistory = true) {
        articleReaderView.style.display = 'none';
        articlesGridView.style.display = 'block';
        document.title = DEFAULT_TITLE;
        setMetaDescription(DEFAULT_DESC);
        updateDynamicArticleSchema(null);
        if (updateHistory) {
            updateUrl(null, true);
        }
    }

    // URL State Management
    function updateUrl(articleId = null, pushHistory = true) {
        const url = new URL(window.location.href);
        if (articleId) {
            url.searchParams.set('article', articleId);
            url.searchParams.delete('category');
            url.hash = '';
        } else {
            url.searchParams.delete('article');
            if (currentCategory && currentCategory !== 'all') {
                url.searchParams.set('category', currentCategory);
            } else {
                url.searchParams.delete('category');
            }
        }
        if (url.toString() === window.location.href) return;
        if (pushHistory) {
            window.history.pushState(null, '', url.toString());
        } else {
            window.history.replaceState(null, '', url.toString());
        }
    }

    // Sync from URL parameters on load or popstate
    function parseUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const articleParam = params.get('article');
        const categoryParam = params.get('category');
        const searchParam = params.get('q');

        if (articleParam) {
            const found = ARTICLES_DATA.find(a => a.id === articleParam);
            if (found) {
                // Redirect legacy ?article=<slug> URLs to the canonical static SEO page /guides/<slug>
                window.location.replace(`/guides/${encodeURIComponent(found.id)}`);
                return;
            }
        }

        showGridView(false);
        visibleCount = PAGE_SIZE;

        const hashCategory = window.location.hash ? window.location.hash.replace('#', '') : null;
        if (hashCategory && CATEGORIES.some(c => c.id === hashCategory)) {
            currentCategory = hashCategory;
        } else if (categoryParam && CATEGORIES.some(c => c.id === categoryParam)) {
            currentCategory = categoryParam;
        } else {
            currentCategory = 'all';
        }

        if (searchParam) {
            searchQuery = searchParam;
            if (articleSearchInput) articleSearchInput.value = searchParam;
            if (searchClearBtn) searchClearBtn.style.display = 'block';
        } else {
            searchQuery = '';
            if (articleSearchInput) articleSearchInput.value = '';
            if (searchClearBtn) searchClearBtn.style.display = 'none';
        }

        renderSidebar();
        filterAndRenderArticles();
    }

    // Helper: Escape HTML
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Event Listeners
    if (articleSearchInput) {
        articleSearchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (searchClearBtn) {
                searchClearBtn.style.display = val ? 'block' : 'none';
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                searchQuery = val;
                visibleCount = PAGE_SIZE;
                showGridView(false);
                filterAndRenderArticles();
            }, 160);
        });
    }

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', () => {
            if (articleSearchInput) {
                articleSearchInput.value = '';
                articleSearchInput.focus();
            }
            searchClearBtn.style.display = 'none';
            searchQuery = '';
            visibleCount = PAGE_SIZE;
            showGridView(false);
            filterAndRenderArticles();
        });
    }

    if (backToArticlesBtn) {
        backToArticlesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showGridView(true);
            filterAndRenderArticles();
            window.scrollTo({
                top: Math.max(0, articlesGridView.getBoundingClientRect().top + window.pageYOffset - 80),
                behavior: 'smooth'
            });
        });
    }

    window.addEventListener('popstate', () => {
        parseUrlParams();
    });

    window.addEventListener('hashchange', () => {
        parseUrlParams();
    });

    // Initialize
    renderSidebar();
    parseUrlParams();

})();
