// Universal AnswerDesk Mobile Navigation & Responsive Header
(function() {
    function initMobileNav() {
        const headerInner = document.querySelector('.header-inner');
        if (!headerInner) return;

        // Enhance header-cta button with responsive text spans if not already present
        const headerCta = headerInner.querySelector('.header-cta');
        if (headerCta && !headerCta.querySelector('.cta-text-full')) {
            const rawText = headerCta.textContent.trim() || 'Get Expert Help';
            headerCta.innerHTML = `
                <span class="cta-text-full">${rawText}</span>
                <span class="cta-text-short">Get Help</span>
            `;
        }

        // Ensure right actions wrapper exists
        let rightActions = headerInner.querySelector('.header-right-actions');
        let menuBtn = document.getElementById('mobileMenuBtn');

        if (!rightActions) {
            rightActions = document.createElement('div');
            rightActions.className = 'header-right-actions';
            if (headerCta) {
                headerCta.parentNode.insertBefore(rightActions, headerCta);
                rightActions.appendChild(headerCta);
            } else {
                headerInner.appendChild(rightActions);
            }
        }

        if (!menuBtn) {
            menuBtn = document.createElement('button');
            menuBtn.id = 'mobileMenuBtn';
            menuBtn.className = 'mobile-menu-btn';
            menuBtn.setAttribute('aria-label', 'Toggle navigation menu');
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.innerHTML = `
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            `;
            rightActions.appendChild(menuBtn);
        }

        // Check if drawer already exists
        if (document.getElementById('mobileNavDrawer')) return;

        // Current page pathname
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';

        // Create Backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'mobileNavBackdrop';
        backdrop.className = 'mobile-nav-backdrop';

        // Create Drawer
        const drawer = document.createElement('div');
        drawer.id = 'mobileNavDrawer';
        drawer.className = 'mobile-nav-drawer';
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-modal', 'true');
        drawer.setAttribute('aria-label', 'Mobile navigation menu');

        drawer.innerHTML = `
            <div class="drawer-header">
                <a href="index.html" class="logo" style="text-decoration:none; display:flex; align-items:center; gap:8px;">
                    <svg class="logo-icon" viewBox="0 0 40 40" fill="none" width="28" height="28">
                        <path d="M8 6C8 4.89543 8.89543 4 10 4H30C31.1046 4 32 4.89543 32 6V28C32 29.1046 31.1046 30 30 30H22L16 36V30H10C8.89543 30 8 29.1046 8 28V6Z" fill="#278b7d"/>
                        <path d="M14 14L19 19L26 12" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span style="font-weight:800; font-size:18px; color:#123e35;">Answer<span style="color:#278b7d;">Desk</span></span>
                </a>
                <button class="drawer-close-btn" id="drawerCloseBtn" aria-label="Close menu">&times;</button>
            </div>
            <nav class="drawer-nav-list">
                <a href="index.html" class="drawer-nav-item ${currentPath === 'index.html' || currentPath === '' || currentPath === 'home.html' ? 'active' : ''}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Home
                </a>
                <a href="support.html" class="drawer-nav-item ${currentPath === 'support.html' ? 'active' : ''}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Support &amp; Live Chat
                </a>
                <a href="articles.html" class="drawer-nav-item ${currentPath === 'articles.html' ? 'active' : ''}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    Troubleshooting Articles
                </a>
                <a href="about.html" class="drawer-nav-item ${currentPath === 'about.html' ? 'active' : ''}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    About Us
                </a>
                <a href="faq.html" class="drawer-nav-item ${currentPath === 'faq.html' ? 'active' : ''}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Frequently Asked Questions
                </a>
                <a href="contact.html" class="drawer-nav-item ${currentPath === 'contact.html' ? 'active' : ''}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    Contact &amp; Escalations
                </a>
                <a href="expert-verification.html" class="drawer-nav-item ${currentPath === 'expert-verification.html' ? 'active' : ''}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Expert Verification
                </a>
                <div class="drawer-divider"></div>
                <a href="terms.html" class="drawer-nav-item drawer-sublink ${currentPath === 'terms.html' ? 'active' : ''}">Terms of Service</a>
                <a href="privacy.html" class="drawer-nav-item drawer-sublink ${currentPath === 'privacy.html' ? 'active' : ''}">Privacy Policy</a>
            </nav>
            <div class="drawer-footer">
                <a href="support.html" class="drawer-cta-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Get Live Expert Help
                </a>
                <div class="drawer-footer-note">
                    <span class="live-dot"></span>
                    <span>35+ Verified Specialists Available 24/7</span>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(drawer);

        function openDrawer() {
            menuBtn.classList.add('active');
            menuBtn.setAttribute('aria-expanded', 'true');
            backdrop.classList.add('active');
            drawer.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeDrawer() {
            menuBtn.classList.remove('active');
            menuBtn.setAttribute('aria-expanded', 'false');
            backdrop.classList.remove('active');
            drawer.classList.remove('active');
            document.body.style.overflow = '';
        }

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (drawer.classList.contains('active')) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });

        const closeBtn = document.getElementById('drawerCloseBtn');
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        backdrop.addEventListener('click', closeDrawer);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer.classList.contains('active')) {
                closeDrawer();
            }
        });

        // Close when clicking internal nav links
        drawer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeDrawer);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileNav);
    } else {
        initMobileNav();
    }
})();
