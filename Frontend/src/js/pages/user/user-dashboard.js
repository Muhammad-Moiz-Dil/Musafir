// ── Auth guard ─────────────────────────────────────────────
const token = sessionStorage.getItem('tripify_token');
if (!token) { window.location.href = '../auth/login.html'; }

// Fallback destinations (shown when backend is unreachable)
const FALLBACK_DESTS = [
    { id:1, name:'Hunza Valley',   city:'Gilgit-Baltistan', imageUrl:'../../../../public/assets/images/hunza-valley.jpg', averageRating:4.8, totalReviews:124, matchReason:'Mountains, Scenic' },
    { id:2, name:'Murree',         city:'Punjab',           imageUrl:'../../../../public/assets/images/murree.jpeg',       averageRating:4.5, totalReviews:98,  matchReason:'Family Trips' },
    { id:3, name:'Swat Valley',    city:'Khyber Pakhtunkhwa', imageUrl:'../../../../public/assets/images/swat.jpg',        averageRating:4.6, totalReviews:110, matchReason:'Scenic' },
    { id:4, name:'Skardu',         city:'Gilgit-Baltistan', imageUrl:'../../../../public/assets/images/skardu.jpeg',       averageRating:4.7, totalReviews:87,  matchReason:'Adventure' },
    { id:5, name:'Naran Kaghan',   city:'Khyber Pakhtunkhwa', imageUrl:'../../../../public/assets/images/naran kaghan.jpg', averageRating:4.4, totalReviews:76, matchReason:'Scenic' },
];

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

function resolveImage(dest) {
    const url = dest.imageUrl;
    if (!url) return IMG_BASE + 'lahore.jpg';
    if (IMG_MAP[url]) return IMG_MAP[url];
    if (url.startsWith('http') || url.startsWith('/') || url.startsWith('../')) return url;
    return IMG_BASE + url;
}

// Wishlist stored as array of destination IDs
let wishlist = JSON.parse(sessionStorage.getItem('tripify_wishlist') || '[]');
// Current recommendation list (populated from API or fallback)
let currentDests = [];

function saveWish() { sessionStorage.setItem('tripify_wishlist', JSON.stringify(wishlist)); }

