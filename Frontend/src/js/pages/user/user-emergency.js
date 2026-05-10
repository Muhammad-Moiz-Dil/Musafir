// ── Auth guard ─────────────────────────────────────────────
const tripToken = sessionStorage.getItem('tripify_token');
if (!tripToken) { window.location.href = '../auth/login.html'; }

// ── User profile ───────────────────────────────────────────
const user = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
function applyUserProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('sidebarName').textContent = u.fullName || 'Tourist';
    const sa = document.getElementById('sidebarInitials'), ta = document.getElementById('topbarInitials');
    if (u.profilePicture && u.profilePicture !== '') {
        const img = '<img src="http://localhost:8080' + u.profilePicture + '?t=' + Date.now() + '" alt="Avatar" onerror="this.parentElement.textContent=\'' + ini + '\'">';
        sa.innerHTML = img; ta.innerHTML = img;
    } else { sa.textContent = ini; ta.textContent = ini; }
}
applyUserProfile(user);

// ── Sidebar toggle ─────────────────────────────────────────
const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });

// ── SOS click to copy ──────────────────────────────────────
function showToast(icon, msg, dur=2800) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, dur);
}
document.querySelectorAll('.sos-num').forEach(el => {
    el.addEventListener('click', () => {
        const num = el.dataset.num;
        if (num) navigator.clipboard?.writeText(num).then(() => showToast('📋', `Copied ${num} to clipboard`));
    });
});

// ── Image resolver ─────────────────────────────────────────
const IMG_BASE = '../../../../public/assets/images/';
const IMG_MAP = {
    'hunza.jpg': IMG_BASE+'hunza-valley.jpg', 'murree.jpg': IMG_BASE+'murree.jpeg',
    'swat.jpg':  IMG_BASE+'swat.jpg',          'skardu.jpg': IMG_BASE+'skardu.jpeg',
    'naran.jpg': IMG_BASE+'naran kaghan.jpg',
    'lahore.jpg': IMG_BASE+'lahore.jpg',
    'islamabad.jpg': IMG_BASE+'islamabad.jpeg', 'islamabad.jpeg': IMG_BASE+'islamabad.jpeg',
    'fairy-meadows.jpg': IMG_BASE+'fairyMeadows.jpeg', 'fairyMeadows.jpeg': IMG_BASE+'fairyMeadows.jpeg',
    'mohenjo-daro.jpg':  IMG_BASE+'mohenjodaro.jpeg',  'mohenjodaro.jpeg': IMG_BASE+'mohenjodaro.jpeg',
    'cholistan.jpg': IMG_BASE+'cholistanDesert.jpeg',  'cholistanDesert.jpeg': IMG_BASE+'cholistanDesert.jpeg',
};
function resolveImage(url) {
    if (!url) return IMG_BASE + 'hunza-valley.jpg';
    if (url.startsWith('/uploads')) return API_CONFIG.BASE_URL.replace('/api', '') + url;
    if (url.startsWith('http')) return url;
    if (IMG_MAP[url]) return IMG_MAP[url];
    if (url.startsWith('/') || url.startsWith('../')) return url;
    return IMG_BASE + url;
}

// ── Icon map for guideline categories ─────────────────────
const CAT_ICONS = {
    Safety:  '🛡️', Health: '🏥', Culture: '👗',
    Season:  '🌤️', General:'📋', Food:   '🍽️',
};
function catIcon(cat) { return CAT_ICONS[cat] || '📋'; }

// ── State ──────────────────────────────────────────────────
let allDestinations = [];
let activeDestId = null;
let bookmarkedIds = new Set();

// ── Destination search widget ──────────────────────────────
(function(){
    const input = document.getElementById('destSearchInput');
    const dropdown = document.getElementById('destSearchDropdown');
    const clearBtn = document.getElementById('destSearchClear');
    let timer;
    async function search(q) {
        try {
            const res = await fetch(ENDPOINTS.DESTINATIONS.SEARCH + '?q=' + encodeURIComponent(q.trim()), {
                headers: { 'Authorization': 'Bearer ' + tripToken }
            });
            if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
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
            `<div class="dest-search-item" data-id="${d.id||d.destinationId}" data-name="${d.name}">${d.name}${d.city ? ` <span class="dsrc-city">— ${d.city}</span>` : ''}</div>`
        ).join('');
        dropdown.style.display = 'block';
        dropdown.querySelectorAll('.dest-search-item').forEach(el => {
            el.addEventListener('mousedown', e => {
                e.preventDefault();
                input.value = el.dataset.name;
                clearBtn.style.display = 'inline';
                hideDropdown();
                selectDest(parseInt(el.dataset.id));
            });
        });
    }
    function hideDropdown() { dropdown.style.display = 'none'; }
    input.addEventListener('input', e => {
        clearBtn.style.display = e.target.value ? 'inline' : 'none';
        clearTimeout(timer);
        if (!e.target.value.trim()) { hideDropdown(); return; }
        timer = setTimeout(() => search(e.target.value), 300);
    });
    clearBtn.addEventListener('click', () => {
        input.value = ''; clearBtn.style.display = 'none'; hideDropdown();
        document.getElementById('destPanel').innerHTML = '<div class="spin-wrap"><p style="color:var(--t3);font-size:13px">Select a destination above to view its emergency contacts and safety guidelines.</p></div>';
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#destSearchWrap')) hideDropdown();
    });
})();

