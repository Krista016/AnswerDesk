// AnswerDesk Dynamic Site Configuration & Contact Routing Client
(function () {
    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

    let cachedConfig = null;
    let loadPromise = null;

    function cleanStr(val, maxLen) {
        if (typeof val !== 'string') return '';
        return val.replace(/[\r\n\t\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen || 200);
    }

    function normalizePhone(raw) {
        const str = cleanStr(raw || '', 40);
        if (!str) {
            return { valid: false, digits: '', e164: '', telUri: '', display: '' };
        }
        const hasPlus = str.startsWith('+');
        const digits = str.replace(/\D/g, '');
        if (digits.length < 7 || digits.length > 15) {
            return { valid: false, digits, e164: '', telUri: '', display: str };
        }
        let e164;
        let display;
        if (hasPlus) {
            e164 = '+' + digits;
            if (digits.length === 11 && digits.startsWith('1')) {
                display = '1-' + digits.slice(1, 4) + '-' + digits.slice(4, 7) + '-' + digits.slice(7);
            } else {
                display = str;
            }
        } else if (digits.length === 10) {
            e164 = '+1' + digits;
            display = '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
        } else if (digits.length === 11 && digits.startsWith('1')) {
            e164 = '+' + digits;
            display = '1-' + digits.slice(1, 4) + '-' + digits.slice(4, 7) + '-' + digits.slice(7);
        } else {
            e164 = '+' + digits;
            display = str;
        }
        return { valid: true, digits, e164, telUri: 'tel:' + e164, display };
    }

    function normalizeEmail(raw) {
        const str = cleanStr(raw || '', 160).toLowerCase();
        if (!str || !EMAIL_REGEX.test(str)) return { valid: false, email: '' };
        return { valid: true, email: str };
    }

    function matchCategory(config, categoryKeyOrQuery) {
        const cats = Array.isArray(config && config.categories) ? config.categories : [];
        const q = cleanStr(String(categoryKeyOrQuery || ''), 120).toLowerCase();
        if (!q || q === 'master' || q === 'unidentified') return null;

        const exact = cats.find(c => c.enabled !== false && String(c.key || '').toLowerCase() === q);
        if (exact) return exact;

        for (let i = 0; i < cats.length; i++) {
            const cat = cats[i];
            if (cat.enabled === false) continue;
            const kws = Array.isArray(cat.keywords) ? cat.keywords : [];
            if (kws.some(kw => kw && (q === kw || q.indexOf(kw) !== -1))) {
                return cat;
            }
        }
        return null;
    }

    function resolvePhone(categoryKeyOrQuery, configOverride) {
        const cfg = configOverride || cachedConfig;
        if (!cfg || !cfg.phone || cfg.phone.enabled === false) {
            return {
                dialable: false,
                source: cfg && cfg.phone && cfg.phone.enabled === false ? 'disabled' : 'none',
                display: '',
                telUri: '',
                e164: '',
                categoryKey: null,
                categoryLabel: ''
            };
        }

        const master = normalizePhone(cfg.phone.masterNumber || '');
        const masterDisplay = cleanStr(cfg.phone.masterDisplay || '', 40) || master.display;

        if (master.valid && cfg.phone.masterOverrideAll) {
            return {
                dialable: true,
                source: 'master_override',
                display: masterDisplay,
                telUri: master.telUri,
                e164: master.e164,
                categoryKey: null,
                categoryLabel: ''
            };
        }

        const cat = matchCategory(cfg, categoryKeyOrQuery);
        if (cat && cat.phone) {
            const catPhone = normalizePhone(cat.phone);
            if (catPhone.valid) {
                return {
                    dialable: true,
                    source: 'category',
                    display: catPhone.display,
                    telUri: catPhone.telUri,
                    e164: catPhone.e164,
                    categoryKey: cat.key,
                    categoryLabel: cat.label
                };
            }
        }

        if (master.valid) {
            return {
                dialable: true,
                source: 'master_fallback',
                display: masterDisplay,
                telUri: master.telUri,
                e164: master.e164,
                categoryKey: cat ? cat.key : null,
                categoryLabel: cat ? cat.label : ''
            };
        }

        return {
            dialable: false,
            source: 'none',
            display: '',
            telUri: '',
            e164: '',
            categoryKey: cat ? cat.key : null,
            categoryLabel: cat ? cat.label : ''
        };
    }

    function resolveEmail(sectionKey, configOverride) {
        const cfg = configOverride || cachedConfig;
        if (!cfg || !cfg.email) {
            return { available: false, email: '', mailtoUri: '', source: 'none' };
        }
        const key = cleanStr(String(sectionKey || ''), 60).toLowerCase();
        const master = normalizeEmail(cfg.email.masterEmail || '');

        if (master.valid && cfg.email.masterOverrideAll) {
            return { available: true, email: master.email, mailtoUri: 'mailto:' + master.email, source: 'master_override' };
        }

        const secRaw = (cfg.email.sections && cfg.email.sections[key]) || '';
        const secNorm = normalizeEmail(secRaw);
        if (secNorm.valid) {
            return { available: true, email: secNorm.email, mailtoUri: 'mailto:' + secNorm.email, source: 'section' };
        }

        const cat = matchCategory(cfg, key);
        if (cat && cat.email) {
            const catNorm = normalizeEmail(cat.email);
            if (catNorm.valid) {
                return { available: true, email: catNorm.email, mailtoUri: 'mailto:' + catNorm.email, source: 'category' };
            }
        }

        if (master.valid) {
            return { available: true, email: master.email, mailtoUri: 'mailto:' + master.email, source: 'master_fallback' };
        }

        return { available: false, email: '', mailtoUri: '', source: 'none' };
    }

    function hydratePage(config) {
        const cfg = config || cachedConfig;
        if (!cfg) return;

        // Hydrate [data-contact-email]
        document.querySelectorAll('[data-contact-email]').forEach(el => {
            const section = el.getAttribute('data-contact-email') || 'general';
            const fallbackText = el.getAttribute('data-fallback-text') || 'Submit Support Form';
            const fallbackHref = el.getAttribute('data-fallback-href') || '/contact';
            const resolved = resolveEmail(section, cfg);

            if (resolved.available) {
                if (el.tagName === 'A') {
                    el.setAttribute('href', resolved.mailtoUri);
                }
                if (el.getAttribute('data-preserve-label') !== 'true') {
                    el.textContent = resolved.email;
                }
                el.classList.remove('is-unconfigured');
            } else {
                if (el.tagName === 'A') {
                    el.setAttribute('href', fallbackHref);
                }
                if (el.getAttribute('data-preserve-label') !== 'true') {
                    el.textContent = fallbackText;
                }
                el.classList.add('is-unconfigured');
            }
        });

        // Hydrate [data-contact-phone]
        document.querySelectorAll('[data-contact-phone]').forEach(el => {
            const key = el.getAttribute('data-contact-phone') || 'master';
            const fallbackText = el.getAttribute('data-fallback-text') || 'Live Chat Available 24/7';
            const fallbackHref = el.getAttribute('data-fallback-href') || '/support';
            const resolved = resolvePhone(key, cfg);

            if (resolved.dialable) {
                if (el.tagName === 'A') {
                    el.setAttribute('href', resolved.telUri);
                }
                const targetSpan = el.querySelector('[data-phone-text]') || el;
                targetSpan.textContent = resolved.display;
                el.style.display = '';
                el.classList.remove('is-unconfigured');
            } else {
                const hideIfEmpty = el.getAttribute('data-hide-empty') === 'true';
                if (hideIfEmpty) {
                    el.style.display = 'none';
                } else {
                    if (el.tagName === 'A') {
                        el.setAttribute('href', fallbackHref);
                    }
                    const targetSpan = el.querySelector('[data-phone-text]') || el;
                    targetSpan.textContent = fallbackText;
                    el.classList.add('is-unconfigured');
                }
            }
        });

        // Hydrate [data-contact-address]
        if (cfg.business && cfg.business.officeAddress) {
            document.querySelectorAll('[data-contact-address]').forEach(el => {
                el.textContent = cfg.business.officeAddress;
            });
        }

        // Hydrate [data-contact-hours]
        if (cfg.business && cfg.business.hoursLabel) {
            document.querySelectorAll('[data-contact-hours]').forEach(el => {
                el.textContent = cfg.business.hoursLabel;
            });
        }

        // Update ContactPage JSON-LD dynamically if present
        const schemaEl = document.getElementById('contactPageSchema');
        if (schemaEl) {
            try {
                const data = JSON.parse(schemaEl.textContent);
                if (data && data.mainEntity) {
                    const supEmail = resolveEmail('support', cfg);
                    const masterPhone = resolvePhone('master', cfg);
                    if (supEmail.available) {
                        data.mainEntity.email = supEmail.email;
                    } else {
                        delete data.mainEntity.email;
                    }
                    if (masterPhone.dialable) {
                        data.mainEntity.telephone = masterPhone.e164;
                    } else {
                        delete data.mainEntity.telephone;
                    }
                    schemaEl.textContent = JSON.stringify(data, null, 2);
                }
            } catch (_) {}
        }
    }

    function fetchConfig() {
        if (loadPromise) return loadPromise;
        loadPromise = fetch('/api/config', { cache: 'no-store' })
            .then(res => {
                if (!res.ok) throw new Error('Config HTTP ' + res.status);
                return res.json();
            })
            .then(json => {
                if (json && json.success && json.data) {
                    cachedConfig = json.data;
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', () => hydratePage(cachedConfig));
                    } else {
                        hydratePage(cachedConfig);
                    }
                    window.dispatchEvent(new CustomEvent('answerdesk:config-ready', { detail: cachedConfig }));
                    return cachedConfig;
                }
                return null;
            })
            .catch(() => null);
        return loadPromise;
    }

    const ready = fetchConfig();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (cachedConfig) hydratePage(cachedConfig);
        });
    }

    window.AnswerDeskConfig = {
        ready,
        getConfig: () => cachedConfig,
        getCategories: () => (cachedConfig && Array.isArray(cachedConfig.categories) ? cachedConfig.categories : []),
        resolvePhone: (catKey) => resolvePhone(catKey, cachedConfig),
        resolveEmail: (sectionKey) => resolveEmail(sectionKey, cachedConfig),
        normalizePhone,
        hydratePage: () => hydratePage(cachedConfig),
        refresh: () => {
            loadPromise = null;
            return fetchConfig();
        }
    };
})();
