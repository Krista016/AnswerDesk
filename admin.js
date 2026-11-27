// AnswerDesk Admin Portal Controller
(function () {
    let state = {
        config: null,
        submissions: [],
        analytics: null,
        health: null,
        storageMode: 'local_file',
        passwordUpdatedAt: null,
        dirty: false
    };

    const $ = (id) => document.getElementById(id);

    function showToast(msg, isError) {
        const toast = $('globalToast');
        if (!toast) return;
        toast.textContent = msg;
        toast.className = isError ? 'toast error' : 'toast';
        toast.style.display = 'block';
        clearTimeout(showToast._timer);
        showToast._timer = setTimeout(() => { toast.style.display = 'none'; }, 3500);
    }

    function setDirty(isDirty) {
        state.dirty = Boolean(isDirty);
        const badge = $('dirtyBadge');
        if (badge) badge.style.display = state.dirty ? 'inline-block' : 'none';
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatDuration(sec) {
        const s = Math.max(0, Math.round(Number(sec || 0)));
        if (s < 60) return s + 's';
        const m = Math.floor(s / 60);
        const r = s % 60;
        return m + 'm ' + r + 's';
    }

    function normalizePhonePreview(raw) {
        const str = (raw || '').trim();
        if (!str) return { valid: false, e164: '', display: '', isPlaceholder: false };
        const hasPlus = str.startsWith('+');
        const digits = str.replace(/\D/g, '');
        if (digits.length < 7 || digits.length > 15) {
            return { valid: false, e164: '', display: str, isPlaceholder: false };
        }
        let e164;
        let display;
        if (hasPlus) {
            e164 = '+' + digits;
            display = (digits.length === 11 && digits.startsWith('1'))
                ? '1-' + digits.slice(1, 4) + '-' + digits.slice(4, 7) + '-' + digits.slice(7)
                : str;
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
        const isPlaceholder = /^1?[2-9]\d{2}55501\d{2}$/.test(digits);
        return { valid: true, e164, telUri: 'tel:' + e164, display, isPlaceholder };
    }

    function resolvePhonePreview(cfg, categoryKeyOrQuery) {
        if (!cfg || !cfg.phone || cfg.phone.enabled === false) {
            return { dialable: false, source: 'disabled', display: '', telUri: '' };
        }
        const master = normalizePhonePreview(cfg.phone.masterNumber || '');
        const masterDisplay = (cfg.phone.masterDisplay || '').trim() || master.display;

        if (master.valid && cfg.phone.masterOverrideAll) {
            return { dialable: true, source: 'master_override', display: masterDisplay, telUri: master.telUri };
        }

        const q = (categoryKeyOrQuery || '').trim().toLowerCase();
        let cat = null;
        if (q && q !== 'unidentified') {
            cat = (cfg.categories || []).find(c => c.enabled !== false && c.key.toLowerCase() === q);
            if (!cat) {
                cat = (cfg.categories || []).find(c =>
                    c.enabled !== false &&
                    Array.isArray(c.keywords) &&
                    c.keywords.some(kw => kw && (q === kw || q.includes(kw)))
                );
            }
        }
        if (cat && cat.phone) {
            const cp = normalizePhonePreview(cat.phone);
            if (cp.valid) {
                return { dialable: true, source: 'category', display: cp.display, telUri: cp.telUri, catLabel: cat.label };
            }
        }
        if (master.valid) {
            return { dialable: true, source: 'master_fallback', display: masterDisplay, telUri: master.telUri };
        }
        return { dialable: false, source: 'none', display: '', telUri: '' };
    }

    function renderStorageInfo(mode) {
        state.storageMode = mode || 'local_file';
        const labels = {
            kv_rest: 'Vercel KV / Upstash Redis (Persistent)',
            local_file: 'Local JSON Storage',
            ephemeral_tmp: 'Temporary /tmp (Link Upstash Redis for persistence)'
        };
        if ($('storageModeDetail')) $('storageModeDetail').textContent = labels[state.storageMode] || state.storageMode;
        if ($('ephemeralBanner')) {
            $('ephemeralBanner').style.display = state.storageMode === 'ephemeral_tmp' ? 'block' : 'none';
        }
    }

    function renderSecurityMeta(passwordUpdatedAt) {
        state.passwordUpdatedAt = passwordUpdatedAt || null;
        const el = $('passwordUpdatedMeta');
        if (!el) return;
        el.textContent = passwordUpdatedAt
            ? `Last updated: ${new Date(passwordUpdatedAt).toLocaleString()}`
            : 'Credential active';
    }

    function renderWarnings(warnings) {
        const banner = $('warningsBanner');
        if (!banner) return;
        if (Array.isArray(warnings) && warnings.length > 0) {
            banner.innerHTML = '<strong>Attention:</strong> ' + warnings.map(escapeHtml).join(' | ');
            banner.style.display = 'block';
        } else {
            banner.style.display = 'none';
        }
    }

    function updateMasterPhoneUI() {
        const cfg = state.config;
        if (!cfg) return;
        const preview = normalizePhonePreview(cfg.phone.masterNumber);
        const meta = $('masterPhonePreview');
        if (meta) {
            if (!cfg.phone.masterNumber) {
                meta.className = 'field-meta';
                meta.textContent = 'Leave blank to hide direct call buttons until your real line is ready.';
            } else if (!preview.valid) {
                meta.className = 'field-meta warn';
                meta.textContent = 'Invalid phone number (needs 7–15 digits).';
            } else if (preview.isPlaceholder) {
                meta.className = 'field-meta warn';
                meta.textContent = `Parsed ${preview.e164} — Warning: 555-01XX is a fictional test range and not Google/Meta Ads compliant.`;
            } else {
                meta.className = 'field-meta ok';
                meta.textContent = `Valid E.164: ${preview.e164} (tel link: ${preview.telUri})`;
            }
        }

        const explainer = $('overrideModeExplainer');
        if (explainer) {
            explainer.textContent = cfg.phone.masterOverrideAll
                ? 'ON: Master Number overrides ALL expert categories. Even if categories have their own numbers, every Call button dials the Master Number.'
                : 'OFF: Category-First mode. Categories with a valid assigned phone dial their own number; any category without a number or unidentified issue automatically uses the Master Number.';
        }
        updateSimulator();
    }

    function updateSimulator() {
        const cfg = state.config;
        if (!cfg) return;
        const kw = ($('simKeywordInput')?.value || '').trim();
        const selected = $('simCategorySelect')?.value || 'unidentified';
        const res = resolvePhonePreview(cfg, kw || selected);

        const sourceLabels = {
            master_override: ['Master Override', 'badge badge-override'],
            category: [`Category Match (${res.catLabel || ''})`, 'badge badge-category'],
            master_fallback: ['Master Fallback', 'badge badge-fallback'],
            disabled: ['Phone Dialing Disabled', 'badge badge-none'],
            none: ['No Number Configured', 'badge badge-none']
        };
        const [label, cls] = sourceLabels[res.source] || ['Unknown', 'badge'];
        $('simSourceBadge').className = cls;
        $('simSourceBadge').textContent = label;
        $('simDisplayVal').textContent = res.dialable ? res.display : 'Hidden (No number)';
        $('simTelVal').textContent = res.dialable ? res.telUri : '—';
        $('simCallUiStatus').textContent = res.dialable
            ? 'Call Option & Dialer Active'
            : 'Call Buttons Hidden (Chat-Only Safe Mode)';
    }

    function renderSimulatorOptions() {
        const sel = $('simCategorySelect');
        if (!sel || !state.config) return;
        const prev = sel.value || 'unidentified';
        const opts = ['<option value="unidentified">Unidentified / General Inquiry</option>'];
        for (const cat of state.config.categories) {
            opts.push(`<option value="${escapeHtml(cat.key)}">${escapeHtml(cat.label)} (${escapeHtml(cat.key)})</option>`);
        }
        sel.innerHTML = opts.join('');
        sel.value = prev;
        updateSimulator();
    }

    function renderCategories() {
        const cfg = state.config;
        if (!cfg) return;
        $('catCountBadge').textContent = String(cfg.categories.length);
        const query = ($('catSearchInput')?.value || '').trim().toLowerCase();
        const container = $('categoriesList');
        if (!container) return;

        const filtered = cfg.categories.filter(c => {
            if (!query) return true;
            return c.key.toLowerCase().includes(query)
                || c.label.toLowerCase().includes(query)
                || c.expertRole.toLowerCase().includes(query)
                || (c.keywords || []).some(k => k.includes(query));
        });

        container.innerHTML = filtered.map(cat => {
            const pNorm = normalizePhonePreview(cat.phone);
            const phoneHint = cat.phone
                ? (pNorm.valid ? (pNorm.isPlaceholder ? 'Warning: 555 test number' : `Dials ${pNorm.e164}`) : 'Invalid phone')
                : 'Uses Master Number';

            return `
                <div class="cat-row ${cat.enabled === false ? 'disabled' : ''}" data-key="${escapeHtml(cat.key)}">
                    <div class="cat-row-head">
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                            <strong>${escapeHtml(cat.label)}</strong>
                            <span class="cat-key-pill">${escapeHtml(cat.key)}</span>
                            <span class="field-meta" style="margin:0;">${escapeHtml(phoneHint)}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <label class="switch">
                                <input type="checkbox" class="cat-enabled-input" ${cat.enabled !== false ? 'checked' : ''}>
                                <span class="slider"></span>
                                <span class="switch-label">Active</span>
                            </label>
                            ${!cat.builtIn ? '<button type="button" class="btn btn-danger btn-sm cat-delete-btn">Delete</button>' : ''}
                        </div>
                    </div>
                    <div class="cat-row-fields">
                        <div>
                            <label>Department Label</label>
                            <input type="text" class="cat-label-input" value="${escapeHtml(cat.label)}">
                        </div>
                        <div>
                            <label>Specialist Title</label>
                            <input type="text" class="cat-role-input" value="${escapeHtml(cat.expertRole)}">
                        </div>
                        <div>
                            <label>Department Phone</label>
                            <input type="text" class="cat-phone-input" value="${escapeHtml(cat.phone || '')}" placeholder="Master fallback if empty">
                        </div>
                        <div>
                            <label>Department Email (optional)</label>
                            <input type="email" class="cat-email-input" value="${escapeHtml(cat.email || '')}" placeholder="Optional">
                        </div>
                        <div class="span-2">
                            <label>Routing Keywords (comma-separated)</label>
                            <input type="text" class="cat-keywords-input" value="${escapeHtml((cat.keywords || []).join(', '))}">
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.cat-row').forEach(row => {
            const key = row.getAttribute('data-key');
            const findCat = () => state.config.categories.find(c => c.key === key);

            row.querySelector('.cat-enabled-input').addEventListener('change', (e) => {
                const c = findCat();
                if (c) { c.enabled = e.target.checked; row.classList.toggle('disabled', !c.enabled); setDirty(true); renderSimulatorOptions(); }
            });
            row.querySelector('.cat-label-input').addEventListener('input', (e) => {
                const c = findCat();
                if (c) { c.label = e.target.value; setDirty(true); }
            });
            row.querySelector('.cat-role-input').addEventListener('input', (e) => {
                const c = findCat();
                if (c) { c.expertRole = e.target.value; setDirty(true); }
            });
            row.querySelector('.cat-phone-input').addEventListener('input', (e) => {
                const c = findCat();
                if (c) { c.phone = e.target.value; setDirty(true); updateSimulator(); updateJsonPreview(); }
            });
            row.querySelector('.cat-email-input').addEventListener('input', (e) => {
                const c = findCat();
                if (c) { c.email = e.target.value; setDirty(true); updateJsonPreview(); }
            });
            row.querySelector('.cat-keywords-input').addEventListener('input', (e) => {
                const c = findCat();
                if (c) {
                    c.keywords = e.target.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                    setDirty(true);
                    updateSimulator();
                }
            });
            const delBtn = row.querySelector('.cat-delete-btn');
            if (delBtn) {
                delBtn.addEventListener('click', () => {
                    state.config.categories = state.config.categories.filter(c => c.key !== key);
                    setDirty(true);
                    renderCategories();
                    renderSimulatorOptions();
                    updateJsonPreview();
                });
            }
        });
    }

    function renderInbox() {
        const list = state.submissions || [];
        $('inboxCountBadge').textContent = String(list.filter(s => s.status !== 'resolved').length);
        const typeFilter = $('inboxTypeFilter')?.value || 'all';
        const statusFilter = $('inboxStatusFilter')?.value || 'all';
        const container = $('inboxList');
        if (!container) return;

        const filtered = list.filter(item => {
            if (typeFilter !== 'all' && item.type !== typeFilter) return false;
            if (statusFilter !== 'all' && item.status !== statusFilter) return false;
            return true;
        });

        if (!filtered.length) {
            container.innerHTML = '<p class="card-desc" style="margin:0;">No matching tickets found.</p>';
            return;
        }

        container.innerHTML = filtered.map(item => `
            <div class="ticket-card" data-id="${escapeHtml(item.id)}">
                <div class="ticket-head">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <strong>#${escapeHtml(item.id)}</strong>
                        <span class="badge ${item.type === 'escalation' ? 'badge-none' : 'badge-override'}">${item.type === 'escalation' ? 'Escalation' : 'Inquiry'}</span>
                        <span class="badge ${item.status === 'resolved' ? 'badge-category' : 'badge-fallback'}">${escapeHtml(item.status || 'open')}</span>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button type="button" class="btn btn-outline btn-sm toggle-status-btn">${item.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}</button>
                        <button type="button" class="btn btn-danger btn-sm delete-ticket-btn">Delete</button>
                    </div>
                </div>
                <div class="ticket-meta">
                    <strong>From:</strong> ${escapeHtml(item.name)} (${escapeHtml(item.email)}) &bull;
                    <strong>Date:</strong> ${escapeHtml(new Date(item.createdAt).toLocaleString())}
                    ${item.category ? ` &bull; <strong>Category:</strong> ${escapeHtml(item.category)}` : ''}
                    ${item.expertName ? ` &bull; <strong>Expert:</strong> ${escapeHtml(item.expertName)}` : ''}
                    ${item.subject ? ` &bull; <strong>Subject:</strong> ${escapeHtml(item.subject)}` : ''}
                </div>
                <div class="ticket-body">${escapeHtml(item.details)}</div>
            </div>
        `).join('');

        container.querySelectorAll('.ticket-card').forEach(card => {
            const id = card.getAttribute('data-id');
            const item = list.find(s => s.id === id);
            card.querySelector('.toggle-status-btn').addEventListener('click', async () => {
                const nextStatus = item.status === 'resolved' ? 'open' : 'resolved';
                const res = await fetch('/api/admin-config', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, status: nextStatus })
                });
                const json = await res.json();
                if (json.success) {
                    state.submissions = json.submissions;
                    renderInbox();
                    showToast(`Ticket #${id} marked ${nextStatus}.`);
                }
            });
            card.querySelector('.delete-ticket-btn').addEventListener('click', async () => {
                const res = await fetch('/api/admin-config', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                });
                const json = await res.json();
                if (json.success) {
                    state.submissions = json.submissions;
                    renderInbox();
                    showToast(`Ticket #${id} deleted.`);
                }
            });
        });
    }

    function renderAnalytics() {
        const data = state.analytics;
        if (!data) return;
        const s = data.summary || {};

        // Live Visitors Badge + Active Pages Strip
        if ($('liveNowCount')) $('liveNowCount').textContent = String(data.liveNow || 0);
        const liveStrip = $('livePagesStrip');
        const livePages = data.livePages || [];
        if (liveStrip) {
            if ((data.liveNow || 0) > 0 && livePages.length) {
                liveStrip.style.display = 'flex';
                liveStrip.innerHTML = `<strong style="color:#166534;">Active Now (${data.liveNow}):</strong> ` +
                    livePages.map(lp => `<span class="stat-chip"><code>${escapeHtml(lp.path)}</code> &times; ${lp.count}</span>`).join('');
            } else {
                liveStrip.style.display = 'none';
                liveStrip.innerHTML = '';
            }
        }

        const nvr = data.newVsReturning || {};
        $('kpiVisitors').textContent = String(s.uniqueVisitors || 0);
        $('kpiViewsSub').textContent = `${s.pageViews || 0} views • ${s.sessions || 0} sessions`;
        if ($('kpiNewReturnSub')) {
            $('kpiNewReturnSub').textContent = `${nvr.newPct || 0}% new (${nvr.newVisitors || 0}) • ${nvr.returningVisitors || 0} returning`;
        }
        $('kpiAvgTime').textContent = formatDuration(s.avgTimeSec || 0);
        $('kpiScrollSub').textContent = `${s.avgScrollPct || 0}% avg scroll depth`;
        $('kpiCallClicks').textContent = String(s.callClicks || 0);
        $('kpiCallRateSub').textContent = `${s.callConversionRatePct || 0}% call conv. rate`;
        $('kpiTotalConv').textContent = String(s.totalConversions || 0);
        $('kpiConvSplitSub').textContent = `${s.chatStarts || 0} chats • ${s.contactSubmits || 0} forms`;
        $('kpiBounce').textContent = `${s.bounceRatePct || 0}%`;
        $('kpiLoadSub').textContent = `${s.avgLoadMs || 0} ms avg load`;
        const wv = data.webVitals || {};
        if ($('kpiVitalsSub')) {
            const lcpTxt = wv.avgLcpMs ? `${(wv.avgLcpMs / 1000).toFixed(2)}s` : '—';
            const clsTxt = wv.samples ? String(wv.avgCls) : '—';
            $('kpiVitalsSub').textContent = `LCP: ${lcpTxt} • CLS: ${clsTxt}`;
        }
        $('kpiUptime').textContent = `${s.uptimePct != null ? s.uptimePct : 100}%`;
        $('kpiErrorsSub').textContent = `${s.clientErrorsCount || 0} JS issues • ${s.notFound404Count || 0} 404s`;

        // Trend chart
        const series = data.dailySeries || [];
        const trendBox = $('trendChartContainer');
        if (!series.length) {
            trendBox.innerHTML = '<p class="card-desc" style="margin:0;">No visitor traffic recorded yet for this range. Browse the site to populate live data.</p>';
        } else {
            const maxVal = Math.max(1, ...series.map(d => Math.max(d.views || 0, d.conversions || 0)));
            const cols = series.slice(-14).map(d => {
                const vh = Math.max(4, Math.round(((d.views || 0) / maxVal) * 116));
                const ch = Math.max(2, Math.round(((d.conversions || 0) / maxVal) * 116));
                const label = d.date.slice(5);
                return `
                    <div class="trend-col" title="${escapeHtml(d.date)}: ${d.views} views, ${d.conversions} conversions">
                        <div class="trend-pair">
                            <div class="bar-views" style="height:${vh}px;"></div>
                            <div class="bar-conv" style="height:${ch}px;"></div>
                        </div>
                        <span class="trend-date">${escapeHtml(label)}</span>
                    </div>
                `;
            }).join('');
            trendBox.innerHTML = `
                <div class="trend-bars">${cols}</div>
                <div class="trend-legend">
                    <span><span class="legend-dot" style="background:#99cfc5;"></span>Page Views</span>
                    <span><span class="legend-dot" style="background:#123e35;"></span>Conversions (Calls + Chats + Forms)</span>
                </div>
            `;
        }

        // Deep Chat & Call Funnel
        const f = data.funnel || {};
        const cf = data.chatFunnel || {};
        if ($('chatLatencyBadge')) {
            $('chatLatencyBadge').textContent = cf.avgApiMs ? `AI Latency: ${cf.avgApiMs} ms` : 'AI Latency: —';
        }
        const topF = Math.max(1, f.visits || 0);
        const funnelSteps = [
            ['Site Visits / Sessions', f.visits || 0],
            ['Engaged Visitors (10s+ or 25%+ scroll)', f.engaged || 0],
            ['Live Support Chat Started', f.chatStarts || 0],
            ['AI Intake Turns Completed', cf.intakeTurns || 0],
            ['Summary Confirmed & Channel Offered', Math.max(cf.summaryConfirms || 0, cf.channelChoices || 0)],
            ['Call Panel Opened', f.callPanelOpens || 0],
            ['Call Now Clicked (tel:)', f.callClicks || 0]
        ];
        $('funnelContainer').innerHTML = funnelSteps.map(([label, val]) => {
            const pct = Math.min(100, Math.round((val / topF) * 100));
            return `
                <div class="funnel-step">
                    <div class="funnel-meta">
                        <span>${escapeHtml(label)}</span>
                        <span>${val} (${pct}%)</span>
                    </div>
                    <div class="funnel-bar-bg">
                        <div class="funnel-bar-fill" style="width:${pct}%;"></div>
                    </div>
                </div>
            `;
        }).join('');

        // Geo Table
        const geo = data.geo || [];
        $('geoTableWrap').innerHTML = geo.length
            ? `<table class="an-table"><thead><tr><th>Country</th><th>Region</th><th>City</th><th>Views</th><th>Conv.</th></tr></thead><tbody>${geo.map(g => `<tr><td><strong>${escapeHtml(g.country)}</strong></td><td>${escapeHtml(g.region)}</td><td>${escapeHtml(g.city)}</td><td>${g.views}</td><td>${g.conversions}</td></tr>`).join('')}</tbody></table>`
            : '<p class="card-desc" style="margin:0;">No location data recorded yet.</p>';

        // AI Search Engines + Sources Table
        const aiSum = data.aiSearchSummary || {};
        const aiEngines = aiSum.engines || [];
        if ($('aiSearchSummaryBox')) {
            if (aiEngines.length) {
                $('aiSearchSummaryBox').innerHTML =
                    `<span class="stat-chip" style="background:#ecfdf5; border-color:#86efac; color:#166534;">AI Search Total: ${aiSum.views || 0} views (${aiSum.conversions || 0} conv.)</span>` +
                    aiEngines.map(e => `<span class="stat-chip">${escapeHtml(e.engine)}: ${e.views}</span>`).join('');
            } else {
                $('aiSearchSummaryBox').innerHTML = '<span class="stat-chip">AI Search Tracking Ready (ChatGPT, Perplexity, Claude, Gemini, Copilot)</span>';
            }
        }
        const sources = data.sources || [];
        $('sourcesTableWrap').innerHTML = sources.length
            ? `<table class="an-table"><thead><tr><th>Channel</th><th>Campaign</th><th>Views</th><th>Calls</th><th>Conv %</th></tr></thead><tbody>${sources.map(src => `<tr><td><strong>${escapeHtml(src.channel)}</strong></td><td>${escapeHtml(src.campaign)}</td><td>${src.views}</td><td>${src.callClicks}</td><td>${src.convRatePct}%</td></tr>`).join('')}</tbody></table>`
            : '<p class="card-desc" style="margin:0;">No traffic source data recorded yet.</p>';

        // Top Referring Domains
        const refs = data.referrers || [];
        if ($('referrersTableWrap')) {
            $('referrersTableWrap').innerHTML = refs.length
                ? `<table class="an-table"><thead><tr><th>Referring Domain</th><th>Channel</th><th>Views</th><th>Conv.</th></tr></thead><tbody>${refs.map(r => `<tr><td><code>${escapeHtml(r.host)}</code></td><td>${escapeHtml(r.channel)}</td><td>${r.views}</td><td>${r.conversions}</td></tr>`).join('')}</tbody></table>`
                : '<p class="card-desc" style="margin:0;">No external referring domains recorded yet.</p>';
        }

        // Peak Traffic Hours (24h)
        const hourly = data.hourly || [];
        if ($('hourlyChartContainer')) {
            const hasHourly = hourly.some(h => (h.views || 0) > 0 || (h.conversions || 0) > 0);
            if (!hasHourly) {
                $('hourlyChartContainer').innerHTML = '<p class="card-desc" style="margin:0;">No hourly traffic recorded yet for this timeframe.</p>';
            } else {
                const maxH = Math.max(1, ...hourly.map(h => h.views || 0));
                $('hourlyChartContainer').innerHTML = `<div class="hourly-bars">${hourly.map(h => {
                    const ht = Math.max(4, Math.round(((h.views || 0) / maxH) * 112));
                    const cls = (h.conversions || 0) > 0 ? 'hourly-bar has-conv' : 'hourly-bar';
                    return `<div class="hourly-col" title="${h.label}:00 — ${h.views} views, ${h.conversions} conversions"><div class="${cls}" style="height:${ht}px;"></div><span class="hourly-lbl">${h.hour % 3 === 0 ? escapeHtml(h.label) : ''}</span></div>`;
                }).join('')}</div>`;
            }
        }

        // Landing Pages & Exit Pages
        const lps = data.landingPages || [];
        if ($('landingPagesTableWrap')) {
            $('landingPagesTableWrap').innerHTML = lps.length
                ? `<table class="an-table"><thead><tr><th>Entry URL</th><th>Entries</th><th>Calls</th><th>Conv %</th></tr></thead><tbody>${lps.map(lp => `<tr><td><code>${escapeHtml(lp.path)}</code></td><td>${lp.entries}</td><td><strong>${lp.callClicks}</strong></td><td>${lp.convRatePct}%</td></tr>`).join('')}</tbody></table>`
                : '<p class="card-desc" style="margin:0;">No landing pages recorded yet.</p>';
        }
        const exits = data.exitPages || [];
        if ($('exitPagesTableWrap')) {
            $('exitPagesTableWrap').innerHTML = exits.length
                ? `<table class="an-table"><thead><tr><th>Exit URL</th><th>Exits</th><th>Share</th></tr></thead><tbody>${exits.map(ex => `<tr><td><code>${escapeHtml(ex.path)}</code></td><td>${ex.exits}</td><td>${ex.exitSharePct}%</td></tr>`).join('')}</tbody></table>`
                : '<p class="card-desc" style="margin:0;">No exit pages recorded yet.</p>';
        }

        // Top Pages Table
        const pages = data.topPages || [];
        $('pagesTableWrap').innerHTML = pages.length
            ? `<table class="an-table"><thead><tr><th>Page Path</th><th>Views</th><th>Avg Time</th><th>Scroll</th><th>Calls</th></tr></thead><tbody>${pages.map(p => `<tr><td><code>${escapeHtml(p.path)}</code></td><td>${p.views}</td><td>${formatDuration(p.avgTimeSec)}</td><td>${p.avgScrollPct}%</td><td><strong>${p.callClicks}</strong></td></tr>`).join('')}</tbody></table>`
            : '<p class="card-desc" style="margin:0;">No pageview behavior recorded yet.</p>';

        // On-Site Searches & Zero-Result Content Gaps
        const zeroSearches = data.zeroResultSearches || [];
        if ($('zeroSearchesWrap')) {
            $('zeroSearchesWrap').innerHTML = zeroSearches.length
                ? `<table class="an-table"><thead><tr><th>Missing Topic Query</th><th>Surface</th><th>0-Result Hits</th></tr></thead><tbody>${zeroSearches.map(q => `<tr><td><strong>${escapeHtml(q.query)}</strong></td><td>${escapeHtml(q.surface)}</td><td><span class="gap-pill">${q.zeroResultCount}</span></td></tr>`).join('')}</tbody></table>`
                : '<p class="card-desc" style="margin:0; color:#15803d; font-weight:600;">No zero-result search gaps logged yet.</p>';
        }
        const topSearches = data.topSearches || [];
        if ($('topSearchesWrap')) {
            $('topSearchesWrap').innerHTML = topSearches.length
                ? `<table class="an-table"><thead><tr><th>Search Query</th><th>Surface</th><th>Searches</th><th>0-Result</th></tr></thead><tbody>${topSearches.map(q => `<tr><td>${escapeHtml(q.query)}</td><td>${escapeHtml(q.surface)}</td><td>${q.count}</td><td>${q.zeroResultCount}</td></tr>`).join('')}</tbody></table>`
                : '<p class="card-desc" style="margin:0;">No on-site searches recorded yet.</p>';
        }

        // Guide Helpfulness & CTA Clicks
        const go = data.guideOutcomes || {};
        if ($('guideOutcomesBox')) {
            const solved = go.solved || 0;
            const notSolved = go.notSolved || 0;
            const tot = solved + notSolved;
            const solvedPct = tot > 0 ? Math.round((solved / tot) * 100) : 0;
            const askPct = tot > 0 ? (100 - solvedPct) : 0;
            $('guideOutcomesBox').innerHTML = tot > 0
                ? `<div class="funnel-meta"><span>Guide Outcomes: ${solved} Solved (${solvedPct}%)</span><span>${notSolved} Asked Expert (${askPct}%)</span></div><div class="guide-meter-bar"><div class="guide-meter-solved" style="width:${solvedPct}%;"></div><div class="guide-meter-ask" style="width:${askPct}%;"></div></div>`
                : '<p class="card-desc" style="margin:0;">No guide "Yes, Solved!" / "Ask an Expert" feedback votes yet.</p>';
        }
        const ctas = data.ctaClicks || [];
        if ($('ctaClicksWrap')) {
            $('ctaClicksWrap').innerHTML = ctas.length
                ? `<table class="an-table"><thead><tr><th>CTA / Element</th><th>Category</th><th>Clicks</th></tr></thead><tbody>${ctas.map(c => `<tr><td><strong>${escapeHtml(c.label)}</strong></td><td>${escapeHtml(c.category)}</td><td>${c.clicks}</td></tr>`).join('')}</tbody></table>`
                : '<p class="card-desc" style="margin:0;">No CTA clicks recorded yet.</p>';
        }

        // Devices & Browsers Chips
        const chips = [];
        for (const [k, v] of Object.entries(data.devices || {})) chips.push(`<span class="stat-chip">${escapeHtml(k)}: ${v}</span>`);
        for (const [k, v] of Object.entries(data.browsers || {})) chips.push(`<span class="stat-chip">${escapeHtml(k)}: ${v}</span>`);
        $('deviceSummaryBox').innerHTML = chips.length ? chips.join('') : '<span class="card-desc" style="margin:0;">No device metrics yet.</span>';

        // Category Analytics
        const cats = data.categories || [];
        $('categoryAnalyticsWrap').innerHTML = cats.length
            ? `<table class="an-table"><thead><tr><th>Category</th><th>Views</th><th>Chats</th><th>Calls</th></tr></thead><tbody>${cats.map(c => `<tr><td><strong>${escapeHtml(c.category)}</strong></td><td>${c.views}</td><td>${c.chatStarts}</td><td>${c.callClicks}</td></tr>`).join('')}</tbody></table>`
            : '<p class="card-desc" style="margin:0;">No category interactions recorded yet.</p>';

        // Core Web Vitals & Broken 404 Hits
        if ($('webVitalsSummaryBox')) {
            const lcpMs = wv.avgLcpMs || 0;
            const clsVal = wv.avgCls || 0;
            const ttfbMs = wv.avgTtfbMs || 0;
            const lcpCls = !lcpMs ? '' : (lcpMs <= 2500 ? 'good' : (lcpMs <= 4000 ? 'warn' : 'poor'));
            const clsCls = !wv.samples ? '' : (clsVal <= 0.1 ? 'good' : (clsVal <= 0.25 ? 'warn' : 'poor'));
            const ttfbCls = !ttfbMs ? '' : (ttfbMs <= 800 ? 'good' : (ttfbMs <= 1800 ? 'warn' : 'poor'));
            $('webVitalsSummaryBox').innerHTML = `
                <div class="vital-card ${lcpCls}"><div class="vital-name">LCP (Paint)</div><div class="vital-val">${lcpMs ? (lcpMs / 1000).toFixed(2) + 's' : '—'}</div><div class="vital-status">${!lcpMs ? 'Waiting for data' : (lcpMs <= 2500 ? 'Good (≤2.5s)' : 'Needs work')}</div></div>
                <div class="vital-card ${clsCls}"><div class="vital-name">CLS (Shift)</div><div class="vital-val">${wv.samples ? clsVal : '—'}</div><div class="vital-status">${!wv.samples ? 'Waiting for data' : (clsVal <= 0.1 ? 'Good (≤0.1)' : 'Needs work')}</div></div>
                <div class="vital-card ${ttfbCls}"><div class="vital-name">TTFB (Server)</div><div class="vital-val">${ttfbMs ? ttfbMs + ' ms' : '—'}</div><div class="vital-status">${!ttfbMs ? 'Waiting for data' : (ttfbMs <= 800 ? 'Fast (≤800ms)' : 'Slow')}</div></div>
            `;
        }
        const nf = data.notFound404s || [];
        if ($('notFound404Wrap')) {
            $('notFound404Wrap').innerHTML = nf.length
                ? `<table class="an-table"><thead><tr><th>Broken URL</th><th>Referrer</th><th>Hits</th></tr></thead><tbody>${nf.map(n => `<tr><td><code>${escapeHtml(n.path)}</code></td><td>${escapeHtml(n.referrer)}</td><td><strong>${n.count}</strong></td></tr>`).join('')}</tbody></table>`
                : '<p class="card-desc" style="margin:0; color:#15803d; font-weight:600;">Zero 404 broken URLs detected.</p>';
        }

        // Client Errors
        const errs = data.clientErrors || [];
        $('clientErrorsWrap').innerHTML = errs.length
            ? `<table class="an-table"><thead><tr><th>Error</th><th>Page</th><th>Count</th></tr></thead><tbody>${errs.map(e => `<tr><td>${escapeHtml(e.message)}</td><td><code>${escapeHtml(e.path)}</code></td><td>${e.count}</td></tr>`).join('')}</tbody></table>`
            : '<p class="card-desc" style="margin:0; color:#15803d; font-weight:600;">Zero client-side JS errors detected.</p>';

        // Privacy & Ads Compliance Checklist
        const comp = data.compliance || {};
        const compItems = [
            ['Zero Raw Visitor IP Stored', comp.noRawIpStored],
            ['100% First-Party (No 3rd-Party Pixels)', comp.firstPartyOnlyNoThirdPartyPixels !== false],
            ['Zero Fake 555 Phone Numbers', comp.noPlaceholder555Numbers],
            ['HTTPS Canonical Domain', comp.httpsCanonicalConfigured],
            ['Privacy & Cookie Banner Active', comp.privacyPolicyAndCookieBannerActive],
            ['Admin Portal No-Index Protected', true]
        ];
        $('complianceChecklist').innerHTML = compItems.map(([label, ok]) => {
            const cls = ok ? 'comp-item' : 'comp-item warn';
            const icon = ok ? '✓' : '!';
            return `<div class="${cls}"><span>${icon}</span><span>${escapeHtml(label)}</span></div>`;
        }).join('');

        // Recent Conversions
        const convs = data.recentConversions || [];
        $('recentConversionsWrap').innerHTML = convs.length
            ? `<table class="an-table"><thead><tr><th>Time</th><th>Conversion</th><th>Page</th><th>Category</th><th>Channel</th><th>Location</th><th>Device</th></tr></thead><tbody>${convs.map(c => `<tr><td>${escapeHtml(new Date(c.ts).toLocaleString())}</td><td><strong>${escapeHtml(c.type)}</strong></td><td><code>${escapeHtml(c.path)}</code></td><td>${escapeHtml(c.category)}</td><td>${escapeHtml(c.channel)}</td><td>${escapeHtml(c.geo)}</td><td>${escapeHtml(c.device)}</td></tr>`).join('')}</tbody></table>`
            : '<p class="card-desc" style="margin:0;">No conversions logged yet. Call clicks, chat starts, and form submits appear here in real time.</p>';
    }

    function csvCell(val) {
        const s = String(val == null ? '' : val);
        return '"' + s.replace(/"/g, '""') + '"';
    }

    function exportAnalyticsCsv() {
        const d = state.analytics;
        if (!d) {
            showToast('Analytics data is not loaded yet.', true);
            return;
        }
        const rows = [];
        const pushRow = (arr) => rows.push(arr.map(csvCell).join(','));
        const s = d.summary || {};

        pushRow(['Section', 'Metric / Item', 'Value 1', 'Value 2', 'Value 3', 'Value 4']);
        pushRow(['Summary', 'Range', d.range || '7d', '', '', '']);
        pushRow(['Summary', 'Live Visitors Now', s.liveNow || 0, '', '', '']);
        pushRow(['Summary', 'Unique Visitors', s.uniqueVisitors || 0, 'New %', s.newPct || 0, 'Returning: ' + (s.returningVisitors || 0)]);
        pushRow(['Summary', 'Page Views', s.pageViews || 0, 'Sessions', s.sessions || 0, 'Bounce %: ' + (s.bounceRatePct || 0)]);
        pushRow(['Summary', 'Call Now Clicks', s.callClicks || 0, 'Total Conversions', s.totalConversions || 0, 'Call Conv %: ' + (s.callConversionRatePct || 0)]);
        pushRow(['Summary', 'Web Vitals', 'LCP ms: ' + (s.avgLcpMs || 0), 'CLS: ' + (s.avgCls || 0), 'TTFB ms: ' + (s.avgTtfbMs || 0), '']);

        (d.dailySeries || []).forEach(r => pushRow(['Daily Trend', r.date, 'Views: ' + r.views, 'Visitors: ' + r.visitors, 'Calls: ' + r.callClicks, 'Conv: ' + r.conversions]));
        (d.sources || []).forEach(r => pushRow(['Traffic Source', r.channel, r.campaign, 'Views: ' + r.views, 'Calls: ' + r.callClicks, 'Conv %: ' + r.convRatePct]));
        (d.referrers || []).forEach(r => pushRow(['Referrer', r.host, r.channel, 'Views: ' + r.views, 'Conv: ' + r.conversions, '']));
        (d.landingPages || []).forEach(r => pushRow(['Landing Page', r.path, 'Entries: ' + r.entries, 'Calls: ' + r.callClicks, 'Conv %: ' + r.convRatePct, '']));
        (d.zeroResultSearches || []).forEach(r => pushRow(['Zero-Result Search Gap', r.query, r.surface, '0-Result Hits: ' + r.zeroResultCount, '', '']));
        (d.topSearches || []).forEach(r => pushRow(['Site Search', r.query, r.surface, 'Count: ' + r.count, '0-Result: ' + r.zeroResultCount, '']));
        (d.categories || []).forEach(r => pushRow(['Category', r.category, 'Views: ' + r.views, 'Chats: ' + r.chatStarts, 'Calls: ' + r.callClicks, '']));
        (d.notFound404s || []).forEach(r => pushRow(['404 Broken URL', r.path, r.referrer, 'Hits: ' + r.count, r.lastSeen || '', '']));

        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `answerdesk-analytics-${d.range || '7d'}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('Analytics CSV downloaded.');
    }

    function renderHealth() {
        const h = state.health;
        if (!h) return;
        const pill = $('healthStatusPill');
        if (pill) {
            pill.textContent = h.ok ? 'Operational' : 'Needs Attention';
            pill.className = h.ok ? 'badge badge-category' : 'badge badge-fallback';
        }
        if ($('healthMetaSub')) {
            $('healthMetaSub').textContent = `Uptime: ${h.uptimePct}% • Avg probe response: ${h.avgResponseMs} ms`;
        }
        if ($('kpiUptime') && h.uptimePct != null) {
            $('kpiUptime').textContent = `${h.uptimePct}%`;
        }
        $('healthChecksList').innerHTML = (h.checks || []).map(c => `
            <div class="health-row">
                <div>
                    <strong>${escapeHtml(c.name)}</strong>
                    <div class="field-meta" style="margin:0;">${escapeHtml(c.detail)} (${c.latencyMs} ms)</div>
                </div>
                <span class="badge ${c.ok ? 'badge-category' : 'badge-fallback'}">${c.ok ? 'PASS' : 'CHECK'}</span>
            </div>
        `).join('');
    }

    async function loadAnalyticsAndHealth() {
        const range = $('analyticsRangeSelect')?.value || '7d';
        const [anRes, hRes] = await Promise.all([
            fetch(`/api/analytics?range=${encodeURIComponent(range)}`, { cache: 'no-store' }),
            fetch('/api/health', { cache: 'no-store' })
        ]);
        const anJson = await anRes.json().catch(() => ({}));
        const hJson = await hRes.json().catch(() => ({}));
        if (anRes.ok && anJson.success) {
            state.analytics = anJson.data;
            renderAnalytics();
        }
        if (hRes.ok) {
            state.health = hJson;
            renderHealth();
        }
    }

    function updateJsonPreview() {
        if ($('jsonPreviewBox') && state.config) {
            $('jsonPreviewBox').textContent = JSON.stringify(state.config, null, 2);
        }
    }

    function populateFormFromConfig() {
        const cfg = state.config;
        if (!cfg) return;
        $('phoneEnabledToggle').checked = cfg.phone.enabled !== false;
        $('masterPhoneInput').value = cfg.phone.masterNumber || '';
        $('masterDisplayInput').value = cfg.phone.masterDisplay || '';
        $('masterOverrideToggle').checked = cfg.phone.masterOverrideAll !== false;

        $('masterEmailInput').value = cfg.email.masterEmail || '';
        $('masterEmailOverrideToggle').checked = Boolean(cfg.email.masterOverrideAll);
        $('emailGeneral').value = cfg.email.sections.general || '';
        $('emailSupport').value = cfg.email.sections.support || '';
        $('emailBilling').value = cfg.email.sections.billing || '';
        $('emailPrivacy').value = cfg.email.sections.privacy || '';
        $('emailSecurity').value = cfg.email.sections.security || '';
        $('emailEscalations').value = cfg.email.sections.escalations || '';

        $('officeAddressInput').value = cfg.business.officeAddress || '';
        $('hoursLabelInput').value = cfg.business.hoursLabel || '';

        renderSimulatorOptions();
        updateMasterPhoneUI();
        renderCategories();
        renderInbox();
        updateJsonPreview();
        setDirty(false);
    }

    async function loadAdminSession() {
        const res = await fetch('/api/admin-config', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));

        if (res.status === 503 || json.configured === false) {
            $('loginView').style.display = 'block';
            $('dashboardView').style.display = 'none';
            $('topbarActions').style.display = 'none';
            $('configMissingBanner').style.display = 'block';
            return;
        }

        if (!res.ok || !json.authenticated) {
            $('loginView').style.display = 'block';
            $('dashboardView').style.display = 'none';
            $('topbarActions').style.display = 'none';
            return;
        }

        $('loginView').style.display = 'none';
        $('dashboardView').style.display = 'block';
        $('topbarActions').style.display = 'flex';
        $('loginSuccessBanner').style.display = 'none';

        state.config = json.config;
        state.submissions = json.submissions || [];
        renderStorageInfo(json.storageMode);
        renderSecurityMeta(json.passwordUpdatedAt);
        renderWarnings(json.warnings);
        populateFormFromConfig();
        await loadAnalyticsAndHealth();
    }

    async function saveConfigToServer() {
        const btn = $('saveAllBtn');
        btn.disabled = true;
        btn.textContent = 'Saving...';
        try {
            const res = await fetch('/api/admin-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: state.config })
            });
            const json = await res.json();
            if (res.status === 401) {
                await loadAdminSession();
                throw new Error('Session expired or rotated. Please sign in again.');
            }
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Save failed');
            }
            state.config = json.config;
            renderStorageInfo(json.storageMode);
            renderWarnings(json.warnings);
            populateFormFromConfig();
            await loadAnalyticsAndHealth();
            showToast('All settings saved live!');
        } catch (err) {
            showToast(err.message, true);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save All Changes';
        }
    }

    function checkPasswordStrength(pw) {
        if (!pw) return { ok: false, text: 'Requires uppercase, lowercase, and a number or symbol.', cls: 'field-meta' };
        if (pw.length < 8) return { ok: false, text: 'Too short (minimum 8 characters).', cls: 'field-meta warn' };
        if (!/[A-Z]/.test(pw) || !/[a-z]/.test(pw) || !/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pw)) {
            return { ok: false, text: 'Include at least 1 uppercase, 1 lowercase, and 1 number or symbol.', cls: 'field-meta warn' };
        }
        return { ok: true, text: 'Strong password policy met.', cls: 'field-meta ok' };
    }

    async function submitPasswordReset({ superAdminPassword, newPassword, confirmPassword, errorEl, btn, onSuccess }) {
        errorEl.style.display = 'none';
        if (newPassword !== confirmPassword) {
            errorEl.textContent = 'New Admin passwords do not match.';
            errorEl.style.display = 'block';
            return;
        }
        const policy = checkPasswordStrength(newPassword);
        if (!policy.ok) {
            errorEl.textContent = policy.text;
            errorEl.style.display = 'block';
            return;
        }
        const origText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Updating...';
        try {
            const res = await fetch('/api/admin-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reset_password',
                    superAdminPassword,
                    newPassword
                })
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Password reset failed.');
            }
            onSuccess();
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = origText;
        }
    }

    function bindEvents() {
        $('togglePwBtn')?.addEventListener('click', () => {
            const inp = $('adminPasswordInput');
            const isPw = inp.type === 'password';
            inp.type = isPw ? 'text' : 'password';
            $('togglePwBtn').textContent = isPw ? 'Hide' : 'Show';
        });

        $('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errEl = $('loginError');
            errEl.style.display = 'none';
            const btn = $('loginSubmitBtn');
            btn.disabled = true;
            btn.textContent = 'Signing in...';
            try {
                const res = await fetch('/api/admin-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', password: $('adminPasswordInput').value })
                });
                const json = await res.json();
                if (!res.ok || !json.success) {
                    throw new Error(json.error || 'Login failed');
                }
                $('adminPasswordInput').value = '';
                await loadAdminSession();
            } catch (err) {
                errEl.textContent = err.message;
                errEl.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Sign In to Admin Portal';
            }
        });

        // Login screen Reset Admin Password toggle
        $('toggleLoginResetBtn')?.addEventListener('click', () => {
            const panel = $('loginResetForm');
            const open = panel.style.display === 'none';
            panel.style.display = open ? 'block' : 'none';
            $('loginResetError').style.display = 'none';
        });
        $('cancelLoginResetBtn')?.addEventListener('click', () => {
            $('loginResetForm').reset();
            $('loginResetForm').style.display = 'none';
            $('loginResetError').style.display = 'none';
        });
        $('loginResetForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitPasswordReset({
                superAdminPassword: $('loginSuperPwInput').value,
                newPassword: $('loginNewPwInput').value,
                confirmPassword: $('loginConfirmPwInput').value,
                errorEl: $('loginResetError'),
                btn: $('loginResetSubmitBtn'),
                onSuccess: () => {
                    $('loginResetForm').reset();
                    $('loginResetForm').style.display = 'none';
                    $('loginSuccessBanner').textContent = 'Admin password updated. Sign in with your new Admin password.';
                    $('loginSuccessBanner').style.display = 'block';
                }
            });
        });

        // Security tab Reset Admin Password
        $('secNewPwInput')?.addEventListener('input', (e) => {
            const info = checkPasswordStrength(e.target.value);
            const meta = $('secPwStrengthMeta');
            if (meta) {
                meta.textContent = info.text;
                meta.className = info.cls;
            }
        });
        $('adminResetForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitPasswordReset({
                superAdminPassword: $('secSuperPwInput').value,
                newPassword: $('secNewPwInput').value,
                confirmPassword: $('secConfirmPwInput').value,
                errorEl: $('secResetError'),
                btn: $('secResetSubmitBtn'),
                onSuccess: async () => {
                    $('adminResetForm').reset();
                    await loadAdminSession();
                    $('loginSuccessBanner').textContent = 'Admin password updated and active sessions signed out. Please sign in with the new password.';
                    $('loginSuccessBanner').style.display = 'block';
                }
            });
        });

        $('logoutBtn')?.addEventListener('click', async () => {
            await fetch('/api/admin-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            });
            await loadAdminSession();
        });

        $('saveAllBtn')?.addEventListener('click', saveConfigToServer);

        document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.admin-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const tabId = btn.getAttribute('data-tab');
                $(tabId).classList.add('active');
                if (tabId === 'analyticsTab') loadAnalyticsAndHealth();
            });
        });

        // Analytics toolbar bindings
        $('analyticsRangeSelect')?.addEventListener('change', loadAnalyticsAndHealth);
        $('exportAnalyticsCsvBtn')?.addEventListener('click', exportAnalyticsCsv);
        $('refreshAnalyticsBtn')?.addEventListener('click', loadAnalyticsAndHealth);
        $('runHealthCheckBtn')?.addEventListener('click', async () => {
            await loadAnalyticsAndHealth();
            showToast('Live site health & uptime check completed.');
        });
        $('clearAnalyticsBtn')?.addEventListener('click', async () => {
            const res = await fetch('/api/analytics', { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                await loadAnalyticsAndHealth();
                showToast('Analytics data cleared.');
            }
        });

        // Simulator (i) Tooltip click/escape toggle
        const simInfoBtn = $('simInfoBtn');
        const simInfoWrap = simInfoBtn ? simInfoBtn.closest('.info-tooltip-wrap') : null;
        if (simInfoBtn && simInfoWrap) {
            simInfoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = simInfoWrap.classList.toggle('open');
                simInfoBtn.setAttribute('aria-expanded', String(isOpen));
            });
            document.addEventListener('click', (e) => {
                if (!simInfoWrap.contains(e.target)) {
                    simInfoWrap.classList.remove('open');
                    simInfoBtn.setAttribute('aria-expanded', 'false');
                }
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    simInfoWrap.classList.remove('open');
                    simInfoBtn.setAttribute('aria-expanded', 'false');
                }
            });
        }

        // Phone Routing bindings
        $('phoneEnabledToggle')?.addEventListener('change', (e) => {
            state.config.phone.enabled = e.target.checked;
            setDirty(true);
            updateMasterPhoneUI();
            updateJsonPreview();
        });
        $('masterPhoneInput')?.addEventListener('input', (e) => {
            state.config.phone.masterNumber = e.target.value;
            setDirty(true);
            updateMasterPhoneUI();
            updateJsonPreview();
        });
        $('masterDisplayInput')?.addEventListener('input', (e) => {
            state.config.phone.masterDisplay = e.target.value;
            setDirty(true);
            updateMasterPhoneUI();
            updateJsonPreview();
        });
        $('masterOverrideToggle')?.addEventListener('change', (e) => {
            state.config.phone.masterOverrideAll = e.target.checked;
            setDirty(true);
            updateMasterPhoneUI();
            updateJsonPreview();
        });

        $('simCategorySelect')?.addEventListener('change', updateSimulator);
        $('simKeywordInput')?.addEventListener('input', updateSimulator);

        // Add Category form
        $('addCategoryForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const key = $('newCatKey').value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
            if (!key) return;
            if (state.config.categories.some(c => c.key === key)) {
                showToast(`Category key "${key}" already exists.`, true);
                return;
            }
            state.config.categories.push({
                key,
                label: $('newCatLabel').value.trim(),
                expertRole: $('newCatRole').value.trim(),
                keywords: $('newCatKeywords').value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
                phone: $('newCatPhone').value.trim(),
                email: $('newCatEmail').value.trim(),
                enabled: true,
                builtIn: false
            });
            e.target.reset();
            setDirty(true);
            renderCategories();
            renderSimulatorOptions();
            updateJsonPreview();
            showToast(`Category "${key}" added. Click "Save All Changes" to publish.`);
        });

        $('catSearchInput')?.addEventListener('input', renderCategories);

        // Email & Office bindings
        $('masterEmailInput')?.addEventListener('input', (e) => {
            state.config.email.masterEmail = e.target.value;
            setDirty(true);
            updateJsonPreview();
        });
        $('masterEmailOverrideToggle')?.addEventListener('change', (e) => {
            state.config.email.masterOverrideAll = e.target.checked;
            setDirty(true);
            updateJsonPreview();
        });
        const sectionBindings = [
            ['emailGeneral', 'general'],
            ['emailSupport', 'support'],
            ['emailBilling', 'billing'],
            ['emailPrivacy', 'privacy'],
            ['emailSecurity', 'security'],
            ['emailEscalations', 'escalations']
        ];
        sectionBindings.forEach(([id, sec]) => {
            $(id)?.addEventListener('input', (e) => {
                state.config.email.sections[sec] = e.target.value;
                setDirty(true);
                updateJsonPreview();
            });
        });

        $('officeAddressInput')?.addEventListener('input', (e) => {
            state.config.business.officeAddress = e.target.value;
            setDirty(true);
            updateJsonPreview();
        });
        $('hoursLabelInput')?.addEventListener('input', (e) => {
            state.config.business.hoursLabel = e.target.value;
            setDirty(true);
            updateJsonPreview();
        });

        // Inbox bindings
        $('inboxTypeFilter')?.addEventListener('change', renderInbox);
        $('inboxStatusFilter')?.addEventListener('change', renderInbox);
        $('refreshInboxBtn')?.addEventListener('click', loadAdminSession);

        // Export / Import bindings
        $('exportJsonBtn')?.addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(state.config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'answerdesk-site-config.json';
            a.click();
            URL.revokeObjectURL(url);
        });
        $('copyEnvJsonBtn')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(JSON.stringify(state.config));
                showToast('Copied minified SITE_CONFIG_JSON to clipboard.');
            } catch (_) {
                showToast('Copy failed — copy manually from preview box.', true);
            }
        });
        $('importJsonInput')?.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(String(reader.result));
                    state.config = parsed;
                    setDirty(true);
                    populateFormFromConfig();
                    setDirty(true);
                    showToast('Imported config! Click "Save All Changes" to publish.');
                } catch (_) {
                    showToast('Invalid JSON file.', true);
                }
            };
            reader.readAsText(file);
        });
    }

    bindEvents();
    loadAdminSession();
})();