// ── Populate destination count badge ──────────────────────
function renderTabs(dests) {
    document.getElementById('destLoadBadge').textContent = dests.length + ' Destinations';
    document.getElementById('destLoadBadge').className = 'badge badge-accent';
}

// ── Select & load destination emergency info ───────────────
async function selectDest(id) {
    if (activeDestId === id) return;
    activeDestId = id;

    const panel = document.getElementById('destPanel');
    panel.innerHTML = `<div class="spin-wrap"><div style="font-size:28px;animation:spin 1s linear infinite;display:inline-block">⏳</div><p style="margin-top:10px;color:var(--t2)">Loading emergency info…</p></div>`;

    try {
        const res = await fetch(ENDPOINTS.EMERGENCY.BY_DESTINATION(id), {
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });

        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }

        if (!res.ok) {
            panel.innerHTML = `
            <div class="emg-unavailable">
                <div class="eu-icon">⚠️</div>
                <p><b>Emergency contact information is currently unavailable for this location.</b><br>
                Please call the national Tourist Helpline <b style="color:var(--accent)">1422</b> or try again later.</p>
                <button class="btn btn-ghost btn-sm" style="margin-top:14px" onclick="selectDest(${id})">🔄 Retry</button>
            </div>`;
            return;
        }

        const emg = await res.json();
        const c   = emg.contacts;
        const dest = allDestinations.find(d => d.destinationId === id);
        const img  = dest ? resolveImage(dest.imageUrl) : '';
        const isBookmarked = bookmarkedIds.has(id);

        // Chip helper
        const chip = (label, val, cls='') =>
            `<div class="dep-contact-chip ${cls}" onclick="copyNum('${val}','${label}')">
                <span class="dep-chip-label">${label}</span>
                <span class="dep-chip-val">${val}</span>
             </div>`;

        // Guidelines HTML
        let guideHtml = '';
        if (emg.guidelines && emg.guidelines.length > 0) {
            guideHtml = `
            <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:18px">
                <div style="font-size:14px;font-weight:700;color:var(--white);margin-bottom:14px">🛡️ Safety Guidelines for ${emg.destinationName}</div>
                <div style="display:flex;flex-direction:column;gap:12px">
                ${emg.guidelines.map(g => `
                    <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--border)">
                        <span style="font-size:20px;flex-shrink:0">${catIcon(g.category)}</span>
                        <div>
                            <div style="font-size:13.5px;font-weight:700;color:var(--white);margin-bottom:4px">${escapeHtml(g.title)}</div>
                            <div style="font-size:12.5px;color:var(--t2);line-height:1.7">${escapeHtml(g.content)}</div>
                        </div>
                    </div>`).join('')}
                </div>
            </div>`;
        } else {
            guideHtml = `
            <div style="margin-top:18px;padding:14px;border-radius:var(--r-sm);background:rgba(255,255,255,0.03);border:1px dashed var(--border);color:var(--t3);font-size:12.5px;text-align:center">
                No destination-specific safety guidelines available. See <b>General Travel Safety Guidelines</b> below.
            </div>`;
        }

        // Covid rules HTML
        let covidHtml = '';
        if (c.covidRules) {
            covidHtml = `
            <div class="covid-section">
                <div class="covid-header">
                    <span class="covid-header-icon">🦠</span>
                    <span class="covid-header-title">COVID-19 Travel Guidelines</span>
                    <span class="covid-header-badge">✓ Restrictions Lifted</span>
                </div>
                <div class="covid-text">${c.covidRules}</div>
            </div>`;
        }

        panel.innerHTML = `
        <div class="dest-emg-panel">
            <div class="dep-header">
                ${img ? `<img class="dep-img" src="${img}" alt="${emg.destinationName}" onerror="this.style.display='none'">` : ''}
                <div>
                    <div class="dep-name">${emg.destinationName}</div>
                    <div class="dep-region">📍 ${emg.city}</div>
                </div>
                <div style="margin-left:auto;display:flex;align-items:center;gap:10px">
                    ${!c.available ? '<span class="badge badge-warning">Limited Data</span>' : '<span class="badge badge-accent">✓ Verified</span>'}
                    <button id="bookmarkBtn" class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark(${id})">
                        ${isBookmarked ? '🔖 Bookmarked' : '🔖 Bookmark'}
                    </button>
                </div>
            </div>

            <div class="dep-contacts-grid">
                ${chip('🚔 Local Police',      c.policeNumber)}
                ${chip('🚑 Ambulance/Rescue',  c.ambulanceNumber)}
                ${chip('🔥 Fire Service',       c.fireService)}
                ${chip('📞 Tourist Helpline',   c.touristHelpline,  'accent-chip')}
                ${chip('🏥 Nearest Hospital',   c.nearestHospital,  'neutral-chip')}
                ${chip('🏳️ Embassy Contact',    c.embassyContact,   'neutral-chip')}
            </div>

            <p style="font-size:11.5px;color:var(--t3);margin-top:-8px;margin-bottom:4px">
                💡 Click any contact to copy the number to clipboard
            </p>

            ${covidHtml}

            ${guideHtml}

            <div style="margin-top:16px">
                <a href="destination-detail.html?id=${id}" class="btn btn-ghost btn-sm">← View Full Destination Details</a>
            </div>
        </div>`;

    } catch (e) {
        panel.innerHTML = `
        <div class="emg-unavailable">
            <div class="eu-icon">📶</div>
            <p>Emergency contact information is currently unavailable for this location.<br>
            Check your connection or contact the national Tourist Helpline: <b style="color:var(--accent)">1422</b></p>
            <button class="btn btn-ghost btn-sm" style="margin-top:14px" onclick="selectDest(${id})">🔄 Retry</button>
        </div>`;
    }
}

