// ── Auth guard ──────────────────────────────────────────────
const TOKEN = sessionStorage.getItem('tripify_token');
const USER  = JSON.parse(sessionStorage.getItem('tripify_user') || '{"fullName":"Tourist"}');
if (!TOKEN) window.location.href = '../auth/login.html';

// ── State ───────────────────────────────────────────────────
let trips            = [];
let allDestinations  = [];
let pendingDestId    = null;
let pendingDestName  = '';
let selectedStar     = 0;
let submitting       = false;

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

// ── Image resolver (mirrors destinations.html) ──────────────
const IMG_BASE = '../../../../public/assets/images/';
const IMG_MAP  = {
    'hunza.jpg':            IMG_BASE + 'hunza-valley.jpg',
    'murree.jpg':           IMG_BASE + 'murree.jpeg',
    'swat.jpg':             IMG_BASE + 'swat.jpg',
    'skardu.jpg':           IMG_BASE + 'skardu.jpeg',
    'naran.jpg':            IMG_BASE + 'naran kaghan.jpg',
    'lahore.jpg':           IMG_BASE + 'lahore.jpg',
    'islamabad.jpg':        IMG_BASE + 'islamabad.jpeg',
    'islamabad.jpeg':       IMG_BASE + 'islamabad.jpeg',
    'fairy-meadows.jpg':    IMG_BASE + 'fairyMeadows.jpeg',
    'fairyMeadows.jpeg':    IMG_BASE + 'fairyMeadows.jpeg',
    'mohenjo-daro.jpg':     IMG_BASE + 'mohenjodaro.jpeg',
    'mohenjodaro.jpeg':     IMG_BASE + 'mohenjodaro.jpeg',
    'cholistan.jpg':        IMG_BASE + 'cholistanDesert.jpeg',
    'cholistanDesert.jpeg': IMG_BASE + 'cholistanDesert.jpeg',
};

// ── Init ────────────────────────────────────────────────────
async function init() {
    applyUserProfile(USER);
    await loadAllDestinations();
    await loadTrips();
    setupCreateTrip();
    setupModal();
    setupSidebar();
}

// ── Load trips from backend ─────────────────────────────────
async function loadTrips() {
    const listEl = document.getElementById('tripsList');
    listEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--t3)"><span class="spin">⏳</span> Loading trips…</div>';
    try {
        const res = await fetch(ENDPOINTS.TRIPS.LIST, {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            listEl.innerHTML = `<div class="trips-empty"><div class="trips-empty-icon">⚠️</div><h3>Couldn't load trips</h3><p>${d.message || 'Please try again.'}</p></div>`;
            return;
        }
        trips = await res.json();
        renderTrips();
    } catch (e) {
        listEl.innerHTML = '<div class="trips-empty"><div class="trips-empty-icon">📶</div><h3>Network error</h3><p>Check your connection and that the server is running.</p></div>';
    }
}

