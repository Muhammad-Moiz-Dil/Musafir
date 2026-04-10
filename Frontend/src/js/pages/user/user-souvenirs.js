// ── Auth guard ──────────────────────────────────────────
const TOKEN = sessionStorage.getItem('tripify_token');
const USER  = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
if (!TOKEN) { window.location.href = '../auth/login.html'; }

// ── Profile picture ─────────────────────────────────────
(function applyProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('sidebarName').textContent = u.fullName || 'Tourist';
    const sa = document.getElementById('sidebarInitials');
    const ta = document.getElementById('topbarInitials');
    if (u.profilePicture && u.profilePicture !== '') {
        const url = 'http://localhost:8080' + u.profilePicture + '?t=' + Date.now();
        sa.innerHTML = '<img src="' + url + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.textContent=\'' + ini + '\'">';
        ta.innerHTML = '<img src="' + url + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.textContent=\'' + ini + '\'">';
    } else {
        sa.textContent = ini;
        ta.textContent = ini;
    }
})(USER);

// ── Sidebar toggle ──────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', () => {
    sidebar.classList.toggle('open'); overlay.classList.toggle('show');
});
overlay.addEventListener('click', () => {
    sidebar.classList.remove('open'); overlay.classList.remove('show');
});

// ── Toast ───────────────────────────────────────────────
function showToast(icon, msg, dur = 2800) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, dur);
}

// ── Local image map (name → path relative to this page) ─
const SOUVENIR_IMG = {
    'hunza cap':     '../../../../public/assets/images/hunza cap.png',
    'apricot jam':   '../../../../public/assets/images/Apricot Jam.png',
    'shawls':        '../../../../public/assets/images/shawls.png',
    'emerald stone': '../../../../public/assets/images/emeralds.png',
    'emerald':       '../../../../public/assets/images/emeralds.png',
};
function getSouvenirImg(s) {
    if (s.imageUrl) {
        return s.imageUrl.startsWith('/uploads/')
            ? API_CONFIG.BASE_URL.replace('/api', '') + s.imageUrl
            : s.imageUrl;
    }
    return SOUVENIR_IMG[(s.name || '').toLowerCase()] || null;
}

// ── DOM refs ────────────────────────────────────────────
const grid       = document.getElementById('souvGrid');
const countLabel = document.getElementById('countLabel');

// ── State ───────────────────────────────────────────────
let currentSouvenirs = [];
let searchQuery = '';

// ── Render helpers ──────────────────────────────────────
function showPlaceholder() {
    grid.innerHTML = '<div class="souv-empty"><span>🗺️</span><p>Select a destination above to discover local souvenirs.</p></div>';
    countLabel.textContent = '';
}

function showLoading() {
    grid.innerHTML = '<div class="souv-empty"><span style="animation:spin 1s linear infinite">⏳</span><p>Loading souvenirs…</p></div>';
    countLabel.textContent = '';
}

function showEmpty() {
    grid.innerHTML = '<div class="souv-empty"><span>🎁</span><p>No local souvenirs listed for this area yet. Check back soon.</p></div>';
    countLabel.textContent = '';
}

function showError(msg) {
    grid.innerHTML = '<div class="souv-empty"><span>📶</span><p>' + msg + '</p></div>';
    countLabel.textContent = '';
}

function renderCard(s) {
    const imgSrc  = getSouvenirImg(s);
    const imgHtml = imgSrc
        ? '<img src="' + imgSrc + '" alt="' + s.name + '" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=&quot;souv-img-placeholder&quot;>🎁</div>\'">'
        : '<div class="souv-img-placeholder">🎁</div>';
    return '<div class="souv-card" onclick="openModal(' + s.id + ')">' +
        '<div class="souv-img">' + imgHtml + '</div>' +
        '<div class="souv-body">' +
            '<div class="souv-name">' + s.name + '</div>' +
            (s.vendorName ? '<div class="souv-vendor">🏪 ' + s.vendorName + '</div>' : '') +
            (s.description ? '<div class="souv-desc">' + s.description + '</div>' : '') +
            '<span class="souv-dest-tag">📍 ' + (s.destinationName || 'Pakistan') + '</span>' +
        '</div></div>';
}

function renderGrid() {
    let items = currentSouvenirs;
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter(s =>
            (s.name || '').toLowerCase().includes(q) ||
            (s.description || '').toLowerCase().includes(q) ||
            (s.vendorName || '').toLowerCase().includes(q)
        );
    }
    if (!items.length) { showEmpty(); return; }
    countLabel.textContent = items.length + ' souvenir' + (items.length !== 1 ? 's' : '') + ' found';
    grid.innerHTML = items.map(renderCard).join('');
}

// ── Modal ───────────────────────────────────────────────
const modalOverlay = document.getElementById('souvModal');

function openModal(id) {
    const s = currentSouvenirs.find(x => x.id === id);
    if (!s) return;
    const imgEl  = document.getElementById('souvModalImg');
    const imgSrc = getSouvenirImg(s);
    imgEl.innerHTML = imgSrc
        ? '<img class="souv-modal-img" src="' + imgSrc + '" alt="' + s.name + '" onerror="this.outerHTML=\'<div class=&quot;souv-modal-img-placeholder&quot;>🎁</div>\'">'
        : '<div class="souv-modal-img-placeholder">🎁</div>';
    document.getElementById('souvModalName').textContent = s.name || '';
    document.getElementById('souvModalDesc').textContent = s.description || 'No description available.';
    document.getElementById('souvModalVendor').textContent = s.vendorName ? '🏪 ' + s.vendorName : '';
    const meta = [];
    if (s.destinationName) meta.push('📍 ' + s.destinationName);
    document.getElementById('souvModalMeta').innerHTML = meta.map(t => '<span class="souv-modal-tag">' + t + '</span>').join('');
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
}

document.getElementById('souvModalClose').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Load destinations (no-op — search widget handles lookup) ──
async function loadDestinations() { return; }

// ── Load souvenirs for selected destination ─────────────
async function loadSouvenirs(destId) {
    showLoading();
    try {
        const res = await fetch(ENDPOINTS.SOUVENIRS.BY_DESTINATION(destId), {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        if (res.status === 404) { currentSouvenirs = []; showEmpty(); return; }
        if (!res.ok) { showError('Something went wrong. Please try again later.'); return; }
        const data = await res.json();
        currentSouvenirs = Array.isArray(data) ? data : [];
        if (!currentSouvenirs.length) { showEmpty(); return; }
        renderGrid();
    } catch (e) {
        showError('Network error. Please check your connection and try again.');
    }
}

// ── Destination search widget ────────────────────────────
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
                searchQuery = '';
                loadSouvenirs(el.dataset.id);
            });
        });
    }
    function hideDropdown() { dropdown.style.display = 'none'; }
    input.addEventListener('input', e => {
        clearBtn.style.display = e.target.value ? 'inline' : 'none';
        clearTimeout(timer);
        if (!e.target.value.trim()) { hideDropdown(); currentSouvenirs = []; showPlaceholder(); return; }
        timer = setTimeout(() => search(e.target.value), 300);
    });
    clearBtn.addEventListener('click', () => {
        input.value = ''; clearBtn.style.display = 'none'; hideDropdown();
        currentSouvenirs = []; showPlaceholder();
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#destSearchWrap')) hideDropdown();
    });
})();

// ── Boot ────────────────────────────────────────────────
showPlaceholder();
loadDestinations();
