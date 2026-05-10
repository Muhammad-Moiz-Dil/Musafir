// ── Auth guard ─────────────────────────────────────────────
const TOKEN = sessionStorage.getItem('tripify_token');
if (!TOKEN) { window.location.href = '../auth/login.html'; }

// ── State ─────────────────────────────────────────────────
let wishItems = []; // full destination objects from backend
let removing  = false; // prevent double-submit on remove

function starStr(r) { return '★'.repeat(Math.floor(r)) + (r%1>=0.5?'½':'') + '☆'.repeat(5-Math.floor(r)-(r%1>=0.5?1:0)); }

// ── Image resolver ─────────────────────────────────────────
const IMG_BASE = '../../../../public/assets/images/';
const IMG_MAP = {
    'hunza.jpg':'hunza-valley.jpg','murree.jpg':'murree.jpeg','swat.jpg':'swat.jpg',
    'skardu.jpg':'skardu.jpeg','naran.jpg':'naran kaghan.jpg',
    'lahore.jpg':'lahore.jpg','islamabad.jpg':'islamabad.jpeg','islamabad.jpeg':'islamabad.jpeg',
    'fairy-meadows.jpg':'fairyMeadows.jpeg','fairyMeadows.jpeg':'fairyMeadows.jpeg',
    'mohenjo-daro.jpg':'mohenjodaro.jpeg','mohenjodaro.jpeg':'mohenjodaro.jpeg',
    'cholistan.jpg':'cholistanDesert.jpeg','cholistanDesert.jpeg':'cholistanDesert.jpeg',
};
function resolveImg(url) {
    if (!url) return IMG_BASE + 'hunza-valley.jpg';
    if (url.startsWith('/uploads')) return API_CONFIG.BASE_URL.replace('/api', '') + url;
    if (url.startsWith('http')) return url;
    if (IMG_MAP[url]) return IMG_BASE + IMG_MAP[url];
    if (url.startsWith('/') || url.startsWith('../')) return url;
    return IMG_BASE + url;
}

// ── Stats ──────────────────────────────────────────────────
function renderStats() {
    const avgRating = wishItems.length
        ? (wishItems.reduce((s,d) => s + (d.averageRating||0), 0) / wishItems.length).toFixed(1)
        : '—';
    const regions = [...new Set(wishItems.map(d => d.city))].length;
    document.getElementById('wishStats').innerHTML = `
    <div class="wstat"><div class="wstat-num">${wishItems.length}</div><div class="wstat-lbl">Saved</div></div>
    <div class="wstat"><div class="wstat-num">${avgRating}</div><div class="wstat-lbl">Avg Rating</div></div>
    <div class="wstat"><div class="wstat-num">${regions}</div><div class="wstat-lbl">Regions</div></div>`;
}

// ── Render grid ────────────────────────────────────────────
function render() {
    renderStats();
    const items = wishItems;
    const g = document.getElementById('wishGrid');
    if (!items.length) {
        g.innerHTML = `<div class="wish-empty-state">
            <div style="font-size:52px">🤍</div>
            <h3>Your wishlist is empty</h3>
            <p>Start exploring Pakistan's destinations and save your favourites!</p>
            <a href="destinations.html" class="btn btn-primary">🔍 Explore Destinations</a>
        </div>`;
        return;
    }
    g.innerHTML = items.map(d => `
    <div class="wish-full-card" id="wcard-${d.id}">
        <div class="wfc-img">
            <img src="${resolveImg(d.imageUrl)}" alt="${d.name}" loading="lazy"
                 onerror="this.src='${IMG_BASE}hunza-valley.jpg'">
            <div class="wfc-img-overlay"></div>
        </div>
        <div class="wfc-body">
            <div class="wfc-name">${d.name}</div>
            <div class="wfc-region">📍 ${d.city || 'Pakistan'}</div>
            <div class="wfc-rating"><span class="stars">${starStr(d.averageRating||0)}</span> ${d.averageRating ? Number(d.averageRating).toFixed(1) : '–'} (${d.totalReviews||0} reviews)</div>
            <div class="wfc-desc">${d.description || ''}</div>
            <div class="wfc-actions">
                <a href="destination-detail.html?id=${d.id}" class="btn btn-primary btn-sm" style="flex:1;justify-content:center">View Details</a>
                <a href="hotels.html?dest=${d.id}" class="btn btn-ghost btn-sm">🏨</a>
            </div>
        </div>
        <button class="wfc-remove" onclick="removeItem(${d.id}, this)" title="Remove">✕</button>
    </div>`).join('');
}

// ── Remove one item ────────────────────────────────────────
async function removeItem(id, btn) {
    if (removing) return;
    removing = true;
    btn.disabled = true;

    try {
        const res = await fetch(ENDPOINTS.FAVORITES.REMOVE(id), {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        if (res.status === 401) { AuthService.logout(); return; }

        if (res.ok) {
            wishItems = wishItems.filter(d => d.id !== id);
            render();
            showToast('🗑️', 'Removed from wishlist');
        } else {
            showToast('❌', 'Could not remove. Try again.');
            btn.disabled = false;
        }
    } catch (e) {
        showToast('📶', 'Network error. Try again.');
        btn.disabled = false;
    }
    removing = false;
}

// ── Clear all ──────────────────────────────────────────────
async function clearAll() {
    if (!wishItems.length) return;
    if (!confirm('Remove all destinations from your wishlist?')) return;

    // Fire all DELETE requests in parallel
    const ids = wishItems.map(d => d.id);
    await Promise.all(ids.map(id =>
        fetch(ENDPOINTS.FAVORITES.REMOVE(id), {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        }).catch(() => {})
    ));

    wishItems = [];
    render();
    showToast('🗑️', 'Wishlist cleared');
}

// ── Load wishlist from backend ─────────────────────────────
async function loadWishlist() {
    const g = document.getElementById('wishGrid');
    g.innerHTML = `<div class="wish-empty-state"><div style="font-size:36px">⏳</div><p>Loading…</p></div>`;

    try {
        const res = await fetch(ENDPOINTS.FAVORITES.LIST, {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });

        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }

        if (!res.ok) {
            g.innerHTML = `<div class="wish-empty-state"><p>Could not load wishlist. Please refresh.</p></div>`;
            return;
        }

        wishItems = await res.json();
    } catch (e) {
        g.innerHTML = `<div class="wish-empty-state"><p>Network error. Please check your connection.</p></div>`;
        return;
    }

    render();
}

// ── User profile ──────────────────────────────────────────
const user = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
function applyUserProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
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
applyUserProfile(user);

// ── Sidebar toggle ─────────────────────────────────────────
const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });

// ── Toast ─────────────────────────────────────────────────
function showToast(icon, msg, dur=2800) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, dur);
}

loadWishlist();
