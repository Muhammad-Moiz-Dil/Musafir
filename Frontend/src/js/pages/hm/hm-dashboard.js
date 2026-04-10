(function(){
'use strict';

// ── Auth guard ────────────────────────────────────────────
const token = sessionStorage.getItem('tripify_token');
const user  = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');

if (!token) { window.location.href = '../auth/login.html'; return; }
if (user.userType !== 'HotelManager') { window.location.href = '../auth/login.html'; return; }

// ── Populate user info ────────────────────────────────────
const initials = (user.fullName || 'UT').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
document.getElementById('sidebarInitials').textContent = initials;
document.getElementById('topbarInitials').textContent  = initials;
document.getElementById('sidebarName').textContent     = user.fullName || 'Hotel Manager';
document.getElementById('welcomeName').textContent     = (user.fullName || 'Manager') + ' 👋';

// ── Load profile pic on page init (silent) ────────────────
(async () => {
    try {
        const r = await fetch(ENDPOINTS.USER.PROFILE, { headers: { 'Authorization': 'Bearer ' + token } });
        if (!r.ok) return;
        const d = await r.json();
        if (d.profilePicture) {
            // Persist so all other HM pages can read it without an extra API call
            const stored = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
            stored.profilePicture = d.profilePicture;
            sessionStorage.setItem('tripify_user', JSON.stringify(stored));

            const img = `<img src="http://localhost:8080${d.profilePicture}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
            document.getElementById('sidebarInitials').innerHTML = img;
            document.getElementById('topbarInitials').innerHTML  = img;
        }
    } catch(e) {}
})();

// ── Greeting ──────────────────────────────────────────────

// ── Sidebar toggle ────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', ()=>{ sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', ()=>{ sidebar.classList.remove('open'); overlay.classList.remove('show'); });

// ── Nav active ────────────────────────────────────────────
window.nav = function(section) {
    document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
    event.currentTarget.classList.add('active');
    const labels = {hotels:'My Hotels',rooms:'Room Management',bookings:'Bookings',pricing:'Pricing',reviews:'Reviews & Ratings',profile:'Hotel Profile',account:'Account Settings'};
    document.getElementById('breadcrumbCur').textContent = labels[section] || 'Dashboard';

    const sections = ['pg-dashboard','pg-rooms','pg-account'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    if (section === 'account') {
        document.getElementById('pg-account').style.display = 'block';
        loadAccountProfile();
    } else if (section === 'rooms') {
        document.getElementById('pg-rooms').style.display = 'block';
        loadRoomManagement();
    } else {
        document.getElementById('pg-dashboard').style.display = 'block';
        if (section !== 'dashboard') showToast('📂', `Navigated to ${labels[section]}`);
    }
};

// ── Live Bookings ──────────────────────────────────────────
const AVATAR_COLORS = [
    'linear-gradient(135deg,#2563eb,#7c3aed)',
    'linear-gradient(135deg,#10b981,#0891b2)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#8b5cf6,#ec4899)',
    'linear-gradient(135deg,#059669,#2563eb)',
];
function statusBadge(s) {
    const map = { Pending:'badge-warning', Confirmed:'badge-success', Cancelled:'badge-danger', Completed:'badge-gray' };
    return `<span class="badge ${map[s]||'badge-gray'}">${s}</span>`;
}
function getInitials(name) { return (name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(); }

async function loadBookings() {
    try {
        const res = await fetch(ENDPOINTS.BOOKINGS.ALL, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return;
        const data = await res.json();

        // Update stats
        document.getElementById('statTotalBookings').textContent = data.totalCount;
        document.getElementById('statPendingCount').textContent  = data.pendingCount;
        document.getElementById('statTotalChg').textContent      = `${data.totalCount} bookings total`;
        document.getElementById('statPendingChg').textContent    = data.pendingCount > 0 ? 'Needs attention' : 'All caught up';
        document.getElementById('pendingBadge').textContent = data.pendingCount + ' Awaiting Response';

        // Active bookings = Confirmed + Pending (actual rooms currently in use)
        const activeCount = data.bookings.filter(b =>
            b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Pending'
        ).length;
        document.getElementById('roomSumBooked').textContent = activeCount;
        window._activeBookings = activeCount;
        updateOccBar();

        // ── Monthly revenue + booking trend chart ─────────────────
        const now = new Date();
        const last6 = [];
        const byMonth = {}, revByMonth = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const lbl = d.toLocaleString('default', { month: 'short' });
            last6.push({ key, lbl });
            byMonth[key] = 0;
            revByMonth[key] = 0;
        }
        data.bookings.forEach(b => {
            if (!b.createdAt) return;
            const d = new Date(b.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            if (Object.prototype.hasOwnProperty.call(byMonth, key)) {
                byMonth[key]++;
                if (b.bookingStatus !== 'Cancelled') revByMonth[key] += parseFloat(b.totalCost) || 0;
            }
        });

        const curKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        const monthlyRev = revByMonth[curKey] || 0;
        document.getElementById('statRevenue').textContent = monthlyRev >= 1000
            ? 'PKR ' + (monthlyRev / 1000).toFixed(1) + 'K'
            : 'PKR ' + monthlyRev.toLocaleString();
        const totalRev = Object.values(revByMonth).reduce((s,v)=>s+v,0);
        document.getElementById('statRevenueChg').textContent = totalRev > 0
            ? 'Total: PKR ' + (totalRev >= 1000 ? (totalRev/1000).toFixed(1)+'K' : totalRev.toLocaleString())
            : 'No revenue yet';

        // Update booking trend chart
        const chartLabels = last6.map(m => m.lbl);
        const chartBookings = last6.map(m => byMonth[m.key]);
        const chartRevenue  = last6.map(m => Math.round(revByMonth[m.key] / 1000));
        window.bookingChartInstance.data.labels = chartLabels;
        window.bookingChartInstance.data.datasets[0].data = chartBookings;
        window.bookingChartInstance.data.datasets[1].data = chartRevenue;
        window.bookingChartInstance.update();

        // ── Stacked bar: bookings per hotel, stacked by room type ─
        const STACK_COLORS = ['#10B981','#0891B2','#F59E0B','#6366F1','#EC4899','#EF4444','#8B5CF6','#14B8A6'];
        // hotelMap[hotelName][roomTypeName] = count
        const hotelMap = {};
        const allRoomTypes = new Set();
        data.bookings.forEach(b => {
            const hotel    = b.hotelName   || 'Unknown';
            const roomType = b.roomTypeName || 'General';
            if (!hotelMap[hotel]) hotelMap[hotel] = {};
            hotelMap[hotel][roomType] = (hotelMap[hotel][roomType] || 0) + 1;
            allRoomTypes.add(roomType);
        });
        const hotelLabels  = Object.keys(hotelMap);
        const roomTypeList = [...allRoomTypes].sort();
        const stackDatasets = roomTypeList.map((rt, i) => ({
            label: rt,
            data: hotelLabels.map(h => hotelMap[h][rt] || 0),
            backgroundColor: STACK_COLORS[i % STACK_COLORS.length],
            borderRadius: i === roomTypeList.length - 1 ? 5 : 0,
            borderSkipped: false
        }));
        window.roomBarChartInstance.data.labels   = hotelLabels;
        window.roomBarChartInstance.data.datasets = stackDatasets;
        window.roomBarChartInstance.update();

        const pending = data.bookings.filter(b => b.bookingStatus === 'Pending');
        const grid = document.getElementById('pendingBookingsGrid');
        if (!pending.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-3)">No pending booking requests.</div>';
        } else {
            grid.innerHTML = pending.map((b, i) => `
            <div class="booking-card" id="pcard-${b.bookingId}">
                <div class="booking-hdr">
                    <span class="booking-id">#BK-${b.bookingId}</span>
                    <span class="badge badge-warning">Pending</span>
                </div>
                <div class="guest-info">
                    <div class="guest-avatar" style="background:${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${getInitials(b.guestName)}</div>
                    <div><div class="guest-name">${b.guestName||'Guest'}</div><div class="guest-meta">${b.guestEmail||''}</div></div>
                </div>
                <div class="booking-details">
                    <div class="bd-item"><div class="bd-val">${b.hotelName||'Hotel'}</div><div class="bd-lbl">${b.roomTypeName||'Room'}</div></div>
                    <div class="bd-item"><div class="bd-val">${b.nights} Night${b.nights!==1?'s':''}</div><div class="bd-lbl">Duration</div></div>
                    <div class="bd-item"><div class="bd-val">${b.checkInDate}</div><div class="bd-lbl">Check-in</div></div>
                    <div class="bd-item"><div class="bd-val">PKR ${Number(b.totalCost).toLocaleString()}</div><div class="bd-lbl">Total</div></div>
                </div>
                <div class="booking-actions">
                    <button class="btn btn-primary btn-sm" style="flex:1" onclick="handleBookingAction(${b.bookingId},'confirm','pcard-${b.bookingId}')">✓ Accept</button>
                    <button class="btn btn-danger btn-sm"  style="flex:1" onclick="handleBookingAction(${b.bookingId},'cancel','pcard-${b.bookingId}')">✕ Decline</button>
                </div>
            </div>`).join('');
        }

        // All bookings table
        const tbody = document.getElementById('bookingsTableBody');
        if (!data.bookings.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-3)">No bookings yet.</td></tr>';
        } else {
            tbody.innerHTML = data.bookings.slice(0, 5).map(b => `
            <tr>
                <td><strong>${b.guestName||'Guest'}</strong></td>
                <td>${b.hotelName||'—'}</td>
                <td>${b.checkInDate||'—'}</td>
                <td>${statusBadge(b.bookingStatus)}</td>
                <td style="color:var(--secondary);font-weight:700">PKR ${Number(b.totalCost).toLocaleString()}</td>
            </tr>`).join('');
        }
        document.getElementById('bookingsFooterText').textContent =
            `Showing ${Math.min(data.bookings.length, 5)} of ${data.totalCount} booking${data.totalCount!==1?'s':''}`;

    } catch(e) { /* silently fail — dashboard still works */ }
}

window.handleBookingAction = async function(id, action, cardId) {
    const url = action === 'confirm' ? ENDPOINTS.BOOKINGS.CONFIRM(id) : ENDPOINTS.BOOKINGS.CANCEL(id);
    try {
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            const card = document.getElementById(cardId);
            if (card) card.remove();
            showToast(action==='confirm'?'✅':'❌', `Booking #${id} ${action==='confirm'?'confirmed':'declined'}`);
            loadBookings(); // refresh
            loadNotifBadge(); // tourist was notified — check our own badge too
        } else {
            showToast('⚠️', 'Could not update booking. Try again.');
        }
    } catch(e) { showToast('⚠️', 'Network error.'); }
};

loadBookings();

// ── Hotel data (occupancy, rating, room grid, reviews) ────
async function loadHotelData() {
    try {
        const res = await fetch(ENDPOINTS.HOTELS.MY, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return;
        const hotels = await res.json();

        if (!hotels.length) {
            document.getElementById('occBarText').textContent = '0%';
            document.getElementById('reviewsList').innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-3)">No hotels assigned yet.</div>';
            document.getElementById('pricingList').innerHTML = '<div style="text-align:center;color:var(--text-3);padding:20px">No hotels assigned yet.</div>';
            document.getElementById('roomAvailList').innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-3)">No hotels assigned.</div>';
            return;
        }

        // Room stats (available/booked/occupancy) are calculated in loadRoomsData()
        // using room-type level data which is what gets updated on each booking.

        // Avg Rating (weighted)
        const rated = hotels.filter(h => h.totalReviews > 0);
        if (rated.length) {
            const totalRevs  = rated.reduce((s, h) => s + h.totalReviews, 0);
            const weightedSum = rated.reduce((s, h) => s + parseFloat(h.averageRating || 0) * h.totalReviews, 0);
            const avg = (weightedSum / totalRevs).toFixed(1);
            document.getElementById('revAvgNum').textContent   = avg;
            document.getElementById('revAvgStars').textContent = '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg));
            document.getElementById('revTotalCount').textContent = totalRevs + ' review' + (totalRevs !== 1 ? 's' : '');
        } else {
            document.getElementById('revAvgNum').textContent   = '—';
            document.getElementById('revTotalCount').textContent = '0 reviews';
        }

        // Load reviews for all hotels (combined, latest first, max 3)
        loadReviews(hotels.map(h => h.id));

    } catch(e) { /* silently fail */ }
}

async function loadReviews(hotelIds) {
    const list = document.getElementById('reviewsList');
    try {
        const all = (await Promise.all(
            hotelIds.map(id => fetch(ENDPOINTS.HOTEL_REVIEWS.BY_HOTEL(id), {
                headers: { 'Authorization': 'Bearer ' + token }
            }).then(r => r.ok ? r.json() : []))
        )).flat();

        // Sort by createdAt desc, take top 3
        all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const top = all.slice(0, 3);

        if (!top.length) {
            list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-3)">No reviews yet.</div>';
            return;
        }

        const bgColors = ['linear-gradient(135deg,#2563eb,#7c3aed)','linear-gradient(135deg,#10b981,#0891b2)','linear-gradient(135deg,#f59e0b,#ef4444)'];
        list.innerHTML = top.map((r, i) => {
            const name = r.reviewerName || 'Guest';
            const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
            const date  = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            const verifiedTag = r.verified ? '<span style="font-size:10px;color:var(--secondary);margin-left:6px">✓ Verified</span>' : '';
            return `
            <div class="review-item">
                <div class="review-hdr">
                    <div class="review-avatar" style="background:${bgColors[i % bgColors.length]}">${initials}</div>
                    <div><div class="review-author">${name}${verifiedTag}</div><div class="review-date">${date}</div></div>
                    <div class="review-stars">${stars}</div>
                </div>
                ${r.comment ? `<div class="review-text">"${escapeHtml(r.comment)}"</div>` : ''}
            </div>`;
        }).join('');

    } catch(e) {
        list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-3)">Could not load reviews.</div>';
    }
}

