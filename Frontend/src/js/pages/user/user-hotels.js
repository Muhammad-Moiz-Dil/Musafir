(function() {
'use strict';

const tripToken = sessionStorage.getItem('tripify_token');
if (!tripToken) { window.location.href = '../auth/login.html'; return; }

const user = JSON.parse(sessionStorage.getItem('tripify_user') || '{}');
(function applyUserProfile(u) {
    const ini = (u.fullName || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('sidebarName').textContent = u.fullName || 'Tourist';
    const sa = document.getElementById('sidebarInitials'), ta = document.getElementById('topbarInitials');
    if (u.profilePicture && u.profilePicture !== '') {
        const img = '<img src="http://localhost:8080' + u.profilePicture + '?t=' + Date.now() + '" alt="Avatar" onerror="this.parentElement.textContent=\'' + ini + '\'">';
        sa.innerHTML = img; ta.innerHTML = img;
    } else { sa.textContent = ini; ta.textContent = ini; }
})(user);

const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('overlay');
document.getElementById('menuToggle').addEventListener('click', () => { sidebar.classList.toggle('open'); overlay.classList.toggle('show'); });
overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });

function showToast(icon, msg, dur = 3500) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<span class="toast-icon">' + icon + '</span><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, dur);
}

// ── Helpers ────────────────────────────────────────────────
function hotelImg(imageUrl) {
    if (!imageUrl) return '../../../../public/assets/images/lahore.jpg';
    // Uploaded file (served by backend)
    if (imageUrl.startsWith('/')) return 'http://localhost:8080' + imageUrl;
    // Legacy filename stored in DB → map to local asset folder
    return '../../../../public/assets/images/' + imageUrl;
}

// ── State ──────────────────────────────────────────────────
let allHotels = [];
let destFilter = 'all', starsFilter = '', searchQ = '';
let currentHotel = null, selectedRoom = null;
window._htRooms = []; // global safe reference for inline onclick handlers

// ── Fetch and render hotels ────────────────────────────────
async function loadHotels() {
    try {
        const res = await fetch(ENDPOINTS.HOTELS.ALL, {
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        if (!res.ok) throw new Error('Failed to load hotels');
        allHotels = await res.json();
        buildDestinationFilter();
        renderHotels();
        document.getElementById('hotelsLoading').style.display = 'none';
        document.getElementById('hotelsGrid').style.display = 'grid';
    } catch (e) {
        document.getElementById('hotelsLoading').innerHTML =
            '<div style="text-align:center;padding:48px;color:var(--t2)">' +
            '<div style="font-size:36px;margin-bottom:12px">🏨</div>' +
            '<p>Could not load hotels. Please try again.</p>' +
            '<button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="loadHotels()">Retry</button></div>';
    }
}

let _destNames = [];
function buildDestinationFilter() {
    _destNames = [...new Set(allHotels.map(h => h.destinationName).filter(Boolean))].sort();
    // Apply URL param
    const qp = new URLSearchParams(location.search);
    if (qp.get('dest')) {
        const mapping = {1:'Hunza Valley',2:'Murree',3:'Swat Valley',4:'Skardu',5:'Naran Kaghan'};
        const d = mapping[parseInt(qp.get('dest'))] || qp.get('dest');
        if (d && _destNames.includes(d)) {
            destFilter = d;
            const inp = document.getElementById('destSearchInput');
            const clr = document.getElementById('destSearchClear');
            if (inp) { inp.value = d; clr.style.display = 'inline'; }
        }
    }
    // Init search widget
    (function(){
        const input = document.getElementById('destSearchInput');
        const dropdown = document.getElementById('destSearchDropdown');
        const clearBtn = document.getElementById('destSearchClear');
        function showDropdown(items) {
            if (!items.length) {
                dropdown.innerHTML = '<div class="dest-no-result">🔍 No destination found</div>';
                dropdown.style.display = 'block'; return;
            }
            dropdown.innerHTML = items.map(d =>
                `<div class="dest-search-item" data-value="${d}">${d}</div>`
            ).join('');
            dropdown.style.display = 'block';
            dropdown.querySelectorAll('.dest-search-item').forEach(el => {
                el.addEventListener('mousedown', e => {
                    e.preventDefault();
                    input.value = el.dataset.value;
                    clearBtn.style.display = 'inline';
                    hideDropdown();
                    destFilter = el.dataset.value;
                    renderHotels();
                });
            });
        }
        function hideDropdown() { dropdown.style.display = 'none'; }
        input.addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            clearBtn.style.display = e.target.value ? 'inline' : 'none';
            if (!e.target.value.trim()) { hideDropdown(); destFilter = 'all'; renderHotels(); return; }
            const matches = _destNames.filter(d => d.toLowerCase().includes(q));
            showDropdown(matches);
        });
        clearBtn.addEventListener('click', () => {
            input.value = ''; clearBtn.style.display = 'none'; hideDropdown();
            destFilter = 'all'; renderHotels();
        });
        document.addEventListener('click', e => {
            if (!e.target.closest('#destSearchWrap')) hideDropdown();
        });
    })();
}

