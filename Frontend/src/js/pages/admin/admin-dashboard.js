(function(){
'use strict';

const ADMIN_API = 'http://localhost:8080/api';
const token = sessionStorage.getItem('tripify_token');
const user  = JSON.parse(sessionStorage.getItem('tripify_user') || '{"fullName":"Super Admin","userType":"Admin"}');

if (!token) { window.location.href = '../auth/admin-login.html'; return; }
if (user.userType !== 'Admin') { window.location.href = '../auth/admin-login.html'; return; }

// ── User info ────────────────────────────────────────
const ini = (user.fullName || 'SA').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
document.getElementById('topbarInitials').textContent  = ini;
document.getElementById('welcomeName').textContent     = (user.fullName || 'Admin') + ' 👋';


// ── Sidebar toggle ───────────────────────────────────
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', ()=>{ sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', ()=>{ sidebar.classList.remove('open'); overlay.classList.remove('show'); });

// ── Toast ────────────────────────────────────────────
window.showToast = function(icon, msg, dur=3000) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div'); t.className='toast';
    t.innerHTML=`<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),300); },dur);
};

// ── Logout ───────────────────────────────────────────
window.doLogout = function() {
    showToast('👋','Signing out…');
    setTimeout(()=>{ sessionStorage.removeItem('tripify_token'); sessionStorage.removeItem('tripify_user'); window.location.href='../auth/admin-login.html'; },1200);
};

// ── Helpers ──────────────────────────────────────────
async function adminFetch(url) {
    try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return null;
        return res.json();
    } catch { return null; }
}

function fmtDate(s) {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('en-PK', {day:'numeric', month:'short', year:'numeric'});
}

function timeAgo(s) {
    if (!s) return '';
    const diff = Math.floor((Date.now() - new Date(s)) / 1000);
    if (diff < 60)     return 'Just now';
    if (diff < 3600)   return Math.floor(diff/60) + ' min ago';
    if (diff < 86400)  return Math.floor(diff/3600) + ' hr ago';
    if (diff < 604800) return Math.floor(diff/86400) + ' days ago';
    return fmtDate(s);
}

function getInitials(name) {
    return (name||'??').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
}

function animateCounter(el, target) {
    let cur = 0; const inc = Math.max(1, target/40);
    const t = setInterval(()=>{ cur=Math.min(cur+inc,target); el.textContent=Math.floor(cur).toLocaleString(); if(cur>=target) clearInterval(t); },30);
}

// ── Load dashboard ───────────────────────────────────
async function loadDashboard() {
    const [statsData, usersData, logsData, flagsData, hotelsData, destData] = await Promise.all([
        adminFetch(`${ADMIN_API}/admin/statistics`),
        adminFetch(`${ADMIN_API}/admin/users`),
        adminFetch(`${ADMIN_API}/admin/logs`),
        adminFetch(`${ADMIN_API}/admin/flags`),
        adminFetch(`${ADMIN_API}/hotels/admin/all`),
        adminFetch(`${ADMIN_API}/admin/destinations`),
    ]);

    const stats  = statsData || {};
    const users  = usersData?.users  || [];
    const logs   = logsData?.logs    || [];
    const flags  = flagsData?.flags  || [];
    const hotels = Array.isArray(hotelsData) ? hotelsData : [];
    const dests  = Array.isArray(destData)   ? destData   : [];

    const pendingHotels = hotels.filter(h => !h.isActive);
    const activeDests   = dests.filter(d =>  d.isActive);

    // ── Stat cards ───────────────────────────────────
    animateCounter(document.getElementById('statUsers'),    stats.totalUsers    || 0);
    animateCounter(document.getElementById('statHotels'),   hotels.length);
    animateCounter(document.getElementById('statDests'),    activeDests.length);
    animateCounter(document.getElementById('statBookings'), stats.totalBookings || 0);

    // ── Welcome banner mini-stats ─────────────────────
    document.getElementById('wbNewUsers').textContent = '+' + (stats.newUsersInRange || 0);
    document.getElementById('wbFlagged').textContent  = flags.length;
    document.getElementById('wbPending').textContent  = pendingHotels.length;

    // ── Bar chart (Monthly Activity) ─────────────────
    const monthly = stats.monthly || [];
    new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
            labels: monthly.map(m => (m.month || '').split(' ')[0]), // strip year → "Oct" not "Oct 2025"
            datasets: [
                { label: 'New Users', data: monthly.map(m => m.users),    backgroundColor: 'rgba(37,99,235,0.75)',  borderRadius: 6, borderSkipped: false, yAxisID: 'y' },
                { label: 'Bookings',  data: monthly.map(m => m.bookings), backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 6, borderSkipped: false, yAxisID: 'y' },
                { label: 'Revenue (K PKR)', data: monthly.map(m => Math.round((m.revenue||0)/1000)), backgroundColor: 'rgba(245,158,11,0.6)', borderRadius: 6, borderSkipped: false, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x:  { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94A3B8' } },
                y:  { position: 'left',  grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 }, color: '#94A3B8' }, title: { display: true, text: 'Users / Bookings', font: { size: 10 }, color: '#94A3B8' } },
                y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 11 }, color: '#F59E0B', callback: v => v + 'K' }, title: { display: true, text: 'Revenue (K PKR)', font: { size: 10 }, color: '#F59E0B' } }
            }
        }
    });

    // ── Donut chart (Top Destinations by Bookings) ───
    const topDests = stats.topDestinations || [];
    const COLORS = ['#2563EB','#10B981','#F59E0B','#8B5CF6','#EF4444','#94A3B8'];
    const legend  = document.getElementById('donutLegend');
    if (topDests.length) {
        const total = topDests.reduce((s, d) => s + d.count, 0) || 1;
        new Chart(document.getElementById('donutChart'), {
            type: 'doughnut',
            data: { labels: topDests.map(d=>d.name), datasets: [{ data: topDests.map(d=>d.count), backgroundColor: COLORS, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }] },
            options: { responsive: false, cutout: '62%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} bookings` } } } }
        });
        legend.innerHTML = topDests.map((d,i) =>
            `<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:#475569">
                <div style="width:10px;height:10px;border-radius:50%;background:${COLORS[i]};flex-shrink:0"></div>
                <span>${d.name}</span>
                <strong style="color:#0f172a">${Math.round(d.count*100/total)}%</strong>
            </div>`
        ).join('');
    } else {
        legend.innerHTML = '<div style="font-size:12px;color:var(--text-3)">No booking data yet</div>';
    }

    // ── Recent Activity feed ─────────────────────────
    const feed = document.getElementById('activityList');
    if (!logs.length) {
        feed.innerHTML = '<div style="padding:20px;text-align:center;font-size:13px;color:var(--text-3)">No activity yet</div>';
    } else {
        const DOT_COLORS = ['ad-blue','ad-green','ad-orange','ad-red','ad-purple'];
        feed.innerHTML = logs.slice(0,5).map((lg,i) => {
            const action = (lg.action||'').toLowerCase();
            const icon   = action.includes('login') ? '🔐' : action.includes('register') ? '👤' : action.includes('book') ? '📋' : action.includes('hotel') ? '🏨' : action.includes('review') ? '⭐' : '📝';
            return `<div class="activity-item">
                <div class="activity-dot ${DOT_COLORS[i%5]}">${icon}</div>
                <div class="activity-text">
                    <div class="activity-msg"><strong>${lg.userName||'System'}</strong>: ${lg.action||''}</div>
                    <div class="activity-time">${timeAgo(lg.createdAt)}</div>
                </div>
            </div>`;
        }).join('');
    }

    // ── Users table ──────────────────────────────────
    const GRAD = ['#2563eb,#7c3aed','#10b981,#0891b2','#f59e0b,#ef4444','#8b5cf6,#ec4899','#0891b2,#2563eb'];
    let allUsers = users;
    let currentRole = 'All';
    let searchQ = '';

    function renderUsers() {
        let list = allUsers;
        if (currentRole !== 'All') list = list.filter(u => u.userType === currentRole);
        if (searchQ) list = list.filter(u => (u.fullName||'').toLowerCase().includes(searchQ) || (u.email||'').toLowerCase().includes(searchQ));
        const shown = list.slice(0, 10);
        const tbody = document.getElementById('usersTableBody');
        if (!shown.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-3);padding:24px">No users found</td></tr>';
            document.getElementById('usersCount').textContent = 'Showing 0 users';
            return;
        }
        tbody.innerHTML = shown.map((u,i) => {
            const roleBadge = u.userType === 'Tourist' ? '<span class="badge badge-primary">Tourist</span>' : '<span class="badge badge-purple">Hotel Manager</span>';
            const statusBadge = u.isActive ? '<span class="badge badge-success">● Active</span>' : '<span class="badge badge-warning">● Inactive</span>';
            return `<tr>
                <td><div class="td-name-wrap">
                    <div class="td-avatar" style="background:linear-gradient(135deg,${GRAD[i%GRAD.length]})">${getInitials(u.fullName)}</div>
                    <div><div class="td-name">${u.fullName}</div><div class="td-email">${u.email}</div></div>
                </div></td>
                <td>${roleBadge}</td>
                <td>${fmtDate(u.createdAt)}</td>
                <td>—</td>
                <td>${statusBadge}</td>
                <td><div style="display:flex;gap:6px"><button class="btn-icon" title="Delete" onclick="showToast('🗑️','User deleted')">🗑</button></div></td>
            </tr>`;
        }).join('');
        document.getElementById('usersCount').textContent = `Showing ${shown.length} of ${list.length} users`;
    }

    renderUsers();

    document.querySelectorAll('.user-filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.user-filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentRole = pill.dataset.role;
            renderUsers();
        });
    });

    document.getElementById('userSearch').addEventListener('input', e => {
        searchQ = e.target.value.toLowerCase();
        renderUsers();
    });

    // ── Content Moderation (flagged content) ─────────
    document.getElementById('flagBadge').textContent = flags.length + ' Flagged';
    const modEl = document.getElementById('modList');
    if (!flags.length) {
        modEl.innerHTML = '<div class="mod-item"><div class="mod-body"><div class="mod-title" style="color:var(--text-3)">No flagged content</div></div></div>';
    } else {
        const iconMap = { REVIEW: '⭐', HOTEL_REVIEW: '🏨', LOG: '📝' };
        modEl.innerHTML = flags.slice(0,4).map(f => {
            const icon  = iconMap[f.contentType] || '💬';
            const title = f.targetName ? `Flagged ${(f.contentType||'').replace('_',' ').toLowerCase()} on ${f.targetName}` : `Flagged content`;
            return `<div class="mod-item" id="flag-${f.flagId}">
                <div class="mod-thumb">${icon}</div>
                <div class="mod-body">
                    <div class="mod-title">${title}</div>
                    <div class="mod-meta">Reported by ${f.reportedByName||'User'} · ${timeAgo(f.createdAt)}</div>
                </div>
                <div class="mod-actions">
                    <button class="btn btn-secondary btn-sm" onclick="dismissFlag(${f.flagId})">Keep</button>
                    <button class="btn btn-danger btn-sm" onclick="resolveFlag(${f.flagId})">Remove</button>
                </div>
            </div>`;
        }).join('');
    }

    // ── Destination Management table ─────────────────
    const destTbody = document.getElementById('destTableBody');
    if (!dests.length) {
        destTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-3);padding:24px">No destinations found</td></tr>';
    } else {
        destTbody.innerHTML = dests.slice(0,5).map(d => {
            const badge  = d.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>';
            const rating = d.averageRating ? '⭐ ' + Number(d.averageRating).toFixed(1) : '—';
            return `<tr>
                <td><strong>${d.name}</strong></td>
                <td>${d.city||'—'}</td>
                <td>${rating}</td>
                <td>${badge}</td>
                <td><a href="admin-destinations.html" class="btn-icon" title="Manage">✏️</a></td>
            </tr>`;
        }).join('');
    }
}

// ── Flag actions ─────────────────────────────────────
window.dismissFlag = async function(flagId) {
    const res = await fetch(`${ADMIN_API}/admin/flags/${flagId}/dismiss`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { document.getElementById(`flag-${flagId}`)?.remove(); showToast('✅','Flag dismissed'); }
    else showToast('❌','Failed');
};

window.resolveFlag = async function(flagId) {
    const res = await fetch(`${ADMIN_API}/admin/flags/${flagId}/resolve`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { document.getElementById(`flag-${flagId}`)?.remove(); showToast('🗑️','Content removed'); }
    else showToast('❌','Failed');
};

loadDashboard();

(async function(){try{const r=await fetch(ENDPOINTS.ADMIN.FLAGS_COUNT,{headers:{Authorization:'Bearer '+token}});if(!r.ok)return;const {count}=await r.json();const b=document.getElementById('moderationBadge');if(b){if(count>0){b.textContent=count;b.style.display='';}else b.style.display='none';}}catch(e){}})();

})();