// ── Rooms data (pricing + room type donut + room grid) ────
async function loadRoomsData() {
    try {
        const res = await fetch(ENDPOINTS.ROOMS.MY, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return;
        const rooms = await res.json();

        // ── Room summary stats (from room-type data — these are the real numbers) ──
        const rtTotal = rooms.reduce((s, rt) => s + (rt.totalRooms     || 0), 0);
        const rtAvail = rooms.reduce((s, rt) => s + (rt.availableRooms || 0), 0);

        document.getElementById('statRoomsAvail').textContent = rtAvail;
        document.getElementById('statRoomsChg').textContent   = `of ${rtTotal} total rooms`;
        document.getElementById('roomSumAvail').textContent   = rtAvail;
        window._rtTotal = rtTotal;
        updateOccBar();
        // roomSumBooked + occBar are set by whichever of loadBookings()/loadRoomsData() finishes last

        // Pricing list
        const pricingList = document.getElementById('pricingList');
        if (!rooms.length) {
            pricingList.innerHTML = '<div style="text-align:center;color:var(--text-3);padding:20px">No room types defined yet. <a href="hm-rooms.html" style="color:var(--secondary)">Add rooms →</a></div>';
        } else {
            pricingList.innerHTML = rooms.map(rt => `
                <div class="pricing-row">
                    <div>
                        <div class="pricing-type">${rt.typeName}</div>
                        <div style="font-size:11.5px;color:var(--text-3)">${rt.hotelName || ''} · ${rt.capacity} guests · ${rt.availableRooms}/${rt.totalRooms} avail.</div>
                    </div>
                    <div style="font-size:12px;color:var(--text-3)">per night</div>
                    <div class="pricing-val">PKR ${Number(rt.pricePerNight).toLocaleString()}</div>
                    <a href="hm-rooms.html" class="pricing-edit">Edit</a>
                </div>`).join('');
        }

        // Per room-type availability breakdown
        const availList = document.getElementById('roomAvailList');
        if (!rooms.length) {
            availList.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-3)">No room types defined. <a href="hm-rooms.html" style="color:var(--secondary)">Add rooms →</a></div>';
        } else {
            availList.innerHTML = rooms.map(rt => {
                const avail   = rt.availableRooms || 0;
                const total   = rt.totalRooms || 0;
                const booked  = total - avail;
                const freePct = total > 0 ? Math.round(avail / total * 100) : 0;
                const statusColor  = avail === 0 ? '#EF4444' : avail <= Math.ceil(total * 0.25) ? '#D97706' : '#10B981';
                const statusBg     = avail === 0 ? '#FEF2F2' : avail <= Math.ceil(total * 0.25) ? '#FFFBEB' : '#ECFDF5';
                const statusText   = avail === 0 ? 'Fully Booked' : avail <= Math.ceil(total * 0.25) ? 'Almost Full' : 'Available';
                const barColor     = avail === 0 ? '#EF4444' : avail <= Math.ceil(total * 0.25) ? '#F59E0B' : '#10B981';
                return `
                <div style="background:var(--bg);border-radius:var(--r-sm);padding:12px 14px">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                        <div>
                            <div style="font-size:13.5px;font-weight:700;color:var(--text-1)">${rt.typeName}</div>
                            ${rt.hotelName ? `<div style="font-size:11px;color:var(--text-3);margin-top:1px">${rt.hotelName}</div>` : ''}
                        </div>
                        <span style="font-size:11px;font-weight:700;color:${statusColor};background:${statusBg};padding:2px 8px;border-radius:20px">${statusText}</span>
                    </div>
                    <div style="height:6px;background:#E2E8F0;border-radius:3px;overflow:hidden;margin-bottom:6px">
                        <div style="height:100%;width:${freePct}%;background:${barColor};border-radius:3px;transition:width 0.8s ease"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-3)">
                        <span><strong style="color:#10B981">${avail}</strong> available</span>
                        <span><strong style="color:#EF4444">${booked}</strong> booked</span>
                        <span>${total} total</span>
                    </div>
                </div>`;
            }).join('');
        }

    } catch(e) { /* silently fail */ }
}