function starStr(r) {
    const full = Math.floor(r); const half = r % 1 >= 0.5 ? 1 : 0; const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function destCardHtml(d) {
    const imgSrc = resolveImage(d);
    const inWish = wishlist.includes(d.id);
    const rating = typeof d.averageRating === 'number' ? d.averageRating.toFixed(1) : (d.averageRating || '–');
    const reviews = d.totalReviews || 0;
    const reason  = d.matchReason || '';
    return `
    <div class="dest-card" onclick="location.href='destination-detail.html?id=${d.id}'">
        <div class="dest-card-img">
            <img src="${imgSrc}" alt="${d.name}" loading="lazy" onerror="this.src='../../../../public/assets/images/lahore.jpg'">
            <div class="dest-card-img-overlay"></div>
            ${reason ? `<span class="dc-badge">✨ ${reason.split(',')[0].trim()}</span>` : ''}
            <button class="dc-wish ${inWish ? 'active' : ''}" onclick="toggleWish(event,${d.id})" title="Wishlist">
                ${inWish ? '❤️' : '🤍'}
            </button>
        </div>
        <div class="dest-card-body">
            <div class="dc-name">${d.name}</div>
            <div class="dc-region">📍 ${d.city || ''}</div>
            <div class="dc-rating"><span class="stars">${starStr(parseFloat(rating))}</span> ${rating} (${reviews})</div>
            ${reason ? `<div class="dc-tags"><span class="tag">${reason.split(',').slice(0,2).map(r=>r.trim()).join('</span><span class="tag">')}</span></div>` : ''}
        </div>
    </div>`;
}

function renderRec(dests) {
    const c = document.getElementById('recScroll');
    if (!dests || dests.length === 0) {
        c.innerHTML = '<p style="color:var(--t3);padding:16px;">No recommendations found. <a href="profile.html">Set your preferences</a> to get personalised picks.</p>';
        return;
    }
    currentDests = dests;
    c.innerHTML = dests.map(d => destCardHtml(d)).join('');
}

async function loadRecommendations() {
    const c = document.getElementById('recScroll');
    const noMatchBanner = document.getElementById('recNoMatch');
    c.innerHTML = '<p style="color:var(--t3);padding:16px 0;">Loading recommendations…</p>';
    try {
        const res = await fetch(ENDPOINTS.USER.RECOMMENDATIONS(5), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) { AuthService.logout(); return; }
        if (!res.ok) throw new Error('API error ' + res.status);
        const data = await res.json();
        // Response is { noMatches: bool, destinations: [...] }
        const dests = Array.isArray(data) ? data : (data.destinations || FALLBACK_DESTS);
        const noMatches = !Array.isArray(data) && data.noMatches === true;
        noMatchBanner.style.display = noMatches ? 'block' : 'none';
        renderRec(dests.length ? dests : FALLBACK_DESTS);
    } catch (e) {
        // Backend unreachable — show fallback destinations
        noMatchBanner.style.display = 'none';
        renderRec(FALLBACK_DESTS);
    }
}

async function renderWishPreview() {
    const c = document.getElementById('wishPreview');
    try {
        const r = await fetch(ENDPOINTS.FAVORITES.LIST, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (r.status === 401) { AuthService.logout(); return; }
        if (!r.ok) throw new Error();
        const items = await r.json();
        if (!items.length) {
            c.innerHTML = `<div class="wish-empty"><span>🤍</span><p>No saved destinations yet.<br>Explore and add your favourites!</p></div>`;
            return;
        }
        // Sync local wishlist array with backend IDs
        wishlist = items.map(d => d.id || d.destinationId);
        saveWish();
        c.innerHTML = items.map(d => `
        <div class="wish-card">
            <div class="wish-img"><img src="${resolveImage(d)}" alt="${d.name}" loading="lazy" onerror="this.src='../../../../public/assets/images/lahore.jpg'"></div>
            <div class="wish-body">
                <div class="wish-name">${d.name}</div>
                <div class="wish-region">📍 ${d.city || ''}</div>
            </div>
            <button class="wish-remove" onclick="removeWish(${d.id || d.destinationId})" title="Remove">✕</button>
        </div>`).join('');
    } catch (_) {
        // Backend unreachable — fall back to locally cached IDs
        const items = currentDests.filter(d => wishlist.includes(d.id));
        if (!items.length) {
            c.innerHTML = `<div class="wish-empty"><span>🤍</span><p>No saved destinations yet.<br>Explore and add your favourites!</p></div>`;
            return;
        }
        c.innerHTML = items.map(d => `
        <div class="wish-card">
            <div class="wish-img"><img src="${resolveImage(d)}" alt="${d.name}" loading="lazy" onerror="this.src='../../../../public/assets/images/lahore.jpg'"></div>
            <div class="wish-body">
                <div class="wish-name">${d.name}</div>
                <div class="wish-region">📍 ${d.city || ''}</div>
            </div>
            <button class="wish-remove" onclick="removeWish(${d.id})" title="Remove">✕</button>
        </div>`).join('');
    }
}

function toggleWish(e, id) {
    e.stopPropagation();
    if (wishlist.includes(id)) { wishlist = wishlist.filter(x => x !== id); showToast('🤍', 'Removed from wishlist'); }
    else { wishlist.push(id); showToast('❤️', 'Added to wishlist!'); }
    saveWish();
    // Re-render cards to update heart icons
    renderRec(currentDests.length ? currentDests : FALLBACK_DESTS);
    renderWishPreview();
}
function removeWish(id) {
    wishlist = wishlist.filter(x => x !== id); saveWish();
    renderRec(currentDests.length ? currentDests : FALLBACK_DESTS);
    renderWishPreview();
    showToast('🗑️', 'Removed from wishlist');
}

function doSearch() {
    const q = document.getElementById('mainSearch').value.trim();
    if (q) location.href = `destinations.html?q=${encodeURIComponent(q)}`;
    else location.href = 'destinations.html';
}
document.getElementById('mainSearch').addEventListener('keydown', e => { if (e.key==='Enter') doSearch(); });
document.getElementById('topSearch').addEventListener('keydown', e => { if (e.key==='Enter') { const q=e.target.value.trim(); if(q) location.href=`destinations.html?q=${encodeURIComponent(q)}`; } });

// Greeting
// ── User profile ───────────────────────────────────────────
function applyUserProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('welcomeName').textContent = (u.fullName || 'Traveller') + '! 👋';
    document.getElementById('sidebarName').textContent = u.fullName || 'Traveller';

    const sidebarAvatar = document.getElementById('sidebarInitials');
    const topbarAvatar  = document.getElementById('topbarInitials');

    if (u.profilePicture && u.profilePicture !== '') {
        const imgTag = '<img src="http://localhost:8080' + u.profilePicture + '?t=' + Date.now() + '" alt="Avatar" onerror="this.parentElement.textContent=\'' + ini + '\'">';
        sidebarAvatar.innerHTML = imgTag;
        topbarAvatar.innerHTML  = imgTag;
    } else {
        sidebarAvatar.textContent = ini;
        topbarAvatar.textContent  = ini;
    }
}

// Show immediately from localStorage while API loads
const storedUser = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
if (storedUser.fullName) applyUserProfile(storedUser);

// Fetch fresh profile from backend
async function loadUserProfile() {
    try {
        const res = await fetch(ENDPOINTS.USER.PROFILE, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) { AuthService.logout(); return; }
        if (!res.ok) return;
        const u = await res.json();
        const merged = Object.assign({}, storedUser, u);
        sessionStorage.setItem('tripify_user', JSON.stringify(merged));
        applyUserProfile(merged);
    } catch (e) {
        // backend unreachable — localStorage data already shown above
    }
}
loadUserProfile();

// Sidebar toggle
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', ()=>{ sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', ()=>{ sidebar.classList.remove('open'); overlay.classList.remove('show'); });

