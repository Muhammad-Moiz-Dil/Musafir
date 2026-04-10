// ── Auth guard ────────────────────────────────────────────────
const TOKEN = sessionStorage.getItem('tripify_token');
if (!TOKEN) { window.location.href = '../auth/login.html'; }

const USER = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');

// ── Category display metadata (icon + friendly label) ─────────
const CATEGORY_META = {
    'Visa':      { icon: '🛂', label: 'Visa & Entry' },
    'Safety':    { icon: '🛡️', label: 'Safety & Security' },
    'Culture':   { icon: '🎭', label: 'Culture & Etiquette' },
    'Health':    { icon: '💊', label: 'Health & Medical' },
    'Transport': { icon: '🚌', label: 'Getting Around' },
    'Weather':   { icon: '🌤️', label: 'Weather & Climate' },
    'General':   { icon: '📌', label: 'General Information' },
};

function getCategoryMeta(cat) {
    return CATEGORY_META[cat] || { icon: '📄', label: cat || 'General' };
}

// ── User profile ─────────────────────────────────────────────
function applyUserProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('sidebarName').textContent = u.fullName || 'Traveller';
    const sa = document.getElementById('sidebarInitials');
    const ta = document.getElementById('topbarInitials');
    if (u.profilePicture && u.profilePicture !== '') {
        const tag = '<img src="http://localhost:8080' + u.profilePicture + '?t=' + Date.now()
                  + '" alt="Avatar" onerror="this.parentElement.textContent=\'' + ini + '\'">';
        sa.innerHTML = tag;
        ta.innerHTML = tag;
    } else {
        sa.textContent = ini;
        ta.textContent = ini;
    }
}
if (USER.fullName) applyUserProfile(USER);

// ── Sidebar toggle ────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
});
overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
});

// ── Toast helper ──────────────────────────────────────────────
function showToast(icon, msg, dur = 2800) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, dur);
}

// ── Output helpers ────────────────────────────────────────────

/** Show a full-width loading spinner while fetching */
function showLoading() {
    document.getElementById('glOutput').innerHTML = `
        <div class="gl-loading">
            <div class="gl-spinner"></div>
            <p>Fetching guidelines…</p>
        </div>`;
}

/**
 * Alternate flow: destination exists in DB but no guidelines stored yet.
 * Requirement: display the official-sites fallback message.
 */
function showNoGuidelines(destName) {
    document.getElementById('glOutput').innerHTML = `
        <div class="gl-no-data">
            <div class="gl-no-icon">📭</div>
            <div class="gl-no-title">Guidelines Unavailable</div>
            <div class="gl-no-msg">
                Guidelines for this region are being updated.
                Please check the Official Government sites.
            </div>
            <a href="https://www.tourism.gov.pk" target="_blank" rel="noopener" class="gl-gov-link">
                🌐 Visit Pakistan Tourism Portal →
            </a>
        </div>`;
}

/** Network / unexpected error state */
function showError(msg) {
    document.getElementById('glOutput').innerHTML = `
        <div class="gl-placeholder">
            <span>❌</span>
            <p>${msg}</p>
        </div>`;
}

/**
 * Group guidelines by category and render them as accordion cards.
 * Each category gets a labelled section; each guideline is a collapsible card.
 */
function renderGuidelines(guidelines, destName, destCity) {
    // Group by category preserving sorted order from API
    const grouped = {};
    guidelines.forEach(g => {
        const cat = g.category || 'General';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(g);
    });

    const total = guidelines.length;
    const cityText = destCity ? ` · ${destCity}` : '';

    let html = `
        <div class="gl-dest-header">
            <div>
                <div class="gl-dest-title">📍 ${destName}</div>
                <div class="gl-dest-city">${cityText}</div>
            </div>
            <span class="gl-badge-count">${total} guideline${total !== 1 ? 's' : ''}</span>
        </div>`;

    // Render one section per category
    Object.entries(grouped).forEach(([cat, items]) => {
        const meta = getCategoryMeta(cat);
        html += `
        <div class="gl-category-section">
            <div class="gl-category-header">
                <span class="gl-category-icon">${meta.icon}</span>
                <span class="gl-category-name">${meta.label}</span>
                <span class="gl-category-count">${items.length}</span>
            </div>`;

        // Render each guideline as a collapsible accordion card
        items.forEach(g => {
            html += `
            <div class="gl-card" id="gl-${g.id}">
                <div class="gl-card-header" onclick="toggleCard('gl-${g.id}')">
                    <span class="gl-card-title">${escapeHtml(g.title)}</span>
                    <span class="gl-card-chevron">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                </div>
                <div class="gl-card-body">
                    <div class="gl-card-content">${escapeHtml(g.content)}</div>
                </div>
            </div>`;
        });

        html += `</div>`; // end gl-category-section
    });

    document.getElementById('glOutput').innerHTML = html;
}