// ── Chart colour palette (defined early so async functions can reference it) ──
const CHART_COLORS = ['#10B981','#0891B2','#F59E0B','#6366F1','#EC4899','#EF4444'];

// ── Occupancy bar — safe to call from either async function ───────────────
function updateOccBar() {
    const active = window._activeBookings;
    const total  = window._rtTotal;
    if (active === undefined || total === undefined) return; // wait for both
    const pct = total > 0 ? Math.round(active / total * 100) : 0;
    document.getElementById('occBarText').textContent = pct + '%';
    setTimeout(() => { document.getElementById('occBar').style.width = pct + '%'; }, 600);
}

loadHotelData();
loadRoomsData();

// ── Filter pills ──────────────────────────────────────────
document.querySelectorAll('.filter-bar').forEach(bar => {
    bar.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', ()=>{ bar.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active')); pill.classList.add('active'); });
    });
});

// ── Charts (initialised with empty data; updated after API calls) ────────────
window.roomBarChartInstance = new Chart(document.getElementById('roomBarChart'), {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#94A3B8', boxWidth: 10, padding: 14 } },
            tooltip: {
                callbacks: {
                    footer: (items) => 'Total: ' + items.reduce((s, i) => s + i.parsed.y, 0)
                }
            }
        },
        scales: {
            x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 }, color: '#94A3B8' } },
            y: { stacked: true, grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 }, color: '#94A3B8', stepSize: 1 }, beginAtZero: true }
        }
    }
});