// Counter animation
function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    let cur = 0; const inc = target/30;
    const t = setInterval(()=>{ cur=Math.min(cur+inc,target); el.textContent=Math.floor(cur); if(cur>=target) clearInterval(t); },32);
}
const cObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ animateCounter(e.target); cObs.unobserve(e.target); } });
});
document.querySelectorAll('[data-target]').forEach(el => cObs.observe(el));

// Toast
function showToast(icon, msg, dur=2800) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div'); t.className='toast';
    t.innerHTML=`<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),300); },dur);
}

async function loadStats() {
    try {
        const res = await fetch(ENDPOINTS.USER.STATS, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) { AuthService.logout(); return; }
        if (!res.ok) return;
        const s = await res.json();

        const setCounter = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.dataset.target = val;
            el.textContent = val; // set immediately; observer will animate if still in viewport
            animateCounter(el);
        };

        setCounter('statTrips',   s.tripsPlanned       || 0);
        setCounter('statWishlist',s.wishlistItems       || 0);
        setCounter('statHotels',  s.hotelsBooked        || 0);
        setCounter('statVisited', s.destinationsVisited || 0);

        document.getElementById('statTripsChg').textContent    = s.tripsPlanned === 1 ? '1 trip created' : s.tripsPlanned + ' trips total';
        document.getElementById('statWishlistChg').textContent = s.wishlistItems === 1 ? '1 destination saved' : s.wishlistItems + ' saved';
        document.getElementById('statVisitedChg').textContent  = s.destinationsVisited > 0 ? '↑ Explorer rank' : 'Complete a trip!';
    } catch (e) {
        // Backend unreachable — leave counters at 0
        ['statTripsChg','statWishlistChg','statVisitedChg'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '–';
        });
    }
}
// ── UC17: Notifications ─────────────────────────────────────
let notifData = [];
let notifPanelOpen = false;

function toggleNotifPanel() {
    notifPanelOpen = !notifPanelOpen;
    document.getElementById('notifPanel').classList.toggle('open', notifPanelOpen);
    if (notifPanelOpen) fetchAndRenderPanel();
}
document.addEventListener('click', e => {
    if (notifPanelOpen && !document.getElementById('notifWrap').contains(e.target)) {
        notifPanelOpen = false;
        document.getElementById('notifPanel').classList.remove('open');
    }
});

async function fetchAndRenderPanel() {
    const body = document.getElementById('notifPanelBody');
    body.innerHTML = '<div class="notif-loading">Loading…</div>';
    try {
        const res = await fetch(ENDPOINTS.NOTIFICATIONS.LIST, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) { AuthService.logout(); return; }
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        notifData = data.notifications || [];
        renderPanel(notifData);
        updateBadge(data.unreadCount || 0);
    } catch (_) {
        body.innerHTML = '<div class="notif-error">Unable to load details. Please try again later.</div>';
    }
}

function renderPanel(items) {
    const body = document.getElementById('notifPanelBody');
    if (!items.length) {
        body.innerHTML = '<div class="notif-empty"><span>🔔</span><p>No notifications yet.<br>Weather alerts and travel updates<br>will appear here.</p></div>';
        return;
    }
    body.innerHTML = items.map(n => `
    <div class="notif-item ${!n.isRead ? 'unread' : ''}" onclick="onNotifClick(${n.notificationId},'${n.type}')">
        <div class="notif-item-icon">${notifIcon(n.type, n.title)}</div>
        <div class="notif-item-body">
            <div class="notif-item-title">${escHtml(n.title)}</div>
            <div class="notif-item-msg">${escHtml(n.message)}</div>
            <div class="notif-item-time">${timeAgo(n.createdAt)}</div>
        </div>
        ${!n.isRead ? '<div class="notif-unread-dot"></div>' : ''}
    </div>`).join('');
}

async function onNotifClick(id, type) {
    try {
        await fetch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id), {
            method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }
        });
    } catch (_) {}
    const n = notifData.find(x => x.notificationId === id);
    if (n) n.isRead = true;
    renderPanel(notifData);
    updateBadge(notifData.filter(x => !x.isRead).length);
    if (type === 'WEATHER_ALERT') {
        notifPanelOpen = false;
        document.getElementById('notifPanel').classList.remove('open');
        location.href = 'weather-alerts.html';
    }
}

async function markAllNotifRead() {
    try {
        await fetch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {
            method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }
        });
        notifData.forEach(n => n.isRead = true);
        renderPanel(notifData);
        updateBadge(0);
        dismissAllDashAlerts();
    } catch (_) {}
}

function updateBadge(count) {
    const badge = document.getElementById('notifBadge');
    if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.style.display = 'flex'; }
    else badge.style.display = 'none';
}

function notifIcon(type, title) {
    if (title) {
        if (title.includes('⛈️')) return '⛈️';
        if (title.includes('❄️')) return '❄️';
        if (title.includes('🌡️')) return '🌡️';
        if (title.includes('🌧️')) return '🌧️';
        if (title.includes('💨')) return '💨';
        if (title.includes('🥶')) return '🥶';
        if (title.includes('🌪️')) return '🌪️';
        if (title.includes('🌫️')) return '🌫️';
    }
    const map = { WEATHER_ALERT:'🌤️', BOOKING_REMINDER:'🏨', TRAVEL_WARNING:'⚠️', TRIP_UPDATE:'🗺️' };
    return map[type] || '🔔';
}

function timeAgo(iso) {
    if (!iso) return '';
    const m = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function escHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Dashboard inline alerts
async function loadDashAlerts() {
    try {
        const res = await fetch(ENDPOINTS.NOTIFICATIONS.LIST, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return;
        const data = await res.json();
        notifData = data.notifications || [];
        updateBadge(data.unreadCount || 0);
        const unread = notifData.filter(n => !n.isRead).slice(0, 3);
        if (!unread.length) return;
        document.getElementById('dashAlerts').style.display = 'block';
        document.getElementById('dashAlertsList').innerHTML = unread.map(n => `
        <div class="dash-alert-item" id="da-${n.notificationId}">
            <div class="dash-alert-icon">${notifIcon(n.type, n.title)}</div>
            <div class="dash-alert-body">
                <div class="dash-alert-title">${escHtml(n.title)}</div>
                <div class="dash-alert-msg">${escHtml(n.message)}</div>
            </div>
            <button class="dash-alert-close" onclick="dismissDashAlert(${n.notificationId})" title="Dismiss">✕</button>
        </div>`).join('');
    } catch (_) {}
}

async function dismissDashAlert(id) {
    document.getElementById('da-' + id)?.remove();
    if (!document.getElementById('dashAlertsList').children.length)
        document.getElementById('dashAlerts').style.display = 'none';
    try {
        await fetch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id), {
            method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }
        });
        const n = notifData.find(x => x.notificationId === id);
        if (n) n.isRead = true;
        updateBadge(notifData.filter(x => !x.isRead).length);
    } catch (_) {}
}

function dismissAllDashAlerts() {
    document.getElementById('dashAlerts').style.display = 'none';
}

// ── End UC17 ─────────────────────────────────────────────────

loadStats();
loadRecommendations().then(async () => {
    // Sync wishlist from backend so the preview matches what the user actually saved
    try {
        const r = await fetch(ENDPOINTS.FAVORITES.IDS, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (r.ok) {
            const ids = await r.json();
            if (Array.isArray(ids)) { wishlist = ids; saveWish(); }
        }
    } catch (_) {}
    renderWishPreview();
});
