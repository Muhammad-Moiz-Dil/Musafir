// ── Auth guard ────────────────────────────────────────
const TOKEN = sessionStorage.getItem('tripify_token');
const USER  = JSON.parse(sessionStorage.getItem('tripify_user') || '{"fullName":"Tourist"}');
if (!TOKEN) { window.location.href = '../auth/login.html'; }

// ── State ─────────────────────────────────────────────
let allResults  = [];
let activeTag   = 'all';
let minRating   = 0;
let isLoading   = false;
let debounceTimer;

// ── Tag keyword map for local client-side filtering ───
const TAG_KEYWORDS = {
    mountain:  ['mountain', 'peak', 'glacier', 'karakoram', 'k2', 'nanga parbat', 'himalaya', 'alpine', 'high-altitude', 'highest'],
    valley:    ['valley', 'lush', 'green', 'river', 'kaghan', 'swat', 'meadow', 'plateau', 'confluenc'],
    adventure: ['adventure', 'trek', 'trekking', 'climbing', 'hiking', 'extreme', 'jeep', 'safari', 'base camp', 'trail', 'unpaved'],
    family:    ['family', 'hill station', 'resort', 'scenic', 'pleasant', 'murree', 'garden', 'park', 'viewpoint', 'chairlift'],
    cultural:  ['cultural', 'mughal', 'mosque', 'heritage', 'fort', 'civilization', 'civilisation', 'museum', 'ancient', 'historic', 'ruins', 'badshahi', 'indus', 'bazaar', 'stupa', 'buddhist', 'colonial', 'shrine', 'derawar', 'mohenjo', 'unesco']
};

// ── Wishlist state (loaded from backend on page ready) ────
let wishlist = []; // array of destination IDs

async function loadWishlistIds() {
    try {
        const res = await fetch(ENDPOINTS.FAVORITES.IDS, {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        if (res.ok) wishlist = await res.json();
    } catch (e) { /* network error — hearts stay empty, not critical */ }
}

// ── Image resolver — maps DB filenames to local assets ─
const IMG_BASE = '../../../../public/assets/images/';
// Legacy name aliases (old DB values → correct filename)
const IMG_MAP = {
    'hunza.jpg':         IMG_BASE + 'hunza-valley.jpg',
    'murree.jpg':        IMG_BASE + 'murree.jpeg',
    'skardu.jpg':        IMG_BASE + 'skardu.jpeg',
    'naran.jpg':         IMG_BASE + 'naran kaghan.jpg',
    'islamabad.jpg':     IMG_BASE + 'islamabad.jpeg',
    'fairy-meadows.jpg': IMG_BASE + 'fairyMeadows.jpeg',
    'mohenjo-daro.jpg':  IMG_BASE + 'mohenjodaro.jpeg',
    'cholistan.jpg':     IMG_BASE + 'cholistanDesert.jpeg',
    'peshawar.jpg':      IMG_BASE + 'peshawer.jpg',
    'kashmir.jpeg':      IMG_BASE + 'kasmir.jpeg',
    'kashmir.jpg':       IMG_BASE + 'kasmir.jpeg',
    'karachi.jpg':       IMG_BASE + 'karachi.webp',
    'gwadar.jpeg':       IMG_BASE + 'gawadar.jpeg',
    'gwadar.jpg':        IMG_BASE + 'gawadar.jpeg',
};
const IMG_FALLBACK = IMG_BASE + 'lahore.jpg';

function resolveImage(url) {
    if (!url) return IMG_FALLBACK;
    if (url.startsWith('/uploads/')) return 'http://localhost:8080' + url;
    if (url.startsWith('http')) return url;
    if (IMG_MAP[url]) return IMG_MAP[url];
    if (url.startsWith('/') || url.startsWith('../')) return url;
    return IMG_BASE + url;
}

// ── DOM refs ──────────────────────────────────────────
const grid        = document.getElementById('destGrid');
const searchInput = document.getElementById('destSearch');
const errorEl     = document.getElementById('searchError');
const countEl     = document.getElementById('resultsCount');

// ── Helpers ───────────────────────────────────────────
function ratingToStars(r) {
    const full = Math.floor(r);
    const half = r % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function clearError() {
    errorEl.textContent = '';
    searchInput.classList.remove('is-error');
}

function showInputError(msg) {
    errorEl.textContent = msg;
    searchInput.classList.add('is-error');
}

// ── Local filter + render ─────────────────────────────
function applyLocalFilters(items) {
    return items.filter(d => {
        const text = (d.name + ' ' + d.city + ' ' + d.description).toLowerCase();
        const matchTag = activeTag === 'all'
            || (TAG_KEYWORDS[activeTag] || [activeTag]).some(kw => text.includes(kw));
        const matchRating = !minRating || (d.averageRating >= minRating);
        return matchTag && matchRating;
    });
}

async function toggleWish(e, id) {
    e.stopPropagation();
    const btn = e.currentTarget;
    if (btn.disabled) return;
    btn.disabled = true;

    const inWish = wishlist.includes(id);
    const url    = ENDPOINTS.FAVORITES.ADD(id);
    const method = inWish ? 'DELETE' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });

        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }

        if (res.status === 409) {
            // Alternate flow: already in wishlist
            showToast('💛', 'This destination is already in your Favorites.');
            btn.disabled = false;
            return;
        }

        if (res.ok) {
            if (inWish) {
                wishlist = wishlist.filter(x => x !== id);
                showToast('🤍', 'Removed from wishlist');
            } else {
                wishlist.push(id);
                showToast('❤️', 'Added to Favorites!');
            }
            renderResults(allResults);
        } else {
            showToast('❌', 'Unable to add to Favorites now. Please try again later.');
        }
    } catch (err) {
        showToast('📶', 'Network error. Try again.');
    }

    btn.disabled = false;
}