/** Toggle accordion card open/closed */
function toggleCard(id) {
    const card = document.getElementById(id);
    if (card) card.classList.toggle('open');
}

// ── Destination search widget ─────────────────────────────────
(function(){
    const input = document.getElementById('destSearchInput');
    const dropdown = document.getElementById('destSearchDropdown');
    const clearBtn = document.getElementById('destSearchClear');
    let timer;
    async function search(q) {
        try {
            const res = await fetch(ENDPOINTS.DESTINATIONS.SEARCH + '?q=' + encodeURIComponent(q.trim()), {
                headers: { 'Authorization': 'Bearer ' + TOKEN }
            });
            if (res.status === 401) { AuthService.logout(); return; }
            const data = await res.json();
            showDropdown(Array.isArray(data) ? data : []);
        } catch(e) { showDropdown([]); }
    }
    function showDropdown(items) {
        if (!items.length) {
            dropdown.innerHTML = '<div class="dest-no-result">🔍 No destination found</div>';
            dropdown.style.display = 'block'; return;
        }
        dropdown.innerHTML = items.map(d =>
            `<div class="dest-search-item" data-id="${d.id}" data-name="${d.name}" data-city="${d.city||''}">${d.name}${d.city ? ` <span class="dsrc-city">— ${d.city}</span>` : ''}</div>`
        ).join('');
        dropdown.style.display = 'block';
        dropdown.querySelectorAll('.dest-search-item').forEach(el => {
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                input.value = el.dataset.name;
                clearBtn.style.display = 'inline';
                hideDropdown();
                loadGuidelines(el.dataset.id, el.dataset.name, el.dataset.city);
            });
        });
    }
    function hideDropdown() { dropdown.style.display = 'none'; }
    input.addEventListener('input', e => {
        clearBtn.style.display = e.target.value ? 'inline' : 'none';
        clearTimeout(timer);
        if (!e.target.value.trim()) {
            hideDropdown();
            document.getElementById('glOutput').innerHTML = `<div class="gl-placeholder"><span>📋</span><p>Select a destination above to view its travel guidelines.<br>Guidelines include visa info, cultural etiquette, safety tips, and more.</p></div>`;
            return;
        }
        timer = setTimeout(() => search(e.target.value), 300);
    });
    clearBtn.addEventListener('click', () => {
        input.value = ''; clearBtn.style.display = 'none'; hideDropdown();
        document.getElementById('glOutput').innerHTML = `<div class="gl-placeholder"><span>📋</span><p>Select a destination above to view its travel guidelines.<br>Guidelines include visa info, cultural etiquette, safety tips, and more.</p></div>`;
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#destSearchWrap')) hideDropdown();
    });

    // Pre-select via ?dest= query param
    const qp = new URLSearchParams(location.search);
    const preId = qp.get('dest');
    if (preId) {
        fetch(ENDPOINTS.DESTINATIONS.BY_ID(preId), { headers: { 'Authorization': 'Bearer ' + TOKEN } })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (d) {
                    input.value = d.name;
                    clearBtn.style.display = 'inline';
                    loadGuidelines(preId, d.name, d.city || '');
                }
            }).catch(() => {});
    }
})();

// ── Load destination dropdown (kept for compatibility) ────────
async function loadDestinations() {
    // No-op: destinations are now searched via the search widget
}

// ── Fetch and display guidelines for the selected destination ──
async function loadGuidelines(destId, destName, destCity) {
    showLoading();
    try {
        const res = await fetch(ENDPOINTS.GUIDELINES.BY_DEST(destId), {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });

        // 401: session expired mid-page
        if (res.status === 401) {
            AuthService.logout();
            return;
        }

        // 403: wrong role
        if (res.status === 403) {
            showError("You don't have permission to view guidelines.");
            return;
        }

        const data = await res.json();

        if (res.status === 404) {
            // Alternate flow: destination not found OR no guidelines in DB yet
            showNoGuidelines(destName);
            return;
        }

        if (!res.ok) {
            // 500 or unexpected — show generic retry message
            showError('Something went wrong loading guidelines. Please try again.');
            showToast('❌', data.message || 'Server error. Please retry.', 4000);
            return;
        }

        // Success — render the grouped accordion
        renderGuidelines(data, destName, destCity);

    } catch (e) {
        // Network failure
        showError('Network error. Please check your connection and try again.');
        showToast('📶', 'Network error — could not load guidelines.', 4000);
    }
}

// ── Kick off (no-op since search widget handles everything) ───
loadDestinations();