window.bookingChartInstance = new Chart(document.getElementById('bookingChart'), {
    type: 'bar',
    data: {
        labels: [],
        datasets: [
            { label: 'Bookings', data: [], backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 6, borderSkipped: false, yAxisID:'y' },
            { label: 'Revenue (K)', data: [], type: 'line', borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#F59E0B', yAxisID:'y1' }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#94A3B8', boxWidth: 10, padding: 12 } } },
        scales: {
            x:  { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94A3B8' } },
            y:  { grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 }, color: '#94A3B8' }, position: 'left' },
            y1: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94A3B8', callback: v=>'PKR '+v+'K' }, position: 'right' }
        }
    }
});


// ── Delete Account ────────────────────────────────────────
window.openDeleteModal = function() {
    document.getElementById('delPwInput').value = '';
    document.getElementById('delPwErr').textContent = '';
    document.getElementById('delPwInput').classList.remove('is-error');
    document.getElementById('delPwInput').type = 'password';
    document.getElementById('delPwToggle').textContent = '👁️';
    document.getElementById('delModal').classList.add('open');
    setTimeout(()=>document.getElementById('delPwInput').focus(), 100);
};

window.closeDeleteModal = function() {
    document.getElementById('delModal').classList.remove('open');
};

window.toggleDelPw = function() {
    const input = document.getElementById('delPwInput');
    const btn   = document.getElementById('delPwToggle');
    if (input.type === 'password') { input.type = 'text';     btn.textContent = '🙈'; }
    else                           { input.type = 'password'; btn.textContent = '👁️'; }
};

window.confirmDeleteAccount = async function() {
    const password = document.getElementById('delPwInput').value.trim();
    const errEl    = document.getElementById('delPwErr');
    const input    = document.getElementById('delPwInput');
    const btn      = document.getElementById('delConfirmBtn');

    if (!password) {
        errEl.textContent = 'Password is required.';
        input.classList.add('is-error');
        return;
    }

    errEl.textContent = '';
    input.classList.remove('is-error');
    btn.disabled = true; btn.textContent = 'Deleting...';

    try {
        const res = await fetch(ENDPOINTS.USER.DELETE_ACCOUNT, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + sessionStorage.getItem('tripify_token')
            },
            body: JSON.stringify({ password })
        });
        const data = await res.json();

        if (res.status === 422) {
            const msg = (data.errors && data.errors.password) ? data.errors.password : (data.message || 'Incorrect password.');
            errEl.textContent = msg;
            input.classList.add('is-error');
            btn.disabled = false; btn.textContent = 'Delete Account';
            return;
        }
        if (res.status === 409) {
            errEl.textContent = data.message || 'Cannot delete account at this time.';
            btn.disabled = false; btn.textContent = 'Delete Account';
            return;
        }
        if (!res.ok) {
            errEl.textContent = data.message || 'Something went wrong. Please try again.';
            btn.disabled = false; btn.textContent = 'Delete Account';
            return;
        }

        closeDeleteModal();
        showToast('🗑️', 'Account deleted. Goodbye!', 2500);
        setTimeout(()=>{
            sessionStorage.removeItem('tripify_token');
            sessionStorage.removeItem('tripify_user');
            window.location.href = '../auth/login.html';
        }, 2600);

    } catch (e) {
        errEl.textContent = 'Network error. Please check your connection.';
        btn.disabled = false; btn.textContent = 'Delete Account';
    }
};

document.getElementById('delModal').addEventListener('click', function(e) {
    if (e.target === this) closeDeleteModal();
});

// ── Account Settings ──────────────────────────────────────
let acctProfileLoaded = false;

