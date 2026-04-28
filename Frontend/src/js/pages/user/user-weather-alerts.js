// ── Auth guard ──────────────────────────────────────────────────────────────
const token = sessionStorage.getItem('tripify_token');
if (!token) { window.location.href = '../auth/login.html'; }

// ── User profile ────────────────────────────────────────────────────────────
function applyUserProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('sidebarName').textContent = u.fullName || 'Traveller';
    const sidebar = document.getElementById('sidebarInitials');
    const topbar  = document.getElementById('topbarInitials');
    if (u.profilePicture && u.profilePicture !== '') {
        const img = '<img src="http://localhost:8080' + u.profilePicture + '?t=' + Date.now() + '" alt="Avatar" onerror="this.parentElement.textContent=\'' + ini + '\'">';
        sidebar.innerHTML = img;
        topbar.innerHTML  = img;
    } else {
        sidebar.textContent = ini;
        topbar.textContent  = ini;
    }
}
const storedUser = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
if (storedUser.fullName) applyUserProfile(storedUser);
(async () => {
    try {
        const r = await fetch(ENDPOINTS.USER.PROFILE, { headers: { 'Authorization': 'Bearer ' + token } });
        if (r.status === 401) { AuthService.logout(); return; }
        if (!r.ok) return;
        const u = await r.json();
        const merged = Object.assign({}, storedUser, u);
        sessionStorage.setItem('tripify_user', JSON.stringify(merged));
        applyUserProfile(merged);
    } catch (_) {}
})();

// ── Sidebar toggle ──────────────────────────────────────────────────────────
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

// ── Toast ────────────────────────────────────────────────────────────────────
function showToast(icon, msg, dur = 2800) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, dur);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const now = Date.now();
    const diff = Math.floor((now - d.getTime()) / 1000);
    if (diff < 60)   return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

function alertClass(title) {
    if (/thunderstorm|tornado|extreme heat|strong wind|dust storm/i.test(title)) return 'unread-danger';
    return 'unread';
}

function conditionEmoji(condition) {
    const map = { 'thunderstorm':'⛈️', 'drizzle':'🌦️', 'rain':'🌧️', 'snow':'❄️',
                  'mist':'🌫️', 'fog':'🌫️', 'haze':'🌫️', 'smoke':'🌫️',
                  'dust':'🌫️', 'sand':'🌫️', 'ash':'🌋', 'squall':'💨',
                  'tornado':'🌪️', 'clear':'☀️', 'clouds':'☁️' };
    return map[(condition || '').toLowerCase()] || '🌤️';
}

// ── Render live weather grid ─────────────────────────────────────────────────
function renderWeatherGrid(liveWeather) {
    const grid = document.getElementById('weatherGrid');
    if (!liveWeather || liveWeather.length === 0) {
        grid.innerHTML = `
        <div class="wa-no-fav" style="grid-column:1/-1">
            <div style="font-size:48px;margin-bottom:12px">🤍</div>
            <h3>No saved destinations yet</h3>
            <p>Add destinations to your wishlist to see live weather updates here.</p>
            <a href="destinations.html" class="wa-explore-btn">Explore Destinations →</a>
        </div>`;
        return;
    }
    grid.innerHTML = liveWeather.map(w => {
        if (w.error) {
            return `<div class="wa-card">
                <div class="wa-card-dest">${w.destinationName}</div>
                <div class="wa-card-city">📍 ${w.city || ''}</div>
                <div class="wa-card-error" style="padding:12px 0">
                    <div style="font-size:22px;margin-bottom:6px">🔌</div>
                    <div>Weather data unavailable</div>
                    <div style="font-size:11px;margin-top:4px">Check your API key or connection</div>
                </div>
            </div>`;
        }
        const isAlert = w.isAlert;
        const emoji   = conditionEmoji(w.condition);
        return `<div class="wa-card${isAlert ? ' alert-card' : ''}">
            ${isAlert ? '<div class="wa-alert-badge">⚠ Alert</div>' : ''}
            <div class="wa-card-dest">${w.destinationName}</div>
            <div class="wa-card-city">📍 ${w.city || ''}</div>
            <div class="wa-card-main">
                <div class="wa-card-icon">
                    ${w.iconUrl ? `<img src="${w.iconUrl}" alt="${w.condition}" onerror="this.style.display='none'">` : `<span style="font-size:40px">${emoji}</span>`}
                </div>
                <div>
                    <div class="wa-card-temp">${w.temp != null ? w.temp + '°C' : '--'}</div>
                    <div class="wa-card-cond">${emoji} ${w.description || w.condition || ''}</div>
                </div>
            </div>
            <div class="wa-card-meta">
                <span>💧 ${w.humidity != null ? w.humidity + '%' : '--'}</span>
                <span>💨 ${w.windSpeed != null ? w.windSpeed + ' m/s' : '--'}</span>
                <span>🌡 Feels ${w.feelsLike != null ? w.feelsLike + '°C' : '--'}</span>
            </div>
        </div>`;
    }).join('');
}