// ── Load all destinations for add-dropdown ──────────────────
async function loadAllDestinations() {
    try {
        const res = await fetch(ENDPOINTS.DESTINATIONS.SEARCH, {
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        if (res.ok) allDestinations = await res.json();
    } catch (e) { /* non-critical — dropdowns will be empty */ }
}

// ── Render all trips ────────────────────────────────────────
function renderTrips(filter) {
    const listEl = document.getElementById('tripsList');
    let data = trips;
    if (filter) {
        const q = filter.toLowerCase();
        data = trips.filter(t => t.title.toLowerCase().includes(q));
    }
    if (data.length === 0) {
        listEl.innerHTML = `
        <div class="trips-empty">
            <div class="trips-empty-icon">🗺️</div>
            <h3>${filter ? 'No trips match your search' : 'No trips yet'}</h3>
            <p>${filter ? 'Try a different search term.' : 'Create your first trip above and start planning!'}</p>
        </div>`;
        return;
    }
    listEl.innerHTML = data.map(t => renderTripCard(t)).join('');
    data.filter(t => t.status !== 'COMPLETED').forEach(t => initTripDestSearch(t.tripId));
}

function renderTripCard(trip) {
    const isCompleted = trip.status === 'COMPLETED';
    const fmt = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'numeric', month:'short', year:'numeric' }) : null;
    const startFmt = fmt(trip.startDate);
    const endFmt   = fmt(trip.endDate);
    const dateLabel = startFmt && endFmt ? `${startFmt} → ${endFmt}`
                    : startFmt           ? `From ${startFmt}`
                    : endFmt             ? `Until ${endFmt}`
                    : trip.createdAt     ? `Created ${fmt(trip.createdAt)}` : '';
    const date = dateLabel;

    const destsHtml = trip.destinations && trip.destinations.length > 0
        ? trip.destinations.map((d, i) => renderDestRow(trip, d, i + 1, isCompleted)).join('')
        : `<div class="no-dests">No destinations added yet. Add one below.</div>`;

    const addDestHtml = !isCompleted ? `
    <div class="add-dest-row" id="addRow-${trip.tripId}">
        <div class="dest-search-wrap" id="destSearchWrap-${trip.tripId}" style="flex:1;max-width:320px;">
            <div class="dest-search-input-row">
                <svg class="dest-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" id="addSearchInput-${trip.tripId}" class="dest-search-input" placeholder="Search destination…" autocomplete="off" data-trip-id="${trip.tripId}">
                <button type="button" class="dest-search-clear" id="addSearchClear-${trip.tripId}">✕</button>
            </div>
            <div class="dest-search-dropdown" id="addSearchDropdown-${trip.tripId}"></div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="addDestination(${trip.tripId})">Add</button>
        <span class="add-dest-err" id="addErr-${trip.tripId}"></span>
    </div>` : '';

    const actionsHtml = isCompleted
        ? `<button class="btn btn-danger btn-sm" onclick="deleteTrip(${trip.tripId}, this)">Delete Trip</button>`
        : `<button class="btn btn-success btn-sm" onclick="markComplete(${trip.tripId}, this)">✓ Mark as Complete</button>
           <button class="btn btn-danger btn-sm" onclick="deleteTrip(${trip.tripId}, this)">Delete Trip</button>`;

    return `
    <div class="trip-card" id="tripCard-${trip.tripId}">
        <div class="trip-card-header">
            <div class="trip-title-block">
                <div class="trip-title">${escHtml(trip.title)}</div>
                <div class="trip-date">${escHtml(date)}</div>
            </div>
            <span class="trip-badge ${isCompleted ? 'badge-completed' : 'badge-planned'}">${isCompleted ? 'Completed' : 'Planned'}</span>
        </div>

        <div class="trip-dests-label">Destinations (${trip.destinations ? trip.destinations.length : 0})</div>
        <div class="trip-dest-list">${destsHtml}</div>

        ${addDestHtml}
        <div class="trip-actions">${actionsHtml}</div>
    </div>`;
}

function renderDestRow(trip, dest, num, isCompleted) {
    const rightSide = isCompleted
        ? (dest.reviewed
            ? `<div class="rated-badge">
                   <span class="rated-stars">${'★'.repeat(dest.userRating)}${'☆'.repeat(5 - dest.userRating)}</span>
                   <span class="rated-num">${dest.userRating}/5</span>
                   ${dest.userReviewText ? `<span class="rated-text" title="${escHtml(dest.userReviewText)}">"${escHtml(dest.userReviewText)}"</span>` : ''}
               </div>`
            : `<button class="btn-rate" onclick="openRatingModal(${dest.destinationId}, '${escJs(dest.name)}')">Rate</button>`)
        : `<button class="btn-remove-dest" title="Remove" onclick="removeDestination(${trip.tripId}, ${dest.destinationId}, this)">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
           </button>`;

    return `
    <div class="trip-dest-item" id="destRow-${trip.tripId}-${dest.destinationId}">
        <div class="trip-dest-info">
            <div class="trip-dest-num">${num}</div>
            <div class="trip-dest-texts">
                <div class="trip-dest-name">${escHtml(dest.name || 'Unknown')}</div>
                <div class="trip-dest-city">${dest.city ? '📍 ' + escHtml(dest.city) : ''}</div>
            </div>
        </div>
        ${rightSide}
    </div>`;
}