async function loadAccountProfile() {
    if (acctProfileLoaded) return;
    try {
        const res = await fetch(ENDPOINTS.USER.PROFILE, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return;
        const data = await res.json();
        acctProfileLoaded = true;

        // Populate left profile card
        document.getElementById('acctProfileName').textContent  = data.fullName || 'Hotel Manager';
        document.getElementById('acctProfileEmail').textContent = data.email    || '';
        const ini = (data.fullName || 'HM').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
        document.getElementById('acctAvatarInitials').textContent = ini;

        if (data.profilePicture) {
            const imgHtml = `<img src="http://localhost:8080${data.profilePicture}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
            document.getElementById('acctAvatar').innerHTML      = imgHtml;
            document.getElementById('sidebarInitials').innerHTML = imgHtml;
            document.getElementById('topbarInitials').innerHTML  = imgHtml;
        }

        // Stats
        document.getElementById('apstatMember').textContent = data.memberSince ? data.memberSince.split(' ')[1] : '—';
        const bkEl = document.getElementById('statTotalBookings');
        document.getElementById('apstatBookings').textContent = bkEl ? bkEl.textContent : '0';

        // View rows
        document.getElementById('infoViewName').textContent    = data.fullName    || '—';
        document.getElementById('infoViewEmail').textContent   = data.email       || '—';
        document.getElementById('infoViewPhone').textContent   = data.phoneNumber || '—';
        document.getElementById('infoViewCnic').textContent    = data.cnic        || '—';
        document.getElementById('infoViewAddress').textContent = data.address     || '—';

        // Pre-fill edit fields
        document.getElementById('infoFullName').value = data.fullName    || '';
        document.getElementById('infoEmail').value    = data.email       || '';
        document.getElementById('infoPhone').value    = data.phoneNumber || '';
        document.getElementById('infoCnic').value     = data.cnic        || '';
        document.getElementById('infoAddress').value  = data.address     || '';
    } catch(e) { /* silently fail */ }
}

window.switchAcctTab = function(tab, btn) {
    document.querySelectorAll('.apnav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.acct-section').forEach(s => s.classList.remove('active'));
    document.getElementById('acct-' + tab).classList.add('active');
};

window.toggleInfoEdit = function(forceClose) {
    const viewMode = document.getElementById('infoViewMode');
    const editMode = document.getElementById('infoEditMode');
    const isEdit   = editMode.style.display !== 'none';
    if (forceClose === false || isEdit) {
        editMode.style.display = 'none';
        viewMode.style.display = 'block';
        document.getElementById('infoEditBtn').textContent = '✏️ Edit';
        document.getElementById('infoSuccessMsg').classList.remove('show');
    } else {
        editMode.style.display = 'block';
        viewMode.style.display = 'none';
        document.getElementById('infoEditBtn').textContent = '← View';
    }
};

window.saveProfile = async function() {
    ['errFullName','errEmail','errPhone','errCnic','errAddress'].forEach(id => {
        const el = document.getElementById(id); if (el) el.textContent = '';
    });
    document.getElementById('infoSuccessMsg').classList.remove('show');

    const fullName = document.getElementById('infoFullName').value.trim();
    const email    = document.getElementById('infoEmail').value.trim();
    const phone    = document.getElementById('infoPhone').value.trim();
    const cnic     = document.getElementById('infoCnic').value.trim();
    const address  = document.getElementById('infoAddress').value.trim();

    let valid = true;
    if (!fullName) {
        document.getElementById('errFullName').textContent = 'Full name is required.';
        document.getElementById('infoFullName').classList.add('is-error');
        valid = false;
    } else {
        document.getElementById('infoFullName').classList.remove('is-error');
    }
    if (!email) {
        document.getElementById('errEmail').textContent = 'Email is required.';
        document.getElementById('infoEmail').classList.add('is-error');
        valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById('errEmail').textContent = 'Enter a valid email address.';
        document.getElementById('infoEmail').classList.add('is-error');
        valid = false;
    } else {
        document.getElementById('infoEmail').classList.remove('is-error');
    }
    if (!phone) {
        document.getElementById('errPhone').textContent = 'Phone number is required.';
        document.getElementById('infoPhone').classList.add('is-error');
        valid = false;
    } else if (!/^03[0-9]{9}$/.test(phone)) {
        document.getElementById('errPhone').textContent = 'Enter an 11-digit Pakistani number starting with 03 (e.g. 03001234567).';
        document.getElementById('infoPhone').classList.add('is-error');
        valid = false;
    } else {
        document.getElementById('infoPhone').classList.remove('is-error');
    }
    if (!cnic) {
        document.getElementById('errCnic').textContent = 'CNIC is required.';
        document.getElementById('infoCnic').classList.add('is-error');
        valid = false;
    } else {
        const cnicDigits = cnic.replace(/\D/g, '');
        const pc = parseInt(cnicDigits.charAt(0), 10);
        if (cnicDigits.length !== 13) {
            document.getElementById('errCnic').textContent = 'CNIC must have exactly 13 digits (format: XXXXX-XXXXXXX-X).';
            document.getElementById('infoCnic').classList.add('is-error');
            valid = false;
        } else if (pc < 1 || pc > 7) {
            document.getElementById('errCnic').textContent = 'Invalid CNIC — first digit must be 1–7 (province code).';
            document.getElementById('infoCnic').classList.add('is-error');
            valid = false;
        } else if (/^(\d)\1{12}$/.test(cnicDigits)) {
            document.getElementById('errCnic').textContent = 'Enter a valid Pakistani CNIC number.';
            document.getElementById('infoCnic').classList.add('is-error');
            valid = false;
        } else {
            document.getElementById('infoCnic').classList.remove('is-error');
        }
    }
    if (!valid) return;

    // Normalise CNIC to XX...-XXXXXXX-X format
    let cnicFormatted = cnic;
    if (cnic) {
        const d = cnic.replace(/\D/g, '');
        cnicFormatted = d.slice(0,5) + '-' + d.slice(5,12) + '-' + d.slice(12);
    }

    const btn = document.getElementById('infoSaveBtn');
    btn.disabled = true; btn.textContent = 'Saving...';

    try {
        const res = await fetch(ENDPOINTS.USER.PROFILE, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ fullName, email, phoneNumber: phone, cnic: cnicFormatted, address })
        });
        const data = await res.json();

        if (res.status === 422 && data.errors) {
            const errMap = { fullName:'errFullName', email:'errEmail', phoneNumber:'errPhone', cnic:'errCnic', address:'errAddress' };
            Object.entries(data.errors).forEach(([k,v]) => { const el = document.getElementById(errMap[k]); if (el) el.textContent = v; });
            btn.disabled = false; btn.textContent = '💾 Save Changes';
            return;
        }
        if (!res.ok) {
            showToast('⚠️', data.message || 'Failed to save. Try again.');
            btn.disabled = false; btn.textContent = '💾 Save Changes';
            return;
        }

        // If email changed, update token and stored user so session stays valid
        if (data.newToken) {
            const stored = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
            stored.email = data.newEmail;
            sessionStorage.setItem('tripify_user', JSON.stringify(stored));
            sessionStorage.setItem('tripify_token', data.newToken);
            token = data.newToken; // update local var for subsequent requests
        }

        document.getElementById('infoViewName').textContent    = fullName        || '—';
        document.getElementById('infoViewEmail').textContent   = email           || '—';
        document.getElementById('infoViewPhone').textContent   = phone           || '—';
        document.getElementById('infoViewCnic').textContent    = cnicFormatted   || '—';
        document.getElementById('infoViewAddress').textContent = address         || '—';
        document.getElementById('acctProfileName').textContent = fullName;
        document.getElementById('acctProfileEmail').textContent = email;
        document.getElementById('sidebarName').textContent     = fullName;

        if (!document.getElementById('acctAvatar').querySelector('img')) {
            const ini = fullName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
            document.getElementById('acctAvatarInitials').textContent = ini;
            document.getElementById('sidebarInitials').textContent    = ini;
            document.getElementById('topbarInitials').textContent     = ini;
        }

        document.getElementById('infoSuccessMsg').classList.add('show');
        btn.disabled = false; btn.textContent = '💾 Save Changes';
        showToast('✅', 'Profile updated!');
    } catch(e) {
        showToast('⚠️', 'Network error. Please try again.');
        btn.disabled = false; btn.textContent = '💾 Save Changes';
    }
};

window.handleAvatarUpload = async function(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('⚠️', 'Image must be smaller than 2MB.'); return; }

    const formData = new FormData();
    formData.append('file', file);
    showToast('⏳', 'Uploading photo...');

    try {
        const res = await fetch(ENDPOINTS.USER.UPLOAD_AVATAR, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) { showToast('⚠️', data.message || 'Upload failed.'); return; }

        const imgHtml = `<img src="http://localhost:8080${data.avatarUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        document.getElementById('acctAvatar').innerHTML      = imgHtml;
        document.getElementById('sidebarInitials').innerHTML = imgHtml;
        document.getElementById('topbarInitials').innerHTML  = imgHtml;
        showToast('✅', 'Profile photo updated!');
        input.value = '';
    } catch(e) { showToast('⚠️', 'Network error. Please try again.'); }
};

window.autoFormatPhone = function(input) {
    input.value = input.value.replace(/\D/g, '').slice(0, 11);
};

window.autoFormatCnic = function(input) {
    const d = input.value.replace(/\D/g, '').slice(0, 13);
    let v = d;
    if (d.length > 5)  v = d.slice(0,5) + '-' + d.slice(5);
    if (d.length > 12) v = d.slice(0,5) + '-' + d.slice(5,12) + '-' + d.slice(12);
    input.value = v;
};

window.validateHmCnicField = function() {
    const val    = document.getElementById('infoCnic').value.trim();
    const errEl  = document.getElementById('errCnic');
    if (!val) { errEl.textContent = 'CNIC is required.'; document.getElementById('infoCnic').classList.add('is-error'); return; }
    const digits = val.replace(/\D/g, '');
    const pc     = parseInt(digits.charAt(0), 10);
    if (digits.length !== 13) {
        errEl.textContent = 'CNIC must have exactly 13 digits (format: XXXXX-XXXXXXX-X).';
    } else if (pc < 1 || pc > 7) {
        errEl.textContent = 'Invalid CNIC — first digit must be 1–7 (province code).';
    } else if (/^(\d)\1{12}$/.test(digits)) {
        errEl.textContent = 'Enter a valid Pakistani CNIC number.';
    } else {
        errEl.textContent = '';
        document.getElementById('infoCnic').classList.remove('is-error');
    }
};

window.togglePw = function(inputId, btn) {
    const inp = document.getElementById(inputId);
    if (inp.type === 'password') { inp.type = 'text';     btn.textContent = '🙈'; }
    else                         { inp.type = 'password'; btn.textContent = '👁️'; }
};

window.checkPwStrength = function(pw) {
    const el = document.getElementById('pwStrength');
    el.classList.toggle('show', pw.length > 0);
    const hasLen   = pw.length >= 8;
    const hasUpper = /[A-Z]/.test(pw);
    const hasNum   = /[0-9]/.test(pw);
    const hasSpec  = /[^A-Za-z0-9]/.test(pw);
    document.getElementById('rule-len').classList.toggle('pass', hasLen);
    document.getElementById('rule-upper').classList.toggle('pass', hasUpper);
    document.getElementById('rule-num').classList.toggle('pass', hasNum);
    document.getElementById('rule-special').classList.toggle('pass', hasSpec);
    const score = [hasLen,hasUpper,hasNum,hasSpec].filter(Boolean).length;
    el.className = 'pw-strength show ' + (score <= 1 ? 'weak' : score <= 3 ? 'fair' : 'strong');
    document.getElementById('pwStrengthLabel').textContent = score <= 1 ? 'Weak' : score <= 3 ? 'Fair' : 'Strong';
};

window.changePassword = async function() {
    ['errPwCurrent','errPwNew','errPwConfirm'].forEach(id => document.getElementById(id).textContent = '');
    document.getElementById('pwSuccessMsg').classList.remove('show');

    const currentPw = document.getElementById('pwCurrent').value;
    const newPw     = document.getElementById('pwNew').value;
    const confirmPw = document.getElementById('pwConfirm').value;

    let valid = true;
    if (!currentPw)             { document.getElementById('errPwCurrent').textContent = 'Current password is required.'; valid = false; }
    if (newPw.length < 8)       { document.getElementById('errPwNew').textContent     = 'New password must be at least 8 characters.'; valid = false; }
    if (confirmPw !== newPw)    { document.getElementById('errPwConfirm').textContent = 'Passwords do not match.'; valid = false; }
    if (!valid) return;

    const btn = document.getElementById('pwSaveBtn');
    btn.disabled = true; btn.textContent = 'Updating...';

    try {
        const res = await fetch(ENDPOINTS.USER.CHANGE_PASSWORD, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw, confirmPassword: confirmPw })
        });
        const data = await res.json();

        if (res.status === 422 && data.errors) {
            if (data.errors.currentPassword) document.getElementById('errPwCurrent').textContent = data.errors.currentPassword;
            if (data.errors.newPassword)     document.getElementById('errPwNew').textContent     = data.errors.newPassword;
            if (data.errors.confirmPassword) document.getElementById('errPwConfirm').textContent = data.errors.confirmPassword;
            btn.disabled = false; btn.textContent = '🔒 Update Password';
            return;
        }
        if (!res.ok) {
            showToast('⚠️', data.message || 'Failed. Try again.');
            btn.disabled = false; btn.textContent = '🔒 Update Password';
            return;
        }

        document.getElementById('pwCurrent').value = '';
        document.getElementById('pwNew').value     = '';
        document.getElementById('pwConfirm').value = '';
        document.getElementById('pwStrength').classList.remove('show');
        document.getElementById('pwSuccessMsg').classList.add('show');
        btn.disabled = false; btn.textContent = '🔒 Update Password';
        showToast('✅', 'Password updated! Redirecting to login...');
        setTimeout(() => {
            sessionStorage.removeItem('tripify_token');
            sessionStorage.removeItem('tripify_user');
            window.location.href = '../auth/login.html';
        }, 2000);
    } catch(e) {
        showToast('⚠️', 'Network error. Please try again.');
        btn.disabled = false; btn.textContent = '🔒 Update Password';
    }
};