function filtered() {
    return allHotels.filter(h => {
        const okDest  = destFilter === 'all' || (h.destinationName || '').toLowerCase().includes(destFilter.toLowerCase());
        const okStars = !starsFilter || h.stars === parseInt(starsFilter);
        const okQ     = !searchQ || (h.name || '').toLowerCase().includes(searchQ) || (h.destinationName || '').toLowerCase().includes(searchQ);
        return okDest && okStars && okQ;
    });
}

function starStr(n) {
    const r = Math.round(n || 0);
    return '★'.repeat(Math.min(r, 5)) + '☆'.repeat(Math.max(5 - r, 0));
}

function renderHotels() {
    const items = filtered();
    document.getElementById('hotelCount').textContent = items.length + ' hotel' + (items.length !== 1 ? 's' : '') + ' found';
    if (!items.length) {
        document.getElementById('hotelsGrid').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--t3)"><div style="font-size:40px;margin-bottom:12px">🏨</div><p>No hotels match your filters.</p></div>';
        return;
    }
    const amenityIcons = {'WiFi':'📶','Pool':'🏊','Spa':'💆','Restaurant':'🍽️','Gym':'💪','Parking':'🅿️','Breakfast':'🍳','Mountain View':'🏔️','River View':'🌊','Garden':'🌿','Fireplace':'🔥','Campfire':'🔥','Meals':'🍴','Bonfire':'🔥','Camel Safari':'🐪','Jeep Safari':'🚙'};
    document.getElementById('hotelsGrid').innerHTML = items.map(h => {
        const amenities = (h.amenities || '').split(',').map(a => a.trim()).filter(Boolean).slice(0, 5);
        return `<div class="hotel-card">
            <div class="hotel-img">
                <img src="${hotelImg(h.imageUrl)}" alt="${h.name}" loading="lazy" onerror="this.src='../../../../public/assets/images/lahore.jpg'">
                <div class="hotel-img-overlay"></div>
                ${h.stars ? `<span style="position:absolute;top:10px;right:10px;background:rgba(245,166,35,0.9);color:#1a1a1a;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px">${'★'.repeat(h.stars)} ${h.stars}-Star</span>` : ''}
            </div>
            <div class="hotel-body">
                <div class="hotel-name">${h.name}</div>
                <div class="hotel-loc">📍 ${h.destinationName || '—'}</div>
                <div style="margin-top:6px;margin-bottom:2px">
                    ${h.stars ? `<span style="color:#f59e0b;font-size:13px;letter-spacing:1px">${'★'.repeat(h.stars)}${'☆'.repeat(5 - h.stars)}</span><span style="font-size:11px;color:var(--t3);margin-left:5px">${h.stars}-star hotel</span>` : '<span style="font-size:11px;color:var(--t3)">Unrated hotel</span>'}
                </div>
                ${(h.averageRating && h.totalReviews) ? `<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">
                    <span style="color:#f59e0b;font-size:12px">★</span>
                    <span style="font-size:12px;font-weight:600;color:var(--t1)">${parseFloat(h.averageRating).toFixed(1)}</span>
                    <span style="font-size:11px;color:var(--t3)">(${h.totalReviews} review${h.totalReviews !== 1 ? 's' : ''})</span>
                </div>` : ''}
                <div class="amenities">${amenities.map(a => `<span class="amenity">${amenityIcons[a] || ''} ${a}</span>`).join('')}</div>
                ${h.contactNumber ? `<div style="font-size:12px;color:var(--t2);margin-top:8px">📞 ${h.contactNumber}</div>` : ''}
                <div style="margin-top:10px;text-align:right">
                    <button class="btn btn-primary btn-sm" onclick="openHotelDetail(${h.id})">View Rooms</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── Modal ──────────────────────────────────────────────────
function openHotelDetail(id) {
    currentHotel = allHotels.find(h => h.id === id);
    if (!currentHotel) return;
    selectedRoom = null;

    // Reset guest select to clean state
    Array.from(document.getElementById('guests').options).forEach(opt => { opt.disabled = false; });
    document.getElementById('guests').value = '1';
    document.getElementById('guestCapHint').textContent = '';

    // Show step 1
    showStep('stepRooms');

    // Fill hotel header
    const imgEl = document.getElementById('mHotelImg');
    imgEl.src = hotelImg(currentHotel.imageUrl);
    imgEl.style.display = 'block';
    document.getElementById('mHotelName').textContent = currentHotel.name;
    document.getElementById('mHotelLoc').textContent  = '📍 ' + (currentHotel.destinationName || '');
    const rating = parseFloat(currentHotel.averageRating) || 0;
    const totalRev = currentHotel.totalReviews || 0;
    const stars = currentHotel.stars || 0;
    const classStr = stars ? `<span style="color:#f59e0b">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</span> <span style="font-size:12px;color:var(--t3)">${stars}-star hotel</span>` : '';
    const reviewStr = (rating && totalRev) ? ` &nbsp;|&nbsp; <span style="color:#f59e0b">★</span> <strong style="color:var(--t1)">${rating.toFixed(1)}</strong> <span>(${totalRev} review${totalRev !== 1 ? 's' : ''})</span>` : '';
    document.getElementById('mHotelRating').innerHTML = classStr + reviewStr;
    const totalRooms = currentHotel.totalRooms || currentHotel.availableRooms;
    document.getElementById('mHotelRooms').textContent = totalRooms ? '🛏️ ' + totalRooms + ' rooms' : '';
    document.getElementById('mHotelPhone').textContent = currentHotel.contactNumber ? '📞 ' + currentHotel.contactNumber : '';
    document.getElementById('mHotelContact').textContent = currentHotel.email ? '✉️ ' + currentHotel.email : '';
    document.getElementById('mHotelDesc').textContent  = currentHotel.description || '';

    const amenities = (currentHotel.amenities || '').split(',').map(a => a.trim()).filter(Boolean);
    document.getElementById('mHotelAmenities').innerHTML = amenities.map(a => '<span class="amenity">' + a + '</span>').join('');

    // Load room types and reviews
    document.getElementById('roomsContainer').innerHTML = '<div class="rooms-loading">Loading room types...</div>';
    document.getElementById('reviewsContainer').innerHTML = '<div class="rooms-loading">Loading reviews...</div>';
    openModal();
    fetchRoomTypes(id);
    fetchHotelReviews(id);
}

async function fetchRoomTypes(hotelId) {
    try {
        const res = await fetch(ENDPOINTS.ROOMS.BY_HOTEL(hotelId), {
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (!res.ok) throw new Error('Failed to load rooms');
        const rooms = await res.json();
        renderRoomTypes(rooms);
    } catch (e) {
        document.getElementById('roomsContainer').innerHTML = '<div class="rooms-empty">Could not load room types. <button class="btn btn-sm" onclick="fetchRoomTypes(' + hotelId + ')" style="margin-left:8px">Retry</button></div>';
    }
}

function renderRoomTypes(rooms) {
    window._htRooms = rooms; // all room types, indexed for onclick

    if (!rooms.length) {
        document.getElementById('roomsContainer').innerHTML = `
            <div class="rooms-empty" style="text-align:left">
                <p style="margin-bottom:12px;color:var(--t2)">Room type details not yet set up by the hotel. You can still request a booking at the standard rate.</p>
                <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.2);border-radius:var(--r);padding:14px">
                    <div>
                        <div style="font-size:15px;font-weight:700;color:var(--white)">Standard Room</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:16px;font-weight:800;color:var(--accent)">Rs. ${Number(currentHotel.pricePerNight).toLocaleString()}</div>
                        <div style="font-size:10px;color:var(--t3)">/night</div>
                    </div>
                </div>
                <button class="btn btn-primary btn-full" style="margin-top:12px" onclick="selectRoom(null)">Book This Hotel</button>
            </div>`;
        return;
    }

    document.getElementById('roomsContainer').innerHTML = rooms.map((rt, idx) => {
        const avail    = rt.availableRooms > 0;
        const amenities = (rt.amenities || '').split(',').map(a => a.trim()).filter(Boolean);
        return `<div class="room-card${avail ? '' : ' unavailable'}">
            <div class="room-row">
                <div>
                    <div class="room-name">${rt.typeName}</div>
                    <div class="room-cap">👥 Up to ${rt.capacity} guest${rt.capacity !== 1 ? 's' : ''}</div>
                </div>
                <div class="room-price-blk">
                    <div class="room-price">Rs. ${Number(rt.pricePerNight).toLocaleString()}</div>
                    <div class="room-price-sub">/night</div>
                </div>
            </div>
            <div class="room-avail ${avail ? 'avail-yes' : 'avail-no'}">
                ${avail ? '✓ ' + rt.availableRooms + ' room' + (rt.availableRooms !== 1 ? 's' : '') + ' available' : '✗ Fully booked'}
            </div>
            ${amenities.length ? '<div class="room-amenities">' + amenities.map(a => '<span class="amenity">' + a + '</span>').join('') + '</div>' : ''}
            ${rt.description ? '<div class="room-desc">' + rt.description + '</div>' : ''}
            ${avail
                ? `<button class="btn btn-primary btn-sm" onclick="selectRoom(window._htRooms[${idx}])">Book This Room →</button>`
                : `<span style="font-size:11px;color:#f87171;font-weight:600">Currently unavailable</span>`}
        </div>`;
    }).join('');
}

function selectRoom(rt) {
    selectedRoom = rt;
    showStep('stepBook');

    // Always reset guest options first
    const gSel = document.getElementById('guests');
    Array.from(gSel.options).forEach(opt => { opt.disabled = false; });

    if (rt) {
        document.getElementById('bkfRoomName').textContent = rt.typeName;
        document.getElementById('bkfRoomSub').textContent  = '👥 Up to ' + rt.capacity + ' guests  ·  Rs. ' + Number(rt.pricePerNight).toLocaleString() + '/night';
        document.getElementById('bsRoom').textContent      = rt.typeName;
        document.getElementById('bsPrice').textContent     = 'Rs. ' + Number(rt.pricePerNight).toLocaleString();
        document.getElementById('guestCapHint').textContent = '(max ' + rt.capacity + ')';
        // Disable options above room capacity
        Array.from(gSel.options).forEach(opt => {
            if (parseInt(opt.value) > rt.capacity) opt.disabled = true;
        });
        if (parseInt(gSel.value) > rt.capacity) gSel.value = String(rt.capacity);
    } else {
        // Hotel-level fallback
        document.getElementById('bkfRoomName').textContent = currentHotel.name;
        document.getElementById('bkfRoomSub').textContent  = 'Rs. ' + Number(currentHotel.pricePerNight).toLocaleString() + '/night';
        document.getElementById('bsRoom').textContent      = 'Standard Room';
        document.getElementById('bsPrice').textContent     = 'Rs. ' + Number(currentHotel.pricePerNight).toLocaleString();
        document.getElementById('guestCapHint').textContent = '';
    }

    // Default dates
    const today = new Date(), checkout = new Date();
    checkout.setDate(today.getDate() + 1);
    document.getElementById('checkIn').min  = today.toISOString().split('T')[0];
    document.getElementById('checkIn').value  = today.toISOString().split('T')[0];
    document.getElementById('checkOut').value = checkout.toISOString().split('T')[0];
    document.getElementById('bookingErrMsg').style.display = 'none';
    updateTotal();
}

function goBackToRooms() {
    showStep('stepRooms');
    selectedRoom = null;
}

function showStep(stepId) {
    document.querySelectorAll('.modal-step').forEach(s => s.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

function updateTotal() {
    const ci = new Date(document.getElementById('checkIn').value);
    const co = new Date(document.getElementById('checkOut').value);
    if (!document.getElementById('checkIn').value || !document.getElementById('checkOut').value) return;
    const nights = Math.max(1, Math.round((co - ci) / (1000 * 60 * 60 * 24)));
    const price  = selectedRoom ? parseFloat(selectedRoom.pricePerNight) : parseFloat(currentHotel.pricePerNight);
    document.getElementById('bsNights').textContent = nights + ' night' + (nights !== 1 ? 's' : '');
    document.getElementById('bsTotal').textContent  = 'Rs. ' + (price * nights).toLocaleString();
}

function openModal()  { document.getElementById('modalBg').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal() { document.getElementById('modalBg').classList.remove('open'); document.body.style.overflow = ''; selectedRoom = null; currentHotel = null; }

// ── Hotel Reviews ──────────────────────────────────────────
let myReviewedHotels = null; // cache of hotel IDs the user has reviewed

async function ensureMyReviewedHotels() {
    if (myReviewedHotels !== null) return;
    try {
        const res = await fetch(ENDPOINTS.HOTEL_REVIEWS.MINE, {
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (!res.ok) { myReviewedHotels = []; return; }
        const data = await res.json();
        myReviewedHotels = data.map(r => r.hotelId);
    } catch { myReviewedHotels = []; }
}

async function fetchHotelReviews(hotelId) {
    const cont = document.getElementById('reviewsContainer');
    try {
        await ensureMyReviewedHotels();
        const res = await fetch(ENDPOINTS.HOTEL_REVIEWS.BY_HOTEL(hotelId), {
            headers: { 'Authorization': 'Bearer ' + tripToken }
        });
        if (!res.ok) throw new Error();
        const reviews = await res.json();
        renderHotelReviews(hotelId, reviews);
    } catch {
        cont.innerHTML = '<div class="rooms-empty">Could not load reviews.</div>';
    }
}

function renderHotelReviews(hotelId, reviews) {
    const cont = document.getElementById('reviewsContainer');
    const alreadyReviewed = myReviewedHotels && myReviewedHotels.includes(hotelId);

    // Rating summary
    let summaryHtml = '';
    if (reviews.length) {
        const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
        const full = Math.round(avg);
        summaryHtml = `
        <div class="rev-avg-row">
            <div class="rev-avg-num">${avg.toFixed(1)}</div>
            <div>
                <div class="rev-avg-stars">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</div>
                <div class="rev-avg-count">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</div>
            </div>
        </div>`;
    }

    // Review form (only if user hasn't reviewed yet)
    const formHtml = alreadyReviewed ? '' : `
    <div class="rev-form" id="revFormBox">
        <div style="font-size:12.5px;font-weight:600;color:var(--white);margin-bottom:8px">Write a Review</div>
        <div class="rev-stars-pick" id="starPicker">
            <span data-v="1" onclick="pickStar(1)">★</span>
            <span data-v="2" onclick="pickStar(2)">★</span>
            <span data-v="3" onclick="pickStar(3)">★</span>
            <span data-v="4" onclick="pickStar(4)">★</span>
            <span data-v="5" onclick="pickStar(5)">★</span>
        </div>
        <textarea id="revComment" placeholder="Share your experience (optional)…"
            style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:var(--r);padding:10px 12px;color:var(--white);font-size:13px;font-family:var(--font);resize:vertical;min-height:70px;outline:none;margin-bottom:10px"></textarea>
        <div id="revErrMsg" style="font-size:11.5px;color:#f87171;margin-bottom:8px;display:none"></div>
        <button class="btn btn-primary btn-sm" onclick="submitHotelReview(${hotelId})">Submit Review</button>
    </div>`;

    const listHtml = reviews.length ? reviews.map(r => `
    <div class="rev-card">
        <div class="rev-hdr">
            <div>
                <div class="rev-name">${r.reviewerName || 'Anonymous'}${r.verified ? '<span class="rev-badge">✓ Verified</span>' : ''}</div>
                <div class="rev-date">${r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-PK',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>
            </div>
            <div class="rev-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        </div>
        ${r.comment ? `<div class="rev-comment">${escapeHtml(r.comment)}</div>` : ''}
    </div>`).join('') : (alreadyReviewed ? '' : '<div style="font-size:12.5px;color:var(--t3);margin-bottom:12px">No reviews yet. Be the first!</div>');

    cont.innerHTML = summaryHtml + formHtml + listHtml;
    window._revHotelId = hotelId;
    window._revRating = 0;
}

let _revRating = 0;
function pickStar(val) {
    _revRating = val;
    window._revRating = val;
    document.querySelectorAll('#starPicker span').forEach((s, i) => {
        s.classList.toggle('lit', i < val);
    });
}

async function submitHotelReview(hotelId) {
    const errEl = document.getElementById('revErrMsg');
    const rating = window._revRating || 0;
    const comment = (document.getElementById('revComment').value || '').trim();

    errEl.style.display = 'none';
    if (!rating) { errEl.textContent = 'Please select a star rating.'; errEl.style.display = 'block'; return; }

    const btn = document.querySelector('#revFormBox .btn-primary');
    btn.disabled = true; btn.textContent = 'Submitting…';

    try {
        const res = await fetch(ENDPOINTS.HOTEL_REVIEWS.SUBMIT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tripToken },
            body: JSON.stringify({ hotelId, rating, comment: comment || null })
        });
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        const data = await res.json();
        if (!res.ok) { errEl.textContent = data.message || 'Failed to submit. Try again.'; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = 'Submit Review'; return; }

        // Mark hotel as reviewed and refresh reviews panel
        if (myReviewedHotels) myReviewedHotels.push(hotelId);
        showToast('⭐', data.message || 'Review submitted!');
        _revRating = 0; window._revRating = 0;
        await fetchHotelReviews(hotelId);
    } catch {
        errEl.textContent = 'Network error. Please try again.'; errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Submit Review';
    }
}

// ── Confirm Booking ────────────────────────────────────────
async function confirmBooking() {
    const btn     = document.getElementById('confirmBtn');
    const errEl   = document.getElementById('bookingErrMsg');
    const checkIn = document.getElementById('checkIn').value;
    const checkOut= document.getElementById('checkOut').value;
    const guests  = parseInt(document.getElementById('guests').value) || 1;

    errEl.style.display = 'none';
    if (!checkIn || !checkOut) { errEl.textContent = 'Please select check-in and check-out dates.'; errEl.style.display = 'block'; return; }
    if (new Date(checkOut) <= new Date(checkIn)) { errEl.textContent = 'Check-out must be after check-in.'; errEl.style.display = 'block'; return; }
    if (new Date(checkIn) < new Date(new Date().toDateString())) { errEl.textContent = 'Check-in date cannot be in the past.'; errEl.style.display = 'block'; return; }

    if (selectedRoom && guests > selectedRoom.capacity) {
        errEl.textContent = 'Guests exceed room capacity (' + selectedRoom.capacity + ').';
        errEl.style.display = 'block'; return;
    }

    btn.disabled = true; btn.textContent = 'Submitting...';

    try {
        const payload = {
            hotelId:      currentHotel.id,
            checkInDate:  checkIn,
            checkOutDate: checkOut,
            numberOfGuests: guests
        };
        if (selectedRoom) payload.roomTypeId = selectedRoom.roomTypeId;

        const res = await fetch(ENDPOINTS.BOOKINGS.CREATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tripToken },
            body: JSON.stringify(payload)
        });
        if (res.status === 401) { window.location.href = '../auth/login.html'; return; }
        const data = await res.json();
        if (!res.ok) { errEl.textContent = data.message || 'Booking failed. Please try again.'; errEl.style.display = 'block'; return; }

        closeModal();
        showToast('✅', 'Booking #' + data.bookingId + ' submitted! Hotel will confirm within 24 hours.');

        // Refresh hotel list to update availability
        loadHotels();
    } catch (e) {
        closeModal();
        showToast('✅', 'Booking request sent! Hotel will confirm within 24 hours.');
    } finally {
        btn.disabled = false; btn.textContent = '🏨 Confirm Booking Request';
    }
}

// ── Filter Events ──────────────────────────────────────────
document.getElementById('starsFilter').addEventListener('change', e => { starsFilter = e.target.value; renderHotels(); });
document.getElementById('topSearch').addEventListener('input',    e => { searchQ     = e.target.value.toLowerCase(); renderHotels(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// Expose for inline onclick
window.openHotelDetail     = openHotelDetail;
window.selectRoom          = selectRoom;
window.goBackToRooms       = goBackToRooms;
window.closeModal          = closeModal;
window.confirmBooking      = confirmBooking;
window.updateTotal         = updateTotal;
window.pickStar            = pickStar;
window.submitHotelReview   = submitHotelReview;

loadHotels();

})();
