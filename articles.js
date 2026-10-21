// ==========================================================================
// AnswerDesk Dedicated Articles Hub Controller
// Powers sidebar category filtering, live search, article reader, and resolver bridge
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
        { id: 'windows', label: 'Windows & PC', icon: '💻' },
        { id: 'apple', label: 'Apple, Mac & iOS', icon: '🍎' },
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

    // State
    let currentCategory = 'all';
    let searchQuery = '';
    let debounceTimer = null;

    // DOM Elements
    const categoryMenu = document.getElementById('categoryMenu');
    const totalCountBadge = document.getElementById('totalCountBadge');
    const articlesGrid = document.getElementById('articlesGrid');
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

        categoryMenu.innerHTML = '';
        CATEGORIES.forEach(cat => {
            const count = counts[cat.id] || 0;
            const btn = document.createElement('button');
            btn.className = `category-menu-item ${currentCategory === cat.id ? 'active' : ''}`;
            btn.setAttribute('data-category', cat.id);
            btn.innerHTML = `
                <span class="cat-label-wrap">
                    <span class="cat-icon">${cat.icon}</span>
                    <span class="cat-name">${cat.label}</span>
                </span>
                <span class="category-item-count">${count}</span>
            `;

            btn.addEventListener('click', () => {
                selectCategory(cat.id);
            });

            categoryMenu.appendChild(btn);
        });
    }

    // Select category
    function selectCategory(catId) {
        currentCategory = catId;
        
        // Update sidebar button states
        const buttons = categoryMenu.querySelectorAll('.category-menu-item');
        buttons.forEach(b => {
            if (b.getAttribute('data-category') === catId) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        // If in reader view, switch back to grid
        showGridView();

        // Update URL state
        updateUrl();

        // Filter and render
        filterAndRenderArticles();
    }

    // Filter articles based on active category & search query
    function getFilteredArticles() {
        const query = searchQuery.trim().toLowerCase();

        return ARTICLES_DATA.filter(article => {
            // Category check
            const matchesCategory = (currentCategory === 'all' || article.category === currentCategory);
            if (!matchesCategory) return false;

            // Search query check
            if (!query) return true;

            const inTitle = article.title.toLowerCase().includes(query);
            const inSnippet = (article.snippet || '').toLowerCase().includes(query);
            const inCategory = (article.categoryLabel || '').toLowerCase().includes(query);
            const inChecklist = Array.isArray(article.checklist) && article.checklist.some(item => item.toLowerCase().includes(query));
            const inContent = (article.content || '').toLowerCase().includes(query);

            return inTitle || inSnippet || inCategory || inChecklist || inContent;
        });
    }

    // Render articles in Grid
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
        articlesGrid.innerHTML = '';

        const checkSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;

        filtered.forEach(article => {
            const card = document.createElement('article');
            card.className = 'article-card';
            card.setAttribute('data-id', article.id);

            // Render 3 checklist points
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

            card.innerHTML = `
                <div>
                    <div class="article-card-header">
                        <span class="article-card-tag">${escapeHtml(article.categoryLabel || article.category)}</span>
                        <span class="article-card-time">${escapeHtml(article.readTime || '5 min read')}</span>
                    </div>
                    <h3 class="article-card-title">${escapeHtml(article.title)}</h3>
                    <p class="article-card-snippet">${escapeHtml(article.snippet || '')}</p>
                    ${checklistHtml}
                </div>
                <div class="article-card-footer">
                    <div class="article-author-box">
                        <img class="article-author-img" src="${article.author && article.author.img ? article.author.img : 'assets/expert-1.png'}" alt="${escapeHtml(article.author ? article.author.name : 'Specialist')}" loading="lazy">
                        <span class="article-author-name">${escapeHtml(article.author ? article.author.name : 'Verified Specialist')}</span>
                    </div>
                    <span class="article-read-link">Read Guide &rarr;</span>
                </div>
            `;

            card.addEventListener('click', (e) => {
                e.preventDefault();
                openArticle(article.id);
            });

            articlesGrid.appendChild(card);
        });
    }

    // Open Single Article Reader View
    function openArticle(articleId) {
        const article = ARTICLES_DATA.find(a => a.id === articleId);
        if (!article) return;

        // Populate Article Reader
        fullArticleContainer.innerHTML = `
            <div class="reader-meta-bar">
                <span class="article-card-tag">${escapeHtml(article.categoryLabel || article.category)}</span>
                <span class="article-card-time">&bull; ${escapeHtml(article.readTime || '5 min read')}</span>
                <span class="article-card-time">&bull; Step-by-Step Diagnostic Protocol</span>
            </div>

            <h1 class="reader-title">${escapeHtml(article.title)}</h1>

            <div class="reader-author-bar">
                <img src="${article.author && article.author.img ? article.author.img : 'assets/expert-1.png'}" alt="${escapeHtml(article.author ? article.author.name : 'Specialist')}">
                <div class="reader-author-text">
                    <strong>Written &amp; Audited by ${escapeHtml(article.author ? article.author.name : 'Verified Technical Specialist')}</strong>
                    <span>${escapeHtml(article.author ? article.author.role : 'Senior Diagnostics & Support Engineer')} &bull; AnswerDesk Certified Specialist</span>
                </div>
            </div>

            <div class="reader-content">
                ${article.content}
            </div>

            <!-- Resolver Widget at End of Article -->
            <div class="article-resolver-widget" id="articleResolverWidget">
                <div class="resolver-question">
                    <h4>Did this diagnostic guide solve your issue?</h4>
                    <p>Let us know if your issue is resolved, or get connected to an active specialist in seconds.</p>
                </div>
                <div class="resolver-action-btns" id="resolverActionBtns">
                    <button class="btn-solved" id="btnSolvedIssue">&#10003; Yes, Solved!</button>
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

        // Update Document Title
        document.title = `${article.title} – AnswerDesk Troubleshooting Guides`;

        // Update URL
        updateUrl(article.id);

        // Scroll to top of reader smoothly
        window.scrollTo({
            top: articleReaderView.getBoundingClientRect().top + window.pageYOffset - 80,
            behavior: 'smooth'
        });
    }

    // Return to Grid View
    function showGridView() {
        articleReaderView.style.display = 'none';
        articlesGridView.style.display = 'block';
        document.title = 'Troubleshooting Articles & Diagnostic Guides – AnswerDesk Knowledge Base';
        updateUrl();
    }

    // URL State Management
    function updateUrl(articleId = null) {
        const url = new URL(window.location.href);
        if (articleId) {
            url.searchParams.set('article', articleId);
            url.searchParams.delete('category');
        } else {
            url.searchParams.delete('article');
            if (currentCategory && currentCategory !== 'all') {
                url.searchParams.set('category', currentCategory);
            } else {
                url.searchParams.delete('category');
            }
        }
        window.history.pushState(null, '', url.toString());
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
                openArticle(articleParam);
                return;
            }
        }

        showGridView();

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
                showGridView();
                filterAndRenderArticles();
            }, 180);
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
            showGridView();
            filterAndRenderArticles();
        });
    }

    if (backToArticlesBtn) {
        backToArticlesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showGridView();
            filterAndRenderArticles();
            window.scrollTo({
                top: articlesGridView.getBoundingClientRect().top + window.pageYOffset - 80,
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