// ── Notifications ─────────────────────────────────────────
let notifDropdownOpen = false;

async function loadNotifBadge() {
    try {
        const res = await fetch(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) return;
        const data = await res.json();
        const dot = document.getElementById('notifDot');
        if (dot) dot.style.display = data.count > 0 ? 'block' : 'none';
    } catch(e) {}
}

async function loadNotifList() {
    const list = document.getElementById('notifList');
    list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-3);font-size:13px">Loading...</div>';
    try {
        const res = await fetch(ENDPOINTS.NOTIFICATIONS.LIST, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const notifs = data.notifications || [];
        if (!notifs.length) {
            list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px">No notifications yet.</div>';
            return;
        }
        list.innerHTML = notifs.map(n => `
            <div onclick="markNotifRead(${n.notificationId}, this)" style="padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s;background:${n.isRead ? 'transparent' : 'rgba(37,99,235,0.04)'}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                    <div style="font-size:13px;font-weight:${n.isRead ? '400' : '600'};color:var(--text-1);line-height:1.4">${n.title}</div>
                    ${!n.isRead ? '<span style="width:7px;height:7px;background:var(--primary);border-radius:50%;flex-shrink:0;margin-top:4px"></span>' : ''}
                </div>
                <div style="font-size:12px;color:var(--text-3);margin-top:3px;line-height:1.5">${n.message}</div>
                <div style="font-size:11px;color:var(--text-3);margin-top:4px">${n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</div>
            </div>`).join('');
    } catch(e) {
        list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-3);font-size:13px">Could not load notifications.</div>';
    }
}