function renderCard(d) {
    const rating  = d.averageRating ? Number(d.averageRating).toFixed(1) : '–';
    const reviews = d.totalReviews  || 0;
    const stars   = ratingToStars(d.averageRating || 0);
    const img     = resolveImage(d.imageUrl);
    const inWish  = wishlist.includes(d.id);
    return `
    <div class="dest-full-card" onclick="location.href='destination-detail.html?id=${d.id}'">
        <div class="dest-full-img">
            <img src="${img}" alt="${d.name}" loading="lazy"
                 onerror="this.src='../../../../public/assets/images/lahore.jpg'">
            <div class="dest-card-img-overlay"></div>
            <button class="dc-wish ${inWish ? 'active' : ''}"
                    onclick="toggleWish(event,${d.id})">${inWish ? '❤️' : '🤍'}</button>
        </div>
        <div class="dest-full-body">
            <div class="dest-full-name">${d.name}</div>
            <div class="dest-full-region">📍 ${d.city || 'Pakistan'}</div>
            <div class="dc-rating"><span class="stars">${stars}</span> ${rating} (${reviews} reviews)</div>
            <div class="dest-full-desc">${d.description || ''}</div>
            <div class="dest-full-footer">
                <span class="btn btn-sm btn-outline-accent">View Details →</span>
            </div>
        </div>
    </div>`;
}

function renderResults(items) {
    const filtered = applyLocalFilters(items);
    countEl.textContent = `${filtered.length} destination${filtered.length !== 1 ? 's' : ''} found`;
    if (!filtered.length) {
        grid.innerHTML = `<div class="no-results"><span>🔍</span><p>No destinations match your filters.<br>Try adjusting your search or filters.</p></div>`;
        return;
    }
    grid.innerHTML = filtered.map(d => renderCard(d)).join('');
}

function showGridMsg(icon, msg) {
    grid.innerHTML = `<div class="no-results"><span>${icon}</span><p>${msg}</p></div>`;
    countEl.textContent = '';
}

function showLoading() {
    grid.innerHTML = `<div class="no-results"><span style="display:inline-block;animation:spin 1s linear infinite">⏳</span><p>Searching destinations…</p></div>`;
    countEl.textContent = '';
}

// ── API search ────────────────────────────────────────
async function doSearch(rawQ) {
    if (isLoading) return;
    const q = rawQ.trim();

    clearError();

    // Client-side special-char validation (mirrors backend rule)
    if (q && !/^[a-zA-Z0-9 '\-]+$/.test(q)) {
        showInputError('Please use letters, numbers, hyphens or apostrophes only');
        allResults = [];
        grid.innerHTML = '';
        countEl.textContent = '';
        return;
    }

    isLoading = true;
    showLoading();

    try {
        const url = ENDPOINTS.DESTINATIONS.SEARCH + (q ? `?q=${encodeURIComponent(q)}` : '');
        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });

        if (res.status === 401) {
            showGridMsg('🔒', 'Please Login/Sign-up to search for the destination');
            allResults = [];
            return;
        }

        const data = await res.json();

        if (res.status === 400) {
            showInputError(data.message || 'Please use letters and numbers only');
            allResults = [];
            grid.innerHTML = '';
            countEl.textContent = '';
            return;
        }

        if (res.status === 404) {
            showGridMsg('🔍', data.message || 'No destinations found for this search');
            allResults = [];
            return;
        }

        if (!res.ok) {
            showGridMsg('❌', data.message || 'Something went wrong. Please try again.');
            allResults = [];
            return;
        }

        allResults = data;
        renderResults(allResults);

    } catch (e) {
        showGridMsg('📶', 'Network error. Please check your connection and that the server is running.');
        allResults = [];
    } finally {
        isLoading = false;
    }
}

// ── Event listeners ───────────────────────────────────
searchInput.addEventListener('input', e => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(e.target.value), 400);
});

document.getElementById('topSearch').addEventListener('input', e => {
    searchInput.value = e.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(e.target.value), 400);
});

document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTag = btn.dataset.filter;
        if (allResults.length) renderResults(allResults);
    });
});

document.getElementById('ratingFilter').addEventListener('change', e => {
    minRating = parseFloat(e.target.value) || 0;
    if (allResults.length) renderResults(allResults);
});

// ── Init: load wishlist IDs then destinations ──────────
const qp = new URLSearchParams(location.search);
loadWishlistIds().then(() => {
    if (qp.get('q')) {
        searchInput.value = qp.get('q');
        doSearch(qp.get('q'));
    } else {
        doSearch('');
    }
});

// ── User info ─────────────────────────────────────────
function applyUserProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('sidebarName').textContent = u.fullName || 'Tourist';
    const sa = document.getElementById('sidebarInitials');
    const ta = document.getElementById('topbarInitials');
    if (u.profilePicture && u.profilePicture !== '') {
        const imgTag = '<img src="http://localhost:8080' + u.profilePicture + '?t=' + Date.now() + '" alt="Avatar" onerror="this.parentElement.textContent=\'' + ini + '\'">';
        sa.innerHTML = imgTag;
        ta.innerHTML = imgTag;
    } else {
        sa.textContent = ini;
        ta.textContent = ini;
    }
}
applyUserProfile(USER);

// ── Sidebar toggle ────────────────────────────────────
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

// ── Toast ─────────────────────────────────────────────
function showToast(icon, msg, dur = 2800) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, dur);
}