// ── Bookmark / un-bookmark a destination ──────────────────
async function toggleBookmark(destId) {
    const btn = document.getElementById('bookmarkBtn');
    const isNowBookmarked = bookmarkedIds.has(destId);
    const method = isNowBookmarked ? 'DELETE' : 'POST';
    const url    = isNowBookmarked
        ? ENDPOINTS.FAVORITES.REMOVE(destId)
        : ENDPOINTS.FAVORITES.ADD(destId);

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }

        if (res.ok) {
            if (isNowBookmarked) {
                bookmarkedIds.delete(destId);
                if (btn) { btn.textContent = '🔖 Bookmark'; btn.classList.remove('bookmarked'); }
                showToast('🔖', 'Removed from wishlist');
            } else {
                bookmarkedIds.add(destId);
                if (btn) { btn.textContent = '🔖 Bookmarked'; btn.classList.add('bookmarked'); }
                showToast('⭐', 'Added to wishlist!');
            }
        } else {
            showToast('⚠️', 'Could not update wishlist. Try again.');
        }
    } catch {
        showToast('⚠️', 'Network error. Check your connection.');
    }
}

// ── Load bookmarked destination IDs ───────────────────────
async function loadBookmarks() {
    try {
        const res = await fetch(ENDPOINTS.FAVORITES.IDS, {
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (res.ok) {
            const ids = await res.json();
            bookmarkedIds = new Set(Array.isArray(ids) ? ids.map(Number) : []);
        }
    } catch { /* silent */ }
}

// ── Copy number to clipboard ───────────────────────────────
function copyNum(label, val) {
    navigator.clipboard?.writeText(val).then(() => showToast('📋', `Copied ${val}`));
}


// ── Load all destinations and build tabs ──────────────────
async function loadAllDestinations() {
    try {
        const res = await fetch(ENDPOINTS.DESTINATIONS.SEARCH, {
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        if (!res.ok) throw new Error('Failed');

        const data = await res.json();
        allDestinations = Array.isArray(data) ? data.map(d => ({
            destinationId: d.id,
            name: d.name,
            city: d.city,
            imageUrl: d.imageUrl,
        })) : [];

        renderTabs(allDestinations);

        // Auto-select from URL param ?dest=id
        const urlId = parseInt(new URLSearchParams(location.search).get('dest'));
        if (urlId && allDestinations.find(d => d.destinationId === urlId)) {
            selectDest(urlId);
        } else if (allDestinations.length > 0) {
            selectDest(allDestinations[0].destinationId);
        }

    } catch (e) {
        document.getElementById('destTabs').innerHTML =
            `<div style="color:var(--t3);font-size:13px;padding:10px">⚠️ Could not load destinations. Check that the server is running.</div>`;
        document.getElementById('destLoadBadge').textContent = 'Offline';
        document.getElementById('destLoadBadge').className = 'badge badge-warning';
    }
}

loadBookmarks();
loadAllDestinations();