window.toggleNotifDropdown = function() {
    const dd = document.getElementById('notifDropdown');
    notifDropdownOpen = !notifDropdownOpen;
    dd.style.display = notifDropdownOpen ? 'block' : 'none';
    if (notifDropdownOpen) loadNotifList();
};

window.markNotifRead = async function(id, el) {
    try {
        await fetch(ENDPOINTS.NOTIFICATIONS.MARK_READ(id), {
            method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }
        });
        el.style.background = 'transparent';
        const dot = el.querySelector('span[style*="background:var(--primary)"]');
        if (dot) dot.remove();
        el.querySelector('div:first-child div').style.fontWeight = '400';
        loadNotifBadge();
    } catch(e) {}
};

window.markAllNotifsRead = async function() {
    try {
        await fetch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {
            method: 'PUT', headers: { 'Authorization': 'Bearer ' + token }
        });
        document.getElementById('notifDot').style.display = 'none';
        loadNotifList();
    } catch(e) {}
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('#notifBtn') && !e.target.closest('#notifDropdown') && notifDropdownOpen) {
        notifDropdownOpen = false;
        document.getElementById('notifDropdown').style.display = 'none';
    }
});

loadNotifBadge();
setInterval(loadNotifBadge, 30000); // refresh badge every 30s

// ── Room Management ────────────────────────────────────────
let rmHotels = [], rmCurrentHotelId = null, rmEditingRoomId = null;