// ── Render notifications ─────────────────────────────────────────────────────
function renderNotifications(notifications) {
    const list = document.getElementById('notifList');
    if (!notifications || notifications.length === 0) {
        list.innerHTML = `<div class="wa-empty">
            <div class="wa-empty-icon">🔔</div>
            <p>No weather alerts yet.<br>Alerts appear here when significant conditions are detected<br>for your <a href="wishlist.html">saved destinations</a>.</p>
        </div>`;
        return;
    }
    list.innerHTML = `<div class="wa-notif-list">` +
        notifications.map(n => {
            const isUnread = !n.isRead;
            const cls = isUnread ? alertClass(n.title) : '';
            const firstEmoji = (n.title || '').match(/^\S+/)?.[0] || '🔔';
            return `<div class="wa-notif${isUnread ? ' ' + cls : ''}" id="notif-${n.notificationId}">
                <div class="wa-notif-icon">${firstEmoji}</div>
                <div class="wa-notif-body">
                    <div class="wa-notif-title">${n.title.replace(/^\S+\s/, '')}</div>
                    <div class="wa-notif-msg">${n.message}</div>
                    <div class="wa-notif-time">${timeAgo(n.createdAt)}</div>
                </div>
                <div class="wa-notif-actions">
                    ${isUnread ? `<button class="wa-notif-read-btn" onclick="markOne(${n.notificationId})">Mark read</button>` : '<span style="font-size:11px;color:var(--t3)">Read</span>'}
                </div>
            </div>`;
        }).join('') +
    `</div>`;
}

