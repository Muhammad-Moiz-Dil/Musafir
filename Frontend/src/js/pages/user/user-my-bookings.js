(function () {
'use strict';

// ── Auth guard ─────────────────────────────────────────────
const token = sessionStorage.getItem('tripify_token');
if (!token) { window.location.href = '../auth/login.html'; return; }

// ── State ──────────────────────────────────────────────────
let allBookings   = [];
let reviewedMap   = {};   // hotelId → { rating, comment }
let activeFilter  = 'All';
let openFormId    = null; // bookingId whose review form is open
let starRatings   = {};   // bookingId → chosen star value

// ── Toast ──────────────────────────────────────────────────
function toast(icon, msg) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast'; t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

// ── Sidebar / topbar user ──────────────────────────────────
function populateUserUI() {
    const u = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('sidebarName').textContent = u.fullName || '—';
    if (u.profilePicture) {
        const img = `<img src="http://localhost:8080${u.profilePicture}?t=${Date.now()}" alt="Avatar" onerror="this.parentElement.textContent='${ini}'">`;
        document.getElementById('sidebarAvatar').innerHTML = img;
        document.getElementById('topbarAvatar').innerHTML  = img;
    } else {
        document.getElementById('sidebarAvatar').textContent = ini;
        document.getElementById('topbarAvatar').textContent  = ini;
    }
}
populateUserUI();

// ── Fetch my reviews (to know which hotels already reviewed) ─
async function fetchMyReviews() {
    try {
        const res = await fetch(ENDPOINTS.HOTEL_REVIEWS.MINE, {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) return;
        const data = await res.json();
        reviewedMap = {};
        data.forEach(r => { reviewedMap[r.hotelId] = r; });
    } catch { /* ignore */ }
}

// ── Fetch bookings ─────────────────────────────────────────
async function loadBookings() {
    try {
        const res = await fetch(ENDPOINTS.BOOKINGS.MY, {
            headers: { Authorization: 'Bearer ' + token }
        });
        if (res.status === 401) { AuthService.logout(); return; }
        if (!res.ok) throw new Error();
        allBookings = await res.json();
        render();
    } catch {
        document.getElementById('bookingsList').innerHTML =
            '<div class="bk-empty"><div class="icon">⚠️</div><p>Could not load bookings. Please try again.</p></div>';
    }
}

// ── Render ─────────────────────────────────────────────────
function render() {
    const list = activeFilter === 'All'
        ? allBookings
        : allBookings.filter(b => b.bookingStatus === activeFilter);

    const el = document.getElementById('bookingsList');
    if (!list.length) {
        el.innerHTML = `<div class="bk-empty"><div class="icon">🏨</div><p>${activeFilter === 'All' ? "You haven't made any bookings yet." : 'No ' + activeFilter.toLowerCase() + ' bookings.'}</p></div>`;
        return;
    }

    el.innerHTML = list.map(b => bookingCard(b)).join('');
}

function fmtDate(d) {
    return d ? new Date(d).toLocaleDateString('en-PK', { day:'numeric', month:'short', year:'numeric' }) : '—';
}

function bookingCard(b) {
    const imgHtml = b.imageUrl
        ? `<img class="bk-img" src="${b.imageUrl}" alt="${b.hotelName || ''}" onerror="this.style.display='none'">`
        : `<div class="bk-img-placeholder">🏨</div>`;

    const reviewBar = buildReviewBar(b);

    return `
    <div class="bk-card" id="bkcard-${b.bookingId}">
        <div class="bk-main">
            ${imgHtml}
            <div class="bk-info">
                <div class="bk-hotel">${b.hotelName || 'Hotel'}</div>
                <div class="bk-room">${b.roomTypeName ? b.roomTypeName : 'Standard Room'} &nbsp;·&nbsp; ${b.numberOfGuests || 1} guest${(b.numberOfGuests || 1) !== 1 ? 's' : ''}</div>
                <div class="bk-meta">
                    <div class="bk-meta-item">Check-in <strong>${fmtDate(b.checkInDate)}</strong></div>
                    <div class="bk-meta-item">Check-out <strong>${fmtDate(b.checkOutDate)}</strong></div>
                    <div class="bk-meta-item">Booking <strong>#${b.bookingId}</strong></div>
                </div>
            </div>
            <div class="bk-right">
                <span class="bk-status ${b.bookingStatus}">${b.bookingStatus}</span>
                <div>
                    <div class="bk-cost">Rs. ${parseFloat(b.totalCost || 0).toLocaleString()}</div>
                    <div class="bk-nights">${b.nights || 1} night${(b.nights || 1) !== 1 ? 's' : ''}</div>
                </div>
            </div>
        </div>
        ${reviewBar}
        <div id="revform-${b.bookingId}" style="display:none"></div>
    </div>`;
}

function buildReviewBar(b) {
    const canReview = (b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Completed');
    if (!canReview) return '';

    const existing = reviewedMap[b.hotelId];
    if (existing) {
        const stars = '★'.repeat(existing.rating) + '☆'.repeat(5 - existing.rating);
        return `<div class="bk-review-bar">
            <div class="bk-already-reviewed"><span class="stars">${stars}</span> Your review for ${b.hotelName || 'this hotel'}</div>
        </div>`;
    }

    return `<div class="bk-review-bar">
        <span style="font-size:12.5px;color:var(--t3)">How was your stay?</span>
        <button class="btn-review" onclick="toggleReviewForm(${b.bookingId}, ${b.hotelId}, '${(b.hotelName || '').replace(/'/g, "\\'")}')">Rate &amp; Review</button>
    </div>`;
}

// ── Toggle review form ─────────────────────────────────────
window.toggleReviewForm = function(bookingId, hotelId, hotelName) {
    const formEl = document.getElementById('revform-' + bookingId);
    if (openFormId === bookingId) {
        formEl.style.display = 'none';
        openFormId = null;
        return;
    }
    // close any previously open form
    if (openFormId) {
        const prev = document.getElementById('revform-' + openFormId);
        if (prev) prev.style.display = 'none';
    }
    openFormId = bookingId;
    starRatings[bookingId] = 0;
    formEl.innerHTML = reviewFormHtml(bookingId, hotelId, hotelName);
    formEl.style.display = 'block';
};

function reviewFormHtml(bookingId, hotelId, hotelName) {
    return `
    <div class="rev-inline">
        <div class="rev-inline-title">Review — ${hotelName}</div>
        <div class="star-row" id="stars-${bookingId}">
            <span onclick="pickStar(${bookingId},1)">★</span>
            <span onclick="pickStar(${bookingId},2)">★</span>
            <span onclick="pickStar(${bookingId},3)">★</span>
            <span onclick="pickStar(${bookingId},4)">★</span>
            <span onclick="pickStar(${bookingId},5)">★</span>
        </div>
        <textarea class="rev-textarea" id="revtxt-${bookingId}" placeholder="Share your experience (optional)…"></textarea>
        <div class="rev-err" id="reverr-${bookingId}"></div>
        <div class="rev-actions">
            <button class="btn-submit-rev" id="revbtn-${bookingId}" onclick="submitReview(${bookingId},${hotelId})">Submit Review</button>
            <button class="btn-cancel-rev" onclick="toggleReviewForm(${bookingId},${hotelId},'')">Cancel</button>
        </div>
    </div>`;
}

// ── Star picker ────────────────────────────────────────────
window.pickStar = function(bookingId, val) {
    starRatings[bookingId] = val;
    document.querySelectorAll(`#stars-${bookingId} span`).forEach((s, i) => {
        s.classList.toggle('lit', i < val);
    });
};

// ── Submit review ──────────────────────────────────────────
window.submitReview = async function(bookingId, hotelId) {
    const rating  = starRatings[bookingId] || 0;
    const comment = (document.getElementById('revtxt-' + bookingId).value || '').trim();
    const errEl   = document.getElementById('reverr-' + bookingId);
    const btn     = document.getElementById('revbtn-' + bookingId);

    errEl.style.display = 'none';
    if (!rating) { errEl.textContent = 'Please select a star rating.'; errEl.style.display = 'block'; return; }

    btn.disabled = true; btn.textContent = 'Submitting…';

    try {
        const res = await fetch(ENDPOINTS.HOTEL_REVIEWS.SUBMIT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ hotelId, rating, comment: comment || null })
        });
        if (res.status === 401) { AuthService.logout(); return; }
        const data = await res.json();
        if (!res.ok) {
            errEl.textContent = data.message || 'Failed to submit. Try again.';
            errEl.style.display = 'block';
            btn.disabled = false; btn.textContent = 'Submit Review';
            return;
        }

        // Update local state
        reviewedMap[hotelId] = { rating, comment };
        openFormId = null;

        // Rebuild just this card
        const booking = allBookings.find(b => b.bookingId === bookingId);
        if (booking) {
            const cardEl = document.getElementById('bkcard-' + bookingId);
            if (cardEl) cardEl.outerHTML = bookingCard(booking);
        }

        toast('⭐', data.message || 'Review submitted!');
    } catch {
        errEl.textContent = 'Network error. Please try again.';
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Submit Review';
    }
};

// ── Filter tabs ────────────────────────────────────────────
document.querySelectorAll('.ftab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFilter = tab.dataset.filter;
        openFormId = null;
        render();
    });
});

// ── Sidebar toggle ─────────────────────────────────────────
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

// ── Init ───────────────────────────────────────────────────
(async function init() {
    await fetchMyReviews();
    await loadBookings();
})();

})();