async function loadRoomManagement() {
    const container = document.getElementById('rmHotelsContainer');
    container.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-3)">Loading hotels...</div>';
    try {
        // Fetch managed hotels + their room types
        const [hotelsRes, roomsRes] = await Promise.all([
            fetch(ENDPOINTS.BOOKINGS.ALL, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(ENDPOINTS.ROOMS.MY,     { headers: { 'Authorization': 'Bearer ' + token } })
        ]);
        // We need hotel list — use the booking endpoint to get hotel IDs, or add a hotels-by-manager endpoint.
        // Actually we'll fetch hotels directly via HOTELS.ALL and filter by manager info from rooms.MY
        const roomsData = roomsRes.ok ? await roomsRes.json() : [];
        // Group rooms by hotelId
        const roomsByHotel = {};
        roomsData.forEach(r => {
            if (!roomsByHotel[r.hotelId]) roomsByHotel[r.hotelId] = { hotelName: r.hotelName, rooms: [] };
            roomsByHotel[r.hotelId].rooms.push(r);
        });

        // Also fetch all hotels to find ones managed by this user (rooms.MY only shows hotels WITH rooms)
        // We'll use the booking data to find hotel IDs
        const bkData = hotelsRes.ok ? await hotelsRes.json() : { bookings: [] };
        const hotelIdsFromBookings = [...new Set((bkData.bookings || []).map(b => b.hotelId).filter(Boolean))];
        hotelIdsFromBookings.forEach(hid => {
            if (!roomsByHotel[hid]) {
                const name = (bkData.bookings || []).find(b => b.hotelId === hid)?.hotelName || 'Hotel #' + hid;
                roomsByHotel[hid] = { hotelName: name, rooms: [] };
            }
        });

        const entries = Object.entries(roomsByHotel);
        if (!entries.length) {
            container.innerHTML = `
                <div style="text-align:center;padding:48px">
                    <div style="font-size:36px;margin-bottom:12px">🏨</div>
                    <div style="color:var(--text-2);font-size:15px;margin-bottom:8px">No hotels found</div>
                    <div style="color:var(--text-3);font-size:13px">Your assigned hotels will appear here. Contact admin if needed.</div>
                </div>`;
            return;
        }

        container.innerHTML = entries.map(([hotelId, data]) => `
            <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:20px">
                <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--border);background:var(--bg)">
                    <div>
                        <div style="font-size:16px;font-weight:700;color:var(--text-1)">🏨 ${data.hotelName}</div>
                        <div style="font-size:12px;color:var(--text-3);margin-top:2px">${data.rooms.length} room type${data.rooms.length !== 1 ? 's' : ''} defined</div>
                    </div>
                    <button onclick="openAddRoomModal(${hotelId}, '${data.hotelName.replace(/'/g,"\\'")}', this)" style="padding:8px 14px;background:var(--secondary);border:none;border-radius:var(--r-sm);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font)">+ Add Room Type</button>
                </div>
                <div style="padding:16px 20px">
                    ${data.rooms.length ? data.rooms.map(r => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:10px;flex-wrap:wrap;gap:10px">
                            <div style="min-width:0">
                                <div style="font-size:14px;font-weight:700;color:var(--text-1)">${r.typeName}</div>
                                <div style="font-size:12px;color:var(--text-3);margin-top:2px">👥 ${r.capacity} guests · Rs. ${Number(r.pricePerNight).toLocaleString()}/night · ${r.availableRooms}/${r.totalRooms} available</div>
                                ${r.amenities ? '<div style="font-size:11px;color:var(--text-3);margin-top:3px">' + r.amenities + '</div>' : ''}
                            </div>
                            <div style="display:flex;gap:8px;flex-shrink:0">
                                <button onclick="openEditRoomModal(${JSON.stringify(r).replace(/"/g,'&quot;')})" style="padding:6px 12px;background:var(--primary-lt);border:1px solid rgba(37,99,235,0.2);border-radius:var(--r-sm);color:var(--primary);font-size:12px;cursor:pointer;font-family:var(--font)">Edit</button>
                                <button onclick="deleteRoomType(${r.roomTypeId}, this)" style="padding:6px 12px;background:var(--danger-lt);border:1px solid rgba(239,68,68,0.2);border-radius:var(--r-sm);color:var(--danger);font-size:12px;cursor:pointer;font-family:var(--font)">Remove</button>
                            </div>
                        </div>`).join('') :
                    '<div style="text-align:center;padding:24px;color:var(--text-3);font-size:13px">No room types yet. Click "+ Add Room Type" to define rooms for tourists to book.</div>'}
                </div>
            </div>`).join('');
    } catch(e) {
        container.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-3)">Failed to load room data. <button onclick="loadRoomManagement()" style="margin-left:8px;padding:4px 10px;background:var(--primary);border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:12px">Retry</button></div>';
    }
}

window.openAddRoomModal = function(hotelId, hotelName) {
    rmCurrentHotelId = hotelId;
    rmEditingRoomId  = null;
    document.getElementById('rmModalTitle').textContent   = 'Add Room Type';
    document.getElementById('rmModalHotelName').textContent = '🏨 ' + hotelName;
    document.getElementById('rmHotelId').value     = hotelId;
    document.getElementById('rmRoomTypeId').value  = '';
    document.getElementById('rmTypeName').value    = '';
    document.getElementById('rmCapacity').value    = '2';
    document.getElementById('rmPrice').value       = '';
    document.getElementById('rmTotalRooms').value  = '1';
    document.getElementById('rmAvailRooms').value  = '1';
    document.getElementById('rmAmenities').value   = '';
    document.getElementById('rmDescription').value = '';
    document.getElementById('rmErrMsg').style.display = 'none';
    document.getElementById('rmSaveBtn').textContent = 'Add Room Type';
    const bg = document.getElementById('rmModalBg');
    bg.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.openEditRoomModal = function(r) {
    rmCurrentHotelId = r.hotelId;
    rmEditingRoomId  = r.roomTypeId;
    document.getElementById('rmModalTitle').textContent   = 'Edit Room Type';
    document.getElementById('rmModalHotelName').textContent = '🏨 ' + (r.hotelName || 'Hotel');
    document.getElementById('rmHotelId').value     = r.hotelId;
    document.getElementById('rmRoomTypeId').value  = r.roomTypeId;
    document.getElementById('rmTypeName').value    = r.typeName   || '';
    document.getElementById('rmCapacity').value    = r.capacity   || 2;
    document.getElementById('rmPrice').value       = r.pricePerNight || '';
    document.getElementById('rmTotalRooms').value  = r.totalRooms || 1;
    document.getElementById('rmAvailRooms').value  = r.availableRooms || 0;
    document.getElementById('rmAmenities').value   = r.amenities  || '';
    document.getElementById('rmDescription').value = r.description || '';
    document.getElementById('rmErrMsg').style.display = 'none';
    document.getElementById('rmSaveBtn').textContent = 'Save Changes';
    const bg = document.getElementById('rmModalBg');
    bg.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

window.closeRmModal = function() {
    document.getElementById('rmModalBg').style.display = 'none';
    document.body.style.overflow = '';
};

window.saveRoomType = async function() {
    const errEl = document.getElementById('rmErrMsg');
    const btn   = document.getElementById('rmSaveBtn');
    errEl.style.display = 'none';

    const typeName   = document.getElementById('rmTypeName').value.trim();
    const capacity   = parseInt(document.getElementById('rmCapacity').value);
    const price      = parseFloat(document.getElementById('rmPrice').value);
    const totalRooms = parseInt(document.getElementById('rmTotalRooms').value);
    const availRooms = parseInt(document.getElementById('rmAvailRooms').value);
    const amenities  = document.getElementById('rmAmenities').value.trim();
    const desc       = document.getElementById('rmDescription').value.trim();
    const hotelId    = parseInt(document.getElementById('rmHotelId').value);
    const rtId       = document.getElementById('rmRoomTypeId').value;

    if (!typeName) { errEl.textContent = 'Room type name is required.'; errEl.style.display = 'block'; return; }
    if (!capacity || capacity < 1) { errEl.textContent = 'Capacity must be at least 1.'; errEl.style.display = 'block'; return; }
    if (!price || price < 0) { errEl.textContent = 'Valid price per night is required.'; errEl.style.display = 'block'; return; }
    if (!totalRooms || totalRooms < 1) { errEl.textContent = 'Total rooms must be at least 1.'; errEl.style.display = 'block'; return; }
    if (isNaN(availRooms) || availRooms < 0 || availRooms > totalRooms) { errEl.textContent = 'Available rooms must be between 0 and total rooms.'; errEl.style.display = 'block'; return; }

    btn.disabled = true; btn.textContent = 'Saving...';

    const payload = { hotelId, typeName, capacity, pricePerNight: price, totalRooms, availableRooms: availRooms, amenities: amenities || null, description: desc || null };

    try {
        const isEdit = !!rtId;
        const url    = isEdit ? ENDPOINTS.ROOMS.UPDATE(rtId) : ENDPOINTS.ROOMS.ADD;
        const res    = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) { errEl.textContent = data.message || 'Failed to save room type.'; errEl.style.display = 'block'; return; }

        closeRmModal();
        showToast('✅', isEdit ? 'Room type updated.' : 'Room type added.');
        loadRoomManagement();
    } catch(e) {
        errEl.textContent = 'Network error. Please try again.';
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = rmEditingRoomId ? 'Save Changes' : 'Add Room Type';
    }
};

window.deleteRoomType = async function(roomTypeId, btn) {
    if (!confirm('Remove this room type? Tourists will no longer be able to book it.')) return;
    btn.disabled = true; btn.textContent = '...';
    try {
        const res = await fetch(ENDPOINTS.ROOMS.DELETE(roomTypeId), {
            method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) { showToast('🗑️', 'Room type removed.'); loadRoomManagement(); }
        else { showToast('⚠️', 'Could not remove room type.'); btn.disabled = false; btn.textContent = 'Remove'; }
    } catch(e) { showToast('⚠️', 'Network error.'); btn.disabled = false; btn.textContent = 'Remove'; }
};

// ── Logout ────────────────────────────────────────────────
window.doLogout = function() {
    showToast('👋', 'Signing out...');
    setTimeout(()=>{ sessionStorage.removeItem('tripify_token'); sessionStorage.removeItem('tripify_user'); window.location.href='../auth/login.html'; },1200);
};

// ── Toast ─────────────────────────────────────────────────
window.showToast = function(icon, msg, dur=3000) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div'); t.className='toast';
    t.innerHTML=`<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),300); },dur);
};

// ── Auto-section from URL param — runs last so all vars/fns are defined ──
(function() {
    const urlSection = new URLSearchParams(location.search).get('section');
    if (!urlSection || !['account', 'rooms'].includes(urlSection)) return;

    const labels = { account: 'Account Settings', rooms: 'Room Management' };

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => {
        const span = item.querySelector('span:last-child');
        if (span && span.textContent.trim() === labels[urlSection]) item.classList.add('active');
    });

    // Update breadcrumb
    document.getElementById('breadcrumbCur').textContent = labels[urlSection];

    // Switch sections
    ['pg-dashboard', 'pg-rooms', 'pg-account'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    if (urlSection === 'account') {
        document.getElementById('pg-account').style.display = 'block';
        loadAccountProfile();
    } else if (urlSection === 'rooms') {
        document.getElementById('pg-rooms').style.display = 'block';
        loadRoomManagement();
    }
})();

})();