// ── Mark one read ────────────────────────────────────────────────────────────
async function markOne(id) {
    try {
        const r = await fetch(ENDPOINTS.WEATHER.MARK_READ(id), {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (r.status === 401) { AuthService.logout(); return; }
        // Update UI without full reload
        const el = document.getElementById('notif-' + id);
        if (el) {
            el.classList.remove('unread', 'unread-danger');
            const btn = el.querySelector('.wa-notif-read-btn');
            if (btn) btn.outerHTML = '<span style="font-size:11px;color:var(--t3)">Read</span>';
        }
    } catch (_) {}
}

// ── Mark all read ────────────────────────────────────────────────────────────
async function markAllRead() {
    const btn = document.getElementById('markAllBtn');
    btn.disabled = true;
    try {
        const r = await fetch(ENDPOINTS.WEATHER.MARK_ALL_READ, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (r.status === 401) { AuthService.logout(); return; }
        showToast('✓', 'All alerts marked as read');
        document.querySelectorAll('.wa-notif.unread, .wa-notif.unread-danger').forEach(el => {
            el.classList.remove('unread', 'unread-danger');
            const b = el.querySelector('.wa-notif-read-btn');
            if (b) b.outerHTML = '<span style="font-size:11px;color:var(--t3)">Read</span>';
        });
        document.getElementById('unreadBanner').style.display = 'none';
    } catch (_) {
        showToast('⚠️', 'Failed to mark read. Try again.');
    } finally {
        btn.disabled = false;
    }
}

// ── Main load function ───────────────────────────────────────────────────────
let isLoading = false;
async function loadAlerts() {
    if (isLoading) return;
    isLoading = true;

    const dot  = document.getElementById('statusDot');
    const txt  = document.getElementById('statusText');
    const rBtn = document.getElementById('refreshBtn');

    dot.className = 'wa-status-dot loading';
    txt.textContent = 'Fetching live weather…';
    rBtn.disabled = true;

    try {
        const res = await fetch(ENDPOINTS.WEATHER.ALERTS, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (res.status === 401) { AuthService.logout(); return; }

        if (!res.ok) {
            throw new Error('Server error ' + res.status);
        }

        const data = await res.json();
        const liveWeather   = data.liveWeather   || [];
        const notifications = data.notifications || [];
        const unreadCount   = data.unreadCount   || 0;

        renderWeatherGrid(liveWeather);
        renderNotifications(notifications);

        // Update unread banner
        const banner = document.getElementById('unreadBanner');
        if (unreadCount > 0) {
            document.getElementById('unreadBadge').textContent = unreadCount;
            banner.style.display = 'flex';
        } else {
            banner.style.display = 'none';
        }

        // Status bar — check if any live weather errored
        const hasErrors   = liveWeather.some(w => w.error);
        const alertCount  = liveWeather.filter(w => w.isAlert && !w.error).length;
        const now         = new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('lastChecked').textContent = 'Last updated: ' + now;

        if (hasErrors && liveWeather.every(w => w.error)) {
            dot.className = 'wa-status-dot error';
            txt.textContent = 'Weather service unavailable. Set your OpenWeatherMap API key in application.properties.';
        } else if (alertCount > 0) {
            dot.className = 'wa-status-dot';
            dot.style.background = '#f97316';
            txt.textContent = alertCount + ' active weather alert(s) detected for your destinations.';
        } else {
            dot.className = 'wa-status-dot';
            txt.textContent = 'All clear — no significant weather alerts at this time.';
        }

    } catch (e) {
        const grid = document.getElementById('weatherGrid');
        grid.innerHTML = `<div class="wa-empty" style="grid-column:1/-1">
            <div class="wa-empty-icon">🔌</div>
            <p>Could not connect to the weather service.<br>Make sure the backend is running and your OWM API key is set.</p>
        </div>`;
        document.getElementById('notifList').innerHTML = '';
        dot.className = 'wa-status-dot error';
        txt.textContent = 'Connection failed. Is the backend running?';
        document.getElementById('lastChecked').textContent = 'Update failed';
    } finally {
        isLoading = false;
        rBtn.disabled = false;
    }
}

// ── City weather lookup ────────────────────────────────────────
async function lookupWeather() {
    const cityInput = document.getElementById('cityInput');
    const errEl     = document.getElementById('cityInputErr');
    const name      = cityInput.value.trim();

    errEl.style.display = 'none';

    if (!name) {
        errEl.textContent   = 'Please enter a city name.';
        errEl.style.display = 'block';
        cityInput.focus();
        return;
    }

    if (!/^[a-zA-Z0-9\s\-',\.]+$/.test(name)) {
        errEl.textContent   = 'Please use letters and numbers only.';
        errEl.style.display = 'block';
        return;
    }

    const btn    = document.getElementById('lookupBtn');
    const result = document.getElementById('lookupResult');
    btn.disabled    = true;
    btn.textContent = 'Loading…';
    result.style.display = 'block';
    result.innerHTML = `<div class="wa-card wa-card-loading">
        <div class="wa-skeleton" style="width:50%;height:14px"></div>
        <div class="wa-skeleton" style="width:70%;height:50px;margin-top:12px"></div>
    </div>`;

    try {
        const res = await fetch(ENDPOINTS.WEATHER.LOOKUP(name), {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) { AuthService.logout(); return; }

        if (res.status === 404 || !res.ok) {
            result.innerHTML = `<div class="wa-lookup-error">
                🔍 City "<strong>${escLookup(name)}</strong>" not found. Check the spelling or try a nearby major city.
            </div>`;
            return;
        }

        const w = await res.json();
        if (w.error) {
            result.innerHTML = `<div class="wa-lookup-error">
                ⚠️ Weather data unavailable for "<strong>${escLookup(name)}</strong>". Try again later.
            </div>`;
            return;
        }

        const emoji = conditionEmoji(w.condition);
        result.innerHTML = `
        <div class="wa-card${w.isAlert ? ' alert-card' : ''}" style="max-width:380px">
            ${w.isAlert ? '<div class="wa-alert-badge">⚠ Alert</div>' : ''}
            <div class="wa-card-dest">${escLookup(w.destinationName || name)}</div>
            ${w.city ? `<div class="wa-card-city">📍 ${escLookup(w.city)}</div>` : ''}
            <div class="wa-card-main">
                <div class="wa-card-icon">
                    ${w.iconUrl
                        ? `<img src="${w.iconUrl}" alt="${w.condition}" onerror="this.style.display='none'">`
                        : `<span style="font-size:40px">${emoji}</span>`}
                </div>
                <div>
                    <div class="wa-card-temp">${w.temp != null ? w.temp + '°C' : '--'}</div>
                    <div class="wa-card-cond">${emoji} ${w.description || w.condition || ''}</div>
                </div>
            </div>
            <div class="wa-card-meta">
                <span>💧 ${w.humidity   != null ? w.humidity   + '%'   : '--'}</span>
                <span>💨 ${w.windSpeed  != null ? w.windSpeed  + ' m/s': '--'}</span>
                <span>🌡 Feels ${w.feelsLike != null ? w.feelsLike + '°C' : '--'}</span>
            </div>
            ${w.isAlert ? `<div style="margin-top:10px;padding:8px 10px;background:rgba(239,68,68,0.1);border-radius:var(--r-sm);font-size:12px;color:#fca5a5">
                ⚠️ Unfavourable conditions detected. Exercise caution when travelling.
            </div>` : ''}
        </div>`;
    } catch (_) {
        result.innerHTML = `<div class="wa-lookup-error">
            ⚠️ Could not reach the weather service. Make sure the backend is running.
        </div>`;
    } finally {
        btn.disabled    = false;
        btn.textContent = '⚡ Check Weather';
    }
}

function escLookup(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

loadAlerts();