function getAddableOptions(trip) {
    const inTrip = new Set((trip.destinations || []).map(d => d.destinationId));
    return allDestinations
        .filter(d => !inTrip.has(d.id))
        .map(d => `<option value="${d.id}">${escHtml(d.name)}${d.city ? ' — ' + escHtml(d.city) : ''}</option>`)
        .join('');
}

// ── Create trip ─────────────────────────────────────────────
function setupCreateTrip() {
    const input  = document.getElementById('tripTitle');
    const btn    = document.getElementById('createTripBtn');
    const errEl  = document.getElementById('tripTitleErr');

    input.addEventListener('blur', () => { if (input.value.trim()) validateTitle(input, errEl); });
    input.addEventListener('input', () => { errEl.textContent = ''; input.classList.remove('is-error'); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });

    const startDateEl = document.getElementById('tripStartDate');
    const endDateEl   = document.getElementById('tripEndDate');
    startDateEl.addEventListener('change', () => {
        endDateEl.min = startDateEl.value || '';
        if (endDateEl.value && endDateEl.value < startDateEl.value) {
            endDateEl.value = '';
        }
    });

    btn.addEventListener('click', async () => {
        if (!validateTitle(input, errEl)) return;
        if (btn.disabled) return;

        const startVal = document.getElementById('tripStartDate').value;
        const endVal   = document.getElementById('tripEndDate').value;
        if (startVal && endVal && endVal < startVal) {
            errEl.textContent = 'End date cannot be before start date.';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Creating…';
        try {
            const body = { title: input.value.trim() };
            if (startVal) body.startDate = startVal;
            if (endVal)   body.endDate   = endVal;
            const res = await fetch(ENDPOINTS.TRIPS.CREATE, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
            if (!res.ok) {
                errEl.textContent = data.message || 'Failed to create trip.';
                input.classList.add('is-error');
                return;
            }
            input.value = '';
            document.getElementById('tripStartDate').value = '';
            document.getElementById('tripEndDate').value   = '';
            showToast('🗺️', 'Trip created!');
            await loadTrips();
        } catch (e) {
            errEl.textContent = 'Network error. Please try again.';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Trip';
        }
    });
}

function validateTitle(input, errEl) {
    const v = input.value.trim();
    if (!v) {
        errEl.textContent = 'Trip name is required.';
        input.classList.add('is-error');
        return false;
    }
    if (v.length > 255) {
        errEl.textContent = 'Trip name must be under 255 characters.';
        input.classList.add('is-error');
        return false;
    }
    return true;
}

// ── Selected dest ID map (tripId → destId) ──────────────────
const _selectedDestId = {};

// ── Init search widget for a trip ───────────────────────────
function initTripDestSearch(tripId) {
    const input    = document.getElementById('addSearchInput-'    + tripId);
    const dropdown = document.getElementById('addSearchDropdown-' + tripId);
    const clearBtn = document.getElementById('addSearchClear-'    + tripId);
    if (!input) return;

    function getFiltered(q) {
        const trip   = trips.find(t => t.tripId === tripId);
        const inTrip = new Set((trip && trip.destinations || []).map(d => d.destinationId));
        const lower  = (q || '').trim().toLowerCase();
        return allDestinations.filter(d =>
            !inTrip.has(d.id) &&
            (!lower || d.name.toLowerCase().includes(lower) || (d.city || '').toLowerCase().includes(lower))
        );
    }

    function showDropdown(items) {
        if (!items.length) {
            dropdown.innerHTML = '<div class="dest-no-result">🔍 No destination found</div>';
        } else {
            dropdown.innerHTML = items.map(d =>
                `<div class="dest-search-item" data-id="${d.id}" data-name="${escHtml(d.name)}">${escHtml(d.name)}${d.city ? ` <span class="dsrc-city">— ${escHtml(d.city)}</span>` : ''}</div>`
            ).join('');
            dropdown.querySelectorAll('.dest-search-item').forEach(el => {
                el.addEventListener('mousedown', e => {
                    e.preventDefault();
                    input.value = el.dataset.name;
                    clearBtn.style.display = 'inline';
                    _selectedDestId[tripId] = el.dataset.id;
                    document.getElementById('addErr-' + tripId).textContent = '';
                    hideDropdown();
                });
            });
        }
        dropdown.style.display = 'block';
    }

    function hideDropdown() { dropdown.style.display = 'none'; }

    input.addEventListener('focus', () => showDropdown(getFiltered(input.value)));
    input.addEventListener('input', e => {
        clearBtn.style.display = e.target.value ? 'inline' : 'none';
        _selectedDestId[tripId] = null;
        showDropdown(getFiltered(e.target.value));
    });
    clearBtn.addEventListener('click', () => {
        input.value = ''; clearBtn.style.display = 'none'; hideDropdown();
        _selectedDestId[tripId] = null;
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#destSearchWrap-' + tripId)) hideDropdown();
    });
}

// ── Add destination to trip ─────────────────────────────────
async function addDestination(tripId) {
    const errEl  = document.getElementById('addErr-' + tripId);
    errEl.textContent = '';

    const destId = _selectedDestId[tripId];
    if (!destId) return;

    const input = document.getElementById('addSearchInput-' + tripId);
    const addBtn = input ? input.closest('.add-dest-row').querySelector('.btn') : null;
    addBtn.disabled = true;
    addBtn.textContent = '…';

    try {
        const res = await fetch(ENDPOINTS.TRIPS.ADD_DEST(tripId, destId), {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        if (res.status === 409) { errEl.textContent = data.message || 'Already in this trip.'; return; }
        if (!res.ok)            { errEl.textContent = data.message || 'Failed to add destination.'; return; }
        showToast('📍', 'Destination added!');
        await loadTrips();
    } catch (e) {
        errEl.textContent = 'Network error. Please try again.';
    } finally {
        addBtn.disabled = false;
        addBtn.textContent = 'Add';
    }
}

// ── Remove destination from trip ────────────────────────────
async function removeDestination(tripId, destId, btnEl) {
    btnEl.disabled = true;
    try {
        const res = await fetch(ENDPOINTS.TRIPS.REMOVE_DEST(tripId, destId), {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        if (!res.ok) { showToast('❌', data.message || 'Failed to remove.'); return; }
        showToast('🗑️', 'Destination removed.');
        await loadTrips();
    } catch (e) {
        showToast('📶', 'Network error. Please try again.');
        btnEl.disabled = false;
    }
}

// ── Mark trip as complete ────────────────────────────────────
async function markComplete(tripId, btnEl) {
    btnEl.disabled = true;
    btnEl.textContent = '…';
    try {
        const res = await fetch(ENDPOINTS.TRIPS.COMPLETE(tripId), {
            method: 'PATCH',
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        if (res.status === 400) { showToast('⚠️', data.message || 'Add at least one destination first.'); return; }
        if (res.status === 409) { showToast('ℹ️', data.message || 'Trip already completed.'); return; }
        if (!res.ok) { showToast('❌', data.message || 'Failed to complete trip.'); return; }
        showToast('✅', 'Trip marked as completed! You can now rate its destinations.');
        await loadTrips();
    } catch (e) {
        showToast('📶', 'Network error. Please try again.');
    } finally {
        btnEl.disabled = false;
        btnEl.textContent = '✓ Mark as Complete';
    }
}

// ── Delete trip ─────────────────────────────────────────────
async function deleteTrip(tripId, btnEl) {
    if (!confirm('Delete this trip? This cannot be undone.')) return;
    btnEl.disabled = true;
    btnEl.textContent = 'Deleting…';
    try {
        const res = await fetch(ENDPOINTS.TRIPS.DELETE(tripId), {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + TOKEN }
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        if (!res.ok) { showToast('❌', data.message || 'Failed to delete trip.'); return; }
        showToast('🗑️', 'Trip deleted.');
        await loadTrips();
    } catch (e) {
        showToast('📶', 'Network error. Please try again.');
        btnEl.disabled = false;
        btnEl.textContent = 'Delete Trip';
    }
}

// ── Rating Modal ─────────────────────────────────────────────
function setupModal() {
    const overlay   = document.getElementById('ratingModal');
    const closeBtn  = document.getElementById('modalClose');
    const cancelBtn = document.getElementById('cancelRating');
    const submitBtn = document.getElementById('submitRating');
    const textarea  = document.getElementById('reviewText');
    const charCount = document.getElementById('charCount');

    closeBtn .addEventListener('click', closeRatingModal);
    cancelBtn.addEventListener('click', closeRatingModal);
    overlay  .addEventListener('click', e => { if (e.target === overlay) closeRatingModal(); });

    // Star picker
    document.querySelectorAll('.star-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => highlightStars(parseInt(btn.dataset.star)));
        btn.addEventListener('mouseleave', () => highlightStars(selectedStar));
        btn.addEventListener('click', () => {
            selectedStar = parseInt(btn.dataset.star);
            highlightStars(selectedStar);
            document.getElementById('starLabel').textContent = STAR_LABELS[selectedStar];
            document.getElementById('modalError').textContent = '';
        });
    });

    textarea.addEventListener('input', () => {
        charCount.textContent = textarea.value.length;
    });

    submitBtn.addEventListener('click', submitRating);
}

function openRatingModal(destId, destName) {
    // Alternate case: session expired or user not logged in
    if (!sessionStorage.getItem('tripify_token')) {
        showToast('🔒', 'Please login to rate destinations. Redirecting…');
        setTimeout(() => { window.location.href = '../auth/login.html'; }, 1800);
        return;
    }

    pendingDestId   = destId;
    pendingDestName = destName;
    selectedStar    = 0;
    highlightStars(0);
    document.getElementById('modalDestName').textContent = destName;
    document.getElementById('starLabel').textContent     = 'Select a rating';
    document.getElementById('reviewText').value          = '';
    document.getElementById('charCount').textContent     = '0';
    document.getElementById('modalError').textContent    = '';
    document.getElementById('ratingModal').classList.add('open');
}

function closeRatingModal() {
    document.getElementById('ratingModal').classList.remove('open');
}

function highlightStars(count) {
    document.querySelectorAll('.star-btn').forEach((btn, i) => {
        btn.classList.toggle('lit', i < count);
    });
}

async function submitRating() {
    if (submitting) return;
    const errEl = document.getElementById('modalError');
    errEl.textContent = '';

    if (!selectedStar) {
        errEl.textContent = 'Please select a star rating (1–5).';
        return;
    }

    const reviewText = document.getElementById('reviewText').value.trim();
    if (reviewText.length > 1000) {
        errEl.textContent = 'Review text must be under 1000 characters.';
        return;
    }

    submitting = true;
    const submitBtn = document.getElementById('submitRating');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
        const res = await fetch(ENDPOINTS.REVIEWS.SUBMIT, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                destinationId: pendingDestId,
                rating:        selectedStar,
                reviewText:    reviewText || null
            })
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        if (res.status === 400) { errEl.textContent = data.message || 'Invalid input.'; return; }
        if (res.status === 403) { errEl.textContent = data.message || 'You can only rate destinations from completed trips.'; return; }
        if (res.status === 409) { errEl.textContent = data.message || 'You have already reviewed this destination.'; return; }
        if (!res.ok)            { errEl.textContent = data.message || 'Something went wrong. Please try again.'; return; }

        closeRatingModal();
        showToast('⭐', `Rated ${pendingDestName} — ${selectedStar}/5!`);
        await loadTrips();
    } catch (e) {
        errEl.textContent = 'Network error. Please try again.';
    } finally {
        submitting = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
    }
}

// ── Sidebar toggle ───────────────────────────────────────────
function setupSidebar() {
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
}

// ── User profile ─────────────────────────────────────────────
function applyUserProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('sidebarName').textContent = u.fullName || 'Tourist';
    const sa = document.getElementById('sidebarInitials');
    const ta = document.getElementById('topbarInitials');
    if (u.profilePicture && u.profilePicture !== '') {
        const imgTag = `<img src="http://localhost:8080${u.profilePicture}?t=${Date.now()}" alt="Avatar" onerror="this.parentElement.textContent='${ini}'">`;
        sa.innerHTML = imgTag;
        ta.innerHTML = imgTag;
    } else {
        sa.textContent = ini;
        ta.textContent = ini;
    }
}

// ── Toast ────────────────────────────────────────────────────
function showToast(icon, msg, dur = 2800) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, dur);
}

// ── Utils ────────────────────────────────────────────────────
function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escJs(str) {
    return String(str).replace(/'/g,"\\'").replace(/\\/g,'\\\\');
}

// ── Boot ─────────────────────────────────────────────────────
init();
